import Utils from '../../../../utils/utils'

export default {
    onCreate: function(){
        try{
            if(this.tv || !document.body.classList.contains('touch-device')) return
            window.__imdbbSw = 1
            let line = this
            let el = this.scroll.render(true)
            let sx = 0, sy = 0
            el.addEventListener('touchstart', function(e){
                let p = e.touches[0]
                if(p){ sx = p.clientX; sy = p.clientY }
            }, {passive: true})
            el.addEventListener('touchend', function(e){
                let p = e.changedTouches[0]
                if(!p) return
                let dx = sx - p.clientX
                let dy = sy - p.clientY
                if(Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
                let it = line.items[line.active + (dx > 0 ? 1 : -1)]
                let c = it && it.render && it.render(true)
                if(c && c.classList) Utils.trigger(c, 'hover:focus')
            }, {passive: true})
        }
        catch(e){}
    }
}
