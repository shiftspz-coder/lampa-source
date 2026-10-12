import {lgcached, lgput} from '../../card/module/ratting'
import Utils from '../../../utils/utils'

const HKEY = 'imdbb_hd3'
const HTTL = 7 * 864e5
let hdisk = null
let hsave

function hload(){
    if(hdisk) return hdisk

    try{ hdisk = JSON.parse(localStorage.getItem(HKEY) || '{}') }
    catch(e){ hdisk = {} }

    return hdisk
}

function hget(k){
    let c = hload()[k]

    return c && c.t + HTTL > Date.now() ? c.i : null
}

function hput(k, j, ct){
    try{
        let ls = (j.images && j.images.logos) || []
        let pick = ls.filter(function(x){ return x.iso_639_1 === 'ru' })[0] || ls.filter(function(x){ return x.iso_639_1 === 'en' })[0] || ls[0]
        let pc = j.production_countries && j.production_countries[0] ? [{iso_3166_1: j.production_countries[0].iso_3166_1}] : []

        hload()[k] = {t: Date.now(), i: {
            id: j.id,
            tagline: j.tagline || '',
            release_date: j.release_date,
            first_air_date: j.first_air_date,
            production_countries: pc,
            origin_country: j.origin_country && j.origin_country[0] ? [j.origin_country[0]] : [],
            genres: (j.genres || []).slice(0, 3).map(function(x){ return {name: x.name} }),
            status: j.status,
            number_of_seasons: j.number_of_seasons,
            number_of_episodes: j.number_of_episodes,
            budget: j.budget,
            runtime: j.runtime || 0,
            overview: j.overview || '',
            images: {logos: pick ? [{iso_639_1: pick.iso_639_1, file_path: pick.file_path}] : []},
            _cert: ct || ''
        }}

        clearTimeout(hsave)

        hsave = setTimeout(function(){
            try{
                let ks = Object.keys(hdisk)

                if(ks.length > 600){
                    ks.sort(function(a, b){ return hdisk[a].t - hdisk[b].t })
                        .slice(0, ks.length - 600)
                        .forEach(function(x){ delete hdisk[x] })
                }

                localStorage.setItem(HKEY, JSON.stringify(hdisk))
            }
            catch(e){}
        }, 1000)
    }
    catch(e){}
}

