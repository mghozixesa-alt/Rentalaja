-- Rentalaja Web v2 · 09 · Aturan akses (Row Level Security) untuk semua 62 tabel
-- Prinsip: pelanggan hanya datanya sendiri, staf hanya cabangnya, mitra hanya unitnya, pusat semua.
-- Perubahan status dan uang lewat fungsi di file 08 (security definer), bukan tulis langsung.

-- 1. Nyalakan RLS di semua tabel
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- 2. Katalog publik: boleh dibaca siapa saja (termasuk belum login)
create policy baca_publik on cabang for select using (aktif);
create policy baca_publik on zona_ongkir for select using (aktif);
create policy baca_publik on kategori for select using (true);
create policy baca_publik on produk for select using (status = 'terbit' or is_staf());
create policy baca_publik on tarif for select using (true);
create policy baca_publik on paket for select using (status = 'terbit' or is_staf());
create policy baca_publik on promo for select using (aktif or is_staf());
create policy baca_publik on konten_web for select using (status = 'terbit' or is_staf());
create policy baca_publik on ulasan for select using (tampil or is_staf());
create policy baca_publik on pengaturan for select using (true);

-- 3. Master: ditulis manajemen pusat (tambah, ubah; hapus permanen lewat fungsi)
do $$
declare t text;
begin
  foreach t in array array['cabang', 'zona_ongkir', 'kategori', 'produk', 'tarif', 'paket', 'promo', 'konten_web', 'pengaturan', 'daftar_cek_qc', 'jadwal_perawatan']
  loop
    execute format('create policy tulis_pusat on %I for insert with check (is_pusat() or peran_saya() = ''manajer_experience'')', t);
    execute format('create policy ubah_pusat on %I for update using (is_pusat() or peran_saya() = ''manajer_experience'')', t);
  end loop;
end $$;
create policy baca_staf on daftar_cek_qc for select using (is_staf());
create policy baca_staf on jadwal_perawatan for select using (is_staf());

-- 4. Unit: staf cabang melihat unit cabangnya; mitra melihat unit miliknya; tambah/ubah data oleh pusat
create policy baca_cabang on unit for select using (boleh_cabang(cabang_id));
create policy baca_mitra on unit for select using (exists (
  select 1 from kepemilikan_unit k join perjanjian_mitra p on p.id = k.perjanjian_id join investor i on i.id = p.investor_id
  where k.unit_id = unit.id and i.auth_id = auth.uid()));
create policy tulis_pusat on unit for insert with check (is_pusat() or (peran_saya() = 'manajer_experience' and boleh_cabang(cabang_id)));
create policy ubah_pusat on unit for update using (is_pusat() or (peran_saya() = 'manajer_experience' and boleh_cabang(cabang_id)));

-- 5. Pengguna dan peran
create policy baca_diri on pengguna for select using (id = auth.uid() or is_pusat() or (is_staf() and boleh_cabang(cabang_id)));
create policy kelola_owner on pengguna for all using (peran_saya() = 'owner') with check (peran_saya() = 'owner');
create policy baca_staf on peran_izin for select using (is_staf());
create policy kelola_owner on peran_izin for all using (peran_saya() = 'owner') with check (peran_saya() = 'owner');

-- 6. Pelanggan: data sendiri; staf cabang boleh melihat pelanggan (untuk verifikasi)
create policy diri on pelanggan for select using (auth_id = auth.uid() or is_staf());
create policy daftar on pelanggan for insert with check (auth_id = auth.uid());
create policy ubah_diri on pelanggan for update using (auth_id = auth.uid() or is_staf());

create policy diri on dokumen for select using (pelanggan_id = pelanggan_saya() or peran_saya() in ('owner', 'cs', 'kepala_cabang'));
create policy unggah on dokumen for insert with check (pelanggan_id = pelanggan_saya());
create policy periksa on dokumen for update using (peran_saya() in ('owner', 'cs', 'kepala_cabang'));

create policy diri on poin_mutasi for select using (pelanggan_id = pelanggan_saya() or is_staf());
create policy staf on pelanggaran for all using (is_staf()) with check (is_staf());
create policy staf on daftar_hitam for select using (is_staf());
create policy kelola on daftar_hitam for all using (peran_saya() in ('owner', 'cs', 'kepala_cabang')) with check (peran_saya() in ('owner', 'cs', 'kepala_cabang'));
create policy diri on rujukan for select using (pengajak_id = pelanggan_saya() or is_staf());

