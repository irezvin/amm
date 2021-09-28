/* global Amm */

// TODO: refactor by moving strategies for different drag actions into different classes

Amm.View.Html.Table.DragDrop = function(options) {
    this._requireInterfaces('TableDragDrop');
    Amm.View.Html.Drag.Source.call(this, options);
};


Amm.View.Html.Table.DragDrop.prototype = {

    'Amm.View.Html.Table.DragDrop': '__CLASS__',
    
    requiredElementClass: 'Amm.Table.Table',

    verticalResizeHandleSelector: '.resizeHandleVertical', // vertical handle responsable for width
    
    horizontalResizeHandleSelector: '.resizeHandleHorizontal', // horizontal handle responsable for height
    
    resizingClass: 'isResizing',
    
    draggingClass: 'isDragging',
    
    dragDestBeforeClass: 'dragDestBefore',
    
    dragDestAfterClass: 'dragDestAfter',
    
    colShadowClass: 'dragShadow colDragShadow',
    
    rowShadowClass: 'dragShadow rowDragShadow',
    
    disablePointerEvents: false,
    
    /**
     * @type {Amm.Drag.Session}
     */
    _sess: null,
    
    _shadow: null,
    
    _dragAction: null,
    
    _dragObject: null,
    
    _targetCell: null,
    
    _targetIsBefore: false,
    
    _isRow: false,
    
    _isColumn: false,
    
    _isDrag: false,
    
    _isResize: false,
    
    _resizeHandleDblClickHandler: null,
    
    _tryObserve: function() {
        var r = Amm.View.Html.Drag.Source.prototype._tryObserve.apply(this);
        if (!r) return r;
        if (!this._resizeHandleDblClickHandler) {
            var t = this;
            this._resizeHandleDblClickHandler = function() {
                t._resizeHandleDblClick.apply(t, Array.prototype.slice.call(arguments));
            };
            jQuery(this._htmlElement).delegate(
                this.horizontalResizeHandleSelector + ', ' + this.verticalResizeHandleSelector, 
                'dblclick', 
                this._resizeHandleDblClickHandler
            );
        }
    },
    
    _endObserve: function() {
        Amm.View.Html.Drag.Source.prototype._endObserve.apply(this);
        if (this._resizeHandleDblClickHandler) {
            jQuery(this._htmlElement).undelegate(
                this.horizontalResizeHandleSelector + ', ' + this.verticalResizeHandleSelector, 
                'dblclick', 
                this._resizeHandleDblClickHandler
            );
        }
    },
    
    _resizeHandleDblClick: function(event) {
        var t = this;
        var cell = Amm.findElement(event.target, function(e) {
            return e['Amm.Table.HeaderCell'] && e.table === t._element;
        });
        if (!cell) return;
        var t = jQuery(event.target), done;
        if (t.is(this.horizontalResizeHandleSelector) && cell.row) {
            cell.row.setSize(null);
            done = true;
        }
        if (t.is(this.verticalResizeHandleSelector) && cell.column.setSize) {
            cell.column.setSize(null);
            done = true;
        }
        if (done) {
            event.preventDefault();
            event.stopPropagation();
        }
    },
    
    getSuggestedTraits: function() {
        var res = Amm.View.Html.Drag.Source.prototype.getSuggestedTraits.apply(this) || [];
        res.push ([Amm.Trait.Table.DragDrop]);
        return res;
    },
    
    _handleElementDragStart: function() {
        
        var args = Array.prototype.slice.call(arguments);
        Amm.View.Html.Drag.Source.prototype._handleElementDragStart.apply(this, args);
        
        this._isRow = this._isColumn = this._isDrag = this._isResize = false;
        
        var s = this._element.getDragSession();
        // determine drag type
        var node = s.getStartNativeItem();
        var dragAction = Amm.Trait.Table.DragDrop.ACTION.NONE, dragObject;
        /*  
            we are interested in:
        
            resizeHandle of headerCell, 
            headerCell of active row/column,
            regular cell (will be implemented later)
        */
        var t = this;
        dragObject = Amm.findElement(node, function(elem) {
            return Amm.is(elem, 'Amm.Table.Cell')
                && elem.table === t._element;
        });
        if (!dragObject) {
            s.cancel();
            return;
        }
        if (Amm.is(dragObject, 'Amm.Table.HeaderCell')) {
            var _isRow = Amm.is(dragObject, 'Amm.Table.RowHeaderCell');
            var _isColumn = Amm.is(dragObject, ['Amm.Table.ColumnHeaderCell', 'Amm.Table.CornerCell']);
            if (jQuery(node).closest(this.horizontalResizeHandleSelector).length && _isRow) {
                this._isColumn = false; // it can be corner
                this._isRow = this._isResize = true;
                if (!dragObject.row.getIsResizable()) {
                    s.cancel();
                    return;
                }
                dragAction = Amm.Trait.Table.DragDrop.ACTION.RESIZE_ROW;
                if (this.resizingClass) dragObject.row.setClassName(true, this.resizingClass);
            } else if (jQuery(node).closest(this.verticalResizeHandleSelector).length && _isColumn) {
                this._isColumn = this._isResize = true;
                this._isRow = false;
                if (!dragObject.column.getIsResizable()) {
                    s.cancel();
                    return;
                }
                dragAction = Amm.Trait.Table.DragDrop.ACTION.RESIZE_COLUMN;
                if (this.resizingClass) dragObject.column.setCellClassName(true, this.resizingClass);
            }
            if (!dragAction && dragObject.getActive()) { // only active row/col head can be active
                if (_isRow && _isColumn) { // corner cell cannot be dragged
                    dragAction = false;
                    _isRow = false;
                    _isColumn = false;
                }
                if (_isRow) {
                    if (!dragObject.row.getIsDraggable()) {
                        s.cancel();
                        return;
                    }
                    this._isRow = this._isDrag = true;
                    dragAction = Amm.Trait.Table.DragDrop.ACTION.DRAG_ROW;
                    if (this.draggingClass) dragObject.setClassName(true, this.draggingClass);
                }
                if (_isColumn) {
                    if (!dragObject.column.getIsDraggable()) {
                        s.cancel();
                        return;
                    }
                    this._isColumn = this._isDrag = true;
                    dragAction = Amm.Trait.Table.DragDrop.ACTION.DRAG_COLUMN;
                    if (this.draggingClass) dragObject.column.setCellClassName(true, this.draggingClass);
                }
            }
        } else {            
            // it's select
            dragAction = Amm.Trait.Table.DragDrop.ACTION.DRAG_SELECT;
        }
        if (!dragAction) {
            s.cancel();
            return;
        };
        this._dragAction = dragAction;
        this._dragObject = dragObject;
        this._element.setDragAction(dragAction);
        this._element.setDragObject(dragObject);
        this._sess = s;
        if (dragAction === Amm.Trait.Table.DragDrop.ACTION.DRAG_COLUMN 
            || dragAction === Amm.Trait.Table.DragDrop.ACTION.DRAG_ROW) {
            this.getShadow();
        }
        else if (dragAction === Amm.Trait.Table.DragDrop.ACTION.RESIZE_COLUMN 
            || dragAction === Amm.Trait.Table.DragDrop.ACTION.RESIZE_ROW) {
            this._handleElementDragVectorChange(s.getVector());
        }

    },
    
    _handleElementDragNativeItemChange: function(dragNativeItem) {
        // TODO: handle cells selection
        if (!this._isDrag || (!this._isRow && !this._isColumn)) return;
        var relatedTarget = Amm.findElement(dragNativeItem, ['Amm.Table.HeaderCell']);   
        if (relatedTarget && relatedTarget.table !== this._element || relatedTarget === this._dragObject) {
            relatedTarget = null;
        }
        if (relatedTarget && this._isRow && relatedTarget.row.section !== this._dragObject.row.section) {
            // we cannot swap rows in same sections
            relatedTarget = null;
        }
        if (relatedTarget) {
            if (this._isRow && !relatedTarget.row.getIsDraggable()) {
                relatedTarget = null;
            } else if (this._isColumn && !relatedTarget.column.getIsDraggable()) {
                relatedTarget = null;
            }
        }
        
        this.setTargetCell(relatedTarget);
    },
    
    _handleElementDragVectorChange: function(vector) {
        if (!this._dragObject || !(this._isRow || this._isColumn)) return;
        var d = this._sess.getDelta() || vector;
        var diff = this._isColumn? d.dX : d.dY;
        if (this._isResize) {
            // update item size
            if (this._isRow) {
                this._dragObject.row.setSize(this._dragObject.row.getSize() + diff);
            }
            if (this._isColumn) {
                this._dragObject.column.setSize(this._dragObject.column.getSize() + diff);
            }
        } else { // update shadow position
            var shadow = this.getShadow();
            var pos = shadow.offset();
            if (this._isRow) pos.top += diff;
            else pos.left += diff;
            shadow.offset(pos);
        }
    },
    
    _handleElementDragEnd: function() {
        var args = Array.prototype.slice.call(arguments);
        Amm.View.Html.Drag.Source.prototype._handleElementDragEnd.apply(this, args);
        this.deleteShadow();
        var dragAction = this._dragAction;
        var dragObject = this._dragObject;
        try {
            if (dragAction === Amm.Trait.Table.DragDrop.ACTION.RESIZE_ROW) {
                if (this.resizingClass) {
                    dragObject.row.setClassName(false, this.resizingClass);
                }
            }
            else if (dragAction === Amm.Trait.Table.DragDrop.ACTION.RESIZE_COLUMN) {
                if (this.resizingClass) {
                    dragObject.column.setCellClassName(false, this.resizingClass);
                }
            } else if (dragAction === Amm.Trait.Table.DragDrop.ACTION.DRAG_ROW) {
                if (this._targetCell) {
                    var row1 = this._dragObject.row;
                    var row2 = this._targetCell.row;
                    this._element.reorderRows([row1], row2);
                }
                if (this.draggingClass) {
                    dragObject.setClassName(false, this.draggingClass);
                }
                if (this.targetCell) {

                }
            } else if (dragAction === Amm.Trait.Table.DragDrop.ACTION.DRAG_COLUMN) {
                if (this._targetCell) {
                    this._element.reorderColumns(
                        [this._dragObject.column],
                        this._targetCell.column
                    );
                }
                if (this.draggingClass) {
                    dragObject.column.setCellClassName(false, this.draggingClass);
                }
            }
        } finally {
            this.setTargetCell(null);
            this._dragAction = null;
            this._dragObject = null;
            this._element.setDragObject(null);
            this._element.setDragAction(null);
        }
    },
    
    getShadow: function() {
        if (this._shadow) return this._shadow;
        if (!this._isDrag || (!this._isRow && !this._isColumn)) return;
        var obj = this._element.getDragObject();
        if (!obj) return;
        var cntView = obj.findView(null, 'Amm.View.Html.Visual');
        if (!cntView) throw Error("Cannot determine container view for drag object");
        var node = cntView.getHtmlElement();
        if (!node) throw Error("Container view of drag object doesn't have HTML element");
        var jqNode = jQuery(node);
        this._shadow = jQuery('<div />');
        this._shadow.addClass(this._isRow? this.rowShadowClass : this.colShadowClass);
        jQuery(document.documentElement).append(this._shadow);
        this._shadow.offset(jqNode.offset());
        if (this._isRow) {
            this._shadow.width(jQuery(this._htmlElement).width());
            this._shadow.height(jqNode.height());
        } else {
            this._shadow.width(jqNode.width());
            this._shadow.height(jQuery(this._htmlElement).height());
        }
        return this._shadow;
    },
    
    setShadow: function(shadow) {
        if (shadow === this._shadow) return;
        this.deleteShadow();
        this._shadow = shadow? jQuery(shadow) : null;        
    },
    
    deleteShadow: function() {
        if (!this._shadow) return;
        this._shadow.remove();
        this._shadow = null;
    },
    
    setTargetCell: function(targetCell) {
        var oldTargetCell = this._targetCell;
        if (oldTargetCell === targetCell) return;
        // TODO: support selection-by-drag
        if (!this._isDrag || (!this._isRow && !this._isColumn)) return;
        if (oldTargetCell) {
            if (this._isRow) {
                if (this._targetIsBefore && this.dragDestBeforeClass) {
                    oldTargetCell.row.setClassName(false, this.dragDestBeforeClass);
                } else if (!this._targetIsBefore && this.dragDestAfterClass) {
                    oldTargetCell.row.setClassName(false, this.dragDestAfterClass);
                }
            } else if (this._isColumn) {
                if (this._targetIsBefore && this.dragDestBeforeClass) {
                    oldTargetCell.column.setCellClassName(false, this.dragDestBeforeClass);
                } else if (!this._targetIsBefore && this.dragDestAfterClass) {
                    oldTargetCell.column.setCellClassName(false, this.dragDestAfterClass);
                }
            }
        }
        this._targetCell = targetCell;
        if (targetCell) {
            this._sess.setCursor('grab');
            if (this._isRow) {
                this._targetIsBefore = this._targetCell.row.getDisplayOrder() < this._dragObject.row.getDisplayOrder();
                if (this._targetIsBefore && this.dragDestBeforeClass) {
                    targetCell.row.setClassName(true, this.dragDestBeforeClass);
                } else if (!this._targetIsBefore && this.dragDestAfterClass) {
                    targetCell.row.setClassName(true, this.dragDestAfterClass);
                }
            } else if (this._isColumn) {
                this._targetIsBefore = this._targetCell.column.getDisplayOrder() < this._dragObject.column.getDisplayOrder();
                if (this._targetIsBefore && this.dragDestBeforeClass) {
                    targetCell.column.setCellClassName(true, this.dragDestBeforeClass);
                } else if (!this._targetIsBefore && this.dragDestAfterClass) {
                    targetCell.column.setCellClassName(true, this.dragDestAfterClass);
                }
            }
            this._element.setDragActionTarget(targetCell);
        } else {
            this._element.setDragActionTarget(null);
            this._sess.setCursor('not-allowed');
        }
        // TODO: select cells when cell selection is active
        return true;
    },

    getTargetCell: function() { return this._targetCell; },

};

Amm.extend(Amm.View.Html.Table.DragDrop, Amm.View.Html.Drag.Source);
