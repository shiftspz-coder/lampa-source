import Favorites from '../core/favorite'
import Lang from '../core/lang'
import Arrays from '../utils/arrays'
import Utils from '../utils/utils'
import Register from '../interaction/register/register'
import RegisterModule from '../interaction/register/module/module'
import Main from '../interaction/items/main'
import LineModule from '../interaction/items/line/module/module'
import Background from '../interaction/background'
import Router from '../core/router'
import CardModule from '../interaction/card/module/module'
import Account from '../core/account/account'
import EmptyRouter from '../interaction/empty/module/router'
import ContentRows from '../core/content_rows'

/**
 * Компонент "Избранное"
 * @param {*} object 
 * @returns 
 */

function component(object){
    let all      = Favorites.all()
    let comp     = Utils.createInstance(Main, object, {
        empty: {
            router: 'bookmarks'
        }
    })

    comp.use(EmptyRouter, 0)

    comp.use({
        onCreate: function(){
            let category = ['look', 'scheduled', 'book', 'like', 'wath', 'viewed', 'continued','thrown']
            let lines    = []
            let folders  = ['book','like','wath', 'viewed','scheduled','thrown']
            let media    = ['movies','tv']
            let premium  = Account.hasPremium()
            let sync     = Account.Permit.sync

            let order = ['book','like','wath','look','scheduled','viewed','continued','thrown']

            order.forEach(a=>{
                if(!all[a] || !all[a].length) return

                media.forEach(m=>{
                    let part = all[a].filter(c=> m === 'tv' ? !!c.name : !c.name)

                    if(!part.length) return

                    let items = Arrays.clone(part)

                    items.forEach(item=>{
                        item.params = {
                            emit: {
                                onEnter: Router.call.bind(Router, 'full', item),
                                onFocus: ()=>{
                                    Background.change(Utils.cardImgBackground(item))
                                }
                            }
                        }
                    })

                    lines.push({
                        title: Lang.translate('title_' + a) + ' - ' + Lang.translate('menu_' + m),
                        results: items,
                        type: a,
                        total_pages: 1,
                        imdbb_rows: 'imdbb-bmrows',
                        params: {
                            module: LineModule.toggle(LineModule.MASK.base, 'Event')
                        }
                    })
                })
            })

            ContentRows.call('bookmarks', {}, lines)

            if(lines.length){
                comp.build(lines)
            }
            else comp.empty()
        }
    })

    return comp
}

export default component