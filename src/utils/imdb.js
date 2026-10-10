const KEY = 'imdb_rating_cache1'
const TTL = 3 * 24 * 3600 * 1000
const TTL_ID = 30 * 24 * 3600 * 1000
const TTL_MISS = 24 * 3600 * 1000
const MAX_ACTIVE = 5
const MAX_ENTRIES = 2000

let cache = null
let timer = null
let queue = []
let active = 0
let waiting = {}

function proxy(){
    try{ return localStorage.getItem('imdb_proxy') || '' }
    catch(e){ return '' }
}

function load(){
    if(cache) return cache

    try{ cache = JSON.parse(localStorage.getItem(KEY) || '{}') }
    catch(e){ cache = {} }

    return cache
}

function save(){
    clearTimeout(timer)

    timer = setTimeout(function(){
        try{
            let keys = Object.keys(cache)

            if(keys.length > MAX_ENTRIES){
                keys.sort(function(a, b){ return cache[a].t - cache[b].t })
                    .slice(0, keys.length - MAX_ENTRIES)
                    .forEach(function(k){ delete cache[k] })
            }

            localStorage.setItem(KEY, JSON.stringify(cache))
        }
        catch(e){}
    }, 1000)
}

function getc(k){
    let c = load()[k]

    return c && c.t + c.l > Date.now() ? c : null
}

function setc(k, v, l){
    load()[k] = {v: v, t: Date.now(), l: l}

    save()
}

function next(){
    if(active >= MAX_ACTIVE || !queue.length) return

    let job = queue.shift()
    let x = new XMLHttpRequest()
    let finished = false

    active++

    let end = function(data){
        if(finished) return

        finished = true
        active--

        job.cb(data)

        setTimeout(next, 30)
    }

    x.open('GET', job.url, true)
    x.timeout = 15000
    x.onload = function(){
        let d = null

        try{ d = JSON.parse(x.responseText) }
        catch(e){}

        end(d)
    }
    x.onerror = x.ontimeout = function(){ end(null) }
    x.send()
}

function request(url, cb){
    queue.push({url: url, cb: cb})

    next()
}

function kindOf(m){
    return m.media_type === 'tv' || (m.name && !m.title) || m.first_air_date ? 'tv' : 'movie'
}

function imdbId(m, cb){
    if(m.imdb_id) return cb(m.imdb_id)

    let L = window.Lampa
    let kind = kindOf(m)
    let k = 'id:' + kind + ':' + m.id
    let c = getc(k)

    if(c) return cb(c.v)
    if(!L || !L.TMDB) return cb(null)

    request(L.TMDB.api(kind + '/' + m.id + '/external_ids?api_key=' + L.TMDB.key()), function(d){
        let id = d && d.imdb_id ? d.imdb_id : null

        if(d) setc(k, id, id ? TTL_ID : TTL_MISS)

        cb(id)
    })
}

function rating(m, cb){
    if(!m || !m.id) return cb(null)

    let key = kindOf(m) + ':' + m.id

    if(waiting[key]) return waiting[key].push(cb)

    waiting[key] = [cb]

    let finish = function(r){
        let list = waiting[key]

        delete waiting[key]

        list.forEach(function(f){ f(r) })
    }

    imdbId(m, function(id){
        if(!id) return finish(null)

        let k = 'r:' + id
        let c = getc(k)

        if(c) return finish(c.v)

        let p = proxy()

        if(!p) return finish(null)

        request(p + '?i=' + id, function(d){
            let r = d && d.imdbRating ? parseFloat(d.imdbRating) : 0

            r = r > 0 ? r : null

            if(d) setc(k, r, r ? TTL : TTL_MISS)

            finish(r)
        })
    })
}

export default {rating}
