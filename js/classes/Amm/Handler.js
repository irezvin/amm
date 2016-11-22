/* global Amm */

Amm.Handler = function(options) {
    Amm.ElementBound.call(this, options);
};

Amm.Handler.prototype = {

    'Amm.Handler': '__CLASS__',
    
    _event: null,
    
    setEvent: function(event) {
        if (this._event === event) return;
        if (this._element && this._event && this._event !== event) {
            this._unsubscribe();
        }
        this._event = event;
        if (this._element && this._event) {
            this._subscribe();
        }
        return true;
    },
    
    getEvent: function() { return this._event; },

    setHandleEvent: function(fn) {
        if (typeof fn !== 'function') throw "`fn` must be a function";
        if (this._handleEvent === fn) return;
        if (this._element && this._event) this._unsubscribe();
        this._handleEvent = fn;
        if (this._element && this._event) this._subscribe();
    },

    // to-be-replaced in child classes
    _handleEvent: function() {
    },
    
    _doElementChange: function(element, oldElement) {
        if (oldElement && this._event) this._unsubscribe();
        Amm.ElementBound.prototype._doElementChange.call(this, element, oldElement);
        if (element && this._event) this._subscribe();
    },
    
    _subscribe: function() {
        this._element.subscribe(this._event, this._handleEvent, this);
    },
    
    _unsubscribe: function(fully) {
        if (this._isElementCleanup) return;
        if (fully) this._element.unsubscribe(undefined, undefined, this);
            else this._element.unsubscribe(this._event, this._handleEvent, this);
    }
    
};

Amm.extend(Amm.Handler, Amm.ElementBound);