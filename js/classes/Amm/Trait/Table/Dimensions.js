/* global Amm */

Amm.Trait.Table.Dimensions = function() {
    this._observedSizeColumns = [];
    this._observedOffsetColumns = [];
    this._observedSizeRows = [];
    this._observedOffsetRows = [];
    this._rowsToAdjust = [];
    this._columnsToAdjust = [];
};

Amm.Trait.Table.Dimensions.prototype = {

    'TableDimensions': '__INTERFACE__',
    
    _observedSizeColumns: null,
    
    _observedOffsetColumns: null,
    
    _observedSizeRows: null,
    
    _observedOffsetRows: null,
    
    _posObserved: false,
    
    _sizeObserved: false,
    
    _rowsToAdjust: null,
    
    _columnsToAdjust: null,
    
    _adjustSubscribed: false,
    
    _checkObservePos() {
        var l = this._observedOffsetRows.length + this._observedOffsetColumns.length;
        if (l && !this._posObserved) {
            this._posObserved = true;
            Amm.getRoot().subscribe('interval', this._updatePos, this);
        } else if (l === 0 && this._posObserved) {
            this._posObserved = false;
            Amm.getRoot().unsubscribe('interval', this._updatePos, this);
        }
    },
    
    _checkObserveSize() {
        var l = this._observedSizeRows.length + this._observedSizeColumns.length;
        if (l && !this._sizeObserved) {
            this._sizeObserved = true;
            Amm.getRoot().subscribe('interval', this._updateSize, this);
        } else if (l === 0 && this._sizeObserved) {
            this._sizeObserved = false;
            Amm.getRoot().unsubscribe('interval', this._updateSize, this);
        }
    },
    
    _updatePos: function() {
        if (this._observedOffsetColumns.length) this.reportColumnOffsets(this._observedOffsetColumns);
        if (this._observedOffsetRows.length) this.reportRowOffsets(this._observedOffsetRows);
    },
    
    _updateSize: function() {
        if (this._observedSizeColumns.length) this.reportColumnSizes(this._observedSizeColumns);
        if (this._observedSizeRows.length) this.reportRowSizes(this._observedSizeRows);
    },
    
    _cleanup_traitTableDimensions: function() {
        this._observedSizeColumns = [];
        this._observedOffsetColumns = [];
        this._observedSizeRows = [];
        this._observedOffsetRows = [];
        this._checkObservePos();
        this._checkObserveSize();
    },
    
    getColumnSize: function(column) {
        var ret = [];
        this.outGetColumnSizes([column], ret);
        return ret[0];
    },
    
    setColumnSize: function(column, size) {
        this.outSetColumnSize(column, size);
        if (size === null) this._shouldAdjustColumn(column);
    },
    
    outGetColumnSizes: function(columns, ret) {
        if (!(ret instanceof Array)) ret = [];
        return this._out('getColumnSizes', columns, ret);
    },
    
    outSetColumnSize: function(column, size) {
        return this._out('setColumnSize', column, size);
    },
    
    getColumnOffset: function(column) {
        var ret = [];
        this.outGetColumnOffsets([column], ret);
        return ret[0];
    },
    
    outGetColumnOffsets: function(columns, ret) {
        if (!(ret instanceof Array)) ret = [];
        return this._out('getColumnOffsets', columns, ret);
    },
    
    reportColumnSizes: function(columns) {
        if (!(columns instanceof Array)) columns = [columns];
        var sizes = [];
        this.outGetColumnSizes(columns, sizes);
        for (var i = 0, l = columns.length; i < l; i++) {
            if (sizes[i] !== undefined) columns[i].reportSize(sizes[i]); 
        }
    },
    
    observeColumnSize: function(column) {
        var idx = Amm.Array.indexOf(column, this._observedSizeColumns);
        if (idx >= 0) return;
        this._observedSizeColumns.push(column);
        this._checkObserveSize();
    },
    
    unobserveColumnSize: function(column) {
        var idx = Amm.Array.indexOf(column, this._observedSizeColumns);
        if (idx < 0) return;
        this._observedSizeColumns.splice(idx, 1);
        this._checkObserveSize();
    },
    
    reportColumnOffsets: function(columns) {
        if (!(columns instanceof Array)) columns = [columns];
        var offsets = [];
        this.outGetColumnOffsets(columns, offsets);
        for (var i = 0, l = columns.length; i < l; i++) {
            if (offsets[i] !== undefined) columns[i].reportOffset(offsets[i]); 
        }
    },
    
    observeColumnOffset: function(column) {
        var idx = Amm.Array.indexOf(column, this._observedOffsetColumns);
        if (idx >= 0) return;
        this._observedOffsetColumns.push(column);
        this._checkObservePos();
    },
    
    unobserveColumnOffset: function(column) {
        var idx = Amm.Array.indexOf(column, this._observedOffsetColumns);
        if (idx < 0) return;
        this._observedOffsetColumns.splice(idx, 1);
        if (!this._observedOffsetColumns.length) {
            Amm.getRoot().unsubscribe('interval', this._updateColumnOffsets, this);
        }
    },
    
    getRowSize: function(row) {
        var ret = [];
        this.outGetRowSizes([row], ret);
        return ret[0];
    },
    
    setRowSize: function(row, size) {
        this.outSetRowSize(row, size);
        if (size === null) this._shouldAdjustRow(row);
    },
    
    outGetRowSizes: function(rows, ret) {
        if (!(ret instanceof Array)) ret = [];
        return this._out('getRowSizes', rows, ret);
    },
    
    outSetRowSize: function(row, size) {
        return this._out('setRowSize', row, size);
    },
    
    getRowOffset: function(row) {
        var ret = [];
        this.outGetRowOffsets([row], ret);
        return ret[0];
    },
    
    outGetRowOffsets: function(rows, ret) {
        if (!(ret instanceof Array)) ret = [];
        return this._out('getRowOffsets', rows, ret);
    },
    
    reportRowSizes: function(rows) {
        if (!(rows instanceof Array)) rows = [rows];
        var sizes = [];
        this.outGetRowSizes(rows, sizes);
        for (var i = 0, l = rows.length; i < l; i++) {
            if (sizes[i] !== undefined) rows[i].reportSize(sizes[i]); 
        }
    },
    
    observeRowSize: function(row) {
        var idx = Amm.Array.indexOf(row, this._observedSizeRows);
        if (idx >= 0) return;
        this._observedSizeRows.push(row);
        this._checkObserveSize();
    },
    
    unobserveRowSize: function(row) {
        var idx = Amm.Array.indexOf(row, this._observedSizeRows);
        if (idx < 0) return;
        this._observedSizeRows.splice(idx, 1);
        this._checkObserveSize();
    },
    
    reportRowOffsets: function(rows) {
        if (!(rows instanceof Array)) rows = [rows];
        var offsets = [];
        this.outGetRowOffsets(rows, offsets);
        for (var i = 0, l = rows.length; i < l; i++) {
            if (offsets[i] !== undefined) rows[i].reportOffset(offsets[i]); 
        }
    },
    
    observeRowOffset: function(row) {
        var idx = Amm.Array.indexOf(row, this._observedOffsetRows);
        if (idx >= 0) return;
        this._observedOffsetRows.push(row);
        this._checkObservePos();
    },
    
    unobserveRowOffset: function(row) {
        var idx = Amm.Array.indexOf(row, this._observedOffsetRows);
        if (idx < 0) return;
        this._observedOffsetRows.splice(idx, 1);
        this._checkObservePos();
    },
    
    adjustColumns: function(columns) {
        if (!columns) columns = this.columns.getItems();
        else if (columns['Amm.Table.Column']) columns = [columns];
        this.outResetAutoColumns(columns);
        var sizes = [];
        this.outGetColumnSizes(columns, sizes);
        this.outAdjustColumns(columns, sizes);
    },
    
    outResetAutoColumns: function(columns) {
        return this._out('resetAutoColumns', columns);
    },
    
    outAdjustColumns: function(columns, sizes) {
        return this._out('adjustColumns', columns, sizes);
    },
    
    adjustRows: function(rows) {
        if (!rows) rows = this.getAllRows();
        else if (rows['Amm.Table.Row']) rows = [rows];
        this.outResetAutoRows(rows);
        var sizes = [];
        this.outGetRowSizes(rows, sizes);
        this.outAdjustRows(rows, sizes);
    },
    
    outResetAutoRows: function(rows) {
        return this._out('resetAutoRows', rows);
    },
    
    outAdjustRows: function(rows, sizes) {
        this._out('adjustRows', rows, sizes);
    },
    
    _hasMultipleViewsChange_TableDimensions: function(hasMultipleViews) {
        var action = hasMultipleViews? 'subscribe' : 'unsubscribe';
        this[action]('cellValueChange', this._tableDimensionsCellChange, this);
        //this[action]('cellClassNameChange', this._tableDimensionsCellChange, this);
        
        this[action]('rowVisibleChange', this._tableDimensionsRowColChange, this);
        this[action]('rowEnabledChange', this._tableDimensionsRowColChange, this);
        //this[action]('rowClassNameChange', this._tableDimensionsRowColChange, this);
        
        this[action]('columnVisibleChange', this._tableDimensionsRowColChange, this);
        this[action]('columnEnabledChange', this._tableDimensionsRowColChange, this);
        
        this[action]('enabledColumnsChange', this._subscribeAdjustAll, this);
        this[action]('sectionRowsChange', this._subscribeAdjustAll, this);
        
        Amm.getRoot()[hasMultipleViews? 'defer' : 'cancelDeferred'](
            this._adjustRegisteredRowColumns,
            this,
            true
        );
    },
    
    _tableDimensionsCellChange: function(cell) {
        var row = cell.row, column = cell.column;
        if (!cell.row) {
            console.log('wtf', cell);
            return;
        }
        if (!row.getVisible() || !column.getVisible()) return;
        if (!row.getEnabled() || !column.getEnabled()) return;
        if (row.getAutoSize()) this._shouldAdjustRow(row);
        if (column.getAutoSize()) this._shouldAdjustColumn(column);
    },
    
    _tableDimensionsRowColChange: function(rowOrColumn) {
        if (rowOrColumn['Amm.Table.Column']
            && Amm.event.name === 'columnVisibleChange' 
        ) { // column visibility changes often cause multi-view tables contents to get out of sync
            this._subscribeAdjustAll();
            return;
        }
        if (!rowOrColumn.getVisible() || rowOrColumn.getEnabled()) return;
        if (!rowOrColumn.getAutoSize()) return;
        if (rowOrColumn['Amm.Table.Row']) this._shouldAdjustRow(rowOrColumn);
        else this._shouldAdjustColumn(rowOrColumn);
    },
    
    _shouldAdjustRow: function(row) {
        if (row._shouldAdjust) return;
        row._shouldAdjust = true;
        this._rowsToAdjust.push(row);
        if (!this._adjustSubscribed) this._subscribeAdjust();
    },
    
    _shouldAdjustColumn: function(column) {
        if (column._shouldAdjust) return;
        column._shouldAdjust = true;
        this._columnsToAdjust.push(column);
        if (!this._adjustSubscribed) this._subscribeAdjust();
    },
    
    _subscribeAdjustAll: function() {
        if (this._adjustSubscribed === 'all') return;
        if (this._adjustSubscribed === true) {
            Amm.getRoot().cancelDeferred(this._adjustRegisteredRowColumns, this);
        }
        this._adjustSubscribed = 'all';
        Amm.getRoot().defer(this._adjustRegisteredRowColumns, this, true);
    },
    
    _subscribeAdjust: function() {
        if (this._adjustSubscribed) return;
        this._adjustSubscribed = true;
        Amm.getRoot().defer(this._adjustRegisteredRowColumns, this);
    },
    
    _adjustRegisteredRowColumns: function(all) {
        var i, l;
        
        // we always adjust first columns, then rows, because column sizes 
        // affect row heights due to wrapping
        
        if (all) {
            var rows = this.getAllRows(), columns = this.columns;
            this._rowsToAdjust = [];
            this._columnsToAdjust = [];
            for (i = 0, l = columns.length; i < l; i++) {
                if (columns[i].getAutoSize() && columns[i].getVisible() && columns[i].getEnabled()) {
                    this._columnsToAdjust.push(columns[i]);
                }
            }
            for (i = 0, l = rows.length; i < l; i++) {
                if (rows[i].getAutoSize() && rows[i].getVisible() && rows[i].getEnabled()) {
                    this._rowsToAdjust.push(rows[i]);
                }
            }
        }
        
        if (!this._rowsToAdjust.length && !this._columnsToAdjust.length) {
            console.log('nothing to adjust?!');
            return;
        }
        
        var r = this._rowsToAdjust;
        var c = this._columnsToAdjust;

        this._rowsToAdjust = [];
        this._columnsToAdjust = [];

        //console.log('adjusting', r.length, 'rows', c.length, 'columns');
        
        try {
            for (i = 0, l = c.length; i < l; i++) {
                c[i]._shouldAdjust = false;
            }
            if (l) this.adjustColumns(c);
            for (i = 0, l = r.length; i < l; i++) {
                r[i]._shouldAdjust = false;
            }
            if (l) this.adjustRows(r);
        } finally {
            this._adjustSubscribed = false;
        }
    },
    
    fixColumnSizes: function() {
        var c = this.columns.getItems();
        for (var i = 0, l = c.length; i < l; i++) {
            this.setColumnSize(c[i], this.getColumnSize(c[i]));
        }
    },
    
    fixRowSizes: function() {
        var r = this.getAllRows();
        for (var i = 0, l = r.length; i < l; i++) {
            this.setRowSize(r[i], this.getRowSize(r[i]));
        }
    },
    
};
