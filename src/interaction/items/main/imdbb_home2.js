export default function(main){
    try{
        let L = window.Lampa
        if(!main.html || !main.html.classList.contains('imdbb-home')) return
        let mode = function(){ return String(L.Storage.get('imdbb_scroll', '1')) }
        let hero = main.html.querySelector('.imdbb-hero')
        let meta = hero && hero.querySelector('.imdbb-hero__meta')
        let cur = null
        let FAV = '<span class="imdbb-hero__fav"><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/></svg></span>'
        let mark = function(){
            if(!meta) return
            let old = meta.querySelector('.imdbb-hero__fav')
            let want = false
            try{ want = !!(cur && L.Favorite.check(cur).book) }catch(e){}
            if(!want || !meta.children.length){ if(old) old.remove(); return }
            if(old && meta.lastElementChild === old) return
            if(old) old.remove()
            meta.insertAdjacentHTML('beforeend', FAV)
        }
        if(meta) new MutationObserver(mark).observe(meta, {childList: true})
        let acc = {} /* imdbb_accent */
        let accent = function(d){
            let pp = d && (d.backdrop_path || d.poster_path)
            if(!pp) return
            let set = function(v){
                if(cur !== d) return
                main.html.style.setProperty('--imdbb-btn', v.btn)
                main.html.style.setProperty('--imdbb-ring', v.ring)
            }
            if(acc[pp]) return set(acc[pp])
            let im = new Image()
            im.crossOrigin = 'anonymous'
            im.onload = function(){
                try{
                    let W = 32, H = 48, cv = document.createElement('canvas')
                    cv.width = W; cv.height = H
                    let cx = cv.getContext('2d')
                    cx.drawImage(im, 0, 0, W, H)
                    let px = cx.getImageData(0, 0, W, H).data, bins = {}
                    for(let i = 0; i < px.length; i += 4){
                        let r = px[i] / 255, g = px[i+1] / 255, b = px[i+2] / 255
                        let mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn, l = (mx + mn) / 2
                        if(dd < 0.12 || l < 0.15 || l > 0.9) continue
                        let s = dd / (1 - Math.abs(2 * l - 1))
                        let h = mx == r ? ((g - b) / dd + (g < b ? 6 : 0)) : mx == g ? ((b - r) / dd + 2) : ((r - g) / dd + 4)
                        h = h * 60
                        let k = Math.floor(h / 20) % 18
                        let w = s * (1 - Math.abs(2 * l - 1)) + 0.05
                        let o = bins[k] || (bins[k] = {w: 0, h: 0, s: 0})
                        o.w += w; o.h += h * w; o.s += s * w
                    }
                    let best = null
                    Object.keys(bins).forEach(function(k){ if(!best || bins[k].w > best.w) best = bins[k] })
                    if(!best) return
                    let hh = Math.round(best.h / best.w)
                    let ss = Math.min(78, Math.max(55, Math.round(best.s / best.w * 100)))
                    let ll = (hh > 40 && hh < 190) ? 33 : 46
                    let v = {btn: 'hsl(' + hh + ', ' + Math.min(ss, 70) + '%, ' + Math.max(22, Math.min(ll, 38)) + '%)', ring: 'hsl(' + hh + ', ' + ss + '%, 62%)'}
                    acc[pp] = v
                    set(v)
                }
                catch(e){}
            }
            im.src = L.TMDB.image('t/p/w154' + pp)
        }
        let patch = function(item){
            let sc = item && item.scroll
            if(!sc || sc.__ib || !sc.update) return
            sc.__ib = 1
            let orig = sc.update
            sc.update = function(elem, tocenter){
                let el = elem && elem.jquery ? elem[0] : elem
                if(!el || !el.getBoundingClientRect) return orig.call(this, elem, tocenter)
                if(mode() === '1') return orig.call(this, el, false)
                let r = el.getBoundingClientRect()
                let R = sc.render(true).getBoundingClientRect()
                if(r.left >= R.left - 2 && r.right <= R.right + 2) return
                if(r.left < R.left - 2) return orig.call(this, el, false)
                let P = r.left + r.width - (R.right - R.left) + 12
                return orig.call(this, {getBoundingClientRect: function(){ return {left: P} }, offsetWidth: r.width}, false)
            }
        }
        main.use({
            onInstance: function(item){
                patch(item)
                item.use({onActive: function(card, d){ patch(item); cur = d; accent(d); setTimeout(mark, 300) }})
            }
        })
    }
    catch(e){ console.warn('imdbb_home2', e.message) }
}
