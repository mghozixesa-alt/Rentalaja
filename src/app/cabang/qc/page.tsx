import { simpanQC } from "../actions";
import { Bingkai, type SPCabang } from "../Bingkai";
import { Kartu, Kosong, input, tombol, tombolBahaya } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quality control" };

type U = { id: string; nama: string; plat_atau_seri: string | null; produk: { kategori_id: string; nama: string } | null };

export default function QC({ searchParams }: { searchParams: SPCabang }) {
  return (
    <Bingkai sp={searchParams} aktif="/cabang/qc" judul="Quality control" sub="Unit baru kembali atau selesai servis. Lolos semua poin = Ready; gagal = otomatis dibuatkan work order.">
      {async ({ cabang, supabase, q }) => {
        const { data } = await supabase.from("unit").select("id, nama, plat_atau_seri, produk:produk_id(kategori_id, nama)").eq("cabang_id", cabang.id).eq("status", "qc").order("diubah_pada");
        const units = (data ?? []) as unknown as U[];
        if (units.length === 0) return <Kosong judul="Antrean QC kosong" isi="Unit yang kembali dari sewa atau servis muncul di sini." />;
        const kat = Array.from(new Set(units.map((u) => u.produk?.kategori_id).filter(Boolean))) as string[];
        const { data: cek } = await supabase.from("daftar_cek_qc").select("kategori_id, urutan, poin, wajib_foto").in("kategori_id", kat).eq("aktif", true).order("urutan");
        return units.map((u) => {
          const poin = (cek ?? []).filter((c) => c.kategori_id === u.produk?.kategori_id).map((c) => ({ poin: c.poin as string }));
          const daftar = poin.length ? poin : [{ poin: "Kondisi fisik baik dan lengkap" }];
          return (
            <Kartu key={u.id}>
              <form action={simpanQC} className="flex flex-col gap-3">
                <input type="hidden" name="unit" value={u.id} /><input type="hidden" name="q" value={q} />
                <input type="hidden" name="poin" value={JSON.stringify(daftar)} />
                <div><b>{u.nama}</b> <span className="text-sm text-abu">· {u.produk?.nama} · {u.plat_atau_seri}</span></div>
                <fieldset className="grid gap-1 sm:grid-cols-2">
                  <legend className="sr-only">Poin cek</legend>
                  {daftar.map((p, i) => (
                    <label key={i} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" name={`cek${i}`} className="h-5 w-5 accent-navy" /> {p.poin}</label>
                  ))}
                </fieldset>
                <input name="catatan" placeholder="Catatan (wajib bila gagal), misalnya: rem belakang bunyi" aria-label="Catatan QC" className={input} />
                <div className="flex gap-2">
                  <button name="keputusan" value="gagal" className={tombolBahaya}>Gagal, kirim ke servis</button>
                  <button name="keputusan" value="lolos" className={tombol}>Lolos, unit Ready</button>
                </div>
              </form>
            </Kartu>
          );
        });
      }}
    </Bingkai>
  );
}
