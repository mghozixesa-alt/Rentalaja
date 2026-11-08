/* Rentalaja · menjalankan layar .dc.html dari kanvas desain, lalu menerapkan perubahan (patch) yang menyambungkan layar ke data asli. */
(function(){
'use strict';
var screenEl=document.getElementById('screen');
var helmetBox=document.createElement('div');helmetBox.id='ra-helmet';document.head.appendChild(helmetBox);
var MAN=null, FILES={}, PATCHED={}, TITLES=[], current=null, inst=null, renderQueued=false, rootSpec=null, loadingBundles={}, showSeq=0;

/* ---------- DCLogic ---------- */
function DCLogic(props){this.props=props||{};this.state={};}
DCLogic.prototype.setState=function(p){
  var upd=typeof p==='function'?p(this.state,this.props):p;
  this.state=Object.assign({},this.state,upd);
  if(this===inst)queue();
};
DCLogic.prototype.forceUpdate=function(){if(this===inst)queue();};
DCLogic.prototype.renderVals=function(){return {};};
/* bantu: jalankan tugas async dengan status loading/error */
DCLogic.prototype.load=function(promise,key){
  var self=this;key=key||'loading';var u={};u[key]=true;self.setState(u);
  return Promise.resolve(promise).then(function(v){var d={};d[key]=false;self.setState(d);return v;},function(e){var d={};d[key]=false;d.error=RA.friendly(e&&e.message||e);self.setState(d);console.warn(e);});
};
DCLogic.prototype.act=function(fn,key){
  var self=this;key=key||'busy';
  return function(ev){
    if(self.state[key])return;var u={};u[key]=true;self.setState(u);
    return Promise.resolve().then(function(){return fn.call(self,ev);}).catch(function(e){RA.err(e);}).then(function(){var d={};d[key]=false;self.setState(d);});
  };
};
window.DCLogic=DCLogic;
function isAlive(c){return c===inst;}
window.RA_ALIVE=isAlive;

function queue(){if(renderQueued)return;renderQueued=true;Promise.resolve().then(function(){renderQueued=false;render();});}

/* ---------- lookup & interpolation ---------- */
var WHOLE=/^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/, PART=/\{\{\s*([^{}]+?)\s*\}\}/g;
function lookup(path,scopes){
  path=path.trim();
  if(path==='true')return true; if(path==='false')return false; if(path==='null')return null;
  if(/^-?\d+(\.\d+)?$/.test(path))return +path;
  if(/^'.*'$|^".*"$/.test(path))return path.slice(1,-1);
  var parts=path.split('.'), head=parts[0], cur, found=false;
  for(var i=0;i<scopes.length;i++){var s=scopes[i];if(s!=null&&typeof s==='object'&&head in s){cur=s[head];found=true;break;}}
  if(!found)return undefined;
  for(var j=1;j<parts.length;j++){if(cur==null)return undefined;cur=cur[parts[j]];}
  return cur;
}
function str(v){return v==null||v===false?'':String(v);}
function interp(text,scopes){return text.replace(PART,function(_,p){return str(lookup(p,scopes));});}

/* ---------- render a template subtree ---------- */
var TEXTY={text:1,search:1,email:1,tel:1,number:1,password:1,url:1,date:1,time:1,'datetime-local':1};
function build(src,scopes,out){
  for(var n=src.firstChild;n;n=n.nextSibling){
    if(n.nodeType===3){out.appendChild(document.createTextNode(n.data.indexOf('{{')>-1?interp(n.data,scopes):n.data));continue;}
    if(n.nodeType!==1)continue;
    var tag=n.localName;
    if(tag==='helmet')continue;
    if(tag==='sc-for'){
      var list=lookup((n.getAttribute('list')||'').replace(/^\s*\{\{|\}\}\s*$/g,''),scopes);
      var as=n.getAttribute('as')||'item';
      if(list&&typeof list.length==='number'){for(var i=0;i<list.length;i++){var sc={};sc[as]=list[i];sc[as+'Index']=i;sc.$index=i;build(n,[sc].concat(scopes),out);}}
      continue;
    }
    if(tag==='sc-if'){
      var raw=n.getAttribute('value')||'';var v=WHOLE.test(raw)?lookup(raw.match(WHOLE)[1],scopes):raw;
      if(n.hasAttribute('not'))v=!v;
      if(v&&!(Array.isArray(v)&&!v.length))build(n,scopes,out);
      continue;
    }
    if(tag==='template'){
      /* sc-for/sc-if diubah jadi <template> sebelum parsing supaya aman di dalam tabel (tbody/tr) */
      if(n.hasAttribute('data-scfor')){
        var list2=lookup((n.getAttribute('list')||'').replace(/^\s*\{\{|\}\}\s*$/g,''),scopes);var as2=n.getAttribute('as')||'item';
        if(list2&&typeof list2.length==='number'){for(var i2=0;i2<list2.length;i2++){var sc2={};sc2[as2]=list2[i2];sc2[as2+'Index']=i2;sc2.$index=i2;build(n.content,[sc2].concat(scopes),out);}}
      }else if(n.hasAttribute('data-scif')){
        var raw2=n.getAttribute('value')||'';var v2=WHOLE.test(raw2)?lookup(raw2.match(WHOLE)[1],scopes):raw2;
        if(n.hasAttribute('not'))v2=!v2;
        if(v2&&!(Array.isArray(v2)&&!v2.length))build(n.content,scopes,out);
      }
      continue;
    }
    var el=n.namespaceURI&&n.namespaceURI!=='http://www.w3.org/1999/xhtml'?document.createElementNS(n.namespaceURI,n.tagName):document.createElement(tag);
    var attrs=n.attributes, handlers=[], html=null;
    for(var a=0;a<attrs.length;a++){
      var name=attrs[a].name, val=attrs[a].value, lname=name.toLowerCase();
      if(lname.indexOf('hint-')===0)continue;
      var m=val.match(WHOLE);
      if(m){
        var res=lookup(m[1],scopes);
        if(lname.indexOf('on')===0&&lname.length>2){if(typeof res==='function')handlers.push([lname.slice(2),res]);continue;}
        if(lname==='ref'){if(typeof res==='function')handlers.push(['$ref',res]);continue;}
        if(typeof res==='function')continue;
        if(res===false||res==null){continue;}
        if(res===true){el.setAttribute(name,'');}
        else el.setAttribute(name,String(res));
        if(lname==='value'&&'value' in el)el.__val=String(res);
        continue;
      }
      if(lname.indexOf('on')===0&&lname.length>2)continue; /* no inline JS */
      if(name.indexOf(':')>0&&n.namespaceURI!=='http://www.w3.org/1999/xhtml'){try{el.setAttributeNS(attrs[a].namespaceURI,name,val.indexOf('{{')>-1?interp(val,scopes):val);}catch(e){}continue;}
      el.setAttribute(name,val.indexOf('{{')>-1?interp(val,scopes):val);
    }
    if(el.localName==='input'&&el.hasAttribute('checked'))el.checked=true;
    if(el.localName==='input'&&el.__val!=null)el.value=el.__val;
    handlers.forEach(function(h){
      var ev=h[0], fn=h[1];
      if(ev==='$ref'){try{fn(el);}catch(e){}return;}
      if(ev==='change'&&((el.localName==='input'&&TEXTY[(el.getAttribute('type')||'text').toLowerCase()])||el.localName==='textarea'))ev='input';
      el.addEventListener(ev,function(e){try{fn(e);}catch(err){console.error(err);}});
    });
    build(n.content||n,scopes,el);
    if(el.__val!=null&&(el.localName==='select'||el.localName==='textarea'))el.value=el.__val;
    out.appendChild(el);
  }
}

/* ---------- mobile frame adaptation ---------- */
function adapt(root){
  if(!rootSpec||!rootSpec.mobile)return;
  root.style.width='100%';root.style.maxWidth='430px';root.style.height='auto';root.style.minHeight='100vh';root.style.overflow='visible';
  root.style.margin='0 auto';
  var pad=0;
  Array.prototype.forEach.call(root.querySelectorAll('[style]'),function(el){
    var s=el.getAttribute('style');
    if(/position:\s*absolute/.test(s)&&/bottom:\s*0(px)?\s*(;|$)/.test(s)&&/left:\s*0/.test(s)&&/right:\s*0/.test(s)&&el.parentElement===root){
      el.style.position='fixed';el.style.left='50%';el.style.right='auto';el.style.transform='translateX(-50%)';
      el.style.width='100%';el.style.maxWidth='430px';el.style.boxSizing='border-box';el.style.zIndex='40';
      pad=Math.max(pad,el.offsetHeight);
    }
  });
  if(pad)root.style.paddingBottom=Math.max(pad+12,parseInt(root.style.paddingBottom||'0',10)||0)+'px';
}


/* ---------- navigasi pelanggan ----------
   1) Menu bawah (Beranda · Cari · Booking saya · Akun) di layar utama pelanggan.
   2) Di tengah alur booking: tombol ✕ Tutup dengan konfirmasi, bukan menu bawah.
   3) Tombol kembali (‹) di layar lain menuju halaman induknya (sudah diatur di tiap layar). */
var TAB_ON={Status:'Status',Katalog:'Home',Menginap:'Home',JeepPaket:'Home',Transportasi:'Home',MobilSopir:'Home',Bantuan:'Akun'};
var FLOW={Checkout:'cart',Antar:'cart',UploadKtp:'cart',Bayar:'saved',InapTanggal:'new',InapBayar:'new',JeepJadwal:'new',MobilSopirPaket:'new',MobilSopirCustom:'new'};
var TABS=[['Home','Beranda','<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'],['Status','Pesanan','<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h3"/>'],
  ['Cari','Pencarian','<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'],['Akun','Akun','<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>']];
function isBottomNav(el){var s=el.getAttribute('style')||'';return el.localName==='nav'&&/position:\s*absolute/.test(s)&&/bottom:\s*0/.test(s);}
var NAVMAP={Home:'Home',Cari:'Cari',Status:'Status',Aktif:'Status',Akun:'Akun'};
var NAVSTYLE='position: absolute; left: 0; right: 0; bottom: 0; height: 72px; background: #FFFFFF; border-top: 1px solid #E8EBEF; box-shadow: 0 -4px 16px rgba(31,43,77,0.06); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: center; text-align: center';
function navHTML(act){return TABS.map(function(t){var on=t[0]===act,col=on?'#077A70':'#8A93A3';
  return '<a href="'+t[0]+'.dc.html"'+(on?' aria-current="page"':'')+' style="text-decoration: none; color: '+col+'; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; font-family: inherit"><span style="width: 52px; height: 30px; border-radius: 15px; '+(on?'background: #E3F7F5; ':'')+'display: flex; align-items: center; justify-content: center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="'+col+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+t[2]+'</svg></span>'+t[1]+'</a>';}).join('');}
function custNav(root){
  if(!rootSpec||!rootSpec.mobile)return;
  var existing=null;for(var c=root.firstElementChild;c;c=c.nextElementSibling){if(isBottomNav(c)){existing=c;break;}}
  var act=TAB_ON[current]||NAVMAP[current];
  if(existing){
    if(current==='Home')return;
    if(act&&/Akun/.test(existing.textContent)){existing.setAttribute('style',NAVSTYLE);existing.setAttribute('aria-label','Menu utama');existing.innerHTML=navHTML(act);}
    return;
  }
  if(!act)return;
  var nav=document.createElement('nav');nav.setAttribute('aria-label','Menu utama');nav.setAttribute('data-ra-tabs','1');
  nav.setAttribute('style',NAVSTYLE);nav.innerHTML=navHTML(act);
  root.appendChild(nav);
}

var ICO={
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
 idcard:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',
 swap:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
 cart:'<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11L21 8H7"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 calcheck:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M9 15l2 2 4-4"/>',
 truck:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
 house:'<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>', cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
 jeep:'<path d="M3 15V9h4l2-3h6l2 3h4v6zM3 15h18"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
 wheel:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 14v7M10 12H3M14 12h7"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
 gift:'<rect x="3" y="8" width="18" height="5"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/>',
 box:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
 folder:'<path d="M3 6h6l2 2h10v11H3z"/>',
 tool:'<path d="M14.5 5.5a4 4 0 0 0 4 4l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-1-1z"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
 kit:'<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3M3 13h18"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
 star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 approve:'<path d="M5 12l5 5L20 7"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c1-3.5 3.8-5 7-5s6 1.5 7 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.4 2.2 4 5"/>',
 store:'<path d="M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-5h6v5"/>',
 head:'<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
 chat:'<path d="M4 5h16v11H9l-5 4z"/>',
 bed:'<path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
 flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',alert:'<path d="M12 3l9.5 16.5h-19z"/><path d="M12 10v4M12 17h.01"/>',shieldx:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>',
 card:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>'
};
function ico(k,c){return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICO[k]||'')+'</svg>';}
var SNAV=[
 ['Beranda',[['ModulBeranda','home','Beranda']]],
 ['Operasional',[['OpsBeranda','home','Dashboard manajemen'],['OpsUnit','chart','Utilisasi & mutasi'],['OpsKalender','cal','Kalender sewa'],['OpsQC','star','Kualitas layanan'],['OpsKerja','calcheck','Kerja lapangan']]],
 ['CS',[['PusatCS','head','Pusat CS'],['CekPenyewa','shield','Cek calon penyewa'],['LaporanShift','chart','Laporan shift']]],
 ['Harian',[['PosHariIni','home','Rental hari ini'],['PosVerifikasi','idcard','Verifikasi pesanan'],['CekPenyewa','shield','Cek calon penyewa'],['PosKasir','cart','Kasir (sewa OTS)'],['PosSerahTerima','swap','Serah-terima & kembali'],['PosPelanggan','user','Pelanggan'],['PosShift','clock','Shift & tutup kas']]],
 ['Lapangan',[['Runner','truck','Antar-jemput']]],
 ['Penginapan & Jeep',[['ExpKalender','bed','Kalender penginapan'],['Housekeeping','check','Bersih-bersih kamar'],['ExpJeep','jeep','Jadwal jeep'],['SopirJeep','wheel','Tugas sopir'],['KonfirmasiTransfer','card','Konfirmasi transfer']]],
 ['Barang',[['MgmtProduk','tag','Barang & harga'],['MgmtHargaMusim','cal','Harga musim & libur'],['MgmtPromo','gift','Promo & member'],['PosUnit','box','Stok unit'],['AsetTandai','flag','Tandai unit']]],
 ['Aset & servis',[['AsetBeranda','home','Hari ini (aset)'],['AsetKalender','cal','Kalender unit'],['AsetServis','tool','Papan servis'],['PosQC','check','Cek kondisi (QC)'],['AsetPreventif','calcheck','Perawatan preventif'],['AsetLaporan','chart','Laporan aset'],['AsetData','check','Lengkapi data unit'],['AsetRisiko','alert','Kontrol aset (semua)'],['AsetUnit','box','Unit aset (pusat)'],['AsetOpname','check','Stok opname'],['AsetTim','users','Tim teknisi & QC'],['MgmtAset','box','Daftar unit & riwayat'],['MgmtPusatAset','folder','Ringkasan aset'],['MgmtServis','tool','Servis'],['Teknisi','kit','Teknisi'],['TekBelanja','cart','Belanja part'],['TekAkun','user','Akun teknisi']]],
 ['Manajemen',[['MgmtSetuju','approve','Persetujuan'],['MgmtLini','chart','Ringkasan per lini']]],
 ['Pemasaran',[['MgmtSumber','chart','Pemasaran'],['MgmtKonten','folder','Konten web'],['MgmtKorporat','store','Korporat & B2B']]],
 ['Pengaturan',[['MgmtPengguna','users','Staf & akses'],['MgmtCabang','store','Cabang'],['MgmtAturan','check','Aturan bisnis'],['MgmtLaporanWa','chat','Laporan WhatsApp'],['MgmtAudit','folder','Log audit'],['MgmtDataUji','trash','Hapus data uji']]],
 ['Pelanggan',[['MgmtPelanggan','user','Data pelanggan'],['MgmtSegmen','chat','Broadcast WhatsApp'],['MgmtInbox','chat','Inbox WhatsApp'],['TiketCS','approve','Tiket keluhan'],['AlatChat','chat','Template & link sewa'],['MgmtPenawaran','tag','Permintaan perjalanan'],['MgmtTindakLanjut','users','Tindak lanjut'],['MgmtDaftarHitam','shieldx','Daftar hitam']]],
 ['Saya',[['AgendaLapangan','calcheck','Agenda'],['AkunLapangan','user','Akun saya'],['TiketCS','approve','Tiket keluhan']]]
];
var CSM={'CS':1,'Harian':['PosHariIni','PosVerifikasi','PosKasir','PosPelanggan'],'Operasional':['OpsKalender'],'Pengaturan':['MgmtDataUji'],'Penginapan & Jeep':['ExpKalender','ExpJeep','KonfirmasiTransfer'],'Pelanggan':['TiketCS','AlatChat','MgmtPenawaran','MgmtDaftarHitam']};
/* manajer operasional = operasional harian + experience (penginapan & jeep); manajer aset terpisah */
var MOPS={'Operasional':1,'Harian':['PosHariIni','PosVerifikasi','PosKasir','PosSerahTerima','PosShift'],'Penginapan & Jeep':['ExpKalender','ExpJeep','KonfirmasiTransfer'],'Pelanggan':['MgmtDaftarHitam'],'Barang':['MgmtProduk','MgmtPromo','PosUnit'],'Manajemen':['MgmtSetuju'],'Saya':['TiketCS']};
/* manajer aset: menu mengikuti alur kerja (lapor → servis → QC → siap); persetujuan part ada di Beranda aset, stok/mutasi lewat Unit aset, detail servis lewat Papan servis */
var MASET={'Aset & servis':['AsetBeranda','AsetKalender','AsetOpname','AsetServis','PosQC','AsetPreventif','MgmtServis','AsetUnit','AsetData','AsetTim','AsetLaporan','AsetRisiko'],'Barang':['PosUnit'],'Manajemen':['MgmtSetuju'],'Saya':['TiketCS']};
/* boleh dibuka (lewat tautan di halaman) tapi tidak tampil di menu */
var FLD={PosAbsen:1,CekBuka:1};/* petugas lapangan absen & ceklis lewat ops.pokama.org */
var MHIDE={asset_manager:{MgmtServis:1,PosUnit:1,MgmtSetuju:1,AsetRisiko:1,PosQC:1,AsetPreventif:1,AsetData:1,AsetOpname:1,AsetTim:1},cashier:FLD,staff:FLD,branch_head:FLD,runner:FLD,technician:FLD,qc:FLD,driver:FLD};/* CS: satu pintu lewat tab di Pusat CS; aset owner: masuk lewat 4 pintu (sisanya tab di dalamnya) */
var CSH={MgmtInbox:1,TiketCS:1,AlatChat:1,MgmtTindakLanjut:1,MgmtPenawaran:1,LaporanShift:1};MHIDE.cs=CSH;MHIDE.cs_experience=CSH;MHIDE.experience_manager={MgmtSetuju:1};
MHIDE.owner={Housekeeping:1,MgmtInbox:1,TiketCS:1,AlatChat:1,MgmtTindakLanjut:1,MgmtPenawaran:1,LaporanShift:1,PosQC:1,AsetPreventif:1,AsetTim:1,AsetData:1,AsetRisiko:1,AsetOpname:1,AsetTandai:1,MgmtAset:1,MgmtPusatAset:1,MgmtServis:1,Teknisi:1,TekBelanja:1,TekAkun:1,PosUnit:1,AgendaLapangan:1,AkunLapangan:1,PosAbsen:1,CekBuka:1,MgmtLini:1,MgmtSegmen:1,MgmtDaftarHitam:1,MgmtHargaMusim:1,MgmtPromo:1,MgmtKonten:1,MgmtKorporat:1};/* audit Nov 2026: halaman saudara jadi tab di atas (SUBT) */
function mHid(role,n){return !!(MHIDE[role]&&MHIDE[role][n]);}
var SROLE={
 cashier:{'Harian':1,'Lapangan':1,'Barang':['PosUnit','AsetTandai'],'Pelanggan':['MgmtDaftarHitam']}, cs:CSM, cs_experience:CSM, staff:{'Harian':1,'Lapangan':1,'Barang':['PosUnit','AsetTandai'],'Pelanggan':['MgmtDaftarHitam']},
 branch_head:{'Saya':['TiketCS'],'Harian':1,'Lapangan':1,'Barang':['PosUnit','AsetTandai'],'Manajemen':['MgmtSetuju'],'Pelanggan':['MgmtDaftarHitam']},
 runner:{'Lapangan':1,'Penginapan & Jeep':['Housekeeping','SopirJeep'],'Saya':1}, technician:{'Aset & servis':['Teknisi','TekBelanja','TekAkun']}, qc:{'Saya':1,'Lapangan':1,'Penginapan & Jeep':['Housekeeping','ExpJeep','SopirJeep'],'Aset & servis':['Teknisi','PosQC']},
 asset_manager:MASET, experience_manager:MOPS,
 driver:{'Saya':1,'Lapangan':1,'Penginapan & Jeep':['ExpJeep','SopirJeep']},
 finance:{'Manajemen':['MgmtSetuju']},
 viewer:{'Operasional':['OpsBeranda','OpsKerja']}
};
var FAB={cs:'PosVerifikasi',cs_experience:'PosVerifikasi'};
var FIELD={cs:['ModulBeranda','PusatCS','OpsKalender','PosVerifikasi','PosHariIni'],cs_experience:['ModulBeranda','PusatCS','OpsKalender','PosVerifikasi','PosHariIni'],runner:['AgendaLapangan','Runner','Housekeeping','SopirJeep','AkunLapangan'],driver:['SopirJeep','ExpJeep','Runner','AkunLapangan'],technician:['Teknisi','TekBelanja','TekAkun'],qc:['PosQC','Teknisi','Runner','AkunLapangan'],
 owner:['ModulBeranda','OpsBeranda','PusatCS','MgmtSetuju'],viewer:['ModulBeranda','OpsBeranda'],finance:['MgmtSetuju'],
 asset_manager:['ModulBeranda','AsetBeranda','AsetKalender','AsetUnit','AsetServis','AsetLaporan'],experience_manager:['ModulBeranda','OpsBeranda','OpsKerja','OpsUnit','ExpKalender'],
 cashier:['ModulBeranda','PosHariIni','PosVerifikasi','PosKasir','PosSerahTerima'],staff:['ModulBeranda','PosHariIni','PosVerifikasi','PosKasir','PosSerahTerima'],branch_head:['ModulBeranda','PosHariIni','PosVerifikasi','PosSerahTerima','MgmtSetuju']};
/* peran yang layarnya memang dibuat untuk HP (tetap menu bawah walau dibuka di layar lebar tanpa kolom menu) */
var FIELDONLY={technician:1,cs:1,cs_experience:1,runner:1,driver:1,technician:1,qc:1};
var FLABEL={ModulBeranda:'Beranda',KonfirmasiTransfer:'Transfer',MgmtDaftarHitam:'Daftar hitam',Runner:'Antar',PosAbsen:'Absen',PosQC:'Cek barang',SopirJeep:'Jeep',ExpJeep:'Jadwal jeep',Teknisi:'Teknisi',ExpHariIni:'Penginapan',ExpKalender:'Kalender',Housekeeping:'Kamar',AkunLapangan:'Akun',AgendaLapangan:'Agenda',PusatCS:'Beranda',PosVerifikasi:'Verifikasi',MgmtInbox:'Chat',MgmtKeluhan:'Keluhan',TiketCS:'Keluhan',AlatChat:'Chat',
 MgmtDashboard:'Laporan',MgmtSetuju:'Setujui',OpsBeranda:'Beranda',MgmtPusatAset:'Aset',MgmtServis:'Servis & QC',MgmtTim:'Tim',OpsKerja:'Kerja lapangan',OpsUnit:'Utilisasi',OpsQC:'Kualitas',PosHariIni:'Hari ini',PosKasir:'Kasir',PosSerahTerima:'Serah-terima',KeuDasbor:'Keuangan'};
var FLABEL_R={cs:{PusatCS:'Pusat CS',OpsKalender:'Kalender',PosHariIni:'Jadwal'},cs_experience:{PusatCS:'Pusat CS',OpsKalender:'Kalender',PosHariIni:'Jadwal'},technician:{Teknisi:'Pekerjaan',TekBelanja:'Belanja part',TekAkun:'Akun'},owner:{OpsBeranda:'Operasional',PusatCS:'CS'},asset_manager:{AsetBeranda:'Hari ini',AsetKalender:'Kalender',AsetUnit:'Unit',AsetServis:'Servis',AsetLaporan:'Laporan'},experience_manager:{ExpJeep:'Jeep',ExpKalender:'Penginapan',OpsKerja:'Lapangan'}};
/* tab bawah tetap menyala saat membuka halaman "saudara"-nya */
var ALIAS={GantiPenyewa:'PosHariIni',AsetPreventif:'AsetServis',AsetData:'AsetUnit',AsetTim:'AsetLaporan',AsetOpname:'AsetUnit',AsetRisiko:'AsetBeranda',MgmtServis:'AsetServis',PosUnit:'AsetUnit',MgmtAset:'AsetUnit',TekPart:'TekBelanja',TekMasuk:'Teknisi',TekKerja:'Teknisi',TekSelesai:'Teknisi',MgmtAsetDetail:'AsetUnit',MgmtKelola:'MgmtAset',PosQC:'AsetServis',PosAbsen:'AkunLapangan',Housekeeping:'ExpKalender',LaporanShift:'PusatCS'};
/* halaman yang digabung dalam satu tab: tampilkan tombol pindah di atas */
var SUBT=[[['PusatCS','Beranda'],['MgmtInbox','Inbox WA'],['TiketCS','Keluhan'],['MgmtTindakLanjut','Tindak lanjut'],['MgmtPenawaran','Perjalanan'],['AlatChat','Template'],['LaporanShift','Shift']],[['AsetServis','Papan'],['PosQC','Cek QC'],['AsetPreventif','Preventif'],['MgmtServis','Aturan']],[['AsetUnit','Unit'],['AsetOpname','Stok opname'],['AsetData','Lengkapi data']],[['AsetLaporan','Kinerja & jatuh tempo'],['AsetTim','Tim teknisi & QC']],[['OpsBeranda','Hari ini'],['MgmtLini','Per lini']],[['MgmtPelanggan','Profil'],['MgmtSegmen','Broadcast'],['MgmtDaftarHitam','Daftar hitam']],[['MgmtProduk','Barang & harga'],['MgmtHargaMusim','Harga musim'],['MgmtPromo','Promo & member']],[['MgmtSumber','Sumber & iklan'],['MgmtKonten','Konten web'],['MgmtKorporat','Korporat & B2B']]];
var REST_TOP={asset_manager:[],experience_manager:['OpsKerja','ExpJeep','PosHariIni','MgmtPromo','MgmtProduk','KonfirmasiTransfer']};
var ALLG={};SNAV.forEach(function(g){ALLG[g[0]]=1;});
var MB_ROLES={viewer:1,experience_manager:1,asset_manager:1,cs:1,cs_experience:1,cashier:1,staff:1,branch_head:1};
function roleAllow(role){var r=role==='owner'?ALLG:(SROLE[role]||{'Harian':1});if(MB_ROLES[role]&&!r.Beranda){var o={Beranda:1};for(var k in r)o[k]=r[k];r=o;}return r;}
window.RA_MENU_ALLOWS=function(role,name){
  var inMenu=false,known=false,a=roleAllow(role);
  SNAV.forEach(function(g){g[1].forEach(function(it){if(it[0]!==name)return;known=true;var x=a[g[0]];if(x&&(x===1||x.indexOf(name)>-1))inMenu=true;});});
  if(!known)return null;return inMenu;
};
function flab(role,k,def){return (FLABEL_R[role]&&FLABEL_R[role][k])||FLABEL[k]||def;}
function menuItems(allow){var items=[],seen={};SNAV.forEach(function(g){var a=allow[g[0]];if(!a)return;g[1].forEach(function(it){if((a===1||a.indexOf(it[0])>-1)&&!seen[it[0]]){seen[it[0]]=1;items.push([it[0],it[1],it[2],g[0]]);}});});return items;}
function isOwnerReal(){return RA._staff&&(RA._staff.role==='owner'||RA._staff.realRole==='owner');}
function fico(k,c){return ico(k,c).replace('width="18" height="18"','width="22" height="22"');}
function fieldSheet(rest){
  var o=document.createElement('div');o.setAttribute('data-ra-sheet','1');o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','Menu lainnya');
  o.style.cssText='position:fixed;inset:0;z-index:100;background:rgba(31,43,77,.45);display:flex;align-items:flex-end;justify-content:center';
  var li='',lastG=null,many=rest.length>7;
  rest.forEach(function(it){var on=it[0]===current;
    if(many&&it[3]!==lastG){lastG=it[3];li+='<div style="font:700 12px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#6B7486;padding:8px 4px 0">'+it[3]+'</div>';}
    li+='<a href="'+it[0]+'.dc.html" data-k="go" style="min-height:'+(many?'44':'48')+'px;padding:0 14px;border-radius:12px;display:flex;align-items:center;gap:12px;text-decoration:none;font-weight:'+(on?'800':'700')+';font-size:15px;color:'+(on?'#077A70':'#1F2B4D')+';background:'+(on?'#E3F7F5':'#F6F7F9')+'">'+fico(it[1],on?'#077A70':'#4A5468')+it[2]+'</a>';});
  li+=pkSubHTML(true);
  if(isOwnerReal()&&!pkMode())li+='<a href="#/peta" data-k="go" style="min-height:44px;padding:0 14px;border-radius:12px;display:flex;align-items:center;gap:12px;text-decoration:none;font-weight:700;font-size:14px;color:#4A5468;background:#FFFFFF;border:1px dashed #D5D9E0">'+fico('folder','#8A93A3')+'Peta semua layar (owner)</a>';
  o.innerHTML='<div style="width:100%;max-width:480px;max-height:85vh;overflow-y:auto;background:#fff;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;font-family:\'Plus Jakarta Sans\',system-ui,sans-serif;color:#1F2B4D;display:flex;flex-direction:column;gap:8px">'+
    '<div style="width:40px;height:4px;border-radius:2px;background:#D5D9E0;align-self:center;margin-bottom:6px"></div><div style="font-size:16px;font-weight:800;margin-bottom:4px">Menu lainnya</div>'+li+
    '<button type="button" data-k="out" style="margin-top:6px;min-height:48px;border-radius:12px;border:1px solid #E3B7B2;background:#FFFFFF;color:#A12A1F;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer">Keluar dari akun</button></div>';
  o.addEventListener('click',function(e){var k=e.target.closest&&e.target.closest('[data-k]');if(k&&k.getAttribute('data-k')==='out'){o.remove();RA.signOut();RA.go('Masuk');return;}if(e.target===o||k)o.remove();});
  document.body.appendChild(o);
}
/* penjelasan panjang di bawah judul → 1 baris, ketuk ⓘ untuk membuka */
function clampDesc(root){
  Array.prototype.forEach.call(root.querySelectorAll('h1'),function(h){
    var d=h.nextElementSibling;if(!d||d.localName!=='div'||d.querySelector('input,select,button,a,img'))return;
    var t=(d.textContent||'').trim();if(t.length<70)return;
    d.style.display='-webkit-box';d.style.webkitBoxOrient='vertical';d.style.webkitLineClamp='1';d.style.overflow='hidden';d.style.cursor='pointer';d.title='Ketuk untuk membaca penjelasan';
    var i=document.createElement('span');i.textContent='ⓘ ';i.setAttribute('aria-hidden','true');i.style.cssText='color:#077A70;font-weight:800';d.insertBefore(i,d.firstChild);
    d.setAttribute('role','button');d.setAttribute('aria-expanded','false');
    d.addEventListener('click',function(){var op=d.style.webkitLineClamp!=='1';d.style.webkitLineClamp=op?'1':'unset';d.style.display=op?'-webkit-box':'block';d.setAttribute('aria-expanded',op?'false':'true');});
  });
}
function pvSelect(role,slim){
  var opts='<option value="">'+(RA._staff&&RA._staff.chief?'Kepala Staf (semua menu)':'Owner (semua menu)')+'</option>';Object.keys(RA.VIEW_ROLES||{}).forEach(function(k){opts+='<option value="'+k+'"'+(role===k?' selected':'')+'>'+RA.VIEW_ROLES[k]+'</option>';});
  return '<label style="display:flex;align-items:center;gap:8px;font:800 12px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#7A4B00;white-space:nowrap">Pratinjau<select data-viewas style="flex:1;min-width:0;height:'+(slim?'32':'34')+'px;border-radius:9px;border:1px solid #E6D3A3;padding:0 8px;font:700 13px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#1F2B4D;background:#FFFFFF">'+opts+'</select></label>';
}
function subTabs(role,allow){
  var ids=menuItems(allow).map(function(it){return it[0];});var grp=null;
  SUBT.forEach(function(g){var f=g.filter(function(x){return ids.indexOf(x[0])>-1;});if(f.length>1&&f.some(function(x){return x[0]===current;}))grp=f;});
  if(!grp)return null;
  var w=document.createElement('div');w.setAttribute('data-subt','1');w.style.cssText='width:100%;box-sizing:border-box;padding:10px 16px 0;align-self:stretch;flex:0 0 auto';
  w.innerHTML='<div role="tablist" style="max-width:'+(grp.length>5?'780':'560')+'px;margin:0 auto;display:grid;grid-template-columns:repeat('+grp.length+',minmax(0,1fr));gap:4px;background:#E9ECF0;border-radius:12px;padding:4px">'+grp.map(function(x){var on=x[0]===current;return '<a role="tab" aria-selected="'+on+'" href="'+x[0]+'.dc.html" style="height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;text-decoration:none;font:800 13px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#1F2B4D;background:'+(on?'#FFFFFF':'transparent')+';box-shadow:'+(on?'0 1px 3px rgba(31,43,77,.12)':'none')+'">'+x[1]+'</a>';}).join('')+'</div>';
  return w;
}
function fieldNav(root,nav,role,allow,isPv){
  var items=menuItems(allow);
  var pri=(FIELD[role]||[]).map(function(k){return items.filter(function(it){return it[0]===k;})[0];}).filter(Boolean).slice(0,5);
  var rest=items.filter(function(it){return pri.indexOf(it)<0&&!mHid(role,it[0])&&!(it[0]==='PosAbsen'&&pri.some(function(p){return p[0]==='AkunLapangan';}));});
  var priIds=pri.map(function(p){return p[0];});rest=rest.filter(function(it){return !SUBT.some(function(g){return g.some(function(x){return x[0]===it[0];})&&g.some(function(x){return x[0]!==it[0]&&priIds.indexOf(x[0])>-1;});});});
  if(role==='cs'||role==='cs_experience')rest=rest.map(function(it){return it[0]==='PosKasir'?[it[0],it[1],'Booking walk-in',it[3]]:it;});
  var top=REST_TOP[role];if(top){var a1=[],a2=[];rest.forEach(function(it){var k=top.indexOf(it[0]);if(k>-1)a1[k]=[it[0],it[1],it[2],'Sering dipakai'];else a2.push(it);});rest=a1.filter(Boolean).concat(a2);}
  var as=nav&&nav.closest?nav.closest('aside'):null;if(!as)as=root.querySelector(':scope > aside');
  if(nav)nav.style.display='none';
  var TEAL='linear-gradient(160deg,#09BEAF 0%,#077A70 100%)';var curL='';SNAV.forEach(function(g){g[1].forEach(function(it){if(it[0]===current)curL=it[2];});});
  if(!curL){var t0=root.querySelector('h1');curL=t0?t0.textContent.trim():'Rentalaja';}
  var ini=(RA.initials&&RA._staff)?RA.initials(RA._staff.name):'';var appbar=null;
  if(as){as.style.display='none';
    appbar=document.createElement('div');appbar.setAttribute('data-appbar','1');
    appbar.style.cssText='flex:1 1 100%;width:100%;box-sizing:border-box;background:'+TEAL+';color:#FFFFFF;padding:12px 16px;display:flex;align-items:center;gap:10px';
    appbar.innerHTML=(pkMode()?'<a href="'+pkBack()+'" aria-label="Kembali ke Sistem Kerja" style="width:30px;height:30px;border-radius:15px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>':'')+'<img src="logo.png" alt="Rentalaja" style="height:22px;width:auto;background:#FFFFFF;border-radius:7px;padding:3px 7px;display:block;flex-shrink:0"><div style="flex:1;min-width:0;font:800 16px \'Plus Jakarta Sans\',system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+curL+'</div><span style="width:34px;height:34px;border-radius:17px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font:800 13px \'Plus Jakarta Sans\',system-ui,sans-serif;flex-shrink:0">'+ini+'</span>';
    var bsel=as.querySelector('select[aria-label="Pilih cabang"]');if(bsel){bsel.style.cssText='height:32px;max-width:130px;border-radius:16px;border:0;padding:0 8px;font:700 12px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#1F2B4D;background:#FFFFFF;flex-shrink:1;min-width:0';appbar.insertBefore(bsel,appbar.lastChild);}
    root.insertBefore(appbar,root.firstChild);root.style.background='#F4F6F9';root.style.alignContent='flex-start';root.style.alignItems='flex-start';
    var mn=root.querySelector(':scope > main');if(mn){mn.style.padding='16px 16px 24px';mn.style.gap='14px';mn.style.alignSelf='stretch';mn.style.flex='1 1 100%';mn.style.maxWidth='100%';}
  }else if(rootSpec&&rootSpec.mobile){var hd0=root.querySelector('header');
    if(hd0&&!hd0.hasAttribute('data-hero')){hd0.style.background=TEAL;hd0.style.borderBottom='0';
      Array.prototype.forEach.call(hd0.querySelectorAll('div,span,b'),function(e){if(!/background/.test(e.getAttribute('style')||''))e.style.color='#FFFFFF';});
      var lg=hd0.querySelector('img');if(lg){lg.style.background='#FFFFFF';lg.style.borderRadius='8px';lg.style.padding='3px 8px';lg.style.height='22px';}}}
  Array.prototype.forEach.call(root.querySelectorAll('[data-wa-share]'),function(x){x.style.display='none';});
  var anchor=appbar;
  if(isPv){var pb=document.createElement('div');pb.setAttribute('data-snav','1');pb.style.cssText='padding:6px 16px;width:100%;box-sizing:border-box;align-self:stretch;background:#FFF6E0;flex:'+(as?'1 1 100%':'0 0 auto');
    pb.innerHTML='<div style="max-width:520px;margin:0 auto">'+pvSelect(role,true)+'</div>';
    if(appbar)root.insertBefore(pb,appbar.nextSibling);else{var hd=root.querySelector('header');if(hd&&hd.hasAttribute('data-hero'))hd.parentNode.insertBefore(pb,hd);else if(hd&&hd.parentNode)hd.parentNode.insertBefore(pb,hd.nextSibling);else root.insertBefore(pb,root.firstChild);}
    anchor=pb;var sv=pb.querySelector('select[data-viewas]');if(sv)sv.addEventListener('change',function(){RA.viewAs(sv.value||null);});}
  var st=subTabs(role,allow);if(st){if(as&&anchor)root.insertBefore(st,anchor.nextSibling);else{var hdx=root.querySelector('header');if(hdx&&hdx.parentNode)hdx.parentNode.insertBefore(st,hdx.nextSibling);else root.insertBefore(st,root.firstChild);}}
  var alias=ALIAS[current]&&!pri.some(function(p){return p[0]===current;})?ALIAS[current]:null;
  var inRest=rest.some(function(it){return it[0]===current;})&&!alias;
  var tab=function(href,ic,label,on){var col=on?'#077A70':'#6B7486';return '<'+(href?'a href="'+href+'"':'button type="button" data-more="1"')+(on?' aria-current="page"':'')+' style="'+(href?'text-decoration:none;':'border:0;background:none;padding:0;cursor:pointer;')+'color:'+col+';display:flex;flex-direction:column;align-items:center;gap:2px;font:'+(on?'800':'700')+' 11px \'Plus Jakarta Sans\',system-ui,sans-serif;min-width:0"><span style="width:48px;height:30px;border-radius:15px;display:flex;align-items:center;justify-content:center;'+(on?'background:#E3F7F5':'')+'">'+ic+'</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">'+label+'</span></'+(href?'a':'button')+'>';};
  var FABK=FAB[role];
  var big=function(href,ic,label,on){return '<a href="'+href+'"'+(on?' aria-current="page"':'')+' style="text-decoration:none;color:'+(on?'#077A70':'#1F2B4D')+';display:flex;flex-direction:column;align-items:center;gap:3px;font:800 11px \'Plus Jakarta Sans\',system-ui,sans-serif;min-width:0;margin-top:-26px"><span style="width:60px;height:60px;border-radius:30px;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#09BEAF 0%,#077A70 100%);box-shadow:0 6px 16px rgba(7,122,112,.35),0 0 0 5px #FFFFFF">'+ic+'</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">'+label+'</span></a>';};
  var h=pri.map(function(it){var on=it[0]===current||it[0]===alias;if(it[0]===FABK)return big(it[0]+'.dc.html',fico(it[1],'#FFFFFF').replace(/width="\d+" height="\d+"/,'width="28" height="28"'),flab(role,it[0],it[2]),on);return tab(it[0]+'.dc.html',fico(it[1],on?'#077A70':'#6B7486'),flab(role,it[0],it[2]),on);}).join('');
  var dots='<svg width="22" height="22" viewBox="0 0 24 24" fill="'+(inRest?'#077A70':'#6B7486')+'" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  h+=tab(null,dots,'Lainnya',inRest);
  var bar=document.createElement('nav');bar.setAttribute('aria-label','Menu bawah');bar.setAttribute('data-ra-field','1');
  bar.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:0;width:100%;max-width:480px;height:calc(66px + env(safe-area-inset-bottom));padding:0 4px env(safe-area-inset-bottom);box-sizing:border-box;background:#FFFFFF;border-top:1px solid #E8EBEF;box-shadow:0 -4px 16px rgba(31,43,77,.06);display:grid;grid-template-columns:repeat('+(pri.length+1)+',minmax(0,1fr));align-items:center;z-index:45';
  Array.prototype.forEach.call(root.querySelectorAll('nav'),function(n){var st=n.getAttribute('style')||'';if(n!==bar&&/position:\s*(absolute|fixed)/.test(st)&&/bottom:\s*0/.test(st))n.style.display='none';});
  bar.innerHTML=h;root.appendChild(bar);
  var mb=bar.querySelector('[data-more]');if(mb)mb.addEventListener('click',function(){fieldSheet(rest);});
  var pbm=parseInt(root.style.paddingBottom||'0',10)||0;if(pbm<84)root.style.paddingBottom='84px';
}
/* layar lebar tanpa kolom menu (layar HP seperti Runner, Pusat CS): beri kolom menu kiri yang sama dengan halaman lain */
/* mode Pusat Kerja Pokama (dibuka dari modul di Sistem Kerja): panel terfokus + jalan kembali ke Sistem Kerja */
function pkMode(){try{var v=JSON.parse(localStorage.getItem('ra.pk')||'null');return v&&v.t&&Date.now()-v.t<12*3600e3?v:null;}catch(e){return null;}}
/* staf lapangan masuk dari Sistem Kerja Operasional (ops.pokama.org): kembali ke Shift Saya */
function pkBack(){var m=pkMode();return m&&m.ops?'https://ops.pokama.org/#/shift':'https://app.pokama.org/';}
function pkHead(){var m=pkMode();if(!m)return '';
  return '<a href="'+pkBack()+'" data-pkback="1" style="display:flex;align-items:center;gap:9px;padding:9px 11px;border-radius:12px;background:#1F2B4D;color:#FFFFFF;text-decoration:none;font-family:\'Plus Jakarta Sans\',system-ui,sans-serif"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#09BEAF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span style="display:flex;flex-direction:column;line-height:1.2"><b style="font-size:13.5px;font-weight:800">'+(m.ops?'Shift Saya':'Sistem Kerja Pokama')+'</b><small style="font-size:11px;font-weight:600;color:#C9D3E0">'+(m.ops?'Absen, ceklis, lembur':'Kembali ke KKH & menu modul')+'</small></span></a>'+
    (m.mod?'<div style="padding:2px 12px 0;font:600 12px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#6B7486">'+(m.ops?'Panel ':'Modul ')+String(m.mod).replace(/[<>&"]/g,'')+(m.sub&&m.sub!==m.mod?' · '+String(m.sub).replace(/[<>&"]/g,''):'')+'</div>':'');}
