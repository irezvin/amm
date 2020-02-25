/* global Amm */

Amm.Data.Mapper = function(options) {
    Amm.WithEvents.call(this, options);
};

Amm.Data.Mapper.instances = {};

Amm.Data.Mapper.get = function(id, dontThrow) {
    if (this.instances[id] || dontThrow) return this.instances[id] || null;
    throw Error ("No such mapper: '" + id + "'");
};

Amm.Data.Mapper.transactionDefault = null;

Amm.Data.Mapper.prototype = {

    'Amm.Data.Mapper': '__CLASS__',
    
    _id: null,

    /**
     * Key field (if one) or key fields (if many)
     * @type string|array
     */
    _key: 'id',
    
    _objectPrototype: null,
    
    /**
     * Name or constructor of objects that are created by this mapper or associated with it.
     * Is used by Amm.Data.Mapper::construct(), also checked when Amm.Data.Object accepts __mapper.
     * 
     * @type string|function
     */
    _objectClass: null,
    
    /**
     * @type {Amm.Data.Interface}
     */
    _interface: null,
    
    _transactionPrototypes: null,
    
    /**
     * includes field validators gathered from the metadata
     */
    _allFieldValidators: null,
    
    _fieldValidators: null,
    
    _commonValidators: null,
    
    _uri: null,
    
    requireLoadDataNotEmpty: true,
    
    requireLoadDataHasKey: true,
    
    requireCreateDataHasKey: true,
    
    partialHydrateOnCreate: true,
    
    partialHydrateOnUpdate: true,
    
    setId: function(id) {
        if (typeof id !== 'string' || !id) throw Error("`id` must be a non-empty string");
        var oldId = this._id;
        if (oldId === id) return;
        if (oldId !== null) throw Error("Can setId() only once");
        if (Amm.Data.Mapper.instances[id]) throw Error("Mapper with id '" + id + "' already registered");
        this._id = id;
        return true;
    },

    getId: function() { return this._id; },

    setObjectPrototype: function(objectPrototype) {
        if (!objectPrototype) objectPrototype = {};
        var oldObjectPrototype = this._objectPrototype;
        if (oldObjectPrototype === objectPrototype) return;
        if (oldObjectPrototype !== null) throw Error("can setObjectPrototype() only once");
        this._objectPrototype = objectPrototype;
        this.outObjectPrototypeChange(objectPrototype, oldObjectPrototype);
        return true;
    },

    getObjectPrototype: function() { return this._objectPrototype? Amm.override({}, this._objectPrototype) : {}; },
    
    setKey: function(key) {
        var oldKey = this._key;
        if (oldKey === key) return;
        this._key = key;
        return true;
    },

    getKey: function() { return this._key; },
    
    setObjectClass: function(objectClass) {
        var oldObjectClass = this._objectClass;
        if (oldObjectClass === objectClass) return;
        if (oldObjectClass !== objectClass) throw Error("can setObjectClass() only once");
        this._objectClass = objectClass;
        return true;
    },

    getObjectClass: function() { return this._objectClass; },
    
    construct: function(objectOrArray) {
        if (!objectOrArray || typeof objectOrArray !== 'object')
            throw Error("`objectOrArray` must be an object");
        
        if (objectOrArray instanceof Array || objectOrArray['Amm.Array']) {
            var res = [];
            for (var i = 0, l = objectOrArray.length; i < l; i++) {
                res.push(this.construct(objectOrArray[i]));
            }
            return res;
        }
        if (Amm.getClass(objectOrArray)) throw Error("`objectOrArray` must have no class");
        var cl = this.getObjectClass() || Amm.Data.Object, constructor = Amm.getFunction(cl);
        var proto = Amm.override({}, objectOrArray);
        proto._mapper = this;
        return new constructor (proto);
    },

    setInterface: function(interface) {
        var oldInterface = this._interface;
        if (oldInterface === interface) return;
        this._interface = interface;
        return true;
    },

    getInterface: function() { return this._interface; },
    
    setFieldValidators: function(fieldValidators) {
        if (typeof fieldValidators !== 'object') {
            throw Error("fieldValidators must be an object or null");
        }
        this._allFieldValidators = null;
        this._fieldValidators = this._checkValidatorsHash(fieldValidators, 'fieldValidators');
        return true;
    },
    
    _combineFieldValidators: function() {
        // TODO: combine with metadata
        this._allFieldValidators = this._fieldValidators || {};
    },

    getFieldValidators: function(includeMeta) { 
        if (!includeMeta) return this._fieldValidators || {};
        if (!this._allFieldValidators) this._combineFieldValidators();
        return this._allFieldValidators;
    },
    
    _checkValidatorsHash: function(validators, name) {
        if (!validators) return {};
        var res = {}, validatorsArray;
        for (var i in validators) if (validators.hasOwnProperty(i)) {
            validatorsArray = validators[i];
            if (!validatorsArray) continue;
            if (!(validatorsArray instanceof Array)) validatorsArray = [validatorsArray];
            if (!validatorsArray.length) continue;
            res[i] = this._checkValidatorsArray(validatorsArray, name + "['" + i + "']");
        }
        return res;
    },
    
    _checkValidatorsArray: function(validators, name) {
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
    },

    setCommonValidators: function(commonValidators) {
        if (typeof commonValidators !== 'object') {
            throw Error("commonValidators must be an object or null");
        }
        this._commonValidators = this._checkValidatorsHash(commonValidators, 'commonValidators');
        return true;
    },

    getCommonValidators: function() {
        return this._commonValidators; 
    },

    setUri: function(uri) {
        var oldUri = this._uri;
        if (oldUri === uri) return;
        this._uri = uri;
        return true;
    },

    getUri: function() { return this._uri; },
    
    setTransactionPrototypes: function(transactionPrototypes) {
        if (typeof transactionPrototypes !== 'object') {
            throw Error("transactionPrototypes must be an object or null");
        }
        var oldTransactionPrototypes = this._transactionPrototypes;
        if (oldTransactionPrototypes === transactionPrototypes) return;
        this._transactionPrototypes = transactionPrototypes;
        return true;
    },

    getTransactionPrototypes: function() { return this._transactionPrototypes; },
    
    createTransaction: function(type, key, data) {
        var prototypes = this._transactionPrototypes || {};
        var globalDefault = Amm.Data.Mapper.transactionDefault? Amm.override({}, Amm.Data.Mapper.transactionDefault) : {};
        var proto = prototypes.default? Amm.overrideRecursive(globalDefault, prototypes.default) : {};
        if (prototypes[type]) {
            if (prototypes[type].noDefault) proto = Amm.override({}, prototypes[type]);
            else proto = Amm.overrideRecursive(prototypes[type], proto);
        }
        if (!proto.class) proto.class = 'Amm.Data.HttpTransaction';
        if (!proto.uri && this._uri) proto.uri = this._uri;
        var res = Amm.constructInstance(proto, 'Amm.Data.Transaction', {type: type, key: key || null, data: data || null});
        res.subscribe('validateResult', this._validateTransactionResult, this);
        return res;
    },
    
    extractKey: function(data) {
        var k = this._key;
        if (!(k instanceof Array)) {
            if (k in data) return data[k];
            return undefined;
        }
        var res = [], i, l = k.length;
        for (var i = 0; i < l; i++) {
            if (k[i] in data) res.push(this.o._old[k[i]]);
            else break;
        }
        if (res.length === l) return res;
        return undefined;
    },
    
    _validateTransactionResult: function(result, transaction) {
        var data = result.getData() || {};
        if (transaction.getType() === Amm.Data.Transaction.TYPE_LOAD) {
            if (this.requireLoadDataNotEmpty) {
                var isEmpty = true;
                for (var i in data) if (data.hasOwnProperty(i)) {
                    isEmpty = false;
                    break;
                }
                if (isEmpty) throw Error("TYPE_LOAD transaction result contains no data");
            }
            if (this.requireLoadDataHasKey) {
                if (this.extractKey(data) === undefined) {
                    throw Error("Data of TYPE_LOAD transaction result contains no key");
                }
            }
        } else if (transaction.getType() === Amm.Data.Transaction.TYPE_CREATE) {
            if (this.requireCreateDataHasKey) {
                if (this.extractKey(data) === undefined) {
                    throw Error("Data of TYPE_CREATE transaction result contains no key");
                }
            }
        }
        transaction.unsubscribe('validateResult', this._validateTransactionResult, this);
    },
    
};

Amm.extend(Amm.Data.Mapper, Amm.WithEvents);

