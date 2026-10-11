export default function(main){
    try{
        let L = window.Lampa
        if(!main.html || !main.html.classList.contains('imdbb-home')) return
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
        let patch = function(item){
            let sc = item && item.scroll
            if(!sc || sc.__ib || !sc.update) return
            sc.__ib = 1
            let orig = sc.update
            sc.update = function(elem, tocenter){
                let el = elem && elem.jquery ? elem[0] : elem
                if(!el || !el.getBoundingClientRect) return orig.call(this, elem, tocenter)
                return orig.call(this, el, false)
            }
        }
        main.use({
            onInstance: function(item){
                patch(item)
                item.use({onActive: function(card, d){ patch(item); cur = d; setTimeout(mark, 300) }})
            }
        })
    }
    catch(e){ console.warn('imdbb_home2', e.message) }
}
