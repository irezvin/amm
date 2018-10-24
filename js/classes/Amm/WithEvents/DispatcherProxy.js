/* global Amm */

Amm.WithEvents.DispatcherProxy = function(options) {
    
    this._subscriptions = [];
    Amm.init(this, options);
    
};

Amm.WithEvents.DispatcherProxy.ANY = {};

Amm.WithEvents.DispatcherProxy.SKIP_CALL_HANDLER = {};

Amm.WithEvents.DispatcherProxy.SimpleCompareExtra = function(extra1, extra2) {
    if (extra1 === Amm.WithEvents.DispatcherProxy.ANY) return 0;
    if (extra2 === Amm.WithEvents.DispatcherProxy.ANY) return 0;
    return extra1 === extra2? 0 : -1;
};

Amm.WithEvents.DispatcherProxy.ArrCompareExtra = function(extra1, extra2) {
    if (extra1 === Amm.WithEvents.DispatcherProxy.ANY) return 0;
    if (extra2 === Amm.WithEvents.DispatcherProxy.ANY) return 0;
    if (!(extra1 instanceof Array) || !(extra2 instanceof Array)) return -1;
    if (extra1.length !== extra2.length) return -1;
    for (var i = 0, l = extra1.length; i < l; i++) {
        if (extra1[i] === Amm.WithEvents.DispatcherProxy.ANY) {
            continue;
        }
        if (extra2[i] === Amm.WithEvents.DispatcherProxy.ANY) {
            continue;
        }
        if (extra1[i] !== extra2[i]) return -1;
    }
    return 0;
};

/**
 * Combines subscriptions to the same event of same object.
 * 
 */
