/* global Amm */
Amm.Operator.Range = function(source) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    if (source !== undefined) this._setOperand('source', source);
    this._isEvaluating--;
};

Amm.Operator.Range.prototype = {

    'Amm.Operator.Range': '__CLASS__', 

    _sourceOperator: null,
    
    _sourceValue: null,
    
    _sourceExists: null,
    
    OPERANDS: ['source'],
    
    supportsAssign: false,
    
    getReportsContentChanged: function() {
        return true;
    },

    _setSource: function(source) {
        this._setOperand('source', source);
    },

    _doEvaluate: function(again) {
        Error("Call to abstract function");
    },
    
    toFunction: function() {
        Error("Call to abstract function");
    }
    
};

Amm.extend(Amm.Operator.Range, Amm.Operator);

