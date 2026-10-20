-- Jalankan sekali di Supabase (SQL Editor) setelah migrasi: bucket privat untuk KTP, KK, SIM, dan foto kondisi unit.
insert into storage.buckets (id, name, public) values ('dokumen', 'dokumen', false), ('foto-unit', 'foto-unit', false)
on conflict (id) do nothing;

-- Pelanggan hanya bisa mengunggah dan membaca file di foldernya sendiri: dokumen/<auth uid>/...
create policy "unggah dokumen sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'dokumen' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "baca dokumen sendiri" on storage.objects for select to authenticated
  using (bucket_id = 'dokumen' and (storage.foldername(name))[1] = auth.uid()::text);
-- Staf membuka dokumen lewat link sementara yang dibuat server (service role), bukan akses langsung.

create policy "staf unggah foto unit" on storage.objects for insert to authenticated
  with check (bucket_id = 'foto-unit' and public.is_staf());
create policy "staf baca foto unit" on storage.objects for select to authenticated
  using (bucket_id = 'foto-unit' and public.is_staf());
