/* global Amm */

Amm.Operator.Range.Iterator = function(condition, keyVar, valueVar) {
    this._isEvaluating++;
    Amm.Operator.VarsProvider.call(this, condition);
    this.keyVar = keyVar || null;
    this.valueVar = valueVar || null;
    this._isEvaluating--;
};

Amm.Operator.Range.Iterator.prototype = {

    'Amm.Operator.Range.Iterator': '__CLASS__',

    keyVar: null,
    
    valueVar: null,
    
    index: null,
    
    parentContextId: null,
    
    supportsAssign: false,
    
    STATE_SHARED: {
        keyVar: true,
        valueVar: true
    },
    
    _doEvaluate: function(again) { // converts result to boolean
        var res = this._getOperandValue('operator', again);
        if (res === undefined) return res;
        return !!res;
    }
    
};

Amm.extend(Amm.Operator.Range.Iterator, Amm.Operator.VarsProvider);

