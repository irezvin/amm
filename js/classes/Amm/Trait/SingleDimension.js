/* global Amm */

Amm.Trait.SingleDimension = function(options) {
};

Amm.Trait.SingleDimension.prototype = {
    
    'SingleDimension': '__INTERFACE__',
    
    _requestDimensionValue: function(propName) {
        var oRes = {value: null};
        this.outRequestDimensionValue(propName, oRes);
        return oRes.value;
    },
        
    outRequestDimensionValue: function(propName, oRes) {
        return this._out('requestDimensionValue', propName, oRes);
    },
    
    _updateDimensionValue: function(propName, value) {
        this.outUpdateDimensionValue(propName, value);
    },
    
    outUpdateDimensionValue: function(propName, value) {
        return this._out('updateDimensionValue', propName, value);
    },
    
    _implGetDimensionProperty: function(propName) {
        var priv = '_' + propName;
        var lock = '_lockSingleDimension' + priv;
        if (!(lock in this)) this[lock] = 1;
        else this[lock]++;
        this._implSetDimensionProperty(propName, this._requestDimensionValue(propName));
        this[lock]--;
        return this[priv];
    },
    
    _implSetDimensionProperty: function(propName, value) {
        var priv = '_' + propName;
        var oldValue = this[priv];
        if (value === oldValue) return;
        var lock = '_lockSingleDimension' + priv;
        this[priv] = value;
        if (!this[lock]) this._updateDimensionValue(propName, value);
        var event = 'out' + Amm.ucFirst(propName) + 'Change';
        if (typeof this[event] === 'function') {
            this[event](value, oldValue);
        }
        return true;
    },
    
};

