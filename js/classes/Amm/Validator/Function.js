/* global Amm */

Amm.Validator.Function = function(options) {
    Amm.Validator.call(this, options);
};

Amm.Validator.Function.prototype = {
    
    'Amm.Validator.Function': '__CLASS__',
    
    element: null,
    
    func: null,
    
    message: 'lang.Amm.Validator.Function.msg',

    getError: function(value, field) {
        
        var err = {message: null}, res = null;
        
        if (typeof this.func === 'function') {
            res = this.func(value, field, err, this.element);
            if (typeof res === 'string') {
                res = Amm.translate(res, '%field', field);
            } else if (!res && res !== undefined) {
                res = Amm.translate(err.message || this.message, '%field', field);
            } else {
                return;
            }
        } else {
            throw "Amm.Validator.Function: this.`func` not set (or not a function)";
        }
        return res;
        
    }
    
};

Amm.extend(Amm.Validator.Function, Amm.Validator);

Amm.defineLangStrings({
    'lang.Amm.Validator.Function.msg': "%field is invalid"
});
