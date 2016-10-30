/* global Amm */

Amm.Field.Simple = function(options) {
    Amm.Field.call(this, options);
};

Amm.Field.Simple.prototype = {

    'Amm.Field.Simple': '__CLASS__', 

};

Amm.extend(Amm.Field.Simple, Amm.Field);

