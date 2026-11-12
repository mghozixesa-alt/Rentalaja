# Server GPS Rentalaja (Traccar)

Alat GPS MiCODUS diarahkan ke server ini lewat SMS. Server meneruskan setiap posisi ke Rentalaja
(`gps-ingest` → `unit_gps`, `app.gps_points`), lalu tampil di aplikasi: **Aset → Peta armada GPS** dan halaman unit → **GPS live**.

## Kebutuhan
- VPS kecil (1 vCPU, 1–2 GB RAM, Ubuntu 22/24), lokasi Singapura/Jakarta. Perkiraan Rp100–200 rb/bulan.
- Domain, contoh `gps.rentalaja.co.id` → A record ke IP VPS (DNS di Cloudflare, **proxy dimatikan / DNS only**, karena alat memakai TCP).

## Pasang (±15 menit)
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
mkdir -p ~/traccar && cd ~/traccar
# salin docker-compose.yml dan traccar.xml dari folder ini
cp .env.example .env
# ganti TOKEN di traccar.xml dengan token dari aplikasi (jangan kirim token lewat chat)
docker compose up -d
sudo ufw allow 5023/tcp && sudo ufw allow 5015/tcp && sudo ufw allow 5013/tcp && sudo ufw allow OpenSSH && sudo ufw enable
```
Port 8082 (web admin Traccar) sebaiknya tidak dibuka ke internet. Buka lewat `ssh -L 8082:localhost:8082 user@vps`, lalu http://localhost:8082, buat akun admin pertama.

## Setelah server hidup
1. Owner: Aplikasi → Aset → **Peta armada GPS** → Pengaturan server GPS: host `gps.rentalaja.co.id`, port `5023`.
2. Tim aset, per unit: halaman unit → **GPS live → Sambungkan ke server GPS Rentalaja**. Aplikasi menyiapkan SMS
   `SERVER,1,gps.rentalaja.co.id,5023,0#` (format MiCODUS/GT06) dan tombol buka SMS ke nomor SIM alat.
3. Isi km odometer saat itu, tekan **Sudah kirim SMS, sambungkan**. Posisi pertama biasanya masuk 1–10 menit.
4. Mundur: SMS `SERVER,1,d.micodus.net,7700,0#` lalu **Lepas dari server baru**.

Alat yang tidak tersambung di port 5023: cek log `docker logs traccar | grep -i unknown`, lalu coba port 5015 (JT808) sesuai model.

## Uji coba tanpa VPS (flespi, gratis maks. 10 alat)
Untuk 1–5 unit uji, bisa pakai flespi Free (10 device, 1 stream, maks. 5 koneksi bersamaan per channel):
buat channel protokol **micodus** atau **gt06**, buat Stream HTTP ke URL `gps-ingest` dengan header Authorization yang sama.
Isi host & port channel flespi di Pengaturan server GPS. Format pesan flespi juga dibaca `gps_ingest`.

## Pemeliharaan
- Cadangan: salin folder `data/` tiap hari (cron `tar` ke penyimpanan lain).
- Pembaruan: `docker compose pull && docker compose up -d`.
- Bila server mati, alat menyimpan posisi sementara dan Traccar mengirim ulang (retry) setelah hidup.
