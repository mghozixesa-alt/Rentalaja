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
a{color:var(--teal-d)}header.top{background:var(--navy);color:#fff}header.top .w{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px}
header.top a{color:#fff;text-decoration:none;font-weight:700}.w{max-width:960px;margin:0 auto;padding:0 16px}
.logo{height:28px;background:#fff;border-radius:6px;padding:3px 6px}
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
footer{margin-top:40px;background:var(--bg);padding:24px 0;font-size:13px;color:var(--mute)}footer a{margin-right:12px}
.links{columns:2;padding-left:18px}@media(max-width:640px){h1{font-size:23px}.links{columns:1}.cta.alt{margin:8px 0 0}.prod{grid-template-columns:1fr}}"""


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
    data = dict(br=br, prod=prod, pages=pages, at=raw.get('at'), promos=raw.get('promos'), late_pct=raw.get('late_pct'))
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
<header class="top"><div class="w"><a href="/sewa/"><img class="logo" src="/logo.png" alt="Rentalaja"></a><a href="/#/Home">Buka aplikasi →</a></div></header>"""


def foot(D):
    cats = ''.join(f'<li><a href="/sewa/{cat}-{c}.html">{CAT[cat][1]} {CITY[c]}</a></li>' for (c, cat) in D['pages'])
    needs = ''.join(f'<li><a href="/sewa/{n["slug"]}.html">{esc(n["title"])}</a></li>' for n in NEEDS)
    arts = ''.join(f'<li><a href="/panduan/{a["slug"]}">{esc(a["title"])}</a></li>' for a in ARTICLES)
    return f"""<footer><div class="w"><h2 style="font-size:16px;margin-top:0">Semua layanan sewa</h2><ul class="links">{cats}</ul>
<h2 style="font-size:16px">Panduan sewa</h2><ul class="links">{needs}</ul>
<h2 style="font-size:16px">Artikel panduan</h2><ul class="links">{arts}</ul>
<p>Rentalaja · PT Popo Karya Investama. <a href="/sewa/garut.html">Rentalaja Garut</a><a href="/sewa/bandung.html">Rentalaja Bandung</a><a href="/link">Semua link</a><a href="/#/Bantuan">Bantuan</a></p></div></footer></body></html>"""


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


def card(p):
    u = img_url(p.get('ph'))
    img = f'<img src="{esc(u)}" alt="Sewa {esc(p["name"])} {CITY[p["city"]]}" loading="lazy">' if u else 'Foto segera'
    parts = []
    if p.get('j'): parts.append(f'2 jam {rp(p["j"])}')
    if p.get('h'): parts.append(f'½ hari {rp(p["h"])}')
    return (f'<div class="card"><div class="ph">{img}</div><div class="b"><h3><a href="/sewa/{p["pslug"]}.html">{esc(p["name"])}</a></h3>'
            f'<div class="price"><b>{rp(p["d"])}</b> / hari</div>' + (f'<div class="price">{" · ".join(parts)}</div>' if parts else '') +
            f'<a class="go" href="/sewa/{p["pslug"]}.html">Lihat detail</a></div></div>')


def offer_ld(p):
    u = img_url(p.get('ph'))
    return {"@type": "Product", "name": f'Sewa {p["name"]} {CITY[p["city"]]}', "image": u, "url": f'{BASE}/sewa/{p["pslug"]}.html', "brand": {"@type": "Brand", "name": "Rentalaja"},
            "offers": {"@type": "Offer", "price": p['d'], "priceCurrency": "IDR", "availability": "https://schema.org/InStock", "url": f'{BASE}/sewa/{p["pslug"]}.html',
                       "seller": {"@type": "Organization", "name": "Rentalaja"}}}


def docs_line(cat):
    return 'KTP, SIM, dan KK' if cat in ('motor', 'mobil') else 'KTP dan KK'


# ---------------- halaman ----------------
def page_category(D, c, cat):
    items = D['pages'][(c, cat)]
    label, title_base, intro, _ = CAT[cat]
    lo = min(x['d'] for x in items if x['d'])
    codes = sorted({b for it in items for b in it['branches']}, key=lambda x: list(BR_CITY).index(x))
    path = f'/sewa/{cat}-{c}.html'
    title = f'{title_base} {CITY[c]} Mulai {rp(lo)}/Hari | Rentalaja'
    has_jam = any(x.get('j') or x.get('h') for x in items)
    desc = f'{title_base} di {CITY[c]}: {len(items)} pilihan, mulai {rp(lo)} per hari' + (', ada tarif 2 jam dan ½ hari' if has_jam else '') + '. Cek ketersediaan dan booking online, DP 20%.'
    lds = [{"@context": "https://schema.org", "@graph": [local_business(D, k) for k in codes]},
           {"@context": "https://schema.org", "@type": "ItemList", "name": f'{title_base} {CITY[c]}',
            "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": f'{BASE}/sewa/{it["pslug"]}.html', "name": it['name']} for i, it in enumerate(items)]},
           crumbs_ld([('Rentalaja', '/sewa/'), (CITY[c], f'/sewa/{c}.html'), (label, path)]), faq_ld(D)]
    hj = any(x.get('j') for x in items); hh = any(x.get('h') for x in items)
    rows = ''.join(f'<tr><td><a href="/sewa/{it["pslug"]}.html">{esc(it["name"])}</a></td>' + (f'<td class="n">{rp(it.get("j"))}</td>' if hj else '') + (f'<td class="n">{rp(it.get("h"))}</td>' if hh else '') + f'<td class="n">{rp(it["d"])}</td></tr>' for it in items)
    needs = [n for n in NEEDS if (n['city'] in (c, None)) and cat in n['cats']]
    body = f"""<main><section class="hero"><div class="w">
<p class="crumb"><a href="/sewa/{c}.html">Rentalaja {CITY[c]}</a> › {label}</p>
<h1>{esc(title_base)} di {CITY[c]}</h1><p class="lead">{esc(intro)} {len(items)} pilihan mulai {rp(lo)} per hari. Booking online, cukup DP 20% setelah verifikasi.</p>
<a class="cta" href="/#/Katalog?cat={cat}">Cek ketersediaan</a><a class="cta alt" href="https://wa.me/{WA}" rel="nofollow">Tanya via WhatsApp</a>
<ul class="chips"><li>Booking online</li><li>DP 20%</li>{'<li>Ada tarif ' + ('2 jam & ' if hj else '') + '½ hari</li>' if has_jam else ''}<li>Buka 07.30–21.00</li></ul></div></section>
<div class="w"><h2>Pilihan {label if label in ('iPhone', 'PlayStation') else label.lower()} di {CITY[c]}</h2><div class="grid">{''.join(card(it) for it in items)}</div>
<h2>Daftar harga sewa {label} {CITY[c]}</h2><div class="scroll"><table><thead><tr><th>Barang</th>{'<th class="n">2 jam</th>' if hj else ''}{'<th class="n">½ hari</th>' if hh else ''}<th class="n">1 hari</th></tr></thead><tbody>{rows}</tbody></table></div>
<p style="font-size:13px;color:var(--mute)">Harga diperbarui otomatis dari sistem Rentalaja. Sewa lebih dari 1 hari dihitung per hari.</p>
{('<h2>Panduan terkait</h2><ul class="tips">' + ''.join(f'<li><a href="/sewa/{n["slug"]}.html">{esc(n["title"])}</a></li>' for n in needs) + '</ul>') if needs else ''}
<h2>Lokasi ambil</h2>{branch_box(D, codes)}
<h2>Pertanyaan yang sering ditanya</h2>{faq_html(D)}</div></main>"""
    return head(title, desc, path, lds) + body + foot(D)


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
    related = [x for x in D['pages'].get((c, cat), []) if x['id'] != p['id']][:4]
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
{('<h2>' + label + ' lain di ' + CITY[c] + '</h2><div class="grid">' + ''.join(card(x) for x in related) + '</div>') if related else ''}
<h2>Lokasi ambil</h2>{branch_box(D, codes)}
<h2>Pertanyaan yang sering ditanya</h2>{faq_html(D)}</div></main>"""
    return head(title, desc, path, lds, u) + body + foot(D)


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
    city_links = ''.join(f'<a class="cta alt" style="margin:8px 8px 0 0" href="/sewa/{cat}-{cc}.html">Semua {CAT[cat][0].lower() if CAT[cat][0] not in ("iPhone", "PlayStation") else CAT[cat][0]} {CITY[cc]}</a>' for cc in cities for cat in n['cats'] if (cc, cat) in D['pages'])
    also = [x for x in NEEDS if x['slug'] in n.get('also', [])]
    body = f"""<main><section class="hero"><div class="w">
<p class="crumb"><a href="/sewa/">Rentalaja</a> › Panduan</p>
<h1>{esc(n['h1'])}</h1><p class="lead">{esc(n['lead'])}</p>
<a class="cta" href="/#/Katalog?cat={n['cats'][0]}">Cek ketersediaan</a><a class="cta alt" href="https://wa.me/{WA}?text={quote('Halo Rentalaja, saya mau tanya: ' + n['title'])}" rel="nofollow">Tanya via WhatsApp</a>
</div></section>
<div class="w"><h2>Tips</h2><ul class="tips">{''.join(f'<li>{t}</li>' for t in n['tips'])}</ul>
<h2>Pilihan dan harga</h2><div class="grid">{''.join(card(x) for x in items[:24])}</div>
<div style="margin-top:12px">{city_links}</div>
{('<h2>Baca juga</h2><ul class="tips">' + ''.join(f'<li><a href="/sewa/{x["slug"]}.html">{esc(x["title"])}</a></li>' for x in also) + '</ul>') if also else ''}
{('<h2>Lokasi ambil</h2>' + branch_box(D, codes)) if codes else ''}
<h2>Pertanyaan yang sering ditanya</h2>{faq_html(D)}</div></main>"""
    return head(f'{n["title"]} | Rentalaja', desc, path, lds) + body + foot(D)


def page_city(D, c):
    cats = [(cat, items) for (cc, cat), items in D['pages'].items() if cc == c]
    codes = [k for k in BR_CITY if BR_CITY[k] == c and k in D['br']]
    path = f'/sewa/{c}.html'
    title = f'Rentalaja {CITY[c]} – Sewa {", ".join(CAT[cat][0] for cat, _ in cats[:4])} & Lainnya'
    desc = f'Rentalaja {CITY[c]}: sewa ' + ', '.join(CAT[cat][0] if CAT[cat][0] in ('iPhone', 'PlayStation') else CAT[cat][0].lower() for cat, _ in cats) + '. Booking online, DP 20%, buka setiap hari 07.30–21.00.'
    tiles = ''.join(f'<div class="card"><div class="b"><h3><a href="/sewa/{cat}-{c}.html">{CAT[cat][1]} {CITY[c]}</a></h3><div class="price">{len(items)} pilihan · mulai <b>{rp(min(x["d"] for x in items if x["d"]))}</b>/hari</div>'
                    f'<a class="go" href="/sewa/{cat}-{c}.html">Lihat harga</a></div></div>' for cat, items in cats)
    needs = [n for n in NEEDS if n['city'] in (c, None)]
    lds = [{"@context": "https://schema.org", "@graph": [local_business(D, k) for k in codes]}, crumbs_ld([('Rentalaja', '/sewa/'), (CITY[c], path)]), faq_ld(D)]
    body = f"""<main><section class="hero"><div class="w"><h1>Rentalaja {CITY[c]}</h1>
<p class="lead">Nggak semua harus dibeli. Sewa saat butuh: {', '.join(CAT[cat][0] for cat, _ in cats)}. Cek stok dan booking langsung dari HP.</p>
<a class="cta" href="/#/Home">Buka aplikasi Rentalaja</a></div></section>
<div class="w"><h2>Kategori sewa di {CITY[c]}</h2><div class="grid">{tiles}</div>
<h2>Panduan sewa di {CITY[c]}</h2><ul class="tips">{''.join(f'<li><a href="/sewa/{n["slug"]}.html">{esc(n["title"])}</a></li>' for n in needs)}</ul>
<h2>Cabang Rentalaja di {CITY[c]}</h2>{branch_box(D, codes)}<h2>Pertanyaan yang sering ditanya</h2>{faq_html(D)}</div></main>"""
    return head(title, desc, path, lds) + body + foot(D)


def page_index(D):
    body = '<main><section class="hero"><div class="w"><h1>Sewa di Rentalaja</h1><p class="lead">Motor, mobil, iPhone, kamera, lensa, proyektor, PlayStation, dan alat camping di Garut dan Bandung.</p><a class="cta" href="/#/Home">Buka aplikasi</a></div></section><div class="w">'
    for c in CITY:
        body += f'<h2><a href="/sewa/{c}.html">Rentalaja {CITY[c]}</a></h2><ul class="links">' + ''.join(f'<li><a href="/sewa/{cat}-{c}.html">{CAT[cat][1]} {CITY[c]}</a></li>' for (cc, cat) in D['pages'] if cc == c) + '</ul>'
    body += '<h2>Panduan sewa</h2><ul class="links">' + ''.join(f'<li><a href="/sewa/{n["slug"]}.html">{esc(n["title"])}</a></li>' for n in NEEDS) + '</ul></div></main>'
    ld = [{"@context": "https://schema.org", "@type": "Organization", "name": "Rentalaja", "url": BASE, "logo": BASE + '/logo.png', "parentOrganization": {"@type": "Organization", "name": "PT Popo Karya Investama"}}]
    return head('Rentalaja – Sewa Motor, iPhone, Kamera & Alat Camping di Garut dan Bandung', 'Sewa motor, mobil, iPhone, kamera, lensa, proyektor, PlayStation, dan alat camping di Garut dan Bandung. Booking online, DP 20%.', '/sewa/', ld) + body + foot(D)


ART_CSS = '<style>.art p,.art li{font-size:16px}.art h2{margin-top:30px}.meta{font-size:13px;color:var(--mute);margin:0 0 12px}</style>'


def items_of(D, cat, c):
    return D['pages'].get((c, cat), [])


def price_table(items):
    if not items: return '<p>Belum ada barang di kategori ini untuk saat ini. Tanyakan lewat WhatsApp.</p>'
    hj = any(x.get('j') for x in items); hh = any(x.get('h') for x in items)
    rows = ''.join(f'<tr><td><a href="/sewa/{it["pslug"]}.html">{esc(it["name"])}</a></td>' + (f'<td class="n">{rp(it.get("j"))}</td>' if hj else '') + (f'<td class="n">{rp(it.get("h"))}</td>' if hh else '') + f'<td class="n">{rp(it["d"])}</td></tr>' for it in items)
    return (f'<div class="scroll"><table><thead><tr><th>Barang</th>' + ('<th class="n">2 jam</th>' if hj else '') + ('<th class="n">½ hari</th>' if hh else '') +
            f'<th class="n">1 hari</th></tr></thead><tbody>{rows}</tbody></table></div><p style="font-size:13px;color:var(--mute)">Harga diperbarui otomatis dari sistem Rentalaja.</p>')


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
    lds = [{"@context": "https://schema.org", "@type": "Article", "headline": a['title'], "description": a['desc'], "datePublished": a['date'], "dateModified": datetime.date.today().isoformat(),
            "inLanguage": "id-ID", "mainEntityOfPage": BASE + path, "author": {"@type": "Organization", "name": "Rentalaja"},
            "publisher": {"@type": "Organization", "name": "Rentalaja", "logo": {"@type": "ImageObject", "url": BASE + '/logo.png'}}},
           crumbs_ld([('Rentalaja', '/sewa/'), ('Panduan', '/panduan/'), (a['title'], path)]), faq_ld(D)]
    if codes: lds.append({"@context": "https://schema.org", "@graph": [local_business(D, k) for k in codes]})
    cat0 = a['cats'][0]
    html_ = f"""<main><section class="hero"><div class="w">
<p class="crumb"><a href="/panduan/">Panduan</a></p>
<h1>{esc(a['title'])}</h1><p class="meta">Rentalaja · diperbarui {datetime.date.today().strftime('%d-%m-%Y')}</p>
<p class="lead">{lead}</p>
<a class="cta" href="/#/Katalog?cat={cat0}">Cek ketersediaan</a><a class="cta alt" href="https://wa.me/{WA}?text={quote('Halo Rentalaja, saya baca panduan: ' + a['title'])}" rel="nofollow">Tanya via WhatsApp</a>
</div></section>
<div class="w art">{body}
{('<h2>Panduan lain</h2><ul class="tips">' + ''.join(f'<li><a href="/panduan/{x["slug"]}">{esc(x["title"])}</a></li>' for x in others) + '</ul>') if others else ''}
<h2>Pertanyaan yang sering ditanya</h2>{faq_html(D)}</div></main>"""
    return head(a['title'] + ' | Rentalaja', a['desc'], path, lds).replace('</head>', ART_CSS + '</head>') + html_ + foot(D)


def page_articles(D):
    body = '<main><section class="hero"><div class="w"><h1>Panduan sewa Rentalaja</h1><p class="lead">Rute, tips, dan perbandingan barang untuk sewa di Garut dan Bandung. Harga di setiap panduan diambil langsung dari sistem Rentalaja.</p></div></section><div class="w"><ul class="tips">'
    body += ''.join(f'<li><a href="/panduan/{a["slug"]}"><b>{esc(a["title"])}</b></a><br><span style="color:var(--mute)">{esc(a["desc"])}</span></li>' for a in ARTICLES)
    body += '</ul></div></main>'
    lds = [crumbs_ld([('Rentalaja', '/sewa/'), ('Panduan', '/panduan/')])]
    return head('Panduan Sewa Motor, Kamera, iPhone & Camping di Garut dan Bandung | Rentalaja', 'Panduan rute, tips, dan perbandingan barang untuk sewa motor, kamera, iPhone, proyektor, dan alat camping di Garut dan Bandung.', '/panduan/', lds) + body + foot(D)


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
