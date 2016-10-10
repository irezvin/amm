/* global Amm */

Amm.Handler.Property = function(options) {
    Amm.Handler.call(this, options);
};

Amm.Handler.Property.prototype = {

    'Amm.Handler.Property': '__CLASS__',
    
    requiredElementClass: 'Amm.Property',
    
    _signal: 'change',
    
    /**
     * If property value is undefined, try to extract value from an element (if extractValue() is provided)
     * @type Boolean
     */
    setValueOnBind: false,
    
    /**
     * Call _handleSignal(_element.getValue()) when element is set
     */
    updateOnBind: true,
    
    extractValue: function() {
    },
    
    setElement: function(element) {
        var res = Amm.Handler.prototype.setElement.call(this, element), valueIsSet = false;
        if (res && this.setValueOnBind && this._element && this._element.getValue() === undefined) {
            var v = this.extractValue();
            if (v !== undefined) this._element.setValue(v);
            valueIsSet = true;
        }
        if (!valueIsSet && this.updateOnBind && this._element)
            this._handleSignal(this._element.getValue());
        return res;
    }
    
};

Amm.extend(Amm.Handler.Property, Amm.Handler);