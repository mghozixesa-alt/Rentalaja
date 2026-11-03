// Tarik kalender iCal dari Airbnb / Agoda / Booking.com → calendar_blocks (source 'ota')
// Dipicu cron ra-ical-sync tiap 10 menit dan tombol "Sinkron sekarang" (body {feed}).
// Jeda minimal per feed diatur di ical_due (4 menit), jadi aman bila terpanggil berulang.
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rpc(fn: string, body: unknown) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

type Ev = { uid: string; start: string; end: string; all_day: boolean; summary: string };

function unesc(s: string) {
  return s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}
// "20261110" → 2026-11-10 ; "20261110T070000Z" → ISO ; "20261110T140000" (+TZID) → anggap WIB bila tanpa Z
function parseDate(key: string, val: string): { v: string; allDay: boolean } | null {
  const d = val.trim();
  if (/^\d{8}$/.test(d) || /VALUE=DATE(?!-)/i.test(key) && /^\d{8}/.test(d)) {
    return { v: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, allDay: true };
  }
  const m = d.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  return { v: m[7] ? iso + "Z" : iso + "+07:00", allDay: false };
}
function addDay(ymd: string) {
  const t = new Date(ymd + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

function parseIcs(text: string): Ev[] {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const out: Ev[] = [];
  let cur: Record<string, { k: string; v: string }> | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur && cur.DTSTART) {
        const s = parseDate(cur.DTSTART.k, cur.DTSTART.v);
        let e = cur.DTEND ? parseDate(cur.DTEND.k, cur.DTEND.v) : null;
        const status = (cur.STATUS?.v || "").toUpperCase();
        if (s && status !== "CANCELLED") {
          if (!e) e = s.allDay ? { v: addDay(s.v), allDay: true } : { v: new Date(new Date(s.v).getTime() + 864e5).toISOString(), allDay: false };
          const summary = unesc(cur.SUMMARY?.v || "");
          const uid = (cur.UID?.v || `${s.v}-${e.v}-${summary}`).trim().slice(0, 300);
          out.push({ uid, start: s.v, end: e.v, all_day: s.allDay && e.allDay, summary });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i);
    const name = key.split(";")[0].toUpperCase();
    if (["DTSTART", "DTEND", "UID", "SUMMARY", "STATUS"].includes(name)) cur[name] = { k: key, v: line.slice(i + 1) };
  }
  // tanggal campuran (satu ujung tanggal-saja, satu ujung jam) → perlakukan sebagai tanggal-saja
  return out.map((e) => e.all_day ? e : (e.start.length === 10 || e.end.length === 10)
    ? { ...e, all_day: true, start: e.start.slice(0, 10), end: e.end.slice(0, 10) } : e);
}

async function pull(url: string): Promise<string> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: "follow", headers: { "User-Agent": "Rentalaja-Calendar-Sync/1.0", Accept: "text/calendar, */*" } });
    if (!r.ok) throw new Error(`HTTP ${r.status} dari kanal`);
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 3_000_000) throw new Error("File kalender terlalu besar");
    const txt = new TextDecoder().decode(buf);
    if (!txt.includes("BEGIN:VCALENDAR")) throw new Error("Link bukan file kalender iCal (cek lagi link yang ditempel)");
    return txt;
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  let feed: string | null = null;
  try { const b = await req.json(); if (b && typeof b.feed === "string") feed = b.feed; } catch { /* kosong */ }
  const due: { id: string; url: string }[] = await rpc("ical_due", { p_feed: feed });
  const res: unknown[] = [];
  for (const f of due.slice(0, 50)) {
    try {
      if (!/^https:\/\//i.test(f.url)) throw new Error("Link harus https");
      const evs = parseIcs(await pull(f.url));
      res.push(await rpc("ical_import_apply", { p_feed: f.id, p_ok: true, p_events: evs, p_error: null }));
    } catch (e) {
      const msg = e instanceof Error ? (e.name === "AbortError" ? "Kanal tidak merespons (20 detik)" : e.message) : String(e);
      res.push(await rpc("ical_import_apply", { p_feed: f.id, p_ok: false, p_events: [], p_error: msg }).catch(() => null));
    }
  }
  return new Response(JSON.stringify({ feeds: due.length, res }), { headers: { "Content-Type": "application/json" } });
});
