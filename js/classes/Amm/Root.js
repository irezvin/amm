/* global Amm */

Amm.Root = function(options) {
    Amm.Element.Composite.call(this, options);
};

Amm.Root.prototype = {
    
    'Amm.Root': '__CLASS__',
    
    _id: '^',
    
    getPath: function() {
        return '^';
    },
    
    setParent: function(parent) {
        if (parent) throw new Exception("Cannot setParent() of root");
    },
    
    setId: function(id) {
        if (id !== '^') throw "Cannot setId() of root to anything other than '^'";
    }
    
};

Amm.extend(Amm.Root, Amm.Element.Composite);