-- Rentalaja Web v2 · 02 · Master dan pengaturan (10 tabel)
-- Diatur manajemen, dibaca semua aplikasi.

create table cabang (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,                       -- GRT, WNR, BDG-HUB, BDG-JKL, RMT, ERT, JEEP
  nama text not null,
  lini lini_usaha[] not null,                      -- cabang Experience = penginapan, panel terpisah
  alamat text,
  titik_peta text,
  jam_buka time, jam_tutup time,                   -- untuk cabang barang
  jam_check_in time, jam_check_out time,           -- untuk cabang Experience
  target_harian bigint,
  mode_qc text not null default 'petugas_qc'       -- siapa yang melakukan QC di cabang ini (Manajemen › Quality control)
    check (mode_qc in ('petugas_qc', 'kepala_cabang', 'cs_ditunjuk')),
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now()
);

create table zona_ongkir (
  id uuid primary key default gen_random_uuid(),
  cabang_id uuid not null references cabang(id),
  nama text not null,
  jarak_maks_km numeric(5,1),
  tarif bigint not null check (tarif >= 0),
  aktif boolean not null default true
);

create table kategori (
  id uuid primary key default gen_random_uuid(),
  lini lini_usaha not null,
  nama text not null,
  slug text not null unique,
  promo_2_gratis_1 boolean not null default false,  -- elektronik dan camping
  boleh_bundling boolean not null default true,     -- motor tidak ikut bundling
  syarat_dokumen text not null default 'ktp_pendukung'   -- camping: KTP saja; lainnya: KTP + 1 pendukung (SIM, KK, STNK, NPWP)
    check (syarat_dokumen in ('ktp', 'ktp_pendukung')),
  urutan int not null default 0
);

create table produk (
  id uuid primary key default gen_random_uuid(),
  kategori_id uuid not null references kategori(id),
  nama text not null,
  slug text not null unique,
  deskripsi text,
  kelengkapan text,
  foto text[] not null default '{}',
  jenis_layanan text not null default 'sewa' check (jenis_layanan in ('sewa', 'penginapan', 'trip')),
  -- khusus penginapan
  tipe_penginapan text check (tipe_penginapan in ('kamar', 'rumah_utuh', 'glamping')),
  maks_tamu int, kamar_tidur int, fasilitas text[],
  minimal_malam int default 1,
  -- khusus trip (Jeep): paket dengan sopir
  durasi_menit int, maks_penumpang int, titik_kumpul text, slot_jam time[],
  status text not null default 'draf' check (status in ('draf', 'terbit', 'arsip')),
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now()
);

create table tarif (
  id uuid primary key default gen_random_uuid(),
  produk_id uuid not null references produk(id) on delete cascade,
  jenis text not null check (jenis in ('harian', 'per_jam', 'malam_biasa', 'malam_akhir_pekan', 'malam_libur', 'bulanan', 'per_trip')),
  harga bigint not null check (harga >= 0),
  berlaku_mulai date not null default current_date,
  berlaku_sampai date,
  unique (produk_id, jenis, berlaku_mulai)
);

create table paket (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  isi jsonb not null,                               -- [{"produk_id": "...", "jumlah": 1}]
  diskon_persen numeric(5,2) not null default 10,
  status text not null default 'draf' check (status in ('draf', 'terbit', 'arsip'))
);

create table unit (
  id uuid primary key default gen_random_uuid(),
  produk_id uuid not null references produk(id),
  cabang_id uuid not null references cabang(id),
  nama text not null,                               -- Honda Beat #07, Ertap Village, Jeep #01
  plat_atau_seri text unique,                       -- kunci unik dari data lama
  status status_unit not null default 'draf',
  km_terakhir int,
  harga_beli bigint,
  sumber_dana text check (sumber_dana in ('kas', 'leasing', 'mitra', 'vendor')),
  tanggal_beli date,
  pajak_jatuh_tempo date,
  alasan_arsip text,
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now()
);
create index on unit (cabang_id, status);
create index on unit (produk_id, status);

create table daftar_cek_qc (
  id uuid primary key default gen_random_uuid(),
  kategori_id uuid not null references kategori(id),
  urutan int not null,
  poin text not null,
  wajib_foto boolean not null default false,
  aktif boolean not null default true
);

create table konten_web (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('banner', 'faq', 'seo', 'halaman')),
  judul text not null,
  slug text,
  isi jsonb not null default '{}',
  tampil_dari timestamptz, tampil_sampai timestamptz,
  status text not null default 'draf' check (status in ('draf', 'terbit', 'arsip')),
  versi int not null default 1,
  diubah_pada timestamptz not null default now()
);

create table pengaturan (
  kunci text primary key,                           -- dp_persen, denda_persen_per_jam, ...
  nilai jsonb not null,
  keterangan text,
  diubah_pada timestamptz not null default now()
);

select pasang_updated_at('cabang');
select pasang_updated_at('produk');
select pasang_updated_at('unit');
