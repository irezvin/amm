/* global Amm */

Amm.View.Html.Collection = function(options) {
    Amm.registerItem(this);
    Amm.View.Html.call(this);
    this._mappingProp = '_map_vhc_' + this._amm_id;
    Amm.View.Abstract.Collection.call(this, options);
};

Amm.View.Html.Collection.prototype = {

    'Amm.View.Html.Collection': '__CLASS__', 
    
    debug: false,
    
    itemHtmlElementsMustBeOrphans: true,

    _mappingProp: null,
    
    createItemHtml: function(item) {
        // To-be-overridden
        return "<div>Overwrite createItemHtml!</div>";
    },
    
    updateItemHtml: function(item, existingNode) {
        // To-be-overwritten for more effective item updating
        return jQuery(this.createItemHtml(item))[0];
    },
    
    
    _doSetHtmlElement: function(htmlElement, old) {
        if (!this._canObserve() && this._canObserveCollection()) this._acquireResources();
    },
    
    getItemHtmlElement: function(item, dontThrow) {
        if (item[this._mappingProp]) return item[this._mappingProp];
        var node = this._createAndBindHtmlNode(item);
        if (!node[this._mappingProp]) {
            node[this._mappingProp] = item;
            item[this._mappingProp] = node;
        }
        return node;
    },

    /**
     * Fully rebuilds HTML container content by purging it and then re-creating every item' HTML
     */
    rebuild: function() { return this._rebuild(); },

    _canObserve: function() {
        if (!this._presentationProperty) return false;
        return !!(this._element && this[this._presentationProperty]);
    },
    
    _createAndBindHtmlNode: function(item) {
        var r = this.createItemHtml(item);
        if (typeof r === 'string') r = jQuery(r)[0];
        if (!r || !r.nodeType) 
            Error("Cannot reliabliy create and bind Html Node")
        if (r.parentNode && r.parentNode.nodeType !== 11) {
            if (this.itemHtmlElementsMustBeOrphans) {
                Error("createItemHtml() is supposed to create new nodes, but this one already has parentNode")
            } else {
                r.parentNode.removeChild(r);
            }
        }
        r[this._mappingProp] = item;
        item[this._mappingProp] = r;
        return r;
    },
    
    _beginObserveCollection: function() {
        this._rebuild();
        Amm.View.Abstract.Collection.prototype._beginObserveCollection.call(this);
    },
    
    _clearContainer: function() {
        var qe = jQuery(this._htmlElement);
        var p = this._mappingProp;
        qe.contents().each(function(i, node) {
            if (node[p]) {
                if (node[p][p] === node) delete node[p][p];
                delete node[p];
            }
            qe[0].removeChild(node);
        });
    },
    
    _rebuild: function() {
        if (this.debug) console.log(this.debug, '_rebuild');
        // empty the html element
        this._clearContainer();
        this._insertToContainer();
    },
    
    _insertToContainer: function(items, before, doThrow) {
        doThrow = doThrow || false;
        items = items || this._collection;
        for (var i = 0; i < items.length; i++) {
            var container = this.getItemHtmlElement(items[i], !doThrow);
            if (container) {
                if (!before) this._htmlElement.appendChild(container);
                    else this._htmlElement.insertBefore(container, before);
            }
        }
    },
    
    _handleCollectionAppendItems: function(items) {
        if (this.debug) console.log(this.debug, '_handleCollectionAppendItems', 
            items.length);
        this._insertToContainer(items);
    },
    
    _handleCollectionDeleteItem: function(index, item) {
        if (this.debug) console.log(this.debug, '_handleCollectionDeleteItem', 
            index, item._amm_id);
        var p = this._mappingProp, cnt = item[p];
        if (cnt) {
            if (cnt.parentNode === this._htmlElement) 
                this._htmlElement.removeChild(cnt);
            if (cnt[p]) delete cnt[p];
            delete item[p];
        }
    },
    
    /**
     * Calls refreshItem() on event item
     */
    refreshAllItems: function() {
        if (!this._collection || !this._htmlElement) return;
        for (var i = 0, l = this._collection.length; i < l; i++) {
            this.refreshItem(this._collection[i]);
        }
    },
    
    /**
     * Refreshes item by calling this.updateItemHtml() for that item. Usually this is called on item
     * change event
     */
    refreshItem: function(item) {
        if (!this._collection || !this._htmlElement) return;
        var p = this._mappingProp, htmlElement = item[p], up = this.updateItemHtml(item, htmlElement);
        if (!up) return;
        var r = jQuery(up)[0];
        if (r) {
            if (!r.nodeType) {
                Error("updateItemHtml() returned something that is not an HTML Node")
            }
            if (r.parentNode && r.parentNode.nodeType !== 11) {
                if (this.itemHtmlElementsMustBeOrphans) {
                    Error("updateItemHtml() is supposed to create new nodes, but this one already has parentNode")
                } else {
                    r.parentNode.removeChild(r);
                }
            }
            jQuery(htmlElement).replaceWith(r);
            htmlElement[p] = null;
            item[p] = r;
        }
    },
    
    _handleCollectionItemChange: function(item) {
        this.refreshItem(item);
    },
    
    _handleCollectionSpliceItems: function(index, cut, insert) {
        // will remove the nodes
        if (cut.length >= this._htmlElement.childNodes.length) {
            this._rebuild();
            return;
        }
        var cn = this._htmlElement.childNodes;
        for (var i = index, l = Math.min(index + cut.length, cn.length); i < l; i++) {
            this._htmlElement.removeChild(cn[index]);
        }
        this._insertToContainer(insert, cn[index]);
        
        // now remove the circular references from the orphaned nodes
        var p = this._mappingProp;
        for (var i = 0, l = cut.length; i < l; i++) {
            if (cut[i][p] && !cut[i][p].parentNode) {
                if (cut[i][p][p]) delete cut[i][p][p];
                delete cut[i][p];
            }
        }
    },
    
    _handleCollectionMoveItem: function(oldIndex, newIndex, item) {
        if (this.debug) console.log(this.debug, '_handleCollectionMoveItem',
            oldIndex, newIndex, item._amm_id);
        var delta, cn = this._htmlElement.childNodes;
        var node = cn[oldIndex];
        this._htmlElement.removeChild(node);
        var before = cn[newIndex];
        if (before) this._htmlElement.insertBefore(node, before);
            else this._htmlElement.appendChild(node);
    },
    
    _handleCollectionClearItems: function() {
        if (this.debug) console.log(this.debug, '_handleCollectionClearItems');
        this._clearContainer();
    },
    
    _handleCollectionItemsChange: function(items, oldItems) {
        if (this.debug) console.log(this.debug, '_handleCollectionItemsChange',
            items.length, oldItems.length);
        // the lamest possible solution
        this._rebuild();
    }
        
};

Amm.extend(Amm.View.Html.Collection, Amm.View.Html);
Amm.extend(Amm.View.Html.Collection, Amm.View.Abstract.Collection);
