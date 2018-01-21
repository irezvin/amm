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
    
    _varsProvider: null,
    
    OPERANDS: ['varName'],

    STATE_SHARED: {
        _varsProvider: true
    },
    
    supportsAssign: true,
    
    setContextIdToDispatchEvent: function(contextId, ev, args) {
        if (ev === 'varsChange' && args[3] !== this._varsProvider && args[4] !== contextId) return;
        if (this._varNameValue && args[2] && this._varNameValue !== args[2]) return;
        Amm.Operator.prototype.setContextIdToDispatchEvent.call(this, contextId, ev, args);
    },

    _onProviderVarsChange: function(value, oldValue, name, provider, contextId) {
        if (provider !== this._varsProvider || contextId !== this._contextId) return;
        if (this._varNameValue && name && this._varNameValue !== name) return;
        if (this._expression && this._expression.getUpdateLevel()) {
            this._expression.queueUpdate(this);
        } else {
            this.evaluate();
        }
    },

    setExpression: function(expression) {
        Amm.Operator.prototype.setExpression.call(this, expression);
        this._varsProvider = expression;
        for (var p = this._parent; p; p = p._parent) {
            if (p['Amm.Operator.VarsProvider']) {
                this._varsProvider = p;
                break;
            }
        }
        this._sub(this.expression, 'varsChange', '_onProviderVarsChange', null, true);
    },
    
    _initContextState: function(contextId, own) {    
        Amm.Operator.prototype._initContextState.call(this, contextId, own);
        if (own && this._expression) {
            this._sub(this.expression, 'varsChange', '_onProviderVarsChange', null, true);
        }
    },
    
    _doEvaluate: function(again) {
        var varName = this._getOperandValue('varName', again);
        if (!varName) return; // no variable
        if (!this._varsProvider) {
            this._hasValue = false;
            return;
        }
        if (this._contextId !== this._varsProvider._contextId && this._varsProvider.hasContext(this._contextId)) {
            this._varsProvider._propagateContext(null, this, false);
        }
        var res = this._varsProvider.getVars(varName);
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
            return e.vars[varName];
        };
    },
    
    assignmentFunction: function() {
        var f = this._operandFunction('varName');
        return function(e, value) {
            var varName = f(e);
            if (!varName && varName !== 0) return "`varName` is empty";
            e.vars[varName] = value;
        };
    },
    
    _partialCleanup: function() {
        if (this._expression && this._varsProvider) {
            this._expression.unsubscribeOperator(this._expression, 'varsChange', this);
        }
        Amm.Operator.prototype._partialCleanup.call(this);
    }
    
};

Amm.extend(Amm.Operator.Var, Amm.Operator);

