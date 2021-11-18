/* global Amm */

Amm.Data.ModelMeta = function(model, options) {
    
    if (!options) options = {};
    else options = Amm.override({}, options);
    
    this._computed = [];
    this._m = model;
    model._mm = this;
    Object.defineProperty(this, 'm', {value: model, writable: false});
    Amm.Data.MetaProvider.call(this);
    Amm.WithEvents.call(this, options);
};

//Amm.Data.ModelMeta.debugAnyChangeStack = 1;

Amm.Data.ModelMeta.prototype = {

    'Amm.Data.ModelMeta': '__CLASS__', 
    
    /**
     * @type {Amm.Data.Model}
     */
    _m: null,
    
    _modified: null,
    
    _transaction: null,

    _lastTransaction: null,
    
    _oldState: null,
    
    _checked: false,
    
    _cu: false,
    
    _propertiesChanged: false,
    
    _fieldMeta: null,
    
    _validators: null,
    
    _initLevel: 0,
    
    _updateLevel: 0,
    
    _errUpdateLevel: 0,
    
    _lockCompute: 0,
    
    _lockAnyChange: 0,
    
    _lacs: null,
    
    _anyChange: false,
    
    /**
     * List of computed fields (that should be recalc'd after each fields' update)
     * @type Array
     */
    _computed: null,
    
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
        this.outOldValueChanged();
        this.endUpdate();
    },
    
    update: function(data) {
        this.beginUpdate();
        for (var i in data) if (data.hasOwnProperty(i) && (i in this._m._data || i in this._m._old)) {
            this._m[i] = data[i];
        }
        this.endUpdate();
    },
    
    getKey: function() {
        return null;
    },
    
    outHydrate: function() {
        return this._out('hydrate');
    },
    
    outOldValueChanged: function() {
        return this._out('oldValueChanged');
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
        if (!this._m._preUpdateValues) this._m._preUpdateValues = {};
        for (var i in this._m._data) if (this._m._data.hasOwnProperty(i)) {
            if (i in this._m._preUpdateValues) continue;
            this._m._preUpdateValues[i] = this._m._data[i];
        }
        this._beginAnyChange('update');
    },
    
    endUpdate: function() {
        if (!this._updateLevel) 
            throw Error ("Call to endUpdate() without corresponding beginUpdate(); check with getUpdateLevel() first");
        
        if (this._updateLevel > 1) {
            this._updateLevel--;
            return;
        }
        if (!this._lockCompute) this._compute(true);
        this._updateLevel--;
        var pv = this._m._preUpdateValues;
        var v = this._m._data, oldVal, newVal;
        this._lockCompute++;
        var dataChanged = false;
        for (var i in v) if (v.hasOwnProperty(i)) {
            oldVal = pv[i];
            newVal = v[i];
            delete pv[i];
            if (newVal !== oldVal) {
                dataChanged = true;
                this._reportFieldChange(i, newVal, oldVal, true);
            }
            if (this._m._updateLevel) break; // in case event handler done beginUpdate()
        }
        this._lockCompute--;
        if (this._oldState !== null) {
            if (this._oldState !== this._m.state) {
                var oldState = this._oldState;
                this._oldState = null;
                this.outStateChange(this._m._state, oldState);
            }
        }
        if (dataChanged) this._reportDataChanged();
        this._checkModified();
        if (this._propertiesChanged) {
            this._propertiesChanged = false;
            this.outPropertiesChanged();
        }
        if (this._m._oldErrors !== null) {
            this._endUpdateErrors();
        }
        this._endAnyChange('update');
    },
    
    _reportDataChanged: function() {
        this.outDataChanged();
    },
    
    /**
     * This event is triggered when any field is changed (and once if endUpdate occurs)
     */
    outDataChanged: function() {
        return this._out('dataChanged');
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
            if (this['_compute_' + i]) continue;
            if (!(i in this._m._old) || this._m._old[i] !== this._m._data[i]) {
                modified = true;
                break;
            }
        }
        this.setModified(modified);
    },
    
    _reportFieldChange: function(field, val, oldVal, isEndUpdate) {
        if (this._updateLevel) return;
        var ex;
        try {
            this._beginAnyChange('reportFieldChange ' + field);

            var propName = this._m._propNames[field];
            var outName = 'out' + propName.charAt(0).toUpperCase() + propName.slice(1) + 'Change';

            this._correctCheckStatus(field, val || oldVal);

            this._m[outName](val, oldVal);
            this.outAnyChange('fieldChange');
            if (this['_change_' + field]) this['_change_' + field].call(this._m, val, oldVal, field);
            if (!this._lockCompute && !(this['_compute_' + field])) this._compute();
            if (!isEndUpdate) {
                this._reportDataChanged();
                this._checkFieldModified(field);
            }
        } catch (e) {
            ex = e;
        }
        this._endAnyChange('reportFieldChange ' + field);
        if (ex) throw ex;
    },
    
    _handleSubmodelAnyChange: function(reason) {
        var fieldName = arguments[arguments.length - 1];
        this._beginAnyChange('_handleSubmodelAnyChange');
        this._compute();
        this.outAnyChange('submodel');
        this._endAnyChange('_handleSubmodelAnyChange');
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
        this.outAnyChange('modifiedChange');
    },
    
    listModifiedFields: function() {
        var res = [];
        for (var field in this._m._data) if (this._m._data.hasOwnProperty(field)) {
            if (this['_compute_' + field]) continue;
            if (this._m._old[field] !== this._m._data[field]) res.push(field);
        }
        return res;
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
        if (!(field in this._m._data) && this['_compute_' + field]) {
            this._m._data[field] = this['_compute_' + field].call(this._m, field);
        }
        return this._m._data[field];
    },
    
    _subFieldValue: function(value, field) {
        if (!value) return;
        if (value['Amm.Data.Model']) {
            value.mm.subscribe('anyChange', this._handleSubmodelAnyChange, this, field);
            return;
        }
        if (value['Amm.Data.Collection']) {
            value.subscribe('anyChange', this._handleSubmodelAnyChange, this, field);
            return;
        }
    },
    
    _unsubFieldValue: function(value, field) {
        if (!value) return;
        if (value['Amm.Data.Model']) {
            value.mm.unsubscribe('anyChange', this._handleSubmodelAnyChange, this, field);
            return;
        }
        if (value['Amm.Data.Collection']) {
            value.unsubscribe('anyChange', this._handleSubmodelAnyChange, this, field);
            return;
        }
    },
    
    setFieldValue: function(field, value) {
        var old = this._m._data[field], ret;
        
        // cannot set computed field
        if (this._computed.length && this['_compute_' + field]) return;
        
        var setterName = '_set_' + field;
        if (this[setterName] && typeof this[setterName] === 'function') {
            delete this[setterName].error;
            ret = { 'value': value, 'old': old, 'error': null };
            var res = this[setterName].call(this._m, ret, field);
            if (res === false) return;
            value = ret.value;
            old = ret.old;
            if (ret.error) {
                this[setterName].error = ret.error;
            }
        }
        if (old === value) return;
        if (value) this._subFieldValue(value, field);
        if (old) this._unsubFieldValue(old, field);
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
        var meta = this.getMeta(field);
        var def = undefined;
        if (meta) {
            def = meta.def;
            if (typeof def === 'function') def = def.call(this._m, field);
            if (def !== undefined) {
                if (!(field in this._m._old)) this._m._old[field] = def;
                if (!(field in this._m._data)) this._m._data[field] = def;
                if (def) this._subFieldValue(def, field);
            }
        }
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
            configurable: true,            
            get: function() { return this[getterName](); },
            set: function(value) { return this[setterName](value); }
        });
        
        // we need to create pre-update values' key so change event will be triggered
        // during endUpdate()
        if (this._m._preUpdateValues && !(field in this._m._preUpdateValues)) {
            this._m._preUpdateValues[field] = def;
        }
        
        if (!this._updateLevel) this.outPropertiesChanged();
        else this._propertiesChanged = true;
        
        return propName;
    },
    
    outPropertiesChanged: function() {
        this._out('propertiesChanged');
        this.outAnyChange('propertiesChanged');
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
        this._out('stateChange', state, oldState);
        this.outAnyChange('stateChange');
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
        this._endUpdateErrors();
        this.setChecked(true);
        return !this._hasLocalErrors();
    },
    
    checkFields: function(fields) {
        var res;
        this._beginUpdateErrors();
        res = this._coreCheckFields(fields);
        this._endUpdateErrors();
        return res;
    },
    
    _coreCheckFields: function(field) {
        var err, i, j, l, v, label, validators, setterName, hasErrors = false;
        var hasFieldCheckFn = this._m._checkField !== Amm.Data.Record.prototype._checkField;
        // everything a-ok
        var fieldsSrc = {}, hasFields;
        if (field instanceof Array) {
            for (i = 0; i < field.length; i++) {
                if (this._m._propNames[field[i]]) {
                    fieldsSrc[field[i]] = this._m._propNames[field[i]];
                    hasFields = true;
                }
                if (!hasFields) return;
            }
        } else if (field) {
            if (!this._m._propNames[field]) return;
            fieldsSrc[field] = this._m._propNames[field];
        } else {
            fieldsSrc = this._m._propNames;
        }
        for (i in fieldsSrc) if (fieldsSrc.hasOwnProperty(i)) {
            delete this._m._errors.local[i];            
            err = null;
            setterName = '_set_' + i;
            if (typeof this[setterName] === 'function' && this[setterName].error) {
                err = this[setterName].error;
            }
            v = this._m._data[i];
            if (!err && hasFieldCheckFn) {
                err = this._m._checkField(i, v);
                if (err === false) err = Amm.translate("lang.Amm.ModelMeta.invalidFieldValue");
            }
            label = this.getMeta(i, 'label') || i;
            if (!err) {
                validators = this.getFieldValidators(i);
                if (!validators) validators = [];
                else if (!(validators instanceof Array)) validators = [validators];
                for (var j = 0, l = validators.length; j < l; j++) {
                    if (typeof validators[j] === 'function') {
                        err = validators[j](v, label, this._m);
                    }
                    else if (typeof validators[j].getError === 'function') {
                        err = validators[j].getError(v, label, this._m);
                    }
                    if (err) break;
                }
            }
            if (err) {
                err = err.replace(/%field/g, label);
                this.addError(err, i);
                hasErrors = true;
            }
        }
        return !hasErrors;
    },
    
    _coreCheckWhole: function() {
        var modelValidators = this.getModelValidators(true);
        if (!modelValidators) return;
        for (var key in modelValidators) if (modelValidators.hasOwnProperty(key)) {
            var validators = modelValidators[key];
            var error;
            for (var j = 0, l = validators.length; j < l; j++) {
                var validator = validators[j];
                if (validator['Amm.Expression']) { // check for cached function
                    if (!validator.__func) validator.__func = validator.toFunction();
                    validator.__func.env.expressionThis = this._m;
                    error = validator.__func();
                }
                else if (validator['Amm.Validator']) {
                    error = validator.getError(this);
                }
                else if (typeof validator === 'function') { // check it is an expression
                    error = validator.call(this._m);
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
        this.outAnyChange('stateChange');
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
        if (!this._errUpdateLevel) this._beginAnyChange('updateErrors');
        this._errUpdateLevel++;
        if (this._errUpdateLevel > 1) return;
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
        var dec = false;
        if (this._errUpdateLevel > 0) {
            this._errUpdateLevel--;
            dec = true;
        }
        if (this._errUpdateLevel || this._updateLevel) {
            if (!this._errUpdateLevel && dec) this._endAnyChange('updateErrors');
            return;
        }
        this._m._errors.all = null; // to be calculated
        if (!this._m._oldErrors) {
            if (dec) this._endAnyChange('updateErrors');
            return; // nothing to do at all
        }
        if (!this._m._errors) if (!this._m._errors) this._m._errors = {local: {}, remote: {}};
        else {
            if (!this._m._errors.local) this._m._errors.local = {};
            if (!this._m._errors.remote) this._m._errors.remote = {};
        }
        var oldErrors = this._m._oldErrors;
        this._m._oldErrors = null;
        if (!this._subscribers.localErrorsChange
            && !this._subscribers.remoteErrorsChange 
            && !this._subscribers.errorsChange
            && !this._computed.length
            && !this._subscribers.anyChange
        ) {
            if (dec) this._endAnyChange('updateErrors');
            return;
        }
        var localChanged = oldErrors.local !== JSON.stringify(this._m._errors.local);
        var remoteChanged = oldErrors.remote !== JSON.stringify(this._m._errors.remote);
        if (!localChanged && !remoteChanged) {
            if (dec) this._endAnyChange('updateErrors');
            return;
        }
        this._compute();
        var triggerLocal = localChanged && this._subscribers.localErrorsChange;
        var triggerRemote = remoteChanged && this._subscribers.remoteErrorsChange;
        var triggerAll = this._subscribers.errorsChange;
        if (triggerLocal) this.outLocalErrorsChange(this._m._errors.local, JSON.parse(oldErrors.local));
        if (triggerRemote) this.outRemoteErrorsChange(this._m._errors.remote, JSON.parse(oldErrors.remote));
        if (triggerAll) this.outErrorsChange(this.getErrors(), JSON.parse(oldErrors.all));
       if (dec) this._endAnyChange('updateErrors');
    },

    /**
     * @param {null|string|array} field Field to check
     * @param {int} mode One of Amm.Data.LOCAL_ERRORS_ constatnts;
     * @returns {array|null} Null is returned when no errors are present
     */
    getLocalErrors: function(field, mode) {
        if (!mode && this._autoCheck && this._modified && !this._checked) this.check();
        if (mode === Amm.Data.LOCAL_ERRORS_CHECK_FIELDS_ONLY) {
            this.checkFields(field);
        }
        return this._getErrors('local', field);
    },
    
    _getErrors: function(type, field) {
        if (!this._m._errors || !this._m._errors[type] || field && (field !== Amm.Data.ERROR_OTHER) && !(this._m._errors[type][field])) return null;
        if (!field) {
            if (this._m._errors[type]) {
                for (var i in this._m._errors[type]) if (this._m._errors[type].hasOwnProperty(i)) {
                    return this._m._errors[type];
                }
                return null;
            }
            return this._m._errors[type];
        }
        if (field === Amm.Data.ERROR_OTHER) return this._getOtherErrors(this._m._errors[type]);
        return this._m._errors[type][field];
    },
    
    _setErrors: function(type, errors, field) {
        if (field) {
            this._beginUpdateErrors();
            this._m._errors[type][field] = this._flattenErrors(errors);
            if (!this._m._errors[type][field].length) delete this._m._errors[type][field];
            this._endUpdateErrors();
            return;
        } 
        this._beginUpdateErrors();
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
        Amm.overrideRecursive(this._m._errors.local, e, false, true);
        this._endUpdateErrors();
    },
    
    outLocalErrorsChange: function(errors, oldErrors) {
        this._out('localErrorsChange', errors, oldErrors);
        this.outAnyChange('localErrorsChange');
    },
    
    getRemoteErrors: function(field) {
        return this._getErrors('remote', field);
    },
    
    setRemoteErrors: function(errors, field) {
        this._setErrors('remote', errors, field);
    },
    
    outRemoteErrorsChange: function(errors, oldErrors) {
        this._out('remoteErrorsChange', errors, oldErrors);
        this.outAnyChange('remoteErrorsChange');
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
        if (this._m._errors.local) this._m._errors.all = Amm.copy(this._m._errors.local);
        if (this._m._errors.remote) Amm.overrideRecursive(this._m._errors.all, this._m._errors.remote, false, true);
    },
    
    getErrors: function(field, dontCheck) {
        if (!dontCheck && this._autoCheck === Amm.Data.AUTO_CHECK_ALWAYS && this._modified && !this._checked) {
            this.check();
        }
        if (!this._m._errors) return null;
        if (!this._m._errors.all) {
            this._combineErrors();
        }
        return this._getErrors('all', field);
    },
    
    outErrorsChange: function(errors, oldErrors) {
        this._out('errorsChange', errors, oldErrors);
        this.outAnyChange('errorsChange');
    },
    
    setErrors: function() {
        console.warn("setErrors has no effect; use either setLocalErrors() or setRemoteErrors()");
    },
    
    _syncProperties: function() {
        var meta = this.getMeta();
        var computed = [];
        for (var field in meta) if (meta.hasOwnProperty(field)) {
            var m = meta[field];
            if (!(field in this._m._propNames)) {
                this._createProperty(field);
            }
            this['_change_' + field] = m.change;
            if (m.compute && typeof m.compute === 'function') {
                computed.push(field);
                this['_compute_' + field] = m.compute;
            } else {
                delete this['_compute_' + field];
            }
            if (m.set !== undefined) this['_set_' + field] = m.set;
        }
        if (!Amm.Array.equal(computed, this._computed)) {
            this._computed = computed;
            this._computedListUpdated();
        }
    },
    
    _onMetaChange: function(field, property, value, oldValue) {
        
        Amm.Data.MetaProvider.prototype._onMetaChange.call(
            this, field, property, value, oldValue
        );

        if (!field) this._syncProperties();
        else {
            if (!(field in this._m._propNames)) this._createProperty(field);
            var meta = this.getMeta(field);
            if (!property || property === 'set') {
                if (meta && meta.set !== undefined) {
                    this['_set_' + field] = meta.set;
                }
            }
            if (!property || property === 'change') {
                this['_change_' + field] = meta.change;
            }
            if (!property || property === 'compute') {
                var cmpChanged = false;
                var cmpIdx = Amm.Array.indexOf(field, this._computed);
                if (typeof meta.compute === 'function') {
                    if (cmpIdx < 0) { 
                        cmpChanged = true;
                        this._computed.push(field);
                        this['_compute_' + field] = meta.compute;
                    }
                } else {
                    if (cmpIdx >= 0) { 
                        cmpChanged = true;
                        this._computed.splice(cmpIdx, 1);
                        delete this['_compute_' + field];
                    }
                }
                if (cmpChanged) this._computedListUpdated();
            }
        }

        // we know _that_ meta-property isn't validation-related
        if (property 
            && property !== 'required'      // requiredness affects validation
            && property !== 'label'         // label may affect error messages
            && property !== 'validators'    // validators affect validation
        ) return;

        var hasValue = field && this._m._data[field] || this._m._old[field];
        var shouldCheck = hasValue || property === 'required' && !value;

        this._correctCheckStatus(field, shouldCheck);
        
    },
    
    _computedListUpdated: function() {
        this._compute();
    },
    
    compute: function() {
        this._compute();
    },
    
    outCompute: function() {
        return this._out('compute');
    },
    
    _compute: function(duringEndUpdate) {
        if (
            !this._computed.length 
            && this._m._doOnCompute === Amm.Data.Model.prototype._doOnCompute
            && !this._subscribers.compute
        ) {
            // nothing to do
            return;
        }
        if (this._updateLevel && !duringEndUpdate) return;
        
        if (!duringEndUpdate) this.beginUpdate();
        var i, l, f;
        for (i = 0, l = this._computed.length; i < l; i++) {
            f = this._computed[i];
            delete this._m._data[f];
        }
        for (i = 0, l = this._computed.length; i < l; i++) {
            f = this._computed[i];
            if (!(f in this._m._data)) {
                this.getFieldValue(f);
            }
        }
        this._lockCompute++;
        this._m._doOnCompute();
        this.outCompute();
        if (!duringEndUpdate) this.endUpdate();
        this._lockCompute--;
    },
    
    _beginAnyChange: function(r) {
        this._lockAnyChange++;
        if (Amm.Data.ModelMeta.debugAnyChangeStack) {
            if (!this._lacs) this._lacs = [];
            console.log("beginAnyChange", this._lockAnyChange, [].concat(this._lacs), "<", r);
            this._lacs.push(r);
        }
    },
    
    _endAnyChange: function(r) {
        if (!this._lockAnyChange) {
            throw new Error("Assertion: _endAnyChange() without _beginAnyChange()");
        }
        this._lockAnyChange--;
        if (Amm.Data.ModelMeta.debugAnyChangeStack) {
            var r1 = this._lacs.pop();
            if (r1 !== r) {
                console.warn("_endAnyChange('" + r + "'): lacs entry not matching, stack contained '" + r1 + "'");
                console.trace ();
            }
            console.log("endAnyChange", this._lockAnyChange, [].concat(this._lacs), ">", r);
        }
        if (this._lockAnyChange || !this._anyChange) return;
        var reason = this._anyChange;
        this._anyChange = false;
        this.outAnyChange(reason);
    },
    
    outAnyChange: function(reason) {
        if (!this._lockAnyChange) {
            this._anyChange = false;
            this._out('anyChange', reason);
            return;
        }
        if (this._anyChange && this._anyChange !== reason) {
            this._anyChange = 'cumulative';
        } else {
            this._anyChange = reason;
        }
    },

    // we suppress any events until model finished initializing
    _out: function() {
        if (this._m._init) return;
        Amm.WithEvents.prototype._out.apply(this, Array.prototype.slice.call(arguments));
    },    
    
};

Amm.extend(Amm.Data.ModelMeta, Amm.WithEvents);
Amm.extend(Amm.Data.ModelMeta, Amm.Data.MetaProvider);

Amm.defineLangStrings({
    'lang.Amm.ModelMeta.invalidFieldValue': "The field contains invalid value"
});
