import Link from "next/link";
import { notFound } from "next/navigation";
import { bayar } from "../../actions";
import { Chip, Judul, Kartu, Pesan, tombol } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { STATUS_BOOKING, rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status booking" };

const URUT_SEWA = ["menunggu_verifikasi", "menunggu_bayar", "dikonfirmasi", "dipakai", "selesai"];
const URUT_EXP = ["menunggu_bayar", "dikonfirmasi", "dipakai", "selesai"];

export default async function BookingPage({ params, searchParams }: { params: { kode: string }; searchParams: { galat?: string } }) {
  const supabase = createClient();
  const { data: b } = await supabase
    .from("booking")
    .select("id, kode, lini, status, mulai, selesai, subtotal, diskon_bundling, diskon_promo, ongkir, total, dp_wajib, batas_bayar, konfirmasi_sopir, jumlah_tamu, titik_jemput, cabang:cabang_id(nama, alamat), booking_item(id, harga_satuan, jumlah_hari, diskon, total, produk:produk_id(nama))")
    .eq("kode", params.kode)
    .maybeSingle();
  if (!b) notFound();
  const { data: bayarList } = await supabase.from("pembayaran").select("jenis, metode, jumlah, status, dibayar_pada").eq("booking_id", b.id).order("dibuat_pada");
  const st = STATUS_BOOKING[b.status] ?? STATUS_BOOKING.draf;
  const urut = b.lini === "experience" ? URUT_EXP : URUT_SEWA;
  const pos = urut.indexOf(b.status);
  const cabang = b.cabang as unknown as { nama: string; alamat: string | null } | null;
  const items = (b.booking_item ?? []) as unknown as { id: string; harga_satuan: number; jumlah_hari: number; diskon: number; total: number; produk: { nama: string } | null }[];
  const lunas = (bayarList ?? []).filter((p) => p.status === "lunas").reduce((a, p) => a + Number(p.jumlah), 0);
  return (
    <>
      <Judul sub={`${cabang?.nama ?? ""} · ${tanggalJam(b.mulai)} sampai ${tanggalJam(b.selesai)}`}>Booking {b.kode}</Judul>
      {searchParams.galat ? <Pesan nada="buruk">{searchParams.galat}</Pesan> : null}
      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <Kartu className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><b>Status</b><Chip nada={st.nada}>{st.label}</Chip></div>
            <p className="text-sm leading-5">{st.langkah}</p>
            {b.status === "menunggu_bayar" && b.batas_bayar ? <p className="text-sm font-bold text-status-waspada">Bayar sebelum {tanggalJam(b.batas_bayar)} supaya unit tidak dilepas.</p> : null}
            {b.konfirmasi_sopir === "menunggu" ? <Pesan nada="waspada">Sopir sedang mengonfirmasi jadwal, paling lambat 2 jam. Kabar dikirim lewat WhatsApp.</Pesan> : null}
            {b.konfirmasi_sopir === "diterima" ? <Pesan nada="baik">Jadwal Jeep sudah dikonfirmasi sopir.</Pesan> : null}
            {pos >= 0 ? (
              <ol className="flex flex-col gap-2 border-t border-abu-garis pt-3">
                {urut.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${i <= pos ? "bg-navy text-white" : "border border-abu-input text-abu"}`}>{i + 1}</span>
                    <span className={i === pos ? "font-extrabold" : i < pos ? "" : "text-abu"}>{STATUS_BOOKING[s].label}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </Kartu>
          <Kartu className="flex flex-col gap-2">
            <b>Rincian</b>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm"><span>{i.produk?.nama} · {Number(i.jumlah_hari)} {b.lini === "experience" ? "malam/trip" : "hari"} × {rupiah(i.harga_satuan)}</span><span>{rupiah(i.total)}</span></div>
            ))}
            {Number(b.diskon_bundling) > 0 ? <div className="flex justify-between text-sm text-status-baik"><span>Diskon bundling</span><span>−{rupiah(b.diskon_bundling)}</span></div> : null}
            {Number(b.ongkir) > 0 ? <div className="flex justify-between text-sm"><span>Ongkir</span><span>{rupiah(b.ongkir)}</span></div> : null}
            <div className="flex justify-between border-t border-abu-garis pt-2 font-extrabold"><span>Total</span><span>{rupiah(b.total)}</span></div>
            <div className="flex justify-between text-sm"><span>DP</span><span>{rupiah(b.dp_wajib)}</span></div>
            <div className="flex justify-between text-sm"><span>Sudah dibayar</span><span>{rupiah(lunas)}</span></div>
          </Kartu>
        </div>
        <Kartu className="flex h-fit flex-col gap-3">
          {b.status === "menunggu_bayar" ? (
            <form action={bayar} className="flex flex-col gap-3">
              <input type="hidden" name="kode" value={b.kode} />
              <div className="flex justify-between text-lg"><span>Bayar sekarang</span><b>{rupiah(Number(b.dp_wajib) > 0 ? b.dp_wajib : b.total)}</b></div>
              <button className={tombol}>Bayar dengan QRIS, VA, atau e-wallet</button>
              <p className="text-xs text-abu">Pembayaran diproses Xendit. Status berubah otomatis setelah bayar.</p>
            </form>
          ) : (
            <p className="text-sm text-abu">Ada pertanyaan tentang booking ini? Kirim kode <b className="text-navy">{b.kode}</b> ke CS.</p>
          )}
          <a href={`https://wa.me/6281324700077?text=${encodeURIComponent(`Halo Rentalaja, saya mau tanya booking ${b.kode}`)}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-navy text-sm font-bold no-underline">Chat CS di WhatsApp</a>
          <Link href="/akun" className="text-center text-sm font-bold">Semua booking saya</Link>
        </Kartu>
      </div>
    </>
  );
}
