/* global Amm */

Amm.View.Html.Visual = function(options) {
    Amm.View.Abstract.Visual.call(this, options);
};

Amm.View.Html.Visual.prototype = {

    'Amm.View.Html.Visual': '__CLASS__', 
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    delay: 250,

    setHtmlElement: function(htmlElement) {
        var old = this._htmlElement;
        if (old === htmlElement) return;
        this._htmlElement = htmlElement;
        this._observeElementIfPossible();
        return true;
    },
    
    getHtmlElement: function() { return this._htmlElement; },
    
    setVVisible: function(visible) {
        jQuery(this._htmlElement)[visible? 'show' : 'hide'](this.delay || undefined);
        
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
    }
    
};

Amm.extend(Amm.View.Html.Visual, Amm.View.Abstract.Visual);

