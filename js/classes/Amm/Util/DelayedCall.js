/* global Amm */

Amm.Util.DelayedCall = function(func, contextObject, args, delay, immediate) {
    this.func = func;
    if (this.contextObject !== undefined) this.contextObject = contextObject;
    if (args !== undefined) this.args = args;
    if (delay !== undefined) this.delay = delay;
    if (immediate !== undefined) this._immediate = immediate;
    if (this._immediate) this.call();
};

Amm.Util.DelayedCall.prototype = {
    
    'Amm.Util.DelayedCall': '__CLASS__', 
    
    func: null,
    
    id: null,
    
    contextObject: null,
    
    args: [],
    
    delay: 100,
    
    _immediate: false,

    _timeout: null,
    
    _tmFn: null,

    _clearTimeout: function() {
        if (this._timeout) window.clearTimeout(this._timeout);
        this._timeout = null;
    },

    cancel: function() {
        this._clearTimeout();
        if (this.id !== null) if (Amm.Util.DelayedCall[this.id]) delete Amm.Util.DelayedCall[this.id];
    },

    call: function() {
        this._clearTimeout();
        
        if (this.delay) {
            if (!this._tmFn) this._tmFn = function(t) {
                return function() {t._run();};
            } (this);
            this._timeout = window.setTimeout(this._tmFn, this.delay);
        }
        else this._run();
    },
    
    callWithArgs: function() {
        this.args = Array.prototype.slice.call(arguments, 0);
        this.call();
    },

    _run: function() {
        this._timeout = null;
        if (this.func) {
            var ctx = this.contextObject? this.contextObject : this;
            this.func.apply(ctx, this.args);
        }
    },
    
    immediate: function() {
        this.cancel();
        if (this.func) {
            var ctx = this.contextObject? this.contextObject : this;
            this.func.apply(ctx, this.args);
        }
    },
    
    isActive: function() {
        return !!this._timeout;
    },

    cleanup: function() {
        this.cancel();
        delete this.args;
        delete this.contextObject;
    }
    
};