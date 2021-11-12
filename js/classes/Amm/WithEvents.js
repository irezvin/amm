/* global Amm */

Amm.WithEvents = function(options, initOnHandlersOnly) {
    this._subscribers = {};
    if (!options) return;
    var onHandlers = this._extractOnHandlers(options);
    if (!initOnHandlersOnly) {
        Amm.init(this, options);
    }
    if (onHandlers) this._initOnHandlers(onHandlers);
};

Amm.WithEvents.debugDuplicateSubscribers = false;

Amm.WithEvents._oCache = {};

/* 
 * invokes event handler - this. must be set to the object that originated the event
 * {eventName} name of an event - will be usually accessible 
 *      with global Amm.event.name (unless {dontPush} is set to TRUE)
 * {args} are passed as arguments to the event handling function.
 * {handler} is, generally, function that will be called
 *      exceptions:
 *          -   string - scope[{handler}] will be used as function
 *          -   any object with .apply() method
 * {scope} is this. of event handler
 *          -   if scope is string, either this.getByPath(scope), - if such
 *              method exists, or with Amm.getByPath(scope) 
 *              will be used to resolve the actual scope object. 
 *          -   if the scope is not found after getByPath(), handler will be
 *              silently skipped.
 * {extra} is additional last argument that is added to the args (unless undefined)
 *          
 *  Before the call, Amm.pushEvent() is called and, during the handler invocation,
 *  Amm.event to be set to following hash:
 *      {origin: this. object, name: eventName, args: args(array)}.
 *  
 *  {dontPush} - don't populate Amm.event object
 */
Amm.WithEvents.invokeHandler = function(eventName, args, handler, scope, extra, dontPush) {
    return Amm.WithEvents.invokeHandlers.call(this, eventName, args, [[handler, scope, extra]], dontPush);
};

/*
 * Invokes group of event handlers. See Amm.WithEvents.invokeHandler().
 * Subscribers is two-dimentional array, where second index corresponds 
 * to {handler}, {scope}, {extra} of Amm.WithEvents.invokeHandler():
 * -    subscribers[i][0] is {handler}
 * -    subscribers[i][1] is {scope}
 * -    subscribers[i][2] is {extra}
 */
Amm.WithEvents.invokeHandlers = function(eventName, args, subscribers, dontPush) {
    if (!dontPush) {
        Amm.pushEvent({
            origin: this,
            name: eventName,
            args: args
            
        });
    }
    try {
        
        // if we have more than one subscriber, clone subscribers array and work on it, 
        // because both subscribers.length and subscriber may unpredictably change during
        // handlers execution and loop will not work as expected
        
        var l = subscribers.length, s = l < 2? subscribers : subscribers.slice();
        
        for (var i = 0; i < l; i++) {
            var 
                h = s[i],
                handler = h[0] || null,
                scope = h[1] || this,
                extra = h[2] || undefined;
            
            if (typeof scope === 'string') { // this is an Element
                if (typeof this.getByPath === 'function') scope = this.getByPath(scope);
                else scope = Amm.getByPath(scope);
                if (!scope) {
                    continue; // we don't have the scope yet
                }
            }
            if (!scope) scope = this;
            if (typeof handler === 'string') {
                handler = scope[handler];
            }
            var argsCpy = [].concat(args);
            if (extra !== undefined) argsCpy.push(extra);
            if (!handler || typeof handler !== 'function' && typeof handler.apply !== 'function') {
                throw Error("Cannot call non-function handler or handler without .apply");
            }
            handler.apply(scope, argsCpy);
        }
    } catch(e) {
        if (!dontPush) Amm.popEvent();
        throw e;
    }
    if (!dontPush) Amm.popEvent();
    return true;
};

