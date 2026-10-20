-- Rentalaja Web v2 · 10 · Fungsi untuk web: booking dihitung di server, harga katalog
-- Harga, diskon, dan DP tidak pernah dikirim dari browser; aplikasi hanya mengirim produk, jumlah, dan tanggal.

-- Tarif yang berlaku hari ini untuk satu produk dan jenis
create or replace function tarif_berlaku(p_produk uuid, p_jenis text) returns bigint
language sql stable security definer set search_path = public as $$
  select harga from tarif where produk_id = p_produk and jenis = p_jenis and berlaku_mulai <= current_date
  order by berlaku_mulai desc limit 1
$$;

-- Katalog publik: produk terbit + harga mulai + jumlah unit aktif
create or replace view katalog with (security_invoker = true) as
select p.id, p.slug, p.nama, p.deskripsi, p.kelengkapan, p.foto, p.jenis_layanan, p.tipe_penginapan, p.maks_tamu, p.kamar_tidur,
       p.fasilitas, p.durasi_menit, p.maks_penumpang, p.slot_jam, p.titik_kumpul,
       k.slug as kategori_slug, k.nama as kategori_nama, k.lini, k.urutan,
       coalesce(tarif_berlaku(p.id, 'harian'), tarif_berlaku(p.id, 'malam_biasa'), tarif_berlaku(p.id, 'per_trip')) as harga_mulai,
       case when p.jenis_layanan = 'sewa' then 'hari' when p.jenis_layanan = 'penginapan' then 'malam' else 'trip' end as satuan
from produk p join kategori k on k.id = p.kategori_id
where p.status = 'terbit';
grant select on katalog to anon, authenticated;

-- Buat booking draf dari keranjang. p_items = [{"produk": "<slug>", "jumlah": 2}, ...]
create or replace function buat_booking(p_cabang uuid, p_mulai timestamptz, p_selesai timestamptz, p_items jsonb,
                                        p_tamu int default null, p_jemput text default null,
                                        p_antar boolean default false, p_alamat text default null)
returns booking language plpgsql security definer set search_path = public as $$
declare
  pl pelanggan; c cabang; b booking; it jsonb; pr produk; k kategori;
  lini_b lini_usaha; ada_exp boolean := false; ada_sewa boolean := false; ada_trans boolean := false;
  hari int; bayar_hari int; malam int; d date; harga bigint; baris bigint; jml int;
  sub bigint := 0; sub_bundling bigint := 0; n_bundling int := 0; persen_b int := 0; disk_b bigint := 0;
  total bigint; dp_p int; dp bigint; prefix text; aturan jsonb; n_item int := 0;
  rinci jsonb := '[]'::jsonb;
