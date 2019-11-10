/* global Amm */

Amm.Expression.Sync = function(options, expressionThis, writeProperty, writeObject, writeArgs, translator, errProperty, errObject) {
    
    Amm.Expression.call(this, options, expressionThis, writeProperty, writeObject, writeArgs);
    
};

Amm.Expression.Sync.prototype = {

    'Amm.Expression.Sync': '__CLASS__',

    _translator: null,

    _errProperty: null,

    _errObject: null,
    
    _writeGetter: null,
    
    _writeSetter: null,
    
    _writeEvent: null,
    
    _lastError: false,
    
    setTranslator: function(translator) {
        if (!translator) translator = null;
        else if (!Amm.getClass(translator)) {
            translator = Amm.constructInstance(translator, 'Amm.Translator');
        } else {
            Amm.is(translator, 'Amm.Translator', 'translator');
        }
        var oldTranslator = this._translator;
        if (oldTranslator === translator) return;
        this._translator = translator;
        this._write();
        return true;
    },

    getTranslator: function() { return this._translator; },

    setErrProperty: function(errProperty) {
        var oldErrProperty = this._errProperty;
        if (oldErrProperty === errProperty) return;
        this._errProperty = errProperty;
        return true;
    },

    getErrProperty: function() { return this._errProperty; },

    setErrObject: function(errObject) {
        var oldErrObject = this._errObject;
        if (oldErrObject === errObject) return;
        this._errObject = errObject;
        this._handleTranslationError(this._lastError, false, true);
        return true;
    },

    getErrObject: function() { return this._errObject; },

    setWriteProperty: function(writeProperty, writeObject, writeArgs) {
        // TODO: repeat when expressionThis changes...
        var res = Amm.Expression.prototype.setWriteProperty.call(this, writeProperty, writeObject, writeArgs);
        if (this._writeObject && this._writeObject['Amm.Expression']) {
            this._writeObject.subscribe('valueChange', this._handleWriteValueChange, this);
            return res;
        }
        if (!this._writeEvent) this._detectWriteProperty();
        if (this._writeEvent) {
            (this._writeObject || this._expressionThis).subscribe(this._writeEvent, this._handleWriteValueChange, this);
        } else {
            throw Error("writeObject doesn't have event for change of writeProperty '" + this._writeProperty + "' so Amm.Expression.Sync cannot function");
        }
    },
    
    _detectWriteProperty: function() {
        var wo = this._writeObject || this._expressionThis, prop = {};
        Amm.detectProperty(wo, this._writeProperty, prop);
        this._writeGetter = prop.getterName;
        this._writeSetter = prop.setterName;
        this._writeEvent =  prop.eventName;
    },
    
    _write: function() { // expression => writeProperty: translateIn
        var wo = this._writeObject || this._expressionThis;
        if (!wo) return;
        if (this._lockWrite) return;
        this._lockWrite++;
        var v = this.getValue(), ok = true;
        if (this._translator && v !== undefined) {
            var err = {};
            v = this._translator.translateIn(v, err);
            if (err.error) ok = false;
            this._handleTranslationError(err.error, true);
        }
        if (!ok) {
            this._lockWrite--;
            return;
        }
        if (!this._writeGetter) this._detectWriteProperty();
        var pv = wo[this._writeGetter]();
        if (v === undefined && pv !== undefined) {
            this._setTranslatedValue(pv);
            this._lockWrite--;
            return;
        }
        Amm.setProperty(wo, this._writeProperty, v, false, this._writeArgs);
        this._lockWrite--;
    },

    _setTranslatedValue: function(writePropertyValue) { // writeProperty => expression: translateOut
        if (!this._translator) {
            this.setValue(writePropertyValue);
            return;
        }
        var err = {};
        var translated = this._translator.translateOut(writePropertyValue, err);
        if (!err.error) {
            this.setValue(translated);
        }
        this._handleTranslationError(err.error || null, false);
    },
    
    _handleTranslationError: function(error, isIn, force) {
        if (error === this._lastError && !force) return;
        this._lastError = error;
        if (this._errProperty)
            Amm.setProperty(this._errObject || this._expressionThis, this._errProperty, error);
    },
    
    _handleWriteValueChange: function(value, oldValue) {
        if (this._lockWrite) return;
        this._lockWrite++;
        this._setTranslatedValue(value);
        this._lockWrite--;
    },
    
    parse: function(src) {
        Amm.Expression.prototype.parse.call(this, src);
        if (!this.supportsAssign)
            throw Error("Amm.Expression.Sync must be assignable, but '" + src + "' is not");
    },
    
    notifyWriteDestinationChanged: function() {
        if (Amm.Expression.prototype.notifyWriteDestinationChanged.call(this)) return true;
        if (this._writeGetter && this._hasValue && this._value === undefined) {
            var o = (this._writeObject || this._expressionThis), v;
            if (o) {
               v = o[this._writeGetter]();
               if (v !== undefined) this._setTranslatedValue(v);
            }
        }
    }
    
};

Amm.extend(Amm.Expression.Sync, Amm.Expression);