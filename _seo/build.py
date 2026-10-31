"""Bangun halaman SEO statis Rentalaja (per kota dan kategori) + sitemap.xml + robots.txt.
Pakai:  python3 build.py <folder_keluar> [BASE_URL]
Data dari data.txt (cabang|kategori|nama|id|harga_hari|harga_half|harga_2jam|foto).
Saat domain pindah, jalankan ulang dengan BASE_URL=https://rentalaja.co.id."""
import sys, os, json, html, collections, datetime

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
BASE = (sys.argv[2] if len(sys.argv) > 2 else 'https://rentalaja-app.vercel.app').rstrip('/')
IMG = 'https://shrvzlltysnbmgpkhjjg.supabase.co/storage/v1/object/public/publik/'
TODAY = datetime.date.today().isoformat()

BRANCH = {
    'GRT': dict(name='Rentalaja Garut Kota', city='garut', addr='Jl. Cimanuk No.24C, Paminggir, Kec. Garut Kota, Kabupaten Garut 44151',
                wa='6281324700077', lat=-7.2170974, lng=107.8994314, locality='Garut', postal='44151',
                maps='https://www.google.com/maps/place/?q=place_id:ChIJqct-WkmxaC4RR6C6v-3Vdf8'),
    'WNR': dict(name='Rentalaja Wanaraja', city='garut', addr='Jl. Raya Wanaraja, Situgede, Kec. Karangpawitan, Kabupaten Garut 44182',
                wa='6281324700077', lat=-7.1949789, lng=107.9666973, locality='Garut', postal='44182',
                maps='https://www.google.com/maps/place/?q=place_id:ChIJi_2qPwCzaC4RoEqCgQnFXGY'),
    'BDG-JKL': dict(name='Rentalaja Bandung (Dipatiukur)', city='bandung', addr='Jl. Kubang Selatan No.124, Lebakgede, Kec. Coblong, Kota Bandung 40132',
                    wa='6285286504910', lat=-6.8904641, lng=107.6180073, locality='Bandung', postal='40132',
                    maps='https://www.google.com/maps/place/?q=place_id:ChIJOxHAdFTnaC4R-D40RN36nMg'),
}
CITY = {'garut': 'Garut', 'bandung': 'Bandung'}
CAT = {  # slug: (label pendek, judul, kalimat pembuka)
    'motor': ('Motor', 'Sewa Motor', 'Motor matic terawat untuk keliling kota, ke kampus, atau wisata. Helm dan jas hujan siap.'),
    'mobil': ('Mobil', 'Sewa Mobil Lepas Kunci', 'Mobil lepas kunci untuk mudik, liburan keluarga, atau urusan kantor.'),
    'iphone': ('iPhone', 'Sewa iPhone', 'iPhone untuk konten, acara, atau sekadar mencoba sebelum beli.'),
    'kamera': ('Kamera', 'Sewa Kamera', 'Kamera mirrorless dan DSLR untuk foto, video, wisuda, dan prewedding.'),
    'lensa': ('Lensa', 'Sewa Lensa Kamera', 'Lensa fix dan zoom untuk Sony, Fujifilm, dan Canon.'),
    'proyektor': ('Proyektor', 'Sewa Proyektor', 'Proyektor dan layar untuk nobar, presentasi, dan acara.'),
    'game': ('PlayStation', 'Sewa PlayStation', 'PS2, PS3, dan PS4 untuk main di rumah, kos, atau acara.'),
    'camping': ('Camping', 'Sewa Alat Camping', 'Perlengkapan camping dan hiking untuk Papandayan, Guntur, dan Cikuray.'),
}
ORDER = ['motor', 'iphone', 'kamera', 'lensa', 'proyektor', 'game', 'camping', 'mobil']

def rp(v): return 'Rp' + f'{int(v):,}'.replace(',', '.') if v else '—'
def esc(s): return html.escape(str(s), quote=True)

