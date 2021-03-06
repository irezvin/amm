/* global Amm */

Amm.Operator.Unary = function(operator, operand) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    this._setOperator(operator);
    if (operand !== undefined) this._setOperand('operand', operand);
    this._isEvaluating--;
};

Amm.Operator.Unary.Unary_OPERATORS = {
    '!!': function(operand) { return !!operand; },
    '!': function(operand) { return !operand; },
    '-': function(operand) { return -operand; },
    'typeof': function(operand) { return typeof operand; }
};
    


// returns Expression variable with the name that matches the operand

Amm.Operator.Unary.prototype = {

    'Amm.Operator.Unary': '__CLASS__', 
    
    _operandOperator: null,
    
    _operandValue: null,
    
    _operandExists: null,

    _operator: null,
    
    _operatorFn: null,

    OPERANDS: ['operand'],
    
    STATE_SHARED: {
        _operator: true,
        _operatorFn: true
    },
    
    supportsAssign: false,
    
    _setOperator: function(operator) {
        var fn = Amm.Operator.Unary.Unary_OPERATORS[operator];
        if (!fn)
            Error("Unsupported Unary operator type: '" + operator + "'");
        this._operator = operator;
        this._operatorFn = fn;
    },

    _doEvaluate: function(again) {
        var operand = this._getOperandValue('operand', again);
        return this._operatorFn(operand);
    },
    
    setOperand: function(operand) {
        this._setOperand('operand', operand);
    },
        
    toFunction: function() {
        var o = this._operandFunction('operand');
        var op = this._operatorFn;
        return function(e) {
            return op(o(e));
        };
    }
    
};

Amm.extend(Amm.Operator.Unary, Amm.Operator);

