/* global Amm */

Amm.Translator.Bool = function(options) {
    Amm.Translator.call(this, options);
};

Amm.Translator.Bool.prototype = {

    'Amm.Translator.Bool': '__CLASS__', 

    trueValue: 'lang.Amm.True',

    falseValue: 'lang.Amm.False',

    errorMsg: 'lang.Amm.Translator.Bool.msg',

    caseSensitive: false,

    trimInStrings: true, // will trim the IN value

    guess: true, // will try to convert '0' or FALSEable value to FALSE, other to TRUE

    defaultValue: false, // if undefined, will set error. Not used if `guess` is true
        
    setStrictMode: function(strictMode) {
        if (strictMode) {
            this.caseSensitive = true;
            this.trimInStrings = false;
            this.defaultValue = undefined;
            this.guess = false;
        } else {
            this.caseSensitive = false;
            this.trimInStrings = true;
            this.defaultValue = false;
            this.guess = true;            
        }
    },
    
    getStrictMode: function() {
        if (this.caseSensitive && !this.trimInStrings && this.defaultValue === undefined && !this.guess) {
            return true;
        } else if (!this.caseSensitive && this.trimInStrings && this.defaultValue !== undefined && this.guess) {
            return false;
        }
        return undefined;
    },

    _doTranslateOut: function(value) {
        return Amm.translate(value? this.trueValue : this.falseValue);
    },

    _doTranslateIn: function(value) {
        var res;
        if (this._cmp(value, Amm.translate(this.trueValue))) res = true;
        else if (this._cmp(value, Amm.translate(this.falseValue))) res = false;
        else if (this.guess) {
            if (value === '0') res = false;
            else res = !!value;
        }
        else if (this.defaultValue !== undefined) res = this.defaultValue;
        else this.lastError = Amm.translate(this.errorMsg, '%value', value);
        return res;
    },

    _cmp: function (inValue, canonValue) {
        if (!this.caseSensitive) {
            inValue = ('' + inValue).toLowerCase();
            canonValue = ('' + canonValue).toLowerCase();
        }
        return inValue === canonValue;
    },

};

Amm.extend(Amm.Translator.Bool, Amm.Translator);

Amm.defineLangStrings({
    'lang.Amm.True': 'True',
    'lang.Amm.False': 'False',
    'lang.Amm.Translator.Bool.msg': '\'%value\' isn\'t allowed Boolean value'
});
