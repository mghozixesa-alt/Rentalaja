-- Uji trip Jeep: tanpa KTP, jadwal tidak bentrok, sopir menyelesaikan trip
\set ON_ERROR_STOP 1
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000011');
insert into pengguna (id, nama, nomor_wa, peran, cabang_id) values ('00000000-0000-0000-0000-000000000011', 'Sopir Jeep', '081311110000', 'sopir', (select id from cabang where kode = 'JEEP'));

-- Rani pesan trip sunrise 4 Nov 04.00, 4 jam + jeda 1 jam
select sebagai('00000000-0000-0000-0000-000000000008');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai, jumlah_tamu, titik_jemput, total, dp_wajib)
values ('30000000-0000-0000-0000-000000000001', 'JP-UJI-0001', pelanggan_saya(), (select id from cabang where kode = 'JEEP'), 'experience',
        '2026-11-04 04:00+07', '2026-11-04 09:00+07', 4, 'Ruma Metua', 750000, 375000);
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '30000000-0000-0000-0000-000000000001', id, 750000, 1, 750000 from produk where slug = 'jeep-sunrise';
select harus_gagal($$select ubah_status_booking('30000000-0000-0000-0000-000000000001', 'menunggu_verifikasi')$$, 'trip Jeep masuk antrean verifikasi KTP');
select ubah_status_booking('30000000-0000-0000-0000-000000000001', 'menunggu_bayar');
select cek((select count(*) from booking_item where booking_id = '30000000-0000-0000-0000-000000000001' and unit_id is not null) = 1, 'Jeep dikunci untuk trip sunrise');
select keluar();

-- Dimas: trip pagi 09.00 boleh (tepat setelah jeda), trip 08.00 harus ditolak
select sebagai('00000000-0000-0000-0000-000000000009');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai, jumlah_tamu)
values ('30000000-0000-0000-0000-000000000002', 'JP-UJI-0002', pelanggan_saya(), (select id from cabang where kode = 'JEEP'), 'experience', '2026-11-04 09:00+07', '2026-11-04 13:00+07', 3),
       ('30000000-0000-0000-0000-000000000003', 'JP-UJI-0003', pelanggan_saya(), (select id from cabang where kode = 'JEEP'), 'experience', '2026-11-04 08:00+07', '2026-11-04 12:00+07', 2);
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select b, (select id from produk where slug = 'jeep-pagi'), 650000, 1, 650000 from unnest(array['30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003']::uuid[]) b;
select ubah_status_booking('30000000-0000-0000-0000-000000000002', 'menunggu_bayar');
select cek(true, 'trip pagi 09.00 bisa dipesan tepat setelah jeda trip sunrise (paket lain, Jeep yang sama)');
select harus_gagal($$select ubah_status_booking('30000000-0000-0000-0000-000000000003', 'menunggu_bayar')$$, 'trip 08.00 bentrok dengan trip sunrise');
select keluar();

-- Bayar DP (webhook), sopir berangkat dan selesai: Jeep langsung Ready tanpa housekeeping
insert into pembayaran (booking_id, jenis, metode, jumlah, xendit_id) values ('30000000-0000-0000-0000-000000000001', 'dp', 'qris', 375000, 'qr_jeep_001');
select catat_pembayaran_lunas('qr_jeep_001', 375000);
select cek((select status from booking where kode = 'JP-UJI-0001') = 'dikonfirmasi', 'trip Jeep terkunci setelah DP');
select cek((select konfirmasi_sopir from booking where kode = 'JP-UJI-0001') = 'menunggu', 'setelah DP trip menunggu konfirmasi sopir');
select cek(exists (select 1 from notifikasi where template = 'jeep_trip_baru' and tujuan = '081311110000'), 'sopir dikabari trip baru lewat WhatsApp');
select sebagai('00000000-0000-0000-0000-000000000011');
select harus_gagal($$select serahkan_unit('30000000-0000-0000-0000-000000000001', 52000)$$, 'trip berangkat sebelum sopir menerima');
select harus_gagal($$update booking set konfirmasi_sopir = 'diterima' where kode = 'JP-UJI-0001'$$, 'konfirmasi sopir diubah langsung tanpa fungsi');
select konfirmasi_trip('30000000-0000-0000-0000-000000000001', true);
select cek((select konfirmasi_sopir = 'diterima' and sopir_id = '00000000-0000-0000-0000-000000000011' from booking where kode = 'JP-UJI-0001'), 'sopir menerima trip dan tercatat sebagai sopirnya');
select keluar();
select cek(exists (select 1 from notifikasi where template = 'jeep_terkonfirmasi' and tujuan = '081234567890'), 'pelanggan menerima kabar terkonfirmasi beserta sopir');
select sebagai('00000000-0000-0000-0000-000000000011');
select serahkan_unit('30000000-0000-0000-0000-000000000001', 52000);
select catat_sisa_bayar_sopir('30000000-0000-0000-0000-000000000001', 375000);
select keluar();
select cek((select sum(jumlah) from pembayaran where booking_id = '30000000-0000-0000-0000-000000000001' and status = 'lunas') = 750000, 'sisa bayar tunai dicatat atas nama sopir');
select set_config('rentalaja.ubah_status', 'on', false);  -- pemutar waktu khusus uji
update booking set mulai = now() - interval '3 hours', selesai = now() + interval '1 hour' where kode = 'JP-UJI-0001';
select set_config('rentalaja.ubah_status', '', false);
select sebagai('00000000-0000-0000-0000-000000000011');
select cek(terima_kembali('30000000-0000-0000-0000-000000000001', 52060) = 0, 'trip selesai tanpa denda');
select keluar();
select cek((select status from unit where nama = 'Jeep #01') = 'ready', 'Jeep langsung Ready setelah trip');
select cek((select count(*) from housekeeping where booking_id = '30000000-0000-0000-0000-000000000001') = 0, 'trip tidak membuat tugas kebersihan kamar');
select sebagai('00000000-0000-0000-0000-000000000007');
select cek((select count(*) from booking where kode like 'JP-UJI-%') = 3, 'CS Experience melihat semua trip Jeep');
select keluar();
