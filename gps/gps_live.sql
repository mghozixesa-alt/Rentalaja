-- GPS live: data dari flespi (uji coba) atau server Traccar sendiri masuk lewat edge function gps-ingest.
-- Menyimpan jejak posisi, menghitung peringatan, dan menyediakan data peta armada.

alter table public.unit_gps
  add column if not exists platform text,              -- micodus | flespi | traccar
  add column if not exists odo_offset numeric,          -- odometer motor − km GPS saat disambungkan
  add column if not exists connected_at timestamptz,
  add column if not exists connect_odo numeric,         -- km odometer yang diisi saat menyambungkan (menunggu data GPS pertama)
  add column if not exists last_fix_at timestamptz,
  add column if not exists old_server text;

create table if not exists app.gps_points (
  id bigserial primary key,
  unit_id uuid not null,
  at timestamptz not null,
  lat double precision not null,
  lng double precision not null,
  speed numeric,
  ign boolean,
  odo_km numeric
);
create index if not exists gps_points_unit_at on app.gps_points(unit_id, at desc);

create table if not exists public.gps_alerts (
  id bigserial primary key,
  unit_id uuid not null references public.units(id) on delete cascade,
  kind text not null,              -- gerak_tanpa_sewa | sinyal_hilang | telat_jauh
  title text not null,
  detail text,
  sev text not null default 'tinggi',
  lat double precision, lng double precision,
  booking_id uuid,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  handled_by uuid, handled_at timestamptz, note text
);
create unique index if not exists gps_alerts_open on public.gps_alerts(unit_id, kind) where resolved_at is null and handled_at is null;
alter table public.gps_alerts enable row level security;

insert into public.settings(key, grp, label, description, value_type, value, unit, is_public, sort) values
 ('gps_server', 'aset', 'Server GPS', 'Alamat & port server GPS sendiri (Traccar) atau channel flespi untuk perintah SMS ganti server', 'json',
  '{"host":"","port":5023,"rollback":"SERVER,1,d.micodus.net,7700,0#"}'::jsonb, null, false, 1),
 ('gps_geofence_m', 'aset', 'Radius area cabang', 'Unit yang tidak disewa dianggap keluar area bila lebih jauh dari ini', 'number', '500'::jsonb, 'm', false, 2),
 ('gps_offline_min', 'aset', 'Batas sinyal hilang', 'Unit yang sedang disewa dianggap hilang sinyal setelah ini', 'minutes', '30'::jsonb, 'menit', false, 3),
 ('gps_sync_odometer', 'aset', 'Isi km otomatis dari GPS', 'Bila aktif, odometer unit diperbarui dari GPS (dipakai pengingat ganti oli). Nyalakan setelah uji coba lulus.', 'boolean', 'false'::jsonb, null, false, 4)
on conflict (key) do nothing;

create or replace function app.gps_set(k text) returns jsonb language sql stable security definer set search_path = public as
$$ select value from public.settings where key = k $$;

create or replace function app.km_between(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision language sql immutable as $$
  select case when a_lat is null or b_lat is null then null else
    2 * 6371 * asin(sqrt(power(sin(radians(b_lat - a_lat) / 2), 2) + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2))) end $$;

-- Terima pesan flespi (kunci datar "position.latitude") atau Traccar forward JSON ({position, device}).
create or replace function public.gps_ingest(p_token text, p_msgs jsonb)
returns integer language plpgsql security definer set search_path = public as $function$
declare m jsonb; p jsonb; a jsonb; idt text; uid uuid; n int := 0; ts timestamptz; plat text;
  v_lat double precision; v_lng double precision; v_spd numeric; v_odo numeric; v_pow numeric; v_ign boolean; sync boolean;
