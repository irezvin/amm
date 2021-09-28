/* global Amm */

Amm.Table.HeaderRow = function(options) {
    Amm.Table.RowOfCells.call(this, options);
};

Amm.Table.HeaderRow.prototype = {

    'Amm.Table.HeaderRow': '__CLASS__', 
    
    _cellClass: 'Amm.Table.HeaderCell',
    
    _columnsConfigureCells: true,
    
    _draggable: false,
    
    cellProtoCallback: function(ret, column) {
        ret.proto.class = 'Amm.Table.ColumnHeaderCell';
        Amm.Table.RowOfCells.prototype.cellProtoCallback.call(this, ret, column);
    },

};

Amm.extend(Amm.Table.HeaderRow, Amm.Table.RowOfCells);

