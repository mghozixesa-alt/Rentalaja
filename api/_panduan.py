# Artikel panduan Rentalaja (/panduan/...).
# Isi ditulis tangan; harga, daftar barang, dan cabang diisi otomatis dari database lewat penanda:
#   [[tabel:kategori:kota]]        tabel harga barang kategori itu di kota itu
#   [[kartu:kategori:kota:N]]      N kartu barang (urut harga)
#   [[harga:slug-produk:kota]]     harga harian, mis. "Rp150.000/hari"
#   [[rute:KODE:Tujuan]]           tautan rute Google Maps dari cabang ke tujuan
#   [[cabang:KODE]]                kotak alamat & jam buka cabang
# Aturan isi: hanya fakta yang benar (stok, syarat, promo dari sistem; info tempat wisata yang umum diketahui).
# Jangan tulis jarak/harga tiket wisata yang belum dicek — arahkan ke Google Maps / pengelola.

ARTICLES = [
dict(
    slug='rute-motor-garut-papandayan', city='garut', cats=['motor', 'camping'], date='2026-11-10',
    title='Rute Naik Motor dari Garut Kota ke Gunung Papandayan',
    desc='Panduan ke Gunung Papandayan naik motor dari Garut Kota: jalur Bayongbong–Cisurupan, motor yang disarankan untuk tanjakan, dan perlengkapan yang bisa disewa.',
    lead='Cara paling praktis ke Gunung Papandayan dari Garut Kota adalah naik motor lewat jalur Bayongbong–Cisurupan. Untuk tanjakan menuju area parkir Papandayan, kami menyarankan Honda PCX ([[harga:honda-pcx:garut]]) yang bisa diambil di Rentalaja Garut Kota, Jl. Cimanuk.',
    body='''
<h2>Jalur dari Garut Kota</h2>
<p>Gunung Papandayan berada di Kecamatan Cisurupan, di selatan Garut Kota. Dari Jl. Cimanuk, arahnya menuju Bayongbong lalu Cisurupan, kemudian naik ke kawasan Taman Wisata Alam Papandayan. Bagian terakhir jalannya menanjak dan berkelok, jadi siapkan motor yang kuat dan isi bensin penuh sebelum naik.</p>
<p>Waktu tempuh tergantung lalu lintas, terutama akhir pekan. Cek perkiraan terbaru di [[rute:GRT:Taman Wisata Alam Gunung Papandayan]].</p>

<h2>Motor yang disarankan</h2>
<p>Honda PCX lebih nyaman dan bertenaga untuk tanjakan Papandayan. Honda Beat cocok untuk keliling kota, tapi kurang ideal untuk jalur menanjak dengan boncengan dan bawaan.</p>
[[tabel:motor:garut]]
<p>Helm dan jas hujan sudah disiapkan. Syaratnya KTP, SIM C, dan KK yang diunggah sekali di aplikasi.</p>

<h2>Yang biasa dikunjungi di Papandayan</h2>
<ul class="tips">
<li><b>Kawah Papandayan</b> — area kawah aktif dengan asap belerang. Ikuti jalur resmi dan hindari mendekati lubang asap.</li>
<li><b>Hutan Mati</b> — hamparan batang pohon yang menghitam, salah satu spot foto paling dikenal.</li>
<li><b>Pondok Saladah</b> — area camping yang umum dipakai pendaki untuk bermalam.</li>
<li><b>Tegal Alun</b> — padang edelweiss di bagian atas. Edelweiss dilindungi, jangan dipetik.</li>
</ul>
<p>Tiket masuk, parkir, dan biaya camping ditentukan pengelola dan bisa berubah. Cek informasi terbaru sebelum berangkat.</p>

<h2>Mau camping? Sewa perlengkapannya sekalian</h2>
<p>Perlengkapan camping bisa diambil di cabang yang sama dengan motornya, jadi tidak perlu bolak-balik.</p>
[[kartu:camping:garut:8]]
<p>Lihat juga <a href="/panduan/checklist-alat-camping-garut">checklist alat camping</a>.</p>

<h2>Tips singkat</h2>
<ul class="tips">
<li>Berangkat pagi supaya tidak turun gunung dalam gelap.</li>
<li>Bawa jaket hangat; udara di atas jauh lebih dingin dari Garut Kota.</li>
<li>Kembalikan motor sesuai jam di booking, atau perpanjang dari aplikasi sebelum waktunya habis.</li>
</ul>
[[cabang:GRT]]
'''),

dict(
    slug='sewa-motor-stasiun-garut', city='garut', cats=['motor'], date='2026-11-10',
    title='Sewa Motor Dekat Stasiun Garut: Ambil di Jl. Cimanuk atau Minta Diantar',
    desc='Turun di Stasiun Garut dan butuh motor? Rentalaja Garut Kota di Jl. Cimanuk berjarak sekitar 600 meter dari stasiun, atau motor bisa diantar dengan ongkir sesuai jarak.',
    lead='Rentalaja Garut Kota ada di Jl. Cimanuk No.24C, sekitar 600 meter (garis lurus) dari Stasiun Garut. Anda bisa jalan ke cabang untuk ambil motor, atau pilih "Diantar" saat booking supaya motor dikirim ke stasiun dengan ongkir sesuai jarak.',
    body='''
<h2>Dua cara ambil motor</h2>
<ol class="steps">
<li><b>Ambil di cabang.</b> Dari Stasiun Garut, cabang Garut Kota cukup dekat: [[rute:GRT:Stasiun Garut]] (rute dari cabang ke stasiun).</li>
<li><b>Diantar ke stasiun.</b> Saat booking, pilih "Diantar" dan pilih titik Stasiun Garut. Ongkir dihitung dari jarak dan dikonfirmasi cabang.</li>
</ol>

<h2>Harga sewa motor di Garut Kota</h2>
[[tabel:motor:garut]]
<p>Helm dan jas hujan sudah disiapkan. Untuk perjalanan ke Papandayan atau jalur menanjak lain, pilih Honda PCX.</p>

<h2>Cara booking sebelum tiba</h2>
<ol class="steps">
<li>Buka <a href="/#/Katalog?cat=motor">katalog motor</a>, pilih tanggal dan jam ambil sesuai jadwal kereta.</li>
<li>Unggah KTP, SIM C, dan KK sekali saja, lalu tunggu verifikasi.</li>
<li>Bayar DP 20% secara online. Sisanya dibayar saat motor diterima.</li>
</ol>
<p>Cabang buka setiap hari 07.30–21.00. Kalau kereta tiba di luar jam itu, kabari admin lewat WhatsApp sebelumnya.</p>

<h2>Tujuan populer dari Garut Kota</h2>
<ul class="tips">
<li><a href="/panduan/wisata-cipanas-garut-naik-motor">Pemandian air panas Cipanas</a></li>
<li><a href="/panduan/rute-motor-garut-papandayan">Gunung Papandayan</a></li>
<li><a href="/panduan/rute-motor-kamojang-darajat">Kawah Kamojang dan Darajat</a></li>
</ul>
[[cabang:GRT]]
'''),

dict(
    slug='wisata-cipanas-garut-naik-motor', city='garut', cats=['motor'], date='2026-11-10',
    title='Ke Cipanas Garut Naik Motor Sewaan dari Garut Kota',
    desc='Panduan singkat ke kawasan air panas Cipanas Garut naik motor dari Garut Kota: rute, motor yang cocok, dan tips berendam.',
    lead='Kawasan air panas Cipanas di Tarogong Kaler, di kaki Gunung Guntur, mudah dijangkau naik motor dari Garut Kota. Honda Beat dari Rentalaja Garut Kota ([[harga:honda-beat-cbs-new:garut]]) sudah cukup untuk perjalanan ini.',
    body='''
<h2>Rute dari Garut Kota</h2>
<p>Cipanas ada di utara Garut Kota, di Kecamatan Tarogong Kaler. Jalannya relatif datar dan ramai, jadi motor matic biasa sudah cukup. Lihat rute dan perkiraan waktu terbaru di [[rute:GRT:Cipanas Garut]].</p>

<h2>Pilihan motor</h2>
[[tabel:motor:garut]]

<h2>Tips berendam di Cipanas</h2>
<ul class="tips">
<li>Banyak hotel dan kolam air panas di sepanjang kawasan ini; harga masuk berbeda-beda per tempat.</li>
<li>Bawa pakaian ganti dan simpan barang berharga di bagasi motor yang terkunci.</li>
<li>Jangan berendam terlalu lama di air yang sangat panas, terutama setelah makan.</li>
</ul>

<h2>Menginap di Cipanas?</h2>
<p>Kalau menginap di hotel atau villa sekitar Cipanas, motor bisa diantar. Pilih "Diantar" saat booking dan isi alamat penginapan; ongkir dihitung dari jarak.</p>
<p>Baca juga <a href="/sewa/motor-antar-hotel-garut.html">sewa motor diantar ke hotel di Garut</a>.</p>
[[cabang:GRT]]
'''),

dict(
    slug='rute-motor-kamojang-darajat', city='garut', cats=['motor'], date='2026-11-10',
    title='Naik Motor ke Kawah Kamojang dan Darajat dari Garut Kota',
    desc='Panduan naik motor ke Kawah Kamojang dan kawasan air panas Darajat dari Garut Kota: jalur pegunungan, motor yang disarankan, dan tips aman.',
    lead='Kawah Kamojang dan kawasan Darajat di barat Garut sama-sama berada di jalur pegunungan yang menanjak dan berkelok. Untuk rute ini kami menyarankan Honda PCX ([[harga:honda-pcx:garut]]) dari Rentalaja Garut Kota.',
    body='''
<h2>Kawah Kamojang</h2>
<p>Kamojang dikenal sebagai kawasan panas bumi dengan kawah-kawah kecil dan uap yang keluar dari tanah. Kawasannya juga dekat dengan pembangkit listrik panas bumi. Jalurnya menanjak dari arah Samarang. Cek rute: [[rute:GRT:Kawah Kamojang]].</p>

<h2>Darajat</h2>
<p>Darajat di Kecamatan Pasirwangi terkenal dengan kolam-kolam air panas dan pemandangan perbukitan. Jalurnya juga naik dari arah Samarang. Cek rute: [[rute:GRT:Darajat Pass]].</p>

<h2>Motor yang disarankan</h2>
[[tabel:motor:garut]]
<p>Untuk berboncengan di jalur menanjak, PCX lebih nyaman. Pastikan rem dan bensin dicek sebelum naik.</p>

<h2>Tips aman di jalur pegunungan</h2>
<ul class="tips">
<li>Kabut dan hujan sering turun sore hari. Berangkat pagi dan bawa jas hujan (sudah disiapkan bersama motor).</li>
<li>Pakai rem secara bergantian saat turunan panjang supaya rem tidak terlalu panas.</li>
<li>Isi bensin penuh di kota; SPBU di jalur atas lebih jarang.</li>
</ul>
[[cabang:GRT]]
'''),

dict(
    slug='checklist-alat-camping-garut', city='garut', cats=['camping'], date='2026-11-10',
    title='Checklist Alat Camping untuk Papandayan, Guntur, dan Cikuray',
    desc='Checklist perlengkapan camping dan hiking di Garut, lengkap dengan harga sewa per item di Rentalaja Garut Kota.',
    lead='Untuk camping di gunung sekitar Garut seperti Papandayan, Guntur, atau Cikuray, perlengkapan dasarnya adalah carrier, sleeping bag, matras, penerangan, alat masak, dan jaket hangat. Item di tabel bawah bisa disewa per hari di Rentalaja Garut Kota.',
    body='''
<h2>Harga sewa alat camping</h2>
[[tabel:camping:garut]]
<p>Harga per item per hari, diperbarui otomatis dari sistem. Promo sewa lebih dari 1 hari otomatis dihitung saat booking.</p>

<h2>Checklist dasar</h2>
<ul class="tips">
<li><b>Bawa barang:</b> carrier sesuai lama perjalanan (45L untuk 1 malam, 60L untuk bawaan lebih banyak).</li>
<li><b>Tidur:</b> sleeping bag dan matras (spon atau foil) untuk menahan dingin dari tanah.</li>
<li><b>Penerangan:</b> headlamp untuk berjalan, lampu tenda untuk di camp, senter cadangan.</li>
<li><b>Masak:</b> kompor portable dan gas.</li>
<li><b>Pakaian:</b> jaket hiking dan sepatu outdoor (bisa disewa), plus jas hujan dan pakaian ganti dari rumah.</li>
<li><b>Lainnya:</b> trekking pole untuk turunan, hydropack untuk minum di jalan.</li>
</ul>
<p>Tenda belum tersedia di katalog online. Tanyakan ketersediaannya ke admin lewat WhatsApp.</p>

<h2>Tips sewa</h2>
<ul class="tips">
<li>Booking dari jauh hari untuk akhir pekan dan libur panjang.</li>
<li>Cek kelengkapan saat ambil (kompor, gas, lampu) bersama petugas.</li>
<li>Kembalikan dalam keadaan kering dan bersih.</li>
</ul>
<p>Butuh motor ke basecamp? Lihat <a href="/panduan/rute-motor-garut-papandayan">rute motor ke Papandayan</a>.</p>
[[cabang:GRT]]
'''),

dict(
    slug='kamera-lensa-wisuda-prewedding-garut', city='garut', cats=['kamera', 'lensa'], date='2026-11-10',
    title='Pilih Kamera dan Lensa untuk Foto Wisuda dan Prewedding di Garut',
    desc='Kombinasi kamera dan lensa yang cocok untuk foto wisuda, prewedding, dan potret di Garut, dengan harga sewa 2 jam, ½ hari, dan harian.',
    lead='Untuk foto wisuda dan prewedding, kombinasi kamera mirrorless dengan lensa fix berbukaan lebar (f/1.4–f/1.8) memberi latar belakang blur yang rapi. Di Rentalaja Garut Kota tersedia Sony, Fujifilm, dan Canon, dengan tarif mulai 2 jam untuk sesi singkat.',
    body='''
<h2>Kombinasi yang cocok</h2>
<ul class="tips">
<li><b>Sony A6000 / A6400</b> + Sigma 30mm F1.4 for Sony atau Sony E 35mm F1.8 — ringan, potret setengah badan.</li>
<li><b>Sony A7II / A7III</b> (full frame) + Sony FE 85mm F1.8 — potret dengan latar sangat blur, cocok untuk prewedding.</li>
<li><b>Fujifilm X-T20 / X-T2 / X-T4</b> + Fujinon 35mm atau Sigma 56mm F1.4 for Fujifilm — warna khas Fujifilm tanpa banyak edit.</li>
<li><b>Canon DSLR</b> (1100D–700D) + Canon 50mm F1.8 / STM — pilihan hemat untuk foto potret.</li>
</ul>
<p>Pastikan lensa sesuai mount kamera: lensa "for Sony" untuk Sony, "for Fujifilm" untuk Fujifilm, dan lensa Canon EF/EF-S untuk DSLR Canon.</p>

<h2>Harga sewa kamera</h2>
[[tabel:kamera:garut]]

<h2>Harga sewa lensa</h2>
[[tabel:lensa:garut]]

<h2>Tips sewa untuk sesi foto</h2>
<ul class="tips">
<li>Sesi wisuda singkat? Pakai tarif 2 jam atau ½ hari.</li>
<li>Sewa lebih dari 1 hari bisa kena promo hari gratis (otomatis saat booking).</li>
<li>Cek baterai saat ambil; baterai cadangan Canon bisa disewa terpisah.</li>
<li>Pindahkan foto ke perangkat Anda sebelum mengembalikan kamera.</li>
</ul>
[[cabang:GRT]]
'''),

dict(
    slug='pilih-iphone-sewa-garut', city='garut', cats=['iphone'], date='2026-11-10',
    title='Sewa iPhone di Garut: Bedanya iPhone XR, 11, 13, 15, dan 16',
    desc='Perbandingan singkat iPhone XR, 11, 13, 15, dan 16 yang bisa disewa di Garut Kota dan Wanaraja, untuk konten, acara, atau coba sebelum beli.',
    lead='Kalau butuh iPhone untuk konten atau acara di Garut, pilih berdasarkan kamera: iPhone XR cukup untuk foto biasa, iPhone 11 dan 13 punya kamera ultra wide, sedangkan iPhone 15 dan 16 punya kamera utama 48MP. Semua model tersedia di Rentalaja Garut Kota, dan sebagian juga di Wanaraja.',
    body='''
<h2>Perbedaan singkat</h2>
<div class="scroll"><table><thead><tr><th>Model</th><th>Kamera belakang</th><th>Catatan</th></tr></thead><tbody>
<tr><td>iPhone XR</td><td>1 kamera 12MP</td><td>Paling hemat, cukup untuk foto sehari-hari</td></tr>
<tr><td>iPhone 11</td><td>2 kamera 12MP (utama + ultra wide)</td><td>Ultra wide untuk foto pemandangan dan grup</td></tr>
<tr><td>iPhone 13</td><td>2 kamera 12MP (utama + ultra wide)</td><td>Ada mode Cinematic untuk video</td></tr>
<tr><td>iPhone 15</td><td>Utama 48MP + ultra wide</td><td>Port USB-C, detail foto lebih tinggi</td></tr>
<tr><td>iPhone 16</td><td>Utama 48MP + ultra wide</td><td>Tombol Camera Control, USB-C</td></tr>
</tbody></table></div>

<h2>Harga sewa iPhone di Garut</h2>
[[tabel:iphone:garut]]
<p>Charger dan tas sudah termasuk. Ada tarif ½ hari untuk acara singkat.</p>

<h2>Tips</h2>
<ul class="tips">
<li>Untuk konten video, pilih iPhone 13 ke atas.</li>
<li>Untuk foto pemandangan dan grup, pilih model yang punya ultra wide (iPhone 11 ke atas).</li>
<li>Pindahkan foto dan video ke HP atau cloud Anda sebelum mengembalikan unit.</li>
<li>Syarat: KTP dan KK yang diunggah sekali di aplikasi.</li>
</ul>
[[cabang:GRT]]
[[cabang:WNR]]
'''),

dict(
    slug='sewa-iphone-konser-wisuda-bandung', city='bandung', cats=['iphone'], date='2026-11-10',
    title='Sewa iPhone untuk Konser dan Wisuda di Bandung (Coblong)',
    desc='Sewa iPhone harian atau ½ hari di Rentalaja Bandung, Kecamatan Coblong, dekat kawasan ITB dan Sabuga, untuk konser, wisuda, dan konten.',
    lead='Rentalaja Bandung di Jl. Kubang Selatan, Kecamatan Coblong, menyewakan iPhone XR sampai iPhone 15 dengan tarif harian dan ½ hari. Lokasinya satu kecamatan dengan kampus ITB Ganesha dan Sabuga, jadi praktis untuk wisuda atau konser.',
    body='''
<h2>Harga sewa iPhone di Bandung</h2>
[[tabel:iphone:bandung]]
<p>Charger dan tas sudah termasuk. Promo hari kerja di Bandung bisa berlaku untuk iPhone (otomatis saat booking, tidak berlaku di musim libur).</p>

<h2>Model mana untuk konser atau wisuda?</h2>
<ul class="tips">
<li><b>iPhone 15</b> — kamera utama 48MP, paling detail untuk foto panggung dan prosesi.</li>
<li><b>iPhone 13</b> — mode Cinematic untuk video, plus ultra wide.</li>
<li><b>iPhone 11 / XR</b> — pilihan hemat untuk foto dan video biasa.</li>
</ul>

<h2>Tips merekam konser dan wisuda</h2>
<ul class="tips">
<li>Isi baterai penuh dan bawa powerbank; merekam video lama cepat menguras baterai.</li>
<li>Kosongkan ruang penyimpanan sebelum acara.</li>
<li>Ketuk dan tahan objek di layar untuk mengunci fokus saat lampu panggung berubah-ubah.</li>
<li>Pindahkan hasil ke HP atau cloud Anda sebelum mengembalikan unit.</li>
</ul>

<h2>Cara sewa</h2>
<ol class="steps">
<li>Pilih iPhone dan jadwal di <a href="/#/Katalog?cat=iphone">katalog</a>.</li>
<li>Unggah KTP dan KK sekali saja, tunggu verifikasi.</li>
<li>Bayar DP 20% online, ambil di cabang.</li>
</ol>
[[cabang:BDG-HUB]]
'''),

dict(
    slug='sewa-motor-dekat-itb-unpad-bandung', city='bandung', cats=['motor'], date='2026-11-10',
    title='Sewa Motor Harian di Bandung Dekat ITB dan Unpad Dipatiukur',
    desc='Sewa motor matic harian atau ½ hari di Rentalaja Bandung (Jl. Kubang Selatan, Coblong), dekat kawasan ITB, Dago, dan Unpad Dipatiukur.',
    lead='Rentalaja Bandung di Jl. Kubang Selatan, Kecamatan Coblong, menyewakan Honda Beat dan Honda PCX dengan tarif harian dan ½ hari. Lokasinya dekat kawasan ITB, Dago, dan kampus Unpad di Jl. Dipati Ukur.',
    body='''
<h2>Harga sewa motor di Bandung</h2>
[[tabel:motor:bandung]]
<p>Ambil Senin–Kamis bisa lebih hemat (promo hari kerja, otomatis saat booking).</p>

<h2>Cocok untuk</h2>
<ul class="tips">
<li>Mahasiswa atau tamu kampus yang butuh motor beberapa hari.</li>
<li>Keliling Bandung atau naik ke Lembang. Untuk tanjakan dan berboncengan, pilih PCX.</li>
<li>Keperluan singkat: pakai tarif ½ hari.</li>
</ul>

<h2>Syarat dan cara sewa</h2>
<ol class="steps">
<li>Pilih motor dan jadwal di <a href="/#/Katalog?cat=motor">katalog</a>.</li>
<li>Unggah KTP, SIM C, dan KK sekali saja, tunggu verifikasi.</li>
<li>Bayar DP 20% online, ambil motor di cabang. Helm dan jas hujan sudah disiapkan.</li>
</ol>
<p>Rute ke cabang: [[rute:BDG-HUB:Universitas Padjadjaran Dipatiukur]] (dari cabang ke Unpad Dipatiukur).</p>
[[cabang:BDG-HUB]]
'''),

dict(
    slug='sewa-proyektor-playstation-nobar', city=None, cats=['proyektor', 'game'], date='2026-11-10',
    title='Sewa Proyektor dan PlayStation untuk Nobar dan Acara di Garut dan Bandung',
    desc='Sewa proyektor, layar, dan PlayStation untuk nonton bareng, main bareng, atau acara di Garut dan Bandung, dengan tarif 2 jam, ½ hari, dan harian.',
    lead='Untuk nobar atau acara, sewa proyektor plus layar; untuk main bareng, sewa PlayStation. Keduanya tersedia di Rentalaja Garut Kota dan Bandung, dengan tarif 2 jam (proyektor), ½ hari, dan harian.',
    body='''
<h2>Proyektor dan layar — Garut</h2>
[[tabel:proyektor:garut]]
<h2>Proyektor dan layar — Bandung</h2>
[[tabel:proyektor:bandung]]

<h2>PlayStation — Garut</h2>
[[tabel:game:garut]]
<h2>PlayStation — Bandung</h2>
[[tabel:game:bandung]]

<h2>Tips nobar dan acara</h2>
<ul class="tips">
<li>Sewa layar sekalian supaya gambar lebih jelas dibanding ditembak ke dinding.</li>
<li>Siapkan kabel HDMI yang cocok dengan laptop, dan cek colokan listrik di lokasi.</li>
<li>Acara malam? Ambil sore dan kembalikan besok pagi dengan tarif harian.</li>
<li>Sewa 2 hari bisa kena promo hari gratis (otomatis saat booking).</li>
</ul>
[[cabang:GRT]]
[[cabang:BDG-HUB]]
'''),
]
