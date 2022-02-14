/* global Amm */

Amm.Trait.Field = function() {
  
  this._validators = [];
  
};

/**
 * Never automatically validate
 */
Amm.Trait.Field.VALIDATE_NEVER = 0;

/**
 * Validates when editor loses focus (`focused` field changes from TRUE to FALSE)
 */
Amm.Trait.Field.VALIDATE_BLUR = 1;

/**
 * Validates when `valueChange` event is triggered
 */ 
Amm.Trait.Field.VALIDATE_CHANGE = 2;

/**
 * Validates both on lost focus or valueChange event
 */
Amm.Trait.Field.VALIDATE_BLUR_CHANGE = 3;

/**
 * Validates when validation expressions are changed
 */ 
Amm.Trait.Field.VALIDATE_EXPRESSIONS = 4;

/**
 * Validates instantly when `needValidate` becomes TRUE
 */ 
Amm.Trait.Field.VALIDATE_INSTANT = 8;

/**
 * We had translation error during input
 */
Amm.Trait.Field.TRANSLATION_ERROR_IN = 1;

/**
 * We had translation error during output
 */
Amm.Trait.Field.TRANSLATION_ERROR_OUT = -1;

/**
 * Important! Field does not validate its' value when it's empty (has undefined, empty string or null)
 */
