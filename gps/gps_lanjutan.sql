-- GPS lanjutan: km otomatis di serah-terima, batas wilayah sewa, skor berkendara per sewa, perintah matikan mesin (log)

insert into public.settings(key, grp, label, description, value_type, value, unit, is_public, sort) values
 ('gps_zone_km', 'aset', 'Batas wilayah sewa', 'Unit yang sedang disewa lebih jauh dari ini (garis lurus dari cabang) memicu peringatan keluar wilayah', 'number', '100'::jsonb, 'km', false, 5),
 ('gps_speed_limit', 'aset', 'Batas kecepatan', 'Titik GPS di atas kecepatan ini dihitung ngebut untuk skor berkendara', 'number', '80'::jsonb, 'km/jam', false, 6),
 ('gps_cmd', 'aset', 'Perintah alat GPS', 'Perintah flespi untuk matikan / hidupkan mesin (MiCODUS MV720: S20)', 'json',
  '{"cut":{"name":"custom","properties":{"command_code":"S20","data":"1,1"}},"restore":{"name":"custom","properties":{"command_code":"S20","data":"0,0"}},"max_speed":20}'::jsonb, null, false, 7)
on conflict (key) do nothing;

create table if not exists public.gps_trip_scores (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  unit_id uuid, customer_id uuid,
  km numeric, max_speed numeric, speeding int not null default 0, out_zone boolean not null default false, max_dist_km numeric,
  late_min int not null default 0, points int not null default 0, score int, final boolean not null default false,
  computed_at timestamptz not null default now()
);
create index if not exists gps_trip_scores_cust on public.gps_trip_scores(customer_id);
alter table public.gps_trip_scores enable row level security;

create table if not exists app.gps_cmd_log (
  id bigserial primary key, unit_id uuid not null, action text not null, reason text not null,
  by_user uuid, by_name text, ident text, at timestamptz not null default now(),
  ok boolean, response text, done_at timestamptz
);

-- Skor satu booking dari jejak GPS
create or replace function app.gps_score_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $function$
declare b record; t0 timestamptz; t1 timestamptz; lim numeric; zone numeric; s record; late int; sc int; fin boolean;
begin
  select bk.id, bk.customer_id, bk.start_at, bk.end_at, bk.status::text st, bk.branch_id, bi.unit_id, br.lat blat, br.lng blng
    into b from bookings bk join booking_items bi on bi.booking_id = bk.id join unit_gps g on g.unit_id = bi.unit_id and g.connected_at is not null
    left join branches br on br.id = bk.branch_id
    where bk.id = p_booking limit 1;
  if b.id is null then return; end if;
  select min(at) filter (where direction = 'out'), max(at) filter (where direction = 'in'), max(late_minutes) filter (where direction = 'in')
    into t0, t1, late from handovers where booking_id = p_booking;
  t0 := coalesce(t0, b.start_at); t1 := coalesce(t1, case when b.st = 'active' then now() else b.end_at end);
  lim := coalesce((app.gps_set('gps_speed_limit'))::text::numeric, 80);
  zone := coalesce((app.gps_set('gps_zone_km'))::text::numeric, 100);
  select count(*) n, round(max(speed), 0) vmax, count(*) filter (where speed > lim) fast,
         round((max(odo_km) - min(odo_km))::numeric, 1) km, round(max(app.km_between(b.blat, b.blng, lat, lng))::numeric, 1) dmax
    into s from app.gps_points where unit_id = b.unit_id and at between t0 and t1;
  if coalesce(s.n, 0) = 0 then return; end if;
  sc := 100 - least(40, coalesce(s.fast, 0) * 2) - case when coalesce(s.dmax, 0) > zone then 30 else 0 end
        - least(20, greatest(coalesce(late, 0), 0) / 30 * 5);
  fin := b.st in ('completed', 'returned', 'cancelled');
  insert into gps_trip_scores(booking_id, unit_id, customer_id, km, max_speed, speeding, out_zone, max_dist_km, late_min, points, score, final, computed_at)
  values (b.id, b.unit_id, b.customer_id, s.km, s.vmax, coalesce(s.fast, 0), coalesce(s.dmax, 0) > zone, s.dmax, coalesce(late, 0), s.n, greatest(sc, 0), fin, now())
  on conflict (booking_id) do update set km = excluded.km, max_speed = excluded.max_speed, speeding = excluded.speeding, out_zone = excluded.out_zone,
    max_dist_km = excluded.max_dist_km, late_min = excluded.late_min, points = excluded.points, score = excluded.score, final = excluded.final, computed_at = now();
end $function$;

