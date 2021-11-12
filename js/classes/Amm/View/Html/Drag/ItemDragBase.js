/* global Amm */

Amm.View.Html.Drag.ItemDragBase = function(options) {
    if (this['Amm.View.Html.Drag.ItemDragBase'] === '__CLASS__') {
        throw Error("Attempt to instantiate abstract partial class 'Amm.View.Html.Drag.ItemDragBase'");
    }
};

Amm.View.Html.Drag.ItemDragBase.prototype = {

    'Amm.View.Html.Drag.ItemDragBase': '__CLASS__', 
    
    /**
     * @type string|function|Array
     * Requirements to locate dragging *element* from dragging HTML element (or function callback)
     */ 
    itemElementRequirements: null,
    
    /**
     * @type string
     * Property of item located using itemElementRequirements which specifies logical drag item
     */
    itemElementAssocProperty: null,
    
    /**
     * @type string
     * Property of logical drag item that specifies logical drag collection
     */
    itemCollectionAssocProperty: null,
    
    /**
     * 
     * @type string|function |Array
     */
    collectionElementRequirements: null,
    
    /**
     * @type string
     * If collection element is located using collectionElementRequirements, name of property
     * of collection element that references logical collection (one that contains dragging item)
     */
    collectionElementAssocProperty: null,
    
    /**
     * @type string|Amm.Collection
     * If collection cannot be located, name of property of this._element that contains link to 
     * collection with dragging items, or instance of collection itself
     */
    defaultCollection: null,
    
    itemSelector: null,
    
    containerSelector: null,
    
    _alwaysLocateContainer: false,
    
    _neverLocateItem: false,
    
    _fillItemInfo: function(htmlElement, itemInfo) {
        var itemElement, itemNativeElement, item, collectionElement, collection, collectionNativeElement;
        if (!this._neverLocateItem) {
            if (this.itemSelector) {
                itemNativeElement = jQuery(htmlElement).closest(this.itemSelector);
            } else {
                itemNativeElement = htmlElement;
            }
            if (this.itemElementRequirements && itemNativeElement) {
                itemElement = Amm.findElement(htmlElement, this.itemElementRequirements, this);
                if (itemElement && !this.itemSelector) {
                    itemNativeElement = Amm.View.Html.findOuterHtmlElement(itemElement);
                }
                if (this.itemElementAssocProperty) {
                    item = Amm.getProperty(itemElement, this.itemElementAssocProperty);
                }
            }
            if (item) {
                itemInfo.item = item;
                if (itemNativeElement) itemInfo.itemNativeElement = itemNativeElement;
            } else if (!this._alwaysLocateContainer) {
                return;
            }
        }
        if (this.itemCollectionAssocProperty && item) {
            collection = Amm.getProperty(item, this.itemCollectionAssocProperty);
        }
        if (this.containerSelector) {
            collectionNativeElement = jQuery(htmlElement).closest(this.containerSelector)[0];
        }        
        if (!collection && this.collectionElementRequirements) {
            if (collectionNativeElement || !this.containerSelector) {
                collectionElement = Amm.findElement(collectionNativeElement || htmlElement, this.collectionElementRequirements, this);
            }
            if (this.collectionElementAssocProperty) {
                if (collectionElement) {
                    collection = Amm.getProperty(collectionElement, this.collectionElementAssocProperty);
                }
            } else if (item && Amm.is(item, 'Amm.Element') && collectionElement && collectionElement['DisplayParent']) {
                collection = collectionElement.displayChildren;
            } else if (collectionElement) {
                var views = collectionElement.getUniqueSubscribers('Amm.View.Html.Collection');
                for (var i = 0, l = views.length; i < l; i++) {
                    var coll = views[i].getCollection();
                    if (coll && item && coll.hasItem(item)) {
                        collection = coll;
                        break;
                    }
                }
            }
        }
        if (!collection && this.defaultCollection) {
            if (typeof this.defaultCollection === 'string') {
                collection = Amm.getProperty(this._element, this.defaultCollection);
            } else if (Amm.is(this.defaultCollection, 'Amm.Array', 'defaultCollection')) {
                collection = this.defaultCollection;
            }
        }
        if (collection) itemInfo.collection = collection;
        if (collectionNativeElement) itemInfo.containerNativeElement = collectionNativeElement;
    },
    
};