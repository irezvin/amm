/* global Amm */

Amm.MultiObserver.Sorter.Criterion = function(options) {
    Amm.MultiObserver.Abstract.Observer.call(this, options);
};

Amm.MultiObserver.Sorter.Criterion.prototype = {

    'Amm.MultiObserver.Sorter.Criterion': '__CLASS__', 
    
    _index: null,

    _ascending: true,

    setIndex: function(index) {
        var oldIndex = this._index;
        if (oldIndex === index) return;
        this._index = index;
        if (this._multiObserver) {
            this._multiObserver.notifyCriterionIndexChanged(this, index, oldIndex);
        }
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
        if (this._multiObserver) {
            this._multiObserver.notifyCriterionDirectionChanged(this, ascending, oldAscending);
        }
        this.outAscendingChange(ascending, oldAscending);
        return true;
    },

    getAscending: function() { return this._ascending; },

    outAscendingChange: function(ascending, oldAscending) {
        this._out('ascendingChange', ascending, oldAscending);
    },

};

Amm.extend(Amm.MultiObserver.Sorter.Criterion, Amm.MultiObserver.Abstract.Observer);

