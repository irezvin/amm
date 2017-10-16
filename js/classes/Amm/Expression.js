/* global Amm */

/**
 * Provides variables for child Operator. 
 * Provides high-level methods to access value of operator and subscribe 
 * to its' events. Acts as event dispatcher between child operators 
 * and monitored objects to prevent excessive changes' triggering. 
 * Allows to parse operator from string definition.
 */
Amm.Expression = function(options, expressionThis, writeProperty, writeObject, writeArgs) {
    this._vars = {};
    if (expressionThis) this._expressionThis = expressionThis;
    if (options && typeof options === 'string') {
        options = {src: options};
    }
    if (options && options['Amm.Operator']) {
        options = {operator: options};
    }
    Amm.Operator.call(this);
    Amm.WithEvents.call(this);
    if (options.writeProperty) {
        writeProperty = options.writeProperty;
        delete options.writeProperty;
    }
    if (options.writeObject) {
        writeObject = options.writeObject;
        delete options.writeObject;
    }
    if (options.writeArgs) {
        writeArgs = options.writeArgs;
        delete options.writeArgs;
    }
    Amm.init(this, options);
    if (writeProperty) this.setWriteProperty(writeProperty, writeObject, writeArgs);
};

Amm.Expression.compareByLevel = function(a, b) {
    return b.getLevel() - a.getLevel();
};

