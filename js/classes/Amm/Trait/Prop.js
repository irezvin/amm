/* global Amm */

Amm.Trait.Prop = function() {
  
  this._validators = [];
  
};

/**
 * Never automatically validate
 */
Amm.Trait.Prop.VALIDATE_NEVER = 0;

/**
 * Validates when editor loses focus (`focused` prop changes from TRUE to FALSE)
 */
Amm.Trait.Prop.VALIDATE_BLUR = 1;

/**
 * Validates when `valueChange` event is triggered
 */ 
Amm.Trait.Prop.VALIDATE_CHANGE = 2;

/**
 * Validates both on lost focus or valueChange event
 */
Amm.Trait.Prop.VALIDATE_BLUR_CHANGE = 3;

/**
 * Validates when validation expressions are changed
 */ 
Amm.Trait.Prop.VALIDATE_EXPRESSIONS = 4;

/**
 * We had translation error during input
 */
Amm.Trait.Prop.TRANSLATION_ERROR_IN = 1;

/**
 * We had translation error during output
 */
Amm.Trait.Prop.TRANSLATION_ERROR_OUT = -1;

/**
 * Important! Prop does not validate its' value when it's empty (has undefined, empty string or null)
 */
Amm.Trait.Prop.prototype = {  

    'Prop': '__INTERFACE__',

    _parentModel: null,

    _parentPropPath: null,

    _propName: undefined,
    
    _propLabel: undefined,

    _validators: null,

    _validateMode: Amm.Trait.Prop.VALIDATE_CHANGE | Amm.Trait.Prop.VALIDATE_EXPRESSIONS,

    _propErrors: undefined,
    
    _needValidate: false,

    _propPropApplied: null,
    
    _propRequired: undefined,
    
    propRequiredMessage: 'lang.Amm.Validator.Required.msg',
    
    _propRequiredValidator: null,
    
    _propEmpty: undefined,
    
    _propValue: undefined,
    
    _propSyncsValue: false,
    
    _lockPropValueChange: 0,
    
    _lockAnnotationSync: 0,
    
    _propTranslator: null,
    
    _translationErrorState: null,
    
    _propSyncWithAnnotations: true,
    
    _propInSyncWithAnnotations: false,
    
    _initValidationExpressions: null,
    
    _validationExpressions: null,
    
    _propIndex: null,
    
    __augment: function(traitInstance, options) {
        Amm.Element.regInit(this, '99.Amm.Trait.Prop', function() {
            this._propSyncsValue = !!Amm.detectProperty(this, 'value');
            if (this._propSyncsValue) this.subscribe('valueChange', this._handlePropExtValueChange, this);
            if (Amm.detectProperty(this, 'focused')) {
                this.subscribe('focusedChange', this._handlePropFocusedChange, this);
            }
            if (this['Annotated'] === '__INTERFACE__' && this._propSyncWithAnnotations) {
                this._syncWithAnnotations();
            }
            if (this._propSyncsValue) {
                if (this._propValue === undefined) {
                    var v = this.getValue();
                    if (v !== undefined) {
                        this._handlePropExtValueChange(v, undefined);
                    }
                } else {
                    this._syncPropValueToElement(this._propValue);
                }
            }
        });
    },
    
    _syncWithAnnotations: function() {
        if (!this._propInSyncWithAnnotations) {
            this.subscribe('requiredChange', this._handleSelfAnnotationRequiredChange, this);
            this.subscribe('labelChange', this._handleSelfAnnotationLabelChange, this);
            this.subscribe('errorChange', this._handleSelfAnnotationErrorChange, this);
            this._propInSyncWithAnnotations = true;
        }

        if (this._propRequired !== undefined) this.setRequired(this._propRequired);
        else if (this._required !== undefined) this.setPropRequired(this._required);

        if (this._propLabel !== undefined) this.setLabel(this._propLabel);
        else if (this._label !== undefined) this.setPropLabel(this._label);

        if (this._propErrors !== undefined) this.setError(this._propErrors);
        else if (this._error !== undefined) this.setPropErrors(this._error);
    },
    
    getPropSyncsValue: function() {
        return this._propSyncsValue;
    },
    
    _handleSelfAnnotationRequiredChange: function(required, oldRequired) {
        if (this._lockAnnotationSync) return;
        if (this._propInSyncWithAnnotations && this._propRequired === undefined)
            this.setPropRequired(required);
    },
    
    _handleSelfAnnotationLabelChange: function(label, oldLabel) {
        if (this._lockAnnotationSync) return;
        if (this._propInSyncWithAnnotations && this._propLabel === undefined) {
            this.setPropLabel(label);
        }
    },
    
    _handleSelfAnnotationErrorChange: function(error, oldError) {
        if (this._lockAnnotationSync) return;
        if (this._propInSyncWithAnnotations && this._propErrors === undefined) {
            this.setPropErrors(error);
        }
    },
    
    setParentModel: function(parentModel) {
        if (parentModel) Amm.is(parentModel, 'Model', 'parentModel');
        else parentModel = null;
        var oldParentModel = this._parentModel;
        if (oldParentModel === parentModel) return;
        if (oldParentModel) {
            var idx = oldParentModel.displayChildren.strictIndexOf(this);
            if (idx >= 0) oldParentModel.displayChildren.removeAtIndex(idx);
        }
        if (parentModel) {
            var idxNew = parentModel.displayChildren.strictIndexOf(this);
            if (idxNew < 0) parentModel.displayChildren.accept(this);
        }
        this._parentModel = parentModel;
        this.outParentModelChange(parentModel, oldParentModel);
        return true;
    },
    
    outParentModelChange: function(parentModel, oldParentModel) {
        return this._out('parentModelChange', parentModel, oldParentModel);
    },

    getParentModel: function() { return this._parentModel; },

    setParentPropPath: function(parentPropPath) {
        var oldParentPropPath = this._parentPropPath;
        if (oldParentPropPath === parentPropPath) return;
        this._parentPropPath = parentPropPath;
        return true;
    },

    getParentPropPath: function() { return this._parentPropPath; },

    setPropName: function(propName) {
        var oldPropName = this._propName;
        if (oldPropName === propName) return;
        this._propName = propName;
        this.outPropNameChange(propName, oldPropName);
        return true;
    },

    setPropIndex: function(propIndex) {
        var oldPropIndex = this._propIndex;
        if (oldPropIndex === propIndex) return;
        this._propIndex = propIndex;
 
        this.outPropIndexChange(propIndex, oldPropIndex);
        return true;
    },

    getPropIndex: function() { return this._propIndex; },

    outPropIndexChange: function(propIndex, oldPropIndex) {
        this._out('propIndexChange', propIndex, oldPropIndex);
    },

    getPropName: function() { return this._propName; },
    
    outPropName: function(propName, oldPropName) {
        return this._out(propName, oldPropName);
    },

    setPropLabel: function(propLabel) {
        var oldPropLabel = this._propLabel;
        if (oldPropLabel === propLabel) return;
        this._propLabel = propLabel;
        if (this._propTranslator && this._propTranslator.field === oldPropLabel) {
            this._propTranslator.field = propLabel;
        }
        // re-validate since our error messages will change
        if (this._propErrors) this._revalidate();
        if (this._propInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('label')) {
            this._lockAnnotationSync++;
            this.setLabel(this._propLabel);
            this._lockAnnotationSync--;
        }
        this.outPropLabelChange(propLabel, oldPropLabel);
        return true;
    },

    getPropLabel: function() { return this._propLabel; },
    
    outPropLabelChange: function(propLabel, oldPropLabel) {
        return this._out('propLabelChange', propLabel, oldPropLabel);
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
     * Generally, returns boolean (true if valid); sets propErrors prop
     * Doesn't call validators or trigger onValidate event if prop value is empty.
     * @param {onlyReturnErrors} boolean Return Array with errors; don't set this.propErrors
     * @returns Array|boolean
     */
    validate: function(onlyReturnErrors) {
        if (this._translationErrorState) {
            if (onlyReturnErrors) return this._propErrors? [].concat(this._propErrors) : [];
            return false;
        }
        var value = this.getPropValue();
        var label = this.getPropLabel();
        var err, empty = this.getPropEmpty();
        var errors = [];
        if (this._propRequiredValidator) {
            var err = this._propRequiredValidator.getError(value, this.getPropLabel());
            if (err) {
                if (this._propRequired) errors.push(err);
                empty = true;
            } else {
                empty = false;
            }
        } else {
            if (empty && this._propRequired) {
                errors.push (Amm.translate(this.propRequiredMessage, '%field', label));
            }
        }
        if (!empty) {
            this.outOnValidate(value, errors);
            if (this._validationExpressions) {
                this._applyValidationExpressions(errors);
            }
            for (var i = 0; i < this._validators.length; i++) {
                err = this._validators[i].getError(value, label);
                if (err) errors.push(err);
            }
        }
        if (onlyReturnErrors) {
            return errors;
        }
        this.setPropErrors(errors);
        this.setNeedValidate(false);
        return !errors.length;
    },
    
    _revalidate: function() {
        if (
            this._propSyncsValue && 
            this._translationErrorState === Amm.Trait.Prop.TRANSLATION_ERROR_IN
        ) {
            var v = this.getValue();
            this._handlePropExtValueChange(v, v);
        } else if (
            this._propSyncsValue && 
            this._translationErrorState === Amm.Trait.Prop.TRANSLATION_ERROR_OUT
        ) {
            this._syncPropValueToElement(this._propValue);
        } else {
            this.validate();
        }
    },
    
    outOnValidate: function(value, errors) {
        return this._out('onValidate', value, errors);
    },
    
    getValidators: function() { return this._validators; },

    setValidateMode: function(validateMode) {
        var oldValidateMode = this._validateMode;
        if (oldValidateMode === validateMode) return;
        this._validateMode = validateMode;
        return true;
    },

    getValidateMode: function() { return this._validateMode; },

    setPropErrors: function(propErrors, add) {
        var oldPropErrors = this._propErrors;
        var sameArrays = false;
        if (propErrors) {
            if (!(propErrors instanceof Array))
                propErrors = [propErrors];
            else if (!propErrors.length) propErrors = null;
        } else {
            if (propErrors !== undefined) propErrors = null;
        }
        if (add && this._propErrors) {
            if (!propErrors) return; // nothing to add
            var extra = Amm.Array.arrayDiff(propErrors, this._propErrors);
            if (!extra.length) return; // nothing to add
            propErrors = [].concat(this._propErrors, extra);
        } else {
            if (oldPropErrors instanceof Array && propErrors instanceof Array) {
                if (oldPropErrors.length === propErrors.length 
                    && !Amm.Array.symmetricDiff(oldPropErrors, propErrors).length
                ) sameArrays = true;
            }
        }
        if (oldPropErrors === propErrors || sameArrays) return;
        this._propErrors = propErrors;
        
        if (this._propInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('error')) {
            this._lockAnnotationSync++;
            this.setError(propErrors);
            this._lockAnnotationSync--;
        }
        
        this.outPropErrorsChange(propErrors, oldPropErrors);
        return true;
    },

    getPropErrors: function() {
        if (this._propErrors === undefined) this.validate(); 
        return this._propErrors? [].concat(this._propErrors) : null;
    },

    outPropErrorsChange: function(propErrors, oldPropErrors) {
        this._out('propErrorsChange', propErrors, oldPropErrors);
    },

    setPropApplied: function(propPropApplied) {
        var oldPropApplied = this._propPropApplied;
        if (oldPropApplied === propPropApplied) return;
        this._propPropApplied = propPropApplied;
        this.outPropAppliedChange(propPropApplied, oldPropApplied);
        return true;
    },

    outPropAppliedChange: function(propPropApplied, oldPropApplied) {
        this._out('propPropAppliedChange', propPropApplied, oldPropApplied);
    },

    getPropApplied: function() { return this._propPropApplied; },
    
    setPropSyncWithAnnotations: function(propSyncWithAnnotations) {
        propSyncWithAnnotations = !!propSyncWithAnnotations;
        var oldPropSyncWithAnnotations = this._propSyncWithAnnotations;
        if (oldPropSyncWithAnnotations === propSyncWithAnnotations) return;
        this._propSyncWithAnnotations = propSyncWithAnnotations;
        if (this._propSyncWithAnnotations) this._syncWithAnnotations();
        return true;
    },

    getPropSyncWithAnnotations: function() { return this._propSyncWithAnnotations; },
    
    getPropInSyncWithAnnotations: function() { return this._propInSyncWithAnnotations; },
    
    setPropRequired: function(propRequired) {
        propRequired = !!propRequired;
        var oldPropRequired = this._propRequired;
        if (oldPropRequired === propRequired) return;
        this._propRequired = propRequired;
        if (this._propInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('required')) {
            this._lockAnnotationSync++;
            this.setRequired(this._propRequired);
            this._lockAnnotationSync--;
        }
        this.outPropRequiredChange(propRequired, oldPropRequired);
        this.setNeedValidate(true);
        return true;
    },
    
    outPropRequiredChange: function(propRequired, oldPropRequired) {
        return this._out('propRequiredChange', propRequired, oldPropRequired);
    },

    getPropRequired: function() { return this._propRequired; },
    
    setPropRequiredValidator: function(propRequiredValidator) {
        var oldPropRequiredValidator = this._propRequiredValidator;
        if (oldPropRequiredValidator === propRequiredValidator) return;
        if (propRequiredValidator) {
            if (typeof propRequiredValidator === 'function') {
                propRequiredValidator = new Amm.Validator.Function({func: propRequiredValidator});
            } else {
                propRequiredValidator = Amm.constructInstance(
                    propRequiredValidator, 'Amm.Validator'
                );
            }
            Amm.setProp(propRequiredValidator, 'element', this);
        }
        this._propRequiredValidator = propRequiredValidator;
        this.setNeedValidate(true);
        return true;
    },

    getPropRequiredValidator: function() { return this._propRequiredValidator; },

    setPropEmpty: function(propEmpty) {
        var oldPropEmpty = this._propEmpty;
        if (oldPropEmpty === propEmpty) return;
        this._propEmpty = propEmpty;
 
        this.outPropEmptyChange(propEmpty, oldPropEmpty);
        return true;
    },
    
    _handlePropExtValueChange: function(value, oldValue) {
        if (this._lockPropValueChange) return;
        this._lockPropValueChange = 1;
        this._translationErrorState = 0;
        var err = {}, propValue = value;
        if (this._propTranslator) {
            propValue = this._propTranslator.translateIn(value, err);
        }
        if (err.error) {
            this._setInTranslationErrorState(propValue, err.error);
        } else {
            this.setPropValue(propValue);
        }
        this._lockPropValueChange = 0;
    },

    setPropValue: function(propValue) {
        var oldPropValue = this._propValue;
        if (oldPropValue === propValue) return;
        this._propValue = propValue;
        this.setPropEmpty(this._isPropEmpty(propValue));
        this.setNeedValidate(true);
        this.outPropValueChange(propValue, oldPropValue);
        // check for _needValidate since validate() may be called during
        // "outPropValueChange" invocation
        if (this._validateMode & Amm.Trait.Prop.VALIDATE_CHANGE && this._needValidate) {
            this.validate();
        }
        if (!this._lockPropValueChange && this._propSyncsValue) {
            this._syncPropValueToElement(propValue);
        }
        
        return true;
    },
    
    _syncPropValueToElement: function(propValue) {
        if (this._lockPropValueChange || !this._propSyncsValue) return;
        this._translationErrorState = 0;
        this._lockPropValueChange = 1;
        var value = propValue, err = {};
        if (this._propTranslator) {
            value = this._propTranslator.translateOut(propValue, err);
        }
        if (err.error) {
            this._setOutTranslationErrorState(value, err.error);
        } else {
            this.setValue(value);
        }
        this._lockPropValueChange = 0;
    },
    
    _setInTranslationErrorState: function(propValue, error) {
        this._translationErrorState = Amm.Trait.Prop.TRANSLATION_ERROR_IN;
        this.setPropValue(propValue);
        this.setPropErrors(error, false);
    },
    
    _setOutTranslationErrorState: function(value, error) {
        this._translationErrorState = Amm.Trait.Prop.TRANSLATION_ERROR_OUT;
        this.setValue(value);
        this.setPropErrors(error, false);
    },

    getPropValue: function() { return this._propValue; },

    outPropValueChange: function(propValue, oldPropValue) {
        this._out('propValueChange', propValue, oldPropValue);
    },

    _handlePropFocusedChange: function(focused, oldFocused) {
        if (oldFocused && !focused && this._validateMode & Amm.Trait.Prop.VALIDATE_BLUR & this._needValidate)
            this.validate();
    },

    _isPropEmpty: function(v) {
        var res = (v === undefined || v === null || v === '');
        return res;
    },
    
    getPropEmpty: function() { 
        if (this._propEmpty === undefined) {
            var pe = this._isPropEmpty(this.getPropValue());
            this.setPropEmpty(pe);
        }
        return this._propEmpty; 
    },

    outPropEmptyChange: function(propEmpty, oldPropEmpty) {
        this._out('propEmptyChange', propEmpty, oldPropEmpty);
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

    setPropTranslator: function(propTranslator) {
        if (propTranslator) 
            propTranslator = Amm.constructInstance(propTranslator, 'Amm.Translator');
        else
            propTranslator = null;
        var oldPropTranslator = this._propTranslator;
        if (oldPropTranslator === propTranslator) return;
        if (propTranslator && propTranslator.field === undefined)
            propTranslator.field = this.getPropLabel();
        this._propTranslator = propTranslator;
        if (this._translationErrorState) this._revalidate();
        return true;
    },

    getPropTranslator: function() { return this._propTranslator; },
    
    getTranslationErrorState: function() { return this._translationErrorState; },
    
    setValidationExpressions: function(validationExpressions) {
        if (this._validationExpressions) {
            Amm.cleanup(this._validationExpressions);
        }
        this._validationExpressions = null;
        if (!validationExpressions) {
            return;
        } else if (!(validationExpressions instanceof Array)) {
            throw "`validationExpressions` must be an Array or FALSEable, provided: "
                    + Amm.describeType(validationExpressions);
        }
        if (!validationExpressions.length) {
            return;
        }
        this._validationExpressions = [];
        for (var i = 0, l = validationExpressions.length; i < l; i++) {
            var expression = this._createExpression(validationExpressions[i]);
            this._validationExpressions.push(expression);
            expression.subscribe('valueChange', this._handleValidationExpressionChange, this, i);
        }
    },
    
    _handleValidationExpressionChange: function(value, oldValue) {
        // var extra = arguments[arguments.length - 1];
        this.setNeedValidate(true);
        if (this._validateMode & Amm.Trait.Prop.VALIDATE_EXPRESSIONS) {
            this.validate();
        }
    },
    
    _applyValidationExpressions: function(errors) {
        if (!this._validationExpressions) return;
        var label = this.getPropLabel();
        for (var i = 0, l = this._validationExpressions.length; i < l; i++) {
            var e = this._validationExpressions[i].getValue();
            if (e) {
                var msg = Amm.translate(e + "", '%field', label);
                errors.push(msg);
            }
        }
    }
    
};