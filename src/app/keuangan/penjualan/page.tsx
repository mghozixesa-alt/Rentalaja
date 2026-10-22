import Link from "next/link";
import { Bingkai, Baris, Ringkas, Tab, Tabel, type SPKeu } from "../Bingkai";
import { terimaPembayaran } from "../actions";
import { Chip, Kartu, input, label, tombol } from "@/components/ui";
import { hariIniWIB, rupiah } from "@/lib/format";
import { dataMaster, STATUS_DOK } from "@/lib/keuangan";
import { JurnalEntry } from "../JurnalEntry";

export const dynamic = "force-dynamic";
export const metadata = { title: "Penjualan · Keuangan" };

type Faktur = { id: string; jenis: string; nomor: string; tanggal: string; jatuh_tempo: string | null; pelanggan: string; cabang_id: string | null; lini: string | null;
  sumber: string; total: number; dibayar: number; sisa: number; diakui: boolean; status: string };
const STATUS = ["semua", "belum_dibayar", "sebagian", "jatuh_tempo", "lunas"];

export default function Penjualan({ searchParams }: { searchParams: SPKeu }) {
  const f = STATUS.includes(searchParams.f ?? "") ? searchParams.f! : "semua";
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/penjualan" judul="Penjualan"
      sub="Setiap booking yang dikonfirmasi otomatis menjadi faktur, ditambah tagihan denda, klaim, dan invoice korporat. Pendapatan diakui saat unit diserahkan; DP dicatat dulu sebagai uang muka pelanggan.">
      {async ({ supabase }) => {
        const m = await dataMaster(supabase);
        const { data } = await supabase.from("faktur_penjualan").select("*").order("tanggal", { ascending: false }).limit(300);
        const semua = (data ?? []) as Faktur[];
        const rows = f === "semua" ? semua : semua.filter((x) => x.status === f);
        const pilih = semua.find((x) => x.id === searchParams.id) ?? null;
        const cab = (id: string | null) => m.cabang.find((c) => c.id === id)?.nama ?? "—";
        const n = (s: string) => semua.filter((x) => x.status === s);
        const kolom = "90px 130px minmax(0,1.2fr) 120px 150px 120px 120px";
        let jurnalIds: string[] = [];
        if (pilih) {
          const { data: bay } = await supabase.from("pembayaran").select("id").or(`booking_id.eq.${pilih.id},tagihan_id.eq.${pilih.id}`);
          const sumber = [pilih.id, ...((bay ?? []) as { id: string }[]).map((x) => x.id)];
          const { data: j } = await supabase.from("jurnal").select("id").in("sumber_id", sumber).order("tanggal");
          jurnalIds = ((j ?? []) as { id: string }[]).map((x) => x.id);
        }
        return (
          <>
            <Ringkas item={[
              ["Belum dibayar", rupiah(n("belum_dibayar").concat(n("sebagian")).reduce((a, x) => a + x.sisa, 0)), `${n("belum_dibayar").length + n("sebagian").length} faktur`],
              ["Jatuh tempo", rupiah(n("jatuh_tempo").reduce((a, x) => a + x.sisa, 0)), `${n("jatuh_tempo").length} faktur`],
              ["Lunas", String(n("lunas").length), "faktur"],
              ["DP belum jadi pendapatan", rupiah(semua.filter((x) => !x.diakui).reduce((a, x) => a + x.dibayar, 0)), "booking yang belum diambil"],
            ]} />
            <div className="grid items-start gap-4 xl:grid-cols-[3fr_2fr]">
              <Kartu className="flex flex-col gap-3">
                <Tab aktif={`/keuangan/penjualan?f=${f}`} item={STATUS.map((s) => [`/keuangan/penjualan?f=${s}`, s === "semua" ? `Semua ${semua.length}` : `${STATUS_DOK[s].label} ${n(s).length}`])} />
                <Tabel kolom={kolom} kepala={["Tanggal", "Nomor", "Pelanggan", "Tag", "Status", "Sisa", "Total"]} kanan={[5, 6]}>
                  {rows.length === 0 ? <p className="py-4 text-sm text-abu">Tidak ada faktur.</p> : null}
                  {rows.map((x) => (
                    <Baris key={x.id} kolom={kolom} aktif={pilih?.id === x.id}>
                      <span className="text-abu">{x.tanggal}</span>
                      <Link href={`/keuangan/penjualan?f=${f}&id=${x.id}`} className="font-bold">{x.nomor}</Link>
                      <span>{x.pelanggan}</span>
                      <span className="text-xs">{cab(x.cabang_id)}</span>
                      <span><Chip nada={STATUS_DOK[x.status]?.nada}>{STATUS_DOK[x.status]?.label ?? x.status}</Chip></span>
                      <span className="text-right">{rupiah(x.sisa)}</span>
                      <b className="text-right">{rupiah(x.total)}</b>
                    </Baris>
                  ))}
                </Tabel>
              </Kartu>
              {pilih ? (
                <Kartu className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2"><b className="text-lg">{pilih.nomor}</b><Chip nada={STATUS_DOK[pilih.status]?.nada}>{STATUS_DOK[pilih.status]?.label}</Chip></div>
                  <div className="text-sm text-abu">{pilih.pelanggan} · {cab(pilih.cabang_id)} · {pilih.lini ?? pilih.jenis}</div>
                  <div className="flex justify-between text-sm"><span>Total</span><b>{rupiah(pilih.total)}</b></div>
                  <div className="flex justify-between text-sm"><span>Sudah dibayar</span><b>{rupiah(pilih.dibayar)}</b></div>
                  <div className="flex justify-between text-sm"><span>Sisa tagihan</span><b>{rupiah(pilih.sisa)}</b></div>
                  <JurnalEntry supabase={supabase} ids={jurnalIds} />
                  {pilih.sisa > 0 ? (
                    <form action={terimaPembayaran} className="flex flex-col gap-2 border-t border-abu-garis pt-3">
                      <b className="text-sm">Terima pembayaran transfer</b>
                      <input type="hidden" name="jenis" value={pilih.jenis} /><input type="hidden" name="id" value={pilih.id} />
                      <input type="hidden" name="asal" value={`/keuangan/penjualan?f=${f}&id=${pilih.id}`} />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className={label}>Masuk ke<select name="akun_kas" className={input}>{m.kasBank.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}</select></label>
                        <label className={label}>Tanggal<input type="date" name="tanggal" defaultValue={hariIniWIB()} className={input} /></label>
                        <label className={label}>Jumlah<input name="jumlah" defaultValue={pilih.sisa} inputMode="numeric" className={input} /></label>
                      </div>
                      <div><button className={tombol}>Terima pembayaran</button></div>
                      <p className="text-xs text-abu">Pembayaran lewat Xendit dan kasir tercatat otomatis; form ini untuk transfer langsung ke rekening.</p>
                    </form>
                  ) : null}
                </Kartu>
              ) : (
                <Kartu><p className="text-sm text-abu">Pilih nomor faktur untuk melihat rincian dan jurnal entry-nya.</p></Kartu>
              )}
            </div>
          </>
        );
      }}
    </Bingkai>
  );
}