Amm.Expression.prototype = {
    
    'Amm.Expression': '__CLASS__',
    
    _operatorOperator: null,
    
    _operatorValue: null,
    
    _operatorExists: null,
    
    _vars: null,
    
    _expressionThis: null,
    
    _writeProperty: null,
    
    _writeObject: null,
    
    _writeArgs: null,
    
    _lockWrite: 0,
    
    _src: null,
    
    _updateLevel: 0,
    
    /**
     *  contains operators that need to be recalculated when one event intoduces changes to many parts of Expression
     *  i.e. "$foo + $foo + $foo + $foo" or "$bar[$bar.baz]" - we need to re-calculate each changing Operator only once
     *  do avoid excessive re-calculations
     */
    _updateQueue: null,
    
    _updateQueueSorted: false,
    
    _currChangeInfo: null,
    
    OPERANDS: ['operator'],
    
    setExpressionThis: function(expressionThis) {
        var oldExpressionThis = this._expressionThis;
        if (oldExpressionThis === expressionThis) return;
        if (oldExpressionThis && oldExpressionThis['Amm.WithEvents'] && oldExpressionThis.hasEvent('cleanup')) {
            oldExpressionThis.unsubscribe('cleanup', this.cleanup, this);
        }
        this._expressionThis = expressionThis;
        if (expressionThis && expressionThis['Amm.WithEvents'] && expressionThis.hasEvent('cleanup')) {
            expressionThis.subscribe('cleanup', this.cleanup, this);
        }
 
        this.outExpressionThisChange(expressionThis, oldExpressionThis);
        return true;
    },

    getExpressionThis: function() { return this._expressionThis; },

    outExpressionThisChange: function(expressionThis, oldExpressionThis) {
        this._out('expressionThisChange', expressionThis, oldExpressionThis);
    },
    
    setWriteProperty: function(writeProperty, writeObject, writeArgs) {
        if (arguments.length === 1 && writeProperty instanceof Array) {
            writeProperty = arguments[0][0];
            writeObject = arguments[0][1];
            writeArgs = arguments[0][2];
        }
        if (this._writeProperty) throw "Can setWriteProperty() only once";
        if (!writeProperty) throw "writeProperty must be non-falseable";
        if (writeProperty['Amm.Expression']) {
            if (writeObject || writeArgs) throw "When Amm.Expression is used as writeProperty, don't specify writeObject/writeArgs";
            writeObject = writeProperty;
            writeProperty = 'value';
            writeObject.subscribe('writeDestinationChanged', this._write, this);
        }
        if (writeArgs === null || writeArgs === undefined) {
            writeArgs = null;
        } else if (!(writeArgs instanceof Array)) {
            writeArgs = [writeArgs];
        }
        if (!writeObject && !this._expressionThis) {
            throw "setExpressionThis() or provide writeObject when setting writeProperty";
        }
        this._writeProperty = writeProperty;
        this._writeObject = writeObject;
        if (writeObject && writeObject['Amm.WithEvents'] && writeObject.hasEvent('cleanup')) {
            writeObject.subscribe('cleanup', this.cleanup, this);
        }
        this._writeArgs = writeArgs;
        this._write();
    },
    
    _write: function() {
        if (this._lockWrite) return;
        this._lockWrite++;
        var wo = this._writeObject || this._expressionThis;
        Amm.setProperty(wo, this._writeProperty, this.getValue(), false, this._writeArgs);
        this._lockWrite--;
    },
    
    getWriteProperty: function(all) {
        return all? [this._writeProperty, this._writeObject, this._writeArgs] : this._writeProperty;
    },
    
    getWriteObject: function() {
        return this._writeObject;
    },
    
    getWriteArgs: function() {
        return this._writeArgs;
    },
    
    setVars: function(value, name) {
        if (name) { // a - set item in vars
            if (typeof name !== 'string')
                throw "setVars(`value`, `name`): `name` must be a string";
            var old = this._vars[name];
            if (value === old) return; // nothing to do
            this._vars[name] = value;
            this.outVarsChange(value, old, name);
        } else { // b - set whole vars
            if (typeof value !== 'object') throw "setVars(`value`): object required";
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
        this._setOperand('operator', operator);
        if (this._operatorOperator) {
            this.supportsAssign = this._operatorOperator.supportsAssign;
            this._operatorOperator.setExpression(this);
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
        var a = this._operandFunction('operator'), t = this;
        if (this._operatorOperator && this._operatorOperator.supportsAssign) {
            var assign = this._operatorOperator.assignmentFunction();
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
        if (this._operatorOperator) return this._operatorOperator.assignmentFunction();
        return function(e, value) {
            return "`operator` not provided";
        };
    },
    
    _reportChange: function(oldValue) {
        this._currChangeInfo = null;
        Amm.Operator.prototype._reportChange.call(this, oldValue);
        this.outValueChange(this._value, oldValue);
        if (this._writeProperty) this._write();
    },
    
    notifyOperandContentChanged: function(operand, changeInfo, internal) {
        
        this._currChangeInfo = changeInfo;
        
        var evaluated = Amm.Operator.prototype.notifyOperandContentChanged.call(this, operand, changeInfo, internal);
        
        if (this._currChangeInfo) {
            // report change wasn't called...
            this.outValueChange(this._value, this._value, changeInfo);
            this._currChangeInfo = null;
        }
        
        
        return evaluated;
    },
    
    _reportNonCacheabilityChanged: function(nonCacheability) {
        Amm.Operator.prototype._reportNonCacheabilityChanged.call(this, nonCacheability);
        if (nonCacheability) Amm.getRoot().subscribe('interval', this.checkForChanges, this);
            else Amm.getRoot().unsubscribe('interval', this.checkForChanges, this);
    },
    
    notifyWriteDestinationChanged: function() {
        return this.outWriteDestinationChanged();
    },
    
    outWriteDestinationChanged: function() {
        this._out('writeDestinationChanged');
    },
    
    outValueChange: function(value, oldValue, changeInfo) {
        this._out('valueChange', value, oldValue, changeInfo);
    },
    
    cleanup: function() {
        Amm.WithEvents.prototype.cleanup.call(this);
        Amm.Operator.prototype.cleanup.call(this);
        if (this._writeObject && this._writeObject['Amm.Expression']) {
            this._writeObject.cleanup();
        }
        if (this._hasNonCacheable) {
            Amm.getRoot().unsubscribe('interval', this.checkForChanges, this);
        }
    },
    
    getIsCacheable: function() {
        return !this._hasNonCacheable;
    },
    
    setSrc: function(src) {
        this.parse(src);
    },
    
    getSrc: function(beginPos, endPos) {
        if (arguments.length && this._src)
            return this._src.slice(beginPos, endPos);
        return this._src;
    },
    
    parse: function(string) {
        if (this._src) throw "Already parsed";
        this._src = string;
        if (!Amm.Expression._builder) {
            Amm.Expression._parser = new Amm.Expression.Parser();
            Amm.Expression._builder = new Amm.Operator.Builder();
            Amm.Expression._builder.configureParser(Amm.Expression._parser);
        }
        this.setOperator(Amm.Expression._builder.unConst(Amm.Expression._parser.parse(string)));
    },
    
    subscribeOperator: function(target, eventName, operator, method, extra) {
        if (extra === undefined) extra = null;
        var op = target.getSubscribers(eventName, 'dispatchEvent', this);
        // queue is stored as Extra arg. Since it is stored and passed by reference, we can edit it later
        var queue;
        if (!op.length) { 
            queue = [[method, operator]];
            queue.eventName = eventName;
            target.subscribe(eventName, 'dispatchEvent', this, queue);
            return;
        }
        if (op.length > 1) throw "Assertion: Amm.Expression.dispatchEvent handler must be subscribed only once";
        queue = op[0][2];
        if (!queue || queue.eventName !== eventName) {
            throw "Assertion: we found wrong queue array";
        }
        for (var i = 0, l = queue.length; i < l; i++) {
            if (queue[i][0] === operator && queue[i][1] === method && queue[i][2] === extra) return; // already subscribed
        }
        queue.push([method, operator]);
    },
    
    
    // `operator` is required arg
    unsubscribeOperator: function(target, eventName, operator, method, extra) {
        if (extra === undefined && arguments.length < 5) extra = null;
        var op = target.getSubscribers(eventName, 'dispatchEvent', this);
        var opCount = 0; //number of remaining events to dispatch to operator `operator`
        if (!op.length) return 0; // not subscribed
        for (var j = 0; j < op.length; j++) {
            var queue = op[j][2];
            if (!queue || !queue.eventName || (eventName && queue.eventName !== eventName)) throw "Assertion: we found wrong queue array";
            for (var i = queue.length - 1; i >= 0; i--) {
                if (queue[i][0] !== operator) continue; 
                if ((method === undefined || queue[i][1] === method) && (extra === undefined || queue[i][2] === extra)) {
                    queue.splice(i, 1);
                    if (!queue.length) target.unsubscribeByIndex(op[j][5]);
                } else {
                    opCount++;
                }
            }
        }
        return opCount;
    },
    
    dispatchEvent: function() {
        var queue = arguments[arguments.length - 1], args = Array.prototype.slice.call(arguments, 0, -1);
        if (!queue.eventName)
            throw "Queue array (extra) not provided to Amm.Expression._dispatchIncomingEvent method";
        
        if (queue.length > 1) {
            this._beginUpdate();
        }
        
        Amm.WithEvents.invokeHandlers(queue.eventName, args, queue);
        
        if (queue.length > 1) {
            this._endUpdate();
        }
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    _beginUpdate: function() {
        if (!this._updateLevel) this._updateQueue = [];
        this._updateLevel++;
    },
    
    // sorts operators in update queue by level, descending
    _sortUpdateQueue: function(start) {
        this._updateQueueSorted = true;
        if (!start) {
            this._updateQueue.sort(Amm.Expression.compareByLevel);
            return;
        }
        if (start >= this._updateQueue.length - 1) return; // nothing to do
        var items = this._updateQueue.splice(start, this._updateQueue.length - start);
        items.sort(Amm.Expression.compareByLevel);
        this._updateQueue.push.apply(this._updateQueue, items);
    },
    
    _endUpdate: function() {
        if (!this._updateLevel) {
            throw "Amm.Expression: _endUpdate() without _beginUpdate!";
        }
        var newUpdateLevel = this._updateLevel - 1;
        if (!newUpdateLevel) {
            // process update queue
            for (var i = 0; i < this._updateQueue.length; i++) {
                this._updateQueue[i].finishUpdate();
                if (!this._updateQueueSorted) {
                    this._sortUpdateQueue(i + 1);
                }
            }
        }
        this._updateLevel = newUpdateLevel;
    },
    
    queueUpdate: function(operator) {
        this._updateQueue.push(operator);
        this._updateQueueSorted = false;
    }
    
};

Amm.Expression._bulder = null;
Amm.Expression._parser = null;

Amm.extend(Amm.Expression, Amm.Operator);
Amm.extend(Amm.Expression, Amm.WithEvents);
