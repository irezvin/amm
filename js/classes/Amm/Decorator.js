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