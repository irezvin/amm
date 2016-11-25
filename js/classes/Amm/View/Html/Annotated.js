/* global Amm */

Amm.View.Html.Annotated = function(options) {
    Amm.DomHolder.call(this);
    Amm.View.Abstract.Annotated.call(this, options);
};

Amm.View.Html.Annotated.prototype = {

    'Amm.View.Html.Annotated': '__CLASS__', 
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    annotationClass: 'annotation',
    
    annotationClassPrefix: 'a_',
    
    createNodesOnDemand: true,
    
    classToId: function(htmlClass, explode) {
        if (explode) {
            var classes = htmlClass.replace(/^\s+|\s+$/g, '').split(/\s+/);
            for (var i = 0; i < classes.length; i++) {
                var r = this.classToId(classes[i]);
                if (r) return r;
            }
            return null;
        }
        if (htmlClass === this.annotationClass) return null;
        var l = this.annotationClassPrefix.length, res = null;
        // begins with class prefix
        if (!l) res = htmlClass;
        else if (htmlClass.slice(0, l) == this.annotationClassPrefix) {
            res = htmlClass.slice(l);
        }
        return res;
    },
    
    idToClass: function(annotationId) {
        return this.annotationClassPrefix + annotationId;
    },
    
    setHtmlElement: function(htmlElement) {
        var old = this._htmlElement;
        if (old === htmlElement) return;
        if (old) this._releaseDomNode(old);
        this._htmlElement = htmlElement;
        this._observeElementIfPossible();
        return true;
    },
    
    getHtmlElement: function() { return this._htmlElement; },
    
    locateChildHtmlElement: function(id, create) {
        if (!this._htmlElement) return null;
        var idc = this.idToClass(id), q = '.' + this.idToClass(id);
        if (this.annotationClass) q = '.' + this.annotationClass + q;
        var res = jQuery(this._htmlElement).find(q);
        if (!res.length) {
            if (create) {
                res = jQuery('<div class="' + this.annotationClass + ' ' + idc + '"></div>');
                jQuery(this._htmlElement).append(res);
            } else {
                res = null;
            }
        }
        return res;
    },
    
    _createExisting: function() {
        if (!this._htmlElement) return null; // element not set
        var t = this, res = {};
        jQuery(this._htmlElement).find('.' + this.annotationClass).each(function(i, domNode) {
            var id = t.classToId(domNode.getAttribute('class'), true);
        });
        return res;
    },
    
    // child is a child element of this.element.getAnnotationsContainer()
    _createChildViews: function(child, throwIfCant, childHtmlElement) {
        childHtmlElement = childHtmlElement || this.locateChildHtmlElement(child.getId(), this.createNodesOnDemand);
        if (!childHtmlElement) {
            if (throwIfCant) throw "Cannot locate child htmlElement for child with id " + child.getId();
            return null;
        }
        var res = [];
        if (child['Visual']) {
            res.push(new Amm.View.Html.Visual({
                element: child,
                htmlElement: childHtmlElement
            }));
        }
        res.push(new Amm.View.Html.Content({
            element: child,
            htmlElement: childHtmlElement
        }));
        return res;
    },
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    }
    
};

Amm.extend(Amm.View.Html.Annotated, Amm.View.Abstract.Annotated);
Amm.extend(Amm.View.Html.Annotated, Amm.DomHolder);
