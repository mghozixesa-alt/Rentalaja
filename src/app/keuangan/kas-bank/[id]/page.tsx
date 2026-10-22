import Link from "next/link";
import { notFound } from "next/navigation";
import { Bingkai, Baris, Tab, Tabel, type SPKeu } from "../../Bingkai";
import { cocokkanMutasi, imporMutasi } from "../../actions";
import { Chip, Kartu, input, label, tombol, tombolGaris } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { bulanIni, tglValid } from "@/lib/keuangan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detail rekening · Keuangan" };

type BB = { jurnal_id: string; nomor: string; tanggal: string; sumber: string; memo: string | null; keterangan: string | null; debit: number; kredit: number; saldo: number };
type Mutasi = { id: string; tanggal: string; keterangan: string; jumlah: number; jurnal_baris_id: string | null };
type Saran = { mutasi_id: string; jurnal_baris_id: string; nomor: string; tanggal: string; memo: string | null };

export default function DetailKas({ params, searchParams }: { params: { id: string }; searchParams: SPKeu }) {
  const t = searchParams.t === "rek" ? "rek" : "trx";
  const b = bulanIni();
  const dari = tglValid(searchParams.dari, b.dari);
  const sampai = tglValid(searchParams.sampai, b.sampai);
  const base = `/keuangan/kas-bank/${params.id}`;
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/kas-bank" judul="Detail rekening" sub="Transaksi dari buku besar dan rekonsiliasi dengan mutasi bank atau laporan Xendit."
      kanan={<Link href={`/keuangan/kas-bank?f=kirim`} className={tombolGaris}>Kirim uang</Link>}>
      {async ({ supabase }) => {
        const { data: akun } = await supabase.from("akun").select("id, kode, nama, kategori").eq("id", params.id).maybeSingle();
        if (!akun || akun.kategori !== "Kas & Bank") notFound();
        const head = (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{akun.kode} · {akun.nama}</h2>
            <Tab aktif={t === "rek" ? `${base}?t=rek` : base} item={[[base, "Transaksi"], [`${base}?t=rek`, "Rekonsiliasi bank"]]} />
          </div>
        );
        if (t === "trx") {
          const { data } = await supabase.rpc("buku_besar", { p_akun: params.id, p_dari: dari, p_sampai: sampai });
          const rows = (data ?? []) as BB[];
          const kolom = "100px 130px minmax(0,1.6fr) 120px 120px 130px";
          return (
            <>
              {head}
              <form className="flex flex-wrap items-end gap-2">
                <label className={label}>Dari<input type="date" name="dari" defaultValue={dari} className={input} /></label>
                <label className={label}>Sampai<input type="date" name="sampai" defaultValue={sampai} className={input} /></label>
                <button className={tombolGaris}>Terapkan</button>
              </form>
              <Kartu>
                <Tabel kolom={kolom} kepala={["Tanggal", "Nomor", "Keterangan", "Masuk", "Keluar", "Saldo"]} kanan={[3, 4, 5]}>
                  {rows.length === 0 ? <p className="py-4 text-sm text-abu">Belum ada transaksi di periode ini.</p> : null}
                  {rows.map((r, i) => (
                    <Baris key={r.jurnal_id + i} kolom={kolom}>
                      <span className="text-abu">{r.tanggal}</span>
                      <Link href={`/keuangan/jurnal-umum?j=${r.jurnal_id}`} className="font-bold">{r.nomor}</Link>
                      <span>{r.memo}{r.keterangan ? <span className="text-abu"> · {r.keterangan}</span> : null}</span>
                      <span className="text-right">{r.debit ? rupiah(r.debit) : ""}</span>
                      <span className="text-right">{r.kredit ? rupiah(r.kredit) : ""}</span>
                      <b className="text-right">{rupiah(r.saldo)}</b>
                    </Baris>
                  ))}
                </Tabel>
              </Kartu>
            </>
          );
        }
        const [mut, sar] = await Promise.all([
          supabase.from("mutasi_bank").select("id, tanggal, keterangan, jumlah, jurnal_baris_id").eq("akun_id", params.id).order("tanggal", { ascending: false }).limit(200),
          supabase.from("saran_rekonsiliasi").select("mutasi_id, jurnal_baris_id, nomor, tanggal, memo"),
        ]);
        const mutasi = (mut.data ?? []) as Mutasi[];
        const saran = (sar.data ?? []) as Saran[];
        const kolom = "100px minmax(0,1.4fr) 130px minmax(0,1.6fr)";
        return (
          <>
            {head}
            <Kartu className="flex flex-col gap-3">
              <h3 className="font-extrabold">Impor mutasi</h3>
              <form action={imporMutasi} className="flex flex-col gap-2">
                <input type="hidden" name="akun" value={params.id} />
                <textarea name="mutasi" rows={4} required className="rounded-xl border border-abu-input p-3 font-mono text-sm"
                  placeholder={"Salin dari mutasi KlikBCA atau laporan Xendit, satu baris per transaksi:\n21/10/2026;TRSF E-BANKING DB BENGKEL JAYA;-850000\n21/10/2026;SETORAN TUNAI GARUT;1250000"} />
                <div><button className={tombol}>Impor</button></div>
              </form>
            </Kartu>
            <Kartu>
              <Tabel kolom={kolom} kepala={["Tanggal", "Mutasi bank", "Jumlah", "Pasangan di Rentalaja"]} kanan={[2]}>
                {mutasi.length === 0 ? <p className="py-4 text-sm text-abu">Belum ada mutasi diimpor.</p> : null}
                {mutasi.map((m) => {
                  const s = saran.filter((x) => x.mutasi_id === m.id);
                  return (
                    <Baris key={m.id} kolom={kolom}>
                      <span className="text-abu">{m.tanggal}</span>
                      <span>{m.keterangan}</span>
                      <b className="text-right">{rupiah(m.jumlah)}</b>
                      {m.jurnal_baris_id ? <span><Chip nada="baik">Cocok</Chip></span> : s.length === 0 ? (
                        <span className="text-sm text-abu">Belum ada transaksi yang cocok. Catat lewat Terima/Kirim uang.</span>
                      ) : (
                        <form action={cocokkanMutasi} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="akun" value={params.id} /><input type="hidden" name="mutasi" value={m.id} />
                          <select name="baris_jurnal" className="h-10 rounded-lg border border-abu-input px-2 text-sm">
                            {s.map((x) => <option key={x.jurnal_baris_id} value={x.jurnal_baris_id}>{x.nomor} · {x.tanggal} · {x.memo?.slice(0, 40)}</option>)}
                          </select>
                          <button className="h-10 rounded-lg bg-teal px-3 text-sm font-extrabold">Cocokkan</button>
                        </form>
                      )}
                    </Baris>
                  );
                })}
              </Tabel>
            </Kartu>
          </>
        );
      }}
    </Bingkai>
  );
}
