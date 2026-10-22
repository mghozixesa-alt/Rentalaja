import Link from "next/link";
import { Bingkai, Baris, Ringkas, Tabel, type SPKeu } from "../Bingkai";
import { simpanKas } from "../actions";
import { BarisTransaksi } from "@/components/BarisTransaksi";
import { Kartu, input, label, tombol, tombolGaris } from "@/components/ui";
import { hariIniWIB, rupiah } from "@/lib/format";
import { dataMaster } from "@/lib/keuangan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kas & Bank · Keuangan" };

const JUDUL: Record<string, [string, string, string]> = {
  terima: ["Terima uang", "Masuk ke", "Dari (pembayar)"],
  kirim: ["Kirim uang", "Bayar dari", "Penerima"],
  transfer: ["Transfer dana", "Dari akun", "Ke akun"],
};

export default function KasBank({ searchParams }: { searchParams: SPKeu }) {
  const f = searchParams.f && JUDUL[searchParams.f] ? searchParams.f : null;
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/kas-bank" judul="Kas & Bank"
      sub="Semua akun kas fisik, rekening BCA, dan saldo Xendit. Uang yang tidak lewat sistem booking dicatat di sini, seperti di Jurnal."
      kanan={<>
        <Link href="/keuangan/kas-bank?f=transfer" className={tombolGaris}>Transfer dana</Link>
        <Link href="/keuangan/kas-bank?f=terima" className={tombolGaris}>Terima uang</Link>
        <Link href="/keuangan/kas-bank?f=kirim" className={tombol}>Kirim uang</Link>
      </>}>
      {async ({ supabase }) => {
        const m = await dataMaster(supabase);
        const { data } = await supabase.rpc("saldo_akun", { p_dari: null, p_sampai: hariIniWIB() });
        const saldo = ((data ?? []) as { akun_id: string; kode: string; nama: string; kategori: string; saldo: number }[]).filter((x) => x.kategori === "Kas & Bank");
        const { data: mut } = await supabase.from("mutasi_bank").select("akun_id").is("jurnal_baris_id", null);
        const belum = (id: string) => ((mut ?? []) as { akun_id: string }[]).filter((x) => x.akun_id === id).length;
        const opsiAkun = m.akunAktif.filter((a) => a.kategori !== "Kas & Bank").map((a) => ({ id: a.id, label: `${a.kode} ${a.nama}` }));
        const opsiCabang = m.cabang.map((c) => ({ id: c.id, label: c.nama }));
        const kolom = "90px minmax(0,1fr) 160px 170px";
        return (
          <>
            {f ? (
              <Kartu className="flex flex-col gap-4 border-2 border-navy">
                <h2 className="text-lg font-extrabold">{JUDUL[f][0]}</h2>
                <form action={simpanKas} className="flex flex-col gap-4">
                  <input type="hidden" name="jenis" value={f} />
                  <div className="grid gap-3 md:grid-cols-4">
                    <label className={label}>{JUDUL[f][1]}
                      <select name="akun_kas" className={input} required>{m.kasBank.map((a) => <option key={a.id} value={a.id}>{a.kode} {a.nama}</option>)}</select>
                    </label>
                    {f === "transfer" ? (
                      <label className={label}>{JUDUL[f][2]}
                        <select name="akun_tujuan" className={input} required>{m.kasBank.map((a) => <option key={a.id} value={a.id}>{a.kode} {a.nama}</option>)}</select>
                      </label>
                    ) : (
                      <label className={label}>{JUDUL[f][2]}
                        <select name="kontak" className={input}><option value="">—</option>{m.kontak.map((k) => <option key={k.id} value={k.id}>{k.nama} ({k.jenis})</option>)}</select>
                      </label>
                    )}
                    <label className={label}>Tanggal transaksi<input type="date" name="tanggal" defaultValue={hariIniWIB()} className={input} required /></label>
                    <label className={label}>Memo<input name="memo" className={input} maxLength={200} /></label>
                  </div>
                  {f === "transfer" ? (
                    <label className={`${label} max-w-xs`}>Jumlah<input name="total" inputMode="numeric" className={input} required /></label>
                  ) : (
                    <BarisTransaksi akun={opsiAkun} cabang={opsiCabang} />
                  )}
                  <p className="text-xs text-abu">Jurnal dibuat otomatis: akun kas/bank di satu sisi, akun yang dipilih di sisi lain. Kirim uang di atas batas persetujuan menunggu owner dulu; transfernya tetap dilakukan dari aplikasi bank setelah disetujui.</p>
                  <div className="flex gap-2"><Link href="/keuangan/kas-bank" className={tombolGaris}>Batal</Link><button className={tombol}>Simpan</button></div>
                </form>
              </Kartu>
            ) : null}
            <Ringkas item={[
              ["Total kas dan bank", rupiah(saldo.reduce((a, x) => a + x.saldo, 0))],
              ["Kas fisik cabang", rupiah(saldo.filter((x) => x.kode < "1-10010").reduce((a, x) => a + x.saldo, 0))],
              ["Rekening bank", rupiah(saldo.filter((x) => x.kode >= "1-10010" && x.kode < "1-10020").reduce((a, x) => a + x.saldo, 0))],
              ["Saldo Xendit", rupiah(saldo.filter((x) => x.kode >= "1-10020").reduce((a, x) => a + x.saldo, 0))],
            ]} />
            <Kartu>
              <Tabel kolom={kolom} kepala={["Kode", "Akun", "Saldo di Rentalaja", "Rekonsiliasi"]} kanan={[2]}>
                {saldo.map((k) => (
                  <Baris key={k.akun_id} kolom={kolom}>
                    <span className="text-abu">{k.kode}</span>
                    <Link href={`/keuangan/kas-bank/${k.akun_id}`} className="font-bold">{k.nama}</Link>
                    <b className="text-right">{rupiah(k.saldo)}</b>
                    <Link href={`/keuangan/kas-bank/${k.akun_id}?t=rek`} className="text-sm">{belum(k.akun_id) ? `${belum(k.akun_id)} mutasi belum cocok` : "Lihat"}</Link>
                  </Baris>
                ))}
              </Tabel>
            </Kartu>
          </>
        );
      }}
    </Bingkai>
  );
}
