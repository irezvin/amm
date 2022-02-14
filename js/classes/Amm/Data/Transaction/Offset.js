/* global Amm */

Amm.Data.Transaction.Offset = function(options) {
    Amm.Data.Transaction.View.call(this, options);
};

Amm.Data.Transaction.Offset.prototype = {

    'Amm.Data.Transaction.Offset': '__CLASS__', 
    
    _type: 'offset',

};

Amm.extend(Amm.Data.Transaction.Offset, Amm.Data.Transaction.View);

