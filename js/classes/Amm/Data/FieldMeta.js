/* global Amm */

Amm.Data.FieldMeta = function(options) {
    this._validators = [];
    var o = Amm.override(options || {});
    if ('metaProvider' in o) {
        this.setMetaProvider(o.metaProvider);
        delete o.metaProvider;
    }
    this._i = true;
    Amm.init(this, o, null, function(prop, val) {
        this.setProperty(val, prop);
        return true;
    });
    this._i = false;
    this._notify();
};

Amm.Data.FieldMeta._afterPropChange = function(value, oldValue, propName) {
    this._notify(value, oldValue, propName);
};

Amm.Data.FieldMeta.prototype = {
    
    'Amm.Data.FieldMeta': '__CLASS__',
    
    _i: null,
    
    _metaProvider: null,
    
    _validators: null,
    
    _requiredValidator: null,

    _name: null,
    
    _properties: null,
    
    clone: function(metaProvider, name) {
        var res = new Amm.Data.FieldMeta;
        for (var i in this) {
            var hp = this.hasOwnProperty(i);
            if (hp || Amm.Data.FieldMeta.prototype.hasOwnProperty(i)) {
                if (this[i] instanceof Array) res[i] = [].concat(this[i]);
                res[i] = this[i];
            }
            // clone properties that were created with 'defineProperty'
            if (hp && typeof this[i] === 'function' && i.slice(0, 3) === 'set') {
                var gtr, pn;
                if (typeof this[gtr = 'get' + (pn = i.slice(3))] === 'function') {
                    pn[0] = pn[0].toLowerCase();
                    Object.defineProperty(res, pn, {
                        enumerable: true,
                        set: this[i],
                        get: this[gtr]
                    });
                }
            }
        }
        res._metaProvider = null;
        if (name) res._name = name;
        if (metaProvider) res.setMetaProvider(metaProvider);
        return res;
    },
    
    _notify: function(value, oldValue, prop) {
        if (this._metaProvider && this._name) {
            this._metaProvider.notifyMetaChange(this, this._name, prop, value, oldValue);
        }
    },

    setName: function(name) {
        var oldName = this._name;
        if (oldName === name) return;
        if (this._name !== null) throw Error("Can setName() only once");
        this._name = name;
        this._notify(name, oldName, 'name');
        return true;
    },

    getName: function() { return this._name; },

    setMetaProvider: function (metaProvider) {
        if (metaProvider === this._metaProvider) return;
        if (metaProvider) {
            if (this._metaProvider) throw Error("Can setMetaProvider() only once");
            Amm.is(metaProvider, 'MetaProvider', 'metaProvider');
        } else {
            metaProvider = null;
        }
        this._metaProvider = metaProvider;
    },
    
    getMetaProvider: function() {
        return this.metaProvider;
    },
    
    setValidators: function(validators) {
        if (this._validators === validators) return;
        var oldValidators = this._validators;
        if (!(validators instanceof Array)) validators = validators? [validators]: [];
        var newValidators = Amm.Data.MetaProvider.checkValidatorsArray(validators, 'validators');
        this._validators = newValidators;
        this._notify(this._validators, oldValidators, 'validators');
    },
    
    getValidators: function() {
        return [].concat(this._validators);
    },
    
    setProperty: function(value, property) {
        if (property[0] === '_') {
            throw Error("Cannot set pseudo-private property");
        }
        if (!(property in this)) {
            this.defineProperty(property);
        }
        this[property] = value;
    },
    
    getProperty: function(property) {
        if (property[0] === '_') {
            throw Error("Cannot return pseudo-private property");
        }
        if (property in this) return this[property];
    },
    
    defineProperty: function(property, defaultValue, beforeChange) {
        Amm.createProperty(this, property, defaultValue, {
            before: beforeChange, 
            after: Amm.Data.FieldMeta._afterPropChange
        }, true);
    }
    
};
    
Amm.createProperty(Amm.Data.FieldMeta.prototype, 'name', null, {
    before: function(name, oldName) {
        if (oldName !== null) {
            throw Error("Can setName() only once");
        }
    },
    after: Amm.Data.FieldMeta._afterPropChange
}, true);

Amm.createProperty(Amm.Data.FieldMeta.prototype, 'required', null, {
    before: function(required) {
        return !!required;
    },
    after: function(value, oldValue, propName) {
        Amm.Data.FieldMeta._afterPropChange.call(this, value, oldValue, propName);
    }
}, true);

Amm.createProperty(Amm.Data.FieldMeta.prototype, 'set', null, {
    before: function(value) {
        if (!value) value = null;
        else if (typeof value !== 'function') {
            throw Error("'set' meta-property value be a function or null");
        }
        return value;
    }
}, true);

Amm.createProperty(Amm.Data.FieldMeta.prototype, 'compute', null, {
    before: function(value) {
        if (!value) value = null;
        else if (typeof value !== 'function') {
            throw Error("'compute' meta-property  must be a function or null");
        }
        return value;
    }
}, true);

Amm.createProperty(Amm.Data.FieldMeta.prototype, 'change', null, {
    before: function(value) {
        if (!value) value = null;
        else if (typeof value !== 'function') {
            throw Error("'change' meta-property must be a function or null");
                }
        return value;
    }
}, true);

Amm.createProperty(
    Amm.Data.FieldMeta.prototype, 'def', null, Amm.Data.FieldMeta._afterPropChange, true
);

Amm.createProperty(
    Amm.Data.FieldMeta.prototype, 'label', null, Amm.Data.FieldMeta._afterPropChange, true
);

Amm.createProperty(
    Amm.Data.FieldMeta.prototype, 'validators', null, null, true
);

Amm.createProperty(
    Amm.Data.FieldMeta.prototype, 'description', null, Amm.Data.FieldMeta._afterPropChange, true
);
