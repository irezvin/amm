/* global Amm */
Amm.Operator = function()  {
    this._subs = [];
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
    
    setExpression: function(expression) {
        Amm.is(expression, 'Amm.Expression', 'Expression');
        if (this._expression === expression) return;
        else if (this._expression) throw "Can setExpression() only once";
        this._expression = expression;
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {        
            var o = this['_' + this.OPERANDS[i] + 'Operator'];
            if (o) o.setExpression(expression);
        }
        if (this._defSub) {
            for (var j = 0; j < this._defSub.length; j++) {
                this._expression.subscribeOperator(this._defSub[j][0], this._defSub[j][1], this, this._defSub[j][2]);
            }
            this._defSub = null;
        }
        return true;
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
     */
    _sub: function(object, map, method, extra, noCheck) {
        var exp = this._expression;
        if (!exp && !this._defSub) this._defSub = [];
        var idx = Amm.Array.indexOf(this._subs, object);
        if (idx < 0) this._subs.push(object);
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
            for (var i in map) if (map.hasOwnProperty(i)) {
                if (exp) {
                    exp.subscribeOperator(object, i, this, map[i], extra);
                } else {
                    this._defSub.push([object, i, map[i], extra]);
                }
            }
        }
    },
    
    _unsub: function(object, event, method, extra) {
        if (extra === undefined && arguments.length < 4) extra = null;
        if (this._defSub) {
            for (var i = this._defSub.length - 1; i >= 0; i--) {
                if (this._defSub[i][0] === object 
                && event === undefined || event === this._defSub[i][1]
                && method === undefined || method === this._defSub[i][2]
                && extra === undefined || extra ===  this._defSub[i][3])
                    this._defSub.splice(i, 1);
            }
        } else {
            var exp = this._expression;
            if (!exp) return;
            var opCount = exp.unsubscribeOperator(object, event, this, method, extra);
            if (!opCount) { // remove object from our list
                var idx = Amm.Array.indexOf(this._subs, object);
                if (idx >= 0) this._subs.splice(idx, 1);
            }
        }
    },
    
    notifyOperandChanged: function(operand, value, oldValue, operator) {
        if (this._lockChange) return;
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
        
        var exp = this._expression;
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
            if (!stillHaveChecked) this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_CONTENT);
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
        
        if (diff[0] !== 'splice') throw "Assertion - should receive only 'splice' event (spliceOnly === true)";
        
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
        if (this._hasNonCacheable - !!this._nonCacheable) {
            for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
                var op = '_' + this.OPERANDS[i] + 'Operator';
                if (this[op] && this[op]._hasNonCacheable) this[op].checkForChanges();
            }
        }
        
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
        if (changed) this._reportChange();
        if (this._destChanged) {
            this._destChanged = false;
            this._parent.notifyWriteDestinationChanged(this);
        }
        this._isEvaluating--;
        return this._value;
    },
    
    _defaultHandler: function() {
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
                var exp = this._expression;
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
    
    getOperator: function(operand) {
        if (!operand) operand = this.OPERANDS[0];
        else if (typeof operand === 'number') operand = this.OPERANDS[operand];
        var op = '_' + operand + 'Operator';
        if (!(op in this)) throw "No such operand: '" + operand + "' in '" + Amm.getClass(this);
        var res;
        res = this[op];
        if (res && arguments.length > 1) {
            return res.getOperator.apply(res, Array.prototype.slice.call(arguments, 1));
        }
        return res;
    },
    
    cleanup: function() {
        this._parent = null;
        var exp = this._exression;
        this._expression = null;
        if (exp) {
            for (var i = this._subs.length - 1; i >= 0; i--) {
                exp.unsubscribeOperator(this._subs[i], undefined, this, undefined, undefined);
            }
        }
        this._subs = [];
        this._defSub = null;
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
        if (!this._expression) return;
        if (this.beginPos === null) return;
        return this._expression.getSrc(this.beginPos, this.endPos);
    }
    
};
