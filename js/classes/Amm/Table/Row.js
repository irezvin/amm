/* global Amm */

Amm.Table.Row = function(options) {
    Amm.Element.call(this, options);
};

Amm.Table.Row.TYPE_SIMPLE = 'TYPE_SIMPLE';

Amm.Table.Row.TYPE_HEADER = 'TYPE_HEADER';

Amm.Table.Row.TYPE_FOOTER = 'TYPE_FOOTER';

Amm.Table.Row.prototype = {

    'Amm.Table.Row': '__CLASS__',

    _type: Amm.Table.Row.TYPE_SIMPLE,
    
    _item: null,
    
    _index: null,

    _enabled: true,

    _table: null,
    
    _tableActiveProp: 'activeRow',
    
    _size: null,
    
    _offset: null,
    
    _lockSetSize: 0,
    
    _resizable: null,

    _draggable: null,

    _getDefaultTraits: function(options) {
        return [Amm.Trait.Component, Amm.Trait.Visual, Amm.Trait.DisplayParent];
    },
    
    constructDefaultViews: function() {
        var res = Amm.dom({
            $: 'tr',
            data_amm_v: [
                {
                    class: 'v.DisplayParent'
                },
                {
                    class: 'v.Visual',
                    delay: 0,
                }
            ],
        });
        return res;
    },
    
    setItem: function(item) {
        var oldItem = this._item;
        if (oldItem === item) return;
        this._item = item;
        this.outItemChange(item, oldItem);
        return true;
    },

    getItem: function() { return this._item; },

    outItemChange: function(item, oldItem) {
        this._out('itemChange', item, oldItem);
    },

    setIndex: function(index) {
        var oldIndex = this._index;
        if (oldIndex === index) return;
        this._index = index;
        this.outIndexChange(index, oldIndex);
        return true;
    },

    getIndex: function() { return this._index; },

    outIndexChange: function(index, oldIndex) {
        this._out('indexChange', index, oldIndex);
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
    },
    
    setTable: function(table) {
        console.warn("Amm.Table.Row.setTable() has no effect; use setSection()");
    },
    
    _setTable: function(table) {
        if (table) Amm.is(table, 'Amm.Table.Table', 'table');
        else table = null;
        var oldTable = this._table;
        if (oldTable === table) return;
        if (oldTable) {
            if (this._subscribers['sizeChange']) {
                oldTable.unobserveRowSize(this);
            }
            if (this._subscribers['offsetChange']) {
                oldTable.unobserveRowOffset(this);
            }
        }
        if (table) {
            if (this._subscribers['sizeChange']) {
                table.observeRowSize(this);
            }
            if (this._subscribers['offsetChange']) {
                table.observeRowOffset(this);
            }
        }
        this._table = table;
        this.outTableChange(table, oldTable);
        return true;
    },

    getTable: function() { return this._table; },

    outTableChange: function(table, oldTable) {
        this._out('tableChange', table, oldTable);
    },

    _setComponent_TableRow: function(component, oldComponent) {
        if (!component) {
            this.setDisplayOrder(null);
            return;
        }
        Amm.is(component, ['Amm.Table.Section', 'Amm.Table.Table'], 'component');
        if (component['Amm.Table.Section']) {
            Amm.subUnsub(component, oldComponent, this, 'componentChange', '_setTable');
            this._setTable(component.getComponent());
        } else {
            this._setTable(component);
        }
    },
    
    setDisplayParent: function(displayParent) {
        if (!Amm.Trait.Visual.prototype.setDisplayParent.call(this, displayParent)) return;
        if (Amm.is(displayParent, 'Amm.Section')) this.setSection(displayParent);
        return true;
    },
    
    setSection: function(section) {
        if (!section) section = null;
        else Amm.is(section, 'Amm.Table.Section', 'section');
        return this.setDisplayParent(section);
    },

    getSection: function() { return this.getDisplayParent(); },

    outSectionChange: function(section, oldSection) {
        this._out('sectionChange', section, oldSection);
    },
    
    outComponentChange: function(component, oldComponent) {
        Amm.Element.prototype.outComponentChange.call(this, component, oldComponent);
        this.outSectionChange(component, oldComponent);
    },
    
    /**
     * Finds next/previous row adjacent to this one.
     * 
     * 
     * @param {boolean} reverse If true, will return previous row
     * @param {function} callback If provided, will continue search until callback returns true
     * @param {number} mode One of Amm.Table.ADJACENT_ constants
     * @returns {Amm.Table.Row}
     */
    findAdjacent: function(reverse, callback, mode) {
        var src, idx, tbl;
        if (!mode) mode = Amm.Table.ADJACENT_SAME_SECTION;
        if (mode === Amm.Table.ADJACENT_SAME_SECTION) {
            var sect = this.getSection();
            if (!sect) return;
            src = sect.displayChildren;
            idx = src.indexOf(this);
        } else if (mode === Amm.Table.ADJACENT_ANY_SECTION) {
            tbl = this.getTable();
            if (!tbl) return;
            src = 
                tbl.header.getDisplayChildren().getItems()
                .concat(tbl.body.getDisplayChildren().getItems())
                .concat(tbl.footer.getDisplayChildren().getItems());
            idx = Amm.Array.indexOf(this, src);
        } else if (mode === Amm.Table.ADJACENT_ITEM_ROW) {
            tbl = this.getTable();
            if (!tbl) return;
            src = tbl.getRows();
            idx = src.indexOf(this);
        } else {
            throw Error("`mode` must be Amm.Table.ADJACENT_(SAME_SECTION|ANY_SECTION|ITEM_ROW) constants");
        }
        if (idx < 0) return;
        
        var d = reverse? -1: 1;
        var res, found = true;
        
        do {
            idx += d;
            res = src[idx];
            if (callback && res) found = callback(res, this);
        } while(res && !found);
        if (!found) return null;
        return res || null;
    },
    
    findCellByColumn: function(column) {
        Amm.is(column, 'Amm.Table.Column', 'column');
        var id = column.getId();
        
        // try to do it quick
        var cell = this._namedElements[id];
        if (cell && cell['Amm.Table.Cell'] && cell.getColumn() === column) {
            return cell; // ok
        }
        
        var search = [].concat(this._elements).concat(this.displayChildren);
        for (var i = 0; i < search.length; i++) {
            if (search[i]['Amm.Table.Cell'] && search[i].getColumn() === column)
                return search[i];
        }
    },
    
    _calcCanActivate: function(get) {
        
        if (get('locked')) return false;
        
        var visible = get('visible'), section, sectionVisible;
        
        return (visible || visible === undefined)
            && get('enabled')
            && get('table')
            && (section = get('section'))
            && (sectionVisible = get(section, 'visible') || sectionVisible === undefined);
    },
    
    setSize: function(size) {
        var oldSize = this._size;
        if (oldSize === size) return;
        this._size = size;
        this.outSizeChange(size, oldSize);
        if (!this._lockSetSize && this._enabled && this._table) {
            this._table.setRowSize(this, size);            
        }
        return true;
    },
    
    reportSize: function(size) {
        this._lockSetSize++;
        this.setSize(size);
        this._lockSetSize--;
    },

    getSize: function() { 
        if (!this._enabled || !this._table) {
            return this._size;
        }
        var size = this._table.getRowSize(this, size);
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
    
    _subscribeFirst_sizeChange: function() {
        if (this._table) this._table.observeRowSize(this);
    },
    
    _unsubscribeLast_sizeChange: function() {
        if (this._table) this._table.unobserveRowSize(this);
    },
    
    setOffset: function(offset) {
    },
    
    getOffset: function() { 
        if (!this._enabled || !this._table) {
            return this._offset;
        }
        var offset = this._table.getRowOffset(this);
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
        if (this._table) this._table.observeRowOffset(this);
    },
    
    _unsubscribeLast_offsetChange: function() {
        if (this._table) this._table.unobserveRowOffset(this);
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
        res = get.prop('section').prop('rowsDraggable').val();
        if (res !== null) return !!res;
        res = get.prop('table').prop('rowsDraggable').val();
        return !!res;
    },
    
    _calcIsResizable: function(get) {
        var res;
        res = get.prop('resizable').val();
        if (res !== null) return !!res;
        res = get.prop('section').prop('rowsResizable').val();
        if (res !== null) return !!res;
        res = get.prop('table').prop('rowsResizable').val();
        return !!res;
    },
    
};

Amm.createProperty(Amm.Table.Row.prototype, 'section', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Row.prototype, 'table', null, null, {enumerable: false});

Amm.extend(Amm.Table.Row, Amm.Element);
Amm.extend(Amm.Table.Row, Amm.Table.WithActive);

Amm.ObservableFunction.createCalcProperty('isDraggable', Amm.Table.Row.prototype);
Amm.ObservableFunction.createCalcProperty('isResizable', Amm.Table.Row.prototype);