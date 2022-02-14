/* global Amm */

Amm.Data.Transaction.List = function(options) {
    Amm.Data.Transaction.View.call(this, options);
};

Amm.Data.Transaction.List.prototype = {

    'Amm.Data.Transaction.List': '__CLASS__', 
    
    _type: 'list',
    
    limit: null,
    
    offset: null,
    
    fields: null,
    
    _payloadFields: Amm.Data.Transaction.View.prototype._payloadFields.concat(['limit', 'offset', 'fields']),

};

Amm.extend(Amm.Data.Transaction.List, Amm.Data.Transaction.View);

