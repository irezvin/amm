/* global Amm */

Amm.Handler = function(options) {
    Amm.registerItem(this);
};

Amm.Handler.prototype = {

    'Amm.Handler': '__CLASS__',
    
    requiredElementClass: 'Amm.Element',
    
    /**
     * @type {Amm.Element}
     */
    _element: null,
    
    _signal: null,
    
    setSignal: function(signal) {
        var o = this.signal, sub = (this._element && o !== signal);
        if (sub) {
            this._unsubscribe();
        }
        this._signal = signal;
        if (sub) {
            this._subscribe();
        }
    },
    
    getSignal: function() { return this._signal; },
    
    setElement: function(element) {
        this._element = element;
    },
    
    cleanup: function() {
        if (this._element && this._signal)
            this._unsubscribe();
        this._element = null;
    }
    
};

