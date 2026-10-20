import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tokenCallbackValid } from "@/lib/xendit";

/** Callback invoice Xendit. Idempoten: event ganda diabaikan oleh unique (sumber, event_id) dan oleh catat_pembayaran_lunas. */
export async function POST(request: Request) {
  const valid = tokenCallbackValid(request.headers.get("x-callback-token"));
  const body = (await request.json().catch(() => null)) as { id?: string; status?: string; paid_amount?: number; amount?: number } | null;
  if (!body?.id) return NextResponse.json({ ok: false }, { status: 400 });
  const admin = createAdminClient();
  const log = await admin.from("webhook_log").insert({ sumber: "xendit", event_id: `${body.id}:${body.status}`, payload: body, tanda_tangan_valid: valid });
  if (!valid) return NextResponse.json({ ok: false }, { status: 401 });
  if (log.error) return NextResponse.json({ ok: true, duplikat: true });
  if (body.status === "PAID" || body.status === "SETTLED") {
    const { error } = await admin.rpc("catat_pembayaran_lunas", { p_xendit_id: body.id, p_jumlah: Math.round(Number(body.paid_amount ?? body.amount ?? 0)) });
    if (error) return NextResponse.json({ ok: false, pesan: error.message }, { status: 500 });
    await admin.from("webhook_log").update({ diproses: true }).eq("sumber", "xendit").eq("event_id", `${body.id}:${body.status}`);
  } else if (body.status === "EXPIRED") {
    await admin.from("pembayaran").update({ status: "kedaluwarsa" }).eq("xendit_id", body.id).eq("status", "menunggu");
  }
  return NextResponse.json({ ok: true });
}
