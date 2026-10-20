import { Judul, Kartu } from "@/components/ui";

export const metadata = { title: "Syarat dan ketentuan" };

const POKOK = [
  ["Sewa barang dan kendaraan", "Wajib KTP dan satu dokumen pendukung (SIM, KK, STNK, atau NPWP); camping dan piknik cukup KTP. DP 20% setelah lolos verifikasi, dibayar dalam 20 menit. KTP asli dititipkan di cabang selama sewa."],
  ["Keterlambatan", "Denda 15% tarif harian per jam, dibulatkan ke atas, maksimal satu hari tarif per unit."],
  ["Pembatalan sewa barang", "Gratis sampai 3 jam sebelum jam ambil; DP dikembalikan penuh. Kurang dari itu atau tidak datang: DP tidak dikembalikan."],
  ["Menginap", "Check-in 14.00, check-out 12.00. Tidak ada pembatalan setelah bayar. Tanggal bisa diubah sekali, paling lambat H-3, dengan jumlah malam yang sama."],
  ["Trip Jeep", "DP 50%, sisa dibayar ke sopir. Jadwal dikonfirmasi sopir paling lambat 2 jam setelah DP. Tidak ada pembatalan; trip yang tidak aman karena cuaca dijadwal ulang tanpa biaya."],
  ["Data pribadi", "Diolah sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, hanya untuk verifikasi, transaksi, dan keamanan unit."],
];

export default function Syarat() {
  return (
    <>
      <Judul sub="Ringkasan. Naskah lengkap sedang ditinjau konsultan hukum.">Syarat dan ketentuan</Judul>
      <div className="grid gap-3 md:grid-cols-2">
        {POKOK.map(([a, b]) => (
          <Kartu key={a}><b>{a}</b><p className="mt-1 text-sm leading-5 text-abu">{b}</p></Kartu>
        ))}
      </div>
    </>
  );
}
