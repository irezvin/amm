/* global Amm */

/**
 * Provides variables for child Operator. 
 */
Amm.Operator.VarsProvider = function(operator, vars) {
    if (vars && typeof vars !== 'object') {
        throw "`vars` must be an object";
    }
    this._vars = vars || {};
    Amm.Operator.call(this);
    if (operator) this.setOperator(operator);    
};

Amm.Operator.VarsProvider.prototype = {

    'Amm.Operator.VarsProvider': '__CLASS__', 
    
    _vars: null,
    
    _varsProvider: null,
    
    _allVars: null,
    
    _operatorOperator: null,
    
    _operatorValue: null,
    
    _operatorExists: null,
    
    OPERANDS: ['operator'],
    
    STATE_SHARED: {
        _varsProvider: true
    },

    setOperator: function(operator) {
        this._setOperand('operator', operator);
        if (this._operatorOperator) {
            this.supportsAssign = this._operatorOperator.supportsAssign;
        }
        // Inherit default 'empty' value from operator to avoid unnecessary/incorrect valueChange events
        if (!this._hasValue && !this._operatorOperator._hasValue) {
            this._value = this._operatorOperator._value;
        }
    },
    
    
    _doSetValue: function(value, checkOnly) {
        if (!checkOnly) this._operatorOperator._doSetValue(value);
        var readonly = this._operatorOperator.getReadonly();
        return readonly;
    },
    
    _doEvaluate: function(again) {
        return this._getOperandValue('operator', again);
    },
    
    toFunction: function() {
        var op = this._operandFunction('operator');
        var v = this._vars? this._vars : {};
        var fn;
        if (this._operatorOperator && this._operatorOperator.supportsAssign) {
            var assign = this._operatorOperator.assignmentFunction();
            fn = function(e, value) {
                var tmp = e.vars;
                e.vars = Amm.override(e.vars, v);
                var res;
                if (arguments.length > 1) {
                    res = assign(e, value);
                }
                else res = op(e);
                e.vars = tmp;
                return res;
            };
        } else {
            fn = function(e) {
                var tmp = e.vars;
                e.vars = Amm.override(e.vars, v);
                var res = op(e1);
                e.vars = tmp;
                return res;
            };
        }
        fn.vars = v;
        return fn;
    },
    
    assignmentFunction: function() {
        if (this._operatorOperator) {
            return this._operatorOperator.assignmentFunction();
        }
        return function() {
            return "`operator` not provided";
        };
    },
    
    setContextIdToDispatchEvent: function(contextId, ev, args) {
        if (ev === 'varsChange' && (args[3] !== this._varsProvider || args[4] !== contextId)) {
            return;
        }
        Amm.Operator.prototype.setContextIdToDispatchEvent.call(this, contextId, ev, args);
    },
    
    _handleProviderVarsChange: function(value, oldValue, name, object, contextId) {
        if (object !== this._varsProvider || contextId !== this._contextId) {
            return; // not ours
        }
        if (name) { // case A: single variable changed
            // nothing to do because our variables hide parent's ones
            if (this._vars && name in this._vars) return;
            var old = Amm.override({}, this._allVars || this.getVars());
            this._allVars[name] = value;
            if (this._providerVars) this._providerVars[name] = value;
            if (this._expression) {
                this._expression.outVarsChange(value, oldValue, name, this, this._contextId);
            }
        } else { // case B: all parent vars changed
            old = Amm.override({}, this._allVars || this.getVars());
            this._allVars = Amm.override({}, value, this._vars);
            this._providerVars = value;
            if (this._expression) {
                this._expression.outVarsChange(this._allVars, old, null, this, this._contextId);
            }
        }
    },
    
    setVarsProvider: function(varsProvider) {
        var oldVarsProvider = this._varsProvider;
        if (oldVarsProvider === varsProvider) return;
        if (oldVarsProvider) throw "Can setVarsProvider() only once";
        if (!varsProvider || !varsProvider['Amm.Operator.VarsProvider'])
            throw "varsProvider must be an instance of Amm.Operator.VarsProvider";
        this._varsProvider = varsProvider;
        this._sub(this._expression, 'varsChange', '_handleProviderVarsChange');
        return true;
    },
    
    _initContextState: function(contextId, own) {    
        Amm.Operator.prototype._initContextState.call(this, contextId, own);
        if (own && this._expression) {
            this._sub(this.expression, 'varsChange', '_handleProviderVarsChange', null, true);
        }
    },
    
    getVarsProvider: function() { return this._varsProvider; },
    
    setVars: function(value, name) {
        var exp = this['Amm.Expression']? this : this._expression;
        if (name) { // a - set item in vars
            if (typeof name !== 'string')
                throw "setVars(`value`, `name`): `name` must be a string";
            var old = this._vars[name];
            if (value === old) return; // nothing to do
            this._vars[name] = value;
            if (this._varsProvider) {
                if (!this._allVars) this.getVars();
                this._allVars[name] = value;
            }
            if (exp) exp.outVarsChange(value, old, name, this, this._contextId);
        } else { // b - set whole vars
            if (typeof value !== 'object') throw "setVars(`value`): object required";
            var old = Amm.override({}, this._allVars || this.getVars());
            if (!value) value = {}; // delete all vars
            this._vars = value;
            this._allVars = null;
            if (exp) exp.outVarsChange(this.getVars(), old, null, this, this._contextId);
        }
        return true;
    },
    
    getVars: function(name, noChain) {
        if (noChain || !this._varsProvider)
            return name? this._vars[name] : this._vars;
        if (!this._providerVars)
            this._providerVars = this._varsProvider.getVars();
        if (!this._allVars) {
            this._allVars = Amm.override({}, this._providerVars, this._vars);
        }
        return name? this._allVars[name] : this._allVars;
    },
    
    setExpression: function(expression) {
        var res = Amm.Operator.prototype.setExpression.call(this, expression);
        for (var p = this._parent; p; p = p._parent) {
            if (p['Amm.Operator.VarsProvider']) {
                this.setVarsProvider(p);
                return;
            }
        }
        return res;
    },

    _partialCleanup: function() {
        this._vars = {};
        this._providerVars = null;
        this._allVars = null;
        if (this._expression && this._varsProvider) {
            this._expression.unsubscribeOperator(this._expression, 'varsChange', this);
        }
        Amm.Operator.prototype._partialCleanup.call(this);
    },
    
    cleanup: function() {
        this._varsProvider = null;
        Amm.Operator.prototype.cleanup.call(this);
    },
    
    _constructContextState: function() {
        var res = Amm.Operator.prototype._constructContextState.call(this);
        res._vars = {};
        return res;
    }
    
};

Amm.extend(Amm.Operator.VarsProvider, Amm.Operator);

