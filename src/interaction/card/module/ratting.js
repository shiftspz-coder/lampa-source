import Utils from '../../../utils/utils'
import Template from '../../template'
import IMDb from '../../../utils/imdb'

const rates = {}
let timer = null
let started = false

function kindOf(m){
    return m.media_type === 'tv' || (m.name && !m.title) || m.first_air_date ? 'tv' : 'movie'
}

function badge(r){
    let tag = 'background:#F5C518;color:#000;font-weight:700;font-size:.75em;padding:0 .35em;border-radius:.3em;margin-right:.4em'
    let box = 'width:auto;white-space:nowrap;background:rgba(0,0,0,.62)'

    return $('<div class="card__vote" style="' + box + '"><span style="' + tag + '">IMDb</span><span>' + (r >= 10 ? '10' : r.toFixed(1)) + '</span></div>')
}

function paint(){
    let list = document.querySelectorAll('.card')

    for(let i = 0; i < list.length; i++){
        let d = list[i].card_data || $(list[i]).data('card')

        if(!d) continue

        let r = rates[kindOf(d) + ':' + d.id]

        if(!r) continue

        let view = $(list[i]).find('.card__view')

        if(!view.length || view.find('.card__vote').length) continue

        view.append(badge(r))
    }
}

function schedule(){
    clearTimeout(timer)

    timer = setTimeout(paint, 150)
}

function start(){
    if(started) return

    started = true

    try{ new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true}) }
    catch(e){}

    setInterval(paint, 3000)
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

        let key = kindOf(this.data) + ':' + this.data.id

        IMDb.rating(this.data, function(r){
            r = parseFloat(r)

            if(!(r > 0)) return

            rates[key] = r

            start()
            schedule()
        })
    }
}