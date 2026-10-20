import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Peran =
  | "owner" | "keuangan" | "manajer_aset" | "manajer_experience" | "kepala_cabang" | "cs" | "kasir"
  | "petugas_qc" | "teknisi" | "runner" | "sopir" | "cs_experience" | "mitra" | "pelanggan";

export type Staf = { id: string; nama: string; peran: Peran; cabang_id: string | null };

/** Pengguna yang sedang masuk, atau null. */
export async function penggunaSaatIni() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Data pelanggan milik pengguna yang sedang masuk (null bila belum daftar). */
export async function pelangganSaya() {
  const supabase = createClient();
  const { data } = await supabase.from("pelanggan").select("id, nama, nomor_wa, level, saldo_poin, terverifikasi").maybeSingle();
  return data as { id: string; nama: string; nomor_wa: string; level: string; saldo_poin: number; terverifikasi: boolean } | null;
}

/** Wajib staf dengan salah satu peran; owner selalu boleh. Mengarahkan ke beranda bila tidak berhak. */
export async function wajibPeran(...peran: Peran[]): Promise<Staf> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  const { data } = await supabase.from("pengguna").select("id, nama, peran, cabang_id").eq("id", user.id).eq("aktif", true).maybeSingle();
  const staf = data as Staf | null;
  if (!staf || !(staf.peran === "owner" || peran.includes(staf.peran))) redirect("/?akses=ditolak");
  return staf;
}
