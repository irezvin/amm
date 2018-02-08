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
    
    _varsProviderContextId: null,
    
    OPERANDS: ['varName'],

    STATE_SHARED: {
        _varsProvider: true
    },
    
    supportsAssign: true,
    
    notifyProviderVarsChange: function(value, oldValue, name, provider) {
        if (this._varNameValue && name && this._varNameValue !== name) {
            throw "WTF - we shouldn't received wrong varsChange notification";
        }
        if (this._expression && this._expression.getUpdateLevel()) {
            this._expression.queueUpdate(this);
        } else {
            this.evaluate();
        }
    },

    setExpression: function(expression) {
        Amm.Operator.prototype.setExpression.call(this, expression);
        this._varsProvider = expression;
        this._varsProviderContextId = expression._contextId;
        for (var p = this._parent; p; p = p._parent) {
            if (p['Amm.Operator.VarsProvider']) {
                this._varsProvider = p;
                this._varsProviderContextId = p._contextId;
                break;
            }
        }
        if (this._varsProvider && this._varNameExists && this._varNameValue) {
            this._varsProvider.addConsumer(this, this._varNameValue + '');
        }
    },
    
    _initContextState: function(contextId, own) {
        Amm.Operator.prototype._initContextState.call(this, contextId, own);
        if (own && this._varsProvider) {
            this._varsProviderContextId = this._varsProvider._contextId;
        }
    },
    
    _doEvaluate: function(again) {
        var varName = this._getOperandValue('varName', again);
        if (!varName) return; // no variable
        if (!this._varsProvider) {
            this._hasValue = false;
            return;
        }
        var tmp;
        if (this._varsProviderContextId && this._varsProviderContextId !== this._varsProvider._contextId) {
            tmp = this._varsProvider._contextId;
            this._varsProvider.setContextId(this._varsProviderContextId);
        }
        var res = this._varsProvider.getVars(varName);
        if (tmp) this._varsProvider.setContextId(tmp);
        return res;
    },
    
    _varNameChange: function(value, oldValue, hasValue) {
        if (!this._varsProvider) return;
        var tmp;
        if (this._varsProviderContextId && this._varsProviderContextId !== this._varsProvider._contextId) {
            tmp = this._varsProvider._contextId;
            this._varsProvider.setContextId(this._varsProviderContextId);
        }
        if (oldValue) this._varsProvider.deleteConsumer(this, oldValue);
        if (value) this._varsProvider.addConsumer(this, value);
        if (tmp) this._varsProvider.setContextId(tmp);
    },
        
    _doSetValue: function(value, checkOnly) {
        var varName = this._getOperandValue('varName');
        if (!varName && varName !== 0) return "`varName` is empty";
        if (!this._varsProvider) return "expression not provided";
        if (checkOnly) return '';
        var tmp;
        if (this._varsProviderContextId && this._varsProviderContextId !== this._varsProvider._contextId) {
            tmp = this._varsProvider._contextId;
            this._varsProvider.setContextId(this._varsProviderContextId);
        }
        this._varsProvider.setVars(value, varName);
        if (tmp) this._varsProvider.setContextId(tmp);
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
        if (this._varsProvider && this._varsProvider.hasContext(this._varsProviderContextId)) {
            var tmp;
            if (this._varsProviderContextId && this._varsProviderContextId !== this._varsProvider._contextId) {
                tmp = this._varsProvider._contextId;
                this._varsProvider.setContextId(this._varsProviderContextId);
            }
            this._varsProvider.deleteConsumer(this, this._varNameValue + '');
            if (tmp) this._varsProvider.setContextId(tmp);
        }
        Amm.Operator.prototype._partialCleanup.call(this);
    }
    
};

Amm.extend(Amm.Operator.Var, Amm.Operator);

