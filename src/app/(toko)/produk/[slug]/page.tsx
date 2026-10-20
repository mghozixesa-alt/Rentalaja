import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { tambahKeKeranjang } from "../../actions";
import { Chip, Kartu, Pesan, input, label, tombol } from "@/components/ui";
import { ambilCabang, ambilProduk } from "@/lib/katalog";
import { createClient } from "@/lib/supabase/server";
import { hariIniWIB, rupiah, tambahHari, wib } from "@/lib/format";

type SP = { mulai?: string; selesai?: string; jamMulai?: string; jamSelesai?: string; galat?: string };

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await ambilProduk(params.slug);
  return { title: p ? `Sewa ${p.nama}` : "Produk" };
}

export default async function Produk({ params, searchParams }: { params: { slug: string }; searchParams: SP }) {
  const p = await ambilProduk(params.slug);
  if (!p) notFound();
  if (p.lini === "experience") redirect(`/experience/${p.slug}`);
  const ok = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const okJam = (s?: string) => (s && /^\d{2}:\d{2}$/.test(s) ? s : "09:00");
  const mulai = ok(searchParams.mulai) ?? tambahHari(hariIniWIB(), 1);
  const selesai = ok(searchParams.selesai) ?? tambahHari(mulai, 1);
  const jamMulai = okJam(searchParams.jamMulai);
  const jamSelesai = okJam(searchParams.jamSelesai);
  const supabase = createClient();
  const cabang = (await ambilCabang()).filter((c) => c.lini.includes(p.lini));
  const tersedia = await Promise.all(
    cabang.map(async (c) => {
      const { data } = await supabase.rpc("cek_ketersediaan", { p_produk: p.id, p_cabang: c.id, p_mulai: wib(mulai, jamMulai), p_selesai: wib(selesai, jamSelesai) });
      return { c, n: Number(data ?? 0) };
    }),
  );
  const total = tersedia.reduce((a, t) => a + t.n, 0);
  const hari = Math.max(1, Math.ceil((new Date(wib(selesai, jamSelesai)).getTime() - new Date(wib(mulai, jamMulai)).getTime()) / 86400000));
  return (
    <>
      <nav aria-label="Jejak" className="text-sm text-abu">
        <Link href={`/katalog?lini=${p.lini}`}>{p.lini === "transportation" ? "Transportation" : "Hub"}</Link> › <Link href={`/katalog?kategori=${p.kategori_slug}`}>{p.kategori_nama}</Link>
      </nav>
      {searchParams.galat ? <Pesan nada="buruk">{searchParams.galat}</Pesan> : null}
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-kartu bg-[#F1F3F5]">
          {p.foto?.[0] ? <Image src={p.foto[0]} alt={p.nama} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority /> : <div className="flex h-full items-center justify-center text-sm font-bold text-[#6B7385]">Foto menyusul</div>}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-extrabold uppercase tracking-wide text-teal-tua">{p.kategori_nama}</span>
            <h1 className="text-[28px] font-extrabold leading-9">{p.nama}</h1>
            <p className="text-lg"><b>{rupiah(p.harga_mulai)}</b> <span className="text-abu">/ hari</span></p>
            {p.deskripsi ? <p className="text-sm leading-5 text-abu">{p.deskripsi}</p> : null}
            {p.kelengkapan ? <p className="text-sm"><b>Kelengkapan:</b> {p.kelengkapan}</p> : null}
          </div>
          <Kartu className="flex flex-col gap-3">
            <form className="grid grid-cols-2 gap-3" action={`/produk/${p.slug}`}>
              <label className={label}>Ambil<input type="date" name="mulai" defaultValue={mulai} min={hariIniWIB()} className={input} /></label>
              <label className={label}>Jam<input type="time" name="jamMulai" defaultValue={jamMulai} className={input} /></label>
              <label className={label}>Kembali<input type="date" name="selesai" defaultValue={selesai} min={mulai} className={input} /></label>
              <label className={label}>Jam<input type="time" name="jamSelesai" defaultValue={jamSelesai} className={input} /></label>
              <button className="col-span-2 h-11 rounded-xl border border-navy text-sm font-bold">Cek ketersediaan</button>
            </form>
            <div className="flex flex-col gap-1 text-sm">
              {tersedia.map(({ c, n }) => (
                <div key={c.id} className="flex justify-between">
                  <span>{c.nama}</span>
                  {n > 0 ? <Chip nada="baik">{n} tersedia</Chip> : <Chip nada="buruk">Habis</Chip>}
                </div>
              ))}
            </div>
            <form action={tambahKeKeranjang} className="flex flex-col gap-3 border-t border-abu-garis pt-3">
              <input type="hidden" name="produk" value={p.slug} />
              <input type="hidden" name="mulai" value={mulai} />
              <input type="hidden" name="jamMulai" value={jamMulai} />
              <input type="hidden" name="selesai" value={selesai} />
              <input type="hidden" name="jamSelesai" value={jamSelesai} />
              <label className={label}>Jumlah<input type="number" name="jumlah" min={1} max={Math.max(1, total)} defaultValue={1} className={input} /></label>
              <div className="flex justify-between text-sm"><span>Perkiraan {hari} hari</span><b>{rupiah((p.harga_mulai ?? 0) * hari)}</b></div>
              <button className={tombol} disabled={total === 0}>{total === 0 ? "Habis di tanggal ini" : "Tambah ke keranjang"}</button>
              <p className="text-xs leading-4 text-abu">Harga akhir, diskon bundling, dan DP 20% dihitung saat checkout. Wajib KTP dan KK{p.lini === "transportation" ? ", serta SIM C untuk motor" : ""}.</p>
            </form>
          </Kartu>
        </div>
      </div>
    </>
  );
}
