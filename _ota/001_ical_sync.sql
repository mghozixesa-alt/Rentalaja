-- Sinkron kalender penginapan dengan Airbnb / Agoda / Booking.com lewat iCal
-- Ekspor: https://shrvzlltysnbmgpkhjjg.supabase.co/functions/v1/ical/<export_token>.ics
-- Impor : edge function ical-sync (cron tiap 10 menit) → calendar_blocks source 'ota'
--         (app.free_units sudah menolak tanggal yang ada di calendar_blocks, jadi web otomatis tertutup)

create table if not exists public.ical_feeds (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  channel text not null check (channel in ('airbnb','agoda','bookingcom','lainnya')),
  import_url text check (import_url is null or import_url ~* '^https://'),
  export_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  is_active boolean not null default true,
  last_sync_at timestamptz,
  last_ok_at timestamptz,
  last_status text,          -- ok / gagal / belum
  last_error text,
  last_count int,
  export_hits int not null default 0,
  last_export_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, channel)
);
alter table public.ical_feeds enable row level security; -- tanpa policy: hanya lewat fungsi

alter table public.calendar_blocks
  add column if not exists feed_id uuid references public.ical_feeds(id) on delete cascade,
  add column if not exists ext_uid text,
  add column if not exists ota_kind text,        -- reservasi / tutup
  add column if not exists conflict_note text,
  add column if not exists conflict_at timestamptz;
create unique index if not exists calendar_blocks_feed_uid on public.calendar_blocks(feed_id, ext_uid) where feed_id is not null;

create or replace function app.ical_can() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(app.staff_role() in ('owner','experience_manager','cs_experience','cs','asset_manager'), false)
$$;

create or replace function app.ical_channel_name(c text) returns text language sql immutable as $$
  select case c when 'airbnb' then 'Airbnb' when 'agoda' then 'Agoda' when 'bookingcom' then 'Booking.com' else 'OTA lain' end
$$;

-- ===== Panel staf =====
create or replace function public.ical_admin() returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare r jsonb; base text := 'https://shrvzlltysnbmgpkhjjg.supabase.co/functions/v1/ical/';
begin
  if not app.ical_can() then raise exception 'Tidak berwenang'; end if;
  -- pastikan tiap unit penginapan punya baris Airbnb & Agoda (supaya link ekspor langsung ada)
  insert into public.ical_feeds(unit_id, channel)
  select u.id, ch from public.units u join public.products p on p.id = u.product_id join public.categories c on c.id = p.category_id
  cross join (values ('airbnb'),('agoda')) v(ch)
  where c.kind = 'stay' and u.archived_at is null and u.status <> 'draft'
  on conflict (unit_id, channel) do nothing;

  select jsonb_build_object(
    'now', now(),
    'units', coalesce(jsonb_agg(x order by x->>'branch', x->>'code'), '[]')
  ) into r
  from (
    select jsonb_build_object(
      'id', u.id, 'code', u.code, 'name', p.name, 'branch', b.name,
      'feeds', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', f.id, 'channel', f.channel, 'channel_name', app.ical_channel_name(f.channel),
          'import_url', f.import_url, 'export_url', base || f.export_token || '.ics',
          'last_sync_at', f.last_sync_at, 'last_ok_at', f.last_ok_at, 'last_status', f.last_status, 'last_error', f.last_error,
          'last_count', f.last_count, 'export_hits', f.export_hits, 'last_export_at', f.last_export_at
        ) order by array_position(array['airbnb','agoda','bookingcom','lainnya'], f.channel)), '[]')
        from public.ical_feeds f where f.unit_id = u.id and f.is_active),
      'upcoming', (select coalesce(jsonb_agg(e order by e->>'s'), '[]') from (
          select jsonb_build_object('t', 'web', 's', lower(bi.period), 'e', upper(bi.period), 'code', bk.code, 'guest', bk.guest_name, 'st', bi.status) e
            from public.booking_items bi join public.bookings bk on bk.id = bi.booking_id
           where bi.unit_id = u.id and bi.status in ('held','confirmed','active') and upper(bi.period) > now()
          union all
          select jsonb_build_object('t', coalesce(f.channel, cb.source), 's', lower(cb.period), 'e', upper(cb.period), 'note', cb.reason,
                   'kind', cb.ota_kind, 'conflict', cb.conflict_note)
            from public.calendar_blocks cb left join public.ical_feeds f on f.id = cb.feed_id
           where cb.unit_id = u.id and upper(cb.period) > now()
          limit 60) q),
      'conflicts', (select count(*) from public.calendar_blocks cb where cb.unit_id = u.id and cb.conflict_note is not null and upper(cb.period) > now())
    ) x
    from public.units u join public.products p on p.id = u.product_id join public.categories c on c.id = p.category_id
    left join public.branches b on b.id = u.branch_id
    where c.kind = 'stay' and u.archived_at is null and u.status <> 'draft'
  ) s;
  return r;
