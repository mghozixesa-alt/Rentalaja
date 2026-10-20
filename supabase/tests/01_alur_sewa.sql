-- Uji alur nyata dengan peran berbeda. Setiap blok gagal = uji gagal.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- Pengguna uji
insert into auth.users (id) values
 ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003'),
 ('00000000-0000-0000-0000-000000000004'), ('00000000-0000-0000-0000-000000000005'), ('00000000-0000-0000-0000-000000000006'),
 ('00000000-0000-0000-0000-000000000007'), ('00000000-0000-0000-0000-000000000008'), ('00000000-0000-0000-0000-000000000009'),
 ('00000000-0000-0000-0000-000000000010');
insert into pengguna (id, nama, peran, cabang_id) values
 ('00000000-0000-0000-0000-000000000001', 'Ghozy', 'owner', null),
 ('00000000-0000-0000-0000-000000000002', 'Dewi', 'cs', (select id from cabang where kode = 'GRT')),
 ('00000000-0000-0000-0000-000000000003', 'Kasir Garut', 'kasir', (select id from cabang where kode = 'GRT')),
 ('00000000-0000-0000-0000-000000000004', 'Rizal', 'petugas_qc', (select id from cabang where kode = 'GRT')),
 ('00000000-0000-0000-0000-000000000005', 'Ujang', 'teknisi', (select id from cabang where kode = 'GRT')),
 ('00000000-0000-0000-0000-000000000006', 'Ahmad', 'cs', (select id from cabang where kode = 'BDG-HUB')),
 ('00000000-0000-0000-0000-000000000007', 'Sinta', 'cs_experience', null),
 ('00000000-0000-0000-0000-000000000010', 'Reza', 'keuangan', null);
insert into pelanggan (id, auth_id, nama, nomor_wa) values
 ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', 'Rani A.', '081234567890'),
 ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000009', 'Dimas P.', '081298765432');

create or replace function sebagai(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u, false);
  execute 'set role authenticated';
end $$;
create or replace function keluar() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  execute 'reset role';
end $$;
create or replace function harus_gagal(sql text, pesan text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'OK (ditolak seperti seharusnya): % → %', pesan, sqlerrm;
    return;
  end;
  raise exception 'UJI GAGAL: seharusnya ditolak: %', pesan;
end $$;
create or replace function cek(kondisi boolean, pesan text) returns void language plpgsql as $$
begin
  if not kondisi then raise exception 'UJI GAGAL: %', pesan; end if;
  raise notice 'OK: %', pesan;
end $$;
grant execute on function keluar(), sebagai(text), harus_gagal(text, text), cek(boolean, text) to authenticated;
set client_min_messages = notice;

-- 1. Rani booking 2 Honda Beat dan 1 iPhone, 2 hari (pelanggan)
select sebagai('00000000-0000-0000-0000-000000000008');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai, total, dp_wajib)
values ('20000000-0000-0000-0000-000000000001', 'RA-UJI-0001', pelanggan_saya(), (select id from cabang where kode = 'GRT'), 'transportation',
        now() + interval '1 hour', now() + interval '2 days 1 hour', 285000, 57000);
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '20000000-0000-0000-0000-000000000001', id, 100000, 2, 200000 from produk where slug = 'honda-beat';
select ubah_status_booking('20000000-0000-0000-0000-000000000001', 'menunggu_verifikasi');
select cek((select count(*) from booking_item where booking_id = '20000000-0000-0000-0000-000000000001' and unit_id is not null) = 1, 'unit dikunci saat booking dikirim');
select harus_gagal($$select ubah_status_booking('20000000-0000-0000-0000-000000000001', 'menunggu_bayar')$$, 'pelanggan menyetujui booking sendiri');
select cek((select count(*) from pengguna) = 0, 'pelanggan tidak bisa melihat daftar staf');
select keluar();

-- 2. Dimas mengambil Beat terakhir, lalu booking ketiga di tanggal sama harus gagal (tidak ada sewa ganda)
select sebagai('00000000-0000-0000-0000-000000000009');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai)
values ('20000000-0000-0000-0000-000000000002', 'RA-UJI-0002', pelanggan_saya(), (select id from cabang where kode = 'GRT'), 'transportation', now() + interval '3 hours', now() + interval '1 day');
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '20000000-0000-0000-0000-000000000002', id, 100000, 1, 100000 from produk where slug = 'honda-beat';
select ubah_status_booking('20000000-0000-0000-0000-000000000002', 'menunggu_verifikasi');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai)
values ('20000000-0000-0000-0000-000000000003', 'RA-UJI-0003', pelanggan_saya(), (select id from cabang where kode = 'GRT'), 'transportation', now() + interval '5 hours', now() + interval '1 day');
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '20000000-0000-0000-0000-000000000003', id, 100000, 1, 100000 from produk where slug = 'honda-beat';
select harus_gagal($$select ubah_status_booking('20000000-0000-0000-0000-000000000003', 'menunggu_verifikasi')$$, 'booking unit yang sudah terkunci di jam yang sama');
select cek((select count(*) from booking where kode = 'RA-UJI-0001') = 0, 'Dimas tidak bisa melihat booking Rani');
select keluar();

