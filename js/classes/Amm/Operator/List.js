/* global Amm */

Amm.Operator.List = function(items) {
    this.OPERANDS = []; // each instance has own number of operands
    Amm.Operator.call(this);
    if (items !== undefined) this.setItems(items);
};

// zero or many arguments. Expression result is always an array

Amm.Operator.List.prototype = {

    'Amm.Operator.List': '__CLASS__', 

    _length: 0,
    
    OPERANDS: null,
    
    setItems: function(items) {
        if (!(items instanceof Array)) throw "items must be an Array";
        var oldLength = this._length,
            newLength = items.length;
    
        // remove extraneous items
        for (var i = newLength; i < oldLength; i++) {
            var v = '_' + i + 'Value', o = '_' + i + 'Operator', x = '_' + i + 'Exists';
            if (this[o]) this[o].cleanup();
            delete this[o];
            delete this[v];
            delete this[x];
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
    
    _doEvaluate: function() {
        var res = [];
        for (var i = 0; i < this._length; i++)
            res.push(this._getOperandValue(i));
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

