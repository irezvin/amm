/* global Amm */

Amm.View.Html.Table.Scrollable = function(options) {
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this, options);
};

Amm.View.Html.Table.SCROLL_TYPE = {
    MAIN: 'MAIN',
    HORIZONTAL: 'HORIZONTAL',
    VERTICAL: 'VERTICAL',
};

Amm.View.Html.Table.Scrollable.prototype = {

    'Amm.View.Html.Table.Scrollable': '__CLASS__', 
    
    scrollCellIntoViewOnActivate: false,
    
    scrollType: Amm.View.Html.Table.SCROLL_TYPE.MAIN,
    
    verticalScrollCushion: 10,
    
    horizontalScrollCushion: 10,
    
    _onScrollHandler: false,
    
    _tryObserve: function() {
        var r = Amm.View.Abstract.prototype._tryObserve.call(this);
        if (!r) return r;
        if (!this._onScrollHandler) this._onScrollHandler = this._onScroll.bind(this);
        this._htmlElement.addEventListener('scroll', this._onScrollHandler);
        return r;
    },
    
    _releaseResources: function() {
        Amm.View.Html.prototype._releaseResources.call(this);
        if (!this._htmlElement) return;
        this._htmlElement.removeEventListener('scroll', this._onScrollHandler);
    },
    
    _scrollMAIN: function(event) {
        var 
            left = this._htmlElement.scrollLeft, 
            top = this._htmlElement.scrollTop,
            parent = this._htmlElement.parentNode,
            hFixInner = parent.querySelector('.hFixInner'),
            vFixInner = parent.querySelector('.vFixInner');
        if (hFixInner) {
            hFixInner.style.top = -top + "px";
            vFixInner.style.left = -left + "px";
        }
    },
    
    _scrollHORIZONTAL: function(event) {
        var left = this._htmlElement.scrollLeft;
        if (!left) return;
        var parent = this._htmlElement.parentNode,
            main = parent.querySelector('.scrollableTableInner');
        this._htmlElement.scrollLeft = 0;
        main.scrollLeft = left;
    },
    
    _scrollVERTICAL: function(event) {
        var top = this._htmlElement.scrollTop;
        if (!top) return;
        var parent = this._htmlElement.parentNode,
            main = parent.querySelector('.scrollableTableInner');
        this._htmlElement.scrollTop = 0;
        main.scrollTop = top;
    },
    
    _onScroll: function(event) {
        var fn = '_scroll' + this.scrollType;
        if (typeof this[fn] !== 'function') {
            throw new Error("Unknown scroll type: '" + this.scrollType + "'");
        }
        this[fn](event);
    },
    
    _handleElementActiveCellChange: function(activeCell, oldActiveCell) {
        if (!(activeCell && this.scrollCellIntoViewOnActivate)) {
            return;
        }
        // find the view that belongs to our table
        var views = activeCell.getUniqueSubscribers('Amm.View.Html.Table.Cell');
        for (var i = 0; i < views.length; i++) {
            var element = views[i].getHtmlElement();
            if (jQuery(element).parents().has(this._htmlElement)) {
                this._scrollCellIntoView(views[i]);
                break;
            }
        }
    },
    
    _scrollCellIntoView: function(cellView) {
        var cellElement = cellView.getHtmlElement();
        var scrollElement = this._htmlElement;
        var parent = scrollElement.parentNode;
        var topMarginContainer = parent.querySelector('.vFixTop'),
            topMargin = topMarginContainer ? topMarginContainer.offsetHeight : 0;
        var leftMarginContainer = parent.querySelector('.hFixLeft'),
            leftMargin = leftMarginContainer ? leftMarginContainer.offsetWidth : 0;
        var targetScrollLeft = this._calcScroll(
            cellElement.offsetLeft, 
            cellElement.offsetWidth,
            scrollElement.clientWidth,
            scrollElement.scrollLeft,
            scrollElement.scrollWidth,
            leftMargin,
            0,
            this.horizontalScrollCushion
        );
        var targetScrollTop = this._calcScroll(
            cellElement.offsetTop, 
            cellElement.offsetHeight,
            scrollElement.clientHeight,
            scrollElement.scrollTop,
            scrollElement.scrollHeight,
            topMargin,
            0,
            this.verticalScrollCushion
        );

        // TODO: smooth scroll?
        scrollElement.scrollLeft = targetScrollLeft;
        scrollElement.scrollTop = targetScrollTop;
    },
    
    _calcScroll: function(targetStart, targetSize, windowSize, scrollPos, scrollMax, startMargin, endMargin, scrollCushion) {
        var
            effectiveWindowSize = windowSize - startMargin - endMargin,
            effectiveScrollPos = scrollPos + startMargin,
            effectiveNewPos = effectiveScrollPos;
    
        if (
            targetStart + targetSize < effectiveScrollPos 
            || targetStart + targetSize > effectiveScrollPos + effectiveWindowSize
        ) { // end margin of the target is not shown
            effectiveNewPos = targetStart - targetSize - scrollCushion;
        }
        
        if (
            targetStart < effectiveNewPos 
            || targetStart > effectiveNewPos + effectiveWindowSize
        ) { // start margin of the target is not shown
            effectiveNewPos = targetStart - scrollCushion;
        }
        var newPos = effectiveNewPos - startMargin;
        return newPos;
    },
    
};

Amm.extend(Amm.View.Html.Table.Scrollable, Amm.View.Html);
Amm.extend(Amm.View.Html.Table.Scrollable, Amm.View.Abstract);

