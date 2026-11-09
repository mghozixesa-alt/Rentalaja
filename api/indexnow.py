"""IndexNow: memberi tahu Bing (dan mesin pencari lain yang ikut IndexNow) saat halaman berubah.
- Jadwal harian (Vercel cron): kirim halaman indeks + artikel panduan yang terbit/diperbarui 2 hari terakhir.
- Manual: /api/indexnow?all=1&k=<KEY> mengirim semua URL di sitemap (dipakai sekali saat pemasangan).
Kunci IndexNow memang publik (file /<KEY>.txt di root situs), jadi tidak ada rahasia di sini."""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request, json, re, datetime, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seo

KEY = '2848cbd57d6753bd36246c77468994a0'
HOST = 'rentalaja.co.id'


def urls_all():
    return re.findall(r'<loc>([^<]+)</loc>', seo.sitemap(seo.load()))


def urls_recent():
    since = (datetime.date.today() - datetime.timedelta(days=2)).isoformat()
    out = [seo.BASE + '/sewa/', seo.BASE + '/panduan/', seo.BASE + '/sewa/garut.html', seo.BASE + '/sewa/bandung.html']
    out += [seo.BASE + '/panduan/' + a['slug'] for a in seo.ARTICLES if a.get('date', '') >= since]
    return out


def submit(urls):
    body = json.dumps({'host': HOST, 'key': KEY, 'keyLocation': f'https://{HOST}/{KEY}.txt', 'urlList': urls[:10000]}).encode()
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body, method='POST',
                                 headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=12) as r: return r.status
    except urllib.error.HTTPError as e: return e.code


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = parse_qs(urlparse(self.path).query)
        cron = 'vercel-cron' in (self.headers.get('User-Agent') or '')
        manual = (q.get('k') or [''])[0] == KEY
        if not (cron or manual):
            code, out = 403, {'ok': False}
        else:
            urls = urls_all() if manual and (q.get('all') or [''])[0] == '1' else urls_recent()
            st = submit(urls)
            code, out = 200, {'ok': st in (200, 202), 'indexnow_status': st, 'submitted': len(urls)}
        data = json.dumps(out).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
