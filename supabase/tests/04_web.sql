-- Uji fungsi web: daftar pelanggan dan harga booking dihitung di server
\set ON_ERROR_STOP 1
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000020');
select sebagai('00000000-0000-0000-0000-000000000020');
select daftar_pelanggan('Tono', '081200000020');
select cek((select count(*) from pelanggan where nomor_wa = '081200000020') = 1, 'pelanggan terdaftar lewat OTP');
select daftar_pelanggan('Tono lagi', '081200000020');
select cek((select count(*) from pelanggan where nomor_wa = '081200000020') = 1, 'daftar ulang tidak membuat pelanggan ganda');

-- 3 hari: iPhone (promo 3 bayar 2) + tenda (promo 3 bayar 2) → 2 barang bundling 5%
create temp table hasil as select * from buat_booking((select id from cabang where kode = 'GRT'), now() + interval '2 hours', now() + interval '3 days 2 hours',
  '[{"produk":"iphone-13","jumlah":1},{"produk":"tenda-4","jumlah":1}]'::jsonb);
select cek((select subtotal from hasil) = 85000 * 2 + 60000 * 2, 'sewa 3 hari bayar 2 untuk iPhone dan tenda');
select cek((select diskon_bundling from hasil) = (85000 * 2 + 60000 * 2) * 5 / 100, 'diskon bundling 2 barang 5%');
select cek((select dp_wajib from hasil) = ceil((select total from hasil) * 0.2), 'DP 20% dari total');
select cek((select count(*) from booking_item where booking_id = (select id from hasil)) = 2, 'dua item tercatat');
select ubah_status_booking((select id from hasil), 'menunggu_verifikasi');
select cek((select count(*) from booking_item where booking_id = (select id from hasil) and unit_id is not null) = 2, 'unit dikunci setelah dikirim');

-- Motor 2 unit tidak ikut bundling
create temp table motor as select * from buat_booking((select id from cabang where kode = 'GRT'), now() + interval '30 days', now() + interval '31 days',
  '[{"produk":"honda-beat","jumlah":2}]'::jsonb);
select cek((select diskon_bundling from motor) = 0 and (select subtotal from motor) = 200000 and (select lini from motor) = 'transportation', 'motor tidak dapat diskon bundling');

-- Ertap Village Jumat–Minggu (2 malam akhir pekan)
create temp table inap as select * from buat_booking((select id from cabang where kode = 'ERT'), '2026-12-04 14:00+07', '2026-12-06 12:00+07',
  '[{"produk":"ertap-village"}]'::jsonb, 8);
select cek((select subtotal from inap) = 1800000 * 2, 'Jumat dan Sabtu malam memakai tarif akhir pekan');
select cek((select dp_wajib from inap) = 1800000, 'DP penginapan 50%');
select cek((select kode from inap) like 'ET-%', 'kode booking Ertap diawali ET');
select harus_gagal($$select buat_booking((select id from cabang where kode = 'ERT'), '2026-12-10 14:00+07', '2026-12-11 12:00+07', '[{"produk":"ertap-village"}]'::jsonb, 12)$$, 'tamu melebihi kapasitas villa');
select harus_gagal($$select buat_booking((select id from cabang where kode = 'GRT'), now() + interval '1 day', now() + interval '2 days', '[{"produk":"honda-beat"},{"produk":"ertap-village"}]'::jsonb)$$, 'Experience dicampur sewa barang');
select harus_gagal($$select buat_booking((select id from cabang where kode = 'WNR'), now() + interval '1 day', now() + interval '2 days', '[{"produk":"honda-beat"}]'::jsonb)$$, 'motor di cabang yang tidak punya Transportation');
select keluar();
select harus_gagal($$select buat_booking((select id from cabang where kode = 'GRT'), now() + interval '1 day', now() + interval '2 days', '[{"produk":"honda-beat"}]'::jsonb)$$, 'booking tanpa masuk');
select cek((select count(*) from katalog where slug = 'ertap-village' and harga_mulai = 1500000) = 1, 'katalog menampilkan harga mulai');

-- Booking yang lewat batas bayar otomatis kedaluwarsa, unit dilepas
select set_config('rentalaja.ubah_status', 'on', false);
update booking set status = 'menunggu_bayar', batas_bayar = now() - interval '1 minute' where id = (select id from hasil);
select set_config('rentalaja.ubah_status', '', false);
select cek(kedaluwarsakan_booking() >= 1, 'booking lewat batas bayar dikedaluwarsakan');
select cek((select status from booking where id = (select id from hasil)) = 'kedaluwarsa', 'status jadi kedaluwarsa');
select cek((select count(*) from ketersediaan where booking_id = (select id from hasil)) = 0, 'unit dilepas setelah kedaluwarsa');
