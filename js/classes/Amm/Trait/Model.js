/* global Amm */

Amm.Trait.Model = function() {
            
    this._value = {};
            
};

Amm.Trait.Model.prototype = {
    
    _value: null,

    setValue: function(value) {
        var oldValue = this._value;
        if (oldValue === value) return;
        this._value = value;
 
        this.outValueChange(value, oldValue);
        return true;
    },

    getValue: function() { return this._value; },

    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    }
    
};