/* global Amm */

Amm.Instantiator.Proto = function(optionsOrProto, assocProperty, revAssocProperty) {
    
    if (typeof optionsOrProto !== 'object' || optionsOrProto && !optionsOrProto.proto) {
        optionsOrProto = {
            proto: optionsOrProto
        };
    }
    if (assocProperty) optionsOrProto.assocProperty = assocProperty;
    if (revAssocProperty) optionsOrProto.revAssocProperty = revAssocProperty;
    Amm.init(this, optionsOrProto);
};

Amm.Instantiator.Proto.prototype = {
    
    'Amm.Instantiator.Proto': '__CLASS__',
    
    proto: null,
    
    assocProperty: null,
    
    revAssocProperty: null,
    
    construct: function(object) {
        if (!this.proto) throw Error("`proto` must be set");
        var proto = this.proto;
        var res = Amm.constructInstance(proto, null);
        if (this.assocProperty) Amm.setProperty(res, this.assocProperty, object);
        if (this.revAssocProperty) Amm.setProperty(object, this.revAssocProperty, res);
        return res;
    },
    
    destruct: function(object) {
        if (object.cleanup) object.cleanup();
    }
    
};


// Amm.extend(Amm.Instantiator.Proto, Amm.Instantiator);