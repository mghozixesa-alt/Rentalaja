"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { wajibPeran } from "@/lib/auth";
import { pesanGalat } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";

const Id = z.string().uuid();
function balik(galat?: unknown): never {
  redirect(`/sopir?${galat ? `galat=${pesanGalat(galat)}` : "ok=1"}`);
}

export async function jawabTrip(form: FormData) {
  await wajibPeran("sopir");
  const terima = form.get("jawab") === "terima";
  const r = await createClient().rpc("konfirmasi_trip", { p_booking: Id.parse(form.get("booking")), p_terima: terima, p_alasan: terima ? null : String(form.get("alasan") ?? "Berhalangan").slice(0, 120) });
  balik(r.error ?? undefined);
}

export async function berangkat(form: FormData) {
  await wajibPeran("sopir");
  const km = form.get("km") ? Number(form.get("km")) : null;
  const r = await createClient().rpc("serahkan_unit", { p_booking: Id.parse(form.get("booking")), p_km: km });
  balik(r.error ?? undefined);
}

/** Selesai trip: catat sisa bayar tunai (bila tunai), lalu Jeep kembali Ready. */
export async function selesaiTrip(form: FormData) {
  await wajibPeran("sopir");
  const id = Id.parse(form.get("booking"));
  const supabase = createClient();
  const sisa = Number(form.get("sisa") ?? 0);
  if (form.get("cara") === "tunai" && sisa > 0) {
    const p = await supabase.rpc("catat_sisa_bayar_sopir", { p_booking: id, p_jumlah: sisa });
    if (p.error) balik(p.error);
  }
  const km = form.get("km") ? Number(form.get("km")) : null;
  const r = await supabase.rpc("terima_kembali", { p_booking: id, p_km: km });
  balik(r.error ?? undefined);
}
