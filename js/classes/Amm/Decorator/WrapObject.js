/* global Amm */

Amm.Decorator.WrapObject = function(options) {
    Amm.Decorator.call(this, options);
};

Amm.Decorator.WrapObject.prototype = {

    'Amm.Decorator.WrapObject': '__CLASS__', 
    
    decorate: function(value) {
        var res;
        if (!(value && typeof value === 'object')) return value;
        if (Amm.getClass(value)) return value;
        if (value instanceof Array) {
            var items = [], allObjects = true;
            for (var i = 0, l = value.length; i < l; i++) {
                if (!(value[i] && typeof value[i] === 'object')) allObjects = false;
                items.push(this.wrapObject(value[i]));
            }
            if (allObjects) res = new Amm.Collection(items);
            else res = new Amm.Array(items);
            return res;
        }
        res = new Amm.WithEvents;
        for (var i in value) if (value.hasOwnProperty(i)) {
            var v = value[i];
            if (v && typeof v === 'object') {
                v = this.wrapObject(v);
            }
            Amm.createProperty(res, i, v, function(value, old, memberName) {
                if (value && typeof value === 'object') {
                    this[memberName] = this.wrapObject(value);
                }
            }, true);
        }
        return res;        
    }

};

Amm.extend(Amm.Decorator.WrapObject, Amm.Decorator);

