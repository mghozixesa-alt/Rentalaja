"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bacaKeranjang, simpanKeranjang } from "@/lib/keranjang";
import { buatInvoice } from "@/lib/xendit";
import { hariIniWIB, wib } from "@/lib/format";

const Tgl = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Jam = z.string().regex(/^\d{2}:\d{2}$/);

function pesanGalat(e: unknown) {
  const m = (e as { message?: string })?.message ?? "Terjadi kesalahan";
  return encodeURIComponent(m.replace(/^.*?ERROR:\s*/, "").slice(0, 160));
}

/** Tambah barang ke keranjang. Tanggal keranjang mengikuti input terakhir (satu booking = satu periode). */
export async function tambahKeKeranjang(form: FormData) {
  const d = z
    .object({ produk: z.string().min(1).max(80), jumlah: z.coerce.number().int().min(1).max(10), mulai: Tgl, jamMulai: Jam, selesai: Tgl, jamSelesai: Jam })
    .safeParse(Object.fromEntries(form));
  if (!d.success) redirect(`/produk/${form.get("produk")}?galat=${encodeURIComponent("Periksa tanggal dan jumlah")}`);
  const v = d.data;
  if (wib(v.selesai, v.jamSelesai) <= wib(v.mulai, v.jamMulai)) redirect(`/produk/${v.produk}?galat=${encodeURIComponent("Waktu kembali harus setelah waktu ambil")}`);
  const k = bacaKeranjang() ?? { mulai: v.mulai, jamMulai: v.jamMulai, selesai: v.selesai, jamSelesai: v.jamSelesai, items: [] };
  const ada = k.items.find((i) => i.produk === v.produk);
  if (ada) ada.jumlah = Math.min(10, ada.jumlah + v.jumlah);
  else k.items.push({ produk: v.produk, jumlah: v.jumlah });
  simpanKeranjang({ ...k, mulai: v.mulai, jamMulai: v.jamMulai, selesai: v.selesai, jamSelesai: v.jamSelesai });
  redirect("/keranjang");
}

export async function ubahJumlah(form: FormData) {
  const produk = String(form.get("produk") ?? "");
  const jumlah = Number(form.get("jumlah") ?? 0);
  const k = bacaKeranjang();
  if (!k) return;
  k.items = k.items.map((i) => (i.produk === produk ? { ...i, jumlah: Math.max(0, Math.min(10, jumlah)) } : i)).filter((i) => i.jumlah > 0);
  simpanKeranjang(k);
  revalidatePath("/keranjang");
}

export async function aturTanggalKeranjang(form: FormData) {
  const d = z.object({ mulai: Tgl, jamMulai: Jam, selesai: Tgl, jamSelesai: Jam }).safeParse(Object.fromEntries(form));
  const k = bacaKeranjang();
  if (!d.success || !k) return;
  simpanKeranjang({ ...k, ...d.data });
  revalidatePath("/keranjang");
}

/** Checkout keranjang: harga dihitung di database (buat_booking), lalu dikirim ke antrean verifikasi CS. */
export async function checkout(form: FormData) {
  const k = bacaKeranjang();
  if (!k) redirect("/keranjang");
  const cabang = z.string().uuid().safeParse(form.get("cabang"));
  if (!cabang.success) redirect(`/checkout?galat=${encodeURIComponent("Pilih cabang pengambilan")}`);
  const antar = form.get("antar") === "ya";
  const alamat = String(form.get("alamat") ?? "").slice(0, 300) || null;
  const supabase = createClient();
  const { data: b, error } = await supabase.rpc("buat_booking", {
    p_cabang: cabang.data, p_mulai: wib(k.mulai, k.jamMulai), p_selesai: wib(k.selesai, k.jamSelesai),
    p_items: k.items, p_antar: antar, p_alamat: antar ? alamat : null,
  });
  if (error || !b) redirect(`/checkout?galat=${pesanGalat(error)}`);
  const booking = b as { id: string; kode: string };
  const r = await supabase.rpc("ubah_status_booking", { p_booking: booking.id, p_baru: "menunggu_verifikasi" });
  if (r.error) redirect(`/checkout?galat=${pesanGalat(r.error)}`);
  simpanKeranjang(null);
  redirect(`/booking/${booking.kode}`);
}

