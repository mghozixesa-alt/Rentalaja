import { checkIn, checkOut, kamarSiap } from "./actions";
import { BingkaiExp } from "./Bingkai";
import { Chip, Kartu, tombol, tombolGaris } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { hariIniWIB, rupiah, tambahHari, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel Experience" };

type B = { id: string; kode: string; status: string; mulai: string; selesai: string; total: number; jumlah_tamu: number | null; titik_jemput: string | null; konfirmasi_sopir: string | null;
  cabang: { kode: string; nama: string } | null; pelanggan: { nama: string; nomor_wa: string } | null; sopir: { nama: string } | null };

export default async function HariIniExp({ searchParams }: { searchParams: { galat?: string; ok?: string } }) {
  const supabase = createClient();
  const awal = `${hariIniWIB()}T00:00:00+07:00`;
  const besok = `${tambahHari(hariIniWIB(), 1)}T00:00:00+07:00`;
  const sel = "id, kode, status, mulai, selesai, total, jumlah_tamu, titik_jemput, konfirmasi_sopir, cabang:cabang_id(kode, nama), pelanggan:pelanggan_id(nama, nomor_wa), sopir:sopir_id(nama)";
  const [masuk, menginap, kamar] = await Promise.all([
    supabase.from("booking").select(sel).eq("lini", "experience").eq("status", "dikonfirmasi").gte("mulai", awal).lt("mulai", besok).order("mulai"),
    supabase.from("booking").select(sel).eq("lini", "experience").eq("status", "dipakai").order("selesai"),
    supabase.from("unit").select("id, nama, status").eq("status", "perlu_dibersihkan"),
  ]);
  const rows = (x: unknown) => (x ?? []) as B[];
  const trip = (b: B) => b.cabang?.kode === "JEEP";
  return (
    <BingkaiExp aktif="/panel-experience" judul="Hari ini" sub="Check-in 14.00, check-out 12.00. Trip Jeep hanya bisa berangkat setelah dikonfirmasi sopir." sp={searchParams}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Kartu className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">Datang hari ini</h2>
          {rows(masuk.data).length === 0 ? <p className="text-sm text-abu">Tidak ada.</p> : null}
          {rows(masuk.data).map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-abu-garis py-2 text-sm">
              <div><b>{b.cabang?.nama}</b> · {b.pelanggan?.nama} · {b.jumlah_tamu ?? "-"} orang<div className="text-xs text-abu">{b.kode} · {tanggalJam(b.mulai)}{trip(b) ? ` · jemput ${b.titik_jemput ?? "-"} · sopir ${b.sopir?.nama ?? "belum"}` : ""}</div></div>
              {trip(b) && b.konfirmasi_sopir !== "diterima" ? <Chip nada="waspada">Menunggu sopir</Chip> : trip(b) ? <Chip nada="baik">Sopir siap</Chip> : (
                <form action={checkIn}><input type="hidden" name="booking" value={b.id} /><button className={tombol}>Check-in</button></form>
              )}
            </div>
          ))}
        </Kartu>
        <Kartu className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">Sedang menginap atau dalam trip</h2>
          {rows(menginap.data).length === 0 ? <p className="text-sm text-abu">Tidak ada.</p> : null}
          {rows(menginap.data).map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-abu-garis py-2 text-sm">
              <div><b>{b.cabang?.nama}</b> · {b.pelanggan?.nama}<div className="text-xs text-abu">{b.kode} · selesai {tanggalJam(b.selesai)} · {rupiah(b.total)}</div></div>
              {trip(b) ? <Chip nada="info">Dalam perjalanan</Chip> : <form action={checkOut}><input type="hidden" name="booking" value={b.id} /><button className={tombolGaris}>Check-out</button></form>}
            </div>
          ))}
        </Kartu>
      </div>
      <Kartu className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold">Perlu dibersihkan</h2>
        {(kamar.data ?? []).length === 0 ? <p className="text-sm text-abu">Semua siap.</p> : null}
        {(kamar.data ?? []).map((u) => (
          <div key={u.id} className="flex items-center justify-between border-t border-abu-garis py-2 text-sm">
            <b>{u.nama}</b>
            <form action={kamarSiap}><input type="hidden" name="unit" value={u.id} /><button className={tombol}>Tandai siap</button></form>
          </div>
        ))}
        <p className="text-xs text-abu">Malam berikutnya otomatis terbuka untuk dipesan setelah ditandai siap.</p>
      </Kartu>
    </BingkaiExp>
  );
}
