import Link from "next/link";
import { Bingkai, Baris, Tab, Tabel, type SPKeu } from "../Bingkai";
import { simpanKontak } from "../actions";
import { Kartu, input, label, tombol } from "@/components/ui";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kontak · Keuangan" };

const JENIS: [string, string][] = [["pelanggan", "Pelanggan"], ["supplier", "Supplier"], ["karyawan", "Karyawan"], ["mitra", "Mitra"], ["lainnya", "Lainnya"]];
type K = { id: string; nama: string; perusahaan: string | null; telepon: string | null; termin_hari: number; catatan: string | null };

export default function Kontak({ searchParams }: { searchParams: SPKeu }) {
  const k = JENIS.some(([j]) => j === searchParams.k) ? searchParams.k! : "supplier";
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/kontak" judul="Kontak"
      sub="Semua pihak yang bertransaksi dengan Rentalaja, seperti menu Kontak di Jurnal. Profil lengkap pelanggan tetap di Manajemen › Pelanggan; di sini untuk korporat dan tagihan."
      kanan={<Link href={`/keuangan/kontak?k=${k}&f=baru`} className={tombol}>+ Buat kontak</Link>}>
      {async ({ supabase }) => {
        const [{ data }, { data: hut }] = await Promise.all([
          supabase.from("kontak").select("id, nama, perusahaan, telepon, termin_hari, catatan").eq("jenis", k).eq("aktif", true).order("nama"),
          supabase.from("pengeluaran").select("kontak_id, total, dibayar").eq("status", "tercatat"),
        ]);
        const rows = (data ?? []) as K[];
        const saldo = (id: string) => ((hut ?? []) as { kontak_id: string | null; total: number; dibayar: number }[]).filter((h) => h.kontak_id === id).reduce((a, h) => a + h.total - h.dibayar, 0);
        const kolom = "minmax(0,1.3fr) minmax(0,1fr) 150px 110px 160px";
        return (
          <>
            {searchParams.f === "baru" ? (
              <Kartu className="border-2 border-navy">
                <form action={simpanKontak} className="grid gap-3 md:grid-cols-3">
                  <label className={label}>Jenis<select name="jenis" defaultValue={k} className={input}>{JENIS.map(([j, l]) => <option key={j} value={j}>{l}</option>)}</select></label>
                  <label className={label}>Nama<input name="nama" required maxLength={120} className={input} /></label>
                  <label className={label}>Perusahaan<input name="perusahaan" maxLength={120} className={input} /></label>
                  <label className={label}>Telepon<input name="telepon" maxLength={30} className={input} /></label>
                  <label className={label}>Email<input type="email" name="email" maxLength={120} className={input} /></label>
                  <label className={label}>Termin bayar (hari)<input type="number" name="termin_hari" min={0} max={90} defaultValue={0} className={input} /></label>
                  <label className={`${label} md:col-span-2`}>Catatan<input name="catatan" maxLength={200} className={input} /></label>
                  <div className="flex items-end"><button className={tombol}>Simpan kontak</button></div>
                </form>
              </Kartu>
            ) : null}
            <Kartu className="flex flex-col gap-3">
              <Tab aktif={`/keuangan/kontak?k=${k}`} item={JENIS.map(([j, l]) => [`/keuangan/kontak?k=${j}`, l])} />
              <Tabel kolom={kolom} kepala={["Nama", "Perusahaan / catatan", "Telepon", "Termin", "Hutang ke kontak"]} kanan={[4]}>
                {rows.length === 0 ? <p className="py-4 text-sm text-abu">Belum ada kontak.</p> : null}
                {rows.map((r) => (
                  <Baris key={r.id} kolom={kolom}>
                    <b>{r.nama}</b><span className="text-abu">{r.perusahaan ?? r.catatan ?? "—"}</span><span>{r.telepon ?? "—"}</span>
                    <span>{r.termin_hari ? `${r.termin_hari} hari` : "Tunai"}</span><b className="text-right">{rupiah(saldo(r.id))}</b>
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
