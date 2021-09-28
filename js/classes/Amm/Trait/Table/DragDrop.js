/* global Amm */

Amm.Trait.Table.DragDrop = function(options) {
};

Amm.Trait.Table.DragDrop.ACTION = {
    NONE: null,
    RESIZE_ROW: 'resizeRow',
    RESIZE_COLUMN: 'resizeColumn',
    DRAG_ROW: 'dragRow',
    DRAG_COLUMN: 'dragColumn',
    DRAG_SELECT: 'dragSelect'
};

Amm.Trait.Table.DragDrop._ACTION = Amm.Util.swapKeysValues(Amm.Trait.Table.DragDrop.ACTION);

Amm.Trait.Table.DragDrop.prototype = {

    'TableDragDrop': '__INTERFACE__',
    
    _dragAction: Amm.Trait.Table.DragDrop.ACTION.NONE,

    _dragObject: null,    

    _dragActionTarget: null,
    
    _rowsDraggable: true,

    _rowsResizable: true,

    _columnsDraggable: true,

    _columnsResizable: true,
    
    _selectByDrag: true,

    setSelectByDrag: function(selectByDrag) {
        selectByDrag = !!selectByDrag;
        var oldSelectByDrag = this._selectByDrag;
        if (oldSelectByDrag === selectByDrag) return;
        this._selectByDrag = selectByDrag;
        this.outSelectByDragChange(selectByDrag, oldSelectByDrag);
        return true;
    },

    getSelectByDrag: function() { return this._selectByDrag; },

    outSelectByDragChange: function(selectByDrag, oldSelectByDrag) {
        this._out('selectByDragChange', selectByDrag, oldSelectByDrag);
    },    

    setRowsDraggable: function(rowsDraggable) {
        rowsDraggable = !!rowsDraggable;
        var oldRowsDraggable = this._rowsDraggable;
        if (oldRowsDraggable === rowsDraggable) return;
        this._rowsDraggable = rowsDraggable;
        this.outRowsDraggableChange(rowsDraggable, oldRowsDraggable);
        return true;
    },

    getRowsDraggable: function() { return this._rowsDraggable; },

    outRowsDraggableChange: function(rowsDraggable, oldRowsDraggable) {
        this._out('rowsDraggableChange', rowsDraggable, oldRowsDraggable);
    },

    setRowsResizable: function(rowsResizable) {
        rowsResizable = !!rowsResizable;
        var oldRowsResizable = this._rowsResizable;
        if (oldRowsResizable === rowsResizable) return;
        this._rowsResizable = rowsResizable;
        this.outRowsResizableChange(rowsResizable, oldRowsResizable);
        return true;
    },

    getRowsResizable: function() { return this._rowsResizable; },

    outRowsResizableChange: function(rowsResizable, oldRowsResizable) {
        this._out('rowsResizableChange', rowsResizable, oldRowsResizable);
    },

    setColumnsDraggable: function(columnsDraggable) {
        columnsDraggable = !!columnsDraggable;
        var oldColumnsDraggable = this._columnsDraggable;
        if (oldColumnsDraggable === columnsDraggable) return;
        this._columnsDraggable = columnsDraggable;
        this.outColumnsDraggableChange(columnsDraggable, oldColumnsDraggable);
        return true;
    },

    getColumnsDraggable: function() { return this._columnsDraggable; },

    outColumnsDraggableChange: function(columnsDraggable, oldColumnsDraggable) {
        this._out('columnsDraggableChange', columnsDraggable, oldColumnsDraggable);
    },

    setColumnsResizable: function(columnsResizable) {
        var oldColumnsResizable = this._columnsResizable;
        if (oldColumnsResizable === columnsResizable) return;
        this._columnsResizable = columnsResizable;
        this.outColumnsResizableChange(columnsResizable, oldColumnsResizable);
        return true;
    },

    getColumnsResizable: function() { return this._columnsResizable; },

    outColumnsResizableChange: function(columnsResizable, oldColumnsResizable) {
        this._out('columnsResizableChange', columnsResizable, oldColumnsResizable);
    },    

    setDragAction: function(dragAction) {
        if (!dragAction) dragAction = Amm.Trait.Table.DragDrop.ACTION.NONE;
        if (!(dragAction in Amm.Trait.Table.DragDrop._ACTION)) {
            throw Error("`dragAction` must be one of Amm.Trait.Table.DragDrop.ACTION constants");
        }
        var oldDragAction = this._dragAction;
        if (oldDragAction === dragAction) return;
        this._dragAction = dragAction;
        this.outDragActionChange(dragAction, oldDragAction);
        return true;
    },

    getDragAction: function() { return this._dragAction; },

    outDragActionChange: function(dragAction, oldDragAction) {
        this._out('dragActionChange', dragAction, oldDragAction);
    },

    setDragObject: function(dragObject) {
        var oldDragObject = this._dragObject;
        if (oldDragObject === dragObject) return;
        this._dragObject = dragObject;
        this.outDragObjectChange(dragObject, oldDragObject);
        return true;
    },

    getDragObject: function() { return this._dragObject; },

    outDragObjectChange: function(dragObject, oldDragObject) {
        this._out('dragObjectChange', dragObject, oldDragObject);
    },

    setDragActionTarget: function(dragActionTarget) {
        var oldDragActionTarget = this._dragActionTarget;
        if (oldDragActionTarget === dragActionTarget) return;
        this._dragActionTarget = dragActionTarget;
        this.outDragActionTargetChange(dragActionTarget, oldDragActionTarget);
        return true;
    },

    getDragActionTarget: function() { return this._dragActionTarget; },

    outDragActionTargetChange: function(dragActionTarget, oldDragActionTarget) {
        this._out('dragActionTargetChange', dragActionTarget, oldDragActionTarget);
    },
    
    reorderRows: function(srcRows, destRow) {
        var retPreventDefault = {preventDefault: false};
        this.outReorderRows(srcRows, destRow, retPreventDefault);
        if (retPreventDefault.preventDefault) return;
        this._defaultReorderRows(srcRows, destRow);
    },
    
    _defaultReorderRows: function(srcRows, destRow) {
        if (srcRows.length !== 1) {
            // TODO: support dragging of multiple rows
            throw Error("Dragging of only one row is supported at the moment");
        }
        if (srcRows[0].section !== destRow.section) {
            throw Error("Reordering of rows from different section isn't supported");
        }
        var item1 = srcRows[0].getItem();
        var item2 = destRow.getItem();
        var moved = false;
        if (item1 && item2) {
            var idx1 = this.items.indexOf(item1);
            var idx2 = this.items.indexOf(item2);
            if (idx1 >= 0 && idx2 >= 0) {
                this.items.moveItem(idx1, idx2);
                moved = true;
            }
        }
        if (!moved) {
            srcRows[0].setDisplayOrder(destRow.getDisplayOrder());
        }
    },
    
    /**
     * @param {object} retPreventDefault with single key 'preventDefault'
     */
    outReorderRows: function(srcRows, destRow, retPreventDefault) {
        return this._out('reorderRows', srcRows, destRow, retPreventDefault);
    },
    
    reorderColumns: function(srcColumns, destColumn) {
        var retPreventDefault = {preventDefault: false};
        this.outReorderColumns(srcColumns, destColumn, retPreventDefault);
        if (retPreventDefault.preventDefault) return;
        this._defaultReorderColumns(srcColumns, destColumn);
    },
    
    _defaultReorderColumns: function(srcColumns, destColumn) {
        if (srcColumns.length !== 1) {
            throw Error("Dragging of only one column is supported at the moment");
        }
        srcColumns[0].setDisplayOrder(destColumn.getDisplayOrder());
    },
    
    /**
     * @param {object} retPreventDefault with single key 'preventDefault'
     */
    outReorderColumns: function(srcColumns, destColumn, retPreventDefault) {
        return this._out('reorderColumns', srcColumns, destColumn, retPreventDefault);
    },
    
    
};