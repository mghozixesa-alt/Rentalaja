-- Uji Experience: tanpa pembatalan, ubah tanggal sekali sampai H-3, sopir menolak trip, petugas QC sesuai pengaturan cabang
\set ON_ERROR_STOP 1
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000012'), ('00000000-0000-0000-0000-000000000013'),
 ('00000000-0000-0000-0000-000000000014'), ('00000000-0000-0000-0000-000000000015');
insert into pengguna (id, nama, nomor_wa, peran, cabang_id, boleh_qc) values
 ('00000000-0000-0000-0000-000000000012', 'Manajer Experience', null, 'manajer_experience', null, false),
 ('00000000-0000-0000-0000-000000000013', 'CS Wanaraja ditunjuk QC', null, 'cs', (select id from cabang where kode = 'WNR'), true),
 ('00000000-0000-0000-0000-000000000014', 'CS Wanaraja biasa', null, 'cs', (select id from cabang where kode = 'WNR'), false),
 ('00000000-0000-0000-0000-000000000015', 'Petugas QC Bandung', null, 'petugas_qc', (select id from cabang where kode = 'BDG-HUB'), false);
update pengguna set nomor_wa = '081300000007' where id = '00000000-0000-0000-0000-000000000007';

-- Rani booking Ertap Village 20–22 Des, bayar DP
select sebagai('00000000-0000-0000-0000-000000000008');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai, jumlah_tamu, total, dp_wajib)
values ('40000000-0000-0000-0000-000000000001', 'ET-UJI-0001', pelanggan_saya(), (select id from cabang where kode = 'ERT'), 'experience',
        '2026-12-20 14:00+07', '2026-12-22 12:00+07', 8, 3000000, 1500000);
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '40000000-0000-0000-0000-000000000001', id, 1500000, 2, 3000000 from produk where slug = 'ertap-village';
select ubah_status_booking('40000000-0000-0000-0000-000000000001', 'menunggu_bayar');
select keluar();
insert into pembayaran (booking_id, jenis, metode, jumlah, xendit_id) values ('40000000-0000-0000-0000-000000000001', 'dp', 'qris', 1500000, 'qr_ert_001');
select catat_pembayaran_lunas('qr_ert_001', 1500000);
select cek((select status from booking where kode = 'ET-UJI-0001') = 'dikonfirmasi', 'Ertap Village terkunci setelah DP');

-- Tidak ada pembatalan setelah bayar
select sebagai('00000000-0000-0000-0000-000000000008');
select harus_gagal($$select ubah_status_booking('40000000-0000-0000-0000-000000000001', 'batal')$$, 'pelanggan membatalkan penginapan yang sudah dibayar');
select harus_gagal($$select ubah_tanggal_experience('40000000-0000-0000-0000-000000000001', '2026-12-27 14:00+07', '2026-12-30 12:00+07')$$, 'ubah tanggal sambil menambah malam');
select ubah_tanggal_experience('40000000-0000-0000-0000-000000000001', '2026-12-27 14:00+07', '2026-12-29 12:00+07');
select cek((select jumlah_ubah_tanggal = 1 and mulai = '2026-12-27 14:00+07' from booking where kode = 'ET-UJI-0001'), 'tanggal pindah ke 27–29 Des');
select harus_gagal($$select ubah_tanggal_experience('40000000-0000-0000-0000-000000000001', '2027-01-03 14:00+07', '2027-01-05 12:00+07')$$, 'ubah tanggal kedua kali');
select keluar();
select cek((select array_agg(rentang) from ketersediaan where booking_id = '40000000-0000-0000-0000-000000000001')
           = array[tstzrange('2026-12-27 14:00+07', '2026-12-29 12:00+07')], 'villa terkunci di tanggal baru, tanggal lama dilepas');
select sebagai('00000000-0000-0000-0000-000000000007');
select harus_gagal($$select ubah_status_booking('40000000-0000-0000-0000-000000000001', 'batal')$$, 'CS Experience membatalkan booking yang sudah dibayar');
select keluar();
select sebagai('00000000-0000-0000-0000-000000000012');
select ubah_status_booking('40000000-0000-0000-0000-000000000001', 'batal', 'Pengecualian: kolam rusak');
select cek((select count(*) from ketersediaan where booking_id = '40000000-0000-0000-0000-000000000001') = 0, 'manajer Experience boleh membatalkan sebagai pengecualian, villa dilepas');
select keluar();

