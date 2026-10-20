-- Rentalaja Web v2 · 06 · Aset dan keuangan (14 tabel)

create table investor (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null,
  nama text not null,
  jenis text not null check (jenis in ('perorangan', 'perusahaan', 'vendor', 'pemilik_lokasi', 'internal')),
  nomor_wa text,
  bank text, nomor_rekening_terenkripsi bytea, rekening_4_akhir text,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

create table perjanjian_mitra (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investor(id),
  versi int not null default 1,
  skema skema_bagi_hasil not null,
  cakupan_cabang_id uuid references cabang(id),     -- per_vendor dan kemitraan_lokasi
  dasar_hitung text check (dasar_hitung in ('laba_bersih', 'pendapatan_kotor')),
  porsi_persen numeric(5,2),                        -- null untuk flat
  nominal_flat bigint,                              -- Jeep: 1.500.000
  tanggal_bayar int default 5,
  berlaku_mulai date not null,
  berlaku_sampai date,                              -- null = sampai ada kebijakan baru
  dokumen text,
  status status_persetujuan not null default 'menunggu',
  dibuat_pada timestamptz not null default now(),
  check ((skema = 'flat_bulanan' and nominal_flat is not null) or (skema <> 'flat_bulanan' and porsi_persen is not null)),
  unique (investor_id, versi)
);

create table kepemilikan_unit (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references unit(id),
  perjanjian_id uuid not null references perjanjian_mitra(id),
  mulai date not null,
  sampai date,
  unique (unit_id, mulai)
);

create table leasing_kontrak (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references unit(id),
  perusahaan text not null,                         -- MUF, Adira, FIF, MCF, BCAF
  nomor_kontrak text,
  pokok bigint not null,
  cicilan_bulanan bigint not null,
  tenor_bulan int not null,
  mulai date not null,
  status text not null default 'berjalan' check (status in ('berjalan', 'lunas', 'ditarik'))
);

create table cicilan (
  id uuid primary key default gen_random_uuid(),
  leasing_id uuid not null references leasing_kontrak(id) on delete cascade,
  ke int not null,
  jatuh_tempo date not null,
  jumlah bigint not null,
  dibayar_pada date,
  unique (leasing_id, ke)
);

create table biaya_unit (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references unit(id),
  tanggal date not null,
  jenis text not null check (jenis in ('servis', 'part', 'pajak', 'asuransi', 'lainnya')),
  jumlah bigint not null,
  work_order_id uuid references work_order(id),
  catatan text
);

create table biaya_operasional (
  id uuid primary key default gen_random_uuid(),
  cabang_id uuid not null references cabang(id),
  bulan date not null,                              -- tanggal 1 bulan itu
  jenis text not null,                              -- sewa_tempat, listrik_air, gaji, internet, kas_kecil, iklan
  jumlah bigint not null,
  nota text,
  dicatat_oleh uuid references pengguna(id),
  dibuat_pada timestamptz not null default now()
);

create table pendapatan_unit_harian (
  unit_id uuid not null references unit(id),
  tanggal date not null,
  pendapatan bigint not null default 0,             -- alokasi sewa + denda + klaim - refund
  biaya_langsung bigint not null default 0,
  porsi_biaya_cabang bigint not null default 0,
  cicilan bigint not null default 0,
  laba bigint generated always as (pendapatan - biaya_langsung - porsi_biaya_cabang - cicilan) stored,
  tersedia boolean not null default true,
  disewa_jam numeric(5,2) not null default 0,
  primary key (unit_id, tanggal)
);

create table tutup_buku (
  bulan date primary key,
  dikunci_oleh uuid references pengguna(id),
  dikunci_pada timestamptz,
  ceklis jsonb not null default '{}'
);

create table bagi_hasil (
  id uuid primary key default gen_random_uuid(),
  perjanjian_id uuid not null references perjanjian_mitra(id),
  bulan date not null references tutup_buku(bulan),
  dasar bigint not null,                            -- angka dasar sesuai skema
  bagian bigint not null,
  rincian jsonb,
  status text not null default 'dihitung' check (status in ('dihitung', 'disetujui', 'dibayar')),
  unique (perjanjian_id, bulan)
);

create table penarikan (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investor(id),
  jumlah bigint not null check (jumlah > 0),
  status text not null default 'diajukan' check (status in ('diajukan', 'diproses', 'selesai', 'gagal')),
  xendit_disbursement_id text unique,
  dibuat_pada timestamptz not null default now()
);

create table settlement_xendit (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  xendit_id text not null unique,
  jumlah_kotor bigint not null,
  biaya bigint not null,
  jumlah_bersih bigint not null,
  cocok boolean,
  pembayaran_id uuid references pembayaran(id)
);

create table pengajuan_beli (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,                       -- PB-021
  cabang_id uuid not null references cabang(id),
  barang text not null,
  jumlah int not null default 1,
  perkiraan_nilai bigint,
  sumber_dana text check (sumber_dana in ('kas', 'leasing', 'mitra')),
  alasan text not null,
  status text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'dibeli', 'diterima', 'ditolak')),
  diajukan_oleh uuid references pengguna(id),
  dibuat_pada timestamptz not null default now()
);

create table komisi_staf (
  pengguna_id uuid not null references pengguna(id),
  bulan date not null,
  poin int not null,
  nilai_poin bigint not null,
  bonus bigint not null default 0,
  total bigint generated always as (greatest(poin, 0) * nilai_poin + bonus) stored,
  status text not null default 'dihitung' check (status in ('dihitung', 'disetujui', 'dibayar')),
  primary key (pengguna_id, bulan)
);
