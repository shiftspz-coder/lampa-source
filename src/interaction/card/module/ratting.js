import Utils from '../../../utils/utils'
import Template from '../../template'
import IMDb from '../../../utils/imdb'

export default {
    onCreate: function(){
        let D = window.__imdbdbg = window.__imdbdbg || {c: 0, cb: 0, put: 0, last: '', err: '', dbg: ''}

        D.c++

        if(this.data.cub_hundred_fire){
            let vote = parseFloat((this.data.cub_hundred_rating || this.data.vote_average || 0) + '').toFixed(1)

            if(vote > 0){
                this.html.find('.card__view').append(Template.elem('div', {class: 'card__vote', text: Utils.bigNumberToShort(this.data.cub_hundred_fire)}))
            }

            return
        }

        let self = this

        IMDb.rating(this.data, function(r){
            try{
                D.cb++
                D.last = (typeof r) + ':' + r

                r = parseFloat(r)

                if(!(r > 0)) return

                let tries = 0

                let put = function(){
                    let h = self.html
                    let view = h && h.find ? h.find('.card__view') : []

                    if(h && !view.length && h.hasClass && h.hasClass('card__view')) view = h

                    if(!view.length){
                        if(++tries < 20) return setTimeout(put, 250)

                        D.err = 'no view'
                        D.dbg = h && h[0] ? (h[0].className + '|ch:' + h.children().length + '|conn:' + h[0].isConnected) : 'html none'

                        return
                    }

                    if(view.find('.card__vote').length) return

                    let tag = 'background:#F5C518;color:#000;font-weight:700;font-size:.75em;padding:0 .35em;border-radius:.3em;margin-right:.4em'
                    let box = 'width:auto;white-space:nowrap;background:rgba(0,0,0,.62)'

                    view.append($('<div class="card__vote" style="' + box + '"><span style="' + tag + '">IMDb</span><span>' + (r >= 10 ? '10' : r.toFixed(1)) + '</span></div>'))

                    D.put++
                }

                put()
            }
            catch(e){ D.err = 'cb:' + e.message }
        })
    }
}