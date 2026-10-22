import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { PEND, type LR } from "@/lib/keuangan";

export type BarisLap = { sel: (string | number)[]; tebal?: boolean; menjorok?: boolean };
export type Laporan = { judul: string; kolom: string[]; angka: number[]; baris: BarisLap[] };
export const JENIS_LAPORAN: [string, string, string][] = [
  ["laba-rugi", "Laba rugi", "Pendapatan, beban pokok, dan beban per periode"],
  ["neraca", "Neraca", "Aset, kewajiban, dan ekuitas per tanggal"],
  ["neraca-saldo", "Neraca saldo", "Debit dan kredit semua akun"],
  ["buku-besar", "Buku besar", "Semua transaksi per akun"],
  ["per-cabang", "Laba rugi per cabang", "Tag Garut Kota, Wanaraja, Bandung, Experience"],
  ["umur-piutang", "Umur piutang", "Sisa tagihan pelanggan per umur"],
  ["umur-hutang", "Umur hutang", "Sisa tagihan supplier per umur"],
];

type SB = ReturnType<typeof createClient>;
const URUT_LR: [string, string][] = [["Pendapatan", "Pendapatan"], ["Harga Pokok Penjualan", "Beban pokok pendapatan"], ["Beban", "Beban operasional"], ["Pendapatan Lainnya", "Pendapatan lainnya"], ["Beban Lainnya", "Beban lainnya"]];
const ASET = ["Kas & Bank", "Akun Piutang", "Persediaan", "Aktiva Lancar Lainnya", "Aktiva Tetap", "Depresiasi & Amortisasi"];
const KEW = ["Akun Hutang", "Kewajiban Lancar Lainnya", "Kewajiban Jangka Panjang"];
const hari = (a: string, b: string) => Math.floor((Date.parse(b) - Date.parse(a)) / 86_400_000);

