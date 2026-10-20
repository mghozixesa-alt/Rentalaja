-- Rentalaja Web v2 · 04 · Transaksi sewa (11 tabel)
-- Kunci anti sewa ganda: tabel ketersediaan dengan exclusion constraint per unit.

create table promo (
  id uuid primary key default gen_random_uuid(),
  kode text unique,                                 -- null = promo otomatis
  nama text not null,
  jenis text not null check (jenis in ('gratis_hari', 'persen', 'nominal', 'bundling')),
  aturan jsonb not null,                            -- {"bayar_hari":2,"gratis_hari":1} atau {"2":5,"3":10}
  lini lini_usaha[],
  kategori_id uuid references kategori(id),
  boleh_digabung boolean not null default false,
  mulai timestamptz, sampai timestamptz,
  kuota int,
  aktif boolean not null default true
);

create table booking (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,                        -- RA-2410-0381 (barang), RM-/ET- (penginapan), JP- (Jeep)
  pelanggan_id uuid not null references pelanggan(id),
  cabang_id uuid not null references cabang(id),
  lini lini_usaha not null,
  status status_booking not null default 'draf',
  mulai timestamptz not null,
  selesai timestamptz not null,
  jumlah_tamu int,                                  -- penginapan, penumpang trip
  sopir_id uuid references pengguna(id),            -- trip Jeep
  konfirmasi_sopir text check (konfirmasi_sopir in ('menunggu', 'diterima', 'ditolak')),  -- trip Jeep: diisi setelah DP
  batas_konfirmasi_sopir timestamptz,               -- 2 jam setelah DP; lewat = CS Experience diberi tahu
  jumlah_ubah_tanggal int not null default 0,       -- Experience: tanpa pembatalan, tanggal boleh diubah sekali
  titik_jemput text,
  antar boolean not null default false,
  alamat_antar text, zona_ongkir_id uuid references zona_ongkir(id),
  subtotal bigint not null default 0,
  diskon_promo bigint not null default 0,
  diskon_bundling bigint not null default 0,
  ongkir bigint not null default 0,
  total bigint not null default 0,
  dp_wajib bigint not null default 0,               -- 20% barang, 0 untuk member tanpa DP
  promo_id uuid references promo(id),
  sumber text not null default 'web' check (sumber in ('web', 'kasir', 'whatsapp', 'ota', 'korporat')),
  batas_bayar timestamptz,                          -- 20 menit setelah lolos verifikasi
  catatan text,
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now(),
  check (selesai > mulai)
);
create index on booking (cabang_id, status);
create index on booking (pelanggan_id);

create table booking_item (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id) on delete cascade,
  produk_id uuid not null references produk(id),
  unit_id uuid references unit(id),                 -- diisi sistem saat unit dikunci
  harga_satuan bigint not null,
  jumlah_hari numeric(6,2) not null,                -- hari atau malam
  diskon bigint not null default 0,
  total bigint not null
);
create index on booking_item (unit_id);

create table ketersediaan (
  id bigint generated always as identity primary key,
  unit_id uuid not null references unit(id) on delete cascade,
  rentang tstzrange not null,
  alasan text not null check (alasan in ('booking', 'perawatan', 'blokir', 'kontrak')),
  booking_id uuid references booking(id) on delete cascade,
  catatan text,
  -- satu unit tidak boleh terpakai dua kali pada waktu yang bertumpuk
  exclude using gist (unit_id with =, rentang with &&)
);

create table pembayaran (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references booking(id),
  tagihan_id uuid,
  jenis jenis_bayar not null,
  metode metode_bayar not null,
  jumlah bigint not null check (jumlah > 0),
  status status_bayar not null default 'menunggu',
  xendit_id text unique,                            -- id invoice/QR/VA di Xendit, kunci anti dobel
  link_bayar text,
  kedaluwarsa timestamptz,
  dibayar_pada timestamptz,
  diterima_oleh uuid references pengguna(id),       -- untuk tunai di kasir
  shift_id uuid,
  dibuat_pada timestamptz not null default now()
);
create index on pembayaran (booking_id);

create table refund (
  id uuid primary key default gen_random_uuid(),
  pembayaran_id uuid not null references pembayaran(id),
  jumlah bigint not null check (jumlah > 0),
  alasan text not null,
  ke text not null check (ke in ('rekening_asal', 'saldo')),
  status text not null default 'menunggu_persetujuan' check (status in ('menunggu_persetujuan', 'diproses', 'selesai', 'ditolak')),
  xendit_id text unique,
  dibuat_pada timestamptz not null default now()
);

create table tagihan (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,                       -- INV-2410-007
  booking_id uuid references booking(id),
  kontrak_id uuid,
  pelanggan_id uuid references pelanggan(id),
  perusahaan text,
  jenis text not null check (jenis in ('denda', 'klaim', 'pelunasan', 'invoice_korporat')),
  jumlah bigint not null,
  jatuh_tempo date,
  status text not null default 'terbuka' check (status in ('terbuka', 'lunas', 'dihapuskan', 'lewat')),
  dibuat_pada timestamptz not null default now()
);
alter table pembayaran add constraint pembayaran_tagihan_fk foreign key (tagihan_id) references tagihan(id);

create table ulasan (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references booking(id),
  nilai int not null check (nilai between 1 and 5),
  teks text,
  foto text[],
  tampil boolean not null default false,            -- hanya ulasan asli dari booking selesai
  dibuat_pada timestamptz not null default now()
);

create table klaim (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,                       -- KL-031
  booking_id uuid not null references booking(id),
  unit_id uuid not null references unit(id),
  temuan text not null,
  sumber text not null check (sumber in ('qc', 'check_out', 'laporan')),
  foto_temuan text[],
  nilai bigint not null,
  cara_tagih text not null check (cara_tagih in ('potong_dp', 'tagihan_wa', 'tagihan_dan_daftar_hitam')),
  tagihan_id uuid references tagihan(id),
  status text not null default 'terbuka' check (status in ('terbuka', 'lunas', 'dihapuskan', 'lewat')),
  dibuat_oleh uuid references pengguna(id),
  dibuat_pada timestamptz not null default now()
);

create table penawaran (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,                       -- PNW-014
  perusahaan text not null,
  kontak text,
  isi jsonb not null,                               -- baris produk, jumlah, durasi, harga
  total bigint not null,
  berlaku_sampai date,
  status text not null default 'draf' check (status in ('draf', 'dikirim', 'diterima', 'ditolak')),
  dibuat_pada timestamptz not null default now()
);

create table kontrak_korporat (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,                       -- KTR-003
  penawaran_id uuid references penawaran(id),
  perusahaan text not null,
  nilai_bulanan bigint not null,
  mulai date not null, sampai date not null,
  termin_hari int not null default 14,
  status text not null default 'aktif' check (status in ('aktif', 'selesai', 'batal')),
  dokumen text
);
alter table tagihan add constraint tagihan_kontrak_fk foreign key (kontrak_id) references kontrak_korporat(id);

select pasang_updated_at('booking');
