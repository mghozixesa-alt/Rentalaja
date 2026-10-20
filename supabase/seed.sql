-- Rentalaja Web v2 · data awal
-- Bagian A (aturan bisnis dan cabang) dipakai di produksi.
-- Bagian B (produk dan unit) hanya CONTOH untuk staging; data asli masuk lewat layar Impor data.

-- ===== A. Aturan bisnis yang sudah diputuskan =====
insert into pengaturan (kunci, nilai, keterangan) values
 ('dp_persen', '20', 'DP sewa barang setelah lolos verifikasi; juga berfungsi sebagai deposit'),
 ('dp_penginapan_persen', '50', 'Pilihan DP penginapan; sisa ditagih H-1'),
 ('denda_persen_per_jam', '15', 'Denda telat: 15% tarif harian per jam, dibulatkan ke atas, maksimal 1 hari'),
 ('batas_bayar_menit', '20', 'Waktu bayar setelah lolos verifikasi'),
 ('tahan_unggah_ulang_menit', '15', 'Unit dipegang saat pelanggan mengunggah ulang dokumen'),
 ('batal_gratis_jam', '3', 'Sewa barang: batal gratis sampai 3 jam sebelum ambil'),
 ('pembatalan_experience', '{"boleh_batal_setelah_bayar":false,"ubah_tanggal_maks":1,"ubah_tanggal_paling_lambat_hari":3}', 'Penginapan dan trip Jeep: tidak ada pembatalan; tanggal bisa diubah sekali sampai H-3'),
 ('jam_penginapan', '{"check_in":"14:00","check_out":"12:00"}', 'Check-in 14.00, check-out 12.00'),
 ('jam_cs', '{"mulai":"07:30","selesai":"23:00"}', 'CS piket'),
 ('bundling', '{"2":5,"3":10,"motor_ikut":false,"gabung_promo":false}', 'Diskon bundling non-motor'),
 ('promo_2_gratis_1', '{"kategori":["elektronik","camping"]}', 'Sewa 3 hari bayar 2'),
 ('paket_diskon_persen', '10', 'Diskon paket'),
 ('poin', '{"per_rupiah":10000,"tepat_waktu":10,"ulasan_foto":20,"rujukan":100,"nilai_rupiah":100,"maks_persen_sewa":20,"berlaku_bulan":12}', 'Poin pelanggan'),
 ('member_tanpa_dp', '{"level":["langganan","prioritas"],"maks_barang":2,"no_show_poin":-100,"turun_level":"2 pelanggaran dalam 3 bulan"}', 'Member boleh tanpa DP'),
 ('poin_staf', '{"per_100rb":1,"bundling":5,"verifikasi_cepat":10,"kas_pas":20,"telat":-20,"selisih_kas":-50,"nilai_rupiah":500,"batas_bulanan":1000000}', 'Komisi staf (nilai rupiah dan batas: usulan)'),
 ('dokumen_wajib', '{"ktp_saja":["camping"],"pendukung":["sim","kk","stnk","npwp"],"experience":[]}', 'Camping cukup KTP; sewa lain KTP + 1 dokumen pendukung; Experience tanpa dokumen'),
 ('rekening_payout', '{"bank":"BCA","atas_nama":"PT Popo Karya"}', 'Nomor rekening disimpan di pengaturan Xendit, bukan di sini'),
 ('whatsapp_bisnis', '"+62 813-2470-0077"', 'Nomor WhatsApp Business'),
 ('jeep', '{"dp_persen":50,"jeda_antar_trip_menit":60,"konfirmasi_sopir_jam":2,"boleh_batal":false,"dokumen":[]}', 'Trip Jeep: tanpa KTP, DP 50%, sopir menerima trip maks 2 jam setelah DP, tanpa pembatalan; sisa dibayar ke sopir');

insert into cabang (kode, nama, lini, alamat, jam_buka, jam_tutup, jam_check_in, jam_check_out, mode_qc) values
 ('GRT', 'Garut Kota', '{hub,transportation}', 'Jl. Cimanuk No. 24, Garut Kota', '07:30', '21:00', null, null, 'petugas_qc'),
 ('WNR', 'Wanaraja', '{hub}', '[ALAMAT WANARAJA]', '09:00', '17:00', null, null, 'cs_ditunjuk'),
 ('BDG-HUB', 'Bandung · Hub', '{hub,transportation}', 'Jl. Kubang, Bandung', '07:30', '21:00', null, null, 'kepala_cabang'),
 ('BDG-JKL', 'Bandung · Jakal', '{hub}', 'Dipatiukur (Jakal), Bandung', '07:30', '21:00', null, null, 'kepala_cabang'),
 ('RMT', 'Ruma Metua', '{experience}', '[ALAMAT RUMA METUA]', null, null, '14:00', '12:00', 'kepala_cabang'),
 ('ERT', 'Ertap Village', '{experience}', 'Samarang, Tarogong Selatan, Garut', null, null, '14:00', '12:00', 'kepala_cabang'),
 ('JEEP', 'Jeep Trip Garut', '{experience}', '[TITIK KUMPUL JEEP]', '04:00', '18:00', null, null, 'kepala_cabang');

