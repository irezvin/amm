/* global Amm */

Amm.Adapter.Field = function(options) {
    Amm.Adapter.call(this, options);
};

Amm.Adapter.Field.prototype = {

    'Amm.Adapter.Field': '__CLASS__', 
    
    // Works with Property
    requiredElementClass: 'Amm.Field',
    
};

Amm.extend(Amm.Adapter.Field, Amm.Adapter);

