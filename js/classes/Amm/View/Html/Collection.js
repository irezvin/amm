/* global Amm */

Amm.View.Html.Collection = function(options) {
    Amm.registerItem(this);
    Amm.View.Html.call(this);
    this._items = [];
    Amm.View.Abstract.Collection.call(this, options);
};

Amm.View.Html.Collection.prototype = {

    'Amm.View.Html.Collection': '__CLASS__', 
    
    debug: false,
    
    /**
     * Mapping of items to their DOM nodes.
     * Number and order is the same as in observed collection (this._collection), and is synced.
     * Entries are arrays, first member is item, other members are DOM Nodes related to that item.
     * If item doesn't have to be shown (_shouldShowItem(item) is false), it will have no DOM nodes,
     * only [item] reference.
     * 
     * @type {Array}
     */
    _items: null,
    
    /**
     * Template method that returns HTML representation of an item; 
     * is called when item added to the view for the first time.
     * 
     * Returns HTML, DOM Node or Array of DOM Nodes for given item.
     * 
     * May return empty content (null, empty string, or empty array) if item doesn't have 
     * HTML representation at the moment, but for that case _shouldShowItem may be suited better.
     */
    createItemHtml: function(item) {
        return "<div>Overwrite createItemHtml!</div>";
    },
    
    /**
     * Template method that can update existing HTML representation of an item or return a new one;
     * is called during collection' itemChange event. 
     * 
     * By default, calls 'createItemHtml()', but can be replaced by more effective implementation.
     */
    updateItemHtml: function(item, existingNodes) {
        // To-be-overwritten for more effective item updating
        return this.createItemHtml(item);
    },
    
    /**
     * Template method that can be used to do something with the nodes no longer needed
     * (temporary means item did not disappear from the collection, but shouldShowItem is FALSE)
     */
    disposeItemHtml: function(item, existingNodes, temporary) {
    },
    
    getHtmlElementItem: function(htmlElement) {
        var idx = this._findItemOrNode(htmlElement);
        if (idx >= 0) return this._items[idx][0];
        return null;
    },
            
    _doSetHtmlElement: function(htmlElement, old) {
        if (!this._canObserve() && this._canObserveCollection()) this._acquireResources();
    },

    _canObserve: function() {
        if (!this._presentationProperty) return false;
        return !!(this._element && this[this._presentationProperty]);
    },
    
    /**
     * Given item or DOM Node, locates index in this._items array, if any (-1 if none)
     */
    _findItemOrNode: function(itemOrNode) {
        var isNode = 'nodeType' in itemOrNode;
        for (var i = 0, l = this._items.length; i < l; i++) {
            if (isNode) {
                if (Amm.Array.indexOf(itemOrNode, this._items[i], 1) >= 0) return i;
            } else {
                if (this._items[i][0] === itemOrNode) return i;
            }
        }
        return -1;
    },
    
    /**
     * Checks that result of createItemHtml() or updateItemHtml() is suitable item representation
     * (null, HTML string, DOM Nodes or array of DOM Nodes).
     * 
     * Checks that DOM Nodes in the result are orphans
     * 
     * Returns either null, if representation is empty, or Array with 1 or more DOM Nodes.
     * 
     * @returns null|Array
     */
    _checkItemNodes: function(nodesOrHtml) {
        var res;
        if (!nodesOrHtml) return null;
        if (typeof nodesOrHtml === 'string') {
            res = jQuery(nodesOrHtml).get();
            if (!res.length) {
                return null;
            }
            return res;
        }
        if (nodesOrHtml && nodesOrHtml.nodeType) res = [nodesOrHtml];
        else if (nodesOrHtml.jquery) res = nodesOrHtml.get();
        else if (nodesOrHtml instanceof Array) {
            res = nodesOrHtml;
            if (!res.length) {
                return null;
            }
        } else {
            throw Error("Item' DOM node(s) must be an HTML string, jQuery result, DOM Node or array of DOM Nodes");
        }
        for (var i = 0, l = res.length; i < l; i++) {
            if (!res[i].nodeType) {
                throw Error("All members of item' DOM nodes array must be DOM nodes");
            }
        }
        return res;
    },
    
    _beginObserveCollection: function() {
        this.rebuild();
        Amm.View.Abstract.Collection.prototype._beginObserveCollection.call(this);
    },
    
    _clearContainer: function() {
        jQuery(this._htmlElement).empty();
    },
    
    /**
     * Creates, updates or disposes nodes of an item
     */
    _maintainNodes: function(item, oldNodes) {
        if (!this._shouldShowItem(item)) {
            if (oldNodes && oldNodes.length) this.disposeItemHtml(item, oldNodes, true);
            return null;            
        }
        var res;
        if (oldNodes && oldNodes.length) {
            res = this.updateItemHtml(item, oldNodes);
        }
        else res = this.createItemHtml(item);
        res = this._checkItemNodes(res);
        return res;
    },
    
    _rebuildItemEntry: function(item, currentEntry, updateItemHtml) {
        var itemsEntry = currentEntry;
        if (!itemsEntry) {
            itemsEntry = this._maintainNodes(item);
            if (itemsEntry) itemsEntry.unshift(item);
            else itemsEntry = [item];
        } else if (updateItemHtml) {
            itemsEntry = [item].concat(this._maintainNodes(item, itemsEntry.slice(1)) || []);
        } else {
            var shouldShow = this._shouldShowItem(item);
            if (shouldShow && itemsEntry.length === 1) {
                itemsEntry = this._checkItemNodes(this.createItemHtml(item)) || [];
                itemsEntry.unshift(item);
            } else if (!shouldShow && itemsEntry.length > 1) {
                this.disposeItemHtml(item, itemsEntry.slice(1), true);
                itemsEntry = [];
            }
        }
        return itemsEntry;
    },
    
    /**
     * Updates this._items with entries and DOM nodes that correspond this._collection;
     * removes obsolete nodes; re-checks _shouldShowItem on every item.
     */
    _rebuildItemsArray: function(updateItemHtml, items, oldEntries, newNodes) {
        var newEntries = [], oldEntries = oldEntries || this._items.slice(), newNodes = newNodes || [], 
            items = items || this._collection;
        for (var i = 0, l = items.length; i < l; i++) {
            var itemsEntry = null, item = items[i];
            // if lists have same order, will work fast, since we remove found ones from oldItems
            for (var j = 0, ll = oldEntries.length; j < ll; j++) {
                if (oldEntries[j][0] !== item) continue;
                itemsEntry = oldEntries[j];
                oldEntries.splice(j, 1);
                break;
            }
            itemsEntry = this._rebuildItemEntry(item, itemsEntry);
            newEntries.push(itemsEntry);
            if (itemsEntry.length > 1) {
                newNodes.push.apply(newNodes, itemsEntry.slice(1));
            }
        }
        // now newItems matches collection order, oldItems contains only missing items
        for (j = 0, ll = oldEntries.length; j < ll; j++) {
            if (oldEntries[j].length > 1) {
                this.disposeItemHtml(oldEntries[j][0], oldEntries[j].slice(1), false);
            }
        }
        return newEntries;
    },
    
    detachNodes: function(nodes) {
        jQuery(nodes).detach();
    },
    
    /**
     * Fully rebuilds HTML container content by purging it and then re-creating every item' HTML
     * @param {boolean} updateItemsHtml Whether to call updateItemsHtml() on items with representation
     */
    rebuild: function(updateItemsHtml) {
        if (this.debug) console.log(this.debug, '_rebuild');
        if (!this._collection || !this._htmlElement) return;
        var nodes = [];
        var jq = jQuery(this._htmlElement);
        this.detachNodes(jq.contents().get());
        this._items = this._rebuildItemsArray(updateItemsHtml, null, null, nodes);
        if (nodes.length) jq.append(nodes);
    },
        
    _handleCollectionAppendItems: function(items) {
        if (this.debug) console.log(this.debug, '_handleCollectionAppendItems', 
            items.length);
        var newNodes = [], newItems = this._rebuildItemsArray(false, items, [], newNodes);
        this._items.push.apply(this._items, newItems);
        if (newNodes.length) jQuery(newNodes).appendTo(this._htmlElement);
    },
    
    _handleCollectionDeleteItem: function(index, item) {
        if (this.debug) console.log(this.debug, '_handleCollectionDeleteItem', 
            index, item._amm_id);
        if (this._items[index][0] !== item) {
            index = this._findItemOrNode(item);
            if (index < 0) return;
        }
        var oldNodes = this._items[index].slice(1);
        if (oldNodes.length) this.detachNodes(oldNodes);
        this._items.splice(index, 1);
    },
    
    refreshAllItems: function() {
        return this.rebuild(true);
    },
    
    /**
     * Refreshes item by calling this.updateItemHtml() for that item. 
     * Usually this is called on 'itemChange' event
     */
    refreshItem: function(item) {
        var idx = this._findItemOrNode(item);
        if (idx < 0) {
            throw new Error("refreshItem(): item not found in Collection view items' list");
        }
        var entry = this._items[idx], oldNodes = entry.slice(1), 
                newNodes = this._maintainNodes(item, oldNodes);
        this._items[idx] = [entry[0]].concat(newNodes || []);
        this._replaceItemNodes(idx, oldNodes);
    },
    
    _replaceItemNodes: function(idx, oldNodes, force) {
        var entry = this._items[idx], nodes = entry.slice(1);
        if (oldNodes && oldNodes.length) {
            // same set of nodes, all in current element; don't check position
            if (
                !force && nodes.length && nodes[0].parentNode === this._htmlElement 
                && Amm.Array.equal(nodes, oldNodes)
            ) {
                return;
            }
            for (var i = oldNodes.length - 1; i >= 0; i--) {
                if (oldNodes[i].parentNode !== this._htmlElement) {
                    oldNodes.splice(i, 1);
                }
            }
            if (oldNodes.length) this.detachNodes(oldNodes);
        }
        if (!nodes.length) return;
        for (var i = idx + 1, l = this._items.length; i < l; i++) {
            if (this._items[i].length > 1 && this._items[i][1].parentNode === this._htmlElement) {
                jQuery(nodes).insertBefore(this._items[i][1]);
                return;
            }
        }
        jQuery(nodes).appendTo(this._htmlElement);
    },
    
    _handleCollectionItemChange: function(item) {
        this.refreshItem(item);
    },
    
    _handleCollectionSpliceItems: function(index, cut, insert) {
        if (this.debug) console.log(this.debug, '_handleCollectionSpliceItems', 
            index, cut, insert);
        
        var newNodes = [],
            oldEntries = this._items.slice(index, index + cut.length),
            oldNodes = [];
        
        for (var i = 0, l = oldEntries.length; i < l; i++) {
            if (oldEntries[i].length > 1) oldNodes.push.apply(oldNodes, oldEntries[i].slice(1));
        }
        
        var newEntries = this._rebuildItemsArray(false, 
                insert,
                this._items.slice(index, index + cut.length),
                newNodes
            );
    
        // replace oldEntries with new entries
        this._items.splice.apply(this._items, [index, cut.length].concat(newEntries));
    
        if (Amm.Array.equal(oldNodes, newNodes)) return; // nothing to do
        
        var nextNode;
        if (oldNodes.length) nextNode = oldNodes[oldNodes.length - 1].nextSibling;
        if (!nextNode) {
            for (var j = index + insert.length, ll = this._items.length; j < ll; j++) {
                if (this._items[j].length > 1 && this._items[j][1].parentNode === this._htmlElement) {
                    nextNode = this._items[j][1];
                    break;
                }
            }
        }
        this.detachNodes(oldNodes);
        if (nextNode) jQuery(newNodes).insertBefore(nextNode);
        else jQuery(newNodes).appendTo(this._htmlElement);
    },
    
    _handleCollectionMoveItem: function(oldIndex, newIndex, item) {
        if (this.debug) console.log(this.debug, '_handleCollectionMoveItem', 
            oldIndex, newIndex, item);
        var entry = this._items[oldIndex];
        this._items.splice(oldIndex, 1);
        this._items.splice(newIndex, 0, entry);
        this._replaceItemNodes(newIndex, entry.slice(1), true);
    },
    
    _handleCollectionClearItems: function() {
        if (this.debug) console.log(this.debug, '_handleCollectionClearItems');
        this._items = [];
        this._clearContainer();
    },
    
    _handleCollectionItemsChange: function(items, oldItems) {
        if (this.debug) console.log(this.debug, '_handleCollectionItemsChange',
            items.length, oldItems.length);
            
        // the lamest possible solution
        this.rebuild();
    },
    
};

Amm.extend(Amm.View.Html.Collection, Amm.View.Html);
Amm.extend(Amm.View.Html.Collection, Amm.View.Abstract.Collection);
