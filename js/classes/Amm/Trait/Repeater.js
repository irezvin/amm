/* global Amm */

Amm.Trait.Repeater = function(options) {
    this._elementPrototype = {
        traits: ['Amm.Trait.Visual'],
        prop__item: null
    };
    Amm.Trait.DisplayParent.call(this, options);
};

Amm.Trait.Repeater.prototype = {

    'Amm.Trait.Repeater': '__CLASS__', 
    
    'Repeater': '__INTERFACE__',
    
    _elementPrototype: null,

    _itemProperty: 'item',
    
    _ownsItemsCollection: false,
    
    _collectionPrototype: null,
    
//    __augment: function(traitInstance, options) {
//        
//        Amm.Element.regInit(this, '99.Amm.Trait.Repeater', function() {        
//            if (!this['Component']) throw Error("Repeater must be also a Component");
//        });
//        
//    },
    
    setItems: function(items) {
        if (items && items['Amm.Collection']) {
            this._ownsItemsCollection = false;
            return this.setItemsCollection(items);
        }
        if (!items) items = [];
        if (!(items instanceof Array))
            throw Error ("`items` must be an Amm.Collection, an Array instance or FALSEable value; provided: "
                + Amm.describeType(items));
        if (this._ownsItemsCollection) return this._itemsCollection.setItems(items);
        this._ownsItemsCollection = true;
        return this.setItemsCollection(this._createOwnCollection(items));
    },

    getItems: function() { return this._itemsCollection? this._itemsCollection : []; },
    
    _createOwnCollection: function(items) {
        if (!items) items = [];
        var proto = this._collectionPrototype? Amm.override({}, this._collectionPrototype) : {};
        proto.items = items;
        var res = new Amm.Collection(proto);
        res._ammTraitRepeater = this; // we need to tag own collection to dispose it later
    },
    
    _cleanupCollectionIfOwn: function(collection) {
        if (collection && collection === this) {
            delete collection._ammTraitRepeater;
            collection.cleanup();
            return true;
        }
    },
    
    _cleanup_Repeater: function() {
        if (this._cleanupCollectionIfOwn(this._itemsCollection)) {
            this._itemsCollection = null;
        }
    },
    
    outItemsChange: function(items, oldItems) {
        this._out('itemsChange', items, oldItems);
    },
    
    setItemsCollection: function(itemsCollection) {
        Amm.is(itemsCollection, 'Amm.Collection', 'itemsCollection');
        var oldItemsCollection = this._itemsCollection;

        if (oldItemsCollection === itemsCollection) return;
        var subItemsChange = !!this._subscribers['itemsChange'];
        var oldItems = [];
        if (oldItemsCollection) {
            if (subItemsChange) oldItems = oldItemsCollection.getItems();
            if (!this._cleanupCollectionIfOwn(oldItemsCollection))
                this._subscribeItemsCollection(oldItemsCollection, true);
        }
        this._itemsCollection = itemsCollection;
        if (subItemsChange) {
            this.outItemsChange(itemsCollection.getItems(), oldItems);
        }
        this.outItemsCollectionChange(itemsCollection, oldItemsCollection);
        return true;
    },
    
    _subscribeItemsCollection: function(collection, unsubscribe) {
        var m = unsubscribe? 'unsubscribe' : 'subscribe';
        collection[m]('spliceItems', this._handleItemsCollectionSpliceItems, this);
        if (this._subscribers['itemsChange']) collection[m]('itemsChange', this.outItemsChange, this);
    },
    
    _subscribeFirst_itemsChange: function() {
        if (this._itemsCollection)
            this._itemsCollection.subscribe('itemsChange', this.outItemsChange, this);
    },
    
    _unsubscribeLast_itemsChange: function() {
        if (this._itemsCollection)
            this._itemsCollection.unsubscribe('itemsChange', this.outItemsChange, this);
    },
    
    _handleItemsCollectionSpliceItems: function(index, cut, insert) {
        // TODO: remove old items; add new items; update order
    },

    /**
     * @returns {Amm.Collection}
     */
    getItemsCollection: function() { return this._itemsCollection; },

    outItemsCollectionChange: function(itemsCollection, oldItemsCollection) {
        this._out('itemsCollectionChange', itemsCollection, oldItemsCollection);
    },

    setElementPrototype: function(elementPrototype) {
        elementPrototype = elementPrototype || null;
        if (typeof elementPrototype !== 'object')
            throw Error("`elementPrototype` must be an object");
        var oldElementPrototype = this._elementPrototype;
        if (oldElementPrototype === elementPrototype) return;
        this._elementPrototype = elementPrototype;
        this.outElementPrototypeChange(elementPrototype, oldElementPrototype);
        return true;
    },

    getElementPrototype: function() { return this._elementPrototype; },

    outElementPrototypeChange: function(elementPrototype, oldElementPrototype) {
        this._out('elementPrototypeChange', elementPrototype, oldElementPrototype);
    },

    setItemProperty: function(itemProperty) {
        if (!itemProperty) itemProperty = null;
        var oldItemProperty = this._itemProperty;
        if (oldItemProperty === itemProperty) return;
        this._itemProperty = itemProperty;
        this.outItemPropertyChange(itemProperty, oldItemProperty);
        return true;
    },

    getItemProperty: function() { return this._itemProperty; },

    outItemPropertyChange: function(itemProperty, oldItemProperty) {
        this._out('itemPropertyChange', itemProperty, oldItemProperty);
    }

};

Amm.extend(Amm.Trait.Repeater, Amm.Trait.DisplayParent);

