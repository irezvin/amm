/* global Amm */

Amm.Table.ColGroup = function(options) {
    Amm.Element.call(this, options);
};

Amm.Table.ColGroup.prototype = {

    'Amm.Table.ColGroup': '__CLASS__',

    _getDefaultTraits: function(options) {
        return [Amm.Trait.Visual, Amm.Trait.DisplayParent];
    },
    
    setSortOrder: function() {
    },

    getSortOrder: function() { return -1; },

    outSortOrderChange: function(sortOrder, oldSortOrder) {
        this._out('sortOrderChange', sortOrder, oldSortOrder);
    },
    
    constructDefaultViews: function() {
        var res = Amm.html({
            $: 'colgroup',
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
    
    _setComponent_TableColGroup: function(component, oldComponent) {
        if (component) Amm.is(component, 'Amm.Table', 'component');
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

Amm.createProperty(Amm.Table.ColGroup.prototype, 'table', null, null, true);

Amm.extend(Amm.Table.ColGroup, Amm.Element);