/* global Amm */

Amm.Remote.RequestProducer = function(options) {
    Amm.Remote.Uri.call(this, options);
};

Amm.Remote.RequestProducer.prototype = {

    'Amm.Remote.RequestProducer': '__CLASS__', 

};

Amm.extend(Amm.Remote.RequestProducer, Amm.Remote.Uri);

