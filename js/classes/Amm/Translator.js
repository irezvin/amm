/* global Amm */

Amm.Translator = function(options) {
    Amm.init(this, options);
};

Amm.Translator.prototype = {
  
    'Amm.Translator': '__CLASS__',
    
    lastError: null,
    
    errInValue: null,
    
    errOutValue: null,
    
    reverseMode: null, // swaps translateIn and translateOut
    
    field: undefined,
    
    trimInStrings: false,
    
    decorateBeforeValidate: false,
            
    _inDecorator: null,

    _outDecorator: null,
    
    _inValidator: null,

    _outValidator: null,
    
    _implTranslate: function(value, def, fn, error, inMode, validator, decorator) {
        this.lastError = null;
        if (!(error && typeof error === 'object')) error = {};
        error.error = null;
        var res;
        if (inMode) {
            if (this.trimInStrings && typeof value === 'string') {
                value = Amm.Util.trim(value);
            }
        }
        if (decorator && this.decorateBeforeValidate)
            value = decorator.decorate(value);
        
        if (validator) {
            this.lastError = validator.getError(value, this.field);
            if (this.lastError) {
                error.error = this.lastError;
                return def;
            }
        }
        
        var o = value;
        if (decorator && !this.decorateBeforeValidate)
            value = decorator.decorate(value);
        
        try {
            res = this[fn](value);
        } catch (e) {
            this.lastError = e;
        }
        if (this.lastError) {
            res = def;
        }
        error.error = this.lastError;
        return res;
    },
    
    translateIn: function(externalValue, error) {
        if (this.reverseMode) {
            return this._implTranslate(externalValue, this.errOutValue, '_doTranslateOut', error, false,
                this._outValidator, this._outDecorator
            );
        }
        return this._implTranslate(externalValue, this.errInValue, '_doTranslateIn', error, true, 
            this._inValidator, this._inDecorator);
    },
    
    translateOut: function(internalValue, error) {
        if (this.reverseMode) {
            return this._implTranslate(internalValue, this.errInValue, '_doTranslateIn', error, false,
                this._inValidator, this._inDecorator
            );
        }
        return this._implTranslate(internalValue, this.errOutValue, '_doTranslateOut', error, false,
            this._outValidator, this._outDecorator
        );
    },
    
    _doTranslateIn: function(value) {
        return value;
    },
    
    _doTranslateOut: function(value) {
        return value;
    },
    
    setInDecorator: function(inDecorator) {
        var oldInDecorator = this._inDecorator;
        if (oldInDecorator === inDecorator) return;
        if (inDecorator) inDecorator = Amm.Decorator.construct(inDecorator, 'Amm.Decorator');
        this._inDecorator = inDecorator;
        return true;
    },

    getInDecorator: function() { return this._inDecorator; },

    setOutDecorator: function(outDecorator) {
        var oldOutDecorator = this._outDecorator;
        if (oldOutDecorator === outDecorator) return;
        if (outDecorator) outDecorator = Amm.Decorator.construct(outDecorator, 'Amm.Decorator');
        this._outDecorator = outDecorator;
        return true;
    },

    getOutDecorator: function() { return this._outDecorator; },

    setInValidator: function(inValidator) {
        var oldInValidator = this._inValidator;
        if (oldInValidator === inValidator) return;
        if (inValidator) inValidator = Amm.Validator.construct(inValidator);
        this._inValidator = inValidator;
        return true;
    },

    getInValidator: function() { return this._inValidator; },

    setOutValidator: function(outValidator) {
        var oldOutValidator = this._outValidator;
        if (oldOutValidator === outValidator) return;
        if (outValidator) outValidator = Amm.Validator.construct(outValidator);
        this._outValidator = outValidator;
        return true;
    },

    getOutValidator: function() { return this._outValidator; }
    
};

