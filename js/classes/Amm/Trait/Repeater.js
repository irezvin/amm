/* global Amm */

Amm.Trait.Repeater = function() {
};

Amm.Trait.Repeater.prototype = {

    Repeater: '__INTERFACE__',
    
    InstantiatorOrRepeater: '__INTERFACE__',
    
    _useFilter: true,
    
    _arrayMapperOptions: null,
    
    _reportedInstantiatorOptions: null,
    
    _withVariantsView: false,

    _assocProperty: null,

    _revAssocProperty: null,
    
    _repeaterItems: null,
    
    __augment: function(traitInstance, options) {
        
        // provide options.withVariantsView = TRUE to avoid creating ArrayMapper before Amm.View.Variants is available
        // this is an UGLY hack. whole idea with VIEW containing part of ArrayMapper prototype is STUPID, it souhld be resolved in BUILD TIME
        
        if (typeof options === 'object' && options && 'withVariantsView' in options) {
            this._withVariantsView = !!options.withVariantsView;
            delete options.withVariantsView;
        }
        
        Amm.Element.regInit(this, '99.Amm.Trait.Repeater', function() {        
            if (this['DisplayParent'] !== '__INTERFACE__') throw Error("Repeater must be also a DisplayParent");
        });
        
        if ('items' in options) { // we set items at the very end
            var items = options.items;
            Amm.Element.regInit(this, '99.Amm.Trait.Repeater.setItems', function() {
                this.setItems(items);
            });
            delete options.items;
        }
        
        if (options && options.initialInstantiatorOptions) {
            this._reportedInstantiatorOptions = options.initialInstantiatorOptions;
            delete options.initialInstantiatorOptions;
        }
        
    },
    
    setItems: function(items) {
        if (!items) items = [];
        else if (!(items instanceof Array) && !items['Amm.Array']) items = [items];
        if (this._withVariantsView && !this._arrayMapper) this._repeaterItems = items;
        else this.getArrayMapper().setSrc(items);
    },
    
    getItems: function() {
        return this.getArrayMapper().getSrc();
    },
    
    outItemsChange: function(items, oldItems) {
        return this._out('itemsChange', items, oldItems);
    },
    
    _handleArrayMapperSrcChange: function(src, oldSrc) {
        this.outItemsChange(src, oldSrc);
    },
    
    getArrayMapper: function() {
        if (!this._arrayMapper) {
            this._createArrayMapper();
        }
        return this._arrayMapper;
    },
    
    setArrayMapper: function(arrayMapper) {
        // do nothing
        console.warn('Amm.Trait.Repeater: setArrayMapper() isn\'t supported; use setArrayMapperOptions() instead');
    },
    
    outArrayMapperChange: function(arrayMapper, oldArrayMapper) {
        return this._out('arrayMapperChange', arrayMapper, oldArrayMapper);
    },
    
    _createArrayMapper: function() {
        var old = this._arrayMapper, items;
        this.displayChildren.setCleanupOnDissociate(true); // didn't find the better place
        if (old) {
            items = old.getSrcIsOwn()? old.getSrc().getItems() : old.getSrc();
            old.cleanup();
        }
        var arrayMapperConfig = this._calcArrayMapperOptions.apply(this, this._reportedInstantiatorOptions || []);
        if (items) arrayMapperConfig.src = items;
        else if (this._repeaterItems) {
            arrayMapperConfig.src = this._repeaterItems;
            this._repeaterItems = null;
        }
        if (this._arrayMapperOptions) arrayMapperConfig = Amm.overrideRecursive(arrayMapperConfig, this._arrayMapperOptions);
        var arrayMapper = Amm.constructInstance(arrayMapperConfig, Amm.ArrayMapper);
        this._arrayMapper = arrayMapper;
        this.outArrayMapperChange(this._arrayMapper, old);
    },
    
    _calcArrayMapperOptions: function(defaultPrototype, conditions, prototypes) {
        var instantiatorPrototype;
        if ((!conditions || !conditions.length) && defaultPrototype) {
            instantiatorPrototype = {
                'class': Amm.Instantiator.Proto,
                isElement: true,
                proto: defaultPrototype
            };
        } else {
            instantiatorPrototype = {
                'class': Amm.Instantiator.Variants,
                prototypes: prototypes || [],
                defaultPrototype: defaultPrototype || null
            };
        }
        var res = {
            dest: this.displayChildren,
            filter: {
                'class': Amm.Filter,
                conditions: conditions
            },
            instantiator: instantiatorPrototype
        };
        if (!conditions || !conditions.length) delete res.filter;
        if (this._assocProperty) res.instantiator.assocProperty = this._assocProperty;
        if (this._revAssocProperty) res.instantiator.revAssocProperty = this._revAssocProperty;
        return res;
    },
    
    _cleanup_Repeater: function() {
        this._arrayMapper.cleanup();
    },
    
    setArrayMapperOptions: function(arrayMapperOptions) {
        if (!arrayMapperOptions) arrayMapperOptions = null;
        var oldArrayMapperOptions = this._arrayMapperOptions;
        if (oldArrayMapperOptions === arrayMapperOptions) return;
        this._arrayMapperOptions = arrayMapperOptions;
        if (this._arrayMapper) this._createArrayMapper();
        return true;
    },

    getArrayMapperOptions: function() { return this._arrayMapperOptions; },

    reportInstantiatorOptions: function (defaultPrototype, conditions, prototypes) {
        this._reportedInstantiatorOptions = [defaultPrototype, conditions, prototypes];
        this._createArrayMapper();
    },
    
    setAssocProperty: function(assocProperty) {
        var oldAssocProperty = this._assocProperty;
        if (oldAssocProperty === assocProperty) return;
        this._assocProperty = assocProperty;
        
        // TODO: we can replace instantiator only
        if (this._arrayMapper) this._createArrayMapper();
        return true;
    },

    getAssocProperty: function() { return this._assocProperty; },

    setRevAssocProperty: function(revAssocProperty) {
        var oldRevAssocProperty = this._revAssocProperty;
        if (oldRevAssocProperty === revAssocProperty) return;
        this._revAssocProperty = revAssocProperty;
        
        // TODO: we can replace instantiator only
        if (this._arrayMapper) this._createArrayMapper();
        return true;
    },

    getRevAssocProperty: function() { return this._revAssocProperty; },

};
