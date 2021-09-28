/* global Amm */

Amm.Trait.Table.Dimensions = function() {
    this._observedSizeColumns = [];
    this._observedOffsetColumns = [];
    this._observedSizeRows = [];
    this._observedOffsetRows = [];
};

Amm.Trait.Table.Dimensions.prototype = {

    'TableDimensions': '__INTERFACE__',
    
    _observedSizeColumns: null,
    
    _observedOffsetColumns: null,
    
    _observedSizeRows: null,
    
    _observedOffsetRows: null,
    
    _posObserved: false,
    
    _sizeObserved: false,
    
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
    
};
