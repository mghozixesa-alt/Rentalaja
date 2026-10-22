import Link from "next/link";
import { Bingkai, Baris, Ringkas, Tab, Tabel, type SPKeu } from "./Bingkai";
import { simpanKas, simpanPengeluaran } from "./actions";
import { JurnalEntry } from "./JurnalEntry";
import { BarisTransaksi } from "@/components/BarisTransaksi";
import { Chip, Kartu, input, label, tombol, tombolGaris } from "@/components/ui";
import { hariIniWIB, rupiah } from "@/lib/format";
import { dataMaster, statusBayar, STATUS_DOK } from "@/lib/keuangan";

type Dok = { id: string; nomor: string; tanggal: string; jatuh_tempo: string | null; penerima: string | null; referensi: string | null; memo: string | null;
  cabang_id: string | null; bayar_dari: string | null; total: number; dibayar: number; status: string; jurnal_id: string | null; nota: string | null;
  pengeluaran_item: { deskripsi: string | null; jumlah: number; akun: { kode: string; nama: string } | null }[] };

const TEKS = {
  pembelian: { judul: "Pembelian", tombol: "+ Buat tagihan pembelian", sub: "Tagihan dari supplier: bengkel, toko part, dealer, pemilik tempat. Dicatat sebagai hutang usaha, lalu dibayar dari Kas & Bank. Pembelian unit sewa masuk akun aset tetap, lalu didaftarkan di Aset Tetap." },
  biaya: { judul: "Biaya", tombol: "+ Buat biaya", sub: "Pengeluaran yang tidak lewat sistem, seperti menu Biaya di Jurnal: bayar langsung dari kas/bank, atau bayar nanti (jadi hutang). Foto nota wajib di atas Rp100.000; tag cabang supaya masuk laba rugi cabang." },
};

