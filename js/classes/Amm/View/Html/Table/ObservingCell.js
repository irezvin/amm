/* global Amm */

Amm.View.Html.Table.ObservingCell = function(options) {
    Amm.View.Html.Table.Cell.call(this, options);
};


Amm.View.Html.Table.ObservingCell.prototype = {

    'Amm.View.Html.Table.ObservingCell': '__CLASS__',

    setVDecoratedValue: function(decoratedValue) {
        if (decoratedValue && decoratedValue instanceof Object && (decoratedValue.jquery || 'nodeType' in decoratedValue && 'parentNode' in decoratedValue)) {
            jQuery(this._htmlElement.firstChild.firstChild).empty().append(decoratedValue);
        } else {
            this._htmlElement.firstChild.firstChild.innerHTML = decoratedValue;
        }
    },

    setVValueVisible: function(visible) {
        this._htmlElement.firstChild.firstChild.style.display = visible?
            '' : 'none';
    },
    
};

Amm.extend(Amm.View.Html.Table.ObservingCell, Amm.View.Html.Table.Cell);
