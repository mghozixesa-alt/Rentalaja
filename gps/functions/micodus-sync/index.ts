// micodus-sync: ambil posisi terakhir semua unit dari web MiCODUS (akun Rentalaja),
// lalu masukkan ke sistem GPS Rentalaja lewat rpc gps_ingest_service (format datar ala flespi).
// Dipanggil pg_cron tiap 10 menit. Rahasia: MICODUS_PASS (Supabase → Edge Functions → Secrets).
// Kunci cron (header x-cron-key) dibuat otomatis di Vault 'micodus_cron_key' dan dicek lewat rpc gps_cron_key_ok.
import { createClient } from "jsr:@supabase/supabase-js@2";

const BASE = "https://www.micodus.net";
const UA = "Mozilla/5.0 (RentalajaSync)";

class Jar {
  c = new Map<string, string>();
  take(res: Response) {
    // Deno: getSetCookie() tersedia di Headers
    const list = (res.headers as any).getSetCookie?.() ?? [];
    for (const raw of list) {
      const [kv] = raw.split(";");
      const i = kv.indexOf("=");
      if (i > 0) this.c.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
    }
  }
  header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join("; "); }
}

async function go(jar: Jar, path: string, init: RequestInit = {}) {
  let url = BASE + "/" + path.replace(/^\//, "");
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(url, {
      ...init,
      redirect: "manual",
      headers: { "User-Agent": UA, Cookie: jar.header(), ...(init.headers || {}) },
    });
    jar.take(res);
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).toString();
      init = { headers: init.headers }; // ikuti redirect sebagai GET
      await res.body?.cancel();
      continue;
    }
    return { res, url, text: await res.text() };
  }
  throw new Error("redirect terlalu banyak");
}

const hidden = (html: string, name: string) =>
  (html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`)) ||
    html.match(new RegExp(`value="([^"]*)"[^>]*name="${name}"`)) || [])[1] ?? "";

async function login(jar: Jar) {
  // Username akun web MiCODUS Rentalaja (bukan rahasia). MICODUS_LOGIN bisa menimpanya bila akunnya diganti.
  const user = Deno.env.get("MICODUS_LOGIN")?.trim() || "rentalaja", pass = Deno.env.get("MICODUS_PASS")?.trim();
  if (!pass) throw new Error("MICODUS_PASS belum diisi");
  const page = await go(jar, "Login2.aspx");
  const form = new URLSearchParams({
    __VIEWSTATE: hidden(page.text, "__VIEWSTATE"),
    __VIEWSTATEGENERATOR: hidden(page.text, "__VIEWSTATEGENERATOR"),
    __EVENTVALIDATION: hidden(page.text, "__EVENTVALIDATION"),
    LType: "0", hidGMT: "", txtUserName: user, txtImeiNo: "",
    txtAccountPassword: pass, txtImeiPassword: "", btnLogin: "Login",
    hidYiwenGUID2: hidden(page.text, "hidYiwenGUID2"), hidLanguage: "en-us",
  });
  const r = await go(jar, "Login2.aspx", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  // Setelah login berhasil diarahkan ke Distributor.aspx / user page yang memuat map.aspx?id=<UserID>
  let html = r.text;
  if (!/map\.aspx\?id=\d+/i.test(html)) html = (await go(jar, "Distributor.aspx")).text;
  const id = (html.match(/map\.aspx\?id=(\d+)/i) || [])[1];
  if (!id) {
    const why = /loginFaild\(/.test(r.text) ? "MiCODUS menolak username/password" : "tidak diarahkan ke halaman utama";
    throw new Error(`login MiCODUS gagal [${r.res.status}] ${why} (user ${user})`);
  }
  return Number(id);
}

type Dev = Record<string, any>;

async function devices(jar: Jar, userId: number): Promise<Dev[]> {
  const r = await go(jar, "Ajax/DevicesAjax.asmx/GetDevicesByUserID", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: `{UserID:${userId},isFirst:true,TimeZones:'7:00',DeviceID:0}`,
  });
  const d = JSON.parse(r.text).d as string;
  // d berupa literal objek JS (kunci tanpa kutip) → ubah ke JSON
  const js = d.replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":');
  return (JSON.parse(js).devices || []) as Dev[];
}

// Waktu dari web MiCODUS sudah dalam zona yang diminta (TimeZones '7:00') walau namanya "Utc".
const wib = (s: string) => s ? Math.floor(new Date(s.replace(" ", "T") + "+07:00").getTime() / 1000) : null;

function toMsg(d: Dev) {
  const lat = Number(d.latitude), lng = Number(d.longitude);
  const ok = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === -1 && lng === -1) && !(lat === 0 && lng === 0);
  const m: Record<string, unknown> = {
    _src: "micodus",
    ident: String(d.sn || ""),
    // Alat yang diam hanya mengirim posisi saat bergerak, tapi tetap "denyut" ke server MiCODUS (serverUtcDate).
    // Selama MiCODUS tidak menandai Offline, pakai waktu denyut supaya tidak dianggap sinyal hilang.
    timestamp: d.status !== "Offline"
      ? Math.max(wib(d.deviceUtcDate) ?? 0, wib(d.serverUtcDate) ?? 0) || null
      : wib(d.deviceUtcDate) ?? wib(d.serverUtcDate),
    "position.speed": Number(d.speed) || 0,
    "vehicle.mileage": Number(d.distance) || null,
    "engine.ignition.status": d.acc === "1" ? true : d.acc === "0" ? false : null,
    "micodus.status": d.status, "micodus.name": d.name, "micodus.model": d.modelName,
  };
  if (ok) { m["position.latitude"] = lat; m["position.longitude"] = lng; }
  const v = Number(d.dy);
  if (Number.isFinite(v) && v > 0) m["external.powersource.voltage"] = v;
  return m;
}

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: okKey } = await sb.rpc("gps_cron_key_ok", { p_key: req.headers.get("x-cron-key") || "" });
  if (okKey !== true) return new Response("forbidden", { status: 403 });
  const t0 = Date.now();
  try {
    const jar = new Jar();
    const uid = await login(jar);
    const list = await devices(jar, uid);
    const msgs = list.filter((d) => d.sn && d.status !== "Arrears").map(toMsg);
    const { data, error } = await sb.rpc("gps_ingest_service", { p_msgs: msgs });
    if (error) throw new Error(error.message);
    return Response.json({ ok: true, total: list.length, kirim: msgs.length, cocok: data, ms: Date.now() - t0 });
  } catch (e) {
    await sb.rpc("gps_sync_log", { p_ok: false, p_note: String((e as Error).message).slice(0, 300) });
    return Response.json({ ok: false, error: String((e as Error).message) }, { status: 500 });
  }
});