/* panel di dalam modul (dibuka dari Sistem Kerja): owner bisa pindah ke panel CS, lapangan, cabang, teknisi */
var PKSUB={Operasional:[['Operasional','experience_manager','OpsBeranda',null],['CS','cs','PusatCS',null],['Lapangan','runner','AgendaLapangan',null],['Cabang Garut Kota','cashier','PosHariIni',['GRT']],['Cabang Wanaraja','cashier','PosHariIni',['WNR']],['Cabang Bandung','cashier','PosHariIni',['BDG-HUB','BDG-JKL']],['Cabang Maripoto','cashier','PosHariIni',['MPT']]],
  Aset:[['Aset','asset_manager','AsetBeranda',null],['Teknisi','technician','Teknisi',null]]};
function pkMark(x){var n=x[0],k=/Garut/.test(n)?['GK','#0F766E']:/Wanaraja/.test(n)?['WR','#0F766E']:/Bandung/.test(n)?['BD','#0F766E']:/Maripoto/.test(n)?['MP','#B0466B']:n==='CS'?['CS','#0A8F86']:n==='Lapangan'?['L','#2563EB']:n==='Teknisi'?['T','#6B4F2A']:n==='Aset'?['A','#C2410C']:['O','#1D3149'];
  return '<span style="position:relative;width:26px;height:26px;border-radius:8px;background:#FFFFFF;border:1.5px solid '+k[1]+';box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;flex:none;margin-right:2px"><img src="img/ra-mark.png" alt="" style="width:16px;height:16px;object-fit:contain;display:block"><i style="position:absolute;right:-6px;bottom:-6px;min-width:14px;height:14px;border-radius:7px;background:'+k[1]+';color:#FFFFFF;font:900 8.5px/14px \'Plus Jakarta Sans\',system-ui,sans-serif;font-style:normal;text-align:center;padding:0 2px;box-shadow:0 0 0 2px #FFFFFF;box-sizing:border-box">'+k[0]+'</i></span>';}
