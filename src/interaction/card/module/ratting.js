import Utils from '../../../utils/utils'
import Template from '../../template'
import IMDb from '../../../utils/imdb'

export default {
    onCreate: function(){
        if(this.data.cub_hundred_fire){
            let vote = parseFloat((this.data.cub_hundred_rating || this.data.vote_average || 0) + '').toFixed(1)

            if(vote > 0){
                this.html.find('.card__view').append(Template.elem('div', {class: 'card__vote', text: Utils.bigNumberToShort(this.data.cub_hundred_fire)}))
            }

            return
        }

        let html = this.html

        IMDb.rating(this.data, function(r){
            let view = html.find('.card__view')

            if(!r || !view.length || view.find('.card__vote').length) return

            let tag = 'background:#F5C518;color:#000;font-weight:700;font-size:.75em;padding:0 .35em;border-radius:.3em;margin-right:.4em'
            let box = 'width:auto;white-space:nowrap;background:rgba(0,0,0,.62)'

            view.append($('<div class="card__vote" style="' + box + '"><span style="' + tag + '">IMDb</span><span>' + (r >= 10 ? 10 : r.toFixed(1)) + '</span></div>'))
        })
    }
}
