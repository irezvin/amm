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

    _numUncommitted: 0,

    _numWithErrors: 0,
    
    _rejectOnDelete: false,
    
    _subscribe: function(item) {
        
        Amm.Collection.prototype._subscribe.call(this, item);
        item.mm.subscribe('anyChange', this._handleItemAnyChange, this);
        item.mm.subscribe('stateChange', this._handleItemStateChange, this);
        
    },
    
    _associate: function(item, index, alsoSubscribe) {
        Amm.Collection.prototype._associate.call(this, item, index, alsoSubscribe);
        if (!item.mm.getCommitted()) this.setNumUncommitted(this._numUncommitted + 1);
        if (item.mm.getErrors(null, true)) this.setNumWithErrors(this._numWithErrors + 1);
        item.mm.subscribe('committedChange', this._handleItemCommittedChange, this);
        item.mm.subscribe('errorsChange', this._handleItemErrorsChange, this);
    },
    
    _dissociate: function(item) {
        item.mm.unsubscribe('committedChange', this._handleItemCommittedChange, this);
        item.mm.unsubscribe('errorsChange', this._handleItemErrorsChange, this);
        if (!item.mm.getCommitted()) this.setNumUncommitted(this._numUncommitted - 1);
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
    
    _handleItemStateChange: function(state) {
        if (this._rejectOnDelete && state === Amm.Data.STATE_DELETED) {
            this.reject(Amm.event.origin.m);
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
     * Saves uncommitted records which are not currently in transaction.
     * 
     * Locates all uncommitted records without active transaction and calls save() on them
     * (does not check if recordsa are valid prior to calling save()).
     * 
     * Returns array of records save()-d.
     * 
     * @param {boolean} noCheck Argument to pass to records' mm.save() - will try to save with errors
     * @returns {Array}
     */
    save: function(noCheck) {
        var res = [];
        if (!this._numUncommitted) return res;
        var items = this.findUncommitted(true);
        if (!items.length) return res;
        this.beginUpdate();
        for (var i = 0, l = items.length; i < l; i++) {
            if (!items[i].mm.save) continue;
            res.push(items[i]);
            items[i].mm.save(noCheck);
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
    }
    
};

Amm.extend(Amm.Data.Collection, Amm.Collection);
