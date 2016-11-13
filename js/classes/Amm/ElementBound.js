/* global Amm */

Amm.ElementBound = function(options) {
    Amm.registerItem(this);
    Amm.init(this, options);
};

Amm.ElementBound.prototype = {

    'Amm.ElementBound': '__CLASS__',
    
    requiredElementClass: 'Amm.Element',
    
    requiredElementInterfaces: null,
    
    /**
     * @type {Amm.Element}
     */
    _element: null,
    
    _elementPath: null,
    
    /**
     * Lock - means we don't need to unsubscribe from element events since element already
     * unsubscribed all its' subscriber since we are in the middle of his cleanup() procedure
     */
    _isElementCleanup: 0,
    
    /** 
     * element.cleanup() leads to cleanup()
     */
    cleanupWithElement: true,
    
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
        var element = (typeof this.getByPath === 'function')? this.getByPath(elementPath) : Amm.p(elementPath);
        if (!element) {
            this._elementPath = elementPath;
            Amm.waitFor(elementPath, this.setElement, this);
        }
        return true;
    },
    
    _doElementChange: function(element, oldElement) {
        if (oldElement && !this._isElementCleanup) {
            oldElement.unsubscribe('cleanup', this._handleElementCleanup, this);
        }
        this._element = element;
        this._elementPath = null;
        if (this._element) this._element.subscribe('cleanup', this._handleElementCleanup, this);
    },
    
    setElement: function(element) {
        if (typeof element === 'string') return this.setElementPath(element);
        if (element !== null) {
            if (this.requiredElementClass)
                Amm.is(element, this.requiredElementClass, 'element');
            if (this.requiredElementInterfaces)
                Amm.hasInterfaces(element, this.requiredElementInterfaces, 'element');
        }
        var o = this._element;
        if (element === o) return; // nothing to do
        this._doElementChange(element, o);
        return true;
    },
    
    getElement: function() { return this._element; },
    
    _handleElementCleanup: function(element) {
        if (this._element === element) {
            this._isElementCleanup++;
            if (this._cleanupWithElement)
                this.cleanup();
            this.setElement(null);
            this._isElementCleanup--;
            
            return true;
        }
    },
    
    cleanup: function() {
        Amm.cleanupAggregates.call(this);
        if (this._element) {
            if (!this._isElementCleanup) {
                // full un-subscription
                this._element.unsubscribe(undefined, undefined, this);
            }
            this.setElement(null);
        }
    },

    _requireInterfaces: function(interface, _) {
        var args = Array.prototype.slice.call(arguments);
        if (!(this.requiredElementInterfaces instanceof Array)) {
            this.requiredElementInterfaces = this.requiredElementInterfaces? [this.requiredElementInterfaces] : [];
        }
        this.requiredElementInterfaces = this.requiredElementInterfaces.concat(args);
    }
    
    
};

