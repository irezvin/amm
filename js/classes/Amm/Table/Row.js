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
                    class: 'v.Visual'
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
        if (table) Amm.is(table, 'Amm.Table', 'table');
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
        Amm.is(component, ['Amm.Table.Section', 'Amm.Table'], 'component');
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
        return this.setComponent(section);
    },

    getSection: function() { return this._component; },

    outSectionChange: function(section, oldSection) {
        this._out('sectionChange', section, oldSection);
    },
    
    outComponentChange: function(component, oldComponent) {
        Amm.Element.prototype.outComponentChange.call(this, component, oldComponent);
        this.outSectionChange(component, oldComponent);
    },
    
};

Amm.createProperty(Amm.Table.Row.prototype, 'section', null, null, true);
Amm.createProperty(Amm.Table.Row.prototype, 'table', null, null, true);

Amm.extend(Amm.Table.Row, Amm.Element);