begin
  select * into pl from pelanggan where auth_id = auth.uid();
  if pl.id is null then raise exception 'Masuk dulu sebelum booking' using errcode = '42501'; end if;
  if exists (select 1 from daftar_hitam where pelanggan_id = pl.id and (sampai is null or sampai > now())) then
    raise exception 'Akun ini tidak bisa membuat booking. Hubungi CS Rentalaja.' using errcode = '42501';
  end if;
  if p_selesai <= p_mulai then raise exception 'Waktu selesai harus setelah waktu mulai' using errcode = 'P0001'; end if;
  if p_mulai < now() - interval '15 minutes' then raise exception 'Waktu mulai sudah lewat' using errcode = 'P0001'; end if;
  select * into c from cabang where id = p_cabang and aktif;
  if c.id is null then raise exception 'Cabang tidak ditemukan' using errcode = 'P0001'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Keranjang kosong' using errcode = 'P0001'; end if;

  -- Kenali jenis isi keranjang
  for it in select * from jsonb_array_elements(p_items) loop
    select p.* into pr from produk p where p.slug = it->>'produk' and p.status = 'terbit';
    if pr.id is null then raise exception 'Produk % tidak tersedia', it->>'produk' using errcode = 'P0001'; end if;
    select * into k from kategori where id = pr.kategori_id;
    if k.lini = 'experience' then ada_exp := true; else ada_sewa := true; end if;
    if k.lini = 'transportation' then ada_trans := true; end if;
    if not (k.lini = any(c.lini)) then raise exception '% tidak tersedia di %', pr.nama, c.nama using errcode = 'P0001'; end if;
  end loop;
  if ada_exp and ada_sewa then raise exception 'Experience dibooking terpisah dari sewa barang' using errcode = 'P0001'; end if;
  if ada_exp and jsonb_array_length(p_items) > 1 then raise exception 'Satu booking Experience untuk satu penginapan atau satu trip' using errcode = 'P0001'; end if;
  lini_b := case when ada_exp then 'experience' when ada_trans then 'transportation' else 'hub' end;

  hari := greatest(1, ceil(extract(epoch from (p_selesai - p_mulai)) / 86400.0)::int);
  aturan := coalesce(nilai_pengaturan('bundling'), '{}'::jsonb);

  -- Hitung harga per item
  for it in select * from jsonb_array_elements(p_items) loop
    select p.* into pr from produk p where p.slug = it->>'produk';
    select * into k from kategori where id = pr.kategori_id;
    jml := greatest(1, least(10, coalesce((it->>'jumlah')::int, 1)));
    if pr.jenis_layanan = 'penginapan' then
      if p_tamu is not null and pr.maks_tamu is not null and p_tamu > pr.maks_tamu then
        raise exception 'Maksimal % tamu untuk %', pr.maks_tamu, pr.nama using errcode = 'P0001';
      end if;
      malam := ((p_selesai at time zone 'Asia/Jakarta')::date - (p_mulai at time zone 'Asia/Jakarta')::date);
      if malam < coalesce(pr.minimal_malam, 1) then raise exception 'Minimal % malam', pr.minimal_malam using errcode = 'P0001'; end if;
      baris := 0;
      for d in select generate_series((p_mulai at time zone 'Asia/Jakarta')::date, (p_selesai at time zone 'Asia/Jakarta')::date - 1, interval '1 day')::date loop
        baris := baris + coalesce(case when extract(isodow from d) in (5, 6) then tarif_berlaku(pr.id, 'malam_akhir_pekan') end, tarif_berlaku(pr.id, 'malam_biasa'));
      end loop;
      harga := baris / greatest(malam, 1); bayar_hari := malam; jml := 1;
    elsif pr.jenis_layanan = 'trip' then
      if p_tamu is not null and pr.maks_penumpang is not null and p_tamu > pr.maks_penumpang then
        raise exception 'Maksimal % penumpang per Jeep', pr.maks_penumpang using errcode = 'P0001';
      end if;
      harga := tarif_berlaku(pr.id, 'per_trip'); bayar_hari := 1; baris := harga; jml := 1;
    else
      harga := tarif_berlaku(pr.id, 'harian');
      bayar_hari := case when k.promo_2_gratis_1 then hari - (hari / 3) else hari end;   -- sewa 3 hari bayar 2
      baris := harga * bayar_hari;
    end if;
    if harga is null then raise exception 'Harga % belum diatur', pr.nama using errcode = 'P0001'; end if;
    sub := sub + baris * jml;
    if k.boleh_bundling and pr.jenis_layanan = 'sewa' then n_bundling := n_bundling + jml; sub_bundling := sub_bundling + baris * jml; end if;
    n_item := n_item + jml;
    rinci := rinci || jsonb_build_object('produk_id', pr.id, 'harga', harga, 'hari', bayar_hari, 'jumlah', jml, 'baris', baris);
  end loop;

  -- Diskon bundling barang non-motor: 2 barang 5%, 3+ barang 10% (dari pengaturan)
  if n_bundling >= 3 then persen_b := coalesce((aturan->>'3')::int, 10);
  elsif n_bundling = 2 then persen_b := coalesce((aturan->>'2')::int, 5); end if;
  disk_b := sub_bundling * persen_b / 100;
  total := sub - disk_b;

  -- DP
  if lini_b = 'experience' then
    dp_p := case when ada_exp and exists (select 1 from jsonb_array_elements(rinci) r join produk p on p.id = (r->>'produk_id')::uuid where p.jenis_layanan = 'trip')
                 then coalesce((nilai_pengaturan('jeep')->>'dp_persen')::int, 50)
                 else coalesce((nilai_pengaturan('dp_penginapan_persen'))::text::int, 50) end;
  elsif pl.level in ('langganan', 'prioritas') and n_item <= coalesce((nilai_pengaturan('member_tanpa_dp')->>'maks_barang')::int, 2) then
    dp_p := 0;
  else
    dp_p := coalesce((nilai_pengaturan('dp_persen'))::text::int, 20);
  end if;
  dp := ceil(total * dp_p / 100.0)::bigint;

  prefix := case when lini_b <> 'experience' then 'RA' when c.kode = 'JEEP' then 'JP' when c.kode = 'ERT' then 'ET' else 'RM' end;
  insert into booking (kode, pelanggan_id, cabang_id, lini, status, mulai, selesai, jumlah_tamu, titik_jemput, antar, alamat_antar,
                       subtotal, diskon_bundling, total, dp_wajib, sumber)
  values (buat_kode(prefix, nextval('urut_booking')), pl.id, c.id, lini_b, 'draf', p_mulai, p_selesai, p_tamu, p_jemput, coalesce(p_antar, false), p_alamat,
          sub, disk_b, total, dp, 'web')
  returning * into b;

  insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, diskon, total)
  select b.id, (r->>'produk_id')::uuid, (r->>'harga')::bigint, (r->>'hari')::numeric,
         ((r->>'baris')::bigint * persen_b / 100) * (case when kk.boleh_bundling and pp.jenis_layanan = 'sewa' then 1 else 0 end),
         (r->>'baris')::bigint
  from jsonb_array_elements(rinci) r
  join produk pp on pp.id = (r->>'produk_id')::uuid join kategori kk on kk.id = pp.kategori_id
  cross join lateral generate_series(1, (r->>'jumlah')::int);
  return b;
