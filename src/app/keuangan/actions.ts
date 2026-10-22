"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { konteksKeuangan } from "@/lib/keuangan";
import { pesanGalat } from "@/lib/panel";
import { hariIniWIB } from "@/lib/format";

const Id = z.string().uuid();
const IdOpsional = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable());
const Tgl = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Uang = z.preprocess((v) => Math.round(Number(String(v ?? "").replace(/[^\d]/g, ""))), z.number().int().positive());
const teks = (v: FormDataEntryValue | null, maks = 200) => (String(v ?? "").trim().slice(0, maks) || null);
const baris = (v: FormDataEntryValue | null) => {
  try { return JSON.parse(String(v ?? "[]")) as unknown[]; } catch { return []; }
};

/** Kembali ke halaman asal dengan pesan sukses atau galat. */
function balik(path: string, galat?: unknown, ok = "1"): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${galat ? `galat=${pesanGalat(galat)}` : `ok=${encodeURIComponent(ok)}`}`);
}
const asal = (form: FormData, cadangan: string) => {
  const p = String(form.get("asal") ?? "");
  return p.startsWith("/keuangan") ? p.split(/[?&](ok|galat)=/)[0] : cadangan;
};

// ---------- Pembelian dan Biaya ----------
export async function simpanPengeluaran(form: FormData) {
  const { supabase, staf } = await konteksKeuangan();
  const jenis = z.enum(["pembelian", "biaya"]).parse(form.get("jenis"));
  const path = `/keuangan/${jenis}`;
  let nota: string | null = null;
  const file = form.get("nota");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5_000_000 || !/^image\/|application\/pdf/.test(file.type)) balik(path, new Error("Nota harus foto atau PDF, maksimal 5 MB"));
    nota = `${hariIniWIB().slice(0, 7)}/${staf.id}-${Date.now()}.${(file.name.split(".").pop() ?? "jpg").slice(0, 5)}`;
    const up = await supabase.storage.from("nota").upload(nota, file, { contentType: file.type });
    if (up.error) balik(path, up.error);
  }
  const bayarNanti = jenis === "pembelian" || form.get("bayar_nanti") === "on";
  const r = await supabase.rpc("simpan_pengeluaran", {
    p_jenis: jenis, p_tanggal: Tgl.parse(form.get("tanggal")), p_kontak: IdOpsional.parse(form.get("kontak")), p_penerima: teks(form.get("penerima"), 120),
    p_bayar_dari: bayarNanti ? null : IdOpsional.parse(form.get("bayar_dari")), p_jatuh_tempo: form.get("jatuh_tempo") ? Tgl.parse(form.get("jatuh_tempo")) : null,
    p_cabang: IdOpsional.parse(form.get("cabang")), p_memo: teks(form.get("memo")), p_referensi: teks(form.get("referensi"), 60), p_nota: nota,
    p_item: baris(form.get("baris")),
  });
  if (r.error) balik(path, r.error);
  const d = r.data as { nomor: string; status: string };
  revalidatePath("/keuangan", "layout");
  balik(path, undefined, d.status === "menunggu" ? `${d.nomor} dikirim ke owner untuk disetujui.` : `${d.nomor} tersimpan dan tercatat di jurnal.`);
}

// ---------- Kas & Bank ----------
export async function simpanKas(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const jenis = z.enum(["terima", "kirim", "transfer"]).parse(form.get("jenis"));
  const path = asal(form, "/keuangan/kas-bank");
  const pengeluaran = IdOpsional.parse(form.get("pengeluaran"));
  const r = await supabase.rpc("simpan_kas", {
    p_jenis: jenis, p_tanggal: Tgl.parse(form.get("tanggal")), p_akun_kas: Id.parse(form.get("akun_kas")),
    p_akun_tujuan: jenis === "transfer" ? Id.parse(form.get("akun_tujuan")) : null, p_kontak: IdOpsional.parse(form.get("kontak")),
    p_pengeluaran: pengeluaran, p_memo: teks(form.get("memo")),
    p_total: jenis === "transfer" || pengeluaran ? Uang.parse(form.get("total")) : null,
    p_item: jenis === "transfer" || pengeluaran ? null : baris(form.get("baris")),
  });
  if (r.error) balik(path, r.error);
  const d = r.data as { nomor: string; status: string };
  revalidatePath("/keuangan", "layout");
  balik(path, undefined, d.status === "menunggu" ? `${d.nomor} menunggu persetujuan owner. Transfer dari aplikasi bank setelah disetujui.` : `${d.nomor} tercatat.`);
}

export async function terimaPembayaran(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const path = asal(form, "/keuangan/penjualan");
  const jenis = String(form.get("jenis"));
  const id = Id.parse(form.get("id"));
  const r = await supabase.rpc("catat_pembayaran_manual", {
    p_booking: jenis === "booking" ? id : null, p_tagihan: jenis === "booking" ? null : id,
    p_akun_kas: Id.parse(form.get("akun_kas")), p_jumlah: Uang.parse(form.get("jumlah")), p_tanggal: Tgl.parse(form.get("tanggal")),
  });
  if (r.error) balik(path, r.error);
  revalidatePath("/keuangan", "layout");
  balik(path, undefined, "Pembayaran tercatat. Jurnal dibuat otomatis.");
}

export async function imporMutasi(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const akun = Id.parse(form.get("akun"));
  const path = `/keuangan/kas-bank/${akun}?t=rek`;
  // Format per baris: tanggal;keterangan;jumlah  (tanggal 2026-10-21 atau 21/10/2026; jumlah negatif = keluar)
  const rows = String(form.get("mutasi") ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split(/[;\t]/);
    if (p.length < 3) return null;
    const t = p[0].trim();
    const tgl = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t) ? t.split("/").reverse().map((x) => x.padStart(2, "0")).join("-") : t;
    const jumlah = Math.round(Number(p[p.length - 1].replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")));
    return Tgl.safeParse(tgl).success && Number.isFinite(jumlah) && jumlah !== 0 ? { tanggal: tgl, keterangan: p.slice(1, -1).join(" ").trim().slice(0, 200), jumlah } : null;
  });
  if (rows.length === 0 || rows.some((x) => x === null)) balik(path, new Error("Format tidak dikenali. Pakai: tanggal;keterangan;jumlah per baris"));
  const r = await supabase.rpc("impor_mutasi", { p_akun: akun, p_mutasi: rows });
  if (r.error) balik(path, r.error);
  revalidatePath(path);
  balik(path, undefined, `${r.data} mutasi baru diimpor.`);
}

export async function cocokkanMutasi(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const akun = Id.parse(form.get("akun"));
  const path = `/keuangan/kas-bank/${akun}?t=rek`;
  const r = await supabase.rpc("cocokkan_mutasi", { p_mutasi: Id.parse(form.get("mutasi")), p_baris: Id.parse(form.get("baris_jurnal")) });
  if (r.error) balik(path, r.error);
  revalidatePath(path);
  balik(path);
}

// ---------- Jurnal umum dan koreksi ----------
export async function simpanJurnalUmum(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const r = await supabase.rpc("simpan_jurnal_manual", {
    p_tanggal: Tgl.parse(form.get("tanggal")), p_memo: teks(form.get("memo")), p_baris: baris(form.get("baris")),
    p_saldo_awal: form.get("saldo_awal") === "on",
  });
  if (r.error) balik("/keuangan/jurnal-umum", r.error);
  revalidatePath("/keuangan", "layout");
  balik("/keuangan/jurnal-umum", undefined, `${(r.data as { nomor: string }).nomor} dikirim ke owner untuk disetujui.`);
}

export async function balikJurnal(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const path = asal(form, "/keuangan/jurnal-umum");
  const r = await supabase.rpc("balik_jurnal", { p_jurnal: Id.parse(form.get("jurnal")), p_tanggal: Tgl.parse(form.get("tanggal") ?? hariIniWIB()), p_alasan: teks(form.get("alasan")) });
  if (r.error) balik(path, r.error);
  revalidatePath("/keuangan", "layout");
  balik(path, undefined, `Jurnal balik ${(r.data as { nomor: string }).nomor} dibuat.`);
}

// ---------- Persetujuan dan tutup buku ----------
export async function putuskan(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const setuju = form.get("setuju") === "1";
  const r = await supabase.rpc("putuskan_persetujuan", { p_id: Id.parse(form.get("id")), p_setuju: setuju, p_catatan: teks(form.get("catatan")) });
  if (r.error) balik("/keuangan/persetujuan", r.error);
  revalidatePath("/keuangan", "layout");
  balik("/keuangan/persetujuan", undefined, setuju ? "Disetujui dan tercatat di jurnal." : "Ditolak.");
}

export async function kunciBulan(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const bulan = z.string().regex(/^\d{4}-\d{2}$/).parse(form.get("bulan"));
  const r = await supabase.rpc("kunci_bulan", { p_bulan: `${bulan}-01` });
  if (r.error) balik("/keuangan/tutup-buku", r.error);
  revalidatePath("/keuangan", "layout");
  balik("/keuangan/tutup-buku", undefined, `Buku ${bulan} dikunci.`);
}

// ---------- Master: kontak dan akun ----------
export async function simpanKontak(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const jenis = z.enum(["pelanggan", "supplier", "karyawan", "mitra", "lainnya"]).parse(form.get("jenis"));
  const r = await supabase.from("kontak").insert({
    jenis, nama: z.string().min(2).max(120).parse(String(form.get("nama") ?? "").trim()), perusahaan: teks(form.get("perusahaan"), 120),
    telepon: teks(form.get("telepon"), 30), email: teks(form.get("email"), 120), termin_hari: Math.max(0, Math.min(90, Number(form.get("termin_hari") ?? 0) || 0)),
    catatan: teks(form.get("catatan")),
  });
  if (r.error) balik(`/keuangan/kontak?k=${jenis}`, r.error);
  revalidatePath("/keuangan/kontak");
  balik(`/keuangan/kontak?k=${jenis}`);
}

export async function simpanAkun(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const r = await supabase.from("akun").insert({
    kode: z.string().regex(/^[1-9]-\d{5}$/, "Kode akun format 1-10001").parse(String(form.get("kode") ?? "").trim()),
    nama: z.string().min(2).max(120).parse(String(form.get("nama") ?? "").trim()),
    kategori: z.string().min(3).parse(form.get("kategori")),
    cabang_id: IdOpsional.parse(form.get("cabang")),
    keterangan: teks(form.get("keterangan")),
  });
  if (r.error) balik("/keuangan/akun", r.error);
  revalidatePath("/keuangan/akun");
  balik("/keuangan/akun");
}

export async function arsipkanAkun(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const r = await supabase.from("akun").update({ aktif: form.get("aktif") === "1" }).eq("id", Id.parse(form.get("id")));
  if (r.error) balik("/keuangan/akun", r.error);
  revalidatePath("/keuangan/akun");
  balik("/keuangan/akun");
}

// ---------- Aset tetap ----------
export async function daftarkanAset(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const r = await supabase.rpc("daftarkan_aset", {
    p_nama: z.string().min(2).max(120).parse(String(form.get("nama") ?? "").trim()),
    p_kelompok: z.enum(["kendaraan_motor", "kendaraan_mobil", "elektronik", "peralatan"]).parse(form.get("kelompok")),
    p_tanggal: Tgl.parse(form.get("tanggal")), p_harga: Uang.parse(form.get("harga")),
    p_umur_bulan: z.coerce.number().int().min(1).max(360).parse(form.get("umur_bulan")),
    p_cabang: IdOpsional.parse(form.get("cabang")), p_unit: IdOpsional.parse(form.get("unit")),
    p_nilai_sisa: Math.max(0, Number(String(form.get("nilai_sisa") ?? "0").replace(/[^\d]/g, "")) || 0),
    p_akumulasi_awal: Math.max(0, Number(String(form.get("akumulasi_awal") ?? "0").replace(/[^\d]/g, "")) || 0),
  });
  if (r.error) balik("/keuangan/aset-tetap", r.error);
  revalidatePath("/keuangan/aset-tetap");
  balik("/keuangan/aset-tetap", undefined, `${(r.data as { nomor: string }).nomor} terdaftar.`);
}

export async function jalankanPenyusutan(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const bulan = z.string().regex(/^\d{4}-\d{2}$/).parse(form.get("bulan"));
  const r = await supabase.rpc("jalankan_penyusutan", { p_bulan: `${bulan}-01` });
  if (r.error) balik("/keuangan/aset-tetap", r.error);
  revalidatePath("/keuangan", "layout");
  balik("/keuangan/aset-tetap", undefined, `Penyusutan ${bulan} tercatat (${(r.data as { nomor: string }).nomor}).`);
}

export async function lepasAset(form: FormData) {
  const { supabase } = await konteksKeuangan();
  const harga = Math.max(0, Number(String(form.get("harga_jual") ?? "0").replace(/[^\d]/g, "")) || 0);
  const r = await supabase.rpc("lepas_aset", { p_aset: Id.parse(form.get("aset")), p_tanggal: Tgl.parse(form.get("tanggal")), p_harga_jual: harga, p_akun_kas: harga > 0 ? Id.parse(form.get("akun_kas")) : null });
  if (r.error) balik("/keuangan/aset-tetap", r.error);
  revalidatePath("/keuangan", "layout");
  balik("/keuangan/aset-tetap", undefined, "Aset dilepas; laba/rugi pelepasan tercatat.");
}
