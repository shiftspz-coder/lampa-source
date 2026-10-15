import {metaHtml, subLine, HERO_HTML} from './imdbb_info'
import IMDb from '../../../utils/imdb'
import {lgcached, qlabel} from '../../card/module/ratting'
import ovx from '../../../utils/imdbb_ov'


function esc(s){ return String(s || '').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function kindOf(d){ return d.media_type === 'tv' || (d.name && !d.title) || d.first_air_date ? 'tv' : 'movie' }
function dom(comp){ let h = comp && comp.html; return h && h[0] ? h[0] : h }

function hinfo(d){
    try{
        let c = JSON.parse(localStorage.getItem('imdbb_hd3') || '{}')[kindOf(d) + d.id]
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
    el.innerHTML = HERO_HTML

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
        im.src = L.TMDB.image('t/p/w500' + path.replace('.svg', '.png')); if(window.__imdbbLgDark) window.__imdbbLgDark.watch(im)
    }
    else txt()

    q('.imdbb-hero__tag').textContent = (info && info.tagline) || ''

    let r = IMDb.cached(d)
    q('.imdbb-hero__meta').innerHTML = metaHtml(d, info, {rate: r ? (r >= 10 ? '10' : r.toFixed(1)) : '', ql: qlabel(d), ct: info && info._cert})

    q('.imdbb-hero__s').textContent = subLine(d, info)
    q('.imdbb-hero__d').textContent = ovx.pick(d, info && info.overview, d.overview)

    return el
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

const CKEY = 'imdbb_stub_d'

function cload(){
    try{ return JSON.parse(localStorage.getItem(CKEY) || '{}') }
    catch(e){ return {} }
}

function cget(d){
    let c = cload()[kindOf(d) + d.id]

    return c && c.h && c.t + 6048e5 > Date.now() ? c : null
}

function cput(d, v){
    try{
        let a = cload()

        v.t = Date.now()
        a[kindOf(d) + d.id] = v

        let ks = Object.keys(a)

        if(ks.length > 60){
            ks.sort(function(x, y){ return a[x].t - a[y].t }).slice(0, ks.length - 60).forEach(function(k){ delete a[k] })
        }

        localStorage.setItem(CKEY, JSON.stringify(a))
    }
    catch(e){}
}

function realFs(h){
    return Array.prototype.slice.call(h.querySelectorAll('.full-start-new')).filter(function(x){ return !x.closest('.imdbb-stub') })[0] || null
}

function fromCache(c){
    let el = document.createElement('div')

    el.className = 'imdbb-stub imdbb-stub--c'
    el.innerHTML = '<div class="full-start-new"><div class="full-start-new__body"><div class="full-start-new__right">' + c.h + '<div class="imdbb-stub-sp" style="height:' + 0 + 'px"></div></div></div></div>'
    el.__dx = c.dx || 0
    el.__dy = c.dy || 0
    el.style.left = el.__dx + 'px'
    el.style.right = (-el.__dx) + 'px'
    el.style.top = el.__dy + 'px'

    return el
}

function cap(h, d){
    try{
        let fs = realFs(h)
        if(!fs) return
        let right = fs.querySelector('.full-start-new__right')
        let ov = fs.querySelector('.imdbb-ov')
        if(!right || !ov) return

        let rr = right.getBoundingClientRect()
        let ro = ov.getBoundingClientRect()
        let pb = parseFloat(getComputedStyle(right).paddingBottom) || 0
        let sp = Math.max(0, Math.round(rr.bottom - pb - ro.bottom))
        let old = h.querySelector('.imdbb-stub')
        let c0 = cget(d)
        let dx = 0, dy = 0

        if(old && old.classList.contains('imdbb-stub--c')){
            let so = old.querySelector('.imdbb-ov')

            if(so){
                let rs = so.getBoundingClientRect()

                dx = (ro.left - rs.left) + (old.__dx || 0)
                dy = (ro.top - rs.top) + (old.__dy || 0)
            }
        }
        else if(c0){
            dx = c0.dx || 0
            dy = c0.dy || 0
        }

        let html = ''
        let stop = false

        Array.prototype.slice.call(right.children).forEach(function(ch){
            if(stop) return
            let cl = ch.className || ''
            let last = ch === ov || ch.contains(ov)

            if(!/full-start-new__(buttons|reactions)|imdbb-ppl/.test(cl)){
                let cn = ch.cloneNode(true)

                cn.classList.remove('selector')
                Array.prototype.slice.call(cn.querySelectorAll('.selector')).forEach(function(x){ x.classList.remove('selector') })
                html += cn.outerHTML
            }

            if(last) stop = true
        })

        if(html.length > 20000 || !stop) return

        cput(d, {h: html, sp: sp, dx: Math.round(dx * 10) / 10, dy: Math.round(dy * 10) / 10})
    }
    catch(e){}
}

function adj(h){
    try{
        let hd = parseFloat(localStorage.getItem('imdbb_home_d'))
        let fs = realFs(h)
        let b = fs && fs.querySelector('.imdbb-ov')
        let right = fs && fs.querySelector('.full-start-new__right')
        if(!(hd > 5 && hd < 40) || !b || !right) return
        let rb = b.getBoundingClientRect()
        if(!rb.height) return
        let fp = parseFloat(getComputedStyle(document.body).fontSize) || 16
        let diff = hd * fp - (window.innerHeight - rb.bottom)
        if(Math.abs(diff) < 0.15 * fp) return
        let cur = parseFloat(getComputedStyle(right).paddingBottom) || 0
        let nv = Math.min(30 * fp, Math.max(8 * fp, cur + diff))
        localStorage.setItem('imdbb_card_p', nv.toFixed(1))
        document.body.style.setProperty('--imdbb-card-p', nv.toFixed(1) + 'px')
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
        let cp = parseFloat(localStorage.getItem('imdbb_card_p'))
        if(cp > 50 && cp < 1500) document.body.style.setProperty('--imdbb-card-p', cp + 'px')
        let cc = cget(d)
        let se = cc ? fromCache(cc) : build(d)
        let sv = parseFloat(localStorage.getItem('imdbb_stub_b'))
        if(!cc && sv > 0 && sv < 40) se.style.setProperty('--imdbb-stub-b', sv + 'em')
        h.appendChild(se)
        comp.activity.loader(false)
        let sl = comp.activity.slide
        if(sl && sl.addClass) sl.addClass('imdbb-noanim')
        let n = 0
        h.__stubT = setInterval(function(){
            n++
            let fs = realFs(h)
            if((fs && !fs.closest('.imdbb-fwait')) || n > 66 || !document.body.contains(h)){ if(fs && n <= 66){ cal(h); cap(h, d); adj(h) } hide(comp) }
        }, 120)
    }
    catch(e){ console.warn('imdbb_stub', e.message) }
}

export default {show, hide}
