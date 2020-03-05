/* global Amm */

Amm.Data.LifecycleAndMeta = function(object, options) {
    this._o = object;
    this._mapper = object._mapper;
    this._mapper.subscribe('metaChange', this._handleMapperMetaChange, this);
    Object.defineProperty(this, 'o', {value: object, writable: false});
    Amm.WithEvents.call(this, options);
};

Amm.Data.LifecycleAndMeta.prototype = {

    'Amm.Data.LifecycleAndMeta': '__CLASS__', 
    
    /**
     * @type {Amm.Data.Object}
     */
    _o: null,
    
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
    
    /**
     * Means doOnCheck will occur every time when get*Errors() or, when anything is subscribed
     * to localErrorsChange / errorsChange events, instantly after every change (with respect
     * to updateLevel).
     * 
     * Should be one of Amm.Data.AUTO_CHECK_ constants
     */
    _autoCheck: Amm.Data.AUTO_CHECK_NEVER,
    
    /**
     * Means all local errors are reset when object is hydrated w/ STATE_EXISTS
     * and not modified; onCheck() will skip _doOnCheck() in this case too.
     * 
     * @type Boolean
     */ 
    _validWhenHydrated: true,
    
    getObject: function() { return this._o; },
    
    getO: function() { return this._o; },
    
    hydrate: function(data, partial, noTrigger) {
        this.beginUpdate();
        if (!partial) {
            this.o._old = {};
            this.o._data = {};
        }
        for (var i in data) if (data.hasOwnProperty(i)) {
            if (!this.o._propNames[i]) this._createProperty(i);
            this.o._old[i] = data[i];
            this.o._data[i] = data[i];
        }
        if (this.getKey()) {
            this.setState(Amm.Data.STATE_EXISTS);
            if (!noTrigger) this.o._doOnActual(false);
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
        return Amm.keys(this.o._data);
    },
    
    getData: function() {
        return Amm.override({}, this.o._data);
    },
    
    beginUpdate: function() {
        this._updateLevel++;
        if (this._updateLevel > 1) return;
        this.o._preUpdateValues = this.getData();
    },
    
    endUpdate: function() {
        if (!this._updateLevel) 
            throw Error ("Call to endUpdate() without corresponding beginUpdate(); check with getUpdateLevel() first");
        this._updateLevel--;
        if (this._updateLevel) return;
        var pv = this.o._preUpdateValues;
        var v = this.o._data, oldVal, newVal;
        for (var i in pv) if (pv.hasOwnProperty(i)) {
            oldVal = pv[i];
            newVal = v[i];
            delete pv[i];
            if (newVal !== oldVal) this._reportFieldChange(i, newVal, oldVal, true);
            if (this.o._updateLevel) break; // in case event handler done beginUpdate()
        }
        if (this._oldState !== null) {
            if (this._oldState !== this._o.state) {
                var oldState = this._oldState;
                this._oldState = null;
                this.outStateChange(this._o._state, this._oldState);
            }
        }
        this._checkModified();
        if (this._o._oldErrors !== null) {
            this._endUpdateErrors();
        }
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    _checkFieldModified: function(field) {
        var modified = false;
        if (field in this.o._data) {
            if (!(field in this.o._old) || this.o._old[field] !== this.o._data[field])
            modified = true;
        }
        if (modified !== this._modified) this._checkModified();
    },
    
    _checkModified: function() {
        var modified = false;
        for (var i in this.o._data) if (this.o._data.hasOwnProperty(i)) {
            if (!(i in this.o._old) || this.o._old[i] !== this.o._data[i]) {
                modified = true;
                break;
            }
        }
        this.setModified(modified);
    },
    
    _reportFieldChange: function(field, val, oldVal, dontReportModified) {
        if (this._updateLevel) return;
        
        var propName = this.o._propNames[field];
        var outName = 'out' + propName.charAt(0).toUpperCase() + propName.slice(1) + 'Change';
        
        this._correctCheckStatus(field, val || oldVal);
        
        this.o[outName](val, oldVal);
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

    getModified: function() { return this._modified; },

    outModifiedChange: function(modified, oldModified) {
        this._out('modifiedChange', modified, oldModified);
    },
    
    revert: function() {
        this.beginUpdate();
        this._o._data = Amm.override({}, this._o._old);
        this.endUpdate();
    },
    
    isSpecial: function(field) {
        return field in this.constructor.prototype;
    },
    
    getFieldValue: function(field) {
        return this.o._data[field];
    },
    
    setFieldValue: function(field, value) {
        var old = this.o._data[field];
        if (old === value) return;
        this.o._data[field] = value;
        if (this._updateLevel) return;
        this._reportFieldChange(field, value, old);
    },
    
    _createProperty: function(field) {
        if (field in this.o._propNames) throw Error("Amm.Data.Object already has property for field '" + field + "'");
        var propName = field, suff = '';
        while (this.isSpecial(propName)) {
            propName = field + 'Field' + suff;
            suff = (suff || 1) + 1;
        }
        this.o._propNames[field] = propName;
        var sfx = propName.slice(1);
        var u = propName.charAt(0).toUpperCase() + sfx;
        var l = propName.charAt(0).toLowerCase() + sfx;
        var eventName = l + 'Change';
        var outName = 'out' + u + 'Change';
        var setterName = 'set' + u;
        var getterName = 'get' + u;
        
        if (!(getterName in this.o)) {
            this.o[getterName] = function() {
                return this._data[field];
            };
        }
        if (!(setterName in this.o)) {
            this.o[setterName] = function(value) {
                return this.lm.setFieldValue(field, value);
            };
        }
        if (!(outName in this.o)) {
            this.o[outName] = function(value, oldValue) {
                if (this._updateLevel) return;
                return this._out(eventName, value, oldValue);
            };
        }
        Object.defineProperty(this.o, propName, {
            enumerable: true,
            get: this.o[getterName],
            set: this.o[setterName]
        });
        
        // we need to create pre-update values' key so change event will be triggered
        // during endUpdate()
        if (!(field in this._o._preUpdateValues)) {
            this._o._preUpdateValues[field] = undefined;
        }
        return propName;
    },
    
    getState: function() {
        return this.o._state;
    },
    
    setState: function(state) {
        var oldState = this._o._state;
        if (oldState === state) return;
        if (!Amm.Data.StateEnum[state]) 
            throw Error("`state` must be one of Amm.Data.STATE_ values; given: '" + state + "'");
        this._o._state = state;
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
    
    /**
     * Prefers to return _old_ key, since it will be used to save object
     */
    getKey: function() {
        var res = this._mapper.extractKey(this.o._old);
        if (res === undefined) res = this._mapper.extractKey(this.o._data);
        return res;
    },
    
    _hasLocalErrors: function() {
        if (this._o._errors.local) {
            // fail if we have any local errors
            for (var i in this._o._errors.local) {
                if (this._o._errors.local.hasOwnProperty(i)) return true;
            }
        }
        return false;
    },
    
    check: function(again) {
        if (this._checked && !again) return !this._hasLocalErrors();
        if (this._checkHydratedAndValid(true)) return true;
        this._beginUpdateErrors();
        this._o._errors.local = {};
        this._coreCheckFields();
        this._coreCheckWhole();
        this._o._doOnCheck();
        this._checked = true;
        this._endUpdateErrors();
        return !this._hasLocalErrors();
    },
    
    _coreCheckFields: function(field) {
        // check individual fields first
        var fieldValidators = this._mapper.getFieldValidators(true);
        var hasFieldCheckFn = this._o._checkField !== Amm.Data.Object.prototype._checkField;
        // everything a-ok
        if (!hasFieldCheckFn && !(fieldValidators && (!field || fieldValidators[field]))) return; 
        var fieldsSrc;
        if (field) {
            if (!this._o._propNames[field]) throw Error("No such field: '" + field + "'");
            fieldsSrc = {};
            fieldsSrc[field] = this._o._propNames[field];
        } else {
            fieldsSrc = this._o._propNames;
        }
        var err, i, j, l, v, validators;
        for (i in fieldsSrc) if (fieldsSrc.hasOwnProperty(i)) {
            v = this._o._data[i];
            if (hasFieldCheckFn) {
                err = this._o._checkField(i, v);
                if (err === false) err = Amm.translate("lang.Amm.LifecycleAndMeta.invalidFieldValue");
                if (err) {
                    this.addError(err, i);
                }
            }
            if (!fieldValidators || !(i in fieldValidators)) continue;
            validators = fieldValidators[i];
            if (!(validators instanceof Array)) validators = [validators];
            var label = this._mapper.getMeta(i, 'label') || i;
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
            if (!err) delete this._o._errors.local[i];
        }
    },
    
    _coreCheckWhole: function() {
        var commonValidators = this._mapper.getCommonValidators();
        if (!commonValidators) return;
        for (var key in commonValidators) if (commonValidators.hasOwnProperty(key)) {
            var vals = commonValidators[key];
            var error;
            for (var j = 0, l = vals.length; j < l; j++) {
                var val = vals[j];
                if (val['Amm.Expression']) { // check for cached function
                    if (!val.__func) val.__func = val.toFunction();
                    val.__func.env.expressionThis = this._o;
                    error = val.__func();
                }
                else if (val['Amm.Validator']) {
                    error = val.getError(this);
                }
                else if (typeof val === 'function') { // check it is an expression
                    error = val.call(this._o);
                } else {
                    throw Error("commonValidators['" + key + "'] must be either a function, an Amm.Expression or an Amm.Validator; provided: " 
                        + Amm.describeType(commonValidators[key]));
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
    
    _checkHydratedAndValid(resetErrors) {
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
        if (!this._subscribers.localErrorsChange && !this._subscribers.remoteErrorsChange && !this._subscribers.allErrorsChange) {
            this._o._oldErrors = false; // special value means we defer JSON calculation
        }
        if (!this._o._errors) this._o._errors = {local: {}, remote: {}};
        this._combineErrors();
        if (!this._o._oldErrors) this._o._oldErrors = {
            local: JSON.stringify(this._o._errors.local),
            remote: JSON.stringify(this._o._errors.remote),
            all: JSON.stringify(this._o._errors.all)
        }; 
    },
    
    _subscribeFirst_localErrorsChange: function() {
        if (this._o._oldErrors === false) this._beginUpdateErrors();
    },
    
    _subscribeFirst_remoteErrorsChange: function() {
        return this._subscribeFirst_localErrorsChange();
    },
    
    _subscribeFirst_allErrorsChange: function() {
        return this._subscribeFirst_localErrorsChange();
    },
    
    _endUpdateErrors: function() {
        this._o._errors.all = null; // to be calculated
        if (this._updateLevel) return; // nothing to do yet
        if (!this._o._oldErrors) return; // nothing to do at all
        if (!this._o._errors) if (!this._o._errors) this._o._errors = {local: {}, remote: {}};
        else {
            if (!this._o._errors.local) this._o._errors.local = {};
            if (!this._o._errors.remote) this._o._errors.remote = {};
        }
        var oldErrors = this._o._oldErrors;
        this._o._oldErrors = null;
        if (!this._subscribers.localErrorsChange && !this._subscribers.remoteErrorsChange && !this._subscribers.allErrorsChange) {
            return;
        }
        var localChanged = oldErrors.local !== JSON.stringify(this._o._errors.local);
        var remoteChanged = oldErrors.remote !== JSON.stringify(this._o._errors.remote);
        if (!localChanged && !remoteChanged) {
            return;
        }
        var triggerLocal = localChanged && this._subscribers.localErrorsChange;
        var triggerRemote = remoteChanged && this._subscribers.remoteErrorsChange;
        var triggerAll = this._subscribers.errorsChange;
        if (triggerLocal) this.outLocalErrorsChange(this._o._errors.local, JSON.parse(oldErrors.local));
        if (triggerRemote) this.outRemoteErrorsChange(this._o._errors.remote, JSON.parse(oldErrors.remote));
        if (triggerAll) this.outErrorsChange(this.getErrors(), JSON.parse(oldErrors.all));
    },
    
    getLocalErrors: function(field) {
        if (this._autoCheck && this._modified && !this._checked) this.check();
        return this._getErrors('local', field);
    },
    
    _getErrors: function(type, field) {
        if (!this._o._errors[type] || field && (field !== Amm.Data.ERROR_OTHER) && !(this._o._errors[type][field])) return null;
        if (!field) return this._o._errors[type];
        if (field === Amm.Data.ERROR_OTHER) return this._getOtherErrors(this._o._errors[type]);
        return this._o._errors[type][field];
    },
    
    _setErrors: function(type, errors, field) {
        this._beginUpdateErrors();
        if (field) {
            this._o._errors[type][field] = this._flattenErrors(errors);
            if (!this._o._errors[type][field].length) delete this._o._errors[type][field];
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
        this._o._errors[type] = e;
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
        Amm.override(this._o._errors.local, e, false, true);
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
        for (var i in src) if (src.hasOwnProperty(i) && !(i in this._o._propNames)) {
            r[i] = src[i];
        }
        return this._flattenErrors(r);
    },
    
    _combineErrors: function() {
        this._o._errors.all = {};
        if (this._o._errors.local) Amm.overrideRecursive(this._o._errors.all, this._o._errors.local);
        if (this._o._errors.remote) Amm.overrideRecursive(this._o._errors.all, this._o._errors.remote, false, true);
    },
    
    getErrors: function(field) {
        if (this._autoCheck && this._modified && !this._checked) this.check();
        if (!this._o._errors) return null;
        if (!this._o._errors.all) {
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
        var wasCreated = (this.o._state === Amm.Data.STATE_NEW);
        this.beginUpdate();
        this.setRemoteErrors({});
        var data = result.getData();
        if (data) this.hydrate(data, partial, true);
        if (newState) this.setState(newState);
        if (forSave) {
            this._o._doAfterSave(wasCreated);
        } else {
            this._o._doAfterLoad();
        }
        this._o._doOnActual(forSave);
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
        this._o._doAfterDelete();
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
        return Amm.override({}, this._o._data);
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
        if (this._o._doBeforeSave() === false) return;
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
        if (this._o._doBeforeDelete() === false) return false;
        key = this.getKey();
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_DELETE, this.getKey());
        this._runTransaction(tr);
        return true;
    },
    
    load: function(key) {
        var newKey = this._o._doBeforeLoad(key);
        if (newKey === false) return false;
        if (newKey !== undefined) key = newKey;
        if (key === undefined) key = this.getKey();
        if (!key) throw new Error ("Cannot load(): key not provided");
        var tr;
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_LOAD, key);
        this._runTransaction(tr);
        return true;
    },
    
    _handleMapperMetaChange: function(meta, oldMeta, field, property, value, oldValue) {
        // we know _that_ meta-property isn't validation-related
        if (property 
            && property !== 'required'      // requiredness affects validation
            && property !== 'label'         // label may affect error messages
            && property !== 'validators'    // validators affect validation
        ) return;
        var hasValue = field && this._o._data[field] || this._o._old[field];
        var shouldCheck = hasValue || property === 'required' && !value;
        this._correctCheckStatus(field, shouldCheck);
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
        this._o.cleanup();
        Amm.WithEvents.prototype.cleanup.call(this);
    }
    
    
};

Amm.extend(Amm.Data.LifecycleAndMeta, Amm.WithEvents);

Amm.defineLangStrings({
    'lang.Amm.LifecycleAndMeta.invalidFieldValue': "The field contains invalid value"
});
