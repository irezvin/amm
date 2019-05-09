/* global Amm */
Amm.Trait.Select.Option = function(options) {
    Amm.Element.call(this, options);
};

Amm.Trait.Select.Option.prototype = {
    
    'Amm.Trait.Select.Option': '__CLASS__',
    
    _value: null,

    _label: null,

    _disabled: false,
    
    _selected: false,
    
    _index: null,
    
    _origin: null,

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

    setLabel: function(label) {
        var oldLabel = this._label;
        if (oldLabel === label) return;
        this._label = label;
 
        this.outLabelChange(label, oldLabel);
        return true;
    },

    getLabel: function() { return this._label; },

    outLabelChange: function(label, oldLabel) {
        this._out('labelChange', label, oldLabel);
    },

    setDisabled: function(disabled) {
        disabled = !!disabled;
        var oldDisabled = this._disabled;
        if (oldDisabled === disabled) return;
        this._disabled = disabled;
        this.outDisabledChange(disabled, oldDisabled);
        if (this._disabled && this._selected) this.setSelected(false); 
        return true;
    },

    getDisabled: function() { return this._disabled; },

    outDisabledChange: function(disabled, oldDisabled) {
        this._out('disabledChange', disabled, oldDisabled);
    },

    setSelected: function(selected) {
        selected = !!selected;
        if (this._disabled) selected = false;
        var oldSelected = this._selected;
        if (oldSelected === selected) return;
        this._selected = selected;
        this.outSelectedChange(selected, oldSelected);
        return true;
    },

    getSelected: function() { return this._selected; },

    outSelectedChange: function(selected, oldSelected) {
        this._out('selectedChange', selected, oldSelected);
    },
    
    setIndex: function(index) {
        var oldIndex = this._index;
        if (oldIndex === index) return;
        this._index = index;
 
        this.outIndexChange(index, oldIndex);
        return true;
    },

    getIndex: function() { return this._index; },

    outIndexChange: function(index, oldIndex) {
        this._out('indexChange', index, oldIndex);
    },
    
    setOrigin: function(origin) {
        var oldOrigin = this._origin;
        if (oldOrigin === origin) return;
        this._origin = origin;
        this.outOriginChange(origin, oldOrigin);
        return true;
    },

    getOrigin: function() { return this._origin; },

    outOriginChange: function(origin, oldOrigin) {
        this._out('originChange', origin, oldOrigin);
    }
    
};

Amm.extend(Amm.Trait.Select.Option, Amm.Element);