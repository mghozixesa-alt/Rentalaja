import Link from "next/link";
import { Bingkai, Baris, Ringkas, Tab, Tabel, type SPKeu } from "../Bingkai";
import { daftarkanAset, jalankanPenyusutan, lepasAset } from "../actions";
import { Chip, Kartu, input, label, tombol, tombolBahaya } from "@/components/ui";
import { hariIniWIB, rupiah } from "@/lib/format";
import { dataMaster } from "@/lib/keuangan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aset Tetap · Keuangan" };

type Aset = { id: string; nomor: string; nama: string; kelompok: string; cabang_id: string | null; tanggal_perolehan: string; harga_perolehan: number;
  umur_bulan: number; akumulasi: number; nilai_buku: number; status: string };
const KELOMPOK: Record<string, [string, number]> = { kendaraan_motor: ["Kendaraan (motor)", 36], kendaraan_mobil: ["Kendaraan (mobil, Jeep)", 96], elektronik: ["Elektronik dan kamera", 36], peralatan: ["Peralatan camping dan perabot", 24] };

export default function AsetTetap({ searchParams }: { searchParams: SPKeu }) {
  const s = searchParams.s === "dilepas" ? "dilepas" : "aktif";
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/aset-tetap" judul="Aset Tetap"
      sub="Setiap unit sewa milik Rentalaja adalah aset tetap. Penyusutan garis lurus dijalankan sekali per bulan; unit milik mitra tidak masuk di sini."
      kanan={<Link href="/keuangan/aset-tetap?f=baru" className={tombol}>+ Daftarkan aset</Link>}>
      {async ({ supabase }) => {
        const m = await dataMaster(supabase);
        const [{ data }, { data: units }] = await Promise.all([
          supabase.from("aset_tetap_nilai").select("id, nomor, nama, kelompok, cabang_id, tanggal_perolehan, harga_perolehan, umur_bulan, akumulasi, nilai_buku, status").order("nomor"),
          supabase.from("unit").select("id, nama, plat_atau_seri").order("nama").limit(500),
        ]);
        const semua = (data ?? []) as Aset[];
        const rows = semua.filter((a) => a.status === s);
        const aktif = semua.filter((a) => a.status === "aktif");
        const pilih = semua.find((a) => a.id === searchParams.id && a.status === "aktif");
        const cab = (id: string | null) => m.cabang.find((c) => c.id === id)?.nama ?? "—";
        const kolom = "80px minmax(0,1.6fr) minmax(0,1fr) 110px 100px 130px 130px 130px";
        const bulan = hariIniWIB().slice(0, 7);
        return (
          <>
            {searchParams.f === "baru" ? (
              <Kartu className="border-2 border-navy">
                <form action={daftarkanAset} className="grid gap-3 md:grid-cols-4">
                  <label className={`${label} md:col-span-2`}>Nama aset<input name="nama" required maxLength={120} className={input} placeholder="Honda Beat CBS #41" /></label>
                  <label className={label}>Kelompok<select name="kelompok" className={input}>{Object.entries(KELOMPOK).map(([k, [l, u]]) => <option key={k} value={k}>{l} · {u / 12} th</option>)}</select></label>
                  <label className={label}>Umur (bulan)<input type="number" name="umur_bulan" defaultValue={36} min={1} max={360} className={input} /></label>
                  <label className={label}>Tanggal perolehan<input type="date" name="tanggal" defaultValue={hariIniWIB()} className={input} /></label>
                  <label className={label}>Harga perolehan<input name="harga" inputMode="numeric" required className={input} /></label>
                  <label className={label}>Nilai sisa<input name="nilai_sisa" inputMode="numeric" defaultValue={0} className={input} /></label>
                  <label className={label}>Akumulasi sebelum sistem<input name="akumulasi_awal" inputMode="numeric" defaultValue={0} className={input} /></label>
                  <label className={label}>Cabang<select name="cabang" className={input}>{m.cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>
                  <label className={`${label} md:col-span-2`}>Unit sewa (opsional)<select name="unit" className={input}><option value="">—</option>{((units ?? []) as { id: string; nama: string; plat_atau_seri: string | null }[]).map((u) => <option key={u.id} value={u.id}>{u.nama} {u.plat_atau_seri ?? ""}</option>)}</select></label>
                  <div className="flex items-end"><button className={tombol}>Daftarkan</button></div>
                  <p className="text-xs text-abu md:col-span-4">Mendaftarkan aset tidak membuat jurnal: pembelian sudah dicatat lewat menu Pembelian (akun 1-107xx), dan aset lama lewat saldo awal.</p>
                </form>
              </Kartu>
            ) : null}
            <Ringkas item={[
              ["Harga perolehan", rupiah(aktif.reduce((a, x) => a + x.harga_perolehan, 0)), `${aktif.length} aset aktif`],
              ["Akumulasi penyusutan", rupiah(aktif.reduce((a, x) => a + x.akumulasi, 0))],
              ["Nilai buku", rupiah(aktif.reduce((a, x) => a + x.nilai_buku, 0))],
              ["Penyusutan per bulan", rupiah(aktif.reduce((a, x) => a + (x.nilai_buku > 0 ? Math.round(x.harga_perolehan / x.umur_bulan) : 0), 0)), "perkiraan"],
            ]} />
            <Kartu className="flex flex-wrap items-end gap-3">
              <form action={jalankanPenyusutan} className="flex flex-wrap items-end gap-2">
                <label className={label}>Bulan<input type="month" name="bulan" defaultValue={bulan} className={input} /></label>
                <button className={tombol}>Jalankan penyusutan</button>
              </form>
              <p className="max-w-md text-xs text-abu">Satu jurnal per bulan: debit 5-50001 Penyusutan unit sewa, kredit akumulasi per kelompok, dengan tag cabang tiap aset. Tidak bisa dijalankan dua kali.</p>
            </Kartu>
            <div className="grid items-start gap-4 xl:grid-cols-[3fr_1fr]">
              <Kartu className="flex flex-col gap-3">
                <Tab aktif={`/keuangan/aset-tetap?s=${s}`} item={[["/keuangan/aset-tetap?s=aktif", `Aktif ${aktif.length}`], ["/keuangan/aset-tetap?s=dilepas", `Dilepas ${semua.length - aktif.length}`]]} />
                <Tabel kolom={kolom} kepala={["Nomor", "Aset", "Kelompok", "Tag", "Perolehan", "Harga", "Akum.", "Nilai buku"]} kanan={[5, 6, 7]}>
                  {rows.length === 0 ? <p className="py-4 text-sm text-abu">Belum ada aset.</p> : null}
                  {rows.map((a) => (
                    <Baris key={a.id} kolom={kolom} aktif={pilih?.id === a.id}>
                      <span className="text-abu">{a.nomor}</span>
                      <Link href={`/keuangan/aset-tetap?s=${s}&id=${a.id}`} className="font-bold">{a.nama}</Link>
                      <span className="text-sm">{KELOMPOK[a.kelompok]?.[0]}</span>
                      <span className="text-xs">{cab(a.cabang_id)}</span>
                      <span className="text-abu">{a.tanggal_perolehan.slice(0, 7)}</span>
                      <span className="text-right">{rupiah(a.harga_perolehan)}</span>
                      <span className="text-right">{rupiah(a.akumulasi)}</span>
                      <b className="text-right">{rupiah(a.nilai_buku)}</b>
                    </Baris>
                  ))}
                </Tabel>
              </Kartu>
              {pilih ? (
                <Kartu className="flex flex-col gap-2">
                  <b>{pilih.nomor} · {pilih.nama}</b>
                  <div className="text-sm">Nilai buku <b>{rupiah(pilih.nilai_buku)}</b> <Chip nada="baik">Aktif</Chip></div>
                  <form action={lepasAset} className="flex flex-col gap-2 border-t border-abu-garis pt-2">
                    <b className="text-sm">Lepas aset (dijual, hilang, rusak total)</b>
                    <input type="hidden" name="aset" value={pilih.id} />
                    <label className={label}>Tanggal<input type="date" name="tanggal" defaultValue={hariIniWIB()} className={input} /></label>
                    <label className={label}>Harga jual (0 bila hilang/rusak)<input name="harga_jual" inputMode="numeric" defaultValue={0} className={input} /></label>
                    <label className={label}>Uang masuk ke<select name="akun_kas" className={input}>{m.kasBank.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}</select></label>
                    <button className={tombolBahaya}>Lepas aset</button>
                  </form>
                </Kartu>
              ) : null}
            </div>
          </>
        );
      }}
    </Bingkai>
  );
}
