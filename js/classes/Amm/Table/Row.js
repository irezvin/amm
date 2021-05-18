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

    _getDefaultTraits: function(options) {
        return [Amm.Trait.Component, Amm.Trait.Visual, Amm.Trait.DisplayParent];
    },
    
    constructDefaultViews: function() {
        var res = Amm.html({
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
    }
    
};

Amm.createProperty(Amm.Table.Row.prototype, 'section', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Row.prototype, 'table', null, null, {enumerable: false});

Amm.extend(Amm.Table.Row, Amm.Element);
Amm.extend(Amm.Table.Row, Amm.Table.WithActive);
