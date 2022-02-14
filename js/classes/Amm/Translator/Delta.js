/* global Amm */

Amm.Translator.Delta = function(options) {
    Amm.Translator.call(this, options);
};

/**
 * Adds a number when translating "in", reduces the same number when translating "out"
 */

Amm.Translator.Delta.prototype = {

    'Amm.Translator.Delta': '__CLASS__', 

    delta: 1,
    
    float: false,
    
    errorMsg: 'Amm.Translator.Delta.msgMustBeNumber',

    _doTranslateOut: function(value, sub) {
        if (typeof value === 'string') {
            var newValue = this.float? parseFloat(value) : parseInt(value);
            if (isNaN(newValue)) {
                this.lastError = Amm.translate(this.errorMsg, '%value', value);
            }
            value = newValue;
        }
        return value + (sub? -1 : 1)*this.delta;
    },

    _doTranslateIn: function(value) {
        return this._doTranslateOut(value, true);
    },
};

Amm.extend(Amm.Translator.Delta, Amm.Translator);

Amm.defineLangStrings ({
    'Amm.Translator.Delta.msgMustBeNumber': '\'%value\' is not a number',
});
