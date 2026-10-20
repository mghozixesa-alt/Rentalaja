-- Jalankan sekali di Supabase (SQL Editor) setelah migrasi. Butuh ekstensi pg_cron (Database → Extensions).
create extension if not exists pg_cron;
select cron.schedule('kedaluwarsakan-booking', '* * * * *', $$select public.kedaluwarsakan_booking()$$);
select cron.schedule('konfirmasi-sopir-lewat', '*/10 * * * *', $$select public.tandai_konfirmasi_sopir_lewat()$$);
