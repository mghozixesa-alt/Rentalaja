-- Template 2 "Armada hari ini": wawasan anti-tekor dari GPS + data booking.
-- uang (telat kembali tanpa denda), tanpa sewa, tujuan penyewa, jam berangkat, unit tidur, biaya GPS boros, kondisi aki.

alter table app.gps_sync_log add column if not exists meta jsonb;

-- Ringkasan sinkron dari edge function (mis. alat MiCODUS menunggak), ditempel ke log terakhir.
create or replace function public.gps_sync_meta(p_meta jsonb) returns void language sql security definer set search_path = public as $$
  update app.gps_sync_log set meta = p_meta where id = (select max(id) from app.gps_sync_log where ok);
$$;
revoke all on function public.gps_sync_meta(jsonb) from public, anon, authenticated;
grant execute on function public.gps_sync_meta(jsonb) to service_role;

insert into public.settings(key, grp, label, description, value_type, value, unit, is_public, sort) values
 ('gps_tarif', 'aset', 'Tarif denda dari GPS', 'Dipakai halaman Armada hari ini untuk menghitung uang yang belum ditagih. Kosong = pakai rata-rata denda yang biasa dikenakan kasir.', 'json',
  '{"telat_per_jam":null,"keluar_wilayah":null,"batas_wilayah_km":100}'::jsonb, null, false, 5)
on conflict (key) do nothing;

-- Tujuan wisata/area yang dikenali (titik terjauh tiap sewa dicocokkan ke yang terdekat, maks 12 km)
create or replace function app.gps_places() returns table(name text, lat double precision, lng double precision)
language sql immutable as $$ values
 ('Pantai Santolo · Pameungpeuk', -7.651, 107.689), ('Rancabuaya · Caringin', -7.47, 107.39), ('Papandayan · Cisurupan', -7.32, 107.73),
 ('Cikajang', -7.37, 107.80), ('Darajat · Pasirwangi', -7.22, 107.74), ('Kamojang', -7.13, 107.80), ('Situ Bagendit · Banyuresmi', -7.17, 107.95),
 ('Leles · Kadungora', -7.10, 107.90), ('Malangbong · Limbangan', -7.06, 108.07), ('Tasikmalaya', -7.33, 108.22), ('Pangandaran', -7.69, 108.65),
 ('Bandung kota', -6.91, 107.61), ('Lembang', -6.81, 107.62), ('Ciwidey · Kawah Putih', -7.16, 107.40), ('Pangalengan', -7.18, 107.57),
 ('Jatinangor · Sumedang', -6.93, 107.77), ('Cianjur', -6.82, 107.14), ('Jakarta', -6.20, 106.82)
$$;

