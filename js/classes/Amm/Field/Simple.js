/* global Amm */

Amm.Trait.Field.Simple = function(options) {
    Amm.Trait.Field.call(this, options);
};

Amm.Trait.Field.Simple.prototype = {

    'Amm.Trait.Field.Simple': '__CLASS__', 

};

Amm.extend(Amm.Trait.Field.Simple, Amm.Trait.Field);

