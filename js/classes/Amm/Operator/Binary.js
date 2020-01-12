/* global Amm */

Amm.Operator.Binary = function(left, operator, right) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    this._setOperator(operator);
    if (left !== undefined) this._setOperand('left', left);
    if (right !== undefined) this._setOperand('right', right);
    this._isEvaluating--;
};

Amm.Operator.Binary.BINARY_OPERATORS = {
    '!==': function(left, right) { return left !== right; },
    '===': function(left, right) {return left === right; },
    '==': function(left, right) {return left == right; },
    '!=': function(left, right) {return left != right; },
    '+': function(left, right) {return left + right; },
    '-': function(left, right) {return left - right; },
    '*': function(left, right) {return left * right; },
    '%': function(left, right) {return left % right; },
    '/': function(left, right) {return left / right; },
    '>': function(left, right) {return left > right; },
    '<': function(left, right) {return left < right; },
    '<=': function(left, right) {return left <= right; },
    '>=': function(left, right) {return left >= right; },
    '&': function(left, right) {return left & right; },
    '|': function(left, right) {return left | right; },
    '&&': function(left, right) {return left && right; },
    '||': function(left, right) {return left || right; },
    'instanceof': function(left, right) { return Amm.Operator.Binary.instanceof(left, right); }
};
    


// returns Expression variable with the name that matches the operand

Amm.Operator.Binary.prototype = {

    'Amm.Operator.Binary': '__CLASS__', 
    
    _leftOperator: null,
    
    _leftValue: null,
    
    _leftExists: null,

    _operator: null,
    
    _operatorFn: null,

    _rightOperator: null,
    
    _rightValue: null,
    
    _rightExists: null,
    
    OPERANDS: ['left', 'right'],
    
    STATE_SHARED: {
        _operator: true,
        _operatorFn: true
    },
    
    supportsAssign: false,
    
    _setOperator: function(operator) {
        var fn = Amm.Operator.Binary.BINARY_OPERATORS[operator];
        if (!fn)
            Error("Unsupported binary operator type: '" + operator + "'");
        this._operator = operator;
        this._operatorFn = fn;
    },

    _doEvaluate: function(again) {
        var left = this._getOperandValue('left', again);
        var right = this._getOperandValue('right', again);
        return this._operatorFn(left, right);
    },
    
    setLeft: function(left) {
        this._setOperand('left', left);
    },
        
    setRight: function(right) {
        this._setOperand('right', right);
    },
    
    toFunction: function() {
        var l = this._operandFunction('left');
        var r = this._operandFunction('right');
        var op = this._operatorFn;
        return function(e) {
            return op(l(e), r(e));
        };
    }
    
};

Amm.extend(Amm.Operator.Binary, Amm.Operator);

Amm.Operator.Binary.instanceof = function(object, constructor) {
    if (!constructor) return false;
    if (!object && typeof object !== 'object') return false;
    if (typeof constructor === 'string') {
        constructor = Amm.Operator.FunctionCall.getFunction(constructor, true);
        if (!constructor) return false;
    }
    if (typeof constructor !== 'function') {
        throw Error("right-side of instanceof must be either string or function");
    }
    if (object instanceof constructor) return true;
    return Amm.is(object, constructor);
};


