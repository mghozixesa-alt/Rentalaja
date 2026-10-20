-- Rentalaja Web v2 · 08 · Aturan bisnis di database
-- Status booking dan status unit hanya bisa berubah lewat fungsi di file ini.
-- Aplikasi (web, panel cabang, teknisi) memanggil fungsi ini lewat supabase.rpc(...).

-- ---------- Pembantu peran ----------
create or replace function pengguna_saya() returns pengguna language sql stable security definer set search_path = public as $$
  select * from pengguna where id = auth.uid() and aktif
$$;

create or replace function peran_saya() returns peran_pengguna language sql stable security definer set search_path = public as $$
  select peran from pengguna where id = auth.uid() and aktif
$$;

create or replace function is_pusat() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select peran in ('owner', 'keuangan', 'manajer_aset') from pengguna where id = auth.uid() and aktif), false)
$$;

create or replace function is_staf() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select peran not in ('mitra', 'pelanggan') from pengguna where id = auth.uid() and aktif), false)
$$;

-- Boleh mengakses data cabang ini? Pusat: semua. CS/manajer Experience: semua cabang Experience. Lainnya: cabangnya sendiri.
create or replace function boleh_cabang(c uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when p.peran in ('owner', 'keuangan', 'manajer_aset') then true
      when p.peran in ('cs_experience', 'manajer_experience') then exists (select 1 from cabang where id = c and 'experience' = any(lini))
      else p.cabang_id = c
    end
    from pengguna p where p.id = auth.uid() and p.aktif), false)
$$;

create or replace function pelanggan_saya() returns uuid language sql stable security definer set search_path = public as $$
  select id from pelanggan where auth_id = auth.uid()
$$;

-- Panggilan dari server (service role / webhook) tidak punya auth.uid(): dianggap sistem
create or replace function is_sistem() returns boolean language sql stable as $$
  select auth.uid() is null
$$;

create or replace function wajib_peran(variadic daftar peran_pengguna[]) returns void language plpgsql stable security definer set search_path = public as $$
begin
  if is_sistem() then return; end if;
  if peran_saya() is null or not (peran_saya() = any(daftar) or peran_saya() = 'owner') then
    raise exception 'Akses ditolak: butuh peran %', array_to_string(daftar, ', ') using errcode = '42501';
  end if;
end $$;

create or replace function nilai_pengaturan(k text) returns jsonb language sql stable security definer set search_path = public as $$
  select nilai from pengaturan where kunci = k
$$;

-- ---------- Penjaga: status hanya berubah lewat fungsi ----------
create or replace function izinkan_ubah_status() returns void language plpgsql as $$
begin
  perform set_config('rentalaja.ubah_status', 'on', true);
end $$;

create or replace function jaga_status() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and coalesce(current_setting('rentalaja.ubah_status', true), '') <> 'on' then
    raise exception 'Status % tidak bisa diubah langsung; gunakan fungsi aturan', tg_table_name using errcode = '42501';
  end if;
  return new;
end $$;
create trigger trg_unit_jaga_status before update of status on unit for each row execute function jaga_status();
create trigger trg_booking_jaga_status before update of status on booking for each row execute function jaga_status();

-- ---------- Kode booking ----------
create sequence urut_booking;
create sequence urut_wo start 1050;
create sequence urut_klaim start 35;

create or replace function buat_kode(prefix text, urut bigint) returns text language sql stable as $$
  select prefix || '-' || to_char(now() at time zone 'Asia/Jakarta', 'YYMM') || '-' || lpad(urut::text, 4, '0')
$$;

-- ---------- Ketersediaan ----------
-- Jumlah unit produk yang bebas di rentang waktu, untuk katalog publik
create or replace function cek_ketersediaan(p_produk uuid, p_cabang uuid, p_mulai timestamptz, p_selesai timestamptz)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from unit u
  where u.produk_id = p_produk and u.cabang_id = p_cabang
    and u.status not in ('draf', 'tidak_aktif')
    and not exists (select 1 from ketersediaan k where k.unit_id = u.id and k.rentang && tstzrange(p_mulai, p_selesai))
$$;

