/* global Amm */

Amm.Data.MetaProvider = function(options) {
    // set it first so setMeta() will instantiate objects with proper classes
    this._meta = {};
    if (options && 'metaClass' in options) {
        this.metaClass = options.metaClass;
    }
};

Amm.Data.MetaProvider.prototype = {
    
    'MetaProvider': '__INTERFACE__',
    
    metaClass: 'Amm.Data.FieldMeta',
    
    requiredValidatorPrototype: null,
    
    _meta: null,
    
    _combinedMeta: null,
    
    _metaProvider: null,
    
    _requiredValidator: null,
    
    _modelValidators: null,
    
    _metaUpdating: 0,
    
    _metaChanged: false,
    
    setModelValidators: function(modelValidators) {
        if (typeof modelValidators !== 'object') {
            throw Error("modelValidators must be an object or null");
        }
        this._modelValidators = Amm.Data.MetaProvider.checkValidatorsHash(modelValidators, 'modelValidators');
        return true;
    },

    getModelValidators: function(all) {
        if (!all || !this._metaProvider) return this._modelValidators; 
        var res = {};
        if (this._modelValidators) Amm.override(res, this._modelValidators);
        if (this._metaProvider) Amm.override(res, this._metaProvider.getModelValidators(true));
        return res;
    },

    setMetaProvider: function(metaProvider) {
        if (!metaProvider) metaProvider = null;
        var oldMetaProvider = this._metaProvider;
        if (oldMetaProvider === metaProvider) return;
        if (oldMetaProvider) {
            oldMetaProvider.unsubscribe('metaChange', this._handleProviderMetaChange, this);
        }
        this._metaProvider = metaProvider;
        this._combinedMeta = null;
        if (this._metaProvider) {
            this._metaProvider.subscribe('metaChange', this._handleProviderMetaChange, this);
        }
        this.outMetaChange();
        return true;
    },

    getMetaProvider: function() { return this._metaProvider; },
    
    _combineMeta: function() {
        if (this._combinedMeta) return this._combinedMeta;
        if (!this._metaProvider) {
            if (!this._meta) this._meta = {};
            this._combinedMeta = this._meta;
            return this._meta;
        }
        this._combinedMeta = {};
        Amm.override(this._combinedMeta, this._metaProvider.getMeta(), this._meta);
        return this._combinedMeta;
    },
    
    beginUpdateMeta: function() {
        this._metaUpdating++;
    },
    
    endUpdateMeta: function() {
        if (!this._metaUpdating) throw Error("Cannot call endUpdateMeta() without prior call to beginUpdateMeta()");
        this._metaUpdating--;
        if (!this._metaUpdating && this._metaChanged) {
            this._metaChanged = false;
            this.outMetaChange();
        }
    },
    
    
    _createMetas: function(defs, noAssign) {
        var res = {}, i;
        for (i in defs) if (defs.hasOwnProperty(i)) {
            res[i] = this._createMeta(defs[i], i, true);
        }
        if (noAssign) return res;
        this.beginUpdateMeta();
        this._meta = {};
        for (i in res) if (res.hasOwnProperty(i)) {
            this._assignMeta(res[i], i);
        }
        this.endUpdateMeta();
        return res;
    },
    
    _createMeta: function(definition, name, noAssign) {
        var def = {};
        if (name !== undefined) def.name = name;
        def.metaProvider = this;
        var res = Amm.constructInstance(definition, this.metaClass, def, true);
        name = res.getName();
        if (!noAssign && name) this._assignMeta(res, name);
        return res;
    },
    
    _assignMeta: function(meta, field) {
        if (!this._meta) this._meta = {};
        var old = this._meta[field];
        if (old === meta) return;
        delete this._meta[field];
        if (old) old.setMetaProvider(null); 
        this._meta[field] = meta;
        this.outMetaChange(this._meta, {}, field, undefined, meta, old);
    },
    
    setMeta: function(meta, field, property) {
        // form1: setMeta(meta) -- replace everything
        if (!field) {
            this._createMetas(meta);
            return true;
        }
        if (!property) {
            if (meta) {
                this._createMeta(meta, field);
            } else if (this._meta[field]) { 
                // meta is false -> delete exisiting meta-property
                this._meta[field].setMetaProvider(null);
                delete this._meta[field];
                this.outMetaChange();
            }
            return true;
        }
        var myMeta, providerMeta;
        var myMeta = this._meta[field];
        if (!myMeta && (providerMeta = this._metaProvider.getMeta(field))) {
            // override provider' meta
            this.beginUpdateMeta();
            myMeta = providerMeta.clone(this);
            this._assignMeta(myMeta, field);
            myMeta.setProperty(meta, property);
            this.endUpdateMeta();
            return;
        }
        if (!myMeta) {
            throw Error("Cannot set property of non-existent meta '" + field + "'");
        }
        myMeta.setProperty(meta, property);
    },
    
    getMeta: function(field, property) {
        if (!this._combinedMeta) this._combineMeta();
        if (!field) return Amm.override({}, this._combinedMeta);
        if (!(field in this._combinedMeta)) return undefined;
        if (!property) return this._combinedMeta[field];
        return this._combinedMeta[field][property];
    },
    
    notifyMetaChange: function(meta, field, property, value, oldValue) {
        if (!this._meta || this._meta[field] !== meta) return;
        this.outMetaChange(meta, null, field, property, value, oldValue);
    },
    
    /**
     * oldMeta argument is for compatibility purposes; 
     * always ignored and set to null in every call.
     */
    outMetaChange: function(meta, oldMeta, field, property, value, oldValue) {
        if (!field) { 
            this._combinedMeta = null;
        }
        if (this._metaUpdating) {
            this._metaChanged = true;
            return;
        }
        this._onMetaChange(field, property, value, oldValue);
        return this._out('metaChange', this._combineMeta(), null, field, property, value, oldValue);
    },
    
    _onMetaChange: function(meta, oldMeta, field, property, value, oldValue) {
    },
    
    getRequiredValidator: function() {
        if (this._requiredValidator) return this._requiredValidator;
        var proto = this.requiredValidatorPrototype || Amm.Data.MetaProvider.requiredValidatorPrototype;
        this._requiredValidator = Amm.constructInstance(Amm.override({}, proto), 'Amm.Validator');
        return this._requiredValidator;
    },
    
    getFieldValidators: function(field) {
        var m = this.getMeta(field);
        if (!m) return null;
        var res = [];
        if (m.required) {
            res.push(this.getRequiredValidator());
        }
        var v = m.validators;
        if (v && v.length) res = res.concat(v);
        if (!res.length) return null;
        return res;
    },
    
    _handleProviderMetaChange: function(meta, oldMeta, field, property, value, oldValue) {
        if (!field || !this._meta || !this._meta[field]) {
            this.outMetaChange(meta, oldMeta, field, property, value, oldValue);
        }
    }
    
};