function pkSubs(){var m=pkMode();if(!m||!isOwnerReal())return null;var l=PKSUB[m.mod];return l&&l.length>1?l:null;}
function pkSubHTML(field){var m=pkMode(),l=pkSubs();if(!l)return '';var cur=m.sub||l[0][0];
  return '<div style="display:flex;flex-direction:column;gap:2px;margin-top:'+(field?'10':'4')+'px;padding-top:12px;border-top:1px solid #E6E8EC"><div style="font:700 12px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#6B7486;padding:0 12px 4px">Panel '+m.mod+'</div>'+
    l.map(function(x,i){var on=x[0]===cur;return '<a href="#" data-pksub="'+i+'" style="min-height:40px;padding:0 12px;border-radius:10px;display:flex;align-items:center;gap:10px;text-decoration:none;font:'+(on?'800':'600')+' 14px \'Plus Jakarta Sans\',system-ui,sans-serif;color:'+(on?'#077A70':'#1F2B4D')+';background:'+(on?'#E3F7F5':'transparent')+'">'+pkMark(x)+''+x[0]+'</a>';}).join('')+'</div>';}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-pksub]');if(!a)return;e.preventDefault();var m=pkMode(),l=pkSubs();if(!m||!l)return;var x=l[+a.getAttribute('data-pksub')];if(!x)return;
  try{localStorage.setItem('ra.viewAs',JSON.stringify(x[1]));localStorage.setItem('ra.pk',JSON.stringify({mod:m.mod,sub:x[0],br:x[3],t:m.t}));localStorage.removeItem('ra.staff.branch');localStorage.removeItem('ra.ctx.staff');}catch(er){}
  location.hash='#/'+x[2];location.reload();},true);
