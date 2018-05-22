/* global Amm */

Amm.Trait.Property = function() {
  
  this._validators = [];
  
};

Amm.Trait.Property.VALIDATE_SUBMIT = 0;
Amm.Trait.Property.VALIDATE_BLUR = 1;
Amm.Trait.Property.VALIDATE_CHANGE = 3;

/**
 * Important! Property does not validate its' value when it's empty (has undefined, empty string or null)
 */
Amm.Trait.Property.prototype = {  

    _parentModel: null,

    _parentPropertyPath: null,

    _propertyName: undefined,
    
    _propertyCaption: undefined,

    _validators: null,

    _validateMode: null,

    _validationErrors: undefined,
    
    _needValidate: false,

    _applied: null,
    
    _propertyRequired: undefined,
    
    propertyRequiredMessage: 'Amm.Validator.Required.message',
    
    _propertyRequiredValidator: null,
    
    _propertyEmpty: undefined,
    
    _syncPropertyWithAnnotations: true,
    
    __augment: function(traitInstance) {
        Amm.Element.regInit(this, '99.Amm.Trait.Property', function() {
            if (!Amm.detectProperty(this, 'value')) {
                throw "Element must have `value` property to be compatible with `Amm.Trait.Property` trait";
            }
            this.subscribe('valueChange', this._handlePropertyValueChange, this);
            this._handlePropertyValueChange(this._value, undefined);
            if (this['Annotated'] === '__INTERFACE__' && this._syncPropertyWithAnnotations) {
                this._syncWithAnnotations();
            }
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

        if (this._propertyCaption !== undefined) this.setLabel(this._propertyCaption);
        else if (this._label !== undefined) this.setPropertyCaption(this._label);

        if (this._validationErrors !== undefined) this.setErrors(this._validationErrors);
        else if (this._errors !== undefined) this.setValidationErrors(this._errors);
    },
    
    _handleSelfAnnotationRequiredChange: function(required, oldRequired) {
        if (this._syncPropertyWithAnnotations && this._propertyRequired === undefined)
            this.setPropertyRequired(required);
    },
    
    _handleSelfAnnotationLabelChange: function(caption, oldCaption) {
        if (this._syncPropertyWithAnnotations && this._propertyCaption === undefined) {
            this.setPropertyCaption(caption);
        }
    },
    
    _handleSelfAnnotationErrorChange: function(error, oldError) {
        if (this._syncPropertyWithAnnotations && this._validationErrors === undefined) {
            this.setValidationErrors(error);
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

    setPropertyCaption: function(propertyCaption) {
        var oldPropertyCaption = this._propertyCaption;
        if (oldPropertyCaption === propertyCaption) return;
        this._propertyCaption = propertyCaption;
        return true;
    },

    getPropertyCaption: function() { return this._propertyCaption; },

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
     * Generally, returns boolean (true if valid); sets validationErrors property
     * Doesn't call validators or trigger onValidate event if property value is empty.
     * @param {onlyReturnErrors} boolean Return Array with errors; don't set this.validationErrors
     * @returns Array|boolean
     */
    validate: function(onlyReturnErrors) {
        var value = this.getValue();
        var caption = this.getPropertyCaption();
        var err, empty = this.getPropertyEmpty();
        var errors = [];
        if (this._propertyRequiredValidator) {
            var err = this._propertyRequiredValidator.getError(value, this.getPropertyCaption());
            if (err) {
                if (this._propertyRequired) errors.push(err);
                empty = true;
            } else {
                empty = false;
            }
        } else {
            if (empty && this._propertyRequired) {
                errors.push (Amm.translate(this.propertyRequiredMessage, '%field', caption));
            }
        }
        if (!empty) { 
            this.outOnValidate(errors);
            for (var i = 0; i < this._validators.length; i++) {
                err = this._validators[i].getError(value, caption);
                if (err) errors.push(err);
            }
        }
        if (onlyReturnErrors) {
            return errors;
        }
        this.setValidationErrors(errors);
        this.setNeedValidate(false);
        return !errors.length;
    },
    
    outOnValidate: function(errors) {
    },
    
    getValidators: function() { return this._validators; },

    setValidateMode: function(validateMode) {
        var oldValidateMode = this._validateMode;
        if (oldValidateMode === validateMode) return;
        this._validateMode = validateMode;
        return true;
    },

    getValidateMode: function() { return this._validateMode; },

    setValidationErrors: function(validationErrors) {
        var oldValidationErrors = this._validationErrors;
        var sameArrays = false;
        if (oldValidationErrors instanceof Array && validationErrors instanceof Array) {
            if (oldValidationErrors.length === validationErrors.length 
                && !Amm.Array.symmetricDiff(oldValidationErrors, validationErrors).length
            ) sameArrays = true;
        }
        if (oldValidationErrors === validationErrors || sameArrays) return;
        this._validationErrors = validationErrors;
        
        if (this._syncPropertyWithAnnotations && this['Annotated'] === '__INTERFACE__') {
            this.setError(validationErrors);
        }
 
        this.outValidationErrorsChange(validationErrors, oldValidationErrors);
        return true;
    },

    getValidationErrors: function() {
        if (this._validationErrors === undefined) this.validate(); 
        return this._validationErrors;
    },

    outValidationErrorsChange: function(validationErrors, oldValidationErrors) {
        this._out('validationErrorsChange', validationErrors, oldValidationErrors);
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