end $$;

-- Daftar sebagai pelanggan setelah OTP WhatsApp berhasil (idempoten)
create or replace function daftar_pelanggan(p_nama text, p_nomor_wa text) returns pelanggan
language plpgsql security definer set search_path = public as $$
declare pl pelanggan;
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '42501'; end if;
  select * into pl from pelanggan where auth_id = auth.uid();
  if pl.id is not null then return pl; end if;
  -- nomor yang sama pernah dipakai di kasir (tanpa akun): sambungkan
  update pelanggan set auth_id = auth.uid(), nama = coalesce(nullif(trim(p_nama), ''), nama)
  where nomor_wa = p_nomor_wa and auth_id is null returning * into pl;
  if pl.id is null then
    insert into pelanggan (auth_id, nama, nomor_wa, kode_rujukan)
    values (auth.uid(), coalesce(nullif(trim(p_nama), ''), 'Pelanggan'), p_nomor_wa, upper(substr(md5(random()::text), 1, 6)))
    returning * into pl;
  end if;
  return pl;
end $$;

grant execute on function tarif_berlaku(uuid, text) to anon, authenticated;
grant execute on function buat_booking(uuid, timestamptz, timestamptz, jsonb, int, text, boolean, text) to authenticated;
grant execute on function daftar_pelanggan(text, text) to authenticated;

-- Dijalankan pg_cron tiap menit: booking yang lewat batas bayar 20 menit jadi kedaluwarsa dan unit dilepas.
create or replace function kedaluwarsakan_booking() returns int
language plpgsql security definer set search_path = public as $$
declare b record; n int := 0;
begin
  if not is_sistem() then perform wajib_peran('owner'); end if;
  for b in select id from booking where status = 'menunggu_bayar' and batas_bayar < now() for update skip locked loop
    perform ubah_status_booking(b.id, 'kedaluwarsa', 'Lewat batas bayar');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Sopir Jeep menerima sisa bayar dari tamu (tunai dipegang sopir, disetor saat tutup shift; QRIS lewat Xendit).
create or replace function catat_sisa_bayar_sopir(p_booking uuid, p_jumlah bigint) returns pembayaran
language plpgsql security definer set search_path = public as $$
declare b booking; p pembayaran;
begin
  perform wajib_peran('sopir');
  select * into b from booking where id = p_booking for update;
  if b.id is null or (peran_saya() = 'sopir' and b.sopir_id is distinct from auth.uid()) then
    raise exception 'Trip ini bukan milik Anda' using errcode = '42501';
  end if;
  if b.status not in ('dikonfirmasi', 'dipakai') then raise exception 'Trip belum berjalan' using errcode = 'P0001'; end if;
  if p_jumlah <= 0 or p_jumlah > b.total then raise exception 'Jumlah tidak wajar' using errcode = 'P0001'; end if;
  insert into pembayaran (booking_id, jenis, metode, jumlah, status, dibayar_pada, diterima_oleh)
  values (b.id, 'pelunasan', 'tunai', p_jumlah, 'lunas', now(), auth.uid()) returning * into p;
  return p;
end $$;
grant execute on function catat_sisa_bayar_sopir(uuid, bigint) to authenticated;
grant execute on function kedaluwarsakan_booking() to authenticated;
