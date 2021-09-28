/* global Amm */

Amm.ElementBound = function(options) {
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
    
    /**
     * Lock - means we don't need to unsubscribe from element events since element already
     * unsubscribed all its' subscriber since we are in the middle of his cleanup() procedure
     */
    _isElementCleanup: 0,
    
    /** 
     * element.cleanup() leads to cleanup()
     */
    cleanupWithElement: true,
    
    _doElementChange: function(element, oldElement) {
        if (oldElement && !this._isElementCleanup) {
            oldElement.unsubscribe('cleanup', this._handleElementCleanup, this);
        }
        this._element = element;
        if (this._element) this._element.subscribe('cleanup', this._handleElementCleanup, this);
    },
    
    setElement: function(element) {
        if (element !== null) {
            if (this.requiredElementClass)
                Amm.is(element, this.requiredElementClass, 'element');
            if (this.requiredElementInterfaces) {
                Amm.hasInterfaces(element, this.requiredElementInterfaces, 'element');
            }
        }
        var o = this._element;
        if (element === o) return; // nothing to do
        this._doElementChange(element, o);
        return true;
    },
    
    getElement: function() { return this._element; },
    
    _handleElementCleanup: function() {
        this._isElementCleanup++;
        if (this.cleanupWithElement) {
            this.cleanup();
        }
        this.setElement(null);
        this._isElementCleanup--;

        return true;
    },
    
    cleanup: function() {
        if (this._element) {
            if (!this._isElementCleanup) {
                // full un-subscription
                this._element.unsubscribe(undefined, undefined, this);
            }
            this.setElement(null);
        }
        Amm.callMethods(this, '_cleanup_');
        Amm.unregisterItem(this);
    },

    _requireInterfaces: function(interface, _) {
        var args = Array.prototype.slice.call(arguments);
        if (!(this.requiredElementInterfaces instanceof Array)) {
            this.requiredElementInterfaces = this.requiredElementInterfaces? [this.requiredElementInterfaces] : [];
        }
        this.requiredElementInterfaces = this.requiredElementInterfaces.concat(args);
    }
    
    
};