rows = []
for line in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.txt'), encoding='utf-8'):
    line = line.rstrip('\n')
    if not line.strip(): continue
    br, cat, name, pid, d, h, j, ph = (line.split('|') + [''] * 8)[:8]
    rows.append(dict(br=br, cat=cat, name=name, id=pid, d=int(d) if d else None, h=int(h) if h else None, j=int(j) if j else None, ph=ph or None))

# gabung per kota+kategori (produk sama di dua cabang Garut → satu baris, ambil harga terendah, catat cabang)
pages = collections.OrderedDict()
for c in ['garut', 'bandung']:
    for cat in ORDER:
        items = collections.OrderedDict()
        for r in rows:
            if BRANCH[r['br']]['city'] != c or r['cat'] != cat: continue
            it = items.setdefault(r['id'], dict(r, branches=[]))
            it['branches'].append(r['br'])
            for k in ('d', 'h', 'j'):
                if r[k] and (not it[k] or r[k] < it[k]): it[k] = r[k]
        if items: pages[(c, cat)] = list(items.values())

CSS = """:root{--navy:#1F2B4D;--teal:#09BEAF;--teal-d:#077A70;--ink:#1F2B4D;--mute:#4A5468;--line:#E6E8EC;--bg:#F6F7F9}
*{box-sizing:border-box}body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.55}
a{color:var(--teal-d)}header.top{background:var(--navy);color:#fff}header.top .w{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px}
header.top a{color:#fff;text-decoration:none;font-weight:700}.w{max-width:960px;margin:0 auto;padding:0 16px}
.logo{height:28px;background:#fff;border-radius:6px;padding:3px 6px}
.hero{background:linear-gradient(180deg,#F1FBFA,#fff);padding:28px 0 8px}h1{font-size:28px;line-height:1.25;margin:0 0 10px;font-weight:800}
.lead{color:var(--mute);font-size:16px;margin:0 0 16px;max-width:680px}.cta{display:inline-block;background:var(--teal);color:var(--navy);font-weight:800;text-decoration:none;padding:12px 18px;border-radius:12px}
.cta.alt{background:#fff;border:1px solid var(--line);color:var(--navy);margin-left:8px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}.chips li{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;font-weight:600}
h2{font-size:20px;margin:28px 0 10px;font-weight:800}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}
.card{border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;background:#fff}
.card .ph{aspect-ratio:1/1;background:var(--bg);display:flex;align-items:center;justify-content:center;color:#8A93A6;font-size:12px}
.card img{width:100%;height:100%;object-fit:contain}.card .b{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}
.card h3{font-size:15px;margin:0;font-weight:800}.price{font-size:13px;color:var(--mute)}.price b{color:var(--ink);font-size:15px}
.card a.go{margin-top:auto;text-align:center;background:var(--navy);color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:9px;font-size:14px}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line)}th{color:var(--mute);font-weight:700}
td.n,th.n{text-align:right;white-space:nowrap}.scroll{overflow-x:auto}
.branch{border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:0 0 10px}.branch b{display:block}
details{border-bottom:1px solid var(--line);padding:10px 0}summary{font-weight:700;cursor:pointer}
footer{margin-top:40px;background:var(--bg);padding:24px 0;font-size:13px;color:var(--mute)}footer a{margin-right:12px}
.links{columns:2;padding-left:18px}@media(max-width:560px){h1{font-size:23px}.links{columns:1}.cta.alt{margin:8px 0 0}}"""

def head(title, desc, path, extra_ld):
    url = BASE + path
    return f"""<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}"><link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{BASE}/logo.png"><meta property="og:locale" content="id_ID">
<meta name="theme-color" content="#1F2B4D"><link rel="icon" href="/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>{CSS}</style>
{''.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>' for x in extra_ld)}
</head><body>
<header class="top"><div class="w"><a href="/sewa/"><img class="logo" src="/logo.png" alt="Rentalaja"></a><a href="/#/Home">Buka aplikasi →</a></div></header>"""

