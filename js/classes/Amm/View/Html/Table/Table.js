/* global Amm */

Amm.View.Html.Table.Table = function(options) {
    Amm.View.Html.DisplayParent.call(this, options);
};

Amm.View.Html.Table.Table.prototype = {

    'Amm.View.Html.Table.Table': '__CLASS__', 
    
    onlySection: false, // one of Amm.Table.Section.TYPE constants (HEADER, FOOTER, BODY)
    
    onlyFirstCells: false, // information provided for child rows' views
    
    adjustOnInit: false, // after observing the table, call 'adjustForScrollbarWidth'
    
    focusPriority: 0, // used by cell views to determine which one has to be focused
    
    _shouldShowItem: function(item) {
        if (this.onlySection) {
            if (!item['Amm.Table.Section'] || item.getType() !== this.onlySection) {
                return false;
            }
        }
        return Amm.View.Html.DisplayParent.prototype._shouldShowItem.call(this, item);
    },
    
    _tryObserve: function() {
        var res = Amm.View.Html.DisplayParent.prototype._tryObserve.call(this);
        if (res && this.adjustOnInit) {
            Amm.getRoot().defer(this.adjustForScrollbarWidth, this);
        }
        return res;
    },
    
    adjustForScrollbarWidth: function() {
        if (!this._htmlElement || !this._htmlElement.parentNode) return;
        var tmp1 = this._htmlElement.style.overflowY, tmp2 = this._htmlElement.style.overflow;
        var p = this._htmlElement.parentNode;
        p.style.overflowY = p.style.overflow = 'scroll';
        var scrollbarWidth = p.offsetWidth - p.clientWidth;
        p.style.overflowY = tmp1;
        p.style.overflow = tmp2;
        var cnt = jQuery(this._htmlElement).parents('.scrollableTableContainer');
        
        if (!scrollbarWidth) {
            
            cnt.find('.vFix').css('width', '100%');
            cnt.find('.hFix').css('height', '100%');
            
        } else {
            
            var exp = "calc(100% - " + scrollbarWidth + "px)";
            
            cnt.find('.vFix').css('width', exp);
            cnt.find('.hFix').css('height', exp);
            
            cnt.find('.scrollableTablePadding')
                .css('padding-right', '0')
                .css('padding-bottom', '0');
        
        }
    }

};

Amm.extend(Amm.View.Html.Table.Table, Amm.View.Html.DisplayParent);

