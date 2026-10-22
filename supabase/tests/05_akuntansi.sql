-- Uji akuntansi gaya Jurnal: jurnal otomatis dari booking, dokumen keuangan, persetujuan owner, aset, laporan
\set ON_ERROR_STOP 1
set client_min_messages = warning;
select keluar();

-- Tanggal transaksi di bulan depan (bulan ini sudah ditutup oleh uji 01)
create temp table t as select (date_trunc('month', now()) + interval '1 month')::date + 4 as tgl;
grant select on t to authenticated;

-- ---------- 1. Booking: DP lewat Xendit -> uang muka; serah unit -> pendapatan + piutang; pelunasan tunai -> piutang ----------
insert into booking (id, kode, pelanggan_id, cabang_id, lini, status, mulai, selesai, subtotal, ongkir, total, dp_wajib)
values ('30000000-0000-0000-0000-0000000000a1', 'RA-AKT-0001', '10000000-0000-0000-0000-000000000001', (select id from cabang where kode = 'GRT'),
        'transportation', 'menunggu_bayar', now() + interval '1 day', now() + interval '3 days', 200000, 20000, 220000, 44000);
insert into pembayaran (booking_id, jenis, metode, jumlah, xendit_id) values ('30000000-0000-0000-0000-0000000000a1', 'dp', 'qris', 44000, 'xnd-uji-1');
select catat_pembayaran_lunas('xnd-uji-1', 44000);
select catat_pembayaran_lunas('xnd-uji-1', 44000);   -- webhook ganda
select cek((select count(*) from jurnal where sumber = 'pembayaran' and sumber_id = (select id from pembayaran where xendit_id = 'xnd-uji-1')) = 1, 'webhook ganda tidak membuat jurnal ganda');
select cek((select kredit from jurnal_baris jb join jurnal j on j.id = jb.jurnal_id join akun a on a.id = jb.akun_id
            where j.sumber = 'pembayaran' and a.kode = '2-20200' and jb.kredit = 44000) is not null, 'DP sebelum serah-terima masuk uang muka pelanggan');

select set_config('rentalaja.ubah_status', 'on', false);
update booking set status = 'dipakai' where id = '30000000-0000-0000-0000-0000000000a1';
select set_config('rentalaja.ubah_status', '', false);
select cek((select sum(jb.kredit) from jurnal_baris jb join jurnal j on j.id = jb.jurnal_id join akun a on a.id = jb.akun_id
            where j.sumber = 'booking' and j.sumber_id = '30000000-0000-0000-0000-0000000000a1' and a.kode = '4-40002') = 200000, 'pendapatan Transportation diakui saat unit diserahkan');
select cek((select sum(jb.kredit) from jurnal_baris jb join jurnal j on j.id = jb.jurnal_id join akun a on a.id = jb.akun_id
            where j.sumber = 'booking' and j.sumber_id = '30000000-0000-0000-0000-0000000000a1' and a.kode = '4-40005') = 20000, 'ongkir masuk akun ongkir');
select cek((select sum(jb.debit) from jurnal_baris jb join jurnal j on j.id = jb.jurnal_id join akun a on a.id = jb.akun_id
            where j.sumber = 'booking' and j.sumber_id = '30000000-0000-0000-0000-0000000000a1' and a.kode = '1-10100') = 176000, 'sisa tagihan jadi piutang');
insert into pembayaran (booking_id, jenis, metode, jumlah, status, dibayar_pada) values ('30000000-0000-0000-0000-0000000000a1', 'pelunasan', 'tunai', 176000, 'lunas', now());
select cek((select sum(jb.debit) from jurnal_baris jb join jurnal j on j.id = jb.jurnal_id join akun a on a.id = jb.akun_id
            where j.sumber = 'pembayaran' and a.kode = '1-10001' and jb.debit = 176000) = 176000, 'pelunasan tunai Garut masuk Kas Garut Kota');
select cek((select status from faktur_penjualan where nomor = 'RA-AKT-0001') = 'lunas', 'faktur penjualan lunas');

-- ---------- 2. Akses: kasir tidak bisa melihat jurnal atau mencatat biaya ----------
select sebagai('00000000-0000-0000-0000-000000000003');
select cek((select count(*) from jurnal) = 0, 'kasir tidak melihat jurnal');
select harus_gagal($$select simpan_pengeluaran('biaya', (select tgl from t), null, 'SPBU', (select id from akun where kode = '1-10001'), null, null, 'uji', null, null,
  '[{"akun":"6-60005","jumlah":50000}]')$$, 'kasir mencatat biaya');
select harus_gagal($$select buat_jurnal(current_date, 'manual', null, 'x', '[]')$$, 'memanggil buat_jurnal langsung');

