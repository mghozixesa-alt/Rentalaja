/** Format angka dan waktu untuk tampilan. Uang selalu rupiah bulat; waktu ditampilkan WIB. */
export function rupiah(n: number | null | undefined): string {
  return "Rp" + Math.round(Number(n ?? 0)).toLocaleString("id-ID");
}

const ZONA = "Asia/Jakarta";

export function tanggalJam(iso: string | Date): string {
  return new Date(iso).toLocaleString("id-ID", { timeZone: ZONA, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function tanggal(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("id-ID", { timeZone: ZONA, weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Gabungkan tanggal (YYYY-MM-DD) dan jam (HH:MM) WIB menjadi ISO string dengan zona +07:00. */
export function wib(tgl: string, jam: string): string {
  return `${tgl}T${jam.length === 5 ? jam : jam.slice(0, 5)}:00+07:00`;
}

export function hariIniWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: ZONA });
}

export function tambahHari(tgl: string, n: number): string {
  const d = new Date(tgl + "T00:00:00+07:00");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: ZONA });
}

export const STATUS_BOOKING: Record<string, { label: string; nada: Nada; langkah: string }> = {
  draf: { label: "Draf", nada: "abu", langkah: "Lanjutkan checkout untuk mengirim booking." },
  menunggu_verifikasi: { label: "Menunggu verifikasi", nada: "waspada", langkah: "CS memeriksa dokumen Anda, biasanya kurang dari 15 menit." },
  menunggu_bayar: { label: "Menunggu bayar", nada: "waspada", langkah: "Bayar DP sebelum batas waktu supaya unit tidak dilepas." },
  dikonfirmasi: { label: "Dikonfirmasi", nada: "baik", langkah: "Booking terkunci. Datang sesuai jadwal atau tunggu unit diantar." },
  dipakai: { label: "Sedang dipakai", nada: "info", langkah: "Kembalikan tepat waktu. Perpanjang lewat WhatsApp bila perlu." },
  selesai: { label: "Selesai", nada: "abu", langkah: "Terima kasih. Beri ulasan untuk mendapat poin." },
  ditolak: { label: "Ditolak", nada: "buruk", langkah: "Dokumen belum lolos. Unggah ulang atau hubungi CS." },
  kedaluwarsa: { label: "Kedaluwarsa", nada: "buruk", langkah: "Pembayaran lewat batas waktu. Silakan booking lagi." },
  batal: { label: "Dibatalkan", nada: "abu", langkah: "Booking dibatalkan." },
};

export type Nada = "baik" | "waspada" | "buruk" | "info" | "abu" | "teal";
