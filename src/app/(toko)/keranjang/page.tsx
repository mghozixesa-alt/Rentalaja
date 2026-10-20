import Link from "next/link";
import { aturTanggalKeranjang, ubahJumlah } from "../actions";
import { Judul, Kartu, Kosong, input, label, tombol } from "@/components/ui";
import { ambilKatalog } from "@/lib/katalog";
import { bacaKeranjang } from "@/lib/keranjang";
import { rupiah, wib } from "@/lib/format";

export const metadata = { title: "Keranjang" };

export default async function KeranjangPage() {
  const k = bacaKeranjang();
  if (!k || k.items.length === 0) return <Kosong judul="Keranjang masih kosong" isi="Pilih barang dan tanggal sewanya dulu." href="/katalog" aksi="Lihat katalog" />;
  const semua = await ambilKatalog();
  const hari = Math.max(1, Math.ceil((new Date(wib(k.selesai, k.jamSelesai)).getTime() - new Date(wib(k.mulai, k.jamMulai)).getTime()) / 86400000));
  const baris = k.items.map((i) => ({ ...i, p: semua.find((s) => s.slug === i.produk) })).filter((b) => b.p);
  const kira = baris.reduce((a, b) => a + (b.p!.harga_mulai ?? 0) * hari * b.jumlah, 0);
  return (
    <>
      <Judul sub="Semua barang di keranjang disewa untuk tanggal yang sama dan jadi satu booking.">Keranjang</Judul>
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Kartu className="flex flex-col divide-y divide-abu-garis">
          {baris.map((b) => (
            <div key={b.produk} className="flex items-center justify-between gap-3 py-3">
              <div>
                <Link href={`/produk/${b.produk}`} className="font-bold">{b.p!.nama}</Link>
                <div className="text-sm text-abu">{rupiah(b.p!.harga_mulai)}/hari · {b.p!.kategori_nama}</div>
              </div>
              <form action={ubahJumlah} className="flex items-center gap-2">
                <input type="hidden" name="produk" value={b.produk} />
                <button name="jumlah" value={b.jumlah - 1} aria-label="Kurangi" className="h-9 w-9 rounded-lg border border-abu-input font-bold">−</button>
                <b className="w-6 text-center">{b.jumlah}</b>
                <button name="jumlah" value={b.jumlah + 1} aria-label="Tambah" className="h-9 w-9 rounded-lg border border-abu-input font-bold">+</button>
              </form>
            </div>
          ))}
        </Kartu>
        <div className="flex flex-col gap-4">
          <Kartu>
            <form action={aturTanggalKeranjang} className="grid grid-cols-2 gap-3">
              <label className={label}>Ambil<input type="date" name="mulai" defaultValue={k.mulai} className={input} /></label>
              <label className={label}>Jam<input type="time" name="jamMulai" defaultValue={k.jamMulai} className={input} /></label>
              <label className={label}>Kembali<input type="date" name="selesai" defaultValue={k.selesai} className={input} /></label>
              <label className={label}>Jam<input type="time" name="jamSelesai" defaultValue={k.jamSelesai} className={input} /></label>
              <button className="col-span-2 h-11 rounded-xl border border-navy text-sm font-bold">Ubah tanggal</button>
            </form>
          </Kartu>
          <Kartu className="flex flex-col gap-2">
            <div className="flex justify-between text-sm"><span>{hari} hari sebelum diskon</span><b>{rupiah(kira)}</b></div>
            <p className="text-xs leading-4 text-abu">Promo sewa 3 hari bayar 2 dan diskon bundling (2 barang 5%, 3 barang 10%, motor tidak ikut) dihitung otomatis di langkah berikutnya.</p>
            <Link href="/checkout" className={tombol}>Lanjut ke checkout</Link>
          </Kartu>
        </div>
      </div>
    </>
  );
}
