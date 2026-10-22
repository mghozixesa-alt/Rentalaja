import Link from "next/link";
import { Bingkai, Baris, Tab, Tabel, type SPKeu } from "../Bingkai";
import { balikJurnal, simpanJurnalUmum } from "../actions";
import { JurnalEntry } from "../JurnalEntry";
import { BarisTransaksi } from "@/components/BarisTransaksi";
import { Chip, Kartu, input, label, tombol, tombolGaris } from "@/components/ui";
import { hariIniWIB } from "@/lib/format";
import { dataMaster, STATUS_DOK } from "@/lib/keuangan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jurnal Umum · Keuangan" };

type J = { id: string; nomor: string; tanggal: string; sumber: string; memo: string | null; status: string; jurnal_baris: { debit: number }[] };
const SUMBER: Record<string, string> = { booking: "Penjualan", pembayaran: "Pembayaran", tagihan: "Tagihan", refund: "Refund", pengeluaran: "Pembelian/biaya", kas: "Kas & Bank",
  penyusutan: "Penyusutan", aset: "Aset", manual: "Manual", saldo_awal: "Saldo awal", balik: "Jurnal balik" };

export default function JurnalUmum({ searchParams }: { searchParams: SPKeu }) {
  const t = ["manual", "otomatis", "semua"].includes(searchParams.t ?? "") ? searchParams.t! : "manual";
  const saldoAwal = searchParams.saldo_awal === "1";
  const buka = searchParams.f === "baru" || saldoAwal;
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/jurnal-umum" judul="Jurnal Umum"
      sub="Untuk transaksi yang tidak punya menu sendiri: koreksi, reklasifikasi, saldo awal. Debit harus sama dengan kredit, dan selalu disetujui owner sebelum tercatat."
      kanan={<Link href={buka ? "/keuangan/jurnal-umum" : "/keuangan/jurnal-umum?f=baru"} className={tombol}>{buka ? "Tutup formulir" : "+ Buat jurnal umum"}</Link>}>
      {async ({ supabase }) => {
        const m = await dataMaster(supabase);
        let q = supabase.from("jurnal").select("id, nomor, tanggal, sumber, memo, status, jurnal_baris(debit)").order("tanggal", { ascending: false }).order("nomor", { ascending: false }).limit(200);
        if (t === "manual") q = q.in("sumber", ["manual", "saldo_awal", "balik"]);
        if (t === "otomatis") q = q.not("sumber", "in", "(manual,saldo_awal,balik)");
        const { data } = await q;
        const rows = (data ?? []) as J[];
        const { data: pilihData } = searchParams.j && /^[0-9a-f-]{36}$/.test(searchParams.j) ? await supabase.from("jurnal").select("id, nomor, status").eq("id", searchParams.j).maybeSingle() : { data: null };
        const pilih = pilihData as { id: string; nomor: string; status: string } | null;
        const opsiAkun = m.akunAktif.filter((a) => saldoAwal || a.kategori !== "Kas & Bank").map((a) => ({ id: a.id, label: `${a.kode} ${a.nama}` }));
        const kolom = "100px 130px minmax(0,1.8fr) 130px 170px 130px";
        return (
          <>
            {buka ? (
              <Kartu className="flex flex-col gap-4 border-2 border-navy">
                <h2 className="text-lg font-extrabold">{saldoAwal ? "Saldo awal" : "Buat jurnal umum"}</h2>
                <form action={simpanJurnalUmum} className="flex flex-col gap-4">
                  <div className="grid gap-3 md:grid-cols-[200px_1fr]">
                    <label className={label}>Tanggal transaksi<input type="date" name="tanggal" defaultValue={hariIniWIB()} className={input} required /></label>
                    <label className={label}>Memo<input name="memo" required maxLength={200} className={input} defaultValue={saldoAwal ? "Saldo awal dari Jurnal Mekari" : ""} /></label>
                  </div>
                  {saldoAwal ? <input type="hidden" name="saldo_awal" value="on" /> : null}
                  <BarisTransaksi akun={opsiAkun} cabang={m.cabang.map((c) => ({ id: c.id, label: c.nama }))} mode="debitkredit" awal={saldoAwal ? 6 : 2} />
                  <p className="text-xs text-abu">{saldoAwal
                    ? "Isi saldo setiap akun per tanggal mulai (dari neraca Jurnal Mekari). Selisihnya ke 3-30900 Ekuitas saldo awal. Akun kas dan bank boleh dipakai khusus di saldo awal."
                    : "Akun kas dan bank tidak bisa dipakai di sini; gunakan Kas & Bank supaya rekonsiliasi tetap rapi. Pencatat tidak boleh menyetujui jurnalnya sendiri."}</p>
                  <div><button className={tombol}>Kirim untuk persetujuan</button></div>
                </form>
              </Kartu>
            ) : null}
            <div className="grid items-start gap-4 xl:grid-cols-[3fr_2fr]">
              <Kartu className="flex flex-col gap-3">
                <Tab aktif={`/keuangan/jurnal-umum?t=${t}`} item={[["/keuangan/jurnal-umum?t=manual", "Jurnal manual"], ["/keuangan/jurnal-umum?t=otomatis", "Jurnal otomatis"], ["/keuangan/jurnal-umum?t=semua", "Semua transaksi"]]} />
                <Tabel kolom={kolom} kepala={["Tanggal", "Nomor", "Memo", "Sumber", "Status", "Total"]} kanan={[5]}>
                  {rows.length === 0 ? <p className="py-4 text-sm text-abu">Belum ada jurnal.</p> : null}
                  {rows.map((j) => (
                    <Baris key={j.id} kolom={kolom} aktif={pilih?.id === j.id}>
                      <span className="text-abu">{j.tanggal}</span>
                      <Link href={`/keuangan/jurnal-umum?t=${t}&j=${j.id}`} className="font-bold">{j.nomor}</Link>
                      <span>{j.memo}</span>
                      <span className="text-xs">{SUMBER[j.sumber] ?? j.sumber}</span>
                      <span><Chip nada={STATUS_DOK[j.status]?.nada}>{STATUS_DOK[j.status]?.label}</Chip></span>
                      <b className="text-right">{"Rp" + j.jurnal_baris.reduce((a, b) => a + b.debit, 0).toLocaleString("id-ID")}</b>
                    </Baris>
                  ))}
                </Tabel>
              </Kartu>
              {pilih ? (
                <Kartu className="flex flex-col gap-3">
                  <JurnalEntry supabase={supabase} ids={[pilih.id]} judul={`Jurnal ${pilih.nomor}`} />
                  {pilih.status === "tercatat" ? (
                    <form action={balikJurnal} className="flex flex-col gap-2 border-t border-abu-garis pt-3">
                      <b className="text-sm">Koreksi dengan jurnal balik</b>
                      <input type="hidden" name="jurnal" value={pilih.id} /><input type="hidden" name="asal" value={`/keuangan/jurnal-umum?t=${t}&j=${pilih.id}`} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className={label}>Tanggal<input type="date" name="tanggal" defaultValue={hariIniWIB()} className={input} /></label>
                        <label className={label}>Alasan<input name="alasan" required maxLength={200} className={input} /></label>
                      </div>
                      <div><button className={tombolGaris}>Buat jurnal balik</button></div>
                      <p className="text-xs text-abu">Jurnal tercatat tidak bisa diedit atau dihapus. Jurnal balik membatalkan efeknya; lalu catat ulang transaksi yang benar.</p>
                    </form>
                  ) : null}
                </Kartu>
              ) : (
                <Kartu><p className="text-sm text-abu">Pilih nomor jurnal untuk melihat debit-kredit dan membuat koreksi.</p></Kartu>
              )}
            </div>
          </>
        );
      }}
    </Bingkai>
  );
}
