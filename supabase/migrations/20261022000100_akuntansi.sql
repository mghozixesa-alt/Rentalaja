-- Rentalaja Web v2 · Akuntansi gaya Jurnal by Mekari
-- Satu buku besar (jurnal + jurnal_baris) untuk semua transaksi. Dokumen sumber:
--   booking + pembayaran + tagihan  -> Penjualan (otomatis lewat trigger)
--   pengeluaran (jenis pembelian/biaya) -> Pembelian dan Biaya
--   kas_transaksi (terima/kirim/transfer) -> Kas & Bank
--   aset_tetap + penyusutan -> Aset Tetap
--   jurnal manual -> Jurnal Umum (wajib disetujui owner)
-- Jurnal yang sudah tercatat tidak bisa diubah atau dihapus; koreksi lewat jurnal balik.
-- Bulan yang sudah ditutup (tutup_buku) menolak jurnal baru bertanggal di bulan itu.

-- ---------- Peran ----------
create or replace function is_keuangan() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select peran in ('owner', 'keuangan') from pengguna where id = auth.uid() and aktif), false)
$$;

-- ---------- Daftar akun ----------
create table akun (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique check (kode ~ '^[1-9]-[0-9]{5}$'),
  nama text not null,
  kategori text not null check (kategori in (
    'Kas & Bank', 'Akun Piutang', 'Persediaan', 'Aktiva Lancar Lainnya', 'Aktiva Tetap', 'Depresiasi & Amortisasi',
    'Akun Hutang', 'Kewajiban Lancar Lainnya', 'Kewajiban Jangka Panjang', 'Ekuitas',
    'Pendapatan', 'Pendapatan Lainnya', 'Harga Pokok Penjualan', 'Beban', 'Beban Lainnya')),
  induk_id uuid references akun(id),
  header boolean not null default false,                -- akun header tidak bisa dipakai di transaksi
  cabang_id uuid references cabang(id),                 -- kas fisik milik cabang tertentu
  sistem boolean not null default false,                -- dipakai jurnal otomatis; tidak bisa diarsipkan
  aktif boolean not null default true,
  keterangan text,
  dibuat_pada timestamptz not null default now()
);

-- Saldo normal: aset dan beban di debit, sisanya di kredit
create or replace function saldo_normal(k text) returns int language sql immutable as $$
  select case when k in ('Kas & Bank', 'Akun Piutang', 'Persediaan', 'Aktiva Lancar Lainnya', 'Aktiva Tetap', 'Depresiasi & Amortisasi',
                         'Harga Pokok Penjualan', 'Beban', 'Beban Lainnya') then 1 else -1 end
$$;

-- Pemetaan akun untuk jurnal otomatis (bisa diatur per cabang)
create table pemetaan_akun (
  id uuid primary key default gen_random_uuid(),
  kunci text not null,                                  -- kas_tunai, xendit, bank_transfer, uang_muka, piutang, pendapatan_hub, ...
  cabang_id uuid references cabang(id),
  akun_id uuid not null references akun(id),
  unique nulls not distinct (kunci, cabang_id)
);

create or replace function akun_untuk(p_kunci text, p_cabang uuid default null) returns uuid language sql stable security definer set search_path = public as $$
  select akun_id from pemetaan_akun where kunci = p_kunci and (cabang_id = p_cabang or cabang_id is null)
  order by cabang_id nulls last limit 1
$$;

-- ---------- Kontak ----------
create table kontak (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('pelanggan', 'supplier', 'karyawan', 'mitra', 'lainnya')),
  nama text not null,
  perusahaan text,
  telepon text,
  email text,
  termin_hari int not null default 0,
  pelanggan_id uuid unique references pelanggan(id),
  investor_id uuid unique references investor(id),
  pengguna_id uuid unique references pengguna(id),
  catatan text,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

-- ---------- Jurnal ----------
create sequence urut_jurnal;
create sequence urut_kas;
create sequence urut_beli;
create sequence urut_biaya;
create sequence urut_aset;

create table jurnal (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,
  tanggal date not null,
  sumber text not null check (sumber in ('booking', 'pembayaran', 'tagihan', 'refund', 'pengeluaran', 'kas', 'penyusutan', 'aset', 'manual', 'saldo_awal', 'balik')),
  sumber_id uuid,
  memo text,
  status text not null default 'tercatat' check (status in ('menunggu', 'tercatat', 'ditolak', 'dibalik')),
  dibalik_oleh uuid references jurnal(id),
  dicatat_oleh uuid references pengguna(id),
  disetujui_oleh uuid references pengguna(id),
  dibuat_pada timestamptz not null default now()
);
create index on jurnal (tanggal);
create index on jurnal (sumber, sumber_id);

create table jurnal_baris (
  id uuid primary key default gen_random_uuid(),
  jurnal_id uuid not null references jurnal(id) on delete cascade,
  urut int not null,
  akun_id uuid not null references akun(id),
  debit bigint not null default 0 check (debit >= 0),
  kredit bigint not null default 0 check (kredit >= 0),
  cabang_id uuid references cabang(id),                 -- tag cabang untuk laba rugi per cabang
  lini lini_usaha,
  keterangan text,
  kontak_id uuid references kontak(id),
  check ((debit > 0) <> (kredit > 0))
);
create index on jurnal_baris (akun_id);
create index on jurnal_baris (jurnal_id);

-- Jurnal tercatat tidak bisa diubah, kecuali ditandai dibalik oleh fungsi balik_jurnal
create or replace function jaga_jurnal() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'tercatat' or old.status = 'dibalik' then raise exception 'Jurnal tercatat tidak bisa dihapus; buat jurnal balik'; end if;
    return old;
  end if;
  if old.status in ('tercatat', 'dibalik') and current_setting('rentalaja.balik_jurnal', true) is distinct from 'on' then
    raise exception 'Jurnal tercatat tidak bisa diubah; buat jurnal balik';
  end if;
  return new;
end $$;
create trigger trg_jaga_jurnal before update or delete on jurnal for each row execute function jaga_jurnal();
create trigger trg_jurnal_tutup before insert on jurnal for each row execute function jaga_tutup_buku();

-- Buat jurnal dari daftar baris jsonb: [{"akun": "<kode atau uuid>", "debit": 0, "kredit": 0, "cabang": uuid, "lini": "hub", "ket": "..."}]
create or replace function buat_jurnal(p_tanggal date, p_sumber text, p_sumber_id uuid, p_memo text, p_baris jsonb, p_status text default 'tercatat')
returns jurnal language plpgsql security definer set search_path = public as $$
declare j jurnal; b jsonb; a akun; d bigint := 0; k bigint := 0; n int := 0;
begin
  -- Jurnal otomatis (pembayaran telat masuk, dsb.) untuk bulan yang sudah ditutup pindah ke awal bulan terbuka berikutnya
  if p_sumber in ('booking', 'pembayaran', 'tagihan', 'refund') then
    while exists (select 1 from tutup_buku where bulan = date_trunc('month', p_tanggal)::date and dikunci_pada is not null) loop
      p_tanggal := (date_trunc('month', p_tanggal) + interval '1 month')::date;
    end loop;
  end if;
  insert into jurnal (nomor, tanggal, sumber, sumber_id, memo, status, dicatat_oleh)
  values (buat_kode(case p_sumber when 'manual' then 'JU' when 'saldo_awal' then 'SA' when 'penyusutan' then 'PY' else 'JR' end, nextval('urut_jurnal')),
          p_tanggal, p_sumber, p_sumber_id, p_memo, p_status, auth.uid())
  returning * into j;
  for b in select * from jsonb_array_elements(p_baris) loop
    if coalesce((b->>'debit')::bigint, 0) = 0 and coalesce((b->>'kredit')::bigint, 0) = 0 then continue; end if;
    select * into a from akun where kode = b->>'akun' or id::text = b->>'akun';
    if a.id is null then raise exception 'Akun % tidak ada', b->>'akun'; end if;
    if a.header then raise exception 'Akun header % tidak bisa dipakai di transaksi', a.kode; end if;
    n := n + 1;
    insert into jurnal_baris (jurnal_id, urut, akun_id, debit, kredit, cabang_id, lini, keterangan, kontak_id)
    values (j.id, n, a.id, coalesce((b->>'debit')::bigint, 0), coalesce((b->>'kredit')::bigint, 0),
            nullif(b->>'cabang', '')::uuid, nullif(b->>'lini', '')::lini_usaha, b->>'ket', nullif(b->>'kontak', '')::uuid);
    d := d + coalesce((b->>'debit')::bigint, 0); k := k + coalesce((b->>'kredit')::bigint, 0);
  end loop;
  if n < 2 then raise exception 'Jurnal butuh minimal dua baris'; end if;
  if d <> k then raise exception 'Jurnal tidak seimbang: debit % kredit %', d, k; end if;
  return j;
