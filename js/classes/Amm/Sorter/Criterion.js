/* global Amm */

Amm.Sorter.Criterion = function(sorter, options) {
    if (options === undefined && sorter && typeof sorter === 'object' && sorter.filterSorter) {
        options = sorter;
        sorter = options.filterSorter;
        delete options.filterSorter;
    }
    Amm.FilterSorter.Observer.call(this, sorter, options);
    Amm.init(this, options);
};

Amm.Sorter.Criterion.prototype = {

    'Amm.Sorter.Criterion': '__CLASS__', 
    
    _index: null,

    _ascending: true,

    _defaultValue: null,

    setIndex: function(index) {
        var oldIndex = this._index;
        if (oldIndex === index) return;
        this._index = index;
        this._filterSorter.notifyCriterionIndexChanged(this, index, oldIndex);
        this.outIndexChange(index, oldIndex);
        return true;
    },

    getIndex: function() { return this._index; },

    outIndexChange: function(index, oldIndex) {
        this._out('indexChange', index, oldIndex);
    },

    setAscending: function(ascending) {
        ascending = !!ascending;
        var oldAscending = this._ascending;
        if (oldAscending === ascending) return;
        this._ascending = ascending;
        this._filterSorter.notifyCriterionDirectionChanged(this, ascending, oldAscending);
            this.outAscendingChange(ascending, oldAscending);
        return true;
    },

    getAscending: function() { return this._ascending; },

    outAscendingChange: function(ascending, oldAscending) {
        this._out('ascendingChange', ascending, oldAscending);
    },

    setDefaultValue: function(defaultValue) {
        var oldDefaultValue = this._defaultValue;
        if (oldDefaultValue === defaultValue) return;
        this._defaultValue = defaultValue;
        this.outDefaultValueChange(defaultValue, oldDefaultValue);
        this._filterSorter.refresh();
        return true;
    },

    getDefaultValue: function() { return this._defaultValue; },

    outDefaultValueChange: function(defaultValue, oldDefaultValue) {
        this._out('defaultValueChange', defaultValue, oldDefaultValue);
    },
    
    getValue: function(object) {
        var res = this._doGetValue(object);
        if (res === undefined) res = this._defaultValue;
        return res;
    },
    
    _doGetValue: function(object) {
    }
    
};

Amm.extend(Amm.Sorter.Criterion, Amm.FilterSorter.Observer);

