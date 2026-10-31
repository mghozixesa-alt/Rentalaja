/* Rentalaja · lapisan data: koneksi ke Supabase (tanpa pustaka luar), login WhatsApp, format, konteks keranjang, hak akses.
   Semua layar memakai window.RA. */
(function () {
  'use strict';
  var C = window.RA_CONFIG || {};
  var LS = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var RA = window.RA = { config: C, ls: LS };
  var session = LS.get('ra.session');
  var refreshing = null;

  /* ---------------- sesi ---------------- */
  function setSession(s) {
    session = s && s.access_token ? s : null;
    if (session && !session.expires_at && session.expires_in) session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
    if (session) LS.set('ra.session', session); else { LS.del('ra.session'); LS.del('ra.user'); RA._me = null; RA._perms = null; }
  }
  function refresh() {
    if (!session || !session.refresh_token) { setSession(null); return Promise.resolve(); }
    if (refreshing) return refreshing;
    refreshing = fetch(C.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: C.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { setSession(d && d.access_token ? d : null); })
      .catch(function () { /* jaringan putus: biarkan sesi lama */ })
      .then(function () { refreshing = null; });
    return refreshing;
  }
  function token() {
    if (session && session.expires_at && session.expires_at * 1000 < Date.now() + 60000) return refresh().then(function () { return session && session.access_token; });
    return Promise.resolve(session && session.access_token);
  }
  function headers(extra) {
    return token().then(function (t) {
      var h = { apikey: C.key, Authorization: 'Bearer ' + (t || C.key) };
      for (var k in (extra || {})) h[k] = extra[k];
      return h;
    });
  }
  RA.isLoggedIn = function () { return !!session; };
  RA.session = function () { return session; };

  /* ---------------- login Google (Supabase OAuth, alur implicit) ---------------- */
  function b64url(s) { s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; try { return decodeURIComponent(escape(atob(s))); } catch (e) { return ''; } }
  RA.googleLogin = function () {
    var back = location.origin + location.pathname;
    location.href = C.url + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(back);
  };
  (function captureOAuth() {
    var h = location.hash || '';
    if (h.indexOf('access_token=') < 0 && h.indexOf('error_description=') < 0) return;
    var p = {}; new URLSearchParams(h.replace(/^#/, '')).forEach(function (v, k) { p[k] = v; });
    if (p.access_token) {
      var claims = {}; try { claims = JSON.parse(b64url(p.access_token.split('.')[1])) || {}; } catch (e) {}
      var meta = claims.user_metadata || {};
      var user = { id: claims.sub, email: claims.email || null, name: meta.full_name || meta.name || null, provider: 'google' };
      setSession({ access_token: p.access_token, refresh_token: p.refresh_token, expires_in: +p.expires_in || 3600, expires_at: +p.expires_at || undefined, token_type: p.token_type || 'bearer', user: user });
      LS.set('ra.user', user); RA._me = user; RA._perms = null; RA._staff = null; RA._cust = null;
      history.replaceState(null, '', location.pathname + location.search + '#/Login?google=1');
    } else {
      history.replaceState(null, '', location.pathname + location.search + '#/Login?gerr=' + encodeURIComponent(p.error_description || 'Login Google gagal'));
    }
  })();

  /* ---------------- pesan galat yang ramah ---------------- */
  function friendly(msg) {
    msg = String(msg || '');
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Koneksi internet terputus. Coba lagi.';
    if (/JWT expired/i.test(msg)) return 'Sesi habis, silakan masuk lagi.';
    if (/row-level security|permission denied/i.test(msg)) return 'Anda tidak punya akses untuk tindakan ini.';
    if (/no_double_booking|exclusion/i.test(msg)) return 'Unit baru saja dipesan orang lain. Coba unit atau tanggal lain.';
    return msg.replace(/^ERROR:\s*/, '');
  }
  RA.friendly = friendly;

  /* ---------------- REST (PostgREST) ---------------- */
  function enc(v) { return encodeURIComponent(v); }
  function lit(v) { v = v === null ? 'null' : String(v); return /[,()"\s]/.test(v) ? '"' + v.replace(/"/g, '\\"') + '"' : v; }
  function Q(table) { this.t = table; this.p = []; this.m = 'GET'; this.b = undefined; this.pref = []; this.acc = null; this.maybe = false; }
  Q.prototype.select = function (cols, o) {
    this.p.push('select=' + enc((cols || '*').replace(/\s+/g, '')));
    if (o && o.count) this.pref.push('count=' + o.count);
    if (o && o.head) this.m = 'HEAD';
    if (this.m !== 'GET' && this.m !== 'HEAD') this.pref.push('return=representation');
    return this;
  };
  ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike'].forEach(function (op) {
    Q.prototype[op] = function (c, v) { this.p.push(enc(c) + '=' + op + '.' + enc(v)); return this; };
  });
  Q.prototype.is = function (c, v) { this.p.push(enc(c) + '=is.' + v); return this; };
  Q.prototype.in = function (c, arr) { this.p.push(enc(c) + '=in.(' + arr.map(function (x) { return enc(lit(x)); }).join(',') + ')'); return this; };
  Q.prototype.contains = function (c, arr) { this.p.push(enc(c) + '=cs.{' + arr.map(function (x) { return enc(lit(x)); }).join(',') + '}'); return this; };
  Q.prototype.not = function (c, op, v) { this.p.push(enc(c) + '=not.' + op + '.' + enc(v)); return this; };
  Q.prototype.or = function (expr) { this.p.push('or=(' + enc(expr) + ')'); return this; };
  Q.prototype.order = function (c, o) { this.p.push('order=' + enc(c) + '.' + (o && o.ascending === false ? 'desc' : 'asc') + (o && o.nullsFirst ? '.nullsfirst' : '.nullslast')); return this; };
  Q.prototype.limit = function (n) { this.p.push('limit=' + n); return this; };
  Q.prototype.range = function (a, b) { this.p.push('offset=' + a); this.p.push('limit=' + (b - a + 1)); return this; };
  Q.prototype.single = function () { this.acc = 'application/vnd.pgrst.object+json'; return this; };
  Q.prototype.maybeSingle = function () { this.acc = 'application/vnd.pgrst.object+json'; this.maybe = true; return this; };
  Q.prototype.insert = function (rows, o) { this.m = 'POST'; this.b = rows; this.pref.push(o && o.returning === 'minimal' ? 'return=minimal' : 'return=representation'); if (o && o.upsert) this.pref.push('resolution=merge-duplicates'); if (o && o.onConflict) this.p.push('on_conflict=' + enc(o.onConflict)); return this; };
  Q.prototype.upsert = function (rows, o) { return this.insert(rows, { upsert: true, onConflict: o && o.onConflict }); };
  Q.prototype.update = function (obj) { this.m = 'PATCH'; this.b = obj; this.pref.push('return=representation'); return this; };
  Q.prototype.delete = function () { this.m = 'DELETE'; this.pref.push('return=representation'); return this; };
  Q.prototype.exec = function () {
    var self = this;
    var extra = { 'Content-Type': 'application/json' };
    if (self.pref.length) extra.Prefer = self.pref.join(',');
    if (self.acc) extra.Accept = self.acc;
    return headers(extra).then(function (h) {
      return fetch(C.url + '/rest/v1/' + self.t + (self.p.length ? '?' + self.p.join('&') : ''), {
        method: self.m, headers: h, body: self.b === undefined ? undefined : JSON.stringify(self.b)
      });
    }).then(function (r) {
      var cr = r.headers.get('content-range'); var count = cr && cr.indexOf('/') > -1 ? +cr.split('/')[1] : null;
      return r.text().then(function (txt) {
        var d = null; try { d = txt ? JSON.parse(txt) : null; } catch (e) { d = txt; }
        if (!r.ok) {
          if (self.maybe && (r.status === 406 || (d && d.code === 'PGRST116'))) return { data: null, error: null, count: count };
          return { data: null, error: { message: friendly(d && (d.message || d.error_description || d.msg) || r.statusText), code: d && d.code, status: r.status }, count: count };
        }
        return { data: d, error: null, count: count };
      });
    }).catch(function (e) { return { data: null, error: { message: friendly(e.message) }, count: null }; });
  };
  Q.prototype.then = function (a, b) { return this.exec().then(a, b); };
  RA.from = function (t) { return new Q(t); };

  /* RPC: {data, error} */
  RA.rpc = function (fn, args) {
    return headers({ 'Content-Type': 'application/json' }).then(function (h) {
      return fetch(C.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: h, body: JSON.stringify(args || {}) });
    }).then(function (r) {
      return r.text().then(function (txt) {
        var d = null; try { d = txt ? JSON.parse(txt) : null; } catch (e) { d = txt; }
        if (!r.ok) return { data: null, error: { message: friendly(d && (d.message || d.hint) || r.statusText), code: d && d.code } };
        return { data: d, error: null };
      });
    }).catch(function (e) { return { data: null, error: { message: friendly(e.message) } }; });
  };
  /* RPC yang melempar galat (untuk aksi tombol) */
  RA.call = function (fn, args) { return RA.rpc(fn, args).then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; }); };
  /* query yang melempar galat */
  RA.q = function (q) { return q.exec().then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; }); };

  /* Edge function */
  RA.fn = function (name, body) {
    return headers({ 'Content-Type': 'application/json' }).then(function (h) {
      return fetch(C.url + '/functions/v1/' + name, { method: 'POST', headers: h, body: JSON.stringify(body || {}) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.error) throw new Error(friendly(d.error || d.message || r.statusText)); return d; });
    });
  };

  /* Storage */
  RA.upload = function (bucket, path, file) {
    return headers({ 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }).then(function (h) {
      return fetch(C.url + '/storage/v1/object/' + bucket + '/' + path, { method: 'POST', headers: h, body: file });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(friendly(d.message || d.error || 'Gagal mengunggah')); return path; }); });
  };
  RA.signedUrl = function (bucket, path, secs) {
    return headers({ 'Content-Type': 'application/json' }).then(function (h) {
      return fetch(C.url + '/storage/v1/object/sign/' + bucket + '/' + path, { method: 'POST', headers: h, body: JSON.stringify({ expiresIn: secs || 600 }) });
    }).then(function (r) { return r.json(); }).then(function (d) { var u = d.signedURL || d.signedUrl; return u ? (/^https?:/.test(u) ? u : C.url + '/storage/v1' + u) : null; });
  };
  RA.publicUrl = function (path) { if (!path) return ''; if (/^(https?:|data:|\/|logo\.png)/.test(path)) return path; return C.url + '/storage/v1/object/public/publik/' + path; };
  RA.photo = function (arr, i) { arr = arr || []; return arr.length ? RA.publicUrl(arr[i || 0]) : ''; };

  /* ---------------- login WhatsApp ---------------- */
  RA.normPhone = function (raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('0') === 0) d = '62' + d.slice(1); else if (d.indexOf('8') === 0) d = '62' + d;
    return /^62\d{8,13}$/.test(d) ? d : null;
  };
  RA.requestOtp = function (phone, purpose) { return RA.fn('auth-otp', { action: 'request', phone: phone, purpose: purpose || 'login' }); };
  RA.verifyOtp = function (phone, code, purpose) {
    return RA.fn('auth-otp', { action: 'verify', phone: phone, code: code, purpose: purpose || 'login' }).then(function (d) {
      if (!d.session) return d;
      setSession(d.session); LS.set('ra.user', d.user); RA._me = d.user; RA._perms = null; RA._staff = null; RA._cust = null;
      return RA.rpc('claim_my_access', {}).then(function (c) { if (c.data) d.access = c.data; return d; });
    });
  };
  /* ---------------- verifikasi dua langkah (TOTP, Supabase MFA) ---------------- */
  function authApi(method, path, body) {
    return headers({ 'Content-Type': 'application/json' }).then(function (h) {
      return fetch(C.url + '/auth/v1/' + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined });
    }).then(function (r) {
      return r.text().then(function (t) {
        var d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
        if (!r.ok) throw new Error(friendly(d && (d.msg || d.message || d.error_description || d.error) || r.statusText));
        return d;
      });
    });
  }
  RA.twofa = {
    status: function () { return RA.call('my_twofa', {}); },
    factors: function () { return authApi('GET', 'user').then(function (u) { return (u && u.factors) || []; }); },
    /* daftar baru: hapus faktor yang belum selesai didaftarkan, lalu buat yang baru (QR + kunci) */
    enroll: function () {
      return RA.twofa.factors().then(function (fs) {
        return Promise.all(fs.filter(function (f) { return f.status !== 'verified'; }).map(function (f) { return authApi('DELETE', 'factors/' + f.id).catch(function () {}); }));
      }).then(function () {
        return authApi('POST', 'factors', { factor_type: 'totp', friendly_name: 'Rentalaja ' + new Date().toISOString().slice(0, 16), issuer: 'Rentalaja' });
      });
    },
    /* tantangan + verifikasi kode 6 digit; sesi diganti dengan sesi 2FA (aal2) */
    verify: function (factorId, code) {
      return authApi('POST', 'factors/' + factorId + '/challenge', {}).then(function (ch) {
        return authApi('POST', 'factors/' + factorId + '/verify', { challenge_id: ch.id, code: String(code || '').replace(/\D/g, '') });
      }).then(function (d) {
        if (d && d.access_token) { setSession(d); RA._perms = null; RA._staff = null; }
        return d;
      });
    }
  };
  /* bila akun staf wajib 2FA tapi sesi belum 2FA: arahkan ke layar Mfa, simpan tujuan */
  RA.twofaGate = function (next) {
    return RA.twofa.status().then(function (t) {
      if (t && t.staff && t.required && !t.aal2) { if (!RA.ctx().next) RA.setCtx({ next: next || RA.staffHome(t.role) }); return 'Mfa'; }
      return null;
    }).catch(function () { return null; });
  };
  RA.signOut = function () { setSession(null); LS.del('ra.ctx.staff'); };
  RA.me = function () { return RA._me || (RA._me = LS.get('ra.user')); };

  /* profil pelanggan (baris customers milik sendiri) */
  RA.customer = function (force) {
    if (!session) return Promise.resolve(null);
    if (RA._cust && !force) return Promise.resolve(RA._cust);
    return RA.from('customers').select('*').eq('user_id', session.user ? session.user.id : (RA.me() || {}).id).maybeSingle()
      .then(function (r) { RA._cust = r.data || null; return RA._cust; });
  };
  RA.ensureCustomer = function (name, city) { return RA.call('ensure_customer', { p_name: name || null, p_city: city || null, p_ref: LS.get('ra.ref') || null }).then(function (c) { RA._cust = c; return c; }); };

  /* staf & hak akses */
  RA.staff = function (force) {
    if (!session) return Promise.resolve(null);
    if (RA._staff && !force) return Promise.resolve(RA._staff);
    var uid = (RA.me() || {}).id || (session.user && session.user.id);
    return RA.from('staff').select('*').eq('user_id', uid).maybeSingle().then(function (r) {
      var s = r.data; if (!s || !s.is_active) { RA._staff = null; return null; }
      return Promise.all([
        RA.from('role_permissions').select('perm,limited').eq('role', s.role),
        s.all_branches ? RA.from('branches').select('id,code,name,kind,city').order('sort') :
          RA.from('staff_branches').select('branch_id,branches(id,code,name,kind,city)').eq('staff_id', uid)
      ]).then(function (res) {
        s.perms = {}; (res[0].data || []).forEach(function (p) { s.perms[p.perm] = p.limited ? 'limited' : true; });
        s.branches = s.all_branches ? (res[1].data || []) : (res[1].data || []).map(function (x) { return x.branches; }).filter(Boolean);
        RA._staff = s; return s;
      });
    });
  };
  RA.can = function (perm) { var s = RA._staff; if (!s) return false; if (s.role === 'owner') return true; return !!(s.perms && s.perms[perm]); };
  /* cabang aktif untuk panel staf */
  RA.staffBranch = function () {
    var s = RA._staff; if (!s || !s.branches || !s.branches.length) return null;
    var id = LS.get('ra.staff.branch'); var b = s.branches.filter(function (x) { return x.id === id; })[0];
    return b || s.branches[0];
  };
  RA.setStaffBranch = function (id) { LS.set('ra.staff.branch', id); };

  /* ---------------- pengaturan (aturan bisnis) ---------------- */
  RA.settings = function (force) {
    if (RA._set && !force && RA._setAuth === !!session) return Promise.resolve(RA._set);
    RA._setAuth = !!session;
    return RA.from('settings').select('key,value,grp,label,unit,value_type').then(function (r) {
      var m = {}; (r.data || []).forEach(function (x) { m[x.key] = x.value; }); RA._set = m; return m;
    });
  };
  RA.setting = function (k) { return RA._set ? (RA._set[k] === undefined ? null : RA._set[k]) : null; };
  RA.simulation = function () { return RA.setting('payment_mode') !== 'live'; };

  /* ---------------- format ---------------- */
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var HARIL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  RA.BLN = BLN; RA.BULAN = BULAN; RA.HARI = HARI; RA.HARIL = HARIL;
  RA.rp = function (n) { if (n === null || n === undefined || n === '' || isNaN(+n)) return '—'; n = Math.round(+n); return (n < 0 ? '−' : '') + 'Rp' + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  RA.rpShort = function (n) {
    if (n === null || n === undefined || isNaN(+n)) return '—'; n = +n; var a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e9) return s + 'Rp' + (a / 1e9).toFixed(1).replace('.', ',').replace(',0', '') + ' M';
    if (a >= 1e6) return s + 'Rp' + (a / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' jt';
    if (a >= 1e3) return s + 'Rp' + Math.round(a / 1e3) + ' rb';
    return RA.rp(n);
  };
  RA.num = function (n) { return n == null ? '—' : Math.round(+n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  RA.pct = function (n, d) { return n == null || isNaN(+n) ? '—' : (+n).toFixed(d || 0).replace('.', ',') + '%'; };
  function D(x) { return x instanceof Date ? x : new Date(x); }
  RA.d = D;
  RA.pad = function (n) { return String(n).padStart(2, '0'); };
  RA.time = function (x) { if (!x) return '—'; x = D(x); return RA.pad(x.getHours()) + '.' + RA.pad(x.getMinutes()); };
  RA.date = function (x) { if (!x) return '—'; x = D(x); return x.getDate() + ' ' + BLN[x.getMonth()]; };
  RA.dateY = function (x) { if (!x) return '—'; x = D(x); return x.getDate() + ' ' + BLN[x.getMonth()] + ' ' + x.getFullYear(); };
  RA.day = function (x) { if (!x) return '—'; x = D(x); return HARI[x.getDay()] + ', ' + x.getDate() + ' ' + BLN[x.getMonth()]; };
  RA.dayTime = function (x) { if (!x) return '—'; return RA.day(x) + ' · ' + RA.time(x); };
  RA.monthYear = function (x) { x = D(x || new Date()); return BULAN[x.getMonth()] + ' ' + x.getFullYear(); };
  RA.iso = function (x) { x = D(x); return x.getFullYear() + '-' + RA.pad(x.getMonth() + 1) + '-' + RA.pad(x.getDate()); };
  RA.ago = function (x) {
    if (!x) return '—'; var s = (Date.now() - D(x).getTime()) / 1000;
    if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' menit lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    return Math.floor(s / 86400) + ' hari lalu';
  };
  RA.days = function (a, b) { return Math.max(1, Math.ceil((D(b) - D(a)) / 86400000)); };
  /* label durasi: <=12 jam ditulis jam, sisa <=12 jam setelah hari penuh ditulis ,5 hari (sama dengan aturan harga di server) */
  RA.durText = function (a, b) {
    var h = (D(b) - D(a)) / 3600000; if (!(h > 0)) return '0 jam';
    if (h <= 12) return Math.round(h) === 12 ? '½ hari' : Math.max(1, Math.round(h)) + ' jam';
    if (h < 24) return '1 hari';
    var f = Math.floor(h / 24), r = h - f * 24;
    if (r > 0 && r <= 12) return f + ',5 hari';
    return Math.ceil(h / 24) + ' hari';
  };
  /* ringkasan riwayat sewa di sistem lama (legacy_customer_summary) */
  RA.legacyText = function (L) {
    if (!L || !L.orders) return '';
    return 'Sistem lama: ' + L.completed + '× sewa selesai, ' + RA.rp(L.spend)
      + (L.canceled ? ' · ' + L.canceled + ' batal' : '')
      + (L.fines ? ' · denda telat ' + L.fines + '× (' + RA.rp(L.fines_sum) + ')' : ' · tanpa denda')
      + (L.unpaid ? ' · ' + L.unpaid + ' order kurang bayar' : '')
      + ' · ' + RA.monthYear(L.first) + (RA.monthYear(L.first) !== RA.monthYear(L.last) ? '–' + RA.monthYear(L.last) : '')
      + (L.top && L.top.length ? ' · sering sewa ' + L.top.join(', ') : '');
  };
  RA.nights = function (a, b) { var x = D(a), y = D(b); x = new Date(x.getFullYear(), x.getMonth(), x.getDate()); y = new Date(y.getFullYear(), y.getMonth(), y.getDate()); return Math.max(1, Math.round((y - x) / 86400000)); };
  RA.maskPhone = function (p) { p = String(p || '').replace(/\D/g, ''); if (p.indexOf('62') === 0) p = '0' + p.slice(2); if (p.length < 8) return p; return p.slice(0, 4) + '-••••-' + p.slice(-4); };
  RA.initials = function (n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join(''); };
  RA.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  RA.at = function (dateStr, hhmm) { var p = String(hhmm || '09.00').split(/[.:]/); var d = new Date(D(dateStr).getTime()); d.setHours(+p[0] || 0, +p[1] || 0, 0, 0); return d; };

  /* label status */
  RA.STATUS = {
    draft: ['Draf', 'mute'], pending_verification: ['Menunggu verifikasi', 'info'], rejected: ['Perlu perbaikan dokumen', 'bad'],
    awaiting_payment: ['Menunggu pembayaran', 'warn'], confirmed: ['Terkonfirmasi', 'good'], active: ['Sedang dipakai', 'teal'],
    returned: ['Sudah kembali', 'info'], completed: ['Selesai', 'good'], cancelled: ['Dibatalkan', 'mute'], expired: ['Kedaluwarsa', 'mute'], no_show: ['Tidak datang', 'bad']
  };
  RA.UNIT = { draft: ['Draf', 'mute'], ready: ['Ready', 'good'], booked: ['Dipesan', 'info'], rented: ['Disewa', 'info'], qc: ['QC', 'teal'], service: ['Servis', 'warn'], waiting_part: ['Tunggu part', 'warn'], inactive: ['Tidak aktif', 'mute'] };
  RA.CHIP = { good: ['#E4F2EA', '#1E6B45'], warn: ['#FFF1D6', '#8A4B00'], bad: ['#FDECEA', '#A12A1F'], info: ['#E8EEF8', '#1F2B4D'], mute: ['#EEF0F3', '#4A5468'], teal: ['#E3F7F5', '#077A70'] };
  RA.chip = function (tone) { var c = RA.CHIP[tone] || RA.CHIP.mute; return 'display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; background: ' + c[0] + '; color: ' + c[1]; };

  /* ---------------- konteks sewa (cabang, tanggal, keranjang) ---------------- */
  RA.ctx = function () {
    var c = LS.get('ra.ctx') || {};
    if (!c.cart) c.cart = [];
    if (!c.start_at || new Date(c.start_at) < new Date()) {
      var s = new Date(); s.setDate(s.getDate() + 1); s.setHours(9, 0, 0, 0);
      var e = new Date(s); e.setDate(e.getDate() + 2);
      c.start_at = s.toISOString(); c.end_at = e.toISOString();
    }
    return c;
  };
  RA.setCtx = function (patch) { var c = RA.ctx(); for (var k in patch) c[k] = patch[k]; LS.set('ra.ctx', c); return c; };
  RA.addToCart = function (item) {
    var c = RA.ctx(); var ex = c.cart.filter(function (x) { return x.product_id === item.product_id && !x.start_at; })[0];
    if (ex && !item.start_at) ex.quantity = (ex.quantity || 1) + (item.quantity || 1); else c.cart.push(Object.assign({ quantity: 1 }, item));
    LS.set('ra.ctx', c); return c;
  };
  RA.branches = function () {
    if (RA._br) return Promise.resolve(RA._br);
    return RA.from('branches').select('*').order('sort').then(function (r) { RA._br = r.data || []; return RA._br; });
  };
  RA.branch = function () {
    return RA.branches().then(function (bs) {
      var id = RA.ctx().branch_id; var b = bs.filter(function (x) { return x.id === id; })[0];
      if (!b) { b = bs.filter(function (x) { return x.kind !== 'experience'; })[0] || bs[0] || null; if (b) RA.setCtx({ branch_id: b.id }); }
      return b;
    });
  };
  RA.quote = function (extra) {
    var c = RA.ctx();
    var p = Object.assign({ branch_id: c.branch_id, start_at: c.start_at, end_at: c.end_at, items: c.cart, delivery: c.delivery || null, promo_code: c.promo_code || null, use_points: !!c.use_points }, extra || {});
    return RA.rpc('quote', { p: p });
  };

  /* ---------------- parameter rute & navigasi ---------------- */
  RA.params = function () { var h = location.hash || ''; var i = h.indexOf('?'); var o = {}; if (i > -1) new URLSearchParams(h.slice(i + 1)).forEach(function (v, k) { o[k] = v; }); return o; };
  RA.param = function (k) { return RA.params()[k] || null; };
  RA.go = function (name, params) {
    var q = params ? '?' + Object.keys(params).filter(function (k) { return params[k] != null; }).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&') : '';
    var h = '#/' + name + (q.length > 1 ? q : '');
    if (location.hash === h && window.RA_SHOW) window.RA_SHOW(); else location.hash = h;
  };
  RA.back = function (fallback) { if (history.length > 1) history.back(); else RA.go(fallback || 'Home'); };

  /* ---------------- pesan singkat ---------------- */
  RA.toast = function (msg, tone) {
    var el = document.getElementById('ra-toast');
    if (!el) { el = document.createElement('div'); el.id = 'ra-toast'; document.body.appendChild(el); }
    el.textContent = msg; el.className = 'show ' + (tone || ''); clearTimeout(RA._tt);
    RA._tt = setTimeout(function () { el.className = ''; }, 3800);
  };
  RA.err = function (e) { RA.toast(friendly(e && e.message || e), 'bad'); console.warn(e); };
  RA.ok = function (m) { RA.toast(m, 'good'); };

  /* ---------------- penjaga layar ---------------- */
  var CUSTOMER_LOGIN = { Akun: 1, Status: 1, Bayar: 1, Aktif: 1, Ulasan: 1, Ajak: 1, Lapor: 1, Struk: 1, Ubah: 1, Perjanjian: 1, InapTiket: 1, InapUbah: 1, JeepTiket: 1, MobilSopirStatus: 1, UploadKtp: 1, Ditolak: 1, Kedaluwarsa: 1, LuarJam: 1 };
  var PUBLIC = { Home: 1, HomeEn: 1, Transportasi: 1, Katalog: 1, Cari: 1, Produk: 1, Keranjang: 1, Checkout: 1, Kalender: 1, Antar: 1, Menginap: 1, Penginapan: 1, InapTanggal: 1, InapBayar: 1, JeepPaket: 1, JeepJadwal: 1, MobilSopir: 1, MobilSopirPaket: 1, MobilSopirCustom: 1, Login: 1, Bantuan: 1, Pwa: 1, SeoMotorGarut: 1, Korporat: 1, StokHabis: 1, InvGabung: 1, InvLogin: 1, Main: 1, Sistem: 1, Masuk: 1, peta: 1 };
  RA.kindOf = function (name) {
    if (PUBLIC[name]) return 'public';
    if (CUSTOMER_LOGIN[name]) return 'customer';
    if (/^Inv/.test(name)) return 'partner';
    if (/^Keu/.test(name)) return 'finance';
    return 'staff';
  };
  /* dipanggil runtime sebelum menampilkan layar; mengembalikan nama layar yang boleh dibuka */
  RA.beforeShow = function (name) {
    var kind = RA.kindOf(name);
    var boot = RA.settings().catch(function () {});
    if (kind === 'public') return boot.then(function () { return name; });
    if (name === 'Mfa') return Promise.resolve(session ? name : 'Masuk');
    if (!session) {
      var next = name + (location.hash.indexOf('?') > -1 ? location.hash.slice(location.hash.indexOf('?')) : '');
      RA.setCtx({ next: next });
      return Promise.resolve(kind === 'partner' ? 'InvLogin' : kind === 'customer' ? 'Login' : 'Masuk');
    }
    return boot.then(function () {
      if (kind === 'customer') return name;
      if (kind === 'partner') return RA.from('partners').select('id,name').maybeSingle().then(function (r) { RA._partner = r.data; return r.data ? name : 'InvLogin'; });
      return RA.staff().then(function (s) {
        if (!s) return RA.twofaGate(name + (location.hash.indexOf('?') > -1 ? location.hash.slice(location.hash.indexOf('?')) : '')).then(function (g) {
          if (g) return g;
          RA.toast('Akun ini bukan akun staf Rentalaja.', 'bad'); return 'Masuk';
        });
        if (kind === 'finance' && !RA.can('finance.panel')) { RA.toast('Panel Keuangan hanya untuk owner dan keuangan.', 'bad'); return 'Masuk'; }
        return name;
      });
    });
  };
  RA.STAFF_HOME = { owner: 'MgmtDashboard', viewer: 'MgmtDashboard', finance: 'KeuDasbor', asset_manager: 'MgmtPusatAset', experience_manager: 'ExpHariIni',
    cs_experience: 'ExpHariIni', branch_head: 'PosHariIni', cs: 'PosHariIni', cashier: 'PosHariIni', staff: 'PosHariIni', qc: 'PosQC',
    technician: 'Teknisi', runner: 'Runner', driver: 'SopirJeep' };
  RA.staffHome = function (role) { return RA.STAFF_HOME[role] || 'PosHariIni'; };
  RA.afterLogin = function (fallback) {
    var n = RA.ctx().next; RA.setCtx({ next: null });
    location.hash = '#/' + (n || fallback || 'Home');
  };

  /* pasang aplikasi (PWA) */
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.RA_INSTALL_PROMPT = e; });
  if ('serviceWorker' in navigator && location.protocol === 'https:') { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} }

  /* referral dari link ?ref= */
  var ref = RA.param('ref'); if (ref) LS.set('ra.ref', ref);

  /* pembaruan langsung (polling ringan) untuk layar operasional */
  RA.poll = function (comp, fn, ms) { var stop = false; function tick() { if (stop) return; Promise.resolve(fn()).catch(function () {}).then(function () { if (!stop) comp._pollT = setTimeout(tick, ms || 15000); }); } tick(); return function () { stop = true; clearTimeout(comp._pollT); }; };
})();

