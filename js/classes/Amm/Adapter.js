/* global Amm */

Amm.Adapter = function(options) {
    this._components = [];
    Amm.ElementBound.call(this, options);
};

Amm.Adapter.prototype = {

    _components: null,

    'Amm.Adapter': '__CLASS__', 

};

Amm.extend(Amm.Adapter, Amm.ElementBound);

