/* global Amm */

Amm.View.Html.Table.ObservingCell = function(options) {
    Amm.View.Html.Table.Cell.call(this, options);
};


Amm.View.Html.Table.ObservingCell.prototype = {

    'Amm.View.Html.Table.ObservingCell': '__CLASS__',

    setVValue: function(value) {
        this._htmlElement.firstChild.firstChild.innerHTML = value;
    },

    setVValueVisible: function(visible) {
        this._htmlElement.firstChild.firstChild.style.display = visible?
            '' : 'none';
    },
    
};

Amm.extend(Amm.View.Html.Table.ObservingCell, Amm.View.Html.Table.Cell);
