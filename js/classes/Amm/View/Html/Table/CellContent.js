/* global Amm */

Amm.View.Html.Table.CellContent = function(options) {
    Amm.View.Html.DisplayParent.call(this, options);
};

Amm.View.Html.Table.CellContent.prototype = {

    'Amm.View.Html.Table.CellContent': '__CLASS__', 
    
    _shouldShowItem: function(item) {
        // Ugly hack pt. 1 - show content only in focused views
        // See also: Amm.View.Html.Table.ObservingCell._setVValueVisible
        if (item === this._element.getActiveEditor()) {
            var hasFocus, focusedNode = Amm.View.Html.getFocusedNode();
            if (focusedNode) {
                hasFocus = jQuery(this._htmlElement).has(focusedNode).length || jQuery(focusedNode).has(this._htmlElement).length;
            }
            if (hasFocus) return true;
            if (this._element.getUniqueSubscribers('Amm.View.Html.DisplayParent').length < 2) {
                return true;
            }
            return false;
        }
        return Amm.View.Html.DisplayParent.prototype._shouldShowItem.call(this, item);
    }

};

Amm.extend(Amm.View.Html.Table.CellContent, Amm.View.Html.DisplayParent);

