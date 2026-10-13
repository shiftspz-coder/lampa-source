import IMDb from '../utils/imdb'
import {qcached} from '../interaction/card/module/ratting'

const ASIA = 'ja ko zh th vi hi ta te ml kn bn ur pa gu mr ne si my km lo mn ka hy az kk ky tg tk uz'.split(' ')
const ITEMS = [
    ['asian', 'Фильтр: без азиатского контента', 'Скрываем карточки азиатского происхождения'],
    ['lang', 'Фильтр: без контента на другом языке', 'Скрываем карточки без перевода названия'],
    ['rating', 'Фильтр: без низкого рейтинга', 'Скрываем карточки с оценкой IMDb ниже 6.0'],
    ['history', 'Фильтр: без просмотренного', 'Скрываем брошенное и просмотренное'],
    ['ts', 'Фильтр: без TS', 'Скрываем фильмы с качеством TS']
]

function on(n){
    let v = window.Lampa.Storage.get('imdbb_f_' + n, 'false')

    return v === true || v === 'true'
}

function kind(m){
    return m.media_type === 'tv' || (m.name && !m.title) || m.first_air_date ? 'tv' : 'movie'
}

function minr(){
    return parseFloat(window.Lampa.Storage.get('imdbb_minr', '6')) || 6
}

function filter(list){
    if(!Array.isArray(list)) return list

    let a = on('asian'), l = on('lang'), r = on('rating'), h = on('history'), t = on('ts')

    if(!(a || l || r || h || t)) return list

    let lg = window.Lampa.Storage.get('language', 'ru')

    return list.filter(function(m){
        if(!m) return true

        let ol = m.original_language ? String(m.original_language).toLowerCase() : ''

        if(a && ol && ASIA.indexOf(ol) > -1) return false
        if(l && ol && ol !== lg && (m.title || m.name) === (m.original_title || m.original_name)) return false

        if(r){
            let v = IMDb.cached(m)

            if(v && v < minr()) return false
        }

        if(t && qcached(m) === 'TS') return false

        if(h && ol){
            try{ if(seen(m)) return false }
            catch(e){}
        }

        return true
    })
}

function seen(m){
    let L = window.Lampa
    let fc = L.Favorite.check(m)

    if(fc && (fc.thrown || fc.viewed)) return true
    if(!(fc && fc.history)) return false
    if(kind(m) === 'movie') return true

    let now = new Date()
    let fav = L.Storage.get('favorite', '{}')
    let tt = L.Storage.cache('timetable', 300, [])
    let title = m.original_title || m.original_name
    let eps = {}
    let c = (fav.card || []).filter(function(x){ return x.id === m.id && Array.isArray(x.seasons) })[0]

    if(c) c.seasons.forEach(function(s){
        if(s.season_number > 0 && s.episode_count > 0 && s.air_date && new Date(s.air_date) < now){
            for(let e = 1; e <= s.episode_count; e++) eps[s.season_number + '_' + e] = [s.season_number, e]
        }
    })

    let t = tt.filter(function(x){ return x.id === m.id })[0]

    if(t && Array.isArray(t.episodes)) t.episodes.forEach(function(e){
        if(e.season_number > 0 && e.air_date && new Date(e.air_date) < now) eps[e.season_number + '_' + e.episode_number] = [e.season_number, e.episode_number]
    })

    let list = Object.keys(eps).map(function(k){ return eps[k] })

    if(!list.length) return false

    return list.every(function(p){
        let h = L.Utils.hash([p[0], p[0] > 10 ? ':' : '', p[1], title].join(''))

        return L.Timeline.view(h).percent > 0
    })
}

