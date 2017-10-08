/* global Amm */

Amm.Operator.FunctionCall = function(func, args, cacheability) {
    Amm.Operator.call(this);
    if (func !== undefined) this._setOperand('func', func);
    if (args !== undefined) this._setOperand('args', args);
    this._cacheability = !!cacheability;
    if (cacheability !== undefined && cacheability !== null && !cacheability) {
        this._setNonCacheable(Amm.Operator.NON_CACHEABLE_VALUE);
    }
};

// returns Expression variable with the name that matches the operand

Amm.Operator.FunctionCall.prototype = {

    'Amm.Operator.FunctionCall': '__CLASS__', 
    
    _funcOperator: null,
    
    _funcValue: null,
    
    _funcExists: null,
    
    _argsOperator: null,
    
    _argsValue: null,
    
    _argsExists: null,
    
    _cacheability: null,
    
    OPERANDS: ['func', 'args'],
    
    getReportsContentChanged: function() {
        return this._cacheability;
    },
    
    _doEvaluate: function(again) {
        var func = this._getOperandValue('func', again);
        if (!func) return;
        if (typeof func !== 'function') throw "cannot call: operand is not a function";
        var args = this._getOperandValue('args', again);
        if (args === null || args === undefined || args instanceof Array && !args.length) {
            return func();
        } else {
            if (args instanceof Array) return func.apply(window, args);
            else return func(args);
        }
    },
    
    toFunction: function() {
        var f = this._operandFunction('func');
        var a = this._operandFunction('args');
        return function(e) {
            var func = f(e);
            if (!func) return;
            if (typeof func !== 'function') throw "cannot call: operand is not a function";
            var args = a(e);;
            if (args === null || args === undefined || args instanceof Array && !args.length) {
                return func();
            } else {
                if (args instanceof Array) return func.apply(window, args);
                else return func(args);
            }
        };
    }
    
};

Amm.extend(Amm.Operator.FunctionCall, Amm.Operator);