/** Halaman Pembelian dan Biaya (satu tabel `pengeluaran`, dibedakan oleh jenis). */
export function HalamanPengeluaran({ jenis, sp }: { jenis: "pembelian" | "biaya"; sp: SPKeu }) {
  const base = `/keuangan/${jenis}`;
  const buka = sp.f === "baru";
  const filter = ["semua", "menunggu", "belum_dibayar", "jatuh_tempo", "lunas"].includes(sp.s ?? "") ? sp.s! : "semua";
  return (
    <Bingkai sp={sp} aktif={base} judul={TEKS[jenis].judul} sub={TEKS[jenis].sub}
      kanan={<Link href={buka ? base : `${base}?f=baru`} className={tombol}>{buka ? "Tutup formulir" : TEKS[jenis].tombol}</Link>}>
      {async ({ supabase }) => {
        const m = await dataMaster(supabase);
        const { data } = await supabase.from("pengeluaran")
          .select("id, nomor, tanggal, jatuh_tempo, penerima, referensi, memo, cabang_id, bayar_dari, total, dibayar, status, jurnal_id, nota, pengeluaran_item(deskripsi, jumlah, akun:akun_id(kode, nama))")
          .eq("jenis", jenis).order("tanggal", { ascending: false }).order("nomor", { ascending: false }).limit(300);
        const semua = ((data ?? []) as unknown as Dok[]).map((d) => ({ ...d, sb: statusBayar(d) }));
        const rows = filter === "semua" ? semua : semua.filter((d) => d.sb === filter || (filter === "belum_dibayar" && d.sb === "sebagian"));
        const pilih = semua.find((d) => d.id === sp.id) ?? null;
        const cab = (id: string | null) => m.cabang.find((c) => c.id === id)?.nama ?? "—";
        const opsiAkun = m.akunAktif.filter((a) => a.kategori !== "Kas & Bank").map((a) => ({ id: a.id, label: `${a.kode} ${a.nama}` }));
        const opsiCabang = m.cabang.map((c) => ({ id: c.id, label: c.nama }));
        const hutang = semua.filter((d) => d.status === "tercatat" && d.dibayar < d.total);
        const bulan = hariIniWIB().slice(0, 7);
        const kolom = "90px 130px minmax(0,1.3fr) minmax(0,1fr) 110px 170px 120px";
        let notaUrl: string | null = null;
        if (pilih?.nota) notaUrl = (await supabase.storage.from("nota").createSignedUrl(pilih.nota, 300)).data?.signedUrl ?? null;
        return (
          <>
            {buka ? (
              <Kartu className="flex flex-col gap-4 border-2 border-navy">
                <h2 className="text-lg font-extrabold">{jenis === "pembelian" ? "Buat tagihan pembelian" : "Buat biaya"}</h2>
                <form action={simpanPengeluaran} className="flex flex-col gap-4">
                  <input type="hidden" name="jenis" value={jenis} />
                  <div className="grid gap-3 md:grid-cols-4">
                    {jenis === "biaya" ? (
                      <label className={label}>Bayar dari<select name="bayar_dari" className={input}>{m.kasBank.map((a) => <option key={a.id} value={a.id}>{a.kode} {a.nama}</option>)}</select></label>
                    ) : (
                      <label className={label}>Jatuh tempo<input type="date" name="jatuh_tempo" className={input} /></label>
                    )}
                    <label className={label}>{jenis === "pembelian" ? "Supplier" : "Penerima (kontak)"}
                      <select name="kontak" className={input} required={jenis === "pembelian"}><option value="">—</option>{m.kontak.filter((k) => k.jenis !== "pelanggan").map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</select>
                    </label>
                    {jenis === "biaya" ? <label className={label}>Atau nama penerima<input name="penerima" className={input} maxLength={120} placeholder="SPBU Cimanuk" /></label> : <label className={label}>Referensi<input name="referensi" className={input} maxLength={60} placeholder="WO-1052 / PO" /></label>}
                    <label className={label}>Tanggal transaksi<input type="date" name="tanggal" defaultValue={hariIniWIB()} className={input} required /></label>
                    <label className={label}>Tag cabang<select name="cabang" className={input}><option value="">Kantor pusat / semua</option>{m.cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>
                    <label className={`${label} md:col-span-2`}>Memo<input name="memo" className={input} maxLength={200} /></label>
                    <label className={label}>Foto nota<input type="file" name="nota" accept="image/*,application/pdf" capture="environment" className="text-sm" /></label>
                  </div>
                  {jenis === "biaya" ? <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="bayar_nanti" className="h-5 w-5" /> Bayar nanti (masuk Hutang usaha, dibayar lewat Kas & Bank)</label> : null}
                  <BarisTransaksi akun={opsiAkun} cabang={opsiCabang} />
                  <p className="text-xs text-abu">Jurnal: debit akun per baris, kredit {jenis === "biaya" ? "akun kas/bank (atau Hutang usaha bila bayar nanti)" : "Hutang usaha"}. Di atas batas persetujuan menunggu owner sebelum tercatat.</p>
                  <div className="flex gap-2"><Link href={base} className={tombolGaris}>Batal</Link><button className={tombol}>Simpan</button></div>
                </form>
              </Kartu>
            ) : null}
            <Ringkas item={[
              [`${TEKS[jenis].judul} bulan ini`, rupiah(semua.filter((d) => d.status === "tercatat" && d.tanggal.startsWith(bulan)).reduce((a, d) => a + d.total, 0))],
              ["Belum dibayar", rupiah(hutang.reduce((a, d) => a + d.total - d.dibayar, 0)), `${hutang.length} dokumen`],
              ["Jatuh tempo", rupiah(semua.filter((d) => d.sb === "jatuh_tempo").reduce((a, d) => a + d.total - d.dibayar, 0)), `${semua.filter((d) => d.sb === "jatuh_tempo").length} dokumen`],
              ["Menunggu persetujuan", String(semua.filter((d) => d.status === "menunggu").length), "owner"],
            ]} />
            <div className="grid items-start gap-4 xl:grid-cols-[3fr_2fr]">
              <Kartu className="flex flex-col gap-3">
                <Tab aktif={`${base}?s=${filter}`} item={[["semua", "Semua"], ["menunggu", "Menunggu"], ["belum_dibayar", "Belum dibayar"], ["jatuh_tempo", "Jatuh tempo"], ["lunas", "Lunas"]].map(([s, l]) => [`${base}?s=${s}`, l] as [string, string])} />
                <Tabel kolom={kolom} kepala={["Tanggal", "Nomor", jenis === "pembelian" ? "Supplier" : "Penerima", "Akun", "Tag", "Status", "Total"]} kanan={[6]}>
                  {rows.length === 0 ? <p className="py-4 text-sm text-abu">Belum ada data.</p> : null}
                  {rows.map((d) => (
                    <Baris key={d.id} kolom={kolom} aktif={pilih?.id === d.id}>
                      <span className="text-abu">{d.tanggal}</span>
                      <Link href={`${base}?s=${filter}&id=${d.id}`} className="font-bold">{d.nomor}</Link>
                      <span>{d.penerima ?? "—"}</span>
                      <span className="truncate text-xs">{d.pengeluaran_item.map((i) => i.akun?.nama).filter((v, i, a) => a.indexOf(v) === i).join(", ")}</span>
                      <span className="text-xs">{cab(d.cabang_id)}</span>
                      <span><Chip nada={STATUS_DOK[d.sb]?.nada}>{STATUS_DOK[d.sb]?.label ?? d.sb}</Chip></span>
                      <b className="text-right">{rupiah(d.total)}</b>
                    </Baris>
                  ))}
                </Tabel>
              </Kartu>
              {pilih ? (
                <Kartu className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2"><b className="text-lg">{pilih.nomor}</b><Chip nada={STATUS_DOK[pilih.sb]?.nada}>{STATUS_DOK[pilih.sb]?.label}</Chip></div>
                  <div className="text-sm text-abu">{pilih.penerima ?? "—"} · {cab(pilih.cabang_id)}{pilih.referensi ? ` · ${pilih.referensi}` : ""}{pilih.jatuh_tempo ? ` · jatuh tempo ${pilih.jatuh_tempo}` : ""}</div>
                  {pilih.pengeluaran_item.map((i, k) => (
                    <div key={k} className="flex justify-between gap-3 text-sm"><span>{i.akun?.kode} {i.akun?.nama}{i.deskripsi ? <span className="text-abu"> · {i.deskripsi}</span> : null}</span><b>{rupiah(i.jumlah)}</b></div>
                  ))}
                  <div className="flex justify-between border-t border-abu-garis pt-2 text-sm"><span>Sudah dibayar</span><b>{rupiah(pilih.dibayar)}</b></div>
                  {notaUrl ? <a href={notaUrl} target="_blank" rel="noreferrer" className="text-sm font-bold">Lihat foto nota</a> : null}
                  <JurnalEntry supabase={supabase} ids={pilih.jurnal_id ? [pilih.jurnal_id] : []} />
                  {pilih.status === "tercatat" && pilih.dibayar < pilih.total ? (
                    <form action={simpanKas} className="flex flex-col gap-2 border-t border-abu-garis pt-3">
                      <b className="text-sm">Bayar tagihan</b>
                      <input type="hidden" name="jenis" value="kirim" /><input type="hidden" name="pengeluaran" value={pilih.id} />
                      <input type="hidden" name="asal" value={`${base}?id=${pilih.id}`} />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className={label}>Bayar dari<select name="akun_kas" className={input}>{m.kasBank.map((a) => <option key={a.id} value={a.id}>{a.nama}</option>)}</select></label>
                        <label className={label}>Tanggal<input type="date" name="tanggal" defaultValue={hariIniWIB()} className={input} /></label>
                        <label className={label}>Jumlah<input name="total" defaultValue={pilih.total - pilih.dibayar} inputMode="numeric" className={input} /></label>
                      </div>
                      <div><button className={tombol}>Bayar</button></div>
                      <p className="text-xs text-abu">Di atas batas persetujuan menunggu owner. Transfer tetap dilakukan dari aplikasi bank, lalu ditandai di sini.</p>
                    </form>
                  ) : null}
                </Kartu>
              ) : (
                <Kartu><p className="text-sm text-abu">Pilih nomor untuk melihat rincian, jurnal entry, dan membayar tagihan.</p></Kartu>
              )}
            </div>
          </>
        );
      }}
    </Bingkai>
  );
}
