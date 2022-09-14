/* global Amm */

/**
 * Amm.Data.MetaProvider, but instantiable directly 
 * (to share metadata w/o Mapper, i.e. between Model instances)
 */

Amm.Data.ConcreteMetaProvider = function(options) {
    Amm.Data.MetaProvider.call(this, options);
    Amm.WithEvents.call(this, options);
};

Amm.Data.ConcreteMetaProvider.prototype = {

    'Amm.Data.ConcreteMetaProvider': '__CLASS__', 

};

Amm.extend(Amm.Data.ConcreteMetaProvider, Amm.Data.MetaProvider);
Amm.extend(Amm.Data.ConcreteMetaProvider, Amm.WithEvents);