begin
  if p_token is null or not exists (select 1 from app.gps_secret where token = p_token) then raise exception 'token salah'; end if;
  sync := coalesce((app.gps_set('gps_sync_odometer'))::text::boolean, false);
  for m in select * from jsonb_array_elements(case when jsonb_typeof(p_msgs) = 'array' then p_msgs else jsonb_build_array(p_msgs) end) loop
    if m ? 'position' and jsonb_typeof(m->'position') = 'object' then
      p := m->'position'; a := coalesce(p->'attributes', '{}'::jsonb); plat := 'traccar';
      idt := regexp_replace(coalesce(m->'device'->>'uniqueId', ''), '\D', '', 'g');
      ts := coalesce((p->>'fixTime')::timestamptz, (p->>'deviceTime')::timestamptz, now());
      v_lat := (p->>'latitude')::double precision; v_lng := (p->>'longitude')::double precision;
      if coalesce((p->>'valid')::boolean, true) = false and v_lat = 0 then v_lat := null; v_lng := null; end if;
      v_spd := round(((p->>'speed')::numeric) * 1.852, 1);               -- knot → km/jam
      v_odo := round(coalesce((a->>'odometer')::numeric, (a->>'totalDistance')::numeric) / 1000, 1); -- meter → km
      v_pow := (a->>'power')::numeric; v_ign := (a->>'ignition')::boolean;
    else
      plat := 'flespi';
      idt := regexp_replace(coalesce(m->>'ident', ''), '\D', '', 'g');
      ts := coalesce(to_timestamp((m->>'timestamp')::double precision), now());
      v_lat := (m->>'position.latitude')::double precision; v_lng := (m->>'position.longitude')::double precision;
      v_spd := (m->>'position.speed')::numeric;
      v_odo := coalesce((m->>'vehicle.mileage')::numeric, (m->>'device.mileage')::numeric);
      v_pow := (m->>'external.powersource.voltage')::numeric; v_ign := (m->>'engine.ignition.status')::boolean;
    end if;
    if idt = '' then continue; end if;
    select g.unit_id into uid from unit_gps g where g.ident = idt or g.imei = idt
       or (length(idt) >= 10 and (g.imei like '%' || ltrim(idt, '0') or idt like '%' || g.imei)) limit 1;
    insert into app.gps_raw(ident, matched, msg) values (idt, uid, m);
    if uid is null then continue; end if;
    update unit_gps set ident = idt, platform = coalesce(platform, plat), connected_at = coalesce(connected_at, now()),
      last_online_at = greatest(coalesce(last_online_at, ts), ts),
      last_fix_at = case when v_lat is not null and (last_fix_at is null or ts >= last_fix_at) then ts else last_fix_at end,
      last_lat = case when v_lat is not null and (last_fix_at is null or ts >= last_fix_at) then v_lat else last_lat end,
      last_lng = case when v_lat is not null and (last_fix_at is null or ts >= last_fix_at) then v_lng else last_lng end,
      last_speed = coalesce(v_spd, last_speed), last_odo_km = coalesce(v_odo, last_odo_km),
      last_power_v = coalesce(v_pow, last_power_v), last_ignition = coalesce(v_ign, last_ignition),
      odo_offset = case when odo_offset is null and connect_odo is not null and v_odo is not null then connect_odo - v_odo else odo_offset end
    where unit_id = uid;
    if v_lat is not null and v_lat <> 0 then
      insert into app.gps_points(unit_id, at, lat, lng, speed, ign, odo_km) values (uid, ts, v_lat, v_lng, v_spd, v_ign, v_odo);
    end if;
    if sync and v_odo is not null then
      update units u set odometer_km = round(v_odo + g.odo_offset, 1) from unit_gps g
       where u.id = uid and g.unit_id = uid and g.odo_offset is not null and v_odo + g.odo_offset > coalesce(u.odometer_km, 0);
    end if;
    n := n + 1;
  end loop;
  delete from app.gps_raw where at < now() - interval '3 days';
  return n;
end $function$;

-- Status sewa & jarak ke cabang per unit ber-GPS
create or replace function app.gps_state()
returns table(unit_id uuid, branch_id uuid, ustatus text, lat double precision, lng double precision, speed numeric, ign boolean,
  online_at timestamptz, dist_km double precision, booking_id uuid, booking_code text, booking_end timestamptz, guest text)
