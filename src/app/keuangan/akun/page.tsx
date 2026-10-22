import Link from "next/link";
import { Bingkai, Baris, Tab, Tabel, type SPKeu } from "../Bingkai";
import { arsipkanAkun, simpanAkun } from "../actions";
import { Chip, Kartu, input, label, tombol, tombolGaris } from "@/components/ui";
import { hariIniWIB, rupiah } from "@/lib/format";
import { KATEGORI_AKUN, KELOMPOK_AKUN, dataMaster } from "@/lib/keuangan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daftar Akun · Keuangan" };

export default function DaftarAkun({ searchParams }: { searchParams: SPKeu }) {
  const k = searchParams.k && KELOMPOK_AKUN[searchParams.k] ? searchParams.k : "semua";
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/akun" judul="Daftar Akun"
      sub="Kode akun format Jurnal (1-10001). Akun bertanda sistem dipakai jurnal otomatis: kode dan kategorinya dikunci."
      kanan={<><Link href="/keuangan/jurnal-umum?saldo_awal=1" className={tombolGaris}>Atur saldo awal</Link><Link href="/keuangan/akun?f=baru" className={tombol}>+ Buat akun baru</Link></>}>
      {async ({ supabase }) => {
        const m = await dataMaster(supabase);
        const { data } = await supabase.rpc("saldo_akun", { p_dari: null, p_sampai: hariIniWIB() });
        const saldo = new Map(((data ?? []) as { akun_id: string; saldo: number }[]).map((x) => [x.akun_id, x.saldo]));
        const rows = k === "semua" ? m.akun : m.akun.filter((a) => KELOMPOK_AKUN[k].kategori.includes(a.kategori));
        const kolom = "100px minmax(0,1.6fr) minmax(0,1fr) 150px 120px";
        return (
          <>
            {searchParams.f === "baru" ? (
              <Kartu className="border-2 border-navy">
                <form action={simpanAkun} className="grid gap-3 md:grid-cols-4">
                  <label className={label}>Kode<input name="kode" required pattern="[1-9]-[0-9]{5}" placeholder="6-60010" className={input} /></label>
                  <label className={label}>Nama akun<input name="nama" required maxLength={120} className={input} /></label>
                  <label className={label}>Kategori<select name="kategori" className={input}>{KATEGORI_AKUN.map((c) => <option key={c}>{c}</option>)}</select></label>
                  <label className={label}>Cabang (khusus kas fisik)<select name="cabang" className={input}><option value="">—</option>{m.cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>
                  <label className={`${label} md:col-span-3`}>Keterangan<input name="keterangan" maxLength={200} className={input} /></label>
                  <div className="flex items-end"><button className={tombol}>Simpan akun</button></div>
                </form>
              </Kartu>
            ) : null}
            <Kartu className="flex flex-col gap-3">
              <Tab aktif={`/keuangan/akun?k=${k}`} item={[["/keuangan/akun?k=semua", "Semua"], ...Object.entries(KELOMPOK_AKUN).map(([id, v]) => [`/keuangan/akun?k=${id}`, v.label] as [string, string])]} />
              <Tabel kolom={kolom} kepala={["Kode", "Nama akun", "Kategori", "Saldo", ""]} kanan={[3]}>
                {rows.map((a) => (
                  <Baris key={a.id} kolom={kolom}>
                    <span className="text-abu">{a.kode}</span>
                    <span className={a.aktif ? "font-bold" : "text-abu line-through"}>{a.nama} {a.sistem ? <Chip nada="teal">sistem</Chip> : null}</span>
                    <span className="text-sm">{a.kategori}</span>
                    <b className="text-right">{rupiah(saldo.get(a.id) ?? 0)}</b>
                    {a.sistem ? <span /> : (
                      <form action={arsipkanAkun}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="aktif" value={a.aktif ? "0" : "1"} />
                        <button className="text-sm font-bold underline">{a.aktif ? "Arsipkan" : "Aktifkan"}</button></form>
                    )}
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