def foot():
    links = ''.join(f'<li><a href="/sewa/{cat}-{c}.html">{CAT[cat][1]} {CITY[c]}</a></li>' for (c, cat) in pages)
    return f"""<footer><div class="w"><h2 style="font-size:16px;margin-top:0">Semua layanan sewa</h2><ul class="links">{links}</ul>
<p>Rentalaja · PT Popo Karya Investama. <a href="/sewa/garut.html">Rentalaja Garut</a><a href="/sewa/bandung.html">Rentalaja Bandung</a><a href="/#/Bantuan">Bantuan</a></p></div></footer></body></html>"""

def local_business(code):
    b = BRANCH[code]
    return {"@type": "LocalBusiness", "@id": BASE + '/#' + code, "name": b['name'], "url": BASE + '/sewa/' + b['city'] + '.html',
            "telephone": '+' + b['wa'], "image": BASE + '/logo.png', "priceRange": "Rp5.000–Rp1.300.000",
            "address": {"@type": "PostalAddress", "streetAddress": b['addr'].split(',')[0], "addressLocality": b['locality'], "postalCode": b['postal'], "addressRegion": "Jawa Barat", "addressCountry": "ID"},
            "geo": {"@type": "GeoCoordinates", "latitude": b['lat'], "longitude": b['lng']}, "hasMap": b['maps'],
            "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], "opens": "07:30", "closes": "21:00"}]}

def branch_box(codes):
    out = []
    for code in codes:
        b = BRANCH[code]
        wa = f'https://wa.me/{b["wa"]}?text=' + html.escape('Halo Rentalaja, saya mau tanya sewa')
        out.append(f'<div class="branch"><b>{esc(b["name"])}</b>{esc(b["addr"])}<br>Buka setiap hari 07.30–21.00 · '
                   f'<a href="{wa}" rel="nofollow">WhatsApp</a> · <a href="{b["maps"]}" rel="nofollow">Peta</a></div>')
    return ''.join(out)

FAQ = [
    ('Apa syarat sewa di Rentalaja?', 'Unggah foto KTP dan satu dokumen pendukung (SIM, KK, STNK, atau NPWP) sekali saja di aplikasi. Untuk alat camping cukup KTP. Setelah lolos verifikasi, booking bisa dibayar.'),
    ('Berapa DP yang harus dibayar?', 'DP 20% dari total sewa setelah dokumen lolos verifikasi. Sisanya dibayar saat ambil barang di cabang.'),
    ('Bisa sewa 2 jam atau setengah hari?', 'Bisa untuk barang yang punya tarif jam, seperti kamera, lensa, iPhone, motor, proyektor, dan PlayStation. Pilih "2 jam" atau "½ hari" di halaman produk. Sewa 1,5 hari dihitung 1 hari + ½ hari.'),
    ('Bagaimana kalau telat mengembalikan?', 'Ada denda per jam sebesar 15% dari harga harian barang tersebut. Kabari cabang lewat WhatsApp kalau perlu perpanjang.'),
    ('Bisa diantar?', 'Bisa di beberapa cabang dengan ongkir sesuai jarak. Pilih "Diantar" saat booking, ongkir dikonfirmasi cabang.'),
]
def faq_html(): return ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in FAQ)
def faq_ld(): return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}

def card(it):
    img = f'<img src="{IMG + it["ph"]}" alt="{esc(it["name"])}" loading="lazy">' if it['ph'] else 'Foto segera'
    parts = []
    if it['j']: parts.append(f'2 jam {rp(it["j"])}')
    if it['h']: parts.append(f'½ hari {rp(it["h"])}')
    return (f'<div class="card"><div class="ph">{img}</div><div class="b"><h3>{esc(it["name"])}</h3>'
            f'<div class="price"><b>{rp(it["d"])}</b> / hari</div>'
            + (f'<div class="price">{" · ".join(parts)}</div>' if parts else '') +
            f'<a class="go" href="/#/Produk?id={it["id"]}">Cek tanggal</a></div></div>')