/* menu kiri ringkas per peran: [judul kelompok, [layar...]]; layar lain yang boleh dibuka masuk "Lainnya" */
var SIDE_LAYOUT={experience_manager:[['Hari ini',['OpsBeranda','OpsKerja','OpsQC']],['Kasir cabang',['PosHariIni','PosVerifikasi','PosKasir','PosSerahTerima','PosShift']],['Unit & barang',['OpsKalender','OpsUnit','PosUnit','MgmtProduk','MgmtPromo']],['Penginapan & jeep',['ExpKalender','ExpJeep','KonfirmasiTransfer']]]};
function sideGroups(role,allow){var all=[],idx={};SNAV.forEach(function(g){var a=allow[g[0]];if(!a)return;g[1].forEach(function(it){if((a===1||a.indexOf(it[0])>-1)&&!mHid(role,it[0])&&!idx[it[0]]){idx[it[0]]=it;all.push(it);}});});
  var L=SIDE_LAYOUT[role];if(!L)return null;var used={},out=[];L.forEach(function(g){var its=g[1].map(function(k){return idx[k];}).filter(Boolean);its.forEach(function(it){used[it[0]]=1;});if(its.length)out.push([g[0],its]);});
  var rest=all.filter(function(it){return !used[it[0]];});if(rest.length)out.push(['Lainnya',rest]);return out;}
