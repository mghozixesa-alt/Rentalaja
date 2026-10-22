import "server-only";
import { redirect } from "next/navigation";
import { wajibPeran } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hariIniWIB } from "@/lib/format";

export type Akun = { id: string; kode: string; nama: string; kategori: string; header: boolean; aktif: boolean; sistem: boolean; cabang_id: string | null };
export type Cabang = { id: string; kode: string; nama: string; lini: string[] };
export type Kontak = { id: string; jenis: string; nama: string; termin_hari: number };

/** Panel Keuangan: hanya owner dan keuangan, wajib 2FA (Supabase MFA, level aal2). */
export async function konteksKeuangan(opsi: { tanpa2fa?: boolean } = {}) {
  const staf = await wajibPeran("keuangan");
  const supabase = createClient();
  if (!opsi.tanpa2fa && process.env.KEUANGAN_TANPA_2FA !== "1") {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2") redirect("/keuangan/2fa");
  }
  return { staf, supabase };
}

export const KATEGORI_AKUN = [
  "Kas & Bank", "Akun Piutang", "Persediaan", "Aktiva Lancar Lainnya", "Aktiva Tetap", "Depresiasi & Amortisasi",
  "Akun Hutang", "Kewajiban Lancar Lainnya", "Kewajiban Jangka Panjang", "Ekuitas",
  "Pendapatan", "Pendapatan Lainnya", "Harga Pokok Penjualan", "Beban", "Beban Lainnya",
] as const;

export const KELOMPOK_AKUN: Record<string, { label: string; kategori: readonly string[] }> = {
  aset: { label: "Aset", kategori: KATEGORI_AKUN.slice(0, 6) },
  kew: { label: "Kewajiban", kategori: KATEGORI_AKUN.slice(6, 9) },
  ek: { label: "Ekuitas", kategori: ["Ekuitas"] },
  pend: { label: "Pendapatan", kategori: ["Pendapatan", "Pendapatan Lainnya"] },
  beban: { label: "Beban", kategori: ["Harga Pokok Penjualan", "Beban", "Beban Lainnya"] },
};

/** Rentang bulan berjalan (WIB) sebagai YYYY-MM-DD. */
export function bulanIni(ref = hariIniWIB()) {
  const [y, m] = ref.split("-").map(Number);
  const akhir = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { dari: `${y}-${String(m).padStart(2, "0")}-01`, sampai: `${y}-${String(m).padStart(2, "0")}-${String(akhir).padStart(2, "0")}` };
}

export function tglValid(s: string | undefined, cadangan: string) {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : cadangan;
}

export async function dataMaster(supabase: ReturnType<typeof createClient>) {
  const [a, c, k] = await Promise.all([
    supabase.from("akun").select("id, kode, nama, kategori, header, aktif, sistem, cabang_id").order("kode"),
    supabase.from("cabang").select("id, kode, nama, lini").order("nama"),
    supabase.from("kontak").select("id, jenis, nama, termin_hari").eq("aktif", true).order("nama"),
  ]);
  const akun = (a.data ?? []) as Akun[];
  return {
    akun,
    akunAktif: akun.filter((x) => x.aktif && !x.header),
    kasBank: akun.filter((x) => x.aktif && !x.header && x.kategori === "Kas & Bank"),
    cabang: (c.data ?? []) as Cabang[],
    kontak: (k.data ?? []) as Kontak[],
  };
}

export function menuKeuangan(badge: { setuju?: number } = {}) {
  return [
    { judul: "Jurnal", item: [
      { href: "/keuangan", label: "Dasbor" },
      { href: "/keuangan/laporan", label: "Laporan" },
      { href: "/keuangan/kas-bank", label: "Kas & Bank" },
      { href: "/keuangan/penjualan", label: "Penjualan" },
      { href: "/keuangan/pembelian", label: "Pembelian" },
      { href: "/keuangan/biaya", label: "Biaya" },
      { href: "/keuangan/kontak", label: "Kontak" },
      { href: "/keuangan/aset-tetap", label: "Aset Tetap" },
      { href: "/keuangan/akun", label: "Daftar Akun" },
      { href: "/keuangan/jurnal-umum", label: "Jurnal Umum" },
    ] },
    { judul: "Rentalaja", item: [
      { href: "/keuangan/persetujuan", label: "Persetujuan uang", badge: badge.setuju },
      { href: "/keuangan/tutup-buku", label: "Tutup buku" },
    ] },
  ];
}

export const STATUS_DOK: Record<string, { label: string; nada: "baik" | "waspada" | "buruk" | "info" | "abu" | "teal" }> = {
  menunggu: { label: "Menunggu persetujuan", nada: "waspada" },
  tercatat: { label: "Tercatat", nada: "baik" },
  ditolak: { label: "Ditolak", nada: "buruk" },
  batal: { label: "Batal", nada: "abu" },
  dibalik: { label: "Dibalik", nada: "abu" },
  lunas: { label: "Lunas", nada: "baik" },
  sebagian: { label: "Dibayar sebagian", nada: "teal" },
  belum_dibayar: { label: "Belum dibayar", nada: "info" },
  jatuh_tempo: { label: "Jatuh tempo", nada: "buruk" },
};

/** Status bayar dokumen pengeluaran. */
export function statusBayar(e: { status: string; total: number; dibayar: number; jatuh_tempo: string | null }) {
  if (e.status !== "tercatat") return e.status;
  if (e.dibayar >= e.total) return "lunas";
  if (e.jatuh_tempo && e.jatuh_tempo < hariIniWIB()) return "jatuh_tempo";
  return e.dibayar > 0 ? "sebagian" : "belum_dibayar";
}

export type LR = { kode: string; nama: string; kategori: string; jumlah: number };
export const PEND = ["Pendapatan", "Pendapatan Lainnya"];
/** Laba bersih dari baris laba_rugi: pendapatan dikurangi beban. */
export const laba = (rows: LR[]) => rows.reduce((s, r) => s + (PEND.includes(r.kategori) ? r.jumlah : -r.jumlah), 0);
