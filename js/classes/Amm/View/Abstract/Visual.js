/* global Amm */

Amm.View.Abstract.Visual = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Visual', 'Classes');
};

Amm.View.Abstract.Visual.prototype = {

    'Amm.View.Abstract.Visual': '__CLASS__', 
    
    setVVisible: function(visible) {
    },

    getVVisible: function() { 
    },

    setVDisplayParent: function(displayParent) {
    },

    getVDisplayParent: function() { 
    },
 
    setVDisplayOrder: function(displayOrder) {
    },

    getVDisplayOrder: function() { 
    },
 
    setVClasses: function(classes) {
    },

    getVClasses: function() { 
    }
 
};

Amm.extend(Amm.View.Abstract.Visual, Amm.View.Abstract);