function sideHTML(role,allow,isPv){
  var h='';var GL=sideGroups(role,allow);(GL||SNAV).forEach(function(g){var items;if(GL)items=g[1];else{var a=allow[g[0]];if(!a)return;items=g[1].filter(function(it){return (a===1||a.indexOf(it[0])>-1)&&!mHid(role,it[0]);});}if(!items.length)return;
    h+='<div style="display:flex;flex-direction:column;gap:2px"><div style="font:700 12px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#8A93A3;padding:0 12px 4px">'+g[0]+'</div>';
    items.forEach(function(it){var on=it[0]===current||(ALIAS[current]===it[0]&&!items.some(function(x){return x[0]===current;})&&false);
      h+='<a href="'+it[0]+'.dc.html"'+(on?' aria-current="page"':'')+' style="min-height:40px;box-sizing:border-box;padding:0 12px;border-radius:10px;background:'+(on?'#E3F7F5':'transparent')+';color:'+(on?'#077A70':'#1F2B4D')+';font:'+(on?'800':'600')+' 14px \'Plus Jakarta Sans\',system-ui,sans-serif;display:flex;align-items:center;gap:10px;text-decoration:none"><span style="width:20px;display:flex;justify-content:center">'+ico(it[1],on?'#077A70':'#6B7486')+'</span>'+it[2]+'</a>';});
    h+='</div>';});
  if(isOwnerReal()&&!pkMode())h+='<a href="#/peta" style="min-height:36px;padding:0 12px;border-radius:10px;border:1px dashed #D5D9E0;color:#4A5468;font:700 13px \'Plus Jakarta Sans\',system-ui,sans-serif;display:flex;align-items:center;text-decoration:none">Peta semua layar (owner)</a>';
  h+=pkSubHTML(false);
  return pkHead()+((isPv&&!pkMode())?'<div style="padding:8px 10px;border-radius:12px;background:#FFF6E0">'+pvSelect(role,true)+'</div>':'')+h;
}
function deskShell(root,role,allow,isPv){
  var sh=document.createElement('aside');sh.setAttribute('data-dshell','1');
  sh.style.cssText='position:fixed;left:0;top:0;bottom:0;width:248px;box-sizing:border-box;background:#FFFFFF;border-right:1px solid #E6E8EC;padding:20px 16px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;z-index:46;font-family:\'Plus Jakarta Sans\',system-ui,sans-serif';
  var st=RA._staff||{};
  sh.innerHTML='<img src="logo.png" alt="Rentalaja" style="height:28px;width:auto;align-self:flex-start;display:block"><nav aria-label="Menu" style="display:flex;flex-direction:column;gap:14px">'+sideHTML(role,allow,isPv)+'</nav>'+
    '<div style="margin-top:auto;display:flex;align-items:center;gap:10px;padding-top:14px;border-top:1px solid #E6E8EC"><div style="width:36px;height:36px;border-radius:18px;background:#1F2B4D;color:#09BEAF;font:800 13px \'Plus Jakarta Sans\',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+(RA.initials?RA.initials(st.name):'')+'</div><div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font:700 13px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#1F2B4D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(st.name||'')+'</span><span style="font:600 12px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#4A5468">'+((RA.VIEW_ROLES||{})[st.role]||(st.role==='owner'?(st.chief?'Kepala Staf':'Owner'):''))+'</span></div><button type="button" data-out="1" style="border:0;background:none;font:700 13px \'Plus Jakarta Sans\',system-ui,sans-serif;color:#4A5468;cursor:pointer">Keluar</button></div>';
  document.body.appendChild(sh);document.body.style.paddingLeft='248px';
  var sv=sh.querySelector('select[data-viewas]');if(sv)sv.addEventListener('change',function(){RA.viewAs(sv.value||null);});
  var ob=sh.querySelector('[data-out]');if(ob)ob.addEventListener('click',function(){RA.signOut();RA.go('Masuk');});
  window.__dshell=true;
}
function clearShell(){var o=document.querySelectorAll('[data-dshell]');Array.prototype.forEach.call(o,function(x){x.remove();});if(window.__dshell){document.body.style.paddingLeft='';window.__dshell=false;}if(screenEl){screenEl.style.maxWidth='';screenEl.style.boxShadow='';screenEl.style.background='';}}
/* setelah adapt(): layar HP di layar lebar dengan kolom menu → lebar konsisten, tidak "mengambang" */
function deskFix(root){
  if(!window.__dshell||!rootSpec)return;
  if(rootSpec.mobile){screenEl.style.maxWidth='760px';screenEl.style.boxShadow='none';screenEl.style.background='transparent';root.style.maxWidth='760px';root.style.background='#F4F6F9';
    Array.prototype.forEach.call(root.querySelectorAll('[style*="position: fixed"],[style*="position:fixed"]'),function(el){if(el.getAttribute('data-ra-field'))return;if(el.style.maxWidth==='430px'){el.style.maxWidth='760px';el.style.left='calc(50% + 124px)';}});}
}
function prefetchRole(role){if(window.__pf===role||!MAN)return;window.__pf=role;var ids={};(FIELD[role]||[]).concat(Object.keys(ALIAS)).forEach(function(n){var b=bundleFor(n);if(b)ids[b.id]=b;});var go=function(){Object.keys(ids).forEach(function(k){loadBundle(ids[k]).catch(function(){});});};if(window.requestIdleCallback)requestIdleCallback(go,{timeout:4000});else setTimeout(go,1500);}
/* layar lebar: halaman yang digabung (SUBT) tampil sebagai tab di atas konten */
function deskSub(root,role,allow){if(root.querySelector('[data-subt]'))return;var st=subTabs(role,allow);if(!st)return;st.style.padding='12px 16px 0';st.style.flex='0 0 auto';var hdx=root.querySelector(':scope > header')||root.querySelector('header');if(hdx&&hdx.parentNode){hdx.parentNode.insertBefore(st,hdx.nextSibling);var nx=st.nextElementSibling,a1=st.getBoundingClientRect(),b1=nx&&(nx.firstElementChild||nx).getBoundingClientRect();if(b1&&b1.top<a1.bottom-4){st.style.padding='12px 16px';hdx.parentNode.insertBefore(st,hdx);}}else root.insertBefore(st,root.firstChild);}
function staffNav(root){
  clearShell();if(window.RA&&RA._staff)prefetchRole(RA._staff.role);
  if(!window.RA||!RA.kindOf||RA.kindOf(current)!=='staff'||!RA._staff)return;
  var nav=root.querySelector('nav[aria-label="Menu"]');var narrow=window.innerWidth<760;
  var role=(RA._staff&&RA._staff.role)||'';var allow=roleAllow(role);
  var isPv=isOwnerReal()&&!!RA.VIEW_ROLES&&!pkMode();
  clampDesc(root);
  var hasAside=!!(nav&&nav.closest&&nav.closest('aside'))||!!root.querySelector(':scope > aside');
  var known=window.RA_MENU_ALLOWS(role,current)!==null||FIELD[role]&&FIELD[role].indexOf(current)>-1;
  if(narrow||(!hasAside&&FIELDONLY[role]&&window.innerWidth<1000)){fieldNav(root,nav,role,allow,isPv);return;}
  if(!hasAside){if(known||RA_MENU_ALLOWS(role,current)!==false){deskShell(root,role,allow,isPv);deskSub(root,role,allow);}return;}
  nav.setAttribute('style','display:flex;flex-direction:column;gap:14px');
  nav.innerHTML=sideHTML(role,allow,isPv);deskSub(root,role,allow);
  var asd=nav.closest('aside');if(asd){var lg=asd.querySelector('img[src="logo.png"]'),nx=lg&&lg.nextElementSibling;if(nx&&nx!==nav&&nx.tagName==='DIV'&&!nx.querySelector('select,a,button,input')&&nx.textContent.trim().length<30)nx.remove();}
  var sv=nav.querySelector('select[data-viewas]');if(sv)sv.addEventListener('change',function(){RA.viewAs(sv.value||null);});
}
function flowClose(root){
  var kind=FLOW[current];if(!kind||!rootSpec||!rootSpec.mobile)return;
  var back=root.querySelector('a[aria-label="Kembali"]');if(!back)return;
  var row=back.parentElement;if(!row||row.querySelector('[data-ra-close]'))return;
  var x=document.createElement('button');x.type='button';x.setAttribute('aria-label','Tutup');x.setAttribute('data-ra-close',kind);
  x.style.cssText='height:44px;padding:0 6px 0 10px;display:flex;align-items:center;gap:4px;margin-left:auto;flex:none;border:0;background:none;color:#4A5468;font:700 14px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer';
  x.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A5468" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>Tutup';
  row.appendChild(x);
}
var SHEET={cart:['Keluar dari booking?','Isi keranjang tetap tersimpan. Anda bisa melanjutkan kapan saja dari Keranjang.','Home'],
  'new':['Keluar dari booking?','Pilihan tanggal dan isian di halaman ini belum dikirim, jadi tidak tersimpan.','Home'],
  saved:['Bayar nanti?','Booking Anda sudah tercatat. Lanjutkan pembayaran kapan saja dari Booking saya.','Status']};
