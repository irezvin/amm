/* global Amm */

Amm.Decorator = function(options) {
    if (options && this['Amm.Decorator'] === '__CLASS__' && options.decorate && typeof options.decorate === 'function') {
        this.decorate = options.decorate;
        delete options.decorate;
    }
    Amm.init(this, options);
};

Amm.Decorator.construct = function(proto, defaults, setToDefaults, requirements) {
    if (typeof proto === 'function') {
        proto = {decorate: proto};
    }
    return Amm.constructInstance(proto, 'Amm.Decorator', defaults, setToDefaults, requirements);
};

Amm.Decorator.prototype = {
  
    'Amm.Decorator': '__CLASS__',
    
    decorate: function(value) {
        return value;
    }
    
};

Amm.Decorator.cr = function(proto) {
    if (proto && proto['Amm.Decorator']) return proto;
    return Amm.Decorator.construct(proto);
};

/**
 * Shortcut for both lazy-instantiation and applying decorator
 * 
 * Takes decorator OR decorator prototype from owner[prop].
 * If needed, instantiates it and sets owner[prop] to created instance.
 * Applies the decorator to value and returns the result.
 * 
 * @param {mixed} value Value to decorate
 * @param {type} owner Owner object that has decorator or decorator prototype (defaults to 'this')
 * @param {type} prop Property of owner object that contains decorator or decorator prototype (defaults to 'decorator')
 * @returns {mixed} Decorated value
 */

Amm.Decorator.d = function(value, owner, prop) {
    if (!prop) prop = 'decorator';
    if (!owner) owner = this;
    var d = owner[prop];
    if (!d) return value;
    if (!d['Amm.Decorator']) d = owner[prop] = Amm.Decorator.construct(d);
    return d.decorate(value);
};