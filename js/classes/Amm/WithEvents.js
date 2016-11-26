/* global Amm */

Amm.WithEvents = function(options) {
    this._subscribers = {};
    Amm.registerItem(this);
    Amm.init(this, options);
};

Amm.WithEvents.invokeHandler = function(outEvent, args, handler, scope, extra, decorator, dontPush) {
    return Amm.WithEvents.invokeHandlers.call(this, outEvent, args, [[handler, scope, extra, decorator]], dontPush);
};

Amm.WithEvents.invokeHandlers = function(outEvent, args, subscribers, dontPush) {
    if (!dontPush) {
        Amm.pushEvent({
            origin: this,
            name: outEvent,
            args: args
        });
    }
    try {
        for (var i = 0; i < subscribers.length; i++) {
            
            var 
                handler = subscribers[i][0] || null,
                scope = subscribers[i][1] || this,
                extra = subscribers[i][2] || null,
                decorator = subscribers[i][3] || null;
            
            if (typeof scope === 'string') { // this is an Element
                if (typeof this.getByPath === 'function') scope = this.getByPath(scope);
                else scope = Amm.getByPath(scope);
                if (!scope) {
                    if (!dontPush) Amm.popEvent();
                    return;
                }
            }
            if (!scope) scope = this;
            if (typeof handler === 'string') {
                handler = scope[handler];
            }
            args.push(extra);
            if (decorator) {
                if (decorator.invoke) {
                    var invoke = decorator.invoke;
                    if (typeof decorator.invoke !== 'function') {
                        invoke = Amm.getFunction(handler);
                    }
                    args = invoke.call(decorator, scope, args, outEvent, handler);
                } else {
                    args = decorator.call(scope, args, outEvent, handler);
                    if (!(args instanceof Array)) {
                        if (!dontPush) Amm.popEvent();
                        return;
                    }
                }
            }

            if (typeof handler !== 'function') throw "Cannot call non-function handler";
            handler.apply(scope, args);
        }
    } catch(e) {
        if (!dontPush) Amm.popEvent();
        throw e;
    }
    if (!dontPush) Amm.popEvent();
    return true;
}

Amm.WithEvents.prototype = {
    
    'Amm.WithEvents': '__CLASS__',
    
    _subscribers: null,
    
    strictEvents: true,
    
    /**
     * Default event when some observer subscribes to the element without specifying the event name
     * @type {string}
     */
    defaultOut: null,
    
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
     * @param {string} outEvent
     * @returns {String} Empty string if there is no such out event, or function name to produce the event
     */
    hasEvent: function(event) {
        var res = '', n = 'out' + Ajs_Util.ucFirst(event);
        if (typeof this[n] === 'function') res = n;
        return res;
    },
    
    /**
     * @param {string} outEvent
     * Accepts any number of additional arguments to be passed to event recipients
     */
    _out: function(outEvent) {
        var ss = this._subscribers[outEvent];
        if (!ss) return; // no subscribers - so we're done
        var args = Array.prototype.slice.call(arguments, 1);
        Amm.WithEvents.invokeHandlers.call(this, outEvent, args, ss);
    },
    
    subscribe: function(outEvent, handler, scope, extra, decorator) {
        if (typeof outEvent !== 'string' || !outEvent.length) throw "`outEvent` must be a non-empty string";
        scope = scope || null; // required by getSubscribers to work properly
        extra = extra || null;
        decorator = decorator || null;
        if (this.strictEvents && !this.hasEvent(outEvent))
            throw "No such out event: '" + outEvent+ "'";
        if (!this._subscribers[outEvent]) this._subscribers[outEvent] = [];
        if (!this.getSubscribers(outEvent, handler, scope, extra, decorator).length)
            this._subscribers[outEvent].push([handler, scope, extra, decorator]);
    },
    
    /**
     * Returns subscribers for specific events
     * All arguments are optional
     * @return {Array[]}
     */ 
    getSubscribers: function(outEvent, handler, scope, extra, decorator) {
        var res = [], keys = null;
        if (outEvent === undefined) keys = this._subscribers; else {
            keys = {};
            keys[outEvent] = true;
        }
        for (var i in keys) if (this._subscribers.hasOwnProperty(i)) {
            var arr = this._subscribers[i], n = arr.length;
            for (var j = 0; j < n; j++) {
                if (handler !== undefined && handler !== arr[j][0]) continue;
                if (scope !== undefined && scope !== arr[j][1]) continue;
                if (extra !== undefined && extra !== arr[j][2]) continue;
                if (decorator !== undefined && decorator !== arr[j][3]) continue;
                res.push([].concat(arr[j]).concat([outEvent, j]));
            }
        }
        return res;
    },
    
    /**
     * Return unique scope objects for all events (if outEvent not provided)
     * or an event with given id
     */
    getUniqueSubscribers: function(classOrInterface, outEvent) {
        var res = [], keys = null;
        if (outEvent === undefined) keys = this._subscribers; else {
            keys = {};
            keys[outEvent] = true;
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
     * All parameters are optional
     * @return {Array[]} list of unsubscribed handlers (as in 'getSubscribers()')
     */
    unsubscribe: function(outEvent, handler, scope) {
        var ss = this.getSubscribers(outEvent, handler, scope);
        for (var i = ss.length - 1; i >= 0; i--) {
            var r = ss[i];
            this._subscribers[r[4]].splice(r[5], 1);
        }
        return ss;
    },
    
    cleanup: function() {
        this.unsubscribe();
    }
    
};
