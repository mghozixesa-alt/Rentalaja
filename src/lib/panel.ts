import "server-only";
import { createClient } from "@/lib/supabase/server";
import { wajibPeran, type Staf } from "@/lib/auth";

export const PERAN_CABANG = ["cs", "kasir", "kepala_cabang", "petugas_qc"] as const;

/** Staf panel cabang + cabang aktif. Owner (tanpa cabang) memilih cabang lewat ?c=<kode>. */
export async function konteksCabang(kode?: string) {
  const staf: Staf = await wajibPeran(...PERAN_CABANG);
  const supabase = createClient();
  const { data: semua } = await supabase.from("cabang").select("id, kode, nama, lini").order("nama");
  const daftar = ((semua ?? []) as { id: string; kode: string; nama: string; lini: string[] }[]).filter((c) => !c.lini.includes("experience") || c.lini.length > 1);
  const cabang = staf.cabang_id ? daftar.find((c) => c.id === staf.cabang_id) : daftar.find((c) => c.kode === kode) ?? daftar[0];
  if (!cabang) throw new Error("Cabang tidak ditemukan untuk akun ini");
  return { staf, cabang, daftar, supabase };
}

export function menuCabang(q: string, badge: { verifikasi?: number; qc?: number } = {}) {
  return [
    { judul: "Transaksi", item: [
      { href: `/cabang${q}`, label: "Hari ini" },
      { href: `/cabang/verifikasi${q}`, label: "Verifikasi", badge: badge.verifikasi },
      { href: `/cabang/serah-terima${q}`, label: "Serah-terima dan kasir" },
    ] },
    { judul: "Aset", item: [{ href: `/cabang/qc${q}`, label: "Quality control", badge: badge.qc }] },
  ];
}

export function pesanGalat(e: unknown) {
  const m = (e as { message?: string })?.message ?? "Terjadi kesalahan";
  return encodeURIComponent(m.slice(0, 160));
}
