import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

/** Keranjang disimpan di cookie: satu periode sewa untuk semua barang (satu booking). Harga dihitung ulang di server. */
const Skema = z.object({
  mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jamMulai: z.string().regex(/^\d{2}:\d{2}$/),
  selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jamSelesai: z.string().regex(/^\d{2}:\d{2}$/),
  items: z.array(z.object({ produk: z.string().min(1).max(80), jumlah: z.number().int().min(1).max(10) })).max(20),
});
export type Keranjang = z.infer<typeof Skema>;

const NAMA = "rentalaja_keranjang";

export function bacaKeranjang(): Keranjang | null {
  const raw = cookies().get(NAMA)?.value;
  if (!raw) return null;
  try {
    const hasil = Skema.safeParse(JSON.parse(raw));
    return hasil.success ? hasil.data : null;
  } catch {
    return null;
  }
}

export function simpanKeranjang(k: Keranjang | null) {
  if (!k || k.items.length === 0) {
    cookies().delete(NAMA);
    return;
  }
  cookies().set(NAMA, JSON.stringify(Skema.parse(k)), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
