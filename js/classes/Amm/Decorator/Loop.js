/* global Amm */

/**
 * Decorates every item in hash or array in the loop, leaving same keys
 * TODO: port Ac_Decorator_ArrayMod
 */
Amm.Decorator.Loop = function(options) {
    Amm.Decorator.call(this, options);
};

Amm.Decorator.Loop.prototype = {

    'Amm.Decorator.Loop': '__CLASS__', 
    
    decorator: null,
    
    decorate: function(value) {
        if (!this.decorator || !(value && typeof value === 'object')) return value;
        var res, i;
        if (value instanceof Array) {
            res = [];
            for (i = 0; i < value.length; i++) {
                res.push(Amm.Decorator.d(value[i], this, 'decorator'));
            }
            return res;
        }
        res = {};
        for (i in value) if (value.hasOwnProperty(i)) {
            res[i] = Amm.Decorator.d(value[i], this, 'decorator');
        }
        return res;
    }

};

Amm.extend(Amm.Decorator.Loop, Amm.Decorator);

