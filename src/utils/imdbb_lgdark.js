const KEY = 'imdbb_ld2'
const TH = 100
const CH = 40
let mem = null
let tm = 0
let pend = {}

function load(){
    if(mem) return mem
    try{ mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {} }catch(e){ mem = {} }
    return mem
}

function save(){
    clearTimeout(tm)
    tm = setTimeout(function(){
        try{
            let m = load(), ks = Object.keys(m)
            if(ks.length > 1500) ks.sort(function(a, b){ return m[a].t - m[b].t }).slice(0, ks.length - 1500).forEach(function(k){ delete m[k] })
            localStorage.setItem(KEY, JSON.stringify(m))
        }catch(e){}
    }, 1000)
}

function fname(s){
    let m = /\/([^\/?#]+)$/.exec(s || '')
    return m ? m[1] : ''
}

function apply(img, d){
    if(img && img.classList) img.classList.toggle('imdbb-lgdark', !!d)
}

function measure(src, cb){
    let im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = function(){
        try{
            if(!im.naturalWidth) return cb(null)
            let w = Math.min(64, im.naturalWidth), h = Math.max(1, Math.round(im.naturalHeight * w / im.naturalWidth))
            let c = document.createElement('canvas')
            c.width = w
            c.height = h
            let x = c.getContext('2d')
            x.drawImage(im, 0, 0, w, h)
            let p = x.getImageData(0, 0, w, h).data, s = 0, a = 0, sr = 0, sg = 0, sb = 0
            for(let i = 0; i < p.length; i += 4){
                let al = p[i + 3]
                if(al < 40) continue
                s += (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) * al; sr += p[i] * al; sg += p[i + 1] * al; sb += p[i + 2] * al
                a += al
            }
            if(a <= 20000) return cb(null); let mx = Math.max(sr, sg, sb) / a, mn = Math.min(sr, sg, sb) / a; cb(s / a < TH && mx - mn < CH ? 1 : 0)
        }catch(e){ cb(null) }
    }
    im.onerror = function(){ cb(null) }
    im.src = src
}

function watch(img){
    if(!img || !img.getAttribute) return
    let src = img.getAttribute('src')
    let k = fname(src)
    if(!k) return
    let m = load(), e = m[k]
    if(e && !(e.x && Date.now() - e.t > 864e5)){ apply(img, e.d); return }
    if(pend[k]){ pend[k].push(img); return }
    pend[k] = [img]
    measure(src, function(d){
        let l = pend[k] || []
        delete pend[k]
        m[k] = {d: d ? 1 : 0, t: Date.now()}
        if(d === null) m[k].x = 1
        save()
        if(d) l.forEach(function(i){ apply(i, 1) })
    })
}

window.__imdbbLgDark = {watch: watch}

export default {watch}
