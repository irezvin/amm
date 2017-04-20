/* global Amm */

Amm.Root = function(options) {
    Amm.Element.Composite.call(this, options);
};

Amm.Root.prototype = {
    
    'Amm.Root': '__CLASS__',
    
    _id: '^',
    
    // Root is allowed to have ANY events to create global events
    strictEvents: false,
    
    xxx: "zzz",
    
    getPath: function() {
        return '^';
    },
    
    setParent: function(parent) {
        if (parent) throw new Exception("Cannot setParent() of root");
    },
    
    setId: function(id) {
        if (id !== '^') throw "Cannot setId() of root to anything other than '^'";
    },
    
    raiseEvent: function(eventName) {
        var args = Array.prototype.slice.call(arguments, 0);
        return this._out.apply(this, args);
    }
    
};

Amm.extend(Amm.Root, Amm.Element.Composite);