Amm.Data.MetaProvider.checkValidatorsHash = function(validators, name) {
    if (!validators) return {};
    var res = {}, validatorsArray;
    for (var i in validators) if (validators.hasOwnProperty(i)) {
        validatorsArray = validators[i];
        if (!validatorsArray) continue;
        if (!(validatorsArray instanceof Array)) validatorsArray = [validatorsArray];
        if (!validatorsArray.length) continue;
        res[i] = Amm.Data.MetaProvider.checkValidatorsArray(validatorsArray, name + "['" + i + "']");
    }
    return res;
};
    
Amm.Data.MetaProvider.checkValidatorsArray = function(validators, name) {
    var res = [], i, l = validators.length;
    for (i = 0; i < l; i++) {
        var v = validators[i];
        if (typeof v === 'function') {
        } else if (typeof v === 'string') {
            if (Amm.getFunction(v, true)) v = Amm.constructInstance(v, 'Amm.Validator');
            else v = new Amm.Expression(v);
        } else if (v && (typeof v === 'object')) {
            if (v.class) v = Amm.constructInstance(v);
            Amm.meetsRequirements(v, ['Amm.Expression', 'Amm.Validator'], name + '[' + i + ']');
        } else {
            throw new Error("name[" + i + "] must be a function, a string or a non-null object");
        }
        res.push(v);
    }
    return res;
};


Amm.Data.MetaProvider.requiredValidatorPrototype = {
    'class': 'Amm.Validator.Required'
};