end $$;
revoke execute on function buat_jurnal(date, text, uuid, text, jsonb, text) from public, authenticated;

-- Jurnal balik (koreksi): membuat jurnal kebalikan dan menandai jurnal asal
create or replace function balik_jurnal(p_jurnal uuid, p_tanggal date default current_date, p_alasan text default null) returns jurnal
language plpgsql security definer set search_path = public as $$
declare j jurnal; baru jurnal; baris jsonb;
begin
  if not is_keuangan() and not is_sistem() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into j from jurnal where id = p_jurnal for update;
  if j.status <> 'tercatat' then raise exception 'Hanya jurnal tercatat yang bisa dibalik'; end if;
  select jsonb_agg(jsonb_build_object('akun', akun_id::text, 'debit', kredit, 'kredit', debit, 'cabang', cabang_id, 'lini', lini, 'ket', keterangan, 'kontak', kontak_id) order by urut)
    into baris from jurnal_baris where jurnal_id = j.id;
  baru := buat_jurnal(p_tanggal, 'balik', j.id, 'Balik ' || j.nomor || coalesce(': ' || p_alasan, ''), baris);
  perform set_config('rentalaja.balik_jurnal', 'on', true);
  update jurnal set status = 'dibalik', dibalik_oleh = baru.id where id = j.id;
  perform set_config('rentalaja.balik_jurnal', '', true);
  return baru;
end $$;

-- ---------- Penjualan otomatis dari booking ----------
create or replace function akun_pendapatan(b booking) returns text language sql stable security definer set search_path = public as $$
  select case
    when b.lini = 'hub' then 'pendapatan_hub'
    when b.lini = 'transportation' then 'pendapatan_transportation'
    when exists (select 1 from booking_item bi join produk p on p.id = bi.produk_id where bi.booking_id = b.id and p.jenis_layanan = 'trip') then 'pendapatan_jeep'
    else 'pendapatan_penginapan' end
$$;

create or replace function booking_diakui(p_booking uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from jurnal where sumber = 'booking' and sumber_id = p_booking and status = 'tercatat')
$$;

-- Pendapatan diakui saat unit diserahkan / check-in (status dipakai) atau langsung selesai.
-- Yang sudah dibayar sebelumnya (uang muka) dipindah ke pendapatan; sisanya jadi piutang.
create or replace function jurnal_pengakuan_booking() returns trigger language plpgsql security definer set search_path = public as $$
declare dibayar bigint; bersih bigint; dari_dp bigint;
begin
  if new.status not in ('dipakai', 'selesai') or old.status in ('dipakai', 'selesai') or booking_diakui(new.id) or new.total <= 0 then return new; end if;
  select coalesce(sum(p.jumlah), 0) into dibayar from pembayaran p where p.booking_id = new.id and p.status = 'lunas' and p.jenis in ('dp', 'pelunasan', 'lunas', 'ongkir');
  dibayar := dibayar - coalesce((select sum(r.jumlah) from refund r join pembayaran p on p.id = r.pembayaran_id where p.booking_id = new.id and r.status = 'selesai'), 0);
  dari_dp := least(greatest(dibayar, 0), new.total);
  bersih := new.total - new.ongkir;
  perform buat_jurnal((now() at time zone 'Asia/Jakarta')::date, 'booking', new.id, 'Pendapatan ' || new.kode,
    jsonb_build_array(
      jsonb_build_object('akun', akun_untuk('uang_muka')::text, 'debit', dari_dp, 'cabang', new.cabang_id, 'lini', new.lini, 'ket', 'Uang muka ' || new.kode),
      jsonb_build_object('akun', akun_untuk('piutang')::text, 'debit', new.total - dari_dp, 'cabang', new.cabang_id, 'lini', new.lini, 'ket', 'Sisa tagihan ' || new.kode),
      jsonb_build_object('akun', akun_untuk(akun_pendapatan(new), new.cabang_id)::text, 'kredit', bersih, 'cabang', new.cabang_id, 'lini', new.lini, 'ket', new.kode),
      jsonb_build_object('akun', akun_untuk('pendapatan_ongkir')::text, 'kredit', new.ongkir, 'cabang', new.cabang_id, 'lini', new.lini, 'ket', 'Ongkir ' || new.kode)));
  return new;
end $$;
create trigger trg_jurnal_booking after update of status on booking for each row execute function jurnal_pengakuan_booking();

-- Akun kas/bank penerima pembayaran
alter table pembayaran add column akun_kas_id uuid references akun(id);

create or replace function akun_penerima(p pembayaran, p_cabang uuid) returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(p.akun_kas_id, case p.metode
    when 'tunai' then akun_untuk('kas_tunai', p_cabang)
    when 'transfer_manual' then akun_untuk('bank_transfer', p_cabang)
    when 'saldo' then akun_untuk('saldo_pelanggan')
    else akun_untuk('xendit') end)
$$;

-- Pembayaran lunas: debit kas/bank/Xendit. Kredit uang muka (sebelum diakui), piutang (sesudah / tagihan), atau pendapatan lain (denda/klaim tanpa tagihan).
create or replace function jurnal_pembayaran() returns trigger language plpgsql security definer set search_path = public as $$
declare b booking; t tagihan; lawan uuid; cab uuid; lin lini_usaha; ref text;
begin
  if new.status <> 'lunas' or (tg_op = 'UPDATE' and old.status = 'lunas') then return new; end if;
  if exists (select 1 from jurnal where sumber = 'pembayaran' and sumber_id = new.id) then return new; end if;
  if new.booking_id is not null then select * into b from booking where id = new.booking_id; end if;
  if new.tagihan_id is not null then select * into t from tagihan where id = new.tagihan_id; end if;
  if b.id is null and t.booking_id is not null then select * into b from booking where id = t.booking_id; end if;
  cab := b.cabang_id; lin := b.lini; ref := coalesce(t.nomor, b.kode, 'pembayaran');
  if t.id is not null and t.jenis in ('denda', 'klaim', 'invoice_korporat') then
    lawan := akun_untuk('piutang');
  elsif new.jenis in ('denda', 'klaim') then
    lawan := akun_untuk(case new.jenis when 'denda' then 'pendapatan_denda' else 'pendapatan_klaim' end);
  elsif b.id is not null and booking_diakui(b.id) then
    lawan := akun_untuk('piutang');
  else
    lawan := akun_untuk('uang_muka');
  end if;
  perform buat_jurnal(coalesce((new.dibayar_pada at time zone 'Asia/Jakarta')::date, current_date), 'pembayaran', new.id,
    'Terima ' || new.jenis::text || ' ' || ref || ' (' || new.metode::text || ')',
    jsonb_build_array(
      jsonb_build_object('akun', akun_penerima(new, cab)::text, 'debit', new.jumlah, 'cabang', cab, 'lini', lin, 'ket', ref),
      jsonb_build_object('akun', lawan::text, 'kredit', new.jumlah, 'cabang', cab, 'lini', lin, 'ket', ref)));
  return new;
