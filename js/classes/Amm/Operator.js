/* global Amm */
Amm.Operator = function()  {
    this._subs = [];
};

Amm.Operator.CONTEXT_ID = 1;

Amm.Operator.getNextContextId = function() {
    return ('' + Amm.Operator.CONTEXT_ID++);
};

// for bitmask

Amm.Operator.NON_CACHEABLE_VALUE = 1;
Amm.Operator.NON_CACHEABLE_CONTENT = 2;

// Content reports its changes
Amm.Operator.CONTENT_NOTIFIED = 1;

// Operator should periodically check value content
Amm.Operator.CONTENT_PERIODICALLY_CHECKED = 2;

// Child operand reports changes in the content and we shouldn't bother
Amm.Operator.CONTENT_OPERAND_REPORTED = 4;

Amm.Operator.prototype = {

    'Amm.Operator': '__CLASS__',

    id: null,

    _parent: null,
    
    _parentOperand: null,
    
    _expression: null,
    
    _subs: null,
    
    // deferred subscriptions (until setExpression)
    _defSub: null,
    
    _value: undefined,
    
    _hasValue: false,
    
    _lockChange: 0,
    
    _isEvaluating: 0,
    
    _contentChanged: null,
    
    _evaluated: 0,
    
    _nonCacheable: 0,
    
    _hasNonCacheable: 0,
    
    _destChanged: 0,
    
    _level: null,
    
    /* Whether we should compare array results for identity and return reference to old value 
       if they contain same items */
    _checkArrayChange: false,
    
    OPERANDS: [],
    
    // whether such operator can be used on the left side of an assignment
    supportsAssign: false,
    
    beginPos: null,
    
    endPos: null,
    
    // members that don't change between states
    STATE_SHARED: {
        _contextState: true,
        _contextId: true,
        _numCtx: true,
        _parent: true,
        _parentOperand: true,
        _expression: true,
        _level: true,
        _instanceStateShared: true,
        beginPos: true,
        endPos: true,
        STATE_SHARED: true,
        STATE_VARS: true,
        STATE_PROTO: true,
        OPERANDS: true,
        _parenthesis: true,
    },
    
    // link to current instance prototype
    STATE_PROTO: {}, 

    STATE_VARS: [],
    
    _instanceStateShared: null,
    
    /* object { contextId: data } */
    _contextState: null,
    _contextId: '0',
    _numCtx: 1, // we have default context

    // sole purpose is tag expressions that are in parenthesis
    _parenthesis: false,
    
    setExpression: function(expression) {
        Amm.is(expression, 'Amm.Expression', 'Expression');
        if (this._expression === expression) return;
        else if (this._expression) Error("Can setExpression() only once");
        this._expression = expression;
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var o = this['_' + this.OPERANDS[i] + 'Operator'];
            if (o) {
                o.setExpression(expression);
            }
        }
        if (this._defSub) this._subscribeDeferreds();
        return true;
    },
    
    _subscribeDeferreds: function() {
        for (var j = 0; j < this._defSub.length; j++) {
            this._expression.subscribeOperator(
                this._defSub[j][0] || this._expression, 
                this._defSub[j][1], this, this._defSub[j][2]
            );
        }
        this._defSub = null;
    },

    getExpression: function() { 
        return this._expression;
    },

    setParent: function(parent, operand) {
        this._parent = parent;
        if (operand !== undefined) this._parentOperand = operand;
        var e = parent.getExpression();
        if (e) this.setExpression(e);
    },

    getParent: function() { return this._parent; },

    getParentOperand: function() { return this._parentOperand; },
    
    getLevel: function() {
        if (this._level === null && this._parent)
            this._level = this._parent? this._parent.getLevel() + 1 : 0;
        return this._level;
    },
    
    /**
     * map: A - event; B - [event, event...]; C - {event: method, event: method...}
     * object === null: sub to this._expression
     */
    _sub: function(object, map, method, extra, noCheck) {
        var exp = this._expression || (this['Amm.Expression']? this : null);
        if (!exp && !this._defSub) this._defSub = [];
        if (object) {
            var idx = Amm.Array.indexOf(object, this._subs);
            if (idx < 0) this._subs.push(object);
        } else {
            object = exp || null;
            if (!exp) noCheck = true;
        }
        extra = extra || null;
        method = method || this._defaultHandler;
        if (typeof map === 'string') {
            if (!noCheck && !object.hasEvent(map)) return;
            if (exp) {
                exp.subscribeOperator(object, map, this, method, extra);
            } else {
                this._defSub.push([object, map, method, extra]);
            }
            return;
        }
        if (map instanceof Array) {
            for (var i = 0, l = map.length; i < l; i++) {
                if (noCheck || object.hasEvent(map[i])) {
                    if (exp) {
                        exp.subscribeOperator(object, map[i], this, method, extra);
                    } else {
                        this._defSub.push([object, map[i], method, extra]);
                    }
                }
            }
        } else {
            for (var i in map) {
                if (!map.hasOwnProperty(i) || !noCheck && !object.hasEvent(i)) 
                    continue; // not an event or non-existing event
                if (exp) {
                    exp.subscribeOperator(object, i, this, map[i], extra);
                } else {
                    this._defSub.push([object, i, map[i], extra]);
                }
            }
        }
    },
    
    /**
     *  object === null: unsub. from this._expression
     */
    _unsub: function(object, event, method, extra) {
        if (extra === undefined && arguments.length < 4) extra = null;
        if (!object) object = null;
        if (this._defSub) {
            for (var i = this._defSub.length - 1; i >= 0; i--) {
                if (this._defSub[i][0] === object 
                && event === undefined || event === this._defSub[i][1]
                && method === undefined || method === this._defSub[i][2]
                && extra === undefined || extra ===  this._defSub[i][3])
                    this._defSub.splice(i, 1);
            }
        } else {
            var exp = this._expression || (this['Amm.Expression']? this : null);
            if (!exp) return;
            var opCount = exp.unsubscribeOperator(object, event, this, method, extra);
            if (!opCount) { // remove object from our list
                var idx = Amm.Array.indexOf(object, this._subs);
                if (idx >= 0) this._subs.splice(idx, 1);
            }
        }
    },
    
    notifyOperandChanged: function(operand, value, oldValue, operator) {
        this._propagateContext(operand, operator, false);
        if (this._lockChange) {
            return;
        }
        this._setOperandValue(operand, value);
    },
    
    /** 
     * is called by child Operand (internal === false) or by self (internal === true)
     * when operand Array or Collection items are changed, but reference is still the same
     * 
     * changeInfo is object {type: 'splice', 'index': number, 'cut': Array, 'insert': Array}
     * Objects with different 'type' and structure may be introduced later.
     */
    notifyOperandContentChanged: function(operand, changeInfo, internal) {
        // we assume concrete implementations will check if the changes aren't relevant 
        // to the result and return early
        
        // we are inside content check loop - will evaluate later
        if (this._contentChanged !== null) { 
            this._contentChanged++;
            return;
        }
        
        if (this._isEvaluating) return;
        
        var exp = this._expression || (this['Amm.Expression']? this : null);
        if (exp && exp.getUpdateLevel()) {
            exp.queueUpdate(this);
            return;
        }
            
        this.evaluate();
        return true;
        
    },

    /**
     * Wrapper method that begins/ends operand content observation.
     * 
     * When some value is begin observed at the moment (this[`operand` + 'Observe'] === true) and is asked to
     * observe, checks if operand content is currently observed; if yes, calls _implObserve...(false) 
     * to stop observation first; clears observation flag anyway.
     * 
     * When unobserve is requested and the observation flag is truthful, _always_ clears the flag disregarding
     * to _implObserveOperandContent call result.
     * 
     * When observation flag that was set or cleared equals Amm.Operator.CONTENT_PERIODICALLY_CHECKED,
     * may change cacheability mode
     * 
     * @final
     * @returns result of (un)observation implementation method if it was called; undefined otherwise
     */
    _observeOperandContent: function(operand, value, unobserve) {
        var observeVar = '_' + operand + 'Observe';
        var isObserved = this[observeVar];
        var cacheabilityMayChange = false;
        var res = false;
        if (isObserved && unobserve) { // need to unobserve
            res = this._implObserveOperandContent(operand, value, unobserve);
            this[observeVar] = false;
            cacheabilityMayChange = (isObserved === Amm.Operator.CONTENT_PERIODICALLY_CHECKED);
        } else if (!isObserved && !unobserve) { // need to observe
            res = this[observeVar] = this._implObserveOperandContent(operand, value, unobserve);
            cacheabilityMayChange = (res === Amm.Operator.CONTENT_PERIODICALLY_CHECKED);
        }
        
        if (!cacheabilityMayChange) return res;
        
        // set or clear non-cacheability flag if we need to watch the content
        if (!unobserve) {
            var nc;
            nc = this._nonCacheable | Amm.Operator.NON_CACHEABLE_CONTENT;
            this._setNonCacheable(nc);
        } else {
            var stillHaveChecked = false;
            for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
                stillHaveChecked = this['_' + this.OPERANDS[i] + 'Observe'] === Amm.Operator.CONTENT_PERIODICALLY_CHECKED;
                if (stillHaveChecked) break;
            }
            if (!stillHaveChecked) {
                this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_CONTENT);
            }
        }
        
        return res;
    },
    
    // returns true if we should bother with observing this value' content
    _isValueObservable: function(operand, value) {
        if (!value || typeof value !== 'object') return;
        return value['Amm.Array'] || value instanceof Array;
    },
    
    /**
     * Begins to observe content of value `value` of operand `operand`, or refuses to do it.
     * MUST return true (or truthful) value if obsevation actually began.
     * Should not check if already observed or not, set observation flag etc - this work is done by 
     * _observeOperandContent.
     * 
     * @param {string} name of operand
     * @param value What content we're going to (un)observe. Usually Array or Collection.
     * @param {boolean} unobserve true if we're going to stop observation
     * @returns true/undefined
     */
    _implObserveOperandContent: function(operand, value, unobserve) {
        if (!value || typeof value !== 'object') return;
        if (value['Amm.Array']) {
            if (unobserve) {
                this._unsub(value, 'spliceItems', this._handleAmmArraySplice, operand);
            } else {
                this._sub(value, 'spliceItems', this._handleAmmArraySplice, operand, true);
            }
            return Amm.Operator.CONTENT_NOTIFIED;
        }
        if (value instanceof Array) {
            this['_' + operand + 'Old'] = unobserve? undefined : [].concat(value);
            return Amm.Operator.CONTENT_PERIODICALLY_CHECKED;
        }
    },
    
    _handleAmmArraySplice: function(index, cut, insert, operand) {
        var ci = this._makeChangeInfoForSplice(index, cut, insert);
        
        // last argument is operand name. We do this to avoid breakage if event args will ever appear
        operand = arguments[arguments.length - 1]; 
        this.notifyOperandContentChanged(operand, ci, true);
    },
    
    _checkContentChanged: function(operand) {
        var 
            oldValueVar = '_' + operand + 'Old', 
            oldValue = this[oldValueVar],
            valueVar = '_' + operand + 'Value',
            value = this[valueVar];
        
        if (!(value instanceof Array)) {
            this[oldValueVar] = null; // reset saved value and dont trigger the event
            return;
        }
        
        // save value to `...Old` member. We still have `oldValue` to work with
        this[oldValueVar] = [].concat(value);
        
        if (!(oldValue instanceof Array)) return;
            
        var diff = Amm.Array.smartDiff(oldValue, value, null, true);
        
        if (!diff) return;
        
        if (diff[0] !== 'splice') Error("Assertion - should receive only 'splice' event (spliceOnly === true)");
        // 0 'splice', 1 `start`, 2 `length`, 3 `elements` (`insert`)
        var cut = diff[2]? oldValue.slice(diff[1], diff[1] + diff[2]) : [];
        var ci = this._makeChangeInfoForSplice(diff[1], cut, diff[3]);
        
        this.notifyOperandContentChanged(operand, ci, true);
    },
    
    _makeChangeInfoForSplice: function(index, cut, insert) {
        return {
            'Amm.SpliceInfo': '__STRUCT__', 
            type: 'splice', 
            index: index, 
            cut: cut, 
            insert: insert
        };
    },
            
    /** 
     * Returns TRUE if this operator observes own result' content and calls 
     * this._parent.notifyOperandContentChanged. Otherwise _parent needs to observe and subscribe
     * to operand value' changes.
     */
    getReportsContentChanged: function() {
        return false;
    },
            
    getValue: function(again) {
        if (again || !this._hasValue) this.evaluate(again);
        return this._value;
    },
    
    setValue: function(value, throwIfCant) {
        if (!this.supportsAssign) throw Error(Amm.getClass(this) + " cannot be used as lvalue");
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
        Error("Call to abstract method _doSetValue");
    },
    
    getReadOnly: function() {
        var res = this.supportsAssign? this._doSetValue(undefined, true) : "assignment not supported";
        if (!res) res = false;
        return res;
    },
    
    // evaluates the expression
    _doEvaluate: function(again) {
        Error("Call to abstract method _doEvaluate");
    },
    
    // creates the function that recevies the Expression instance and evaluates it
    toFunction: function() {
        Error("Call to abstract method toFunction");
    },
    
    /**
     *  returns function that takes two arguments: expression and value-to-assign,
     *  and returns FALSEABLE value on success or exception description on failure
     **/
    assignmentFunction: function() {
        Error("Call to abstract method assignmentFunction");
    },
    
    // returns function that returns value of operand `operand`
    _operandFunction: function(operand) {
        var operatorVar = '_' + operand + 'Operator';
        if (this[operatorVar]) return this[operatorVar].toFunction();
        var v = this._getOperandValue(operand);
        return function() { return v; };
    },
    
    _reportChange: function(oldValue) {
        if (this._parent) {
            this._parent.notifyOperandChanged(this._parentOperand, this._value, oldValue, this);
        }
    },
    
    _checkNonCacheableOperators: function() {
        if (this._hasNonCacheable <= !!this._nonCacheable) return; // we don't have NC operators
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var op = '_' + this.OPERANDS[i] + 'Operator';
            if (!this[op]) continue;
            if (this[op]._contextId !== this._contextId) {
                this._propagateContext(op, this[op], true);
            }
            if (this[op]._hasNonCacheable) {
                this[op].checkForChanges();
            }
        }
    },
    
    // re-evaluates non-cacheable operators only
    checkForChanges: function() {
        if (!this._hasNonCacheable) return; // nothing to do
        var origEvaluated = this._evaluated;
        
        this._checkNonCacheableOperators();
        
        if (this._nonCacheable & Amm.Operator.NON_CACHEABLE_CONTENT) {
            this._contentChanged = 0;
            
            for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
                if (this['_' + this.OPERANDS[i] + 'Observe'] === Amm.Operator.CONTENT_PERIODICALLY_CHECKED) {
                    this._checkContentChanged(this.OPERANDS[i]);
                }
            }
            
            if (this._contentChanged) this.evaluate();
            this._contentChanged = null;
        }
        
        // we should evaluate ourselves and didn't evaluated() yet by propagating children changes...
        if ((this._nonCacheable & Amm.Operator.NON_CACHEABLE_VALUE) && this._evaluated === origEvaluated) {
            this.evaluate();
        }
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
        if (changed) this._reportChange(oldValue);
        if (this._destChanged) {
            this._destChanged = false;
            this._parent.notifyWriteDestinationChanged(this);
        }
        this._isEvaluating--;
        return this._value;
    },
    
    _defaultHandler: function() {
        var exp = this._expression || (this['Amm.Expression']? this : null);
        if (exp && exp.getUpdateLevel()) {
            exp.queueUpdate(this);
            return;
        }
        this.evaluate();
    },

    hasOperand: function(operand) {
        return !!(this['_' + operand + 'Exists'] || this['_' + operand + 'Operator']);
    },

    _setOperand: function(operand, value) {
        var operatorVar = '_' + operand + 'Operator';
        var valueVar = '_' + operand + 'Value';
        var hasValueVar = '_' + operand + 'Exists';
        var observedVar = '_' + operand + 'Observe';
        
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
            if (this[observedVar]) this._observeOperandContent(operand, this[valueVar], true);
            if (value.getReportsContentChanged()) this[observedVar] = Amm.Operator.CONTENT_OPERAND_REPORTED;
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
            var operandFn = operand + 'OperatorChange';
            if (typeof this[operandFn] === 'function') {
                this[operandFn](this[operatorVar]);
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
        var valueWithEvents, oldWithEvents;
        if (this[eventsMethod]) {
            valueWithEvents = value && value['Amm.WithEvents']? value : null;
            oldWithEvents = this[hasValueVar] && this[valueVar] && this[valueVar]['Amm.WithEvents']? this[valueVar] : null;
        }
        this[hasValueVar] = true;
        this[valueVar] = value;
        if (valueWithEvents || oldWithEvents) this[eventsMethod](valueWithEvents, oldWithEvents);
        if (changed) {
            var observedVar = '_' + operand + 'Observe';
            if (this[observedVar] !== Amm.Operator.CONTENT_OPERAND_REPORTED) {
                // unobserve old value
                if (this[observedVar]) this._observeOperandContent(operand, oldValue, true);
                // begin to observe new value if we must
                if (this._isValueObservable(operand, value)) this._observeOperandContent(operand, value);
            }
            if (this.supportsAssign && this._parent && this._parent['Amm.Expression']) {
                this._destChanged = true;
            }
            if (this[changeMethod]) this[changeMethod](value, oldValue, hadValue);
            if (!this._isEvaluating) {
                var exp = this._expression || (this['Amm.Expression']? this : null);
                if (exp && exp.getUpdateLevel()) {
                    exp.queueUpdate(this);
                } else {
                    this.evaluate();
                }
            }
        }
    },
    
    finishUpdate: function() {
        this.evaluate();
    },
    
    // changes operand context (down === true) or own context (down === false)
    // if our context differs with operand operator' context
    _propagateContext: function(operand, operator, down) {
        if (down) {
            if (!operator) return;
            operator.setContextId(this._contextId);
        } else this.setContextId(operator._contextId);
    },
    
    _getOperandValue: function(operand, again) {
        var operatorVar = '_' + operand + 'Operator', opr = this[operatorVar];
        var valueVar = '_' + operand + 'Value';
        var hasValueVar = '_' + operand + 'Exists';
        // should - and how we should? - switch context here???
        if (opr && opr._contextId !== this._contextId)
            this._propagateContext(operand, opr, true);
        if (opr && (again || !this[hasValueVar] || opr._hasNonCacheable)) {
            this._setOperandValue(operand, opr.getValue(again));
        }
        if (this[hasValueVar])
            return this[valueVar];
        return undefined;
    },
    
    _setNonCacheable: function(nonCacheable) {
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
        if (this._parent) {
            this._parent.notifyOperandNonCacheabilityChanged(this._parentOperand, nonCacheability, this);
        }
    },
    
    notifyOperandNonCacheabilityChanged: function(operand, nonCacheability, operator) {
        if (this._contextId !== operator._contextId) {
            this._propagateContext(operand, operator);
        }
        if (nonCacheability) this._setHasNonCacheable(this._hasNonCacheable + 1);
        else this._setHasNonCacheable(this._hasNonCacheable - 1);
    },

    getHasNonCacheable: function() { return this._hasNonCacheable; },
    
    getOperator: function(operand) {
        if (!operand) operand = this.OPERANDS[0];
        else if (typeof operand === 'number') operand = this.OPERANDS[operand];
        var op = '_' + operand + 'Operator';
        if (!(op in this)) throw Error("No such operand: '" + operand + "' in '" + Amm.getClass(this));
        var res;
        res = this[op];
        if (res && arguments.length > 1) {
            return res.getOperator.apply(res, Array.prototype.slice.call(arguments, 1));
        }
        return res;
    },
    
    // cleans data belonging to the CURRENT context
    deleteContext: function(id) {
        if (id === undefined) id = this._contextId;
        else if (id !== this._contextId) {
            // we don't have such context
            if (!this._contextState[id]) {
                return;
            } 
            this.setContextId(id);
        }
        this._partialCleanup();
        if (this._contextState !== null) this._contextState[id] = null;
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var o = this.OPERANDS[i], opVar = '_' + o + 'Operator', op = this[opVar];
            if (op) {
                op.deleteContext(id);
            }
        }
        this._numCtx--;
    },
    
    _partialCleanup: function() {
        var s = this._subs;
        this._subs = [];
        var exp = this._expression || (this['Amm.Expression']? this : null);
        if (exp) {
            for (var i = s.length - 1; i >= 0; i--) {
                exp.unsubscribeOperator(s[i], undefined, this, undefined, undefined);
            }
        }
    },
    
    cleanup: function() {
        this._partialCleanup();
        this._parent = null;
        var exp = this._expression || (this['Amm.Expression']? this : null);
        this._expression = null;
        this._defSub = null;
        this._contextState = {};
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
    },
    
    getSrc: function() {
        var e = this._expression;
        if (!e) {
            e = this._parent;
            while(e && !e['Amm.Expression']) e = e._parent;
        }
        if (!e) return;
        if (this.beginPos === null) return;
        return e.getSrc(this.beginPos, this.endPos);
    },

    createContext: function(properties) {
        var id = Amm.Operator.getNextContextId();
        this.setContextId(id);
        if (properties && (typeof properties === 'object')) {
            Amm.init(this, properties);
        }
        return id;
    },
    
    setContextIdToDispatchEvent: function(contextId, event, args) {
        this.setContextId(contextId);
    },
    
    setContextId: function(contextId) {
        if (this._contextId === contextId) return;
        if (!this._contextState) {
            this._contextState = {};
            this._populateInstanceStateShared();
        }
        
        // save current context if it wasn't destroyed
        if (this._contextState[this._contextId] !== null)
            this._contextState[this._contextId] = this._getContextState();
        
        var newState, isNewState = false;
        if (contextId in this._contextState) {
            newState = this._contextState[contextId];
            if (newState === null) {
                Error("Attempt to setContextId() of already destroyed context");
            }
        } else {
            newState = this._constructContextState();
            isNewState = true;
            this._numCtx++;
        }
        this._contextId = contextId;
        this._setContextState(newState, isNewState);
    },
    
    getContextId: function() {
        return this._contextId;
    },
    
    hasContext: function(contextId) {
        return this._contextId === contextId || this._contextState && this._contextState[contextId];
    },
    
    listContexts: function() {
        var res = [];
        if (!this._contextState) return res;
        for (var i in this._contextState)
            if (this._contextState.hasOwnProperty(i) && this._contextState[i] !== null) {
                res.push(i);
            }
        if (!(this._contextId in this._contextState)) res.push(this._contextId);
        return res;
    },
    
    _getContextState: function() {
        var res = {};
        for (var i = 0, l = this.STATE_VARS.length; i < l; i++) {
            var v = this.STATE_VARS[i];
            if (!this._instanceStateShared || !this._instanceStateShared[v]) {
                res[v] = this[v];
            }
        }
        return res;
    },
    
    _constructContextState: function() {
        var res = {};
        for (var i = 0, l = this.STATE_VARS.length; i < l; i++) {
            var v = this.STATE_VARS[i];
            if (this._instanceStateShared && this._instanceStateShared[v]) continue;
            res[v] = this.STATE_PROTO[v];
        }
        res._subs = [];
        return res;
    },
    
    _setContextState: function(contextState, isNewState) {
        if (isNewState && !this._allSubs) this._allSubs = [].concat(this._subs);
        this.getExpression();
        for (var i in contextState) if (contextState.hasOwnProperty(i)) {
            this[i] = contextState[i];
        }
        if (isNewState) {
            this._initContextState(this._contextId, true);
        }
        if (this._defSub && this._expression) {
            this._subscribeDeferreds();
        }
    },
    
    _initContextState: function(contextId, own) {
        if (!own) {
            this.setContextId(contextId);
            return;
        }
        this._isEvaluating++;
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var op = '_' + this.OPERANDS[i], o = op + 'Operator', v = op + 'Value', x = op + 'Exists', ob = op + 'Observe';
            if (this[x] && !this[o]) {
                var val = this[v]; 
                this[v] = this.STATE_PROTO[v];
                this[x] = false;
                this._setOperandValue(this.OPERANDS[i], val);
            } else if (this[o]) {
                this[o]._initContextState(contextId);
            }
        }
        this._isEvaluating--;
    },
    
    // destroys current context. Will return to "context 0"
    destroyContext: function() {
        this._partialCleanup();
        var newStateId = 0;
        if (!(newStateId in this._contextState)) {
            newStateId = null;
            for (newStateId in this._contextState)
                if (this._contextState.hasOwnProperty(newStateId))
                    break;
        }
        if (newStateId !== null) 
            this._setContextState(this._contextState[newStateId]);
    },
    
    /**
     * Populates this._instanceStateShared variable according to current
     * operands. Makes operator operands'references (but not their values) shared
     * along with constant operands. Should be called AFTER we received all our
     * operands.
     */
    _populateInstanceStateShared: function() {
        if (!this._instanceStateShared) {
            this._instanceStateShared = {};
        }
        // suffixes: Operator, Value, Exists, Observe
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var operand = this.OPERANDS[i];
            var operatorVar = '_' + operand + 'Operator';
            var valueVar = '_' + operand + 'Value';
            var existsVar = '_' + operand + 'Exists';
            var observeVar = '_' + operand + 'Observe';
            this._instanceStateShared[operatorVar] = true;
            if (!this[operatorVar]) {
                this._instanceStateShared[valueVar] = true;
                this._instanceStateShared[existsVar] = true;
                this._instanceStateShared[observeVar] = true;
            }
        }
    },
    
    getNonCacheableChildren: function(recursive) {
        if (!this._hasNonCacheable) return [];
        var res = [];
        // TODO: all contexts? Is cacheability on per-context basis?
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var operator = this.getOperator(this.OPERANDS[i]);
            if (!operator) continue;
            if (operator._nonCacheable) res.push(operator);
            if (recursive && operator._hasNonCacheable) {
                res = res.concat(operator.getNonCacheableChildren(true));
            }
        }
        return res;
    }
    
};

