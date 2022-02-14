/* global Amm */

Amm.Data.Collection = function(options) {
    
    Amm.Collection.call(this, options);
    
};

Amm.Data.Collection.hydrateMatchingFn = function(myItem, newItem) {
    if (newItem === myItem) return;
    if (newItem instanceof Amm.Data.Model) {
        newItem = newItem.mm.getData();
    }
    var uncommitted = myItem.mm.getState() === Amm.Data.STATE_NEW
        || myItem.mm.getState() === Amm.Data.STATE_EXISTS && myItem.mm.getModified();
    if (uncommitted) {
        if (this._hydrateMode !== Amm.Data.HYDRATE_MERGE && this._preserveUncommitted) {
            return;
        }
    }
    myItem.mm.hydrate(newItem, this._hydrateMode);
};

Amm.Data.Collection.ERR_NOT_A_MODEL = "Amm.Data.Collection can accept only Amm.Data.Model instances";

Amm.Data.Collection.prototype = {

    'Amm.Data.Collection': '__CLASS__',
    
    _anyChange: false,
    
    _preserveUncommitted: false,
    
    _hydrateMode: Amm.Data.HYDRATE_MERGE,
    
    _updateFn: Amm.Data.Collection.hydrateMatchingFn,
    
    _allowUpdate: true,
    
    _ignoreExactMatches: true,

    _numNew: 0,

    _numUncommitted: 0,

    _numWithErrors: 0,

    _oldNumNew: null,

    _oldNumUncommitted: null,

    _oldNumWithErrors: null,
    
    _rejectOnDelete: false,
    
    /**
     * @type Amm.Data.Transaction
     */
    _transaction: null,

    /**
     * @type Amm.Data.Transaction
     */
    _lastTransaction: null,
    
    _multiTransactionOptions: null,
    
    _subscribe: function(item) {
        
        Amm.Collection.prototype._subscribe.call(this, item);
        item.mm.subscribe('anyChange', this._handleItemAnyChange, this);
        item.mm.subscribe('stateChange', this._handleItemStateChange, this);
        
    },
    
    _associate: function(item, index, alsoSubscribe) {
        Amm.Collection.prototype._associate.call(this, item, index, alsoSubscribe);
        if (!item.mm.getCommitted()) this.setNumUncommitted(this._numUncommitted + 1);
        if (item.mm.getState() === Amm.Data.STATE_NEW) this.setNumNew(this._numNew + 1);
        if (item.mm.getErrors(null, true)) this.setNumWithErrors(this._numWithErrors + 1);
        item.mm.subscribe('committedChange', this._handleItemCommittedChange, this);
        item.mm.subscribe('errorsChange', this._handleItemErrorsChange, this);
    },
    
    _dissociate: function(item) {
        item.mm.unsubscribe('committedChange', this._handleItemCommittedChange, this);
        item.mm.unsubscribe('errorsChange', this._handleItemErrorsChange, this);
        if (!item.mm.getCommitted()) this.setNumUncommitted(this._numUncommitted - 1);
        if (item.mm.getState() === Amm.Data.STATE_NEW) this.setNumNew(this._numNew - 1);
        if (item.mm.getErrors(null, true)) this.setNumWithErrors(this._numWithErrors - 1);
        Amm.Collection.prototype._dissociate.call(this, item);
},
    
    _handleItemCommittedChange: function(value) {
        if (!value) this.setNumUncommitted(this._numUncommitted + 1);
        else this.setNumUncommitted(this._numUncommitted - 1);
    },
    
    _handleItemErrorsChange: function(value) {
        if (value) this.setNumWithErrors(this._numWithErrors + 1);
        else this.setNumWithErrors(this._numWithErrors - 1);
    },
    
    _handleItemStateChange: function(state, oldState) {
        if (this._rejectOnDelete && state === Amm.Data.STATE_DELETED) {
            this.reject(Amm.event.origin.m);
        }
        if (oldState === Amm.Data.STATE_NEW) {
            this.setNumNew(this._numNew - 1);
        }
    },
    
    _unsubscribe: function(item) {
        
        Amm.Collection.prototype._unsubscribe.call(this, item);
        item.mm.unsubscribe('anyChange', this._handleItemAnyChange, this);
        item.mm.unsubscribe('stateChange', this._handleItemStateChange, this);
        
    },
    
    _outChain: function(events) {
        
        if (this._noTrigger || this._updateLevel) return;
        Amm.Collection.prototype._outChain.call(this, events);
        this.outAnyChange();
        
    },
    
    _doEndUpdate: function() {
        var old;
        Amm.Collection.prototype._doEndUpdate.call(this);
        if (this._anyChange) this.outAnyChange();
        if (this._oldNumNew !== null) {
            old = this._oldNumNew;
            this._oldNumNew = null;
            if (this._numNew !== old) {
                this.outNumNewChange(this._numNew, old);
            }
        }
        if (this._oldNumWithErrors !== null) {
            old = this._oldNumWithErrors;
            this._oldNumWithErrors = null;
            if (this._numWithErrors !== old) {
                this.outNumWithErrorsChange(this._numWithErrors, old);
            }
        }
        if (this._oldNumUncommitted !== null) {
            old = this._oldNumUncommitted;
            this._oldNumUncommitted = null;
            if (this._numUncommitted !== old) {
                this.outNumUncommittedChange(this._numUncommitted, old);
            }
        }
    },
    
    canAccept: function (item, checkRequirementsOnly, problem) {
        problem = problem || {};
        if (!Amm.is(item, 'Amm.Data.Model')) {
            problem.error = Amm.Data.Collection.ERR_NOT_A_MODEL;
            return !problem.error;
        }
        return Amm.Collection.prototype.canAccept.call(this, item, checkRequirementsOnly, problem);
    },
    
    _handleItemAnyChange: function() {
        this.outAnyChange();
    },
    
    outAnyChange: function() {
        if (this._updateLevel) {
            this._anyChange = true;
            return;
        }
        this._anyChange = false;
        this._out('anyChange');
    },
    
    setPreserveUncommitted: function(preserveUncommitted) {
        preserveUncommitted = !!preserveUncommitted;
        var oldPreserveUncommitted = this._preserveUncommitted;
        if (oldPreserveUncommitted === preserveUncommitted) return;
        this._preserveUncommitted = preserveUncommitted;
        this.outPreserveUncommittedChange(preserveUncommitted, oldPreserveUncommitted);
        return true;
    },

    getPreserveUncommitted: function() { return this._preserveUncommitted; },

    outPreserveUncommittedChange: function(preserveUncommitted, oldPreserveUncommitted) {
        this._out('preserveUncommittedChange', preserveUncommitted, oldPreserveUncommitted);
    },
    
    /**
     * @param {boolean} smartUpdate Updates matching items while leaving their instances,
     *      removes other items
     */
    setItems: function(items, smartUpdate) {
        
        if (smartUpdate === undefined 
            && (this._keyProperty || this._comparisonProperties && this._updateFn)
        ) {
            smartUpdate = true;
        }
        
        if (this._preserveUncommitted) {
            
            var uncom = this.findUncommitted();
            var comparison = null;
            
            if (smartUpdate) {
                comparison = this._comparison;
            }
            
            uncom = Amm.Array.diff(uncom, items, comparison);
            items = [].concat(uncom, items);
        }
        return Amm.Collection.prototype.setItems.call(this, items, smartUpdate);
    },
    
    findUncommitted: function(notInTransaction) {
        var res = [];
        for (var i = 0, l = this.length; i < l; i++) {
            if (notInTransaction && this[i].mm.getTransaction()) continue;
            if (this[i].mm.getCommitted()) continue;
            res.push(this[i]);
        }
        return res;
    },
    
    setHydrateMode: function(hydrateMode) {
        var oldHydrateMode = this._hydrateMode;
        if (oldHydrateMode === hydrateMode) return;
        this._hydrateMode = hydrateMode;
        return true;
    },

    getHydrateMode: function() { return this._hydrateMode; },
    
    setNumUncommitted: function(numUncommitted) {
        var oldNumUncommitted = this._numUncommitted;
        if (oldNumUncommitted === numUncommitted) return;
        this._numUncommitted = numUncommitted;
        if (!this._updateLevel) {
            this.outNumUncommittedChange(numUncommitted, oldNumUncommitted);
        } else {
            if (this._oldNumUncommitted === null) this._oldNumUncommitted = oldNumUncommitted;
        }
        return true;
    },

    getNumUncommitted: function() { return this._numUncommitted; },

    outNumUncommittedChange: function(numUncommitted, oldNumUncommitted) {
        this._out('numUncommittedChange', numUncommitted, oldNumUncommitted);
    },

    setNumNew: function(numNew) {
        var oldNumNew = this._numNew;
        if (oldNumNew === numNew) return;
        this._numNew = numNew;
        if (!this._updateLevel) {
            this.outNumNewChange(numNew, oldNumNew);
        } else {
            if (this._oldNumNew === null) this._oldNumNew = oldNumNew;
        }
        return true;
    },

    getNumNew: function() { return this._numNew; },

    outNumNewChange: function(numNew, oldNumNew) {
        this._out('numNewChange', numNew, oldNumNew);
    },

    setNumWithErrors: function(numWithErrors) {
        var oldNumWithErrors = this._numWithErrors;
        if (oldNumWithErrors === numWithErrors) return;
        this._numWithErrors = numWithErrors;
        if (!this._updateLevel) {
            this.outNumWithErrorsChange(numWithErrors, oldNumWithErrors);
        } else {
            if (this._oldNumWithErrors === null) this._oldNumWithErrors = oldNumWithErrors;
        }
        return true;
    },

    getNumWithErrors: function() { return this._numWithErrors; },

    outNumWithErrorsChange: function(numWithErrors, oldNumWithErrors) {
        this._out('numWithErrorsChange', numWithErrors, oldNumWithErrors);
    },
    
    setRejectOnDelete: function(rejectOnDelete) {
        var oldRejectOnDelete = this._rejectOnDelete;
        if (oldRejectOnDelete === rejectOnDelete) return;
        this._rejectOnDelete = rejectOnDelete;
        this.outRejectOnDeleteChange(rejectOnDelete, oldRejectOnDelete);
        return true;
    },

    getRejectOnDelete: function() { return this._rejectOnDelete; },

    outRejectOnDeleteChange: function(rejectOnDelete, oldRejectOnDelete) {
        this._out('rejectOnDeleteChange', rejectOnDelete, oldRejectOnDelete);
    },
    
    /**
     * May be used to handle 'save' method externally. 
     * 
     * To cancel built-in save() implementation, set 
     * `retHandled.handled` to TRUE, or truncate `items` array.
     * 
     * `items` records' are initially populated by `findUncommitted()`,
     * but may be changed - rest will be saved by built-in routine (only
     * if they have .mm.save() method).
     * 
     * @param {object} retHandled Hash with 'handled' key
     * @param {boolean} noCheck Argument to save()
     * @param {boolean} dontRun Argument to save()
     * @param {Array} items 'Uncommitted' items that will be save'd
     */
    outSave: function(retHandled, noCheck, dontRun, items) {
        if (!retHandled) retHandled = {handled: false};
        return this._out('save', retHandled, noCheck, dontRun, items);
    },
    
    /**
     * Saves uncommitted records which are not currently in transaction.
     * 
     * Locates all uncommitted records without active transaction and calls save() on them
     * (does not check if records are valid prior to calling save()).
     * 
     * Returns array of records save()-d.
     * 
     * @param {boolean} noCheck Argument to pass to records' mm.save() - will try to save with errors
     * @returns {Array}
     */
    save: function(noCheck, dontRun) {
        
        var res = [], transactions = [];
        
        if (!this._numUncommitted && !this._subscribers['save']) return res;
        
        var items = this.findUncommitted(true), 
            retHandled = {handled: false};

        if (this._subscribers['save']) {
            this.outSave(retHandled, noCheck, dontRun, items);
            if (retHandled.handled || !items.length) return items;
        }
        
        var useMultiTransaction = !!this._multiTransactionOptions || this._transaction,
            multiTransaction;
        
        if (useMultiTransaction) {
            if (this._transaction) multiTransaction = this._transaction;
            else multiTransaction = Amm.constructInstance(this._multiTransactionOptions, 'Amm.Data.Transaction.Multi');
        }
        
        if (!items.length) return res;
        this.beginUpdate();
        for (var i = 0, l = items.length; i < l; i++) {
            if (!items[i].mm.save) continue;
            var tr = items[i].mm.save(noCheck, useMultiTransaction || dontRun);
            if (!tr) continue;
            res.push(items[i]);
            transactions.push(tr);
        }
        if (multiTransaction && transactions.length) {
            multiTransaction.add(transactions);
            this._setTransaction(multiTransaction);
            if (!dontRun && multiTransaction.getState() !== Amm.Data.Transaction.STATE_RUNNING) {
                multiTransaction.run();
            }
        }
        this.endUpdate();
        return res;
        
    },
    
    
    /**
     * Reverts uncommitted records which are not currently in transaction.
     * Returns array of affected records.
     * 
     * @param {boolean} rejectNew Whether to reject items with state Amm.Data.STATE_NEW
     * @returns {Array}
     */
    revert: function(rejectNew) {
        var res = [];
        if (!this._numUncommitted) return res;
        var items = this.findUncommitted(true);
        if (!items.length) return res;
        this.beginUpdate();
        for (var i = 0, l = items.length; i < l; i++) {
            res.push(items[i]);
            if (rejectNew && items[i].mm.getState() === Amm.Data.STATE_NEW)
                this.reject(items[i]);
            else items[i].mm.revert();
        }
        this.endUpdate();
        return res;
    },
    
    setTransaction: function() {
        console.warn("Amm.Data.Collection: setTransaction() has no effect");
    },
    
    _setTransaction: function(transaction) {
        if (!transaction) transaction = null;
        else Amm.is(transaction, 'Amm.Data.Transaction', 'transaction');
        var oldTransaction = this._transaction;
        if (oldTransaction === transaction) return;
        if (this._transaction) {
            if (this._transaction.getState() === Amm.Data.Transaction.STATE_RUNNING) {
                throw Error("Cannot start new transaction when old transaction still running");
            }
            this._transaction.unsubscribe(undefined, undefined, this);
            if (this._transaction.getState() === Amm.Data.Transaction.STATE_INIT) {
                this._transaction.cancel();
            }
        }
        this.setLastTransaction(this._transaction);
        this._transaction = transaction;
        if (transaction) {
            transaction.subscribe('stateChange', this._handleTransactionStateChange, this);
        }
        this.outTransactionChange(transaction, oldTransaction);
        return true;
    },
    
    _handleTransactionStateChange: function(state, oldState) {
        var removeTrans = false;
        // TODO: probably we should take action in either case
        if (state === Amm.Data.Transaction.STATE_SUCCESS) {
            removeTrans = true;
        } else if (state === Amm.Data.Transaction.STATE_CANCELLED) {
            removeTrans = true;
        } else if (state === Amm.Data.Transaction.STATE_FAILURE) {
            removeTrans = true;
        }
        if (removeTrans) {
            this._setTransaction(null);
        }
    },

    getTransaction: function() { return this._transaction; },

    outTransactionChange: function(transaction, oldTransaction) {
        this._out('transactionChange', transaction, oldTransaction);
    },

    setLastTransaction: function(lastTransaction) {
        if (!lastTransaction) lastTransaction = null;
        else Amm.is(lastTransaction, 'Amm.Data.Transaction', 'lastTransaction');
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

    setMultiTransactionOptions: function(multiTransactionOptions) {
        if (!multiTransactionOptions) multiTransactionOptions = null;
        else if (typeof multiTransactionOptions !== 'object') {
            throw Error("`multiTransactionOptions` must be an object");
        }
        var oldMultiTransactionOptions = this._multiTransactionOptions;
        if (oldMultiTransactionOptions === multiTransactionOptions) return;
        this._multiTransactionOptions = multiTransactionOptions;
        return true;
    },

    getMultiTransactionOptions: function() { return this._multiTransactionOptions; },
    
};

Amm.extend(Amm.Data.Collection, Amm.Collection);