-- Kunci unit untuk setiap item booking. Gagal bila ada item tanpa unit bebas (tidak ada sewa ganda).
create or replace function kunci_unit(p_booking uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  b booking; it record; u uuid;
begin
  select * into b from booking where id = p_booking for update;
  for it in select bi.*, pr.jenis_layanan, pr.kategori_id from booking_item bi join produk pr on pr.id = bi.produk_id
            where bi.booking_id = p_booking and bi.unit_id is null loop
    -- trip: semua paket di kategori yang sama memakai kendaraan yang sama (1 Jeep untuk banyak paket)
    select un.id into u from unit un join produk up on up.id = un.produk_id
    where (un.produk_id = it.produk_id or (it.jenis_layanan = 'trip' and up.jenis_layanan = 'trip' and up.kategori_id = it.kategori_id))
      and un.cabang_id = b.cabang_id and un.status not in ('draf', 'tidak_aktif')
      and not exists (select 1 from ketersediaan k where k.unit_id = un.id and k.rentang && tstzrange(b.mulai, b.selesai))
    order by un.nama
    limit 1 for update skip locked;
    if u is null then
      raise exception 'Unit habis untuk tanggal ini' using errcode = 'P0001';
    end if;
    insert into ketersediaan (unit_id, rentang, alasan, booking_id) values (u, tstzrange(b.mulai, b.selesai), 'booking', p_booking);
    update booking_item set unit_id = u where id = it.id;
  end loop;
end $$;

create or replace function lepas_unit(p_booking uuid) returns void language sql security definer set search_path = public as $$
  delete from ketersediaan where booking_id = p_booking
$$;

-- ---------- Siklus status booking ----------
create or replace function ubah_status_booking(p_booking uuid, p_baru status_booking, p_catatan text default null)
returns booking language plpgsql security definer set search_path = public as $$
declare
  b booking; boleh boolean; v_lama boolean; v_gc text;
begin
  select * into b from booking where id = p_booking for update;
  if b.id is null then raise exception 'Booking tidak ditemukan'; end if;
  if not is_sistem() and not boleh_cabang(b.cabang_id) and b.pelanggan_id is distinct from pelanggan_saya() then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;

  boleh := case b.status
    when 'draf' then (p_baru = 'menunggu_verifikasi' and b.lini <> 'experience')
                  or (p_baru = 'menunggu_bayar' and b.lini = 'experience')   -- penginapan: tanpa KTP, tanpa antre verifikasi
                  or p_baru = 'batal'
    when 'menunggu_verifikasi' then p_baru in ('menunggu_bayar', 'ditolak', 'batal') or (p_baru = 'dikonfirmasi' and b.dp_wajib = 0)
    when 'menunggu_bayar' then p_baru in ('dikonfirmasi', 'kedaluwarsa', 'batal')
    when 'dikonfirmasi' then p_baru in ('dipakai', 'batal')
    when 'dipakai' then p_baru in ('selesai')
    else false end;
  if not boleh then
    raise exception 'Status tidak bisa berpindah dari % ke %', b.status, p_baru using errcode = 'P0001';
  end if;

  -- siapa boleh melakukan apa
  if not is_sistem() and peran_saya() is null then
    -- pelanggan hanya boleh mengirim booking dan membatalkan sebelum unit diserahkan
    if not (b.status = 'draf' or p_baru = 'batal') then
      raise exception 'Akses ditolak' using errcode = '42501';
    end if;
    -- Experience (penginapan dan trip Jeep): tidak ada pembatalan setelah dibayar; yang boleh hanya ubah tanggal sekali
    if p_baru = 'batal' and b.lini = 'experience' and b.status = 'dikonfirmasi' then
      raise exception 'Booking Experience yang sudah dibayar tidak bisa dibatalkan. Tanggal bisa diubah sekali, paling lambat H-3.' using errcode = 'P0001';
    end if;
  elsif p_baru = 'batal' and b.lini = 'experience' and b.status = 'dikonfirmasi' then
    perform wajib_peran('manajer_experience');          -- pengecualian (bencana, rumah rusak) diputuskan manajer
  elsif b.status = 'menunggu_verifikasi' and p_baru in ('menunggu_bayar', 'ditolak', 'dikonfirmasi') then
    perform wajib_peran('cs', 'kepala_cabang');
    -- Pelanggan baru wajib dicek GetContact dulu; hasil "waspada" hanya bisa disetujui kepala cabang
    if p_baru <> 'ditolak' then
      select terverifikasi into v_lama from pelanggan where id = b.pelanggan_id;
      if not coalesce(v_lama, false) then
        select hasil into v_gc from cek_getcontact where booking_id = b.id order by dibuat_pada desc limit 1;
        if v_gc is null then
          raise exception 'Cek GetContact dulu untuk pelanggan baru' using errcode = 'P0001';
        end if;
        if v_gc = 'waspada' and peran_saya() not in ('kepala_cabang', 'owner') then
          raise exception 'Ada tanda bahaya di GetContact: hanya kepala cabang yang bisa menyetujui' using errcode = '42501';
        end if;
      end if;
    end if;
  elsif p_baru in ('dipakai', 'selesai') then
    perform wajib_peran('cs', 'kasir', 'kepala_cabang', 'runner', 'sopir', 'cs_experience', 'manajer_experience');
  elsif p_baru = 'dikonfirmasi' then
    perform wajib_peran('kasir', 'kepala_cabang');     -- tunai di kasir; online lewat webhook (sistem)
  end if;

  perform izinkan_ubah_status();
  if p_baru = 'menunggu_verifikasi' or (b.status = 'draf' and p_baru = 'menunggu_bayar') then
    perform kunci_unit(p_booking);
  end if;
  if p_baru = 'menunggu_bayar' then
    update booking set batas_bayar = now() + make_interval(mins => coalesce((nilai_pengaturan('batas_bayar_menit'))::int, 20)) where id = p_booking;
  end if;
  if p_baru in ('ditolak', 'kedaluwarsa', 'batal') then
    perform lepas_unit(p_booking);
  end if;

  update booking set status = p_baru, catatan = coalesce(p_catatan, catatan) where id = p_booking returning * into b;
  insert into notifikasi (kanal, tujuan, template, data, booking_id)
  select 'whatsapp', pl.nomor_wa, 'status_' || p_baru::text, jsonb_build_object('kode', b.kode), b.id from pelanggan pl where pl.id = b.pelanggan_id;
  return b;
end $$;

-- ---------- Pembayaran (dipanggil dari webhook Xendit, idempoten) ----------
create or replace function catat_pembayaran_lunas(p_xendit_id text, p_jumlah bigint) returns pembayaran
language plpgsql security definer set search_path = public as $$
declare
  p pembayaran; b booking; terbayar bigint;
begin
  select * into p from pembayaran where xendit_id = p_xendit_id for update;
  if p.id is null then raise exception 'Pembayaran % tidak dikenal', p_xendit_id; end if;
  if p.status = 'lunas' then return p; end if;                     -- webhook ganda: abaikan
  if p_jumlah <> p.jumlah then raise exception 'Jumlah tidak cocok: % vs %', p_jumlah, p.jumlah; end if;
  update pembayaran set status = 'lunas', dibayar_pada = now() where id = p.id returning * into p;

  if p.booking_id is not null then
    select * into b from booking where id = p.booking_id;
    select coalesce(sum(jumlah), 0) into terbayar from pembayaran where booking_id = b.id and status = 'lunas';
    if b.status = 'menunggu_bayar' and terbayar >= b.dp_wajib then
      perform ubah_status_booking(b.id, 'dikonfirmasi', null);
    end if;
  end if;
  if p.tagihan_id is not null then
    update tagihan set status = 'lunas' where id = p.tagihan_id;
  end if;
  return p;
end $$;

-- ---------- Serah-terima dan pengembalian ----------
create or replace function serahkan_unit(p_booking uuid, p_km int default null) returns void
language plpgsql security definer set search_path = public as $$
declare it record; b booking;
begin
  select * into b from booking where id = p_booking;
  perform ubah_status_booking(p_booking, 'dipakai', null);
  perform izinkan_ubah_status();
  for it in select bi.unit_id, pr.jenis_layanan from booking_item bi join produk pr on pr.id = bi.produk_id where bi.booking_id = p_booking loop
    update unit set status = 'disewa', km_terakhir = coalesce(p_km, km_terakhir) where id = it.unit_id;
    insert into serah_terima (booking_id, unit_id, arah, oleh, km, ktp_ditahan)
    values (p_booking, it.unit_id, case when it.jenis_layanan = 'penginapan' then 'check_in' else 'serah' end, auth.uid(), p_km, b.lini <> 'experience');
  end loop;
end $$;

-- Denda telat: 15% tarif harian per jam (dibulatkan ke atas), maksimal 1 hari tarif per unit.
create or replace function hitung_denda(p_booking uuid, p_waktu timestamptz) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(least(
           ceil(extract(epoch from (p_waktu - b.selesai)) / 3600.0)::bigint
             * round(bi.harga_satuan * coalesce((nilai_pengaturan('denda_persen_per_jam'))::numeric, 15) / 100),
           bi.harga_satuan)), 0)::bigint
  from booking b join booking_item bi on bi.booking_id = b.id
  where b.id = p_booking and p_waktu > b.selesai and b.lini <> 'experience'
