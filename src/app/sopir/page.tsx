import Image from "next/image";
import { berangkat, jawabTrip, selesaiTrip } from "./actions";
import { Chip, Kartu, Pesan, input, tombol, tombolBahaya } from "@/components/ui";
import { wajibPeran } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sopir Jeep" };

type T = { id: string; kode: string; status: string; mulai: string; total: number; jumlah_tamu: number | null; titik_jemput: string | null; batas_konfirmasi_sopir: string | null;
  pelanggan: { nama: string; nomor_wa: string } | null; booking_item: { produk: { nama: string } | null }[]; pembayaran: { jumlah: number; status: string }[] };

export default async function Sopir({ searchParams }: { searchParams: { galat?: string; ok?: string } }) {
  const staf = await wajibPeran("sopir");
  const supabase = createClient();
  const sel = "id, kode, status, mulai, total, jumlah_tamu, titik_jemput, batas_konfirmasi_sopir, pelanggan:pelanggan_id(nama, nomor_wa), booking_item(produk:produk_id(nama)), pembayaran(jumlah, status)";
  const [baru, saya] = await Promise.all([
    supabase.from("booking").select(sel).eq("konfirmasi_sopir", "menunggu").or(`sopir_id.is.null,sopir_id.eq.${staf.id}`).order("mulai"),
    supabase.from("booking").select(sel).eq("sopir_id", staf.id).eq("konfirmasi_sopir", "diterima").in("status", ["dikonfirmasi", "dipakai"]).order("mulai"),
  ]);
  const r = (x: unknown) => (x ?? []) as T[];
  const sisa = (t: T) => Number(t.total) - t.pembayaran.filter((p) => p.status === "lunas").reduce((a, p) => a + Number(p.jumlah), 0);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 bg-white p-4">
      <header className="flex items-center justify-between border-b border-abu-garis pb-3">
        <div className="flex items-center gap-2"><Image src="/logo.png" alt="Rentalaja" width={110} height={26} className="h-6 w-auto" /><Chip nada="info">Sopir</Chip></div>
        <form action="/auth/keluar" method="post"><button className="text-xs font-bold underline">{staf.nama} · keluar</button></form>
      </header>
      {searchParams.galat ? <Pesan nada="buruk">{searchParams.galat}</Pesan> : null}
      {searchParams.ok ? <Pesan nada="baik">Tersimpan. Pelanggan dan CS sudah dikabari otomatis.</Pesan> : null}

      <h2 className="text-lg font-extrabold">Trip baru, perlu dikonfirmasi</h2>
      {r(baru.data).length === 0 ? <p className="text-sm text-abu">Tidak ada trip baru.</p> : null}
      {r(baru.data).map((t) => (
        <Kartu key={t.id} className="flex flex-col gap-3 border-2 border-[#D9782C]">
          <div className="flex justify-between gap-2"><b>{tanggalJam(t.mulai)}</b><Chip nada="waspada">DP lunas</Chip></div>
          <p className="text-sm leading-5 text-abu">{t.booking_item[0]?.produk?.nama} · {t.kode} · {t.pelanggan?.nama} · {t.jumlah_tamu ?? "-"} orang<br />Jemput {t.titik_jemput ?? "-"} · sisa {rupiah(sisa(t))} dibayar ke Anda</p>
          <form action={jawabTrip} className="grid grid-cols-2 gap-2">
            <input type="hidden" name="booking" value={t.id} />
            <button name="jawab" value="tolak" className={tombolBahaya}>Tidak bisa</button>
            <button name="jawab" value="terima" className={tombol}>Terima trip</button>
          </form>
          {t.batas_konfirmasi_sopir ? <p className="text-xs text-abu">Jawab sebelum {tanggalJam(t.batas_konfirmasi_sopir)}. Bila tidak dijawab, CS Experience dikabari.</p> : null}
        </Kartu>
      ))}

      <h2 className="text-lg font-extrabold">Trip saya</h2>
      {r(saya.data).length === 0 ? <p className="text-sm text-abu">Belum ada trip terjadwal.</p> : null}
      {r(saya.data).map((t) => (
        <Kartu key={t.id} className="flex flex-col gap-3">
          <div className="flex justify-between gap-2"><b>{tanggalJam(t.mulai)}</b><Chip nada={t.status === "dipakai" ? "teal" : "info"}>{t.status === "dipakai" ? "Dalam perjalanan" : "Siap jemput"}</Chip></div>
          <p className="text-sm text-abu">{t.kode} · {t.pelanggan?.nama} · {t.jumlah_tamu ?? "-"} orang · jemput {t.titik_jemput ?? "-"}</p>
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://wa.me/${(t.pelanggan?.nomor_wa ?? "").replace(/\D/g, "").replace(/^0/, "62")}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-navy text-sm font-bold no-underline">WhatsApp</a>
            <a href={`tel:${t.pelanggan?.nomor_wa ?? ""}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-navy text-sm font-bold no-underline">Telepon</a>
          </div>
          {t.status === "dikonfirmasi" ? (
            <form action={berangkat} className="flex flex-col gap-2">
              <input type="hidden" name="booking" value={t.id} />
              <input name="km" inputMode="numeric" placeholder="KM saat berangkat" aria-label="KM" className={input} />
              <button className={tombol}>Tamu sudah naik, berangkat</button>
            </form>
          ) : (
            <form action={selesaiTrip} className="flex flex-col gap-2">
              <input type="hidden" name="booking" value={t.id} /><input type="hidden" name="sisa" value={sisa(t)} />
              <div className="flex justify-between rounded-xl bg-abu-latar px-3 py-2 text-sm"><span>Sisa bayar</span><b>{rupiah(sisa(t))}</b></div>
              {sisa(t) > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center gap-2 rounded-xl border border-abu-input p-3"><input type="radio" name="cara" value="tunai" defaultChecked className="accent-navy" /> Tunai</label>
                  <label className="flex items-center gap-2 rounded-xl border border-abu-input p-3"><input type="radio" name="cara" value="qris" className="accent-navy" /> QRIS sudah masuk</label>
                </div>
              ) : null}
              <input name="km" inputMode="numeric" placeholder="KM saat selesai" aria-label="KM" className={input} />
              <button className={tombol}>Trip selesai</button>
            </form>
          )}
        </Kartu>
      ))}
    </main>
  );
}