-- 3. CS Bandung tidak melihat booking Garut; CS Garut menyetujui
select sebagai('00000000-0000-0000-0000-000000000006');
select cek((select count(*) from booking where kode like 'RA-UJI-%') = 0, 'CS Bandung tidak melihat booking Garut');
select harus_gagal($$select ubah_status_booking('20000000-0000-0000-0000-000000000001', 'menunggu_bayar')$$, 'CS cabang lain menyetujui');
select keluar();
select sebagai('00000000-0000-0000-0000-000000000002');
select harus_gagal($$select ubah_status_booking('20000000-0000-0000-0000-000000000001', 'menunggu_bayar')$$, 'menyetujui pelanggan baru tanpa cek GetContact');
select catat_getcontact('20000000-0000-0000-0000-000000000001', 'waspada', 'utang');
select harus_gagal($$select ubah_status_booking('20000000-0000-0000-0000-000000000001', 'menunggu_bayar')$$, 'CS menyetujui padahal GetContact waspada');
select catat_getcontact('20000000-0000-0000-0000-000000000001', 'aman');
select ubah_status_booking('20000000-0000-0000-0000-000000000001', 'menunggu_bayar');
select keluar();
select cek((select count(*) from cek_getcontact where booking_id = '20000000-0000-0000-0000-000000000001') = 2, 'riwayat cek GetContact tersimpan, tanpa tangkapan layar');
select sebagai('00000000-0000-0000-0000-000000000002');
select cek((select batas_bayar between now() + interval '19 minutes' and now() + interval '21 minutes' from booking where kode = 'RA-UJI-0001'), 'batas bayar 20 menit');
select harus_gagal($$select ubah_status_booking('20000000-0000-0000-0000-000000000001', 'selesai')$$, 'lompat status dari menunggu bayar ke selesai');
select keluar();
select harus_gagal($$update unit set status = 'servis' where nama = 'Honda Beat #07'$$, 'status unit diubah langsung tanpa fungsi (bahkan oleh admin database)');

-- 4. Webhook Xendit (sistem): pembayaran DP dicatat sekali walau webhook datang dua kali
insert into pembayaran (booking_id, jenis, metode, jumlah, xendit_id) values ('20000000-0000-0000-0000-000000000001', 'dp', 'qris', 57000, 'qr_uji_001');
select catat_pembayaran_lunas('qr_uji_001', 57000);
select catat_pembayaran_lunas('qr_uji_001', 57000);
select cek((select status from booking where kode = 'RA-UJI-0001') = 'dikonfirmasi', 'booking dikonfirmasi setelah DP lunas');
select cek((select count(*) from notifikasi where booking_id = '20000000-0000-0000-0000-000000000001') = 3, 'WhatsApp terkirim untuk setiap perubahan status (3)');

-- 5. Kasir menyerahkan unit; lalu pengembalian telat 2 jam 20 menit
select sebagai('00000000-0000-0000-0000-000000000003');
select serahkan_unit('20000000-0000-0000-0000-000000000001', 18420);
select cek((select u.status from unit u join booking_item bi on bi.unit_id = u.id where bi.booking_id = '20000000-0000-0000-0000-000000000001') = 'disewa', 'unit berstatus disewa');
select keluar();
update booking set mulai = now() - interval '2 days 3 hours', selesai = now() - interval '2 hours 20 minutes' where kode = 'RA-UJI-0001';
update ketersediaan set rentang = tstzrange(now() - interval '2 days 3 hours', now() - interval '2 hours 20 minutes') where booking_id = '20000000-0000-0000-0000-000000000001';
select sebagai('00000000-0000-0000-0000-000000000003');
select cek(terima_kembali('20000000-0000-0000-0000-000000000001', 18600) = 45000, 'denda telat 3 jam × 15% × Rp100.000 = Rp45.000');
select cek((select u.status from unit u join booking_item bi on bi.unit_id = u.id where bi.booking_id = '20000000-0000-0000-0000-000000000001') = 'qc', 'unit kembali masuk antrean QC');
select keluar();

