/* global Amm */

Amm.View.Abstract.Visual = function(options) {
    this._requireInterfaces('Visual', 'ClassName');
    Amm.View.Abstract.call(this, options);
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
 
    setVClassName: function(className) {
    },

    getVClassName: function() { 
    }
 
};

Amm.extend(Amm.View.Abstract.Visual, Amm.View.Abstract);