end $$;

create or replace function public.ical_feed_save(p_unit uuid, p_channel text, p_url text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f public.ical_feeds; v text := nullif(btrim(p_url), '');
begin
  if not app.ical_can() then raise exception 'Tidak berwenang'; end if;
  if v is not null and v !~* '^https://[^\s]+$' then raise exception 'Link harus diawali https://'; end if;
  if v is not null and v ~* 'supabase\.co/functions/v1/ical/' then raise exception 'Ini link ekspor Rentalaja. Tempel link ini di Airbnb/Agoda, bukan di sini.'; end if;
  insert into public.ical_feeds(unit_id, channel, import_url, last_status)
  values (p_unit, p_channel, v, case when v is null then null else 'belum' end)
  on conflict (unit_id, channel) do update
    set import_url = excluded.import_url, is_active = true, updated_at = now(),
        last_status = case when excluded.import_url is distinct from ical_feeds.import_url then case when excluded.import_url is null then null else 'belum' end else ical_feeds.last_status end,
        last_error = case when excluded.import_url is distinct from ical_feeds.import_url then null else ical_feeds.last_error end,
        last_sync_at = case when excluded.import_url is distinct from ical_feeds.import_url then null else ical_feeds.last_sync_at end
  returning * into f;
  -- link impor dikosongkan → lepas semua tanggal dari kanal ini
  if v is null then delete from public.calendar_blocks where feed_id = f.id; end if;
  if v is not null then perform public.ical_sync_now(f.id); end if;
  return jsonb_build_object('id', f.id);
end $$;

create or replace function public.ical_feed_regen(p_feed uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app.ical_can() then raise exception 'Tidak berwenang'; end if;
  update public.ical_feeds set export_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), updated_at = now(), export_hits = 0, last_export_at = null
   where id = p_feed;
end $$;

create or replace function public.ical_sync_now(p_feed uuid default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not app.ical_can() then raise exception 'Tidak berwenang'; end if;
  update public.ical_feeds set last_sync_at = null where (p_feed is null or id = p_feed) and import_url is not null;
  perform net.http_post(url := 'https://shrvzlltysnbmgpkhjjg.supabase.co/functions/v1/ical-sync',
                        headers := '{"Content-Type":"application/json"}'::jsonb,
                        body := jsonb_build_object('feed', p_feed));
end $$;

-- ===== Dipakai edge function (service_role saja) =====

-- Ekspor: semua malam terpakai unit ini, kecuali yang berasal dari kanal peminta sendiri (cegah gema)
create or replace function public.ical_export_events(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f public.ical_feeds; u record; ev jsonb;
begin
  select * into f from public.ical_feeds where export_token = p_token and is_active;
  if f.id is null then return null; end if;
  update public.ical_feeds set export_hits = export_hits + 1, last_export_at = now() where id = f.id;
  select un.code, p.name into u from public.units un join public.products p on p.id = un.product_id where un.id = f.unit_id;
  with spans as (
    select 'rj-' || bi.id::text uid, lower(bi.period) a, upper(bi.period) z, 'Rentalaja · ' || bk.code s
      from public.booking_items bi join public.bookings bk on bk.id = bi.booking_id
     where bi.unit_id = f.unit_id and bi.status in ('held','confirmed','active')
       and bk.status::text not in ('cancelled','expired','rejected','draft')
       and upper(bi.period) > now() - interval '2 days'
    union all
    select 'blk-' || cb.id::text, lower(cb.period), upper(cb.period),
           case when cb.feed_id is not null then 'Tidak tersedia (' || app.ical_channel_name(fx.channel) || ')' else 'Tidak tersedia' end
      from public.calendar_blocks cb left join public.ical_feeds fx on fx.id = cb.feed_id
     where (cb.unit_id = f.unit_id or (cb.unit_id is null and cb.product_id = (select product_id from public.units where id = f.unit_id)))
       and (cb.feed_id is null or cb.feed_id <> f.id)
       and coalesce(cb.ota_kind, '') <> 'tutup'   -- tanggal "tutup" dari OTA lain sering gema kalender kita sendiri
       and upper(cb.period) > now() - interval '2 days'
  ), nights as (
    -- malam N = [N 14.00, N+1 12.00) WIB
    select uid, s,
           ((a at time zone 'Asia/Jakarta') - interval '12 hours')::date d1,
           ((z at time zone 'Asia/Jakarta') - interval '14 hours 1 second')::date + 1 d2
      from spans
  )
  select coalesce(jsonb_agg(jsonb_build_object('uid', uid, 'start', d1, 'end', d2, 'summary', s) order by d1), '[]') into ev
    from nights where d2 > d1;
  return jsonb_build_object('unit', u.code, 'name', u.name, 'channel', f.channel, 'events', ev);
end $$;

-- Daftar feed yang perlu disinkron (jeda minimal 4 menit per feed)
create or replace function public.ical_due(p_feed uuid default null) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'url', f.import_url, 'channel', f.channel)), '[]')
    from public.ical_feeds f
   where f.is_active and f.import_url is not null
     and (p_feed is null or f.id = p_feed)
     and (f.last_sync_at is null or f.last_sync_at < now() - interval '4 minutes')
