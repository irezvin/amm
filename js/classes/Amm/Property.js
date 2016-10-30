/* global Amm */

Amm.Property = function(options) {
    Amm.Element.call(this, options);
};

Amm.Property.prototype = {

    'Amm.Property': '__CLASS__',
    
    _value: undefined,
    
    defaultProperty: 'value',
    
    setValue: function(value) {
        return this.inValue(value);
    },
    
    inValue: function(value) {
        var o = this._value;
        this._value = value;
        if (o !== this._value) {
            this.outValueChange(this._value, o);
            return true;
        }    
    },
    
    getValue: function() {
        return this._value;
    },
    
    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    }
    
};

Amm.extend (Amm.Property, Amm.Element);