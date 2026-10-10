import Template from '../../interaction/template'
import Controller from '../../core/controller'
import Utils from '../../utils/utils'
import Api from '../../core/api/api'
import Arrays from '../../utils/arrays'
import Storage from '../../core/storage/storage'
import Lang from '../../core/lang'
import Emit from '../../utils/emit'
import TMDB from '../../core/api/sources/tmdb'
import Permit from '../../core/account/permit'
import IMDb from '../../utils/imdb'

import Options from './start/options'
import Torrents from './start/torrents'
import Subscribed  from './start/subscribed'
import Trailers from './start/trailers'
import Poster from './start/poster'
import Reactions from './start/reactios'
import Translations from './start/translations'
import Bookmarks from './start/bookmarks'
import Buttons from './start/buttons'

const QKEY = 'imdbb_q1'
const DUB = '<span><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.15em"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg></span>'

class Start extends Emit {
    constructor(data) {
        super()

        this.data  = data
        this.card  = data.movie

        Arrays.extend(this.card,{
            title: this.card.name,
            original_title: this.card.original_name,
            runtime: 0,
            img: this.card.poster_path ? Api.img(this.card.poster_path, Storage.field('poster_size')).replace(/\/w\d{1,4}/,'/w500') : './img/img_broken.svg'
        })

        Utils.canWatchChildren(TMDB.parsePG(data.movie), Permit.profile.age) && this.use(Torrents)

        this.use(Options)
        this.use(Subscribed)
        this.use(Trailers)
        this.use(Poster)
        this.use(Translations)
        this.use(Bookmarks)
        this.use(Reactions)
        this.use(Buttons)

        this.emit('init')
    }


    qualityChip(){
        let card = this.card
        let kind = card.first_air_date || card.number_of_seasons !== undefined ? 'tv' : 'movie'
        let key  = kind + ':' + card.id

        let show = (v)=>{
            if(!v || !v.q) return

            let t = v.q === '1080' ? 'FHD' : v.q
            let d = ''

            if(v.q !== 'TS' && v.dub){
                if(typeof v.dub === 'object'){
                    let s = Object.keys(v.dub).map(Number).sort(function(a, b){ return a - b }).pop()
                    let n = v.dub[s]

                    d = DUB + (n >= 99 ? '' : ' ' + n)
                }
                else d = DUB
            }

            this.html.find('.imdbb-cq').remove()

            let el = $('<div class="imdbb-cq">' + t + (d ? ' ' + d : '') + '</div>')
            let im = this.html.find('.rate--imdb')

            if(this.html.find('.full-start-new__rate-line').length) this.html.find('.full-start-new__rate-line').append(el)
            else if(im.length) el.insertAfter(im)
            else this.html.find('.full-start-new__rate-line').append(el)
        }

        let store = null

        try{ store = JSON.parse(localStorage.getItem(QKEY) || '{}') }
        catch(e){ store = {} }

        let c = store[key]

        if(c && c.t + c.l > Date.now()){
            show(c.v)

            return
        }

        let proxy = ''

        try{ proxy = localStorage.getItem('imdb_proxy') || '' }
        catch(e){}

        if(!proxy) return

        let title = card.title || card.name || ''
        let orig  = card.original_title || card.original_name || ''
        let year  = ((card.release_date || card.first_air_date || '') + '').slice(0, 4)
        let x     = new XMLHttpRequest()

        x.open('GET', proxy + '?title=' + encodeURIComponent(title) + '&year=' + year + '&orig=' + encodeURIComponent(orig) + '&kind=' + kind, true)
        x.timeout = 30000
        x.onload = ()=>{
            let v = null

            try{ v = JSON.parse(x.responseText) }
            catch(e){}

            if(!v || typeof v !== 'object') return

            let val = {q: v.q || null, dub: v.dub || null}

            try{
                let s = JSON.parse(localStorage.getItem(QKEY) || '{}')

                s[key] = {v: val, t: Date.now(), l: val.q === 'TS' ? 3600e3 : (val.q ? 6 * 3600e3 : 3 * 3600e3)}

                localStorage.setItem(QKEY, JSON.stringify(s))
            }
            catch(e){}

            show(val)
        }
        x.send()
    }

