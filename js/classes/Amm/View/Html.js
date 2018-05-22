/* global Amm */

Amm.View.Html = function(options) {
    Amm.DomHolder.call(this, {});
}

Amm.View.Html.prototype = {
    
    'Amm.View.Html': '__CLASS__', 
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    _resolveHtmlElement: true,
    
    setHtmlElement: function(htmlElement) {
        if (this._resolveHtmlElement) 
            htmlElement = this._implResolveHtmlElement(htmlElement);
        var old = this._htmlElement;
        if (old === htmlElement) return;
        if (old) this._releaseDomNode(old);
        this._htmlElement = htmlElement;
        this._doSetHtmlElement(htmlElement, old);
        this._observeElementIfPossible();
        return true;
    },
    
    _implResolveHtmlElement: function(htmlElement) {
        if (!htmlElement) return null;
        if (htmlElement instanceof HTMLElement || htmlElement.nodeType) {
            return htmlElement;
        }
        if (typeof htmlElement === "string") {
            return jQuery(htmlElement)[0] || null;
        }
        if (htmlElement.jquery) return htmlElement[0] || null;
        throw "`htmlElement` of Amm.View.Html is expected to be HTMLElement instance"
            + ", string or jQuery result or FALSEable value; provided: "
            + Amm.describeType(htmlElement);
    },
    
    _doSetHtmlElement: function(htmlElement, old) {
    },

    getHtmlElement: function() { return this._htmlElement; },    
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    }
    
};

Amm.extend(Amm.View.Html, Amm.DomHolder);