function openSheet(kind){
  var t=SHEET[kind]||SHEET['new'];var q=location.hash.indexOf('?');var dest=t[2]+'.dc.html'+(kind==='saved'&&q>-1?location.hash.slice(q):'');
  var o=document.createElement('div');o.setAttribute('data-ra-sheet','1');o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
  o.style.cssText='position:fixed;inset:0;z-index:100;background:rgba(31,43,77,.45);display:flex;align-items:flex-end;justify-content:center';
  o.innerHTML='<div style="width:100%;max-width:430px;background:#fff;border-radius:20px 20px 0 0;padding:22px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box;font-family:\'Plus Jakarta Sans\',system-ui,sans-serif;color:#1F2B4D;display:flex;flex-direction:column;gap:10px">'+
    '<div style="font-size:18px;font-weight:800">'+t[0]+'</div><div style="font-size:14px;line-height:21px;color:#4A5468">'+t[1]+'</div>'+
    '<button type="button" data-k="stay" style="margin-top:8px;height:48px;border:0;border-radius:12px;background:#09BEAF;color:#1F2B4D;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer">Lanjutkan booking</button>'+
    '<a href="'+dest+'" data-k="leave" style="height:48px;border-radius:12px;border:1px solid #E6E8EC;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;text-decoration:none;color:#1F2B4D">'+(kind==='saved'?'Ke Pesanan':'Keluar')+'</a></div>';
  o.addEventListener('click',function(e){if(e.target===o||e.target.closest('[data-k]'))o.remove();});
  document.body.appendChild(o);o.querySelector('[data-k=stay]').focus();
}
document.addEventListener('click',function(e){var x=e.target.closest&&e.target.closest('[data-ra-close]');if(x){e.preventDefault();openSheet(x.getAttribute('data-ra-close'));}},true);
window.addEventListener('hashchange',function(){var s=document.querySelector('[data-ra-sheet]');if(s)s.remove();});