-- 7. Booking dan turunannya
create policy diri on booking for select using (pelanggan_id = pelanggan_saya() or boleh_cabang(cabang_id));
create policy buat on booking for insert with check ((pelanggan_id = pelanggan_saya() and status = 'draf') or boleh_cabang(cabang_id));
create policy ubah_data on booking for update using (boleh_cabang(cabang_id));

create policy ikut_booking on booking_item for select using (exists (select 1 from booking b where b.id = booking_id and (b.pelanggan_id = pelanggan_saya() or boleh_cabang(b.cabang_id))));
create policy tambah_item on booking_item for insert with check (exists (select 1 from booking b where b.id = booking_id and b.status = 'draf' and (b.pelanggan_id = pelanggan_saya() or boleh_cabang(b.cabang_id))));

create policy staf on ketersediaan for select using (exists (select 1 from unit u where u.id = unit_id and boleh_cabang(u.cabang_id)));
create policy blokir on ketersediaan for insert with check (alasan in ('perawatan', 'blokir') and exists (select 1 from unit u where u.id = unit_id and boleh_cabang(u.cabang_id)));

create policy diri on pembayaran for select using (exists (select 1 from booking b where b.id = booking_id and (b.pelanggan_id = pelanggan_saya() or boleh_cabang(b.cabang_id))) or is_pusat());
create policy kasir on pembayaran for insert with check (metode = 'tunai' and peran_saya() in ('kasir', 'cs', 'kepala_cabang', 'owner')
  and exists (select 1 from booking b where b.id = booking_id and boleh_cabang(b.cabang_id)));

create policy staf on refund for select using (is_pusat() or exists (select 1 from pembayaran p join booking b on b.id = p.booking_id where p.id = pembayaran_id and boleh_cabang(b.cabang_id)));
create policy ajukan on refund for insert with check (is_staf());

create policy diri on tagihan for select using (pelanggan_id = pelanggan_saya() or is_staf());
create policy staf on tagihan for insert with check (is_staf());

create policy tulis on ulasan for insert with check (exists (select 1 from booking b where b.id = booking_id and b.pelanggan_id = pelanggan_saya() and b.status = 'selesai'));
create policy moderasi on ulasan for update using (is_pusat());

create policy diri on klaim for select using (exists (select 1 from booking b where b.id = booking_id and b.pelanggan_id = pelanggan_saya()) or is_staf());
create policy staf on klaim for insert with check (is_staf());
create policy staf_ubah on klaim for update using (is_pusat() or peran_saya() in ('kepala_cabang', 'cs'));

create policy pusat on penawaran for all using (is_pusat() or peran_saya() in ('cs', 'kepala_cabang')) with check (is_pusat() or peran_saya() in ('cs', 'kepala_cabang'));
create policy pusat on kontrak_korporat for all using (is_pusat()) with check (is_pusat());

-- 8. Operasional: staf cabangnya
do $$
declare t text;
begin
  foreach t in array array['shift', 'absensi', 'mutasi_unit', 'stok_part'] loop
    execute format('create policy cabang on %I for select using (is_pusat() or boleh_cabang(%s))', t,
                   case t when 'mutasi_unit' then 'dari_cabang) or boleh_cabang(ke_cabang' else 'cabang_id' end);
    execute format('create policy tulis on %I for insert with check (is_staf())', t);
    execute format('create policy ubah on %I for update using (is_staf())', t);
  end loop;
end $$;
create policy cabang on kas_shift for select using (exists (select 1 from shift s where s.id = shift_id and boleh_cabang(s.cabang_id)));
create policy tutup on kas_shift for insert with check (exists (select 1 from shift s where s.id = shift_id and s.pengguna_id = auth.uid()));

create policy cabang on serah_terima for select using (exists (select 1 from booking b where b.id = booking_id and (boleh_cabang(b.cabang_id) or b.pelanggan_id = pelanggan_saya())));
create policy cabang on foto_unit for select using (exists (select 1 from unit u where u.id = unit_id and boleh_cabang(u.cabang_id)));
create policy unggah on foto_unit for insert with check (is_staf());
create policy cabang on tugas_runner for select using (runner_id = auth.uid() or exists (select 1 from booking b where b.id = booking_id and boleh_cabang(b.cabang_id)));
create policy ubah on tugas_runner for update using (runner_id = auth.uid() or is_staf());
create policy tulis on tugas_runner for insert with check (is_staf());
create policy lapor on laporan_kendala for insert with check (is_staf() or exists (select 1 from booking b where b.id = booking_id and b.pelanggan_id = pelanggan_saya()));
create policy baca on laporan_kendala for select using (is_staf() or exists (select 1 from booking b where b.id = booking_id and b.pelanggan_id = pelanggan_saya()));

