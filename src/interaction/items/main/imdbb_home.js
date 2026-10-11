export default function(main){
    try{
        let o = main.object || {}
        if(['main','category'].indexOf(o.component) < 0) return
        if(!document.body.classList.contains('imdbb-compact')) return
        if(localStorage.getItem('imdbb_wide') === 'false') return

        let L = window.Lampa
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
                if(kind === 'tv'){
                    let r = (info.content_ratings.results || []).filter(function(x){ return x.iso_3166_1 === 'RU' })[0]
                    return r ? r.rating : ''
                }
                let r2 = (info.release_dates.results || []).filter(function(x){ return x.iso_3166_1 === 'RU' })[0]
                if(!r2) return ''
                let c = r2.release_dates.filter(function(x){ return x.certification })[0]
                return c ? c.certification : ''
            }
            catch(e){ return '' }
        }

        let render = function(d, info, el){
            let kind = kindOf(d)
            let title = d.title || d.name || ''

            let logo = ''
            if(info && info.images && info.images.logos && info.images.logos.length){
                let ls = info.images.logos
                let pick = ls.filter(function(x){ return x.iso_639_1 === 'ru' })[0] || ls.filter(function(x){ return x.iso_639_1 === 'en' })[0] || ls[0]
                if(pick && pick.file_path) logo = L.TMDB.image('t/p/w500' + pick.file_path)
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
                let g = (info.genres || []).slice(0, 3).map(function(x){ return x.name }).join(', ')
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
        }

        let load = function(d, cb){
            if(d.episode_number !== undefined || d.still_path !== undefined) return /* imdbb_ep_guard */
            let k = ckey(d)
            if(cache[k]) return cb(cache[k])
            let kind = kindOf(d)
            let app = kind === 'tv' ? 'images,content_ratings' : 'images,release_dates'
            let url = L.TMDB.api(kind + '/' + d.id + '?api_key=' + L.TMDB.key() + '&language=ru&append_to_response=' + app + '&include_image_language=ru,en,null')
            fetch(url).then(function(r){ return r.json() }).then(function(j){
                if(j && j.id){ cache[k] = j; cb(j) }
            }).catch(function(){})
        }

        let upd = function(card, d){
            if(!d || !(d.title || d.name)) return
            let el = null
            try{ el = card.render(true) }catch(e){}
            cur = d
            curEl = el
            render(d, cache[ckey(d)] || null, el)
            clearTimeout(timer)
            clearTimeout(timer2)
            timer = setTimeout(function(){
                if(cur !== d) return
                try{
                    if(d.backdrop_path && L.Background) L.Background.change(L.TMDB.image('t/p/w1280' + d.backdrop_path))
                }
                catch(e){}
                load(d, function(info){ if(cur === d) render(d, info, curEl) })
                timer2 = setTimeout(function(){ if(cur === d) render(d, cache[ckey(d)] || null, curEl) }, 1800)
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
