# Rentalaja Web v2

Website dan panel operasional Rentalaja (PT Popo Karya Investama): sewa barang (Hub), motor dan mobil (Transportation), serta menginap dan trip Jeep (Experience) dalam satu sistem.

**Teknologi:** Next.js 14 (App Router) · Supabase (PostgreSQL, Auth OTP WhatsApp, Storage) · Xendit (QRIS, VA, e-wallet) · Tailwind CSS. Hosting yang disarankan: Vercel.

## Yang sudah ada (Tahap 1)

| Bagian | Halaman | Keterangan |
|---|---|---|
| Pelanggan | `/`, `/katalog`, `/produk/[slug]` | Katalog dari database, cek ketersediaan per cabang |
| | `/keranjang`, `/checkout` | Satu periode sewa per booking; unggah KTP + 1 dokumen pendukung (SIM, KK, STNK, NPWP; camping cukup KTP) ke bucket privat |
| | `/experience`, `/experience/[slug]` | Menginap (check-in 14.00, check-out 12.00) dan trip Jeep per slot jam, tanpa KTP |
| | `/booking/[kode]` | Status, rincian harga dari server, bayar lewat Xendit |
| | `/masuk`, `/akun` | Masuk dengan kode WhatsApp; semua booking dalam satu daftar |
| Panel cabang | `/cabang` | Hari ini: ambil, kembali, telat |
| | `/cabang/verifikasi` | Lihat KTP dan dokumen pendukung (link sementara 5 menit), setujui atau tolak |
| | `/cabang/serah-terima` | DP tunai, serahkan unit, terima kembali (denda otomatis) |
| | `/cabang/qc` | Daftar cek per kategori; gagal QC otomatis jadi work order |
| Panel Experience | `/panel-experience`, `/panel-experience/jadwal` | Check-in/out, kamar siap, jadwal ulang oleh CS (tanpa pembatalan), status konfirmasi sopir |
| HP sopir Jeep | `/sopir` | Terima atau tolak trip baru, berangkat, sisa bayar tunai/QRIS, selesai |
| Server | `/api/xendit/webhook` | Callback invoice, dicek token dan dicatat sekali |

Aturan bisnis dijaga di database, bukan di browser: harga, diskon bundling, promo 3 hari bayar 2, DP, kunci unit anti sewa ganda, urutan status, peran, dan tanpa pembatalan Experience. Lihat `supabase/migrations` dan uji di `supabase/tests` (78+ pemeriksaan).

Belum dibangun (Tahap 2 dan seterusnya, desainnya sudah ada di kanvas): aplikasi HP teknisi dan runner, panel manajemen, panel Keuangan terpisah, CRM dan inbox WhatsApp, laporan WhatsApp per modul, aplikasi mitra.

## Menjalankan

### 1. Supabase
1. Buat proyek **staging** di supabase.com (region Singapore).
2. Pasang Supabase CLI, lalu dari folder ini:
   ```bash
   supabase link --project-ref <ref-proyek>
   supabase db push
   psql "$DATABASE_URL" -f supabase/seed.sql      # aturan bisnis + data CONTOH
   ```
3. Di SQL Editor jalankan `supabase/storage.sql` (bucket privat dokumen) dan `supabase/cron.sql` (kedaluwarsa booking tiap menit, pengingat konfirmasi sopir).
4. Authentication → Providers → Phone: aktifkan, pilih Twilio (Verify) dengan kanal **WhatsApp**.
5. Buat akun staf: setelah staf masuk sekali lewat `/masuk`, tambahkan barisnya ke tabel `pengguna` (id = id auth, peran, cabang_id). Staf diarahkan otomatis: sopir ke `/sopir`, CS dan manajer Experience ke `/panel-experience`, lainnya ke `/cabang`.

### 2. Xendit
1. Dashboard Xendit → Settings → Developers: salin **Secret key** (mode Test dulu).
2. Callbacks → Invoices paid: isi `https://<domain>/api/xendit/webhook`, salin **Verification token**.

### 3. Variabel lingkungan
Salin `.env.example` ke `.env.local` (lokal) atau isi di Vercel → Settings → Environment Variables. `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, dan `XENDIT_CALLBACK_TOKEN` hanya untuk server; jangan dikirim lewat chat atau di-commit.

### 4. Jalankan
```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck && npm run lint && npm run build
```

### Uji database lokal
Butuh PostgreSQL 15+:
```bash
PGHOST=localhost PGPORT=5432 PGPASSWORD=... npm run db:test
```
GitHub Actions menjalankan uji database dan build web pada setiap push (`.github/workflows/ci.yml`).

## Struktur
```
src/app/(toko)/      halaman pelanggan
src/app/cabang/      panel cabang (perlu peran cs, kasir, kepala_cabang, petugas_qc, atau owner)
src/app/api/         webhook Xendit
src/lib/             klien Supabase, format rupiah/WIB, keranjang, Xendit
supabase/migrations  skema 62 tabel, RLS, fungsi aturan bisnis
supabase/tests       uji alur sewa, Jeep, Experience, web
```

## Catatan keamanan
- Semua tabel memakai Row Level Security. Klien service role hanya dipakai di server untuk webhook dan link sementara dokumen, setelah peran dicek.
- Foto KTP dan dokumen pendukung di bucket privat; staf melihat lewat link yang kedaluwarsa dalam 5 menit.
- Status booking dan unit hanya bisa berubah lewat fungsi database, bukan update langsung.
