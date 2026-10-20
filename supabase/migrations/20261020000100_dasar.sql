-- Rentalaja Web v2 · 01 · Dasar: ekstensi, tipe status, fungsi umum
-- Semua uang disimpan dalam rupiah bulat (bigint). Semua waktu timestamptz (UTC), tampil WIB.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- Lini usaha
create type lini_usaha as enum ('hub', 'transportation', 'experience');

-- Peran pengguna
create type peran_pengguna as enum (
  'owner', 'keuangan', 'manajer_aset', 'manajer_experience', 'kepala_cabang',
  'cs', 'kasir', 'petugas_qc', 'teknisi', 'runner', 'sopir', 'cs_experience', 'mitra', 'pelanggan'
);

-- Status booking sewa barang dan penginapan
create type status_booking as enum (
  'draf', 'menunggu_verifikasi', 'menunggu_bayar', 'dikonfirmasi', 'dipakai',
  'selesai', 'ditolak', 'kedaluwarsa', 'batal'
);

-- Status unit (satu siklus untuk semua lini)
create type status_unit as enum (
  'draf', 'ready', 'dipesan', 'disewa', 'qc', 'servis', 'tunggu_part',
  'perlu_dibersihkan', 'tidak_aktif'
);

create type status_bayar as enum ('menunggu', 'lunas', 'gagal', 'kedaluwarsa', 'refund');
create type metode_bayar as enum ('qris', 'va', 'ewallet', 'tunai', 'transfer_manual', 'saldo');
create type jenis_bayar as enum ('dp', 'pelunasan', 'lunas', 'denda', 'klaim', 'ongkir', 'invoice');
create type status_wo as enum ('antre', 'dikerjakan', 'tunggu_part', 'qc', 'selesai', 'batal');
create type skema_bagi_hasil as enum ('per_unit', 'per_vendor', 'flat_bulanan', 'kemitraan_lokasi');
create type status_persetujuan as enum ('menunggu', 'disetujui', 'ditolak');

-- updated_at otomatis
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.diubah_pada := now();
  return new;
end $$;

-- Pembantu: pasang trigger updated_at ke sebuah tabel
create or replace function pasang_updated_at(nama regclass) returns void language plpgsql as $$
begin
  execute format('create trigger trg_%s_updated before update on %s for each row execute function set_updated_at()',
                 replace(nama::text, '.', '_'), nama);
end $$;

-- Stub auth untuk pengujian di luar Supabase (di Supabase skema auth sudah ada)
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    execute 'create schema auth';
    execute 'create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text)';
    execute 'create function auth.uid() returns uuid language sql stable as '
         || quote_literal('select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid');
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'create role authenticated nologin';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'create role anon nologin';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'create role service_role nologin bypassrls';
  end if;
end $$;
