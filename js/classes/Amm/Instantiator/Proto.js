/* global Amm */

Amm.Instantiator.Proto = function(optionsOrProto, assocProperty, revAssocProperty) {
    
    Amm.Instantiator.call(this);
    if (typeof optionsOrProto !== 'object' || optionsOrProto && !optionsOrProto.proto) {
        optionsOrProto = {
            proto: optionsOrProto
        };
    }
    if (optionsOrProto && Amm.Builder.isPossibleBuilderSource(optionsOrProto.proto)) {
        this.isElement = true;
    }
    if (assocProperty) optionsOrProto.assocProperty = assocProperty;
    if (revAssocProperty) optionsOrProto.revAssocProperty = revAssocProperty;
    Amm.init(this, optionsOrProto);

};

Amm.Instantiator.Proto.prototype = {
    
    'Amm.Instantiator.Proto': '__CLASS__',
    
    proto: null,
    
    isElement: false,
    
    assocProperty: null,
    
    revAssocProperty: null,
    
    construct: function(object) {
        if (!this.proto) throw Error("`proto` must be set");
        var proto = this.proto;
        var res;
        if (this.isElement) res = new Amm.Element(proto);
            else res = Amm.constructInstance(proto, null);
        if (this.assocProperty) Amm.setProperty(res, this.assocProperty, object);
        if (this.revAssocProperty) Amm.setProperty(object, this.revAssocProperty, res);
        return res;
    },
    
    destruct: function(object) {
        if (object.cleanup) {
            object.cleanup();
        }
    }
    
};


Amm.extend(Amm.Instantiator.Proto, Amm.Instantiator);