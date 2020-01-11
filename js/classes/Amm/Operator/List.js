/* global Amm */

Amm.Operator.List = function(items) {
    this._isEvaluating++;
    this.OPERANDS = []; // each instance has own number of operands
    Amm.Operator.call(this);
    if (items !== undefined) this.setItems(items);
    this._isEvaluating--;
};

// zero or many arguments. Expression result is always an array

Amm.Operator.List.prototype = {

    'Amm.Operator.List': '__CLASS__', 

    _length: 0,
    
    OPERANDS: null,
    
    STATE_SHARED: {
        _length: true
    },
    
    _getContextState: function() {
        var res = Amm.Operator.prototype._getContextState.call(this);
        for (var i = 0; i < this._length; i++) {
            var v = '_' + i + 'Value', o = '_' + i + 'Operator', x = '_' + i + 'Exists', ob = '_' + i + 'Observe';
            res[v] = this[v];
            res[0] = this[o];
            res[x] = this[x];
            res[ob] = this[ob];
        }
        return res;
    },
    
    getReportsContentChanged: function() {
        // actually we won't report any content changes because
        // that's not possible for list content to change without
        // assigning new array
        return true;
    },
    
    setItems: function(items) {
        if (!(items instanceof Array)) Error("items must be an Array");
        var oldLength = this._length,
            newLength = items.length;
    
        // remove extraneous items
        for (var i = newLength; i < oldLength; i++) {
            var v = '_' + i + 'Value', o = '_' + i + 'Operator', x = '_' + i + 'Exists', ob = '_' + i + 'Observe';
            if (this[o]) this[o].cleanup();
            delete this[o];
            delete this[v];
            delete this[x];
            delete this[ob];
        }
        this._isEvaluating++;
        this.OPERANDS = [];
        for (var i = 0; i < newLength; i++) {
            this._setOperand(i, items[i]);
            this.OPERANDS.push(i);
        }
        this._length = newLength;
        this._isEvaluating--;
    },
    
    _doEvaluate: function(again) {
        var res = [], 
            same = !!this._value && this._length === this._value.length, 
            v;
        
        for (var i = 0; i < this._length; i++) {
            res.push(v = this._getOperandValue(i, again));
            same = (same && this._value[i] === v);
        }
        
        if (same) {
            return this._value; // otherwise change event will be triggered
        }
        
        return res;
    },
    
    toFunction: function() {
        var ff = [];
        for (var i = 0; i < this._length; i++)
            ff.push(this._operandFunction(i));
        var l = ff.length;
        return function(e) {
            var res = [];
            for (var i = 0; i < l; i++) res.push(ff[i]());
            return res;
        };
    }
    
};

Amm.extend(Amm.Operator.List, Amm.Operator);

