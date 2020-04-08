/* global Amm */

Amm.Data.ModelMeta = function(model, options) {
    this._m = model;
    Object.defineProperty(this, 'm', {value: model, writable: false});
    Amm.WithEvents.call(this, options);
};

Amm.Data.ModelMeta.prototype = {

    'Amm.Data.ModelMeta': '__CLASS__', 
    
    /**
     * @type {Amm.Data.Record}
     */
    _m: null,
    
    /**
     * @type {Amm.Data.Mapper}
     */
    _mapper: null,
    
    _updateLevel: 0,
    
    _modified: null,
    
    _transaction: null,

    _lastTransaction: null,
    
    _oldState: null,
    
    _checked: false,
    
    _cu: false,
    
    _propertiesChanged: false,
    
    _fieldMeta: null,
    
    _validators: null,
    
    /**
     * Means doOnCheck will occur every time when get*Errors() or, when anything is subscribed
     * to localErrorsChange / errorsChange events, instantly after every change (with respect
     * to updateLevel).
     * 
     * Should be one of Amm.Data.AUTO_CHECK_ constants
     */
    _autoCheck: Amm.Data.AUTO_CHECK_SMART,
    
    /**
     * Means all local errors are reset when object is hydrated w/ STATE_EXISTS
     * and not modified; onCheck() will skip _doOnCheck() in this case too.
     * 
     * @type Boolean
     */ 
    _validWhenHydrated: true,

    getObject: function() { return this._m; },
    
    getO: function() { return this._m; },
    
    hydrate: function(data, partial, noTrigger) {
        this.beginUpdate();
        if (!partial) {
            this._m._old = {};
            this._m._data = {};
        }
        for (var i in data) if (data.hasOwnProperty(i)) {
            this._m._old[i] = data[i];
            this._m._data[i] = data[i];
            if (!this._m._propNames[i]) this._createProperty(i);
        }
        if (this.getKey()) {
            this.setState(Amm.Data.STATE_EXISTS);
            if (!noTrigger) this._m._doOnActual(false);
        } else {
            this.setState(Amm.Data.STATE_NEW);
        }
        this.outHydrate();
        this.endUpdate();
    },
    
    outHydrate: function() {
        return this._out('hydrate');
    },
    
    listDataFields: function() {
        return Amm.keys(this._m._data);
    },
    
    getData: function() {
        return Amm.override({}, this._m._data);
    },
    
    beginUpdate: function() {
        this._updateLevel++;
        if (this._updateLevel > 1) return;
        this._m._preUpdateValues = this.getData();
    },
    
    endUpdate: function() {
        if (!this._updateLevel) 
            throw Error ("Call to endUpdate() without corresponding beginUpdate(); check with getUpdateLevel() first");
        this._updateLevel--;
        if (this._updateLevel) return;
        var pv = this._m._preUpdateValues;
        var v = this._m._data, oldVal, newVal;
        for (var i in pv) if (pv.hasOwnProperty(i)) {
            oldVal = pv[i];
            newVal = v[i];
            delete pv[i];
            if (newVal !== oldVal) this._reportFieldChange(i, newVal, oldVal, true);
            if (this._m._updateLevel) break; // in case event handler done beginUpdate()
        }
        if (this._oldState !== null) {
            if (this._oldState !== this._m.state) {
                var oldState = this._oldState;
                this._oldState = null;
                this.outStateChange(this._m._state, this._oldState);
            }
        }
        this._checkModified();
        if (this._propertiesChanged) {
            this._propertiesChanged = false;
            this.outPropertiesChanged();
        }
        if (this._m._oldErrors !== null) {
            this._endUpdateErrors();
        }
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    _checkFieldModified: function(field) {
        var modified = false;
        if (field in this._m._data) {
            if (!(field in this._m._old) || this._m._old[field] !== this._m._data[field])
            modified = true;
        }
        if (modified !== this._modified) this._checkModified();
    },
    
    _checkModified: function() {
        var modified = false;
        for (var i in this._m._data) if (this._m._data.hasOwnProperty(i)) {
            if (!(i in this._m._old) || this._m._old[i] !== this._m._data[i]) {
                modified = true;
                break;
            }
        }
        this.setModified(modified);
    },
    
    _reportFieldChange: function(field, val, oldVal, dontReportModified) {
        if (this._updateLevel) return;
        
        var propName = this._m._propNames[field];
        var outName = 'out' + propName.charAt(0).toUpperCase() + propName.slice(1) + 'Change';
        
        this._correctCheckStatus(field, val || oldVal);
        
        this._m[outName](val, oldVal);
        if (!dontReportModified) {
            this._checkFieldModified(field);
        }
    },

    setModified: function(modified) {
        var oldModified = this._modified;
        if (oldModified === modified) return;
        this._modified = modified;
        this.outModifiedChange(modified, oldModified);
        if (!this._modified) this._checkHydratedAndValid(true);
        return true;
    },

    getModified: function(field) { 
        if (field) {
            return this._m._old[field] !== this._m._data[field];
        }
        return this._modified;
    },
    
    getOldValue: function(field) {
        return this._m._old[field];
    },

    outModifiedChange: function(modified, oldModified) {
        this._out('modifiedChange', modified, oldModified);
    },
    
    revert: function() {
        this.beginUpdate();
        this._m._data = Amm.override({}, this._m._old);
        this.endUpdate();
    },
    
    isSpecial: function(field) {
        return field in this.constructor.prototype;
    },
    
    getFieldValue: function(field) {
        return this._m._data[field];
    },
    
    setFieldValue: function(field, value) {
        var old = this._m._data[field];
        if (old === value) return;
        this._m._data[field] = value;
        if (this._updateLevel) return;
        this._reportFieldChange(field, value, old);
    },
    
    _createProperty: function(field) {
        if (field in this._m._propNames) throw Error("Amm.Data.Record already has property for field '" + field + "'");
        var propName = field, suff = '';
        while (this.isSpecial(propName)) {
            propName = field + 'Field' + suff;
            suff = (suff || 1) + 1;
        }
        this._m._propNames[field] = propName;
        var sfx = propName.slice(1);
        var u = propName.charAt(0).toUpperCase() + sfx;
        var l = propName.charAt(0).toLowerCase() + sfx;
        var eventName = l + 'Change';
        var outName = 'out' + u + 'Change';
        var setterName = 'set' + u;
        var getterName = 'get' + u;
        
        if (!(getterName in this._m)) {
            this._m[getterName] = function() {
                return this._data[field];
            };
        }
        if (!(setterName in this._m)) {
            this._m[setterName] = function(value) {
                return this.mm.setFieldValue(field, value);
            };
        }
        if (!(outName in this._m)) {
            this._m[outName] = function(value, oldValue) {
                if (this._updateLevel) return;
                return this._out(eventName, value, oldValue);
            };
        }
        Object.defineProperty(this._m, propName, {
            enumerable: true,
            get: this._m[getterName],
            set: this._m[setterName]
        });
        
        // we need to create pre-update values' key so change event will be triggered
        // during endUpdate()
        if (!(field in this._m._preUpdateValues)) {
            this._m._preUpdateValues[field] = undefined;
        }
        
        if (!this._updateLevel) this.outPropertiesChanged();
        else this._propertiesChanged = true;
        
        return propName;
    },
    
    outPropertiesChanged: function() {
        return this._out('propertiesChanged');
    },
    
    getState: function() {
        return this._m._state;
    },
    
    setState: function(state) {
        var oldState = this._m._state;
        if (oldState === state) return;
        if (!Amm.Data.StateEnum[state]) 
            throw Error("`state` must be one of Amm.Data.STATE_ values; given: '" + state + "'");
        this._m._state = state;
        if (!this._updateLevel) {
            this.outStateChange(state, oldState);
            return;
        }
        if (this._oldState === null) {
            this._oldState = oldState;
        }
    },
    
    outStateChange: function(state, oldState) {
        return this._out('stateChange', state, oldState);
    },
    
    _hasLocalErrors: function() {
        if (this._m._errors.local) {
            // fail if we have any local errors
            for (var i in this._m._errors.local) {
                if (this._m._errors.local.hasOwnProperty(i)) return true;
            }
        }
        return false;
    },
    
    check: function(again) {
        if (this._checked && !again) return !this._hasLocalErrors();
        if (this._checkHydratedAndValid(true)) return true;
        this._beginUpdateErrors();
        this._m._errors.local = {};
        this._coreCheckFields();
        this._coreCheckWhole();
        this._m._doOnCheck();
        this._checked = true;
        this._endUpdateErrors();
        return !this._hasLocalErrors();
    },
    
    _coreCheckFields: function(field) {
        // check individual fields first
        var hasFieldCheckFn = this._m._checkField !== Amm.Data.Record.prototype._checkField;
        // everything a-ok
        var fieldsSrc;
        if (field) {
            if (!this._m._propNames[field]) return;
            fieldsSrc = {};
            fieldsSrc[field] = this._m._propNames[field];
        } else {
            fieldsSrc = this._m._propNames;
        }
        var err, i, j, l, v, validators;
        for (i in fieldsSrc) if (fieldsSrc.hasOwnProperty(i)) {
            v = this._m._data[i];
            if (hasFieldCheckFn) {
                err = this._m._checkField(i, v);
                if (err === false) err = Amm.translate("lang.Amm.ModelMeta.invalidFieldValue");
                if (err) {
                    this.addError(err, i);
                }
            }
            
            validators = this.getFieldValidators(i);
            if (!validators) continue;
            if (!(validators instanceof Array)) validators = [validators];
            var label = this.getMeta(i, 'label') || i;
            for (var j = 0, l = validators.length; j < l; j++) {
                if (typeof validators[j] === 'function') {
                    err = validators[j](v, label);
                }
                else if (typeof validators[j].getError === 'function') {
                    err = validators[j].getError(v, label);
                }
                if (err) {
                    err = err.replace(/%field/g, label);
                    // we stop on first error
                    this.addError(err, i);
                    break;
                }
            }
            if (!err) delete this._m._errors.local[i];
        }
    },
    
    _coreCheckWhole: function() {
        var modelValidators = this._mapper.getModelValidators();
        if (!modelValidators) return;
        for (var key in modelValidators) if (modelValidators.hasOwnProperty(key)) {
            var vals = modelValidators[key];
            var error;
            for (var j = 0, l = vals.length; j < l; j++) {
                var val = vals[j];
                if (val['Amm.Expression']) { // check for cached function
                    if (!val.__func) val.__func = val.toFunction();
                    val.__func.env.expressionThis = this._m;
                    error = val.__func();
                }
                else if (val['Amm.Validator']) {
                    error = val.getError(this);
                }
                else if (typeof val === 'function') { // check it is an expression
                    error = val.call(this._m);
                } else {
                    throw Error("modelValidators['" + key + "'] must be either a function, an Amm.Expression or an Amm.Validator; provided: " 
                        + Amm.describeType(modelValidators[key]));
                }
                if (error === false) error = Amm.translate(key);
                if (error) {
                    this.addError(error, key);
                    continue;
                }
            }
        }
    },
    
    setChecked: function(checked) {
        var oldChecked = this._checked;
        if (oldChecked === checked) return;
        this._checked = checked;
        this.outCheckedChange(checked, oldChecked);
        return true;
    },

    getChecked: function() { return this._checked; },

    outCheckedChange: function(checked, oldChecked) {
        this._out('checkedChange', checked, oldChecked);
    },
    
    setAutoCheck: function(autoCheck) {
        if (typeof autoCheck === 'boolean') autoCheck = autoCheck + 0;
        else if (typeof autoCheck === 'string') autoCheck = parseInt(autoCheck);
        if (autoCheck !== Amm.Data.AUTO_CHECK_NEVER && autoCheck !== Amm.Data.AUTO_CHECK_ALWAYS && autoCheck !== Amm.Data.AUTO_CHECK_SMART) {
            throw Error("Invalid autoCheck value; must be one of Amm.Data.AUTO_CHECK_ constants");
        }
        var oldAutoCheck = this._autoCheck;
        if (oldAutoCheck === autoCheck) return;
        this._autoCheck = autoCheck;
        if (autoCheck) this._instaCheck();
        return true;
    },

    getAutoCheck: function() { return this._autoCheck; },

    setValidWhenHydrated: function(validWhenHydrated) {
        var oldValidWhenHydrated = this._validWhenHydrated;
        if (oldValidWhenHydrated === validWhenHydrated) return;
        this._validWhenHydrated = validWhenHydrated;
        if (validWhenHydrated) this._checkHydratedAndValid(true);
        else if (this.getState() === Amm.Data.STATE_EXISTS && !this._modifierd) {
            if (this._autoCheck === Amm.Data.AUTO_CHECK_ALWAYS) {
                this._instaCheck(true);
            } else {
                this.setChecked(false);
            }
        }
        return true;
    },

    getValidWhenHydrated: function() { return this._validWhenHydrated; },
    
    _checkHydratedAndValid: function(resetErrors) {
        if (!this._validWhenHydrated) return;
        if (this._modified || this.getState() !== Amm.Data.STATE_EXISTS) return;
        if (resetErrors) this.setLocalErrors({});
        return true;
    },
    
    _correctCheckStatus: function(field, hasValue) {
        if (this._autoCheck === Amm.Data.AUTO_CHECK_SMART && hasValue) {
            this._beginUpdateErrors();
            this.setChecked(false);
            this._coreCheckFields(field);
            this._endUpdateErrors();
        } else if (this._autoCheck === Amm.Data.AUTO_CHECK_ALWAYS) {
            this._instaCheck(true);
        } else {
            this.setChecked(false);
        }
    },
    
    _instaCheck: function(recheck) {
        if (this._checked && !recheck) return;
        if (!this._autoCheck) return;
        if (recheck) this._checked = false;
        if (!this._subscribers.localErrorsChange && !this._subscribers.errorsChange) return;
        if (this._autoCheck === Amm.Data.AUTO_CHECK_ALWAYS) {
            this.check();
            return;
        }
    },

    _beginUpdateErrors: function() {
        if (!this._subscribers.localErrorsChange && !this._subscribers.remoteErrorsChange && !this._subscribers.errorsChange) {
            this._m._oldErrors = false; // special value means we defer JSON calculation
        }
        if (!this._m._errors) this._m._errors = {local: {}, remote: {}};
        this._combineErrors();
        if (!this._m._oldErrors) this._m._oldErrors = {
            local: JSON.stringify(this._m._errors.local),
            remote: JSON.stringify(this._m._errors.remote),
            all: JSON.stringify(this._m._errors.all)
        }; 
    },
    
    _subscribeFirst_localErrorsChange: function() {
        if (this._m._oldErrors === false) this._beginUpdateErrors();
    },
    
    _subscribeFirst_remoteErrorsChange: function() {
        return this._subscribeFirst_localErrorsChange();
    },
    
    _subscribeFirst_errorsChange: function() {
        return this._subscribeFirst_localErrorsChange();
    },
    
    _endUpdateErrors: function() {
        this._m._errors.all = null; // to be calculated
        if (this._updateLevel) return; // nothing to do yet
        if (!this._m._oldErrors) return; // nothing to do at all
        if (!this._m._errors) if (!this._m._errors) this._m._errors = {local: {}, remote: {}};
        else {
            if (!this._m._errors.local) this._m._errors.local = {};
            if (!this._m._errors.remote) this._m._errors.remote = {};
        }
        var oldErrors = this._m._oldErrors;
        this._m._oldErrors = null;
        if (!this._subscribers.localErrorsChange && !this._subscribers.remoteErrorsChange && !this._subscribers.errorsChange) {
            return;
        }
        var localChanged = oldErrors.local !== JSON.stringify(this._m._errors.local);
        var remoteChanged = oldErrors.remote !== JSON.stringify(this._m._errors.remote);
        if (!localChanged && !remoteChanged) {
            return;
        }
        var triggerLocal = localChanged && this._subscribers.localErrorsChange;
        var triggerRemote = remoteChanged && this._subscribers.remoteErrorsChange;
        var triggerAll = this._subscribers.errorsChange;
        if (triggerLocal) this.outLocalErrorsChange(this._m._errors.local, JSON.parse(oldErrors.local));
        if (triggerRemote) this.outRemoteErrorsChange(this._m._errors.remote, JSON.parse(oldErrors.remote));
        if (triggerAll) this.outErrorsChange(this.getErrors(), JSON.parse(oldErrors.all));
    },
    
    getLocalErrors: function(field) {
        if (this._autoCheck && this._modified && !this._checked) this.check();
        return this._getErrors('local', field);
    },
    
    _getErrors: function(type, field) {
        if (!this._m._errors[type] || field && (field !== Amm.Data.ERROR_OTHER) && !(this._m._errors[type][field])) return null;
        if (!field) return this._m._errors[type];
        if (field === Amm.Data.ERROR_OTHER) return this._getOtherErrors(this._m._errors[type]);
        return this._m._errors[type][field];
    },
    
    _setErrors: function(type, errors, field) {
        this._beginUpdateErrors();
        if (field) {
            this._m._errors[type][field] = this._flattenErrors(errors);
            if (!this._m._errors[type][field].length) delete this._m._errors[type][field];
            this._endUpdateErrors();
            return;
        } 
        if (!errors) errors = {};
        else if (typeof errors !== 'object' || (errors instanceof Array)) {
            errors[Amm.Data.ERROR_GENERIC] = this._flattenErrors(errors);
            if (!errors[Amm.Data.ERROR_GENERIC] || !errors[Amm.Data.ERROR_GENERIC].length) {
                delete errors[Amm.Data.ERROR_GENERIC];
            }
        }
        var i, v, e = {};
        for (var i in errors) if (errors.hasOwnProperty(i)) {
            v = this._flattenErrors(errors[i]);
            if (!v.length) continue;
            e[i] = v;
        }
        this._m._errors[type] = e;
        this._endUpdateErrors();
    },
    
    setLocalErrors: function(errors, field) {
        this._setErrors('local', errors, field);
    },
    
    addError: function(error, field) {
        if (!error || (error instanceof Array && !error.length)) return;
        this._beginUpdateErrors();
        if (!field || field === Amm.Data.ERROR_OTHER) field = Amm.Data.ERROR_GENERIC;
        var e = {};
        e[field] = this._flattenErrors(error);
        Amm.override(this._m._errors.local, e, false, true);
        this._endUpdateErrors();
    },
    
    outLocalErrorsChange: function(errors, oldErrors) {
        return this._out('localErrorsChange', errors, oldErrors);
    },
    
    getRemoteErrors: function(field) {
        return this._getErrors('remote', field);
    },
    
    setRemoteErrors: function(errors, field) {
        this._setErrors('remote', errors, field);
    },
    
    outRemoteErrorsChange: function(errors, oldErrors) {
        return this._out('remoteErrorsChange', errors, oldErrors);
    },
    
    _flattenErrors: function(hash) {
        return Amm.Data.flattenErrors(hash);
    },
    
    _getOtherErrors: function(src) {
        var r, res;
        for (var i in src) if (src.hasOwnProperty(i) && !(i in this._m._propNames)) {
            r[i] = src[i];
        }
        return this._flattenErrors(r);
    },
    
    _combineErrors: function() {
        this._m._errors.all = {};
        if (this._m._errors.local) Amm.overrideRecursive(this._m._errors.all, this._m._errors.local);
        if (this._m._errors.remote) Amm.overrideRecursive(this._m._errors.all, this._m._errors.remote, false, true);
    },
    
    getErrors: function(field) {
        if (this._autoCheck && this._modified && !this._checked) this.check();
        if (!this._m._errors) return null;
        if (!this._m._errors.all) {
            this._combineErrors();
        }
        return this._getErrors('all', field);
    },
    
    outErrorsChange: function(errors, oldErrors) {
        return this._out('errorsChange', errors, oldErrors);
    },
    
    setErrors: function() {
        console.warn("setErrors has no effect; use either setLocalErrors() or setRemoteErrors()");
    },

    _setTransaction: function(transaction) {
        if (transaction) Amm.is(transaction, 'Amm.Data.Transaction');
        else transaction = null;
        
        var oldTransaction = this._transaction;
        if (oldTransaction === transaction) return;
        
        if (oldTransaction) oldTransaction.unsubscribe(undefined, undefined, this);
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
    
    _hydrateFromTransactionDataAndTrigger: function(forSave, newState, partial) {
        var result = this._transaction.getResult();
        var wasCreated = (this._m._state === Amm.Data.STATE_NEW);
        this.beginUpdate();
        this.setRemoteErrors({});
        var data = result.getData();
        if (data) this.hydrate(data, partial, true);
        if (newState) this.setState(newState);
        if (forSave) {
            this._m._doAfterSave(wasCreated);
        } else {
            this._m._doAfterLoad();
        }
        this._m._doOnActual(forSave);
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
    
    save: function(noCheck) {
        if (!noCheck && !this.check()) return;
        if (this._m._doBeforeSave() === false) return;
        var data = this._getTransactionData(), tr, state = this.getState();
        if (state === Amm.Data.STATE_NEW) {
            tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_CREATE, null, data);
        } else if (state === Amm.Data.STATE_EXISTS) {
            tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_UPDATE, this.getKey(), data);
        } else {
            throw Error("Cannot save an object with state '" + state + "'");
        }
        this._runTransaction(tr);
        return true;
    },
    
    delete: function() {
        var tr, state = this.getState(), key;
        if (state !== Amm.Data.STATE_EXISTS) {
            this.setState(Amm.Data.STATE_DELETED);
            return true;
        }
        if (this._m._doBeforeDelete() === false) return false;
        key = this.getKey();
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_DELETE, this.getKey());
        this._runTransaction(tr);
        return true;
    },
    
    load: function(key) {
        var newKey = this._m._doBeforeLoad(key);
        if (newKey === false) return false;
        if (newKey !== undefined) key = newKey;
        if (key === undefined) key = this.getKey();
        if (!key) throw new Error ("Cannot load(): key not provided");
        var tr;
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_LOAD, key);
        this._runTransaction(tr);
        return true;
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
    },
    
    _onMetaChange: function(field, property, value, oldValue) {
        Amm.Data.MetaProvider.prototype._onMetaChange.call(
            this, field, property, value, oldValue
        );
        // we know _that_ meta-property isn't validation-related
        if (property 
            && property !== 'required'      // requiredness affects validation
            && property !== 'label'         // label may affect error messages
            && property !== 'validators'    // validators affect validation
        ) return;
        var hasValue = field && this._m._data[field] || this._m._old[field];
        var shouldCheck = hasValue || property === 'required' && !value;
        this._correctCheckStatus(field, shouldCheck);
    }
    
};

Amm.extend(Amm.Data.ModelMeta, Amm.WithEvents);
Amm.extend(Amm.Data.ModelMeta, Amm.Data.MetaProvider);

Amm.defineLangStrings({
    'lang.Amm.ModelMeta.invalidFieldValue': "The field contains invalid value"
});