end $$;
create trigger trg_jurnal_pembayaran after insert or update of status on pembayaran for each row execute function jurnal_pembayaran();

-- Tagihan denda/klaim: piutang + pendapatan lain saat tagihan dibuat
create or replace function jurnal_tagihan() returns trigger language plpgsql security definer set search_path = public as $$
declare b booking;
begin
  if new.jenis not in ('denda', 'klaim') then return new; end if;
  select * into b from booking where id = new.booking_id;
  perform buat_jurnal((now() at time zone 'Asia/Jakarta')::date, 'tagihan', new.id, initcap(new.jenis) || ' ' || new.nomor,
    jsonb_build_array(
      jsonb_build_object('akun', akun_untuk('piutang')::text, 'debit', new.jumlah, 'cabang', b.cabang_id, 'lini', b.lini, 'ket', new.nomor),
      jsonb_build_object('akun', akun_untuk(case new.jenis when 'denda' then 'pendapatan_denda' else 'pendapatan_klaim' end)::text, 'kredit', new.jumlah, 'cabang', b.cabang_id, 'lini', b.lini, 'ket', new.nomor)));
  return new;
end $$;
create trigger trg_jurnal_tagihan after insert on tagihan for each row execute function jurnal_tagihan();

-- Refund selesai: kembalikan dari Xendit; mengurangi uang muka (belum diakui) atau piutang (sudah diakui)
create or replace function jurnal_refund() returns trigger language plpgsql security definer set search_path = public as $$
declare p pembayaran; b booking;
begin
  if new.status <> 'selesai' or (tg_op = 'UPDATE' and old.status = 'selesai') then return new; end if;
  select * into p from pembayaran where id = new.pembayaran_id;
  select * into b from booking where id = p.booking_id;
  perform buat_jurnal((now() at time zone 'Asia/Jakarta')::date, 'refund', new.id, 'Refund ' || coalesce(b.kode, ''),
    jsonb_build_array(
      jsonb_build_object('akun', akun_untuk(case when b.id is not null and booking_diakui(b.id) then 'piutang' else 'uang_muka' end)::text, 'debit', new.jumlah, 'cabang', b.cabang_id, 'lini', b.lini),
      jsonb_build_object('akun', (case when new.ke = 'saldo' then akun_untuk('saldo_pelanggan') else akun_penerima(p, b.cabang_id) end)::text, 'kredit', new.jumlah, 'cabang', b.cabang_id, 'lini', b.lini)));
  return new;
end $$;
create trigger trg_jurnal_refund after insert or update of status on refund for each row execute function jurnal_refund();

-- Daftar faktur penjualan (booking + tagihan) dengan sisa tagihan
create or replace view faktur_penjualan with (security_invoker = true) as
select b.id, 'booking'::text as jenis, b.kode as nomor, (b.dibuat_pada at time zone 'Asia/Jakarta')::date as tanggal,
       (b.mulai at time zone 'Asia/Jakarta')::date as jatuh_tempo, b.pelanggan_id, pl.nama as pelanggan, b.cabang_id, b.lini, b.sumber,
       b.total, coalesce(bay.jumlah, 0) as dibayar, greatest(b.total - coalesce(bay.jumlah, 0), 0) as sisa,
       booking_diakui(b.id) as diakui, b.status::text as status_booking,
       case when coalesce(bay.jumlah, 0) >= b.total then 'lunas'
            when (b.mulai at time zone 'Asia/Jakarta')::date < current_date and b.status in ('dipakai', 'selesai') then 'jatuh_tempo'
            when coalesce(bay.jumlah, 0) > 0 then 'sebagian' else 'belum_dibayar' end as status
from booking b
join pelanggan pl on pl.id = b.pelanggan_id
left join lateral (select sum(p.jumlah) as jumlah from pembayaran p where p.booking_id = b.id and p.status = 'lunas' and p.jenis in ('dp', 'pelunasan', 'lunas', 'ongkir')) bay on true
where b.status in ('dikonfirmasi', 'dipakai', 'selesai')
union all
select t.id, t.jenis, t.nomor, (t.dibuat_pada at time zone 'Asia/Jakarta')::date, t.jatuh_tempo, t.pelanggan_id, coalesce(t.perusahaan, pl.nama), b.cabang_id, b.lini, 'tagihan',
       t.jumlah, case when t.status = 'lunas' then t.jumlah else 0 end, case when t.status = 'lunas' then 0 else t.jumlah end, true, t.status,
       case when t.status = 'lunas' then 'lunas' when t.jatuh_tempo < current_date then 'jatuh_tempo' else 'belum_dibayar' end
from tagihan t left join pelanggan pl on pl.id = t.pelanggan_id left join booking b on b.id = t.booking_id
where t.jenis in ('denda', 'klaim', 'invoice_korporat') and t.status <> 'dihapuskan';


-- Keuangan mencatat pembayaran yang masuk lewat transfer bank (korporat, pelunasan, denda) untuk booking atau tagihan
create or replace function catat_pembayaran_manual(p_booking uuid, p_tagihan uuid, p_akun_kas uuid, p_jumlah bigint, p_tanggal date default current_date) returns pembayaran
language plpgsql security definer set search_path = public as $$
declare p pembayaran; t tagihan; sisa bigint;
begin
  if not is_keuangan() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if not exists (select 1 from akun where id = p_akun_kas and kategori = 'Kas & Bank' and not header) then raise exception 'Pilih akun kas atau bank penerima'; end if;
  if p_jumlah <= 0 then raise exception 'Jumlah harus lebih dari 0'; end if;
  if p_tagihan is not null then
    select * into t from tagihan where id = p_tagihan for update;
    if t.status = 'lunas' then raise exception 'Tagihan sudah lunas'; end if;
    if p_jumlah <> t.jumlah then raise exception 'Tagihan dibayar penuh: Rp%', t.jumlah; end if;
    insert into pembayaran (booking_id, tagihan_id, jenis, metode, jumlah, status, dibayar_pada, diterima_oleh, akun_kas_id)
    values (t.booking_id, t.id, case t.jenis when 'denda' then 'denda'::jenis_bayar when 'klaim' then 'klaim'::jenis_bayar else 'invoice'::jenis_bayar end,
            'transfer_manual', p_jumlah, 'lunas', (p_tanggal::timestamp + interval '12 hours') at time zone 'Asia/Jakarta', auth.uid(), p_akun_kas)
    returning * into p;
    update tagihan set status = 'lunas' where id = t.id;
  else
    select sisa into sisa from faktur_penjualan where id = p_booking and jenis = 'booking';
    if sisa is null then raise exception 'Booking belum dikonfirmasi'; end if;
    if p_jumlah > sisa then raise exception 'Melebihi sisa tagihan Rp%', sisa; end if;
    insert into pembayaran (booking_id, jenis, metode, jumlah, status, dibayar_pada, diterima_oleh, akun_kas_id)
    values (p_booking, 'pelunasan', 'transfer_manual', p_jumlah, 'lunas', (p_tanggal::timestamp + interval '12 hours') at time zone 'Asia/Jakarta', auth.uid(), p_akun_kas)
    returning * into p;
  end if;
  return p;
end $$;

-- ---------- Pembelian dan Biaya ----------
create table pengeluaran (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('pembelian', 'biaya')),
  nomor text not null unique,                           -- PI-2410-0031 / BY-2410-0044
  tanggal date not null,
  jatuh_tempo date,
  kontak_id uuid references kontak(id),
  penerima text,                                        -- nama bebas bila belum ada di Kontak
  referensi text,
  bayar_dari uuid references akun(id),                  -- akun kas/bank; null = bayar nanti (masuk hutang usaha)
  cabang_id uuid references cabang(id),
  memo text,
  nota text,                                            -- path foto nota di storage
  total bigint not null default 0,
  dibayar bigint not null default 0,
  status text not null default 'menunggu' check (status in ('menunggu', 'tercatat', 'ditolak', 'batal')),
  jurnal_id uuid references jurnal(id),
  dicatat_oleh uuid references pengguna(id),
  dibuat_pada timestamptz not null default now()
);
create table pengeluaran_item (
  id uuid primary key default gen_random_uuid(),
  pengeluaran_id uuid not null references pengeluaran(id) on delete cascade,
  akun_id uuid not null references akun(id),
  deskripsi text,
  cabang_id uuid references cabang(id),
  lini lini_usaha,
  jumlah bigint not null check (jumlah > 0)
);

