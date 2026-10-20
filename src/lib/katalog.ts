import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ItemKatalog = {
  id: string; slug: string; nama: string; deskripsi: string | null; kelengkapan: string | null; foto: string[];
  jenis_layanan: "sewa" | "penginapan" | "trip"; tipe_penginapan: string | null; maks_tamu: number | null; kamar_tidur: number | null;
  fasilitas: string[] | null; durasi_menit: number | null; maks_penumpang: number | null; slot_jam: string[] | null; titik_kumpul: string | null;
  kategori_slug: string; kategori_nama: string; lini: "hub" | "transportation" | "experience"; urutan: number;
  harga_mulai: number | null; satuan: "hari" | "malam" | "trip";
};

export async function ambilKatalog(f: { lini?: string; kategori?: string; q?: string; jenis?: string; batas?: number } = {}) {
  const supabase = createClient();
  let q = supabase.from("katalog").select("*").order("urutan").order("nama");
  if (f.lini) q = q.eq("lini", f.lini);
  if (f.kategori) q = q.eq("kategori_slug", f.kategori);
  if (f.jenis) q = q.eq("jenis_layanan", f.jenis);
  if (f.q) q = q.ilike("nama", `%${f.q.replace(/[%_]/g, "")}%`);
  if (f.batas) q = q.limit(f.batas);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ItemKatalog[];
}

export async function ambilProduk(slug: string) {
  const supabase = createClient();
  const { data } = await supabase.from("katalog").select("*").eq("slug", slug).maybeSingle();
  return data as ItemKatalog | null;
}

export async function ambilKategori(lini?: string) {
  const supabase = createClient();
  let q = supabase.from("kategori").select("slug, nama, lini, urutan").order("urutan");
  if (lini) q = q.eq("lini", lini);
  const { data } = await q;
  return (data ?? []) as { slug: string; nama: string; lini: string; urutan: number }[];
}

export type Cabang = { id: string; kode: string; nama: string; alamat: string | null; lini: string[]; jam_buka: string | null; jam_tutup: string | null; jam_check_in: string | null; jam_check_out: string | null };

export async function ambilCabang() {
  const supabase = createClient();
  const { data } = await supabase.from("cabang").select("id, kode, nama, alamat, lini, jam_buka, jam_tutup, jam_check_in, jam_check_out").order("nama");
  return (data ?? []) as Cabang[];
}