language sql stable security definer set search_path = public as $$
  select g.unit_id, u.branch_id, u.status::text, g.last_lat, g.last_lng, g.last_speed, g.last_ignition, g.last_online_at,
    app.km_between(b.lat, b.lng, g.last_lat, g.last_lng),
    k.id, k.code, k.end_at, k.guest_name
  from unit_gps g join units u on u.id = g.unit_id left join branches b on b.id = u.branch_id
  left join lateral (select bk.id, bk.code, bk.end_at, bk.guest_name from booking_items bi join bookings bk on bk.id = bi.booking_id
                     where bi.unit_id = g.unit_id and bk.status = 'active' order by bk.start_at desc limit 1) k on true
  where g.connected_at is not null and u.archived_at is null
$$;

-- Penjaga peringatan (cron tiap 5 menit)
create or replace function app.gps_check() returns integer language plpgsql security definer set search_path = public as $function$
declare r record; geo numeric; offm int; nw int := 0; aid bigint; lbl text; s record; t text; d text; k text; sev text;
begin
  geo := coalesce((app.gps_set('gps_geofence_m'))::text::numeric, 500) / 1000.0;
  offm := coalesce((app.gps_set('gps_offline_min'))::text::int, 30);
  for r in select * from app.gps_state() loop
    for k in select unnest(array['gerak_tanpa_sewa','sinyal_hilang','telat_jauh']) loop
      t := null;
      if k = 'gerak_tanpa_sewa' and r.booking_id is null and r.ustatus in ('ready','qc','service')
         and r.online_at > now() - interval '15 minutes' and (coalesce(r.speed, 0) > 5 or coalesce(r.dist_km, 0) > geo) then
        t := 'Bergerak saat tidak disewa'; sev := 'tinggi';
        d := coalesce(round(r.dist_km::numeric, 1)::text || ' km dari cabang', 'jarak cabang belum ada') || coalesce(' · ' || round(r.speed) || ' km/jam', '');
      elsif k = 'sinyal_hilang' and r.booking_id is not null and r.online_at < now() - make_interval(mins => offm) then
        t := 'Sinyal hilang saat disewa'; sev := 'tinggi';
        d := r.booking_code || ' · terakhir ' || to_char(r.online_at at time zone 'Asia/Jakarta', 'DD/MM HH24.MI');
      elsif k = 'telat_jauh' and r.booking_id is not null and r.booking_end < now() - interval '30 minutes' and coalesce(r.dist_km, 0) > 2 then
        t := 'Telat kembali & masih jauh'; sev := 'sedang';
        d := r.booking_code || ' · ' || round(r.dist_km::numeric, 1) || ' km dari cabang · jadwal ' || to_char(r.booking_end at time zone 'Asia/Jakarta', 'DD/MM HH24.MI');
      end if;
      if t is null then
        update gps_alerts set resolved_at = now() where unit_id = r.unit_id and gps_alerts.kind = k and resolved_at is null and handled_at is null;
        continue;
      end if;
      update gps_alerts set last_seen_at = now(), detail = d, lat = r.lat, lng = r.lng
        where unit_id = r.unit_id and gps_alerts.kind = k and resolved_at is null and handled_at is null returning id into aid;
      if aid is null then
        -- sudah ditandai dicek < 2 jam lalu untuk kejadian yang sama: jangan bunyi lagi
        if exists (select 1 from gps_alerts x where x.unit_id = r.unit_id and x.kind = k and x.handled_at > now() - interval '2 hours') then continue; end if;
        insert into gps_alerts(unit_id, kind, title, detail, sev, lat, lng, booking_id) values (r.unit_id, k, t, d, sev, r.lat, r.lng, r.booking_id);
        nw := nw + 1;
        select coalesce(u.plate_or_serial, u.asset_no, u.code) || ' · ' || coalesce(p.name, '') into lbl from units u left join products p on p.id = u.product_id where u.id = r.unit_id;
        for s in select st.user_id from staff st where st.is_active
                   and (st.role::text in ('owner','asset_manager') or (k <> 'gerak_tanpa_sewa' and st.role::text in ('cashier','cs')))
                   and (st.all_branches or st.role::text = 'owner' or exists (select 1 from staff_branches sb where sb.staff_id = st.user_id and sb.branch_id = r.branch_id)) loop
          perform app.ra_push(s.user_id, 'ra_gps', '📡 ' || t, lbl || ' · ' || d, 'https://rentalaja.co.id/#/AsetPeta', sev = 'tinggi');
        end loop;
      end if;
      aid := null;
    end loop;
  end loop;
  delete from app.gps_points where at < now() - interval '60 days';
  return nw;
