/* global Amm */

Amm.Table.Section = function(options) {
    var rows;
    options = Amm.override({}, options);
    if ('rows' in options) {
        rows = options.rows;
        delete options.rows;
    }
    Amm.Element.call(this, options);
    if (rows !== undefined) this.setRows(rows);
};

Amm.Table.Section.TYPE = {
    HEADER: 'HEADER',
    BODY: 'BODY',
    FOOTER: 'FOOTER',
};

Amm.Table.Section.ORDER = {};

Amm.Table.Section.ORDER[Amm.Table.Section.TYPE.HEADER] = 1;
Amm.Table.Section.ORDER[Amm.Table.Section.TYPE.BODY] = 2;
Amm.Table.Section.ORDER[Amm.Table.Section.TYPE.FOOTER] = 3;

Amm.Table.Section.TAG = {};

Amm.Table.Section.TAG[Amm.Table.Section.TYPE.HEADER] = 'thead';
Amm.Table.Section.TAG[Amm.Table.Section.TYPE.BODY] = 'tbody';
Amm.Table.Section.TAG[Amm.Table.Section.TYPE.FOOTER] = 'tfoot';


Amm.Table.Section._TYPE = Amm.Util.swapKeysValues(Amm.Table.Section.TYPE);

Amm.Table.Section.prototype = {

    'Amm.Table.Section': '__CLASS__',

    _type: Amm.Table.Section.TYPE.BODY,
    
    _sortOrder: Amm.Table.Section.ORDER[Amm.Table.Section.TYPE.BODY],
    
    _getDefaultTraits: function(options) {
        return [Amm.Trait.Component, Amm.Trait.Visual, Amm.Trait.DisplayParent];
    },
    
    _getDefaultDisplayChildrenPrototype: function() {
        var res = Amm.Trait.DisplayParent.prototype._getDefaultDisplayChildrenPrototype.call(this);
        res.undefaults = {displayOrder: -1};
        return res;
    },
    
    setRows: function(rows) {
        if (!rows) rows = [];
        rows = Amm.constructMany(rows, 'Amm.Table.Row', {
            component: this,
        }, 'id', true, ['Amm.Table.Row']);
        this.displayChildren.setItems(rows);
    },
    
    getRows: function() {
        return this.displayChildren;
    },
    
    setType: function(type) {
        var oldType = this._type;
        if (!(type in Amm.Table.Section._TYPE))
            throw Error("`type` must be one of Amm.Table.Section.TYPE constants");
        if (oldType === type) return;
        this._type = type;
        this.outTypeChange(type, oldType);
        this.setSortOrder(Amm.Table.Section.ORDER[type]);
        return true;
    },

    getType: function() { return this._type; },

    outTypeChange: function(type, oldType) {
        this._out('typeChange', type, oldType);
    },
    
    setSortOrder: function(sortOrder) {
        var oldSortOrder = this._sortOrder;
        if (oldSortOrder === sortOrder) return;
        this._sortOrder = sortOrder;
        this.outSortOrderChange(sortOrder, oldSortOrder);
        return true;
    },

    getSortOrder: function() { return this._sortOrder; },

    outSortOrderChange: function(sortOrder, oldSortOrder) {
        this._out('sortOrderChange', sortOrder, oldSortOrder);
    },
    
    constructDefaultViews: function() {
        var res = Amm.html({
            $: Amm.Table.Section.TAG[this._type],
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
    
    _setComponent_TableSection: function(component, oldComponent) {
        if (component) Amm.is(component, 'Amm.Table.Table', 'component');
    },
    
    setTable: function(table) {
        return this.setComponent(table);
    },

    getTable: function() { return this._component; },

    outTableChange: function(table, oldTable) {
        this._out('tableChange', table, oldTable);
    },
    
    outComponentChange: function(component, oldComponent) {
        Amm.Element.prototype.outComponentChange.call(this, component, oldComponent);
        this.outTableChange(component, oldComponent);
    }

    
};

Amm.createProperty(Amm.Table.Section.prototype, 'rows', null, null, true);
Amm.createProperty(Amm.Table.Section.prototype, 'table', null, null, true);

Amm.extend(Amm.Table.Section, Amm.Element);

// Amm.extend(Amm.Table.Section, Amm.Util); // required dependency
 
