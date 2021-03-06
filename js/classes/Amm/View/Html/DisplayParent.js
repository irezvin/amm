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
    
    debug: false,
    
    _collectionProperty: 'displayChildren',
    
    itemHtmlElementsMustBeOrphans: false,
    
    scanForItems: true,
    
    buildItems: false,
    
    scanForDisplayOrder: true,
    
    useIntermediaryDefaultView: false,
    
    createItemHtml: function(item) {
        // To-be-overridden
        return "<div>Overwrite createItemHtml!</div>";
    },
    
    getItemHtmlElement: function(item, dontThrow) {
        var cv = this._getItemView(item, dontThrow);
        var res = null;
        if (cv) res = cv.getHtmlElement();
        if (!res && item.constructDefaultViews !== Amm.Element.prototype.constructDefaultViews) {
            
            if (this.useIntermediaryDefaultView) {
            
                var el = document.createElement('div');

                el.setAttribute('data-amm-dv', true);

                var v = new Amm.View.Html.Default({
                    replaceOwnHtmlElement: true,
                    htmlElement: el,
                    element: item, 
                });
                res = v.getHtmlElement();
                if (res) this._htmlElement.appendChild(res);
            
            } else {
                
                var def = item.constructDefaultViews();
                var inst;
                if (Amm.Builder.isPossibleBuilderSource(def)) {
                    inst = Amm.Builder.calcPrototypeFromSource(def, true, true);
                } else if (def instanceof Array) {
                    inst = def;
                } else if (def) {
                    inst = [def];
                } else {
                    inst = [];
                }
                var views = Amm.constructMany(inst, 'Amm.View.Html', {element: item}, false, true);
                for (var j = 0, l = views.length; j < l; j++) {
                    var elem = views[j].getHtmlElement();
                    if (!elem) continue; // wtf
                    // we are interested in outermost nodes only
                    if (elem.parentNode) continue; 
                    this._htmlElement.appendChild(elem);
                    if (!res) res = elem;
                }
            
            }
        }
        if (!res && !dontThrow) {
            Error("Collection item doesn't have view with htmlElement");
        }
        if (res && !res[this._mappingProp]) {
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
                Error("Collection item doesn't have respective Amm.View.Html.Visual view");
            return null;
        }
        if (!elViews.length > 1) console.warn("Collection item have more than one Amm.View.Html.Visual view");
        return elViews[0];
    },
    
    /**
     * @returns {Array}
     */
    _getHtmlElementsWithItems: function() {
        var attr = Amm.domHolderAttribute;
        return jQuery(this._htmlElement).children('['+ attr + ']').toArray();
    },
    
    _getElementOfHtmlElement: function(htmlElement) {
        var attr = Amm.domHolderAttribute;
        var ids = (htmlElement.getAttribute(attr) + '').split(' ');
        var items = Amm.getItem(ids);
        var res = null;
        for (var i = 0, l = items.length; i < l; i++) {
            if (Amm.is(items[i], 'Amm.View.Html.Visual')) {
                res = items[i].getElement();
                if (res) return res;
            }
        }
        return null;
    },

    /**
     * @returns {Array}
     */
    _getItemsInContainer: function() {
        var htmlElements = this._getHtmlElementsWithItems();
        var res = [];
        for (var index = 0, l = htmlElements.length; index < l; index++) {
            var ammElement = this._getElementOfHtmlElement(htmlElements[index]);
            if (!ammElement) continue;
            res.push(ammElement);
        };
        return res;
    },
    
    /**
     * @param {Array} foundItems Elements which views were located 
     *      inside the collection container in the order of appearance
     */
    _updateCollectionWithFoundItems: function(foundItems) {
        var scanForItems = this.scanForItems, scanForDisplayOrder = this.scanForDisplayOrder;
        // otherwise update the display order
        if (scanForItems && scanForDisplayOrder) {
            var newItems = Amm.Array.diff(foundItems, this._collection);
            if (newItems.length) this._collection.push.apply(this._collection, newItems);
            for (var i = 0; i < foundItems.length; i++) foundItems[i].setDisplayOrder(i); // both for old and new items
        } else if (scanForItems) {
            var newItems = Amm.Array.diff(foundItems, this._collection);            
            if (newItems.length) this._collection.push.apply(this._collection, this._collection.length, foundItems);
        } else { // scanForDisplayOrder only
            for (var i = 0; i < foundItems.length; i++) foundItems[i].setDisplayOrder(i);
        }
    },
    
    _scanForItems: function() {
        
        if (this.buildItems) {
            var b = new Amm.Builder(jQuery(this._htmlElement));
            b.build();
        }
        
        var scanForItems = this.scanForItems, scanForDisplayOrder = this.scanForDisplayOrder;
        if (!scanForItems && !scanForDisplayOrder) return;
        
        var foundItems = this._getItemsInContainer();
        if (foundItems.length)
            this._updateCollectionWithFoundItems(foundItems);
    },

    _beginObserveCollection: function() {
        this._scanForItems();
        Amm.View.Html.Collection.prototype._beginObserveCollection.call(this);
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.DisplayParent];
    }

};

Amm.extend(Amm.View.Html.DisplayParent, Amm.View.Html.Collection);