os.makedirs(os.path.join(OUT, 'sewa'), exist_ok=True)
urls = []

for (c, cat), items in pages.items():
    label, title_base, intro = CAT[cat]
    lo = min(x['d'] for x in items if x['d'])
    codes = sorted({b for it in items for b in it['branches']}, key=lambda x: list(BRANCH).index(x))
    path = f'/sewa/{cat}-{c}.html'
    title = f'{title_base} {CITY[c]} Mulai {rp(lo)}/Hari | Rentalaja'
    desc = f'{title_base} di {CITY[c]}: {len(items)} pilihan, mulai {rp(lo)} per hari' + (', ada tarif 2 jam dan ½ hari' if any(x['h'] for x in items) else '') + '. Cek ketersediaan dan booking online, DP 20%.'
    ld = [{"@context": "https://schema.org", "@graph": [local_business(k) for k in codes]},
          {"@context": "https://schema.org", "@type": "ItemList", "name": f'{title_base} {CITY[c]}', "itemListElement": [
              {"@type": "ListItem", "position": i + 1, "item": {"@type": "Product", "name": it['name'], "image": (IMG + it['ph']) if it['ph'] else None,
               "offers": {"@type": "Offer", "price": it['d'], "priceCurrency": "IDR", "availability": "https://schema.org/InStock", "url": f'{BASE}/#/Produk?id={it["id"]}'}}}
              for i, it in enumerate(items)]},
          {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Rentalaja", "item": BASE + '/sewa/'},
              {"@type": "ListItem", "position": 2, "name": CITY[c], "item": f'{BASE}/sewa/{c}.html'},
              {"@type": "ListItem", "position": 3, "name": label, "item": BASE + path}]},
          faq_ld()]
    has_jam = any(x['j'] or x['h'] for x in items)
    table_rows = ''.join(f'<tr><td>{esc(it["name"])}</td>' + (f'<td class="n">{rp(it["j"])}</td><td class="n">{rp(it["h"])}</td>' if has_jam else '') + f'<td class="n">{rp(it["d"])}</td></tr>' for it in items)
    body = f"""<main><section class="hero"><div class="w">
<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:var(--teal-d)"><a href="/sewa/{c}.html">Rentalaja {CITY[c]}</a> › {label}</p>
<h1>{esc(title_base)} di {CITY[c]}</h1><p class="lead">{esc(intro)} {len(items)} pilihan mulai {rp(lo)} per hari. Booking online, cukup DP 20% setelah verifikasi.</p>
<a class="cta" href="/#/Katalog">Cek ketersediaan</a><a class="cta alt" href="https://wa.me/{BRANCH[codes[0]]['wa']}" rel="nofollow">Tanya via WhatsApp</a>
<ul class="chips"><li>Booking online</li><li>DP 20%</li>{'<li>Ada tarif 2 jam & ½ hari</li>' if has_jam else ''}<li>Buka 07.30–21.00</li></ul></div></section>
<div class="w"><h2>Pilihan {label.lower() if label != 'iPhone' else label} di {CITY[c]}</h2><div class="grid">{''.join(card(it) for it in items)}</div>
<h2>Daftar harga sewa {label} {CITY[c]}</h2><div class="scroll"><table><thead><tr><th>Barang</th>{'<th class="n">2 jam</th><th class="n">½ hari</th>' if has_jam else ''}<th class="n">1 hari</th></tr></thead><tbody>{table_rows}</tbody></table></div>
<p style="font-size:13px;color:var(--mute)">Harga per {TODAY}. Sewa lebih dari 1 hari dihitung per hari; sisa sampai 12 jam dihitung ½ hari.</p>
<h2>Lokasi ambil</h2>{branch_box(codes)}
<h2>Pertanyaan yang sering ditanya</h2>{faq_html()}</div></main>"""
    open(os.path.join(OUT, path.lstrip('/')), 'w', encoding='utf-8').write(head(title, desc, path, ld) + body + foot())
    urls.append(path)

