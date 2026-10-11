import IMDb from '../../../utils/imdb'
import {lgcached, qlabel} from '../../card/module/ratting'

const MAP = {US:'США',GB:'Великобритания',RU:'Россия',FR:'Франция',DE:'Германия',JP:'Япония',KR:'Южная Корея',CA:'Канада',CN:'Китай',IN:'Индия',ES:'Испания',IT:'Италия',AU:'Австралия',SE:'Швеция',TR:'Турция',UA:'Украина',BR:'Бразилия',MX:'Мексика',PL:'Польша',DK:'Дания',NO:'Норвегия',IE:'Ирландия',NL:'Нидерланды',BE:'Бельгия',HK:'Гонконг',TH:'Таиланд'}

function esc(s){ return String(s || '').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function kindOf(d){ return d.media_type === 'tv' || (d.name && !d.title) || d.first_air_date ? 'tv' : 'movie' }
function dom(comp){ let h = comp && comp.html; return h && h[0] ? h[0] : h }

function hinfo(d){
    try{
        let c = JSON.parse(localStorage.getItem('imdbb_hd2') || '{}')[kindOf(d) + d.id]
        return c && c.t + 6048e5 > Date.now() ? c.i : null
    }
    catch(e){ return null }
}

function build(d){
    let L = window.Lampa
    let kind = kindOf(d)
    let info = hinfo(d)
    let title = d.title || d.name || ''
    let el = document.createElement('div')

    el.className = 'imdbb-stub'
    el.innerHTML = '<div class="imdbb-hero__logo"></div><div class="imdbb-hero__tag"></div><div class="imdbb-hero__meta"></div><div class="imdbb-hero__s"></div><div class="imdbb-hero__d"></div>'

    let q = function(s){ return el.querySelector(s) }
    let cp = lgcached(d)
    let ls = info && info.images && info.images.logos
    let path = (cp && cp.p) || (ls && ls[0] && ls[0].file_path) || ''
    let lg = q('.imdbb-hero__logo')
    let txt = function(){ lg.innerHTML = '<div class="imdbb-hero__t">' + esc(title) + '</div>' }

    if(path){
        lg.innerHTML = '<img alt="">'
        let im = lg.firstChild
        im.onerror = txt
        im.src = L.TMDB.image('t/p/w500' + path.replace('.svg', '.png'))
    }
    else txt()

    q('.imdbb-hero__tag').textContent = (info && info.tagline) || ''

    let parts = []
    let r = IMDb.cached(d)
    let ql = qlabel(d)
    let ct = info && info._cert
    let date = (info && (info.release_date || info.first_air_date)) || d.release_date || d.first_air_date || ''
    let dm = date.match(/^(\d{4})-(\d\d)-(\d\d)$/)
    let ds = dm ? dm[3] + '.' + dm[2] + '.' + dm[1] : date.slice(0, 4)

    if(r) parts.push('<span class="imdbb-hero__r">' + (r >= 10 ? '10' : r.toFixed(1)) + ' IMDB</span>')
    if(ql) parts.push('<span class="imdbb-hero__q">' + ql + '</span>')
    if(ct) parts.push('<span>' + esc(ct) + '</span>')
    if(ds) parts.push('<span>' + esc(ds) + '</span>')

    if(info){
        let c = (info.production_countries && info.production_countries[0] && info.production_countries[0].iso_3166_1) || (info.origin_country && info.origin_country[0]) || ''
        if(c) parts.push('<span>' + esc(MAP[c] || c) + '</span>')
        if(info.runtime > 0) parts.push('<span>' + ('0' + Math.floor(info.runtime / 60)).slice(-2) + ':' + ('0' + (info.runtime % 60)).slice(-2) + '</span>')
        let g = (info.genres || []).slice(0, 3).map(function(x){ let n = x.name + ''; return n.charAt(0).toUpperCase() + n.slice(1) }).join(', ')
        if(g) parts.push('<span>' + esc(g) + '</span>')
    }

    q('.imdbb-hero__meta').innerHTML = parts.join('')

    let sl = ''
    if(info && kind === 'tv' && info.number_of_seasons){
        let st = (info.status === 'Ended' || info.status === 'Canceled') ? 'Завершён' : 'Идёт'
        sl = 'Сезоны: ' + info.number_of_seasons + ' • Серии: ' + (info.number_of_episodes || '') + ' • ' + st
    }
    if(!sl && info && kind !== 'tv' && info.budget > 0) sl = 'Бюджет $ ' + String(info.budget).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    q('.imdbb-hero__s').textContent = sl
    q('.imdbb-hero__d').textContent = (info && info.overview) || d.overview || ''

    return el
}

function probe(h){
    try{
        if(localStorage.getItem('imdbb_probe') === 'done') return
        let pairs = [['лого','.imdbb-hero__logo img, .imdbb-hero__logo .imdbb-hero__t','.full-start-new__title img, .full-start-new__title'],['слоган','.imdbb-hero__tag','.full-start-new__tagline'],['мета','.imdbb-hero__meta','.full-start-new__rate-line'],['сезоны','.imdbb-hero__s','.imdbb-details-c'],['опис','.imdbb-hero__d','.imdbb-ov']]
        let m = function(root, sel){
            let e = root && root.querySelector(sel)
            if(!e) return '-'
            let r = e.getBoundingClientRect()
            return Math.round(r.top) + '/' + Math.round(r.height) + '/' + Math.round(parseFloat(getComputedStyle(e).fontSize)) + '/x' + Math.round(r.left)
        }
        let st = h.querySelector('.imdbb-stub')
        let fs = h.querySelector('.full-start-new')
        if(!st || !fs) return
        let out = pairs.map(function(x){ return x[0] + ' ' + m(st, x[1]) + ' → ' + m(fs, x[2]) }).join('  //  ')
        out = 'top/h/шрифт/left: ' + out
        localStorage.setItem('imdbb_probe', 'done')
        window.Lampa.Noty.show(out, {time: 30000})
    }
    catch(e){}
}

function cal(h){
    try{
        let s = h.querySelector('.imdbb-stub')
        let a = s && s.querySelector('.imdbb-hero__d')
        let b = h.querySelector('.imdbb-ov')
        if(!a || !b) return
        let ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
        if(!ra.height || !rb.height) return
        let fp = parseFloat(getComputedStyle(document.body).fontSize) || 16
        let cur = parseFloat(getComputedStyle(s).paddingBottom) / fp
        let nv = cur + (ra.bottom - rb.bottom) / fp
        if(nv > 0 && nv < 40) localStorage.setItem('imdbb_stub_b', nv.toFixed(2))
    }
    catch(e){}
}

function hide(comp){
    try{
        let h = dom(comp)
        if(!h) return
        clearInterval(h.__stubT)
        Array.prototype.slice.call(h.children).forEach(function(c){ if(c.classList.contains('imdbb-stub')) c.remove() })
    }
    catch(e){}
}

function show(comp, object){
    try{
        if(!document.body.classList.contains('imdbb-compact')) return
        let d = object && object.card
        if(!d || !d.id || !(d.title || d.name)) return
        let h = dom(comp)
        h.classList.add('imdbb-sh')
        let se = build(d)
        let sv = parseFloat(localStorage.getItem('imdbb_stub_b'))
        if(sv > 0 && sv < 40) se.style.setProperty('--imdbb-stub-b', sv + 'em')
        h.appendChild(se)
        comp.activity.loader(false)
        let sl = comp.activity.slide
        if(sl && sl.addClass) sl.addClass('imdbb-noanim')
        let n = 0
        h.__stubT = setInterval(function(){
            n++
            let fs = h.querySelector('.full-start-new')
            if((fs && !fs.closest('.imdbb-fwait')) || n > 66 || !document.body.contains(h)){ if(fs && n <= 66){ probe(h); cal(h) } hide(comp) }
        }, 120)
    }
    catch(e){ console.warn('imdbb_stub', e.message) }
}

export default {show, hide}
