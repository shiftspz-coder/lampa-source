import Utils from '../../../../utils/utils'
import Platform from '../../../../core/platform'
import Controller from '../../../../core/controller'

let G = null
let BAD = '.selectbox, .modal, .settings, .settings-input, .head, .menu, .player, .simple-keyboard, .search-box__keypad, .search__keypad, input, textarea'

function ok(e){
    try{
        if(!document.body.classList.contains('imdbb-compact')) return false
        if(window.localStorage.getItem('imdbb_swipe') === 'false') return false
        if(document.body.classList.contains('selectbox--open')) return false
        if(!Utils.isTouchDevice() || Platform.tv()) return false
        let t = e.target
        if(t && t.closest && t.closest(BAD)) return false
        return true
    }
    catch(x){ return false }
}

if(!window.__imdbbSwA){
    window.__imdbbSwA = 1
    document.addEventListener('touchstart', function(e){
        let p = e.touches[0]
        G = (p && ok(e)) ? {x: p.clientX, y: p.clientY, d: 0, l: !!(e.target.closest && e.target.closest('.items-line'))} : null
    }, {capture: true, passive: true})
    document.addEventListener('touchmove', function(e){
        let g = G
        let p = e.touches[0]
        if(!g || !p) return
        if(!g.d){
            let dx = p.clientX - g.x
            let dy = p.clientY - g.y
            if(Math.abs(dx) > 8 || Math.abs(dy) > 8) g.d = Math.abs(dx) > Math.abs(dy) ? 1 : 2
        }
        if(g.d === 1 && g.l) return
        e.stopPropagation()
        if(g.d && e.cancelable) e.preventDefault()
    }, {capture: true, passive: false})
    document.addEventListener('touchend', function(e){
        let g = G
        G = null
        let p = e.changedTouches[0]
        if(!g || !g.d || !p) return
        try{
            if(g.d === 2){
                let dy = g.y - p.clientY
                if(Math.abs(dy) >= 40) Controller.move(dy > 0 ? 'down' : 'up')
            }
            else if(!g.l){
                let dx = g.x - p.clientX
                if(Math.abs(dx) >= 40) Controller.move(dx > 0 ? 'right' : 'left')
            }
        }
        catch(x){}
    }, {capture: true, passive: true})
}

export default {
    onCreate: function(){
        try{
            if(!Utils.isTouchDevice() || Platform.tv()) return
            window.__imdbbSw3 = 1
            let line = this
            let el = this.html
            let st = null
            let on = function(){ return document.body.classList.contains('imdbb-compact') && window.localStorage.getItem('imdbb_swipe') !== 'false' }
            el.addEventListener('touchstart', function(e){
                let p = e.touches[0]
                st = (p && on()) ? {x: p.clientX, y: p.clientY, d: 0} : null
            }, {capture: true, passive: true})
            el.addEventListener('touchmove', function(e){
                if(!st) return
                let p = e.touches[0]
                if(!p) return
                if(!st.d){
                    let dx = p.clientX - st.x
                    let dy = p.clientY - st.y
                    if(Math.abs(dx) > 8 || Math.abs(dy) > 8) st.d = Math.abs(dx) > Math.abs(dy) ? 1 : 2
                }
                if(!st.d || st.d === 1){
                    e.stopPropagation()
                    if(st.d && e.cancelable) e.preventDefault()
                }
            }, {capture: true, passive: false})
            el.addEventListener('touchend', function(e){
                let s = st
                st = null
                if(!s || s.d !== 1) return
                let p = e.changedTouches[0]
                if(!p) return
                let dx = s.x - p.clientX
                if(Math.abs(dx) < 40) return
                line.wheel(dx > 0 ? 1 : -1)
            }, {capture: true, passive: true})
        }
        catch(e){}
    }
}
