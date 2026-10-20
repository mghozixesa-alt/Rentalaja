-- Rentalaja Web v2 · 07 · Sistem (sisa domain Sistem: notifikasi, webhook, audit, persetujuan)

create table notifikasi (
  id bigint generated always as identity primary key,
  kanal text not null check (kanal in ('whatsapp', 'email', 'push')),
  tujuan text not null,
  template text not null,                           -- konfirmasi_booking, h1_check_in, laporan_pagi, ...
  data jsonb not null default '{}',
  booking_id uuid references booking(id),
  status text not null default 'antre' check (status in ('antre', 'terkirim', 'gagal')),
  dibuat_pada timestamptz not null default now(),
  terkirim_pada timestamptz
);

create table webhook_log (
  id bigint generated always as identity primary key,
  sumber text not null check (sumber in ('xendit', 'whatsapp')),
  event_id text not null,
  payload jsonb not null,
  tanda_tangan_valid boolean not null,
  diproses boolean not null default false,
  diterima_pada timestamptz not null default now(),
  unique (sumber, event_id)                         -- webhook ganda diabaikan
);

create table audit_log (
  id bigint generated always as identity primary key,
  tabel text not null,
  baris_id text not null,
  aksi text not null check (aksi in ('insert', 'update', 'delete')),
  sebelum jsonb,
  sesudah jsonb,
  oleh uuid,
  waktu timestamptz not null default now()
);
create index on audit_log (tabel, baris_id);

create table persetujuan (
  id uuid primary key default gen_random_uuid(),
  jenis text not null,                              -- perjanjian_mitra, pembelian_aset, refund, diskon_manual, part, terbit_kamar, arsip_unit, komisi
  referensi_tabel text not null,
  referensi_id uuid not null,
  ringkasan text not null,
  diajukan_oleh uuid references pengguna(id),
  status status_persetujuan not null default 'menunggu',
  diputuskan_oleh uuid references pengguna(id),
  catatan text,
  dibuat_pada timestamptz not null default now(),
  diputuskan_pada timestamptz
);

-- audit_log tidak bisa diubah atau dihapus siapa pun
create or replace function tolak_ubah_audit() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log tidak bisa diubah atau dihapus';
end $$;
create trigger trg_audit_log_kunci before update or delete on audit_log for each row execute function tolak_ubah_audit();

-- Pencatat perubahan generik
create or replace function catat_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare
  rid text;
begin
  rid := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'kunci', '');
  insert into audit_log (tabel, baris_id, aksi, sebelum, sesudah, oleh)
  values (tg_table_name, rid, lower(tg_op),
          case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
          auth.uid());
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['tarif', 'produk', 'unit', 'promo', 'pengaturan', 'pembayaran', 'refund', 'pengguna',
                           'perjanjian_mitra', 'kepemilikan_unit', 'daftar_hitam', 'klaim', 'tutup_buku', 'bagi_hasil',
                           'persetujuan', 'cabang', 'hasil_qc', 'komisi_staf']
  loop
    execute format('create trigger trg_%s_audit after insert or update or delete on %I for each row execute function catat_audit()', t, t);
  end loop;
end $$;
