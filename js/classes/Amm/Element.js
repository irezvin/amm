/* global Amm */
/* global Ajs_Util */

/**
 * @class Amm.Element
 * @constructor
 */
Amm.Element = function() {
    this._subscribers = {};
    Amm.registerItem(this);
};

Amm.Element.prototype = {

    'Amm.Element': '__CLASS__',
    
    _subscribers: null,
    
    _id: null,
    
    strictSignals: true,
    
    /**
     * Default signal when some observer pushes data to the element without specifying the signal name
     * @type {string}
     */
    defaultIn: null,
    
    /**
     * Default signal when some observer subscribes to the element without specifying the signal name
     * @type {string}
     */
    defaultOut: null,
    
    setId: function(id) {
        this._id = id;
    },
    
    getId: function() {
        return this._id;
    },
    
    _parent: null,
    
    /**
     * Returns an element that is specified by a path
     * @param {string} path
     * @return {Amm.Element}
     */
    getElementByPath: function(path) {
        if (!typeof path === 'string' || !path.length) 
            throw "`path` must be a non-empty string";
        var res = null, scope;
        
        // head, tail. Use regExp to treat multiple occurances of '/' as one (more UNIXy)
        var ht = path.split(/\/+/, 2); 
        if (ht[0] === '') {
            scope = this.getRoot();
        }
        else if (ht[0] === '.') scope = this;
        else if (ht[0] === '..') scope = this.getParent();
        else scope = this.getChild(ht[0]);
        if (scope) {
            if (ht[1] === '') { // nothing left to do
                res = scope;
            } else {
                res = scope.getElementByPath(ht[1]);
            }
        }
        return res;
    },
    
    /**
     * @return {Amm.Element}
     */
    getRoot: function() {
        var res = null;
        for (var e = this.getRoot(); e; e = e.getRoot()) res = e;
        return res;
    },
    
    /**
     * @return {Amm.Element}
     */
    getParent: function() {
        return this._parent;
    },

    /**
     * Locates child element by id. Returns NULL if specific child element isn't find
     * @return {Amm.Element}
     */
    getChild: function(id) {
        return null;
    },
    
    // converts list of functions inFoo(), inBar() to 'foo', 'bar'
    listInSignals: function() {
        var res = [];
        for (var i in this) {
            if (('' + i).slice(0, 2) === 'in' && typeof this[i] === 'function') {
                i = '' + i;
                i = i.slice(2, 3).toLowerCase() + i.slice(3, i.length);
                if (i.length) res.push(i);
            }
        }
        return res;
    },
    
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
     * @param {string} inSignal
     * @returns {String} Empty string if there is no such in signal, or function name to receive the signal
     */
    hasInSignal: function(inSignal) {
        var res = '', n = 'in' + Ajs_Util.ucFirst(inSignal);
        if (typeof this[n] === 'function') res = n;
        return res;
    },
    
    /**
     * @param {string} outSignal
     * @returns {String} Empty string if there is no such out signal, or function name to produce the signal
     */
    hasOutSignal: function(inSignal) {
        var res = '', n = 'out' + Ajs_Util.ucFirst(inSignal);
        if (typeof this[n] === 'function') res = n;
        return res;
    },
    
    /**
     * Accepts any number of additional arguments
     * @param {string} inSignal
     * @returns {bool} Whether such signal was found or not 
     * If there was no such signal, will raise an error if strictSignals === TRUE, instead of returning FALSE
     */
    receiveSignal: function(inSignal) {
        var args = Array.prototype.slice.call(arguments, 1), sn = this.hasInSignal(inSignal), res = true;
        if (sn) {
            this[sn].apply(this, args);
        } else {
            if (this.strictSignals)
                throw "No such inSignal: '" + inSignal + "'";
            res = false;
        }
        return res;
    },
    
    /**
     * @param {string} outSignal
     * Accepts any number of additional arguments to be passed to signal recipients
     */
    _out: function(outSignal) {
        var ss = this._subscribers[outSignal];
        if (!ss) return; // no subscribers - so we're done
        var args = Array.prototype.slice.call(arguments, 1), probl = [];
        for (var i = 0; i < ss.length; i++) {
            if (typeof ss[i][0] === 'string') { // this is an Element
                // TODO: support deferred notification
                var e = this.getElementByPath(ss[i][0]);
                // TODO: what should we do if target not found?
                if (e) {
                    var sigArgs = [ss[i][1]].concat(args);
                    e.receiveSignal.apply(e, sigArgs);
                } else {
                    probl.push[ss[i]];
                }
            } else { // this is the Function
                ss[i][0].apply(ss[i][1] || this, args);
            }
        }
        if (probl.length) { // handle not-found targets
            throw "Element with path '" + probl[0][1] + "' not found";
        }
    },
    
    // Observes specified "outSignal" using function handler with optional scope
    subscribeFunc: function(outSignal, func, scope) {
        if (typeof outSignal !== 'string' || !outSignal.length) throw "`outSignal` must be a non-empty string";
        if (typeof func !== 'function') throw "`handler` must be a function";
        if (this.strictSignals && !this.hasOutSignal(outSignal))
            throw "No such out signal: '" + outSignal+ "'";
        if (!this._subscribers[outSignal]) this._subscribers[outSignal] = [];
        scope = scope || null; // required by getSubscribers to work properly
        if (!this.getSubscribers(outSignal, func, scope ).length)
            this._subscribers[outSignal].push([func, scope]);
    },
    
    // Observes specified "outSignal" using inSignal of other element specified by path
    subscribeElement: function(outSignal, path, inSignal) {
        if (this.strictSignals && !this.hasOutSignal(outSignal))
            throw "No such out signal: '" + outSignal+ "'";
        if (typeof outSignal !== 'string' || !outSignal.length) throw "`outSignal` must be a non-empty string";
        if (typeof path !== 'string' || !path.length) throw "`path` must be a non-empty string";
        if (typeof inSignal !== 'string' || !inSignal.length) throw "`inSignal` must be a non-empty string";
        if (!this.getSubscribers(outSignal, path, inSignal).length)
            this._subscribers[outSignal].push([path, inSignal]);
    },
    
    /**
     * Returns subscribers for specific signals
     * All arguments are optional
     * Return arg is subscriberInfo structure
     * @return {Array[]}
     */ 
    getSubscribers: function(outSignal, funcOrPath, scopeOrInSignal) {
        var res = [];
        for (var i in this._subscribers) if (this._subscribers.hasOwnProperty(i)) {
            if (outSignal !== undefined && outSignal !== i) continue;
            if (funcOrPath !== undefined && funcOrPath !== this._subscribers[i][0]) continue;
            if (scopeOrInSignal !== undefined && scopeOrInSignal !== this._subscribers[i][1]) continue;
            res.push([funcOrPath, scopeOrInSignal, outSignal, i]);
        }
        return res;
    },
    
    /**
     * All parameters are optional
     * @return {Array[]} list of unsubscribed handlers (as in 'getSubscribers()')
     */
    unsubscribe: function(outSignal, funcOrPath, scopeOrInSignal) {
        var ss = this.getSubscribers(outSignal, funcOrPath, scopeOrInSignal);
        for (var i = ss.length - 1; i >= 0; i--) {
            var r = ss[i];
            this._subscribers[r[2]].splice(r[3], 1);
        }
        return ss;
    },
    
    cleanup: function() {
        this.unsubscribe();
    }
    
};