/* ===== Baca KTP otomatis (OCR, di browser petugas; foto tidak dikirim ke pihak lain) ===== */
(function () {
  var TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', loading = null;
  function load() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (loading) return loading;
    return loading = new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = TESS; s.async = true;
      s.onload = function () { window.Tesseract ? ok(window.Tesseract) : no(new Error('pustaka OCR tidak termuat')); };
      s.onerror = function () { loading = null; no(new Error('koneksi ke pustaka OCR gagal')); };
      document.head.appendChild(s);
    });
  }
  /* perbaiki salah baca umum pada angka */
  function digits(x) { return String(x || '').toUpperCase().replace(/[OQD]/g, '0').replace(/[IL|!\]\[]/g, '1').replace(/Z/g, '2').replace(/S/g, '5').replace(/B/g, '8').replace(/G/g, '6').replace(/[^0-9]/g, ''); }
  window.RA.parseKtp = function (text) {
    var lines = String(text || '').split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean), nik = '', name = '';
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (!nik && /N[I1l]K/i.test(L)) { var d = digits(L.replace(/^.*?N[I1l]K/i, '')); if (d.length >= 16) nik = d.slice(0, 16); }
      if (!name && /^nama\b/i.test(L)) {
        name = L.replace(/^nama\s*[:;.\-]?\s*/i, '').replace(/[^A-Za-z .,']/g, ' ').replace(/\s+/g, ' ').trim();
        if (!name && lines[i + 1]) name = lines[i + 1].replace(/[^A-Za-z .,']/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
    if (!nik) { var all = lines.map(digits).filter(function (d) { return d.length >= 16; }); if (all.length) nik = all[0].slice(0, 16); }
    return { nik: nik, name: name.toUpperCase() };
  };
  window.RA.ocrKtp = function (url, onPct) {
    return load().then(function (T) {
      return T.createWorker('ind', 1, { logger: function (m) { if (m.status === 'recognizing text' && onPct) onPct(Math.round(m.progress * 100)); } })
        .then(function (w) { return w.recognize(url).then(function (r) { w.terminate(); return window.RA.parseKtp(r.data.text); }); });
    });
  };
})();

/* ===== QR (gambar kode QR untuk QRIS) ===== */
/* QR Code encoder · (c) 2009 Kazuhiko Arase, MIT license (http://www.d-project.com/) · dipaketkan dari qrcode-terminal (vendor/QRCode) */
;(function(){var M={};function req(n){n=n.replace("./","");return M[n];}
M["QRMode"]=(function(){var module={exports:{}},exports=module.exports;
module.exports = {
    MODE_NUMBER :       1 << 0,
    MODE_ALPHA_NUM :    1 << 1,
    MODE_8BIT_BYTE :    1 << 2,
    MODE_KANJI :        1 << 3
};

;return module.exports;})();
M["QRErrorCorrectLevel"]=(function(){var module={exports:{}},exports=module.exports;
module.exports = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2
};


;return module.exports;})();
M["QRMaskPattern"]=(function(){var module={exports:{}},exports=module.exports;
module.exports = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7
};

;return module.exports;})();
M["QRMath"]=(function(){var module={exports:{}},exports=module.exports;
var QRMath = {

	glog : function(n) {
	
		if (n < 1) {
			throw new Error("glog(" + n + ")");
		}
		
		return QRMath.LOG_TABLE[n];
	},
	
	gexp : function(n) {
	
		while (n < 0) {
			n += 255;
		}
	
		while (n >= 256) {
			n -= 255;
		}
	
		return QRMath.EXP_TABLE[n];
	},
	
	EXP_TABLE : new Array(256),
	
	LOG_TABLE : new Array(256)

};
	
for (var i = 0; i < 8; i++) {
	QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
	QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4]
		^ QRMath.EXP_TABLE[i - 5]
		^ QRMath.EXP_TABLE[i - 6]
		^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
	QRMath.LOG_TABLE[QRMath.EXP_TABLE[i] ] = i;
}

module.exports = QRMath;

;return module.exports;})();
M["QRPolynomial"]=(function(){var module={exports:{}},exports=module.exports;
var QRMath = req('./QRMath');

function QRPolynomial(num, shift) {
	if (num.length === undefined) {
		throw new Error(num.length + "/" + shift);
	}

	var offset = 0;

	while (offset < num.length && num[offset] === 0) {
		offset++;
	}

	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) {
		this.num[i] = num[i + offset];
	}
}

QRPolynomial.prototype = {

	get : function(index) {
		return this.num[index];
	},
	
	getLength : function() {
		return this.num.length;
	},
	
	multiply : function(e) {
	
		var num = new Array(this.getLength() + e.getLength() - 1);
	
		for (var i = 0; i < this.getLength(); i++) {
			for (var j = 0; j < e.getLength(); j++) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i) ) + QRMath.glog(e.get(j) ) );
			}
		}
	
		return new QRPolynomial(num, 0);
	},
	
	mod : function(e) {
	
		if (this.getLength() - e.getLength() < 0) {
			return this;
		}
	
		var ratio = QRMath.glog(this.get(0) ) - QRMath.glog(e.get(0) );
	
		var num = new Array(this.getLength() );
		
		for (var i = 0; i < this.getLength(); i++) {
			num[i] = this.get(i);
		}
		
		for (var x = 0; x < e.getLength(); x++) {
			num[x] ^= QRMath.gexp(QRMath.glog(e.get(x) ) + ratio);
		}
	
		// recursive call
		return new QRPolynomial(num, 0).mod(e);
	}
};

