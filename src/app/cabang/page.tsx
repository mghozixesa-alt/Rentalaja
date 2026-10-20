import Link from "next/link";
import { Bingkai, type SPCabang } from "./Bingkai";
import { Chip, Kartu } from "@/components/ui";
import { STATUS_BOOKING, hariIniWIB, tambahHari, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel cabang" };

type Baris = { id: string; kode: string; status: string; mulai: string; selesai: string; pelanggan: { nama: string } | null; booking_item: { produk: { nama: string } | null }[] };

export default function HariIni({ searchParams }: { searchParams: SPCabang }) {
  return (
    <Bingkai sp={searchParams} aktif="/cabang" judul="Hari ini" sub="Ambil dan kembali hari ini, urut jam. Yang telat paling atas.">
      {async ({ cabang, supabase, q }) => {
        const awal = `${hariIniWIB()}T00:00:00+07:00`;
        const akhir = `${tambahHari(hariIniWIB(), 1)}T00:00:00+07:00`;
        const sel = "id, kode, status, mulai, selesai, pelanggan:pelanggan_id(nama), booking_item(produk:produk_id(nama))";
        const [ambil, kembali, telat] = await Promise.all([
          supabase.from("booking").select(sel).eq("cabang_id", cabang.id).gte("mulai", awal).lt("mulai", akhir).in("status", ["menunggu_verifikasi", "menunggu_bayar", "dikonfirmasi"]).order("mulai"),
          supabase.from("booking").select(sel).eq("cabang_id", cabang.id).gte("selesai", awal).lt("selesai", akhir).eq("status", "dipakai").order("selesai"),
          supabase.from("booking").select(sel).eq("cabang_id", cabang.id).lt("selesai", new Date().toISOString()).eq("status", "dipakai").order("selesai"),
        ]);
        const kel = (rows: unknown) => (rows ?? []) as Baris[];
        const Daftar = ({ judul, rows, jam }: { judul: string; rows: Baris[]; jam: "mulai" | "selesai" }) => (
          <Kartu className="flex flex-col gap-1">
            <h2 className="pb-2 text-lg font-extrabold">{judul} <span className="text-abu">({rows.length})</span></h2>
            {rows.length === 0 ? <p className="text-sm text-abu">Tidak ada.</p> : null}
            {rows.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-abu-garis py-2.5 text-sm">
                <div className="flex items-center gap-3"><b className="w-24">{tanggalJam(b[jam]).split(" ").slice(-1)}</b><div><b>{b.booking_item.map((i) => i.produk?.nama).join(", ")}</b><div className="text-xs text-abu">{b.pelanggan?.nama} · {b.kode}</div></div></div>
                <div className="flex items-center gap-2"><Chip nada={STATUS_BOOKING[b.status]?.nada}>{STATUS_BOOKING[b.status]?.label}</Chip><Link href={`/cabang/${b.status === "menunggu_verifikasi" ? "verifikasi" : "serah-terima"}${q}`} className="text-sm font-bold">Proses</Link></div>
              </div>
            ))}
          </Kartu>
        );
        return (
          <>
            {kel(telat.data).length > 0 ? <Daftar judul="Telat kembali" rows={kel(telat.data)} jam="selesai" /> : null}
            <div className="grid gap-4 lg:grid-cols-2">
              <Daftar judul="Diambil hari ini" rows={kel(ambil.data)} jam="mulai" />
              <Daftar judul="Kembali hari ini" rows={kel(kembali.data)} jam="selesai" />
            </div>
          </>
        );
      }}
    </Bingkai>
  );
}
