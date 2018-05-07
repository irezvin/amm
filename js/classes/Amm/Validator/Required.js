/* global Amm */

Amm.Validator.Required = function(options) {
    
    Amm.Validator.call(this, options);
    
};

Amm.Validator.Required.prototype = {
    
    'Amm.Validator.Required': '__CLASS__',
    
    message: 'lang.Amm.Validator.Required.msg',
    
    getError: function(value, field) {
        var empty = this.isEmpty(value);
        if (!empty) return;
        return this._msg(this.message, '%field', field);
    }
    
};

Amm.extend(Amm.Validator.Required, Amm.Validator);

Amm.defineLangStrings ({
    'lang.Amm.Validator.Required.msg': "%field is required"
});