end $function$;

-- Peta armada
create or replace function public.gps_fleet(p_branch uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $function$
declare res jsonb;
begin
  if not (app.has_perm('mgmt.assets') or app.has_perm('pos.units') or app.has_perm('mgmt.reports') or app.has_perm('pos.bookings')) then raise exception 'Tidak berwenang'; end if;
  with st as (select * from app.gps_state()),
  veh as (select u.id, u.branch_id, coalesce(u.plate_or_serial, u.asset_no, u.code) label, u.asset_no, p.name product, b.name branch, b.lat blat, b.lng blng,
            g.connected_at, g.provider, g.imei is not null has_imei
          from units u join products p on p.id = u.product_id join categories c on c.id = p.category_id left join branches b on b.id = u.branch_id
          left join unit_gps g on g.unit_id = u.id
          where u.archived_at is null and u.status::text <> 'inactive' and c.slug in ('motor','mobil','mobil-sopir','jeep')
            and (p_branch is null or u.branch_id = p_branch) and app.in_branch(u.branch_id)),
  rows as (
    select v.*, s.lat, s.lng, s.speed, s.ign, s.online_at, s.dist_km, s.booking_code, s.booking_end, s.guest, s.ustatus,
      (select jsonb_build_object('id', a.id, 'kind', a.kind, 'title', a.title, 'detail', a.detail, 'sev', a.sev, 'at', a.created_at)
         from gps_alerts a where a.unit_id = v.id and a.resolved_at is null and a.handled_at is null order by a.created_at desc limit 1) alert,
      (select round((max(pt.odo_km) - min(pt.odo_km))::numeric, 1) from app.gps_points pt where pt.unit_id = v.id and pt.at >= date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') km_today
    from veh v left join st s on s.unit_id = v.id)
  select jsonb_build_object(
    'kpi', jsonb_build_object(
      'kendaraan', count(*), 'data_alat', count(*) filter (where has_imei), 'terhubung', count(*) filter (where connected_at is not null),
      'online', count(*) filter (where online_at > now() - interval '10 minutes'),
      'disewa', count(*) filter (where booking_code is not null and connected_at is not null),
      'di_cabang', count(*) filter (where booking_code is null and dist_km is not null and dist_km <= coalesce((app.gps_set('gps_geofence_m'))::text::numeric, 500) / 1000.0),
      'peringatan', count(*) filter (where alert is not null),
      'sinyal_hilang', count(*) filter (where connected_at is not null and (online_at is null or online_at < now() - interval '30 minutes')),
      'km_hari_ini', coalesce(sum(km_today), 0)),
    'units', coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', label, 'asset_no', asset_no, 'product', product, 'branch', branch, 'provider', provider,
       'connected', connected_at is not null, 'lat', lat, 'lng', lng, 'speed', speed, 'ign', ign, 'online_at', online_at, 'dist_km', round(dist_km::numeric, 2),
       'booking', booking_code, 'booking_end', booking_end, 'guest', guest, 'status', ustatus, 'alert', alert, 'km_today', km_today, 'blat', blat, 'blng', blng)
       order by (alert is null), (connected_at is null), branch, label), '[]'::jsonb),
    'branches', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'lat', b.lat, 'lng', b.lng) order by b.name), '[]'::jsonb)
                 from branches b where b.lat is not null and app.in_branch(b.id)),
    'alerts', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
       select jsonb_build_object('id', a.id, 'unit_id', a.unit_id, 'kind', a.kind, 'title', a.title, 'detail', a.detail, 'sev', a.sev, 'at', a.created_at,
         'seen', a.last_seen_at, 'lat', a.lat, 'lng', a.lng, 'label', coalesce(u.plate_or_serial, u.asset_no, u.code), 'product', p.name, 'branch', b.name,
         'open', a.resolved_at is null and a.handled_at is null, 'note', a.note, 'handled_at', a.handled_at, 'resolved_at', a.resolved_at) x
       from gps_alerts a join units u on u.id = a.unit_id left join products p on p.id = u.product_id left join branches b on b.id = u.branch_id
       where (a.created_at > now() - interval '3 days' or (a.resolved_at is null and a.handled_at is null))
         and (p_branch is null or u.branch_id = p_branch) and app.in_branch(u.branch_id)
       order by a.created_at desc limit 100) q),
    'server', (select value - 'rollback' || jsonb_build_object('ok', coalesce(value->>'host', '') <> '') from settings where key = 'gps_server'),
    'sync_odo', coalesce((app.gps_set('gps_sync_odometer'))::text::boolean, false)
  ) into res from rows;
  return res;