-- ---------- Kas & Bank ----------
create table kas_transaksi (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('terima', 'kirim', 'transfer')),
  nomor text not null unique,                           -- KB-2410-0012
  tanggal date not null,
  akun_kas_id uuid not null references akun(id),        -- terima: masuk ke; kirim/transfer: keluar dari
  akun_tujuan_id uuid references akun(id),              -- transfer: masuk ke
  kontak_id uuid references kontak(id),
  pengeluaran_id uuid references pengeluaran(id),       -- pembayaran tagihan pembelian/biaya
  memo text,
  total bigint not null check (total > 0),
  status text not null default 'menunggu' check (status in ('menunggu', 'tercatat', 'ditolak', 'batal')),
  jurnal_id uuid references jurnal(id),
  dicatat_oleh uuid references pengguna(id),
  dibuat_pada timestamptz not null default now()
);
create table kas_transaksi_item (
  id uuid primary key default gen_random_uuid(),
  kas_id uuid not null references kas_transaksi(id) on delete cascade,
  akun_id uuid not null references akun(id),
  deskripsi text,
  cabang_id uuid references cabang(id),
  lini lini_usaha,
  jumlah bigint not null check (jumlah > 0)
);

-- Mutasi rekening dari bank/Xendit untuk rekonsiliasi
create table mutasi_bank (
  id uuid primary key default gen_random_uuid(),
  akun_id uuid not null references akun(id),
  tanggal date not null,
  keterangan text not null,
  jumlah bigint not null,                               -- positif masuk, negatif keluar
  jurnal_baris_id uuid unique references jurnal_baris(id),
  diimpor_pada timestamptz not null default now(),
  unique (akun_id, tanggal, keterangan, jumlah)
);

-- ---------- Aset tetap ----------
create table aset_tetap (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,                           -- FA-0012
  nama text not null,
  unit_id uuid references unit(id),
  kelompok text not null check (kelompok in ('kendaraan_motor', 'kendaraan_mobil', 'elektronik', 'peralatan')),
  akun_aset_id uuid not null references akun(id),
  akun_akumulasi_id uuid not null references akun(id),
  akun_beban_id uuid not null references akun(id),
  cabang_id uuid references cabang(id),
  lini lini_usaha,
  tanggal_perolehan date not null,
  harga_perolehan bigint not null check (harga_perolehan > 0),
  nilai_sisa bigint not null default 0,
  umur_bulan int not null check (umur_bulan > 0),
  akumulasi_awal bigint not null default 0,             -- aset lama: penyusutan sebelum sistem ini
  status text not null default 'aktif' check (status in ('aktif', 'dilepas')),
  tanggal_lepas date,
  dibuat_pada timestamptz not null default now()
);
create table penyusutan (
  aset_id uuid not null references aset_tetap(id),
  bulan date not null,
  jumlah bigint not null,
  jurnal_id uuid not null references jurnal(id),
  primary key (aset_id, bulan)
);

create or replace view aset_tetap_nilai with (security_invoker = true) as
select a.*, a.akumulasi_awal + coalesce((select sum(jumlah) from penyusutan p where p.aset_id = a.id), 0) as akumulasi,
       a.harga_perolehan - a.akumulasi_awal - coalesce((select sum(jumlah) from penyusutan p where p.aset_id = a.id), 0) as nilai_buku
from aset_tetap a;

-- ---------- Persetujuan ----------
-- Batas nominal yang butuh persetujuan owner (kirim uang, pembelian, biaya)
insert into pengaturan (kunci, nilai, keterangan) values
 ('batas_persetujuan_uang', '500000', 'Kirim uang, pembelian, dan biaya di atas nilai ini menunggu persetujuan owner; jurnal manual selalu disetujui')
on conflict (kunci) do nothing;

