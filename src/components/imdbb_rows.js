import Main from '../interaction/items/main'
import LineModule from '../interaction/items/line/module/module'
import Background from '../interaction/background'
import Router from '../core/router'
import Utils from '../utils/utils'
import EmptyRouter from '../interaction/empty/module/router'

export function imdbbOn(){
    try{
        return document.body.classList.contains('imdbb-compact') && localStorage.getItem('imdbb_wide') !== 'false'
    }
    catch(e){ return false }
}

export default function(object, fetch, empty){
    let comp = Utils.createInstance(Main, object, {empty: empty || {}})

    comp.use(EmptyRouter, 0)

    let deco = (list)=>{
        return (list || []).map((it)=>{
            let c = Object.assign({}, it)
            c.params = Object.assign({}, it.params, {
                emit: {
                    onEnter: Router.call.bind(Router, 'full', c),
                    onFocus: ()=>{
                        Background.change(Utils.cardImgBackground(c))
                    }
                }
            })
            return c
        })
    }

    comp.use({
        onCreate: function(){
            fetch(1, (data)=>{
                let res = deco(data && data.results)

                if(!res.length) return comp.empty()

                setTimeout(()=>{
                    comp.build([{
                        title: object.title || '',
                        results: res,
                        page: (data && data.page) || 1,
                        total_pages: (data && data.total_pages) || 1,
                        imdbb_rows: 'imdbb-bmrows',
                        imdbb_next: function(page, ok, fail){
                            fetch(page, (d)=>{ ok(deco(d && d.results)) }, fail)
                        },
                        params: {
                            module: LineModule.toggle(LineModule.MASK.base, 'Event')
                        }
                    }])
                }, 10)
            }, ()=>{ comp.empty() })
        }
    })

    return comp
}