/* ---------- render ---------- */
function render(){
  if(!inst||!rootSpec)return;
  var vals;try{vals=inst.renderVals()||{};}catch(e){console.error(e);vals={};}
  var scopes=[vals,{RA:window.RA}];
  var act=document.activeElement, focusInfo=null;
  if(act&&screenEl.contains(act)&&(act.localName==='input'||act.localName==='textarea')){
    var all=screenEl.querySelectorAll('input,textarea,select');focusInfo={i:Array.prototype.indexOf.call(all,act),s:act.selectionStart,e:act.selectionEnd};
  }
  var y=window.scrollY;
  var frag=document.createDocumentFragment();
  build(rootSpec.tpl,scopes,frag);
  screenEl.innerHTML='';screenEl.appendChild(frag);
  var root=screenEl.firstElementChild; if(root){custNav(root);staffNav(root);adapt(root);deskFix(root);flowClose(root);cartUI(root);}
  if(focusInfo&&focusInfo.i>-1){var all2=screenEl.querySelectorAll('input,textarea,select');var t=all2[focusInfo.i];if(t){t.focus({preventScroll:true});try{t.setSelectionRange(focusInfo.s,focusInfo.e);}catch(e){}}}
  window.scrollTo(0,y);
}

/* ---------- keranjang: ikon di atas + bar melayang saat ada isi ---------- */
var CART_ICON={Home:1,Katalog:1,Cari:1,Produk:1},CART_BAR={Home:1,Katalog:1,Cari:1};
function cartUI(root){
  if(!rootSpec||!rootSpec.mobile||!CART_ICON[current])return;
  var n=0;try{var c=JSON.parse(localStorage.getItem('ra.ctx')||'{}');n=(c&&c.cart||[]).length;}catch(e){}
  var a=document.createElement('a');a.href='Keranjang.dc.html';a.setAttribute('aria-label','Keranjang'+(n?' ('+n+' barang)':''));a.setAttribute('data-ra-cart','1');
  a.setAttribute('style','position:relative;width:36px;height:36px;flex-shrink:0;border-radius:18px;background:#FFFFFF;box-shadow:0 2px 8px rgba(31,43,77,0.16);display:flex;align-items:center;justify-content:center;text-decoration:none');
  a.innerHTML='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1F2B4D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICO.cart+'</svg>'+
    (n?'<span style="position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;box-sizing:border-box;border-radius:9px;background:#E4553F;color:#FFFFFF;font-size:10.5px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #FFFFFF">'+(n>9?'9+':n)+'</span>':'');
  var en=current==='Home'&&root.querySelector('a[href="HomeEn.dc.html"]');
  if(en){var w=document.createElement('span');w.setAttribute('style','display:flex;align-items:center;gap:8px');en.parentNode.insertBefore(w,en);w.appendChild(a);w.appendChild(en);}
  else{if(getComputedStyle(root).position==='static')root.style.position='relative';a.style.position='absolute';a.style.top='12px';a.style.right='16px';a.style.zIndex='30';root.appendChild(a);}
  if(!n||!CART_BAR[current])return;
  var nav=null;Array.prototype.forEach.call(root.children,function(el){if(el.localName==='nav'&&el.style.position==='fixed')nav=el;});
  var nh=nav?nav.offsetHeight:0;
  var bar=document.createElement('a');bar.href='Keranjang.dc.html';bar.setAttribute('data-ra-cartbar','1');
  bar.setAttribute('style','position:fixed;left:50%;transform:translateX(-50%);bottom:'+(nh+10)+'px;width:calc(100% - 24px);max-width:406px;box-sizing:border-box;z-index:41;background:#09BEAF;color:#1F2B4D;border-radius:16px;padding:11px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-decoration:none;box-shadow:0 6px 18px rgba(9,190,175,0.35);font-family:inherit');
  bar.innerHTML='<span style="display:flex;align-items:center;gap:10px"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2B4D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICO.cart+'</svg><span style="display:flex;flex-direction:column"><b style="font-size:14.5px;font-weight:800">'+n+' barang di keranjang</b><span style="font-size:12px;font-weight:600;opacity:.8">Lanjutkan pesanan</span></span></span><b style="font-size:14.5px;font-weight:800;white-space:nowrap">Lihat →</b>';
  root.appendChild(bar);
  root.style.paddingBottom=((parseInt(root.style.paddingBottom||'0',10)||nh)+bar.offsetHeight+10)+'px';
}

