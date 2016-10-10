/* global Amm */

Amm.Handler = function(options) {
    Amm.registerItem(this);
    Amm.init(this, options);
};

Amm.Handler.prototype = {

    'Amm.Handler': '__CLASS__',
    
    requiredElementClass: 'Amm.Element',
    
    /**
     * @type {Amm.Element}
     */
    _element: null,
    
    _elementPath: null,
    
    _signal: null,
    
    setSignal: function(signal) {
        if (this.signal === signal) return;
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
    
    setElementPath: function(elementPath) {
        if (this._elementPath === elementPath) return;
        if (this._element) {
            if (this._element.getPath() === elementPath) return;
            if (this._elementPath) {
                Amm.stopWaiting(this._elementPath, this.setElement, this);
                this._elementPath = null;
            }
            this.setElement(null);
        }
        var element = Amm.getElementByPath(elementPath);
        if (!element) {
            this._elementPath = elementPath;
            Amm.waitFor(elementPath, this.setElement, this);
        }
        return true;
    },
    
    setElement: function(element) {
        if (this.requiredElementClass)
            Amm.is(element, this.requiredElementClass, 'element');
        var o = this._element;
        if (element === o) return; // nothing to do
        if (o && this._signal) this._unsubscribe();
        this._element = element;
        this._elementPath = null;
        if (this._element && this._signal) this._subscribe();
        return true;
    },
    
    getElement: function() { return this._element; },
    
    cleanup: function() {
        if (this._element && this._signal)
            this._unsubscribe(true);
        this._element = null;
    },
    
    _subscribe: function() {
        this._element.subscribeFunc(this._signal, this._handleSignal, this);
    },
    
    _unsubscribe: function(fully) {
        if (fully) this._element.unsubscribe(undefined, undefined, this);
            else this._element.unsubscribe(this._signal, this._handleSignal, this);
    }
    
};

