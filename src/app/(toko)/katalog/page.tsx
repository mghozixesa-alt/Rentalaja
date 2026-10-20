import Link from "next/link";
import { ProdukKartu } from "@/components/ProdukKartu";
import { Judul, Kosong, input } from "@/components/ui";
import { ambilKatalog, ambilKategori } from "@/lib/katalog";

export const metadata = { title: "Katalog sewa" };

type SP = { lini?: string; kategori?: string; q?: string };

export default async function Katalog({ searchParams }: { searchParams: SP }) {
  const lini = searchParams.lini === "hub" || searchParams.lini === "transportation" ? searchParams.lini : undefined;
  const [produk, kategori] = await Promise.all([
    ambilKatalog({ lini, kategori: searchParams.kategori, q: searchParams.q?.slice(0, 60) }),
    ambilKategori(lini),
  ]);
  const sewa = produk.filter((p) => p.lini !== "experience");
  const judul = lini === "transportation" ? "Sewa motor dan mobil" : lini === "hub" ? "Sewa barang" : "Semua yang bisa disewa";
  return (
    <>
      <Judul sub="Harga per hari. Sewa 3 hari untuk elektronik dan camping cukup bayar 2 hari; sewa 2 barang atau lebih dapat diskon bundling.">{judul}</Judul>
      <form className="flex gap-2" action="/katalog">
        {lini ? <input type="hidden" name="lini" value={lini} /> : null}
        <input name="q" defaultValue={searchParams.q} placeholder="Cari motor, iPhone, kamera, tenda" aria-label="Cari" className={input} />
        <button className="h-12 rounded-xl bg-navy px-5 font-bold text-white">Cari</button>
      </form>
      <nav aria-label="Kategori" className="flex flex-wrap gap-2">
        <Link href={lini ? `/katalog?lini=${lini}` : "/katalog"} className={`rounded-full border px-3 py-1.5 text-sm font-bold no-underline ${!searchParams.kategori ? "border-navy bg-teal-muda" : "border-abu-input bg-white"}`}>
          Semua
        </Link>
        {kategori.filter((k) => k.lini !== "experience").map((k) => (
          <Link key={k.slug} href={`/katalog?${lini ? `lini=${lini}&` : ""}kategori=${k.slug}`} className={`rounded-full border px-3 py-1.5 text-sm font-bold no-underline ${searchParams.kategori === k.slug ? "border-navy bg-teal-muda" : "border-abu-input bg-white"}`}>
            {k.nama}
          </Link>
        ))}
      </nav>
      {sewa.length === 0 ? (
        <Kosong judul="Belum ada yang cocok" isi="Coba kata lain, atau tanya CS lewat WhatsApp. Unit baru ditambahkan setiap minggu." href="https://wa.me/6281324700077" aksi="Tanya CS" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {sewa.map((p) => (
            <ProdukKartu key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}