export async function ambilLaporan(supabase: SB, p: { r: string; dari: string; sampai: string; cabang?: string | null; akun?: string | null }): Promise<Laporan> {
  const cab = p.cabang || null;
  if (p.r === "neraca") {
    const rows = ((await supabase.rpc("neraca", { p_per: p.sampai })).data ?? []) as LR[];
    const baris: BarisLap[] = [];
    let ka = 0;
    for (const [judul, kat] of [["Aset", ASET], ["Kewajiban", KEW], ["Ekuitas", ["Ekuitas"]]] as [string, string[]][]) {
      baris.push({ sel: [judul, ""], tebal: true });
      const isi = rows.filter((r) => kat.includes(r.kategori));
      isi.forEach((r) => baris.push({ sel: [`${r.kode} ${r.nama}`, r.jumlah], menjorok: true }));
      const t = isi.reduce((a, r) => a + r.jumlah, 0);
      baris.push({ sel: [`Total ${judul.toLowerCase()}`, t], tebal: true });
      if (judul !== "Aset") ka += t;
    }
    baris.push({ sel: ["Total kewajiban dan ekuitas", ka], tebal: true });
    return { judul: `Neraca per ${p.sampai}`, kolom: ["Akun", "Saldo"], angka: [1], baris };
  }
  if (p.r === "neraca-saldo") {
    const rows = ((await supabase.rpc("saldo_akun", { p_dari: p.dari, p_sampai: p.sampai, p_cabang: cab })).data ?? []) as { kode: string; nama: string; debit: number; kredit: number }[];
    const isi = rows.filter((r) => r.debit || r.kredit);
    return { judul: `Neraca saldo ${p.dari} s.d. ${p.sampai}`, kolom: ["Akun", "Debit", "Kredit"], angka: [1, 2], baris: [
      ...isi.map((r) => ({ sel: [`${r.kode} ${r.nama}`, r.debit, r.kredit] })),
      { sel: ["Total", isi.reduce((a, r) => a + r.debit, 0), isi.reduce((a, r) => a + r.kredit, 0)], tebal: true },
    ] };
  }
  if (p.r === "buku-besar") {
    if (!p.akun) return { judul: "Buku besar: pilih akun", kolom: ["Tanggal", "Nomor", "Keterangan", "Debit", "Kredit", "Saldo"], angka: [3, 4, 5], baris: [] };
    const rows = ((await supabase.rpc("buku_besar", { p_akun: p.akun, p_dari: p.dari, p_sampai: p.sampai })).data ?? []) as { tanggal: string; nomor: string; memo: string | null; debit: number; kredit: number; saldo: number }[];
    return { judul: `Buku besar ${p.dari} s.d. ${p.sampai}`, kolom: ["Tanggal", "Nomor", "Keterangan", "Debit", "Kredit", "Saldo"], angka: [3, 4, 5],
      baris: rows.map((r) => ({ sel: [r.tanggal, r.nomor, r.memo ?? "", r.debit, r.kredit, r.saldo] })) };
  }
  if (p.r === "per-cabang") {
    const cabang = ((await supabase.from("cabang").select("id, nama").order("nama")).data ?? []) as { id: string; nama: string }[];
    const per = await Promise.all(cabang.map(async (c) => ((await supabase.rpc("laba_rugi", { p_dari: p.dari, p_sampai: p.sampai, p_cabang: c.id })).data ?? []) as LR[]));
    const total = ((await supabase.rpc("laba_rugi", { p_dari: p.dari, p_sampai: p.sampai })).data ?? []) as LR[];
    const ada = cabang.map((c, i) => ({ c, rows: per[i] })).filter((x) => x.rows.length);
    const sum = (rows: LR[], f: (r: LR) => boolean) => rows.filter(f).reduce((a, r) => a + r.jumlah, 0);
    const baris: BarisLap[] = [];
    for (const [kat, judul] of URUT_LR) {
      const kode = Array.from(new Set(total.filter((r) => r.kategori === kat).map((r) => r.kode)));
      if (!kode.length) continue;
      baris.push({ sel: [judul, ...ada.map(() => ""), "", ""], tebal: true });
      for (const k of kode) {
        const n = total.find((r) => r.kode === k)!;
        const v = ada.map((x) => sum(x.rows, (r) => r.kode === k));
        baris.push({ sel: [`${k} ${n.nama}`, ...v, n.jumlah - v.reduce((a, b) => a + b, 0), n.jumlah], menjorok: true });
      }
    }
    const lb = (rows: LR[]) => sum(rows, (r) => PEND.includes(r.kategori)) - sum(rows, (r) => !PEND.includes(r.kategori));
    const v = ada.map((x) => lb(x.rows));
    baris.push({ sel: ["Laba bersih", ...v, lb(total) - v.reduce((a, b) => a + b, 0), lb(total)], tebal: true });
    const kolom = ["Akun", ...ada.map((x) => x.c.nama), "Tanpa tag (pusat)", "Total"];
    return { judul: `Laba rugi per cabang ${p.dari} s.d. ${p.sampai}`, kolom, angka: kolom.map((_, i) => i).slice(1), baris };
  }
  if (p.r === "umur-piutang" || p.r === "umur-hutang") {
    const piutang = p.r === "umur-piutang";
    const rows: { nomor: string; nama: string; jt: string; sisa: number }[] = piutang
      ? (((await supabase.from("faktur_penjualan").select("nomor, pelanggan, jatuh_tempo, sisa, diakui").gt("sisa", 0)).data ?? []) as { nomor: string; pelanggan: string; jatuh_tempo: string | null; sisa: number; diakui: boolean }[])
          .filter((r) => r.diakui).map((r) => ({ nomor: r.nomor, nama: r.pelanggan, jt: r.jatuh_tempo ?? p.sampai, sisa: r.sisa }))
      : (((await supabase.from("pengeluaran").select("nomor, penerima, jatuh_tempo, total, dibayar").eq("status", "tercatat").is("bayar_dari", null)).data ?? []) as { nomor: string; penerima: string | null; jatuh_tempo: string | null; total: number; dibayar: number }[])
          .filter((r) => r.dibayar < r.total).map((r) => ({ nomor: r.nomor, nama: r.penerima ?? "—", jt: r.jatuh_tempo ?? p.sampai, sisa: r.total - r.dibayar }));
    const ember = (h: number) => (h <= 0 ? 0 : h <= 30 ? 1 : h <= 60 ? 2 : h <= 90 ? 3 : 4);
    const baris = rows.map((r) => { const c = [0, 0, 0, 0, 0]; c[ember(hari(r.jt, p.sampai))] = r.sisa; return { sel: [r.nomor, r.nama, r.jt, ...c] }; });
    const tot = [0, 1, 2, 3, 4].map((i) => baris.reduce((a, b) => a + (b.sel[3 + i] as number), 0));
    return { judul: `${piutang ? "Umur piutang" : "Umur hutang"} per ${p.sampai}`, kolom: ["Nomor", piutang ? "Pelanggan" : "Supplier", "Jatuh tempo", "Belum jatuh tempo", "1–30 hari", "31–60", "61–90", "> 90"],
      angka: [3, 4, 5, 6, 7], baris: [...baris, { sel: ["Total", "", "", ...tot], tebal: true }] };
  }
  // laba rugi
  const rows = ((await supabase.rpc("laba_rugi", { p_dari: p.dari, p_sampai: p.sampai, p_cabang: cab })).data ?? []) as LR[];
  const baris: BarisLap[] = [];
  const t: Record<string, number> = {};
  for (const [kat, judul] of URUT_LR) {
    const isi = rows.filter((r) => r.kategori === kat);
    t[kat] = isi.reduce((a, r) => a + r.jumlah, 0);
    if (isi.length) {
      baris.push({ sel: [judul, ""], tebal: true });
      isi.forEach((r) => baris.push({ sel: [`${r.kode} ${r.nama}`, r.jumlah], menjorok: true }));
      baris.push({ sel: [`Total ${judul.toLowerCase()}`, t[kat]], tebal: true });
    }
    if (kat === "Harga Pokok Penjualan") baris.push({ sel: ["Laba kotor", t["Pendapatan"] - t[kat]], tebal: true });
  }
  baris.push({ sel: ["Laba bersih", t["Pendapatan"] - t["Harga Pokok Penjualan"] - t["Beban"] + t["Pendapatan Lainnya"] - t["Beban Lainnya"]], tebal: true });
  return { judul: `Laba rugi ${p.dari} s.d. ${p.sampai}`, kolom: ["Akun", "Jumlah"], angka: [1], baris };
}
