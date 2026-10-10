import Utils from '../../../utils/utils'
import Template from '../../template'
import IMDb from '../../../utils/imdb'

function findView(self, id){
    let h = self.html

    if(h && h.length){
        let v = h.find('.card__view')

        if(v.length) return v
    }

    let list = document.querySelectorAll('.card')

    for(let i = 0; i < list.length; i++){
        let d = list[i].card_data || $(list[i]).data('card')

        if(d && d.id === id){
            let v = $(list[i]).find('.card__view')

            if(v.length) return v
        }
    }

    return null
}

export default {
    onCreate: function(){
        let D = window.__imdbdbg = window.__imdbdbg || {c: 0, cb: 0, put: 0, fb: 0, last: '', err: '', s: ''}

        D.c++

        if(!D.s){
            let h = this.html

            D.s = h ? (h.length + '|' + (h[0] ? h[0].className : '-') + '|view:' + h.find('.card__view').length) : 'html none'
        }

        if(this.data.cub_hundred_fire){
            let vote = parseFloat((this.data.cub_hundred_rating || this.data.vote_average || 0) + '').toFixed(1)

            if(vote > 0){
                this.html.find('.card__view').append(Template.elem('div', {class: 'card__vote', text: Utils.bigNumberToShort(this.data.cub_hundred_fire)}))
            }

            return
        }

        let self = this
        let id = this.data.id

        IMDb.rating(this.data, function(r){
            try{
                D.cb++
                D.last = (typeof r) + ':' + r

                r = parseFloat(r)

                if(!(r > 0)) return

                let tries = 0

                let put = function(){
                    let h = self.html
                    let direct = h && h.length && h.find('.card__view').length
                    let view = findView(self, id)

                    if(!view){
                        if(++tries < 20) return setTimeout(put, 250)

                        D.err = 'no view'

                        return
                    }

                    if(!direct) D.fb++

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