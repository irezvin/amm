/* global Amm */

Amm.Operator.Var = function(varName) {
    Amm.Operator.call(this);
    if (varName !== undefined) this._setOperand('varName', varName);
};

// returns Expression variable with the name that matches the operand

Amm.Operator.Var.prototype = {

    'Amm.Operator.Var': '__CLASS__', 
    
    _varNameOperator: null,
    
    _varNameValue: null,
    
    _varNameExists: null,
    
    OPERANDS: ['varName'],
    
    supportsAssign: true,

    _onExpressionVarsChange: function(value, oldValue, name) {
        if (this._varNameValue && name && this._varNameValue !== name) return;
        if (this._expression && this._expression.getUpdateLevel()) {
            this._expression.queueUpdate(this);
        } else {
            this.evaluate();
        }
    },

    setExpression: function(expression) {
        Amm.Operator.prototype.setExpression.call(this, expression);
        this._sub(expression, {varsChange: '_onExpressionVarsChange'});
    },
    
    _doEvaluate: function(again) {
        var varName = this._getOperandValue('varName', again);
        if (!varName) return; // no variable
        if (!this._expression) {
            this._hasValue = false;
            return;
        } 
        var res = this._expression.getVars(varName);
        return res;
    },
    
    
    _doSetValue: function(value, checkOnly) {
        var varName = this._getOperandValue('varName');
        if (!varName && varName !== 0) return "`varName` is empty";
        if (!this._expression) return "expression not provided";
        if (!checkOnly) this._expression.setVars(value, varName);
    },
        
    setVarName: function(varName) {
        this._setOperand('varName', varName);
    },
    
    toFunction: function() {
        var f = this._operandFunction('varName');
        return function(e) {
            var varName = f(e);
            if (!varName) return;
            return e.getVars(varName);
        };
    },
    
    assignmentFunction: function() {
        var f = this._operandFunction('varName');
        return function(e, value) {
            var varName = f(e);
            if (!varName && varName !== 0) return "`varName` is empty";
            e.setVars(value, varName);
        };
    }    
    
};

Amm.extend(Amm.Operator.Var, Amm.Operator);

