/* global Amm */

Amm.Validator.Number = function(options) {
    Amm.Validator.call(this, options);
};

Amm.Validator.Number.prototype = {
    
    'Amm.Validator.Number': '__CLASS__',

    allowEmpty: true,
    strict: true,
    allowFloat: true,
    gt: null,
    ge: null,
    lt: null,
    le: null,
    
    msgMustBeNumber: 'lang.Amm.Validator.Number.msgMustBeNumber',
    msgMustBeInteger: 'lang.Amm.Validator.Number.msgMustBeInteger',
    msgMustBeGt: 'lang.Amm.Validator.Number.msgMustBeGt',
    msgMustBeGe: 'lang.Amm.Validator.Number.msgMustBeGe',
    msgMustBeLt: 'lang.Amm.Validator.Number.msgMustBeLt',
    msgMustBeLe: 'lang.Amm.Validator.Number.msgMustBeLe',
        
    getError: function(value, field) {
        var isEmpty = this.isEmpty(value);
        if (isEmpty) {
            if (this.allowEmpty) return;
            return this._msg(this.msgMustBeNumber, "%field", field);
        }
        var i = parseInt(value);
        var f = parseFloat(value);
        var nonStrict = f != value && i != value;
        if (isNaN(i) || this.strict && nonStrict) {
            return this._msg(this.msgMustBeNumber, "%field", field);
        }
        if (i != f && !this.allowFloat) {
            return this._msg(this.msgMustBeInteger, "%field", field);
        }
        var v = this.allowFloat? f : i;
        var c;
        
        c = this.gt;
        if (c !== null && !(v > c)) {
            return this._msg(this.msgMustBeGt, "%field", field, "%val", c);
        }
        
        c = this.ge;
        if (c !== null && !(v >= c)) {
            return this._msg(this.msgMustBeGe, "%field", field, "%val", c);
        }
        
        c = this.lt;
        if (c !== null && !(v < c)) {
            return this._msg(this.msgMustBeLt, "%field", field, "%val", c);
        }
        
        c = this.le;
        if (c !== null && !(v <= c)) {
            return this._msg(this.msgMustBeLe, "%field", field, "%val", c);
        }
    }
    
};

Amm.extend(Amm.Validator.Number, Amm.Validator);

Amm.defineLangStrings ({
    'lang.Amm.Validator.Number.msgMustBeNumber': '%field must be a number',
    'lang.Amm.Validator.Number.msgMustBeInteger': '%field must be an integer number',
    'lang.Amm.Validator.Number.msgMustBeGt': '%field value must be higher than %val',
    'lang.Amm.Validator.Number.msgMustBeGe': '%field must not be less than %val',
    'lang.Amm.Validator.Number.msgMustBeLt': '%field must be less than %val',
    'lang.Amm.Validator.Number.msgMustBeLe': '%field must not exceed %val'
});
