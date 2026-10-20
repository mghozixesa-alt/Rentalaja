import { redirect } from "next/navigation";
import { checkout } from "../actions";
import { UnggahDokumen } from "@/components/UnggahDokumen";
import { Judul, Kartu, Pesan, input, label, tombol } from "@/components/ui";
import { pelangganSaya } from "@/lib/auth";
import { ambilCabang, ambilKatalog } from "@/lib/katalog";
import { bacaKeranjang } from "@/lib/keranjang";
import { createClient } from "@/lib/supabase/server";
import { tanggalJam, wib } from "@/lib/format";

export const metadata = { title: "Checkout" };

export default async function Checkout({ searchParams }: { searchParams: { galat?: string } }) {
  const k = bacaKeranjang();
  if (!k) redirect("/keranjang");
  const pl = await pelangganSaya();
  if (!pl) redirect("/masuk?lanjut=/checkout");
  const supabase = createClient();
  const [semua, cabang, dok, kat] = await Promise.all([
    ambilKatalog(),
    ambilCabang(),
    supabase.from("dokumen").select("jenis, status, diunggah_pada").order("diunggah_pada", { ascending: false }),
    supabase.from("kategori").select("slug, wajib_sim_c"),
  ]);
  const isi = k.items.map((i) => semua.find((s) => s.slug === i.produk)).filter((p): p is NonNullable<typeof p> => !!p);
  const lini = new Set(isi.map((p) => p.lini));
  const butuhSim = isi.some((p) => (kat.data ?? []).find((x) => x.slug === p.kategori_slug)?.wajib_sim_c);
  const statusDok = (j: string) => (dok.data ?? []).find((d) => d.jenis === j)?.status ?? null;
  const wajib: ("ktp" | "kk" | "sim_c")[] = butuhSim ? ["ktp", "kk", "sim_c"] : ["ktp", "kk"];
  const lengkap = pl.terverifikasi || wajib.every((j) => statusDok(j) === "lolos" || statusDok(j) === "menunggu");
  const pilihan = cabang.filter((c) => Array.from(lini).every((l) => c.lini.includes(l)));
  return (
    <>
      <Judul sub={`${tanggalJam(wib(k.mulai, k.jamMulai))} sampai ${tanggalJam(wib(k.selesai, k.jamSelesai))}`}>Checkout</Judul>
      {searchParams.galat ? <Pesan nada="buruk">{searchParams.galat}</Pesan> : null}
      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <Kartu className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold">1. Dokumen</h2>
            {pl.terverifikasi ? (
              <Pesan nada="baik">Dokumen Anda sudah terverifikasi. Tidak perlu unggah lagi.</Pesan>
            ) : (
              <>
                <p className="text-sm text-abu">Diperiksa CS sekali, lalu tersimpan aman untuk sewa berikutnya. KTP asli dititipkan di cabang saat pengambilan.</p>
                {wajib.map((j) => (
                  <UnggahDokumen key={j} jenis={j} pelangganId={pl.id} status={statusDok(j)} />
                ))}
              </>
            )}
          </Kartu>
          <Kartu>
            <form id="checkout" action={checkout} className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold">2. Ambil di mana</h2>
              {pilihan.length === 0 ? <Pesan nada="waspada">Barang di keranjang tidak tersedia di satu cabang yang sama. Pisahkan jadi dua booking.</Pesan> : null}
              <label className={label}>
                Cabang
                <select name="cabang" required className={input}>
                  {pilihan.map((c) => (
                    <option key={c.id} value={c.id}>{c.nama}{c.alamat ? ` · ${c.alamat}` : ""}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="antar" value="ya" className="h-5 w-5 accent-navy" /> Antar ke alamat saya (ongkir sesuai zona)</label>
              <label className={label}>Alamat antar<textarea name="alamat" rows={2} className={`${input} h-auto py-2`} placeholder="Diisi bila memilih antar" /></label>
            </form>
          </Kartu>
        </div>
        <Kartu className="flex h-fit flex-col gap-3">
          <h2 className="text-lg font-extrabold">3. Kirim booking</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {k.items.map((i) => (
              <li key={i.produk} className="flex justify-between"><span>{isi.find((p) => p.slug === i.produk)?.nama ?? i.produk}</span><b>× {i.jumlah}</b></li>
            ))}
          </ul>
          <p className="text-xs leading-4 text-abu">Unit langsung dipegang untuk Anda. Setelah CS menyetujui dokumen (biasanya kurang dari 15 menit), Anda punya 20 menit untuk membayar DP 20% lewat QRIS, VA, atau e-wallet. Harga final terlihat sebelum bayar.</p>
          <button form="checkout" className={tombol} disabled={!lengkap || pilihan.length === 0}>{lengkap ? "Kirim booking" : "Unggah dokumen dulu"}</button>
        </Kartu>
      </div>
    </>
  );
}