Amm.Operator.beforeExtend = function(subClass, parentClass, dontIndicateParent) {
    
    if (!subClass.prototype.STATE_SHARED)
        subClass.prototype.STATE_SHARED = {};
    Amm.override(subClass.prototype.STATE_SHARED || {}, this.prototype.STATE_SHARED);
    if (!subClass.beforeExtend) subClass.beforeExtend = this.beforeExtend;
    if (!(subClass.prototype.STATE_VARS instanceof Array)) {
        subClass.prototype.STATE_VARS = [];
    }
    if (!subClass.prototype.STATE_PROTO) subClass.prototype.STATE_PROTO = {};
};

Amm.Operator.afterExtend = function(subClass, parentClass, dontIndicateParent) {
    
    Amm.Operator.populateStateVars(subClass);
    if (!subClass.afterExtend) subClass.afterExtend = this.afterExtend;
    
};

Amm.Operator.populateStateVars = function(constrFn) {
    var p = constrFn.prototype;
    for (var i in p) {
        if (
            p.hasOwnProperty(i) 
            && !p.STATE_SHARED[i]
            && typeof p[i] !== 'function'
            && p[i] !== '__CLASS__'
            && p[i] !== '__PARENT__'
            && p[i] !== '__INTERFACE__'
        ) {
            p.STATE_VARS.push(i);
            p.STATE_PROTO[i] = p[i];
        }
    }
    if (p.OPERANDS instanceof Array) {
        for (var i = 0, l = p.OPERANDS.length; i < l; i++) {
            var operand = p.OPERANDS[i];
            var valueVar = '_' + operand + 'Value';
            var existsVar = '_' + operand + 'Exists';
            var observeVar = '_' + operand + 'Observe';
            p.STATE_VARS.push(valueVar, existsVar, observeVar);
            p.STATE_PROTO[valueVar] = null;
            p.STATE_PROTO[existsVar] = null;
            p.STATE_PROTO[observeVar] = null;
        }
    }
    
};

Amm.Operator.populateStateVars(Amm.Operator);
