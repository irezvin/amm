/* global Amm */

/**
 * Provides variables for child Operator. 
 */
Amm.Operator.VarsProvider = function(operator, vars) {
    this._isEvaluating++;
    if (vars && typeof vars !== 'object') {
        Error("`vars` must be an object");
    }
    this._vars = vars || {};
    Amm.Operator.call(this);
    if (operator) this.setOperator(operator);    
    this._isEvaluating--;
};

Amm.Operator.VarsProvider.prototype = {

    'Amm.Operator.VarsProvider': '__CLASS__', 
    
    _vars: null,
    
    _varsProvider: null,
    
    _varsProviderContextId: null,
    
    _allVars: null,
    
    _operatorOperator: null,
    
    _operatorValue: null,
     
    _operatorExists: null,
    
    /**
     *  Hash: { varName: [consumers], '': [consumersForAllVars] }
     *  where consumer is either `object` or [`object`, `contextId`];
     *  `object` must have 'notifyProviderVarsChange' (value, oldValue, name, object) event
     */
    _consumers: null,
    
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
        this._propagateContext('operator', this._operatorOperator, true);
        if (!checkOnly) this._operatorOperator._doSetValue(value);
        var readOnly = this._operatorOperator.getReadOnly();
        return readOnly;
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
                e.vars = Amm.override({}, e.vars, v);
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
                e.vars = Amm.override({}, e.vars, v);
                var res = op(e);
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
    
    notifyProviderVarsChange: function(value, oldValue, name, object) {
        if (name) { // case A: single variable changed
            // nothing to do because our variables hide parent's ones
            if (this._vars && name in this._vars) return;
            var old = Amm.override({}, this._allVars || this.getVars());
            this._allVars[name] = value;
            if (this._providerVars) this._providerVars[name] = value;
            if (this._consumers) this._notifyConsumers(value, oldValue, name);
        } else { // case B: all parent vars changed
            old = Amm.override({}, this._allVars || this.getVars());
            this._allVars = Amm.override({}, value, this._vars);
            this._providerVars = value;
            if (this._consumers) this._notifyConsumers(this._allVars, old, '');
        }
    },
    
    setVarsProvider: function(varsProvider) {
        var oldVarsProvider = this._varsProvider;
        var oldVarsProviderContextId = this._varsProviderContextId;
        if (oldVarsProvider === varsProvider && oldVarsProviderContextId === this._varsProviderContextId) return;
        if (oldVarsProvider) Error("Can setVarsProvider() only once");
        if (!varsProvider || !varsProvider['Amm.Operator.VarsProvider'])
            Error("varsProvider must be an instance of Amm.Operator.VarsProvider");
        this._varsProvider = varsProvider;
        this._varsProviderContextId = varsProvider._contextId;
        this._varsProvider.addConsumer(this, '');
        return true;
    },
    
    _initContextState: function(contextId, own) {    
        Amm.Operator.prototype._initContextState.call(this, contextId, own);
        if (own && this._varsProvider) {
            this._varsProviderContextId = this._varsProvider._contextId;
            this._varsProvider.addConsumer(this, '');
        }
    },
    
    getVarsProvider: function() { return this._varsProvider; },
    
    setVars: function(value, name) {
        var exp = this['Amm.Expression']? this : this._expression;
        if (name) { // a - set item in vars
            if (typeof name !== 'string')
                Error("setVars(`value`, `name`): `name` must be a string");
            var old = this._vars[name];
            if (value === old) return; // nothing to do
            this._vars[name] = value;
            if (this._varsProvider) {
                if (!this._allVars) this.getVars();
                this._allVars[name] = value;
            }
            if (this._consumers) this._notifyConsumers(value, old, name);
        } else { // b - set whole vars
            if (typeof value !== 'object') Error("setVars(`value`): object required");
            var old = Amm.override({}, this._allVars || this.getVars());
            if (!value) value = {}; // delete all vars
            this._vars = Amm.override({}, value);
            this._allVars = null;
            if (this._consumers) this._notifyConsumers(this.getVars(), old, '');
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
        this._consumers = null;
        if (this._varsProvider && this._varsProvider.hasContext(this._varsProviderContextId)) {
            var tmp;
            if (this._varsProviderContextId !== this._varsProvider._contextId) {
                tmp = this._varsProvider._contextId;
                this._varsProvider.setContextId(this._varsProviderContextId);
            }
            this._varsProvider.deleteConsumer(this, '');
            if (tmp) this._varsProvider.setContextId(tmp);
        }
        Amm.Operator.prototype._partialCleanup.call(this);
    },
    
    cleanup: function() {
        if (this._varsProvider && this._varsProvider.hasContext(this._varsProviderContextId)) {
            var tmp;
            if (this._varsProviderContextId !== this._varsProvider._contextId) {
                tmp = this._varsProvider._contextId;
                this._varsProvider.setContextId(this._varsProviderContextId);
            }
            this._varsProvider.deleteConsumer(this, '');
            if (tmp) this._varsProvider.setContextId(tmp);
        }
        this._varsProvider = null;
        this._consumers = null;
        Amm.Operator.prototype.cleanup.call(this);
    },
    
    _constructContextState: function() {
        var res = Amm.Operator.prototype._constructContextState.call(this);
        res._vars = {};
        res._consumers = null;
        return res;
    },
    
    addConsumer: function(consumer, varName) {
        varName = varName || '';
        if (!this._consumers) {
            this._consumers = {};
            this._consumers[varName] = [];
        } else if (!this._consumers[varName]) {
            this._consumers[varName] = [];
        }
        var ins = consumer._contextId !== this._contextId?
            [consumer, consumer._contextId] : consumer;
        this._consumers[varName].push(ins);
    },
    
    deleteConsumer: function(consumer, varName) {
        if (!this._consumers) return;
        varName = varName || '';
        var contextId = consumer._contextId;
        if (contextId === this._contextId) contextId = null;
        if (!this._consumers[varName]) return;
        for (var i = 0, l = this._consumers[varName].length; i < l; i++) {
            var c = this._consumers[varName][i];
            if (contextId === null && c === consumer || c[0] === consumer && c[1] === contextId) {
                this._consumers[varName].splice(i, 1);
                return;
            }
        }
    },
    
    _notifyConsumers: function(value, oldValue, varName) {
        if (!this._consumers) return;
        var consumers = this._consumers, contextId = this._contextId;
        var gotAny = false;
        varName = varName || '';
        var i, j, l, cs, cx, o, n, v;
        var kk;
        if (varName === '') kk = Amm.keys(consumers);
        else {
            kk = ['', varName];
            n = value;
            o = oldValue;
            v = varName;
        }
        for (var ki = 0, kl = kk.length; ki < kl; ki++) if (consumers[kk[ki]]) {
            i = kk[ki];
            // check if our var changed or it is 'all vars' consumer (or no old/new value provided)
            if (varName === '') {
                // var is of no interest
                if (!(i === '' || !oldValue || !value || oldValue[i] !== value[i])) continue; 
                if (i !== '') {
                    n = value? value[i] : undefined;
                    o = oldValue? oldValue[i] : undefined;
                    v = i;
                } else {
                    n = value;
                    o = oldValue;
                    v = '';
                }
            }
            for (j = 0, l = consumers[i].length; j < l; j++) {
                if (consumers[i][j][0]) {
                    cs = consumers[i][j][0];
                    cx = consumers[i][j][1];
                } else {
                    cs = consumers[i][j];
                    cx = contextId;
                }
                if (!gotAny) {
                    gotAny = true;
                    if (this._expression) {
                        this._expression._beginUpdate();
                    } else if (this['Amm.Expression']) {
                        this._beginUpdate();
                    }
                }
                if (cs._contextId !== cx) {
                    cs.setContextId(cx);
                }
                cs.notifyProviderVarsChange(n, o, v, this);
            }
        }
        if (gotAny) {
            if (this._expression) {
                this._expression._endUpdate();
            } else if (this['Amm.Expression']) {
                this._endUpdate();
            }
        }
        
    }
    
};

Amm.extend(Amm.Operator.VarsProvider, Amm.Operator);

