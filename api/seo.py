"""Halaman SEO Rentalaja yang selalu terbaru dari database.

Melayani /sewa/... dan /sitemap.xml (lewat rewrite di vercel.json):
  /sewa/                     indeks
  /sewa/garut.html           halaman kota
  /sewa/motor-garut.html     kategori x kota
  /sewa/honda-pcx-garut.html produk x kota
  /sewa/<kebutuhan>.html     halaman kebutuhan (lihat NEEDS)
  /panduan/<slug>            artikel panduan (api/_panduan.py), harga diisi dari database
  /sitemap.xml
Data: RPC public.seo_catalog() (anon). Respons di-cache CDN Vercel 6 jam, stale 1 hari,
jadi harga & stok di Google ikut berubah tanpa build ulang.
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
import urllib.request, json, html, re, datetime, collections, time, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _panduan import ARTICLES

SB = 'https://shrvzlltysnbmgpkhjjg.supabase.co'
ANON = ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNocnZ6bGx0eXNuYm1ncGtoampnIiwicm9sZSI6ImFub24iLCJp'
        'YXQiOjE3OTI4NzAzNTYsImV4cCI6MjEwODQ0NjM1Nn0.V0EDK0y3ZFIuNW5uGJjDcHZlEVxAURVC6OJVPaUYUFY')
BASE = 'https://rentalaja.co.id'
IMG = SB + '/storage/v1/object/public/publik/'
WA = '6281324700077'

CITY = {'garut': 'Garut', 'bandung': 'Bandung'}
BR_CITY = {'GRT': 'garut', 'WNR': 'garut', 'BDG-HUB': 'bandung', 'BDG-JKL': 'bandung'}
BR_NAME = {'GRT': 'Rentalaja Garut Kota', 'WNR': 'Rentalaja Wanaraja', 'BDG-HUB': 'Rentalaja Bandung (Kubang Selatan)', 'BDG-JKL': 'Rentalaja Bandung (Dipati Ukur)'}
CAT = {  # slug: (label pendek, judul, kalimat pembuka, cocok untuk)
    'motor': ('Motor', 'Sewa Motor', 'Motor matic terawat untuk keliling kota, ke kampus, atau wisata. Helm dan jas hujan siap.', 'keliling kota, wisata, dan kebutuhan harian'),
    'mobil': ('Mobil', 'Sewa Mobil Lepas Kunci', 'Mobil lepas kunci untuk mudik, liburan keluarga, atau urusan kantor.', 'liburan keluarga, mudik, dan perjalanan kantor'),
    'iphone': ('iPhone', 'Sewa iPhone', 'iPhone untuk konten, acara, atau sekadar mencoba sebelum beli.', 'bikin konten, wisuda, acara, dan coba sebelum beli'),
    'kamera': ('Kamera', 'Sewa Kamera', 'Kamera mirrorless dan DSLR untuk foto, video, wisuda, dan prewedding.', 'foto liburan, wisuda, prewedding, dan video'),
    'lensa': ('Lensa', 'Sewa Lensa Kamera', 'Lensa fix dan zoom untuk Sony, Fujifilm, dan Canon.', 'potret, landscape, dan video'),
    'proyektor': ('Proyektor', 'Sewa Proyektor', 'Proyektor dan layar untuk nobar, presentasi, dan acara.', 'nobar, presentasi, dan acara'),
    'game': ('PlayStation', 'Sewa PlayStation', 'PlayStation untuk main di rumah, kos, atau acara.', 'main bareng di rumah, kos, atau acara'),
    'camping': ('Camping', 'Sewa Alat Camping', 'Perlengkapan camping dan hiking untuk Papandayan, Guntur, dan Cikuray.', 'camping dan pendakian'),
}
ORDER = ['motor', 'iphone', 'kamera', 'lensa', 'proyektor', 'game', 'camping', 'mobil']

# Halaman berdasarkan kebutuhan. Isi hanya fakta operasional Rentalaja; harga & barang diambil dari database.
NEEDS = [
    dict(slug='motor-papandayan-garut', city='garut', cats=['motor'], prefer='pcx',
         title='Sewa Motor ke Papandayan dari Garut', h1='Sewa motor untuk ke Papandayan',
         lead='Mau ke Gunung Papandayan naik motor? Ambil motor di Rentalaja Garut, berangkat pagi, pulang sore. Untuk jalur tanjakan menuju Papandayan kami sarankan Honda PCX.',
         tips=['Untuk jalur tanjakan Papandayan, pilih <b>Honda PCX</b>. Beat masih bisa untuk dalam kota, tapi kurang kuat dan lebih berisiko di tanjakan.',
               'Isi bensin penuh sebelum naik dan berangkat pagi supaya tidak kemalaman di jalur turun.',
                              'Butuh perlengkapan camping juga? Bisa disewa sekalian di cabang yang sama.'],
         also=['alat-camping-gunung-garut']),
    dict(slug='motor-antar-hotel-garut', city='garut', cats=['motor'],
         title='Sewa Motor Diantar ke Hotel di Garut', h1='Sewa motor, diantar ke hotel atau villa di Garut',
         lead='Menginap di Garut dan butuh motor untuk keliling? Booking dari HP, motor diantar ke hotel atau villa Anda. Helm dan jas hujan sudah termasuk.',
         tips=['Pilih "Diantar" saat booking dan isi alamat hotel/villa. Ongkir dihitung dari jarak dan dikonfirmasi cabang.',
               'Mau motor dijemput lagi saat selesai? Tanyakan ke admin lewat WhatsApp.',
               'Syarat: KTP, SIM C, dan KK diunggah sekali di aplikasi, diverifikasi sebelum bayar.',
               'Rombongan? Sewa 2 motor atau lebih bisa lebih hemat (lihat promo saat booking).'],
         also=['motor-papandayan-garut']),
    dict(slug='alat-camping-gunung-garut', city='garut', cats=['camping'],
         title='Sewa Alat Camping Papandayan, Guntur & Cikuray di Garut', h1='Sewa alat camping untuk Papandayan, Guntur, dan Cikuray',
         lead='Mau naik gunung di Garut tanpa beli perlengkapan? Sewa per item mulai harian, ambil di Rentalaja Garut Kota sebelum berangkat.',
         tips=['Cek daftar dasar: carrier, sleeping bag, matras, headlamp, kompor portable + gas, dan jaket hangat.',
               'Booking dari jauh hari saat akhir pekan dan libur panjang karena stok cepat habis.',
               'Kembalikan dalam keadaan kering dan bersih.',
               'Butuh motor ke basecamp? Sewa sekalian di cabang yang sama.'],
         also=['motor-papandayan-garut']),
    dict(slug='iphone-wisuda-konten-bandung', city='bandung', cats=['iphone'],
         title='Sewa iPhone untuk Wisuda & Konten di Bandung', h1='Sewa iPhone untuk wisuda, acara, dan konten di Bandung',
         lead='Kamera iPhone untuk momen wisuda, acara kampus, atau bikin konten. Ada tarif ½ hari, ambil di Rentalaja Bandung, Kecamatan Coblong.',
         tips=['Untuk acara singkat seperti wisuda, pakai tarif ½ hari supaya lebih hemat.',
               'Charger dan tas sudah termasuk.',
               'Pindahkan foto & video ke HP atau cloud Anda sebelum mengembalikan unit.',
               'Syarat: KTP dan KK diunggah sekali di aplikasi.'],
         also=['motor-mahasiswa-bandung']),
    dict(slug='motor-mahasiswa-bandung', city='bandung', cats=['motor'],
         title='Sewa Motor Harian di Bandung Dekat Kampus Dipatiukur', h1='Sewa motor harian di Bandung, dekat kampus Dipatiukur',
         lead='Motor matic harian untuk kuliah, kerja, atau keliling Bandung. Ambil di Rentalaja Bandung, Kecamatan Coblong, dekat kawasan kampus Dipatiukur.',
         tips=['Ada tarif ½ hari untuk keperluan singkat.',
               'Syarat: KTP, SIM C, dan KK diunggah sekali di aplikasi.',
               'Ambil Senin–Kamis bisa lebih hemat di cabang Bandung (lihat promo saat booking).',
               'Perpanjang lewat aplikasi sebelum jam kembali supaya tidak kena denda telat.'],
         also=['iphone-wisuda-konten-bandung']),
    dict(slug='kamera-wisuda-prewedding-garut', city='garut', cats=['kamera', 'lensa'],
         title='Sewa Kamera untuk Wisuda & Prewedding di Garut', h1='Sewa kamera dan lensa untuk wisuda, prewedding, dan liburan di Garut',
         lead='Mirrorless Sony dan Fujifilm, DSLR Canon, plus lensa fix untuk potret yang tajam. Ada tarif 2 jam dan ½ hari untuk sesi singkat.',
         tips=['Untuk potret wisuda atau prewedding, pasangkan kamera dengan lensa fix (misalnya 35mm atau 50mm).',
               'Sesi foto singkat? Pakai tarif 2 jam atau ½ hari.',
               'Butuh baterai cadangan untuk Canon? Bisa disewa terpisah.',
               'Syarat: KTP dan KK diunggah sekali di aplikasi.'],
         also=[]),
    dict(slug='proyektor-nobar-acara', city=None, cats=['proyektor'],
         title='Sewa Proyektor untuk Nobar & Acara di Garut dan Bandung', h1='Sewa proyektor dan layar untuk nobar, presentasi, dan acara',
         lead='Proyektor plus layar untuk nonton bareng, presentasi, atau acara keluarga. Tersedia di Garut dan Bandung, ada tarif 2 jam dan ½ hari.',
         tips=['Sewa layar proyektor sekalian supaya gambar lebih jelas.',
               'Pastikan ada kabel HDMI yang cocok dengan laptop Anda.',
               'Untuk acara malam, ambil sore dan kembalikan besok pagi dengan tarif harian.',
               'Syarat: KTP dan KK diunggah sekali di aplikasi.'],
         also=[]),
]

def faq(D):
    promos = [x for x in D.get('promos') or [] if x.get('desc') or x.get('name')]
    pr = ' '.join((x.get('desc') or x['name']).rstrip('.') + '.' for x in promos) or 'Promo yang sedang berlaku otomatis terpasang saat booking.'
    late = D.get('late_pct')
    return [
        ('Apa syarat sewa di Rentalaja?', 'Unggah foto KTP dan KK sekali saja di aplikasi; dokumen pendukung lain (SIM, NPWP, STNK) opsional. Untuk motor dan mobil wajib KTP, SIM, dan KK. Setelah lolos verifikasi, booking bisa dibayar.'),
        ('Berapa DP yang harus dibayar?', 'DP 20% dari total sewa setelah dokumen lolos verifikasi. Sisanya dibayar saat ambil barang di cabang.'),
        ('Bisa sewa 2 jam atau setengah hari?', 'Bisa untuk barang yang punya tarifnya. Kamera, lensa, dan proyektor ada tarif 2 jam; iPhone, motor, PlayStation, dan sebagian kamera ada tarif ½ hari. Tarifnya tertera di tiap barang.'),
        ('Ada promo?', pr + ' Potongan dihitung otomatis saat booking.'),
        ('Bagaimana kalau telat mengembalikan?', (f'Ada denda {late}% dari harga harian per jam keterlambatan.' if late else 'Ada denda per jam keterlambatan.') + ' Perpanjang lewat aplikasi atau kabari cabang lewat WhatsApp sebelum jam kembali.'),
        ('Bisa diantar?', 'Bisa, dengan ongkir sesuai jarak. Pilih "Diantar" saat booking, ongkir dikonfirmasi cabang.'),
    ]

CSS = """:root{--navy:#1F2B4D;--teal:#09BEAF;--teal-d:#077A70;--ink:#1F2B4D;--mute:#4A5468;--line:#E6E8EC;--bg:#F6F7F9}
*{box-sizing:border-box}body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.55}
a{color:var(--teal-d)}header.top{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}header.top .w{display:flex;align-items:center;gap:20px;height:64px}
.brand img{display:block;height:34px;width:auto}.nav{display:flex;gap:4px;flex:1}.nav a{color:var(--ink);text-decoration:none;font-weight:700;font-size:15px;padding:8px 12px;border-radius:10px}.nav a:hover{background:var(--bg)}
.hact{display:flex;gap:8px;align-items:center}.hwa{display:flex;align-items:center;gap:6px;color:#1E7A44;text-decoration:none;font-weight:800;font-size:14px;border:1.5px solid #CDEBD8;border-radius:12px;padding:8px 12px}
.hbk{background:var(--navy);color:#fff;text-decoration:none;font-weight:800;font-size:14px;border-radius:12px;padding:10px 16px}
.trust{background:var(--navy);color:#CFE9E6;font-size:12.5px;font-weight:600;text-align:center}.trust .w{padding:7px 16px}.w{max-width:960px;margin:0 auto;padding:0 16px}
.hero{background:linear-gradient(180deg,#F1FBFA,#fff);padding:28px 0 8px}h1{font-size:28px;line-height:1.25;margin:0 0 10px;font-weight:800}
.crumb{margin:0 0 6px;font-size:13px;font-weight:700;color:var(--teal-d)}.crumb a{text-decoration:none}
.lead{color:var(--mute);font-size:16px;margin:0 0 16px;max-width:680px}.cta{display:inline-block;background:var(--teal);color:var(--navy);font-weight:800;text-decoration:none;padding:12px 18px;border-radius:12px}
.cta.alt{background:#fff;border:1px solid var(--line);color:var(--navy);margin-left:8px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}.chips li{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;font-weight:600}
h2{font-size:20px;margin:28px 0 10px;font-weight:800}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}
.card{border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;background:#fff}
.card .ph{aspect-ratio:1/1;background:var(--bg);display:flex;align-items:center;justify-content:center;color:#8A93A6;font-size:12px}
.card img{width:100%;height:100%;object-fit:contain}.card .b{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}
.card h3{font-size:15px;margin:0;font-weight:800}.card h3 a{color:var(--ink);text-decoration:none}.price{font-size:13px;color:var(--mute)}.price b{color:var(--ink);font-size:15px}
.card a.go{margin-top:auto;text-align:center;background:var(--navy);color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:9px;font-size:14px}
.prod{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:24px;align-items:start}.prod .ph{background:var(--bg);border-radius:18px;aspect-ratio:1/1;display:flex;align-items:center;justify-content:center}
.prod .ph img{width:86%;height:86%;object-fit:contain}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}th{color:var(--mute);font-weight:700}
td.n,th.n{text-align:right;white-space:nowrap}.scroll{overflow-x:auto}
ul.tips{padding-left:20px}ul.tips li{margin:6px 0}ol.steps{padding-left:20px}ol.steps li{margin:6px 0}
.branch{border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:0 0 10px}.branch b{display:block}
details{border-bottom:1px solid var(--line);padding:10px 0}summary{font-weight:700;cursor:pointer}
footer.ft{margin-top:64px;background:var(--navy);color:#C9D2E3;font-size:14px;padding:0 0 20px}footer.ft a{color:#fff;text-decoration:none}
.fcta{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;background:var(--teal);color:var(--navy);border-radius:20px;padding:20px 22px;transform:translateY(-30px);box-shadow:0 12px 30px rgba(31,43,77,.18)}
.fcta b{display:block;font-size:20px;font-weight:800}.fcta span{font-weight:600}.fbtn{display:flex;gap:8px;flex-wrap:wrap}.fcta .cta{background:var(--navy);color:#fff}.fcta .cta.wa{background:#fff;color:#1E7A44;border:0;margin:0}
.fgrid{display:grid;grid-template-columns:1.3fr 1fr 1.2fr 1.2fr;gap:28px;padding:0 0 18px}.fcol h3{color:#fff;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:0 0 10px}.fcol ul+h3{margin-top:18px}
.fcol ul{list-style:none;padding:0;margin:0}.fcol li{margin:0 0 7px}.fcol li a{color:#C9D2E3}.fcol li a:hover{color:#fff}
.fbrand img{background:#fff;border-radius:10px;padding:6px 10px;height:46px;width:auto}.fbrand p{margin:12px 0}.fmeta{color:#fff;font-weight:600}.flink{display:inline-block;margin-top:6px;font-weight:700;color:var(--teal)!important}
.fbr{margin:0 0 12px}.fbr b{display:block;color:#fff}.fbr span{display:block;font-size:13px}.fbr a{font-size:13px;font-weight:700;color:var(--teal)!important}
.fmore{border:0;border-top:1px solid rgba(255,255,255,.12);padding:12px 0}.fmore summary{color:#fff}.fmore ul{columns:2;padding-left:18px}.fmore li{margin:4px 0}.fmore a{color:#C9D2E3!important}
.fbot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.12);padding-top:14px;font-size:13px}.fbot a{margin-left:14px;color:#C9D2E3!important}
.links{columns:2;padding-left:18px}@media(max-width:900px){.fgrid{grid-template-columns:1fr 1fr}}@media(max-width:640px){.nav{display:none}.hwa span{display:none}header.top .w{justify-content:space-between;gap:10px}.fgrid{grid-template-columns:1fr}.fmore ul{columns:1}.fbot a{margin:0 14px 0 0}.trust{font-size:11.5px}.tx{display:none}h1{font-size:23px}.links{columns:1}.cta.alt{margin:8px 0 0}.prod{grid-template-columns:1fr}}"""


def esc(s): return html.escape(str(s or ''), quote=True)
def rp(v): return 'Rp' + f'{int(v):,}'.replace(',', '.') if v else '—'
def img_url(ph):
    if not ph: return None
    return BASE + ph if ph.startswith('/') else IMG + ph.lstrip('/')
def slugify(s): return re.sub(r'[^a-z0-9]+', '-', str(s).lower()).strip('-')


# ---------------- data ----------------
_cache = {'at': 0, 'data': None}
def load():
    if _cache['data'] and time.time() - _cache['at'] < 300: return _cache['data']
    req = urllib.request.Request(SB + '/rest/v1/rpc/seo_catalog', data=b'{}', method='POST',
                                 headers={'apikey': ANON, 'Authorization': 'Bearer ' + ANON, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=12) as r: raw = json.loads(r.read().decode())
    br = {b['code']: b for b in raw.get('branches') or []}
    # produk per kota: gabung cabang dalam kota, harga terendah, catat cabang
    prod = collections.OrderedDict()
    for it in raw.get('items') or []:
        c = BR_CITY.get(it['br'])
        if not c or it['cat'] not in CAT: continue
        key = (it['id'], c)
        p = prod.get(key)
        if not p:
            p = prod[key] = dict(it, city=c, branches=[], prices={}, d=None, h=None, j=None)
        p['branches'].append(it['br'])
        p['prices'][it['br']] = (it.get('j'), it.get('h'), it.get('d'))
        for k in ('d', 'h', 'j'):
            if it.get(k) and (not p.get(k) or it[k] < p[k]): p[k] = it[k]
    for p in prod.values():
        s = slugify(p.get('slug') or p['name'])
        if s in CAT or s in ('garut', 'bandung'): s = 'sewa-' + s
        p['pslug'] = f"{s}-{p['city']}"
    pages = collections.OrderedDict()
    for c in CITY:
        for cat in ORDER:
            items = [p for p in prod.values() if p['city'] == c and p['cat'] == cat]
            if items: pages[(c, cat)] = sorted(items, key=lambda x: (x['d'] or 0, x['name']))
    data = dict(br=br, prod=prod, pages=pages, at=raw.get('at'), promos=raw.get('promos'), late_pct=raw.get('late_pct'),
                zones=raw.get('zones') or [], rules=raw.get('rules') or {})
    _cache.update(at=time.time(), data=data)
    return data


# ---------------- potongan HTML ----------------
def head(title, desc, path, lds, image=None):
    url = BASE + path
    return f"""<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}"><link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{esc(image or BASE + '/logo.png')}"><meta property="og:locale" content="id_ID"><meta property="og:site_name" content="Rentalaja">
<meta name="theme-color" content="#1F2B4D"><link rel="icon" href="/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>{CSS}</style>
<script src="/ga.js" defer></script>
{''.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>' for x in lds)}
</head><body>
<div class="trust"><div class="w">Booking online 24 jam · DP 20%<span class="tx"> · Garut &amp; Bandung</span> · Buka 07.30–21.00</div></div>
<header class="top"><div class="w"><a href="/sewa/" class="brand"><img src="/logo.png" alt="Rentalaja" width="120" height="34"></a>
<nav class="nav"><a href="/sewa/garut.html">Garut</a><a href="/sewa/bandung.html">Bandung</a><a href="/panduan/">Panduan</a></nav>
<div class="hact"><a class="hwa" href="https://wa.me/{WA}?text=Halo%20Rentalaja" rel="nofollow" aria-label="WhatsApp"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg><span>WhatsApp</span></a><a class="hbk" href="/#/Home">Booking</a></div></div></header>"""


def foot(D):
    def lst(items): return '<ul>' + ''.join(f'<li><a href="{u}">{esc(t)}</a></li>' for u, t in items) + '</ul>'
    garut = [(f'/sewa/{cat}-{c}.html', CAT[cat][1].replace('Sewa ', '')) for (c, cat) in D['pages'] if c == 'garut']
    bdg = [(f'/sewa/{cat}-{c}.html', CAT[cat][1].replace('Sewa ', '')) for (c, cat) in D['pages'] if c == 'bandung']
    guides = [(f'/sewa/{n["slug"]}.html', n['title']) for n in NEEDS] + [(f'/panduan/{a["slug"]}', a['title']) for a in ARTICLES]
    br = ''
    for code in BR_CITY:
        b = D['br'].get(code)
        if not b: continue
        br += (f'<div class="fbr"><b>{esc(BR_NAME.get(code))}</b><span>{esc(b.get("address"))}</span>'
               + (f'<a href="{esc(b.get("maps"))}" rel="nofollow">Lihat peta →</a>' if b.get('maps') else '') + '</div>')
    year = datetime.date.today().year
    return (f'<footer class="ft"><div class="w">'
            f'<div class="fcta"><div><b>Butuh barangnya hari ini?</b><span>Cek stok, pilih jam, bayar DP 20% — langsung dari HP.</span></div>'
            f'<div class="fbtn"><a class="cta" href="/#/Home">Booking sekarang</a><a class="cta wa" href="https://wa.me/{WA}?text=Halo%20Rentalaja" rel="nofollow">Chat admin</a></div></div>'
            f'<div class="fgrid">'
            f'<div class="fcol fbrand"><img src="/logo.png" alt="Rentalaja" width="120" height="34"><p>Nggak semua harus dibeli. Sewa motor, mobil, iPhone, kamera, proyektor, PlayStation, dan alat camping di Garut dan Bandung.</p>'
            f'<p class="fmeta">Buka setiap hari 07.30–21.00<br>WhatsApp <a href="https://wa.me/{WA}" rel="nofollow">0813-2470-0077</a></p><a class="flink" href="/link">Instagram, TikTok &amp; semua link →</a></div>'
            f'<div class="fcol"><h3>Sewa di Garut</h3>{lst(garut)}<h3>Sewa di Bandung</h3>{lst(bdg)}</div>'
            f'<div class="fcol"><h3>Cabang</h3>{br}</div>'
            f'<div class="fcol"><h3>Panduan</h3>{lst(guides[:8])}<a class="flink" href="/panduan/">Semua panduan →</a></div>'
            f'</div>'
            f'<details class="fmore"><summary>Panduan lainnya</summary>{lst(guides[8:])}</details>'
            f'<div class="fbot"><span>© {year} Rentalaja · PT Popo Karya Investama</span><span><a href="/#/Bantuan">Bantuan</a><a href="/#/Bantuan?tab=syarat">Syarat</a><a href="/#/Bantuan?tab=privasi">Privasi</a></span></div>'
            f'</div></footer></body></html>')


def local_business(D, code):
    b = D['br'].get(code) or {}
    addr = b.get('address') or ''
    m = re.search(r'(\d{5})\s*$', addr)
    return {"@type": "LocalBusiness", "@id": BASE + '/#' + code, "name": BR_NAME.get(code, 'Rentalaja'), "url": f"{BASE}/sewa/{BR_CITY[code]}.html",
            "telephone": '+' + (b.get('phone') or WA), "image": BASE + '/logo.png', "address": {"@type": "PostalAddress", "streetAddress": addr.split(',')[0], "addressLocality": CITY[BR_CITY[code]], "postalCode": m.group(1) if m else None,
                        "addressRegion": "Jawa Barat", "addressCountry": "ID"},
            "geo": {"@type": "GeoCoordinates", "latitude": b.get('lat'), "longitude": b.get('lng')}, "hasMap": b.get('maps'),
            "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                                           "opens": b.get('open') or '07:30', "closes": b.get('close') or '21:00'}]}


def branch_box(D, codes):
    out = []
    for code in codes:
        b = D['br'].get(code) or {}
        wa = f'https://wa.me/{b.get("phone") or WA}?text=' + quote('Halo Rentalaja, saya mau tanya sewa')
        out.append(f'<div class="branch"><b>{esc(BR_NAME.get(code))}</b>{esc(b.get("address"))}<br>Buka setiap hari {esc((b.get("open") or "07:30").replace(":", "."))}–{esc((b.get("close") or "21:00").replace(":", "."))} · '
                   f'<a href="{wa}" rel="nofollow">WhatsApp</a>' + (f' · <a href="{esc(b.get("maps"))}" rel="nofollow">Peta</a>' if b.get('maps') else '') + '</div>')
    return ''.join(out)


def faq_html(D): return ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faq(D))
def faq_ld(D): return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq(D)]}
def crumbs_ld(items): return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (n, u) in enumerate(items)]}




def offer_ld(p):
    u = img_url(p.get('ph'))
    return {"@type": "Product", "name": f'Sewa {p["name"]} {CITY[p["city"]]}', "image": u, "url": f'{BASE}/sewa/{p["pslug"]}.html', "brand": {"@type": "Brand", "name": "Rentalaja"},
            "offers": {"@type": "Offer", "price": p['d'], "priceCurrency": "IDR", "availability": "https://schema.org/InStock", "url": f'{BASE}/sewa/{p["pslug"]}.html',
                       "seller": {"@type": "Organization", "name": "Rentalaja"}}}


def docs_line(cat):
    return 'KTP, SIM, dan KK' if cat in ('motor', 'mobil') else 'KTP dan KK'


# ---------------- halaman ----------------


def page_product(D, p):
    c, cat = p['city'], p['cat']
    label, title_base, _, good = CAT[cat]
    path = f'/sewa/{p["pslug"]}.html'
    title = f'Sewa {p["name"]} {CITY[c]} {rp(p["d"])}/Hari | Rentalaja'
    tarif = [f'{rp(p["d"])} per hari']
    if p.get('h'): tarif.append(f'{rp(p["h"])} per ½ hari')
    if p.get('j'): tarif.append(f'{rp(p["j"])} per 2 jam')
    desc = f'Sewa {p["name"]} di {CITY[c]}: ' + ', '.join(tarif) + '. Booking online, DP 20%, ambil di cabang Rentalaja.'
    u = img_url(p.get('ph'))
    codes = p['branches']
    hj = any(v[0] for v in p['prices'].values()); hh = any(v[1] for v in p['prices'].values())
    rows = ''.join(f'<tr><td>{esc(BR_NAME.get(k))}</td>' + (f'<td class="n">{rp(v[0])}</td>' if hj else '') + (f'<td class="n">{rp(v[1])}</td>' if hh else '') + f'<td class="n">{rp(v[2])}</td></tr>' for k, v in p['prices'].items())
    extra = []
    if p.get('short'): extra.append(esc(p['short'].rstrip('.') + '.'))
    d = (p.get('desc') or '').strip()
    if d and len(d) > 25: extra.append(esc(d))
    incl = (p.get('incl') or '').strip()
    rc = p.get('rc') or 0
    related = [x for x in D['pages'].get((c, cat), []) if x['id'] != p['id']][:12]
    needs = [n for n in NEEDS if (n['city'] in (c, None)) and cat in n['cats']]
    lds = [{"@context": "https://schema.org", **offer_ld(p)}, crumbs_ld([('Rentalaja', '/sewa/'), (CITY[c], f'/sewa/{c}.html'), (label, f'/sewa/{cat}-{c}.html'), (p['name'], path)]),
           {"@context": "https://schema.org", "@graph": [local_business(D, k) for k in codes]}, faq_ld(D)]
    body = f"""<main><section class="hero"><div class="w">
<p class="crumb"><a href="/sewa/{c}.html">Rentalaja {CITY[c]}</a> › <a href="/sewa/{cat}-{c}.html">{label}</a> › {esc(p['name'])}</p>
<div class="prod"><div class="ph">{f'<img src="{esc(u)}" alt="Sewa {esc(p["name"])} {CITY[c]}">' if u else '<span>Foto segera</span>'}</div>
<div><h1>Sewa {esc(p['name'])} di {CITY[c]}</h1>
<p class="lead">{' '.join(extra) + ' ' if extra else ''}Cocok untuk {good}. Mulai <b>{rp(p['d'])}</b> per hari{', ada tarif ' + ' dan '.join(t for t in [('2 jam ' + rp(p['j'])) if p.get('j') else '', ('½ hari ' + rp(p['h'])) if p.get('h') else ''] if t) if (p.get('j') or p.get('h')) else ''}.</p>
<a class="cta" href="/#/Produk?id={p['id']}">Cek tanggal &amp; booking</a><a class="cta alt" href="https://wa.me/{WA}?text={quote('Halo Rentalaja, saya mau tanya sewa ' + p['name'] + ' di ' + CITY[c])}" rel="nofollow">Tanya via WhatsApp</a>
<ul class="chips"><li>Booking online</li><li>DP 20%</li>{'<li>Termasuk: ' + esc(incl) + '</li>' if incl else ''}{f'<li>Sudah disewa {rc:,}× </li>'.replace(',', '.') if rc >= 10 else ''}</ul></div></div></div></section>
<div class="w"><h2>Harga sewa {esc(p['name'])} di {CITY[c]}</h2><div class="scroll"><table><thead><tr><th>Cabang</th>{'<th class="n">2 jam</th>' if hj else ''}{'<th class="n">½ hari</th>' if hh else ''}<th class="n">1 hari</th></tr></thead><tbody>{rows}</tbody></table></div>
<p style="font-size:13px;color:var(--mute)">Harga diperbarui otomatis dari sistem Rentalaja.{' Promo sewa 2 hari gratis 1 berlaku untuk barang ini.' if cat not in ('motor', 'mobil') and any(x.get('key') == 'buy_x_free_y' for x in D.get('promos') or []) else ''}</p>
<h2>Cara sewa</h2><ol class="steps"><li>Pilih tanggal dan jam di <a href="/#/Produk?id={p['id']}">halaman booking</a>.</li><li>Unggah {docs_line(cat)} sekali saja, lalu tunggu verifikasi.</li><li>Bayar DP 20% secara online.</li><li>Ambil di cabang{' atau minta diantar' if cat in ('motor',) else ''}, sisa dibayar saat ambil.</li></ol>
{('<h2>Panduan terkait</h2><ul class="tips">' + ''.join(f'<li><a href="/sewa/{n["slug"]}.html">{esc(n["title"])}</a></li>' for n in needs) + '</ul>') if needs else ''}
{(sec(label + ' lain di ' + CITY[c], '', f'/sewa/{cat}-{c}.html') + '<div class="row">' + cards(related) + '</div>') if related else ''}
<h2>Lokasi ambil</h2>{branch_box(D, codes)}
<h2>Pertanyaan yang sering ditanya</h2>{faq_html(D)}</div></main>"""
    return ui_head(title, desc, path, lds, u) + body + foot(D)








ART_CSS = ('<style>.art p,.art li{font-size:16px}.art h2{margin-top:30px}.meta{font-size:13px;color:var(--mute);margin:0 0 12px}'
           '.cover{margin:18px 0 6px;border-radius:18px;overflow:hidden;background:var(--bg);aspect-ratio:16/8;position:relative}.cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}'
           '.credit{font-size:12px;color:var(--mute);margin:0 0 4px}.credit a{color:var(--mute)}'
           '.agrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:8px}.acard{border:1px solid var(--line);border-radius:16px;overflow:hidden;text-decoration:none;color:var(--ink);background:#fff;display:flex;flex-direction:column}'
           '.acard .t{aspect-ratio:16/9;background:var(--bg);position:relative;overflow:hidden;flex:none}.acard img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.acard .b{padding:12px 14px}.acard b{display:block;font-size:16px;line-height:1.3}.acard span{font-size:13px;color:var(--mute)}'
           '.tag{display:inline-block;font-size:12px;font-weight:700;color:var(--teal-d);background:#E3F7F5;border-radius:999px;padding:3px 10px;margin-bottom:6px}'
           '@media(max-width:640px){.cover{aspect-ratio:4/3}}</style>')


def img_src(a, w=1200):
    pid = (a.get('img') or (None,))[0]
    return f'https://images.unsplash.com/{pid}?auto=format&fit=crop&w={w}&q=75' if pid else None


def cover_html(a):
    if not a.get('img'): return ''
    pid, name, user, cap = a['img']
    ref = '?utm_source=rentalaja&utm_medium=referral'
    return (f'<figure style="margin:0"><div class="cover"><img src="{img_src(a)}" alt="{esc(cap if cap != "Ilustrasi" else a["title"])}" fetchpriority="high"></div>'
            f'<figcaption class="credit">{esc(cap)} · Foto: <a href="https://unsplash.com/@{user}{ref}" rel="nofollow">{esc(name)}</a> / <a href="https://unsplash.com/{ref}" rel="nofollow">Unsplash</a></figcaption></figure>')


def items_of(D, cat, c):
    return D['pages'].get((c, cat), [])


def price_table(items):
    if not items: return '<p>Belum ada barang di kategori ini untuk saat ini. Tanyakan lewat WhatsApp.</p>'
    hj = any(x.get('j') for x in items); hh = any(x.get('h') for x in items)
    rows = ''.join(f'<tr><td><a href="/sewa/{it["pslug"]}.html">{esc(it["name"])}</a></td>' + (f'<td class="n">{rp(it.get("j"))}</td>' if hj else '') + (f'<td class="n">{rp(it.get("h"))}</td>' if hh else '') + f'<td class="n">{rp(it["d"])}</td></tr>' for it in items)
    return (f'<div class="scroll"><table><thead><tr><th>Barang</th>' + ('<th class="n">2 jam</th>' if hj else '') + ('<th class="n">½ hari</th>' if hh else '') +
            f'<th class="n">1 hari</th></tr></thead><tbody>{rows}</tbody></table></div><p style="font-size:13px;color:var(--mute)">Harga diperbarui otomatis dari sistem Rentalaja.</p>')


def pick(D, city, slugs):
    want = slugs.split(',')
    found = {x['slug']: x for x in D['prod'].values() if x['city'] == city and x.get('slug') in want}
    return [found[w] for w in want if w in found]


def calc(D, p, hrs):
    """Sama dengan public.price_item (tanpa musim/promo): <=2 jam tarif 2 jam, <=12 jam tarif ½ hari,
    lebih dari itu per 24 jam; sisa <=12 jam setelah hari penuh dikenai persentase half_day_extra_percent."""
    d, h, j = p.get('d'), p.get('h'), p.get('j')
    if hrs <= 2 and j: return j
    if hrs <= 12 and h: return h
    if not d: return None
    full = int(hrs // 24); rem = hrs - full * 24
    if full >= 1 and 0 < rem <= 12:
        pct = float(D['rules'].get('half_day_extra_percent') or 75)
        return full * d + int(d * pct / 100000.0 + 0.5) * 1000  # pembulatan setengah ke atas, sama dengan round() di Postgres
    return -(-hrs // 24) * d


def zone_table(D, codes):
    rows = ''
    for code in codes:
        zs = [z for z in D['zones'] if z['br'] == code]
        for z in zs:
            rows += f'<tr><td>{esc(BR_NAME.get(code, code))}</td><td class="n">sampai {z["km"]:g} km</td><td class="n">{rp(z["fee"])}</td></tr>'
    if not rows: return '<p>Ongkir antar dihitung di aplikasi saat memilih alamat.</p>'
    return ('<div class="scroll"><table><thead><tr><th>Cabang</th><th class="n">Jarak jalan</th><th class="n">Ongkir sekali jalan</th></tr></thead><tbody>'
            + rows + '</tbody></table></div><p style="font-size:13px;color:var(--mute)">Ongkir diambil langsung dari sistem Rentalaja; jarak dihitung otomatis saat Anda memilih alamat di aplikasi.</p>')


DOCS = {'ktp': 'KTP', 'kk': 'Kartu Keluarga', 'sim': 'SIM', 'npwp': 'NPWP', 'stnk': 'STNK'}


def rule(D, key):
    v = D['rules'].get(key)
    if v is None: return ''
    if isinstance(v, list): return ', '.join(DOCS.get(x, str(x).upper()) for x in v)
    if isinstance(v, bool): return 'ya' if v else 'tidak'
    if isinstance(v, (int, float)): return f'{v:g}'
    return esc(v)


def fill(D, text):
    def sub(m):
        parts = m.group(1).split(':')
        kind = parts[0]
        try:
            if kind == 'tabel': return price_table(items_of(D, parts[1], parts[2]))
            if kind == 'kartu':
                its = items_of(D, parts[1], parts[2])[:int(parts[3]) if len(parts) > 3 else 8]
                return '<div class="grid">' + ''.join(card(x) for x in its) + '</div>' if its else ''
            if kind == 'harga':
                for x in D['prod'].values():
                    if x.get('slug') == parts[1] and x['city'] == parts[2] and x.get('d'): return f'{rp(x["d"])}/hari'
                return 'cek harga di aplikasi'
            if kind == 'rute':
                b = D['br'].get(parts[1]) or {}
                origin = f'{b.get("lat")},{b.get("lng")}' if b.get('lat') else 'Rentalaja ' + BR_NAME.get(parts[1], '')
                url = 'https://www.google.com/maps/dir/?api=1&origin=' + quote(origin) + '&destination=' + quote(parts[2] + ', Jawa Barat') + '&travelmode=driving'
                return f'<a href="{esc(url)}" rel="nofollow">rute di Google Maps</a>'
            if kind == 'cabang': return branch_box(D, [parts[1]])
            if kind == 'pilih':  # [[pilih:kota:slug1,slug2]] tabel harga barang tertentu
                return price_table(pick(D, parts[1], parts[2]))
            if kind == 'kartupilih':  # [[kartupilih:kota:slug1,slug2]]
                its = pick(D, parts[1], parts[2])
                return '<div class="row">' + cards(its, top_badge=0) + '</div>' if its else ''
            if kind in ('hargah', 'harga2j'):  # tarif ½ hari / 2 jam
                k = 'h' if kind == 'hargah' else 'j'
                its = pick(D, parts[2], parts[1])
                return rp(its[0][k]) if its and its[0].get(k) else 'tidak tersedia'
            if kind == 'hitung':  # [[hitung:slug:kota:jam]] contoh total sesuai aturan harga sistem
                its = pick(D, parts[2], parts[1])
                v = calc(D, its[0], float(parts[3])) if its else None
                return rp(v) if v else 'cek di aplikasi'
            if kind == 'ongkir': return zone_table(D, parts[1:])
            if kind == 'aturan': return rule(D, parts[1])
        except Exception:
            return ''
        return ''
    return re.sub(r'\[\[([^\]]+)\]\]', sub, text)


def page_article(D, a):
    path = f'/panduan/{a["slug"]}'
    lead = fill(D, a['lead'])
    body = fill(D, a['body'])
    codes = sorted(set(re.findall(r'\[\[cabang:([A-Z-]+)\]\]', a['body'])), key=lambda x: list(BR_CITY).index(x))
    others = [x for x in ARTICLES if x['slug'] != a['slug'] and (x['city'] == a['city'] or x['city'] is None or a['city'] is None)][:4]
    lds = [{"@context": "https://schema.org", "@type": "Article", "headline": a['title'], "description": a['desc'], "image": img_src(a), "datePublished": a['date'], "dateModified": datetime.date.today().isoformat(),
            "inLanguage": "id-ID", "mainEntityOfPage": BASE + path, "author": {"@type": "Organization", "name": "Rentalaja"},
            "publisher": {"@type": "Organization", "name": "Rentalaja", "logo": {"@type": "ImageObject", "url": BASE + '/logo.png'}}},
           crumbs_ld([('Rentalaja', '/sewa/'), ('Panduan', '/panduan/'), (a['title'], path)]), faq_ld(D)]
    if codes: lds.append({"@context": "https://schema.org", "@graph": [local_business(D, k) for k in codes]})
    cat0 = a['cats'][0]
    strip = ''
    if '[[kartu' not in a['body']:
        its = []
        for cc in ([a['city']] if a['city'] else list(CITY)):
            for ct in a['cats']: its += items_of(D, ct, cc)
        its = sorted(its, key=lambda x: -(x.get('rc') or 0))[:4]
        if its: strip = sec('Barang yang dibahas', 'Harga diperbarui otomatis dari sistem') + '<div class="row">' + cards(its) + '</div>'
    html_ = banner(esc(a['title']), lead, f'<a class="cta" href="/#/Katalog?cat={cat0}">Cek ketersediaan</a>' + wa_cta('Halo Rentalaja, saya baca panduan: ' + a['title']),
                   photo=a.get('img'), crumb='<a href="/panduan/">Panduan</a> · ' + CITY.get(a['city'], 'Garut &amp; Bandung'),
                   badges=['Diperbarui ' + datetime.date.today().strftime('%d-%m-%Y'), 'Harga langsung dari sistem']) + f"""<main class="w art">{strip}{body}
{(sec('Panduan lain', '', '/panduan/', 'Semua panduan') + acards(others).replace('class="agrid"', 'class="row wide"')) if others else ''}
<h2>Pertanyaan yang sering ditanya</h2>{faq_html(D)}</main>"""
    return ui_head(a['title'] + ' | Rentalaja', a['desc'], path, lds, img_src(a)) + html_ + foot(D)


def page_articles(D):
    f0 = ARTICLES[0]
    body = banner('Panduan sewa Rentalaja', 'Rute wisata, checklist, dan tips memilih barang di Garut dan Bandung — harga di setiap panduan diambil langsung dari sistem Rentalaja.',
                  f'<a class="cta" href="/panduan/{f0["slug"]}">Baca: {esc(f0["title"])}</a>', photo=f0.get('img'), kicker='Inspirasi &amp; panduan')
    body += '<main class="w">' + cat_pills(D) + sec('Garut', '', '/sewa/garut.html', 'Sewa di Garut') + acards([x for x in ARTICLES if x['city'] == 'garut']).replace('class="agrid"', 'class="row wide"')
    body += sec('Bandung', '', '/sewa/bandung.html', 'Sewa di Bandung') + acards([x for x in ARTICLES if x['city'] in ('bandung', None)]).replace('class="agrid"', 'class="row wide"')
    body += sec('Kebutuhan populer') + '<div class="row wide">' + ''.join(guide_cards(D).split('</a>')[i] + '</a>' for i in range(len(NEEDS))) + '</div></main>'
    lds = [crumbs_ld([('Rentalaja', '/sewa/'), ('Panduan', '/panduan/')])]
    return head('Panduan Sewa Motor, Kamera, iPhone & Camping di Garut dan Bandung | Rentalaja', 'Panduan rute, tips, dan perbandingan barang untuk sewa motor, kamera, iPhone, proyektor, dan alat camping di Garut dan Bandung.', '/panduan/', lds) .replace('</head>', ART_CSS + '<style>' + UI2_CSS + '</style></head>') + body + foot(D)


def acards(arts):
    out = []
    for x in arts:
        tag = CITY.get(x['city'], 'Garut & Bandung')
        im = f'<img src="{img_src(x, 640)}" alt="" loading="lazy">' if x.get('img') else ''
        out.append(f'<a class="acard" href="/panduan/{x["slug"]}"><div class="t">{im}</div><div class="b"><span class="tag">{tag}</span><b>{esc(x["title"])}</b><span>{esc(x["desc"])}</span></div></a>')
    return '<div class="agrid">' + ''.join(out) + '</div>'



# ---------------- Tampilan v2 (gaya Traveloka: banner foto, baris kartu geser, pill kategori) ----------------
UI2_CSS = """
.top-w{max-width:1120px}.w{max-width:1120px}
.banner{position:relative;border-radius:24px;overflow:hidden;min-height:360px;display:flex;align-items:flex-end;color:#fff;margin-top:18px;background:linear-gradient(120deg,#1F2B4D 0%,#1F2B4D 45%,#0B8F84 100%)}
.banner img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.banner.photo:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,20,38,.88) 0%,rgba(13,20,38,.62) 45%,rgba(13,20,38,.12) 80%),linear-gradient(180deg,rgba(13,20,38,0) 55%,rgba(13,20,38,.55))}.banner h1,.banner .lead{text-shadow:0 2px 12px rgba(0,0,0,.35)}
.banner .in{position:relative;z-index:2;padding:30px;max-width:640px}
.banner h1{color:#fff;font-size:38px;line-height:1.15;margin:0 0 10px}.banner .lead{color:#E6ECF5;margin-bottom:18px}
.banner .crumb,.banner .crumb a{color:#9FF0E7}
.banner .cta.alt{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.4)}
.kicker{display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700;margin-bottom:12px}
.badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.badges span{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:6px 12px;font-size:13px;font-weight:600}
.credit2{position:absolute;right:14px;bottom:10px;z-index:2;font-size:11px;color:#dfe6f0;opacity:.85}.credit2 a{color:#dfe6f0}
.collage{position:absolute;right:24px;top:50%;transform:translateY(-50%);display:flex;gap:10px;z-index:1}
.collage div{width:150px;height:150px;border-radius:22px;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(0,0,0,.25)}
.collage div:nth-child(2){transform:translateY(-26px)}.collage img{width:84%;height:84%;object-fit:contain}
.pills{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 10px;margin-top:20px;scrollbar-width:none}.pills::-webkit-scrollbar{display:none}
.pill{flex:none;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 14px 6px 6px;text-decoration:none;color:var(--ink);font-weight:700;font-size:14px;box-shadow:0 2px 10px rgba(31,43,77,.06)}
.pill img{width:34px;height:34px;object-fit:contain;background:#E3F7F5;border-radius:50%;padding:4px}.pill.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.usp{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}.usp div{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start}
.usp i{flex:none;width:36px;height:36px;border-radius:12px;background:#E3F7F5;display:flex;align-items:center;justify-content:center;color:var(--teal-d);font-style:normal;font-weight:800}
.usp b{display:block;font-size:14px}.usp span{font-size:12.5px;color:var(--mute)}
.sec{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:38px 0 14px}.sec h2{margin:0;font-size:22px}.sec p{margin:4px 0 0;color:var(--mute);font-size:14px}.sec a{font-weight:800;text-decoration:none;white-space:nowrap;font-size:14px}
.row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(190px,220px);gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:2px 2px 14px;scrollbar-width:thin}
.row>*{scroll-snap-align:start}.row.wide{grid-auto-columns:minmax(260px,300px)}
.card{border-radius:18px;box-shadow:0 4px 18px rgba(31,43,77,.07);border-color:#EEF0F3;transition:transform .15s,box-shadow .15s}.card:hover{transform:translateY(-3px);box-shadow:0 10px 26px rgba(31,43,77,.12)}
.card .ph{background:radial-gradient(circle at 50% 60%,#FFFFFF 0,#EAF8F6 70%);position:relative}.card img{padding:14px}
.badge{position:absolute;left:10px;top:10px;background:#F26B1D;color:#fff;font-size:11px;font-weight:800;border-radius:8px;padding:3px 8px;z-index:1}
.card .loc{font-size:12px;color:var(--mute);font-weight:600}.card .rc{font-size:12px;color:var(--mute)}.card .from{font-size:12px;color:var(--mute);margin-top:2px}.card .price b{color:var(--teal-d);font-size:17px}
.citycards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.citycard{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:16/9;display:block;color:#fff;text-decoration:none;background:var(--navy)}
.citycard img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .3s}.citycard:hover img{transform:scale(1.04)}
.citycard:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(10,16,30,.8))}
.citycard .t{position:absolute;left:18px;bottom:16px;z-index:1}.citycard b{display:block;font-size:24px}.citycard span{font-size:14px;color:#E6ECF5}
.acard{box-shadow:0 4px 18px rgba(31,43,77,.07);border-color:#EEF0F3}
@media(max-width:820px){.collage{display:none}.usp{grid-template-columns:1fr 1fr}}
@media(max-width:640px){.banner.photo:after{background:linear-gradient(180deg,rgba(13,20,38,.35) 0%,rgba(13,20,38,.9) 75%)}.banner{min-height:320px;border-radius:18px;margin-top:12px}.banner h1{font-size:27px}.banner .in{padding:20px}.citycards{grid-template-columns:1fr}.sec h2{font-size:19px}.row{grid-auto-columns:minmax(165px,180px)}.row.wide{grid-auto-columns:minmax(240px,260px)}.usp div{padding:12px}}
"""

PHOTO = {  # (id foto Unsplash, nama fotografer, username, keterangan)
    'garut': ('photo-1580808327337-731f57b77991', 'Ken Petung', 'kenpetung', 'Gunung Papandayan, Garut'),
    'bandung': ('photo-1693291587702-ff510bbc5de9', 'Abdul Ridwan', 'abdulridwanrr', 'Jl. Asia Afrika, Bandung'),
    'index': ('photo-1533632368662-0cdf02790f17', 'Gery Wibowo', 'gergilgad', 'Hutan Mati, Gunung Papandayan'),
    'motor-papandayan-garut': ('photo-1716727382000-41cf89e1a075', 'Idris Hasibuan', 'idri5', 'Gunung Papandayan'),
    'motor-antar-hotel-garut': ('photo-1723259528465-0bb2850fda65', 'Surya Ahmad Pajar', 'ahmdpajr', 'Ilustrasi'),
    'alat-camping-gunung-garut': ('photo-1716727382026-7854678e53f1', 'Idris Hasibuan', 'idri5', 'Pendaki di Gunung Papandayan'),
    'iphone-wisuda-konten-bandung': ('photo-1567985944845-cb4d1e598822', 'Josh Power', 'joshwp', 'Ilustrasi'),
    'motor-mahasiswa-bandung': ('photo-1725632240701-87a7b8cde954', 'Dwi Asy Syafa', 'dwiasysyafa', 'Ilustrasi'),
    'kamera-wisuda-prewedding-garut': ('photo-1513031300226-c8fb12de9ade', 'Ailbhe Flynn', 'aflynnn', 'Ilustrasi'),
    'proyektor-nobar-acara': ('photo-1478720568477-152d9b164e26', 'Jeremy Yap', 'jeremyyappy', 'Ilustrasi'),
}


def unsplash(pid, w=1600): return f'https://images.unsplash.com/{pid}?auto=format&fit=crop&w={w}&q=72'


def banner(h1, lead, ctas, photo=None, collage=None, kicker='', badges=(), crumb=''):
    bg = cred = col = ''
    if photo:
        pid, name, user, cap = photo
        ref = '?utm_source=rentalaja&utm_medium=referral'
        bg = f'<img class="bg" src="{unsplash(pid)}" alt="{esc(cap if cap != "Ilustrasi" else h1)}" fetchpriority="high">'
        cred = f'<div class="credit2">{esc(cap)} · Foto: <a href="https://unsplash.com/@{user}{ref}" rel="nofollow">{esc(name)}</a> / <a href="https://unsplash.com/{ref}" rel="nofollow">Unsplash</a></div>'
    if collage:
        col = '<div class="collage">' + ''.join(f'<div><img src="{esc(u)}" alt=""></div>' for u in collage[:3]) + '</div>'
    return (f'<section class="w"><div class="banner{" photo" if photo else ""}">{bg}{col}<div class="in">'
            + (f'<p class="crumb">{crumb}</p>' if crumb else '') + (f'<span class="kicker">{kicker}</span>' if kicker else '')
            + f'<h1>{h1}</h1><p class="lead">{lead}</p>{ctas}'
            + ('<div class="badges">' + ''.join(f'<span>{b}</span>' for b in badges) + '</div>' if badges else '')
            + f'</div>{cred}</div></section>')


def usp():
    items = [('✓', 'Booking online 24 jam', 'Cek stok dan kunci jadwal dari HP'), ('20%', 'Cukup DP 20%', 'Sisanya dibayar saat ambil'),
             ('⇄', 'Bisa diantar', 'Ongkir sesuai jarak'), ('★', 'Barang terawat', 'Dicek sebelum diserahkan')]
    return '<div class="usp">' + ''.join(f'<div><i>{i}</i><p style="margin:0"><b>{t}</b><span>{s}</span></p></div>' for i, t, s in items) + '</div>'


def sec(title, sub='', link='', link_text='Lihat semua'):
    return (f'<div class="sec"><div><h2>{title}</h2>' + (f'<p>{sub}</p>' if sub else '') + '</div>'
            + (f'<a href="{link}">{link_text} →</a>' if link else '') + '</div>')


def card(p, badge=None, show_loc=False):
    u = img_url(p.get('ph'))
    img = f'<img src="{esc(u)}" alt="Sewa {esc(p["name"])} {CITY[p["city"]]}" loading="lazy">' if u else 'Foto segera'
    parts = []
    if p.get('j'): parts.append(f'2 jam {rp(p["j"])}')
    if p.get('h'): parts.append(f'½ hari {rp(p["h"])}')
    rc = p.get('rc') or 0
    return (f'<div class="card"><div class="ph">{f"<span class=badge>{badge}</span>" if badge else ""}{img}</div><div class="b">'
            + (f'<span class="loc">{CITY[p["city"]]}</span>' if show_loc else '')
            + f'<h3><a href="/sewa/{p["pslug"]}.html">{esc(p["name"])}</a></h3>'
            + (f'<span class="rc">Disewa {rc:,}×</span>'.replace(',', '.') if rc >= 10 else '')
            + f'<div class="from">Mulai dari</div><div class="price"><b>{rp(p["d"])}</b> / hari</div>'
            + (f'<div class="price">{" · ".join(parts)}</div>' if parts else '')
            + f'<a class="go" href="/sewa/{p["pslug"]}.html">Lihat detail</a></div></div>')


def cards(items, top_badge=3, show_loc=False):
    best = sorted([x for x in items if (x.get('rc') or 0) >= 10], key=lambda x: -x['rc'])[:top_badge]
    ids = {x['id'] + x['city'] for x in best}
    return ''.join(card(x, 'Terlaris' if x['id'] + x['city'] in ids else None, show_loc) for x in items)


def top_items(D, c=None, cats=None, n=10):
    its = [p for p in D['prod'].values() if (c is None or p['city'] == c) and (cats is None or p['cat'] in cats)]
    return sorted(its, key=lambda x: -(x.get('rc') or 0))[:n]


def cat_pills(D, c=None, active=None):
    out = []
    for cat in ORDER:
        cities = [c] if c else list(CITY)
        cc = next((x for x in cities if (x, cat) in D['pages']), None)
        if not cc: continue
        items = D['pages'][(cc, cat)]
        ph = next((img_url(x['ph']) for x in sorted(items, key=lambda x: -(x.get('rc') or 0)) if x.get('ph')), None)
        out.append(f'<a class="pill{" on" if cat == active else ""}" href="/sewa/{cat}-{cc}.html">' + (f'<img src="{esc(ph)}" alt="">' if ph else '') + f'{CAT[cat][0]}</a>')
    return '<div class="pills">' + ''.join(out) + '</div>'


def guide_cards(D, c=None):
    out = []
    for n in NEEDS:
        if c and n['city'] not in (c, None): continue
        ph = PHOTO.get(n['slug'])
        im = f'<img src="{unsplash(ph[0], 640)}" alt="" loading="lazy">' if ph else ''
        out.append(f'<a class="acard" href="/sewa/{n["slug"]}.html"><div class="t">{im}</div><div class="b"><span class="tag">{CITY.get(n["city"], "Garut & Bandung")}</span><b>{esc(n["title"])}</b></div></a>')
    for a in ARTICLES:
        if c and a['city'] not in (c, None): continue
        im = f'<img src="{img_src(a, 640)}" alt="" loading="lazy">' if a.get('img') else ''
        out.append(f'<a class="acard" href="/panduan/{a["slug"]}"><div class="t">{im}</div><div class="b"><span class="tag">{CITY.get(a["city"], "Garut & Bandung")}</span><b>{esc(a["title"])}</b></div></a>')
    return ''.join(out)


def ui_head(*a, **k):
    return head(*a, **k).replace('</head>', ART_CSS + '<style>' + UI2_CSS + '</style></head>')


def wa_cta(text, label='Tanya via WhatsApp'):
    return f'<a class="cta alt" href="https://wa.me/{WA}?text={quote(text)}" rel="nofollow">{label}</a>'


# ---------------- halaman v2 ----------------
def page_index(D):
    city_cards = ''
    for c in CITY:
        cats = [CAT[cat][0] for (cc, cat) in D['pages'] if cc == c]
        city_cards += (f'<a class="citycard" href="/sewa/{c}.html"><img src="{unsplash(PHOTO[c][0], 900)}" alt="{PHOTO[c][3]}" loading="lazy">'
                       f'<div class="t"><b>Rentalaja {CITY[c]}</b><span>{", ".join(cats[:5])}{" & lainnya" if len(cats) > 5 else ""}</span></div></a>')
    body = (banner('Sewa apa aja di Garut &amp; Bandung', 'Motor, mobil, iPhone, kamera, lensa, proyektor, PlayStation, dan alat camping. Cek stok, pilih jam, bayar DP 20% — langsung dari HP.',
                   f'<a class="cta" href="/#/Home">Mulai booking</a>{wa_cta("Halo Rentalaja, saya mau tanya sewa", "Chat admin")}',
                   photo=PHOTO['index'], kicker='Nggak semua harus dibeli', badges=['4 cabang', 'Buka setiap hari 07.30–21.00', 'DP 20%'])
            + '<main class="w">' + cat_pills(D) + usp()
            + sec('Pilih kota', 'Ambil di cabang terdekat atau minta diantar') + f'<div class="citycards">{city_cards}</div>')
    for c in CITY:
        body += sec(f'Paling sering disewa di {CITY[c]}', 'Harga diperbarui otomatis dari sistem', f'/sewa/{c}.html') + f'<div class="row">{cards(top_items(D, c))}</div>'
    body += sec('Inspirasi &amp; panduan', 'Rute, tips, dan pilihan barang yang pas', '/panduan/', 'Semua panduan') + f'<div class="row wide">{guide_cards(D)}</div>'
    body += '</main>'
    ld = [{"@context": "https://schema.org", "@type": "Organization", "name": "Rentalaja", "url": BASE, "logo": BASE + '/logo.png', "parentOrganization": {"@type": "Organization", "name": "PT Popo Karya Investama"}}]
    return ui_head('Rentalaja – Sewa Motor, iPhone, Kamera & Alat Camping di Garut dan Bandung', 'Sewa motor, mobil, iPhone, kamera, lensa, proyektor, PlayStation, dan alat camping di Garut dan Bandung. Booking online, DP 20%.', '/sewa/', ld, unsplash(PHOTO['index'][0], 1200)) + body + foot(D)


def page_city(D, c):
    cats = [(cat, items) for (cc, cat), items in D['pages'].items() if cc == c]
    codes = [k for k in BR_CITY if BR_CITY[k] == c and k in D['br']]
    path = f'/sewa/{c}.html'
    title = f'Rentalaja {CITY[c]} – Sewa {", ".join(CAT[cat][0] for cat, _ in cats[:4])} & Lainnya'
    desc = f'Rentalaja {CITY[c]}: sewa ' + ', '.join(CAT[cat][0] if CAT[cat][0] in ('iPhone', 'PlayStation') else CAT[cat][0].lower() for cat, _ in cats) + '. Booking online, DP 20%, buka setiap hari 07.30–21.00.'
    total = sum((x.get('rc') or 0) for _, items in cats for x in items)
    lds = [{"@context": "https://schema.org", "@graph": [local_business(D, k) for k in codes]}, crumbs_ld([('Rentalaja', '/sewa/'), (CITY[c], path)]), faq_ld(D)]
    body = banner(f'Rentalaja {CITY[c]}', f'Sewa {", ".join(CAT[cat][0] if CAT[cat][0] in ("iPhone", "PlayStation") else CAT[cat][0].lower() for cat, _ in cats)} — cek stok dan booking langsung dari HP.',
                  f'<a class="cta" href="/#/Home">Mulai booking</a>{wa_cta(f"Halo Rentalaja {CITY[c]}, saya mau tanya sewa", "Chat admin")}',
                  photo=PHOTO[c], crumb='<a href="/sewa/">Rentalaja</a> › ' + CITY[c],
                  badges=[f'{len(codes)} cabang', f'Sudah {total:,}× disewa'.replace(',', '.') if total else 'Booking online', 'DP 20%'])
    body += '<main class="w">' + cat_pills(D, c) + usp()
    for cat, items in cats:
        items = sorted(items, key=lambda x: -(x.get('rc') or 0))
        lo = min(x['d'] for x in items if x['d'])
        body += sec(f'{CAT[cat][1]} di {CITY[c]}', f'{len(items)} pilihan · mulai {rp(lo)}/hari', f'/sewa/{cat}-{c}.html') + f'<div class="row">{cards(items[:12])}</div>'
    body += sec(f'Panduan di {CITY[c]}', '', '/panduan/', 'Semua panduan') + f'<div class="row wide">{guide_cards(D, c)}</div>'
    body += sec(f'Cabang Rentalaja di {CITY[c]}') + branch_box(D, codes) + sec('Pertanyaan yang sering ditanya') + faq_html(D) + '</main>'
    return ui_head(title, desc, path, lds, unsplash(PHOTO[c][0], 1200)) + body + foot(D)


def page_category(D, c, cat):
    items = sorted(D['pages'][(c, cat)], key=lambda x: (x['d'] or 0, x['name']))
    label, title_base, intro, good = CAT[cat]
    lo = min(x['d'] for x in items if x['d'])
    codes = sorted({b for it in items for b in it['branches']}, key=lambda x: list(BR_CITY).index(x))
    path = f'/sewa/{cat}-{c}.html'
    title = f'{title_base} {CITY[c]} Mulai {rp(lo)}/Hari | Rentalaja'
    hj = any(x.get('j') for x in items); hh = any(x.get('h') for x in items)
    desc = f'{title_base} di {CITY[c]}: {len(items)} pilihan, mulai {rp(lo)} per hari' + (', ada tarif 2 jam dan ½ hari' if (hj or hh) else '') + '. Cek ketersediaan dan booking online, DP 20%.'
    lds = [{"@context": "https://schema.org", "@graph": [local_business(D, k) for k in codes]},
           {"@context": "https://schema.org", "@type": "ItemList", "name": f'{title_base} {CITY[c]}',
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f'{BASE}/sewa/{it["pslug"]}.html', "name": it['name']} for i, it in enumerate(items)]},
           crumbs_ld([('Rentalaja', '/sewa/'), (CITY[c], f'/sewa/{c}.html'), (label, path)]), faq_ld(D)]
    rows = ''.join(f'<tr><td><a href="/sewa/{it["pslug"]}.html">{esc(it["name"])}</a></td>' + (f'<td class="n">{rp(it.get("j"))}</td>' if hj else '') + (f'<td class="n">{rp(it.get("h"))}</td>' if hh else '') + f'<td class="n">{rp(it["d"])}</td></tr>' for it in items)
    collage = [img_url(x['ph']) for x in sorted(items, key=lambda x: -(x.get('rc') or 0)) if x.get('ph')][:3]
    badges = [f'{len(items)} pilihan', 'DP 20%'] + (['Tarif ' + ('2 jam & ' if hj else '') + '½ hari'] if (hj or hh) else []) + ['Buka 07.30–21.00']
    body = banner(f'{esc(title_base)} di {CITY[c]}', f'{esc(intro)} Mulai <b>{rp(lo)}</b> per hari.',
                  f'<a class="cta" href="/#/Katalog?cat={cat}">Cek ketersediaan</a>{wa_cta(f"Halo Rentalaja, saya mau tanya {title_base.lower()} di {CITY[c]}")}',
                  collage=collage, crumb=f'<a href="/sewa/{c}.html">Rentalaja {CITY[c]}</a> › {label}', badges=badges)
    needs = [n for n in NEEDS if (n['city'] in (c, None)) and cat in n['cats']]
    arts = [a for a in ARTICLES if a['city'] in (c, None) and cat in a['cats']]
    body += '<main class="w">' + cat_pills(D, c, cat) + usp()
    body += sec(f'Semua pilihan {label if label in ("iPhone", "PlayStation") else label.lower()} di {CITY[c]}', 'Urut dari harga termurah') + f'<div class="grid">{cards(items)}</div>'
    body += sec(f'Daftar harga sewa {label} {CITY[c]}') + f'<div class="scroll"><table><thead><tr><th>Barang</th>{"<th class=n>2 jam</th>" if hj else ""}{"<th class=n>½ hari</th>" if hh else ""}<th class="n">1 hari</th></tr></thead><tbody>{rows}</tbody></table></div><p style="font-size:13px;color:var(--mute)">Harga diperbarui otomatis dari sistem Rentalaja. Sewa lebih dari 1 hari dihitung per hari.</p>'
    if needs or arts:
        g = ''.join(f'<a class="acard" href="/sewa/{n["slug"]}.html"><div class="t">' + (f'<img src="{unsplash(PHOTO[n["slug"]][0], 640)}" alt="" loading="lazy">' if n['slug'] in PHOTO else '') + f'</div><div class="b"><b>{esc(n["title"])}</b></div></a>' for n in needs)
        g += ''.join(f'<a class="acard" href="/panduan/{a["slug"]}"><div class="t"><img src="{img_src(a, 640)}" alt="" loading="lazy"></div><div class="b"><b>{esc(a["title"])}</b></div></a>' for a in arts if a.get('img'))
        body += sec('Panduan terkait') + f'<div class="row wide">{g}</div>'
    body += sec('Lokasi ambil') + branch_box(D, codes) + sec('Pertanyaan yang sering ditanya') + faq_html(D) + '</main>'
    return ui_head(title, desc, path, lds, collage[0] if collage else None) + body + foot(D)


def page_need(D, n):
    cities = [n['city']] if n['city'] else list(CITY)
    items = [p for p in D['prod'].values() if p['city'] in cities and p['cat'] in n['cats']]
    if n.get('prefer'): items.sort(key=lambda x: (n['prefer'] not in x['name'].lower(), x['d'] or 0))
    else: items.sort(key=lambda x: (x['city'], x['cat'], x['d'] or 0))
    path = f'/sewa/{n["slug"]}.html'
    lo = min((x['d'] for x in items if x['d']), default=None)
    desc = n['lead'][:150].rsplit(' ', 1)[0] + (f' Mulai {rp(lo)}/hari.' if lo else '')
    codes = sorted({b for it in items for b in it['branches']}, key=lambda x: list(BR_CITY).index(x))
    lds = [{"@context": "https://schema.org", "@type": "ItemList", "name": n['title'],
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f'{BASE}/sewa/{it["pslug"]}.html', "name": it['name']} for i, it in enumerate(items[:20])]},
           crumbs_ld([('Rentalaja', '/sewa/'), (n['title'], path)]), faq_ld(D)]
    if codes: lds.append({"@context": "https://schema.org", "@graph": [local_business(D, k) for k in codes]})
    also = [x for x in NEEDS if x['slug'] in n.get('also', [])]
    ph = PHOTO.get(n['slug'])
    body = banner(esc(n['h1']), esc(n['lead']),
                  f'<a class="cta" href="/#/Katalog?cat={n["cats"][0]}">Cek ketersediaan</a>{wa_cta("Halo Rentalaja, saya mau tanya: " + n["title"])}',
                  photo=ph, crumb='<a href="/sewa/">Rentalaja</a> › Panduan', badges=([f'Mulai {rp(lo)}/hari'] if lo else []) + ['DP 20%', 'Booking online'])
    body += '<main class="w art">' + usp() + sec('Tips') + f'<ul class="tips">{"".join(f"<li>{t}</li>" for t in n["tips"])}</ul>'
    body += sec('Pilihan dan harga', 'Harga diperbarui otomatis dari sistem') + f'<div class="grid">{cards(items[:24], show_loc=len(cities) > 1)}</div>'
    if also: body += sec('Baca juga') + '<div class="row wide">' + ''.join(f'<a class="acard" href="/sewa/{x["slug"]}.html"><div class="t">' + (f'<img src="{unsplash(PHOTO[x["slug"]][0], 640)}" alt="" loading="lazy">' if x['slug'] in PHOTO else '') + f'</div><div class="b"><b>{esc(x["title"])}</b></div></a>' for x in also) + '</div>'
    if codes: body += sec('Lokasi ambil') + branch_box(D, codes)
    body += sec('Pertanyaan yang sering ditanya') + faq_html(D) + '</main>'
    return ui_head(f'{n["title"]} | Rentalaja', desc, path, lds, unsplash(ph[0], 1200) if ph else None) + body + foot(D)



def sitemap(D):
    today = datetime.date.today().isoformat()
    urls = [('/', '1.0'), ('/sewa/', '0.9'), ('/link', '0.6'), ('/experience', '0.7'), ('/atvaja', '0.7')]
    urls += [(f'/sewa/{c}.html', '0.9') for c in CITY]
    urls += [(f'/sewa/{cat}-{c}.html', '0.8') for (c, cat) in D['pages']]
    urls += [(f'/sewa/{n["slug"]}.html', '0.8') for n in NEEDS]
    urls += [('/panduan/', '0.7')] + [(f'/panduan/{a["slug"]}', '0.7') for a in ARTICLES]
    urls += [(f'/sewa/{p["pslug"]}.html', '0.7') for p in D['prod'].values()]
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
        f'<url><loc>{BASE}{u}</loc><lastmod>{today}</lastmod><changefreq>daily</changefreq><priority>{pr}</priority></url>\n' for u, pr in urls) + '</urlset>\n'


def render(p):
    """Kembalikan (status, content-type, body) untuk path relatif p (tanpa /sewa/)."""
    D = load()
    p = (p or '').strip('/')
    if p == 'sitemap.xml': return 200, 'application/xml; charset=utf-8', sitemap(D)
    if p in ('', 'index.html'): return 200, 'text/html; charset=utf-8', page_index(D)
    if p == 'panduan' or p.startswith('panduan/'):
        s = p[8:].strip('/')
        if s.endswith('.html'): s = s[:-5]
        if not s: return 200, 'text/html; charset=utf-8', page_articles(D)
        for a in ARTICLES:
            if a['slug'] == s: return 200, 'text/html; charset=utf-8', page_article(D, a)
    if not p.endswith('.html'): p += '.html'
    s = p[:-5]
    if s in CITY: return 200, 'text/html; charset=utf-8', page_city(D, s)
    for n in NEEDS:
        if n['slug'] == s: return 200, 'text/html; charset=utf-8', page_need(D, n)
    for (c, cat) in D['pages']:
        if s == f'{cat}-{c}': return 200, 'text/html; charset=utf-8', page_category(D, c, cat)
    for pr in D['prod'].values():
        if pr['pslug'] == s: return 200, 'text/html; charset=utf-8', page_product(D, pr)
    return 404, 'text/html; charset=utf-8', head('Halaman tidak ditemukan | Rentalaja', 'Halaman tidak ditemukan.', '/sewa/', []) + \
        '<main><section class="hero"><div class="w"><h1>Halaman tidak ditemukan</h1><p class="lead">Barang ini mungkin sudah tidak tersedia. Lihat pilihan lain di bawah.</p><a class="cta" href="/sewa/">Semua layanan sewa</a></div></section></main>' + foot(D)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = parse_qs(urlparse(self.path).query)
        try:
            status, ctype, body = render((q.get('p') or [''])[0])
            cache = 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400' if status == 200 else 'public, s-maxage=600'
        except Exception as e:  # data gagal dimuat: jangan cache, CDN tetap menyajikan versi lama (stale)
            status, ctype, body, cache = 503, 'text/plain; charset=utf-8', 'Sedang memuat ulang, coba lagi sebentar.', 'no-store'
        data = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', cache)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