-- ---------- 3. Biaya dan pembelian oleh keuangan ----------
select sebagai('00000000-0000-0000-0000-000000000010');
select cek((select count(*) from jurnal) > 0, 'keuangan melihat jurnal');
create temp table by1 as select * from simpan_pengeluaran('biaya', (select tgl from t), null, 'SPBU Cimanuk', (select id from akun where kode = '1-10001'), null,
  (select id from cabang where kode = 'GRT'), 'Bensin antar unit', null, null, '[{"akun":"6-60005","deskripsi":"Bensin","jumlah":85000}]');
select cek((select status from by1) = 'tercatat' and (select dibayar from by1) = 85000, 'biaya kecil langsung tercatat dan lunas');
select harus_gagal($$select simpan_pengeluaran('biaya', (select tgl from t), null, 'Toko', (select id from akun where kode = '1-10001'), null, null, null, null, null,
  '[{"akun":"6-60008","jumlah":250000}]')$$, 'biaya di atas Rp100.000 tanpa foto nota');
select harus_gagal($$select simpan_pengeluaran('biaya', (select tgl from t), null, 'Toko', null, null, null, null, null, null,
  '[{"akun":"1-10011","jumlah":50000}]')$$, 'akun bank dipakai sebagai baris biaya');
create temp table by2 as select * from simpan_pengeluaran('biaya', (select tgl from t), (select id from kontak where nama = 'Meta Ads'), null,
  (select id from akun where kode = '1-10011'), null, null, 'Iklan Oktober', null, 'nota/meta.jpg', '[{"akun":"6-60004","jumlah":1500000}]');
select cek((select status from by2) = 'menunggu', 'biaya di atas batas menunggu persetujuan');
select cek((select count(*) from jurnal where sumber = 'pengeluaran' and sumber_id = (select id from by2)) = 0, 'belum ada jurnal sebelum disetujui');
select harus_gagal($$select putuskan_persetujuan((select id from persetujuan where referensi_id = (select id from by2)), true)$$, 'keuangan menyetujui biaya sendiri');

create temp table pi1 as select * from simpan_pengeluaran('pembelian', (select tgl from t), (select id from kontak where nama = 'Bengkel Jaya Motor'), null, null, null,
  (select id from cabang where kode = 'GRT'), 'Turun mesin', 'WO-1052', null,
  '[{"akun":"5-50002","deskripsi":"Turun mesin Vario","jumlah":300000},{"akun":"5-50002","deskripsi":"Kampas kopling","jumlah":150000}]');
select cek((select status from pi1) = 'tercatat' and (select jatuh_tempo from pi1) = (select tgl from t) + 7, 'pembelian tercatat, jatuh tempo ikut termin supplier');
select cek((select sum(jb.kredit) from jurnal_baris jb join akun a on a.id = jb.akun_id where jb.jurnal_id = (select jurnal_id from pi1) and a.kode = '2-20100') = 450000, 'pembelian kredit ke hutang usaha');
select harus_gagal($$select simpan_kas('kirim', (select tgl from t), (select id from akun where kode = '1-10011'), null, null, (select id from pi1), null, 500000, null)$$, 'bayar melebihi sisa tagihan');
select simpan_kas('kirim', (select tgl from t), (select id from akun where kode = '1-10011'), null, null, (select id from pi1), null, 450000, null);
select cek((select dibayar from pengeluaran where id = (select id from pi1)) = 450000, 'tagihan pembelian lunas setelah dibayar dari Kas & Bank');

-- Transfer antar rekening dan terima uang
select simpan_kas('transfer', (select tgl from t), (select id from akun where kode = '1-10021'), (select id from akun where kode = '1-10011'), null, null, 'Tarik saldo Xendit', 40000, null);
select harus_gagal($$select simpan_kas('transfer', (select tgl from t), (select id from akun where kode = '1-10011'), (select id from akun where kode = '1-10011'), null, null, null, 1000, null)$$, 'transfer ke rekening yang sama');
create temp table kirim as select * from simpan_kas('kirim', (select tgl from t), (select id from akun where kode = '1-10011'), null, null, null, 'Sewa ruko', null,
  ('[{"akun":"6-60002","jumlah":4000000,"cabang":"' || (select id from cabang where kode = 'BDG-HUB') || '"}]')::jsonb);
select cek((select status from kirim) = 'menunggu', 'kirim uang Rp4 jt menunggu owner');

-- Jurnal manual
select harus_gagal($$select simpan_jurnal_manual((select tgl from t), 'x', '[{"akun":"1-10011","debit":1000},{"akun":"6-60009","kredit":1000}]')$$, 'jurnal umum memakai akun bank');
select harus_gagal($$select simpan_jurnal_manual((select tgl from t), 'x', '[{"akun":"2-20200","debit":1000},{"akun":"7-70003","kredit":900}]')$$, 'jurnal umum tidak seimbang');
create temp table ju as select * from simpan_jurnal_manual((select tgl from t), 'DP hangus RA-UJI', '[{"akun":"2-20200","debit":20000},{"akun":"7-70003","kredit":20000}]');
select cek((select status from ju) = 'menunggu', 'jurnal manual menunggu persetujuan');

