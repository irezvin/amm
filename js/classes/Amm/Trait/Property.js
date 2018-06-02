/* global Amm */

Amm.Trait.Property = function() {
  
  this._validators = [];
  
};

/**
 * Never automatically validate
 */
Amm.Trait.Property.VALIDATE_NEVER = 0;

/**
 * Validates when editor loses focus (`focused` property changes from TRUE to FALSE)
 */
Amm.Trait.Property.VALIDATE_BLUR = 1;

/**
 * Validates when `valueChange` event is triggered
 */ 
Amm.Trait.Property.VALIDATE_CHANGE = 2;

/**
 * Validates both on lost focus or valueChange event
 */
Amm.Trait.Property.VALIDATE_BLUR_CHANGE = 3;

/**
 * Important! Property does not validate its' value when it's empty (has undefined, empty string or null)
 */
Amm.Trait.Property.prototype = {  

    'Model': '__INTERFACE__',

    _parentModel: null,

    _parentPropertyPath: null,

    _propertyName: undefined,
    
    _propertyLabel: undefined,

    _validators: null,

    _validateMode: Amm.Trait.Property.VALIDATE_CHANGE,

    _propertyErrors: undefined,
    
    _needValidate: false,

    _applied: null,
    
    _propertyRequired: undefined,
    
    propertyRequiredMessage: 'lang.Amm.Validator.Required.msg',
    
    _propertyRequiredValidator: null,
    
    _propertyEmpty: undefined,
    
    _syncPropertyWithAnnotations: true,
    
    __augment: function(traitInstance) {
        Amm.Element.regInit(this, '99.Amm.Trait.Property', function() {
            if (!Amm.detectProperty(this, 'value')) {
                throw "Element must have `value` property to be compatible with `Amm.Trait.Property` trait";
            }
            this.subscribe('valueChange', this._handlePropertyValueChange, this);
            if (Amm.detectProperty(this, 'focused')) {
                this.subscribe('focusedChange', this._handlePropertyFocusedChange, this);
            }
            if (this['Annotated'] === '__INTERFACE__' && this._syncPropertyWithAnnotations) {
                this._syncWithAnnotations();
            }
            this._handlePropertyValueChange(this._value, undefined);
        });
    },
    
    _inSyncWithAnnotations: false,
    
    _syncWithAnnotations: function() {
        if (!this._inSyncWithAnnotations) {
            this.subscribe('requiredChange', this._handleSelfAnnotationRequiredChange, this);
            this.subscribe('labelChange', this._handleSelfAnnotationLabelChange, this);
            this.subscribe('errorChange', this._handleSelfAnnotationErrorChange, this);
            this._inSyncWithAnnotations = true;
        }

        if (this._propertyRequired !== undefined) this.setRequired(this._propertyRequired);
        else if (this._required !== undefined) this.setPropertyRequired(this._required);

        if (this._propertyLabel !== undefined) this.setLabel(this._propertyLabel);
        else if (this._label !== undefined) this.setPropertyLabel(this._label);

        if (this._propertyErrors !== undefined) this.setPropertyErrors(this._propertyErrors);
        else if (this._errors !== undefined) this.setPropertyErrors(this._errors);
    },
    
    _handleSelfAnnotationRequiredChange: function(required, oldRequired) {
        if (this._syncPropertyWithAnnotations && this._propertyRequired === undefined)
            this.setPropertyRequired(required);
    },
    
    _handleSelfAnnotationLabelChange: function(label, oldLabel) {
        if (this._syncPropertyWithAnnotations && this._propertyLabel === undefined) {
            this.setPropertyLabel(label);
        }
    },
    
    _handleSelfAnnotationErrorChange: function(error, oldError) {
        if (this._syncPropertyWithAnnotations && this._propertyErrors === undefined) {
            this.setPropertyErrors(error);
        }
    },
    
    setParentModel: function(parentModel) {
        var oldParentModel = this._parentModel;
        if (oldParentModel === parentModel) return;
        this._parentModel = parentModel;
        return true;
    },

    getParentModel: function() { return this._parentModel; },

    setParentPropertyPath: function(parentPropertyPath) {
        var oldParentPropertyPath = this._parentPropertyPath;
        if (oldParentPropertyPath === parentPropertyPath) return;
        this._parentPropertyPath = parentPropertyPath;
        return true;
    },

    getParentPropertyPath: function() { return this._parentPropertyPath; },

    setPropertyName: function(propertyName) {
        var oldPropertyName = this._propertyName;
        if (oldPropertyName === propertyName) return;
        this._propertyName = propertyName;
        return true;
    },

    getPropertyName: function() { return this._propertyName; },

    setPropertyLabel: function(propertyLabel) {
        var oldPropertyLabel = this._propertyLabel;
        if (oldPropertyLabel === propertyLabel) return;
        this._propertyLabel = propertyLabel;
        // re-validate since our error messages will change
        if (this._propertyErrors) this.validate();
        return true;
    },

    getPropertyLabel: function() { return this._propertyLabel; },

    setValidators: function(validators) {
        Amm.cleanup(true, this.validators);
        this._validators = [];
        if (!validators) return;
        if (!(validators instanceof Array)) {
            throw "`validators` must be an Array";
        }
        for (var i = 0; i < validators.length; i++) {
            var instance = Amm.Validator.construct(validators[i]);
            if (typeof instance.setElement === 'function')  {
                instance.setElement(this);
            } else if ('element' in instance) {
                instance.element = this;
            }
            this._validators.push(instance);
        }
        this.setNeedValidate(true);
    },
    
    /**
     * Generally, returns boolean (true if valid); sets propertyErrors property
     * Doesn't call validators or trigger onValidate event if property value is empty.
     * @param {onlyReturnErrors} boolean Return Array with errors; don't set this.propertyErrors
     * @returns Array|boolean
     */
    validate: function(onlyReturnErrors) {
        var value = this.getValue();
        var label = this.getPropertyLabel();
        var err, empty = this.getPropertyEmpty();
        var errors = [];
        if (this._propertyRequiredValidator) {
            var err = this._propertyRequiredValidator.getError(value, this.getPropertyLabel());
            if (err) {
                if (this._propertyRequired) errors.push(err);
                empty = true;
            } else {
                empty = false;
            }
        } else {
            if (empty && this._propertyRequired) {
                errors.push (Amm.translate(this.propertyRequiredMessage, '%field', label));
            }
        }
        if (!empty) { 
            this.outOnValidate(errors);
            for (var i = 0; i < this._validators.length; i++) {
                err = this._validators[i].getError(value, label);
                if (err) errors.push(err);
            }
        }
        if (onlyReturnErrors) {
            return errors;
        }
        this.setPropertyErrors(errors);
        this.setNeedValidate(false);
        return !errors.length;
    },
    
    outOnValidate: function(errors) {
        return this._out('onValidate', errors);
    },
    
    getValidators: function() { return this._validators; },

    setValidateMode: function(validateMode) {
        var oldValidateMode = this._validateMode;
        if (oldValidateMode === validateMode) return;
        this._validateMode = validateMode;
        return true;
    },

    getValidateMode: function() { return this._validateMode; },

    setPropertyErrors: function(propertyErrors) {
        var oldPropertyErrors = this._propertyErrors;
        var sameArrays = false;
        if (oldPropertyErrors instanceof Array && propertyErrors instanceof Array) {
            if (oldPropertyErrors.length === propertyErrors.length 
                && !Amm.Array.symmetricDiff(oldPropertyErrors, propertyErrors).length
            ) sameArrays = true;
        }
        if (oldPropertyErrors === propertyErrors || sameArrays) return;
        this._propertyErrors = propertyErrors;
        
        if (this._syncPropertyWithAnnotations && this['Annotated'] === '__INTERFACE__') {
            this.setError(propertyErrors);
        }
 
        this.outPropertyErrorsChange(propertyErrors, oldPropertyErrors);
        return true;
    },

    getPropertyErrors: function() {
        if (this._propertyErrors === undefined) this.validate(); 
        return this._propertyErrors;
    },

    outPropertyErrorsChange: function(propertyErrors, oldPropertyErrors) {
        this._out('propertyErrorsChange', propertyErrors, oldPropertyErrors);
    },

    setApplied: function(applied) {
        var oldApplied = this._applied;
        if (oldApplied === applied) return;
        this._applied = applied;
        this.outAppliedChange(applied, oldApplied);
        return true;
    },

    outAppliedChange: function(applied, oldApplied) {
        this._out('appliedChange', applied, oldApplied);
    },

    getApplied: function() { return this._applied; },
    
    setSyncPropertyWithAnnotations: function(syncPropertyWithAnnotations) {
        syncPropertyWithAnnotations = !!syncPropertyWithAnnotations;
        var oldSyncPropertyWithAnnotations = this._syncPropertyWithAnnotations;
        if (oldSyncPropertyWithAnnotations === syncPropertyWithAnnotations) return;
        this._syncPropertyWithAnnotations = syncPropertyWithAnnotations;
        if (this._syncPropertyWithAnnotations) this._syncWithAnnotations();
        return true;
    },

    getSyncPropertyWithAnnotations: function() { return this._syncPropertyWithAnnotations; },
    
    setPropertyRequired: function(propertyRequired) {
        var oldPropertyRequired = this._propertyRequired;
        if (oldPropertyRequired === propertyRequired) return;
        this._propertyRequired = propertyRequired;
        this.setNeedValidate(true);
        return true;
    },

    getPropertyRequired: function() { return this._propertyRequired; },
    
    setPropertyRequiredValidator: function(propertyRequiredValidator) {
        var oldPropertyRequiredValidator = this._propertyRequiredValidator;
        if (oldPropertyRequiredValidator === propertyRequiredValidator) return;
        if (propertyRequiredValidator) {
            if (typeof propertyRequiredValidator === 'function') {
                propertyRequiredValidator = new Amm.Validator.Function({func: propertyRequiredValidator});
            } else {
                propertyRequiredValidator = Amm.constructInstance(
                    propertyRequiredValidator, 'Amm.Validator'
                );
            }
            Amm.setProperty(propertyRequiredValidator, 'element', this);
        }
        this._propertyRequiredValidator = propertyRequiredValidator;
        this.setNeedValidate(true);
        return true;
    },

    getPropertyRequiredValidator: function() { return this._propertyRequiredValidator; },

    setPropertyEmpty: function(propertyEmpty) {
        var oldPropertyEmpty = this._propertyEmpty;
        if (oldPropertyEmpty === propertyEmpty) return;
        this._propertyEmpty = propertyEmpty;
 
        this.outPropertyEmptyChange(propertyEmpty, oldPropertyEmpty);
        return true;
    },
    
    _handlePropertyValueChange: function(value, oldValue) {
        this.setPropertyEmpty(this._isPropertyEmpty(value));
        this.setNeedValidate(true);
        if (this._validateMode & Amm.Trait.Property.VALIDATE_CHANGE)
            this.validate();
    },
    
    _handlePropertyFocusedChange: function(focused, oldFocused) {
        if (oldFocused && !focused && this._validateMode & Amm.Trait.Property.VALIDATE_BLUR & this._needValidate)
            this.validate();
    },

    _isPropertyEmpty: function(v) {
        var res = (v === undefined || v === null || v === '');
        return res;
    },
    
    getPropertyEmpty: function() { 
        if (this._propertyEmpty === undefined) {
            var pe = this._isPropertyEmpty(this.getValue());
            this.setPropertyEmpty(pe);
        }
        return this._propertyEmpty; 
    },

    outPropertyEmptyChange: function(propertyEmpty, oldPropertyEmpty) {
        this._out('propertyEmptyChange', propertyEmpty, oldPropertyEmpty);
    },
    
    setNeedValidate: function(needValidate) {
        needValidate = !!needValidate;
        if (this._needValidate === needValidate) return;
        var oldNeedValidate = this._needValidate;
        this._needValidate = needValidate;
        this._out('needValidateChange', needValidate, oldNeedValidate);
        return true;
    },
    
    outNeedValidateChange: function(needValidate, oldNeedValidate) {
        this._out('needValidateChange', needValidate, oldNeedValidate);
    },
    
    getNeedValidate: function() {
        return this._needValidate;
    }

};