/* global Amm */

Amm.Data.Meta = function(options) {
    this._validators = [];
    var o = Amm.override(options || {});
    if ('mapper' in o) {
        this.setMapper(o.mapper);
        delete o.mapper;
    }
    this._i = true;
    Amm.init(this, o);
    this._i = false;
    this._notify();
};

Amm.Data.Meta._afterPropChange = function(value, oldValue, propName) {
    this._notify(value, oldValue, propName);
};

Amm.Data.Meta.prototype = {
    
    'Amm.Data.Meta': '__CLASS__',
    
    _i: null,
    
    _mapper: null,
    
    _required: null,

    _validators: null,
    
    _requiredValidator: null,

    _label: null,

    _description: null,
    
    _name: null,
    
    _notify: function(value, oldValue, prop) {
        if (this._mapper && this._name) {
            this._mapper.notifyMetaChange(this, this._name, prop, value, oldValue);
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

    setMapper: function (mapper) {
        if (mapper === this._mapper) return;
        if (mapper) {
            if (this._mapper) throw Error("Can setMapper() only once");
            Amm.is(mapper, Amm.Data.Mapper, 'mapper');
        } else {
            mapper = null;
        }
        this._mapper = mapper;
    },
    
    getMapper: function() {
        return this.mapper;
    },
    
    setValidators: function(validators) {
        if (this._validators === validators) return;
        var oldValidators = this._validators;
        if (!(validators instanceof Array)) validators = validators? [validators]: [];
        var newValidators = Amm.Data.Mapper.checkValidatorsArray(validators, 'validators');
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
            after: Amm.Data.Meta._afterPropChange
        }, true);
    }
    
};
    
Amm.createProperty(Amm.Data.Meta.prototype, 'name', null, {
    before: function(name, oldName) {
        if (oldName !== null) {
            throw Error("Can setName() only once");
        }
    },
    after: Amm.Data.Meta._afterPropChange
}, true);

Amm.createProperty(Amm.Data.Meta.prototype, 'required', null, {
    before: function(required) {
        return !!required;
    },
    after: function(value, oldValue, propName) {
        Amm.Data.Meta._afterPropChange.call(this, value, oldValue, propName);
    }
}, true);

Amm.createProperty(
    Amm.Data.Meta.prototype, 'label', null, Amm.Data.Meta._afterPropChange, true
);

Amm.createProperty(
    Amm.Data.Meta.prototype, 'description', null, Amm.Data.Meta._afterPropChange, true
);
