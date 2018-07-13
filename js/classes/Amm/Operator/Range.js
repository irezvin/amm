/* global Amm */
Amm.Operator.Range = function(source) {
    Amm.Operator.call(this);
    if (source !== undefined) this._setOperand('source', source);
};

Amm.Operator.Range.prototype = {

    'Amm.Operator.Range': '__CLASS__', 

    _sourceOperator: null,
    
    _sourceValue: null,
    
    _sourceExists: null,
    
    OPERANDS: ['source'],
    
    supportsAssign: false,

    _setSource: function(source) {
        this._setOperand('source', source);
    },

    _doEvaluate: function(again) {
        Error("Call to abstract function")
    },
    
    toFunction: function() {
        Error("Call to abstract function")
    }
    
};

Amm.extend(Amm.Operator.Range, Amm.Operator);

