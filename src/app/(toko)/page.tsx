import Image from "next/image";
import Link from "next/link";
import { Ilustrasi, type Tema } from "@/components/Ilustrasi";
import { ProdukKartu } from "@/components/ProdukKartu";
import { Pesan, input, tombol } from "@/components/ui";
import { ambilKatalog } from "@/lib/katalog";
import { createClient } from "@/lib/supabase/server";
import { hariIniWIB, tambahHari } from "@/lib/format";

const LINI = [
  { href: "/katalog?lini=transportation", judul: "Transportation", isi: "Motor, mobil, Jeep", warna: "bg-status-infoBg" },
  { href: "/katalog?lini=hub", judul: "Hub", isi: "iPhone, kamera, camping", warna: "bg-teal-muda" },
  { href: "/experience", judul: "Experience", isi: "Menginap, trip Jeep", warna: "bg-status-waspadaBg" },
];

type Banner = { id: string; judul: string; isi: { tipe?: string; urutan?: number; keterangan?: string; tombol?: string; tujuan?: string; gambar?: string | null } };
const TEMA: Record<string, Tema> = { promo: "motor", experience: "inap", pengumuman: "jeep", hub: "camp" };
const LABEL: Record<string, string> = { promo: "Promo", experience: "Experience", pengumuman: "Info", hub: "Hub" };

async function ambilBanner(): Promise<Banner[]> {
  const sekarang = new Date().toISOString();
  const { data } = await createClient()
    .from("konten_web")
    .select("id, judul, isi")
    .eq("jenis", "banner")
    .eq("status", "terbit")
    .or(`tampil_dari.is.null,tampil_dari.lte.${sekarang}`)
    .or(`tampil_sampai.is.null,tampil_sampai.gte.${sekarang}`)
    .limit(3);
  return ((data ?? []) as Banner[]).sort((a, b) => (a.isi.urutan ?? 9) - (b.isi.urutan ?? 9));
}

export default async function Beranda({ searchParams }: { searchParams: { akses?: string } }) {
  const [laris, banner] = await Promise.all([
    ambilKatalog({ jenis: "sewa", batas: 8 }).then((r) => r.filter((p) => p.harga_mulai)).catch(() => []),
    ambilBanner().catch(() => []),
  ]);
  const besok = tambahHari(hariIniWIB(), 1);
  return (
    <>
      {searchParams.akses === "ditolak" ? <Pesan nada="buruk">Akun Anda tidak punya akses ke halaman itu.</Pesan> : null}

      {/* Opsi B: judul dan pencarian dulu, promo sebagai kartu geser */}
      <section className="grid items-end gap-5 md:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] font-extrabold leading-9 md:text-[44px] md:leading-[52px]">
            Nggak semua harus dibeli.<br /><span className="text-teal-tua">Sewa saat butuh.</span>
          </h1>
          <p className="text-[15px] leading-6 text-abu">Motor, iPhone, kamera, camping, sampai penginapan. Cek dan booking langsung.</p>
        </div>
        <form action="/katalog" className="flex flex-col gap-3 rounded-kartu border border-abu-garis bg-white p-4 shadow-[0_6px_20px_rgba(31,43,77,0.08)]">
          <input name="q" aria-label="Mau sewa apa" placeholder="Motor matic, iPhone 13, tenda…" className={input} />
          <input type="hidden" name="mulai" value={besok} />
          <button className={tombol}>Cek yang tersedia</button>
        </form>
      </section>

      {banner.length > 0 ? (
        <section aria-label="Promo minggu ini" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">Promo minggu ini</h2>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {banner.map((b) => (
              <Link key={b.id} href={b.isi.tujuan ?? "/katalog"} className="relative h-[150px] w-[290px] shrink-0 snap-start overflow-hidden rounded-kartu text-white no-underline md:w-auto">
                {b.isi.gambar ? <Image src={b.isi.gambar} alt="" fill sizes="(max-width: 768px) 290px, 33vw" className="object-cover" /> : <Ilustrasi tema={TEMA[b.isi.tipe ?? "promo"] ?? "motor"} id={b.id} />}
                <div className="absolute inset-0 bg-gradient-to-r from-navy/85 to-navy/15" />
                <div className="absolute left-3.5 right-24 top-3.5 flex flex-col gap-1.5">
                  <span className="self-start rounded-md bg-white/20 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider">{LABEL[b.isi.tipe ?? "promo"] ?? "Promo"}</span>
                  <b className="text-base leading-5">{b.judul}</b>
                  {b.isi.tombol ? <span className="text-xs font-extrabold text-teal">{b.isi.tombol} →</span> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-2 md:gap-3" aria-label="Pilih lini">
        {LINI.map((l) => (
          <Link key={l.href} href={l.href} className="flex flex-col gap-1.5 rounded-2xl border border-abu-garis bg-white p-3 no-underline hover:border-navy md:p-4">
            <span className={`h-9 w-9 rounded-[10px] ${l.warna}`} aria-hidden="true" />
            <b className="text-[13px] md:text-base">{l.judul}</b>
            <span className="text-[11px] leading-4 text-abu md:text-sm">{l.isi}</span>
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
            {laris.map((p) => <ProdukKartu key={p.id} p={p} />)}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 rounded-kartu border border-abu-garis bg-white p-5 md:grid-cols-3">
        {[
          ["Pilih", "barang dan tanggalnya. Harga total langsung terlihat."],
          ["Booking", "unggah KTP dan satu dokumen pendukung sekali. Lolos verifikasi, bayar DP lewat QRIS atau VA."],
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
