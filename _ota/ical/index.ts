// Ekspor kalender unit penginapan Rentalaja sebagai iCal (.ics) untuk Airbnb / Agoda / Booking.com
// URL: /functions/v1/ical/<export_token>.ics  (publik, token panjang acak = kunci)
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function esc(s: string) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function fold(line: string) {
  // baris iCal maks 75 oktet
  const out: string[] = [];
  let s = line;
  while (new TextEncoder().encode(s).length > 75) {
    let n = 75;
    while (new TextEncoder().encode(s.slice(0, n)).length > 75) n--;
    out.push(s.slice(0, n));
    s = " " + s.slice(n);
  }
  out.push(s);
  return out.join("\r\n");
}
const d8 = (d: string) => d.replaceAll("-", "");

Deno.serve(async (req) => {
  const m = new URL(req.url).pathname.match(/\/ical\/([a-f0-9]{40,80})(?:\.ics)?$/i);
  if (!m) return new Response("Not found", { status: 404 });
  const r = await fetch(`${URL_}/rest/v1/rpc/ical_export_events`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: m[1] }),
  });
  if (!r.ok) return new Response("Error", { status: 502 });
  const data = await r.json();
  if (!data) return new Response("Not found", { status: 404 });

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rentalaja//Kalender Penginapan//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc("Rentalaja " + (data.unit || ""))}`,
  ];
  for (const e of data.events || []) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@rentalaja.co.id`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d8(e.start)}`,
      `DTEND;VALUE=DATE:${d8(e.end)}`,
      `SUMMARY:${esc(e.summary || "Tidak tersedia")}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="rentalaja-${(data.unit || "unit").toLowerCase()}.ics"`,
      "Cache-Control": "no-cache, max-age=0",
      "X-Robots-Tag": "noindex",
    },
  });
});
