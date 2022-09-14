/* global Amm */

Amm.View.Html.Table.ObservingCell = function(options) {
    Amm.View.Html.Table.Cell.call(this, options);
};


Amm.View.Html.Table.ObservingCell.prototype = {

    'Amm.View.Html.Table.ObservingCell': '__CLASS__',

    setVDecoratedValue: function(decoratedValue) {
        if (decoratedValue && decoratedValue instanceof Object && (decoratedValue.jquery || 'nodeType' in decoratedValue && 'parentNode' in decoratedValue)) {
            if (jQuery(decoratedValue).parents().has(document.documentElement))
                decoratedValue = jQuery(decoratedValue).clone(true);
            jQuery(this._htmlElement.firstChild.firstChild).empty().append(decoratedValue);
        } else {
            this._htmlElement.firstChild.firstChild.innerHTML = decoratedValue;
        }
    },

    setVValueVisible: function(visible) {
        // Ugly multi-view editor hack pt. 2 - don't hide content in non-focused view of currently editing cell
        // See also: Amm.View.Html.Table.CellContent._shouldShowItem
        
        if (!visible) {
            var activeEditor = this._element.getActiveEditor();
            if (activeEditor && this._element.getUniqueSubscribers('Amm.View.Html.DisplayParent').length >= 2) {
                var hasFocus, focusedNode = Amm.View.Html.getFocusedNode();
                if (focusedNode) {
                    hasFocus = jQuery(this._htmlElement).has(focusedNode).length || jQuery(focusedNode).has(this._htmlElement).length;
                }
                if (!hasFocus) {
                    // cancel hiding of the value when editor not in this cell
                    return;
                }
            }
        }
        jQuery(this._htmlElement)[visible? 'removeClass' : 'addClass']('valueHidden');
    },
    
};

Amm.extend(Amm.View.Html.Table.ObservingCell, Amm.View.Html.Table.Cell);
