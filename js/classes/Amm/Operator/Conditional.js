/* global Amm */

Amm.Operator.Conditional = function(condition, trueValue, falseValue) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    if (condition !== undefined) this._setOperand('condition', condition);
    if (trueValue !== undefined) this._setOperand('trueValue', trueValue);
    if (falseValue !== undefined) this._setOperand('falseValue', falseValue);
    this._isEvaluating--;
};

// returns Expression variable with the name that matches the operand

Amm.Operator.Conditional.prototype = {

    'Amm.Operator.Condition': '__CLASS__', 
    
    _conditionOperator: null,
    
    _conditionValue: null,
    
    _conditionExists: null,

    _trueValueOperator: null,
    
    _trueValueValue: null,
    
    _trueValueExists: null,

    _falseValueOperator: null,
    
    _falseValueValue: null,
    
    _falseValueExists: null,
    
    OPERANDS: ['condition', 'trueValue', 'falseValue'],
    
    supportsAssign: false,
    
    _doEvaluate: function(again) {
        var condition = this._getOperandValue('condition', again);
        var res = condition? 
                this._getOperandValue('trueValue', again)
            :   this._getOperandValue('falseValue', again);
        return res;
    },
    
    setCondition: function(condition) {
        this._setOperand('condition', condition);
    },
        
    setTrueValue: function(trueValue) {
        this._setOperand('trueValue', trueValue);
    },
        
    setFalseValue: function(falseValue) {
        this._setOperand('falseValue', falseValue);
    },
    
    toFunction: function() {
        var c = this._operandFunction('condition');
        var t = this._operandFunction('trueValue');
        var f = this._operandFunction('falseValue');
        return function(e) {
            return c(e)? t(e) : f(e);
        };
    }
    
};

Amm.extend(Amm.Operator.Conditional, Amm.Operator);

