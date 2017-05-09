/* global Amm */
Amm.Trait.Select.Option = function(options) {
    Amm.WithEvents.call(this, options);
};

Amm.Trait.Select.Option.prototype = {
    
    'Amm.Trait.Select.Option': '__CLASS__',
    
    _value: null,

    _caption: null,

    _disabled: false,
    
    _selected: null,
    
    _index: null,

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

    setCaption: function(caption) {
        var oldCaption = this._caption;
        if (oldCaption === caption) return;
        this._caption = caption;
 
        this.outCaptionChange(caption, oldCaption);
        return true;
    },

    getCaption: function() { return this._caption; },

    outCaptionChange: function(caption, oldCaption) {
        this._out('captionChange', caption, oldCaption);
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
    }
    
};

Amm.extend(Amm.Trait.Select.Option, Amm.WithEvents);