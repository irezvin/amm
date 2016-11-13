/* global Amm */

Amm.View.Abstract.Field = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Focusable', 'Editor', 'Lockable');
};

Amm.View.Abstract.Field.prototype = {

    'Amm.View.Abstract.Field': '__CLASS__', 
    
    setVFocused: function(focus) {
    },
    
    getVFocused: function() { 
    },
    
    setVReadOnly: function(readOnly) {
    },
    
    getVReadOnly: function() { 
    },
    
    setVEnabled: function(enabled) {
    },
    
    getVEnabled: function() { 
    },
    
    setVValue: function(value) {
    },
    
    getVValue: function() {
    },
    
    setVLocked: function(locked) {
    }
    
};

Amm.extend(Amm.View.Abstract.Field, Amm.View.Abstract);

