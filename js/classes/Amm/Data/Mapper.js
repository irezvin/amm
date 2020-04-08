/* global Amm */

Amm.Data.Mapper = function(options) {
    Amm.Data.MetaProvider.call(this, options);
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
    
    _recordPrototype: null,
    
    /**
     * Name or constructor of objects that are created by this mapper or associated with it.
     * Is used by Amm.Data.Mapper::construct(), also checked when Amm.Data.Record accepts __mapper.
     * 
     * @type string|function
     */
    _recordClass: null,
    
    /**
     * @type {Amm.Data.Interface}
     */
    _interface: null,
    
    _transactionPrototypes: null,
    
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

    setRecordPrototype: function(recordPrototype) {
        if (!recordPrototype) recordPrototype = {};
        var oldRecordPrototype = this._recordPrototype;
        if (oldRecordPrototype === recordPrototype) return;
        if (oldRecordPrototype !== null) throw Error("can setRecordPrototype() only once");
        this._recordPrototype = recordPrototype;
        return true;
    },

    getRecordPrototype: function() { return this._recordPrototype? Amm.override({}, this._recordPrototype) : {}; },
    
    setKey: function(key) {
        var oldKey = this._key;
        if (oldKey === key) return;
        this._key = key;
        return true;
    },

    getKey: function() { return this._key; },
    
    setRecordClass: function(recordClass) {
        var oldRecordClass = this._recordClass;
        if (oldRecordClass === recordClass) return;
        if (oldRecordClass !== recordClass) throw Error("can setRecordClass() only once");
        this._recordClass = recordClass;
        return true;
    },

    getRecordClass: function() { return this._recordClass; },
    
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
        var cl = this.getRecordClass() || Amm.Data.Record, constructor = Amm.getFunction(cl);
        var proto = Amm.override({}, objectOrArray);
        proto._mapper = this;
        return new constructor (proto);
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
Amm.extend(Amm.Data.Mapper, Amm.Data.MetaProvider);