$$;

-- Terapkan hasil unduhan satu feed
create or replace function public.ical_import_apply(p_feed uuid, p_ok boolean, p_events jsonb, p_error text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare f public.ical_feeds; n int := 0; e jsonb; a timestamptz; z timestamptz; k text; uids text[] := '{}';
        cb record; note text; nconf int := 0; uname text;
begin
  select * into f from public.ical_feeds where id = p_feed;
  if f.id is null then return null; end if;
  if not p_ok then
    update public.ical_feeds set last_sync_at = now(), last_status = 'gagal', last_error = left(p_error, 300) where id = f.id;
    return jsonb_build_object('ok', false);
  end if;

  for e in select * from jsonb_array_elements(coalesce(p_events, '[]')) loop
    -- tanggal saja: check-in 14.00 WIB, check-out 12.00 WIB (sama dengan booking web)
    if e->>'all_day' = 'true' then
      a := app.jkt_start((e->>'start')::date) + interval '14 hours';
      z := app.jkt_start((e->>'end')::date) + interval '12 hours';
    else
      a := (e->>'start')::timestamptz; z := (e->>'end')::timestamptz;
    end if;
    if z <= a or z < now() - interval '1 day' or a > now() + interval '2 years' then continue; end if;
    k := case when coalesce(e->>'summary', '') ~* '(not available|blocked|closed|unavailable|tidak tersedia|tutup)' then 'tutup' else 'reservasi' end;
    uids := uids || (e->>'uid');
    insert into public.calendar_blocks(unit_id, period, reason, source, feed_id, ext_uid, ota_kind)
    values (f.unit_id, tstzrange(a, z, '[)'),
            app.ical_channel_name(f.channel) || ' · ' || case k when 'tutup' then 'tanggal ditutup' else 'reservasi' end
              || coalesce(' · ' || nullif(left(btrim(e->>'summary'), 60), ''), ''),
            'ota', f.id, e->>'uid', k)
    on conflict (feed_id, ext_uid) where feed_id is not null do update
      set period = excluded.period, reason = excluded.reason, ota_kind = excluded.ota_kind;
    n := n + 1;
  end loop;

  -- booking yang hilang dari feed = dibatalkan di OTA → lepas tanggalnya (yang sudah lewat dibiarkan)
  delete from public.calendar_blocks
   where feed_id = f.id and not (ext_uid = any(uids)) and upper(period) > now();

  -- cek bentrok: reservasi OTA vs booking Rentalaja / reservasi OTA lain di unit yang sama
  select code into uname from public.units where id = f.unit_id;
  for cb in select * from public.calendar_blocks where feed_id = f.id and upper(period) > now() loop
    note := null;
    if cb.ota_kind = 'reservasi' then
      select 'Bentrok dengan booking ' || bk.code into note
        from public.booking_items bi join public.bookings bk on bk.id = bi.booking_id
       where bi.unit_id = cb.unit_id and bi.status in ('held','confirmed','active') and bi.period && cb.period limit 1;
      if note is null then
        select 'Bentrok dengan reservasi ' || app.ical_channel_name(f2.channel) into note
          from public.calendar_blocks c2 join public.ical_feeds f2 on f2.id = c2.feed_id
         where c2.unit_id = cb.unit_id and c2.feed_id <> f.id and c2.ota_kind = 'reservasi' and c2.period && cb.period limit 1;
      end if;
    end if;
    if note is distinct from cb.conflict_note then
      update public.calendar_blocks set conflict_note = note, conflict_at = case when note is null then null else now() end where id = cb.id;
      if note is not null then
        nconf := nconf + 1;
        perform public.ops_notify_mgrs(
          'Booking ganda ' || coalesce(uname, '') || ' (' || app.ical_channel_name(f.channel) || ')',
          note || ', ' || to_char(lower(cb.period) at time zone 'Asia/Jakarta', 'DD/MM') || '–' || to_char(upper(cb.period) at time zone 'Asia/Jakarta', 'DD/MM')
            || '. Segera hubungi tamu dan pindahkan salah satu. Cek di demo.rentalaja.co.id/ota', true);
      end if;
    end if;
  end loop;

  update public.ical_feeds set last_sync_at = now(), last_ok_at = now(), last_status = 'ok', last_error = null, last_count = n where id = f.id;
  return jsonb_build_object('ok', true, 'events', n, 'conflicts', nconf);
end $$;

revoke all on function public.ical_export_events(text), public.ical_due(uuid), public.ical_import_apply(uuid, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.ical_export_events(text), public.ical_due(uuid), public.ical_import_apply(uuid, boolean, jsonb, text) to service_role;
revoke all on function public.ical_admin(), public.ical_feed_save(uuid, text, text), public.ical_feed_regen(uuid), public.ical_sync_now(uuid) from public, anon;
grant execute on function public.ical_admin(), public.ical_feed_save(uuid, text, text), public.ical_feed_regen(uuid), public.ical_sync_now(uuid) to authenticated;

-- Jadwal: tarik kalender OTA tiap 10 menit
select cron.unschedule('ra-ical-sync') where exists (select 1 from cron.job where jobname = 'ra-ical-sync');
select cron.schedule('ra-ical-sync', '*/10 * * * *',
  $c$select net.http_post(url := 'https://shrvzlltysnbmgpkhjjg.supabase.co/functions/v1/ical-sync', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb)$c$);
