/* global Amm */

Amm.Drag.Constraint.MinMax = function(options) {
    Amm.Drag.Constraint.call(this, options);
};

Amm.Drag.Constraint.MinMax.prototype = {

    'Amm.Drag.Constraint.MinMax': '__CLASS__', 
    
    _prop: null,
    
    _min: null,

    _max: null,
    
    _get: null,
    
    _set: null,
    
    _absolute: false,

    _upd: function(num, name, setName) {
        var val;
        if (num === null) val = null;
        else {
            val = parseFloat(num);
            if (isNaN(val)) throw Error(Amm.getClass(this) + ".`" + name + "` must be a number or null; given: '" + num + "'");
        }
        this['_' + (setName || name)] = val;
    },    

    setMin: function(min) {
        this._upd(min, 'min');
    },

    setMax: function(max) {
        this._upd(max, 'max');
    },
    
    setEquals: function(equals) {
        this._upd(equals, 'equals', 'min');
        this._max = this._min;
    },
    
    setProp: function(prop) {
        if (!prop || typeof prop !== 'string') throw Error("`prop` must be a non-empty string");
        var oldProp = this._prop;
        if (oldProp === prop) return;
        this._prop = prop;
        this._get = 'get' + Amm.ucFirst(this._prop);
        this._set = 'set' + Amm.ucFirst(this._prop);        
        return true;
    },

    getProp: function() { return this._prop; },

    setAbsolute: function(absolute) {
        absolute = !!absolute;
        var oldAbsolute = this._absolute;
        if (oldAbsolute === absolute) return;
        this._absolute = absolute;
        return true;
    },

    getAbsolute: function() { return this._absolute; },
    
    decorate: function(value) {
        if (this._min === null && this._max === null) return value;
        var v = value, ov = v;
        if (this._absolute) {
            var a = Math.abs(v), sign = v? v / Math.abs(v) : 0;
            if (this._min !== null && a < Math.abs(this._min)) {
                v = Math.abs(this._min)*sign;
            } else if (this._max !== null && a > Math.abs(this._max)) {
                v = Math.abs(this._max)*sign;
            }
        } else {
            if (this._min !== null && v < this._min) {
                v = this._min;
            } else if (this._max !== null && v > this._max) {
                v = this._max;
            }
        }
        return v;
    },

    /**
     * @return {Amm.Drag.Vector} Original vector or its' modified clone
     */
    apply: function(vector) {
        if (!this._prop) {
            throw Error("Cannot Amm.Drag.Constraint.MinMax.apply() because constraint.`prop` is not set");
        }
        var ov = vector[this._get](), v = this.decorate(ov);
        if (v === ov) return vector;
        var ovr = {};
        ovr[this._prop] = v;
        return vector.clone(ovr);
    },

};

Amm.extend(Amm.Drag.Constraint.MinMax, Amm.Drag.Constraint);
Amm.extend(Amm.Drag.Constraint.MinMax, Amm.Decorator);

