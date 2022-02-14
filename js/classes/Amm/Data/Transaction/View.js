/* global Amm */

Amm.Data.Transaction.View = function(options) {
    Amm.Data.Transaction.call(this, options);
};

Amm.Data.Transaction.View.prototype = {

    'Amm.Data.Transaction.View': '__CLASS__', 
    
    sort: null,
    
    filter: null,
    
    _payloadFields: ['sort', 'filter'],
    
    calcPayload: function() {
        var res = Amm.Data.Transaction.prototype.calcPayload.call(this);
        for (var i = 0, l = this._payloadFields.length; i < l; i++) {
            var f = this._payloadFields[i];
            if (this[f] !== null && this[f] !== undefined) {
                res[f] = this[f];
            }
        }
        return res;
    },
    
};

Amm.extend(Amm.Data.Transaction.View, Amm.Data.Transaction);