export default function(main){
    try{
        let o = main.object || {}
        if(['main','category','bookmarks'].indexOf(o.component) < 0) return
        if(!document.body.classList.contains('imdbb-compact')) return
        if(localStorage.getItem('imdbb_wide') === 'false') return

        let L = window.Lampa
        let isBm = o.component === 'bookmarks'
        let hero = document.createElement('div')
        hero.className = 'imdbb-hero'
        hero.innerHTML = '<div class="imdbb-hero__logo"></div><div class="imdbb-hero__tag"></div><div class="imdbb-hero__meta"></div><div class="imdbb-hero__s"></div><div class="imdbb-hero__d"></div>'
        main.html.classList.add('imdbb-home')
        main.html.classList.toggle('imdbb-nobadge', localStorage.getItem('imdbb_hide_badges') === 'true')
        main.html.insertBefore(hero, main.html.firstChild)

        let q = function(s){ return hero.querySelector(s) }
        let cache = {}
        let cur = null
        let curEl = null
        let timer, timer2
        let MAP = {US:'США',GB:'Великобритания',RU:'Россия',FR:'Франция',DE:'Германия',JP:'Япония',KR:'Южная Корея',CA:'Канада',CN:'Китай',IN:'Индия',ES:'Испания',IT:'Италия',AU:'Австралия',SE:'Швеция',TR:'Турция',UA:'Украина',BR:'Бразилия',MX:'Мексика',PL:'Польша',DK:'Дания',NO:'Норвегия',IE:'Ирландия',NL:'Нидерланды',BE:'Бельгия',HK:'Гонконг',TH:'Таиланд'}
        let esc = function(s){ return String(s || '').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
        let kindOf = function(d){ return d.media_type === 'tv' || (d.name && !d.title) || d.first_air_date ? 'tv' : 'movie' }
        let ckey = function(d){ return kindOf(d) + d.id }

        let cert = function(info, kind){
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

        let render = function(d, info, el, wait){
            let kind = kindOf(d)
            let title = d.title || d.name || ''

            let logo = ''
            let known = false
            if(info && info.images && info.images.logos){
                known = true
                let ls = info.images.logos
                let pick = ls.filter(function(x){ return x.iso_639_1 === 'ru' })[0] || ls.filter(function(x){ return x.iso_639_1 === 'en' })[0] || ls[0]
                if(pick && pick.file_path) logo = L.TMDB.image('t/p/w500' + pick.file_path)
                if(!lgcached(d)) lgput(d, pick && pick.file_path ? pick.file_path.replace('.svg', '.png') : '')
            }
            else if(!info){
                let cp = lgcached(d)
                if(cp){
                    known = true
                    if(cp.p) logo = L.TMDB.image('t/p/w500' + cp.p)
                }
            }
            let lg = q('.imdbb-hero__logo')
            if(logo){
                if(lg.getAttribute('data-src') !== logo){
                    lg.setAttribute('data-src', logo)
                    lg.innerHTML = '<img alt="">'
                    let im = lg.firstChild
                    im.onerror = function(){ lg.innerHTML = '<div class="imdbb-hero__t">' + esc(title) + '</div>' }
                    im.src = logo
                }
            }
            else if(wait && !known){
                if(lg.getAttribute('data-src') !== 'imdbb-wait:' + title){
                    lg.setAttribute('data-src', 'imdbb-wait:' + title)
                    lg.innerHTML = ''
                }
            }
            else if(lg.getAttribute('data-src') !== 'T:' + title){
                lg.setAttribute('data-src', 'T:' + title)
                lg.innerHTML = '<div class="imdbb-hero__t">' + esc(title) + '</div>'
            }

            q('.imdbb-hero__tag').textContent = (info && info.tagline) || ''

            let parts = []
            let rate = ''
            let qh = ''
            if(el){
                let v = el.querySelector('.card__vote')
                if(v && /IMDb/i.test(v.textContent || '')){
                    let m = (v.textContent || '').match(/\d+(?:[.,]\d+)?/)
                    if(m) rate = m[0].replace(',', '.')
                }
                let qq = el.querySelector('.imdbb-q')
                if(qq) qh = qq.innerHTML
            }
            if(rate) parts.push('<span class="imdbb-hero__r">' + esc(rate) + ' IMDB</span>')
            if(qh) parts.push('<span class="imdbb-hero__q">' + qh + '</span>')
            let ct = info ? cert(info, kind) : ''
            if(ct) parts.push('<span>' + esc(ct) + '</span>')
            let date = (info && (info.release_date || info.first_air_date)) || d.release_date || d.first_air_date || ''
            let dm = date.match(/^(\d{4})-(\d\d)-(\d\d)$/)
            let ds = dm ? dm[3] + '.' + dm[2] + '.' + dm[1] : date.slice(0, 4)
            if(ds) parts.push('<span>' + esc(ds) + '</span>')
            if(info){
                let c = (info.production_countries && info.production_countries[0] && info.production_countries[0].iso_3166_1) || (info.origin_country && info.origin_country[0]) || ''
                if(c) parts.push('<span>' + esc(MAP[c] || c) + '</span>')
                if(info.runtime > 0){ let rm = info.runtime; parts.push('<span>' + ('0' + Math.floor(rm / 60)).slice(-2) + ':' + ('0' + (rm % 60)).slice(-2) + '</span>') }
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
            try{
                let dd = q('.imdbb-hero__d')
                if(dd && dd.textContent){
                    clearTimeout(window.__imdbbHdT)
                    window.__imdbbHdT = setTimeout(function(){
                        try{
                            let r = dd.getBoundingClientRect()
                            if(!r.height || !dd.offsetParent) return
                            let fp = parseFloat(getComputedStyle(document.body).fontSize) || 16
                            let v = (window.innerHeight - r.bottom) / fp
                            if(v > 5 && v < 40) localStorage.setItem('imdbb_home_d', v.toFixed(2))
                        }
                        catch(e){}
                    }, 400)
                }
            }
            catch(e){}
        }

        let load = function(d, cb){
            if(d.episode_number !== undefined || d.still_path !== undefined) return /* imdbb_ep_guard */
            let k = ckey(d)
            if(cache[k]) return cb(cache[k])
            let hc = hget(k)
            if(hc){ cache[k] = hc; return cb(hc) }
            let kind = kindOf(d)
            let app = kind === 'tv' ? 'images,content_ratings' : 'images,release_dates'
            let url = L.TMDB.api(kind + '/' + d.id + '?api_key=' + L.TMDB.key() + '&language=ru&append_to_response=' + app + '&include_image_language=ru,en,null')
            fetch(url).then(function(r){ return r.json() }).then(function(j){
                if(j && j.id){ cache[k] = j; hput(k, j, cert(j, kind)); cb(j) }
            }).catch(function(){})
        }

        let pf = {}
        let prefetch = function(el){
            try{
                if(!el) return
                let box = el.closest('.items-line') || el.parentNode
                let all = Array.prototype.slice.call(box.querySelectorAll('.card'))
                let ix = all.indexOf(el)
                if(ix < 0) return
                let list = all.slice(ix + 1, ix + 4)
                if(ix > 0) list.push(all[ix - 1])
                list.forEach(function(x, n){
                    let d2 = x.card_data || (window.$ ? window.$(x).data('card') : null)
                    if(!d2 || !d2.id || !(d2.title || d2.name)) return
                    if(d2.episode_number !== undefined || d2.still_path !== undefined) return
                    let k2 = ckey(d2)
                    if(cache[k2] || pf[k2] || hget(k2)) return
                    pf[k2] = 1
                    setTimeout(function(){ load(d2, function(){}) }, 500 + n * 350)
                })
            }
            catch(e){}
        }

        let upd = function(card, d){
            if(!d) return
            if(!d.id){
                if(isBm){
                    cur = null
                    clearTimeout(timer)
                    clearTimeout(timer2)
                    hero.setAttribute('data-imdbb-bm', '1')
                    hero.classList.add('imdbb-hero--wait')
                }
                return
            }
            if(!(d.title || d.name)) return
            let el = null
            try{ el = card.render(true) }catch(e){}
            cur = d
            curEl = el
            let kk = ckey(d)
            let ci = cache[kk] || hget(kk)
            if(ci) cache[kk] = ci
            let ep = d.episode_number !== undefined || d.still_path !== undefined
            let wait = !ci && !ep
            hero.classList.toggle('imdbb-hero--wait', wait)
            render(d, ci || null, el, wait)
            clearTimeout(timer)
            clearTimeout(timer2)
            timer = setTimeout(function(){
                if(cur !== d) return
                try{
                    if(d.backdrop_path && L.Background && !isBm) L.Background.change(L.TMDB.image('t/p/w1280' + d.backdrop_path))
                }
                catch(e){}
                load(d, function(info){ if(cur === d){ render(d, info, curEl); hero.classList.remove('imdbb-hero--wait') } })
                prefetch(curEl)
                timer2 = setTimeout(function(){ if(cur === d){ render(d, cache[ckey(d)] || null, curEl); hero.classList.remove('imdbb-hero--wait') } }, 1800)
            }, 250)
        }

        main.use({
            onInstance: function(item){
                item.use({
                    onActive: function(card, d){ upd(card, d) }
                })
            }
        })
    }
    catch(e){ console.warn('imdbb_home', e.message) }
}
