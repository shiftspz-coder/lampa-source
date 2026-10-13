export default {
    onCreate: function(){
        try{
            if(this.tv || !document.body.classList.contains('touch-device')) return
            window.__imdbbSw2 = 1
            let line = this
            let el = this.scroll.render(true)
            let sx = 0, sy = 0, dir = 0
            el.addEventListener('touchstart', function(e){
                let p = e.touches[0]
                if(p){ sx = p.clientX; sy = p.clientY; dir = 0 }
            }, {passive: true})
            el.addEventListener('touchmove', function(e){
                let p = e.touches[0]
                if(!p) return
                let dx = p.clientX - sx
                let dy = p.clientY - sy
                if(!dir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) dir = Math.abs(dx) > Math.abs(dy) ? 1 : 2
                if(dir === 1 && e.cancelable) e.preventDefault()
            }, {passive: false})
            el.addEventListener('touchend', function(e){
                let p = e.changedTouches[0]
                let d = dir
                dir = 0
                if(!p || d !== 1) return
                let dx = sx - p.clientX
                if(Math.abs(dx) < 40) return
                line.wheel(dx > 0 ? 1 : -1)
            }, {passive: true})
        }
        catch(e){}
    }
}
