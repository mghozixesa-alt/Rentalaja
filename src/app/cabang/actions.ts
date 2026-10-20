"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { wajibPeran } from "@/lib/auth";
import { pesanGalat } from "@/lib/panel";
import { createClient } from "@/lib/supabase/server";

const Id = z.string().uuid();
function balik(path: string, q: string, galat?: unknown): never {
  redirect(`${path}?${q ? q.replace(/^\?/, "") + "&" : ""}${galat ? `galat=${pesanGalat(galat)}` : "ok=1"}`);
}

/** CS menyetujui dokumen: booking lanjut ke menunggu bayar (batas 20 menit), dokumen ditandai lolos. */
export async function setujuiVerifikasi(form: FormData) {
  const staf = await wajibPeran("cs", "kepala_cabang");
  const id = Id.parse(form.get("booking"));
  const q = String(form.get("q") ?? "");
  const supabase = createClient();
  const { data: b } = await supabase.from("booking").select("pelanggan_id").eq("id", id).maybeSingle();
  const r = await supabase.rpc("ubah_status_booking", { p_booking: id, p_baru: "menunggu_bayar" });
  if (r.error) balik("/cabang/verifikasi", q, r.error);
  if (b?.pelanggan_id) {
    await supabase.from("dokumen").update({ status: "lolos", diperiksa_oleh: staf.id, diperiksa_pada: new Date().toISOString() }).eq("pelanggan_id", b.pelanggan_id).eq("status", "menunggu");
    await supabase.from("pelanggan").update({ terverifikasi: true }).eq("id", b.pelanggan_id);
  }
  revalidatePath("/cabang");
  balik("/cabang/verifikasi", q);
}

export async function tolakVerifikasi(form: FormData) {
  const staf = await wajibPeran("cs", "kepala_cabang");
  const id = Id.parse(form.get("booking"));
  const q = String(form.get("q") ?? "");
  const alasan = String(form.get("alasan") ?? "Dokumen tidak jelas").slice(0, 200);
  const supabase = createClient();
  const { data: b } = await supabase.from("booking").select("pelanggan_id").eq("id", id).maybeSingle();
  const r = await supabase.rpc("ubah_status_booking", { p_booking: id, p_baru: "ditolak", p_catatan: alasan });
  if (r.error) balik("/cabang/verifikasi", q, r.error);
  if (b?.pelanggan_id) await supabase.from("dokumen").update({ status: "ditolak", alasan_tolak: alasan, diperiksa_oleh: staf.id, diperiksa_pada: new Date().toISOString() }).eq("pelanggan_id", b.pelanggan_id).eq("status", "menunggu");
  balik("/cabang/verifikasi", q);
}

/** DP atau pelunasan tunai di kasir: tercatat atas nama staf, lalu booking dikonfirmasi. */
export async function terimaTunai(form: FormData) {
  await wajibPeran("kasir", "kepala_cabang", "cs");
  const id = Id.parse(form.get("booking"));
  const q = String(form.get("q") ?? "");
  const jumlah = z.coerce.number().int().positive().parse(form.get("jumlah"));
  const supabase = createClient();
  const p = await supabase.from("pembayaran").insert({ booking_id: id, jenis: "dp", metode: "tunai", jumlah, status: "lunas", dibayar_pada: new Date().toISOString() });
  if (p.error) balik("/cabang/serah-terima", q, p.error);
  const r = await supabase.rpc("ubah_status_booking", { p_booking: id, p_baru: "dikonfirmasi" });
  if (r.error) balik("/cabang/serah-terima", q, r.error);
  balik("/cabang/serah-terima", q);
}

export async function serahkan(form: FormData) {
  await wajibPeran("cs", "kasir", "kepala_cabang");
  const id = Id.parse(form.get("booking"));
  const q = String(form.get("q") ?? "");
  const km = form.get("km") ? Number(form.get("km")) : null;
  const supabase = createClient();
  const r = await supabase.rpc("serahkan_unit", { p_booking: id, p_km: km });
  if (r.error) balik("/cabang/serah-terima", q, r.error);
  balik("/cabang/serah-terima", q);
}

export async function terimaKembali(form: FormData) {
  await wajibPeran("cs", "kasir", "kepala_cabang");
  const id = Id.parse(form.get("booking"));
  const q = String(form.get("q") ?? "");
  const km = form.get("km") ? Number(form.get("km")) : null;
  const supabase = createClient();
  const r = await supabase.rpc("terima_kembali", { p_booking: id, p_km: km });
  if (r.error) balik("/cabang/serah-terima", q, r.error);
  const denda = Number(r.data ?? 0);
  redirect(`/cabang/serah-terima?${q.replace(/^\?/, "")}${q ? "&" : ""}ok=1${denda > 0 ? `&denda=${denda}` : ""}`);
}

export async function simpanQC(form: FormData) {
  await wajibPeran("petugas_qc", "kepala_cabang", "cs");
  const unit = Id.parse(form.get("unit"));
  const q = String(form.get("q") ?? "");
  const poin = JSON.parse(String(form.get("poin") ?? "[]")) as { poin: string }[];
  const hasil = poin.map((p, i) => ({ poin: p.poin, lolos: form.get(`cek${i}`) === "on" }));
  const lolos = form.get("keputusan") === "lolos";
  const supabase = createClient();
  const r = await supabase.rpc("simpan_hasil_qc", { p_unit: unit, p_poin: hasil, p_lolos: lolos, p_catatan: String(form.get("catatan") ?? "") || null });
  if (r.error) balik("/cabang/qc", q, r.error);
  balik("/cabang/qc", q);
}
