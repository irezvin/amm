/* global Amm */

/**
 * Subscribes to change, focus, blur events.
 * jQuery to Element: value, focus
 * Element to JQuery: value, focus, readOnly, enabled
 */
Amm.View.Html.Content = function(options) {
    Amm.View.Abstract.Content.call(this, options);
    Amm.DomHolder.call(this);
};

Amm.View.Html.Content.prototype = {

    'Amm.View.Html.Content': '__CLASS__', 

    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    _lastContent: undefined,
    
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
    
    setVContent: function(content) {
        this._lastContent = content;
        jQuery(this._htmlElement).html(Amm.decorate(this._lastContent, this._decorator));
    },
    
    getVContent: function() { 
        return jQuery(this._htmlElement).html();
    }
};

Amm.extend(Amm.View.Html.Content, Amm.View.Abstract.Content);
Amm.extend(Amm.View.Html.Content, Amm.DomHolder);

