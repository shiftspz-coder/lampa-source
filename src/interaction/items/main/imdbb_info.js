import Utils from '../../../utils/utils'
const MAP = {US:'США',GB:'Великобритания',RU:'Россия',FR:'Франция',DE:'Германия',JP:'Япония',KR:'Южная Корея',CA:'Канада',CN:'Китай',IN:'Индия',ES:'Испания',IT:'Италия',AU:'Австралия',SE:'Швеция',TR:'Турция',UA:'Украина',BR:'Бразилия',MX:'Мексика',PL:'Польша',DK:'Дания',NO:'Норвегия',IE:'Ирландия',NL:'Нидерланды',BE:'Бельгия',HK:'Гонконг',TH:'Таиланд'}

function esc(s){ return String(s || '').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function kindOf(d){ return d.media_type === 'tv' || (d.name && !d.title) || d.first_air_date ? 'tv' : 'movie' }

export const HERO_HTML = '<div class="imdbb-hero__logo"></div><div class="imdbb-hero__tag"></div><div class="imdbb-hero__meta"></div><div class="imdbb-hero__s"></div><div class="imdbb-hero__d"></div>'

function mg(ps){
    if(!ps.length) return ''
    let r = '', pl = '', tx = [], g = ''
    ps.forEach(function(x){
        if(x.indexOf('<span class="imdbb-hero__r"') === 0) r = x
        else if(x.indexOf('<span class="imdbb-hero__q"') === 0 || x.indexOf('<span class="imdbb-hero__c"') === 0) pl += x
        else if(x.indexOf('<span class="imdbb-hero__g"') === 0) g = x
        else tx.push(x.replace(/^<span>/, '').replace(/<\/span>$/, ''))
    })
    return r + (pl ? '<span class="imdbb-hero__pl">' + pl + '</span>' : '') + (tx.length ? '<span class="imdbb-hero__tx">' + tx.join('<em class="imdbb-dot">·</em>') + '</span>' : '') + g
}

// o: {rate: '7.6' строкой, ql: html значка качества (запасной), ct: возраст}
export function metaHtml(d, info, o){
    let parts = []
    if(o.rate) parts.push('<span class="imdbb-hero__r"><b>' + esc(o.rate) + '</b><i>IMDb</i></span>')
    let qm = window.__imdbbQm ? window.__imdbbQm(d) : []
    if(qm.length) qm.forEach(function(x){ parts.push('<span class="imdbb-hero__q">' + x + '</span>') })
    else if(o.ql) parts.push('<span class="imdbb-hero__q">' + o.ql + '</span>')
    if(o.ct) parts.push('<span class="imdbb-hero__c">' + esc(o.ct) + '</span>')
    let date = (info && (info.release_date || info.first_air_date)) || d.release_date || d.first_air_date || ''
    let dm = date.match(/^(\d{4})-(\d\d)-(\d\d)$/)
    let ds = dm ? dm[3] + '.' + dm[2] + '.' + dm[1] : date.slice(0, 4)
    if(ds) parts.push('<span>' + esc(ds) + '</span>')
    if(info){
        let c = (info.production_countries && info.production_countries[0] && info.production_countries[0].iso_3166_1) || (info.origin_country && info.origin_country[0]) || ''
        if(c) parts.push('<span>' + esc(MAP[c] || c) + '</span>')
        if(info.runtime > 0){ let rm = info.runtime; parts.push('<span>' + ('0' + Math.floor(rm / 60)).slice(-2) + ':' + ('0' + (rm % 60)).slice(-2) + '</span>') }
        let g = (info.genres || []).slice(0, 3).map(function(x){ let n = x.name + ''; return n.charAt(0).toUpperCase() + n.slice(1) }).join(', ')
        if(g) parts.push('<span class="imdbb-hero__g">' + esc(g) + '</span>')
    }
    return mg(parts)
}

export function subLine(d, info){
    let kind = kindOf(d)
    let sl = ''
    if(info && kind === 'tv' && info.number_of_seasons){
        let st = (info.status === 'Ended' || info.status === 'Canceled') ? 'Завершён' : 'Идёт'
        sl = 'Сезоны: ' + info.number_of_seasons + ' • Серии: ' + (info.number_of_episodes || '') + ' • ' + st
    }
    if(!sl && info && kind !== 'tv' && info.budget > 0) sl = 'Бюджет $ ' + String(info.budget).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return sl
}

if(typeof window !== 'undefined') window.__imdbbInfo = 1

export function cert(info, kind){
    try{
        if(info && info._cert !== undefined) return info._cert
        let cd = String(window.Lampa.Storage.get('language', 'ru') || 'ru').toUpperCase()
        let codes = cd === 'US' ? ['US'] : [cd, 'US']
        if(kind === 'tv'){
            let rs = (info.content_ratings && info.content_ratings.results) || []
            for(let n = 0; n < codes.length; n++){
                let r = rs.filter(function(x){ return x.iso_3166_1 === codes[n] && x.rating })[0]
                if(r) return Utils.decodePG(r.rating)
            }
            return ''
        }
        let rd = (info.release_dates && info.release_dates.results) || []
        for(let n = 0; n < codes.length; n++){
            let r2 = rd.filter(function(x){ return x.iso_3166_1 === codes[n] })[0]
            if(!r2) continue
            let c = (r2.release_dates || []).filter(function(x){ return x.certification })[0]
            if(c) return Utils.decodePG(c.certification)
        }
        return ''
    }
    catch(e){ return '' }
}

if(typeof window !== 'undefined') window.__imdbbCert = cert

;(function(){try{
 if(typeof document==='undefined'||window.__imdbbDbg) return
 window.__imdbbDbg=1; window.__imdbbDbg2=1
 var bot=function(sel){ var a=document.querySelectorAll(sel); for(var i=0;i<a.length;i++){ var r=a[i].getBoundingClientRect(); if(r.height>0&&r.width>0) return r.bottom.toFixed(1) } return '-' }
 var el=document.createElement('div')
 el.style.cssText='position:fixed;left:6px;top:6px;z-index:99999;background:#000;color:#0f0;font:14px monospace;padding:4px 8px;pointer-events:none;white-space:pre'
 function top(sel){ var a=document.querySelectorAll(sel); for(var i=0;i<a.length;i++){ var r=a[i].getBoundingClientRect(); if(r.height>0&&r.width>0) return r.top.toFixed(1) } return '-' }
 setInterval(function(){
  if(!el.parentNode&&document.body) document.body.appendChild(el)
  el.textContent='T '+top('.imdbb-home .items-line__title')+'\nH '+top('.imdbb-home .items-line__head')+'\nB '+top('.full-start-new__buttons .button--play')+'\nDh '+bot('.imdbb-home .imdbb-hero__d')+'\nDc '+(function(){window.__imdbbDbg3=1;var a=document.querySelectorAll('.imdbb-ov'),o=[];for(var i=0;i<a.length;i++){var r=a[i].getBoundingClientRect();o.push(r.bottom.toFixed(1)+'/'+r.height.toFixed(0)+'/'+getComputedStyle(a[i]).display)}var b=document.querySelector('.imdbb-band'),p=b&&b.previousElementSibling;var pb=p?p.getBoundingClientRect().bottom.toFixed(1)+'/'+String(p.className).slice(0,24):'-';return a.length+' '+o.join(',')+' P '+pb})()+'\nTc '+(function(){window.__imdbbDbg4=1;var f=function(sel){var L=document.querySelectorAll(sel),root=null;for(var i=0;i<L.length;i++){var q=L[i].getBoundingClientRect();if(q.height>0&&q.width>0){root=L[i];break}}if(!root)return '-';var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n,best=null,bl=0;while(n=w.nextNode()){var t=n.nodeValue.trim();if(t.length>bl){var r=n.parentNode.getBoundingClientRect();if(r.height>0&&r.width>0){bl=t.length;best=n}}}if(!best)return '-';var rg=document.createRange();rg.selectNodeContents(best);var pe=best.parentNode;return rg.getBoundingClientRect().bottom.toFixed(1)+' el '+pe.getBoundingClientRect().bottom.toFixed(1)+' '+String(pe.className).slice(0,18)};return f('.full-start-new__right')+'\nTh '+f('.imdbb-hero__d')})()+'\nvh '+innerHeight+' dpr '+devicePixelRatio
 },500)
}catch(e){}})()

if(typeof window !== "undefined") window.__imdbbPxAlign = 1