-- 6. QC gagal → work order → teknisi → QC lolos → Ready
select sebagai('00000000-0000-0000-0000-000000000005');
select harus_gagal($$select simpan_hasil_qc((select unit_id from booking_item where booking_id = '20000000-0000-0000-0000-000000000001'), '[{"poin":"Rem","lolos":true}]', true)$$, 'teknisi meloloskan QC');
select keluar();
select sebagai('00000000-0000-0000-0000-000000000004');
select harus_gagal($$select simpan_hasil_qc((select unit_id from booking_item where booking_id = '20000000-0000-0000-0000-000000000001'), '[{"poin":"Rem","lolos":false}]', true)$$, 'meloloskan unit dengan poin cek gagal');
select simpan_hasil_qc((select unit_id from booking_item where booking_id = '20000000-0000-0000-0000-000000000001'), '[{"poin":"Rem","lolos":false}]', false, 'Rem belakang bunyi');
select keluar();
select cek((select count(*) from work_order where sumber = 'gagal_qc' and status = 'antre') = 1, 'gagal QC membuat work order');
insert into stok_part (cabang_id, nama, jumlah, minimal, harga_satuan) values ((select id from cabang where kode = 'GRT'), 'Kampas rem belakang', 4, 4, 45000);
select sebagai('00000000-0000-0000-0000-000000000005');
select ubah_status_wo((select id from work_order where sumber = 'gagal_qc'), 'dikerjakan');
insert into work_order_item (work_order_id, jenis, stok_part_id, nama, jumlah, harga)
values ((select id from work_order where sumber = 'gagal_qc'), 'part', (select id from stok_part where nama = 'Kampas rem belakang'), 'Kampas rem belakang', 1, 45000),
       ((select id from work_order where sumber = 'gagal_qc'), 'jasa', null, 'Jasa servis rem', 1, 20000);
select ubah_status_wo((select id from work_order where sumber = 'gagal_qc'), 'qc');
select keluar();
select cek((select jumlah from stok_part where nama = 'Kampas rem belakang') = 3, 'stok part berkurang 1');
select cek((select sum(jumlah) from biaya_unit) = 65000, 'biaya servis Rp65.000 masuk biaya unit');
select sebagai('00000000-0000-0000-0000-000000000004');
select simpan_hasil_qc((select unit_id from booking_item where booking_id = '20000000-0000-0000-0000-000000000001'), '[{"poin":"Rem","lolos":true},{"poin":"Lampu","lolos":true}]', true);
select keluar();
select cek((select u.status from unit u join booking_item bi on bi.unit_id = u.id where bi.booking_id = '20000000-0000-0000-0000-000000000001') = 'ready', 'unit Ready lagi setelah lolos QC');
select cek((select status from work_order where sumber = 'gagal_qc') = 'selesai', 'work order selesai saat QC lolos');

-- 7. Penginapan: tanpa verifikasi, langsung menunggu bayar; malam yang sama tidak bisa dijual dua kali
select sebagai('00000000-0000-0000-0000-000000000008');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai, jumlah_tamu, total, dp_wajib)
values ('20000000-0000-0000-0000-000000000010', 'RM-UJI-0001', pelanggan_saya(), (select id from cabang where kode = 'RMT'), 'experience',
        '2026-11-06 14:00+07', '2026-11-08 12:00+07', 4, 1500000, 750000);
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '20000000-0000-0000-0000-000000000010', id, 750000, 2, 1500000 from produk where slug = 'ruma-metua';
select harus_gagal($$select ubah_status_booking('20000000-0000-0000-0000-000000000010', 'menunggu_verifikasi')$$, 'penginapan masuk antrean verifikasi KTP');
select ubah_status_booking('20000000-0000-0000-0000-000000000010', 'menunggu_bayar');
select keluar();
select sebagai('00000000-0000-0000-0000-000000000009');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai, jumlah_tamu)
values ('20000000-0000-0000-0000-000000000011', 'RM-UJI-0002', pelanggan_saya(), (select id from cabang where kode = 'RMT'), 'experience', '2026-11-07 14:00+07', '2026-11-09 12:00+07', 2);
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '20000000-0000-0000-0000-000000000011', id, 650000, 2, 1300000 from produk where slug = 'ruma-metua';
select harus_gagal($$select ubah_status_booking('20000000-0000-0000-0000-000000000011', 'menunggu_bayar')$$, 'malam 7 Nov dijual dua kali');
select keluar();
select sebagai('00000000-0000-0000-0000-000000000002');
select cek((select count(*) from booking where lini = 'experience') = 0, 'CS Garut tidak melihat booking Experience');
select keluar();
select sebagai('00000000-0000-0000-0000-000000000007');
select cek((select count(*) from booking where lini = 'experience') = 2, 'CS Experience melihat semua booking penginapan');
select keluar();

-- 8. Tutup buku dan log audit
select sebagai('00000000-0000-0000-0000-000000000010');
select kunci_bulan(current_date);
select keluar();
select harus_gagal($$insert into biaya_unit (unit_id, tanggal, jenis, jumlah) select id, current_date, 'lainnya', 1000 from unit limit 1$$, 'mencatat biaya di bulan yang sudah dikunci');
select cek((select count(*) from audit_log where tabel = 'unit') > 0, 'perubahan unit tercatat di log audit');
select harus_gagal($$delete from audit_log$$, 'menghapus log audit');
select sebagai('00000000-0000-0000-0000-000000000002');
select cek((select count(*) from audit_log) = 0, 'CS tidak bisa membaca log audit');
select keluar();