-- Ringkasan cara berkendara satu pelanggan (dipakai Cek calon penyewa)
create or replace function app.gps_drive_summary(p_customer uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when count(*) = 0 then null else jsonb_build_object('trips', count(*), 'score', round(avg(score)), 'speeding', sum(speeding),
    'out_zone', count(*) filter (where out_zone), 'max_speed', max(max_speed), 'km', round(sum(coalesce(km, 0)))) end
  from gps_trip_scores where customer_id = p_customer and score is not null
$$;

-- Km & posisi otomatis saat serah-terima; kalibrasi odometer pertama dari km yang diketik kasir
create or replace function app.t_handover_gps() returns trigger
language plpgsql security definer set search_path = public as $function$
declare g record;
begin
  select * into g from unit_gps where unit_id = new.unit_id and connected_at is not null and last_online_at > now() - interval '2 hours';
  if g.unit_id is null then return new; end if;
  if new.km is not null and g.odo_offset is null and g.last_odo_km is not null then
    update unit_gps set odo_offset = new.km - g.last_odo_km where unit_id = g.unit_id;
  elsif new.km is null and g.odo_offset is not null and g.last_odo_km is not null then
    new.km := round(g.last_odo_km + g.odo_offset);
  end if;
  new.checklist := coalesce(new.checklist, '{}'::jsonb) || jsonb_build_object('gps', jsonb_build_object('lat', g.last_lat, 'lng', g.last_lng, 'at', g.last_fix_at,
    'km_gps', case when g.odo_offset is not null and g.last_odo_km is not null then round(g.last_odo_km + g.odo_offset) end));
  return new;
end $function$;
drop trigger if exists t_handover_gps on public.handovers;
create trigger t_handover_gps before insert on public.handovers for each row execute function app.t_handover_gps();

-- Penjaga peringatan + skor (cron tiap 5 menit)
create or replace function app.gps_check() returns integer language plpgsql security definer set search_path = public as $function$
declare r record; geo numeric; offm int; zone numeric; nw int := 0; aid bigint; lbl text; s record; t text; d text; k text; sev text; bid uuid;
begin
  geo := coalesce((app.gps_set('gps_geofence_m'))::text::numeric, 500) / 1000.0;
  offm := coalesce((app.gps_set('gps_offline_min'))::text::int, 30);
  zone := coalesce((app.gps_set('gps_zone_km'))::text::numeric, 100);
  for r in select * from app.gps_state() loop
    foreach k in array array['gerak_tanpa_sewa','sinyal_hilang','telat_jauh','keluar_wilayah'] loop
      t := null; aid := null;
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
      elsif k = 'keluar_wilayah' and r.booking_id is not null and coalesce(r.dist_km, 0) > zone then
        t := 'Keluar wilayah sewa'; sev := 'tinggi';
        d := r.booking_code || ' · ' || round(r.dist_km::numeric) || ' km dari cabang (batas ' || zone || ' km)';
      end if;
      if t is null then
        update gps_alerts set resolved_at = now() where gps_alerts.unit_id = r.unit_id and gps_alerts.kind = k and resolved_at is null and handled_at is null;
        continue;
      end if;
      update gps_alerts set last_seen_at = now(), detail = d, lat = r.lat, lng = r.lng
        where gps_alerts.unit_id = r.unit_id and gps_alerts.kind = k and resolved_at is null and handled_at is null returning id into aid;
      if aid is not null then continue; end if;
      if exists (select 1 from gps_alerts x where x.unit_id = r.unit_id and x.kind = k and x.handled_at > now() - interval '2 hours') then continue; end if;
      insert into gps_alerts(unit_id, kind, title, detail, sev, lat, lng, booking_id) values (r.unit_id, k, t, d, sev, r.lat, r.lng, r.booking_id);
      nw := nw + 1;
      select coalesce(u.plate_or_serial, u.asset_no, u.code) || ' · ' || coalesce(p.name, '') into lbl from units u left join products p on p.id = u.product_id where u.id = r.unit_id;
      for s in select st.user_id from staff st where st.is_active
                 and (st.role::text in ('owner','asset_manager') or (k <> 'gerak_tanpa_sewa' and st.role::text in ('cashier','cs')))
                 and (st.all_branches or st.role::text = 'owner' or exists (select 1 from staff_branches sb where sb.staff_id = st.user_id and sb.branch_id = r.branch_id)) loop
        perform app.ra_push(s.user_id, 'ra_gps', '📡 ' || t, lbl || ' · ' || d, 'https://rentalaja.co.id/#/AsetPeta', sev = 'tinggi');
      end loop;
    end loop;
  end loop;
  -- skor berkendara: sewa yang berjalan + yang baru selesai (belum final)
  for bid in select distinct bk.id from bookings bk join booking_items bi on bi.booking_id = bk.id join unit_gps g on g.unit_id = bi.unit_id and g.connected_at is not null
             left join gps_trip_scores ts on ts.booking_id = bk.id
             where (bk.status = 'active' or (bk.status::text in ('completed','returned') and bk.end_at > now() - interval '3 days')) and coalesce(ts.final, false) = false limit 300 loop
    perform app.gps_score_booking(bid);
  end loop;
  delete from app.gps_points where at < now() - interval '60 days';
  return nw;
end $function$;

-- Perintah alat: disiapkan & dicatat di database, dikirim oleh edge function gps-cmd
create or replace function public.gps_cmd_prepare(p_unit uuid, p_action text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $function$
declare g record; cfg jsonb; id bigint;
begin
  if not exists (select 1 from staff where user_id = auth.uid() and is_active and role::text = 'owner') or not app.has_perm('mgmt.assets') then raise exception 'Khusus owner'; end if;
  if p_action not in ('cut', 'restore') then raise exception 'Aksi tidak dikenal'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'Isi alasan (minimal 5 huruf)'; end if;
  select * into g from unit_gps where unit_id = p_unit;
  if g.unit_id is null or g.connected_at is null or g.ident is null then raise exception 'Alat GPS unit ini belum tersambung'; end if;
  cfg := app.gps_set('gps_cmd');
  if p_action = 'cut' and coalesce(g.last_speed, 0) > coalesce((cfg->>'max_speed')::numeric, 20) and g.last_online_at > now() - interval '10 minutes' then
    raise exception 'Unit sedang melaju % km/jam. Matikan mesin hanya saat pelan/berhenti demi keselamatan.', round(g.last_speed);
  end if;
  insert into app.gps_cmd_log(unit_id, action, reason, by_user, by_name, ident) values (p_unit, p_action, trim(p_reason), auth.uid(), (select name from staff where user_id = auth.uid()), g.ident) returning gps_cmd_log.id into id;
  insert into audit_log(actor, actor_name, tbl, row_id, action, note) values (auth.uid(), (select name from staff where user_id = auth.uid()), 'units', p_unit::text,
    'gps_' || p_action, case when p_action = 'cut' then 'Matikan mesin: ' else 'Hidupkan mesin: ' end || trim(p_reason));
  return jsonb_build_object('log_id', id, 'ident', g.ident, 'command', cfg->p_action, 'platform', g.platform);
end $function$;

create or replace function public.gps_cmd_result(p_log bigint, p_ok boolean, p_resp text) returns void
language plpgsql security definer set search_path = public as $function$
begin
  update app.gps_cmd_log set ok = p_ok, response = left(p_resp, 2000), done_at = now() where id = p_log and by_user = auth.uid() and done_at is null;
end $function$;

-- gps_unit: tambah skor per sewa & riwayat perintah
create or replace function public.gps_unit(p_unit uuid, p_day date default null) returns jsonb
language plpgsql stable security definer set search_path = public as $function$
declare d date := coalesce(p_day, (now() at time zone 'Asia/Jakarta')::date); t0 timestamptz; t1 timestamptz; g record; res jsonb;
begin
  if not (app.has_perm('mgmt.assets') or app.has_perm('pos.units') or app.has_perm('mgmt.reports') or app.has_perm('pos.bookings') or app.has_perm('field.workorder')) then raise exception 'Tidak berwenang'; end if;
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
          'km', coalesce(ts.km, (select round((max(odo_km) - min(odo_km))::numeric, 1) from app.gps_points pt where pt.unit_id = p_unit and pt.at between bk.start_at - interval '2 hours' and least(now(), bk.end_at + interval '6 hours'))),
          'score', ts.score, 'speeding', ts.speeding, 'max_speed', ts.max_speed, 'out_zone', ts.out_zone, 'max_dist', ts.max_dist_km) x
        from booking_items bi join bookings bk on bk.id = bi.booking_id left join gps_trip_scores ts on ts.booking_id = bk.id
        where bi.unit_id = p_unit and bk.status in ('active','completed') and bk.start_at > now() - interval '60 days' order by bk.start_at desc limit 8) q),
    'alerts', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'detail', a.detail, 'sev', a.sev, 'at', a.created_at,
                 'open', a.resolved_at is null and a.handled_at is null, 'note', a.note) order by a.created_at desc), '[]'::jsonb)
               from (select * from gps_alerts where unit_id = p_unit order by created_at desc limit 10) a),
    'cmds', (select coalesce(jsonb_agg(jsonb_build_object('action', c.action, 'reason', c.reason, 'by', c.by_name, 'at', c.at, 'ok', c.ok) order by c.at desc), '[]'::jsonb)
             from (select * from app.gps_cmd_log where unit_id = p_unit order by at desc limit 5) c),
    'server', (select value || jsonb_build_object('ok', coalesce(value->>'host', '') <> '') from settings where key = 'gps_server')
  ) into res;
  return res;
end $function$;

revoke all on function public.gps_cmd_prepare(uuid, text, text), public.gps_cmd_result(bigint, boolean, text) from public, anon;
grant execute on function public.gps_cmd_prepare(uuid, text, text), public.gps_cmd_result(bigint, boolean, text) to authenticated;
revoke all on function app.gps_score_booking(uuid), app.gps_drive_summary(uuid), app.t_handover_gps() from public, anon, authenticated;

-- Cek calon penyewa: tambahkan ringkasan cara berkendara dari GPS
do $do$
declare src text;
begin
  src := pg_get_functiondef('public.cs_check_customer(text, text)'::regprocedure);
  if position('''drive''' in src) = 0 then
    src := replace(src, '''label'', label, ''why'', why);', '''label'', label, ''why'', why, ''drive'', app.gps_drive_summary(c.id));');
    execute src;
  end if;
end $do$;
