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
