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
})();