/* ---------- bundles & patches ---------- */
function inflate(buf){
  if(typeof DecompressionStream==='undefined')return Promise.reject(new Error('Browser terlalu lama. Perbarui browser Anda.'));
  var ds=new DecompressionStream('deflate');
  return new Response(new Blob([buf]).stream().pipeThrough(ds)).text();
}
function loadBundle(b){
  if(loadingBundles[b.id])return loadingBundles[b.id];
  return loadingBundles[b.id]=Promise.all(b.chunks.map(function(u){return fetch(u).then(function(r){if(!r.ok)throw new Error(u+' '+r.status);return r.arrayBuffer();});}))
  .then(function(parts){var len=parts.reduce(function(s,p){return s+p.byteLength;},0),all=new Uint8Array(len),o=0;parts.forEach(function(p){all.set(new Uint8Array(p),o);o+=p.byteLength;});return inflate(all);})
  .then(function(txt){var d=JSON.parse(txt);Object.keys(d.files).forEach(function(k){FILES[k]=d.files[k];});});
}
function bundleFor(name){for(var i=0;i<MAN.bundles.length;i++){if(MAN.bundles[i].screens.indexOf(name)>-1)return MAN.bundles[i];}return null;}
function applyPatch(orig,p){
  if(p.full!=null)return p.full;
  var lines=orig.split('\n'),out=[],pos=0;
  p.ops.forEach(function(op){for(;pos<op[0];pos++)out.push(lines[pos]);Array.prototype.push.apply(out,op[2]);pos=op[1];});
  for(;pos<lines.length;pos++)out.push(lines[pos]);
  return out.join('\n');
}
var SRCP={};
function getSource(name){
  var key=name+'.dc.html';
  if(PATCHED[key])return Promise.resolve(PATCHED[key]);
  if(SRCP[key])return SRCP[key];
  var pv=MAN.patches[name], b=bundleFor(name);
  var base=function(){return b&&!FILES[key]?loadBundle(b):Promise.resolve();};
  /* patch & bundle diambil bersamaan; patch "full" tidak perlu menunggu bundle */
  var pr=!pv?base().then(function(){return FILES[key]||null;}):
    fetch('screens/'+name+'.json?v='+pv).then(function(r){if(!r.ok)throw new Error('patch '+name);return r.json();})
      .then(function(p){if(p.full!=null)return PATCHED[key]=p.full;return base().then(function(){if(FILES[key]==null)throw new Error('base '+name);return PATCHED[key]=applyPatch(FILES[key],p);});});
  if(pv&&b&&!FILES[key])loadBundle(b).catch(function(){});
  SRCP[key]=pr;pr.catch(function(){delete SRCP[key];});
  return pr;
}

/* ---------- load a screen ---------- */
function parseProps(json){var p={};try{var o=JSON.parse(json||'{}');Object.keys(o).forEach(function(k){if(k.charAt(0)!=='$'&&o[k]&&'default' in o[k])p[k]=o[k]['default'];});}catch(e){}return p;}
function mount(name,src){
  if(inst&&inst.componentWillUnmount){try{inst.componentWillUnmount();}catch(e){}}
  inst=null;
  src=src.replace(/<sc-for\b/g,'<template data-scfor').replace(/<\/sc-for>/g,'</template>').replace(/<sc-if\b/g,'<template data-scif').replace(/<\/sc-if>/g,'</template>');
  var doc=new DOMParser().parseFromString(src,'text/html');
  var xdc=doc.querySelector('x-dc');
  helmetBox.innerHTML='';
  var hel=xdc&&xdc.querySelector('helmet');
  if(hel)Array.prototype.forEach.call(hel.querySelectorAll('style'),function(s){var st=document.createElement('style');st.textContent=s.textContent.replace(/body\s*\{[^}]*\}/g,'');helmetBox.appendChild(st);});
  var rootTpl=null;
  for(var c=xdc.firstElementChild;c;c=c.nextElementSibling){if(c.localName!=='helmet'){rootTpl=c;break;}}
  var w=rootTpl&&(rootTpl.getAttribute('style')||'').match(/(?:^|;)\s*width:\s*(\d+)px/);
  var mobile=!!(w&&+w[1]<=480);
  screenEl.className=mobile?'mobile':'wide';
  rootSpec={tpl:xdc,mobile:mobile};
  var sc=doc.querySelector('script[data-dc-script]');
  var Comp=DCLogic;
  try{Comp=new Function('DCLogic','RA',sc.textContent+'\n;return typeof Component!=="undefined"?Component:DCLogic;')(DCLogic,window.RA);}catch(e){console.error('script',name,e);}
  try{inst=new Comp(parseProps(sc&&sc.getAttribute('data-props')));}catch(e){console.error(e);inst=new DCLogic({});}
  if(!inst.state)inst.state={};
  inst.params=window.RA?RA.params():{};
  document.title=(doc.title||name)+' · Rentalaja';
  current=name;
  render();
  window.scrollTo(0,0);
  if(inst.componentDidMount){try{var r=inst.componentDidMount();if(r&&r.catch)r.catch(function(e){console.error(e);});}catch(e){console.error(e);}}
}
function show(name){
  var seq=++showSeq;
  if(name==='peta')return peta();
  if(!MAN)return;
  /* ambil kode layar bersamaan dengan cek login/akses (tidak berurutan) */
  getSource(name).catch(function(){});
  var guard=window.RA&&RA.beforeShow?RA.beforeShow(name):Promise.resolve(name);
  return Promise.resolve(guard).then(function(target){
    if(seq!==showSeq)return;
    target=target||name;
    return getSource(target).then(function(src){
      if(seq!==showSeq)return;
      if(!src){if(target!=='Home')return show('Home');return peta();}
      mount(target,src);
      if(target!==name){var q=location.hash.indexOf('?');history.replaceState(null,'','#/'+target+(q>-1?location.hash.slice(q):''));}
    });
  }).catch(function(err){console.error(err);screenEl.innerHTML='<div class="ra-load">Gagal memuat layar. Periksa koneksi lalu coba lagi.<br><br><button onclick="location.reload()" class="ra-btn">Muat ulang</button></div>';});
}
window.RA_SHOW=function(){route();};
var GN={'0':'Peta alur','1':'Pelanggan · sewa barang dan transportasi','2':'Pelanggan · menginap dan trip Jeep','3':'Pelanggan · akun dan fitur pendukung','4':'Pelanggan · saat ada kendala','5':'Web desktop dan pesan otomatis','6':'Panel cabang (kasir, CS, serah-terima)','7':'Panel Experience','8':'Aplikasi lapangan: teknisi, runner, sopir','9':'Panel manajemen','10':'Panel Keuangan','11':'Mitra dan investor','12':'Masuk'};
function peta(){
  if(inst&&inst.componentWillUnmount){try{inst.componentWillUnmount();}catch(e){}}
  clearShell();inst=null;rootSpec=null;current='peta';helmetBox.innerHTML='';screenEl.className='';
  var groups={},order=[];
  TITLES.forEach(function(t){var g=t[1].split('.')[0];if(!groups[g]){groups[g]=[];order.push(g);}groups[g].push(t);});
  var h='<div class="ra-peta"><h1>Semua layar</h1><p>Aplikasi Rentalaja. Pelanggan mulai dari Beranda; staf dan manajemen masuk lewat halaman Masuk staf.</p>';
  order.forEach(function(g){h+='<h2>'+(GN[g]||('Bagian '+g))+'</h2>';groups[g].forEach(function(t){h+='<a href="#/'+t[0]+'">'+t[1].replace(/^[\d.]+\s*·\s*/,'')+'<span>'+t[1].split(' ')[0]+'</span></a>';});});
  screenEl.innerHTML=h+'</div>';document.title='Semua layar · Rentalaja';window.scrollTo(0,0);
}
function route(){var h=decodeURIComponent((location.hash||'').replace(/^#\/?/,''))||'Home';show(h.split('?')[0].split('#')[0]);}

/* ---------- link handling ---------- */
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;
  var href=a.getAttribute('href');
  var m=href.match(/^([A-Za-z0-9_]+)\.dc\.html(\?[^#]*)?(#.*)?$/);
  if(m){e.preventDefault();var h='#/'+m[1]+(m[2]||'');if(location.hash===h)route();else location.hash=h;return;}
  if(href.charAt(0)==='#'&&href.length>1&&href.charAt(1)!=='/'){e.preventDefault();var t=document.getElementById(href.slice(1));if(t)t.scrollIntoView({behavior:'smooth'});return;}
  if(/^https?:/.test(href)&&!a.target){a.target='_blank';a.rel='noopener';}
},true);
document.addEventListener('submit',function(e){e.preventDefault();},true);
window.addEventListener('hashchange',route);
var menu=document.getElementById('ra-menu');if(menu)menu.addEventListener('click',function(){location.hash='#/peta';});
/* tombol "Layar" (peta semua layar) hanya untuk staf, uji lokal, atau bila dibuka dengan ?layar=1 */
function menuVis(){if(!menu)return;var me=window.RA&&RA.me&&RA.me();var on=(window.RA_CONFIG&&RA_CONFIG.local)||/[?&]layar=1/.test(location.search+location.hash)||(me&&me.staff)||(window.RA&&RA._staff);try{if(/[?&]layar=1/.test(location.search+location.hash))localStorage.setItem('ra.layar','1');if(localStorage.getItem('ra.layar')==='1')on=true;}catch(e){}menu.style.display=on?'':'none';}
window.addEventListener('hashchange',menuVis);menuVis();

/* ---------- start ---------- */
fetch('manifest.json?t='+Date.now()).then(function(r){return r.json();}).then(function(m){
  MAN=m;TITLES=m.titles||[];
  var h0=(location.hash.replace(/^#\/?/,'').split('?')[0])||'Home';var first=bundleFor(h0)||bundleFor('Home');var pr=first?loadBundle(first):null;if(first&&first.id==='cust'){var bk=bundleFor('Checkout');if(bk&&pr){pr.then(function(){var go=function(){loadBundle(bk).catch(function(){});};if(window.requestIdleCallback)requestIdleCallback(go,{timeout:5000});else setTimeout(go,2000);});}}return pr;
}).then(route).catch(function(err){screenEl.innerHTML='<div class="ra-load">Gagal memuat aplikasi. Coba muat ulang halaman.</div>';console.error(err);});
})();
