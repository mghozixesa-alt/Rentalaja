/* Google Analytics 4 untuk rentalaja.co.id.
   - Tidak aktif di kasir/CS, demo, dan localhost.
   - URL dibersihkan sebelum dikirim: hanya nama layar (#/Produk), id produk, kategori, dan parameter kampanye.
     Token, id booking, dan data lain di URL tidak pernah dikirim ke Google. */
(function () {
  var ID = 'G-ZZ84XYDTHN';
  var h = location.hostname, p = location.pathname;
  if (!/(^|\.)rentalaja\.co\.id$/i.test(h) || /^(demo|kasir)\./i.test(h)) return;
  if (/^\/(kasir|cs|link\/statistik)\/?$/i.test(p)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);

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
    } else if (!/^#\//.test(location.hash) && /(^\/|rentalaja\.co\.id\/)#\/(Produk|Katalog|Home)/.test(href)) {
      var m = href.match(/#\/(Produk|Katalog|Home)/);
      gtag('event', 'klik_booking', { dari: where(), tujuan: m ? m[1] : '' });
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
        }
        if (Number(b.paid_amount) > 0 && !store('ga_pd_' + b.code) && b.status !== 'cancelled' && b.status !== 'expired') {
          store('ga_pd_' + b.code, '1');
          gtag('event', 'purchase', { transaction_id: b.code, value: Number(b.paid_amount) || 0, currency: 'IDR', booking_total: Number(b.total) || 0, items: items });
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
