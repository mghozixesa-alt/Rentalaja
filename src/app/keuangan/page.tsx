import Link from "next/link";
import { Bingkai, Baris, Ringkas, Tabel, JENIS_UANG, type SPKeu } from "./Bingkai";
import { Chip, Kartu, tombol, tombolGaris } from "@/components/ui";
import { rupiah, hariIniWIB } from "@/lib/format";
import { bulanIni, laba, PEND, type LR } from "@/lib/keuangan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dasbor · Keuangan" };

type Saldo = { akun_id: string; kode: string; nama: string; kategori: string; saldo: number };

export default function Dasbor({ searchParams }: { searchParams: SPKeu }) {
  return (
    <Bingkai sp={searchParams} aktif="/keuangan" judul="Dasbor" sub="Ringkasan keuangan Rentalaja dari jurnal yang sama dengan laporan. Angka bulan berjalan, semua cabang."
      kanan={<><Link href="/keuangan/kas-bank" className={tombolGaris}>Kas & Bank</Link><Link href="/keuangan/laporan" className={tombol}>Lihat laporan</Link></>}>
      {async ({ supabase }) => {
        const hari = hariIniWIB();
        const { dari, sampai } = bulanIni();
        const [saldo, lr, faktur, beli, setuju, mutasi, py, cabang] = await Promise.all([
          supabase.rpc("saldo_akun", { p_dari: null, p_sampai: hari }),
          supabase.rpc("laba_rugi", { p_dari: dari, p_sampai: sampai }),
          supabase.from("faktur_penjualan").select("sisa, status, diakui"),
          supabase.from("pengeluaran").select("total, dibayar, jatuh_tempo").eq("status", "tercatat").is("bayar_dari", null),
          supabase.from("persetujuan").select("id", { count: "exact", head: true }).eq("status", "menunggu").in("jenis", JENIS_UANG),
          supabase.from("mutasi_bank").select("id", { count: "exact", head: true }).is("jurnal_baris_id", null),
          supabase.from("jurnal").select("id", { count: "exact", head: true }).eq("sumber", "penyusutan").eq("status", "tercatat").eq("tanggal", sampai),
          supabase.from("cabang").select("id, nama").order("nama"),
        ]);
        const s = (saldo.data ?? []) as Saldo[];
        const kas = s.filter((x) => x.kategori === "Kas & Bank");
        const fk = (faktur.data ?? []) as { sisa: number; status: string; diakui: boolean }[];
        const piutang = fk.filter((f) => f.diakui).reduce((a, f) => a + f.sisa, 0);
        const jt = fk.filter((f) => f.status === "jatuh_tempo");
        const tagihan = ((beli.data ?? []) as { total: number; dibayar: number; jatuh_tempo: string | null }[]).filter((e) => e.dibayar < e.total);
        const tagihanJt = tagihan.filter((e) => e.jatuh_tempo && e.jatuh_tempo <= hari);
        const cab = (cabang.data ?? []) as { id: string; nama: string }[];
        const perCabang = await Promise.all(cab.map(async (c) => ({ c, lr: ((await supabase.rpc("laba_rugi", { p_dari: dari, p_sampai: sampai, p_cabang: c.id })).data ?? []) as LR[] })));
        const lrAll = (lr.data ?? []) as LR[];
        const todo: [boolean, string, string, string][] = [
          [(setuju.count ?? 0) > 0, `${setuju.count} menunggu persetujuan owner`, "Pembelian, biaya, kirim uang, dan jurnal manual", "/keuangan/persetujuan"],
          [jt.length > 0, `${jt.length} faktur penjualan jatuh tempo`, rupiah(jt.reduce((a, f) => a + f.sisa, 0)), "/keuangan/penjualan?f=jatuh_tempo"],
          [tagihanJt.length > 0, `${tagihanJt.length} tagihan pembelian jatuh tempo`, rupiah(tagihanJt.reduce((a, e) => a + e.total - e.dibayar, 0)), "/keuangan/pembelian"],
          [(mutasi.count ?? 0) > 0, `${mutasi.count} mutasi bank belum dicocokkan`, "Rekonsiliasi di Kas & Bank", "/keuangan/kas-bank"],
          [(py.count ?? 0) === 0, "Penyusutan bulan ini belum dijalankan", "Jalankan di akhir bulan sebelum tutup buku", "/keuangan/aset-tetap"],
        ];
        const kolom = "90px minmax(0,1fr) 160px";
        const kolomC = "minmax(0,1.4fr) repeat(3, 130px)";
        return (
          <>
            <Ringkas item={[
              ["Kas dan bank", rupiah(kas.reduce((a, x) => a + x.saldo, 0)), `${kas.length} akun`],
              ["Piutang usaha", rupiah(piutang), `${jt.length} faktur jatuh tempo`],
              ["Hutang usaha", rupiah(tagihan.reduce((a, e) => a + e.total - e.dibayar, 0)), `${tagihan.length} tagihan belum lunas`],
              ["Laba bersih bulan ini", rupiah(laba(lrAll)), `${dari.slice(8)}–${sampai.slice(8)} ${sampai.slice(0, 7)}`],
            ]} />
            <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
              <Kartu className="flex flex-col gap-2">
                <h2 className="text-lg font-extrabold">Kas dan bank</h2>
                <Tabel kolom={kolom} kepala={["Kode", "Akun", "Saldo"]} kanan={[2]}>
                  {kas.map((k) => (
                    <Baris key={k.akun_id} kolom={kolom}>
                      <span className="text-abu">{k.kode}</span>
                      <Link href={`/keuangan/kas-bank/${k.akun_id}`} className="font-bold">{k.nama}</Link>
                      <b className="text-right">{rupiah(k.saldo)}</b>
                    </Baris>
                  ))}
                </Tabel>
              </Kartu>
              <Kartu className="flex flex-col gap-1">
                <h2 className="text-lg font-extrabold">Perlu tindakan</h2>
                {todo.filter((t) => t[0]).length === 0 ? <p className="text-sm text-abu">Semua beres.</p> : null}
                {todo.filter((t) => t[0]).map(([, a, b, h]) => (
                  <Link key={a} href={h} className="flex items-center justify-between gap-3 border-b border-abu-garis py-2.5 no-underline">
                    <div><b className="text-sm">{a}</b><div className="text-xs text-abu">{b}</div></div><span aria-hidden>→</span>
                  </Link>
                ))}
              </Kartu>
            </div>
            <Kartu className="flex flex-col gap-2">
              <h2 className="text-lg font-extrabold">Laba rugi bulan ini per cabang <Chip nada="teal">tag cabang</Chip></h2>
              <Tabel kolom={kolomC} kepala={["Cabang", "Pendapatan", "Beban", "Laba bersih"]} kanan={[1, 2, 3]}>
                {perCabang.filter((x) => x.lr.length > 0).map(({ c, lr: rows }) => {
                  const p = rows.filter((r) => PEND.includes(r.kategori)).reduce((a, r) => a + r.jumlah, 0);
                  return (
                    <Baris key={c.id} kolom={kolomC}>
                      <b>{c.nama}</b><span className="text-right">{rupiah(p)}</span><span className="text-right">{rupiah(p - laba(rows))}</span><b className="text-right">{rupiah(laba(rows))}</b>
                    </Baris>
                  );
                })}
              </Tabel>
              <p className="text-xs text-abu">Biaya tanpa tag cabang (kantor pusat) hanya muncul di laporan total.</p>
            </Kartu>
          </>
        );
      }}
    </Bingkai>
  );
}