end $function$;

-- Detail GPS satu unit: rute hari (default hari ini), km per sewa
create or replace function public.gps_unit(p_unit uuid, p_day date default null) returns jsonb
language plpgsql stable security definer set search_path = public as $function$
declare d date := coalesce(p_day, (now() at time zone 'Asia/Jakarta')::date); t0 timestamptz; t1 timestamptz; g record; res jsonb;
begin
  if not (app.has_perm('mgmt.assets') or app.has_perm('pos.units') or app.has_perm('mgmt.reports') or app.has_perm('pos.bookings')) then raise exception 'Tidak berwenang'; end if;
  t0 := d::timestamp at time zone 'Asia/Jakarta'; t1 := t0 + interval '1 day';
  select * into g from unit_gps where unit_id = p_unit;
  select jsonb_build_object(
    'day', d,
    'gps', case when g.unit_id is null then null else jsonb_build_object('provider', g.provider, 'platform', g.platform, 'connected_at', g.connected_at,
       'lat', g.last_lat, 'lng', g.last_lng, 'speed', g.last_speed, 'ign', g.last_ignition, 'power', g.last_power_v, 'online_at', g.last_online_at, 'fix_at', g.last_fix_at,
       'gps_km', g.last_odo_km, 'odo', case when g.odo_offset is not null and g.last_odo_km is not null then round(g.last_odo_km + g.odo_offset, 1) end,
       'connect_odo', g.connect_odo, 'imei4', right(g.imei, 4), 'sim4', right(g.sim_phone, 4), 'sim', g.sim_phone, 'has_imei', g.imei is not null, 'has_sim', g.sim_phone is not null) end,
    'state', (select to_jsonb(s) from app.gps_state() s where s.unit_id = p_unit),
    'branch', (select jsonb_build_object('lat', b.lat, 'lng', b.lng, 'name', b.name) from units u join branches b on b.id = u.branch_id where u.id = p_unit),
    'points', (select coalesce(jsonb_agg(jsonb_build_array(round(pt.lat::numeric, 6), round(pt.lng::numeric, 6), extract(epoch from pt.at)::bigint, pt.speed) order by pt.at), '[]'::jsonb)
               from (select * from app.gps_points where unit_id = p_unit and at >= t0 and at < t1 order by at limit 3000) pt),
    'km_day', (select round((max(odo_km) - min(odo_km))::numeric, 1) from app.gps_points where unit_id = p_unit and at >= t0 and at < t1),
    'rentals', (select coalesce(jsonb_agg(x order by x->>'start' desc), '[]'::jsonb) from (
        select jsonb_build_object('code', bk.code, 'start', bk.start_at, 'end', bk.end_at, 'status', bk.status,
          'km', (select round((max(odo_km) - min(odo_km))::numeric, 1) from app.gps_points pt where pt.unit_id = p_unit and pt.at between bk.start_at - interval '2 hours' and least(now(), bk.end_at + interval '6 hours'))) x
        from booking_items bi join bookings bk on bk.id = bi.booking_id
        where bi.unit_id = p_unit and bk.status in ('active','completed') and bk.start_at > now() - interval '60 days' order by bk.start_at desc limit 8) q),
    'alerts', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'detail', a.detail, 'sev', a.sev, 'at', a.created_at,
                 'open', a.resolved_at is null and a.handled_at is null, 'note', a.note) order by a.created_at desc), '[]'::jsonb)
               from (select * from gps_alerts where unit_id = p_unit order by created_at desc limit 10) a),
    'server', (select value || jsonb_build_object('ok', coalesce(value->>'host', '') <> '') from settings where key = 'gps_server')
  ) into res;
  return res;
end $function$;

