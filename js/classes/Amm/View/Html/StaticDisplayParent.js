/* global Amm */

Amm.View.Html.StaticDisplayParent = function(options) {
    Amm.View.Html.DisplayParent.call(this, options);
};

Amm.View.Html.StaticDisplayParent.prototype = {

    'Amm.View.Html.StaticDisplayParent': '__CLASS__',
    
    _oldAllowAdd: null,
    _oldAllowDelete: null,
    _oldAllowChangeOrder: null,
    
    _scanForItems: function() {
        if (!this.scanForItems) {
            console.warn("Setting Amm.View.Html.StaticDisplayParent::scanForItems to FALSE has no effect; property was reset back to TRUE");
            this.scanForItems = true;
        }
        if (!this.scanForDisplayOrder) {
            console.warn("Setting Amm.View.Html.StaticDisplayParent::scanForDisplayOrder to FALSE has no effect; property was reset back to TRUE");
            this.scanForDisplayOrder = true;
        }
        return Amm.View.Html.DisplayParent.prototype._scanForItems.apply(this);
    },
    
    _beginObserveCollection: function() {
        this._oldAllowAdd = this._collection.getAllowAdd();
        this._oldAllowDelete = this._collection.getAllowDelete();
        this._oldAllowChangeOrder = this._collection.getAllowChangeOrder();
        
        // allow collection to be mutable
        if (!this._oldAllowAdd) this._collection.setAllowAdd(true);
        if (!this._oldAllowDelete) this._collection.setAllowDelete(true);
        if (!this._oldAllowChangeOrder) this._collection.setAllowChangeOrder(true);
        
        return Amm.View.Html.DisplayParent.prototype._beginObserveCollection.apply(this);
    },
    
    _freezeCollection: function() {
        this._collection.setAllowAdd(false);
        this._collection.setAllowDelete(false);
        this._collection.setAllowChangeOrder(false);
    },
    
    _endObserveCollection: function() {
        this._collection.setAllowAdd(this._oldAllowAdd);
        this._collection.setAllowDelete(this._oldAllowDelete);
        this._collection.setAllowChangeOrder(this._oldAllowChangeOrder);
        return Amm.View.Html.DisplayParent.prototype._endObserveCollection.apply(this);
    },
    
    _getHtmlElementsWithItems: function() {
        var attr = Amm.domHolderAttribute;
        var all = jQuery(this._htmlElement).find('['+ attr + ']');
        var res = all.not(all.find('['+ attr + ']'));
        return res;
    },
    
    _updateCollectionWithFoundItems: function(foundItems) {
        if (this._collection.length && !Amm.Array.equal(this._collection, foundItems)) {
            console.warn("Pre-populated display children are replaced by Amm.View.Html.StaticDisplayParent detection routine");
        }
        this._collection.setItems(foundItems);
        this._freezeCollection();
    },
    
    _rebuild: function() {
        // do nothing
    }    

};

Amm.extend(Amm.View.Html.StaticDisplayParent, Amm.View.Html.DisplayParent);