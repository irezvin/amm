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
 * We had translation error during input
 */
Amm.Trait.Property.TRANSLATION_ERROR_IN = 1;

/**
 * We had translation error during output
 */
Amm.Trait.Property.TRANSLATION_ERROR_OUT = -1;

/**
 * Important! Property does not validate its' value when it's empty (has undefined, empty string or null)
 */
Amm.Trait.Property.prototype = {  

    'Property': '__INTERFACE__',

    _parentModel: null,

    _parentPropertyPath: null,

    _propertyName: undefined,
    
    _propertyLabel: undefined,

    _validators: null,

    _validateMode: Amm.Trait.Property.VALIDATE_CHANGE,

    _propertyErrors: undefined,
    
    _needValidate: false,

    _propertyPropertyApplied: null,
    
    _propertyRequired: undefined,
    
    propertyRequiredMessage: 'lang.Amm.Validator.Required.msg',
    
    _propertyRequiredValidator: null,
    
    _propertyEmpty: undefined,
    
    _propertyValue: undefined,
    
    _propertySyncsValue: false,
    
    _lockPropertyValueChange: 0,
    
    _lockAnnotationSync: 0,
    
    _propertyTranslator: null,
    
    _translationErrorState: null,
    
    _propertySyncWithAnnotations: true,
    
    _propertyInSyncWithAnnotations: false,
    
    __augment: function(traitInstance) {
        Amm.Element.regInit(this, '99.Amm.Trait.Property', function() {
            this._propertySyncsValue = !!Amm.detectProperty(this, 'value');
            if (this._propertySyncsValue) this.subscribe('valueChange', this._handlePropertyExtValueChange, this);
            if (Amm.detectProperty(this, 'focused')) {
                this.subscribe('focusedChange', this._handlePropertyFocusedChange, this);
            }
            if (this['Annotated'] === '__INTERFACE__' && this._propertySyncWithAnnotations) {
                this._syncWithAnnotations();
            }
            if (this._propertySyncsValue) {
                if (this._propertyValue === undefined) {
                    var v = this.getValue();
                    if (v !== undefined) {
                        this._handlePropertyExtValueChange(v, undefined);
                    }
                } else {
                    this._syncPropertyValueToElement(this._propertyValue);
                }
            }
        });
    },
    
    _syncWithAnnotations: function() {
        if (!this._propertyInSyncWithAnnotations) {
            this.subscribe('requiredChange', this._handleSelfAnnotationRequiredChange, this);
            this.subscribe('labelChange', this._handleSelfAnnotationLabelChange, this);
            this.subscribe('errorChange', this._handleSelfAnnotationErrorChange, this);
            this._propertyInSyncWithAnnotations = true;
        }

        if (this._propertyRequired !== undefined) this.setRequired(this._propertyRequired);
        else if (this._required !== undefined) this.setPropertyRequired(this._required);

        if (this._propertyLabel !== undefined) this.setLabel(this._propertyLabel);
        else if (this._label !== undefined) this.setPropertyLabel(this._label);

        if (this._propertyErrors !== undefined) this.setError(this._propertyErrors);
        else if (this._error !== undefined) this.setPropertyErrors(this._error);
    },
    
    getPropertySyncsValue: function() {
        return this._propertySyncsValue;
    },
    
    _handleSelfAnnotationRequiredChange: function(required, oldRequired) {
        if (this._lockAnnotationSync) return;
        if (this._propertyInSyncWithAnnotations && this._propertyRequired === undefined)
            this.setPropertyRequired(required);
    },
    
    _handleSelfAnnotationLabelChange: function(label, oldLabel) {
        if (this._lockAnnotationSync) return;
        if (this._propertyInSyncWithAnnotations && this._propertyLabel === undefined) {
            this.setPropertyLabel(label);
        }
    },
    
    _handleSelfAnnotationErrorChange: function(error, oldError) {
        if (this._lockAnnotationSync) return;
        if (this._propertyInSyncWithAnnotations && this._propertyErrors === undefined) {
            this.setPropertyErrors(error);
        }
    },
    
    setParentModel: function(parentModel) {
        if (parentModel) Amm.is(parentModel, 'Model', 'parentModel');
        else parentModel = null;
        var oldParentModel = this._parentModel;
        if (oldParentModel === parentModel) return;
        this._parentModel = parentModel;
        this.outParentModelChange(parentModel, oldParentModel);
        return true;
    },
    
    outParentModelChange: function(parentModel, oldParentModel) {
        return this._out('parentModelChange', parentModel, oldParentModel);
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
        if (this._propertyTranslator && this._propertyTranslator.field === oldPropertyLabel) {
            this._propertyTranslator.field = propertyLabel;
        }
        // re-validate since our error messages will change
        if (this._propertyErrors) this._revalidate();
        if (this._propertyInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('label')) {
            this._lockAnnotationSync++;
            this.setLabel(this._propertyLabel);
            this._lockAnnotationSync--;
        }
        this.outPropertyLabelChange(propertyLabel, oldPropertyLabel);
        return true;
    },

    getPropertyLabel: function() { return this._propertyLabel; },
    
    outPropertyLabelChange: function(propertyLabel, oldPropertyLabel) {
        return this._out('propertyLabelChange', propertyLabel, oldPropertyLabel);
    },
    
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
        if (this._translationErrorState) {
            if (onlyReturnErrors) return this._propertyErrors? [].concat(this._propertyErrors) : [];
            return false;
        }
        var value = this.getPropertyValue();
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
    
    _revalidate: function() {
        if (
            this._propertySyncsValue && 
            this._translationErrorState === Amm.Trait.Property.TRANSLATION_ERROR_IN
        ) {
            var v = this.getValue();
            this._handlePropertyExtValueChange(v, v);
        } else if (
            this._propertySyncsValue && 
            this._translationErrorState === Amm.Trait.Property.TRANSLATION_ERROR_OUT
        ) {
            this._syncPropertyValueToElement(this._propertyValue);
        } else {
            this.validate();
        }
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

    setPropertyErrors: function(propertyErrors, add) {
        var oldPropertyErrors = this._propertyErrors;
        var sameArrays = false;
        if (propertyErrors) {
            if (!(propertyErrors instanceof Array))
                propertyErrors = [propertyErrors];
            else if (!propertyErrors.length) propertyErrors = null;
        } else {
            if (propertyErrors !== undefined) propertyErrors = null;
        }
        if (add && this._propertyErrors) {
            if (!propertyErrors) return; // nothing to add
            var extra = Amm.Array.arrayDiff(propertyErrors, this._propertyErrors);
            if (!extra.length) return; // nothing to add
            propertyErrors = [].concat(this._propertyErrors, extra);
        } else {
            if (oldPropertyErrors instanceof Array && propertyErrors instanceof Array) {
                if (oldPropertyErrors.length === propertyErrors.length 
                    && !Amm.Array.symmetricDiff(oldPropertyErrors, propertyErrors).length
                ) sameArrays = true;
            }
        }
        if (oldPropertyErrors === propertyErrors || sameArrays) return;
        this._propertyErrors = propertyErrors;
        
        if (this._propertyInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('error')) {
            this._lockAnnotationSync++;
            this.setError(propertyErrors);
            this._lockAnnotationSync--;
        }
        
        this.outPropertyErrorsChange(propertyErrors, oldPropertyErrors);
        return true;
    },

    getPropertyErrors: function() {
        if (this._propertyErrors === undefined) this.validate(); 
        return this._propertyErrors? [].concat(this._propertyErrors) : null;
    },

    outPropertyErrorsChange: function(propertyErrors, oldPropertyErrors) {
        this._out('propertyErrorsChange', propertyErrors, oldPropertyErrors);
    },

    setPropertyApplied: function(propertyPropertyApplied) {
        var oldPropertyApplied = this._propertyPropertyApplied;
        if (oldPropertyApplied === propertyPropertyApplied) return;
        this._propertyPropertyApplied = propertyPropertyApplied;
        this.outPropertyAppliedChange(propertyPropertyApplied, oldPropertyApplied);
        return true;
    },

    outPropertyAppliedChange: function(propertyPropertyApplied, oldPropertyApplied) {
        this._out('propertyPropertyAppliedChange', propertyPropertyApplied, oldPropertyApplied);
    },

    getPropertyApplied: function() { return this._propertyPropertyApplied; },
    
    setPropertySyncWithAnnotations: function(propertySyncWithAnnotations) {
        propertySyncWithAnnotations = !!propertySyncWithAnnotations;
        var oldPropertySyncWithAnnotations = this._propertySyncWithAnnotations;
        if (oldPropertySyncWithAnnotations === propertySyncWithAnnotations) return;
        this._propertySyncWithAnnotations = propertySyncWithAnnotations;
        if (this._propertySyncWithAnnotations) this._syncWithAnnotations();
        return true;
    },

    getPropertySyncWithAnnotations: function() { return this._propertySyncWithAnnotations; },
    
    getPropertyInSyncWithAnnotations: function() { return this._propertyInSyncWithAnnotations; },
    
    setPropertyRequired: function(propertyRequired) {
        propertyRequired = !!propertyRequired;
        var oldPropertyRequired = this._propertyRequired;
        if (oldPropertyRequired === propertyRequired) return;
        this._propertyRequired = propertyRequired;
        if (this._propertyInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('required')) {
            this._lockAnnotationSync++;
            this.setRequired(this._propertyRequired);
            this._lockAnnotationSync--;
        }
        this.outPropertyRequiredChange(propertyRequired, oldPropertyRequired);
        this.setNeedValidate(true);
        return true;
    },
    
    outPropertyRequiredChange: function(propertyRequired, oldPropertyRequired) {
        return this._out('propertyRequiredChange', propertyRequired, oldPropertyRequired);
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
    
    _handlePropertyExtValueChange: function(value, oldValue) {
        if (this._lockPropertyValueChange) return;
        this._lockPropertyValueChange = 1;
        this._translationErrorState = 0;
        var err = {}, propertyValue = value;
        if (this._propertyTranslator) {
            propertyValue = this._propertyTranslator.translateIn(value, err);
        }
        if (err.error) {
            this._setInTranslationErrorState(propertyValue, err.error);
        } else {
            this.setPropertyValue(propertyValue);
        }
        this._lockPropertyValueChange = 0;
    },

    setPropertyValue: function(propertyValue) {
        var oldPropertyValue = this._propertyValue;
        if (oldPropertyValue === propertyValue) return;
        this._propertyValue = propertyValue;
        this.setPropertyEmpty(this._isPropertyEmpty(propertyValue));
        this.setNeedValidate(true);
        if (this._validateMode & Amm.Trait.Property.VALIDATE_CHANGE) {
            this.validate();
        }
        this.outPropertyValueChange(propertyValue, oldPropertyValue);
        
        if (!this._lockPropertyValueChange && this._propertySyncsValue) {
            this._syncPropertyValueToElement(propertyValue);
        }
        
        return true;
    },
    
    _syncPropertyValueToElement: function(propertyValue) {
        if (this._lockPropertyValueChange || !this._propertySyncsValue) return;
        this._translationErrorState = 0;
        this._lockPropertyValueChange = 1;
        var value = propertyValue, err = {};
        if (this._propertyTranslator) {
            value = this._propertyTranslator.translateOut(propertyValue, err);
        }
        if (err.error) {
            this._setOutTranslationErrorState(value, err.error);
        } else {
            this.setValue(value);
        }
        this._lockPropertyValueChange = 0;
    },
    
    _setInTranslationErrorState: function(propertyValue, error) {
        this._translationErrorState = Amm.Trait.Property.TRANSLATION_ERROR_IN;
        this.setPropertyValue(propertyValue);
        this.setPropertyErrors(error, true);
    },
    
    _setOutTranslationErrorState: function(value, error) {
        this._translationErrorState = Amm.Trait.Property.TRANSLATION_ERROR_OUT;
        this.setValue(value);
        this.setPropertyErrors(error, true);
    },

    getPropertyValue: function() { return this._propertyValue; },

    outPropertyValueChange: function(propertyValue, oldPropertyValue) {
        this._out('propertyValueChange', propertyValue, oldPropertyValue);
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
            var pe = this._isPropertyEmpty(this.getPropertyValue());
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
    },

    setPropertyTranslator: function(propertyTranslator) {
        if (propertyTranslator) 
            propertyTranslator = Amm.constructInstance(propertyTranslator, 'Amm.Translator');
        else
            propertyTranslator = null;
        var oldPropertyTranslator = this._propertyTranslator;
        if (oldPropertyTranslator === propertyTranslator) return;
        if (propertyTranslator && propertyTranslator.field === undefined)
            propertyTranslator.field = this.getPropertyLabel();
        this._propertyTranslator = propertyTranslator;
        if (this._translationErrorState) this._revalidate();
        return true;
    },

    getPropertyTranslator: function() { return this._propertyTranslator; },
    
    getTranslationErrorState: function() { return this._translationErrorState; },

};