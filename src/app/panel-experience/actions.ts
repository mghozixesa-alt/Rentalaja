"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { wajibPeran } from "@/lib/auth";
import { pesanGalat } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";
import { wib } from "@/lib/format";

const Id = z.string().uuid();
function balik(path: string, galat?: unknown): never {
  redirect(`${path}?${galat ? `galat=${pesanGalat(galat)}` : "ok=1"}`);
}

export async function checkIn(form: FormData) {
  await wajibPeran("cs_experience", "manajer_experience");
  const r = await createClient().rpc("serahkan_unit", { p_booking: Id.parse(form.get("booking")), p_km: null });
  balik("/panel-experience", r.error ?? undefined);
}

export async function checkOut(form: FormData) {
  await wajibPeran("cs_experience", "manajer_experience");
  const r = await createClient().rpc("terima_kembali", { p_booking: Id.parse(form.get("booking")), p_km: null });
  balik("/panel-experience", r.error ?? undefined);
}

export async function kamarSiap(form: FormData) {
  await wajibPeran("cs_experience", "manajer_experience");
  const r = await createClient().rpc("kamar_siap", { p_unit: Id.parse(form.get("unit")) });
  balik("/panel-experience", r.error ?? undefined);
}

/** CS boleh menjadwal ulang kapan saja (cuaca, sopir berhalangan); lama menginap/trip tetap. */
export async function jadwalUlang(form: FormData) {
  await wajibPeran("cs_experience", "manajer_experience");
  const id = Id.parse(form.get("booking"));
  const tgl = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(form.get("tanggal"));
  const jam = z.string().regex(/^\d{2}:\d{2}$/).parse(form.get("jam"));
  const durasiMenit = z.coerce.number().int().positive().parse(form.get("durasi"));
  const mulai = wib(tgl, jam);
  const selesai = new Date(new Date(mulai).getTime() + durasiMenit * 60000).toISOString();
  const r = await createClient().rpc("ubah_tanggal_experience", { p_booking: id, p_mulai: mulai, p_selesai: selesai });
  balik("/panel-experience/jadwal", r.error ?? undefined);
}
