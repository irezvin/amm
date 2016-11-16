/* global Amm */

Amm.View.Html.Visual = function(options) {
    Amm.View.Abstract.Visual.call(this, options);
    Amm.DomHolder.call(this);
};

Amm.View.Html.Visual.defaultDelay = 250;

Amm.View.Html.Visual.prototype = {

    'Amm.View.Html.Visual': '__CLASS__', 
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    delay: undefined,

    setHtmlElement: function(htmlElement) {
        var old = this._htmlElement;
        if (old === htmlElement) return;
        if (old) this._releaseDomNode(old);
        this._htmlElement = htmlElement;
        if (this._htmlElement)
            this._acquireDomNode(htmlElement);
        this._observeElementIfPossible();
        return true;
    },
    
    getHtmlElement: function() { return this._htmlElement; },
    
    setVVisible: function(visible) {
        var delay = this.delay;
        if (delay === undefined) delay = Amm.View.Html.Visual.defaultDelay;
        jQuery(this._htmlElement)[visible? 'show' : 'hide'](delay);
    },

    getVVisible: function() {
        return jQuery(this._htmlElement).is(':visible');
    },

    setVDisplayParent: function(displayParent) {
        // TODO
    },

    getVDisplayParent: function() {
        // TODO... but unreal?
    },
 
    setVDisplayOrder: function(displayOrder) {
    },

    getVDisplayOrder: function() { 
    },
 
    setVToggleClass: function(className, enabled) {
        jQuery(this._htmlElement)[enabled? 'addClass' : 'removeClass'](className);
    },
    
    getVToggleClass: function(className) {
        return jQuery(this._htmlElement).hasClass(className);
    },
    
    setVClasses: function(classes) {
        jQuery(this._htmlElement).attr('class', classes);
    },

    getVClasses: function() {
        return jQuery(this._htmlElement).attr('class');
    },
    
    cleanup: function() {
        Amm.View.Abstract.Visual.prototype.cleanup.call(this);
        if (this._htmlElement) this._releaseDomNode(this._htmlElement);
    }
    
};

Amm.extend(Amm.View.Html.Visual, Amm.View.Abstract.Visual);
Amm.extend(Amm.View.Html.Visual, Amm.DomHolder);
