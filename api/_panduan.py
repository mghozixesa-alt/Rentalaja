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
    slug='rute-motor-garut-papandayan', img=('photo-1533632368662-0cdf02790f17', 'Gery Wibowo', 'gergilgad', 'Hutan Mati, Gunung Papandayan'), city='garut', cats=['motor', 'camping'], date='2026-11-09',
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
    slug='sewa-motor-stasiun-garut', img=('photo-1723259527887-bbacb5c5d9ca', 'Surya Ahmad Pajar', 'ahmdpajr', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-09',
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
    slug='wisata-cipanas-garut-naik-motor', img=('photo-1740869323310-05033b847128', 'Wulan', 'halamanwulan', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-09',
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
    slug='rute-motor-kamojang-darajat', img=('photo-1661239733924-a1fa018b0737', 'Fadhel Rabbani', 'fadhelrabbani', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-09',
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
    slug='checklist-alat-camping-garut', img=('photo-1716727382026-7854678e53f1', 'Idris Hasibuan', 'idri5', 'Pendaki di Gunung Papandayan'), city='garut', cats=['camping'], date='2026-11-09',
    title='Checklist Alat Camping untuk Papandayan, Guntur, dan Cikuray',
    desc='Checklist perlengkapan camping dan hiking di Garut, lengkap dengan harga sewa per item di Rentalaja Garut Kota.',
    lead='Untuk camping di gunung sekitar Garut seperti Papandayan, Guntur, atau Cikuray, perlengkapan dasarnya adalah carrier, sleeping bag, matras, penerangan, alat masak, dan jaket hangat. Item di tabel bawah bisa disewa per hari di Rentalaja Garut Kota.',
    body='''
<h2>Harga sewa alat camping</h2>
[[tabel:camping:garut]]
<p>Harga per item per hari. Promo sewa lebih dari 1 hari otomatis dihitung saat booking.</p>

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
    slug='kamera-lensa-wisuda-prewedding-garut', img=('photo-1513031300226-c8fb12de9ade', 'Ailbhe Flynn', 'aflynnn', 'Ilustrasi'), city='garut', cats=['kamera', 'lensa'], date='2026-11-09',
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
    slug='pilih-iphone-sewa-garut', img=('photo-1567985944845-cb4d1e598822', 'Josh Power', 'joshwp', 'Ilustrasi'), city='garut', cats=['iphone'], date='2026-11-09',
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
    slug='sewa-iphone-konser-wisuda-bandung', img=('photo-1501281668745-f7f57925c3b4', 'Noiseporn', 'noiseporn', 'Ilustrasi'), city='bandung', cats=['iphone'], date='2026-11-09',
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
    slug='sewa-motor-dekat-itb-unpad-bandung', img=('photo-1693291587702-ff510bbc5de9', 'Abdul Ridwan', 'abdulridwanrr', 'Jl. Asia Afrika, Bandung'), city='bandung', cats=['motor'], date='2026-11-09',
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
    slug='sewa-proyektor-playstation-nobar', img=('photo-1478720568477-152d9b164e26', 'Jeremy Yap', 'jeremyyappy', 'Ilustrasi'), city=None, cats=['proyektor', 'game'], date='2026-11-09',
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

dict(
    slug='pilih-motor-beat-scoopy-pcx-garut', img=('photo-1712213248719-aade0e02a591', 'Polina Kuzovkova', 'p_kuzovkova', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-10',
    title='Beat, Scoopy, atau PCX? Pilih Motor Sewaan untuk Keliling Garut',
    desc='Perbandingan Honda Beat, Scoopy, dan PCX sewaan di Garut: harga harian dan ½ hari, kenyamanan boncengan, bagasi, dan mana yang cocok untuk kota, wisata, atau tanjakan.',
    lead='Di Rentalaja Garut ada tiga pilihan motor matic: Honda Beat ([[harga:honda-beat-cbs-new:garut]]), Honda Scoopy ([[harga:honda-scoopy-new:garut]]), dan Honda PCX ([[harga:honda-pcx:garut]]). Singkatnya: Beat untuk keliling kota dan hemat, Scoopy kalau mau lebih santai dan bergaya, PCX untuk boncengan jauh dan jalur menanjak.',
    body='''
<h2>Harga ketiganya</h2>
[[pilih:garut:honda-beat-cbs-new,honda-scoopy-new,honda-pcx]]
<p>Tarif ½ hari berlaku untuk pemakaian sampai 12 jam. Cara hitung durasi lebih lengkap ada di <a href="/panduan/hitung-biaya-sewa-motor-garut">panduan hitung biaya sewa motor Garut</a>.</p>

<h2>Honda Beat: paling ringan dan hemat</h2>
<p>Beat bermesin 110 cc, bodinya ramping dan ringan, jadi mudah dibawa di jalan kota yang padat seperti sekitar Alun-alun dan Jl. Ahmad Yani. Cocok untuk:</p>
<ul class="tips">
<li>Urusan dalam kota, kuliner, atau bolak-balik penginapan.</li>
<li>Pengendara yang jarang naik motor dan ingin yang paling enteng.</li>
<li>Budget paling hemat.</li>
</ul>
<p>Kurang ideal untuk boncengan dengan bawaan banyak ke jalur menanjak panjang.</p>

<h2>Honda Scoopy: santai, jok lebih nyaman</h2>
<p>Scoopy juga 110 cc, tapi posisi duduknya lebih tegak dan joknya lebih lega untuk berdua. Pilihan yang pas kalau rencananya jalan-jalan santai keliling kota, ke Situ Bagendit, atau ke Cipanas dengan ritme pelan.</p>

<h2>Honda PCX: untuk jarak jauh dan tanjakan</h2>
<p>PCX bermesin 160 cc dengan bodi lebih besar, jok lebih panjang, dan bagasi bawah jok yang lebih lega. Ini motor yang kami sarankan untuk:</p>
<ul class="tips">
<li>Naik ke Papandayan, Darajat, atau Kamojang. Lihat <a href="/panduan/rute-motor-garut-papandayan">rute ke Papandayan</a> dan <a href="/panduan/rute-motor-kamojang-darajat">rute Kamojang–Darajat</a>.</li>
<li>Boncengan berdua seharian penuh.</li>
<li>Membawa ransel atau perlengkapan camping.</li>
</ul>

<h2>Cara cepat memilih</h2>
<div class="scroll"><table><thead><tr><th>Rencana Anda</th><th>Saran</th></tr></thead><tbody>
<tr><td>Dalam kota, sendiri, beberapa jam</td><td>Beat (tarif ½ hari)</td></tr>
<tr><td>Wisata kota berdua, santai</td><td>Scoopy</td></tr>
<tr><td>Gunung/kawah, boncengan, bawa tas</td><td>PCX</td></tr>
<tr><td>Rombongan beberapa motor</td><td>Campur Beat + PCX sesuai jalur</td></tr>
</tbody></table></div>

<h2>Yang sudah termasuk & syarat</h2>
<p>Helm dan jas hujan disiapkan. Syaratnya KTP, SIM C, dan KK yang diunggah sekali di aplikasi. Saat ambil, KTP asli dititipkan di cabang. DP [[aturan:dp_percent]]% dibayar setelah dokumen lolos verifikasi, sisanya saat ambil motor.</p>
<p>Motor bisa diambil di cabang atau diantar ke stasiun, terminal, atau hotel di Garut dengan ongkir sesuai jarak:</p>
[[ongkir:GRT]]
[[cabang:GRT]]
'''),

dict(
    slug='hitung-biaya-sewa-motor-garut', img=('photo-1456574808786-d2ba7a6aa654', 'Djim Loic', 'loic', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-10',
    title='Sewa Motor Garut Harian atau ½ Hari: Cara Hitung Biaya dan Jam Kembali',
    desc='Cara Rentalaja menghitung biaya sewa motor di Garut: tarif ½ hari sampai 12 jam, harian per 24 jam, tambahan setengah hari, contoh perhitungan, dan denda telat.',
    lead='Biaya sewa motor di Rentalaja dihitung dari jam ambil sampai jam kembali yang Anda pilih saat booking. Sampai 12 jam dikenai tarif ½ hari, lebih dari itu dihitung per 24 jam. Berikut aturannya dan contoh hitungan dengan harga Garut saat ini.',
    body='''
<h2>Aturan hitung durasi</h2>
<ol class="steps">
<li><b>Sampai 12 jam</b> → tarif ½ hari.</li>
<li><b>Lebih dari 12 jam sampai 24 jam</b> → tarif 1 hari.</li>
<li><b>Lebih dari 24 jam</b> → dihitung per 24 jam. Kalau setelah hari penuh masih ada sisa <b>12 jam atau kurang</b>, sisa itu dikenai [[aturan:half_day_extra_percent]]% dari tarif harian, bukan satu hari penuh.</li>
</ol>
<p>Aplikasi menghitung otomatis begitu Anda memilih tanggal dan jam, jadi total yang tampil sebelum bayar sudah final (di luar ongkir antar kalau dipilih).</p>

<h2>Contoh hitungan Honda Beat di Garut</h2>
<div class="scroll"><table><thead><tr><th>Durasi</th><th>Dihitung sebagai</th><th class="n">Total</th></tr></thead><tbody>
<tr><td>08.00–16.00 (8 jam)</td><td>½ hari</td><td class="n">[[hitung:honda-beat-cbs-new:garut:8]]</td></tr>
<tr><td>08.00–20.00 (12 jam)</td><td>½ hari</td><td class="n">[[hitung:honda-beat-cbs-new:garut:12]]</td></tr>
<tr><td>08.00–06.00 besok (22 jam)</td><td>1 hari</td><td class="n">[[hitung:honda-beat-cbs-new:garut:22]]</td></tr>
<tr><td>08.00 hari ini – 18.00 besok (34 jam)</td><td>1 hari + sisa 10 jam</td><td class="n">[[hitung:honda-beat-cbs-new:garut:34]]</td></tr>
<tr><td>2 hari penuh (48 jam)</td><td>2 hari</td><td class="n">[[hitung:honda-beat-cbs-new:garut:48]]</td></tr>
</tbody></table></div>
<p>Contoh untuk Honda PCX: 8 jam [[hitung:honda-pcx:garut:8]], 1 hari [[hitung:honda-pcx:garut:24]], 34 jam [[hitung:honda-pcx:garut:34]]. Angka di atas mengikuti harga sistem saat ini; promo atau tarif musim ramai (bila ada) dihitung otomatis saat booking.</p>

<h2>Tips supaya tidak bayar lebih</h2>
<ul class="tips">
<li><b>Pas di 12 jam.</b> Kalau ambil jam 08.00, kembali sebelum 20.00 masih tarif ½ hari.</li>
<li><b>Lewat sedikit dari 1 hari?</b> Misalnya 26 jam: sisa 2 jam hanya dikenai [[aturan:half_day_extra_percent]]% tarif harian, bukan 2 hari penuh.</li>
<li><b>Pilih jam kembali yang realistis.</b> Ada toleransi telat [[aturan:late_grace_minutes]]; lewat dari itu dikenai denda [[aturan:late_fee_percent_per_hour]]% dari harga harian per jam. Kalau rencana berubah, perpanjang dari aplikasi sebelum jam kembali.</li>
<li><b>Telat mengambil?</b> Telat sampai [[aturan:pickup_late_shift_max_minutes]], jam kembali ikut dimundurkan sebesar keterlambatannya (selama unit tidak dipakai booking berikutnya). Unit ditahan sampai [[aturan:pickup_wait_minutes]] dari jadwal ambil; lewat dari itu tanpa kabar, booking dianggap tidak datang.</li>
</ul>

<h2>DP, pembatalan, dan ubah jadwal</h2>
<ul class="tips">
<li>DP [[aturan:dp_percent]]% dibayar setelah dokumen lolos verifikasi; sisanya saat ambil motor.</li>
<li>Pembatalan gratis paling lambat [[aturan:free_cancel_hours]] jam sebelum jadwal ambil.</li>
<li>[[aturan:late_cancel_rule]]</li>
</ul>

<h2>Harga motor di Garut</h2>
[[tabel:motor:garut]]
<p>Bingung pilih motornya? Baca <a href="/panduan/pilih-motor-beat-scoopy-pcx-garut">Beat, Scoopy, atau PCX</a>.</p>
[[cabang:GRT]]
'''),

dict(
    slug='sewa-mobil-garut-pilih-sesuai-rombongan', img=('photo-1548992725-accdba0a1cc1', 'Lukas Fitria Adi Setiawan', 'saintlucas89', 'Ilustrasi'), city='garut', cats=['mobil'], date='2026-11-10',
    title='Sewa Mobil di Garut: City Car, MPV, atau Hiace Sesuai Jumlah Orang & Koper',
    desc='Panduan memilih mobil sewaan di Garut: Ayla, Agya, Brio untuk berdua; Sigra, Calya, Ertiga, Mobilio, Xpander untuk keluarga; Hiace untuk rombongan. Harga, syarat, lepas kunci atau dengan sopir.',
    lead='Rentalaja Garut punya mobil dari city car sampai Toyota Hiace. Kuncinya ada di jumlah penumpang dan barang bawaan: city car untuk 2–3 orang, MPV 7 kursi untuk keluarga, dan Hiace untuk rombongan besar. Semua harga di bawah diambil langsung dari sistem.',
    body='''
<h2>Berdua atau bertiga, bawaan ringan: city car</h2>
<p>Daihatsu Ayla, Toyota Agya, dan Honda Brio lincah di jalan kota dan mudah diparkir. Ayla bertransmisi manual; Agya dan Brio otomatis, cocok kalau Anda terbiasa matic.</p>
[[pilih:garut:daihatsu-ayla-mt,toyota-agya-at,honda-brio-at]]

<h2>Keluarga 4–7 orang: MPV</h2>
<p>Untuk keluarga dengan anak, orang tua, atau koper, pilih MPV tiga baris. Sigra, Calya, dan Ertiga manual; Mobilio dan Xpander otomatis. Kalau semua kursi terisi, ruang bagasi jadi sempit, jadi untuk 6–7 orang dengan koper besar pertimbangkan dua mobil atau Hiace.</p>
[[pilih:garut:daihatsu-sigra-mt,toyota-calya-mt,suzuki-ertiga-mt,honda-mobilio-at,mitsubishi-xpander-at]]

<h2>Rombongan besar atau butuh tampil: Hiace & Fortuner</h2>
<p>Toyota Hiace untuk rombongan kantor, keluarga besar, atau tamu acara. Toyota Fortuner untuk perjalanan yang butuh mobil tinggi dan nyaman. Daihatsu Gran Max Blind Van untuk angkut barang (bukan penumpang).</p>
[[pilih:garut:toyota-hiace,toyota-fortuner-vrz,daihatsu-gran-max-blind-van-mt]]

<h2>Lepas kunci atau dengan sopir?</h2>
<ul class="tips">
<li><b>Lepas kunci</b>: Anda menyetir sendiri. Syaratnya KTP, SIM A, dan KK yang diunggah di aplikasi; KTP asli dititipkan saat ambil. DP [[aturan:dp_percent]]%.</li>
<li><b>Dengan sopir</b>: ada paket mobil dengan pengemudi; cek pilihan paket dan harganya di <a href="/#/MobilSopir">halaman Mobil + sopir</a>. DP untuk paket sopir [[aturan:car_driver_dp_percent]]%.</li>
</ul>
<p>Area pemakaian: [[aturan:rental_region]]</p>

<h2>Tips memilih</h2>
<ul class="tips">
<li>Hitung kursi <b>dan</b> koper. Lima orang dengan lima koper besar biasanya tidak muat di city car.</li>
<li>Jalur ke Papandayan, Darajat, atau Santolo banyak tanjakan dan tikungan; pilih yang Anda biasa kendarai (manual atau otomatis).</li>
<li>Butuh dijemput di Stasiun Garut? Pilih "Diantar" saat booking, ongkir sesuai jarak:</li>
</ul>
[[ongkir:GRT]]
[[cabang:GRT]]
'''),

dict(
    slug='sewa-kamera-foto-produk-umkm-garut', img=('photo-1669293020214-bc04fc1f33f5', 'Sticker it', 'stickerit_co', 'Ilustrasi foto produk'), city='garut', cats=['kamera', 'lensa'], date='2026-11-10',
    title='Sewa Kamera & Lensa di Garut untuk Foto Produk UMKM',
    desc='Kamera dan lensa sewaan di Garut untuk foto produk UMKM: dodol, kerajinan kulit, fashion, kuliner. Pilihan kamera pemula sampai mirrorless, lensa 50mm, tarif 2 jam, dan tips foto produk.',
    lead='Untuk foto katalog marketplace atau Instagram, kamera dengan lensa fix 50mm atau 30mm sudah cukup membuat produk terlihat tajam dengan latar blur. Di Rentalaja Garut Anda bisa sewa per 2 jam, jadi sesi foto produk tidak perlu bayar seharian.',
    body='''
<h2>Kombinasi yang kami sarankan</h2>
<div class="scroll"><table><thead><tr><th>Kebutuhan</th><th>Kamera + lensa</th></tr></thead><tbody>
<tr><td>Pemula, budget hemat</td><td>Canon 1300D / 3000D + Lensa Canon 50mm F1.8</td></tr>
<tr><td>Produk kecil, detail bahan (kulit, rajutan)</td><td>Sony A6000 + Sigma 30mm F1.4 for Sony</td></tr>
<tr><td>Warna akurat untuk fashion</td><td>Fujifilm XT4 + Sigma 30mm/56mm F1.4 for Fujifilm</td></tr>
<tr><td>Foto + video reels dalam satu sesi</td><td>Sony A6000 atau Fujifilm XA5 + lensa kit</td></tr>
</tbody></table></div>

<h2>Kamera yang tersedia di Garut</h2>
[[tabel:kamera:garut]]
<h2>Lensa</h2>
[[tabel:lensa:garut]]
<p>Lensa harus sesuai mount kamera: lensa "for Sony" untuk Sony, "for Fujifilm" untuk Fujifilm, dan lensa Canon EF/EF-S untuk Canon DSLR. Tanya admin kalau ragu.</p>

<h2>Hemat dengan tarif 2 jam</h2>
<p>Sesi foto produk biasanya selesai dalam 1–2 jam. Contoh: Sony A6000 sewa 2 jam [[hitung:sony-a6000:garut:2]], ½ hari [[hitung:sony-a6000:garut:12]]; Canon 1300D 2 jam [[hitung:canon-1300d:garut:2]]. Lensa Canon 50mm F1.8 2 jam [[harga2j:lensa-canon-50mm-f1-8:garut]].</p>

<h2>Tips foto produk sederhana</h2>
<ul class="tips">
<li><b>Cahaya jendela</b> dari samping lebih rapi daripada flash. Hindari matahari langsung.</li>
<li><b>Latar polos</b>: kertas karton putih atau kain, ditekuk jadi alas dan dinding sekaligus.</li>
<li><b>Konsisten</b>: pakai sudut, jarak, dan pengaturan kamera yang sama untuk semua produk supaya katalog seragam.</li>
<li><b>Bawa kartu memori sendiri</b> atau siapkan laptop untuk memindahkan file sebelum kamera dikembalikan.</li>
<li><b>Baterai cadangan</b> untuk Canon seri 1100D–1300D bisa disewa terpisah ([[harga:baterai-1100d-1200d-1300d:garut]]).</li>
</ul>

<h2>Syarat</h2>
<p>KTP dan KK diunggah sekali di aplikasi, DP [[aturan:dp_percent]]% setelah verifikasi. Kamera bisa diambil di Garut Kota atau Wanaraja (sesuai stok di cabang).</p>
[[cabang:GRT]]
[[cabang:WNR]]
'''),

dict(
    slug='sewa-iphone-jualan-online-garut', img=('photo-1736605804642-b66ad75b1c9c', 'Ali Khanian', 'alikhanian', 'Ilustrasi'), city='garut', cats=['iphone'], date='2026-11-10',
    title='Sewa iPhone di Garut untuk Jualan Online: Live, Foto Katalog, dan Konten Toko',
    desc='Sewa iPhone di Garut untuk live jualan, foto katalog produk, video menu kedai, dan konten penginapan. Perbandingan iPhone XR, 11, 13, 15, 16, harga ½ hari dan harian.',
    lead='Banyak UMKM di Garut menyewa iPhone untuk live jualan atau bikin stok konten seminggu dalam satu hari. iPhone XR mulai [[harga:iphone-xr:garut]], dan semua unit sudah termasuk charger dan tas.',
    body='''
<h2>Pilih iPhone sesuai kebutuhan</h2>
<div class="scroll"><table><thead><tr><th>Kebutuhan</th><th>Saran</th><th>Alasan</th></tr></thead><tbody>
<tr><td>Live jualan dari toko</td><td>iPhone 11 atau 13</td><td>Kamera depan dan mikrofon cukup jernih; baterai tahan sesi live panjang (tetap colok charger).</td></tr>
<tr><td>Foto katalog produk</td><td>iPhone 13</td><td>Kamera belakang lebih tajam di cahaya dalam ruangan.</td></tr>
<tr><td>Video menu kedai, reels</td><td>iPhone 13 atau 15</td><td>Video 4K lebih stabil, warna makanan lebih natural.</td></tr>
<tr><td>Konten penginapan, ruangan</td><td>iPhone 11 ke atas</td><td>Ada lensa ultra-wide untuk memotret kamar.</td></tr>
<tr><td>Budget paling hemat</td><td>iPhone XR</td><td>Cukup untuk foto produk dengan cahaya bagus; tanpa ultra-wide.</td></tr>
</tbody></table></div>

<h2>Harga iPhone di Garut</h2>
[[tabel:iphone:garut]]
<p>Tarif ½ hari berlaku sampai 12 jam, cocok untuk satu sesi live atau satu hari produksi konten. iPhone tersedia di Garut Kota dan sebagian di Wanaraja.</p>

<h2>Checklist sebelum live atau syuting</h2>
<ul class="tips">
<li><b>Login akun sendiri</b> (TikTok, Instagram, Shopee) dan <b>logout</b> sebelum mengembalikan.</li>
<li><b>Pindahkan file</b> ke HP/laptop sendiri atau Google Drive sebelum jam kembali. Hapus foto dan video Anda dari iPhone sewaan.</li>
<li>Butuh tripod? Tripod Tongsis bisa disewa sekalian ([[harga:tripod-tongsis:garut]]). Kalau bisa, bawa mic clip-on supaya suara jelas saat live.</li>
<li>Live lebih dari 2 jam? Pasang charger selama siaran, atau sewa Powerbank Ugreen MagSafe ([[harga:powerbank-ugreen-10000mah-magsafe:garut]]).</li>
</ul>

<h2>Syarat</h2>
<p>KTP dan KK diunggah sekali di aplikasi; KTP asli dititipkan saat ambil. DP [[aturan:dp_percent]]% setelah dokumen lolos verifikasi. Untuk perbandingan seri iPhone yang lebih lengkap, baca <a href="/panduan/pilih-iphone-sewa-garut">memilih iPhone sewaan di Garut</a>.</p>
[[cabang:GRT]]
'''),

dict(
    slug='biaya-camping-per-orang-garut', img=('photo-1723581694992-98892d17e679', '35MM North', '35mm_north', 'Ilustrasi'), city='garut', cats=['camping'], date='2026-11-10',
    title='Berapa Biaya Sewa Alat Camping per Orang di Garut? Contoh Paket 2–3 Orang',
    desc='Hitung biaya sewa alat camping per orang di Garut: sleeping bag, matras, carrier, kompor, lampu, flysheet. Contoh paket berdua dan bertiga dengan harga langsung dari sistem Rentalaja.',
    lead='Alat camping paling hemat disewa patungan: barang pribadi (sleeping bag, matras, headlamp) dihitung per orang, sedangkan barang bersama (kompor, gas, lampu, flysheet) dibagi rombongan. Berikut cara menghitungnya dengan harga Rentalaja Garut.',
    body='''
<h2>Barang pribadi (per orang, per hari)</h2>
[[pilih:garut:sleeping-bag,matras-spon,matras-foil,headlamp,trekking-pole,hydropack]]
<p>Pilih salah satu matras: spon lebih empuk, foil lebih ringan dan memantulkan panas tubuh.</p>

<h2>Barang bersama (dibagi rombongan)</h2>
[[pilih:garut:kompor-portable,gas,lampu-tenda,flysheet-3x4,kursi-lipat-outdoor,meja-lipat-outdoor-xl]]

<h2>Carrier & pakaian</h2>
[[pilih:garut:carrier-45l,carrier-60l,jaket-hiking-gorpcore-pria,jaket-hiking-gorpcore-wanita,sepatu-outdoor,sepatu-trail-run]]

<h2>Contoh paket 1 malam</h2>
<p><b>Berdua:</b> 2 sleeping bag ([[harga:sleeping-bag:garut]] per buah), 2 matras foil ([[harga:matras-foil:garut]]), 2 headlamp ([[harga:headlamp:garut]]), plus 1 kompor ([[harga:kompor-portable:garut]]), 1 gas ([[harga:gas:garut]]), 1 lampu tenda ([[harga:lampu-tenda:garut]]). Barang pribadi dikali dua orang, barang bersama dibagi dua.</p>
<p><b>Bertiga:</b> sama seperti di atas untuk barang pribadi (dikali tiga), tambah 1 flysheet ([[harga:flysheet-3x4:garut]]) untuk area masak saat hujan; barang bersama dibagi tiga.</p>
<p>Hitung jumlah hari dari jam ambil sampai jam kembali. Camping 1 malam dengan ambil pagi dan kembali besok sore biasanya jadi 1 hari + sisa jam (lihat <a href="/panduan/hitung-biaya-sewa-motor-garut">aturan hitung durasi</a>, berlaku sama untuk alat camping).</p>

<h2>Tenda</h2>
<p>Tenda belum tersedia di katalog online saat ini. Tanyakan ke admin lewat WhatsApp sebelum berangkat, atau gunakan tenda sewaan di area camping tujuan bila pengelola menyediakan.</p>

<h2>Tips</h2>
<ul class="tips">
<li>Cek stok sejak beberapa hari sebelumnya, terutama akhir pekan dan libur panjang.</li>
<li>Kembalikan alat dalam keadaan kering bila memungkinkan; kotor wajar karena dipakai, tapi kabari admin kalau ada yang rusak.</li>
<li>Butuh motor juga? Ambil sekaligus di cabang yang sama. Lihat <a href="/panduan/checklist-alat-camping-garut">checklist camping</a> dan <a href="/panduan/rute-motor-garut-papandayan">rute ke Papandayan</a>.</li>
</ul>
[[cabang:GRT]]
'''),

dict(
    slug='sewa-motor-stasiun-bandung-pool-travel', img=('photo-1527965512280-9cf155bcb87d', 'Fikri Rasyid', 'fikrirasyid', 'Motor di jalanan Bandung'), city='bandung', cats=['motor'], date='2026-11-10',
    title='Sewa Motor di Bandung dari Stasiun, Pool Travel, atau Terminal',
    desc='Tiba di Stasiun Bandung, pool travel Pasteur/Dipatiukur, atau Terminal Leuwipanjang? Sewa Honda Beat atau PCX di Rentalaja Bandung: ambil di Kubang Selatan (Coblong) atau minta diantar dengan ongkir sesuai jarak.',
    lead='Rentalaja Bandung ada di Jl. Kubang Selatan, Coblong, dekat Dipati Ukur dan kampus ITB–Unpad. Kalau Anda datang naik kereta, travel, atau bus, motor bisa diambil di cabang atau diantar ke titik kedatangan dengan ongkir sesuai jarak.',
    body='''
<h2>Pilihan motor di Bandung</h2>
[[tabel:motor:bandung]]
<p>Honda Beat untuk mobilitas dalam kota; Honda PCX kalau mau ke Lembang atau jalur menanjak sambil berboncengan.</p>

<h2>Titik antar yang sudah tersedia di aplikasi</h2>
<ul class="tips">
<li>Stasiun Bandung</li>
<li>Pool travel Pasteur dan pool travel Dipatiukur</li>
<li>Terminal Leuwipanjang</li>
<li>Baltos (Balubur Town Square), Kampus ITB Ganesha</li>
<li>Beberapa hotel, misalnya di Cihampelas, Braga, Cipaganti, dan Dago</li>
</ul>
<p>Alamat lain juga bisa: pilih "Diantar", lalu cari alamat di peta. Ongkir dihitung dari jarak jalan ke cabang:</p>
[[ongkir:BDG-HUB]]
<p>Turun di stasiun lain, misalnya Kiaracondong? Masukkan alamat stasiunnya di aplikasi untuk melihat ongkir dan apakah masih dalam jangkauan antar.</p>

<h2>Atur jam ambil & kembali</h2>
<ul class="tips">
<li><b>Kereta atau travel bisa telat.</b> Isi jam ambil sedikit setelah perkiraan tiba. Kalau jadwal bergeser, ubah jadwal gratis paling lambat [[aturan:free_reschedule_hours]] jam sebelum jam ambil.</li>
<li><b>Pulang naik kereta sore?</b> Pilih jam kembali minimal 1 jam sebelum keberangkatan, atau minta motor dijemput di stasiun.</li>
<li><b>Sampai 12 jam</b> kena tarif ½ hari: Beat [[hargah:honda-beat-cbs-new:bandung]], PCX [[hargah:honda-pcx:bandung]].</li>
</ul>

<h2>Syarat</h2>
<p>KTP, SIM C, dan KK diunggah sekali di aplikasi, lalu diverifikasi. KTP asli dititipkan saat serah terima. DP [[aturan:dp_percent]]%, sisanya dibayar saat motor diterima. Helm disiapkan.</p>
<p>Mahasiswa atau magang di sekitar Dago dan Dipati Ukur? Lihat juga <a href="/panduan/sewa-motor-dekat-itb-unpad-bandung">sewa motor dekat ITB & Unpad</a>.</p>
[[cabang:BDG-HUB]]
'''),

dict(
    slug='sewa-iphone-brand-lokal-bandung', img=('photo-1631644048778-7f1d389fb31f', 'Shyam Mishra', 'shyammishra94', 'Ilustrasi'), city='bandung', cats=['iphone'], date='2026-11-10',
    title='Sewa iPhone di Bandung untuk Brand Lokal: Foto Sepatu, Live Bazar, Video Kafe',
    desc='Sewa iPhone XR, 11, 13, atau 15 di Bandung untuk konten brand lokal: foto sepatu dan pakaian, live bazar, video vertikal kedai kopi. Harga ½ hari dan harian, tips produksi konten.',
    lead='Brand fashion lokal, kedai kopi, dan tenant bazar di Bandung sering butuh HP kedua untuk produksi konten atau live. Di Rentalaja Bandung (Jl. Kubang Selatan, Coblong), iPhone bisa disewa ½ hari atau harian, sudah termasuk charger dan tas.',
    body='''
<h2>Harga iPhone di Bandung</h2>
[[tabel:iphone:bandung]]

<h2>Mana yang cocok?</h2>
<div class="scroll"><table><thead><tr><th>Konten</th><th>Saran</th></tr></thead><tbody>
<tr><td>Foto sepatu, kaos, tas untuk katalog</td><td>iPhone 13: detail bahan dan warna lebih akurat</td></tr>
<tr><td>Live bazar atau live TikTok Shop</td><td>iPhone 11 atau 13 sebagai HP khusus live, HP sendiri untuk balas chat</td></tr>
<tr><td>Video vertikal kafe, reels menu</td><td>iPhone 13 atau 15: video 4K lebih stabil</td></tr>
<tr><td>Lookbook outdoor di Braga / Asia Afrika</td><td>iPhone 13 atau 15 (ada ultra-wide untuk suasana jalan)</td></tr>
<tr><td>Budget hemat, cahaya terang</td><td>iPhone XR</td></tr>
</tbody></table></div>

<h2>Hemat dengan tarif ½ hari</h2>
<p>Satu hari produksi konten biasanya cukup 8–12 jam. Contoh: iPhone 13 untuk 10 jam [[hitung:iphone-13:bandung:10]], iPhone 11 untuk 10 jam [[hitung:iphone-11:bandung:10]]. Bazar dua hari? iPhone 11 untuk 48 jam [[hitung:iphone-11:bandung:48]].</p>

<h2>Tips produksi</h2>
<ul class="tips">
<li>Foto produk dekat jendela, bukan di bawah lampu kuning, supaya warna bahan tidak bergeser.</li>
<li>Kunci fokus dan eksposur (tahan di layar) supaya semua foto katalog seragam.</li>
<li>Pindahkan semua file ke Google Drive atau laptop sebelum jam kembali, lalu logout akun dan hapus file Anda.</li>
<li>Butuh layar besar untuk presentasi brand? Lihat <a href="/panduan/sewa-proyektor-seminar-sidang-bandung">sewa proyektor di Bandung</a>.</li>
</ul>

<h2>Ambil atau diantar</h2>
<p>Ambil di cabang atau diantar ke venue bazar, kafe, atau kos dengan ongkir sesuai jarak:</p>
[[ongkir:BDG-HUB]]
<p>Syarat: KTP dan KK diunggah sekali di aplikasi; DP [[aturan:dp_percent]]%. Untuk konser dan wisuda, baca <a href="/panduan/sewa-iphone-konser-wisuda-bandung">sewa iPhone untuk konser & wisuda</a>.</p>
[[cabang:BDG-HUB]]
'''),

dict(
    slug='sewa-proyektor-seminar-sidang-bandung', img=('photo-1524178232363-1fb2b075b655', 'Quilia', 'heyquilia', 'Ilustrasi'), city='bandung', cats=['proyektor'], date='2026-11-10',
    title='Sewa Proyektor di Bandung untuk Seminar, Sidang, dan Pitching',
    desc='Sewa proyektor Panasonic dan screen di Bandung untuk seminar kampus, sidang kelompok, pitching di coworking, atau lokakarya. Tarif 2 jam, ½ hari, harian, tips koneksi laptop dan cadangan.',
    lead='Untuk seminar kampus, sidang, atau pitching, Rentalaja Bandung menyediakan proyektor Panasonic VW355N dan screen proyektor. Ada tarif 2 jam ([[harga2j:proyektor-panasonic-vw355n:bandung]]), jadi presentasi singkat tidak perlu bayar seharian.',
    body='''
<h2>Harga</h2>
[[tabel:proyektor:bandung]]
<p>Contoh: sidang 2 jam [[hitung:proyektor-panasonic-vw355n:bandung:2]]; seminar setengah hari (sampai 12 jam) [[hitung:proyektor-panasonic-vw355n:bandung:12]]; acara dua hari [[hitung:proyektor-panasonic-vw355n:bandung:48]]. Screen dihitung terpisah.</p>

<h2>Perlu screen atau tidak?</h2>
<ul class="tips">
<li><b>Ruang kelas atau ruang rapat</b> yang punya dinding putih polos: biasanya cukup tanpa screen.</li>
<li><b>Aula, kafe, coworking</b> dengan dinding bercorak, berwarna, atau kaca: sewa screen supaya gambar terang dan rata.</li>
<li><b>Ruangan terang</b> (banyak jendela): tutup tirai dan letakkan screen jauh dari sumber cahaya.</li>
</ul>

<h2>Cek koneksi laptop sebelum hari-H</h2>
<ul class="tips">
<li>Pastikan port laptop Anda. Proyektor umumnya memakai HDMI; laptop tipis atau MacBook sering hanya punya USB-C, jadi siapkan adaptor USB-C ke HDMI sendiri.</li>
<li>Tanyakan ke admin kabel apa saja yang termasuk saat booking.</li>
<li>Uji tampilan sekali saat serah terima: nyalakan, sambungkan laptop, cek gambar keluar.</li>
<li>Simpan file presentasi juga di flashdisk dan Google Drive. Kalau laptop bermasalah, laptop teman bisa langsung dipakai.</li>
<li>Pakai mode "Duplicate" (tampilan sama) kalau tidak butuh presenter view, supaya tidak bingung layar mana yang tampil.</li>
</ul>

<h2>Seminar hybrid</h2>
<p>Untuk seminar hybrid, proyektor menampilkan slide ke peserta di ruangan, sementara laptop membagikan layar ke Zoom/Meet. Siapkan koneksi internet yang stabil dan mikrofon terpisah; proyektor tidak menangani audio peserta online.</p>

<h2>Diantar ke kampus atau venue</h2>
<p>Proyektor bisa diambil di cabang atau diantar ke kampus, coworking, atau hotel dengan ongkir sesuai jarak:</p>
[[ongkir:BDG-HUB]]
<p>Syarat: KTP dan KK diunggah sekali di aplikasi; DP [[aturan:dp_percent]]%. Untuk nobar atau main game, baca <a href="/panduan/sewa-proyektor-playstation-nobar">sewa proyektor & PlayStation untuk nobar</a>.</p>
[[cabang:BDG-HUB]]
'''),

dict(
    slug='cara-booking-rentalaja-dp-jadwal', img=('photo-1563013544-824ae1b704d3', 'rupixen', 'rupixen', 'Ilustrasi'), city=None, cats=['motor', 'iphone'], date='2026-11-10',
    title='Cara Booking di Rentalaja: Dokumen, DP, Ubah Jadwal, dan Pembatalan',
    desc='Langkah booking sewa di Rentalaja Garut & Bandung: unggah KTP dan KK, verifikasi, DP 20%, ambil atau diantar, aturan ubah jadwal, pembatalan, perpanjangan, dan denda telat.',
    lead='Booking di Rentalaja dilakukan lewat aplikasi web di rentalaja.co.id, tanpa perlu install. Dokumen cukup diunggah sekali, lalu setiap booking berikutnya tinggal pilih barang, tanggal, dan jam. Berikut alur dan aturannya, langsung dari sistem.',
    body='''
<h2>Langkah booking</h2>
<ol class="steps">
<li><b>Pilih kota, barang, tanggal & jam.</b> Total biaya tampil otomatis sesuai durasi.</li>
<li><b>Ambil di cabang atau diantar.</b> Kalau diantar, pilih alamat di peta; ongkir dihitung dari jarak.</li>
<li><b>Unggah dokumen</b> (sekali saja): [[aturan:docs_required]]. Untuk motor dan mobil ditambah SIM. Dokumen pendukung lain yang mungkin diminta: [[aturan:supporting_doc_options]].</li>
<li><b>Verifikasi</b> oleh admin. Kalau ada yang perlu diperbaiki, Anda diminta unggah ulang.</li>
<li><b>Bayar DP [[aturan:dp_percent]]%</b> lewat virtual account atau e-wallet. Sisanya dibayar saat ambil barang.</li>
<li><b>Serah terima.</b> KTP asli dititipkan di cabang selama masa sewa dan dikembalikan saat barang kembali.</li>
</ol>

<h2>Ubah jadwal & pembatalan</h2>
<ul class="tips">
<li><b>Ubah jadwal gratis</b> paling lambat [[aturan:free_reschedule_hours]] jam sebelum jam ambil.</li>
<li><b>Batal gratis</b> paling lambat [[aturan:free_cancel_hours]] jam sebelum jam ambil.</li>
<li><b>Batal mendadak:</b> [[aturan:late_cancel_rule]]</li>
</ul>

<h2>Durasi, perpanjangan, dan telat</h2>
<ul class="tips">
<li>Sampai 12 jam dihitung tarif ½ hari (untuk barang yang punya tarifnya); kamera, lensa, dan proyektor ada tarif 2 jam.</li>
<li>Lebih dari 24 jam dihitung per 24 jam; sisa 12 jam atau kurang setelah hari penuh dikenai [[aturan:half_day_extra_percent]]% tarif harian.</li>
<li>Butuh lebih lama? Perpanjang dari aplikasi sebelum jam kembali.</li>
<li>Telat tanpa perpanjang diberi toleransi [[aturan:late_grace_minutes]]; lewat dari itu dikenai denda [[aturan:late_fee_percent_per_hour]]% dari harga harian per jam.</li>
</ul>

<h2>Ongkir antar</h2>
[[ongkir:GRT:BDG-HUB]]

<h2>Area pemakaian</h2>
<p>[[aturan:rental_region]]</p>

<h2>Panduan lain</h2>
<ul class="tips">
<li><a href="/panduan/hitung-biaya-sewa-motor-garut">Contoh hitung biaya sewa motor</a></li>
<li><a href="/panduan/sewa-motor-stasiun-garut">Sewa motor dekat Stasiun Garut</a></li>
<li><a href="/panduan/sewa-motor-stasiun-bandung-pool-travel">Sewa motor dari stasiun & pool travel Bandung</a></li>
</ul>
[[cabang:GRT]]
[[cabang:BDG-HUB]]
'''),
dict(
    slug='harga-sewa-iphone-bandung', img=('photo-1678685888221-cda773a3dcdb', 'Thai Nguyen', 'quangthai_itshop', 'Ilustrasi'), city='bandung', cats=['iphone'], date='2026-11-11',
    title='Harga Sewa iPhone di Bandung: iPhone XR sampai iPhone 15, Harian & ½ Hari',
    desc='Daftar harga sewa iPhone (rental HP) di Rentalaja Bandung per model, tarif harian dan ½ hari, contoh hitung biaya, dan cara memilih model yang pas.',
    lead='Sewa iPhone di Rentalaja Bandung mulai [[harga:iphone-xr:bandung]], dengan tarif ½ hari untuk acara singkat. Berikut harga tiap model langsung dari sistem, contoh hitung biayanya, dan panduan memilih model.',
    body='''
<h2>Daftar harga sewa iPhone Bandung</h2>
[[tabel:iphone:bandung]]
<p>Charger dan tas sudah termasuk. Ambil di Rentalaja Bandung, Kecamatan Coblong, atau minta diantar dengan ongkir sesuai jarak.</p>

<h2>Contoh hitung biaya</h2>
<div class="scroll"><table><thead><tr><th>Kebutuhan</th><th class="n">iPhone 11</th><th class="n">iPhone 13</th><th class="n">iPhone 15</th></tr></thead><tbody>
<tr><td>Wisuda / acara (sampai 12 jam)</td><td class="n">[[hitung:iphone-11:bandung:6]]</td><td class="n">[[hitung:iphone-13:bandung:6]]</td><td class="n">[[hitung:iphone-15:bandung:6]]</td></tr>
<tr><td>1 hari (24 jam)</td><td class="n">[[hitung:iphone-11:bandung:24]]</td><td class="n">[[hitung:iphone-13:bandung:24]]</td><td class="n">[[hitung:iphone-15:bandung:24]]</td></tr>
<tr><td>Konten akhir pekan (2 hari)</td><td class="n">[[hitung:iphone-11:bandung:48]]</td><td class="n">[[hitung:iphone-13:bandung:48]]</td><td class="n">[[hitung:iphone-15:bandung:48]]</td></tr>
</tbody></table></div>
<p style="font-size:13px;color:var(--mute)">Dihitung dengan aturan harga sistem, sebelum promo. Promo yang sedang berlaku terpasang otomatis saat booking.</p>

<h2>Pilih model sesuai kebutuhan</h2>
<ul class="tips">
<li><b>iPhone XR</b> — paling hemat untuk foto dan video sehari-hari, story, atau sekadar HP cadangan.</li>
<li><b>iPhone 11</b> — sudah ada kamera ultra wide, enak untuk foto rombongan dan pemandangan.</li>
<li><b>iPhone 13</b> — ada mode Cinematic untuk video dengan latar blur; cocok untuk konten dan dokumentasi acara.</li>
<li><b>iPhone 15</b> — kamera utama 48MP, paling detail untuk foto wisuda, panggung konser, dan konten produk.</li>
</ul>

<h2>Tips sebelum dan sesudah sewa</h2>
<ul class="tips">
<li>Booking dari jauh hari saat musim wisuda dan akhir pekan; stok tiap model terbatas.</li>
<li>Untuk acara singkat, pakai tarif ½ hari supaya lebih hemat.</li>
<li>Bawa powerbank kalau mau merekam video lama.</li>
<li>Pindahkan foto & video ke HP atau cloud Anda, lalu keluar dari akun Anda sebelum mengembalikan unit.</li>
</ul>
<p>Baca juga <a href="/panduan/sewa-iphone-konser-wisuda-bandung">tips sewa iPhone untuk konser & wisuda</a> dan <a href="/panduan/cara-booking-rentalaja-dp-jadwal">cara booking, DP, dan ubah jadwal</a>.</p>
[[cabang:BDG-HUB]]
'''),

dict(
    slug='sewa-playstation-bandung', img=('photo-1552820728-8b83bb6b773f', 'Alexey Savchenko', 'alexxsvch', 'Ilustrasi'), city='bandung', cats=['game'], date='2026-11-11',
    title='Sewa PlayStation di Bandung untuk Main di Kos, Rumah, atau Acara',
    desc='Sewa PS3 dan PS4 harian atau ½ hari di Rentalaja Bandung (Coblong). Harga langsung dari sistem, tips memilih, dan ide paket nobar dengan proyektor.',
    lead='Mau main bareng di kos, rumah, atau acara kantor tanpa beli konsol? Rentalaja Bandung menyewakan PlayStation 3 dan PlayStation 4 harian maupun ½ hari, ambil di Kecamatan Coblong.',
    body='''
<h2>Harga sewa PlayStation Bandung</h2>
[[tabel:game:bandung]]

<h2>PS3 atau PS4?</h2>
<ul class="tips">
<li><b>PlayStation 4</b> — grafis lebih tajam dan pilihan game lebih baru; pas untuk turnamen kecil atau main bareng teman.</li>
<li><b>PlayStation 3</b> — pilihan hemat untuk main santai.</li>
<li>Isi paket (stik, kabel, game) bisa berbeda per unit; cek di halaman barang atau tanya admin sebelum booking.</li>
</ul>

<h2>Yang perlu disiapkan</h2>
<ul class="tips">
<li>TV atau monitor dengan port HDMI.</li>
<li>Colokan listrik di dekat TV.</li>
<li>Main seharian? Tarif harian biasanya lebih hemat daripada dua kali ½ hari.</li>
</ul>

<h2>Nobar atau acara? Tambah proyektor</h2>
<p>Untuk layar lebih besar saat acara kantor, ulang tahun, atau nonton bola bareng, sewa sekalian proyektor dan layarnya.</p>
[[kartu:proyektor:bandung:4]]
<p>Lihat juga <a href="/panduan/sewa-proyektor-playstation-nobar">panduan sewa proyektor & PlayStation untuk nobar</a>.</p>
[[cabang:BDG-HUB]]
'''),

dict(
    slug='villa-kolam-renang-garut-rombongan', img=('/img/v/ertap-village-3.webp', 'Rentalaja Experience', '', 'Ertap Village, Samarang, Garut'), city='garut', cats=['penginapan'], date='2026-11-11',
    title='Villa dengan Kolam Renang di Garut untuk Rombongan sampai 10 Orang',
    desc='Ertap Village di Samarang, Garut: villa 2 lantai dengan kolam renang, hot tub, dan karaoke untuk maksimal 10 tamu. Harga per malam, fasilitas, dan tips liburan rombongan.',
    lead='Liburan keluarga besar atau rombongan kantor ke Garut? Ertap Village di Samarang adalah villa 2 lantai dengan kolam renang, hot tub, dan karaoke untuk maksimal 10 tamu, dengan harga [[inap:ertap-village-garut]].',
    body='''
<h2>Sekilas Ertap Village</h2>
<p>Villa ini ada di pedesaan Samarang, Garut. Pagi hari pemandangannya hijau, malam hari terlihat lampu kota. Alamat lengkap dan petunjuk arah dikirim setelah booking.</p>
[[inapkartu:ertap-village-garut]]

<h2>Fasilitas untuk rombongan</h2>
<ul class="tips">
<li><b>Kolam renang & hot tub</b> — untuk anak-anak dan orang dewasa.</li>
<li><b>Karaoke</b> — hiburan malam tanpa keluar villa.</li>
<li><b>Dapur lengkap & kulkas</b> — bisa masak bareng atau bakar-bakar.</li>
<li><b>Carport muat hingga 10 mobil</b> — aman untuk rombongan yang datang dengan banyak kendaraan.</li>
<li>2 kamar tidur (1 queen, 1 double) plus sofa, 3 kamar mandi, ruang keluarga, ruang tamu, Wi-Fi, TV, dan perlengkapan mandi.</li>
</ul>

<h2>Check-in, check-out, dan pembayaran</h2>
<ul class="tips">
<li>Check-in mulai pukul 15.00, check-out paling lambat pukul 12.00.</li>
<li>[[aturan:stay_cancel_rule]]</li>
</ul>

<h2>Biar liburan rombongan lancar</h2>
<ul class="tips">
<li>Booking jauh hari untuk akhir pekan dan libur panjang; harga Jumat–Sabtu berbeda dengan hari biasa.</li>
<li>Butuh kendaraan? Sewa <a href="/sewa/mobil-garut.html">mobil lepas kunci</a> atau <a href="/sewa/motor-garut.html">motor</a> di Rentalaja Garut Kota.</li>
<li>Mau aktivitas seru bareng? Coba <a href="/experience">trip Jeep offroad di kaki Gunung Guntur</a>, termasuk trip sunrise pukul 04.30.</li>
</ul>
<p>Rombongan lebih kecil? Lihat <a href="/panduan/penginapan-dekat-cipanas-garut">rumah utuh dekat Cipanas</a> atau semua <a href="/sewa/penginapan-garut.html">penginapan Rentalaja di Garut</a>.</p>
'''),

dict(
    slug='penginapan-dekat-cipanas-garut', img=('/img/v/ruma-metua-2.webp', 'Rentalaja Experience', '', 'Ruma Metua, Tarogong, Garut'), city='garut', cats=['penginapan'], date='2026-11-11',
    title='Penginapan Rumah Utuh Dekat Cipanas Garut untuk Keluarga',
    desc='Dua pilihan rumah utuh dekat kawasan air panas Cipanas, Garut: Ruma Metua di Tarogong (3 kamar, boleh bawa hewan peliharaan) dan Didi House di Rancabango (2 kamar).',
    lead='Mau menginap dekat kawasan air panas Cipanas tapi lebih privat dari hotel? Rentalaja Experience punya dua rumah utuh: Ruma Metua di Tarogong untuk keluarga sampai 5 orang, dan Didi House di Rancabango untuk keluarga kecil.',
    body='''
<h2>Ruma Metua, Tarogong</h2>
<p>Rumah utuh 3 kamar tidur dengan suasana hangat, sekitar 10 menit ke kawasan Cipanas dan 15 menit ke pusat kota Garut serta stasiun. Harga [[inap:ruma-metua-garut]].</p>
<ul class="tips">
<li>3 kamar tidur, 3 kamar mandi (kamar mandi utama dengan bathtub), ruang keluarga, dapur lengkap.</li>
<li>Hot tub, Wi-Fi, TV, kulkas 2 pintu, carport tertutup untuk 3 mobil, penjaga rumah siaga.</li>
<li><b>Boleh bawa hewan peliharaan.</b></li>
</ul>

<h2>Didi House, Rancabango</h2>
<p>Rumah modern minimalis dekat kawasan Cipanas dan pusat kota, cocok untuk keluarga kecil sampai 4 orang.</p>
<ul class="tips">
<li>2 kamar tidur (1 kasur + 1 ranjang susun), 1 kamar mandi dengan shower, ruang tamu, dapur lengkap.</li>
<li>TV, dispenser, kulkas, carport.</li>
</ul>

<h2>Bandingkan</h2>
[[inapkartu:ruma-metua-garut,didi-house-garut]]

<h2>Info menginap</h2>
<ul class="tips">
<li>Check-in mulai pukul 15.00, check-out paling lambat pukul 12.00.</li>
<li>Alamat lengkap dan petunjuk arah dikirim setelah booking terkonfirmasi.</li>
<li>[[aturan:stay_cancel_rule]]</li>
</ul>
<p>Mau ke Cipanas naik motor? Baca <a href="/panduan/wisata-cipanas-garut-naik-motor">panduan wisata Cipanas</a>. Rombongan sampai 10 orang? Lihat <a href="/panduan/villa-kolam-renang-garut-rombongan">villa dengan kolam renang</a>.</p>
'''),

dict(
    slug='liburan-2-hari-garut', img=('photo-1580808327337-731f57b77991', 'Ken Petung', 'kenpetung', 'Gunung Papandayan, Garut'), city='garut', cats=['penginapan', 'motor'], date='2026-11-11',
    title='Rencana Liburan 2 Hari 1 Malam di Garut: Menginap, Keliling, dan Jeep Sunrise',
    desc='Contoh rencana 2 hari 1 malam di Garut: ambil motor atau mobil, berendam di Cipanas, menginap di villa atau rumah utuh, lalu Jeep sunrise atau ke Papandayan.',
    lead='Punya waktu dua hari di Garut? Ini contoh rencana yang praktis: kendaraan, penginapan, dan aktivitas bisa diatur dari satu aplikasi Rentalaja.',
    body='''
<h2>Hari 1: datang, keliling, check-in</h2>
<ol class="steps">
<li><b>Ambil kendaraan.</b> Datang lewat Stasiun Garut? Motor bisa diambil di Rentalaja Garut Kota atau diantar ke stasiun (<a href="/panduan/sewa-motor-stasiun-garut">caranya</a>). Rombongan bisa pilih <a href="/sewa/mobil-garut.html">mobil lepas kunci</a>.</li>
<li><b>Siang: berendam di Cipanas.</b> Kawasan air panas Cipanas ada di Tarogong, tidak jauh dari Garut Kota. Lihat <a href="/panduan/wisata-cipanas-garut-naik-motor">panduan ke Cipanas naik motor</a>.</li>
<li><b>Sore: check-in mulai pukul 15.00.</b> Pilih penginapan sesuai jumlah orang (di bawah).</li>
</ol>

<h2>Pilih penginapan</h2>
[[inapkartu]]
<p>Rombongan sampai 10 orang cocok di villa dengan kolam renang; keluarga kecil lebih pas di rumah utuh. Bandingkan semua di <a href="/sewa/penginapan-garut.html">halaman penginapan Garut</a>.</p>

<h2>Hari 2: pilih satu petualangan</h2>
<ul class="tips">
<li><b>Jeep sunrise.</b> Berangkat pukul 04.30, sekitar 2,5 jam termasuk berhenti foto, satu jeep untuk 3–4 orang dengan driver. Detail dan harga di <a href="/experience">Rentalaja Experience</a>.</li>
<li><b>Gunung Papandayan.</b> Naik motor lewat Bayongbong–Cisurupan; untuk tanjakan kami sarankan Honda PCX. Lihat <a href="/panduan/rute-motor-garut-papandayan">rute lengkapnya</a>.</li>
<li><b>Kamojang & Darajat.</b> Pemandangan pegunungan dan kawasan panas bumi; lihat <a href="/panduan/rute-motor-kamojang-darajat">rute motornya</a>.</li>
</ul>
<p>Check-out paling lambat pukul 12.00, lalu kembalikan kendaraan sesuai jam di booking atau perpanjang dari aplikasi.</p>

<h2>Motor untuk keliling</h2>
[[kartu:motor:garut:4]]
[[cabang:GRT]]
'''),
dict(
    slug='harga-rental-mobil-garut', img=('photo-1711683951846-14a2b1d59b76', 'Abdullah Ammar', 'abdmmar', 'Ilustrasi'), city='garut', cats=['mobil'], date='2026-11-12',
    title='Harga Rental Mobil Garut Lepas Kunci 2026 & Contoh Hitung Biaya',
    desc='Daftar harga rental mobil di Garut per hari (lepas kunci) dari city car, MPV, sampai Hiace, contoh total sewa 1–3 hari, syarat, DP, dan pilihan dengan sopir.',
    lead='Berapa biaya rental mobil di Garut? Di Rentalaja Garut Kota harga mobil lepas kunci mulai [[harga:daihatsu-ayla-mt:garut]]. Di bawah ini daftar harga lengkap yang diambil langsung dari sistem, contoh hitungan untuk beberapa durasi, dan hal yang perlu disiapkan sebelum booking.',
    body='''
<h2>Daftar harga rental mobil Garut per hari</h2>
[[tabel:mobil:garut]]
<p>Harga di atas untuk lepas kunci (Anda menyetir sendiri) dan selalu mengikuti sistem Rentalaja. Promo atau tarif musim ramai, bila ada, dihitung otomatis saat booking.</p>

<h2>Contoh total biaya</h2>
<div class="scroll"><table><thead><tr><th>Mobil & durasi</th><th class="n">Total</th></tr></thead><tbody>
<tr><td>Daihatsu Sigra, 1 hari (24 jam)</td><td class="n">[[hitung:daihatsu-sigra-mt:garut:24]]</td></tr>
<tr><td>Daihatsu Sigra, 1 hari + sisa 8 jam (32 jam)</td><td class="n">[[hitung:daihatsu-sigra-mt:garut:32]]</td></tr>
<tr><td>Daihatsu Sigra, 3 hari (72 jam)</td><td class="n">[[hitung:daihatsu-sigra-mt:garut:72]]</td></tr>
<tr><td>Mitsubishi Xpander AT, 2 hari (48 jam)</td><td class="n">[[hitung:mitsubishi-xpander-at:garut:48]]</td></tr>
<tr><td>Toyota Hiace, 1 hari (24 jam)</td><td class="n">[[hitung:toyota-hiace:garut:24]]</td></tr>
</tbody></table></div>
<p>Durasi dihitung per 24 jam dari jam ambil. Kalau setelah hari penuh masih ada sisa <b>12 jam atau kurang</b>, sisa itu dikenai [[aturan:half_day_extra_percent]]% dari tarif harian, bukan satu hari penuh. Total final tampil di aplikasi sebelum Anda bayar.</p>

<h2>Lepas kunci atau dengan sopir?</h2>
<ul class="tips">
<li><b>Lepas kunci</b>: syaratnya KTP, SIM A, dan KK yang diunggah sekali di aplikasi dan diverifikasi sebelum bayar. DP [[aturan:dp_percent]]%, sisanya saat ambil mobil.</li>
<li><b>Dengan sopir</b>: cocok kalau tidak hafal jalan Garut atau ingin santai. Pilihan paket dan harganya ada di <a href="/#/MobilSopir">halaman Mobil + sopir</a>; DP paket sopir [[aturan:car_driver_dp_percent]]%.</li>
</ul>
<p>Area pemakaian: [[aturan:rental_region]]</p>

<h2>Tips supaya lebih hemat</h2>
<ul class="tips">
<li><b>Pilih mobil sesuai rombongan.</b> Untuk 2–3 orang city car sudah cukup; untuk keluarga 5–7 orang pilih MPV. Lihat <a href="/panduan/sewa-mobil-garut-pilih-sesuai-rombongan">panduan memilih mobil sesuai jumlah orang & koper</a>.</li>
<li><b>Atur jam kembali.</b> Lewat sedikit dari hari penuh hanya dikenai tambahan setengah hari, jadi rencanakan jam kembali yang realistis. Ada toleransi telat [[aturan:late_grace_minutes]]; lewat dari itu dikenai denda [[aturan:late_fee_percent_per_hour]]% dari harga harian per jam.</li>
<li><b>Booking lebih awal</b> saat akhir pekan dan libur panjang. Pembatalan gratis paling lambat [[aturan:free_cancel_hours]] jam sebelum jadwal ambil.</li>
<li><b>Butuh diantar?</b> Mobil bisa diantar ke hotel, villa, atau Stasiun Garut dengan ongkir sesuai jarak:</li>
</ul>
[[ongkir:GRT]]

<h2>Pilihan mobil</h2>
[[kartu:mobil:garut:6]]
<p>Lihat semua di <a href="/sewa/mobil-garut.html">halaman sewa mobil Garut</a>. Menginap di Garut? Cek juga <a href="/sewa/penginapan-garut.html">villa & rumah Rentalaja Experience</a>.</p>
[[cabang:GRT]]
'''),

dict(
    slug='pilih-lensa-sewa-tele-wide-fix-garut', img=('photo-1502982720700-bfff97f2ecac', 'William Thomas', 'williamauto', 'Ilustrasi'), city='garut', cats=['lensa', 'kamera'], date='2026-11-12',
    title='Sewa Lensa di Garut: Pilih Lensa Tele, Wide, atau Fix Sesuai Mount Kamera',
    desc='Bedanya lensa tele, wide, dan fix untuk kamera Canon, Sony, dan Fujifilm, lengkap dengan daftar lensa yang bisa disewa di Rentalaja Garut Kota dan harganya dari sistem.',
    lead='Lensa menentukan hasil foto sama besarnya dengan kamera. Di Rentalaja Garut Kota tersedia lensa tele seperti Canon EF-S 55-250mm ([[harga:lensa-canon-ef-s-55-250mm:garut]]), lensa wide, dan lensa fix bukaan besar untuk Canon, Sony, dan Fujifilm. Panduan ini membantu memilih jenis lensa yang tepat dan memastikan cocok dengan mount kamera Anda.',
    body='''
<h2>Langkah pertama: cocokkan mount</h2>
<p>Lensa hanya bisa dipasang di kamera dengan mount yang sama. Ini aturan dasar sebelum memilih focal length:</p>
<ul class="tips">
<li><b>Canon DSLR</b> (1100D, 1200D, 1300D, 600D, 700D, 70D): lensa Canon EF dan EF-S, misalnya 18-55mm STM, 50mm F1.8, 10-18mm, dan 55-250mm.</li>
<li><b>Canon EOS M</b> (M10): lensa Canon 15-45mm kit EOS M.</li>
<li><b>Sony</b> (A6000, A6400, A7II, A7III): lensa Sony E/FE dan lensa pihak ketiga bertulisan "for Sony".</li>
<li><b>Fujifilm</b> (X-A5, X-T10, X-T20, X-T2, X-T4): lensa Fujinon XF dan lensa bertulisan "for Fujifilm".</li>
</ul>
<p>Untuk lensa yang mount-nya tidak tertulis di nama (misalnya Tamron 18-200mm), tanyakan ke admin kamera mana yang cocok sebelum booking.</p>

<h2>Lensa tele: untuk subjek jauh</h2>
<p>Lensa tele mendekatkan subjek yang jauh: panggung acara, pertandingan olahraga, burung, atau foto candid dari kejauhan tanpa mengganggu orangnya. Latar belakang juga terlihat lebih "rapat" dan blur.</p>
[[pilih:garut:lensa-canon-ef-s-55-250mm,lensa-tamron-18-200mm-vc]]
<p>Canon 55-250mm cocok dipasangkan dengan DSLR Canon untuk acara wisuda dari bangku penonton atau foto alam. Tamron 18-200mm adalah lensa "sapu jagat": satu lensa dari lebar sampai tele, praktis untuk jalan-jalan tanpa ganti lensa.</p>

<h2>Lensa wide: untuk pemandangan dan ruangan</h2>
<p>Lensa wide menangkap bidang yang luas: pemandangan gunung, interior villa atau kafe, dan foto rombongan di ruang sempit. Cocok juga untuk vlog karena wajah dan latar masuk sekaligus saat kamera dipegang sendiri.</p>
[[pilih:garut:lensa-canon-ef-s-10-18mm-is-stm,lensa-sigma-16mm-f1-4-for-sony,lensa-sigma-16mm-f1-4-for-fujifilm,lensa-fujinon-xf-23mm-f2]]
<p>Sigma 16mm F1.4 punya bukaan besar, jadi tetap terang untuk foto malam atau dalam ruangan. Canon 10-18mm lebih lebar lagi untuk interior dan arsitektur.</p>

<h2>Lensa fix (prime): untuk potret dan cahaya minim</h2>
<p>Lensa fix tidak bisa zoom, tapi bukaannya besar (angka F kecil) sehingga latar lebih blur dan tetap terang di tempat redup. Pilihan paling populer untuk potret, foto produk, dan konten makanan.</p>
[[pilih:garut:lensa-canon-50mm-f1-8,lensa-canon-50mm-stm,lensa-sigma-30mm-f1-4-for-sony,lensa-sony-e-35mm-f1-8,lensa-kamlan-50mm-f1-1-for-sony,lensa-sony-fe-85mm-f1-8,lensa-sigma-30mm-f1-4-for-fujifilm,lensa-fujinon-35mm-f2,lensa-fujinon-35mm-f1-4,lensa-sigma-56mm-f1-4-for-fujifilm,lensa-viltrox-85mm-f1-8-for-fujifilm]]
<ul class="tips">
<li><b>30–35mm</b> di kamera APS-C: sudut pandang mirip mata, serbaguna untuk sehari-hari dan potret setengah badan.</li>
<li><b>50–56mm</b> di APS-C: potret dari dada ke atas dengan latar blur.</li>
<li><b>85mm</b>: potret close-up dan prewedding, butuh ruang mundur lebih jauh.</li>
<li>Kamlan 50mm F1.1 adalah lensa fokus manual; cocok kalau Anda terbiasa memutar ring fokus sendiri.</li>
</ul>

<h2>Lensa kit: zoom standar untuk pemula</h2>
<p>Lensa kit (18-55mm, 16-50mm, 15-45mm, 28-70mm) mencakup lebar sampai sedikit tele. Cukup untuk dokumentasi acara dan liburan, dan paling ringan di kantong.</p>
[[pilih:garut:lensa-canon-15-45mm-kit-eos-m,lensa-sony-kit-16-50mm-oss,lensa-canon-ef-s-18-55mm-stm,lensa-sony-fe-28-70mm]]

<h2>Crop factor: kenapa 50mm terasa lebih "dekat"</h2>
<p>Sebagian besar kamera di katalog (Canon DSLR seri angka, Sony A6000/A6400, semua Fujifilm X) memakai sensor APS-C. Di sensor ini, sudut pandang lensa terasa lebih sempit dibanding kamera full frame: kira-kira dikali 1,5 untuk Sony dan Fujifilm, dan 1,6 untuk Canon. Jadi lensa 50mm di Canon 1300D terasa seperti sekitar 80mm. Sony A7II dan A7III adalah full frame, jadi lensa FE 28-70mm dan FE 85mm terasa sesuai angkanya.</p>

<h2>Contoh biaya sewa</h2>
<p>Semua lensa di atas bisa disewa terpisah kalau Anda sudah punya kamera, atau sekalian dengan kamera dari <a href="/sewa/kamera-garut.html">katalog kamera Garut</a>. Contoh hitungan sistem sebelum promo:</p>
<ul class="tips">
<li>Canon 55-250mm ½ hari: [[hargah:lensa-canon-ef-s-55-250mm:garut]], 1 hari: [[hitung:lensa-canon-ef-s-55-250mm:garut:24]].</li>
<li>Sigma 30mm F1.4 for Sony 2 jam: [[hitung:lensa-sigma-30mm-f1-4-for-sony:garut:2]], 1 hari: [[hitung:lensa-sigma-30mm-f1-4-for-sony:garut:24]].</li>
<li>Sony A6000 + Sigma 16mm F1.4 for Sony, masing-masing per hari: [[harga:sony-a6000:garut]] dan [[harga:lensa-sigma-16mm-f1-4-for-sony:garut]].</li>
</ul>
<p>Promo sewa beberapa hari, bila ada, dihitung otomatis saat booking. Daftar lengkap lensa ada di <a href="/sewa/lensa-garut.html">halaman sewa lensa Garut</a>.</p>

<h2>Tips sebelum mengambil lensa</h2>
<ul class="tips">
<li>Stok banyak lensa hanya 1–2 unit. Booking lebih awal untuk tanggal wisuda dan akhir pekan.</li>
<li>Cek kaca depan dan belakang bersama petugas, pasang tutup lensa saat tidak dipakai.</li>
<li>Ganti lensa di tempat teduh dan tidak berangin supaya debu tidak masuk ke sensor.</li>
<li>Baca juga <a href="/panduan/kamera-lensa-wisuda-prewedding-garut">kombinasi kamera dan lensa untuk wisuda &amp; prewedding</a> dan <a href="/panduan/sewa-kamera-foto-produk-umkm-garut">sewa kamera untuk foto produk UMKM</a>.</li>
</ul>
[[cabang:GRT]]
'''),

dict(
    slug='sewa-sepatu-gunung-jaket-carrier-garut', img=('photo-1790617616577-706647c2b4b3', 'Yulya Powell', 'matsurimon', 'Ilustrasi'), city='garut', cats=['camping'], date='2026-11-12',
    title='Sewa Sepatu Gunung, Jaket Hiking, dan Carrier di Garut: Harga & Cara Pilih',
    desc='Harga sewa sepatu gunung, sepatu trail run, jaket hiking, carrier 45L/60L, trekking pole, dan hydropack di Rentalaja Garut Kota, plus cara memilih untuk pendakian Papandayan, Guntur, atau Cikuray.',
    lead='Mau mendaki di Garut tapi belum punya sepatu gunung atau carrier? Di Rentalaja Garut Kota, sepatu outdoor bisa disewa [[harga:sepatu-outdoor:garut]] dan carrier mulai [[harga:carrier-45l:garut]]. Berikut cara memilih perlengkapan pakai-badan yang pas supaya pendakian nyaman.',
    body='''
<h2>Harga sewa perlengkapan pendakian</h2>
[[pilih:garut:sepatu-outdoor,sepatu-trail-run,jaket-hiking-gorpcore-pria,jaket-hiking-gorpcore-wanita,carrier-45l,carrier-60l,trekking-pole,hydropack]]
<p>Harga per item per hari, diambil langsung dari sistem Rentalaja.</p>

<h2>Sepatu outdoor atau sepatu trail run?</h2>
<ul class="tips">
<li><b>Sepatu outdoor</b> ([[harga:sepatu-outdoor:garut]]): pilihan aman untuk jalur berbatu, berpasir, atau licin, dan untuk membawa beban carrier.</li>
<li><b>Sepatu trail run</b> ([[harga:sepatu-trail-run:garut]]): lebih ringan dan lentur, cocok untuk tektok (naik-turun tanpa menginap) dan Anda yang terbiasa berjalan cepat.</li>
</ul>
<p>Ukuran yang tersedia terbatas, jadi <b>tanyakan ukuran ke admin lewat WhatsApp sebelum booking</b>. Saat mengambil, coba pakai dengan kaus kaki tebal yang akan Anda pakai mendaki. Pastikan jari kaki tidak menyentuh ujung sepatu saat berdiri, karena di turunan kaki akan terdorong ke depan.</p>

<h2>Carrier 45L atau 60L?</h2>
<ul class="tips">
<li><b>Carrier 45L</b> ([[harga:carrier-45l:garut]]): cukup untuk camping 1 malam dengan sleeping bag, matras, dan baju ganti.</li>
<li><b>Carrier 60L</b> ([[harga:carrier-60l:garut]]): untuk membawa barang bersama seperti kompor, gas, dan flysheet, atau untuk 2 malam.</li>
</ul>
<p>Tiap ukuran carrier hanya tersedia 1 unit. Untuk rombongan, booking lebih awal dan bagi bawaan supaya tidak semua orang butuh carrier besar.</p>
<p>Cara memakai: kencangkan sabuk pinggang (hip belt) lebih dulu supaya beban bertumpu di pinggul, baru atur tali bahu. Barang berat taruh di tengah, dekat punggung.</p>

<h2>Jaket hiking</h2>
<p>Jaket hiking tersedia model pria ([[harga:jaket-hiking-gorpcore-pria:garut]]) dan wanita ([[harga:jaket-hiking-gorpcore-wanita:garut]]). Udara di gunung jauh lebih dingin daripada Garut Kota, apalagi malam dan menjelang subuh. Pakai berlapis: kaus yang cepat kering, lapisan hangat dari rumah, lalu jaket di luar. Jas hujan tetap perlu dibawa sendiri.</p>

<h2>Trekking pole dan hydropack</h2>
<ul class="tips">
<li><b>Trekking pole</b> ([[harga:trekking-pole:garut]]): membantu menahan lutut di turunan dan menjaga keseimbangan di jalur licin.</li>
<li><b>Hydropack</b> ([[harga:hydropack:garut]]): kantong air dengan selang, jadi bisa minum sambil berjalan tanpa membuka tas.</li>
</ul>

<h2>Contoh biaya untuk pendakian 2 hari</h2>
<p>Satu orang, ambil pagi dan kembali besok sore (lebih dari 24 jam), contoh hitungan sistem sebelum promo:</p>
<ul class="tips">
<li>Sepatu outdoor: [[hitung:sepatu-outdoor:garut:32]]</li>
<li>Carrier 45L: [[hitung:carrier-45l:garut:32]]</li>
<li>Jaket hiking: [[hitung:jaket-hiking-gorpcore-pria:garut:32]]</li>
<li>Trekking pole: [[hitung:trekking-pole:garut:32]]</li>
</ul>
<p>Total akhir mengikuti jam ambil dan jam kembali di booking; promo bila ada dihitung otomatis. Cara hitung durasinya dijelaskan di <a href="/panduan/hitung-biaya-sewa-motor-garut">panduan hitung biaya sewa</a> (aturannya sama untuk alat camping).</p>

<h2>Lengkapi dengan alat camping</h2>
<p>Sleeping bag, matras, kompor, dan lampu tenda bisa diambil di cabang yang sama. Lihat <a href="/panduan/checklist-alat-camping-garut">checklist alat camping</a>, <a href="/panduan/biaya-camping-per-orang-garut">contoh biaya camping per orang</a>, dan <a href="/sewa/camping-garut.html">semua alat camping di Garut</a>. Butuh motor ke basecamp? Baca <a href="/panduan/rute-motor-garut-papandayan">rute motor ke Papandayan</a>.</p>

<h2>Yang tetap dibawa sendiri</h2>
<p>Beberapa barang sebaiknya milik pribadi karena menempel langsung di badan atau tidak ada di katalog:</p>
<ul class="tips">
<li><b>Kaus kaki tebal</b> dan cadangannya, supaya sepatu sewaan nyaman dan kaki tidak lecet.</li>
<li><b>Jas hujan atau ponco</b>; hujan di gunung bisa datang tiba-tiba.</li>
<li><b>Sarung tangan, kupluk, dan baju ganti</b> di kantong kedap air.</li>
<li><b>Obat pribadi, makanan ringan, dan air minum</b> secukupnya untuk perjalanan.</li>
</ul>

<h2>Merawat barang selama dipakai</h2>
<ul class="tips">
<li>Lepas sepatu yang basah di tenda dan jangan dijemur dekat api, karena lem dan sol bisa rusak.</li>
<li>Kosongkan dan buka tutup hydropack setelah dipakai supaya cepat kering.</li>
<li>Kendurkan tali carrier sebelum disimpan, dan jangan menduduki carrier yang berisi barang.</li>
<li>Kotor karena dipakai mendaki itu wajar. Kalau ada yang rusak, kabari admin saat pengembalian.</li>
</ul>

<h2>Tips singkat</h2>
<ul class="tips">
<li>Cek kondisi sol dan tali sepatu, resleting jaket, serta gesper carrier bersama petugas saat ambil.</li>
<li>Cek prakiraan cuaca dan info jalur dari pengelola gunung sebelum berangkat.</li>
<li>Kembalikan sesuai jam di booking, atau perpanjang dari aplikasi sebelum waktunya habis.</li>
</ul>
[[cabang:GRT]]
'''),

dict(
    slug='harga-sewa-iphone-garut', img=('photo-1616410011236-7a42121dd981', 'Onur Binay', 'onurbinay', 'Ilustrasi'), city='garut', cats=['iphone'], date='2026-11-13',
    title='Harga Sewa iPhone di Garut per Hari: iPhone XR, 11, 13, 15, dan 16',
    desc='Berapa harga sewa iPhone 1 hari di Garut? Daftar harga harian dan ½ hari iPhone XR, 11, 13, 15, 16 di Rentalaja Garut Kota & Wanaraja, contoh hitung biaya, DP, dan denda telat.',
    lead='Harga sewa iPhone di Rentalaja Garut mulai [[harga:iphone-xr:garut]] untuk iPhone XR. iPhone 13 [[harga:iphone-13:garut]], iPhone 15 [[harga:iphone-15:garut]], dan iPhone 16 [[harga:iphone-16:garut]]. Untuk acara singkat ada tarif ½ hari (sampai 12 jam) yang lebih murah. Semua angka di halaman ini diambil langsung dari sistem.',
    body='''
<h2>Daftar harga sewa iPhone Garut</h2>
[[tabel:iphone:garut]]
<p>Tarif <b>½ hari</b> berlaku untuk sewa sampai 12 jam, tarif <b>1 hari</b> untuk 24 jam. iPhone bisa diambil di Rentalaja Garut Kota (Jl. Cimanuk) atau Wanaraja (sebagian model). Charger dan tas sudah termasuk; kelengkapan tiap unit tertulis di halaman barangnya.</p>

<h2>Berapa harga sewa iPhone 1 hari?</h2>
<p>Sewa 1 hari dihitung 24 jam sejak jam ambil, bukan sampai tutup toko. Jadi kalau Anda ambil jam 10.00, kembalikan besok jam 10.00.</p>
<p>Contoh iPhone 13 di Garut Kota:</p>
<ul class="tips">
<li>Ambil 08.00, kembali 19.00 di hari yang sama (11 jam) → masuk tarif ½ hari: [[hitung:iphone-13:garut:11]].</li>
<li>Ambil 08.00, kembali besok 08.00 (24 jam) → tarif 1 hari: [[hitung:iphone-13:garut:24]].</li>
</ul>
<p>Jadi kalau iPhone cuma dipakai siang sampai sore, atur jam kembali maksimal 12 jam setelah ambil supaya lebih hemat.</p>
<p style="font-size:13px;color:var(--mute)">Dihitung dengan aturan harga sistem, sebelum promo. Promo yang sedang berlaku terpasang otomatis saat booking.</p>

<h2>Harga sewa iPhone 13 vs iPhone 15</h2>
<p>Dua model ini paling sering dibandingkan. Selisih tarif hariannya: iPhone 13 [[harga:iphone-13:garut]], iPhone 15 [[harga:iphone-15:garut]].</p>
<ul class="tips">
<li><b>Pilih iPhone 13</b> kalau butuhnya video konten, reels, atau dokumentasi acara. Sudah ada kamera ultra wide dan mode Cinematic.</li>
<li><b>Pilih iPhone 15</b> kalau butuh foto yang lebih detail, misalnya foto wisuda, prewedding sederhana, atau foto produk. Kamera utamanya 48MP dan port-nya USB-C.</li>
<li><b>iPhone XR dan 11</b> cukup untuk foto dan video sehari-hari atau sebagai HP cadangan, dengan biaya paling hemat.</li>
</ul>
<p>Perbandingan kamera lengkap ada di <a href="/panduan/pilih-iphone-sewa-garut">panduan memilih iPhone XR, 11, 13, 15, dan 16</a>.</p>

<h2>Kalau lewat dari 1 hari</h2>
<p>Sewa lebih dari 24 jam dihitung per 24 jam. Kalau sisanya 12 jam atau kurang setelah hari penuh, sisa itu dikenai [[aturan:half_day_extra_percent]]% dari tarif harian, bukan satu hari penuh. Contoh 1 hari + 6 jam (30 jam):</p>
<ul class="tips">
<li>iPhone 11: [[hitung:iphone-11:garut:30]]</li>
<li>iPhone 13: [[hitung:iphone-13:garut:30]]</li>
<li>iPhone 15: [[hitung:iphone-15:garut:30]]</li>
</ul>
<p style="font-size:13px;color:var(--mute)">Sebelum promo. Total final selalu tampil di aplikasi saat memilih jam ambil dan jam kembali.</p>

<h2>Biaya lain yang perlu diketahui</h2>
<ul class="tips">
<li><b>DP [[aturan:dp_percent]]%</b> dibayar online setelah dokumen ([[aturan:docs_required]]) lolos verifikasi. Sisanya dibayar saat ambil iPhone.</li>
<li><b>Diantar?</b> Ongkir dihitung dari jarak alamat ke cabang Garut Kota:</li>
</ul>
[[ongkir:GRT]]
<ul class="tips">
<li><b>Telat mengembalikan:</b> ada toleransi [[aturan:late_grace_minutes]]. Lewat dari itu dikenai denda [[aturan:late_fee_percent_per_hour]]% dari harga harian per jam. Lebih hemat perpanjang dari aplikasi sebelum jam kembali.</li>
</ul>

<h2>Tips supaya lebih hemat</h2>
<ul class="tips">
<li>Acara cuma setengah hari (wisuda, lamaran, foto keluarga)? Pilih jam kembali maksimal 12 jam setelah ambil supaya kena tarif ½ hari.</li>
<li>Tentukan model dari kebutuhan, bukan dari yang terbaru. Untuk story dan foto biasa, iPhone XR atau 11 sudah cukup.</li>
<li>Booking lebih awal untuk akhir pekan dan musim wisuda; unit tiap model terbatas.</li>
</ul>
<p>Mau pakai iPhone untuk live dan foto produk? Baca <a href="/panduan/sewa-iphone-jualan-online-garut">sewa iPhone untuk jualan online di Garut</a>. Semua model dan stok ada di halaman <a href="/sewa/iphone-garut.html">sewa iPhone Garut</a>.</p>
[[cabang:GRT]]
[[cabang:WNR]]
'''),

dict(
    slug='sewa-iphone-terdekat-garut-bandung', img=('photo-1548345680-f5475ea5df84', 'henry perks', 'hjkp', 'Ilustrasi'), city=None, cats=['iphone'], date='2026-11-13',
    title='Sewa iPhone Terdekat di Garut dan Bandung: Ambil di Cabang atau Diantar',
    desc='Cari sewa iPhone terdekat dari lokasi Anda? Rentalaja punya cabang iPhone di Garut Kota, Wanaraja, dan Bandung (Coblong). Bisa ambil sendiri atau diantar dengan ongkir sesuai jarak.',
    lead='Rentalaja menyewakan iPhone di tiga cabang: Garut Kota (Jl. Cimanuk), Wanaraja, dan Bandung (Jl. Kubang Selatan, Coblong). Pilih cabang yang paling dekat, atau pilih "Diantar" saat booking supaya iPhone dikirim ke alamat Anda dengan ongkir sesuai jarak.',
    body='''
<h2>Cabang yang menyewakan iPhone</h2>
<div class="scroll"><table><thead><tr><th>Cabang</th><th>Wilayah</th><th>Catatan</th></tr></thead><tbody>
<tr><td>Rentalaja Garut Kota</td><td>Jl. Cimanuk, Garut Kota</td><td>Pilihan model paling lengkap di Garut</td></tr>
<tr><td>Rentalaja Wanaraja</td><td>Jl. Raya Wanaraja, Karangpawitan</td><td>Sebagian model; cocok untuk area Wanaraja, Karangpawitan, dan sekitarnya</td></tr>
<tr><td>Rentalaja Bandung</td><td>Jl. Kubang Selatan, Coblong</td><td>Dekat kawasan Dipatiukur, ITB, dan Dago</td></tr>
</tbody></table></div>
<p>Stok tiap model di tiap cabang bisa berubah. Saat booking di aplikasi, pilih kota lalu lihat model yang tersedia di tanggal Anda.</p>

<h2>Cara tahu cabang mana yang paling dekat</h2>
<ol class="steps">
<li>Buka tautan <b>Peta</b> di kotak alamat cabang di bawah halaman ini. Google Maps akan menunjukkan jarak dan perkiraan waktu dari lokasi Anda saat ini.</li>
<li>Kalau lokasi Anda jauh dari semua cabang, pilih <b>Diantar</b> saat booking. Jarak dan ongkir dihitung otomatis dari titik alamat yang Anda pilih di peta.</li>
<li>Bingung memilih? Tanya admin lewat WhatsApp; sebutkan lokasi dan tanggal pakai.</li>
</ol>

<h2>Harga iPhone di Garut</h2>
[[tabel:iphone:garut]]

<h2>Harga iPhone di Bandung</h2>
[[tabel:iphone:bandung]]
<p>Tarif ½ hari berlaku untuk sewa sampai 12 jam. Charger dan tas sudah termasuk. Rincian per kota: <a href="/panduan/harga-sewa-iphone-garut">harga sewa iPhone Garut</a> dan <a href="/panduan/harga-sewa-iphone-bandung">harga sewa iPhone Bandung</a>.</p>

<h2>Ongkir antar iPhone</h2>
<p>Kalau tidak sempat ke cabang, iPhone bisa diantar ke rumah, kos, hotel, kampus, atau lokasi acara. Ongkir sekali jalan dari sistem:</p>
[[ongkir:GRT:BDG-HUB]]
<p>Waktu pengantaran mengikuti jam ambil di booking dan dikonfirmasi cabang.</p>

<h2>Ambil sendiri vs diantar</h2>
<ul class="tips">
<li><b>Ambil di cabang</b> — tanpa ongkir, bisa langsung cek kondisi unit dan kamera bersama petugas.</li>
<li><b>Diantar</b> — praktis kalau sedang sibuk persiapan acara, atau tidak bawa kendaraan. Siapkan KTP asli untuk dititipkan saat serah terima.</li>
<li>Cabang buka setiap hari, jamnya tercantum di kotak alamat di bawah. Untuk jam di luar itu, kabari admin sebelumnya.</li>
</ul>

<h2>Booking dulu sebelum datang</h2>
<p>Unit per model terbatas, jadi sebaiknya booking dari aplikasi sebelum berangkat ke cabang supaya tidak kehabisan:</p>
<ol class="steps">
<li>Pilih iPhone, tanggal, dan jam di <a href="/#/Katalog?cat=iphone">katalog</a>.</li>
<li>Unggah [[aturan:docs_required]] sekali saja, tunggu verifikasi.</li>
<li>Bayar DP [[aturan:dp_percent]]%, lalu ambil di cabang atau tunggu diantar.</li>
</ol>
<p>Butuh iPhone untuk acara tertentu? Lihat <a href="/panduan/sewa-iphone-konser-wisuda-bandung">sewa iPhone untuk konser & wisuda di Bandung</a> atau <a href="/sewa/iphone-garut.html">semua iPhone di Garut</a>.</p>
[[cabang:GRT]]
[[cabang:WNR]]
[[cabang:BDG-HUB]]
'''),

dict(
    slug='sewa-hp-harian-bandung', img=('photo-1605440458540-d65fd32f21ba', 'Hendrik Morkel', 'hendrikmorkel', 'Ilustrasi'), city='bandung', cats=['iphone'], date='2026-11-13',
    title='Sewa HP Harian di Bandung: Syarat, Cara Sewa, dan Aturan Pengembalian',
    desc='Mau sewa HP atau rental HP harian di Bandung? Di Rentalaja Bandung (Coblong) tersedia iPhone XR sampai iPhone 15. Syarat dokumen, DP, tarif ½ hari dan harian, toleransi telat, dan checklist serah terima.',
    lead='Rentalaja Bandung di Jl. Kubang Selatan, Coblong, menyewakan HP jenis iPhone, mulai [[harga:iphone-xr:bandung]]. Bisa sewa ½ hari atau harian, syaratnya cukup [[aturan:docs_required]] yang diunggah sekali di aplikasi. Berikut cara sewa dan aturan yang perlu Anda tahu sebelum ambil unit.',
    body='''
<h2>HP apa yang bisa disewa?</h2>
<p>Di Bandung, HP yang disewakan adalah iPhone: XR, 11, 13, dan 15. Biasanya dipakai untuk merekam acara, bikin konten, HP cadangan saat HP sendiri diservis, atau mencoba iPhone sebelum membeli.</p>
[[tabel:iphone:bandung]]

<h2>Sewa harian atau ½ hari?</h2>
<ul class="tips">
<li><b>½ hari</b> — sampai 12 jam. Cocok untuk wisuda, seminar, atau satu sesi konten.</li>
<li><b>Harian</b> — 24 jam sejak jam ambil.</li>
<li><b>Lebih dari sehari</b> — dihitung per 24 jam. Sisa 12 jam atau kurang setelah hari penuh dikenai [[aturan:half_day_extra_percent]]% tarif harian.</li>
</ul>
<p>Contoh iPhone XR: 12 jam [[hitung:iphone-xr:bandung:12]], 24 jam [[hitung:iphone-xr:bandung:24]], 30 jam [[hitung:iphone-xr:bandung:30]]. iPhone 11: 12 jam [[hitung:iphone-11:bandung:12]], 24 jam [[hitung:iphone-11:bandung:24]].</p>
<p style="font-size:13px;color:var(--mute)">Dihitung dengan aturan harga sistem, sebelum promo. Promo hari kerja Bandung (bila sedang berlaku) terpasang otomatis saat booking.</p>

<h2>Syarat sewa HP di Rentalaja Bandung</h2>
<ol class="steps">
<li><b>Dokumen:</b> [[aturan:docs_required]], diunggah sekali di aplikasi. Booking berikutnya tidak perlu unggah ulang.</li>
<li><b>Verifikasi</b> oleh admin. Kalau foto dokumen kurang jelas, Anda diminta unggah ulang.</li>
<li><b>DP [[aturan:dp_percent]]%</b> dibayar online, sisanya saat ambil unit.</li>
<li><b>KTP asli</b> dititipkan di cabang selama masa sewa, dikembalikan saat HP kembali.</li>
</ol>
<p>Pemakaian: [[aturan:rental_region]]</p>

<h2>Checklist saat serah terima</h2>
<ul class="tips">
<li>Cek bodi, layar, dan kamera bersama petugas sebelum dibawa.</li>
<li>Pastikan kelengkapan (charger, tas, dan case bila ada) sesuai yang tertulis di halaman barang.</li>
<li>Coba kamera depan dan belakang, mikrofon, dan pengisian daya.</li>
<li>Login akun Anda sendiri hanya untuk aplikasi yang memang perlu dipakai.</li>
</ul>

<h2>Sebelum mengembalikan</h2>
<ul class="tips">
<li>Pindahkan foto dan video ke HP, laptop, atau cloud Anda.</li>
<li>Logout semua akun Anda (media sosial, marketplace, e-mail), lalu hapus file pribadi.</li>
<li>Kembalikan bersama semua kelengkapannya.</li>
<li>Telat? Ada toleransi [[aturan:late_grace_minutes]]. Lewat dari itu dikenai denda [[aturan:late_fee_percent_per_hour]]% dari harga harian per jam, jadi lebih hemat perpanjang dari aplikasi sebelum jam kembali.</li>
</ul>

<h2>Ubah jadwal dan batal</h2>
<ul class="tips">
<li>Ubah jadwal gratis paling lambat [[aturan:free_reschedule_hours]] jam sebelum jam ambil.</li>
<li>Batal gratis paling lambat [[aturan:free_cancel_hours]] jam sebelum jam ambil.</li>
<li>[[aturan:late_cancel_rule]]</li>
</ul>

<h2>Ambil atau diantar</h2>
<p>Ambil di cabang Kubang Selatan, atau diantar ke kos, kampus, kantor, atau venue acara dengan ongkir sesuai jarak:</p>
[[ongkir:BDG-HUB]]
<p>Bingung pilih model? Baca <a href="/panduan/harga-sewa-iphone-bandung">harga sewa iPhone Bandung & cara memilih model</a>, <a href="/panduan/sewa-iphone-konser-wisuda-bandung">tips untuk konser & wisuda</a>, atau lihat semua unit di <a href="/sewa/iphone-bandung.html">sewa iPhone Bandung</a>.</p>
[[cabang:BDG-HUB]]
'''),
dict(
    slug='wisata-situ-bagendit-naik-motor', img=('photo-1703178223047-7f201f3318aa', 'Ake Widyastomo', 'akewidyastomo', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-14',
    title='Ke Situ Bagendit Naik Motor dari Garut Kota: Rute, Waktu Terbaik, dan Tips',
    desc='Panduan ke Situ Bagendit di Banyuresmi naik motor sewaan dari Garut Kota: rute singkat, waktu terbaik datang, aktivitas di danau, dan motor yang cocok.',
    lead='Situ Bagendit di Kecamatan Banyuresmi adalah danau terdekat dari pusat kota, cocok untuk jalan santai pagi atau sore. Dari Rentalaja Garut Kota cukup sewa Honda Beat ([[harga:honda-beat-cbs-new:garut]]) atau ambil tarif ½ hari ([[hargah:honda-beat-cbs-new:garut]]) karena perjalanannya pendek.',
    body='''
<h2>Rute dari Garut Kota</h2>
<p>Situ Bagendit ada di utara-timur Garut Kota, sekitar 15–20 menit naik motor lewat jalan kabupaten yang datar. Lihat rute dan waktu tempuh terbaru di [[rute:GRT:Situ Bagendit Garut]].</p>

<h2>Waktu terbaik datang</h2>
<ul class="tips">
<li><b>Pagi (06.30–09.00):</b> udara masih sejuk, danau tenang, dan cahayanya bagus untuk foto.</li>
<li><b>Sore (15.30–17.30):</b> pas untuk naik perahu atau rakit sambil menunggu matahari turun.</li>
<li>Akhir pekan dan libur sekolah lebih ramai; datang lebih awal supaya parkir motor mudah.</li>
</ul>

<h2>Yang bisa dilakukan</h2>
<p>Keliling danau naik perahu atau rakit bambu, jajan di warung sekitar danau, dan berfoto di tepi air. Kawasan ini juga dikenal lewat legenda Nyi Endit yang sering diceritakan warga sekitar.</p>

<h2>Contoh biaya sewa motor</h2>
<div class="scroll"><table><thead><tr><th>Rencana</th><th class="n">Total</th></tr></thead><tbody>
<tr><td>Honda Beat, ½ hari (12 jam)</td><td class="n">[[hitung:honda-beat-cbs-new:garut:12]]</td></tr>
<tr><td>Honda Beat, 1 hari (24 jam)</td><td class="n">[[hitung:honda-beat-cbs-new:garut:24]]</td></tr>
</tbody></table></div>
<p>Masih ada waktu setelah dari Situ Bagendit? Sambung ke <a href="/panduan/candi-cangkuang-kampung-pulo-naik-motor">Candi Cangkuang</a> atau lihat <a href="/panduan/keliling-garut-satu-hari-naik-motor">rute keliling Garut satu hari</a>.</p>
[[kartu:motor:garut:3]]
[[cabang:GRT]]
'''),
dict(
    slug='kawah-talaga-bodas-naik-motor', img=('photo-1684189930003-9434c949925f', 'Maneesh Shahani', 'meshdamus', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-14',
    title='Ke Kawah Talaga Bodas Naik Motor: Rute Wanaraja, Jalan Menanjak, dan Tips Aman',
    desc='Panduan ke Kawah Talaga Bodas di wilayah Wanaraja, Garut, naik motor sewaan: rute dari Garut Kota, kondisi tanjakan, motor yang disarankan, dan tips aman di area belerang.',
    lead='Kawah Talaga Bodas adalah danau kawah berair putih kehijauan di wilayah Wanaraja, sebelah timur Garut Kota. Jalan menuju kawah menanjak dan sebagian sempit, jadi pilih motor yang tenaganya cukup, misalnya Honda PCX ([[harga:honda-pcx:garut]]).',
    body='''
<h2>Rute dari Garut Kota</h2>
<p>Dari Garut Kota arahkan motor ke Wanaraja, lalu ikuti jalan desa yang terus menanjak ke arah kawah. Perjalanan sekitar 1–1,5 jam tergantung kondisi jalan. Cek rute terbaru di [[rute:GRT:Kawah Talaga Bodas Garut]].</p>

<h2>Motor yang disarankan</h2>
<ul class="tips">
<li><b>Honda PCX</b> paling nyaman untuk tanjakan panjang dan jalan bergelombang.</li>
<li><b>Honda Beat / Scoopy</b> masih bisa, terutama kalau berangkat sendiri tanpa boncengan dan barang bawaan ringan.</li>
<li>Isi bensin penuh di Garut Kota atau Wanaraja; SPBU jarang di jalur atas.</li>
</ul>
[[pilih:garut:honda-beat-cbs-new,honda-scoopy-new,honda-pcx]]

<h2>Tips aman di kawasan kawah</h2>
<ul class="tips">
<li>Bau belerang cukup kuat. Pakai masker dan jangan berlama-lama di bibir kawah, terutama kalau punya asma.</li>
<li>Ikuti batas aman yang dipasang pengelola dan jangan turun ke air kawah.</li>
<li>Turunan pulang panjang: pakai rem depan dan belakang bergantian, jangan ditahan terus.</li>
<li>Berangkat pagi. Kabut dan hujan sering turun setelah tengah hari.</li>
</ul>

<h2>Contoh biaya</h2>
<p>Honda PCX 1 hari (24 jam): <b>[[hitung:honda-pcx:garut:24]]</b>. Ada toleransi telat [[aturan:late_grace_minutes]]; lewat dari itu kena denda [[aturan:late_fee_percent_per_hour]]% dari harga harian per jam.</p>
<p>Suka kawah? Baca juga <a href="/panduan/rute-motor-kamojang-darajat">naik motor ke Kawah Kamojang dan Darajat</a>.</p>
[[cabang:GRT]]
'''),
dict(
    slug='candi-cangkuang-kampung-pulo-naik-motor', img=('photo-1578469550956-0e16b69c6a3d', 'Eugenia Clara', 'eugeniaclara', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-14',
    title='Ke Candi Cangkuang dan Kampung Pulo Naik Motor dari Garut Kota',
    desc='Panduan wisata Candi Cangkuang dan Kampung Pulo di Leles, Garut, naik motor sewaan: rute, menyeberang dengan rakit, adab di kampung adat, dan biaya sewa motor.',
    lead='Candi Cangkuang di Kecamatan Leles berdiri di pulau kecil di tengah Situ Cangkuang, bersebelahan dengan Kampung Pulo, kampung adat yang masih menjaga aturan turun-temurun. Dari Garut Kota cukup sewa Honda Beat ([[harga:honda-beat-cbs-new:garut]]).',
    body='''
<h2>Rute dari Garut Kota</h2>
<p>Leles ada di utara Garut Kota, searah jalan ke Bandung. Naik motor sekitar 30–40 menit di jalan utama yang ramai kendaraan besar, jadi jaga jarak dan hati-hati saat menyalip. Cek rute di [[rute:GRT:Candi Cangkuang Leles Garut]].</p>

<h2>Menyeberang ke candi</h2>
<p>Motor diparkir di tepi Situ Cangkuang, lalu menyeberang naik rakit bambu ke pulau. Di pulau ada candi Hindu yang dipugar kembali dan makam Embah Dalem Arief Muhammad, tokoh penyebar Islam di daerah ini.</p>

<h2>Adab di Kampung Pulo</h2>
<ul class="tips">
<li>Kampung Pulo punya aturan adat soal jumlah rumah dan kegiatan warga. Hormati papan larangan yang dipasang.</li>
<li>Minta izin dulu sebelum memotret rumah atau warga.</li>
<li>Pakai pakaian sopan dan jaga suara.</li>
</ul>

<h2>Contoh biaya</h2>
<div class="scroll"><table><thead><tr><th>Rencana</th><th class="n">Total</th></tr></thead><tbody>
<tr><td>Honda Beat, ½ hari (12 jam)</td><td class="n">[[hitung:honda-beat-cbs-new:garut:12]]</td></tr>
<tr><td>Honda Scoopy, 1 hari (24 jam)</td><td class="n">[[hitung:honda-scoopy-new:garut:24]]</td></tr>
</tbody></table></div>
<p>Satu arah dengan Bandung, jadi Cangkuang enak dijadikan perhentian pertama di <a href="/panduan/keliling-garut-satu-hari-naik-motor">rute keliling Garut satu hari</a>.</p>
[[kartu:motor:garut:3]]
[[cabang:GRT]]
'''),
dict(
    slug='kebun-teh-dayeuh-manggung-naik-motor', img=('photo-1724205765617-6143ce5c45e3', 'Walyudin', 'walyudin', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-14',
    title='Ke Kebun Teh Dayeuh Manggung Naik Motor: Jalan Sejuk dengan Pemandangan Cikuray',
    desc='Rute naik motor dari Garut Kota ke kebun teh Dayeuh Manggung di Cilawu: waktu terbaik, spot foto dengan latar Gunung Cikuray, dan tips berkendara di jalan perkebunan.',
    lead='Kebun teh Dayeuh Manggung di Kecamatan Cilawu menawarkan hamparan teh dengan latar Gunung Cikuray, tidak jauh dari Garut Kota. Jalan perkebunan cukup panjang dan menanjak, jadi motor matic yang bertenaga seperti Honda Scoopy ([[harga:honda-scoopy-new:garut]]) atau PCX lebih nyaman.',
    body='''
<h2>Rute dari Garut Kota</h2>
<p>Arahkan motor ke tenggara menuju Cilawu, lalu masuk ke jalan perkebunan. Sekitar 45 menit–1 jam dari pusat kota. Lihat rute terbaru di [[rute:GRT:Perkebunan Teh Dayeuh Manggung Cilawu Garut]].</p>

<h2>Waktu terbaik</h2>
<ul class="tips">
<li>Pagi hari sebelum jam 09.00: kabut tipis di antara kebun teh dan Cikuray masih terlihat jelas.</li>
<li>Musim hujan: jalan perkebunan bisa licin dan berlumpur, kurangi kecepatan di tikungan.</li>
</ul>

<h2>Tips berkendara di jalan perkebunan</h2>
<ul class="tips">
<li>Jalan perkebunan dipakai juga oleh truk pengangkut teh; beri jalan dan jangan parkir di tikungan.</li>
<li>Bawa jaket. Udara di ketinggian jauh lebih dingin daripada di Garut Kota.</li>
<li>Jangan masuk ke area kebun yang dipagari atau sedang dipetik tanpa izin.</li>
</ul>

<h2>Pilihan motor & biaya</h2>
[[pilih:garut:honda-scoopy-new,honda-pcx]]
<p>Contoh: Honda Scoopy 1 hari (24 jam) <b>[[hitung:honda-scoopy-new:garut:24]]</b>.</p>
<p>Lanjut lebih ke selatan? Baca <a href="/panduan/curug-orok-cikajang-naik-motor">ke Curug Orok Cikajang</a>.</p>
[[cabang:GRT]]
'''),
dict(
    slug='curug-orok-cikajang-naik-motor', img=('photo-1642869647500-3c4e858e0ce8', 'Ibnu Al Rasyid', 'arrashid8', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-14',
    title='Ke Curug Orok Cikajang Naik Motor dari Garut Kota: Rute Selatan yang Sejuk',
    desc='Panduan ke Curug Orok di Cikajang, Garut selatan, naik motor sewaan: rute lewat Bayongbong–Cikajang, motor yang cocok untuk tanjakan, dan tips musim hujan.',
    lead='Curug Orok di Kecamatan Cikajang adalah air terjun di kawasan dataran tinggi Garut selatan. Perjalanannya melewati jalur Bayongbong–Cikajang yang menanjak dan dingin, jadi Honda PCX ([[harga:honda-pcx:garut]]) adalah pilihan paling nyaman.',
    body='''
<h2>Rute dari Garut Kota</h2>
<p>Ambil jalan ke selatan lewat Bayongbong menuju Cikajang, lalu ikuti petunjuk arah ke Curug Orok. Perjalanan sekitar 1,5 jam. Cek rute terbaru di [[rute:GRT:Curug Orok Cikajang Garut]].</p>

<h2>Yang perlu disiapkan</h2>
<ul class="tips">
<li><b>Jaket dan jas hujan.</b> Cikajang termasuk daerah tertinggi di Garut dan sering berkabut. Jas hujan termasuk saat sewa motor di Rentalaja.</li>
<li><b>Alas kaki anti-licin.</b> Jalan setapak ke curug bisa basah dan berlumut.</li>
<li><b>Bensin penuh</b> sejak Bayongbong.</li>
</ul>

<h2>Tips musim hujan</h2>
<p>Debit air curug naik saat hujan. Jangan mendekat ke bawah air terjun kalau air keruh atau deras, dan pulang sebelum gelap karena jalur Cikajang minim penerangan.</p>

<h2>Contoh biaya</h2>
<div class="scroll"><table><thead><tr><th>Rencana</th><th class="n">Total</th></tr></thead><tbody>
<tr><td>Honda PCX, 1 hari (24 jam)</td><td class="n">[[hitung:honda-pcx:garut:24]]</td></tr>
<tr><td>Honda Beat, 1 hari (24 jam)</td><td class="n">[[hitung:honda-beat-cbs-new:garut:24]]</td></tr>
</tbody></table></div>
<p>Satu jalur dengan perjalanan ke Garut selatan; lihat juga <a href="/panduan/pantai-santolo-naik-motor-dari-garut">ke Pantai Santolo naik motor</a>.</p>
[[cabang:GRT]]
'''),
dict(
    slug='pantai-santolo-naik-motor-dari-garut', img=('photo-1654159148138-bf64a2278cf7', 'David Gor', 'davidgor', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-14',
    title='Ke Pantai Santolo Naik Motor dari Garut Kota: Rute 3–4 Jam dan Persiapannya',
    desc='Panduan touring ke Pantai Santolo di Garut selatan naik motor sewaan: rute lewat Cikajang–Pameungpeuk, berapa hari sewa, motor yang cocok, dan contoh biaya 2 hari.',
    lead='Pantai Santolo di Kecamatan Cikelet adalah tujuan favorit touring ke Garut selatan, sekitar 3–4 jam naik motor dari Garut Kota. Untuk perjalanan sejauh ini, sewa Honda PCX ([[harga:honda-pcx:garut]]) minimal 2 hari supaya tidak terburu-buru.',
    body='''
<h2>Rute dari Garut Kota</h2>
<p>Jalur umum: Garut Kota → Bayongbong → Cikajang → Cisompet → Pameungpeuk → Santolo. Jalur Cikajang–Cisompet berkelok dan naik-turun, dengan pemandangan perkebunan dan hutan. Cek rute terbaru di [[rute:GRT:Pantai Santolo Cikelet Garut]].</p>

<h2>Berapa hari sewa?</h2>
<p>Disarankan 2 hari 1 malam: hari pertama berangkat pagi dan menginap di sekitar Pameungpeuk, hari kedua pulang setelah menikmati pagi di pantai. Contoh total:</p>
<div class="scroll"><table><thead><tr><th>Rencana</th><th class="n">Total</th></tr></thead><tbody>
<tr><td>Honda PCX, 2 hari (48 jam)</td><td class="n">[[hitung:honda-pcx:garut:48]]</td></tr>
<tr><td>Honda Scoopy, 2 hari (48 jam)</td><td class="n">[[hitung:honda-scoopy-new:garut:48]]</td></tr>
</tbody></table></div>

<h2>Persiapan touring</h2>
<ul class="tips">
<li>Isi bensin penuh di Cikajang; SPBU di jalur Cisompet terbatas.</li>
<li>Istirahat tiap 1–1,5 jam, terutama di jalur berkelok.</li>
<li>Jas hujan dan helm sudah termasuk saat sewa. Bawa jaket karena Cikajang dingin.</li>
<li>Jangan berenang di area yang dilarang. Ombak pantai selatan kuat dan arusnya bisa menyeret.</li>
<li>Pastikan kembali ke cabang sesuai jadwal; perpanjang lewat aplikasi kalau rencana berubah.</li>
</ul>
<p>Area pemakaian motor: [[aturan:rental_region]]</p>
[[kartu:motor:garut:3]]
[[cabang:GRT]]
'''),
dict(
    slug='pendakian-gunung-guntur-naik-motor-ke-basecamp', img=('photo-1723143730168-99a2baa83a9a', 'Teuku Faza Rivaldi', 'teukufaza_28', 'Ilustrasi'), city='garut', cats=['motor', 'camping'], date='2026-11-14',
    title='Mendaki Gunung Guntur: Naik Motor ke Basecamp Citiis dan Sewa Alat Camping',
    desc='Panduan ke basecamp pendakian Gunung Guntur (Citiis, Tarogong Kaler) naik motor sewaan dari Garut Kota, sewa alat camping sekaligus, dan tips parkir motor saat mendaki.',
    lead='Gunung Guntur adalah gunung terdekat dari Garut Kota untuk mendaki atau berkemah. Basecamp Citiis di Tarogong Kaler bisa dicapai naik motor dalam waktu singkat, dan alat camping bisa disewa sekalian di Rentalaja Garut Kota.',
    body='''
<h2>Rute ke basecamp</h2>
<p>Basecamp pendakian ada di kawasan Citiis, Tarogong Kaler, ke arah Cipanas. Dari Garut Kota sekitar 30 menit naik motor. Cek rute di [[rute:GRT:Basecamp Citiis Gunung Guntur Garut]].</p>

<h2>Motor & alat camping dalam satu booking</h2>
<p>Sewa motor dan alat camping sekaligus supaya cukup satu kali ambil di cabang. Untuk pendakian 2 hari 1 malam:</p>
<div class="scroll"><table><thead><tr><th>Rencana</th><th class="n">Total motor</th></tr></thead><tbody>
<tr><td>Honda Beat, 2 hari (48 jam)</td><td class="n">[[hitung:honda-beat-cbs-new:garut:48]]</td></tr>
<tr><td>Honda PCX, 2 hari (48 jam)</td><td class="n">[[hitung:honda-pcx:garut:48]]</td></tr>
</tbody></table></div>
<p>Daftar alat yang perlu dibawa ada di <a href="/panduan/checklist-alat-camping-garut">checklist alat camping</a>, dan perkiraan biayanya di <a href="/panduan/biaya-camping-per-orang-garut">biaya camping per orang</a>.</p>

<h2>Tips parkir motor saat mendaki</h2>
<ul class="tips">
<li>Titipkan motor di parkiran basecamp yang dijaga, kunci stang, dan bawa kunci saat mendaki.</li>
<li>Jangan tinggalkan helm dan barang berharga di motor.</li>
<li>Catat jam kembali ke cabang. Pendakian sering molor; perpanjang sewa lewat aplikasi sebelum jam kembali.</li>
</ul>
[[kartu:camping:garut:4]]
[[cabang:GRT]]
'''),
dict(
    slug='keliling-garut-satu-hari-naik-motor', img=('photo-1778602940517-ff2fb6252ba9', 'Yurri Ann', 'yurriann', 'Ilustrasi'), city='garut', cats=['motor'], date='2026-11-14',
    title='Keliling Garut Satu Hari Naik Motor: Rute Cangkuang, Bagendit, dan Cipanas',
    desc='Contoh rute satu hari keliling Garut naik motor sewaan: Candi Cangkuang pagi, Situ Bagendit siang, berendam di Cipanas sore, plus jadwal, biaya, dan tips.',
    lead='Punya satu hari di Garut? Rute ini menggabungkan wisata sejarah, danau, dan air panas dalam satu putaran yang tidak terlalu jauh. Cukup sewa Honda Beat 1 hari ([[harga:honda-beat-cbs-new:garut]]) dari Rentalaja Garut Kota.',
    body='''
<h2>Rencana perjalanan</h2>
<div class="scroll"><table><thead><tr><th>Jam</th><th>Tujuan</th><th>Catatan</th></tr></thead><tbody>
<tr><td>07.30</td><td>Ambil motor di Rentalaja Garut Kota</td><td>Jl. Cimanuk; atau minta diantar ke hotel</td></tr>
<tr><td>08.15</td><td><a href="/panduan/candi-cangkuang-kampung-pulo-naik-motor">Candi Cangkuang & Kampung Pulo</a></td><td>Arah utara (Leles), naik rakit ke pulau</td></tr>
<tr><td>11.30</td><td>Makan siang di Garut Kota</td><td>Coba nasi liwet atau sate domba</td></tr>
<tr><td>13.30</td><td><a href="/panduan/wisata-situ-bagendit-naik-motor">Situ Bagendit</a></td><td>Naik perahu atau rakit</td></tr>
<tr><td>16.00</td><td><a href="/panduan/wisata-cipanas-garut-naik-motor">Cipanas</a></td><td>Berendam air panas</td></tr>
<tr><td>19.00</td><td>Beli dodol & oleh-oleh</td><td>Lalu kembalikan motor</td></tr>
</tbody></table></div>

<h2>Biaya sewa motor</h2>
<div class="scroll"><table><thead><tr><th>Motor</th><th class="n">1 hari (24 jam)</th></tr></thead><tbody>
<tr><td>Honda Beat</td><td class="n">[[hitung:honda-beat-cbs-new:garut:24]]</td></tr>
<tr><td>Honda Scoopy</td><td class="n">[[hitung:honda-scoopy-new:garut:24]]</td></tr>
<tr><td>Honda PCX</td><td class="n">[[hitung:honda-pcx:garut:24]]</td></tr>
</tbody></table></div>
<p>Berdua atau bertiga? Lihat <a href="/panduan/pilih-motor-beat-scoopy-pcx-garut">perbedaan Beat, Scoopy, dan PCX</a>.</p>

<h2>Tips</h2>
<ul class="tips">
<li>Mulai pagi supaya tidak terkena hujan sore yang sering turun di Garut.</li>
<li>Motor bisa diantar ke hotel atau Stasiun Garut dengan ongkir sesuai jarak:</li>
</ul>
[[ongkir:GRT]]
<p>Mau dua hari? Baca <a href="/panduan/liburan-2-hari-garut">rencana liburan 2 hari 1 malam di Garut</a>.</p>
[[cabang:GRT]]
'''),
dict(
    slug='lembang-naik-motor-dari-bandung', img=('photo-1624033441874-82f56d494d83', 'Afif Ramdhasuma', 'javaistan', 'Lembang, Bandung Barat'), city='bandung', cats=['motor'], date='2026-11-14',
    title='Ke Lembang Naik Motor dari Bandung: Rute Setiabudi, Tangkuban Perahu, dan Tips Macet',
    desc='Panduan wisata Lembang naik motor sewaan dari Rentalaja Bandung (Coblong): rute lewat Setiabudi, tujuan populer, cara menghindari macet akhir pekan, dan contoh biaya.',
    lead='Lembang di utara Bandung paling enak dijelajahi naik motor karena jalurnya sering macet di akhir pekan. Dari Rentalaja Bandung di Kubang Selatan, Coblong, pilih Honda Beat ([[harga:honda-beat-cbs-new:bandung]]) untuk santai atau Honda PCX ([[harga:honda-pcx:bandung]]) kalau mau sampai Tangkuban Perahu.',
    body='''
<h2>Rute dari Coblong</h2>
<p>Jalur paling umum lewat Jl. Setiabudi naik ke Lembang, sekitar 45 menit–1 jam tergantung macet. Tangkuban Perahu masih sekitar 30 menit lagi ke utara. Cek rute terbaru di [[rute:BDG-HUB:Lembang Bandung Barat]].</p>

<h2>Tujuan populer</h2>
<ul class="tips">
<li><b>Tangkuban Perahu:</b> kawah di ketinggian; jalan naik panjang, motor bertenaga lebih nyaman.</li>
<li><b>Kawasan wisata keluarga dan kafe</b> di sepanjang Jl. Raya Lembang.</li>
<li><b>Kebun dan perbukitan</b> di sekitar Cikole dan Cibodas, Lembang.</li>
</ul>

<h2>Tips menghindari macet</h2>
<ul class="tips">
<li>Berangkat sebelum jam 08.00 di akhir pekan, atau pilih hari kerja.</li>
<li>Pulang sebelum jam 16.00; antrean turun dari Lembang biasanya padat menjelang sore.</li>
<li>Turunan Setiabudi panjang. Gunakan rem bergantian dan jaga jarak.</li>
<li>Ambil motor Senin–Kamis untuk hemat; promo hari kerja Bandung dihitung otomatis saat booking.</li>
</ul>

<h2>Contoh biaya</h2>
<div class="scroll"><table><thead><tr><th>Rencana</th><th class="n">Total</th></tr></thead><tbody>
<tr><td>Honda Beat, ½ hari (12 jam)</td><td class="n">[[hitung:honda-beat-cbs-new:bandung:12]]</td></tr>
<tr><td>Honda PCX, 1 hari (24 jam)</td><td class="n">[[hitung:honda-pcx:bandung:24]]</td></tr>
</tbody></table></div>
<p>Datang ke Bandung naik kereta atau travel? Baca <a href="/panduan/sewa-motor-stasiun-bandung-pool-travel">sewa motor dari stasiun dan pool travel</a>.</p>
[[kartu:motor:bandung:2]]
[[cabang:BDG-HUB]]
'''),
dict(
    slug='ciwidey-kawah-putih-naik-motor-dari-bandung', img=('photo-1717071769901-15fa9b203717', 'Zainal Permadi', 'key_pier', 'Ilustrasi'), city='bandung', cats=['motor'], date='2026-11-14',
    title='Ke Ciwidey dan Kawah Putih Naik Motor dari Bandung: Rute, Waktu, dan Biaya',
    desc='Panduan touring ke Ciwidey (Kawah Putih, Situ Patenggang, kebun teh Rancabali) naik motor sewaan dari Rentalaja Bandung: rute lewat Soreang, persiapan, dan contoh biaya.',
    lead='Ciwidey di Bandung selatan menggabungkan kawah, danau, dan kebun teh dalam satu jalur. Perjalanan sekitar 1,5–2 jam dari Coblong dengan tanjakan panjang, jadi Honda PCX ([[harga:honda-pcx:bandung]]) adalah pilihan paling nyaman.',
    body='''
<h2>Rute dari Coblong</h2>
<p>Jalur umum lewat Kopo atau tol menuju Soreang (motor lewat jalan arteri), lalu naik ke Ciwidey dan Rancabali. Berangkat pagi supaya tidak kena macet di Soreang. Cek rute di [[rute:BDG-HUB:Kawah Putih Ciwidey Bandung]].</p>

<h2>Tujuan sepanjang jalur</h2>
<ul class="tips">
<li><b>Kawah Putih:</b> danau kawah berwarna putih kehijauan. Ikuti aturan pengelola soal kendaraan pribadi ke area atas dan batas waktu di dekat kawah.</li>
<li><b>Situ Patenggang:</b> danau di tengah kebun teh, bisa naik perahu.</li>
<li><b>Kebun teh Rancabali:</b> jalur berkelok dengan pemandangan teh di kanan-kiri.</li>
</ul>

<h2>Persiapan</h2>
<ul class="tips">
<li>Udara Ciwidey dingin, apalagi sore. Bawa jaket dan sarung tangan.</li>
<li>Isi bensin penuh sebelum Ciwidey.</li>
<li>Hujan sering turun siang hingga sore; jas hujan sudah termasuk saat sewa.</li>
<li>Pakai masker di area kawah karena bau belerang.</li>
</ul>

<h2>Contoh biaya</h2>
<div class="scroll"><table><thead><tr><th>Rencana</th><th class="n">Total</th></tr></thead><tbody>
<tr><td>Honda PCX, 1 hari (24 jam)</td><td class="n">[[hitung:honda-pcx:bandung:24]]</td></tr>
<tr><td>Honda PCX, 2 hari (48 jam)</td><td class="n">[[hitung:honda-pcx:bandung:48]]</td></tr>
<tr><td>Honda Beat, 1 hari (24 jam)</td><td class="n">[[hitung:honda-beat-cbs-new:bandung:24]]</td></tr>
</tbody></table></div>
<p>Area pemakaian motor: [[aturan:rental_region]] Lihat juga <a href="/panduan/lembang-naik-motor-dari-bandung">ke Lembang naik motor</a>.</p>
[[kartu:motor:bandung:2]]
[[cabang:BDG-HUB]]
'''),
]
