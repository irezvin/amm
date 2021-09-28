/* global Amm */

/**
 * Corner cell is row header cell contained in table header, it is resizable both vertically and horizontally
 */
Amm.Table.CornerCell = function(options) {
    Amm.Table.RowHeaderCell.call(this, options);
};

Amm.Table.CornerCell.prototype = {

    'Amm.Table.CornerCell': '__CLASS__', 

    _hasVerticalHandle: true,
    
    _calcClassName: function(get, ofun, np) {
        var res = Amm.Table.ColumnHeaderCell.prototype._calcClassName.call(this, get);
        res = Amm.Util.trim(res + ' ' + Amm.Table.RowHeaderCell.prototype._calcClassName.call(this, get, true));
        return res;
    },

};

Amm.extend(Amm.Table.CornerCell, Amm.Table.RowHeaderCell);
Amm.extend(Amm.Table.CornerCell, Amm.Table.ColumnHeaderCell);

