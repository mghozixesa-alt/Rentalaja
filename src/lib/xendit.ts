import "server-only";

const API = "https://api.xendit.co";

function auth() {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) throw new Error("XENDIT_SECRET_KEY belum diisi");
  return "Basic " + Buffer.from(key + ":").toString("base64");
}

export type InvoiceXendit = { id: string; invoice_url: string; expiry_date: string; status: string };

/** Buat invoice Xendit (QRIS, VA, e-wallet dalam satu halaman bayar). */
export async function buatInvoice(p: { externalId: string; jumlah: number; deskripsi: string; kembaliKe: string; menit?: number }) {
  const res = await fetch(`${API}/v2/invoices`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: p.externalId,
      amount: p.jumlah,
      description: p.deskripsi,
      currency: "IDR",
      invoice_duration: (p.menit ?? 20) * 60,
      success_redirect_url: p.kembaliKe,
      failure_redirect_url: p.kembaliKe,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Xendit menolak pembuatan invoice (${res.status})`);
  return (await res.json()) as InvoiceXendit;
}

/** Bandingkan token callback dengan waktu konstan. */
export function tokenCallbackValid(token: string | null): boolean {
  const benar = process.env.XENDIT_CALLBACK_TOKEN ?? "";
  if (!token || !benar || token.length !== benar.length) return false;
  let beda = 0;
  for (let i = 0; i < token.length; i++) beda |= token.charCodeAt(i) ^ benar.charCodeAt(i);
  return beda === 0;
}
