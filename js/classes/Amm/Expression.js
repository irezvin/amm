/* global Amm */

/**
 * Provides vars data for child Operator; 
 */
Amm.Expression = function(options) {
    this._vars = {};
    if (options && options['Amm.Operator']) {
        options = {operator: options};
    }
    Amm.Operator.call(this);
    Amm.WithEvents.call(this);
    Amm.init(this, options);
};

Amm.Expression.prototype = {
    
    'Amm.Expression': '__CLASS__',
    
    _aOperator: null,
    
    _aValue: null,
    
    _aExists: null,
    
    _vars: null,
    
    OPERANDS: ['a'],
    
    setVars: function(value, name) {
        if (name) { // a - set item in vars
            var old = this._vars[name];
            if (value === old) return; // nothing to do
            this._vars[name] = value;
            this.outVarsChange(value, old, name);
        } else { // b - set whole vars
            if (typeof value !== 'object') throw "'value': object required when name not provided";
            var old = this._vars;
            this._vars = value;
            this.outVarsChange(this._vars, old);
        }
        return true;
    },
    
    getVars: function(name) {
        return name? this._vars[name] : this._vars;
    },
    
    outVarsChange: function(value, oldValue, name) {
        this._out('varsChange', value, oldValue, name);
    },

    setOperator: function(operator) {
        Amm.is(operator, 'Amm.Operator', 'operator');
        this._setOperand('a', operator);
        this.supportsAssign = operator.supportsAssign;
        operator.setExpression(this);
    },
    
    getOperator: function() {
        return this._aOperator;
    },
    
    _doSetValue: function(value, checkOnly) {
        if (!checkOnly) this._aOperator._doSetValue(value);
        var readonly = this._aOperator.getReadonly();
        return readonly;
    },
    
    _doEvaluate: function(again) {
        return this._getOperandValue('a', again);
    },
    
    toFunction: function() {
        var a = this._operandFunction('a'), t = this;
        if (this._aOperator && this._aOperator.supportsAssign) {
            var assign = this._aOperator.assignmentFunction();
            return function(value, throwIfCant) {
                if (arguments.length) {
                    var res = assign(t, value);
                    if (res && throwIfCant) throw res;
                    return !res;
                }
                else return a(t);
            };
        }
        return function() {
            return a(t);
        };
    },
    
    assignmentFunction: function() {
        if (this._aOperator) return this._aOperator.assignmentFunction();
        return function(e, value) {
            return "`operator` not provided";
        }
    },
    
    _reportChange: function(oldValue) {
        Amm.Operator.prototype._reportChange.call(this, oldValue);
        this.outValueChange(this._value, oldValue);
    },
    
    _reportNonCacheabilityChanged: function(nonCacheability) {
        Amm.Operator.prototype._reportNonCacheabilityChanged.call(this, nonCacheability);
        if (nonCacheability) Amm.getRoot().subscribe('interval', this.checkForChanges, this);
            else Amm.getRoot().unsubscribe('interval', this.checkForChanges, this);
    },
    
    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    },
    
    cleanup: function() {
        Amm.WithEvents.prototype.cleanup.call(this);
        Amm.Operator.prototype.cleanup.call(this);
        if (this._hasNonCacheable) {
            Amm.getRoot().unsubscribe('interval', this.checkForChanges, this);
        }
    },
    
    getIsCacheable: function() {
        return !this._hasNonCacheable;
    }
    
};

Amm.extend(Amm.Expression, Amm.Operator);
Amm.extend(Amm.Expression, Amm.WithEvents);