insert into kategori (lini, nama, slug, promo_2_gratis_1, boleh_bundling, syarat_dokumen, urutan) values
 ('transportation', 'Motor', 'motor', false, false, 'ktp_pendukung', 1),
 ('transportation', 'Mobil dan Jeep', 'mobil', false, false, 'ktp_pendukung', 2),
 ('hub', 'iPhone', 'iphone', true, true, 'ktp_pendukung', 3),
 ('hub', 'Kamera dan lensa', 'kamera', true, true, 'ktp_pendukung', 4),
 ('hub', 'PlayStation dan proyektor', 'hiburan', false, true, 'ktp_pendukung', 5),
 ('hub', 'Camping dan piknik', 'camping', true, true, 'ktp', 6),
 ('experience', 'Penginapan', 'penginapan', false, false, 'ktp_pendukung', 7),
 ('experience', 'Trip Jeep', 'jeep', false, false, 'ktp_pendukung', 8);

insert into daftar_cek_qc (kategori_id, urutan, poin, wajib_foto)
select k.id, x.u, x.p, x.f from kategori k join (values
 ('motor', 1, 'Rem depan dan belakang pakem', false), ('motor', 2, 'Lampu, sein, klakson menyala', false),
 ('motor', 3, 'Ban tidak gundul, tekanan cukup', false), ('motor', 4, 'Bensin minimal 1 bar', false),
 ('motor', 5, 'Bodi: foto 4 sisi, tidak ada lecet baru', true), ('motor', 6, 'Bersih, helm dan jas hujan lengkap', false),
 ('iphone', 1, 'Layar dan Face ID normal', false), ('iphone', 2, 'Kamera depan dan belakang normal', false),
 ('iphone', 3, 'Kesehatan baterai di atas 85%', false), ('iphone', 4, 'Akun iCloud pelanggan sudah keluar, data direset', false),
 ('iphone', 5, 'Charger dan kabel lengkap', false), ('iphone', 6, 'Casing bersih, foto 2 sisi', true),
 ('kamera', 1, 'Sensor dan lensa bersih', false), ('kamera', 2, 'Uji foto 3 jepretan', false),
 ('kamera', 3, 'Baterai terisi, charger lengkap', false), ('kamera', 4, 'Kartu memori diformat', false), ('kamera', 5, 'Tas dan strap lengkap', false),
 ('camping', 1, 'Dicuci dan kering', false), ('camping', 2, 'Kelengkapan sesuai daftar paket', false)
) as x(slug, u, p, f) on x.slug = k.slug;

insert into jadwal_perawatan (kategori_id, pemicu_km, pemicu_hari, pemicu_jumlah_sewa, pekerjaan, toleransi_km)
select k.id, x.km, x.hari, x.sewa, x.kerja, x.tol from kategori k join (values
 ('motor', 2000, 30, null, 'Ganti oli, cek rem, ban, lampu', 300),
 ('iphone', null, 90, null, 'Cek baterai, port, kebersihan', null),
 ('kamera', null, null, 20, 'Bersihkan sensor dan lensa', null),
 ('penginapan', null, 30, null, 'Perawatan AC, air, listrik', null)
) as x(slug, km, hari, sewa, kerja, tol) on x.slug = k.slug;

insert into peran_izin (peran, izin) values
 ('cs', 'booking.verifikasi'), ('kepala_cabang', 'booking.verifikasi'), ('kasir', 'pembayaran.tunai'),
 ('petugas_qc', 'qc.putuskan'), ('kepala_cabang', 'qc.putuskan'), ('teknisi', 'work_order.kerjakan'),
 ('manajer_aset', 'unit.tambah'), ('manajer_aset', 'unit.arsip'), ('owner', 'unit.hapus_draf'),
 ('manajer_experience', 'kamar.tambah'), ('manajer_experience', 'kamar.terbit'), ('cs_experience', 'kamar.harga'),
 ('keuangan', 'tutup_buku.kunci'), ('keuangan', 'persetujuan.putuskan'), ('owner', 'persetujuan.putuskan');

-- ===== B. CONTOH untuk staging (ganti lewat Impor data) =====
insert into produk (kategori_id, nama, slug, deskripsi, status, tipe_penginapan, maks_tamu, jenis_layanan)
select k.id, x.n, x.s, x.d, 'terbit', x.tp, x.mt, case when x.slug = 'penginapan' then 'penginapan' else 'sewa' end from kategori k join (values
 ('motor', 'Honda Beat CBS', 'honda-beat', 'Matic 110cc · helm 2 · jas hujan', null, null),
 ('motor', 'Honda Vario 125', 'honda-vario', 'Matic 125cc · helm 2', null, null),
 ('iphone', 'iPhone 13 128 GB', 'iphone-13', 'Charger dan kabel', null, null),
 ('kamera', 'Sony A6000 + lensa kit', 'sony-a6000', 'Baterai 2 · kartu 64 GB', null, null),
 ('camping', 'Paket tenda 4 orang', 'tenda-4', 'Tenda, matras, kompor', null, null),
 ('penginapan', 'Ruma Metua · rumah utuh', 'ruma-metua', '[DESKRIPSI]', 'rumah_utuh', 8),
 ('penginapan', 'Ertap Village · villa utuh', 'ertap-village', 'Villa 2 lantai, 2 kamar tidur, kolam renang dan hot tub', 'rumah_utuh', 10)
) as x(slug, n, s, d, tp, mt) on x.slug = k.slug;

