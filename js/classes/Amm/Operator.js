/* global Amm */
Amm.Operator = function()  {
    this._subs = [];
};

Amm.Operator.prototype = {

    'Amm.Operator': '__CLASS__',

    _parent: null,
    
    _parentOperand: null,
    
    _expression: null,
    
    _subs: null,
    
    _value: undefined,
    
    _hasValue: false,
    
    _lockChange: 0,
    
    _isEvaluating: 0,
    
    _evaluated: 0,
    
    _nonCacheable: false,
    
    _hasNonCacheable: 0,
    
    /* Whether we should compare array results for identity and return reference to old value 
       if they contain same items */
    _checkArrayChange: false,
    
    OPERANDS: [],
    
    // whether such operator can be used on the left side of an assignment
    supportsAssign: false,
    
    setExpression: function(expression) {
        if (!expression) expression = null;
        if (expression) Amm.is(expression, 'Amm.Expression', 'Expression');
        var oldExpression = this._expression;
        if (oldExpression === expression) return;
        this._expression = expression;
        return true;
    },

    getExpression: function() { 
        if (this._expression) return this._expression;
        if (this._parent) return this._parent.getExpression();
        return null;
    },

    setParent: function(parent, operand) {
        this._parent = parent;
        if (operand !== undefined) this._parentOperand = operand;
    },

    getParent: function() { return this._parent; },

    getParentOperand: function() { return this._parentOperand; },
    
    _sub: function(object, map, noCheck) {
        if (Amm.Array.indexOf(this._subs, object) < 0) this._subs.push(object);
        if (typeof map === 'string') map = [map];
        if (map instanceof Array) {
            for (var i = 0, l = map.length; i < l; i++) {
                if (noCheck || object.hasEvent(map[i])) object.subscribe(map[i], this._defaultHandler, this);
            }
        } else {
            for (var i in map) if (map.hasOwnProperty(i)) {
                object.subscribe(i, map[i], this);
            }
        }
    },
    
    _unsub: function(object) {
        object.unsubscribe(undefined, undefined, this);
        var idx = Amm.Array.indexOf(this._subs, object);
        if (idx >= 0) this._subs.splice(idx, 1);
    },
    
    notifyOperandChanged: function(operand, value, oldValue, operator) {
        if (this._lockChange) return;
        this._setOperandValue(operand, value);
    },
    
    getValue: function(again) {
        if (again || !this._hasValue) this.evaluate(again);
        return this._value;
    },
    
    setValue: function(value, throwIfCant) {
        if (!this.supportsAssign) throw Amm.getClass(this) + " cannot be used as lvalue";
        var err = this._doSetValue(value);
        if (!err) return true;
        if (throwIfCant) throw err;
        return false;
    },
    
    /*
     * Should return false or undefined if assignment was SUCCESSFUL,
     * error message describing the reason if not
     */ 
    _doSetValue: function(value, checkOnly) {
        if (checkOnly) return "assignment not supported";
        throw "Call to abstract method _doSetValue";
    },
    
    getReadonly: function() {
        var res = this.supportsAssign? this._doSetValue(undefined, true) : "assignment not supported";
        if (!res) res = false;
        return res;
    },
    
    // evaluates the expression
    _doEvaluate: function(again) {
        throw "Call to abstract method _doEvaluate";
    },
    
    // creates the function that recevies the Expression instance and evaluates it
    toFunction: function() {
        throw "Call to abstract method toFunction";
    },
    
    /**
     *  returns function that takes two arguments: expression and value-to-assign,
     *  and returns FALSEABLE value on success or exception description on failure
     **/
    assignmentFunction: function() {
        throw "Call to abstract method assignmentFunction";
    },
    
    // returns function that returns value of operand `operand`
    _operandFunction: function(operand) {
        var operatorVar = '_' + operand + 'Operator';
        if (this[operatorVar]) return this[operatorVar].toFunction();
        var v = this._getOperandValue(operand);
        return function() { return v; };
    },
    
    _reportChange: function(oldValue) {
        if (this._parent) 
            this._parent.notifyOperandChanged(this._parentOperand, this._value, oldValue, this);
    },
    
    // re-evaluates non-cacheable operators only
    checkForChanges: function() {
        if (!this._hasNonCacheable) return; // nothing to do
        var origEvaluated = this._evaluated;
        if (this._hasNonCacheable - this._nonCacheable) {
            for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
                var op = '_' + this.OPERANDS[i] + 'Operator';
                if (this[op] && this[op]._hasNonCacheable) this[op].checkForChanges();
            }
        }
        // we should evaluate ourselves and didn't evaluated() yet by propagating children changes...
        if (this._nonCacheable && this._evaluated === origEvaluated) 
            this.evaluate();
    },
    
    evaluate: function(again) {
        this._isEvaluating++;
        this._evaluated++;
        this._hasValue = true; // do if before, allowing _doEvaluate to change _hasValue 
        var 
            v = this._doEvaluate(again),
            oldValue = this._value,
            changed = this._hasValue && this._value !== v;
    
        // _checkArrayChange? compare arrays item-by-item and update our value only if they're different
        if (changed && this._checkArrayChange && v instanceof Array && this._value instanceof Array) {
            if (Amm.Array.equal(this._value, v)) {
                changed = false;
                v = this._value;
            }
        }
        
        this._value = v;
        if (changed) this._reportChange();
        this._isEvaluating--;
        return this._value;
    },
    
    _defaultHandler: function() {
        this.evaluate();
    },

    _setOperand: function(operand, value) {
        var operatorVar = '_' + operand + 'Operator';
        var valueVar = '_' + operand + 'Value';
        var hasValueVar = '_' + operand + 'Exists';
        
        // check if operand is Operator
        var isOperator = value && typeof value === 'object' && value['Amm.Operator'];
        
        // need to delete old Operator if it's in place
        
        if (this[operatorVar]) {
            if (this[operatorVar] === value) return; // same - so nothing to do!
            if (this[operatorVar]._hasNonCacheable)
                this._setHasNonCacheable(this._hasNonCacheable - 1);
            this[operatorVar].cleanup(); // we cleanup child operators on dissocation
        }
        
        var realValue;
        
        if (isOperator) {
            this[operatorVar] = value;
            if (value._hasNonCacheable) {
                this._setHasNonCacheable(this._hasNonCacheable + 1);
            }
            if (!this[hasValueVar]) {
                // no need to calculate at the moment
                this[operatorVar].setParent(this, operand);
                this[valueVar] = undefined;
                return;
            } else {
                // we don't need to receive change notification at the moment
                this._lockChange++;
                // we need to setParent() first 'cause if may need our Expression
                this[operatorVar].setParent(this, operand); 
                realValue = this[operatorVar].getValue();
                this._lockChange--;
            }
        } else {
            realValue = value;
        }
        
        this._setOperandValue(operand, realValue);
    },
            
    _setOperandValue: function(operand, value) {
        var valueVar = '_' + operand + 'Value';
        var hasValueVar = '_' + operand + 'Exists';
        var changeMethod = '_' + operand + 'Change';
        var eventsMethod = '_' + operand + 'Events';
        var oldValue = this[valueVar];
        var hadValue = this[hasValueVar];
        var changed = !hadValue || this[valueVar] !== value;
        var valueWithEvents, oldWithEvents, shouldFireEventsMethod;
        if (this[eventsMethod]) {
            valueWithEvents = value && value['Amm.WithEvents']? value : null;
            oldWithEvents = this[hasValueVar] && this[valueVar] && this[valueVar]['Amm.WithEvents']? this[valueVar] : null;
        }
        this[hasValueVar] = true;
        this[valueVar] = value;
        if (valueWithEvents || oldWithEvents) this[eventsMethod](valueWithEvents, oldWithEvents);
        if (changed) {
            if (this[changeMethod]) this[changeMethod](value, oldValue, hadValue);
            if (!this._isEvaluating) this.evaluate();
        }
    },
    
    _getOperandValue: function(operand, again) {
        var operatorVar = '_' + operand + 'Operator', opr = this[operatorVar];
        var valueVar = '_' + operand + 'Value';
        var hasValueVar = '_' + operand + 'Exists';
        if (opr && (again || !this[hasValueVar] || opr._hasNonCacheable))
            this._setOperandValue(operand, opr.getValue(again));
        if (this[hasValueVar]) 
            return this[valueVar];
        return undefined;
    },
    
    _setNonCacheable: function(nonCacheable) {
        nonCacheable = !!nonCacheable;
        var oldNonCacheable = this._nonCacheable;
        if (oldNonCacheable === nonCacheable) return;
        this._nonCacheable = nonCacheable;
        if (nonCacheable) this._setHasNonCacheable(this._hasNonCacheable + 1);
            else this._setHasNonCacheable(this._hasNonCacheable - 1);
        return true;
    },

    getNonCacheable: function() { return this._nonCacheable; },

    _setHasNonCacheable: function(hasNonCacheable) {
        hasNonCacheable = parseInt(hasNonCacheable);
        if (hasNonCacheable < 0) hasNonCacheable = 0;
        var oldHasNonCacheable = this._hasNonCacheable;
        if (oldHasNonCacheable === hasNonCacheable) return;
        this._hasNonCacheable = hasNonCacheable;
        if (!!oldHasNonCacheable !== !!hasNonCacheable)
            this._reportNonCacheabilityChanged(!!hasNonCacheable);
        return true;
    },
    
    _reportNonCacheabilityChanged: function(nonCacheability) {
        if (this._parent) 
            this._parent.notifyOperandNonCacheabilityChanged(this._parentOperand, nonCacheability, this);
    },
    
    notifyOperandNonCacheabilityChanged: function(operand, nonCacheability, operator) {
        if (nonCacheability) this._setHasNonCacheable(this._hasNonCacheable + 1);
        else this._setHasNonCacheable(this._hasNonCacheable - 1);
    },

    getHasNonCacheable: function() { return this._hasNonCacheable; },
    
    cleanup: function() {
        this._parent = null;
        this._expression = null;
        for (var i = 0, l = this._subs.length; i < l; i++) {
            this._subs[i].unsubscribe(undefined, undefined, this);
        }
        this._subs = [];
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var operand = this.OPERANDS[i];
            var operatorVar = '_' + operand + 'Operator';
            var valueVar = '_' + operand + 'Value';
            this[valueVar] = null;
            if (this[operatorVar]) {
                this[operatorVar].cleanup();
                this[operatorVar] = null;
            }
        }
    }
    
};
