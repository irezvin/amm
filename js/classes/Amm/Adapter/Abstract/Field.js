/* global Amm */

Amm.Adapter.Abstract.Field = function(options) {
    Amm.Adapter.Abstract.call(this, options);
};

Amm.Adapter.Abstract.Field.prototype = {

    'Amm.Adapter.Abstract.Field': '__CLASS__', 
    
    // Works with Property
    requiredElementClass: 'Amm.Trait.Field',
    
    setAdpFocused: function(focus) {
    },
    
    getAdpFocused: function() { 
    },
    
    setAdpReadOnly: function(readOnly) {
    },
    
    getAdpReadOnly: function() { 
    },
    
    setAdpEnabled: function(enabled) {
    },
    
    getAdpEnabled: function() { 
    },
    
    setAdpValue: function(value) {
    },
    
    getAdpValue: function() {
    }
    
};

Amm.extend(Amm.Adapter.Abstract.Field, Amm.Adapter.Abstract);