create or replace function batas_persetujuan() returns bigint language sql stable security definer set search_path = public as $$
  select coalesce((select (nilai #>> '{}')::bigint from pengaturan where kunci = 'batas_persetujuan_uang'), 500000)
$$;

-- ---------- Posting dokumen ----------
create or replace function posting_pengeluaran(p_id uuid) returns jurnal language plpgsql security definer set search_path = public as $$
declare e pengeluaran; j jurnal; baris jsonb;
begin
  select * into e from pengeluaran where id = p_id for update;
  select coalesce(jsonb_agg(jsonb_build_object('akun', i.akun_id::text, 'debit', i.jumlah, 'cabang', coalesce(i.cabang_id, e.cabang_id), 'lini', i.lini, 'ket', i.deskripsi, 'kontak', e.kontak_id)), '[]')
    into baris from pengeluaran_item i where i.pengeluaran_id = e.id;
  baris := baris || jsonb_build_array(jsonb_build_object('akun', coalesce(e.bayar_dari, akun_untuk('hutang_usaha'))::text, 'kredit', e.total,
                                                         'cabang', e.cabang_id, 'ket', coalesce(e.penerima, e.memo), 'kontak', e.kontak_id));
  j := buat_jurnal(e.tanggal, 'pengeluaran', e.id, initcap(e.jenis) || ' ' || e.nomor || coalesce(' · ' || e.penerima, ''), baris);
  update pengeluaran set status = 'tercatat', jurnal_id = j.id, dibayar = case when bayar_dari is not null then total else dibayar end where id = e.id;
  return j;
end $$;

create or replace function posting_kas(p_id uuid) returns jurnal language plpgsql security definer set search_path = public as $$
declare t kas_transaksi; j jurnal; baris jsonb; cab uuid;
begin
  select * into t from kas_transaksi where id = p_id for update;
  select cabang_id into cab from akun where id = t.akun_kas_id;
  if t.jenis = 'transfer' then
    baris := jsonb_build_array(jsonb_build_object('akun', t.akun_tujuan_id::text, 'debit', t.total, 'ket', t.memo),
                               jsonb_build_object('akun', t.akun_kas_id::text, 'kredit', t.total, 'ket', t.memo));
  elsif t.pengeluaran_id is not null then
    baris := jsonb_build_array(jsonb_build_object('akun', akun_untuk('hutang_usaha')::text, 'debit', t.total, 'kontak', t.kontak_id, 'ket', t.memo),
                               jsonb_build_object('akun', t.akun_kas_id::text, 'kredit', t.total, 'kontak', t.kontak_id, 'ket', t.memo));
  else
    select coalesce(jsonb_agg(jsonb_build_object('akun', i.akun_id::text,
             case when t.jenis = 'terima' then 'kredit' else 'debit' end, i.jumlah,
             'cabang', coalesce(i.cabang_id, cab), 'lini', i.lini, 'ket', i.deskripsi, 'kontak', t.kontak_id)), '[]')
      into baris from kas_transaksi_item i where i.kas_id = t.id;
    baris := baris || jsonb_build_array(jsonb_build_object('akun', t.akun_kas_id::text,
             case when t.jenis = 'terima' then 'debit' else 'kredit' end, t.total, 'cabang', cab, 'ket', t.memo, 'kontak', t.kontak_id));
  end if;
  j := buat_jurnal(t.tanggal, 'kas', t.id, initcap(t.jenis) || ' ' || t.nomor || coalesce(' · ' || t.memo, ''), baris);
  update kas_transaksi set status = 'tercatat', jurnal_id = j.id where id = t.id;
  if t.pengeluaran_id is not null then
    update pengeluaran set dibayar = dibayar + t.total where id = t.pengeluaran_id;
  end if;
  return j;
end $$;
revoke execute on function posting_pengeluaran(uuid), posting_kas(uuid) from public, authenticated;

-- Item jsonb: [{"akun": uuid|kode, "deskripsi": "...", "cabang": uuid, "lini": "hub", "jumlah": 120000}]
create or replace function simpan_pengeluaran(p_jenis text, p_tanggal date, p_kontak uuid, p_penerima text, p_bayar_dari uuid,
  p_jatuh_tempo date, p_cabang uuid, p_memo text, p_referensi text, p_nota text, p_item jsonb) returns pengeluaran
language plpgsql security definer set search_path = public as $$
declare e pengeluaran; it jsonb; tot bigint := 0; a akun;
begin
  if not is_keuangan() then raise exception 'Akses ditolak: hanya owner dan keuangan' using errcode = '42501'; end if;
  if p_jenis = 'pembelian' and p_bayar_dari is not null then raise exception 'Pembelian dicatat sebagai tagihan; bayar lewat Kas & Bank'; end if;
  if p_bayar_dari is not null and not exists (select 1 from akun where id = p_bayar_dari and kategori = 'Kas & Bank' and not header) then
    raise exception 'Bayar dari harus akun kas atau bank';
  end if;
  insert into pengeluaran (jenis, nomor, tanggal, jatuh_tempo, kontak_id, penerima, referensi, bayar_dari, cabang_id, memo, nota, dicatat_oleh)
  values (p_jenis, buat_kode(case p_jenis when 'pembelian' then 'PI' else 'BY' end, nextval(case p_jenis when 'pembelian' then 'urut_beli' else 'urut_biaya' end)),
          p_tanggal, coalesce(p_jatuh_tempo, p_tanggal + coalesce((select termin_hari from kontak where id = p_kontak), 0)),
          p_kontak, coalesce(p_penerima, (select nama from kontak where id = p_kontak)), p_referensi, p_bayar_dari, p_cabang, p_memo, p_nota, auth.uid())
  returning * into e;
  for it in select * from jsonb_array_elements(p_item) loop
    select * into a from akun where kode = it->>'akun' or id::text = it->>'akun';
    if a.id is null or a.header then raise exception 'Akun % tidak bisa dipakai', it->>'akun'; end if;
    if a.kategori = 'Kas & Bank' then raise exception 'Akun kas/bank tidak dipakai di baris; pilih di "Bayar dari"'; end if;
    insert into pengeluaran_item (pengeluaran_id, akun_id, deskripsi, cabang_id, lini, jumlah)
    values (e.id, a.id, it->>'deskripsi', coalesce(nullif(it->>'cabang', '')::uuid, p_cabang), nullif(it->>'lini', '')::lini_usaha, (it->>'jumlah')::bigint);
    tot := tot + (it->>'jumlah')::bigint;
  end loop;
  if tot <= 0 then raise exception 'Isi minimal satu baris dengan jumlah'; end if;
  update pengeluaran set total = tot where id = e.id returning * into e;
  if p_bayar_dari is not null and p_nota is null and tot > 100000 then raise exception 'Foto nota wajib untuk biaya di atas Rp100.000'; end if;
  if tot > batas_persetujuan() then
    insert into persetujuan (jenis, referensi_tabel, referensi_id, ringkasan, diajukan_oleh)
    values (p_jenis, 'pengeluaran', e.id, initcap(p_jenis) || ' ' || e.nomor || ' · ' || coalesce(e.penerima, '') || ' · Rp' || to_char(tot, 'FM999G999G999G999'), auth.uid());
  else
    perform posting_pengeluaran(e.id);
    select * into e from pengeluaran where id = e.id;
  end if;
  return e;
end $$;

create or replace function simpan_kas(p_jenis text, p_tanggal date, p_akun_kas uuid, p_akun_tujuan uuid, p_kontak uuid, p_pengeluaran uuid,
  p_memo text, p_total bigint, p_item jsonb) returns kas_transaksi
language plpgsql security definer set search_path = public as $$
declare t kas_transaksi; it jsonb; tot bigint := 0; a akun; e pengeluaran;
begin
  if not is_keuangan() then raise exception 'Akses ditolak: hanya owner dan keuangan' using errcode = '42501'; end if;
  if not exists (select 1 from akun where id = p_akun_kas and kategori = 'Kas & Bank' and not header) then raise exception 'Pilih akun kas atau bank'; end if;
  if p_jenis = 'transfer' then
    if p_akun_tujuan is null or p_akun_tujuan = p_akun_kas or not exists (select 1 from akun where id = p_akun_tujuan and kategori = 'Kas & Bank') then
      raise exception 'Transfer butuh akun tujuan kas/bank yang berbeda';
    end if;
    tot := p_total;
  elsif p_pengeluaran is not null then
    select * into e from pengeluaran where id = p_pengeluaran for update;
    if e.status <> 'tercatat' or e.bayar_dari is not null then raise exception 'Tagihan ini belum tercatat atau sudah dibayar langsung'; end if;
    if p_total > e.total - e.dibayar then raise exception 'Melebihi sisa tagihan Rp%', e.total - e.dibayar; end if;
    tot := p_total;
  else
    for it in select * from jsonb_array_elements(coalesce(p_item, '[]')) loop tot := tot + (it->>'jumlah')::bigint; end loop;
  end if;
  if coalesce(tot, 0) <= 0 then raise exception 'Jumlah harus lebih dari 0'; end if;
  insert into kas_transaksi (jenis, nomor, tanggal, akun_kas_id, akun_tujuan_id, kontak_id, pengeluaran_id, memo, total, dicatat_oleh)
  values (p_jenis, buat_kode('KB', nextval('urut_kas')), p_tanggal, p_akun_kas, p_akun_tujuan, coalesce(p_kontak, e.kontak_id), p_pengeluaran,
          coalesce(p_memo, case when e.id is not null then 'Bayar ' || e.nomor end), tot, auth.uid())
  returning * into t;
  if p_jenis <> 'transfer' and p_pengeluaran is null then
    for it in select * from jsonb_array_elements(p_item) loop
      select * into a from akun where kode = it->>'akun' or id::text = it->>'akun';
      if a.id is null or a.header then raise exception 'Akun % tidak bisa dipakai', it->>'akun'; end if;
      insert into kas_transaksi_item (kas_id, akun_id, deskripsi, cabang_id, lini, jumlah)
      values (t.id, a.id, it->>'deskripsi', nullif(it->>'cabang', '')::uuid, nullif(it->>'lini', '')::lini_usaha, (it->>'jumlah')::bigint);
    end loop;
  end if;
  if p_jenis = 'kirim' and tot > batas_persetujuan() then
    insert into persetujuan (jenis, referensi_tabel, referensi_id, ringkasan, diajukan_oleh)
    values ('kirim_uang', 'kas_transaksi', t.id, 'Kirim uang ' || t.nomor || coalesce(' · ' || t.memo, '') || ' · Rp' || to_char(tot, 'FM999G999G999G999'), auth.uid());
  else
    perform posting_kas(t.id);
    select * into t from kas_transaksi where id = t.id;
  end if;
  return t;
end $$;

-- Jurnal umum manual: selalu menunggu persetujuan owner; akun kas/bank tidak boleh (pakai Kas & Bank)
create or replace function simpan_jurnal_manual(p_tanggal date, p_memo text, p_baris jsonb, p_saldo_awal boolean default false) returns jurnal
language plpgsql security definer set search_path = public as $$
declare j jurnal; b jsonb;
begin
  if not is_keuangan() then raise exception 'Akses ditolak: hanya owner dan keuangan' using errcode = '42501'; end if;
  if not p_saldo_awal then
    for b in select * from jsonb_array_elements(p_baris) loop
      if exists (select 1 from akun where (kode = b->>'akun' or id::text = b->>'akun') and kategori = 'Kas & Bank') then
        raise exception 'Akun kas/bank tidak bisa dipakai di Jurnal Umum; gunakan menu Kas & Bank';
      end if;
    end loop;
  end if;
  j := buat_jurnal(p_tanggal, case when p_saldo_awal then 'saldo_awal' else 'manual' end, null, p_memo, p_baris, 'menunggu');
  insert into persetujuan (jenis, referensi_tabel, referensi_id, ringkasan, diajukan_oleh)
  values ('jurnal_manual', 'jurnal', j.id, j.nomor || ' · ' || coalesce(p_memo, 'Jurnal umum'), auth.uid());
  return j;
end $$;

-- Putuskan persetujuan: dokumen keuangan hanya oleh owner, dan bukan oleh pencatatnya sendiri
create or replace function putuskan_persetujuan(p_id uuid, p_setuju boolean, p_catatan text default null) returns persetujuan
language plpgsql security definer set search_path = public as $$
declare r persetujuan; uang boolean;
begin
  perform wajib_peran('keuangan');
  select * into r from persetujuan where id = p_id and status = 'menunggu' for update;
  if r.id is null then raise exception 'Persetujuan tidak ditemukan atau sudah diputuskan'; end if;
  uang := r.jenis in ('pembelian', 'biaya', 'kirim_uang', 'jurnal_manual');
  if uang and not is_sistem() then
    if peran_saya() <> 'owner' then raise exception 'Hanya owner yang menyetujui pengeluaran uang dan jurnal manual' using errcode = '42501'; end if;
    if r.diajukan_oleh = auth.uid() then raise exception 'Pencatat tidak boleh menyetujui catatannya sendiri' using errcode = '42501'; end if;
  end if;
  update persetujuan set status = case when p_setuju then 'disetujui'::status_persetujuan else 'ditolak'::status_persetujuan end,
         diputuskan_oleh = auth.uid(), diputuskan_pada = now(), catatan = p_catatan
  where id = p_id returning * into r;
  if r.jenis = 'perjanjian_mitra' then
    update perjanjian_mitra set status = r.status where id = r.referensi_id;
  elsif r.jenis = 'pembelian_aset' then
    update pengajuan_beli set status = case when p_setuju then 'disetujui' else 'ditolak' end where id = r.referensi_id;
  elsif r.jenis = 'refund' then
    update refund set status = case when p_setuju then 'diproses' else 'ditolak' end where id = r.referensi_id;
  elsif r.jenis in ('pembelian', 'biaya') then
    if p_setuju then perform posting_pengeluaran(r.referensi_id); else update pengeluaran set status = 'ditolak' where id = r.referensi_id; end if;
  elsif r.jenis = 'kirim_uang' then
    if p_setuju then perform posting_kas(r.referensi_id); else update kas_transaksi set status = 'ditolak' where id = r.referensi_id; end if;
  elsif r.jenis = 'jurnal_manual' then
    update jurnal set status = case when p_setuju then 'tercatat' else 'ditolak' end, disetujui_oleh = auth.uid() where id = r.referensi_id;
  end if;
  return r;
end $$;

-- ---------- Aset tetap: daftar, penyusutan, pelepasan ----------
create or replace function daftarkan_aset(p_nama text, p_kelompok text, p_tanggal date, p_harga bigint, p_umur_bulan int, p_cabang uuid,
  p_unit uuid default null, p_nilai_sisa bigint default 0, p_akumulasi_awal bigint default 0) returns aset_tetap
language plpgsql security definer set search_path = public as $$
declare a aset_tetap; g text;
begin
  if not is_keuangan() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  g := case when p_kelompok like 'kendaraan%' then 'kendaraan' else p_kelompok end;
  insert into aset_tetap (nomor, nama, unit_id, kelompok, akun_aset_id, akun_akumulasi_id, akun_beban_id, cabang_id, lini,
                          tanggal_perolehan, harga_perolehan, nilai_sisa, umur_bulan, akumulasi_awal)
  values ('FA-' || lpad(nextval('urut_aset')::text, 4, '0'), p_nama, p_unit, p_kelompok,
          akun_untuk('aset_' || g), akun_untuk('akumulasi_' || g), akun_untuk('beban_penyusutan'), p_cabang,
          (select lini[1] from cabang where id = p_cabang), p_tanggal, p_harga, p_nilai_sisa, p_umur_bulan, p_akumulasi_awal)
  returning * into a;
  if a.akun_aset_id is null or a.akun_akumulasi_id is null then raise exception 'Pemetaan akun untuk kelompok % belum diatur', p_kelompok; end if;
  return a;
end $$;

-- Penyusutan garis lurus bulanan; satu jurnal per bulan; tidak bisa dijalankan dua kali
create or replace function jalankan_penyusutan(p_bulan date) returns jurnal language plpgsql security definer set search_path = public as $$
declare bln date := date_trunc('month', p_bulan)::date; akhir date := (date_trunc('month', p_bulan) + interval '1 month - 1 day')::date;
        j jurnal; baris jsonb := '[]'; a record; per_bulan bigint; sudah bigint; nilai bigint;
begin
  if not is_keuangan() and not is_sistem() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if exists (select 1 from jurnal where sumber = 'penyusutan' and tanggal = akhir and status = 'tercatat') then raise exception 'Penyusutan % sudah dijalankan', to_char(bln, 'MM/YYYY'); end if;
  create temp table if not exists _py (aset_id uuid, jumlah bigint) on commit drop;
  delete from _py;
  for a in select * from aset_tetap where status = 'aktif' and tanggal_perolehan <= akhir loop
    per_bulan := round((a.harga_perolehan - a.nilai_sisa)::numeric / a.umur_bulan);
    sudah := a.akumulasi_awal + coalesce((select sum(jumlah) from penyusutan where aset_id = a.id), 0);
    nilai := least(per_bulan, a.harga_perolehan - a.nilai_sisa - sudah);
    if nilai <= 0 then continue; end if;
    insert into _py values (a.id, nilai);
    baris := baris || jsonb_build_array(
      jsonb_build_object('akun', a.akun_beban_id::text, 'debit', nilai, 'cabang', a.cabang_id, 'lini', a.lini, 'ket', a.nomor || ' ' || a.nama),
      jsonb_build_object('akun', a.akun_akumulasi_id::text, 'kredit', nilai, 'cabang', a.cabang_id, 'lini', a.lini, 'ket', a.nomor));
  end loop;
  if jsonb_array_length(baris) = 0 then raise exception 'Tidak ada aset yang perlu disusutkan bulan ini'; end if;
  j := buat_jurnal(akhir, 'penyusutan', null, 'Penyusutan ' || to_char(bln, 'MM/YYYY'), baris);
  insert into penyusutan (aset_id, bulan, jumlah, jurnal_id) select aset_id, bln, jumlah, j.id from _py;
  return j;
end $$;

-- Lepas aset (dijual, hilang, rusak total): hapus nilai aset dan akumulasi, catat laba/rugi pelepasan
create or replace function lepas_aset(p_aset uuid, p_tanggal date, p_harga_jual bigint default 0, p_akun_kas uuid default null) returns jurnal
language plpgsql security definer set search_path = public as $$
declare a aset_tetap_nilai; j jurnal; selisih bigint;
begin
  if not is_keuangan() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into a from aset_tetap_nilai where id = p_aset;
  if a.status <> 'aktif' then raise exception 'Aset sudah dilepas'; end if;
  if p_harga_jual > 0 and p_akun_kas is null then raise exception 'Pilih akun kas penerima hasil penjualan'; end if;
  selisih := p_harga_jual - a.nilai_buku;
  j := buat_jurnal(p_tanggal, 'aset', a.id, 'Pelepasan ' || a.nomor || ' ' || a.nama, jsonb_build_array(
    jsonb_build_object('akun', a.akun_akumulasi_id::text, 'debit', a.akumulasi, 'cabang', a.cabang_id),
    jsonb_build_object('akun', coalesce(p_akun_kas::text, ''), 'debit', p_harga_jual, 'cabang', a.cabang_id),
    jsonb_build_object('akun', akun_untuk('rugi_pelepasan')::text, 'debit', greatest(-selisih, 0), 'cabang', a.cabang_id),
    jsonb_build_object('akun', akun_untuk('laba_pelepasan')::text, 'kredit', greatest(selisih, 0), 'cabang', a.cabang_id),
    jsonb_build_object('akun', a.akun_aset_id::text, 'kredit', a.harga_perolehan, 'cabang', a.cabang_id)));
  update aset_tetap set status = 'dilepas', tanggal_lepas = p_tanggal where id = a.id;
  return j;
end $$;

-- ---------- Rekonsiliasi bank ----------
-- Impor mutasi: [{"tanggal": "2026-10-21", "keterangan": "TRSF ...", "jumlah": -850000}]
create or replace function impor_mutasi(p_akun uuid, p_mutasi jsonb) returns int language plpgsql security definer set search_path = public as $$
declare m jsonb; n int := 0;
begin
  if not is_keuangan() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  for m in select * from jsonb_array_elements(p_mutasi) loop
    insert into mutasi_bank (akun_id, tanggal, keterangan, jumlah) values (p_akun, (m->>'tanggal')::date, m->>'keterangan', (m->>'jumlah')::bigint)
    on conflict do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- Saran pasangan: baris jurnal di akun yang sama, nominal sama, tanggal ±3 hari, belum dipasangkan
create or replace view saran_rekonsiliasi with (security_invoker = true) as
select m.id as mutasi_id, jb.id as jurnal_baris_id, j.nomor, j.tanggal, j.memo
from mutasi_bank m
join jurnal_baris jb on jb.akun_id = m.akun_id and (jb.debit - jb.kredit) = m.jumlah
join jurnal j on j.id = jb.jurnal_id and j.status = 'tercatat' and abs(j.tanggal - m.tanggal) <= 3
where m.jurnal_baris_id is null and not exists (select 1 from mutasi_bank x where x.jurnal_baris_id = jb.id);

create or replace function cocokkan_mutasi(p_mutasi uuid, p_baris uuid) returns void language plpgsql security definer set search_path = public as $$
declare m mutasi_bank; b jurnal_baris;
begin
  if not is_keuangan() then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select * into m from mutasi_bank where id = p_mutasi for update;
  select * into b from jurnal_baris where id = p_baris;
  if b.akun_id <> m.akun_id or (b.debit - b.kredit) <> m.jumlah then raise exception 'Akun atau nominal tidak cocok'; end if;
  update mutasi_bank set jurnal_baris_id = p_baris where id = p_mutasi;
end $$;

-- ---------- Laporan ----------
-- Saldo per akun dalam rentang (opsional per cabang). Saldo dalam arah saldo normal akun.
create or replace function saldo_akun(p_dari date, p_sampai date, p_cabang uuid default null)
returns table (akun_id uuid, kode text, nama text, kategori text, debit bigint, kredit bigint, saldo bigint)
language sql stable security invoker set search_path = public as $$
  select a.id, a.kode, a.nama, a.kategori, coalesce(sum(jb.debit), 0)::bigint, coalesce(sum(jb.kredit), 0)::bigint,
         (saldo_normal(a.kategori) * coalesce(sum(jb.debit - jb.kredit), 0))::bigint
  from akun a
  left join (jurnal_baris jb join jurnal j on j.id = jb.jurnal_id and j.status in ('tercatat', 'dibalik'))
    on jb.akun_id = a.id and j.tanggal between coalesce(p_dari, '1900-01-01') and p_sampai and (p_cabang is null or jb.cabang_id = p_cabang)
  where not a.header
  group by a.id order by a.kode
$$;

create or replace function laba_rugi(p_dari date, p_sampai date, p_cabang uuid default null)
returns table (kode text, nama text, kategori text, jumlah bigint)
language sql stable security invoker set search_path = public as $$
  select kode, nama, kategori, saldo from saldo_akun(p_dari, p_sampai, p_cabang)
  where kategori in ('Pendapatan', 'Pendapatan Lainnya', 'Harga Pokok Penjualan', 'Beban', 'Beban Lainnya') and (debit <> 0 or kredit <> 0)
$$;

-- Neraca per tanggal; laba tahun berjalan dihitung dari akun pendapatan/beban
create or replace function neraca(p_per date)
returns table (kode text, nama text, kategori text, jumlah bigint)
language sql stable security invoker set search_path = public as $$
  select kode, nama, kategori, saldo from saldo_akun(null, p_per)
  where kategori not in ('Pendapatan', 'Pendapatan Lainnya', 'Harga Pokok Penjualan', 'Beban', 'Beban Lainnya') and (debit <> 0 or kredit <> 0)
  union all
  select '3-39999', 'Laba berjalan', 'Ekuitas',
         coalesce(sum(case when kategori in ('Pendapatan', 'Pendapatan Lainnya') then saldo else -saldo end), 0)::bigint
  from saldo_akun(null, p_per) where kategori in ('Pendapatan', 'Pendapatan Lainnya', 'Harga Pokok Penjualan', 'Beban', 'Beban Lainnya')
$$;

create or replace function buku_besar(p_akun uuid, p_dari date, p_sampai date)
returns table (jurnal_id uuid, nomor text, tanggal date, sumber text, memo text, keterangan text, debit bigint, kredit bigint, saldo bigint)
language sql stable security invoker set search_path = public as $$
  with awal as (
    select coalesce(sum(jb.debit - jb.kredit), 0) as s from jurnal_baris jb join jurnal j on j.id = jb.jurnal_id
    where jb.akun_id = p_akun and j.status in ('tercatat', 'dibalik') and j.tanggal < p_dari)
  select j.id, j.nomor, j.tanggal, j.sumber, j.memo, jb.keterangan, jb.debit, jb.kredit,
         ((select s from awal) + sum(jb.debit - jb.kredit) over (order by j.tanggal, j.nomor, jb.urut))::bigint
  from jurnal_baris jb join jurnal j on j.id = jb.jurnal_id
  where jb.akun_id = p_akun and j.status in ('tercatat', 'dibalik') and j.tanggal between p_dari and p_sampai
  order by j.tanggal, j.nomor, jb.urut
$$;

-- ---------- Akses ----------
alter table akun enable row level security;
alter table pemetaan_akun enable row level security;
alter table kontak enable row level security;
alter table jurnal enable row level security;
alter table jurnal_baris enable row level security;
alter table pengeluaran enable row level security;
alter table pengeluaran_item enable row level security;
alter table kas_transaksi enable row level security;
alter table kas_transaksi_item enable row level security;
alter table mutasi_bank enable row level security;
alter table aset_tetap enable row level security;
alter table penyusutan enable row level security;

do $$
declare t text;
begin
  foreach t in array array['akun', 'pemetaan_akun', 'kontak', 'jurnal', 'jurnal_baris', 'pengeluaran', 'pengeluaran_item',
                           'kas_transaksi', 'kas_transaksi_item', 'mutasi_bank', 'aset_tetap', 'penyusutan']
  loop
    execute format('create policy keuangan_baca on %I for select using (is_keuangan())', t);
  end loop;
end $$;
-- Data master keuangan boleh ditulis langsung oleh owner/keuangan; transaksi hanya lewat fungsi
create policy keuangan_tulis on akun for insert with check (is_keuangan());
create policy keuangan_ubah on akun for update using (is_keuangan()) with check (is_keuangan());
create policy keuangan_tulis on kontak for insert with check (is_keuangan());
create policy keuangan_ubah on kontak for update using (is_keuangan()) with check (is_keuangan());
create policy keuangan_ubah on pemetaan_akun for all using (peran_saya() = 'owner') with check (peran_saya() = 'owner');

-- Kode dan kategori akun sistem tidak boleh diubah (jurnal otomatis bergantung padanya)
create or replace function jaga_akun() returns trigger language plpgsql as $$
begin
  if old.sistem and (new.kode <> old.kode or new.kategori <> old.kategori or not new.aktif) then
    raise exception 'Akun sistem % tidak bisa diubah kode/kategori atau diarsipkan', old.kode;
  end if;
  return new;
end $$;
create trigger trg_jaga_akun before update on akun for each row execute function jaga_akun();

grant execute on function balik_jurnal(uuid, date, text), simpan_pengeluaran(text, date, uuid, text, uuid, date, uuid, text, text, text, jsonb),
  simpan_kas(text, date, uuid, uuid, uuid, uuid, text, bigint, jsonb), simpan_jurnal_manual(date, text, jsonb, boolean),
  daftarkan_aset(text, text, date, bigint, int, uuid, uuid, bigint, bigint), jalankan_penyusutan(date), lepas_aset(uuid, date, bigint, uuid),
  impor_mutasi(uuid, jsonb), cocokkan_mutasi(uuid, uuid), saldo_akun(date, date, uuid), laba_rugi(date, date, uuid), neraca(date),
  buku_besar(uuid, date, date), is_keuangan(), catat_pembayaran_manual(uuid, uuid, uuid, bigint, date) to authenticated;

-- ---------- Daftar akun awal (format kode Jurnal) ----------
insert into akun (kode, nama, kategori, sistem) values
 ('1-10001', 'Kas Garut Kota', 'Kas & Bank', true), ('1-10002', 'Kas Wanaraja', 'Kas & Bank', false), ('1-10003', 'Kas Bandung', 'Kas & Bank', false),
 ('1-10004', 'Kas Experience dan sopir', 'Kas & Bank', false),
 ('1-10011', 'BCA Operasional', 'Kas & Bank', true), ('1-10012', 'BCA Profit', 'Kas & Bank', false), ('1-10013', 'BCA Pajak', 'Kas & Bank', false),
 ('1-10014', 'BCA Gaji owner', 'Kas & Bank', false), ('1-10015', 'BCA Cadangan aset', 'Kas & Bank', false), ('1-10021', 'Saldo Xendit', 'Kas & Bank', true),
 ('1-10100', 'Piutang usaha', 'Akun Piutang', true), ('1-10101', 'Piutang karyawan (kasbon)', 'Akun Piutang', false),
 ('1-10300', 'Persediaan part dan oli', 'Persediaan', false), ('1-10500', 'Uang muka pembelian', 'Aktiva Lancar Lainnya', false),
 ('1-10701', 'Kendaraan (motor, mobil, Jeep)', 'Aktiva Tetap', true), ('1-10702', 'Elektronik dan kamera', 'Aktiva Tetap', true),
 ('1-10703', 'Peralatan camping, piknik, dan perabot', 'Aktiva Tetap', true),
 ('1-10751', 'Akumulasi penyusutan kendaraan', 'Depresiasi & Amortisasi', true), ('1-10752', 'Akumulasi penyusutan elektronik', 'Depresiasi & Amortisasi', true),
 ('1-10753', 'Akumulasi penyusutan peralatan', 'Depresiasi & Amortisasi', true),
 ('2-20100', 'Hutang usaha', 'Akun Hutang', true), ('2-20200', 'Uang muka pelanggan (DP)', 'Kewajiban Lancar Lainnya', true),
 ('2-20300', 'Hutang bagi hasil mitra', 'Kewajiban Lancar Lainnya', false), ('2-20400', 'Hutang pajak', 'Kewajiban Lancar Lainnya', false),
 ('2-20500', 'Saldo pelanggan', 'Kewajiban Lancar Lainnya', true), ('2-20600', 'Hutang gaji', 'Kewajiban Lancar Lainnya', false),
 ('2-20700', 'Hutang leasing', 'Kewajiban Jangka Panjang', false),
 ('3-30000', 'Modal disetor', 'Ekuitas', false), ('3-30100', 'Laba ditahan', 'Ekuitas', false), ('3-30200', 'Prive / dividen', 'Ekuitas', false),
 ('3-30900', 'Ekuitas saldo awal', 'Ekuitas', false),
 ('4-40001', 'Pendapatan sewa Hub', 'Pendapatan', true), ('4-40002', 'Pendapatan sewa Transportation', 'Pendapatan', true),
 ('4-40003', 'Pendapatan penginapan', 'Pendapatan', true), ('4-40004', 'Pendapatan trip Jeep', 'Pendapatan', true),
 ('4-40005', 'Pendapatan ongkir antar-jemput', 'Pendapatan', true),
 ('5-50001', 'Penyusutan unit sewa', 'Harga Pokok Penjualan', true), ('5-50002', 'Servis dan part', 'Harga Pokok Penjualan', false),
 ('5-50003', 'Bagi hasil mitra', 'Harga Pokok Penjualan', false),
 ('6-60001', 'Gaji dan upah', 'Beban', false), ('6-60002', 'Sewa tempat', 'Beban', false), ('6-60003', 'Listrik, air, dan internet', 'Beban', false),
 ('6-60004', 'Iklan dan konten', 'Beban', false), ('6-60005', 'Bensin dan transport', 'Beban', false), ('6-60006', 'Biaya Xendit dan bank', 'Beban', false),
 ('6-60007', 'Komisi staf', 'Beban', false), ('6-60008', 'Perlengkapan dan kebersihan', 'Beban', false), ('6-60009', 'Beban lain-lain', 'Beban', false),
 ('7-70001', 'Denda keterlambatan', 'Pendapatan Lainnya', true), ('7-70002', 'Klaim kerusakan', 'Pendapatan Lainnya', true),
 ('7-70003', 'Pendapatan pembatalan (DP hangus)', 'Pendapatan Lainnya', false), ('7-70004', 'Laba pelepasan aset', 'Pendapatan Lainnya', true),
 ('8-80001', 'Bunga leasing', 'Beban Lainnya', false), ('8-80002', 'Rugi pelepasan aset', 'Beban Lainnya', true), ('8-80003', 'Pajak UMKM (PPh final 0,5%)', 'Beban Lainnya', false);

insert into pemetaan_akun (kunci, akun_id)
select m.kunci, a.id from (values
  ('kas_tunai', '1-10001'), ('bank_transfer', '1-10011'), ('xendit', '1-10021'), ('piutang', '1-10100'), ('uang_muka', '2-20200'),
  ('hutang_usaha', '2-20100'), ('saldo_pelanggan', '2-20500'),
  ('pendapatan_hub', '4-40001'), ('pendapatan_transportation', '4-40002'), ('pendapatan_penginapan', '4-40003'), ('pendapatan_jeep', '4-40004'),
  ('pendapatan_ongkir', '4-40005'), ('pendapatan_denda', '7-70001'), ('pendapatan_klaim', '7-70002'),
  ('aset_kendaraan', '1-10701'), ('aset_elektronik', '1-10702'), ('aset_peralatan', '1-10703'),
  ('akumulasi_kendaraan', '1-10751'), ('akumulasi_elektronik', '1-10752'), ('akumulasi_peralatan', '1-10753'),
  ('beban_penyusutan', '5-50001'), ('laba_pelepasan', '7-70004'), ('rugi_pelepasan', '8-80002')
) m(kunci, kode) join akun a on a.kode = m.kode;

grant select, insert, update on akun, pemetaan_akun, kontak, jurnal, jurnal_baris, pengeluaran, pengeluaran_item,
  kas_transaksi, kas_transaksi_item, mutasi_bank, aset_tetap, penyusutan to authenticated;
grant delete on pemetaan_akun to authenticated;
grant select on faktur_penjualan, aset_tetap_nilai, saran_rekonsiliasi to authenticated;
grant usage on all sequences in schema public to authenticated;

-- Tutup buku hanya lewat fungsi kunci_bulan; kunci tidak bisa dibuka dari aplikasi
drop policy if exists pusat on tutup_buku;
create policy pusat_baca on tutup_buku for select using (is_pusat());