-- Sambungkan alat: simpan platform & km odometer saat ini (offset dihitung saat data GPS pertama masuk)
create or replace function public.gps_connect(p_unit uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $function$
declare odo numeric := nullif(regexp_replace(coalesce(p->>'odometer_km', ''), '[^0-9.]', '', 'g'), '')::numeric;
begin
  if not (app.has_perm('mgmt.assets') or app.has_perm('pos.units') or app.has_perm('field.workorder')) then raise exception 'Tidak berwenang'; end if;
  if not exists (select 1 from unit_gps where unit_id = p_unit and imei is not null) then raise exception 'Isi IMEI alat dulu di data GPS'; end if;
  update unit_gps set platform = coalesce(nullif(p->>'platform', ''), platform, 'traccar'),
    connect_odo = coalesce(odo, connect_odo),
    odo_offset = case when odo is not null and last_odo_km is not null and last_online_at > now() - interval '1 day' then odo - last_odo_km
                      when odo is not null then null else odo_offset end,
    old_server = coalesce(old_server, nullif(p->>'old_server', '')),
    updated_by = auth.uid(), updated_at = now()
  where unit_id = p_unit;
  insert into audit_log(actor, actor_name, tbl, row_id, action, note) values (auth.uid(), (select name from staff where user_id = auth.uid()), 'units', p_unit::text, 'gps_sambung',
    'Alat GPS diarahkan ke server baru' || coalesce(' · odometer ' || odo || ' km', ''));
  return jsonb_build_object('ok', true);
end $function$;

-- Kembalikan ke aplikasi lama (setelah SMS rollback dikirim)
create or replace function public.gps_disconnect(p_unit uuid) returns jsonb
language plpgsql security definer set search_path = public as $function$
begin
  if not (app.has_perm('mgmt.assets') or app.has_perm('pos.units') or app.has_perm('field.workorder')) then raise exception 'Tidak berwenang'; end if;
  update unit_gps set connected_at = null, platform = null, odo_offset = null, connect_odo = null, updated_by = auth.uid(), updated_at = now() where unit_id = p_unit;
  update gps_alerts set resolved_at = now() where unit_id = p_unit and resolved_at is null;
  insert into audit_log(actor, actor_name, tbl, row_id, action, note) values (auth.uid(), (select name from staff where user_id = auth.uid()), 'units', p_unit::text, 'gps_lepas', 'GPS dikembalikan ke aplikasi lama');
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.gps_alert_done(p_id bigint, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $function$
begin
  if not (app.has_perm('mgmt.assets') or app.has_perm('pos.units') or app.has_perm('pos.bookings')) then raise exception 'Tidak berwenang'; end if;
  update gps_alerts set handled_by = auth.uid(), handled_at = now(), note = nullif(trim(coalesce(p_note, '')), '') where id = p_id and handled_at is null;
  return jsonb_build_object('ok', true);
end $function$;

-- Owner: atur server GPS & km otomatis
create or replace function public.gps_settings_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $function$
begin
  if not exists (select 1 from staff where user_id = auth.uid() and is_active and role::text = 'owner') then raise exception 'Khusus owner'; end if;
  if p ? 'server' then update settings set value = value || (p->'server'), updated_by = auth.uid(), updated_at = now() where key = 'gps_server'; end if;
  if p ? 'sync_odometer' then update settings set value = to_jsonb((p->>'sync_odometer')::boolean), updated_by = auth.uid(), updated_at = now() where key = 'gps_sync_odometer'; end if;
  return jsonb_build_object('ok', true);
end $function$;

revoke all on function public.gps_fleet(uuid), public.gps_unit(uuid, date), public.gps_connect(uuid, jsonb), public.gps_disconnect(uuid),
  public.gps_alert_done(bigint, text), public.gps_settings_save(jsonb) from public, anon;
grant execute on function public.gps_fleet(uuid), public.gps_unit(uuid, date), public.gps_connect(uuid, jsonb), public.gps_disconnect(uuid),
  public.gps_alert_done(bigint, text), public.gps_settings_save(jsonb) to authenticated;
revoke all on function app.gps_check(), app.gps_state() from public, anon, authenticated;

select cron.schedule('ra-gps-cek', '*/5 * * * *', 'select app.gps_check()');
