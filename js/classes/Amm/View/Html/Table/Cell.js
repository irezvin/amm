/* global Amm */

Amm.View.Html.Table.Cell = function(options) {
    Amm.View.Html.Visual.call(this, options);
};


Amm.View.Html.Table.Cell.prototype = {

    'Amm.View.Html.Table.Cell': '__CLASS__',
    
    requiredElementClass: 'Amm.Table.Cell',
    
    delay: 0,
    
    setVId: function(id) {
        if (id) {
            jQuery(this._htmlElement).attr('data-col-id', id);
        } else {
            jQuery(this._htmlElement).removeAttr('data-col-id');
        }
    },

};

Amm.extend(Amm.View.Html.Table.Cell, Amm.View.Html.Visual);
