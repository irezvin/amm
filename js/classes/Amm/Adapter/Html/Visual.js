/* global Amm */

Amm.Adapter.Html.Visual = function(options) {
    Amm.Adapter.Abstract.Visual.call(this, options);
};

Amm.Adapter.Html.Visual.prototype = {

    'Amm.Adapter.Html.Visual': '__CLASS__', 
    
    _presentationProperty: 'htmlElement',
    
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
    
    setAdpVisible: function(visible) {
        jQuery(this._htmlElement)[visible? 'show' : 'hide'](this.delay || undefined);
        
    },

    getAdpVisible: function() {
        return jQuery(this._htmlElement).is(':visible');
    },

    setAdpDisplayParent: function(displayParent) {
        // TODO
    },

    getAdpDisplayParent: function() {
        // TODO... but unreal?
    },
 
    setAdpDisplayOrder: function(displayOrder) {
    },

    getAdpDisplayOrder: function() { 
    },
 
    setAdpToggleClass: function(className, enabled) {
        jQuery(this._htmlElement).[enabled? 'addClass' : 'removeClass'](className);
    },
    
    getAdpToggleClass: function(className) {
        return jQuery(this._htmlElement).hasClass(className);
    },
    
    setAdpClasses: function(classes) {
        jQuery(this._htmlElement).attr('class', classes);
    },

    getAdpClasses: function() {
        return jQuery(this._htmlElement).attr('class');
    }
    
};

Amm.extend(Amm.Adapter.Html.Visual, Amm.Adapter.Abstract.Visual);