-- ---------- 4. Owner menyetujui ----------
select sebagai('00000000-0000-0000-0000-000000000001');
select putuskan_persetujuan((select id from persetujuan where referensi_id = (select id from by2)), true);
select putuskan_persetujuan((select id from persetujuan where referensi_id = (select id from kirim)), true);
select putuskan_persetujuan((select id from persetujuan where referensi_id = (select id from ju)), true);
select cek((select status from pengeluaran where id = (select id from by2)) = 'tercatat', 'biaya iklan tercatat setelah disetujui owner');
select cek((select status from kas_transaksi where id = (select id from kirim)) = 'tercatat', 'kirim uang tercatat setelah disetujui');
select cek((select status from jurnal where id = (select id from ju)) = 'tercatat', 'jurnal manual tercatat setelah disetujui');

-- Tagihan denda dibayar transfer dicatat keuangan
select sebagai('00000000-0000-0000-0000-000000000010');
select catat_pembayaran_manual(null, (select id from tagihan where status = 'terbuka' and jenis = 'denda' limit 1), (select id from akun where kode = '1-10011'),
  (select jumlah from tagihan where status = 'terbuka' and jenis = 'denda' limit 1), (select tgl from t))
where exists (select 1 from tagihan where status = 'terbuka' and jenis = 'denda');
select harus_gagal($$select catat_pembayaran_manual('30000000-0000-0000-0000-0000000000a1', null, (select id from akun where kode = '1-10011'), 1000)$$, 'membayar booking yang sudah lunas');

-- ---------- 5. Jurnal tidak bisa diubah; koreksi lewat jurnal balik ----------
select keluar();
select harus_gagal($$update jurnal set memo = 'ubah' where id = (select jurnal_id from pi1)$$, 'mengubah jurnal tercatat');
select harus_gagal($$delete from jurnal where id = (select jurnal_id from pi1)$$, 'menghapus jurnal tercatat');
select sebagai('00000000-0000-0000-0000-000000000010');
select balik_jurnal((select jurnal_id from by1), (select tgl from t), 'salah cabang');
select cek((select status from jurnal where id = (select jurnal_id from by1)) = 'dibalik', 'jurnal asal ditandai dibalik');

-- ---------- 6. Aset tetap dan penyusutan ----------
create temp table aset as select * from daftarkan_aset('Honda Beat CBS #41', 'kendaraan_motor', (select tgl from t) - 60, 25800000, 36, (select id from cabang where kode = 'BDG-HUB'));
select jalankan_penyusutan((select tgl from t));
select cek((select jumlah from penyusutan where aset_id = (select id from aset)) = 716667, 'penyusutan garis lurus 25,8 jt / 36 bulan');
select harus_gagal($$select jalankan_penyusutan((select tgl from t))$$, 'penyusutan dijalankan dua kali');
select lepas_aset((select id from aset), (select tgl from t) + 1, 24000000, (select id from akun where kode = '1-10011'));
select cek((select status from aset_tetap where id = (select id from aset)) = 'dilepas', 'aset dilepas');

-- ---------- 7. Laporan seimbang ----------
select cek((select sum(debit) = sum(kredit) from jurnal_baris jb join jurnal j on j.id = jb.jurnal_id where j.status in ('tercatat', 'dibalik')), 'neraca saldo seimbang');
select cek((select sum(case when kategori in ('Kas & Bank', 'Akun Piutang', 'Persediaan', 'Aktiva Lancar Lainnya', 'Aktiva Tetap', 'Depresiasi & Amortisasi') then jumlah else -jumlah end)
            from neraca((select tgl from t) + 31)) = 0, 'aset = kewajiban + ekuitas');
select cek((select jumlah from laba_rugi((select tgl from t) - 4, (select tgl from t) + 31) where kode = '4-40002') = 200000, 'laba rugi memuat pendapatan Transportation');
select cek((select jumlah from laba_rugi((select tgl from t) - 40, (select tgl from t) + 31, (select id from cabang where kode = 'BDG-HUB')) where kode = '6-60002') = 4000000, 'laba rugi per cabang memakai tag cabang');
select cek((select count(*) from buku_besar((select id from akun where kode = '1-10011'), (select tgl from t) - 40, (select tgl from t) + 31)) >= 4, 'buku besar BCA Operasional');

-- Rekonsiliasi
select impor_mutasi((select id from akun where kode = '1-10011'), jsonb_build_array(jsonb_build_object('tanggal', (select tgl from t), 'keterangan', 'TRSF BENGKEL JAYA', 'jumlah', -450000)));
select cek((select count(*) from saran_rekonsiliasi) >= 1, 'mutasi bank mendapat saran pasangan');
select cocokkan_mutasi((select mutasi_id from saran_rekonsiliasi limit 1), (select jurnal_baris_id from saran_rekonsiliasi limit 1));
select cek((select count(*) from mutasi_bank where jurnal_baris_id is not null) = 1, 'mutasi dicocokkan');
select keluar();
