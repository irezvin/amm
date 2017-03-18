/* global Amm */

Amm.View.Html.DisplayParent = function(options) {
    Amm.View.Abstract.DisplayParent.call(this, options);
    Amm.DomHolder.call(this);
};

Amm.View.Html.DisplayParent.prototype = {

    'Amm.View.Html.DisplayParent': '__CLASS__', 
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    debug: false,
    
    scanForChildren: true,
    
    scanForDisplayOrder: true,
    
    setHtmlElement: function(htmlElement) {
        var old = this._htmlElement;
        if (old === htmlElement) return;
        if (old) this._releaseDomNode(old);
        this._htmlElement = htmlElement;
        this._observeElementIfPossible();
        return true;
    },
    
    getHtmlElement: function() { return this._htmlElement; },
    
    getChildHtmlElement: function(element, dontThrow) {
        var cv = this._getChildView(element, dontThrow);
        var res = null;
        if (cv) res = cv.getHtmlElement();
        if (!res && !dontThrow) {
            throw "Collection element doesn't have view with htmlElement";
        }
        return res;
    },

    _getChildView: function(element, dontThrow) {
        var elViews = element.getUniqueSubscribers('Amm.View.Html.Visual');
        if (!elViews.length) {
            if (!dontThrow) 
                throw "Collection element doesn't have respective Amm.View.Html.Visual view";
            return null;
        }
        if (!elViews.length > 1) console.warn("Collection element have more than one Amm.View.Html.Visual view");
        return elViews[0];
    },

    _beforeObserveCollection: function() {
        // we would want to scan for children / scan for display order / rebuild element content 
        // BEFORE we are subscribed to the collection events
        Amm.View.Abstract.DisplayParent.prototype._beforeObserveCollection.call(this);
        
        // scan for child elements. Currently, child containers must be the direct descendants of the htmlElement.
        // superset - all elements in the container, 
        // subsets - my elements AND foreign elements
        
        var children = { // [child.amm_id]: child instance
        };
        
        // !!! the real issue is that we need to have htmlElements of amm' element views !!!
        
        for (var i = 0, l = this._coll.length; i < l; i++) {
            var el = this._coll[i];
            children[el._amm_id] = el;
        }
        
        var scanForChildren = this.scanForChildren, scanForDisplayOrder = this.scanForDisplayOrder;
        
        if (scanForChildren || scanForDisplayOrder) {
        
            var attr = Amm.domHolderAttribute; // data-amm-id usually
            var updColl = scanForChildren || scanForDisplayOrder? [] : null;

            jQuery(this._htmlElement).children('['+ attr + ']').each(function(index, item) {
                var ids = (item.getAttribute(attr) + '').split(' ');
                var items = Amm.getItem(ids);
                var item = null;
                for (var i = 0, l = items.length; i < l; i++) {
                    if (Amm.is(items[i], 'Amm.View.Html.Visual')) {
                        item = items[i];
                        break;
                    }
                }
                if (!item) return;
                var child = item.getElement();
                if (!child) return;
                var itemId = child._amm_id;
                var isMyChild = !!children[itemId];
                var shouldPush = false;
                // we add own children to updColl only if scanForDisplayOrder is enabled because
                // if scanForDisplayOrder is disabled, we will add new children to the end of the collection
                if (isMyChild) shouldPush = scanForDisplayOrder; 
                else shouldPush = scanForChildren;
                if (shouldPush) updColl.push(child);
            });

            // otherwise update the display order
            if (scanForChildren && scanForDisplayOrder) {
                var newItems = Amm.Array.arrayDiff(updColl, this._coll);
                if (newItems.length) this._coll.push.apply(this._coll, newItems);
                for (var i = 0; i < updColl.length; i++) updColl[i].setDisplayOrder(i); // both for old and new items
            } else if (scanForChildren) {
                if (updColl.length) this._coll.push.apply(this._coll, this._coll.length, updColl);
            } else { // scanForDisplayOrder only
                for (var i = 0; i < updColl.length; i++) updColl[i].setDisplayOrder(i);
            }
        }
        
        this._rebuild();
    },
    
    _clearContainer: function() {
        var qe = jQuery(this._htmlElement);
        qe.html('');        
    },
    
    _rebuild: function() {
        if (this.debug) console.log(this.debug, '_rebuild');
        // empty the html element
        this._clearContainer();
        this._insertToContainer();
    },
    
    _insertToContainer: function(items, before, doThrow) {
        doThrow = doThrow || false;
        items = items || this._coll;
        for (var i = 0; i < items.length; i++) {
            var container = this.getChildHtmlElement(items[i], !doThrow);
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
        var cnt = this.getChildHtmlElement(item);
        if (cnt && cnt.parentNode === this._htmlElement) {
            this._htmlElement.removeChild(cnt);
        }
    },
    
    _handleCollectionSpliceItems: function(index, cut, insert) {
        if (this.debug) console.log(this.debug, '_handleCollectionSpliceItems', 
            index, cut.length, insert.length);
            
        if (cut.length >= this._htmlElement.childNodes.length) {
            this._rebuild();
            return;
        }
        var cn = this._htmlElement.childNodes;
        for (var i = index, l = Math.min(index + cut.length, cn.length); i < l; i++) {
            this._htmlElement.removeChild(cn[index]);
        }
        this._insertToContainer(insert, cn[index]);
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

Amm.extend(Amm.View.Html.DisplayParent, Amm.View.Abstract.DisplayParent);
Amm.extend(Amm.View.Html.DisplayParent, Amm.DomHolder);
