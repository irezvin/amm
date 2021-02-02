/* global Amm */

Amm.Table.HeaderRow = function(options) {
    Amm.Table.RowOfCells.call(this, options);
};

Amm.Table.HeaderRow.prototype = {

    'Amm.Table.HeaderRow': '__CLASS__', 
    
    _cellClass: 'Amm.Table.HeaderCell',
    
    _columnsConfigureCells: false,

};

Amm.extend(Amm.Table.HeaderRow, Amm.Table.RowOfCells);

