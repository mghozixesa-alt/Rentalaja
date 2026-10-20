import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { pesanExperience } from "../../actions";
import { Kartu, Pesan, input, label, tombol } from "@/components/ui";
import { ambilCabang, ambilProduk } from "@/lib/katalog";
import { hariIniWIB, rupiah, tambahHari } from "@/lib/format";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await ambilProduk(params.slug);
  return { title: p?.nama ?? "Experience" };
}

export default async function ExperienceDetail({ params, searchParams }: { params: { slug: string }; searchParams: { galat?: string } }) {
  const p = await ambilProduk(params.slug);
  if (!p) notFound();
  if (p.lini !== "experience") redirect(`/produk/${p.slug}`);
  const cabang = (await ambilCabang()).filter((c) => c.lini.includes("experience"));
  const inap = p.jenis_layanan === "penginapan";
  const lokasi = inap ? cabang.filter((c) => c.kode !== "JEEP") : cabang.filter((c) => c.kode === "JEEP");
  return (
    <>
      {searchParams.galat ? <Pesan nada="buruk">{searchParams.galat}</Pesan> : null}
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-kartu bg-[#F1F3F5]">
            {p.foto?.[0] ? <Image src={p.foto[0]} alt={p.nama} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority /> : <div className="flex h-full items-center justify-center text-sm font-bold text-[#6B7385]">Foto menyusul</div>}
          </div>
          <h1 className="text-[28px] font-extrabold leading-9">{p.nama}</h1>
          <p className="text-lg"><b>{rupiah(p.harga_mulai)}</b> <span className="text-abu">/ {p.satuan}</span>{inap ? <span className="text-sm text-abu"> · akhir pekan lebih tinggi</span> : null}</p>
          {p.deskripsi ? <p className="text-sm leading-5 text-abu">{p.deskripsi}</p> : null}
          {inap ? (
            <p className="text-sm">{p.kamar_tidur ? `${p.kamar_tidur} kamar tidur · ` : ""}maksimal {p.maks_tamu} tamu{p.fasilitas?.length ? ` · ${p.fasilitas.join(", ")}` : ""}</p>
          ) : (
            <p className="text-sm">Maksimal {p.maks_penumpang} orang per Jeep · sekitar {Math.round((p.durasi_menit ?? 240) / 60)} jam · jemput di penginapan atau {p.titik_kumpul}</p>
          )}
        </div>
        <Kartu className="h-fit">
          <form action={pesanExperience} className="flex flex-col gap-3">
            <input type="hidden" name="produk" value={p.slug} />
            {lokasi.length > 1 ? (
              <label className={label}>Lokasi<select name="cabang" className={input}>{lokasi.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>
            ) : (
              <input type="hidden" name="cabang" value={lokasi[0]?.id ?? ""} />
            )}
            <label className={label}>{inap ? "Check-in" : "Tanggal trip"}<input type="date" name="tanggal" required min={hariIniWIB()} defaultValue={tambahHari(hariIniWIB(), 7)} className={input} /></label>
            {inap ? (
              <label className={label}>Jumlah malam<input type="number" name="malam" min={1} max={14} defaultValue={2} className={input} /></label>
            ) : (
              <label className={label}>Jam berangkat<select name="slot" className={input}>{(p.slot_jam ?? ["09:00"]).map((s) => <option key={s} value={s.slice(0, 5)}>{s.slice(0, 5)}</option>)}</select></label>
            )}
            <label className={label}>{inap ? "Jumlah tamu" : "Jumlah orang"}<input type="number" name="tamu" min={1} max={(inap ? p.maks_tamu : p.maks_penumpang) ?? 10} defaultValue={2} className={input} /></label>
            {!inap ? <label className={label}>Jemput di<input name="jemput" placeholder="Contoh: Ertap Village" className={input} /></label> : null}
            <button className={tombol}>Pesan dan bayar</button>
            <p className="text-xs leading-4 text-abu">{inap ? "DP 50%, sisa ditagih H-1." : "DP 50%, sisa dibayar ke sopir. Jadwal dikonfirmasi sopir paling lambat 2 jam setelah DP."} Tidak ada pembatalan setelah bayar; tanggal bisa diubah sekali paling lambat H-3.</p>
          </form>
        </Kartu>
      </div>
    </>
  );
}
