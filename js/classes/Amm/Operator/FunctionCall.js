/* global Amm */

Amm.Operator.FunctionCall = function(func, args, cacheability, isNew) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    this._cacheability = !!cacheability || !!isNew;
    this._isNew = !!isNew;
    if (args !== undefined) this._setOperand('args', args);
    if (func !== undefined) this._setOperand('func', func);
    if (cacheability !== undefined && cacheability !== null && !cacheability) {
        this._setNonCacheable(Amm.Operator.NON_CACHEABLE_VALUE);
    }
    this._isEvaluating--;
};

// functions that can be accessed using string identifiers
Amm.Operator.FunctionCall.WINDOW_PASSTHROUGH = [
    'RegExp', 'Intl', 'JSON', 'Math', 'Date', 'isNaN', 'isFinite', 'parseInt', 'parseFloat'
];

// returns Expression variable with the name that matches the operand

Amm.Operator.FunctionCall.prototype = {

    'Amm.Operator.FunctionCall': '__CLASS__', 

    _isNew: false,
    
    _funcOperator: null,
    
    _funcValue: null,
    
    _funcExists: null,
    
    _argsOperator: null,
    
    _argsValue: null,
    
    _argsExists: null,
    
    _cacheability: null,
    
    OPERANDS: ['func', 'args'],
    
    STATE_SHARED: {
        _cacheability: true,
        _isNew: true
    },
    
    getReportsContentChanged: function() {
        return this._cacheability;
    },
    
    _doEvaluate: function(again) {
        var func = this._getOperandValue('func', again);
        if (!func) return;
        func = Amm.Operator.FunctionCall.getFunction(func);
        var args = this._getOperandValue('args', again);
        if (this._isNew) return Amm.Operator.FunctionCall.newVarArgs(func, args);
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
        var isNew = this._isNew;
        return function(e) {
            var func = f(e);
            if (!func) return;
            func = Amm.Operator.FunctionCall.getFunction(func);
            var args = a(e);
            if (isNew) return Amm.Operator.FunctionCall.newVarArgs(func, args);
            if (args === null || args === undefined || args instanceof Array && !args.length) {
                return func();
            } else {
                if (args instanceof Array) return func.apply(window, args);
                else return func(args);
            }
        };
    },
    
    _isValueObservable: function(operand, value) {
        if (operand === 'args') return false; // array result of "list" operator DOES NOT change
        return Amm.Operator.prototype._isValueObservable.call(this, operand, value);
    },
    
    _reportChange: function(oldValue) {
        Amm.Operator.prototype._reportChange.call(this, oldValue);
        if (this._isNew && oldValue && typeof oldValue.cleanup === 'function') {
            oldValue.cleanup();
        }
    },
    
};

Amm.extend(Amm.Operator.FunctionCall, Amm.Operator);

Amm.Operator.FunctionCall.getFunction = function(fn, dontThrow) {
    var res;
    if (typeof fn === 'function') return fn;
    else if (typeof fn === 'string') {
        res = Amm.getFunction(fn, true);
        if (!res) {
            if (Amm.Array.indexOf(fn, Amm.Operator.FunctionCall.WINDOW_PASSTHROUGH) >= 0) {
                res = window[fn];
            }
        }
        if (!res && !dontThrow) Amm.getFunction(fn); // just to throw the exception
    } else {
        if (dontThrow) return;
        throw Error("Callee must be either function or string, given: "
                + Amm.describeType(fn));
    }
    return res;
};

Amm.Operator.FunctionCall.newVarArgs = function(fn, a) {

    if (a === null || a === undefined || (a instanceof Array && !a.length)) return new fn;
    else if (!(a instanceof Array)) return new fn(a);
    
    var l = a.length;
    if (!l) return new fn;
    if (l === 1) return new fn(a[0]); 
    if (l === 2) return new fn(a[0], a[1]); 
    if (l === 3) return new fn(a[0], a[1], a[2]); 
    if (l === 4) return new fn(a[0], a[1], a[2], a[3]); 
    if (l === 5) return new fn(a[0], a[1], a[2], a[3], a[4]); 
    if (l === 6) return new fn(a[0], a[1], a[2], a[3], a[4], a[5]); 
    if (l === 7) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6]); 
    if (l === 8) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]); 
    if (l === 9) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]); 
    if (l === 10) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]); 
    if (l === 11) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10]); 
    if (l === 12) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11]); 
    if (l === 13) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12]); 
    if (l === 14) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13]); 
    if (l === 15) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14]); 
    if (l === 16) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]); 
    if (l === 17) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16]); 
    if (l === 18) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17]); 
    if (l === 19) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17], a[18]); 
    if (l === 20) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17], a[18], a[19]);
    throw Error("Only argument arrays of size up to 20 are supported");
    
};