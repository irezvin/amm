/* global Amm */

Amm.Adapter.Abstract.Visual = function(options) {
    Amm.Adapter.Abstract.call(this, options);
};

Amm.Adapter.Abstract.Visual.prototype = {

    'Amm.Adapter.Abstract.Visual': '__CLASS__', 
    
    requiredElementClass: 'Amm.Trait.Visual',
    
    setAdpVisible: function(visible) {
    },

    getAdpVisible: function() { 
    },

    setAdpDisplayParent: function(displayParent) {
    },

    getAdpDisplayParent: function() { 
    },
 
    setAdpDisplayOrder: function(displayOrder) {
    },

    getAdpDisplayOrder: function() { 
    },
 
    setAdpClasses: function(classes) {
    },

    getAdpClasses: function() { 
    }
 
};

Amm.extend(Amm.Adapter.Abstract.Visual, Amm.Adapter.Abstract);

