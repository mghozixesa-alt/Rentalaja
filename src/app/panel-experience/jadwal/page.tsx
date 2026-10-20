import { jadwalUlang } from "../actions";
import { BingkaiExp } from "../Bingkai";
import { Chip, Kartu, input, tombolGaris } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { STATUS_BOOKING, rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jadwal Experience" };

type B = { id: string; kode: string; status: string; mulai: string; selesai: string; total: number; konfirmasi_sopir: string | null; jumlah_ubah_tanggal: number; cabang: { kode: string; nama: string } | null; pelanggan: { nama: string } | null };

export default async function Jadwal({ searchParams }: { searchParams: { galat?: string; ok?: string } }) {
  const supabase = createClient();
  const sampai = new Date(Date.now() + 30 * 86400000).toISOString();
  const { data } = await supabase.from("booking").select("id, kode, status, mulai, selesai, total, konfirmasi_sopir, jumlah_ubah_tanggal, cabang:cabang_id(kode, nama), pelanggan:pelanggan_id(nama)")
    .eq("lini", "experience").in("status", ["menunggu_bayar", "dikonfirmasi"]).lte("mulai", sampai).order("mulai");
  const rows = (data ?? []) as unknown as B[];
  return (
    <BingkaiExp aktif="/panel-experience/jadwal" judul="Jadwal 30 hari" sub="Tidak ada pembatalan. CS bisa menjadwal ulang kapan saja (misalnya cuaca); trip Jeep yang dijadwal ulang dikonfirmasi ulang oleh sopir." sp={searchParams}>
      {rows.length === 0 ? <Kartu><p className="text-sm text-abu">Belum ada booking.</p></Kartu> : null}
      {rows.map((b) => {
        const durasi = Math.round((new Date(b.selesai).getTime() - new Date(b.mulai).getTime()) / 60000);
        const tgl = new Date(b.mulai).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
        const jam = new Date(b.mulai).toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
        return (
          <Kartu key={b.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><b>{b.cabang?.nama}</b><Chip nada={STATUS_BOOKING[b.status]?.nada}>{STATUS_BOOKING[b.status]?.label}</Chip>
                {b.konfirmasi_sopir ? <Chip nada={b.konfirmasi_sopir === "diterima" ? "baik" : b.konfirmasi_sopir === "ditolak" ? "buruk" : "waspada"}>Sopir: {b.konfirmasi_sopir}</Chip> : null}</div>
              <div className="text-sm">{b.pelanggan?.nama} · {tanggalJam(b.mulai)} → {tanggalJam(b.selesai)} · {rupiah(b.total)}</div>
              <div className="text-xs text-abu">{b.kode}{b.jumlah_ubah_tanggal > 0 ? " · pelanggan sudah memakai jatah ubah tanggal" : ""}</div>
            </div>
            {b.status === "dikonfirmasi" ? (
              <form action={jadwalUlang} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="durasi" value={durasi} />
                <input type="date" name="tanggal" defaultValue={tgl} aria-label="Tanggal baru" className={`${input} h-11 w-40`} />
                <input type="time" name="jam" defaultValue={jam} aria-label="Jam baru" className={`${input} h-11 w-28`} />
                <button className={tombolGaris}>Jadwal ulang</button>
              </form>
            ) : null}
          </Kartu>
        );
      })}
    </BingkaiExp>
  );
}
