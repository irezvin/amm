/* global Amm */

var MemStor = function(options) {
    this._records = [];
    this.log = [];
    var load = !!options.load;
    delete options.load;
    Amm.init(this, options);
    if (load) this.load();
};

MemStor.prototype = {

    /**
     * @type {object}
     */
    metaProps: null,
    
    /**
     * Default data in case nothing can be loaded
     * @type {object}
     */
    def: null,

    /**
     * @type {function}
     */            
    recordOnCheck: null, 

    primaryKey: null,

    // set to TRUE for autoinc PK
    autoInc: false, 

    /**
     * @type {Array}
     */
    uniqueIndexes: null,

    localStorageKey: null,
    
    lastFoundRows: 0,
    
    autoSave: false,
    
    /**
     * Httpis requests log
     * @type Array
     */
    log: null,

    _records: null,

    _ai: 0,
    
    _method: null,
    
    _uri: null,
    
    _headers: null,

    get: function(pk) {
        if (!this.primaryKey) throw Error("Cannot load: MemStor.primaryKey not set");
        var kv = {};
        kv[this.primaryKey] = pk;
        var r = this.find(kv, null, 0, 1);
        if (r.length) return r[0];
        return null;
    },

    is: function(record, keyVals) {
        var keyVals = this._kv(keyVals);
        var res = true;
        for (var prop in keyVals) if (keyVals.hasOwnProperty(prop)) {
            var val = Amm.getProperty(record, prop);
            res = res && Amm.MultiObserver.Filter.Condition.testValue(val, keyVals[prop]);
            if (!res) return false;
        }
        return true;
    },

    find: function(keyVals, sort, offset, limit) {
        var found = [];
        if (keyVals) {
            for (var i = 0, l = this._records.length; i < l; i++) {
                if (this.is(this._records[i], keyVals)) found.push(this._records[i]);
            }
        } else {
            found = this._records.slice();
        }
        this.lastFoundRows = found;
        if (sort) {
            if (sort === 'rand()') found.sort(function() { return Math.random()*10 - 5; });
            found = this._sort(sort, found);
        }
        if (offset || limit) {
            if (!limit) found = found.slice(offset);
            else found = found.slice(offset || 0, (offset || 0) + limit);
        }
        var t = this;
        found.getData = this._getData;
        return found;
    },

    create: function(data) {
        var rec = this._new(data);
        if (this.autoInc && !rec[this.primaryKey]) rec[this.primaryKey] = this._ai + 1;
        return this._coreStore(rec, true);
    },

    update: function(keyVals, data) {
        var recs = this.find(keyVals);
        if (!recs.length) throw Error("Cannot locate record specified by " + JSON.stringify(keyVals));
        if (recs.length > 1) throw Error("Keyvals " + JSON.stringify(keyVals) + " specify more than one record");
        var rec = recs[0];
        var oldData = rec.mm.getData();
        rec.mm.update(data);
        res = this._coreStore(rec);
        if (res.success) rec.mm.hydrate(rec.mm.getData());
        else rec.mm.hydrate(oldData);
        return res;
    },
    
    _coreStore: function(rec, add) {
        var res = {
            success: false,
            errors: null
        };
        if (!rec.mm.check()) res.errors = rec.mm.getErrors();
        else {
            var unique = this._checkUnique(rec);
            if (unique) {
                if (!res.errors) res.errors = {};
                res.errors.unique = unique;
            }
        }
        if (!res.errors) {
            res.success = true;
            if (add) this._records.push(rec);
            if (this.autoInc && this.primaryKey) {
                var aiValue = parseInt(rec[this.primaryKey]);
                if (!isNaN(aiValue) && aiValue > this._ai) this._ai = aiValue;
            }
            if (this.autoSave && this.localStorageKey) this.save();
        }
        res.record = rec.mm.getData();
        return res;
    },

    remove: function(keyVals) {
        var recs = this.find(keyVals);
        var res = {
            found: recs.length
        };
        this._records = Amm.Array.diff(this._records, recs);
        Amm.cleanup(recs);
        if (this.autoSave && this.localStorageKey) this.save();
        return res;
    },
    
    save: function() {
        if (!this.localStorageKey) throw Error("cannot save(): localStorageKey not set");
        localStorage.setItem(this.localStorageKey, JSON.stringify(this._getPresistentData()));
    },
    
    load: function(def) {
        var content;
        def = def || this.def;
        if (this.localStorageKey) {
            content = localStorage.getItem(this.localStorageKey) || def;
        } else if (def) {
            content = def;
        } else {
            throw Error("cannot load(): localStorageKey not set and def not provided");
        }
        if (!content) return false;
        this._setPersistentData(content);
        return true;
    },
    
    _getData: function(fields) {
        var res = [];
        for (var i = 0, l = this.length; i < l; i++) {
            if (!fields) res.push(this[i].mm.getData());
            else res.push(Amm.getProperty(this[i], fields));
        }
        return res;
    },
    
    getDataOf(recs, fields) {
        return this._getData.call(recs, fields);
    },
    
    _checkUnique: function(rec) {
        var indexes = this._idx(rec);
        for (var i = 0, l = indexes.length; i < l; i++) {
            var matches = this.find(indexes[i]);
            if (!matches.length) continue;
            for (var j = 0, ll = matches.length; j < ll; j++) {
                if (matches[j] === rec) continue;
                return "Record specified by unique index " + JSON.stringify(indexes[j]) + " already exists";
            }
        }
    },
    
    _idx: function(rec) {
        var res = [];
        if (this.primaryKey) res.push(Amm.getProperty(rec, [this.primaryKey]));
        for (var i = 0, l = this.uniqueIndexes.length; i < l; i++) {
            var idx = this.uniqueIndexes[i];
            if (!(idx instanceof Array)) idx = [idx];
            var idxVal = Amm.getProperty(rec, idx);
            var indexComplete = true;
            for (var field in idxVal) if (idxVal.hasOwnProperty(field)) {
                if (idxVal[field] === null || idxVal[field] === undefined) {
                    indexComplete = false;
                    break;
                }
            }
            if (!indexComplete) continue;
            res.push(idxVal);
        }
        return res;
    },

    _kv: function(keyVals) {
        if (typeof keyVals !== 'object') {
            if (!this.primaryKey) {
                throw Error("Cannot use single value as keyVals: MemStor.primaryKey not set");
            }
            var res = {};
            res[this.primaryKey] = keyVals;
            return res;
        }
        return keyVals;
    },

    _new: function(data, hydrate) {
        var r = new Amm.Data.Model({
            mm: { meta: this.metaProps }
        });
        if (this.recordOnCheck) r._doOnCheck = this.recordOnCheck;
        if (data) {
            if (hydrate) r.mm.hydrate(data);
            else r.mm.update(data);
        }
        return r;
    },

    _sort: function(fieldsAscDesc, data) {
        if (typeof fieldsAscDesc !== 'object') fieldsAscDesc = [fieldsAscDesc];
        if (fieldsAscDesc instanceof Array) {
            var nFad = {};
            for (var i = 0, l = fieldsAscDesc.length; i < l; i++) {
                nFad[fieldsAscDesc[i]] = 1;
            }
            fieldsAscDesc = nFad;
        }
        var d = (data || this._records).slice();
        d.sort(function(a, b) {
            var res = 0;
            for (var i in fieldsAscDesc) if (fieldsAscDesc.hasOwnProperty(i)) {
                var field = i, asc = !!fieldsAscDesc[i];
                var aVal = a[field], bVal = b[field];
                if (aVal < bVal) res = -1;
                if (aVal > bVal) res = 1;
                if (!asc) res = -res;
                if (res) return res;
            }
            return res;
        });
        return d;
    },

    _getPresistentData: function() {
        var res = {
            autoInc: this._ai,
            records: []
        };
        for (var i = 0, l = this._records.length; i < l; i++) {
            res.records.push(this._records[i].mm.getData());
        }
        return res;
    },
    
    _setPersistentData: function(data) {
        if (typeof data === 'function') data = data();
        if (typeof data === 'string') data = JSON.parse(data);
        if (data instanceof Array) {
            data = {
                autoInc: null,
                records: data
            };
        }
        this._ai = data.autoInc || 0;
        Amm.cleanup(this._records);
        this._records = [];
        var srcData = data.records || [];
        for (var i = 0, l = srcData.length; i < l; i++) {
            this._records.push(this._new(srcData[i], true));
            if (this.autoInc && this.primaryKey) {
                var pk = parseInt(srcData[i][this.primaryKey]);
                if (!isNaN(pk) && pk > this._ai) this._ai = pk;
            }
        }
    },

    
    createDebugTransport: function(logRequests) {
        var t = this;
        var res = new Amm.Remote.Transport.Debug({
            on__request: [
                function(runningRequest, success, failure) {
                    var httpCode = 200;
                    var errorMessage;
                    var constRequest = runningRequest.getConstRequest();
                    try {
                        
                        var response = this.handleRequest(
                            constRequest.getMethod(),
                            constRequest.getUri(),
                            constRequest.getData(),
                            constRequest.getHeaders()
                        );
                        success(response, "OK");
                    } catch (e) {
                        httpCode = e.httpCode || 500;
                        errorMessage = e.message || ('' + e);
                    }
                    if (errorMessage || httpCode >= 400) {
                        failure("ERROR", errorMessage, httpCode);
                    }
                },
                this
            ]
        });
        Amm.createProperty(res, 'memStor', this, null, true);
        return res;
    },
    
    createError: function(description, httpCode) {
        var res = Error(description);
        if (httpCode) res.httpCode = httpCode;
        return res;
    },
    
    _throw: function(description, httpCode) {
        var e = this.createError(description, httpCode);
        console.error(description, e);
        throw e;
    },
    
    handleRequest: function(method, uri, data, headers) {
        this.log.push([method, uri, data, headers]);
        if (method !== undefined) this._method = method;
        if (headers !== undefined) this._headers = headers;
        this._uri = new Amm.Remote.Uri(uri);
        var args = this._uri.getUri('QUERY');
        var path = this._uri.getUri('PATH');
        path = path.replace(/(^\/+|\/+$)/g, '').split('/');
        var action = path[0] || args['action'] || '';
        var fn = 'action' + Amm.ucFirst(action);
        if (!this[fn]) this._throw("No such method: '" + action + "'", 400);
        var decodedData = this._decodeData(data || null);
        console.log('MemStor.handleRequest', action, ':', method, uri, decodedData, headers);
        return this[fn](decodedData);
    },
    
    _param: function(name, def) {
        var res = this._uri.getUri(name);
        if (res !== undefined) return res;
        if (def !== undefined) return def;
        this._throw("Required argument '" + name + "' not provided", 400);
    },
    
    _decodeData: function(data) {
        // cannot decode multi-part form/data at the moment
        if (typeof data === 'object') return data;
        if (typeof data === 'string' && (data[0] === '{' || data[0] === '"' || data[0] === '[')) {
            try {
                return JSON.parse(data);
            } catch(e) {
            }
        }
        data = Amm.Remote.Uri._parseQuery(data);
        return data;
    },
    
    actionCreate: function(data) {
        if (this._method === 'GET') throw "Cannot use GET method to create record";
        return this.create(data);
    },
    
    actionUpdate: function(data) {
        if (this._method === 'GET') throw "Cannot use GET method to update record";
        if (!this.primaryKey) throw "Cannot update w/o primaryKey";
        var keyVals = {};
        var key = this._param(this.primaryKey, false);
        if (key) keyVals[this.primaryKey] = key;
        else keyVals[this.primaryKey] = this._param('key');
        return this.update(keyVals, data);
    },
    
    actionDelete: function(data) {
        if (this._method === 'GET') throw "Cannot use GET method to delete record";
        if (!this.primaryKey) throw "Cannot delete w/o primaryKey";
        var keyVals = {};
        var key = this._param(this.primaryKey, false);
        if (key) keyVals[this.primaryKey] = key;
        else keyVals[this.primaryKey] = this._param('key');
        return this.remove(keyVals);
    },
    
    actionList: function(data) {
        var offset = this._param('offset', null);
        if (offset) {
            offset = parseInt(offset);
            if (isNaN(offset)) this._throw("'offset' must be a number", 400);
        }
        var limit = this._param('limit', null);
        if (limit) {
            limit = parseInt(limit);
            if (isNaN(limit)) this._throw("'limit' must be a number", 400);
        }
        var filter = this._param('filter', null);
        var sort = this._param('sort', null);
        var fields  = this._param('fields', null);
        var items = this.find(filter, sort, offset, limit);
        return {
            lastFoundRows: this.lastFoundRows.length,
            records: items.getData(fields)
        };
    }
    
};
