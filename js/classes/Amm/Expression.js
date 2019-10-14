/* global Amm */

/**
 * Provides high-level methods to access value of operator and subscribe 
 * to its' events. Acts as event dispatcher between child operators 
 * and monitored objects to prevent excessive changes' triggering. 
 * Allows to parse operator from string definition.
 */
Amm.Expression = function(options, expressionThis, writeProperty, writeObject, writeArgs) {
    Amm.WithEvents.DispatcherProxy.call(this);
    if (options && typeof options === 'string') {
        options = {src: options};
    }
    var operator;
    if (options && options['Amm.Operator']) {
        operator = options;
        options = {};
    }
    Amm.Operator.VarsProvider.call(this, operator);
    Amm.WithEvents.call(this, options, true);
    if (expressionThis) options.expressionThis = expressionThis;
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

Amm.Expression.compareByContextIdAndLevel = function(a, b) {
    if (b[1] !== a[1]) return a[1] - b[1];
    return b[0].getLevel() - a[0].getLevel();
};

/**
 * Never propagate expressionThis to Expression writeObject
 */
Amm.Expression.THIS_WRITE_NEVER = 0;

/**
 * Always propagate expressionThis to Expression writeObject
 */
Amm.Expression.THIS_WRITE_ALWAYS = 1;

/**
 * Once expressionThis was propagated, don't update it anymore
 */
Amm.Expression.THIS_WRITE_ONCE = 2;

/**
 * If expressionThis was already set, don't propagate. otherwise set to THIS_WRITE_ALWAYS
 */
Amm.Expression.THIS_WRITE_AUTO = 3;

Amm.Expression.prototype = {
    
    'Amm.Expression': '__CLASS__',
    
    _expressionThis: null,
    
    _writeProperty: null,
    
    _writeObject: null,
    
    _writeArgs: null,

    _lockWrite: 0,
    
    _writeDestinationChanged: false,
    
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

    _writeToExpressionThis: Amm.Expression.THIS_WRITE_AUTO,

    /** 
     * If writeProperty is Amm.Expression, whether to sync this.`expressionThis` to this.`writeObject`.`expressionThis`
     * One of Amm.Expression.THIS_WRITE_ALWAYS | THIS_WRITE_ONCE | THIS_WRITE_NEVER constants
     * THIS_WRITE_ALWAYS: always update; 
     * THIS_WRITE_ONCE: once updated, will set to THIS_WRITE_NEVER.
     * THIS_WRITE_AUTO: set to NEVER is writeObject already has expressionThis set, otherwise behave as WRITE_ALWAYS
     */
    
    setWriteToExpressionThis: function(writeToExpressionThis) {
        var oldWriteToExpressionThis = this._writeToExpressionThis;
        if (oldWriteToExpressionThis === writeToExpressionThis) return;
        this._writeToExpressionThis = writeToExpressionThis;
        this._propagateExpressionThis();
        return true;
    },

    getWriteToExpressionThis: function() { return this._writeToExpressionThis; },
    
    _propagateExpressionThis: function() {
        if (!(
                this._writeToExpressionThis && this._expressionThis 
                && this._writeObject && this._writeObject['Amm.Expression']
        )) {
            return;
        }
        if (this._writeToExpressionThis === Amm.Expression.THIS_WRITE_AUTO) {
            if (this._writeObject.getExpressionThis()) {
                this._writeToExpressionThis = Amm.Expression.THIS_WRITE_NEVER;
                return;
            } else {
                this._writeToExpressionThis = Amm.Expression.THIS_WRITE_ALWAYS;
            }
        }
        this._writeObject.setExpressionThis(this._expressionThis);
        if (this._writeToExpressionThis === Amm.Expression.THIS_WRITE_ONCE) {
            this._writeToExpressionThis = Amm.Expression.THIS_WRITE_NEVER;
        }
    },

    STATE_SHARED: {
        _updateLevel: true,
        _updateQueue: true,
        _deferredValueChange: true,
        _src: true,
        _subscriptions: true,
        _eventsProxy: true,
        scope: true
    },
    
    setExpressionThis: function(expressionThis) {
        var oldExpressionThis = this._expressionThis;
        if (oldExpressionThis === expressionThis) return;
        if (oldExpressionThis && oldExpressionThis['Amm.WithEvents'] && oldExpressionThis.hasEvent('cleanup')) {
            this._unsub(oldExpressionThis, 'cleanup', this._deleteCurrentContext);
        }
        this._expressionThis = expressionThis;
        if (expressionThis && expressionThis['Amm.WithEvents'] && expressionThis.hasEvent('cleanup')) {
            this._sub(expressionThis, 'cleanup', this._deleteCurrentContext, undefined, true);
        }
        this._propagateExpressionThis();
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
        if (this._writeProperty) Error("Can setWriteProperty() only once");
        if (!writeProperty) Error("writeProperty must be non-falseable");
        if (typeof writeProperty === 'string') { // this is not a simple property name, so we assume it is expression definition
            if (!writeProperty.match(/^\w+$/)) writeProperty = new Amm.Expression (writeProperty, this._expressionThis);
        }
        if (writeProperty['Amm.Expression']) {
            if (writeObject || writeArgs) Error("When Amm.Expression is used as writeProperty, don't specify writeObject/writeArgs");
            writeObject = writeProperty;
            writeProperty = 'value';
            this._sub(writeObject, 'writeDestinationChanged', this._write, undefined, true);
        }
        if (writeArgs === null || writeArgs === undefined) {
            writeArgs = null;
        } else if (!(writeArgs instanceof Array)) {
            writeArgs = [writeArgs];
        }
        if (!writeObject && !this._expressionThis) {
            Error("setExpressionThis() or provide writeObject when setting writeProperty");
        }
        this._writeProperty = writeProperty;
        this._writeObject = writeObject;
        if (writeObject && writeObject['Amm.WithEvents'] && writeObject.hasEvent('cleanup')) {
            this._sub(writeObject, 'cleanup', this._deleteCurrentContext, undefined, true);
        }
        this._writeArgs = writeArgs;
        this._propagateExpressionThis();
        this._write();
    },
    
    _write: function() {
        var wo = this._writeObject || this._expressionThis;
        if (!wo) return;
        if (this._lockWrite) return;
        this._lockWrite++;
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
    
    /**
     * This event has a difference from standard "out<Foo>Change" 
     * because it can be triggered 
     * 
     * -    for one or many variables:
     *      a)  for all variables (`name` is null)
     *      b)  for single variable (`name` param will be provided)
     * 
     * -    for Expression or other variables provider
     * 
     *      x)  either for Expression object
     *          (`sourceObject` === this === Amm.event.Origin)
     *      y)  or for different `sourceObject`
     *          (`sourceObject` !== this)
     */
    outVarsChange: function(value, oldValue, name, sourceObject, contextId) {
        this._out('varsChange', value, oldValue, name, sourceObject, contextId);
    },
    
    setOperator: function(operator) {
        Amm.Operator.VarsProvider.prototype.setOperator.call(this, operator);
        if (this._operatorOperator) {
            this._operatorOperator.setExpression(this);
        }
    },
    
    _deferredValueChange: null,
    
    _reportChange: function(oldValue) {
        var k = 'ctx_' + this._contextId;
        this._currChangeInfo = null;
        if (this._updateLevel && this._deferredValueChange) {
            if (!this._deferredValueChange[k]) {
                this._deferredValueChange[k] = {'contextId': this._contextId, 'old': oldValue};
                if (!this._deferredValueChange.ids) {
                    this._deferredValueChange.ids = [k];
                } else {
                    this._deferredValueChange['ids'].push(k);
                }
            }
            return;
        }
        this.outValueChange(this._value, oldValue);
        if (this._writeProperty) this._write();
    },
    
    notifyOperandContentChanged: function(operand, changeInfo, internal) {
        
        var operator = this['_' + operand + 'Operator'];
        if (operator && operator._contextId !== this._contextId) {
            this._propagateContext(operand, operator);
        }
        
        this._currChangeInfo = changeInfo;
        
        var evaluated = Amm.Operator.VarsProvider.prototype.notifyOperandContentChanged.call(this, operand, changeInfo, internal);
        
        if (this._currChangeInfo) {
            // report change wasn't called...
            this.outValueChange(this._value, this._value, changeInfo);
            this._currChangeInfo = null;
        }
        
        
        return evaluated;
    },
    
    _reportNonCacheabilityChanged: function(nonCacheability) {
        Amm.Operator.VarsProvider.prototype._reportNonCacheabilityChanged.call(this, nonCacheability);
        if (nonCacheability) {
            this._sub(Amm.getRoot(), 'interval', this.checkForChanges, undefined, true);
        } else { 
            this._unsub(Amm.getRoot(), 'interval', this.checkForChanges);
        }
    },
    
    notifyWriteDestinationChanged: function() {
        if (this._updateLevel) {
            this._writeDestinationChanged = true;
            return true;
        } else {
            this._writeDestinationChanged = false;
        }
        if (this._operatorOperator._contextId !== this._contextId) {
            this._propagateContext('operator', this._operatorOperator);
        }
        return this.outWriteDestinationChanged();
    },
    
    outWriteDestinationChanged: function() {
        this._out('writeDestinationChanged');
    },
    
    outValueChange: function(value, oldValue, changeInfo) {
        this._out('valueChange', value, oldValue, changeInfo);
    },
    
    deleteContext: function(id) {
        Amm.Operator.VarsProvider.prototype.deleteContext.call(this, id);
        if (!this._numCtx) this.cleanup();
    },
    
    _deleteCurrentContext: function() {
        this.deleteContext();
    },
    
    cleanup: function() {
        // unsubscribe all our subscribers
        for (var i = this._subscriptions.length - 1; i >= 0; i--) {
            this._eventsProxy.unsubscribeObject(this._subscriptions[i], undefined, this.dispatchEvent, this);
        }
        Amm.WithEvents.prototype.cleanup.call(this);
        this._subscriptions = [];
        this._numCtx = 0;
        if (this._writeObject && this._writeObject['Amm.Expression']) {
            this._writeObject.cleanup();
        }
        Amm.Operator.VarsProvider.prototype.cleanup.call(this);
    },
    
    getIsCacheable: function() {
        return !this._hasNonCacheable;
    },
    
    setSrc: function(src) {
        this.parse(src);
    },
    
    /**
     * Alias of setWriteProperty() for more intuitive usage
     * @param {string|Amm.Expression} writeProperty
     */
    setDest: function(writeProperty) {
        return this.setWriteProperty(writeProperty, null);
    },
    
    /**
     * Tries to work as symmetric 'getter' for this.getDest(). 
     * Returns either this.getWriteProperty() 
     * or this.getWriteObject() if Amm.Expression is used as write target.
     * @returns {string|Amm.Expression}
     */
    getDest: function() {
        if (this._writeObject && this._writeObject['Amm.Expression']) 
            return this._writeObject;
        if (this._writeProperty) return this._writeProperty;
    },
    
    getSrc: function(beginPos, endPos) {
        if (arguments.length && this._src)
            return this._src.slice(beginPos, endPos);
        return this._src;
    },
    
    parse: function(string) {
        if (this._src) Error("Already parsed");
        this._src = string;
        if (!Amm.Expression._builder) {
            Amm.Expression._parser = new Amm.Expression.Parser();
            Amm.Expression._builder = new Amm.Expression.Builder();
            Amm.Expression._builder.configureParser(Amm.Expression._parser);
        }
        this.setOperator(Amm.Expression._builder.unConst(Amm.Expression._parser.parse(string)));
    },
    
    subscribeOperator: function(target, eventName, operator, method, extra) {
        var contextId = operator._contextId;
        if (extra === undefined) extra = null;
        this.subscribeObject(target, eventName, method, operator, [contextId, extra]);
    },
    
    unsubscribeOperator: function(target, eventName, operator, method, extra, allContexts) {
        var contextId = allContexts? Amm.WithEvents.DispatcherProxy.ANY : operator._contextId;
        if (extra === undefined) {
             if (arguments.length < 5) extra = null;
             else extra = Amm.WithEvents.DispatcherProxy.ANY;
        }
        return this.unsubscribeObject(target, eventName, method, operator, [contextId, extra]);
    },
    
    beforeDispatch: function(eventName, queue, arguments) {
        if (queue.length > 1) {
            this._beginUpdate();
        }
    },
    
    afterDispatch: function(eventName, queue, arguments) {
        if (queue.length > 1) {
            this._endUpdate();
        }
    },
    
    beforeCallHandler: function(eventName, queue, arguments, queueIndex, extra) {
        var contextId = extra[0], newExtra = extra[1];
        var operator = queue[queueIndex][1]; // 'scope'
        if (operator._contextId !== contextId) {
            operator.setContextIdToDispatchEvent(contextId, eventName, arguments);
        }
        return newExtra;
    },
    
    beforeCallHandlerReturnsNewExtra: true,
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    // TODO: think about completely ditching _lockWrite in favor of _updateLevel
    _beginUpdate: function() {
        if (!this._updateLevel) this._updateQueue = [];
        this._updateLevel++;
        this._lockWrite++;
    },
    
    // sorts operators in update queue by level, descending
    _sortUpdateQueue: function(start) {
        this._updateQueueSorted = true;
        if (!start) {
            this._updateQueue.sort(Amm.Expression.compareByContextIdAndLevel);
            return;
        }
        if (start >= this._updateQueue.length - 1) return; // nothing to do
        var items = this._updateQueue.splice(start, this._updateQueue.length - start);
        items.sort(Amm.Expression.compareByContextIdAndLevel);
        this._updateQueue.push.apply(this._updateQueue, items);
    },
    
    _endUpdate: function() {
        if (!this._updateLevel) {
            Error("Amm.Expression: _endUpdate() without _beginUpdate!");
        }
        if (this._updateLevel > 1) {
            this._updateLevel--;
            this._lockWrite--;
            return;
        }
        this._deferredValueChange = {};
        // process update queue
        for (var i = 0; i < this._updateQueue.length; i++) {
            if (!this._updateQueueSorted) {
                this._sortUpdateQueue(i);
            }
            var contextId = this._updateQueue[i][1];
            var op = this._updateQueue[i][0];
            if (op._contextId !== contextId) op.setContextId(contextId);
            op.finishUpdate();
        }
        this._updateLevel = 0;
        this._lockWrite--;
        var dv = this._deferredValueChange;
        this._deferredValueChange = null;
        if (dv.ids) {
            for (var i = 0, l = dv.ids.length; i < l; i++) {
                var d = dv[dv.ids[i]];
                if (this._contextId !== d.contextId) {
                    this.setContextId(d.contextId);
                }
                this._reportChange(d.old);
            }
        }
        if (this._writeDestinationChanged) {
            this.notifyWriteDestinationChanged();
        }
    },
    
    queueUpdate: function(operator) {
        this._updateQueue.push([operator, operator._contextId]);
        this._updateQueueSorted = false;
    },
    
    _constructContextState: function() {
        var res = Amm.Operator.VarsProvider.prototype._constructContextState.call(this);
        res._subscribers = {};
        return res;
    },
    
    toFunction: function() {
        var a = this._operandFunction('operator'), env = {
            vars: this._vars,
            expressionThis: this._expressionThis
        };
        var fn;
        if (this._operatorOperator && this._operatorOperator.supportsAssign) {
            var assign = this._operatorOperator.assignmentFunction();
            fn = function(value, throwIfCant) {
                if (arguments.length) {
                    var res = assign(env, value);
                    if (res && throwIfCant) throw res;
                    return !res;
                }
                else return a(env);
            };
        } else {
            fn = function() {
                return a(env);
            };
        }
        fn.env = env;
        return fn;
    },
    
    findContext: function(expressionThis) {
        if (this._expressionThis === expressionThis) return this._contextId;
        for (var i in this._contextState) if (this._contextState.hasOwnProperty(i)) {
            if (this._contextState[i] && this._contextState[i]._expressionThis === expressionThis) {
                return i;
            }
        }
        return undefined;
    }
    
};

Amm.Expression._builder = null;
Amm.Expression._parser = null;

Amm.extend(Amm.Expression, Amm.WithEvents.DispatcherProxy);
Amm.extend(Amm.Expression, Amm.WithEvents);
Amm.extend(Amm.Expression, Amm.Operator.VarsProvider);
