import Api from '../../core/api/api'
import Category from '../../interaction/items/category'
import CategoryModule from '../../interaction/items/category/module/module'
import Background from '../../interaction/background'
import Utils from '../../utils/utils'
import Router from '../../core/router'
import imdbbRows, {imdbbOn} from '../imdbb_rows'

function component(object){
    if(imdbbOn()) return imdbbRows(object, (page, ok, err)=>{ Api.list(Object.assign({}, object, {page: page}), ok, err) })

    let comp = Utils.createInstance(Category, object, {
        module: CategoryModule.toggle(CategoryModule.MASK.base, 'Pagination')
    })

    comp.use({
        onCreate: function(){
            Api.list(object, this.build.bind(this), this.empty.bind(this))
        },
        onNext: function(resolve, reject){
            Api.list(object, resolve.bind(this), reject.bind(this))
        },
        onInstance: function(item, data){
            item.use({
                onEnter: Router.call.bind(Router, 'full', data),
                onFocus: function(){
                    Background.change(Utils.cardImgBackground(data))
                }
            })
        }
    })

    return comp
}

export default component