// Kirim perintah ke alat GPS lewat flespi (matikan / hidupkan mesin).
// Izin & alasan dicek di database (gps_cmd_prepare, khusus owner). Token flespi: secret FLESPI_TOKEN (diisi owner di Supabase).
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return J({ error: 'POST saja' }, 405);
  const auth = req.headers.get('authorization') || '';
  let body: { unit?: string; action?: string; reason?: string };
  try { body = await req.json(); } catch { return J({ error: 'Data tidak valid' }, 400); }
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const rpc = (fn: string, args: unknown) => fetch(url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: auth }, body: JSON.stringify(args) });
  const pr = await rpc('gps_cmd_prepare', { p_unit: body.unit, p_action: body.action, p_reason: body.reason });
  if (!pr.ok) { const t = await pr.json().catch(() => ({})); return J({ error: (t as { message?: string }).message || 'Ditolak' }, 403); }
  const prep = await pr.json() as { log_id: number; ident: string; command: unknown; platform: string };
  const token = Deno.env.get('FLESPI_TOKEN');
  if (!token) { await rpc('gps_cmd_result', { p_log: prep.log_id, p_ok: false, p_resp: 'FLESPI_TOKEN belum diisi' }); return J({ error: 'Token flespi belum diisi di Supabase (secret FLESPI_TOKEN).' }, 500); }
  if (prep.platform && prep.platform !== 'flespi') { await rpc('gps_cmd_result', { p_log: prep.log_id, p_ok: false, p_resp: 'platform ' + prep.platform }); return J({ error: 'Perintah jarak jauh baru tersedia untuk alat di flespi.' }, 400); }
  const sel = encodeURIComponent('configuration.ident="' + prep.ident.replace(/"/g, '') + '"');
  const r = await fetch('https://flespi.io/gw/devices/' + sel + '/commands-queue', {
    method: 'POST', headers: { Authorization: 'FlespiToken ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify([Object.assign({ ttl: 3600 }, prep.command as object)])
  });
  const txt = await r.text();
  let ok = r.ok;
  try { const j = JSON.parse(txt); if (j.errors && j.errors.length) ok = false; if (!j.result || !j.result.length) ok = false; } catch { ok = false; }
  await rpc('gps_cmd_result', { p_log: prep.log_id, p_ok: ok, p_resp: txt });
  return ok ? J({ ok: true, message: 'Perintah dikirim. Alat menjalankannya saat terhubung (biasanya < 1 menit).' }) : J({ error: 'flespi menolak: ' + txt.slice(0, 300) }, 502);
});
