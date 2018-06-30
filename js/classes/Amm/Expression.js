/* global Amm */

/**
 * Provides high-level methods to access value of operator and subscribe 
 * to its' events. Acts as event dispatcher between child operators 
 * and monitored objects to prevent excessive changes' triggering. 
 * Allows to parse operator from string definition.
 */
Amm.Expression = function(options, expressionThis, writeProperty, writeObject, writeArgs) {
    this._allSubs = [];
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

Amm.Expression.prototype = {
    
    'Amm.Expression': '__CLASS__',
    
    _expressionThis: null,
    
    _writeProperty: null,
    
    _writeObject: null,
    
    _writeArgs: null,
    
    _lockWrite: 0,
    
    _src: null,
    
    _updateLevel: 0,
    
    // registry of all objects that we are subscribed to (in all contexts)
    _allSubs: null,
    
    /**
     *  contains operators that need to be recalculated when one event intoduces changes to many parts of Expression
     *  i.e. "$foo + $foo + $foo + $foo" or "$bar[$bar.baz]" - we need to re-calculate each changing Operator only once
     *  do avoid excessive re-calculations
     */
    _updateQueue: null,
    
    _updateQueueSorted: false,
    
    _currChangeInfo: null,
    
    STATE_SHARED: {
        _updateLevel: true,
        _updateQueue: true,
        _deferredValueChange: true,
        _src: true,
        _allSubs: true
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
            this._sub(writeObject, 'writeDestinationChanged', this._write, undefined, true);
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
            this._sub(writeObject, 'cleanup', this._deleteCurrentContext, undefined, true);
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
        Amm.WithEvents.prototype.cleanup.call(this);
        // unsubscribe all our subscribers
        for (var i = 0; i < this._allSubs.length; i++) {
            this._allSubs[i].unsubscribe(undefined, this.dispatchEvent, this);
        }
        this._allSubs = [];
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
        var contextId = operator._contextId;
        var op = target.getSubscribers(eventName, this.dispatchEvent, this);
        // queue is stored as Extra arg. Since it is stored and passed by reference, we can edit it later
        var queue;
        if (!op.length) { 
            // this is the first time we subscribe to this object
            this._allSubs.push(target);
            queue = [[operator, method, contextId, extra]];
            queue.eventName = eventName;
            target.subscribe(eventName, this.dispatchEvent, this, queue);
            return;
        }
        if (op.length > 1) throw "Assertion: Amm.Expression.dispatchEvent handler must be subscribed only once";
        queue = op[0][2];
        if (!queue || queue.eventName !== eventName) {
            throw "Assertion: we found wrong queue array";
        }
        for (var i = 0, l = queue.length; i < l; i++) {
            if (
                    queue[i][0] === operator
                    && queue[i][1] === method 
                    && queue[i][2] === contextId 
                    && queue[i][3] === extra
            ) return; // already subscribed
        }
        queue.push([operator, method, contextId, extra]);
    },
    
    // `operator` is required arg
    unsubscribeOperator: function(object, eventName, operator, method, extra, allContexts) {
        if (!object) throw "`object` parameter is required";
        if (extra === undefined && arguments.length < 5) extra = null;
        var contextId = operator._contextId;
        var op = object.getSubscribers(eventName, this.dispatchEvent, this);
        var opCount = 0; //number of remaining events to dispatch to operator `operator`
        if (!op.length) return 0; // not subscribed
        for (var j = 0; j < op.length; j++) {
            var queue = op[j][2];
            if (!queue || !queue.eventName || (eventName && queue.eventName !== eventName))
                throw "Assertion: we found wrong queue array";
            for (var i = queue.length - 1; i >= 0; i--) {
                if (queue[i][0] !== operator) continue; 
                if (
                        (method === undefined || queue[i][1] === method) 
                        && (allContexts || queue[i][2] === contextId)
                        && (extra === undefined || queue[i][3] === extra)
                ) {
                    queue.splice(i, 1);
                    if (!queue.length) {
                        object.unsubscribeByIndex(op[j][4], op[j][5]);
                        // now we need to check if we are still subscribed to other
                        // events and remove object from _allSubs
                        var otherSubs = object.getSubscribers(undefined, this.dispatchEvent, this);
                        if (!otherSubs.length) {
                            var idx = Amm.Array.indexOf(this._allSubs, object);
                            if (idx >= 0) this._allSubs.splice(idx, 1);
                        }
                    }
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
        
        
        var ev = queue.eventName;
        
        if (queue.length > 1) {
            this._beginUpdate();
        }
        
        var extraIdx = args.length;
        args.push(null);
        for (var i = 0; i < queue.length; i++) {
            var 
                operator = queue[i][0],
                method = queue[i][1],
                contextId = queue[i][2];
        
            if (!method.apply) method = operator[method];
            
            args[extraIdx] = queue[i][3]; // extra is last one
            if (operator._contextId !== contextId) operator.setContextIdToDispatchEvent(contextId, ev, args);
            method.apply(operator, args);
        }
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
            throw "Amm.Expression: _endUpdate() without _beginUpdate!";
        }
        if (this._updateLevel > 1) {
            this._updateLevel--;
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
    }
    
};

Amm.Expression._builder = null;
Amm.Expression._parser = null;

Amm.extend(Amm.Expression, Amm.WithEvents);
Amm.extend(Amm.Expression, Amm.Operator.VarsProvider);
