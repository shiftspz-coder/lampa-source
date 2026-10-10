import Utils from '../../../utils/utils'
import Template from '../../template'
import IMDb from '../../../utils/imdb'

function kindOf(m){
    return m.media_type === 'tv' || (m.name && !m.title) || m.first_air_date ? 'tv' : 'movie'
}

function findViews(self, id, kind){
    let res = []
    let h = self.html

    if(h && h.length){
        let v = h.find('.card__view')

        if(v.length) res.push(v)
    }

    let list = document.querySelectorAll('.card')

    for(let i = 0; i < list.length; i++){
        let d = list[i].card_data || $(list[i]).data('card')

        if(d && d.id === id && kindOf(d) === kind){
            let v = $(list[i]).find('.card__view')

            if(v.length && !(h && h.length && v[0] === h.find('.card__view')[0])) res.push(v)
        }
    }

    return res
}

export default {
    onCreate: function(){
        if(this.data.cub_hundred_fire){
            let vote = parseFloat((this.data.cub_hundred_rating || this.data.vote_average || 0) + '').toFixed(1)

            if(vote > 0){
                this.html.find('.card__view').append(Template.elem('div', {class: 'card__vote', text: Utils.bigNumberToShort(this.data.cub_hundred_fire)}))
            }

            return
        }

        let self = this
        let id = this.data.id
        let kind = kindOf(this.data)

        IMDb.rating(this.data, function(r){
            r = parseFloat(r)

            if(!(r > 0)) return

            let tries = 0

            let put = function(){
                let views = findViews(self, id, kind)

                if(!views.length){
                    if(++tries < 20) setTimeout(put, 250)

                    return
                }

                let tag = 'background:#F5C518;color:#000;font-weight:700;font-size:.75em;padding:0 .35em;border-radius:.3em;margin-right:.4em'
                let box = 'width:auto;white-space:nowrap;background:rgba(0,0,0,.62)'

                views.forEach(function(view){
                    if(view.find('.card__vote').length) return

                    view.append($('<div class="card__vote" style="' + box + '"><span style="' + tag + '">IMDb</span><span>' + (r >= 10 ? '10' : r.toFixed(1)) + '</span></div>'))
                })
            }

            put()
        })
    }
}