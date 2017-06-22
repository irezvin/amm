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
    
    _wExpression: null,
    
    OPERANDS: ['varName'],
    
    supportsAssign: true,

    _setWExpression: function(wExpression) {
        if (!wExpression) wExpression = null;
        var oldWExpression = this._wExpression;
        if (oldWExpression === wExpression) return;
        this._wExpression = wExpression;
        if (oldWExpression) this._unsub(oldWExpression);
        if (wExpression) this._sub(wExpression, {varsChange: '_onExpressionVarsChange'});
    },
    
    _onExpressionVarsChange: function(value, oldValue, name) {
        if (this._varNameValue && name && this._varNameValue !== name) return;
        this.evaluate();
    },

    setExpression: function(expression) {
        Amm.Operator.prototype.setExpression.call(this, expression);
        this._setWExpression(expression);
    },
    
    setParent: function(parent, operand) {
        Amm.Operator.prototype.setParent.call(this, parent, operand);
        this._setWExpression(this.getExpression());
    },
    
    _doEvaluate: function(again) {
        var varName = this._getOperandValue('varName', again);
        if (!varName) return; // no variable
        if (!this._wExpression) {
            var x = this.getExpression();
            if (!x) {
                this._hasValue = false;
                return;
            } // no expression
            this._setWExpression(x);
        }
        var res = this._wExpression.getVars(varName);
        return res;
    },
    
    
    _doSetValue: function(value, checkOnly) {
        var varName = this._getOperandValue('varName');
        if (!varName && varName !== 0) return "`varName` is empty";
        if (!this._wExpression) {
            var x = this.getExpression();
            if (!x) {
                return "expression not provided";
            } // no expression
            this._setWExpression(x);
        }
        if (!checkOnly) 
            this._wExpression.setVars(value, varName);
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

