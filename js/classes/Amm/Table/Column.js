/* global Amm */

Amm.Table.Column = function(options) {
    if (!options) options = {};
    else options = Amm.override({}, options);
    var editor = options.editor;
    delete options.editor;
    Amm.Element.call(this, options);
    if (editor) this.setEditor(editor);
};

Amm.Table.Column.prototype = {

    'Amm.Table.Column': '__CLASS__',

    _enabled: true,

    _caption: null,

    _displayOrder: null,

    _cellClassName: null,

    _cellProto: null,

    _tableActiveProp: 'activeColumn',
    
    _size: null,

    _autoSize: true,
    
    _offset: null,
    
    _lockSetSize: 0,
    
    _resizable: null,

    _draggable: null,
    
    _decorator: null,

    _getDefaultTraits: function(options) {
        return [Amm.Trait.Visual];
    },
    
    setCaption: function(caption) {
        var oldCaption = this._caption;
        if (oldCaption === caption) return;
        this._caption = caption;
        this.outCaptionChange(caption, oldCaption);
        return true;
    },

    getCaption: function() { return this._caption; },

    outCaptionChange: function(caption, oldCaption) {
        this._out('captionChange', caption, oldCaption);
    },

    setDisplayOrder: function(displayOrder) {
        var oldDisplayOrder = this._displayOrder;
        if (oldDisplayOrder === displayOrder) return;
        this._displayOrder = displayOrder;
        this.outDisplayOrderChange(displayOrder, oldDisplayOrder);
        return true;
    },

    getDisplayOrder: function() { return this._displayOrder; },

    outDisplayOrderChange: function(displayOrder, oldDisplayOrder) {
        this._out('displayOrderChange', displayOrder, oldDisplayOrder);
    },
    
    setEnabled: function(enabled) {
        var oldEnabled = this._enabled;
        if (oldEnabled === enabled) return;
        this._enabled = enabled;
        this.outEnabledChange(enabled, oldEnabled);
        return true;
    },

    getEnabled: function() { return this._enabled; },

    outEnabledChange: function(enabled, oldEnabled) {
        this._out('enabledChange', enabled, oldEnabled);
        if (this._component) this._component.notifyColumnEnabledChange(this, enabled, oldEnabled);
    },
    
    outVisibleChange: function(visible, oldVisible) {
        Amm.Trait.Visual.prototype.outVisibleChange.call(this, visible, oldVisible);
        if (this._component) this._component.notifyColumnVisibleChange(this, visible, oldVisible);
    },
    
    configureCellProto: function(ret, row) {
        if (Amm.is(row, 'Amm.Table.HeaderRow')) {
            return;
        }
        if (this._cellProto) {
            Amm.overrideRecursive(ret.proto, this._cellProto);
        }
    },
    
    configureCellInstance: function(ret, row) {
    },
    
    constructDefaultViews: function() {
        var res = Amm.dom({
            $: 'col',
            data_amm_v: [
                { class: 'v.Visual', delay: 0, },
            ]
        });
        return res;
    },

    setCellClassName: function(cellClassNameOrToggle, part) {
        var oldCellClassName = this._cellClassName;
        var cellClassName = Amm.Util.alterClassName(this._cellClassName, cellClassNameOrToggle, part);
        if (oldCellClassName === cellClassName) return;
        this._cellClassName = cellClassName;
        this.outCellClassNameChange(cellClassName, oldCellClassName);
        return true;
    },

    getCellClassName: function() { return this._cellClassName; },

    outCellClassNameChange: function(cellClassName, oldCellClassName) {
        this._out('cellClassNameChange', cellClassName, oldCellClassName);
    },
    
    setCellProto: function(cellProto) {
        var oldCellProto = this._cellProto;
        if (oldCellProto === cellProto) return;
        this._cellProto = cellProto;
        this.outCellProtoChange(cellProto, oldCellProto);
        var t = this;
        var affectedCells = this.findCells(function(cell) {
            return (
                cell.row 
                && cell.row['Amm.Table.RowOfCells'] 
                && cell.row.getColumnsConfigureCells()
            );
        }, true);
        for (var i = 0, l = affectedCells.length; i < l; i++) {
            affectedCells[i].row.rebuildCells([affectedCells[i]]);
        }
        return true;
    },

    getCellProto: function() { return this._cellProto; },

    outCellProtoChange: function(cellProto, oldCellProto) {
        this._out('cellProtoChange', cellProto, oldCellProto);
    },
    
    _calcCanActivate: function(get) {
        
        if (get('locked')) return false;

        var v = get('visible'), dp;
        
        return (v || v === undefined)
            && get('enabled')
            && (dp = get('displayParent'))
            && Amm.is(dp, 'Amm.Table.ColGroup')
            && Amm.is(get(dp, 'displayParent'), 'Amm.Table.Table');
    
    },
    
    findCells: function(callback, all) {
        if (!this._component) return [];
        var t = this;
        return this._component.findCells(function(cell) {
            return cell.column === t && (!callback || callback(cell));
        }, all);
    },
    
    setSize: function(size) {
        var oldSize = this._size;
        if (oldSize === size) return;
        this._size = size;
        this.outSizeChange(size, oldSize);
        this.setAutoSize(size === null);
        if (!this._lockSetSize && this._enabled && this._component) {
            this._component.setColumnSize(this, size);            
        }
        return true;
    },
    
    reportSize: function(size) {
        this._lockSetSize++;
        this.setSize(size);
        this._lockSetSize--;
    },

    getSize: function() { 
        if (!this._enabled || !this._component) {
            return this._size;
        }
        var size = this._component.getColumnSize(this, size);
        if (size !== this._size) {
            var oldSize = this._size;
            this._size = size;
            this.outSizeChange(size, oldSize);
        }
        return this._size; 
    },

    outSizeChange: function(size, oldSize) {
        this._out('sizeChange', size, oldSize);
    },
    
    setAutoSize: function(autoSize) {
        autoSize = !!autoSize;
        var oldAutoSize = this._autoSize;
        if (oldAutoSize === autoSize) return;
        this._autoSize = autoSize;
        this.outAutoSizeChange(autoSize, oldAutoSize);
        if (autoSize) this.setSize(null);
        return true;
    },

    getAutoSize: function() { return this._autoSize; },

    outAutoSizeChange: function(autoSize, oldAutoSize) {
        this._out('autoSizeChange', autoSize, oldAutoSize);
    },

    _subscribeFirst_sizeChange: function() {
        if (this._component) this._component.observeColumnSize(this);
    },
    
    _unsubscribeLast_sizeChange: function() {
        if (this._component) this._component.unobserveColumnSize(this);
    },
    
    _setComponent_tableColumn: function(component, oldComponent) {
        if (oldComponent) {
            if (this._subscribers['sizeChange']) {
                oldComponent.unobserveColumnSize(this);
            }
            if (this._subscribers['offsetChange']) {
                oldComponent.unobserveColumnOffset(this);
            }
        }
        if (component) {
            if (this._subscribers['sizeChange']) {
                component.observeColumnSize(this);
            }
            if (this._subscribers['offsetChange']) {
                component.observeColumnOffset(this);
            }
        }
    },
    
    setOffset: function(offset) {
    },
    
    getOffset: function() { 
        if (!this._enabled || !this._component) {
            return this._offset;
        }
        var offset = this._component.getColumnOffset(this, offset);
        if (offset !== this._offset) {
            var oldOffset = this._offset;
            this._offset = offset;
            this.outOffsetChange(offset, oldOffset);
        }
        return this._offset; 
    },
    
    reportOffset: function(offset) {
        var oldOffset = this._offset;
        if (oldOffset === offset) return;
        this._offset = offset;
        this.outOffsetChange(offset, oldOffset);
        return true;
    },

    outOffsetChange: function(offset, oldOffset) {
        this._out('offsetChange', offset, oldOffset);
    },    
    
    _subscribeFirst_offsetChange: function() {
        if (this._component) this._component.observeColumnOffset(this);
    },
    
    _unsubscribeLast_offsetChange: function() {
        if (this._component) this._component.unobserveColumnOffset(this);
    },

    setResizable: function(resizable) {
        var oldResizable = this._resizable;
        if (oldResizable === resizable) return;
        this._resizable = resizable;
        this.outResizableChange(resizable, oldResizable);
        return true;
    },

    getResizable: function() { return this._resizable; },

    outResizableChange: function(resizable, oldResizable) {
        this._out('resizableChange', resizable, oldResizable);
    },

    setDraggable: function(draggable) {
        var oldDraggable = this._draggable;
        if (oldDraggable === draggable) return;
        this._draggable = draggable;
        this.outDraggableChange(draggable, oldDraggable);
        return true;
    },

    getDraggable: function() { return this._draggable; },

    outDraggableChange: function(draggable, oldDraggable) {
        this._out('draggableChange', draggable, oldDraggable);
    },
    
    _calcIsDraggable: function(get) {
        var res;
        res = get.prop('draggable').val();
        if (res !== null) return !!res;
        res = get.prop('table').prop('columnsDraggable').val();
        return !!res;
    },
    
    _calcIsResizable: function(get) {
        var res;
        res = get.prop('resizable').val();
        if (res !== null) return !!res;
        res = get.prop('table').prop('columnsResizable').val();
        return !!res;
    },
    
    setDecorator: function(decorator) {
        var oldDecorator = this._decorator;
        if (oldDecorator === decorator) return;
        if (typeof decorator === 'function') {
            if (this._decorator && this._decorator.decorate === decorator) return; // Same fn
            decorator = new Amm.Decorator(decorator);
        } else {
            decorator = Amm.constructInstance(decorator, 'Amm.Decorator');
        }
        this._decorator = decorator;
        this.outDecoratorChange(decorator, oldDecorator);
        return true;
    },

    getDecorator: function() { return this._decorator; },

    outDecoratorChange: function(decorator, oldDecorator) {
        this._out('decoratorChange', decorator, oldDecorator);
    },
    
};

Amm.extend(Amm.Table.Column, Amm.Element);
Amm.extend(Amm.Table.Column, Amm.Table.WithEditor);
Amm.extend(Amm.Table.Column, Amm.Table.WithActive);

Amm.ObservableFunction.createCalcProperty('isDraggable', Amm.Table.Column.prototype);
Amm.ObservableFunction.createCalcProperty('isResizable', Amm.Table.Column.prototype);