Amm.WithEvents.prototype = {
    
    'Amm.WithEvents': '__CLASS__',
    
    _subscribers: null,

    // does not allow to subscribe to non-existent event
    strictEvents: true,
    
    // converts list of functions outFoo(), outBar() to 'foo', 'bar'
    listEvents: function() {
        var res = [];
        for (var i in this) {
            if (('' + i).slice(0, 3) === 'out' && typeof this[i] === 'function') {
                i = '' + i;
                i = i.slice(3, 4).toLowerCase() + i.slice(4, i.length);
                if (i.length) res.push(i);
            }
        }
        return res;
    },

    /**
     * Check if there's a "built-in" event `eventName` and returns method name to raise it 
     * (event 'foo' is built-in if function this['outFoo'] exists, and name of that function will be returned).
     * 
     * Also checks for meta-events subscribeFirst_`eventName` and unsubscribeLast_`eventName`, in that case
     * returns true if corresponding event (`eventName`) exists.
     * 
     * @param {string} eventName
     * @returns {String} Empty string if there is no such event, or method name to raise the event
     */
    hasEvent: function(eventName) {
        var n = Amm.WithEvents._oCache[eventName];
        if (!n) {
            n = Amm.WithEvents._oCache[eventName] = 'out' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
        }
        if (typeof this[n] === 'function') return n;
        if (eventName[14] === '_' && eventName.slice(0, 15) === 'subscribeFirst_') {
            return this.hasEvent(eventName.slice(15))? true : null;
        }
        if (eventName[15] === '_' && eventName.slice(0, 16) === 'unsubscribeLast_') {
            return this.hasEvent(eventName.slice(16))? true : null;
        }
        return '';
    },
    
    /**
     * @param {string} eventName
     * Accepts any number of additional arguments to be passed to event recipients
     */
    _out: function(eventName) {
        if (!this._subscribers) return;
        var ss = this._subscribers[eventName];
        if (!ss || !ss.length) return; // no subscribers - so we're done
        var args = Array.prototype.slice.call(arguments, 1);
        Amm.WithEvents.invokeHandlers.call(this, eventName, args, ss);
    },
    
    // returns true if subscriber was added or undefined if was already present
    subscribe: function(eventName, handler, scope, extra) {
        if (typeof eventName !== 'string' || !eventName.length) throw Error("`eventName` must be a non-empty string");
        scope = scope || null; // required by getSubscribers to work properly
        extra = extra || null;
        if (this.strictEvents && !this.hasEvent(eventName)) {
            var miss = this._handleMissingEvent(eventName, handler, scope, extra);
            if (miss === undefined) throw Error("No such out event: '" + eventName+ "'");
            if (miss === false) return true;
        }
        var isFirst = false;
        
        if (Amm.WithEvents.debugDuplicateSubscribers && this.getSubscribers(eventName, handler, scope, extra).length) {
            throw Error("Duplicate subscription to the same event/handler pair - this should be avoided");
        }
            
        if (!this._subscribers[eventName]) {
            this._subscribers[eventName] = [];
            isFirst = true;
        }
        var res;
        this._subscribers[eventName].push([handler, scope, extra]);
        res = true;
        if (isFirst) {
            var ev = 'subscribeFirst_' + eventName, fn = '_' + ev;
            if (this[fn] && typeof this[fn] === 'function') this[fn]();
            if (this._subscribers[ev]) this._out(ev);
        }
        return res;
    },
    
    // if returns undefined, exception "no such event" will be thrown
    // if returns FALSE, exception by subscribe() won't be raised, but event won't be added (this allow
    //      method to add event handler by itself)
    // any other result will cause event to be added by standard mechanism
    _handleMissingEvent: function(eventName, handler, scope, extra) {
    },
    
    /**
     * Returns subscribers for specific events
     * All arguments are optional
     * @return {Array[]}
     */ 
    getSubscribers: function(eventName, handler, scope, extra) {
        var res = [], keys = null;
        if (eventName === undefined) keys = this._subscribers; else {
            keys = {};
            keys[eventName] = true;
        }
        for (var i in keys) if (this._subscribers.hasOwnProperty(i)) {
            var arr = this._subscribers[i], n = arr.length;
            for (var j = 0; j < n; j++) {
                if (handler !== undefined && handler !== arr[j][0]) continue;
                if (scope !== undefined && scope !== arr[j][1]) continue;
                if (extra !== undefined && extra !== arr[j][2]) continue;
                res.push([].concat(arr[j], [i, j]));
                if (eventName !== undefined && handler !== undefined && scope !== undefined && extra !== undefined) {
                    return res;
                }
            }
        }
        return res;
    },
    
    /**
     * Return unique scope objects for all events (if eventName not provided)
     * or an event with given id
     */
    getUniqueSubscribers: function(classOrInterface, eventName) {
        var res = [], keys = null;
        if (eventName === undefined) keys = this._subscribers; else {
            keys = {};
            keys[eventName] = true;
        }
        for (var i in keys) if (this._subscribers.hasOwnProperty(i)) {
            var arr = this._subscribers[i], n = arr.length;
            for (var j = 0; j < n; j++) {
                var scope = arr[j][1];
                if (!scope) continue;
                if (classOrInterface === undefined || Amm.is(scope, classOrInterface)) res.push(scope);
            }
        }
        return Amm.Array.unique(res);
    },
    
    /**
     * Unsubscribes eventName' handler with index {index}.
     * Returns array with one .getSubscribers() result if such handler existed,
     * otherwise returns empty array.
     */
    unsubscribeByIndex: function(eventName, index) {
        if (!this._subscribers[eventName] || !(index in this._subscribers[eventName])) return [];
        var res;
        res = [[].concat(this._subscribers[eventName][index], [eventName, index])];
        this._subscribers[eventName].splice(index, 1);
        if (!this._subscribers[eventName].length) {
            delete this._subscribers[eventName];
            var ev = 'unsubscribeLast_' + eventName, fn = '_' + ev;
            if (this._subscribers[ev]) this._out(ev);
            if (this[fn] && typeof this[fn] === 'function') this[fn]();
        }
        return res;
    },
    
    /**
     * All parameters are optional
     * @return {Array[]} list of unsubscribed handlers (as in 'getSubscribers()')
     * 
     * Special case: only one argument - Array eventName with .getSubscribers result
     * - will unset by found offsets w/o any checks.
     * 
     * Returns array with found subscribers
     */
    unsubscribe: function(eventName, handler, scope, extra) {
        var subscribers;
        if (eventName instanceof Array && arguments.length === 1) {
            subscribers = eventName;
        } else {
            subscribers = this.getSubscribers(eventName, handler, scope, extra);
        }
        for (var i = subscribers.length - 1; i >= 0; i--) {
            var r = subscribers[i];
            this._subscribers[r[3]].splice(r[4], 1);
            if (!this._subscribers[r[3]].length) {
                delete this._subscribers[r[3]];
                var ev = 'unsubscribeLast_' + r[3], fn = '_' + ev;
                if (this._subscribers[ev]) this._out(ev);
                if (this[fn] && typeof this[fn] === 'function') this[fn]();
            }
        }
        return subscribers;
    },
    
    cleanup: function() {
        var tmp = this._subscribers, fn;
        this._subscribers = {};
        for (var i in tmp) if (tmp.hasOwnProperty(i)) {
            var ev = 'unsubscribeLast_' + i, fn = '_' + ev;
            if (tmp[ev]) Amm.WithEvents.invokeHandlers.call(this, ev, [], tmp[ev]);
            if (this[fn] && typeof this[fn] === 'function') this[fn]();
        }
        Amm.unregisterItem(this);
    },

    _extractOnHandlers: function(options) {
        var res = [];
        for (var i in options) {
            // on__
            if (i[0] === 'o' && i[1] === 'n' && i[2] === '_' && i[3] === '_'
                && options.hasOwnProperty(i)
            ) {
                var handler = options[i];
                if (!(handler instanceof Array)) handler = [handler];
                var eventName = i.split('__')[1]; // ignore everything past second '__'
                res.push([eventName, handler[0], handler[1], handler[2]]);
                delete options[i];
            }
        }
        return res.length? res : null;
    },
    
    _initOnHandlers: function(onHandlers) {
        for (var i = 0, l = onHandlers.length; i < l; i++) {
            this.subscribe(onHandlers[i][0], onHandlers[i][1], onHandlers[i][2], onHandlers[i][3]);
        }
    }
    
};
