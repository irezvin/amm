/* global Amm */

Amm.View.Abstract.Paginator = function(options) {
    Amm.View.Abstract.call(this, options);
};

Amm.View.Abstract.Paginator.prototype = {

    'Amm.View.Abstract.Paginator': '__CLASS__', 

    _maxLinks: 5,
    
    _ensureSameNumberOfLinks: true,

    _showFirst: false,

    _showLast: false,
    
    _showFirstNum: true,

    _showLastNum: true,

    _showPrev: true,

    _showNext: true,
    
    _nextAlwaysActive: false,
    
    _useIcons: false,

    _numPages: 0,
    
    _page: 0,
    
    lblFirst: 'lang.Amm.Ui.Paginator.label.first',
    lblLast: 'lang.Amm.Ui.Paginator.label.last',
    lblPrev: 'lang.Amm.Ui.Paginator.label.prev',
    lblNext: 'lang.Amm.Ui.Paginator.label.next',
    lblEllipsis: 'lang.Amm.Ui.Paginator.label.ellipsis',
    lblRegular: 'lang.Amm.Ui.Paginator.label.regular',
    lblActive: 'lang.Amm.Ui.Paginator.label.active',
    
    iconFirst: 'lang.Amm.Ui.Paginator.icon.first',
    iconLast: 'lang.Amm.Ui.Paginator.icon.last',
    iconPrev: 'lang.Amm.Ui.Paginator.icon.prev',
    iconNext: 'lang.Amm.Ui.Paginator.icon.next',
    iconEllipsis: 'lang.Amm.Ui.Paginator.icon.ellipsis',
    iconRegular: 'lang.Amm.Ui.Paginator.icon.regular',
    iconActive: 'lang.Amm.Ui.Paginator.icon.active',
    
    setVPage: function(page) {
        this.setPage(page);
    },
    
    setVNumPages: function(numPages) {
        this.setNumPages(numPages);
    },

    update: function() {
        throw Error("Call to abstract method");
    },
    
    setPage: function(page) {
        var page = parseInt(page);
        if (isNaN(page) || page < 0) throw Error ("`page` must be a number not less than 0");
        var oldPage = this._page;
        if (oldPage === page) return;
        this._page = page;
        this.update();
        return true;
    },

    getPage: function() { return this._page; },

    setNumPages: function(numPages) {
        var numPages = parseInt(numPages);
        if (isNaN(numPages) || numPages < 0) throw Error ("`numPages` must be a number not less than 0");
        var oldNumPages = this._numPages;
        if (oldNumPages === numPages) return;
        this._numPages = numPages;
        this.update();
        return true;
    },

    getNumPages: function() { return this._numPages; },
    
    setMaxLinks: function(maxLinks) {
        var maxLinks = parseInt(maxLinks);
        if (isNaN(maxLinks) || maxLinks < 0) throw Error ("`maxLinks` must be a number not less than 0");
        var oldMaxLinks = this._maxLinks;
        if (oldMaxLinks === maxLinks) return;
        this._maxLinks = maxLinks;
        this.update();
        return true;
    },

    getMaxLinks: function() { return this._maxLinks; },
    
    setEnsureSameNumberOfLinks: function(ensureSameNumberOfLinks) {
        var oldEnsureSameNumberOfLinks = this._ensureSameNumberOfLinks;
        if (oldEnsureSameNumberOfLinks === ensureSameNumberOfLinks) return;
        this._ensureSameNumberOfLinks = ensureSameNumberOfLinks;
        this.update();
        return true;
    },

    getEnsureSameNumberOfLinks: function() { return this._ensureSameNumberOfLinks; },

    setShowFirst: function(showFirst) {
        showFirst = !!showFirst;
        var oldShowFirst = this._showFirst;
        if (oldShowFirst === showFirst) return;
        this._showFirst = showFirst;
        this.update();
        return true;
    },

    getShowFirst: function() { return this._showFirst; },

    setShowLast: function(showLast) {
        showLast = !!showLast;
        var oldShowLast = this._showLast;
        if (oldShowLast === showLast) return;
        this._showLast = showLast;
        this.update();
        return true;
    },

    getShowLast: function() { return this._showLast; },

    setShowFirstNum: function(showFirstNum) {
        showFirstNum = !!showFirstNum;
        var oldShowFirstNum = this._showFirstNum;
        if (oldShowFirstNum === showFirstNum) return;
        this._showFirstNum = showFirstNum;
        this.update();
        return true;
    },

    getShowFirstNum: function() { return this._showFirstNum; },

    setShowLastNum: function(showLastNum) {
        showLastNum = !!showLastNum;
        var oldShowLastNum = this._showLastNum;
        if (oldShowLastNum === showLastNum) return;
        this._showLastNum = showLastNum;
        this.update();
        return true;
    },

    getShowLastNum: function() { return this._showLastNum; },

    setShowPrev: function(showPrev) {
        showPrev = !!showPrev;
        var oldShowPrev = this._showPrev;
        if (oldShowPrev === showPrev) return;
        this._showPrev = showPrev;
        this.update();
        return true;
    },

    getShowPrev: function() { return this._showPrev; },

    setShowNext: function(showNext) {
        showNext = !!showNext;
        var oldShowNext = this._showNext;
        if (oldShowNext === showNext) return;
        this._showNext = showNext;
        this.update();
        return true;
    },

    getShowNext: function() { return this._showNext; },

    setUseIcons: function(useIcons) {
        useIcons = !!useIcons;
        var oldUseIcons = this._useIcons;
        if (oldUseIcons === useIcons) return;
        this._useIcons = useIcons;
        this.update();
        return true;
    },

    getUseIcons: function() { return this._useIcons; },
    
    setNextAlwaysActive: function(nextAlwaysActive) {
        nextAlwaysActive = !!nextAlwaysActive;
        var oldNextAlwaysActive = this._nextAlwaysActive;
        if (oldNextAlwaysActive === nextAlwaysActive) return;
        this._nextAlwaysActive = nextAlwaysActive;
        this.update();
        return true;
    },

    getNextAlwaysActive: function() { return this._nextAlwaysActive; },
    
    genLinks: function() {
        
        var extraLinks = {};
        var links = {};
        var maxLinks = this._maxLinks;
        if (this._showFirstNum && this._ensureSameNumberOfLinks) {
            maxLinks--;
        }
        if (this._showLastNum && this._ensureSameNumberOfLinks) {
            maxLinks--;
        }
        if (maxLinks <= 0) maxLinks = 1;
        var wndLeft = this._page - Math.floor(maxLinks/2);
        var wndRight = this._page + Math.ceil(maxLinks/2);
        if (wndLeft < 0) {
            wndLeft = 0;
            wndRight = Math.min(maxLinks, this._numPages - 1);
        } else if (wndRight > (this._numPages - 1)) {
            if (this._showLastNum) {
                wndRight = this._numPages - 1;
                wndLeft = Math.max(0, wndRight - maxLinks);
            } else {
                wndRight = this._numPages;
                wndLeft = Math.max(0, wndRight - maxLinks);
            }
        }
        
        if (this._showPrev) {
            links['prev'] = this.genLink(this._page - 1, 'prev', this._page <= 0);
        }
        
        if (this._showNext) {
            links['next'] = this.genLink(this._page + 1, 'next', !this._nextAlwaysActive && this._page >= this._numPages - 1);
        }
        
        if (this._showFirst) {
            extraLinks['first'] = this.genLink(0, 'first');
        }
        
        if (this._showLast) {
            extraLinks['last'] = this.genLink(this._numPages - 1, 'last');
        }
        
        if (wndLeft === 1 && this._showFirstNum) wndLeft = 0;
        
        if (wndRight === this._numPages - 2 && this._showLastNum) {
            wndRight = this._numPages - 1;
        }
        
        if (this._ensureSameNumberOfLinks) {
            if (this._showFirstNum && wndLeft < 2) {
                wndLeft = 0;
                wndRight = Math.min(maxLinks + 2, this._numPages);
            }
            if (this._showLastNum && wndRight > this._numPages - 2) {
                wndRight = this._numPages;
                wndLeft = Math.max(0, wndRight - maxLinks - 2);
            }
        }

        if (!this._numPages) wndRight = 1;
        for (var i = wndLeft; i < wndRight; i++) {
            links[i] = this.genLink(i);
        }
        
        if (this._showFirstNum) {
            if (wndLeft > 2) {
                extraLinks[wndLeft - 1] = this.genLink(wndLeft - 1, 'ellipsis');
            } else if (wndLeft === 2) {
                extraLinks[wndLeft - 1] = this.genLink(wndLeft - 1);
            }
        }
        
        if (this._showFirstNum) extraLinks[0] = this.genLink(0);
        
        if (this._showLastNum && this._numPages) {
            extraLinks[this._numPages - 1] = this.genLink(this._numPages - 1);

            if (wndRight < this._numPages - 2) {
                extraLinks[wndRight + 1] = this.genLink(wndRight + 1, 'ellipsis');
            } else if (wndRight === this._numPages - 2) {
                extraLinks[wndRight + 1] = this.genLink(wndRight + 1);
            }
        }
        
        for (var i in extraLinks) if (extraLinks.hasOwnProperty(i) && !(i in links)) {
            links[i] = extraLinks[i];
        }
        
        // sort by page numbers

        if (links.first) links.first.sort = -2;
        if (links.prev) links.prev.sort = -1;
        if (links.next) links.next.sort = this._numPages + 1;
        if (links.last) links.last.sort = this._numPages + 2;
        var res = Amm.values(links);
        res.sort(function(a, b) {
            return a.sort - b.sort;
        });
        return res;
        
    },
    
    genLink: function(pageNo, kind, disabled) {
        if (pageNo < 0) pageNo = 0;
        return {page: pageNo, kind: kind || null, disabled: disabled, 
            sort: pageNo};
    },

};

Amm.extend(Amm.View.Abstract.Paginator, Amm.View.Abstract);

Amm.defineLangStrings ({
    'lang.Amm.Ui.Paginator.label.first': 'First',
    'lang.Amm.Ui.Paginator.label.last': 'Last',
    'lang.Amm.Ui.Paginator.label.prev': 'Previous',
    'lang.Amm.Ui.Paginator.label.next': 'Next',
    'lang.Amm.Ui.Paginator.label.ellipsis': '&hellip;',
    'lang.Amm.Ui.Paginator.label.regular': '{page}',
    'lang.Amm.Ui.Paginator.label.active': '{page}',
    
    'lang.Amm.Ui.Paginator.icon.first': '&laquo;',
    'lang.Amm.Ui.Paginator.icon.last': '&raquo;',
    'lang.Amm.Ui.Paginator.icon.prev': '&larr;',
    'lang.Amm.Ui.Paginator.icon.next': '&rarr;',
    'lang.Amm.Ui.Paginator.icon.ellipsis': '&hellip;',
    'lang.Amm.Ui.Paginator.icon.regular': '{page}',
    'lang.Amm.Ui.Paginator.icon.active': '{page}',
});