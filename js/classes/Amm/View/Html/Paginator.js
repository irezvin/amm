/* global Amm */

Amm.View.Html.Paginator = function(options) {
    var t = this;
    this._handler = function(event) { return t._receiveEvent(event, this); };    
    Amm.View.Abstract.Paginator.call(this, options);
    Amm.View.Html.call(this);
    Amm.JQueryListener.call(this, {});
};

Amm.View.Html.Paginator.prototype = {

    'Amm.View.Html.Paginator': '__CLASS__', 

    _eventName: 'click',
    
    _delegateSelector: 'a[data-page]',
    
    className: 'pagination',
    
    linkClassName: 'page-link page-link-kind-',
    
    linkLiClassName: 'page-item',
    
    update: function() {
        if (!this._htmlElement) return;
        jQuery(this._htmlElement).empty().append(this._dom());
    },
    
    _doSetHtmlElement: function(htmlElement) {
        this.setSelector(htmlElement);
    },
    
    _receiveEvent: function(event) {
        if (!event.target.getAttribute('data-page')) return;
        this._element.setPage(event.target.getAttribute('data-page'));
        event.preventDefault();
        event.stopPropagation();
    },
    
    _dom: function() {
        var links = this.genLinks();
        var linksDom = [];
        for (var i = 0, l = links.length; i < l; i++) {
            linksDom.push(this._linkDom(links[i]));
        }
        return this._outerDom(linksDom);
    },
    
    _outerDom: function(linksDom) {
        var lis = [];
        for (var i = 0, l = linksDom.length; i < l; i++) {
            lis.push(Amm.dom({
                $: 'li',
                'class': this.linkLiClassName,
                $$: linksDom[i],
            }));
        }
        return Amm.dom({
            $: 'ul',
            'class': this.className,
            $$: lis
        });
    },
    
    _linkDom: function(link) {
        var html;
        var kind = link.kind || (link.page === this._page? "active" : "regular");
        html = this[(this._useIcons? 'icon' : 'lbl') + Amm.ucFirst(kind)];
        html = Amm.translate(html, '{page}', link.page + 1);
        var className = this.linkClassName + kind;
        if (link.disabled) className += " disabled";
        return Amm.dom({
            $: 'a',
            'href': '#',
            'data-page': link.page,
            'class': className,
            _html: html
        });
    },

};

Amm.extend(Amm.View.Html.Paginator, Amm.View.Html);
Amm.extend(Amm.View.Html.Paginator, Amm.View.Abstract.Paginator);
Amm.extend(Amm.View.Html.Paginator, Amm.JQueryListener);