Amm.Trait.Field.prototype = {  

    'Field': '__INTERFACE__',

    _form: null,

    // _fieldName defaults to element.getId() if 'undefined'
    _fieldName: undefined,
    
    _fieldLabel: undefined,

    _validators: null,

    _validateMode: Amm.Trait.Field.VALIDATE_CHANGE | Amm.Trait.Field.VALIDATE_EXPRESSIONS,

    _fieldLocalErrors: undefined,
    
    _fieldRemoteErrors: undefined,
    
    _fieldErrors: undefined,
    
    _needValidate: false,

    _fieldApplied: true,
    
    _fieldRequired: undefined,
    
    fieldRequiredMessage: 'lang.Amm.Validator.Required.msg',
    
    _fieldRequiredValidator: null,
    
    _fieldEmpty: undefined,
    
    _fieldValue: undefined,
    
    _fieldSyncsValue: false,
    
    _lockFieldValueChange: 0,
    
    _lockAnnotationSync: 0,
    
    _fieldTranslator: null,
        
    _translationErrorState: null,
    
    _fieldSyncWithAnnotations: true,
    
    _fieldInSyncWithAnnotations: false,
        
    _initValidationExpressions: null,
    
    _validationExpressions: null,
    
    _fieldIndex: undefined,
    
    __augment: function(traitInstance, options) {
        
        Amm.Element.regInit(this, '99.Amm.Trait.Field', function() {
            this._fieldSyncsValue = !!Amm.detectProperty(this, 'value');
            if (this._fieldSyncsValue) this.subscribe('valueChange', this._handleFormExtValueChange, this);
            if (Amm.detectProperty(this, 'focused')) {
                this.subscribe('focusedChange', this._handleFieldFocusedChange, this);
            }
            if (this['Annotated'] === '__INTERFACE__' && this._fieldSyncWithAnnotations) {
                this._syncWithAnnotations();
            }
            if (this._fieldSyncsValue) {
                if (this._fieldValue === undefined) {
                    var v = this.getValue();
                    if (v !== undefined) {
                        this._handleFormExtValueChange(v, undefined);
                    }
                } else {
                    this._syncFieldValueToElement(this._fieldValue);
                }
            }
        });
    },
    
    _syncWithAnnotations: function() {
        if (!this._fieldInSyncWithAnnotations) {
            this.subscribe('requiredChange', this._handleSelfAnnotationRequiredChange, this);
            this.subscribe('labelChange', this._handleSelfAnnotationLabelChange, this);
            this.subscribe('errorChange', this._handleSelfAnnotationErrorChange, this);
            this._fieldInSyncWithAnnotations = true;
        }

        if (this._fieldRequired !== undefined) this.setRequired(this._fieldRequired);
        else if (this._required !== undefined) this.setFieldRequired(this._required);

        if (this._fieldLabel !== undefined) this.setLabel(this._fieldLabel);
        else if (this._label !== undefined) this.setFieldLabel(this._label);

        if (this._fieldErrors !== undefined) this.setError(this._fieldErrors);
        else if (this._error !== undefined) this.setFieldRemoteErrors(this._error);
    },
    
    getFieldSyncsValue: function() {
        return this._fieldSyncsValue;
    },
    
    _handleSelfAnnotationRequiredChange: function(required, oldRequired) {
        if (this._lockAnnotationSync) return;
        if (this._fieldInSyncWithAnnotations && this._fieldRequired === undefined)
            this.setFieldRequired(required);
    },
    
    _handleSelfAnnotationLabelChange: function(label, oldLabel) {
        if (this._lockAnnotationSync) return;
        if (this._fieldInSyncWithAnnotations && this._fieldLabel === undefined) {
            this.setFieldLabel(label);
        }
    },
    
    _handleSelfAnnotationErrorChange: function(error, oldError) {
        if (this._lockAnnotationSync) return;
        if (this._fieldInSyncWithAnnotations && this._fieldLocalErrors === undefined) {
            this.setFieldLocalErrors(error);
        }
    },
    
    setForm: function(form) {
        if (form) Amm.is(form, 'Form', 'form');
        else form = null;
        var oldForm = this._form;
        if (oldForm === form) return;
        if (oldForm) {
            var idx = oldForm.fields.strictIndexOf(this);
            if (idx >= 0) oldForm.fields.removeAtIndex(idx);
        }
        if (form) {
            var idxNew = form.fields.strictIndexOf(this);
            if (idxNew < 0) form.fields.accept(this);
        }
        this._form = form;
        this._callOwnMethods('_setForm_', this._form, oldForm);
        this.outFormChange(form, oldForm);
        return true;
    },
    
    outFormChange: function(form, oldForm) {
        return this._out('formChange', form, oldForm);
    },

    getForm: function() { return this._form; },

    setFieldName: function(fieldName) {
        var oldFieldName = this._fieldName;
        if (oldFieldName === fieldName) return;
        this._fieldName = fieldName;
        this.outFieldNameChange(fieldName, oldFieldName);
        return true;
    },

    getFieldName: function() { 
        if (this._fieldName === undefined) return this._id;
        return this._fieldName; 
    },
    
    _setId_Field: function(id, oldId) {
        if (this._fieldName === undefined) this.outFieldNameChange(id, oldId);
    },
    
    outFieldNameChange: function(name, oldName) {
        this._callOwnMethods('_fieldNameChange_', name, oldName);
        this._out('fieldNameChange', name, oldName);
    },

    setFieldIndex: function(fieldIndex) {
        var oldFieldIndex = this._fieldIndex;
        if (oldFieldIndex === fieldIndex) return;
        this._fieldIndex = fieldIndex;
 
        this.outFieldIndexChange(fieldIndex, oldFieldIndex);
        return true;
    },

    getFieldIndex: function() { return this._fieldIndex; },

    outFieldIndexChange: function(fieldIndex, oldFieldIndex) {
        this._out('fieldIndexChange', fieldIndex, oldFieldIndex);
    },
    
    setFieldLabel: function(fieldLabel) {
        var oldFieldLabel = this._fieldLabel;
        if (oldFieldLabel === fieldLabel) return;
        this._fieldLabel = fieldLabel;
        if (this._fieldTranslator && this._fieldTranslator.field === oldFieldLabel) {
            this._fieldTranslator.field = fieldLabel;
        }
        // re-validate since our error messages will change
        if (this._fieldLocalErrors) this._revalidate();
        if (this._fieldInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('label')) {
            this._lockAnnotationSync++;
            this.setLabel(this._fieldLabel);
            this._lockAnnotationSync--;
        }
        this.outFieldLabelChange(fieldLabel, oldFieldLabel);
        return true;
    },

    getFieldLabel: function() { return this._fieldLabel; },
    
    outFieldLabelChange: function(fieldLabel, oldFieldLabel) {
        return this._out('fieldLabelChange', fieldLabel, oldFieldLabel);
    },
    
    setValidators: function(validators) {
        Amm.cleanup(true, this.validators);
        this._validators = [];
        if (!validators) return;
        if (!(validators instanceof Array)) {
            Error("`validators` must be an Array");
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
     * Generally, returns boolean (true if valid); sets fieldLocalErrors field
     * Doesn't call validators or trigger onValidate event if field value is empty.
     * Fields with !getFieldApplied() are always valid
     * 
     * @param {onlyReturnErrors} boolean Return Array with errors; don't set this.fieldLocalErrors
     * @returns Array|boolean
     */
    validate: function(onlyReturnErrors) {
        if (!this._fieldApplied) {
            if (onlyReturnErrors) return [];
            return true;
        }
        if (this._translationErrorState) {
            if (onlyReturnErrors) return this._fieldLocalErrors? [].concat(this._fieldLocalErrors) : [];
            return false;
        }
        var errors = [];
        var empty = this.getFieldEmpty();
        var value = this.getFieldValue();
        var label = this.getFieldLabel();
        this._doValidate(errors, value, empty, label);
        if (onlyReturnErrors) {
            return errors;
        }
        this.setFieldLocalErrors(errors);
        this.setNeedValidate(false);
        this.outAfterFieldValidate(!errors.length, errors);
        return !errors.length;
    },
    
    outAfterFieldValidate: function(isValid, errors) {
        return this._out('afterFieldValidate', isValid, errors);
    },
    
    _doValidate: function(errors, value, empty, label) {
        var err;
        if (this._fieldRequiredValidator) {
            err = this._fieldRequiredValidator.getError(value, this.getFieldLabel());
            if (err) {
                if (this._fieldRequired) errors.push(err);
                empty = true;
            } else {
                empty = false;
            }
        } else {
            if (empty && this._fieldRequired) { 
                if (!this['Data']) { // when editing Data fields, required validation is done by model
                    errors.push(Amm.translate(this.fieldRequiredMessage, '%field', label));
                }
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
    },
    
    _revalidate: function() {
        if (
            this._fieldSyncsValue && 
            this._translationErrorState === Amm.Trait.Field.TRANSLATION_ERROR_IN
        ) {
            var v = this.getValue();
            this._handleFormExtValueChange(v, v);
        } else if (
            this._fieldSyncsValue && 
            this._translationErrorState === Amm.Trait.Field.TRANSLATION_ERROR_OUT
        ) {
            this._syncFieldValueToElement(this._fieldValue);
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
        if (this._needValidate && validateMode & (Amm.Trait.Field.VALIDATE_INSTANT)) {
            this.validate();
        }
        return true;
    },

    getValidateMode: function() { return this._validateMode; },

    _setFieldErrorsArray: function(targetProperty, errors, add) {
        var oldValue = this[targetProperty];
        var sameArrays = false;
        if (errors) {
            if (!(errors instanceof Array))
                errors = [errors];
            else if (!errors.length) errors = null;
        } else {
            if (errors !== undefined) errors = null;
        }
        if (add && this[targetProperty]) {
            if (!errors) return false; // nothing to add
            var extra = Amm.Array.diff(errors, this[targetProperty]);
            if (!extra.length) return false; // nothing to add
            errors = [].concat(this[targetProperty], extra);
        } else {
            if (oldValue instanceof Array && errors instanceof Array) {
                if (oldValue.length === errors.length 
                    && !Amm.Array.symmetricDiff(oldValue, errors).length
                    && !Amm.Array.symmetricDiff(errors, oldValue).length
                ) sameArrays = true;
            }
        }
        if (oldValue === errors || sameArrays) return false;
        this[targetProperty] = errors;
        return oldValue;
    },

    _updateFieldErrors: function() {
        var old = this._fieldErrors;
        this._fieldErrors = [].concat(this.getFieldLocalErrors() || [], this._fieldRemoteErrors || []);
        this._fieldErrors = Amm.Array.unique(this._fieldErrors);
        if (!this._fieldErrors.length) this._fieldErrors = null;
        if (old === this._fieldErrors || (old && this._fieldErrors && Amm.Array.equal(this._fieldErrors, old))) {
            this._fieldErrors = old;
            return;
        }
        this.outFieldErrorsChange(this._fieldErrors, old);
        if (!this._fieldInSyncWithAnnotations || this._lockAnnotationSync || !this.hasAnnotation('error')) {
            return;
        }
        this._lockAnnotationSync++;
        this.setError(this._fieldErrors && this._fieldErrors.length? [].concat(this._fieldErrors) : null);
        this._lockAnnotationSync--;
    },
    
    getFieldErrors: function() {
        if (!this._fieldApplied) return [];
        if (!this._fieldErrors) {
            this._fieldErrors = [].concat(this.getFieldLocalErrors() || [], this._fieldRemoteErrors || []);
            this._fieldErrors = Amm.Array.unique(this._fieldErrors);
        }
        return this._fieldErrors && this._fieldErrors.length? 
            [].concat(this._fieldErrors) : null;
    },
    
    setFieldErrors: function(fieldErrors, add) {
        if (!add) this.setFieldRemoteErrors(null);
        this.setFieldLocalErrors(fieldErrors, add);
    },
    
    outFieldErrorsChange: function(errors, oldErrors) {
        return this._out('fieldErrorsChange', errors, oldErrors);
    },
    
    setFieldLocalErrors: function(fieldLocalErrors, add) {
        
        var oldValue = this._setFieldErrorsArray('_fieldLocalErrors', fieldLocalErrors, add);
        
        this._updateFieldErrors();
        
        this.outFieldLocalErrorsChange(fieldLocalErrors, oldValue);
        
        return true;
    },
    
    getFieldLocalErrors: function() {
        if (!this._fieldApplied) return [];
        if (this._fieldLocalErrors === undefined) this.validate(); 
        return this._fieldLocalErrors? [].concat(this._fieldLocalErrors) : null;
    },

    outFieldLocalErrorsChange: function(fieldLocalErrors, oldFieldLocalErrors) {
        this._out('fieldLocalErrorsChange', fieldLocalErrors, oldFieldLocalErrors);
    },

    
    setFieldRemoteErrors: function(fieldRemoteErrors, add) {
        var oldValue = this._setFieldErrorsArray('_fieldRemoteErrors', fieldRemoteErrors, add);
        
        if (oldValue === false) return;
      
        this._updateFieldErrors();
        
        this.outFieldRemoteErrorsChange(fieldRemoteErrors, oldValue);
        
        return true;
    },
    
    getFieldRemoteErrors: function() {
        if (!this._fieldApplied) return [];
        if (this._fieldRemoteErrors === undefined) this.validate(); 
        return this._fieldRemoteErrors? [].concat(this._fieldRemoteErrors) : null;
    },

    outFieldRemoteErrorsChange: function(fieldRemoteErrors, oldFieldRemoteErrors) {
        this._out('fieldRemoteErrorsChange', fieldRemoteErrors, oldFieldRemoteErrors);
    },

    setFieldApplied: function(fieldApplied) {
        fieldApplied = !!fieldApplied;
        var oldFieldApplied = this._fieldApplied;
        if (oldFieldApplied === fieldApplied) return;
        this._fieldApplied = fieldApplied;
        this.outFieldAppliedChange(fieldApplied, oldFieldApplied);
        this.setNeedValidate(true);
        return true;
    },

    outFieldAppliedChange: function(fieldApplied, oldFieldApplied) {
        this._out('fieldAppliedChange', fieldApplied, oldFieldApplied);
    },

    getFieldApplied: function() { return this._fieldApplied; },
    
    setFieldSyncWithAnnotations: function(fieldSyncWithAnnotations) {
        fieldSyncWithAnnotations = !!fieldSyncWithAnnotations;
        var oldFieldSyncWithAnnotations = this._fieldSyncWithAnnotations;
        if (oldFieldSyncWithAnnotations === fieldSyncWithAnnotations) return;
        this._fieldSyncWithAnnotations = fieldSyncWithAnnotations;
        if (this._fieldSyncWithAnnotations) this._syncWithAnnotations();
        return true;
    },

    getFieldSyncWithAnnotations: function() { return this._fieldSyncWithAnnotations; },
    
    getFieldInSyncWithAnnotations: function() { return this._fieldInSyncWithAnnotations; },
    
    setFieldRequired: function(fieldRequired) {
        fieldRequired = !!fieldRequired;
        var oldFieldRequired = this._fieldRequired;
        if (oldFieldRequired === fieldRequired) return;
        this._fieldRequired = fieldRequired;
        if (this._fieldInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('required')) {
            this._lockAnnotationSync++;
            this.setRequired(this._fieldRequired);
            this._lockAnnotationSync--;
        }
        this.outFieldRequiredChange(fieldRequired, oldFieldRequired);
        this.setNeedValidate(true);
        return true;
    },
    
    outFieldRequiredChange: function(fieldRequired, oldFieldRequired) {
        return this._out('fieldRequiredChange', fieldRequired, oldFieldRequired);
    },

    getFieldRequired: function() { return this._fieldRequired; },
    
    setFieldRequiredValidator: function(fieldRequiredValidator) {
        var oldFieldRequiredValidator = this._fieldRequiredValidator;
        if (oldFieldRequiredValidator === fieldRequiredValidator) return;
        if (fieldRequiredValidator) {
            if (typeof fieldRequiredValidator === 'function') {
                fieldRequiredValidator = new Amm.Validator.Function({func: fieldRequiredValidator});
            } else {
                fieldRequiredValidator = Amm.constructInstance(
                    fieldRequiredValidator, 'Amm.Validator'
                );
            }
            Amm.setProperty(fieldRequiredValidator, 'element', this);
        }
        this._fieldRequiredValidator = fieldRequiredValidator;
        this.setNeedValidate(true);
        return true;
    },

    getFieldRequiredValidator: function() { return this._fieldRequiredValidator; },

    setFieldEmpty: function(fieldEmpty) {
        var oldFieldEmpty = this._fieldEmpty;
        if (oldFieldEmpty === fieldEmpty) return;
        this._fieldEmpty = fieldEmpty;
 
        this.outFieldEmptyChange(fieldEmpty, oldFieldEmpty);
        return true;
    },
    
    _handleFormExtValueChange: function(value, oldValue) {
        if (this._lockFieldValueChange) return;
        this._lockFieldValueChange = 1;
        this._translationErrorState = 0;
        var err = {}, fieldValue = value;
        if (this._fieldTranslator) {
            fieldValue = this._fieldTranslator.translateIn(value, err);
        }
        if (err.error) {
            this._setInTranslationErrorState(fieldValue, err.error);
        } else {
            this.setFieldValue(fieldValue);
        }
        this._lockFieldValueChange = 0;
    },

    setFieldValue: function(fieldValue) {
        var oldFieldValue = this._fieldValue;
        if (oldFieldValue === fieldValue) return;
        this._fieldValue = fieldValue;
        this.setFieldEmpty(this._isFieldEmpty(fieldValue));
        this.setNeedValidate(true);
        this.outFieldValueChange(fieldValue, oldFieldValue);
        // check for _needValidate since validate() may be called during
        // "outFieldValueChange" invocation
        if (this._validateMode & Amm.Trait.Field.VALIDATE_CHANGE && this._needValidate) {
            this.validate();
        }
        if (!this._lockFieldValueChange && this._fieldSyncsValue) {
            this._syncFieldValueToElement(fieldValue);
        }
        
        return true;
    },
    
    _syncFieldValueToElement: function(fieldValue) {
        if (this._lockFieldValueChange || !this._fieldSyncsValue) return;
        this._translationErrorState = 0;
        this._lockFieldValueChange = 1;
        var value = fieldValue, err = {};
        if (this._fieldTranslator) {
            value = this._fieldTranslator.translateOut(fieldValue, err);
        }
        if (err.error) {
            this._setOutTranslationErrorState(value, err.error);
        } else {
            this.setValue(value);
        }
        this._lockFieldValueChange = 0;
    },
    
    _setInTranslationErrorState: function(fieldValue, error) {
        this._translationErrorState = Amm.Trait.Field.TRANSLATION_ERROR_IN;
        this.setFieldValue(fieldValue);
        this.setFieldLocalErrors(error, false);
    },
    
    _setOutTranslationErrorState: function(value, error) {
        this._translationErrorState = Amm.Trait.Field.TRANSLATION_ERROR_OUT;
        this.setValue(value);
        this.setFieldLocalErrors(error, false);
    },

    getFieldValue: function() { return this._fieldValue; },

    outFieldValueChange: function(fieldValue, oldFieldValue) {
        this._out('fieldValueChange', fieldValue, oldFieldValue);
    },

    _handleFieldFocusedChange: function(focused, oldFocused) {
        if (oldFocused && this._needValidate && !focused && 
            this._validateMode & Amm.Trait.Field.VALIDATE_BLUR) {
            this.validate();
        }
    },

    _isFieldEmpty: function(v) {
        var res = (v === undefined || v === null || v === '');
        return res;
    },
    
    getFieldEmpty: function() { 
        if (this._fieldEmpty === undefined) {
            var pe = this._isFieldEmpty(this.getFieldValue());
            this.setFieldEmpty(pe);
        }
        return this._fieldEmpty; 
    },

    outFieldEmptyChange: function(fieldEmpty, oldFieldEmpty) {
        this._out('fieldEmptyChange', fieldEmpty, oldFieldEmpty);
    },
    
    setNeedValidate: function(needValidate) {
        needValidate = !!needValidate;
        if (this._needValidate === needValidate) return;
        var oldNeedValidate = this._needValidate;
        this._needValidate = needValidate;
        this._out('needValidateChange', needValidate, oldNeedValidate);
        if (needValidate && (this._validateMode & Amm.Trait.Field.VALIDATE_INSTANT)
            || (this._fieldLocalErrors && this._validateMode)) {
            this.validate();
        }
        return true;
    }, 
   
    outNeedValidateChange: function(needValidate, oldNeedValidate) {
        this._out('needValidateChange', needValidate, oldNeedValidate);
    },
    
    getNeedValidate: function() {
        return this._needValidate;
    },

    setFieldTranslator: function(fieldTranslator) {
        if (fieldTranslator) 
            fieldTranslator = Amm.constructInstance(fieldTranslator, 'Amm.Translator');
        else
            fieldTranslator = null;
        var oldFieldTranslator = this._fieldTranslator;
        if (oldFieldTranslator === fieldTranslator) return;
        if (fieldTranslator && fieldTranslator.field === undefined)
            fieldTranslator.field = this.getFieldLabel();
        this._fieldTranslator = fieldTranslator;
        if (this._translationErrorState) this._revalidate();
        return true;
    },

    getFieldTranslator: function() { return this._fieldTranslator; },
    
    getTranslationErrorState: function() { return this._translationErrorState; },
    
    setValidationExpressions: function(validationExpressions) {
        if (this._validationExpressions) {
            Amm.cleanup(this._validationExpressions);
        }
        this._validationExpressions = null;
        if (!validationExpressions) {
            return;
        } else if (!(validationExpressions instanceof Array)) {
            throw Error("`validationExpressions` must be an Array or FALSEable, provided: "
                    + Amm.describeType(validationExpressions));
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
        if (this._needValidate && (this._validateMode & Amm.Trait.Field.VALIDATE_EXPRESSIONS)) {
            this.validate();
        }
    },
    
    _applyValidationExpressions: function(errors) {
        if (!this._validationExpressions) return;
        var label = this.getFieldLabel();
        for (var i = 0, l = this._validationExpressions.length; i < l; i++) {
            var e = this._validationExpressions[i].getValue();
            if (e) {
                var msg = Amm.translate(e + "", '%field', label);
                errors.push(msg);
            }
        }
    }
    
};
