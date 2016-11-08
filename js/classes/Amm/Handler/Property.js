/* global Amm */

Amm.Handler.Property = function(options) {
    Amm.Handler.call(this, options);
};

Amm.Handler.Property.prototype = {

    'Amm.Handler.Property': '__CLASS__',
    
    requiredElementClass: 'Amm.Element',
    
    _propertyName: null,
    
    _getterName: null,
    
    _setterName: null,
    
    /**
     * If property value is undefined, try to extract value from an element (if extractValue() is provided)
     * @type Boolean
     */
    setValueOnBind: false,
    
    /**
     * Call _handleSignal(_element.getValue()) when element is set
     */
    updateOnBind: true,
    
    _bindToProperty: function (propertyName) {
        if (propertyName) {
            this.setSignal(propertyName + 'Change');
            var P = propertyName[0].toUpperCase() + propertyName.slice(1);
            this._getterName = 'get' + P;
            this._setterName = 'set' + P;
        } else {
            this.setSignal(null);
            this._getterName = null;
            this._setterName = null;
        }
    },
    
    setPropertyName: function(propertyName) {
        var oldPropertyName = this._propertyName;
        if (oldPropertyName === propertyName) return;
        this._propertyName = propertyName;
        if (propertyName === null && this._element) this._bindToProperty(this._element.defaultProperty);
            else this._bindToProperty(propertyName);
        return true;
    },
    
    _doElementChange: function(element, oldElement) {
        Amm.Handler.prototype._doElementChange.call(this, element, oldElement);
        if (element && !this._propertyName) this._bindToProperty(element.defaultProperty);
    },
    
    getValue: function() {
        if (this._getterName && this._element) {
            return this._element[this._getterName]();
        }
    },
    
    setValue: function(value) {
        if (this._setterName && this._element) {
            return this._element[this._setterName](value);
        }
    },

    getPropertyName: function() { return this._propertyName; },

    
    extractValue: function() {
    },
    
    setElement: function(element) {
        var res = Amm.Handler.prototype.setElement.call(this, element), valueIsSet = false;
        if (res && this.setValueOnBind && this._element && this.getValue() === undefined) {
            var v = this.extractValue();
            if (v !== undefined) {
                this.setValue(v);
                valueIsSet = true;
            }
        }
        if (!valueIsSet && this.updateOnBind && this._element)
            console.log("Element value is ", this.getValue());
            this._handleSignal(this.getValue());
        return res;
    }
    
};

Amm.extend(Amm.Handler.Property, Amm.Handler);
