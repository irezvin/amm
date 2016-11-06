/* global Amm */

Amm.WithSignals = function(options) {
    this._subscribers = {};
    Amm.registerItem(this);
    Amm.init(this, options);
};

Amm.WithSignals.invokeHandler = function(outSignal, args, handler, scope, extra, decorator, dontPush) {
    return Amm.WithSignals.invokeHandlers.call(this, outSignal, args, [[handler, scope, extra, decorator]], dontPush);
};

Amm.WithSignals.invokeHandlers = function(outSignal, args, subscribers, dontPush) {
    if (!dontPush) {
        Amm.pushSignal({
            origin: this,
            name: outSignal,
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
                    if (!dontPush) Amm.popSignal();
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
                    args = invoke.call(decorator, scope, args, outSignal, handler);
                } else {
                    args = decorator.call(scope, args, outSignal, handler);
                    if (!(args instanceof Array)) {
                        if (!dontPush) Amm.popSignal();
                        return;
                    }
                }
            }

            if (typeof handler !== 'function') throw "Cannot call non-function handler";
            handler.apply(scope, args);
        }
    } catch(e) {
        if (!dontPush) Amm.popSignal();
        throw e;
    }
    if (!dontPush) Amm.popSignal();
    return true;
}

Amm.WithSignals.prototype = {
    
    'Amm.WithSignals': '__CLASS__',
    
    _subscribers: null,
    
    strictSignals: true,
    
    /**
     * Default signal when some observer subscribes to the element without specifying the signal name
     * @type {string}
     */
    defaultOut: null,
    
    // converts list of functions outFoo(), outBar() to 'foo', 'bar'
    listOutSignals: function() {
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
     * @param {string} outSignal
     * @returns {String} Empty string if there is no such out signal, or function name to produce the signal
     */
    hasSignal: function(signal) {
        var res = '', n = 'out' + Ajs_Util.ucFirst(signal);
        if (typeof this[n] === 'function') res = n;
        return res;
    },
    
    /**
     * @param {string} outSignal
     * Accepts any number of additional arguments to be passed to signal recipients
     */
    _out: function(outSignal) {
        var ss = this._subscribers[outSignal];
        if (!ss) return; // no subscribers - so we're done
        var args = Array.prototype.slice.call(arguments, 1);
        Amm.WithSignals.invokeHandlers.call(this, outSignal, args, ss);
    },
    
    subscribe: function(outSignal, handler, scope, extra, decorator) {
        if (typeof outSignal !== 'string' || !outSignal.length) throw "`outSignal` must be a non-empty string";
        scope = scope || null; // required by getSubscribers to work properly
        extra = extra || null;
        decorator = decorator || null;
        if (this.strictSignals && !this.hasSignal(outSignal))
            throw "No such out signal: '" + outSignal+ "'";
        if (!this._subscribers[outSignal]) this._subscribers[outSignal] = [];
        if (!this.getSubscribers(outSignal, handler, scope, extra, decorator).length)
            this._subscribers[outSignal].push([handler, scope, extra, decorator]);
    },
    
    /**
     * Returns subscribers for specific signals
     * All arguments are optional
     * @return {Array[]}
     */ 
    getSubscribers: function(outSignal, handler, scope, extra, decorator) {
        var res = [], keys = null;
        if (outSignal === undefined) keys = this._subscribers; else {
            keys = {};
            keys[outSignal] = true;
        }
        for (var i in keys) if (this._subscribers.hasOwnProperty(i)) {
            var arr = this._subscribers[i], n = arr.length;
            for (var j = 0; j < n; j++) {
                if (handler !== undefined && handler !== arr[j][0]) continue;
                if (scope !== undefined && scope !== arr[j][1]) continue;
                if (extra !== undefined && extra !== arr[j][1]) continue;
                if (decorator !== undefined && decorator !== arr[j][1]) continue;
                res.push([].concat(arr[j]).concat([outSignal, j]));
            }
        }
        return res;
    },
    
    /**
     * All parameters are optional
     * @return {Array[]} list of unsubscribed handlers (as in 'getSubscribers()')
     */
    unsubscribe: function(outSignal, handler, scope) {
        var ss = this.getSubscribers(outSignal, handler, scope);
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