function init(){
    let L = window.Lampa

    try{
        let noacc = window.lampa_settings && window.lampa_settings.account_use === false

        L.SettingsApi.addComponent({
            component: 'imdbb',
            before: noacc ? 'interface' : 'account',
            name: 'IMDb+',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" stroke-width="2"/><path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        })

        ITEMS.forEach(function(it){
            L.SettingsApi.addParam({
                component: 'imdbb',
                param: {name: 'imdbb_f_' + it[0], type: 'trigger', default: false},
                field: {name: it[1], description: it[2]}
            })
        })

        L.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'logo_card', type: 'trigger', default: true},
            field: {name: 'Логотип вместо названия', description: 'На карточке фильма'}
        })

        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_infinite', type: 'trigger', default: true}, field: {name: 'Бесконечные карточки', description: 'Ряды подгружаются до конца вместо кнопки «Ещё»'}})

        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_style', type: 'trigger', default: true}, field: {name: 'Стильный интерфейс', description: 'Горизонтальные карточки, блок информации и новая карточка фильма во всех разделах, включая поиск и избранное. ТВ и телефон в горизонтали'}, onChange: function(){ if(window.__imdbbStySync) window.__imdbbStySync() }})
        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_hide_badges', type: 'trigger', default: false}, field: {name: 'Скрыть качество, IMDb и сезоны/серии на карточках', description: 'Они уже есть в блоке информации. Действует везде: главная, поиск, избранное и другие разделы'}})


        let cmp = function(){
            try{
                let v = L.Storage.get('imdbb_compact', 'true')
                let on = !(v === false || v === 'false')
                let tv = false

                try{
                    tv = !!(L.Platform && (L.Platform.tv() || (L.Platform.screen('tv') && !/mobile/i.test(navigator.userAgent))))
                }
                catch(e){}

                document.body.dataset.imdbbTv = tv ? '1' : '0'
                let land = false
                try{ land = window.innerWidth > window.innerHeight }catch(e){}
                document.body.classList.toggle('imdbb-compact', on && (tv || land))
            }
            catch(e){}
        }

        window.__imdbbStySync = function(){ try{ let st = L.Storage.get('imdbb_style', 'true'); let on = !(st === false || st === 'false'); try{ L.Storage.set('imdbb_compact', on); L.Storage.set('imdbb_wide', on) }catch(e){} localStorage.setItem('imdbb_compact', on ? 'true' : 'false'); localStorage.setItem('imdbb_wide', on ? 'true' : 'false') }catch(e){} cmp() };

        L.SettingsApi.addParam({component: 'imdbb', param: {name: 'imdbb_show_all', type: 'trigger', default: false}, field: {name: 'Показать все скрытые элементы', description: 'Возвращает всё, что скрывает «IMDb+» (список ниже), независимо от переключателей «Скрыть». Трейлеры и Shots: после перезапуска приложения'}, onChange: function(){ if(window.__imdbbSh) window.__imdbbSh() }})
        ;[
            ['imdbb_h_prof', 'профиль в шапке', 'Кнопка профиля вверху'],
            ['imdbb_h_mark', 'индикаторы связи', 'Значки соединения в шапке'],
            ['imdbb_h_bcast', '«Трансляция»', 'Кнопка в шапке (только стильный интерфейс)'],
            ['imdbb_h_logo', 'логотип Lampa', 'Слева вверху (только стильный интерфейс)'],
            ['imdbb_no_tr', 'трейлеры и Shots', 'Трейлеры в меню «Смотреть» и плагин Shots (Shots: после перезапуска приложения)'],
            ['imdbb_no_more', 'кнопку «Ещё»', 'Кнопка с тремя точками в карточке (при следующем открытии карточки)'],
            ['imdbb_h_sub', 'кнопка подписки', 'В карточке фильма (только стильный интерфейс, при следующем открытии карточки)'],
            ['imdbb_h_qual', 'старые метки качества', 'Жёлтые метки на карточках (только стильный интерфейс)'],
            ['imdbb_h_descr', 'ряд «Подробно»', 'Описание, жанр, производство, теги, бюджет и страны под карточкой (только стильный интерфейс, при следующем открытии карточки)'],
            ['imdbb_h_disc', 'комментарии', 'Ряд комментариев под карточкой (только стильный интерфейс, при следующем открытии карточки)'],
            ['imdbb_h_pers', 'ряд актёров', 'Родной ряд актёров под карточкой (только стильный интерфейс, при следующем открытии карточки)'],
            ['imdbb_h_meta', 'ряды метаданных', 'metadata_chart и metadata_tags (только стильный интерфейс, при следующем открытии карточки)']
        ].forEach(function(it){ L.SettingsApi.addParam({component: 'imdbb', param: {name: it[0], type: 'trigger', default: true}, field: {name: 'Скрыть: ' + it[1], description: it[2]}, onChange: function(){ if(window.__imdbbSh) window.__imdbbSh() }}) })

        

        L.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_swipe', type: 'trigger', default: true},
            field: {name: 'Свайп (только мобильная версия)', description: 'Свайп пальцем двигает фокус по карточкам и рядам вместо прокрутки. Только телефон в горизонтали, на ТВ и приставках не действует. Работает сразу'}
        })

        L.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_logo_mode', type: 'select', values: {off: 'Выкл', a: 'А: снизу слева', b: 'Б: по центру', c: 'В: только в фокусе'}, default: 'a'},
            field: {name: 'Логотипы на карточках в ряду', description: 'Временно для проверки трёх вариантов. Только главная. Без логотипа показывается название.'}
        })

        L.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_f_nobd', type: 'trigger', default: false},
            field: {name: 'Поиск: скрывать карточки без кадра', description: 'В поиске остаются только широкие карточки, у которых есть кадр. Действует при следующем поиске'}
        })
        L.SettingsApi.addParam({
            component: 'imdbb',
            param: {name: 'imdbb_card_nobd', type: 'select', values: {off: 'Как сейчас', a: 'А: постер обрезан по центру', b: 'Б: постер целиком на фоне'}, default: 'off'},
            field: {name: 'Поиск: карточки без кадра', description: 'Как показывать широкие карточки, если нет кадра. Действует при следующем поиске. При включённом фильтре выше таких карточек нет'}
        })

        cmp()
        try{ if(localStorage.getItem('imdbb_style') === null){ let c0 = L.Storage.get('imdbb_compact', 'true'); let w0 = localStorage.getItem('imdbb_wide'); let on0 = !(c0 === false || c0 === 'false' || w0 === 'false'); L.Storage.set('imdbb_style', on0); window.__imdbbStySync() } }catch(e){}
        window.__imdbbSh = function(){ try{ let all = localStorage.getItem('imdbb_show_all') === 'true'; ['prof','mark','bcast','logo','sub','qual','descr','disc','pers','meta'].forEach(function(k){ document.body.classList.toggle('imdbb-sh-' + k, all || localStorage.getItem('imdbb_h_' + k) === 'false') }) }catch(e){} }
        window.__imdbbSh(); setTimeout(window.__imdbbSh, 1000)
        try{ L.Storage.listener.follow('change', function(e){ if(e && e.name && (e.name === 'imdbb_show_all' || e.name.indexOf('imdbb_h_') === 0)) window.__imdbbSh() }) }catch(e){}
        window.__imdbbNb = function(){ try{ document.body.classList.toggle('imdbb-nobadge', localStorage.getItem('imdbb_hide_badges') === 'true') }catch(e){} }
        window.__imdbbNb(); setTimeout(window.__imdbbNb, 1000)
        try{ L.Storage.listener.follow('change', function(e){ if(e && e.name === 'imdbb_hide_badges') window.__imdbbNb() }) }catch(e){}
        setTimeout(cmp, 1000)
        window.addEventListener('resize', cmp)
        window.addEventListener('orientationchange', function(){ setTimeout(cmp, 300) })

        try{ L.Storage.listener.follow('change', function(e){ if(e && e.name === 'imdbb_compact') cmp() }) }
        catch(e){}

        L.Listener.follow('request_secuses', function(e){
            try{
                let u = e && e.params && e.params.url

                if(!u || !e.data || !Array.isArray(e.data.results)) return
                if(u.indexOf(L.TMDB.api('')) < 0 || u.indexOf('/search') > -1 || u.indexOf('/person/') > -1) return

                e.data.original_length = e.data.results.length
                e.data.results = filter(e.data.results)
            }
            catch(x){}
        })
    }
    catch(x){}
}

export default {init, filter}
