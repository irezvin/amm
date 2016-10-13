/* global Amm */

Amm.Handler = function(options) {
    Amm.ElementBound.call(this, options);
};

Amm.Handler.prototype = {

    'Amm.Handler': '__CLASS__',
    
    _signal: null,
    
    setSignal: function(signal) {
        if (this._signal === signal) return;
        if (this._element && this._signal && this._signal !== signal) {
            this._unsubscribe();
        }
        this._signal = signal;
        if (this._element && this._signal) {
            this._subscribe();
        }
        return true;
    },
    
    getSignal: function() { return this._signal; },

    setHandleSignal: function(fn) {
        if (typeof fn !== 'function') throw "`fn` must be a function";
        if (this._handleSignal === fn) return;
        if (this._element && this._signal) this._unsubscribe();
        this._handleSignal = fn;
        if (this._element && this._signal) this._subscribe();
    },

    // to-be-replaced in child classes
    _handleSignal: function() {
    },
    
    _doElementChange: function(element, oldElement) {
        if (oldElement && this._signal) this._unsubscribe();
        Amm.ElementBound.prototype._doElementChange.call(this, element, oldElement);
        if (element && this._signal) this._subscribe();
    },
    
    _subscribe: function() {
        this._element.subscribeFunc(this._signal, this._handleSignal, this);
    },
    
    _unsubscribe: function(fully) {
        if (this._isElementCleanup) return;
        if (fully) this._element.unsubscribe(undefined, undefined, this);
            else this._element.unsubscribe(this._signal, this._handleSignal, this);
    }
    
};

Amm.extend(Amm.Handler, Amm.ElementBound);