import { Bingkai, JENIS_UANG, type SPKeu } from "../Bingkai";
import { kunciBulan } from "../actions";
import { Chip, Kartu, input, label, tombol } from "@/components/ui";
import { hariIniWIB, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutup buku · Keuangan" };

export default function TutupBuku({ searchParams }: { searchParams: SPKeu }) {
  const d = new Date(hariIniWIB() + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() - 1);
  const lalu = d.toISOString().slice(0, 7);
  return (
    <Bingkai sp={searchParams} aktif="/keuangan/tutup-buku" judul="Tutup buku"
      sub="Setelah dikunci, tidak ada jurnal baru bertanggal di bulan itu. Pembayaran yang telat masuk otomatis dicatat di bulan terbuka berikutnya.">
      {async ({ supabase }) => {
        const akhir = new Date(Date.UTC(Number(lalu.slice(0, 4)), Number(lalu.slice(5, 7)), 0)).toISOString().slice(0, 10);
        const [{ data: kunci }, setuju, mutasi, py, draf] = await Promise.all([
          supabase.from("tutup_buku").select("bulan, dikunci_pada, pengguna:dikunci_oleh(nama)").not("dikunci_pada", "is", null).order("bulan", { ascending: false }).limit(12),
          supabase.from("persetujuan").select("id", { count: "exact", head: true }).eq("status", "menunggu").in("jenis", JENIS_UANG),
          supabase.from("mutasi_bank").select("id", { count: "exact", head: true }).is("jurnal_baris_id", null).lte("tanggal", akhir),
          supabase.from("jurnal").select("id", { count: "exact", head: true }).eq("sumber", "penyusutan").eq("status", "tercatat").eq("tanggal", akhir),
          supabase.from("pengeluaran").select("id", { count: "exact", head: true }).eq("status", "menunggu").lte("tanggal", akhir),
        ]);
        const cek: [boolean, string][] = [
          [(setuju.count ?? 0) === 0, `Tidak ada persetujuan yang menunggu (${setuju.count ?? 0})`],
          [(draf.count ?? 0) === 0, `Pembelian/biaya bulan itu sudah diputuskan (${draf.count ?? 0} menunggu)`],
          [(mutasi.count ?? 0) === 0, `Semua mutasi bank sudah dicocokkan (${mutasi.count ?? 0} belum)`],
          [(py.count ?? 0) > 0, "Penyusutan bulan itu sudah dijalankan"],
        ];
        return (
          <>
            <Kartu className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold">Daftar cek {lalu}</h2>
              {cek.map(([ok, t]) => <div key={t} className="flex items-center gap-2 text-sm"><Chip nada={ok ? "baik" : "waspada"}>{ok ? "Beres" : "Belum"}</Chip>{t}</div>)}
              <form action={kunciBulan} className="flex flex-wrap items-end gap-2 border-t border-abu-garis pt-3">
                <label className={label}>Bulan yang dikunci<input type="month" name="bulan" defaultValue={lalu} className={input} /></label>
                <button className={tombol}>Kunci buku</button>
              </form>
              <p className="text-xs text-abu">Mengunci tetap boleh walau daftar cek belum beres, tapi sebaiknya diselesaikan dulu. Kunci tidak bisa dibuka dari panel; hubungi owner bila perlu koreksi besar.</p>
            </Kartu>
            <Kartu className="flex flex-col gap-1">
              <h2 className="text-lg font-extrabold">Bulan yang sudah ditutup</h2>
              {((kunci ?? []) as unknown as { bulan: string; dikunci_pada: string; pengguna: { nama: string } | null }[]).map((k) => (
                <div key={k.bulan} className="flex justify-between border-b border-abu-garis py-2 text-sm"><b>{k.bulan.slice(0, 7)}</b><span className="text-abu">{k.pengguna?.nama} · {tanggalJam(k.dikunci_pada)}</span></div>
              ))}
            </Kartu>
          </>
        );
      }}
    </Bingkai>
  );
}