    create(){
        let genres      = (this.card.genres || ['---']).slice(0,3).map(a => Utils.capitalizeFirstLetter(a.name)).join(', ')
        let countries   = TMDB.parseCountries(this.card)
        let seasons     = Utils.countSeasons(this.card)
        let tmdb_rating = parseFloat((this.card.vote_average || 0) +'').toFixed(1)

        let relise  = (this.card.release_date || this.card.first_air_date || '') + ''
        let year    = relise ? relise.slice(0,4) : ''
        let quality = !this.card.first_air_date ? this.card.release_quality || this.card.quality : false
        let pg      = TMDB.parsePG(this.card)
        let head    = []
        let info    = []

        if(tmdb_rating >= 10) tmdb_rating = 10

        this.html = Template.get('full_start_new',{
            title: this.card.title,
            original_title: this.card.original_title,
            descr: Utils.substr(this.card.overview || Lang.translate('full_notext'), 420),
            time: Utils.secondsToTime(this.card.runtime * 60, true),
            genres: Utils.substr(genres, 30),
            rating: tmdb_rating,
            seasons: seasons,
            countries: countries.join(', '),
            episodes: this.card.number_of_episodes,
            tagline: this.card.tagline
        })

        !window.lampa_settings.torrents_use && this.html.find('.view--torrent').addClass('hide')

        this.card.name && this.html.find('.full-start-new__poster').addClass('card--tv').append('<div class="card__type">TV</div>')
        this.card.adult && this.html.find('.full-start-new__poster').addClass('card--adult').append('<div class="card__type">ADULT</div>')

        if(year){
            this.html.find('.tag--year').removeClass('hide').find('> div').text(year)

            head.push('<span>' + year + '</span>')
        }

        countries.length && head.push(countries.slice(0,5).join(' | '))

        !this.card.tagline && this.html.find('.full--tagline').remove()

        if(!this.card.tagline && this.card.title.length > 25) this.html.find('.full-start-new__title').addClass('twolines')

        let logoOff = window.Lampa.Storage.get('logo_card', 'true')

        if(!(logoOff === false || logoOff === 'false') && this.card.id){
            let L = window.Lampa
            let lt = this.html.find('.full-start-new__title')
            let lg = this.html.find('.full--tagline')
            let lang = L.Storage.get('language', 'ru')
            let back = function(){ lt.css('visibility', ''); lg.css('visibility', '') }
            let url = L.TMDB.api((this.card.name ? 'tv' : 'movie') + '/' + this.card.id + '/images?api_key=' + L.TMDB.key() + '&include_image_language=' + lang + ',en,null')

            lt.css('visibility', 'hidden')
            lg.css('visibility', 'hidden')

            $.get(url, function(r){
                let all = r && r.logos ? r.logos : []
                let pick = all.filter(function(x){ return x.iso_639_1 === lang })[0] || all.filter(function(x){ return x.iso_639_1 === 'en' })[0] || all[0]

                if(!pick || !pick.file_path) return back()

                let st = window.innerWidth > 585 ? 'margin-top:0.3em;margin-bottom:0.1em;max-height:1.8em;max-width:100%;' : 'margin-top:0.3em;margin-bottom:0.1em;max-height:2.8em;max-width:100%;'
                let img = $('<img style="' + st + '" />')

                img.on('load', function(){
                    lt.removeClass('twolines').html('').append(img).css('visibility', '')
                    lg.hide()
                })
                img.on('error', back)
                img.attr('src', L.TMDB.image('t/p/w500' + pick.file_path.replace('.svg', '.png')))
            }).fail(back)
        }

        let compact = document.body.classList.contains('imdbb-compact')
        let meta = []
        if(year) meta.push(year)
        if(countries.length) meta.push(countries[0])
        if(this.card.runtime > 0){
            let rt = Utils.secondsToTime(this.card.runtime * 60, true)
            meta.push((()=>{ let r = this.card.runtime; return (r >= 60 ? Math.floor(r / 60) + ' ч ' : '') + (r % 60 ? (r % 60) + ' мин' : '') })()); info.push('<span class="imdbb-dup">' + rt + '</span>')
        }

        seasons && info.push('<span>' + Lang.translate('title_seasons') + ': ' + seasons + '</span>')

        pg && this.html.find('.full-start__pg').removeClass('hide').text(pg)

        this.card.number_of_episodes && info.push('<span>'+Lang.translate('title_episodes') + ': ' + this.card.number_of_episodes + '</span>')

        !this.card.runtime && $('.tag--time', this.html).remove()
        
        this.card.number_of_seasons && this.html.find('.is--serial').removeClass('hide')

        this.card.vote_average == 0 && this.html.find('.rate--tmdb').addClass('hide')

        this.card.status && this.html.find('.full-start__status').removeClass('hide').text(Lang.translate('tv_status_' + this.card.status.toLowerCase().replace(/ /g,'_')))

        if(this.card.imdb_rating && parseFloat(this.card.imdb_rating) > 0){
            this.html.find('.rate--imdb').removeClass('hide').find('> div').eq(0).text(parseFloat(this.card.imdb_rating) >= 10 ? 10 : this.card.imdb_rating)
        }

        if(this.card.kp_rating && parseFloat(this.card.kp_rating) > 0){
            this.html.find('.rate--kp').removeClass('hide').find('> div').eq(0).text(parseFloat(this.card.kp_rating) >= 10 ? 10 : this.card.kp_rating)
        }

        this.html.find('.rate--tmdb, .full-start__status').addClass('hide')

        if(!(parseFloat(this.card.imdb_rating) > 0)){
            IMDb.rating(this.card, (r)=>{
                r = parseFloat(r)

                if(!(r > 0)) return

                this.html.find('.rate--imdb').removeClass('hide').find('> div').eq(0).text(r >= 10 ? 10 : r.toFixed(1))
            })
        }

        this.qualityChip()

        if(this.card.genres){
            genres = this.card.genres.slice(0,5).map((a)=>{
                return Utils.capitalizeFirstLetter(a.name)
            }).join(' | ')

            meta.push(this.card.genres.slice(0,3).map((a)=>Utils.capitalizeFirstLetter(a.name)).join(', '))
            info.push('<span class="imdbb-dup">' + genres + '</span>')
        }

        if(quality){
            this.html.find('.tag--quality').removeClass('hide').find('> div').text(quality)
            
            info.push('<span>' + Lang.translate('player_quality') + ': ' + quality.toUpperCase() + '</span>')
        }

        if(this.card.next_episode_to_air){
            let air = Utils.parseToDate(this.card.next_episode_to_air.air_date)
            let now = Date.now()

            let day = Math.ceil((air.getTime() - now) / (24*60*60*1000))
            let txt = Lang.translate('full_next_episode')+': ' + Utils.parseTime(this.card.next_episode_to_air.air_date).short + ' / '+Lang.translate('full_episode_days_left')+': ' + day

            if(day > 0){
                $('.tag--episode', this.html).removeClass('hide').find('div').text(txt)

                info.push('<span>'+txt+'</span>')
            } 
        }

        $('.full-start-new__buttons', this.html).find('.selector').on('hover:focus hover:enter hover:hover hover:touch', (e)=>{
            this.last = e.target
        })
        
        this.html.find('.full-start-new__head').toggleClass('hide',!head.length).html(head.join(', '))
        let imdbbDet = this.html.find('.full-start-new__details'), imdbbSp = '<span class="full-start-new__split">●</span>'
        imdbbDet.html(info.join(imdbbSp))
        imdbbDet.after(imdbbDet.clone().addClass('imdbb-details-c').html(info.filter((x)=>x.indexOf('imdbb-dup')<0).join(imdbbSp)))
        (()=>{ let rl = this.html.find('.full-start-new__rate-line'), bt = this.html.find('.full-start-new__buttons'), gl = (this.card.genres || []).slice(0,3).map((a)=>Utils.capitalizeFirstLetter(a.name)).join(' · '), parts = [year, countries[0], this.card.runtime > 0 ? Utils.secondsToTime(this.card.runtime * 60, true) : ''].filter(Boolean); parts.forEach((x)=>{ $('<div class="imdbb-meta"></div>').text(x).appendTo(rl) }); gl && $('<div class="imdbb-gen"></div>').text(gl).insertAfter(rl); this.card.budget > 0 && $('<div class="imdbb-bud"><span>Бюджет</span><span></span></div>').appendTo(bt).find('span').eq(1).text('$ ' + Utils.numberWithSpaces(this.card.budget)); $('<div class="imdbb-ov"></div>').text(this.card.overview || '').insertAfter(bt) })()
        let imdbbFav = $('<div class="imdbb-meta imdbb-fav"><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/></svg></div>').appendTo(this.html.find('.full-start-new__rate-line'))
        let imdbbFavUpd = ()=>{ try{ imdbbFav.toggleClass('on', !!window.Lampa.Favorite.check(this.card).book) }catch(e){} }
        imdbbFavUpd()
        this.html.on('hover:long', '.button--play', ()=>{
            if(!document.body.classList.contains('imdbb-compact')) return
            try{
                window.Lampa.Favorite.toggle('book', this.card)
                imdbbFavUpd()
                window.Lampa.Noty.show(window.Lampa.Favorite.check(this.card).book ? 'Добавлено в закладки' : 'Убрано из закладок')
            }
            catch(e){}
        })

        if(window.localStorage.getItem('imdbb_no_tr') !== 'false') this.html.find('.view--trailer').remove()
        if(window.localStorage.getItem('imdbb_no_more') !== 'false') this.html.find('.button--options').remove()
        if(window.lampa_settings.read_only) this.html.find('.button--play').remove()

        try{
            let pp = this.card.poster_path || this.card.backdrop_path
            if(pp){
                let im = new Image()
                im.crossOrigin = 'anonymous'
                im.onload = ()=>{
                    try{
                        let W = 32, H = 48, cv = document.createElement('canvas')
                        cv.width = W; cv.height = H
                        let cx = cv.getContext('2d')
                        cx.drawImage(im, 0, 0, W, H)
                        let px = cx.getImageData(0, 0, W, H).data, bins = {}
                        for(let i = 0; i < px.length; i += 4){
                            let r = px[i] / 255, g = px[i+1] / 255, b = px[i+2] / 255
                            let mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2
                            if(d < 0.12 || l < 0.15 || l > 0.9) continue
                            let s = d / (1 - Math.abs(2 * l - 1))
                            let h = mx == r ? ((g - b) / d + (g < b ? 6 : 0)) : mx == g ? ((b - r) / d + 2) : ((r - g) / d + 4)
                            h = h * 60
                            let k = Math.floor(h / 20) % 18
                            let w = s * (1 - Math.abs(2 * l - 1)) + 0.05
                            let o = bins[k] || (bins[k] = {w: 0, h: 0, s: 0})
                            o.w += w; o.h += h * w; o.s += s * w
                        }
                        let best = null
                        Object.keys(bins).forEach((k)=>{ if(!best || bins[k].w > best.w) best = bins[k] })
                        if(!best) return
                        let hh = Math.round(best.h / best.w)
                        let ss = Math.min(78, Math.max(55, Math.round(best.s / best.w * 100)))
                        let ll = (hh > 40 && hh < 190) ? 33 : 46
                        this.html[0].style.setProperty('--imdbb-accent', 'hsl(' + hh + ', ' + ss + '%, ' + ll + '%)')
                        this.html[0].style.setProperty('--imdbb-accent-soft', 'hsla(' + hh + ', ' + ss + '%, ' + ll + '%, 0.38)')
                    }
                    catch(e){}
                }
                im.src = window.Lampa.TMDB.image('t/p/w154' + pp)
            }
        }
        catch(e){}
        this.emit('create')
    }

    toggle(){
        let controller = {
            link: this,
            toggle: ()=>{
                this.emit('groupButtons')
                
                Controller.collectionSet(this.html)
                Controller.collectionFocus(this.last || false, this.html)

                this.emit('toggle')
            },
            right: ()=>{
                Navigator.move('right')
            },
            left: ()=>{
                if(Navigator.canmove('left')) Navigator.move('left')
                else this.emit('left')
            },
            down: ()=>{
                if(Navigator.canmove('down')) Navigator.move('down')
                else this.emit('down')
            },
            up: ()=>{
                if(Navigator.canmove('up')) Navigator.move('up')
                else this.emit('up')
            },
            back: this.emit.bind(this, 'back'),
        }

        this.emit('controller', controller)

        Controller.add('full_start', controller)

        Controller.toggle('full_start')
    }

    render(js){
        return js ? this.html[0] : this.html
    }

    destroy(){
        this.html.remove()

        this.emit('destroy')
    }
}

export default Start