module.exports = QRPolynomial;

;return module.exports;})();
M["QR8bitByte"]=(function(){var module={exports:{}},exports=module.exports;
var QRMode = req('./QRMode');

function QR8bitByte(data) {
	this.mode = QRMode.MODE_8BIT_BYTE;
	this.data = data;
}

QR8bitByte.prototype = {

	getLength : function() {
		return this.data.length;
	},
	
	write : function(buffer) {
		for (var i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
};

module.exports = QR8bitByte;

;return module.exports;})();
M["QRBitBuffer"]=(function(){var module={exports:{}},exports=module.exports;
function QRBitBuffer() {
	this.buffer = [];
	this.length = 0;
}

QRBitBuffer.prototype = {

	get : function(index) {
		var bufIndex = Math.floor(index / 8);
		return ( (this.buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	},
	
	put : function(num, length) {
		for (var i = 0; i < length; i++) {
			this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	},
	
	getLengthInBits : function() {
		return this.length;
	},
	
	putBit : function(bit) {
	
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
	
		if (bit) {
			this.buffer[bufIndex] |= (0x80 >>> (this.length % 8) );
		}
	
		this.length++;
	}
};

module.exports = QRBitBuffer;

;return module.exports;})();
M["QRRSBlock"]=(function(){var module={exports:{}},exports=module.exports;
var QRErrorCorrectLevel = req('./QRErrorCorrectLevel');

function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount  = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

	// L
	// M
	// Q
	// H

	// 1
	[1, 26, 19],
	[1, 26, 16],
	[1, 26, 13],
	[1, 26, 9],
	
	// 2
	[1, 44, 34],
	[1, 44, 28],
	[1, 44, 22],
	[1, 44, 16],

	// 3
	[1, 70, 55],
	[1, 70, 44],
	[2, 35, 17],
	[2, 35, 13],

	// 4		
	[1, 100, 80],
	[2, 50, 32],
	[2, 50, 24],
	[4, 25, 9],
	
	// 5
	[1, 134, 108],
	[2, 67, 43],
	[2, 33, 15, 2, 34, 16],
	[2, 33, 11, 2, 34, 12],
	
	// 6
	[2, 86, 68],
	[4, 43, 27],
	[4, 43, 19],
	[4, 43, 15],
	
	// 7		
	[2, 98, 78],
	[4, 49, 31],
	[2, 32, 14, 4, 33, 15],
	[4, 39, 13, 1, 40, 14],
	
	// 8
	[2, 121, 97],
	[2, 60, 38, 2, 61, 39],
	[4, 40, 18, 2, 41, 19],
	[4, 40, 14, 2, 41, 15],
	
	// 9
	[2, 146, 116],
	[3, 58, 36, 2, 59, 37],
	[4, 36, 16, 4, 37, 17],
	[4, 36, 12, 4, 37, 13],
	
	// 10		
	[2, 86, 68, 2, 87, 69],
	[4, 69, 43, 1, 70, 44],
	[6, 43, 19, 2, 44, 20],
	[6, 43, 15, 2, 44, 16],

	// 11
	[4, 101, 81],
	[1, 80, 50, 4, 81, 51],
	[4, 50, 22, 4, 51, 23],
	[3, 36, 12, 8, 37, 13],

	// 12
	[2, 116, 92, 2, 117, 93],
	[6, 58, 36, 2, 59, 37],
	[4, 46, 20, 6, 47, 21],
	[7, 42, 14, 4, 43, 15],

	// 13
	[4, 133, 107],
	[8, 59, 37, 1, 60, 38],
	[8, 44, 20, 4, 45, 21],
	[12, 33, 11, 4, 34, 12],

	// 14
	[3, 145, 115, 1, 146, 116],
	[4, 64, 40, 5, 65, 41],
	[11, 36, 16, 5, 37, 17],
	[11, 36, 12, 5, 37, 13],

	// 15
	[5, 109, 87, 1, 110, 88],
	[5, 65, 41, 5, 66, 42],
	[5, 54, 24, 7, 55, 25],
	[11, 36, 12],

	// 16
	[5, 122, 98, 1, 123, 99],
	[7, 73, 45, 3, 74, 46],
	[15, 43, 19, 2, 44, 20],
	[3, 45, 15, 13, 46, 16],

	// 17
	[1, 135, 107, 5, 136, 108],
	[10, 74, 46, 1, 75, 47],
	[1, 50, 22, 15, 51, 23],
	[2, 42, 14, 17, 43, 15],

	// 18
	[5, 150, 120, 1, 151, 121],
	[9, 69, 43, 4, 70, 44],
	[17, 50, 22, 1, 51, 23],
	[2, 42, 14, 19, 43, 15],

	// 19
	[3, 141, 113, 4, 142, 114],
	[3, 70, 44, 11, 71, 45],
	[17, 47, 21, 4, 48, 22],
	[9, 39, 13, 16, 40, 14],

	// 20
	[3, 135, 107, 5, 136, 108],
	[3, 67, 41, 13, 68, 42],
	[15, 54, 24, 5, 55, 25],
	[15, 43, 15, 10, 44, 16],

	// 21
	[4, 144, 116, 4, 145, 117],
	[17, 68, 42],
	[17, 50, 22, 6, 51, 23],
	[19, 46, 16, 6, 47, 17],

	// 22
	[2, 139, 111, 7, 140, 112],
	[17, 74, 46],
	[7, 54, 24, 16, 55, 25],
	[34, 37, 13],

	// 23
	[4, 151, 121, 5, 152, 122],
	[4, 75, 47, 14, 76, 48],
	[11, 54, 24, 14, 55, 25],
	[16, 45, 15, 14, 46, 16],

	// 24
	[6, 147, 117, 4, 148, 118],
	[6, 73, 45, 14, 74, 46],
	[11, 54, 24, 16, 55, 25],
	[30, 46, 16, 2, 47, 17],

	// 25
	[8, 132, 106, 4, 133, 107],
	[8, 75, 47, 13, 76, 48],
	[7, 54, 24, 22, 55, 25],
	[22, 45, 15, 13, 46, 16],

	// 26
	[10, 142, 114, 2, 143, 115],
	[19, 74, 46, 4, 75, 47],
	[28, 50, 22, 6, 51, 23],
	[33, 46, 16, 4, 47, 17],

	// 27
	[8, 152, 122, 4, 153, 123],
	[22, 73, 45, 3, 74, 46],
	[8, 53, 23, 26, 54, 24],
	[12, 45, 15, 28, 46, 16],

	// 28
	[3, 147, 117, 10, 148, 118],
	[3, 73, 45, 23, 74, 46],
	[4, 54, 24, 31, 55, 25],
	[11, 45, 15, 31, 46, 16],

	// 29
	[7, 146, 116, 7, 147, 117],
	[21, 73, 45, 7, 74, 46],
	[1, 53, 23, 37, 54, 24],
	[19, 45, 15, 26, 46, 16],

	// 30
	[5, 145, 115, 10, 146, 116],
	[19, 75, 47, 10, 76, 48],
	[15, 54, 24, 25, 55, 25],
	[23, 45, 15, 25, 46, 16],

	// 31
	[13, 145, 115, 3, 146, 116],
	[2, 74, 46, 29, 75, 47],
	[42, 54, 24, 1, 55, 25],
	[23, 45, 15, 28, 46, 16],

	// 32
	[17, 145, 115],
	[10, 74, 46, 23, 75, 47],
	[10, 54, 24, 35, 55, 25],
	[19, 45, 15, 35, 46, 16],

	// 33
	[17, 145, 115, 1, 146, 116],
	[14, 74, 46, 21, 75, 47],
	[29, 54, 24, 19, 55, 25],
	[11, 45, 15, 46, 46, 16],

	// 34
	[13, 145, 115, 6, 146, 116],
	[14, 74, 46, 23, 75, 47],
	[44, 54, 24, 7, 55, 25],
	[59, 46, 16, 1, 47, 17],

	// 35
	[12, 151, 121, 7, 152, 122],
	[12, 75, 47, 26, 76, 48],
	[39, 54, 24, 14, 55, 25],
	[22, 45, 15, 41, 46, 16],

	// 36
	[6, 151, 121, 14, 152, 122],
	[6, 75, 47, 34, 76, 48],
	[46, 54, 24, 10, 55, 25],
	[2, 45, 15, 64, 46, 16],

	// 37
	[17, 152, 122, 4, 153, 123],
	[29, 74, 46, 14, 75, 47],
	[49, 54, 24, 10, 55, 25],
	[24, 45, 15, 46, 46, 16],

	// 38
	[4, 152, 122, 18, 153, 123],
	[13, 74, 46, 32, 75, 47],
	[48, 54, 24, 14, 55, 25],
	[42, 45, 15, 32, 46, 16],

	// 39
	[20, 147, 117, 4, 148, 118],
	[40, 75, 47, 7, 76, 48],
	[43, 54, 24, 22, 55, 25],
	[10, 45, 15, 67, 46, 16],

	// 40
	[19, 148, 118, 6, 149, 119],
	[18, 75, 47, 31, 76, 48],
	[34, 54, 24, 34, 55, 25],
	[20, 45, 15, 61, 46, 16]
];

QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	
	if (rsBlock === undefined) {
		throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	}

	var length = rsBlock.length / 3;
	
	var list = [];
	
	for (var i = 0; i < length; i++) {

		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount  = rsBlock[i * 3 + 2];

		for (var j = 0; j < count; j++) {
			list.push(new QRRSBlock(totalCount, dataCount) );	
		}
	}
	
	return list;
};

QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {

	switch(errorCorrectLevel) {
	case QRErrorCorrectLevel.L :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
	case QRErrorCorrectLevel.M :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
	case QRErrorCorrectLevel.Q :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
	case QRErrorCorrectLevel.H :
		return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
	default :
		return undefined;
	}
};

module.exports = QRRSBlock;

;return module.exports;})();
M["QRUtil"]=(function(){var module={exports:{}},exports=module.exports;
var QRMode = req('./QRMode');
var QRPolynomial = req('./QRPolynomial');
var QRMath = req('./QRMath');
var QRMaskPattern = req('./QRMaskPattern');

var QRUtil = {

    PATTERN_POSITION_TABLE : [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],        
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170]
    ],

    G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
    G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)    | (1 << 4) | (1 << 1),

    getBCHTypeInfo : function(data) {
        var d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) ) );    
        }
        return ( (data << 10) | d) ^ QRUtil.G15_MASK;
    },

    getBCHTypeNumber : function(data) {
        var d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) ) );    
        }
        return (data << 12) | d;
    },

    getBCHDigit : function(data) {

        var digit = 0;

        while (data !== 0) {
            digit++;
            data >>>= 1;
        }

        return digit;
    },

    getPatternPosition : function(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },

    getMask : function(maskPattern, i, j) {
        
        switch (maskPattern) {
            
        case QRMaskPattern.PATTERN000 : return (i + j) % 2 === 0;
        case QRMaskPattern.PATTERN001 : return i % 2 === 0;
        case QRMaskPattern.PATTERN010 : return j % 3 === 0;
        case QRMaskPattern.PATTERN011 : return (i + j) % 3 === 0;
        case QRMaskPattern.PATTERN100 : return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 === 0;
        case QRMaskPattern.PATTERN101 : return (i * j) % 2 + (i * j) % 3 === 0;
        case QRMaskPattern.PATTERN110 : return ( (i * j) % 2 + (i * j) % 3) % 2 === 0;
        case QRMaskPattern.PATTERN111 : return ( (i * j) % 3 + (i + j) % 2) % 2 === 0;

        default :
            throw new Error("bad maskPattern:" + maskPattern);
        }
    },

    getErrorCorrectPolynomial : function(errorCorrectLength) {

        var a = new QRPolynomial([1], 0);

        for (var i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0) );
        }

        return a;
    },

    getLengthInBits : function(mode, type) {

        if (1 <= type && type < 10) {

            // 1 - 9

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 10;
            case QRMode.MODE_ALPHA_NUM  : return 9;
            case QRMode.MODE_8BIT_BYTE  : return 8;
            case QRMode.MODE_KANJI      : return 8;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 27) {

            // 10 - 26

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 12;
            case QRMode.MODE_ALPHA_NUM  : return 11;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 10;
            default :
                throw new Error("mode:" + mode);
            }

        } else if (type < 41) {

            // 27 - 40

            switch(mode) {
            case QRMode.MODE_NUMBER     : return 14;
            case QRMode.MODE_ALPHA_NUM  : return 13;
            case QRMode.MODE_8BIT_BYTE  : return 16;
            case QRMode.MODE_KANJI      : return 12;
            default :
                throw new Error("mode:" + mode);
            }

        } else {
            throw new Error("type:" + type);
        }
    },

    getLostPoint : function(qrCode) {
        
        var moduleCount = qrCode.getModuleCount();
        var lostPoint = 0;
        var row = 0; 
        var col = 0;

        
        // LEVEL1
        
        for (row = 0; row < moduleCount; row++) {

            for (col = 0; col < moduleCount; col++) {

                var sameCount = 0;
                var dark = qrCode.isDark(row, col);

                for (var r = -1; r <= 1; r++) {

                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }

                    for (var c = -1; c <= 1; c++) {

                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }

                        if (r === 0 && c === 0) {
                            continue;
                        }

                        if (dark === qrCode.isDark(row + r, col + c) ) {
                            sameCount++;
                        }
                    }
                }

                if (sameCount > 5) {
                    lostPoint += (3 + sameCount - 5);
                }
            }
        }

        // LEVEL2

        for (row = 0; row < moduleCount - 1; row++) {
            for (col = 0; col < moduleCount - 1; col++) {
                var count = 0;
                if (qrCode.isDark(row,     col    ) ) count++;
                if (qrCode.isDark(row + 1, col    ) ) count++;
                if (qrCode.isDark(row,     col + 1) ) count++;
                if (qrCode.isDark(row + 1, col + 1) ) count++;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }

        // LEVEL3

        for (row = 0; row < moduleCount; row++) {
            for (col = 0; col < moduleCount - 6; col++) {
                if (qrCode.isDark(row, col) && 
                        !qrCode.isDark(row, col + 1) && 
                         qrCode.isDark(row, col + 2) && 
                         qrCode.isDark(row, col + 3) && 
                         qrCode.isDark(row, col + 4) && 
                        !qrCode.isDark(row, col + 5) && 
                         qrCode.isDark(row, col + 6) ) {
                    lostPoint += 40;
                }
            }
        }

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount - 6; row++) {
                if (qrCode.isDark(row, col) &&
                        !qrCode.isDark(row + 1, col) &&
                         qrCode.isDark(row + 2, col) &&
                         qrCode.isDark(row + 3, col) &&
                         qrCode.isDark(row + 4, col) &&
                        !qrCode.isDark(row + 5, col) &&
                         qrCode.isDark(row + 6, col) ) {
                    lostPoint += 40;
                }
            }
        }

        // LEVEL4
        
        var darkCount = 0;

        for (col = 0; col < moduleCount; col++) {
            for (row = 0; row < moduleCount; row++) {
                if (qrCode.isDark(row, col) ) {
                    darkCount++;
                }
            }
        }
        
        var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;

        return lostPoint;       
    }

};

