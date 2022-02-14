/* global Amm */

Amm.Data.RecordMeta = function(record, options) {
    Amm.Data.ModelMeta.call(this, record, options);
    this._mapper = record._mapper;
    this.setMetaProvider(this._mapper);
};

Amm.Data.RecordMeta.prototype = {

    'Amm.Data.RecordMeta': '__CLASS__', 
    
    /**
     * @type {Amm.Data.Mapper}
     */
    _mapper: null,
    
    _updateLevel: 0,
    
    getKey: function() {
        var res = this._mapper.extractKey(this._m._old);
        if (res === undefined) res = this._mapper.extractKey(this._m._data);
        return res;
    },
    
    _setTransaction: function(transaction) {
        if (transaction) Amm.is(transaction, 'Amm.Data.Transaction');
        else transaction = null;
        
        var oldTransaction = this._transaction;
        if (oldTransaction === transaction) return;
        
        if (oldTransaction) {
            oldTransaction.unsubscribe(undefined, undefined, this);
            if (oldTransaction.getState() === Amm.Data.Transaction.STATE_INIT
                || oldTransaction.getState() === Amm.Data.Transaction.STATE_RUNNING) {
                oldTransaction.cancel();
                
            }
        }
        if (transaction) transaction.subscribe('stateChange', this._notifyTransactionStateChange, this);
        
        this._transaction = transaction;

        this.outTransactionChange(transaction, oldTransaction);
        if (oldTransaction) this._setLastTransaction(oldTransaction);
        
        return true;
    },

    getTransaction: function() { return this._transaction; },

    outTransactionChange: function(transaction, oldTransaction) {
        this._out('transactionChange', transaction, oldTransaction);
    },
    
    _notifyTransactionStateChange: function(state, oldState) {
        // ignore if we don't track this transaction anymore
        if (!this._transaction || Amm.event.origin !== this._transaction) return;
        if (state === Amm.Data.Transaction.STATE_RUNNING) {
            // don't handle transaction start event
            return;
        }
        if (state === Amm.Data.Transaction.STATE_CANCELLED) { // business as usual
            this._setTransaction(null);
            return;
        }
        
        if (this._handleTransactionFinished(state)) {
            this._setTransaction(null);
        }
    },
    
    _handleTransactionFinished: function(state) {
        
        if (state === Amm.Data.Transaction.STATE_CANCELLED) return true;
        
        var failure = (state === Amm.Data.Transaction.STATE_FAILURE);
        
        if (failure) {
            this._handleGenericTransactionFailure();
            return true;
        }
        
        var success = (state === Amm.Data.Transaction.STATE_SUCCESS);
        
        if (!success) return;
        
        var type = this._transaction.getType() + '';
        
        var method = '_handle' + type[0].toUpperCase() + type.slice(1) + 'Success';
        
        if (typeof this[method] === 'function' ) {
            this[method]();
        }
        
        return true;
        
    },
    
    _hydrateFromTransactionDataAndTrigger: function(forSave, newState, mode) {
        var result = this._transaction.getResult();
        var wasCreated = (this._m._state === Amm.Data.STATE_NEW);
        this.beginUpdate();
        this.setRemoteErrors({});
        var data = result.getData();
        if (data) this.hydrate(data, mode, true);
        if (newState) this.setState(newState);
        if (forSave) {
            this._m._doAfterSave(wasCreated);
        } else {
            this._m._doAfterLoad();
        }
        if (!mode) mode = Amm.Data.HYDRATE_FULL;
        else if (mode === true) mode = Amm.Data.HYDRATE_PARTIAL;
        this._m._doOnActual(forSave, mode);
        this.endUpdate();
    },
    
    _handleGenericTransactionFailure: function() {
        var result = this._transaction.getResult();
        var remoteErrors = result.getErrorData(), tmp, 
                error = result.getError(), exception = result.getException();
        if (!remoteErrors) remoteErrors = {};
        else if (typeof remoteErrors !== 'object') {
            tmp = {};
            tmp[Amm.Data.ERROR_GENERIC] = [remoteErrors];
            remoteErrors = tmp;
        }
        
        var f;
        if (error) {
            if (remoteErrors[Amm.Data.ERROR_GENERIC]) {
                remoteErrors[Amm.Data.ERROR_GENERIC].push(error);
                /*remoteErrors[Amm.Data.ERROR_GENERIC] = Amm.Data.flattenErrors(remoteErrors[Amm.Data.ERROR_GENERIC]);
                if (!remoteErrors[Amm.Data.ERROR_GENERIC] || !remoteErrors[Amm.Data.ERROR_GENERIC].length) {
                    delete remoteErrors[Amm.Data.ERROR_GENERIC];
                }*/
            } else {
                remoteErrors[Amm.Data.ERROR_GENERIC] = [error];
            }
        }
        if (exception) {
            remoteErrors[Amm.Data.ERROR_EXCEPTION] = '' + exception;
        }
        
        this.setRemoteErrors(remoteErrors);
        
        this.outTransactionFailure (this._transaction);
    },
    
    outTransactionFailure: function(transaction) {
        return this._out('transactionFailure', transaction);
    },
    
    _handleCreateSuccess: function() {
        this._hydrateFromTransactionDataAndTrigger(true, Amm.Data.STATE_EXISTS, this._mapper.partialHydrateOnCreate);
    },
    
    _handleDeleteSuccess: function() {
        this.setState(Amm.Data.STATE_DELETED);
        this.setRemoteErrors({});
        this._m._doAfterDelete();
    },
    
    _handleUpdateSuccess: function() {
        this._hydrateFromTransactionDataAndTrigger(true, undefined, this._mapper.partialHydrateOnUpdate);
    },
    
    _handleLoadSuccess: function() {
        this.beginUpdate();
        this._hydrateFromTransactionDataAndTrigger(false, Amm.Data.STATE_EXISTS);
        this.endUpdate();
    },

    _setLastTransaction: function(lastTransaction) {
        if (lastTransaction) Amm.is(lastTransaction, 'Amm.Data.Transaction');
        else lastTransaction = null;
        
        var oldLastTransaction = this._lastTransaction;
        if (oldLastTransaction === lastTransaction) return;
        this._lastTransaction = lastTransaction;
        this.outLastTransactionChange(lastTransaction, oldLastTransaction);
        return true;
    },

    getLastTransaction: function() { return this._lastTransaction; },

    outLastTransactionChange: function(lastTransaction, oldLastTransaction) {
        this._out('lastTransactionChange', lastTransaction, oldLastTransaction);
    },
    
    _getTransactionData: function() {
        return Amm.override({}, this._m._data);
    },
    
    _runTransaction: function(transaction) {
        this._setTransaction(transaction);
        transaction.run();
        if (transaction.getState() === Amm.Data.Transaction.STATE_FAILURE) {
            var x = transaction.getResult().getException();
            if (x) throw x;
        }
    },
    
    save: function(noCheck, dontRun) {
        if (this._transaction && this._transaction.getState() === Amm.Data.Transaction.STATE_RUNNING) {
            throw Error("Cannot save() with current transaction still running");
        }
        if (!noCheck && !this.check()) return;
        if (this._m._doBeforeSave() === false) return;
        if (this.getState() === Amm.Data.STATE_DELETE_INTENT) {
            return this.delete();
        }
        var data = this._getTransactionData(), tr, state = this.getState();
        if (state === Amm.Data.STATE_NEW) {
            tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_CREATE, null, data);
        } else if (state === Amm.Data.STATE_EXISTS) {
            tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_UPDATE, this.getKey(), data);
        } else {
            throw Error("Cannot save an object with state '" + state + "'");
        }
        if (dontRun) this._setTransaction(tr);
        else this._runTransaction(tr);
        return tr;
    },
    
    intentDelete: function() {
        if (this.getState() !== Amm.Data.STATE_EXISTS) {
            throw Error("can intentDelete() only record with getState() == Amm.Data.STATE_EXISTS");
        }
        this.setState(Amm.Data.STATE_DELETE_INTENT);
    },
    
    cancelDeleteIntent: function() {
        if (this.getState() !== Amm.Data.STATE_DELETE_INTENT) return;
        this.setState(Amm.Data.STATE_EXISTS);
    },
    
    revert: function() {
        this.beginUpdate();
        if (this.getState() === Amm.Data.STATE_DELETE_INTENT) {
            this.cancelDeleteIntent();
        }
        Amm.Data.ModelMeta.prototype.revert.call(this);
        this.endUpdate();
    },
    
    delete: function(dontRun) {
        if (this._transaction && this._transaction.getState() === Amm.Data.Transaction.STATE_RUNNING) {
            throw Error("Cannot delete() with current transaction still running");
        }
        var tr, state = this.getState(), key;
        if (state !== Amm.Data.STATE_EXISTS 
            && state !== Amm.Data.STATE_DELETE_INTENT) 
        {
            this.setState(Amm.Data.STATE_DELETED);
            return true;
        }
        if (this._m._doBeforeDelete() === false) return false;
        key = this.getKey();
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_DELETE, this.getKey());
        if (dontRun) this._setTransaction(tr);
        else this._runTransaction(tr);
        return tr;
    },
    
    load: function(key, dontRun) {
        if (this._transaction && this._transaction.getState() === Amm.Data.Transaction.STATE_RUNNING) {
            throw Error("Cannot load() with current transaction still running");
        }
        var newKey = this._m._doBeforeLoad(key);
        if (newKey === false) return false;
        if (newKey !== undefined) key = newKey;
        if (key === undefined || key === null) key = this.getKey();
        if (!key) throw new Error ("Cannot load(): key not provided");
        var tr;
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_LOAD, key);
        if (dontRun) {
            this._setTransaction(tr);
        }
        else this._runTransaction(tr);
        return tr;
    },
    
    cleanup: function() {
        if (this._cu) return;
        this._cu = true;
        if (this._transaction) {
            this._transaction.cleanup();
            this._transaction = null;
        }
        if (this._lastTransaction) {
            this._lastTransaction.cleanup();
            this._lastTransaction = null;
        }
        if (this._mapper) this._mapper.unsubscribe(undefined, undefined, this);
        this._m.cleanup();
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    getMapper: function() {
        return this._mapper;
    },
    
    setMapper: function() {
        // dummy
    },
    
    outMapperChange: function() {
        // dummy
    }
    
    
};

Amm.extend(Amm.Data.RecordMeta, Amm.Data.ModelMeta);
