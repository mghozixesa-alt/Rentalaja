import Link from "next/link";
import { redirect } from "next/navigation";
import { Chip, Judul, Kartu, Kosong } from "@/components/ui";
import { pelangganSaya } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STATUS_BOOKING, rupiah, tanggalJam } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akun" };

const LINI: Record<string, string> = { hub: "Hub", transportation: "Transportation", experience: "Experience" };
const BERJALAN = ["menunggu_verifikasi", "menunggu_bayar", "dikonfirmasi", "dipakai"];

export default async function Akun() {
  const pl = await pelangganSaya();
  if (!pl) redirect("/masuk?lanjut=/akun");
  const supabase = createClient();
  const { data } = await supabase.from("booking").select("kode, lini, status, mulai, total, booking_item(produk:produk_id(nama))").order("mulai", { ascending: false }).limit(50);
  const semua = (data ?? []) as unknown as { kode: string; lini: string; status: string; mulai: string; total: number; booking_item: { produk: { nama: string } | null }[] }[];
  const nama = (b: (typeof semua)[number]) => Array.from(new Set(b.booking_item.map((i) => i.produk?.nama).filter(Boolean))).join(", ");
  const jalan = semua.filter((b) => BERJALAN.includes(b.status));
  const riwayat = semua.filter((b) => !BERJALAN.includes(b.status) && b.status !== "draf");
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Judul sub={`${pl.nomor_wa} · member ${pl.level}`}>{pl.nama}</Judul>
        <form action="/auth/keluar" method="post"><button className="text-sm font-bold underline">Keluar</button></form>
      </div>
      <Kartu className="flex items-center justify-between bg-navy text-white">
        <span className="font-bold text-teal">Poin</span>
        <b className="text-2xl">{pl.saldo_poin}</b>
      </Kartu>
      <h2 className="text-lg font-extrabold">Sedang berjalan</h2>
      {jalan.length === 0 ? <Kosong judul="Belum ada booking berjalan" isi="Sewa barang, motor, menginap, atau trip Jeep muncul di sini." href="/" aksi="Mulai sewa" /> : null}
      <div className="flex flex-col gap-2">
        {jalan.map((b) => (
          <Link key={b.kode} href={`/booking/${b.kode}`} className="flex items-center justify-between gap-3 rounded-kartu border border-abu-garis bg-white p-4 no-underline hover:border-navy">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-teal-tua">{LINI[b.lini]}</div>
              <b>{nama(b)}</b>
              <div className="text-sm text-abu">{tanggalJam(b.mulai)} · {b.kode}</div>
            </div>
            <Chip nada={STATUS_BOOKING[b.status]?.nada ?? "abu"}>{STATUS_BOOKING[b.status]?.label ?? b.status}</Chip>
          </Link>
        ))}
      </div>
      <h2 className="text-lg font-extrabold">Riwayat semua booking</h2>
      <Kartu className="flex flex-col divide-y divide-abu-garis py-1">
        {riwayat.length === 0 ? <p className="py-3 text-sm text-abu">Belum ada riwayat.</p> : null}
        {riwayat.map((b) => (
          <Link key={b.kode} href={`/booking/${b.kode}`} className="flex items-center justify-between gap-3 py-3 no-underline">
            <div><b className="text-sm">{nama(b)}</b><div className="text-xs text-abu">{LINI[b.lini]} · {tanggalJam(b.mulai)}</div></div>
            <span className="text-sm">{rupiah(b.total)}</span>
          </Link>
        ))}
      </Kartu>
    </>
  );
}