-- H-3 sudah lewat: pelanggan tidak bisa ubah tanggal (Dimas, Ruma Metua lusa)
select sebagai('00000000-0000-0000-0000-000000000009');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai, jumlah_tamu, total, dp_wajib)
values ('40000000-0000-0000-0000-000000000002', 'RM-UJI-0009', pelanggan_saya(), (select id from cabang where kode = 'RMT'), 'experience',
        date_trunc('day', now()) + interval '2 days 14 hours', date_trunc('day', now()) + interval '3 days 12 hours', 4, 650000, 325000);
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '40000000-0000-0000-0000-000000000002', id, 650000, 1, 650000 from produk where slug = 'ruma-metua';
select ubah_status_booking('40000000-0000-0000-0000-000000000002', 'menunggu_bayar');
select keluar();
insert into pembayaran (booking_id, jenis, metode, jumlah, xendit_id) values ('40000000-0000-0000-0000-000000000002', 'dp', 'qris', 325000, 'qr_rmt_009');
select catat_pembayaran_lunas('qr_rmt_009', 325000);
select sebagai('00000000-0000-0000-0000-000000000009');
select harus_gagal($$select ubah_tanggal_experience('40000000-0000-0000-0000-000000000002', now() + interval '20 days', now() + interval '21 days')$$, 'ubah tanggal setelah lewat H-3');
select keluar();

-- Sopir menolak trip → CS Experience dikabari; CS menjadwal ulang → sopir ditanya lagi
select sebagai('00000000-0000-0000-0000-000000000009');
insert into booking (id, kode, pelanggan_id, cabang_id, lini, mulai, selesai, jumlah_tamu, titik_jemput, total, dp_wajib)
values ('40000000-0000-0000-0000-000000000003', 'JP-UJI-0010', pelanggan_saya(), (select id from cabang where kode = 'JEEP'), 'experience',
        '2026-12-05 15:00+07', '2026-12-05 19:00+07', 2, 'Ertap Village', 700000, 350000);
insert into booking_item (booking_id, produk_id, harga_satuan, jumlah_hari, total)
select '40000000-0000-0000-0000-000000000003', id, 700000, 1, 700000 from produk where slug = 'jeep-sunset';
select ubah_status_booking('40000000-0000-0000-0000-000000000003', 'menunggu_bayar');
select keluar();
insert into pembayaran (booking_id, jenis, metode, jumlah, xendit_id) values ('40000000-0000-0000-0000-000000000003', 'dp', 'qris', 350000, 'qr_jeep_010');
select catat_pembayaran_lunas('qr_jeep_010', 350000);
select sebagai('00000000-0000-0000-0000-000000000011');
select konfirmasi_trip('40000000-0000-0000-0000-000000000003', false, 'Jeep diservis');
select harus_gagal($$select konfirmasi_trip('40000000-0000-0000-0000-000000000003', true)$$, 'menjawab trip yang sudah dijawab');
select keluar();
select cek(exists (select 1 from notifikasi where template = 'jeep_ditolak_sopir' and tujuan = '081300000007'), 'CS Experience dikabari sopir menolak');
select sebagai('00000000-0000-0000-0000-000000000007');
select ubah_tanggal_experience('40000000-0000-0000-0000-000000000003', '2026-12-06 15:00+07', '2026-12-06 19:00+07');
select cek((select konfirmasi_sopir = 'menunggu' and jumlah_ubah_tanggal = 0 from booking where kode = 'JP-UJI-0010'), 'jadwal ulang oleh CS: sopir ditanya lagi, jatah ubah tanggal pelanggan tidak terpakai');
select keluar();

-- Sopir tidak menjawab sampai batas → cron mengabari CS
select sebagai('00000000-0000-0000-0000-000000000012');
select set_config('rentalaja.ubah_status', 'on', false);
update booking set batas_konfirmasi_sopir = now() - interval '1 minute' where kode = 'JP-UJI-0010';
select set_config('rentalaja.ubah_status', '', false);
select cek(tandai_konfirmasi_sopir_lewat() = 1, 'satu trip lewat batas konfirmasi');
select keluar();
select cek(exists (select 1 from notifikasi where template = 'jeep_sopir_belum_jawab'), 'CS Experience dikabari sopir belum menjawab');

-- QC sesuai pengaturan cabang
insert into unit (produk_id, cabang_id, nama, status) values
 ((select id from produk where slug = 'tenda-4'), (select id from cabang where kode = 'WNR'), 'Tenda WNR #01', 'draf'),
 ((select id from produk where slug = 'tenda-4'), (select id from cabang where kode = 'BDG-HUB'), 'Tenda BDG #01', 'draf');
select sebagai('00000000-0000-0000-0000-000000000014');
select harus_gagal($$select simpan_hasil_qc((select id from unit where nama = 'Tenda WNR #01'), '[{"poin":"lengkap","lolos":true}]', true)$$, 'CS Wanaraja yang tidak ditunjuk melakukan QC');
select keluar();
select sebagai('00000000-0000-0000-0000-000000000013');
select simpan_hasil_qc((select id from unit where nama = 'Tenda WNR #01'), '[{"poin":"lengkap","lolos":true}]', true);
select keluar();
select cek((select status from unit where nama = 'Tenda WNR #01') = 'ready', 'CS senior yang ditunjuk meloloskan QC di Wanaraja');
select sebagai('00000000-0000-0000-0000-000000000015');
select harus_gagal($$select simpan_hasil_qc((select id from unit where nama = 'Tenda BDG #01'), '[{"poin":"lengkap","lolos":true}]', true)$$, 'petugas QC di cabang yang QC-nya dipegang kepala cabang');
select keluar();
