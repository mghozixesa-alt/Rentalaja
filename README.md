# Rentalaja · situs rilis (cabang `situs`)

Cabang ini di-deploy langsung ke Vercel (proyek rentalaja-app) dari GitHub. Isinya:
- Aplikasi (index.html, ra.js, dc-runtime.js, r-*.bin, manifest.json), config.js = Supabase produksi `shrvzlltysnbmgpkhjjg`.
- Halaman SEO statis di `/sewa/` + `sitemap.xml` + `robots.txt`, dibangun oleh `_seo/build.py` dari `_seo/data.txt`.

Rilis:
1. Ubah berkas, lalu naikkan angka `?v=` pada `ra.js` dan `dc-runtime.js` di index.html (wajib, kalau tidak browser memakai berkas lama → layar kosong).
2. Push ke cabang `situs`, lalu deploy dari Vercel (production).
3. Domain pindah: jalankan `python3 _seo/build.py . https://rentalaja.co.id`, commit, deploy.

Perubahan dari rilis kanvas: pilihan sewa 2 jam / ½ hari, label durasi, login Google (sakelar settings.login_google). Jangan timpa dengan build kanvas tanpa membawa perubahan ini.
