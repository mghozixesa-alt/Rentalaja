-- Rentalaja Web v2 · 05 · Operasional cabang, bengkel, penginapan (14 tabel)

create table shift (
  id uuid primary key default gen_random_uuid(),
  cabang_id uuid not null references cabang(id),
  pengguna_id uuid not null references pengguna(id),
  mulai timestamptz not null default now(),
  selesai timestamptz,
  kas_awal bigint not null default 0
);
alter table pembayaran add constraint pembayaran_shift_fk foreign key (shift_id) references shift(id);

create table absensi (
  id uuid primary key default gen_random_uuid(),
  pengguna_id uuid not null references pengguna(id),
  cabang_id uuid not null references cabang(id),
  masuk timestamptz not null,
  keluar timestamptz,
  foto_masuk text,
  telat_menit int not null default 0
);

create table kas_shift (
  shift_id uuid primary key references shift(id),
  tunai_tercatat bigint not null,
  tunai_fisik bigint not null,
  selisih bigint generated always as (tunai_fisik - tunai_tercatat) stored,
  penjelasan text,
  ditutup_pada timestamptz not null default now()
);

create table serah_terima (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id),
  unit_id uuid not null references unit(id),
  arah text not null check (arah in ('serah', 'kembali', 'check_in', 'check_out')),
  oleh uuid references pengguna(id),
  km int, bensin text,
  ktp_ditahan boolean,
  catatan text,
  telat_menit int not null default 0,
  denda bigint not null default 0,
  waktu timestamptz not null default now()
);

create table foto_unit (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references unit(id) on delete cascade,
  serah_terima_id uuid references serah_terima(id),
  work_order_id uuid,
  hasil_qc_id uuid,
  sisi text,                                        -- depan, belakang, kiri, kanan, kerusakan
  path_storage text not null,
  diambil_pada timestamptz not null default now()
);

create table tugas_runner (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references booking(id),
  runner_id uuid references pengguna(id),
  jenis text not null check (jenis in ('antar', 'jemput')),
  jadwal timestamptz not null,
  alamat text not null,
  ongkir bigint not null default 0,                 -- 100% milik runner
  status text not null default 'terjadwal' check (status in ('terjadwal', 'jalan', 'selesai', 'batal')),
  selesai_pada timestamptz
);

create table laporan_kendala (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references booking(id),
  unit_id uuid references unit(id),
  pelapor text not null check (pelapor in ('pelanggan', 'staf')),
  isi text not null,
  foto text[],
  status text not null default 'baru' check (status in ('baru', 'ditangani', 'selesai')),
  dibuat_pada timestamptz not null default now()
);

create table mutasi_unit (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references unit(id),
  dari_cabang uuid not null references cabang(id),
  ke_cabang uuid not null references cabang(id),
  alasan text,
  diajukan_oleh uuid references pengguna(id),
  status text not null default 'diajukan' check (status in ('diajukan', 'dikirim', 'diterima', 'batal')),
  dibuat_pada timestamptz not null default now()
);

create table jadwal_perawatan (
  id uuid primary key default gen_random_uuid(),
  kategori_id uuid not null references kategori(id),
  pemicu_km int,                                    -- motor: 2000
  pemicu_hari int,                                  -- motor: 30, iPhone: 90
  pemicu_jumlah_sewa int,                           -- kamera: 20
  pekerjaan text not null,
  toleransi_km int,                                 -- lewat +300 km: blokir booking baru
  aktif boolean not null default true
);

create table work_order (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,                       -- WO-1043
  unit_id uuid not null references unit(id),
  cabang_id uuid not null references cabang(id),
  sumber text not null check (sumber in ('pengembalian', 'laporan_pelanggan', 'jadwal_berkala', 'temuan', 'gagal_qc')),
  keluhan text not null,
  teknisi_id uuid references pengguna(id),
  status status_wo not null default 'antre',
  target_selesai timestamptz,
  km_masuk int,
  biaya_total bigint not null default 0,
  booking_id uuid references booking(id),
  dibuat_pada timestamptz not null default now(),
  selesai_pada timestamptz
);
alter table foto_unit add constraint foto_unit_wo_fk foreign key (work_order_id) references work_order(id);

create table stok_part (
  id uuid primary key default gen_random_uuid(),
  cabang_id uuid not null references cabang(id),
  nama text not null,
  jumlah int not null default 0 check (jumlah >= 0),
  minimal int not null default 0,
  harga_satuan bigint not null default 0,
  unique (cabang_id, nama)
);

create table work_order_item (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_order(id) on delete cascade,
  jenis text not null check (jenis in ('part', 'jasa')),
  stok_part_id uuid references stok_part(id),
  nama text not null,
  jumlah int not null default 1,
  harga bigint not null
);

create table hasil_qc (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references unit(id),
  sumber text not null check (sumber in ('pengembalian', 'servis', 'unit_baru')),
  booking_id uuid references booking(id),
  work_order_id uuid references work_order(id),
  petugas_id uuid not null references pengguna(id),
  poin jsonb not null,                              -- [{"poin":"Rem pakem","lolos":true}]
  lolos boolean not null,
  catatan text,
  work_order_baru_id uuid references work_order(id),
  dibuat_pada timestamptz not null default now()
);
alter table foto_unit add constraint foto_unit_qc_fk foreign key (hasil_qc_id) references hasil_qc(id);

create table housekeeping (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references unit(id),        -- kamar penginapan
  booking_id uuid references booking(id),
  petugas_id uuid references pengguna(id),
  status text not null default 'perlu_dibersihkan' check (status in ('perlu_dibersihkan', 'sedang', 'siap')),
  catatan text,
  dibuat_pada timestamptz not null default now(),
  siap_pada timestamptz
);
