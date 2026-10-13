import Api from '../../core/api/api'
import Category from '../../interaction/items/category'
import CategoryModule from '../../interaction/items/category/module/module'
import Background from '../../interaction/background'
import Utils from '../../utils/utils'
import Router from '../../core/router'
import IMDb from '../../utils/imdb'
import imdbbRows, {imdbbOn} from '../imdbb_rows'

const MIN_KEEP = 8
const MAX_PAGES = 3

function imdbLister(object){
    let mn = parseFloat(object.imdb_min) || 0
    let mx = parseFloat(object.imdb_max) || 10

    if(!(mn > 0 || mx < 10)) return null

    let starts = {1: 1}

    return function(page, ok, err){
        let kept = []
        let tries = 0
        let last = null

        let finish = function(end){
            starts[page + 1] = end + 1

            if(!kept.length) return err && err()

            ok(Object.assign({}, last, {results: kept, page: page}))
        }

        let step = function(cur){
            Api.list(Object.assign({}, object, {page: cur}), function(data){
                last = data

                let list = (data && data.results) || []
                let total = (data && data.total_pages) || 1
                let left = list.length
                let flags = []

                let after = function(){
                    list.forEach(function(m, i){ if(flags[i]) kept.push(m) })

                    tries++

                    if(kept.length >= MIN_KEEP || tries >= MAX_PAGES || cur >= total) finish(cur)
                    else step(cur + 1)
                }

                if(!left) return after()

                list.forEach(function(m, i){
                    IMDb.rating(m, function(r){
                        flags[i] = r > 0 && r >= mn && r <= mx

                        left--

                        if(left === 0) after()
                    })
                })
            }, function(){
                if(kept.length) finish(cur - 1)
                else if(err) err()
            })
        }

        step(starts[page] || page)
    }
}

function component(object){
    let lister = imdbLister(object)

    if(imdbbOn()) return imdbbRows(object, lister || ((page, ok, err)=>{ Api.list(Object.assign({}, object, {page: page}), ok, err) }))

    let comp = Utils.createInstance(Category, object, {
        module: CategoryModule.toggle(CategoryModule.MASK.base, 'Pagination')
    })

    comp.use({
        onCreate: function(){
            if(lister) lister(object.page || 1, this.build.bind(this), this.empty.bind(this))
            else Api.list(object, this.build.bind(this), this.empty.bind(this))
        },
        onNext: function(resolve, reject){
            if(lister) lister(object.page || 1, resolve.bind(this), reject.bind(this))
            else Api.list(object, resolve.bind(this), reject.bind(this))
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