create policy cabang on work_order for select using (boleh_cabang(cabang_id) or teknisi_id = auth.uid());
create policy cabang on work_order_item for select using (exists (select 1 from work_order w where w.id = work_order_id and (boleh_cabang(w.cabang_id) or w.teknisi_id = auth.uid())));
create policy teknisi on work_order_item for insert with check (exists (select 1 from work_order w where w.id = work_order_id and w.status in ('dikerjakan', 'tunggu_part') and (w.teknisi_id = auth.uid() or peran_saya() = 'kepala_cabang')));
create policy cabang on hasil_qc for select using (exists (select 1 from unit u where u.id = unit_id and boleh_cabang(u.cabang_id)));
create policy cabang on housekeeping for select using (exists (select 1 from unit u where u.id = unit_id and boleh_cabang(u.cabang_id)));
create policy cabang on cek_getcontact for select using (exists (select 1 from booking b where b.id = booking_id and boleh_cabang(b.cabang_id)));

-- 9. Keuangan: pusat; mitra hanya miliknya
do $$
declare t text;
begin
  foreach t in array array['leasing_kontrak', 'cicilan', 'biaya_unit', 'biaya_operasional', 'settlement_xendit', 'pengajuan_beli', 'komisi_staf', 'tutup_buku', 'persetujuan']
  loop
    execute format('create policy pusat on %I for all using (is_pusat()) with check (is_pusat())', t);
  end loop;
end $$;
create policy ajukan on pengajuan_beli for insert with check (is_staf());
create policy cabang on pengajuan_beli for select using (boleh_cabang(cabang_id));
create policy catat on biaya_operasional for insert with check (is_staf() and boleh_cabang(cabang_id));
create policy diri on komisi_staf for select using (pengguna_id = auth.uid());
create policy ajukan on persetujuan for insert with check (is_staf());
create policy diri on persetujuan for select using (diajukan_oleh = auth.uid());

create policy pusat on investor for all using (is_pusat()) with check (is_pusat());
create policy diri on investor for select using (auth_id = auth.uid());
create policy pusat on perjanjian_mitra for all using (is_pusat()) with check (is_pusat());
create policy diri on perjanjian_mitra for select using (exists (select 1 from investor i where i.id = investor_id and i.auth_id = auth.uid()));
create policy pusat on kepemilikan_unit for all using (is_pusat()) with check (is_pusat());
create policy diri on kepemilikan_unit for select using (exists (select 1 from perjanjian_mitra p join investor i on i.id = p.investor_id where p.id = perjanjian_id and i.auth_id = auth.uid()));
create policy pusat on bagi_hasil for all using (is_pusat()) with check (is_pusat());
create policy diri on bagi_hasil for select using (status <> 'dihitung' and exists (select 1 from perjanjian_mitra p join investor i on i.id = p.investor_id where p.id = perjanjian_id and i.auth_id = auth.uid()));
create policy pusat on penarikan for all using (is_pusat()) with check (is_pusat());
create policy diri on penarikan for select using (exists (select 1 from investor i where i.id = investor_id and i.auth_id = auth.uid()));
create policy ajukan on penarikan for insert with check (exists (select 1 from investor i where i.id = investor_id and i.auth_id = auth.uid()));
create policy pusat on pendapatan_unit_harian for select using (is_pusat() or exists (select 1 from unit u where u.id = unit_id and boleh_cabang(u.cabang_id)));
create policy mitra on pendapatan_unit_harian for select using (exists (
  select 1 from kepemilikan_unit k join perjanjian_mitra p on p.id = k.perjanjian_id join investor i on i.id = p.investor_id
  where k.unit_id = pendapatan_unit_harian.unit_id and i.auth_id = auth.uid()));

-- 10. Sistem
create policy pusat on notifikasi for select using (is_pusat());
create policy pusat on webhook_log for select using (is_pusat());
create policy pemilik on audit_log for select using (peran_saya() in ('owner', 'keuangan'));

-- 11. Hak dasar untuk peran Supabase (RLS tetap menyaring baris)
grant usage on schema public to anon, authenticated;
grant select on cabang, zona_ongkir, kategori, produk, tarif, paket, promo, konten_web, ulasan, pengaturan to anon;
grant select, insert, update on all tables in schema public to authenticated;
grant delete on daftar_cek_qc, konten_web, promo, paket, tarif to authenticated;
revoke update, delete on audit_log from authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on function cek_ketersediaan(uuid, uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on all functions in schema public to authenticated;
