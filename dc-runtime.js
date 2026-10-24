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
  if(pad)root.style.paddingBottom=(pad+12)+'px';
}

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
  var root=screenEl.firstElementChild; if(root)adapt(root);
  if(focusInfo&&focusInfo.i>-1){var all2=screenEl.querySelectorAll('input,textarea,select');var t=all2[focusInfo.i];if(t){t.focus({preventScroll:true});try{t.setSelectionRange(focusInfo.s,focusInfo.e);}catch(e){}}}
  window.scrollTo(0,y);
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
function getSource(name){
  var key=name+'.dc.html';
  if(PATCHED[key])return Promise.resolve(PATCHED[key]);
  var pv=MAN.patches[name], b=bundleFor(name);
  var base=b&&!FILES[key]?loadBundle(b):Promise.resolve();
  return base.then(function(){
    if(!pv)return FILES[key]||null;
    return fetch('screens/'+name+'.json?v='+pv).then(function(r){if(!r.ok)throw new Error('patch '+name);return r.json();})
      .then(function(p){if(p.full==null&&FILES[key]==null)throw new Error('base '+name);return PATCHED[key]=applyPatch(FILES[key]||'',p);});
  });
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
  inst=null;rootSpec=null;current='peta';helmetBox.innerHTML='';screenEl.className='';
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
  var first=bundleFor('Home');return first?loadBundle(first):null;
}).then(route).catch(function(err){screenEl.innerHTML='<div class="ra-load">Gagal memuat aplikasi. Coba muat ulang halaman.</div>';console.error(err);});
})();
