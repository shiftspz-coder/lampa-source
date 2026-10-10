import Utils from '../../../utils/utils'
import Template from '../../template'
import IMDb from '../../../utils/imdb'

const rates = {}
const QKEY = 'imdbb_q1'
const MAXQ = 3
const DUB = '<span class="imdbb-dub">\uD83D\uDDE3\uFE0F</span>'
const pend = {}

let timer = null
let started = false
let qcache = null
let qsave = null
let queue = []
let active = 0

function kindOf(m){
    return m.media_type === 'tv' || (m.name && !m.title) || m.first_air_date ? 'tv' : 'movie'
}

function proxy(){
    try{ return localStorage.getItem('imdb_proxy') || '' }
    catch(e){ return '' }
}

function css(){
    if(document.getElementById('imdbb-css')) return

    let st = document.createElement('style')

    st.id = 'imdbb-css'
    st.textContent = '.imdbb-dub{filter:brightness(0) invert(1)}' +
        '.card__type{left:.5em!important;top:.5em!important;right:auto!important;background:rgba(0,0,0,.62)!important;color:#fff!important;font-weight:700!important;font-size:.9em!important;line-height:1.3!important;padding:.05em .45em!important;border-radius:.4em!important;text-transform:none!important}' +
        '.card__view:has(.imdbb-q) .card__type{top:2.3em!important}'

    document.head.appendChild(st)
}

function badge(r){
    let tag = 'background:#F5C518;color:#000;font-weight:700;font-size:.75em;padding:0 .35em;border-radius:.3em;margin-right:.4em'
    let box = 'width:auto;white-space:nowrap;background:rgba(0,0,0,.62)'

    return $('<div class="card__vote" style="' + box + '"><span style="' + tag + '">IMDb</span><span>' + (r >= 10 ? '10' : r.toFixed(1)) + '</span></div>')
}

function qload(){
    if(qcache) return qcache

    try{ qcache = JSON.parse(localStorage.getItem(QKEY) || '{}') }
    catch(e){ qcache = {} }

    return qcache
}

function qsaveLater(){
    clearTimeout(qsave)

    qsave = setTimeout(function(){
        try{
            let k = Object.keys(qcache)

            if(k.length > 1500){
                k.sort(function(a, b){ return qcache[a].t - qcache[b].t })
                    .slice(0, k.length - 1500)
                    .forEach(function(x){ delete qcache[x] })
            }

            localStorage.setItem(QKEY, JSON.stringify(qcache))
        }
        catch(e){}
    }, 1000)
}

function qget(k){
    let c = qload()[k]

    return c && c.t + c.l > Date.now() ? c : null
}

function qset(k, v, l){
    qload()[k] = {v: v, t: Date.now(), l: l}

    qsaveLater()
}

function qttl(v){
    return v && v.q === 'TS' ? 3600e3 : (v && v.q ? 6 * 3600e3 : 3 * 3600e3)
}

function qnext(){
    if(active >= MAXQ || !queue.length) return

    let j = queue.shift()
    let x = new XMLHttpRequest()
    let fin = false

    active++

    let end = function(v){
        if(fin) return

        fin = true
        active--

        delete pend[j.k]

        if(v) qset(j.k, v, qttl(v))
        else qset(j.k, {q: null}, 300e3)

        setTimeout(run, 50)
        setTimeout(qnext, 50)
    }

    x.open('GET', j.u, true)
    x.timeout = 30000
    x.onload = function(){
        let v = null

        try{ v = JSON.parse(x.responseText) }
        catch(e){}

        end(v && typeof v === 'object' ? {q: v.q || null, dub: v.dub || null} : null)
    }
    x.onerror = x.ontimeout = function(){ end(null) }
    x.send()
}

function label(v){
    if(!v || !v.q) return ''

    let t = v.q === '1080' ? 'FHD' : v.q

    if(v.q !== 'TS' && v.dub){
        if(typeof v.dub === 'object'){
            let s = Object.keys(v.dub).map(Number).sort(function(a, b){ return a - b }).pop()
            let n = v.dub[s]

            t += ' ' + DUB + (n >= 99 ? '' : n)
        }
        else t += ' ' + DUB
    }

    return t
}

function visible(el){
    let r = el.getBoundingClientRect()

    return r.width > 0 && r.right > -150 && r.left < window.innerWidth + 150 && r.bottom > -250 && r.top < window.innerHeight + 250
}

function run(){
    try{
        let p = proxy()
        let list = document.querySelectorAll('.card')

        for(let i = 0; i < list.length; i++){
            let el = list[i]
            let d = el.card_data || $(el).data('card')

            if(!d || !d.id) continue

            let view = $(el).find('.card__view')

            if(!view.length) continue

            let kind = kindOf(d)
            let key = kind + ':' + d.id
            let r = rates[key]

            if(r && !view.find('.card__vote').length) view.append(badge(r))

            let c = qget(key)

            if(c){
                let t = label(c.v)
                let ex = view.find('.imdbb-q')

                if(!t) ex.remove()
                else if(ex.length){
                    if(ex.attr('data-t') !== t) ex.html(t).attr('data-t', t)
                }
                else view.append($('<div class="imdbb-q" data-t="' + t.replace(/"/g, '&quot;') + '" style="position:absolute;left:.5em;top:.5em;z-index:2;background:rgba(0,0,0,.62);color:#fff;font-weight:700;font-size:.9em;line-height:1.3;padding:.05em .45em;border-radius:.4em;white-space:nowrap">' + t + '</div>'))
            }
            else if(p && !pend[key] && visible(el)){
                pend[key] = 1

                let title = d.title || d.name || ''
                let orig = d.original_title || d.original_name || ''
                let year = ((d.release_date || d.first_air_date || '') + '').slice(0, 4)

                queue.push({k: key, u: p + '?title=' + encodeURIComponent(title) + '&year=' + year + '&orig=' + encodeURIComponent(orig) + '&kind=' + kind})

                qnext()
            }
        }

        let types = document.querySelectorAll('.card__type')

        for(let i = 0; i < types.length; i++){
            if(types[i].textContent.trim() === 'TV') types[i].textContent = 'Сериал'
        }
    }
    catch(e){}
}

function schedule(){
    clearTimeout(timer)

    timer = setTimeout(run, 250)
}

function start(){
    if(started) return

    started = true

    css()

    try{ new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true}) }
    catch(e){}

    setInterval(run, 2000)

    schedule()
}

export default {
    onCreate: function(){
        start()

        if(this.data.cub_hundred_fire){
            let vote = parseFloat((this.data.cub_hundred_rating || this.data.vote_average || 0) + '').toFixed(1)

            if(vote > 0){
                this.html.find('.card__view').append(Template.elem('div', {class: 'card__vote', text: Utils.bigNumberToShort(this.data.cub_hundred_fire)}))
            }

            return
        }

        let key = kindOf(this.data) + ':' + this.data.id

        IMDb.rating(this.data, function(r){
            r = parseFloat(r)

            if(!(r > 0)) return

            rates[key] = r

            schedule()
        })
    }
}