insert into produk (kategori_id, nama, slug, deskripsi, status, jenis_layanan, durasi_menit, maks_penumpang, titik_kumpul, slot_jam)
select k.id, x.n, x.s, x.d, 'terbit', 'trip', x.dur, 4, '[TITIK KUMPUL]', x.slot::time[] from kategori k join (values
 ('Trip Jeep sunrise · [RUTE]', 'jeep-sunrise', 'Jemput di penginapan, berangkat subuh, kopi di puncak', 240, '{04:00}'),
 ('Trip Jeep pagi · [RUTE]', 'jeep-pagi', 'Kebun teh dan curug', 180, '{09:00}'),
 ('Trip Jeep sunset · [RUTE]', 'jeep-sunset', 'Pulang setelah matahari terbenam', 180, '{15:00}')
) as x(n, s, d, dur, slot) on k.slug = 'jeep';

insert into tarif (produk_id, jenis, harga, berlaku_mulai)
select p.id, x.j, x.h, '2026-01-01' from produk p join (values
 ('honda-beat', 'harian', 100000), ('honda-vario', 'harian', 130000), ('iphone-13', 'harian', 85000),
 ('sony-a6000', 'harian', 75000), ('tenda-4', 'harian', 60000),
 ('ruma-metua', 'malam_biasa', 650000), ('ruma-metua', 'malam_akhir_pekan', 850000),
 ('ertap-village', 'malam_biasa', 1500000), ('ertap-village', 'malam_akhir_pekan', 1800000),   -- CONTOH: ganti dengan harga Airbnb
 ('jeep-sunrise', 'per_trip', 750000), ('jeep-pagi', 'per_trip', 650000), ('jeep-sunset', 'per_trip', 700000)
) as x(s, j, h) on x.s = p.slug;

insert into unit (produk_id, cabang_id, nama, plat_atau_seri, status)
select p.id, c.id, x.n, x.plat, 'draf' from (values
 ('honda-beat', 'GRT', 'Honda Beat #07', 'CONTOH-Z1234AB'), ('honda-beat', 'GRT', 'Honda Beat #09', 'CONTOH-Z1235AB'),
 ('honda-vario', 'GRT', 'Honda Vario #12', 'CONTOH-Z4410KL'), ('iphone-13', 'GRT', 'iPhone 13 #05', 'CONTOH-SN4821'),
 ('iphone-13', 'GRT', 'iPhone 13 #21', 'CONTOH-SN4822'), ('sony-a6000', 'GRT', 'Sony A6000 #02', 'CONTOH-SN0912'),
 ('tenda-4', 'GRT', 'Tenda 4P #03', 'CONTOH-TND03'),
 ('ruma-metua', 'RMT', 'Ruma Metua', 'CONTOH-RMT'), ('ertap-village', 'ERT', 'Ertap Village', 'CONTOH-ERT'),
 ('jeep-sunrise', 'JEEP', 'Jeep #01', 'CONTOH-JEEP01')
) as x(s, kc, n, plat) join produk p on p.slug = x.s join cabang c on c.kode = x.kc;

-- unit contoh langsung siap (di produksi: unit baru wajib lewat QC)
begin;
select izinkan_ubah_status();
update unit set status = 'ready' where plat_atau_seri like 'CONTOH-%';
commit;

-- banner beranda contoh (diatur di Manajemen › Konten web)
insert into konten_web (jenis, judul, isi, tampil_dari, tampil_sampai, status) values
 ('banner', 'Sewa 2 hari, gratis 1 hari', '{"tipe":"promo","urutan":1,"keterangan":"iPhone, kamera, dan alat camping","tombol":"Lihat Hub","tujuan":"/hub","gambar":null}', '2026-10-01', '2026-10-31 23:59+07', 'terbit'),
 ('banner', 'Menginap di Ruma Metua + trip Jeep sunrise', '{"tipe":"experience","urutan":2,"keterangan":"Dijemput di penginapan, berangkat 04.00","tombol":"Lihat Experience","tujuan":"/experience","gambar":null}', '2026-10-01', null, 'terbit'),
 ('banner', 'Libur akhir tahun: booking motor lebih awal', '{"tipe":"pengumuman","urutan":3,"keterangan":"Unit 24 Des – 1 Jan biasanya habis H-14","tombol":"Booking sekarang","tujuan":"/transportation","gambar":null}', '2026-12-01', '2026-12-31 23:59+07', 'draf');

-- Fasilitas penginapan (CONTOH, lengkapi dari listing)
update produk set kamar_tidur = 2, fasilitas = '{kolam renang,hot tub,karaoke,dapur,parkir}' where slug = 'ertap-village';
