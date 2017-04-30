/* global Amm */

Amm.WithEvents = function(options) {
    this._subscribers = {};
    //Amm.registerItem(this);
    Amm.init(this, options);
};

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
 * {decorator} can be used to transform event arguments
 *      Event decorator is either a method, or object with "call" method.
 *      Call() args: decorator, eventName. args, handler, scope, extra, thisObject 
 *      
 *      Decorator method must return array that will be passed instead of original
 *      args to the {handler}. If decorator DOES NOT return an Array, handler 
 *      won't be called. It may be useful if decorator is going to call it itself.
 *      
 *      The supposed purpose of decorators is to re-map arguments to put output 
 *      of event into the input of already existing methods.
 *          
 *  Before the call, Amm.pushEvent() is called and, during the handler invocation,
 *  Amm.event to be set to following hash:
 *      {origin: this. object, name: eventName, args: args(array)}.
 *  
 *  {dontPush} - don't populate Amm.event object
 */
Amm.WithEvents.invokeHandler = function(eventName, args, handler, scope, extra, decorator, dontPush) {
    return Amm.WithEvents.invokeHandlers.call(this, eventName, args, [[handler, scope, extra, decorator]], dontPush);
};

/*
 * Invokes group of event handlers. See Amm.WithEvents.invokeHandler().
 * Subscribers is two-dimentional array, where second index corresponds 
 * to {handler}, {scope}, {extra} and {decorator} of Amm.WithEvents.invokeHandler():
 * -    subscribers[i][0] is {handler}
 * -    subscribers[i][1] is {scope}
 * -    subscribers[i][2] is {extra}
 * -    subscribers[i][3] is {decorator}
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
        for (var i = 0; i < subscribers.length; i++) {
            var 
                handler = subscribers[i][0] || null,
                scope = subscribers[i][1] || this,
                extra = subscribers[i][2] || undefined,
                decorator = subscribers[i][3] || null;
            
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
            if (decorator) {
                argsCpy = decorator.call(decorator, eventName, argsCpy, handler, scope, extra, this);
                if (!(argsCpy instanceof Array)) continue;
            }
            if (typeof handler !== 'function' && typeof handler.apply !== 'function') {
                throw "Cannot call non-function handler or handler without .apply";
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
     * (event 'foo' is built-in if function this['outFoo'] exists, and name of that function will be returned)
     * @param {string} eventName
     * @returns {String} Empty string if there is no such event, or method name to raise the event
     */
    hasEvent: function(eventName) {
        var c = eventName.charAt(0), cu = c.toUpperCase();
        if (c === cu) { // event name cannot begin from upper-case letter
            return null;
        }
        var res = '', n = 'out' + cu + eventName.slice(1);
        if (typeof this[n] === 'function') res = n;
        return res;
    },
    
    /**
     * @param {string} eventName
     * Accepts any number of additional arguments to be passed to event recipients
     */
    _out: function(eventName) {
        var ss = this._subscribers[eventName];
        if (!ss || !ss.length) return; // no subscribers - so we're done
        var args = Array.prototype.slice.call(arguments, 1);
        Amm.WithEvents.invokeHandlers.call(this, eventName, args, ss);
    },
    
    // returns true if subscriber was added or undefined if was already present
    subscribe: function(eventName, handler, scope, extra, decorator) {
        if (typeof eventName !== 'string' || !eventName.length) throw "`eventName` must be a non-empty string";
        scope = scope || null; // required by getSubscribers to work properly
        extra = extra || null;
        decorator = decorator || null;
        if (this.strictEvents && !this.hasEvent(eventName)) {
            var miss = this._handleMissingEvent(eventName, handler, scope, extra, decorator);
            if (miss === undefined) throw "No such out event: '" + eventName+ "'";
            if (miss === false) return true;
        }
        if (!this._subscribers[eventName]) this._subscribers[eventName] = [];
        if (!this.getSubscribers(eventName, handler, scope, extra, decorator).length) {
            this._subscribers[eventName].push([handler, scope, extra, decorator]);
            return true;
        }
    },
    
    // if returns undefined, exception "no such event" will be thrown
    // if returns FALSE, exception by subscribe() won't be raised, but event won't be added (this allow
    //      method to add event handler by itself)
    // any other result will cause event to be added by standard mechanism
    _handleMissingEvent: function(eventName, handler, scope, extra, decorator) {
    },
    
    /**
     * Returns subscribers for specific events
     * All arguments are optional
     * @return {Array[]}
     */ 
    getSubscribers: function(eventName, handler, scope, extra, decorator) {
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
                if (decorator !== undefined && decorator !== arr[j][3]) continue;
                res.push([].concat(arr[j], [i, j]));
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
            // leave only unique items
            for (var i = 0; i < res.length; i++) {
                for (var j = res.length - 1; j > i; j--) {
                    if (res[j] === res[i]) res.splice(j, 1);
                }
            }
        }
        return res;
    },
    
    /**
     * Unsubscribes eventName' handler with index {index}.
     * Returns array with one .getSubscribers() result if such handler existed,
     * otherwise returns empty array.
     */
    unsubscribeByIndex: function(eventName, index) {
        var res;
        if (index in this._subscribers[eventName]) {
            res = [[].concat(this._subscribers[eventName][index], [eventName, index])];
            this._subscribers[eventName].splice(index, 1);
            if (!this._subscribers[eventName])
                delete this._subscribers[eventName];
        } else {
            res = [];
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
    unsubscribe: function(eventName, handler, scope, extra, decorator) {
        var subscribers;
        if (eventName instanceof Array && arguments.length === 1) {
            subscribers = eventName;
        } else {
            subscribers = this.getSubscribers(eventName, handler, scope, extra, decorator);
        }
        for (var i = subscribers.length - 1; i >= 0; i--) {
            var r = subscribers[i];
            this._subscribers[r[4]].splice(r[5], 1);
            if (!this._subscribers[r[4]]) delete this._subscribers[r[4]];
        }
        return subscribers;
    },
    
    cleanup: function() {
        this._subscribers = {};
    }
    
};
