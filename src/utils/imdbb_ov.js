const KEY = 'imdbb_ov1'
const TRU = 7 * 864e5
const TOTH = 36e5
let disk = null
let tm

function load(){
    if(disk) return disk

    try{ disk = JSON.parse(localStorage.getItem(KEY) || '{}') }
    catch(e){ disk = {} }

    if(!disk || typeof disk !== 'object') disk = {}

    return disk
}

function save(){
    clearTimeout(tm)

    tm = setTimeout(function(){
        try{
            let db = load()
            let ks = Object.keys(db)

            if(ks.length > 600){
                ks.sort(function(a, b){ return db[a].t - db[b].t })
                    .slice(0, ks.length - 600)
                    .forEach(function(x){ delete db[x] })
            }

            localStorage.setItem(KEY, JSON.stringify(db))
        }
        catch(e){}
    }, 1000)
}

function str(s){ return typeof s === 'string' ? s.trim() : '' }
function ru(s){ return /[\u0400-\u04FF]/.test(s || '') }
function kind(d){ return d.media_type === 'tv' || (d.name && !d.title) || d.first_air_date ? 'tv' : 'movie' }
function key(d){ return kind(d) + d.id }
function live(e){ return !!(e && e.o && e.t + (e.r ? TRU : TOTH) > Date.now()) }

function put(d, text){
    let db = load()
    let k = key(d)
    let e = db[k]
    let r = ru(text)

    if(live(e) && (e.r || !r)) return

    db[k] = {t: Date.now(), o: text, r: r, c: (e && e.c) || 0}
    save()
}

function pick(d, own, alt){
    own = str(own)
    alt = str(alt)

    let t = own
    if(!ru(t) && ru(alt)) t = alt
    else if(!t) t = alt

    if(!d || !d.id) return t

    try{
        if(t) put(d, t)

        let e = load()[key(d)]

        return live(e) ? e.o : t
    }
    catch(err){ return t }
}

function old(o, t){
    return !ru(o) && (t || 0) + TOTH < Date.now()
}

function refresh(d, cb){
    try{
        if(!d || !d.id) return

        let db = load()
        let k = key(d)
        let e = db[k]

        if(live(e) && e.r) return
        if(e && e.c && e.c + TOTH > Date.now()) return

        let L = window.Lampa
        if(!L || !L.TMDB) return

        if(!e) e = db[k] = {t: 0, o: '', r: false, c: 0}
        e.c = Date.now()
        save()

        fetch(L.TMDB.api(kind(d) + '/' + d.id + '?api_key=' + L.TMDB.key() + '&language=ru')).then(function(r){ return r.json() }).then(function(j){
            let o = j && typeof j.overview === 'string' ? j.overview.trim() : ''

            if(o && ru(o)){
                put(d, o)
                if(cb) cb(o)
            }
        }).catch(function(){})
    }
    catch(err){}
}

export default {pick, refresh, old}