$$;

create or replace function terima_kembali(p_booking uuid, p_km int default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare it record; b booking; denda bigint; telat int;
begin
  select * into b from booking where id = p_booking;
  denda := hitung_denda(p_booking, now());
  telat := greatest(0, ceil(extract(epoch from (now() - b.selesai)) / 60))::int;
  perform ubah_status_booking(p_booking, 'selesai', null);
  perform izinkan_ubah_status();
  for it in select bi.unit_id, pr.jenis_layanan from booking_item bi join produk pr on pr.id = bi.produk_id where bi.booking_id = p_booking loop
    if it.jenis_layanan = 'penginapan' then
      update unit set status = 'perlu_dibersihkan' where id = it.unit_id;
      insert into housekeeping (unit_id, booking_id) values (it.unit_id, p_booking);
    elsif it.jenis_layanan = 'trip' then
      update unit set status = 'ready', km_terakhir = coalesce(p_km, km_terakhir) where id = it.unit_id;   -- Jeep kembali dengan sopir sendiri
    else
      update unit set status = 'qc', km_terakhir = coalesce(p_km, km_terakhir) where id = it.unit_id;
    end if;
    insert into serah_terima (booking_id, unit_id, arah, oleh, km, telat_menit, denda)
    values (p_booking, it.unit_id, case when it.jenis_layanan = 'penginapan' then 'check_out' else 'kembali' end, auth.uid(), p_km, telat, 0);
  end loop;
  -- ketersediaan setelah hari ini tidak dibutuhkan lagi
  update ketersediaan set rentang = tstzrange(lower(rentang), greatest(now(), lower(rentang) + interval '1 minute'))
  where booking_id = p_booking and upper(rentang) > now();
  if denda > 0 then
    insert into tagihan (nomor, booking_id, pelanggan_id, jenis, jumlah, jatuh_tempo)
    values (buat_kode('DN', nextval('urut_klaim')), p_booking, b.pelanggan_id, 'denda', denda, current_date);
  end if;
  return denda;
end $$;

-- ---------- Quality control ----------
-- Siapa yang boleh QC diatur per cabang (cabang.mode_qc): petugas QC khusus, kepala cabang, atau CS senior yang ditunjuk.
-- Kepala cabang selalu boleh sebagai cadangan.
create or replace function boleh_qc(p_cabang uuid) returns boolean language sql stable security definer set search_path = public as $$
  select is_sistem() or coalesce((
    select p.peran = 'owner'
        or (p.cabang_id = c.id and (
              p.peran = 'kepala_cabang'
           or (c.mode_qc = 'petugas_qc' and p.peran = 'petugas_qc')
           or (c.mode_qc = 'cs_ditunjuk' and p.peran = 'cs' and p.boleh_qc)))
    from pengguna p, cabang c where p.id = auth.uid() and p.aktif and c.id = p_cabang), false)
$$;

create or replace function simpan_hasil_qc(p_unit uuid, p_poin jsonb, p_lolos boolean, p_catatan text default null)
returns hasil_qc language plpgsql security definer set search_path = public as $$
declare
  u unit; h hasil_qc; wo_terakhir work_order; wo_baru uuid; semua_lolos boolean;
begin
  select * into u from unit where id = p_unit for update;
  if not boleh_qc(u.cabang_id) then
    raise exception 'Anda tidak ditugaskan melakukan QC di cabang ini' using errcode = '42501';
  end if;
  if u.status not in ('qc', 'draf') then raise exception 'Unit % tidak sedang menunggu QC (status %)', u.nama, u.status; end if;
  select * into wo_terakhir from work_order where unit_id = p_unit order by dibuat_pada desc limit 1;
  if wo_terakhir.teknisi_id is not null and wo_terakhir.teknisi_id = auth.uid() and wo_terakhir.status = 'qc' then
    raise exception 'Teknisi tidak boleh meloloskan pekerjaannya sendiri' using errcode = '42501';
  end if;
  select coalesce(bool_and((x->>'lolos')::boolean), false) into semua_lolos from jsonb_array_elements(p_poin) x;
  if p_lolos and not semua_lolos then raise exception 'Semua poin cek harus lolos untuk meloloskan unit'; end if;

  perform izinkan_ubah_status();
  if p_lolos then
    update unit set status = 'ready' where id = p_unit;
    if wo_terakhir.status = 'qc' then update work_order set status = 'selesai', selesai_pada = now() where id = wo_terakhir.id; end if;
  else
    update unit set status = 'servis' where id = p_unit;
    insert into work_order (nomor, unit_id, cabang_id, sumber, keluhan)
    values ('WO-' || nextval('urut_wo'), p_unit, u.cabang_id, 'gagal_qc', coalesce(p_catatan, 'Gagal QC'))
    returning id into wo_baru;
  end if;
  insert into hasil_qc (unit_id, sumber, work_order_id, petugas_id, poin, lolos, catatan, work_order_baru_id)
  values (p_unit, case when u.status = 'draf' then 'unit_baru' when wo_terakhir.status = 'qc' then 'servis' else 'pengembalian' end,
          case when wo_terakhir.status = 'qc' then wo_terakhir.id end,
          coalesce(auth.uid(), (select id from pengguna where peran = 'owner' limit 1)), p_poin, p_lolos, p_catatan, wo_baru)
  returning * into h;
  return h;
end $$;

-- ---------- Work order ----------
create or replace function buat_work_order(p_unit uuid, p_sumber text, p_keluhan text) returns work_order
language plpgsql security definer set search_path = public as $$
declare u unit; w work_order;
begin
  perform wajib_peran('teknisi', 'kepala_cabang', 'cs', 'petugas_qc');
  select * into u from unit where id = p_unit for update;
  perform izinkan_ubah_status();
  update unit set status = 'servis' where id = p_unit;
  insert into work_order (nomor, unit_id, cabang_id, sumber, keluhan, teknisi_id, km_masuk)
  values ('WO-' || nextval('urut_wo'), p_unit, u.cabang_id, p_sumber, p_keluhan,
          case when peran_saya() = 'teknisi' then auth.uid() end, u.km_terakhir)
  returning * into w;
  return w;
end $$;

create or replace function ubah_status_wo(p_wo uuid, p_baru status_wo) returns work_order
language plpgsql security definer set search_path = public as $$
declare w work_order; biaya bigint;
begin
  perform wajib_peran('teknisi', 'kepala_cabang');
  select * into w from work_order where id = p_wo for update;
  if not (w.status = 'antre' and p_baru = 'dikerjakan'
       or w.status = 'dikerjakan' and p_baru in ('tunggu_part', 'qc')
       or w.status = 'tunggu_part' and p_baru = 'dikerjakan') then
    raise exception 'Work order tidak bisa berpindah dari % ke %', w.status, p_baru;
  end if;
  perform izinkan_ubah_status();
  if p_baru = 'dikerjakan' and w.teknisi_id is null then
    update work_order set teknisi_id = auth.uid() where id = p_wo;
  end if;
  update unit set status = case p_baru when 'tunggu_part' then 'tunggu_part'::status_unit when 'qc' then 'qc'::status_unit else 'servis'::status_unit end
  where id = w.unit_id;
  if p_baru = 'qc' then
    select coalesce(sum(harga * jumlah), 0) into biaya from work_order_item where work_order_id = p_wo;
    update work_order set biaya_total = biaya where id = p_wo;
    if biaya > 0 then
      insert into biaya_unit (unit_id, tanggal, jenis, jumlah, work_order_id) values (w.unit_id, current_date, 'servis', biaya, p_wo);
    end if;
  end if;
  update work_order set status = p_baru where id = p_wo returning * into w;
  return w;
end $$;

-- Part yang dipakai langsung mengurangi stok cabang
create or replace function kurangi_stok_part() returns trigger language plpgsql as $$
begin
  if new.stok_part_id is not null then
    update stok_part set jumlah = jumlah - new.jumlah where id = new.stok_part_id;
  end if;
  return new;
end $$;
create trigger trg_wo_item_stok after insert on work_order_item for each row execute function kurangi_stok_part();

-- ---------- Penginapan ----------
create or replace function kamar_siap(p_unit uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  perform wajib_peran('cs_experience', 'manajer_experience');
  perform izinkan_ubah_status();
  update unit set status = 'ready' where id = p_unit and status = 'perlu_dibersihkan';
  update housekeeping set status = 'siap', siap_pada = now(), petugas_id = auth.uid() where unit_id = p_unit and status <> 'siap';
end $$;

-- ---------- Arsip, pulihkan, hapus unit ----------
create or replace function arsipkan_unit(p_unit uuid, p_alasan text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform wajib_peran('manajer_aset');
  if exists (select 1 from ketersediaan where unit_id = p_unit and upper(rentang) > now() and alasan = 'booking') then
    raise exception 'Pindahkan dulu booking yang akan datang sebelum mengarsipkan unit';
  end if;
  perform izinkan_ubah_status();
  update unit set status = 'tidak_aktif', alasan_arsip = p_alasan where id = p_unit;
end $$;

create or replace function hapus_unit(p_unit uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  perform wajib_peran('owner');
  if exists (select 1 from booking_item where unit_id = p_unit) or exists (select 1 from unit where id = p_unit and status <> 'draf') then
    raise exception 'Unit sudah pernah dipakai transaksi; arsipkan saja';
  end if;
  delete from unit where id = p_unit;
end $$;

-- ---------- Tutup buku: bulan yang dikunci tidak bisa diubah ----------
create or replace function jaga_tutup_buku() returns trigger language plpgsql as $$
declare tgl date;
begin
  tgl := coalesce(to_jsonb(new)->>'tanggal', to_jsonb(new)->>'bulan', to_jsonb(old)->>'tanggal', to_jsonb(old)->>'bulan')::date;
  if exists (select 1 from tutup_buku where bulan = date_trunc('month', tgl)::date and dikunci_pada is not null) then
    raise exception 'Bulan % sudah ditutup; koreksi masuk bulan berikutnya', to_char(tgl, 'MM/YYYY');
  end if;
  return coalesce(new, old);
end $$;
create trigger trg_pendapatan_tutup before insert or update or delete on pendapatan_unit_harian for each row execute function jaga_tutup_buku();
create trigger trg_biaya_unit_tutup before insert or update or delete on biaya_unit for each row execute function jaga_tutup_buku();
create trigger trg_biaya_ops_tutup before insert or update or delete on biaya_operasional for each row execute function jaga_tutup_buku();

create or replace function kunci_bulan(p_bulan date) returns void language plpgsql security definer set search_path = public as $$
begin
  perform wajib_peran('keuangan');
  insert into tutup_buku (bulan, dikunci_oleh, dikunci_pada) values (date_trunc('month', p_bulan)::date, auth.uid(), now())
  on conflict (bulan) do update set dikunci_oleh = excluded.dikunci_oleh, dikunci_pada = excluded.dikunci_pada
  where tutup_buku.dikunci_pada is null;
end $$;

-- ---------- Persetujuan ----------
create or replace function putuskan_persetujuan(p_id uuid, p_setuju boolean, p_catatan text default null) returns persetujuan
language plpgsql security definer set search_path = public as $$
declare r persetujuan;
begin
  perform wajib_peran('keuangan');
  update persetujuan set status = case when p_setuju then 'disetujui'::status_persetujuan else 'ditolak'::status_persetujuan end,
         diputuskan_oleh = auth.uid(), diputuskan_pada = now(), catatan = p_catatan
  where id = p_id and status = 'menunggu' returning * into r;
  if r.id is null then raise exception 'Persetujuan tidak ditemukan atau sudah diputuskan'; end if;
  if r.jenis = 'perjanjian_mitra' then
    update perjanjian_mitra set status = r.status where id = r.referensi_id;
  elsif r.jenis = 'pembelian_aset' then
    update pengajuan_beli set status = case when p_setuju then 'disetujui' else 'ditolak' end where id = r.referensi_id;
  elsif r.jenis = 'refund' then
    update refund set status = case when p_setuju then 'diproses' else 'ditolak' end where id = r.referensi_id;
  end if;
  return r;
end $$;

-- ---------- Experience: konfirmasi sopir Jeep dan ubah tanggal ----------
create or replace function booking_trip(p_booking uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from booking_item bi join produk p on p.id = bi.produk_id where bi.booking_id = p_booking and p.jenis_layanan = 'trip')
$$;

-- Penjaga kolom Experience + alur konfirmasi sopir:
--  · DP trip Jeep lunas → konfirmasi_sopir = menunggu, batas 2 jam, sopir dikabari lewat WhatsApp
--  · trip tidak bisa berangkat sebelum sopir menerima
create or replace function jaga_booking_experience() returns trigger language plpgsql security definer set search_path = public as $$
declare jam int;
begin
  if (new.konfirmasi_sopir is distinct from old.konfirmasi_sopir
      or new.batas_konfirmasi_sopir is distinct from old.batas_konfirmasi_sopir
      or new.jumlah_ubah_tanggal is distinct from old.jumlah_ubah_tanggal
      or (old.lini = 'experience' and old.status not in ('draf', 'menunggu_bayar')
          and (new.mulai is distinct from old.mulai or new.selesai is distinct from old.selesai)))
     and coalesce(current_setting('rentalaja.ubah_status', true), '') <> 'on' then
    raise exception 'Konfirmasi sopir dan tanggal booking Experience hanya bisa diubah lewat fungsi' using errcode = '42501';
  end if;

  if new.status = 'dikonfirmasi' and old.status is distinct from 'dikonfirmasi' and booking_trip(new.id) then
    jam := coalesce((nilai_pengaturan('jeep')->>'konfirmasi_sopir_jam')::int, 2);
    new.konfirmasi_sopir := 'menunggu';
    new.batas_konfirmasi_sopir := now() + make_interval(hours => jam);
    insert into notifikasi (kanal, tujuan, template, data, booking_id)
    select 'whatsapp', s.nomor_wa, 'jeep_trip_baru',
           jsonb_build_object('kode', new.kode, 'mulai', new.mulai, 'tamu', new.jumlah_tamu, 'jemput', new.titik_jemput, 'batas', new.batas_konfirmasi_sopir), new.id
    from pengguna s
    where s.peran = 'sopir' and s.aktif and s.nomor_wa is not null
      and (s.id = new.sopir_id or (new.sopir_id is null and s.cabang_id = new.cabang_id));
  end if;

  if new.status = 'dipakai' and old.status is distinct from 'dipakai' and booking_trip(new.id)
     and new.konfirmasi_sopir is distinct from 'diterima' then
    raise exception 'Trip belum diterima sopir' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger trg_booking_experience before update on booking for each row execute function jaga_booking_experience();

-- Sopir menjawab trip baru (dari aplikasi sopir, atau balasan TERIMA/TOLAK di WhatsApp lewat webhook).
create or replace function konfirmasi_trip(p_booking uuid, p_terima boolean, p_alasan text default null) returns booking
language plpgsql security definer set search_path = public as $$
declare b booking; s pengguna;
begin
  perform wajib_peran('sopir', 'cs_experience', 'manajer_experience');
  select * into b from booking where id = p_booking for update;
  if b.id is null or not (is_sistem() or boleh_cabang(b.cabang_id)) then raise exception 'Booking tidak ditemukan'; end if;
  if b.konfirmasi_sopir is distinct from 'menunggu' then
    raise exception 'Trip % tidak sedang menunggu konfirmasi sopir', b.kode using errcode = 'P0001';
  end if;
  if peran_saya() = 'sopir' and b.sopir_id is not null and b.sopir_id <> auth.uid() then
    raise exception 'Trip ini dijadwalkan untuk sopir lain' using errcode = '42501';
  end if;

  perform izinkan_ubah_status();
  update booking set konfirmasi_sopir = case when p_terima then 'diterima' else 'ditolak' end,
                     batas_konfirmasi_sopir = null,
                     sopir_id = case when p_terima and peran_saya() = 'sopir' then auth.uid() else sopir_id end,
                     catatan = coalesce(p_alasan, catatan)
  where id = p_booking returning * into b;

  if p_terima then
    select * into s from pengguna where id = b.sopir_id;
    insert into notifikasi (kanal, tujuan, template, data, booking_id)
    select 'whatsapp', pl.nomor_wa, 'jeep_terkonfirmasi',
           jsonb_build_object('kode', b.kode, 'sopir', s.nama, 'nomor_sopir', s.nomor_wa, 'mulai', b.mulai, 'jemput', b.titik_jemput), b.id
    from pelanggan pl where pl.id = b.pelanggan_id;
  else
    insert into notifikasi (kanal, tujuan, template, data, booking_id)
    select 'whatsapp', c.nomor_wa, 'jeep_ditolak_sopir', jsonb_build_object('kode', b.kode, 'alasan', p_alasan), b.id
    from pengguna c where c.peran = 'cs_experience' and c.aktif and c.nomor_wa is not null;
  end if;
  return b;
end $$;

-- Dijalankan cron tiap 10 menit: trip yang belum dijawab sopir sampai batas → CS Experience diberi tahu.
create or replace function tandai_konfirmasi_sopir_lewat() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not is_sistem() then perform wajib_peran('manajer_experience'); end if;
  perform izinkan_ubah_status();
  with lewat as (
    update booking set batas_konfirmasi_sopir = null
    where konfirmasi_sopir = 'menunggu' and batas_konfirmasi_sopir < now()
    returning id, kode
  ), kirim as (
    insert into notifikasi (kanal, tujuan, template, data, booking_id)
    select 'whatsapp', c.nomor_wa, 'jeep_sopir_belum_jawab', jsonb_build_object('kode', l.kode), l.id
    from lewat l cross join pengguna c where c.peran = 'cs_experience' and c.aktif and c.nomor_wa is not null
    returning 1
  )
  select count(*) into n from lewat;
  return n;
end $$;

-- Experience tidak bisa dibatalkan; pelanggan boleh mengubah tanggal sekali, paling lambat H-3, dengan lama menginap/trip yang sama.
-- CS Experience boleh mengubah kapan saja (mis. trip Jeep dijadwal ulang karena cuaca atau sopir berhalangan).
create or replace function ubah_tanggal_experience(p_booking uuid, p_mulai timestamptz, p_selesai timestamptz) returns booking
language plpgsql security definer set search_path = public as $$
declare
  b booking; staf boolean; aturan jsonb := coalesce(nilai_pengaturan('pembatalan_experience'), '{}');
begin
  staf := is_sistem() or coalesce(peran_saya() in ('cs_experience', 'manajer_experience', 'owner'), false);
  select * into b from booking where id = p_booking for update;
  if b.id is null or not (staf or b.pelanggan_id = pelanggan_saya()) or (staf and not is_sistem() and not boleh_cabang(b.cabang_id)) then
    raise exception 'Booking tidak ditemukan';
  end if;
  if b.lini <> 'experience' then raise exception 'Ubah tanggal ini khusus Experience; sewa barang memakai ubah jadwal biasa'; end if;
  if b.status <> 'dikonfirmasi' then raise exception 'Hanya booking yang sudah dibayar dan belum dimulai yang bisa diubah tanggalnya'; end if;
  if not staf then
    if b.jumlah_ubah_tanggal >= coalesce((aturan->>'ubah_tanggal_maks')::int, 1) then
      raise exception 'Tanggal booking ini sudah pernah diubah' using errcode = 'P0001';
    end if;
    if now() > b.mulai - make_interval(days => coalesce((aturan->>'ubah_tanggal_paling_lambat_hari')::int, 3)) then
      raise exception 'Tanggal hanya bisa diubah paling lambat H-%', coalesce((aturan->>'ubah_tanggal_paling_lambat_hari')::int, 3) using errcode = 'P0001';
    end if;
    if p_selesai - p_mulai <> b.selesai - b.mulai then
      raise exception 'Lama menginap atau trip harus sama; untuk menambah malam buat booking baru' using errcode = 'P0001';
    end if;
  end if;

  perform izinkan_ubah_status();
  perform lepas_unit(p_booking);
  update booking_item set unit_id = null where booking_id = p_booking;
  update booking set mulai = p_mulai, selesai = p_selesai,
                     jumlah_ubah_tanggal = jumlah_ubah_tanggal + case when staf then 0 else 1 end,
                     konfirmasi_sopir = case when booking_trip(id) then 'menunggu' else konfirmasi_sopir end,
                     batas_konfirmasi_sopir = case when booking_trip(id) then now() + make_interval(hours => coalesce((nilai_pengaturan('jeep')->>'konfirmasi_sopir_jam')::int, 2)) else batas_konfirmasi_sopir end
  where id = p_booking returning * into b;
  perform kunci_unit(p_booking);                       -- gagal = seluruh perubahan dibatalkan, tanggal lama tetap terkunci

  insert into notifikasi (kanal, tujuan, template, data, booking_id)
  select 'whatsapp', pl.nomor_wa, 'tanggal_diubah', jsonb_build_object('kode', b.kode, 'mulai', b.mulai, 'selesai', b.selesai), b.id
  from pelanggan pl where pl.id = b.pelanggan_id;
  if booking_trip(b.id) then
    insert into notifikasi (kanal, tujuan, template, data, booking_id)
    select 'whatsapp', s.nomor_wa, 'jeep_trip_baru', jsonb_build_object('kode', b.kode, 'mulai', b.mulai, 'tamu', b.jumlah_tamu, 'jemput', b.titik_jemput), b.id
    from pengguna s where s.peran = 'sopir' and s.aktif and s.nomor_wa is not null
      and (s.id = b.sopir_id or (b.sopir_id is null and s.cabang_id = b.cabang_id));
  end if;
  return b;
end $$;
