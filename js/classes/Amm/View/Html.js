/* global Amm */
/* global HTMLElement */

Amm.View.Html = function(options) {
    Amm.DomHolder.call(this, {});
};

Amm.View.Html.prototype = {
    
    'Amm.View.Html': '__CLASS__', 
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    _deferHtmlElementRef: null,
    
    _resolveHtmlElement: true,
    
    _relativeToView: null,
    
    _waitHandler: null,
    
    _preInit_htmlView: function(options) {
        if (options && options.relativeToView) {
            this.setRelativeToView(options.relativeToView);
        }
    },
    
    setHtmlSource: function(selector) {
        var e = jQuery(selector);
        if (!e.length)
            throw Error("Cannot setHtmlSource: selector '" + selector + "' doesn't return any elements");
        var domNode = jQuery.parseHTML(e[0].innerHTML.replace(/^\s+|\s+$/g, ''))[0];
        this.setHtmlElement(domNode);
    },
    
    setHtmlElement: function(htmlElement) {
        if (this._resolveHtmlElement || this._relativeToView)
            htmlElement = this._implResolveHtmlElement(htmlElement);
        var old = this._htmlElement;
        if (old === htmlElement) return;
        if (old) {
            this._releaseDomNode(old);
        }
        this._htmlElement = htmlElement;
        this._doSetHtmlElement(htmlElement, old);
        this._tryObserve();
        return true;
    },

    _implResolveHtmlElementRelativeToView: function(view) {
        var node, jq;
        if (this._deferHtmlElementRef && this._deferHtmlElementRef['Amm.Builder.Ref']) {
            this._deferHtmlElementRef.setNode(view.getHtmlElement());
            node = this._deferHtmlElementRef.resolve(true);
        } else {
            jq = jQuery(view.getHtmlElement());
            node = jq.find(this._deferHtmlElementRef)[0];
            if (!node) node = jq.closest(this._deferHtmlElementRef)[0];
        }
        if (node && (node instanceof HTMLElement || node.nodeType)) this.setHtmlElement(node);
        else {
            console.warn(
                Amm.getClass(this) + " of " + Amm.getClass(this._element) + 
                ": cannot resolve HTMLElement relative to view '" + view.id 
                + "' using selector '" + this._deferHtmlElementRef);
        }
        this._deferHtmlElementRef = null;
    },
    
    _elementChange_htmlView: function(element, oldElement) {
        if (oldElement && this._waitHandler) {
            Amm.View.Abstract.stopWaitingForView(oldElement, this._waitHandler);
            this._waitHandler = null;
        }
        if (element && this._deferHtmlElementRef) {
            this._resolveOrDeferHtmlElementRelativeToView(this._deferHtmlElementRef);
        }
    },
    
    _resolveOrDeferHtmlElementRelativeToView: function(htmlElement) {
        this._deferHtmlElementRef = htmlElement;
        if (!this._element) return null;
        var viewId = this._relativeToView === true? undefined : this._relativeToView;
        if (this._element) {
            var r = Amm.View.Abstract.waitForView(this._element, viewId, 'Amm.View.Html',
                this._implResolveHtmlElementRelativeToView, this);
            this._waitHandler = r;
        }
    },
    
    _implResolveHtmlElement: function(htmlElement) {
        if (!htmlElement) return null;
        if (htmlElement instanceof HTMLElement || htmlElement.nodeType) {
            return htmlElement;
        }
        if (typeof htmlElement === "string" || htmlElement['Amm.Builder.Ref'] || '$ref' in htmlElement) {
            if (htmlElement.$ref) htmlElement = new Amm.Builder.Ref(htmlElement);
            if (this._relativeToView) {
                return this._resolveOrDeferHtmlElementRelativeToView(htmlElement);
            }
            if (htmlElement['Amm.Builder.Ref']) return htmlElement.resolve(true);
            return jQuery(htmlElement)[0] || null;
        }
        if (htmlElement.jquery) return htmlElement[0] || null;
        throw Error("`htmlElement` of Amm.View.Html is expected to be HTMLElement instance"
            + ", string or jQuery result or FALSEable value; provided: "
            + Amm.describeType(htmlElement));
    },
    
    _doSetHtmlElement: function(htmlElement, old) {
    },

    setRelativeToView: function(relativeToView) {
        var oldRelativeToView = this._relativeToView;
        if (oldRelativeToView === relativeToView) return;
        this._relativeToView = relativeToView;
        return true;
    },

    getRelativeToView: function() { return this._relativeToView; },

    getHtmlElement: function() { return this._htmlElement; },    
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    },
    
    _releaseResources: function() {
        if (this._htmlElement) this._releaseDomNode(this._htmlElement);
    },
    
    _cleanup_AmmViewHtml: function() {
        this.setHtmlElement(null);
    }
    
};

Amm.extend(Amm.View.Html, Amm.DomHolder);

Amm.View.Html.findOuterHtmlElement = function(element, all) {
    var containers = Amm.getProperty(element.getUniqueSubscribers('Amm.View.Html'), 'htmlElement');
    var outermost = [];
    for (var i = 0, l = containers.length; i < l; i++) {
        if (jQuery(containers[i]).closest(containers).not(containers[i]).length) continue;
        if (!all) return containers[i];
        outermost.push(containers[i]);
    }
    return all? outermost : null;
};

Amm.View.Html._lastFocusedNode = null;
Amm.View.Html._newFocusedNode = null;
Amm.View.Html.deferredFocusNode = function() {
    // focus changed by other means - don't disrupt it
    var h = Amm.View.Html;
    if (!h._newFocusedNode) return;
    if (document.activeElement && document.activeElement != h._lastFocusedNode) {
        //console.log('cancelling: focus changed to', document.activeElement);
        if (h._newFocusedNode) jQuery(h).blur();
        return;
    }
    var f = function() {
        jQuery(h._newFocusedNode).focus();
        h._newFocusedNode = null;
    };
    f();
    //window.setTimeout(f, 0);
};

Amm.View.Html.focusNode = function(node) {
    //console.log('focusing node', node);
    //if (!node.parentNode) console.trace();
    if (document.activeElement === node) return;
    this._lastFocusedNode = document.activeElement;
    var currentNewFocus = this._newFocusedNode;
    if (currentNewFocus === node) {
        //console.log("Focusing to the same");
        return;
    }
    if (currentNewFocus) {
        if (this._newFocusedNode !== currentNewFocus) {
            //console.log("changed during blur event handling - cancel");
            return; // changed during blur event handling
        }
    }
    this._newFocusedNode = node;
    Amm.getRoot().defer(Amm.View.Html.deferredFocusNode, Amm.View.Html);
};

Amm.View.Html.getFocusedNode = function() {
    return this._newFocusedNode || document.activeElement;
};