/** Booking Experience: tanpa KTP, langsung menunggu bayar. Jam selesai dihitung di server. */
export async function pesanExperience(form: FormData) {
  const slug = String(form.get("produk") ?? "");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/masuk?lanjut=${encodeURIComponent(`/experience/${slug}`)}`);
  const { data: p } = await supabase.from("katalog").select("slug, jenis_layanan, durasi_menit").eq("slug", slug).maybeSingle();
  if (!p) redirect("/experience");
  const tamu = Math.max(1, Math.min(20, Number(form.get("tamu") ?? 1)));
  const tgl = Tgl.safeParse(form.get("tanggal"));
  if (!tgl.success || tgl.data < hariIniWIB()) redirect(`/experience/${slug}?galat=${encodeURIComponent("Pilih tanggal yang valid")}`);
  let mulai: string, selesai: string;
  const { data: cab } = await supabase.from("cabang").select("id, kode, jam_check_in, jam_check_out").eq("id", String(form.get("cabang"))).maybeSingle();
  if (!cab) redirect(`/experience/${slug}?galat=${encodeURIComponent("Lokasi tidak ditemukan")}`);
  if (p.jenis_layanan === "penginapan") {
    const malam = Math.max(1, Math.min(14, Number(form.get("malam") ?? 1)));
    const akhir = new Date(tgl.data + "T00:00:00+07:00");
    akhir.setUTCDate(akhir.getUTCDate() + malam);
    mulai = wib(tgl.data, (cab.jam_check_in ?? "14:00").slice(0, 5));
    selesai = wib(akhir.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }), (cab.jam_check_out ?? "12:00").slice(0, 5));
  } else {
    const slot = Jam.safeParse(form.get("slot"));
    if (!slot.success) redirect(`/experience/${slug}?galat=${encodeURIComponent("Pilih jam berangkat")}`);
    const { data: atur } = await supabase.from("pengaturan").select("nilai").eq("kunci", "jeep").maybeSingle();
    const jeda = Number((atur?.nilai as { jeda_antar_trip_menit?: number } | null)?.jeda_antar_trip_menit ?? 60);
    mulai = wib(tgl.data, slot.data);
    selesai = new Date(new Date(mulai).getTime() + ((p.durasi_menit ?? 240) + jeda) * 60000).toISOString();
  }
  const { data: b, error } = await supabase.rpc("buat_booking", {
    p_cabang: cab.id, p_mulai: mulai, p_selesai: selesai, p_items: [{ produk: slug, jumlah: 1 }], p_tamu: tamu,
    p_jemput: String(form.get("jemput") ?? "").slice(0, 120) || null,
  });
  if (error || !b) redirect(`/experience/${slug}?galat=${pesanGalat(error)}`);
  const booking = b as { id: string; kode: string };
  const r = await supabase.rpc("ubah_status_booking", { p_booking: booking.id, p_baru: "menunggu_bayar" });
  if (r.error) redirect(`/experience/${slug}?galat=${pesanGalat(r.error)}`);
  redirect(`/booking/${booking.kode}`);
}

/** Buat tagihan Xendit untuk DP (atau lunas bila tanpa DP) lalu arahkan ke halaman bayar. */
export async function bayar(form: FormData) {
  const kode = String(form.get("kode") ?? "");
  const supabase = createClient();
  const { data: b } = await supabase.from("booking").select("id, kode, status, total, dp_wajib").eq("kode", kode).maybeSingle();
  if (!b || b.status !== "menunggu_bayar") redirect(`/booking/${kode}`);
  const admin = createAdminClient();
  const { data: ada } = await admin.from("pembayaran").select("link_bayar, kedaluwarsa").eq("booking_id", b.id).eq("status", "menunggu").gt("kedaluwarsa", new Date().toISOString()).order("dibuat_pada", { ascending: false }).limit(1).maybeSingle();
  if (ada?.link_bayar) redirect(ada.link_bayar);
  const jumlah = Number(b.dp_wajib) > 0 ? Number(b.dp_wajib) : Number(b.total);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rentalaja.co.id";
  const inv = await buatInvoice({ externalId: `${b.kode}-${Date.now()}`, jumlah, deskripsi: `Rentalaja ${b.kode} · ${Number(b.dp_wajib) > 0 ? "DP" : "Lunas"}`, kembaliKe: `${site}/booking/${b.kode}` });
  const { error } = await admin.from("pembayaran").insert({
    booking_id: b.id, jenis: Number(b.dp_wajib) > 0 ? "dp" : "lunas", metode: "qris", jumlah, status: "menunggu", xendit_id: inv.id, link_bayar: inv.invoice_url, kedaluwarsa: inv.expiry_date,
  });
  if (error) redirect(`/booking/${kode}?galat=${pesanGalat(error)}`);
  redirect(inv.invoice_url);
}
