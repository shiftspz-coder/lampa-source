import Template from '../../template'
import TMDB from '../../../core/api/sources/tmdb'
import Lang from '../../../core/lang'
import Utils from '../../../utils/utils'
import Modal from '../../modal'
import Controller from '../../../core/controller'
import Noty from '../../noty'
import Storage from '../../../core/storage/storage'
import Account from '../../../core/account/account'
import Manifest from '../../../core/manifest'
import Arrays from '../../../utils/arrays'

export default {
    onCreate: function(){
        this.html = Template.js('person_start',{
            name: this.data.name,
            birthday: this.data.birthday ? Utils.parseTime(this.data.birthday).full : Lang.translate('player_unknown'),
            place: this.data.place_of_birth || Lang.translate('player_unknown')
        })

        this.prefix = Template.prefix(this.html, 'person-start')

        try{
            if(document.body.classList.contains('imdbb-compact') && localStorage.getItem('imdbb_wide') !== 'false'){
                let el = (this.html && this.html[0] && this.html.find) ? this.html[0] : this.html
                el.classList.add('imdbb-pst')
                let bt = el.querySelector('.person-start__bottom'), parts = [], ru = Storage.get('language','ru') === 'ru'
                if(this.data.birthday) parts.push(Utils.parseTime(this.data.birthday).full)
                if(ru && this.data.birthday){
                    let b = new Date(this.data.birthday), e = this.data.deathday ? new Date(this.data.deathday) : new Date()
                    if(!isNaN(b) && !isNaN(e)){
                        let n = e.getUTCFullYear() - b.getUTCFullYear()
                        if(e.getUTCMonth() < b.getUTCMonth() || (e.getUTCMonth() === b.getUTCMonth() && e.getUTCDate() < b.getUTCDate())) n--
                        if(n > 0 && n < 130){
                            let m10 = n % 10, m100 = n % 100
                            parts.push(n + ' ' + (m10 === 1 && m100 !== 11 ? 'год' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? 'года' : 'лет'))
                        }
                    }
                }
                if(ru){
                    let pr = {Acting: this.data.gender === 1 ? 'Актриса' : 'Актёр', Directing: 'Режиссёр', Writing: 'Сценарист', Production: 'Продюсер'}[this.data.known_for_department]
                    if(pr) parts.push(pr)
                }
                if(bt && bt.parentNode){
                    if(parts.length){
                        let mt = document.createElement('div')
                        mt.className = 'imdbb-pmeta'
                        parts.forEach((t)=>{ let sp = document.createElement('span'); sp.textContent = t; mt.appendChild(sp) })
                        bt.parentNode.insertBefore(mt, bt)
                    }
                    let bio = (this.data.biography || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim()
                    if(bio){
                        let ds = document.createElement('div')
                        ds.className = 'imdbb-pdescr'
                        ds.textContent = bio
                        bt.parentNode.insertBefore(ds, bt)
                    }
                }
            }
        }
        catch(e){}

        this.subscribed = Storage.get('person_subscribes_id','[]').find(a=>a == this.data.id)

        Utils.imgLoad(this.prefix.img, this.data.profile_path ? TMDB.img(this.data.profile_path, 'w500') : this.data.img || 'img/img_broken.svg', (img)=>{
            img.addClass('loaded')
        })

        if(window.lampa_settings.account_use) this.emit('subscribe', this.subscribed)

        this.html.find('.button--info').on('hover:enter',()=>{
            if(this.data.biography){
                Modal.open({
                    title: this.data.name,
                    size: 'large',
                    html: $('<div class="about">'+this.data.biography.replace(/\n/g, '<br>')+'</div>'),
                    onBack: ()=>{
                        Modal.close()

                        Controller.toggle('content')
                    }
                })
            }
            else{
                Noty.show(Lang.translate('empty_title_two'))
            }
        }).on('hover:focus hover:enter hover:hover',(e)=>{
            this.last = e.target
        })

        if(window.lampa_settings.account_use){
            this.html.find('.button--subscribe').on('hover:enter',()=>{
                if(!Account.Permit.access) return Account.Modal.account()
                
                let subscribes = Storage.get('person_subscribes_id','[]')

                this.subscribed = subscribes.find(a=>a == this.data.id)

                if(!this.subscribed && !Account.hasPremium()) return Account.Modal.premium()

                let person = Arrays.clone(this.data)

                // Пихают там всякие иконки и прочее, удаляем лишнее
                delete person.biography

                Lampa.Network.silent(Utils.protocol() + Manifest.cub_domain + '/api/person/' + (this.subscribed ? 'unsubscribe' : 'subscribe'), ()=>{
                    if(this.subscribed) Arrays.remove(subscribes, this.data.id)
                    else if(subscribes.indexOf(this.data.id) == -1) subscribes.push(this.data.id)

                    Storage.set('person_subscribes_id', subscribes)

                    this.subscribed = subscribes.find(a=>a == this.data.id)

                    this.emit('subscribe', this.subscribed)
                },(err)=>{
                    if(err.responseJSON && err.responseJSON.code == 555) Account.Modal.premium()
                    else Noty.show(Lang.translate('subscribe_error'))
                },{
                    person: JSON.stringify(person)
                },{
                    headers: {
                        token: Account.Permit.token
                    }
                })
            }).on('hover:focus hover:enter hover:hover',(e)=>{
                this.last = e.target
            })
        }
        else this.html.find('.button--subscribe').remove()
    },

    onSubscribe: function(subscribed){
        this.html.find('.button--subscribe svg path:nth-of-type(2)').setAttribute('fill', subscribed ? 'currentColor' : 'transparent')
        this.html.find('.button--subscribe span').text(Lang.translate(subscribed ? 'title_unsubscribe' : 'title_subscribe'))
    }
}