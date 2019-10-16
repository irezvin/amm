/* global Amm */
Amm.Trait.Instantiator = function() {
};

Amm.Trait.Instantiator.prototype = {

    Instantiator: '__INTERFACE__',
    
    InstantiatorOrRepeater: '__INTERFACE__',
    
    __augment: function(traitInstance, options) {
        
        Amm.Element.regInit(this, '99.Amm.Trait.Instantiator', function() {        
            if (this['DisplayParent'] !== '__INTERFACE__') throw Error("Instantiator must be also a DisplayParent");
        });
        if (options && options.initialInstantiatorOptions) {
            this._reportedInstantiatorOptions = options.initialInstantiatorOptions;
            delete options.initialInstantiatorOptions;
        }
        
    },
    
    _instantiator: null,

    _src: null,

    _dest: null,

    _instantiatorOptions: null,
    
    _reportedInstantiatorOptions: null,

    _construct: function() {
        if (!this._instantiator || !this._src) return;
        var dest = this._instantiator.construct(this._src);
        this.setDest(dest);
    },

    _destruct: function() {
        if (!this._dest) return;
        this._dest.setDisplayParent(null);
        if (this._instantiator) {
            this._instantiator.destruct(this._dest);
        }
        this._dest = null;
    },

    setInstantiator: function(instantiator) {
        if (!instantiator) instantiator = null;
        else instantiator = Amm.constructInstance(instantiator, 'Amm.Instantiator');
        var oldInstantiator = this._instantiator;
        if (oldInstantiator === instantiator) return;
        if (oldInstantiator && oldInstantiator['Amm.WithEvents'])
            oldInstantiator.unsubscribe('needRebuild', this._handleInstantiatorNeedRebuild, this);
        this._instantiator = instantiator;
        if (instantiator && instantiator['Amm.WithEvents'] && instantiator.hasEvent('needRebuild')) {
            instantiator.subscribe('needRebuild', this._handleInstantiatorNeedRebuild, this);
        }
        this._reportedInstantiatorOptions = null;
        this._destruct();
        this.outInstantiatorChange(instantiator, oldInstantiator);
        this._construct();
        return true;
    },

    getInstantiator: function() { return this._instantiator; },

    outInstantiatorChange: function(instantiator, oldInstantiator) {
        this._out('instantiatorChange', instantiator, oldInstantiator);
    },

    setSrc: function(src) {
        var oldSrc = this._src;
        if (oldSrc === src) return;
        this._src = src;
        this._construct();
        this.outSrcChange(src, oldSrc);
        return true;
    },

    getSrc: function() { return this._src; },

    outSrcChange: function(src, oldSrc) {
        this._out('srcChange', src, oldSrc);
    },

    setDest: function(dest) {
        var oldDest = this._dest;
        if (oldDest === dest) return;
        if (dest) Amm.is(dest, 'Visual', 'dest');
        this._destruct();
        this._dest = dest;
        if (this._dest) this._dest.setDisplayParent(this);
        this.outDestChange(dest, oldDest);
        return true;
    },

    getDest: function() { return this._dest; },

    outDestChange: function(dest, oldDest) {
        this._out('destChange', dest, oldDest);
    },
    
    _handleInstantiatorNeedRebuild: function(changedObjects, changedMatches, instantiator) {
        if (!this._src || instantiator !== this._instantiator) return;
        if (Amm.Array.indexOf(this._src, changedObjects) < 0) return;
        this._construct();
    },
    
    _cleanup_Instantiator: function() {
        this.setInstantiator(null);
        this.setSrc(null);
    },
    
    setInstantiatorOptions: function(instantiatorOptions) {
        if (!instantiatorOptions) instantiatorOptions = null;
        var oldInstantiatorOptions = this._instantiatorOptions;
        if (oldInstantiatorOptions === instantiatorOptions) return;
        this._instantiatorOptions = instantiatorOptions;
        if (this._reportedInstantiatorOptions) {
            this.reportInstantiatorOptions.apply(this, this._reportedInstantiatorOptions);
        }
        return true;
    },

    getInstantiatorOptions: function() { return this._instantiatorOptions; },

    reportInstantiatorOptions: function (defaultPrototype, conditions, prototypes) {
        
        this._reportedInstantiatorOptions = [defaultPrototype, conditions, prototypes];
        var instantiatorPrototype;
        
        if (conditions && conditions.length) {
            
            instantiatorPrototype = {
                'class': Amm.Instantiator.Variants,
                defaultPrototype: defaultPrototype,
                filter: {
                    conditions: conditions
                },
                prototypes: prototypes,
                allowNullInstance: true
            };
            
        } else {
            
            instantiatorPrototype = {
                'class': Amm.Instantiator.Proto,
                proto: defaultPrototype,
            };
            
        }
                
        if (this._instantiatorOptions) {
            instantiatorPrototype = Amm.overrideRecursive(instantiatorPrototype, this._instantiatorOptions);
        }
        this.setInstantiator(Amm.constructInstance(instantiatorPrototype, Amm.Instantiator.Abstract));
    }

};