# halaman kota
for c in ['garut', 'bandung']:
    cats = [(cat, items) for (cc, cat), items in pages.items() if cc == c]
    codes = [k for k, b in BRANCH.items() if b['city'] == c]
    path = f'/sewa/{c}.html'
    title = f'Rentalaja {CITY[c]} – Sewa {", ".join(CAT[cat][0] for cat, _ in cats[:4])} & Lainnya'
    desc = f'Rentalaja {CITY[c]}: sewa ' + ', '.join(CAT[cat][0].lower() if CAT[cat][0] != 'iPhone' else 'iPhone' for cat, _ in cats) + '. Booking online, DP 20%, buka setiap hari 07.30–21.00.'
    tiles = ''.join(f'<div class="card"><div class="b"><h3>{CAT[cat][1]} {CITY[c]}</h3><div class="price">{len(items)} pilihan · mulai <b>{rp(min(x["d"] for x in items if x["d"]))}</b>/hari</div>'
                    f'<a class="go" href="/sewa/{cat}-{c}.html">Lihat harga</a></div></div>' for cat, items in cats)
    ld = [{"@context": "https://schema.org", "@graph": [local_business(k) for k in codes]}, faq_ld()]
    body = f"""<main><section class="hero"><div class="w"><h1>Rentalaja {CITY[c]}</h1>
<p class="lead">Nggak semua harus dibeli. Sewa saat butuh: {', '.join(CAT[cat][0] for cat, _ in cats)}. Cek stok dan booking langsung dari HP.</p>
<a class="cta" href="/#/Home">Buka aplikasi Rentalaja</a></div></section>
<div class="w"><h2>Kategori sewa di {CITY[c]}</h2><div class="grid">{tiles}</div>
<h2>Cabang Rentalaja di {CITY[c]}</h2>{branch_box(codes)}<h2>Pertanyaan yang sering ditanya</h2>{faq_html()}</div></main>"""
    open(os.path.join(OUT, path.lstrip('/')), 'w', encoding='utf-8').write(head(title, desc, path, ld) + body + foot())
    urls.insert(0, path)

# indeks
path = '/sewa/'
body = '<main><section class="hero"><div class="w"><h1>Sewa di Rentalaja</h1><p class="lead">Motor, mobil, iPhone, kamera, lensa, proyektor, PlayStation, dan alat camping di Garut dan Bandung.</p><a class="cta" href="/#/Home">Buka aplikasi</a></div></section><div class="w">'
for c in ['garut', 'bandung']:
    body += f'<h2><a href="/sewa/{c}.html">Rentalaja {CITY[c]}</a></h2><ul class="links">' + ''.join(f'<li><a href="/sewa/{cat}-{c}.html">{CAT[cat][1]} {CITY[c]}</a></li>' for (cc, cat) in pages if cc == c) + '</ul>'
body += '</div></main>'
open(os.path.join(OUT, 'sewa', 'index.html'), 'w', encoding='utf-8').write(
    head('Rentalaja – Sewa Motor, iPhone, Kamera & Alat Camping di Garut dan Bandung', 'Sewa motor, mobil, iPhone, kamera, lensa, proyektor, PlayStation, dan alat camping di Garut dan Bandung. Booking online, DP 20%.', path,
         [{"@context": "https://schema.org", "@type": "Organization", "name": "Rentalaja", "url": BASE, "logo": BASE + '/logo.png',
           "parentOrganization": {"@type": "Organization", "name": "PT Popo Karya Investama"}}]) + body + foot())
urls.insert(0, path)

sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(
    f'<url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>{"1.0" if u == "/sewa/" else "0.8"}</priority></url>\n' for u in urls) + '</urlset>\n'
open(os.path.join(OUT, 'sitemap.xml'), 'w').write(sm)
open(os.path.join(OUT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nDisallow: /r-\n\nSitemap: {BASE}/sitemap.xml\n')
print(len(urls), 'halaman')
