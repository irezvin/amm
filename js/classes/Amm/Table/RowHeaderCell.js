/* global Amm */

Amm.Table.RowHeaderCell = function(options) {
    Amm.Table.Cell.call(this, options);
};

Amm.Table.RowHeaderCell.prototype = {

    'Amm.Table.RowHeaderCell': '__CLASS__',

    _hasHorizontalHandle: true,
    
    _rowDraggableClassName: 'draggableRow',

    _rowResizableClassName: 'resizableRow',
    
    _sourceDefaultToColumnId: false,
    
    _doOnColumnChange: function(column, oldColumn) {
        return Amm.Table.ObservingCell.prototype._doOnColumnChange.call(this, column, oldColumn);
    },
    
    _setComponent_rowHeaderCell: function(row, oldRow) {
        Amm.subUnsub(row, oldRow, this, ['indexChange'], '_handleRowIndexChange');
        if (row) this._handleRowIndexChange(row.getIndex(), null);
    },
    
    _handleRowIndexChange: function(index, oldIndex) {
        if (this._source) return;
        var cap = index !== null? index + 1 : '';
        this.setValue(cap);
    },
    
    _calcClassName: function(get, ofun, np) {
        var res = '';
        if (!np) res = Amm.Table.HeaderCell.prototype._calcClassName.call(this, get);
        if (get.prop('row').prop('isResizable').val()) {
            res = Amm.Util.trim(res + ' ' + (get.prop('rowResizableClassName').val() || ''));
        }
        if (get.prop('row').prop('isDraggable').val()) {
            res = Amm.Util.trim(res + ' ' + (get.prop('rowDraggableClassName').val() || ''));
        }
        return res;
    },

    setRowDraggableClassName: function(rowDraggableClassName) {
        var oldRowDraggableClassName = this._rowDraggableClassName;
        if (oldRowDraggableClassName === rowDraggableClassName) return;
        this._rowDraggableClassName = rowDraggableClassName;
        this.outRowDraggableClassNameChange(rowDraggableClassName, oldRowDraggableClassName);
        return true;
    },

    getRowDraggableClassName: function() { return this._rowDraggableClassName; },

    outRowDraggableClassNameChange: function(rowDraggableClassName, oldRowDraggableClassName) {
        this._out('rowDraggableClassNameChange', rowDraggableClassName, oldRowDraggableClassName);
    },

    setRowResizableClassName: function(rowResizableClassName) {
        var oldRowResizableClassName = this._rowResizableClassName;
        if (oldRowResizableClassName === rowResizableClassName) return;
        this._rowResizableClassName = rowResizableClassName;
        this.outRowResizableClassNameChange(rowResizableClassName, oldRowResizableClassName);
        return true;
    },

    getRowResizableClassName: function() { return this._rowResizableClassName; },

    outRowResizableClassNameChange: function(rowResizableClassName, oldRowResizableClassName) {
        this._out('rowResizableClassNameChange', rowResizableClassName, oldRowResizableClassName);
    }, 
    
};

Amm.extend(Amm.Table.RowHeaderCell, Amm.Table.HeaderCell);
Amm.extend(Amm.Table.RowHeaderCell, Amm.Table.ObservingCell);

