/* global Amm */
/* global HTMLElement */

/**
 * "Default" view just asks Element to createDefaultView() and then sets its _htmlElement to own _htmlElement.
 * If Element doesn't have createDefaultView() method, or that method doesn't return proper View (or View prototype),
 * ...
 */
Amm.View.Html.Default = function (options) {
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this);
};

Amm.View.Html.Default.prototype = {
    
    'Amm.View.Html.Default': '__CLASS__',
    
    _defaultViews: null,
    
    _replacedMyElement: false,
    
    _ownHtmlElement: null,
    
    _viewHtmlElements: null,
    
    _replaceOwnHtmlElement: true,
    
    reportMode: Amm.Builder.PROBLEM_CONSOLE | Amm.Builder.PROBLEM_HTML,

    setReplaceOwnHtmlElement: function(replaceOwnHtmlElement) {
        var oldReplaceOwnHtmlElement = this._replaceOwnHtmlElement;
        if (oldReplaceOwnHtmlElement === replaceOwnHtmlElement) return;
        if (this._observing) {
            throw new Error("Cannot Amm.View.Html.Default::setReplaceOwnHtmlElement() while getObserving()");
        };
        this._replaceOwnHtmlElement = replaceOwnHtmlElement;
        return true;
    },

    getReplaceOwnHtmlElement: function() { return this._replaceOwnHtmlElement; },

    getOwnHtmlElement: function() {
        return this._ownHtmlElement;
    },

    setDefaultViews: function() {
        if (this._defaultViews !== null)
            throw Error("can setDefaultViews() only once, before element observation");
    },
    
    getDefaultViews: function() {
        return this._defaultViews? [].concat(this._defaultViews) : [];
    },
    
    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (!res) return res;
        var defaultViews;
        if (this._defaultViews) defaultViews = this._defaultViews; 
        else defaultViews = this._element.constructDefaultViews();
        if (!defaultViews || typeof defaultViews === 'Array' && !defaultViews.length) {
            if (this.reportMode & Amm.Builder.PROBLEM_HTML) {
                this._htmlElement.setAttribute('data-amm-warning', "Element has no default view(s)");
            }
            if (this.reportMode & Amm.Builder.PROBLEM_CONSOLE) {
                console.warn("Element has no default view(s): ", this._element);
            }
            return;
        }
        this._defaultViews = [];
        if (typeof defaultViews !== 'Array') defaultViews = [defaultViews];
        var viewHtmlElements = [];
        for (var i = 0, l = defaultViews.length; i < l; i++) {
            var v = defaultViews[i], inst;
            if (!v) continue;
            if (typeof v === 'object' && ('class' in v || Amm.is(v, 'Amm.View.Abstract'))) {
                inst = [v];
            } else if (Amm.Builder.isPossibleBuilderSource(v)) {
                inst = Amm.Builder.calcPrototypeFromSource(v, false, true);
            } else {
                throw new Error("incorrect result returned by Amm.Element.consturctDefaultViews() - cannot construct view");
            }
            for (var j = 0, l2 = inst.length; j < l2; j++) {
                inst[j] = Amm.constructInstance(inst[j], null, {element: this._element}, true, ['Amm.View.Html']);               
                this._defaultViews.push(inst[j]);
                var viewHtmlElement = inst[j].getHtmlElement();
                if (viewHtmlElement) {
                    viewHtmlElements.push(viewHtmlElement);
                }
            }
        }
        this._deleteNonTopNodes(viewHtmlElements);
        this._setViewHtmlElements(viewHtmlElements);
        return res;
    },
    
    /**
     * Scans all views nodes and leaves only ones that are applicable to placing instead of / within DefaultViews' HTMLElement
     */
    _deleteNonTopNodes: function(viewNodes) {
        for (var i = viewNodes.length - 1; i >= 0; i--) {
            if (viewNodes[i].parentNode && viewNodes[i].parentNode.tagName) {
                viewNodes.splice(i, 1);
            }
        }
    },
    
    /**
     * Both nodes and newNodes MUST be non-empty arrays
     */
    _replaceHtmlNodes: function(nodes, newNodes) {
        if (this._htmlElement === nodes[0]) {
            if (!this._ownHtmlElement) this._ownHtmlElement = this._htmlElement;
            this._htmlElement = newNodes[0];
        }
        if (!nodes[0].parentNode) return; // we cannot replace into nowhere
        var i;
        for (i = newNodes.length - 1; i >= 0; i--) {
            nodes[0].parentNode.insertBefore(newNodes[i], nodes[0]);
        }
        for (i = 0; i < nodes.length; i++) {
            if (nodes[i].parentNode) {
                nodes[i].parentNode.removeChild(nodes[i]);
            }
        }
    },

    _setViewHtmlElements: function(viewHtmlElements) {
        var newNodes, oldNodes;
        newNodes = viewHtmlElements;
        
        if (!this._replaceOwnHtmlElement) return this._replaceContents(viewHtmlElements);
        
        if (!newNodes || !newNodes.length) {
            if (this._ownHtmlElement) newNodes = [this._ownHtmlElement];
            else newNodes = [];
        }
        
        oldNodes = this._viewHtmlElements;
        if (!oldNodes || !oldNodes.length) {
            oldNodes = [this._htmlElement];
        }
        
        if (Amm.Array.equal(oldNodes, newNodes)) return; // nothing to do
        
        if (!newNodes.length) return; // nothing to do
        
        if (this._observing) {
            if (oldNodes.length) this._releaseDomNode(newNodes);
            this._acquireDomNode(newNodes);
        }
        
        if (oldNodes[0] === this._htmlElement && !this._ownHtmlElement) this._ownHtmlElement = oldNodes[0];
        
        this._replaceHtmlNodes(oldNodes, newNodes);
        
        this._viewHtmlElements = viewHtmlElements && viewHtmlElements.length? viewHtmlElements : null;
        
        this._htmlElement = newNodes[0];
    },
    
    // move contents from old HTML element to new one
    _doSetHtmlElement: function(htmlElement, old) {
        if (!htmlElement || !old || !this._observing) return; // nothing to do

        var oldOwnHtmlElement = this._ownHtmlElement;
        if (oldOwnHtmlElement && !this._viewHtmlElements) {
            this._releaseDomNode(this._ownHtmlElement);
            return;
        }
        
        // since we're observing, we need to move contents in place of or into new element
        var currViewHtmlElements = [].concat(this._viewHtmlElements);
        this._setViewHtmlElements([]);
        this._releaseResources(oldOwnHtmlElement);
        this._htmlElement = htmlElement;
        this._ownHtmlElement = null;
        this._setViewHtmlElements(currViewHtmlElements);
    },
    
    _replaceContents: function(viewHtmlElements) {
        var node = this._htmlElement.firstChild, next;
        while (node) {
            next = node.nextSibling;
            this._htmlElement.removeChild(node);
            node = next;
        }
        this._viewHtmlElements = viewHtmlElements || null;
        if (!viewHtmlElements) return;
        for (var i = 0; i < viewHtmlElements.length; i++) {
            this._htmlElement.appendChild(viewHtmlElements[i]);
        }
        return;
    },
    
    _releaseResources: function() {
        if (!(this._isElementCleanup && this.cleanupWithElement)) this._setViewHtmlElements([]);
        if (!this._defaultViews) return;
        for (var i = 0, l = this._defaultViews.length; i < l; i++) {
            this._defaultViews[i].setElement(null);
            this._defaultViews[i].setHtmlElement(null);
            this._defaultViews[i].cleanup();
        }
        this._defaultViews = null;
        Amm.View.Html.prototype._releaseResources.call(this);
    },
    
};

//Amm.extend(Amm.View.Html.Default, Amm.Builder);
Amm.extend(Amm.View.Html.Default, Amm.View.Html);
Amm.extend(Amm.View.Html.Default, Amm.View.Abstract);
