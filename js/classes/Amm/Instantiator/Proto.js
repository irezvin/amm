/* global Amm */

Amm.Instantiator.Proto = function(optionsOrProto, assocProperty, revAssocProperty) {
    
    Amm.Instantiator.call(this);
    if (typeof optionsOrProto !== 'object' || optionsOrProto && !('proto' in optionsOrProto)) {
        optionsOrProto = {
            proto: optionsOrProto
        };
    }
    if (optionsOrProto && Amm.Builder.isPossibleBuilderSource(optionsOrProto.proto)) {
        this.isElement = true;
    }
    if (assocProperty) optionsOrProto.assocProperty = assocProperty;
    if (revAssocProperty) optionsOrProto.revAssocProperty = revAssocProperty;
    Amm.WithEvents.call(this, optionsOrProto);

};

Amm.Instantiator.Proto.prototype = {
    
    'Amm.Instantiator.Proto': '__CLASS__',
    
    proto: null,
    
    /**
     *  when both instantiator.`proto` and `object` argument to construct() 
     *  are plain objects, `object` will override `proto` to get final "prototype"
     *  of instance that will be created
     */
    overrideProto: false,
    
    isElement: false,
    
    assocProperty: null,
    
    revAssocProperty: null,
    
    protoCallback: null,
    
    protoCallbackScope: null,
    
    instanceCallback: null,
    
    instanceCallbackScope: null,
    
    // required/default class in Amm.constructInstance
    requiredClass: null,
    
    construct: function(object) {
        var proto = this.generatePrototype(object);
        var instance;
        if (this.isElement) instance = new Amm.Element(proto);
            else instance = Amm.constructInstance(proto, this.requiredClass); 
        if (this.assocProperty) Amm.setProperty(instance, this.assocProperty, object);
        if (this.revAssocProperty) Amm.setProperty(object, this.revAssocProperty, instance);
        this.applyInstanceCallbacks(instance, object);
        return instance;
    },
    
    generatePrototype: function(object) {
        var proto;
        if (this.proto && typeof this.proto === 'object' && !Amm.getClass(this.proto) &&
            !Amm.isDomNode(this.proto)
        ) {
            proto = Amm.override({}, this.proto);
            if (this.overrideProto && object && typeof object === 'object' && !Amm.getClass(object)) {
                Amm.override(proto, object);
            }
        } else {
            proto = this.proto || {};
        }
        var ret = {proto: proto};
        this.applyProtoCallbacks(ret, object);
        return ret.proto;
    },
    
    applyProtoCallbacks: function(ret, object) {
        if (!this.protoCallback && !this._subscribers.protoCallback) return;
        if (this.protoCallback) {
            this.protoCallback.call(this.protoCallbackScope || this, ret, object);
        }
        this.outProtoCallback(ret, object);
    },
    
    outProtoCallback: function(ret, object) {
        return this._out('protoCallback', ret, object);
    },
    
    applyInstanceCallbacks: function(instance, object) {
        if (!this.instanceCallback && !this._subscribers.instanceCallback) return;
        if (this.instanceCallback) {
            this.instanceCallback.call(this.instanceCallbackScope || this, instance, object);
        }
        this.outInstanceCallback(instance, object);
    },
    
    outInstanceCallback: function(instance, object) {
        return this._out('instanceCallback', instance, object);
    },
    
    destruct: function(object) {
        if (object.cleanup) {
            object.cleanup();
        }
    }
    
};

Amm.extend(Amm.Instantiator.Proto, Amm.WithEvents);
Amm.extend(Amm.Instantiator.Proto, Amm.Instantiator);