Amm.WithEvents.DispatcherProxy.prototype = {
    
    'Amm.WithEvents.DispatcherProxy': '__CLASS__',
    
    // proxy which methods are called to subscribe/unsubscribe/etc
    _eventsProxy: Amm.WithEvents.Proxy.instance,
    
    // all objects we're subscribed to
    _subscriptions: null,
    
    // scope of beforeDispatch, afterDispatch, beforeCallHandler, afterCallHandler
    scope: null,
    
    // overloadable function(eventName, queue, arguments)
    beforeDispatch: null,
    
    // overloadable function(eventName, queue, arguments)
    afterDispatch: null,
    
    // overloadable function(eventName, queue, arguments, queueIndex, extra)
    // To skip actual handler calling and afterCallHandler, return
    // Amm.WithEvents.DispatcherProxy.SKIP_CALL_HANDLER value
    beforeCallHandler: null,
    
    // overloadable function(eventName, queue, arguments, queueIndex, extra)
    afterCallHandler: null,

    // expects beforeCallHandler to return new 'extra' argument
    beforeCallHandlerReturnsNewExtra: false,
    
    compareExtra: Amm.WithEvents.DispatcherProxy.ArrCompareExtra,
    
    setEventsProxy: function(eventsProxy) {
        Amm.is(eventsProxy, Amm.WithEvents.Proxy, 'eventsProxy');
        this._eventsProxy = eventsProxy;
    },
    
    getEventsProxy: function() {
        return this._eventsProxy;
    },
    
    doCallHandler: function(queueItem, eventName, args, extra) {
        var 
            scope = queueItem[1],
            handler = queueItem[0],
            // extra is passed to us
            decorator = queueItem[3];
    
        var argsCpy = [].concat(args);
        
        if (decorator) {
            argsCpy = decorator.call(decorator, eventName, argsCpy, handler, scope, extra, this);
            if (!(argsCpy instanceof Array)) return;
        }

        if (!handler.apply) handler = scope[handler];

        if (extra !== undefined) argsCpy.push(extra); // extra is last one
        
        handler.apply(scope, argsCpy);
    },
    
    // receives all events from subscribed objects
    dispatchEvent: function() { 
        var queue = arguments[arguments.length - 1], args = Array.prototype.slice.call(arguments, 0, -1);
        if (!queue.eventName)
            Error("Queue array (extra) not provided to Amm.WithEvents.DispatcherProxy.dispatchEvent method");
        var ev = queue.eventName;
        
        if (this.beforeDispatch) {
            if (this.scope) this.beforeDispatch.call(this.scope, queue.eventName, queue, arguments);
            else this.beforeDispatch(queue.eventName, queue, arguments);
        }
        
        for (var i = 0; i < queue.length; i++) {
            var extra = queue[i][2];
            if (this.beforeCallHandler) {
                var ret;
                if (this.scope) ret = this.beforeCallHandler.call(this.scope, queue.eventName, queue, arguments, i, extra);
                else ret = this.beforeCallHandler(queue.eventName, queue, arguments, i, extra);
                if (ret === Amm.WithEvents.DispatcherProxy.SKIP_CALL_HANDLER) continue;
                if (this.beforeCallHandlerReturnsNewExtra) extra = ret;
            }
            
            if (!extra) extra = undefined; // mimick Amm.WithEvents behavior
            
            this.doCallHandler(queue[i], queue.eventName, args, extra);
            
            if (this.afterCallHandler) {
                if (this.scope) this.afterCallHandler.call(this.scope, queue.eventName, queue, arguments, i, extra);
                else this.afterCallHandler(queue.eventName, queue, arguments, i, extra);
            }
        }
        
        if (this.afterDispatch) {
            if (this.scope) this.afterDispatch.call(this.scope, queue.eventName, queue, arguments);
            else this.afterDispatch(queue.eventName, queue, arguments);
        }
        
    },
    
    subscribeObject: function(object, eventName, handler, scope, extra, decorator) {
        // find handlers
        var currHandlers = this._eventsProxy.getObjectSubscribers(object, eventName, this.dispatchEvent, this);
        
        // queue is stored as Extra arg. Since it is stored and passed by reference, we can edit it later
        var queue;
        if (currHandlers.length > 1)
            Error("Assertion: Amm.WithEvents.DispatcherProxy.dispatchEvent handler must be subscribed only once");
        
        if (extra === undefined) extra = null;
        if (decorator === undefined) decorator = null;
        if (scope === undefined) scope = null;
        
        if (!currHandlers.length) { 
            // this is the first time we subscribe to this object
            this._subscriptions.push(object);
            queue = [[handler, scope, extra, decorator]];
            queue.eventName = eventName;
            this._eventsProxy.subscribeObject(object, eventName, this.dispatchEvent, this, queue);
            return;
        }
        queue = currHandlers[0][2];
        if (!queue || queue.eventName !== eventName) {
            Error("Assertion: we found wrong queue array");
        }
        for (var i = 0, l = queue.length; i < l; i++) {
            if (
                queue[i][0] === handler
                && queue[i][1] === scope
                && !this.compareExtra(queue[i][2], extra)
                && queue[i][3] === decorator
            ) return; // already subscribed
        }
        queue.push([handler, scope, extra, decorator]);
    },
    
    // returns number of remaining subscribers
    unsubscribeObject: function(object, eventName, handler, scope, extra, decorator) {
        if (!object) Error("`object` parameter is required");
        var currHandlers = this._eventsProxy.getObjectSubscribers(object, eventName, this.dispatchEvent, this);
        var opCount = 0; //number of remaining events to dispatch to operator `operator`
        if (!currHandlers.length) return 0; // not subscribed
        if (eventName && currHandlers.length > 1)
            throw Error("Assertion: Amm.WithEvents.DispatcherProxy.dispatchEvent handler must be subscribed only once");
        for (var j = 0, lj = currHandlers.length; j < lj; j++) {
            var queue = currHandlers[j][2];
            if (!queue || !queue.eventName || (eventName && queue.eventName !== eventName))
                Error("Assertion: we found wrong queue array");
            for (var i = queue.length - 1; i >= 0; i--) {
                if (
                        (handler === undefined || queue[i][0] === handler)
                    &&  (scope === undefined || queue[i][1] === scope)
                    &&  (extra === undefined || !this.compareExtra(queue[i][2], extra))
                    &&  (decorator === undefined || queue[i][3] === decorator)
                ) {
                    queue.splice(i, 1);
                } else {
                    opCount++;
                }
            }
            if (!queue.length) {
                this._removeQueue(object, currHandlers[j][4], currHandlers[j][5]);
            }
        }
        
        return opCount;
    },
    
    getObjectSubscribers: function(object, eventName, handler, scope, extra, decorator) {
        
        if (!object) Error("`object` parameter is required");
        var currHandlers = this._eventsProxy.getObjectSubscribers(object, eventName, this.dispatchEvent, this);
        if (!currHandlers.length) return 0; // not subscribed
        if (eventName !== undefined && currHandlers.length > 1)
            Error("Assertion: Amm.WithEvents.DispatcherProxy.dispatchEvent handler must be subscribed only once");
        var res = [];
        for (var j = 0, hl = currHandlers.length; j < hl; j++) {
            var currEventName = currHandlers[j][4], queue = currHandlers[j][2];
            if (!queue || !queue.eventName || (queue.eventName !== currEventName))
                Error("Assertion: we found wrong queue array");
            for (var i = queue.length - 1; i >= 0; i--) {
                if (
                        (handler === undefined || queue[i][0] === handler)
                    &&  (scope === undefined || queue[i][1] === scope)
                    &&  (extra === undefined || !this.compareExtra(queue[i][2], extra))
                    &&  (decorator === undefined || queue[i][3] === decorator)
                ) {
                    res.push([].concat(queue[i], [eventName, i]));
                }
            }
        }
        return res;
    },
    
    getUniqueObjectSubscribers: function(object, classOrInterface, eventName) {
        var subs = this.getObjectSubscribers(object, undefined);
        var res = [];
        for (var i = 0, l = subs.length; i < l; i++) {
            var scope = subs[j][1];
            if (!scope) continue;
            if (classOrInterface === undefined || Amm.is(scope, classOrInterface))
                res.push(scope);
        }
        return Amm.Array.unique(res);
    },
    
    _removeQueue: function(object, eventName, index) {
        this._eventsProxy.unsubscribeObjectByIndex(object, eventName, index);
        // now we need to check if we are still subscribed to other
        // events and remove object from _allSubs
        var otherSubs = this._eventsProxy.getObjectSubscribers(object, undefined, this.dispatchEvent, this);
        if (!otherSubs.length) {
            var idx = Amm.Array.indexOf(this._subscriptions, object);
            if (idx >= 0) this._subscriptions.splice(idx, 1);
        }
    },
    
    unsubscribeObjectByIndex: function(object, eventName, index) {
        
        var currHandlers = this._eventsProxy.getObjectSubscribers(object, eventName, this.dispatchEvent, this);
        
        if (!currHandlers.length) return [];
          if (currHandlers.length > 1)
            Error("Assertion: Amm.WithEvents.DispatcherProxy.dispatchEvent handler must be subscribed only once");
               
        var queue = currHandlers[2];
        if (!queue.eventName || queue.eventName !== eventName)
            throw Error("Assertion: we found wrong queue array");
        
        if (!queue[index]) return [];
        res = [[].concat(queue[index], [eventName, index])];
        queue.splice(index);
        
        if (!queue.length) {
            this._removeQueue(object, eventName, currHandlers[0][5]);
        }
        
        return res;
    }
    
};

Amm.extend(Amm.WithEvents.DispatcherProxy, Amm.WithEvents.Proxy);