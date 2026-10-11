export default function(main){
    try{
        let o = main.object || {}
        if(['main','category'].indexOf(o.component) < 0) return
        if(!document.body.classList.contains('imdbb-compact')) return
        if(localStorage.getItem('imdbb_wide') === 'false') return

        let hero = document.createElement('div')
        hero.className = 'imdbb-hero'
        hero.innerHTML = '<div class="imdbb-hero__t"></div><div class="imdbb-hero__m"></div><div class="imdbb-hero__d"></div>'

        main.html.classList.add('imdbb-home')
        main.html.insertBefore(hero, main.html.firstChild)

        let timer
        let upd = function(d){
            if(!d || !(d.title || d.name)) return
            clearTimeout(timer)
            timer = setTimeout(function(){
                let date = d.release_date || d.first_air_date || ''
                let m = date.match(/^(\d{4})-(\d\d)-(\d\d)$/)
                let parts = []
                if(d.vote_average) parts.push(Number(d.vote_average).toFixed(1))
                parts.push(m ? m[3] + '.' + m[2] + '.' + m[1] : date.slice(0, 4))
                hero.querySelector('.imdbb-hero__t').textContent = d.title || d.name
                hero.querySelector('.imdbb-hero__m').textContent = parts.filter(Boolean).join('  |  ')
                hero.querySelector('.imdbb-hero__d').textContent = d.overview || ''
            }, 200)
        }

        main.use({
            onInstance: function(item){
                item.use({
                    onActive: function(card, d){ upd(d) }
                })
            }
        })
    }
    catch(e){ console.warn('imdbb_home', e.message) }
}
