/* global Amm */

Amm.View.Html.Table.Row = function(options) {
    Amm.View.Html.DisplayParent.call(this, options);
};

Amm.View.Html.Table.Row.prototype = {

    'Amm.View.Html.Table.Row': '__CLASS__', 
    
    onlyFirstCells: null, // if set to number, row will show only ## of first cells

    _tryObserve: function() {
        
        var res = Amm.View.Html.DisplayParent.prototype._tryObserve.call(this);
        if (!res) return res;
    
        if (this.parentView && this.parentView.parentView && this.parentView.parentView['Amm.View.Html.Table.Table']) {
            this.onlyFirstCells = this.parentView.parentView.onlyFirstCells;
        }
            
        return res;
        
    },
    
    _shouldShowItem: function(item) {
        if (!this.onlyFirstCells) return true;
        else return item.getDisplayOrder() < this.onlyFirstCells;
    }

};

Amm.extend(Amm.View.Html.Table.Row, Amm.View.Html.DisplayParent);

