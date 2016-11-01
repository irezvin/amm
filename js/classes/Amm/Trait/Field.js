/* global Amm */

Amm.Trait.Field = function(options) {
    Amm.Property.call(this, options);
};

Amm.Trait.Field.prototype = {

    'Amm.Trait.Field': '__CLASS__', 

    _readOnly: undefined,

    _focused: undefined,

    _enabled: true,

    _value: undefined,

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
    },

    setReadOnly: function(readOnly) {
        var old = this._readOnly;
        if (old === readOnly) return;
        this._readOnly = readOnly;
 
        this.outReadOnlyChange(readOnly, old);
        return true;
    },

    getReadOnly: function() { return this._readOnly; },
 
    outReadOnlyChange: function(readOnly, oldReadOnly) {
        this._out('readOnlyChange', readOnly, oldReadOnly);
    },

    setFocused: function(focused) {
        var old = this._focused;
        if (old === focused) return;
        this._focused = focused;
 
        this.outFocusedChange(focused, old);
        return true;
    },

    getFocused: function() { return this._focused; },
 

    outFocusedChange: function(focused, oldFocused) {
        this._out('focusedChange', focused, oldFocused);
    },

    setEnabled: function(enabled) {
        var old = this._enabled;
        if (old === enabled) return;
        this._enabled = enabled;
 
        this.outEnabledChange(enabled, old);
        return true;
    },

    getEnabled: function() { return this._enabled; },
 

    outEnabledChange: function(enabled, oldEnabled) {
        this._out('enabledChange', enabled, oldEnabled);
    }


};

Amm.extend(Amm.Trait.Field, Amm.Property);

