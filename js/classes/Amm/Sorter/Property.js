/* global Amm */

Amm.Sorter.Property = function(sorter, options) {
    Amm.Sorter.Criterion.call(this, sorter, options);
    if (!this._property) throw Error("Need to specify options.property");
};

Amm.Sorter.Property.prototype = {

    'Amm.Sorter.Property': '__CLASS__', 
    
    _property: null,
    
    setProperty: function(property) {
        var oldProperty = this._property;
        if (oldProperty === property) return;
        if (this._property) throw Error ("Can setProperty() only once");
        this._property = property;
        return true;
    },

    getProperty: function() { return this._property; },
    
    observe: function(objects) {
        var oo = objects || this._filterSorter._objects, l = oo.length, i, o;
        var ev = this._property + 'Change';
        for (i = 0; i < l; i++) {
            o = oo[i];
            if (!o['Amm.WithEvents']) continue;
            if (!o.hasEvent(ev)) continue;
            this._filterSorter.subscribeObject(o, ev, this._handleChange, this);
        }
    },
    
    // if props is not provided, will unsubscribe from all events
    unobserve: function(objects) {
        var oo = objects || this._filterSorter._objects, l = oo.length, i, o;
        var ev = this._property + 'Change';
        for (i = 0; i < l; i++) {
            o = oo[i];
            if (!o['Amm.WithEvents']) continue;
            if (!o.hasEvent(ev)) continue;
            this._filterSorter.unsubscribeObject(o, ev, this._handleChange, this);
        }
    },
    
    _handleChange: function() {
        var o = Amm.event.origin; // event origin must be our object
        
        // sub-optimal (eval all conditions for all observed change events)
        this._filterSorter.refresh(o); 
    },
    
    _doGetValue: function(object) {
        return Amm.getProperty(object, this._property);
    }
    

};

Amm.extend(Amm.Sorter.Property, Amm.Sorter.Criterion);

