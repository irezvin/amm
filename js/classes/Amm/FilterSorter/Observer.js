/* global Amm */

Amm.FilterSorter.Observer = function(filterSorter, options) {
    
    this._filterSorter = filterSorter;

    Amm.WithEvents.call(this, options, true);
    
};

Amm.FilterSorter.Observer.prototype = {
    
    'Amm.FilterSorter.Observer': '__CLASS__',
    
    _filterSorter: null,
    
    match: function(object) {
        return true;
    },
    
    cleanup: function(alreadyUnsubscribed) {
        this.unsubscribe();
        this._filterSorter = null;
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    observe: function(objects) {
        // template method
    },
    
    unobserve: function(objects) {
        // template method
    }
    
};

Amm.extend(Amm.FilterSorter.Observer, Amm.WithEvents);
