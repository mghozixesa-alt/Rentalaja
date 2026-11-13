-- Jembatan MiCODUS: edge function micodus-sync mengambil posisi semua unit dari web MiCODUS tiap 10 menit
-- dan memasukkannya lewat gps_ingest yang sama dengan flespi/Traccar. Unit yang sudah pindah ke server sendiri
-- otomatis tidak tertimpa karena data MiCODUS-nya berhenti (waktu lebih lama tidak menggeser posisi terakhir).

create table if not exists app.gps_sync_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  ok boolean not null,
  sent int, matched int,
  note text
);

create or replace function public.gps_sync_log(p_ok boolean, p_note text default null, p_sent int default null, p_matched int default null)
returns void language sql security definer set search_path = public as $$
  insert into app.gps_sync_log(ok, note, sent, matched) values (p_ok, p_note, p_sent, p_matched);
  delete from app.gps_sync_log where at < now() - interval '14 days';
$$;

create or replace function public.gps_ingest_service(p_msgs jsonb)
returns integer language plpgsql security definer set search_path = public as $function$
declare n int; idents text[];
begin
  n := public.gps_ingest((select token from app.gps_secret limit 1), p_msgs);
  select array_agg(regexp_replace(x->>'ident', '\D', '', 'g')) into idents from jsonb_array_elements(p_msgs) x;
  -- tandai sumbernya MiCODUS bila belum pernah tersambung lewat flespi/Traccar
  update unit_gps set platform = 'micodus'
   where ident = any(idents) and (platform is null or platform = 'flespi')
     and not exists (select 1 from app.gps_raw r where r.ident = unit_gps.ident and coalesce(r.msg->>'_src', '') <> 'micodus');
  perform public.gps_sync_log(true, null, jsonb_array_length(p_msgs), n);
  return n;
end $function$;

revoke all on function public.gps_ingest_service(jsonb) from public, anon, authenticated;
revoke all on function public.gps_sync_log(boolean, text, int, int) from public, anon, authenticated;
grant execute on function public.gps_ingest_service(jsonb) to service_role;
grant execute on function public.gps_sync_log(boolean, text, int, int) to service_role;

-- Status sinkron untuk halaman Peta armada (owner & asset manager)
create or replace function public.gps_sync_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not (app.has_perm('mgmt.assets') or app.has_perm('pos.units')) then null else jsonb_build_object(
    'last_ok', (select max(at) from app.gps_sync_log where ok),
    'last_err', (select jsonb_build_object('at', at, 'note', note) from app.gps_sync_log where not ok order by at desc limit 1),
    'matched', (select matched from app.gps_sync_log where ok order by at desc limit 1),
    'sent', (select sent from app.gps_sync_log where ok order by at desc limit 1)) end
$$;
grant execute on function public.gps_sync_status() to authenticated;

-- Kunci cron dibuat acak di Vault; edge function mencocokkannya lewat rpc (hanya service_role).
select vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'micodus_cron_key', 'kunci pemanggil micodus-sync')
 where not exists (select 1 from vault.secrets where name = 'micodus_cron_key');

create or replace function public.gps_cron_key_ok(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_key <> '' and p_key = (select decrypted_secret from vault.decrypted_secrets where name = 'micodus_cron_key'), false)
$$;
revoke all on function public.gps_cron_key_ok(text) from public, anon, authenticated;
grant execute on function public.gps_cron_key_ok(text) to service_role;

-- Jadwal: tiap 10 menit.
select cron.unschedule('micodus-sync') where exists (select 1 from cron.job where jobname = 'micodus-sync');
select cron.schedule('micodus-sync', '*/10 * * * *', $cron$
  select net.http_post(
    url := 'https://shrvzlltysnbmgpkhjjg.supabase.co/functions/v1/micodus-sync',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'micodus_cron_key')),
    body := '{}'::jsonb, timeout_milliseconds := 60000)
$cron$);
