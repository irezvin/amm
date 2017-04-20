/* global Amm */

Amm.View.Html.DisplayParent = function(options) {
    this.requiredElementInterfaces = this.requiredElementInterfaces || [];
    this.requiredElementInterfaces.push('DisplayParent');
    // we don't handle item change
    delete this._handleCollectionItemChange;
    Amm.View.Html.Collection.call(this, options);
};

Amm.View.Html.DisplayParent.prototype = {

    'Amm.View.Html.DisplayParent': '__CLASS__', 
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    debug: false,
    
    _collectionProperty: 'displayChildren',
    
    itemHtmlElementsMustBeOrphans: false,
    
    scanForItems: true,
    
    scanForDisplayOrder: true,
    
    getItemHtmlElement: function(item, dontThrow) {
        var cv = this._getItemView(item, dontThrow);
        var res = null;
        if (cv) res = cv.getHtmlElement();
        if (!res && !dontThrow) {
            throw "Collection item doesn't have view with htmlElement";
        }
        if (!res[this._mappingProp]) {
            res[this._mappingProp] = item;
            item[this._mappingProp] = res;
        }
        return res;
    },
    
    updateItemHtml: function(item, existingNode) {    
        
    },

    _getItemView: function(item, dontThrow) {
        var elViews = item.getUniqueSubscribers('Amm.View.Html.Visual');
        if (!elViews.length) {
            if (!dontThrow) 
                throw "Collection item doesn't have respective Amm.View.Html.Visual view";
            return null;
        }
        if (!elViews.length > 1) console.warn("Collection item have more than one Amm.View.Html.Visual view");
        return elViews[0];
    },

    _beginObserveCollection: function() {
        
        // scan for child elements. Currently, child containers must be the direct descendants of the htmlElement.
        // superset - all elements in the container, 
        // subsets - my elements AND foreign elements
        
        var children = { // [child.amm_id]: child instance
        };
        
        // !!! the real issue is that we need to have htmlElements of amm' item views !!!
        
        for (var i = 0, l = this._collection.length; i < l; i++) {
            var el = this._collection[i];
            children[el._amm_id] = el;
        }
        
        var scanForItems = this.scanForItems, scanForDisplayOrder = this.scanForDisplayOrder;
        
        if (scanForItems || scanForDisplayOrder) {
            
            var attr = Amm.domHolderAttribute;
            var updColl = scanForItems || scanForDisplayOrder? [] : null;

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
                else shouldPush = scanForItems;
                if (shouldPush) updColl.push(child);
            });
            
            // otherwise update the display order
            if (scanForItems && scanForDisplayOrder) {
                var newItems = Amm.Array.arrayDiff(updColl, this._collection);
                if (newItems.length) this._collection.push.apply(this._collection, newItems);
                for (var i = 0; i < updColl.length; i++) updColl[i].setDisplayOrder(i); // both for old and new items
            } else if (scanForItems) {
                if (updColl.length) this._collection.push.apply(this._collection, this._collection.length, updColl);
            } else { // scanForDisplayOrder only
                for (var i = 0; i < updColl.length; i++) updColl[i].setDisplayOrder(i);
            }
            
        }
        
        // we would want to scan for children / scan for display order / rebuild element content 
        // BEFORE we are subscribed to the collection events
        
        Amm.View.Html.Collection.prototype._beginObserveCollection.call(this);
    }

};

Amm.extend(Amm.View.Html.DisplayParent, Amm.View.Html.Collection);
