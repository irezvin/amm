/* global Amm */

Amm.Emitter = function(options) {
    Amm.ElementBound.call(this, options);
};

/**
 * Drop all emit() calls until element is assigned
 */
Amm.Emitter.DEFERRED_DROP = 'drop';

/**
 * Send last emit() call once element is assigned
 */
Amm.Emitter.DEFERRED_LAST = 'last';

/**
 * Send first emit() call, drop other
 */
Amm.Emitter.DEFERRED_FIRST = 'first';

/**
 * Save all emit() calls and repeat all calls one element is assigned
 */
Amm.Emitter.DEFERRED_ALL = 'all';

Amm.Emitter.prototype = {

    'Amm.Emitter': '__CLASS__',
    
    requiredElementClass: 'Amm.Element',
    
    _signal: null,
    
    _deferredMode: Amm.Emitter.DEFERRED_DROP,
    
    _queue: null,
    
    outSignalName: null,
    
    extra: null,
    
    decorator: null,
    
    emit: function() {
        if (!this._method) throw "Cannot emit() without name of the method!";
        if (!this._element && this._deferredMode === Amm.Emitter.DEFERRED_DROP) return;
        var args = [this._method].concat(Array.prototype.slice.call(arguments));
        if (!this._element) {
            if (this._deferredMode === Amm.Emitter.DEFERRED_FIRST) 
                this._queue = this._queue || [args];
            else if (this._deferredMode === Amm.Emitter.DEFERRED_LAST)
                this._queue = [args];
            else if (this._deferredMode === Amm.Emitter.DEFERRED_ALL) {
                if (!this._queue) this._queue = [];
                this._queue.push(args);
            } else {
                throw "Assertion: wrong _deferredMode (" + this._deferredMode + ")";
            }
        } else {
            this._doEmit(args);
        }
    },
    
    _doEmit: function(args) {
        var handler = args.splice(0, 1)[0];
        return Amm.HasSignals.invokeHandler.call(this, this.outSignalName, args, handler, this._element, this.extra, this.decorator, !this.outSignalName);
    },
    
    setMethod: function(method) {
        this._method = method;
        this._queue = null;
    },
    
    getMethod: function() { return this._method; },
    
    _doElementChange: function(element, oldElement) {
        Amm.ElementBound.prototype._doElementChange.call(this, element, oldElement);
        if (this._queue) {
            var tmp = [].concat(this._queue);
            this._queue = null;
            for (var i = 0, l = tmp.length; i < l; i++) this._doEmit(tmp[i]);
        }
    },
    
    setDeferredMode: function(deferredMode) {
        var o = this._deferredMode;
        if (o === deferredMode) return;
        this._deferredMode = deferredMode;
        switch (deferredMode) {
            case Amm.Emitter.DEFERRED_FIRST:
                if (this._queue) this._queue = [this._queue[0]];
                break;
            case Amm.Emitter.DEFERRED_LAST:
                if (this._queue) this._queue = [this._queue[this._queue.length - 1]];
                break;
            case Amm.Emitter.DEFERRED_DROP:
                this._queue = null;
                break;
            case Amm.Emitter.DEFERRED_ALL:
                break;
            default:
                throw "Wrong `deferredMode`; must be one of Amm.Emitter.DEFERRED_* constants";
        }
        return true;
    },
    
    getDeferredMode: function() {
        return this._deferredMode;
    }
    
};

Amm.extend(Amm.Emitter, Amm.ElementBound);