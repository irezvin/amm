/* global Amm */

Amm.View.Html.Paginator = function(options) {
    Amm.View.Html.JQueryListener.call(this);
    Amm.View.Abstract.Paginator.call(this, options);
};

Amm.View.Html.Paginator.prototype = {

    'Amm.View.Html.Paginator': '__CLASS__', 

    _eventName: 'click',
    
    _delegateSelector: 'a[data-page]',
    
    allowPastRange: false,
    
    className: 'pagination',
    
    classNameMany: 'pagination-many',
    
    classNameOne: 'pagination-one',
    
    classNameEmpty: 'pagination-empty',
    
    linkLiClassName: 'page-item',
    
    linkClassName: 'page-link page-link-kind-',
    
    linkClassNameDisabled: 'page-link-disabled',
    
    update: function() {
        if (!this._htmlElement) return;
        jQuery(this._htmlElement).empty().append(this._dom());
    },
    
    _receiveEvent: function(event) {
        if (!event.target.getAttribute('data-page')) return;
        var page = parseInt(event.target.getAttribute('data-page'));
        if (isNaN(page)) return;
        if (page < 0) return;
        if (!this._nextAlwaysActive && page >= this._numPages) {
            return;
        }
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
        var className = this.className;
        if (!this._numPages) {
            if (this.classNameEmpty) className += ' ' + this.classNameEmpty;
        } else if (this._numPages === 1) {
            if (this.classNameOne) className += ' ' + this.classNameOne;
        } else {
            if (this.classNameMany) className += ' ' + this.classNameMany;
        }
        return Amm.dom({
            $: 'ul',
            'class': className,
            $$: lis
        });
    },
    
    _linkDom: function(link) {
        var html;
        var kind = link.kind || (link.page === this._page? "active" : "regular");
        html = this[(this._useIcons? 'icon' : 'lbl') + Amm.ucFirst(kind)];
        html = Amm.translate(html, '{page}', link.page + 1);
        var def = {
            $: 'a',
            'href': '#',
            'data-page': link.page,
            'class': this.linkClassName + kind,
            _html: html
        };
        if (link.disabled) {
            def['class'] += ' ' + this.linkClassNameDisabled;
        }
        return Amm.dom(def);
    },

};

Amm.extend(Amm.View.Html.Paginator, Amm.View.Html.JQueryListener);
Amm.extend(Amm.View.Html.Paginator, Amm.View.Abstract.Paginator);