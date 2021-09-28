/* global Amm */

Amm.Table.RowHeaderColumn = function(options) {
    Amm.Table.ObservingColumn.call(this, options);
};

Amm.Table.RowHeaderColumn.prototype = {

    'Amm.Table.RowHeaderColumn': '__CLASS__',
    
    _draggable: false,
    
    configureCellProto: function(ret, row) {
        Amm.Table.ObservingColumn.prototype.configureCellProto.call(this, ret, row);
        if (Amm.is(row, 'Amm.Table.HeaderRow')) {
            ret.proto.class = 'Amm.Table.CornerCell';
        } else {
            ret.proto.class = 'Amm.Table.RowHeaderCell';
        }
    }

};

Amm.extend(Amm.Table.RowHeaderColumn, Amm.Table.ObservingColumn);