create or replace function public.gps_insight(p_branch uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $function$
declare res jsonb; tar jsonb := coalesce(app.gps_set('gps_tarif'), '{}'::jsonb); rate numeric;
begin
  if not (app.has_perm('mgmt.assets') or app.has_perm('pos.units') or app.has_perm('mgmt.reports') or app.has_perm('pos.bookings')) then raise exception 'Tidak berwenang'; end if;

  with veh as (
    select u.id, u.branch_id, coalesce(u.plate_or_serial, u.asset_no, u.code) label, u.status::text ustatus, b.lat blat, b.lng blng, b.name branch
    from units u join products p on p.id = u.product_id join categories c on c.id = p.category_id left join branches b on b.id = u.branch_id
    where u.archived_at is null and u.status::text <> 'inactive' and c.slug in ('motor','mobil','mobil-sopir','jeep')
      and (p_branch is null or u.branch_id = p_branch) and app.in_branch(u.branch_id)),
  bk as (  -- sewa kendaraan yang sudah kembali 30 hari terakhir
    select distinct on (k.id) k.id, k.code, k.end_at, k.actual_end_at, coalesce(k.actual_start_at, k.start_at) st, coalesce(k.late_fee, 0) late_fee,
      greatest(extract(epoch from (k.actual_end_at - k.end_at)) / 3600.0, 0) late_h, bi.unit_id, v.label, v.blat, v.blng, v.branch
    from bookings k join booking_items bi on bi.booking_id = k.id join veh v on v.id = bi.unit_id
    where k.actual_end_at > now() - interval '30 days' and k.status::text not in ('cancelled','rejected')),
  late as (select * from bk where late_h > 0.25)
  select coalesce(sum(late_fee) / nullif(sum(late_h) filter (where late_fee > 0), 0), 0) into rate from late where late_fee > 0;
  rate := coalesce(nullif(tar->>'telat_per_jam', '')::numeric, nullif(round(rate, -3), 0));

  with veh as (
    select u.id, u.branch_id, coalesce(u.plate_or_serial, u.asset_no, u.code) label, u.status::text ustatus, b.lat blat, b.lng blng, b.name branch,
      g.connected_at, g.last_power_v, g.last_online_at
    from units u join products p on p.id = u.product_id join categories c on c.id = p.category_id left join branches b on b.id = u.branch_id
    left join unit_gps g on g.unit_id = u.id
    where u.archived_at is null and u.status::text <> 'inactive' and c.slug in ('motor','mobil','mobil-sopir','jeep')
      and (p_branch is null or u.branch_id = p_branch) and app.in_branch(u.branch_id)),
  bk as (
    select distinct on (k.id) k.id, k.code, k.end_at, k.actual_end_at, coalesce(k.actual_start_at, k.start_at) st, coalesce(k.late_fee, 0) late_fee,
      greatest(extract(epoch from (k.actual_end_at - k.end_at)) / 3600.0, 0) late_h, bi.unit_id, v.label, v.blat, v.blng, v.branch
    from bookings k join booking_items bi on bi.booking_id = k.id join veh v on v.id = bi.unit_id
    where k.actual_end_at > now() - interval '30 days' and k.status::text not in ('cancelled','rejected')),
  late as (select * from bk where late_h > 0.25),
  far as (  -- titik terjauh dari cabang selama sewa
    select b.id, b.unit_id, b.label, (select jsonb_build_object('lat', pt.lat, 'lng', pt.lng, 'km', app.km_between(b.blat, b.blng, pt.lat, pt.lng))
       from app.gps_points pt where pt.unit_id = b.unit_id and pt.at between b.st and coalesce(b.actual_end_at, now())
       order by app.km_between(b.blat, b.blng, pt.lat, pt.lng) desc nulls last limit 1) f
    from (select id, unit_id, label, blat, blng, st, actual_end_at from bk
          union all
          select k.id, bi.unit_id, v.label, v.blat, v.blng, coalesce(k.actual_start_at, k.start_at), null
          from bookings k join booking_items bi on bi.booking_id = k.id join veh v on v.id = bi.unit_id where k.status = 'active') b),
  dest as (
    select case when (f->>'km')::numeric <= 8 then 'Sekitar kota (≤ 8 km)'
                else coalesce((select pl.name from app.gps_places() pl where app.km_between(pl.lat, pl.lng, (f->>'lat')::float, (f->>'lng')::float) <= 12
                               order by app.km_between(pl.lat, pl.lng, (f->>'lat')::float, (f->>'lng')::float) limit 1), 'Lainnya') end place,
      (f->>'km')::numeric km, (f->>'lat')::float lat, (f->>'lng')::float lng
    from far where f is not null),
  raw as (select distinct on (ident) ident, matched, msg, at from app.gps_raw where msg->>'_src' = 'micodus' order by ident, at desc),
  sync as (select meta from app.gps_sync_log where ok and meta is not null order by at desc limit 1)
  select jsonb_build_object(
    'uang', jsonb_build_object(
      'kembali', (select count(*) from bk), 'telat', (select count(*) from late),
      'telat_denda', (select count(*) from late where late_fee > 0), 'telat_tanpa', (select count(*) from late where late_fee = 0),
      'jam_tanpa', (select round(coalesce(sum(late_h), 0), 1) from late where late_fee = 0),
      'ditagih', (select coalesce(sum(late_fee), 0) from bk), 'rate', rate, 'rate_src', case when nullif(tar->>'telat_per_jam', '') is not null then 'aturan' else 'rata-rata kasir' end,
      'belum', (select round(coalesce(sum(late_h), 0) * coalesce(rate, 0), -3) from late where late_fee = 0),
      'list', (select coalesce(jsonb_agg(jsonb_build_object('code', code, 'label', label, 'branch', branch, 'jam', round(late_h::numeric, 1), 'at', actual_end_at) order by late_h desc), '[]'::jsonb)
               from (select * from late where late_fee = 0 order by late_h desc limit 8) q)),
    'tanpa_sewa', jsonb_build_object(
      'n', (select count(*) from gps_alerts a join veh v on v.id = a.unit_id where a.kind = 'gerak_tanpa_sewa' and a.created_at > now() - interval '7 days'),
      'units', (select coalesce(jsonb_agg(distinct v.label), '[]'::jsonb) from gps_alerts a join veh v on v.id = a.unit_id where a.kind = 'gerak_tanpa_sewa' and a.created_at > now() - interval '7 days')),
    'tujuan', jsonb_build_object(
      'sewa', (select count(*) from dest), 'since', (select min(at) from app.gps_points),
      'avg_km', (select round(avg(km), 1) from dest),
      'top', (select coalesce(jsonb_agg(jsonb_build_object('place', place, 'n', n, 'km', km, 'lat', lat, 'lng', lng) order by n desc, km), '[]'::jsonb)
              from (select place, count(*) n, round(avg(km), 0) km, avg(lat) lat, avg(lng) lng from dest group by place) q)),
    'jam', (select coalesce(jsonb_agg(jsonb_build_object('h', h, 'n', n) order by h), '[]'::jsonb) from (
              select extract(hour from st at time zone 'Asia/Jakarta')::int h, count(*) n from bk group by 1) q),
    'tidur', (select coalesce(jsonb_agg(x order by (x->>'hari')::int desc), '[]'::jsonb) from (
              select jsonb_build_object('label', v.label, 'branch', v.branch, 'status', v.ustatus,
                'hari', floor(extract(epoch from now() - coalesce(lb.last_end, v.connected_at, now() - interval '60 days')) / 86400)::int) x
              from veh v left join lateral (select max(coalesce(k.actual_end_at, k.end_at)) last_end from bookings k join booking_items bi on bi.booking_id = k.id
                                            where bi.unit_id = v.id and k.status::text not in ('cancelled','rejected')) lb on true
              where v.ustatus = 'ready' and not exists (select 1 from bookings k join booking_items bi on bi.booking_id = k.id where bi.unit_id = v.id and k.status = 'active')
                and coalesce(lb.last_end, now() - interval '60 days') < now() - interval '3 days'
              limit 40) q),
    'boros', jsonb_build_object(
      'tanpa_unit', (select coalesce(jsonb_agg(msg->>'micodus.name' order by msg->>'micodus.name'), '[]'::jsonb) from raw where matched is null and at > now() - interval '1 day'),
      'mati30', (select count(*) from raw where msg->>'micodus.status' = 'Offline' and to_timestamp((msg->>'timestamp')::double precision) < now() - interval '30 days'),
      'nunggak', (select coalesce(sync.meta->'arrears', '[]'::jsonb) from sync)),
    'aki', jsonb_build_object(
      'cfg', coalesce(app.gps_set('gps_aki'), '{}'::jsonb),
      'terpantau', (select count(*) from veh where connected_at is not null),
      'ada_data', (select count(*) from veh where last_power_v is not null and last_online_at > now() - interval '1 day'),
      'units', (select coalesce(jsonb_agg(jsonb_build_object('label', v.label, 'branch', v.branch, 'v', v.last_power_v, 's', app.gps_aki_state(v.id)) order by v.last_power_v), '[]'::jsonb)
                from veh v where v.last_power_v is not null and v.last_online_at > now() - interval '1 day'),
      'alerts', (select coalesce(jsonb_agg(jsonb_build_object('label', v.label, 'kind', a.kind, 'title', a.title, 'detail', a.detail, 'at', a.created_at) order by a.created_at desc), '[]'::jsonb)
                 from gps_alerts a join veh v on v.id = a.unit_id where a.kind like 'aki%' and a.resolved_at is null and a.handled_at is null))
  ) into res;
  return res;
end $function$;
grant execute on function public.gps_insight(uuid) to authenticated;

-- CATATAN: versi yang berjalan di database = migrasi Supabase "gps_insight", "gps_insight_sekitar_cabang" (tujuan ≤ 8 km dipisah per cabang)
-- dan "gps_tarif_save" (gps_tarif_save / gps_tarif_get, khusus owner). gps_sync_meta(p_meta) menggantikan perubahan gps_ingest_service di atas.
