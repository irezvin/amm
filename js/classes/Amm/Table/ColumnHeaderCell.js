/* global Amm */

Amm.Table.ColumnHeaderCell = function(options) {
    Amm.Table.HeaderCell.call(this, options);
};

Amm.Table.ColumnHeaderCell.prototype = {

    'Amm.Table.ColumnHeaderCell': '__CLASS__', 

    _hasVerticalHandle: true,

    _columnDraggableClassName: 'draggableColumn',

    _columnResizableClassName: 'resizableColumn',
    
    _doOnColumnChange: function(column, oldColumn) {
        Amm.Table.HeaderCell.prototype._doOnColumnChange.call(this, column, oldColumn);
        Amm.subUnsub(column, oldColumn, this, ['captionChange', 'idChange'], '_handleColumnCaptionChange');
        if (column) this._handleColumnCaptionChange(column.getCaption(), null);
    },
    
    _handleColumnCaptionChange: function(caption, oldCaption) {
        var cap = caption;
        if (!cap && this._column) cap = this._column.getId();
        this.setValue(cap);
    },
    
    _calcClassName: function(get, ofun, np) {
        var res = '';
        if (!np) res = Amm.Table.HeaderCell.prototype._calcClassName.call(this, get);
        if (get.prop('column').prop('isResizable').val()) {
            res = Amm.Util.trim(res + ' ' + (get.prop('columnResizableClassName').val() || ''));
        }
        if (get.prop('column').prop('isDraggable').val()) {
            res = Amm.Util.trim(res + ' ' + (get.prop('columnDraggableClassName').val() || ''));
        }
        return res;
    },

    setColumnDraggableClassName: function(columnDraggableClassName) {
        var oldColumnDraggableClassName = this._columnDraggableClassName;
        if (oldColumnDraggableClassName === columnDraggableClassName) return;
        this._columnDraggableClassName = columnDraggableClassName;
        this.outColumnDraggableClassNameChange(columnDraggableClassName, oldColumnDraggableClassName);
        return true;
    },

    getColumnDraggableClassName: function() { return this._columnDraggableClassName; },

    outColumnDraggableClassNameChange: function(columnDraggableClassName, oldColumnDraggableClassName) {
        this._out('columnDraggableClassNameChange', columnDraggableClassName, oldColumnDraggableClassName);
    },

    setColumnResizableClassName: function(columnResizableClassName) {
        var oldColumnResizableClassName = this._columnResizableClassName;
        if (oldColumnResizableClassName === columnResizableClassName) return;
        this._columnResizableClassName = columnResizableClassName;
        this.outColumnResizableClassNameChange(columnResizableClassName, oldColumnResizableClassName);
        return true;
    },

    getColumnResizableClassName: function() { return this._columnResizableClassName; },

    outColumnResizableClassNameChange: function(columnResizableClassName, oldColumnResizableClassName) {
        this._out('columnResizableClassNameChange', columnResizableClassName, oldColumnResizableClassName);
    },
    
};

Amm.extend(Amm.Table.ColumnHeaderCell, Amm.Table.HeaderCell);

