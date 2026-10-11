window.imdbbInf = function(){
    try{ let v = window.Lampa.Storage.get('imdbb_infinite', 'true'); return !(v === false || v === 'false') }
    catch(e){ return true }
}

export default {
    onScroll: function(){
        let d = this.data

        if(!window.imdbbInf() || this.imdbb_wait || !d || !d.url || !d.source || !(d.total_pages > 1)) return

        let page = d.page || 1

        if(page >= d.total_pages || page >= 500) return

        let near = false

        if(this.tv) near = this.active >= d.results.length - 8
        else{
            let last = this.items[this.items.length - 1]
            let el = last && last.render(true)
            let r = el && el.getBoundingClientRect && el.getBoundingClientRect()

            near = !!(r && r.width > 0 && r.left < window.innerWidth * 1.4)
        }

        if(!near) return

        this.imdbb_wait = true

        window.Lampa.Api.list({url: d.url, page: page + 1, source: d.source}, (res)=>{
            this.imdbb_wait = false

            if(this.destroyed || !res || !res.results) return

            d.page = page + 1

            let ids = {}

            d.results.forEach((x)=>{ ids[x.id] = 1 })
            res.results.forEach((x)=>{ if(!ids[x.id]) d.results.push(x) })

            this.emit('scroll')
        }, ()=>{ this.imdbb_wait = false })
    }
}
