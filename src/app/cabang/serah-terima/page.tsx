import { serahkan, terimaKembali, terimaTunai } from "../actions";
import { Bingkai, type SPCabang } from "../Bingkai";
import { Chip, Kartu, Kosong, input, tombol, tombolGaris } from "@/components/ui";
import { STATUS_BOOKING, rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Serah-terima dan kasir" };

type B = { id: string; kode: string; status: string; mulai: string; selesai: string; total: number; dp_wajib: number; lini: string; pelanggan: { nama: string } | null; booking_item: { produk: { nama: string } | null; unit: { nama: string } | null }[] };

export default function SerahTerima({ searchParams }: { searchParams: SPCabang }) {
  return (
    <Bingkai sp={searchParams} aktif="/cabang/serah-terima" judul="Serah-terima dan kasir" sub="Foto kondisi unit sebelum diserahkan. Unit yang kembali otomatis masuk antrean QC.">
      {async ({ cabang, supabase, q }) => {
        const { data } = await supabase.from("booking")
          .select("id, kode, status, mulai, selesai, total, dp_wajib, lini, pelanggan:pelanggan_id(nama), booking_item(produk:produk_id(nama), unit:unit_id(nama))")
          .eq("cabang_id", cabang.id).in("status", ["menunggu_bayar", "dikonfirmasi", "dipakai"]).order("mulai").limit(60);
        const rows = (data ?? []) as unknown as B[];
        if (rows.length === 0) return <Kosong judul="Tidak ada yang perlu diproses" isi="Booking yang sudah dibayar, sedang dipakai, atau menunggu DP tunai muncul di sini." />;
        return rows.map((b) => (
          <Kartu key={b.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><b>{b.kode}</b><Chip nada={STATUS_BOOKING[b.status]?.nada}>{STATUS_BOOKING[b.status]?.label}</Chip></div>
              <div className="text-sm">{b.booking_item.map((i) => `${i.produk?.nama}${i.unit ? ` (${i.unit.nama})` : ""}`).join(", ")}</div>
              <div className="text-xs text-abu">{b.pelanggan?.nama} · {tanggalJam(b.mulai)} → {tanggalJam(b.selesai)}</div>
            </div>
            {b.status === "menunggu_bayar" ? (
              <form action={terimaTunai} className="flex items-center gap-2">
                <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="q" value={q} />
                <input type="hidden" name="jumlah" value={Number(b.dp_wajib) > 0 ? b.dp_wajib : b.total} />
                <button className={tombolGaris}>Terima DP tunai {rupiah(Number(b.dp_wajib) > 0 ? b.dp_wajib : b.total)}</button>
              </form>
            ) : b.status === "dikonfirmasi" ? (
              <form action={serahkan} className="flex items-center gap-2">
                <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="q" value={q} />
                {b.lini === "transportation" ? <input name="km" inputMode="numeric" placeholder="KM" aria-label="KM saat diserahkan" className={`${input} h-11 w-28`} /> : null}
                <button className={tombol}>Serahkan</button>
              </form>
            ) : (
              <form action={terimaKembali} className="flex items-center gap-2">
                <input type="hidden" name="booking" value={b.id} /><input type="hidden" name="q" value={q} />
                {b.lini === "transportation" ? <input name="km" inputMode="numeric" placeholder="KM" aria-label="KM saat kembali" className={`${input} h-11 w-28`} /> : null}
                <button className={tombol}>Terima kembali</button>
              </form>
            )}
          </Kartu>
        ));
      }}
    </Bingkai>
  );
}