module.exports = QRUtil;

;return module.exports;})();
M["index"]=(function(){var module={exports:{}},exports=module.exports;
//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------
// Modified to work in node for this project (and some refactoring)
//---------------------------------------------------------------------

var QR8bitByte = req('./QR8bitByte');
var QRUtil = req('./QRUtil');
var QRPolynomial = req('./QRPolynomial');
var QRRSBlock = req('./QRRSBlock');
var QRBitBuffer = req('./QRBitBuffer');

function QRCode(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}

QRCode.prototype = {
	
	addData : function(data) {
		var newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = null;
	},
	
	isDark : function(row, col) {
		if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
			throw new Error(row + "," + col);
		}
		return this.modules[row][col];
	},

	getModuleCount : function() {
		return this.moduleCount;
	},
	
	make : function() {
		// Calculate automatically typeNumber if provided is < 1
		if (this.typeNumber < 1 ){
			var typeNumber = 1;
			for (typeNumber = 1; typeNumber < 40; typeNumber++) {
				var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

				var buffer = new QRBitBuffer();
				var totalDataCount = 0;
				for (var i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				for (var x = 0; x < this.dataList.length; x++) {
					var data = this.dataList[x];
					buffer.put(data.mode, 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
					data.write(buffer);
				}
				if (buffer.getLengthInBits() <= totalDataCount * 8)
					break;
			}
			this.typeNumber = typeNumber;
		}
		this.makeImpl(false, this.getBestMaskPattern() );
	},
	
	makeImpl : function(test, maskPattern) {
		
		this.moduleCount = this.typeNumber * 4 + 17;
		this.modules = new Array(this.moduleCount);
		
		for (var row = 0; row < this.moduleCount; row++) {
			
			this.modules[row] = new Array(this.moduleCount);
			
			for (var col = 0; col < this.moduleCount; col++) {
				this.modules[row][col] = null;//(col + row) % 3;
			}
		}
	
		this.setupPositionProbePattern(0, 0);
		this.setupPositionProbePattern(this.moduleCount - 7, 0);
		this.setupPositionProbePattern(0, this.moduleCount - 7);
		this.setupPositionAdjustPattern();
		this.setupTimingPattern();
		this.setupTypeInfo(test, maskPattern);
		
		if (this.typeNumber >= 7) {
			this.setupTypeNumber(test);
		}
	
		if (this.dataCache === null) {
			this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
		}
	
		this.mapData(this.dataCache, maskPattern);
	},

	setupPositionProbePattern : function(row, col)  {
		
		for (var r = -1; r <= 7; r++) {
			
			if (row + r <= -1 || this.moduleCount <= row + r) continue;
			
			for (var c = -1; c <= 7; c++) {
				
				if (col + c <= -1 || this.moduleCount <= col + c) continue;
				
				if ( (0 <= r && r <= 6 && (c === 0 || c === 6) ) || 
                     (0 <= c && c <= 6 && (r === 0 || r === 6) ) || 
                     (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
					this.modules[row + r][col + c] = true;
				} else {
					this.modules[row + r][col + c] = false;
				}
			}		
		}		
	},
	
	getBestMaskPattern : function() {
	
		var minLostPoint = 0;
		var pattern = 0;
	
		for (var i = 0; i < 8; i++) {
			
			this.makeImpl(true, i);
	
			var lostPoint = QRUtil.getLostPoint(this);
	
			if (i === 0 || minLostPoint >  lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}
	
		return pattern;
	},
	
	createMovieClip : function(target_mc, instance_name, depth) {
	
		var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
		var cs = 1;
	
		this.make();

		for (var row = 0; row < this.modules.length; row++) {
			
			var y = row * cs;
			
			for (var col = 0; col < this.modules[row].length; col++) {
	
				var x = col * cs;
				var dark = this.modules[row][col];
			
				if (dark) {
					qr_mc.beginFill(0, 100);
					qr_mc.moveTo(x, y);
					qr_mc.lineTo(x + cs, y);
					qr_mc.lineTo(x + cs, y + cs);
					qr_mc.lineTo(x, y + cs);
					qr_mc.endFill();
				}
			}
		}
		
		return qr_mc;
	},

	setupTimingPattern : function() {
		
		for (var r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules[r][6] !== null) {
				continue;
			}
			this.modules[r][6] = (r % 2 === 0);
		}
	
		for (var c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules[6][c] !== null) {
				continue;
			}
			this.modules[6][c] = (c % 2 === 0);
		}
	},
	
	setupPositionAdjustPattern : function() {
	
		var pos = QRUtil.getPatternPosition(this.typeNumber);
		
		for (var i = 0; i < pos.length; i++) {
		
			for (var j = 0; j < pos.length; j++) {
			
				var row = pos[i];
				var col = pos[j];
				
				if (this.modules[row][col] !== null) {
					continue;
				}
				
				for (var r = -2; r <= 2; r++) {
				
					for (var c = -2; c <= 2; c++) {
					
						if (Math.abs(r) === 2 || 
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0) ) {
							this.modules[row + r][col + c] = true;
						} else {
							this.modules[row + r][col + c] = false;
						}
					}
				}
			}
		}
	},
	
	setupTypeNumber : function(test) {
	
		var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        var mod;
	
		for (var i = 0; i < 18; i++) {
			mod = (!test && ( (bits >> i) & 1) === 1);
			this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
		}
	
		for (var x = 0; x < 18; x++) {
			mod = (!test && ( (bits >> x) & 1) === 1);
			this.modules[x % 3 + this.moduleCount - 8 - 3][Math.floor(x / 3)] = mod;
		}
	},
	
	setupTypeInfo : function(test, maskPattern) {
	
		var data = (this.errorCorrectLevel << 3) | maskPattern;
		var bits = QRUtil.getBCHTypeInfo(data);
        var mod;
	
		// vertical		
		for (var v = 0; v < 15; v++) {
	
			mod = (!test && ( (bits >> v) & 1) === 1);
	
			if (v < 6) {
				this.modules[v][8] = mod;
			} else if (v < 8) {
				this.modules[v + 1][8] = mod;
			} else {
				this.modules[this.moduleCount - 15 + v][8] = mod;
			}
		}
	
		// horizontal
		for (var h = 0; h < 15; h++) {
	
			mod = (!test && ( (bits >> h) & 1) === 1);
			
			if (h < 8) {
				this.modules[8][this.moduleCount - h - 1] = mod;
			} else if (h < 9) {
				this.modules[8][15 - h - 1 + 1] = mod;
			} else {
				this.modules[8][15 - h - 1] = mod;
			}
		}
	
		// fixed module
		this.modules[this.moduleCount - 8][8] = (!test);
	
	},
	
	mapData : function(data, maskPattern) {
		
		var inc = -1;
		var row = this.moduleCount - 1;
		var bitIndex = 7;
		var byteIndex = 0;
		
		for (var col = this.moduleCount - 1; col > 0; col -= 2) {
	
			if (col === 6) col--;
	
			while (true) {
	
				for (var c = 0; c < 2; c++) {
					
					if (this.modules[row][col - c] === null) {
						
						var dark = false;
	
						if (byteIndex < data.length) {
							dark = ( ( (data[byteIndex] >>> bitIndex) & 1) === 1);
						}
	
						var mask = QRUtil.getMask(maskPattern, row, col - c);
	
						if (mask) {
							dark = !dark;
						}
						
						this.modules[row][col - c] = dark;
						bitIndex--;
	
						if (bitIndex === -1) {
							byteIndex++;
							bitIndex = 7;
						}
					}
				}
								
				row += inc;
	
				if (row < 0 || this.moduleCount <= row) {
					row -= inc;
					inc = -inc;
					break;
				}
			}
		}
		
	}

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function(typeNumber, errorCorrectLevel, dataList) {
	
	var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	
	var buffer = new QRBitBuffer();
	
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber) );
		data.write(buffer);
	}

	// calc num max data.
	var totalDataCount = 0;
	for (var x = 0; x < rsBlocks.length; x++) {
		totalDataCount += rsBlocks[x].dataCount;
	}

	if (buffer.getLengthInBits() > totalDataCount * 8) {
		throw new Error("code length overflow. (" + 
            buffer.getLengthInBits() + 
            ">" +  
            totalDataCount * 8 + 
            ")");
	}

	// end code
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.getLengthInBits() % 8 !== 0) {
		buffer.putBit(false);
	}

	// padding
	while (true) {
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD0, 8);
		
		if (buffer.getLengthInBits() >= totalDataCount * 8) {
			break;
		}
		buffer.put(QRCode.PAD1, 8);
	}

	return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function(buffer, rsBlocks) {

	var offset = 0;
	
	var maxDcCount = 0;
	var maxEcCount = 0;
	
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	
	for (var r = 0; r < rsBlocks.length; r++) {

		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		
		dcdata[r] = new Array(dcCount);
		
		for (var i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & buffer.buffer[i + offset];
		}
		offset += dcCount;
		
		var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

		var modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var x = 0; x < ecdata[r].length; x++) {
            var modIndex = x + modPoly.getLength() - ecdata[r].length;
			ecdata[r][x] = (modIndex >= 0)? modPoly.get(modIndex) : 0;
		}

	}
	
	var totalCodeCount = 0;
	for (var y = 0; y < rsBlocks.length; y++) {
		totalCodeCount += rsBlocks[y].totalCount;
	}

	var data = new Array(totalCodeCount);
	var index = 0;

	for (var z = 0; z < maxDcCount; z++) {
		for (var s = 0; s < rsBlocks.length; s++) {
			if (z < dcdata[s].length) {
				data[index++] = dcdata[s][z];
			}
		}
	}

	for (var xx = 0; xx < maxEcCount; xx++) {
		for (var t = 0; t < rsBlocks.length; t++) {
			if (xx < ecdata[t].length) {
				data[index++] = ecdata[t][xx];
			}
		}
	}

	return data;

};

module.exports = QRCode;

;return module.exports;})();
window.RA_QR=function(text){var Q=M["index"],L=M["QRErrorCorrectLevel"];var q=new Q(-1,L.M);q.addData(String(text));q.make();return q;};})();
(function () {
  var cache = {};
  /* data URL SVG kode QR; margin 4 modul (zona sepi) sesuai standar */
  window.RA.qrSvg = function (text) {
    if (!text) return '';
    if (cache[text]) return cache[text];
    var q = window.RA_QR(text), n = q.getModuleCount(), m = 4, size = n + m * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
    return (cache[text] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  };
})();
