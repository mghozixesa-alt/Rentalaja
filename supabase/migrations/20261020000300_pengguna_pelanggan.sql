-- Rentalaja Web v2 · 03 · Pengguna dan peran (domain Sistem, dibuat lebih awal karena dirujuk tabel lain)
--                      + Pelanggan (6 tabel)

create table pengguna (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  nomor_wa text,
  peran peran_pengguna not null,
  cabang_id uuid references cabang(id),            -- null = semua cabang (owner, keuangan)
  aktif boolean not null default true,
  boleh_qc boolean not null default false,          -- CS senior yang ditunjuk QC (cabang dengan mode_qc = cs_ditunjuk)
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now()
);

create table peran_izin (
  peran peran_pengguna not null,
  izin text not null,                               -- mis. 'unit.arsip', 'booking.verifikasi', 'tutup_buku.kunci'
  primary key (peran, izin)
);

-- ---------- Pelanggan ----------
create table pelanggan (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null,
  nama text not null,
  nomor_wa text not null unique,
  email text,
  level text not null default 'reguler' check (level in ('reguler', 'langganan', 'prioritas')),
  saldo_poin int not null default 0,
  saldo_rupiah bigint not null default 0,          -- selisih ubah tanggal penginapan, refund ke saldo
  terverifikasi boolean not null default false,    -- KTP + KK sudah lolos sekali
  kode_rujukan text unique,
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now()
);

create table dokumen (
  id uuid primary key default gen_random_uuid(),
  pelanggan_id uuid not null references pelanggan(id) on delete cascade,
  jenis text not null check (jenis in ('ktp', 'kk', 'sim_c', 'lainnya')),
  path_storage text not null,                       -- bucket privat, akses lewat link sementara
  nik_terenkripsi bytea,                            -- tampil hanya 4 digit terakhir
  nik_4_akhir text,
  status text not null default 'menunggu' check (status in ('menunggu', 'lolos', 'ditolak')),
  alasan_tolak text,
  diperiksa_oleh uuid references pengguna(id),
  diunggah_pada timestamptz not null default now(),
  diperiksa_pada timestamptz,
  hapus_setelah date                                -- masa simpan sesuai UU PDP
);

create table poin_mutasi (
  id bigint generated always as identity primary key,
  pelanggan_id uuid not null references pelanggan(id) on delete cascade,
  jumlah int not null,                              -- + dapat, - pakai / sanksi
  alasan text not null,                             -- sewa, tepat_waktu, ulasan_foto, rujukan, tukar, no_show
  booking_id uuid,
  kedaluwarsa date,
  dibuat_pada timestamptz not null default now()
);

create table pelanggaran (
  id uuid primary key default gen_random_uuid(),
  pelanggan_id uuid not null references pelanggan(id) on delete cascade,
  jenis text not null check (jenis in ('no_show', 'telat', 'rusak', 'hilang', 'tidak_bayar_klaim')),
  booking_id uuid,
  catatan text,
  dibuat_pada timestamptz not null default now()
);

create table daftar_hitam (
  pelanggan_id uuid primary key references pelanggan(id) on delete cascade,
  alasan text not null,
  oleh uuid references pengguna(id),
  sejak timestamptz not null default now(),
  sampai timestamptz                                -- null = permanen
);

create table rujukan (
  id uuid primary key default gen_random_uuid(),
  pengajak_id uuid not null references pelanggan(id),
  diajak_id uuid not null unique references pelanggan(id),
  booking_pertama_id uuid,
  poin_diberikan boolean not null default false,
  dibuat_pada timestamptz not null default now()
);

select pasang_updated_at('pengguna');
select pasang_updated_at('pelanggan');
