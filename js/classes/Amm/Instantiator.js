/* global Amm */

Amm.Instantiator = function() {
    if (this['Amm.Instantiator'] === '__CLASS__') {
        throw Error("Attempt to instantiate abstract class");
    }
};

Amm.Instantiator.prototype = {
    
    'Amm.Instantiator': '__CLASS__'
    
};
