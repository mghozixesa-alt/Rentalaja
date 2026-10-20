import Link from "next/link";
import { ProdukKartu } from "@/components/ProdukKartu";
import { Pesan, input, tombol } from "@/components/ui";
import { ambilKatalog } from "@/lib/katalog";

export const revalidate = 300;

const LINI = [
  { href: "/katalog?lini=transportation", judul: "Transportation", isi: "Motor, mobil, dan Jeep" },
  { href: "/katalog?lini=hub", judul: "Hub", isi: "iPhone, kamera, PlayStation, proyektor, camping, piknik" },
  { href: "/experience", judul: "Experience", isi: "Menginap di Ruma Metua dan Ertap Village, trip Jeep dengan sopir" },
];

export default async function Beranda({ searchParams }: { searchParams: { akses?: string } }) {
  let laris: Awaited<ReturnType<typeof ambilKatalog>> = [];
  try {
    laris = (await ambilKatalog({ jenis: "sewa", batas: 8 })).filter((p) => p.harga_mulai);
  } catch {
    laris = [];
  }
  return (
    <>
      {searchParams.akses === "ditolak" ? <Pesan nada="buruk">Akun Anda tidak punya akses ke halaman itu.</Pesan> : null}
      <section className="grid gap-6 rounded-kartu bg-navy p-6 text-white md:grid-cols-2 md:p-10">
        <div className="flex flex-col gap-4">
          <h1 className="text-[32px] font-extrabold leading-10 md:text-[44px] md:leading-[52px]">
            Nggak semua harus dibeli. <span className="text-teal">Sewa saat butuh.</span>
          </h1>
          <p className="text-base leading-6 text-[#DDE3EE]">Motor, iPhone, kamera, PlayStation, sampai perlengkapan piknik. Cek ketersediaan dan booking langsung, tanpa menunggu balasan admin.</p>
        </div>
        <form action="/katalog" className="flex flex-col gap-3 rounded-kartu bg-white p-4 text-navy">
          <label className="flex flex-col gap-1.5 text-[13px] font-bold text-abu">
            Mau sewa apa?
            <input name="q" placeholder="Contoh: motor matic, iPhone 13, Sony A6000" className={input} />
          </label>
          <button className={tombol}>Cek yang tersedia</button>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Pilih lini">
        {LINI.map((l) => (
          <Link key={l.href} href={l.href} className="flex flex-col gap-1 rounded-kartu border border-abu-garis bg-white p-4 no-underline hover:border-navy">
            <b className="text-lg">{l.judul}</b>
            <span className="text-sm text-abu">{l.isi}</span>
          </Link>
        ))}
      </section>

      {laris.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-extrabold">Paling sering disewa</h2>
            <Link href="/katalog" className="text-sm font-bold">Lihat semua</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {laris.map((p) => (
              <ProdukKartu key={p.id} p={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 rounded-kartu border border-abu-garis bg-white p-5 md:grid-cols-3">
        {[
          ["Pilih", "barang dan tanggalnya. Harga total langsung terlihat."],
          ["Booking", "unggah KTP dan KK sekali. Lolos verifikasi, bayar DP lewat QRIS atau VA."],
          ["Pakai", "ambil di cabang atau diantar. Kembalikan tepat waktu, deposit kembali."],
        ].map(([a, b], i) => (
          <div key={a} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-extrabold text-white">{i + 1}</span>
            <p className="text-sm leading-5"><b>{a}</b> {b}</p>
          </div>
        ))}
      </section>
    </>
  );
}
