/* Google Analytics 4 untuk rentalaja.co.id.
   - Tidak aktif di kasir/CS, demo, dan localhost.
   - URL dibersihkan sebelum dikirim: hanya nama layar (#/Produk), id produk, kategori, dan parameter kampanye.
     Token, id booking, dan data lain di URL tidak pernah dikirim ke Google. */
(function () {
  var ID = 'G-ZZ84XYDTHN';
  var META_ID = '2200282827592140'; // Meta Pixel (dataset) "Rentalaja Web" di portfolio bisnis Rentalaja; kosongkan untuk mematikan
  var h = location.hostname, p = location.pathname;
  if (!/(^|\.)rentalaja\.co\.id$/i.test(h) || /^(demo|kasir)\./i.test(h)) return;
  if (/^\/(kasir|cs|link\/statistik)\/?$/i.test(p)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);

  // ---- Meta Pixel (opsional) ----
  // Tanpa pencocokan data pelanggan (advanced matching) dan tanpa deteksi event otomatis: hanya event di bawah yang dikirim.
  function fb() {}
  if (META_ID) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('set', 'autoConfig', false, META_ID);
    window.fbq('init', META_ID);
    fb = function (ev, params, id) { try { window.fbq('track', ev, params || {}, id ? { eventID: id } : undefined); } catch (e) {} };
  }

  var KEEP = /^(utm_[a-z]+|gclid|fbclid|src)$/;
  function clean() {
    var q = new URLSearchParams(location.search), out = new URLSearchParams();
    q.forEach(function (v, k) { if (KEEP.test(k)) out.set(k, v); });
    var hash = '', m = location.hash.match(/^#\/([A-Za-z]+)(?:\?(.*))?/);
    if (m) {
      var hq = new URLSearchParams(m[2] || ''), keep = new URLSearchParams();
      if (m[1] === 'Produk' && hq.get('id')) keep.set('id', hq.get('id'));
      if (m[1] === 'Katalog' && hq.get('cat')) keep.set('cat', hq.get('cat'));
      hash = '#/' + m[1] + (keep.toString() ? '?' + keep : '');
    }
    var qs = out.toString();
    return location.origin + p + (qs ? '?' + qs : '') + hash;
  }

  gtag('js', new Date());
  gtag('config', ID, { send_page_view: false, page_location: clean() });
  var last = '';
  function pv() {
    var loc = clean();
    if (loc === last) return;
    last = loc;
    gtag('set', { page_location: loc });
    gtag('event', 'page_view', { page_location: loc, page_title: document.title });
    fb('PageView');
    var pm = location.hash.match(/^#\/Produk\?(.*)/);
    if (pm) fb('ViewContent', { content_ids: [new URLSearchParams(pm[1]).get('id') || ''], content_type: 'product' });
  }
  pv();
  window.addEventListener('hashchange', function () { setTimeout(pv, 50); });

  // ---- Key events ----
  function where() { var m = location.hash.match(/^#\/([A-Za-z]+)/); return m ? m[1] : (p.replace(/\.html$/, '') || '/'); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // 1) Klik WhatsApp, 2) klik Booking dari halaman SEO / link bio
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(href)) {
      gtag('event', 'klik_whatsapp', { dari: where() });
      fb('Contact', { dari: where() });
    } else if (!/^#\//.test(location.hash) && /(^\/|rentalaja\.co\.id\/)#\/(Produk|Katalog|Home)/.test(href)) {
      var m = href.match(/#\/(Produk|Katalog|Home)/);
      gtag('event', 'klik_booking', { dari: where(), tujuan: m ? m[1] : '' });
      fb('Lead', { dari: where() });
    }
  }, true);

  // 3) Booking dibuat, 4) DP terbayar — dibaca dari layar Bayar/Status milik pelanggan sendiri.
  //    Yang dikirim ke Google hanya kode booking, nilai rupiah, dan nama/kategori barang.
  var timer = null, polls = 0;
  function checkBooking() {
    var m = location.hash.match(/^#\/(Bayar|Status)\?(.*)/);
    if (!m || !window.RA || !RA.from) return;
    var id = new URLSearchParams(m[2]).get('id');
    if (!id) return;
    RA.from('bookings').select('code,status,total,paid_amount,dp_amount,created_at,booking_items(quantity,line_total,products(name,categories(slug)))')
      .eq('id', id).limit(1).then(function (r) {
        var b = r && (r.data || r)[0];
        if (!b || !b.code) return;
        var items = (b.booking_items || []).map(function (it) {
          var pr = it.products || {};
          return { item_name: pr.name || '', item_category: (pr.categories || {}).slug || '', quantity: it.quantity || 1, price: it.quantity ? Math.round((it.line_total || 0) / it.quantity) : 0 };
        });
        var fresh = Date.now() - new Date(b.created_at).getTime() < 60 * 60 * 1000;
        if (fresh && !store('ga_bk_' + b.code)) {
          store('ga_bk_' + b.code, '1');
          gtag('event', 'booking_dibuat', { transaction_id: b.code, value: Number(b.total) || 0, currency: 'IDR', items: items });
          fb('InitiateCheckout', { value: Number(b.total) || 0, currency: 'IDR', num_items: items.length }, 'bk_' + b.code);
        }
        if (Number(b.paid_amount) > 0 && !store('ga_pd_' + b.code) && b.status !== 'cancelled' && b.status !== 'expired') {
          store('ga_pd_' + b.code, '1');
          gtag('event', 'purchase', { transaction_id: b.code, value: Number(b.paid_amount) || 0, currency: 'IDR', booking_total: Number(b.total) || 0, items: items });
          fb('Purchase', { value: Number(b.paid_amount) || 0, currency: 'IDR', num_items: items.length }, 'pd_' + b.code);
          clearInterval(timer); timer = null;
        }
      }, function () {});
  }
  function watch() {
    clearInterval(timer); timer = null; polls = 0;
    if (!/^#\/(Bayar|Status)\?/.test(location.hash)) return;
    setTimeout(checkBooking, 1500);
    timer = setInterval(function () { if (++polls > 80) { clearInterval(timer); timer = null; } else checkBooking(); }, 15000);
  }
  watch();
  window.addEventListener('hashchange', watch);
})();

/* Asal kunjungan untuk halaman SEO (/sewa, /panduan): tombol ke aplikasi diberi utm_* supaya booking yang terjadi
   tercatat asalnya (kolom bookings.utm → laporan sumber & dashboard marketing). Sumber diambil dari halaman pertama
   yang dibuka (referrer), disimpan per sesi tab. Tidak memuat data pribadi. */
(function () {
  if (!/^\/(sewa|panduan)(\/|$)/.test(location.pathname)) return;
  var st = null, rh = '';
  try { st = JSON.parse(sessionStorage.getItem('ra.seo') || 'null'); } catch (e) {}
  try { rh = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) {}
  if (rh === location.hostname) rh = '';
  if (rh || !st) {
    var q = new URLSearchParams(location.search);
    var src = (q.get('utm_source') || q.get('src') || '').toLowerCase()
      || (/(^|\.)google\./.test(rh) ? 'google' : /(^|\.)bing\./.test(rh) ? 'bing' : /chatgpt|openai/.test(rh) ? 'chatgpt'
        : /perplexity/.test(rh) ? 'perplexity' : /copilot/.test(rh) ? 'copilot' : /yahoo|duckduckgo|yandex|ecosia/.test(rh) ? rh.split('.')[0]
        : /instagram/.test(rh) ? 'ig' : /tiktok/.test(rh) ? 'tt' : /facebook|fb\./.test(rh) ? 'fb' : rh || 'langsung');
    var med = q.get('utm_medium') || (/^(google|bing|yahoo|duckduckgo|yandex|ecosia)$/.test(src) ? 'organic'
      : /^(chatgpt|perplexity|copilot)$/.test(src) ? 'ai' : src === 'langsung' ? 'seo' : 'referral');
    st = { s: src.slice(0, 30), m: med.slice(0, 30), c: ('seo' + location.pathname).slice(0, 60) };
    try { sessionStorage.setItem('ra.seo', JSON.stringify(st)); } catch (e) {}
  }
  function tag() {
    document.querySelectorAll('a[href^="/#/"]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (/[?&]utm_source=/.test(h)) return;
      a.setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'utm_source=' + encodeURIComponent(st.s)
        + '&utm_medium=' + encodeURIComponent(st.m) + '&utm_campaign=' + encodeURIComponent(st.c));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tag); else tag();
})();

