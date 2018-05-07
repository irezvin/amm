/* global Amm */

// Amm.Validator.prototype

Amm.Validator = function(options) {
    
    Amm.override(this, options);
    
};

Amm.Validator.construct = function(proto, defaults, setToDefaults, requirements) {
    if (typeof proto === 'function') {
        return Amm.constructInstance({func: proto}, 'Amm.Validator.Function', defaults, setToDefaults, requirements);
    }
    return Amm.constructInstance(proto, 'Amm.Validator', defaults, setToDefaults, requirements);
};

Amm.Validator.prototype = {
    
    'Amm.Validator': '__CLASS__',

    _msg: function(message) {
        for (var i = 1, l = arguments.length; i < l; i += 2) {
            if (arguments[i] === '%field' && arguments[i + 1] === undefined) {
                arguments[i + 1] = Amm.translate('lang.Amm.Validator.value');
                break;
            }
        }
        var args = Array.prototype.slice.apply(arguments);
        return Amm.translate.apply(Amm, args);
    },
    
    isEmpty: function(value) {
        return (value === "" || value === null || value === undefined);
    },
    
    /**
     *  Should return error message for given value or FALSEable if value is ok
     *  %field is field name
     */
    getError: function(value, field) {
        return null;
    }
    
};


Amm.defineLangStrings({
    'lang.Amm.Validator.value': "Value"
});
