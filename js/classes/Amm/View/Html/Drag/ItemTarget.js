/* global Amm */

Amm.View.Html.Drag.ItemTarget = function(options) {
    this._allowedIntentsHash = {};
    Amm.View.Html.Drag.Target.call(this, options);
};

Amm.View.Html.Drag.ItemTarget.AXIS_X = 'x';
Amm.View.Html.Drag.ItemTarget.AXIS_Y = 'y';

Amm.View.Html.Drag.ItemTarget.prototype = {

    'Amm.View.Html.Drag.ItemTarget': '__CLASS__', 
    
    requiredElementInterfaces: ['DragTarget', 'DragItemTarget'],
    
    sourceItemRequirements: null,
    
    sourceElementRequirements: null,
    
    selfOnly: false,
    
    intentDetectAxis: Amm.View.Html.Drag.ItemTarget.AXIS_Y,
    
    intentOverThreshold: 0.25,
    
    elementIntentInsideClassPrefix: 'dragItemHasIntent dragItemHasIntent_',
    
    containerIntentInsideClassPrefix: 'dragItemHasIntent dragItemHasIntent_',
    
    intentClassPrefix: 'dragItemIntent dragItemIntent_',
    
    _alwaysLocateContainer: true,
    
    _itemDragExtra: null,
    
    _intent: null,
    
    _allowedIntentsHash: null,
    
    _lastDestInfo: null,
    
    _lastDragVectorInfo: null,

    _item: null,
    
    _itemContainer: null,

    _collectionContainer: null,    
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Drag.ItemTarget];
    },
    
    _handleElementCheckCanAcceptDragItem(itemDragExtra, ret) {
        if (this.sourceItemRequirements 
            && !Amm.meetsRequirements(itemDragExtra.item, this.sourceItemRequirements)) {
        
            ret.canAccept = false;
        } else if (this.sourceElementRequirements 
            && !Amm.meetsRequirements(itemDragExtra.getSession().getSource(), this.sourceElementRequirements)) {
            ret.canAccept = false;
        }
    },
    
    _handleElementDragTargetSessionChange: function(session, oldSession) {
        if (!session) {
            this._setItemDragExtra(null);
        } else {
            this._setItemDragExtra(session.getExtra('Amm.Drag.Extra.ItemDrag'));
        }
        Amm.subUnsub(session, oldSession, this, '_handleDragSession');
    },
    
    _setItemDragExtra: function(itemDragExtra) {
        var oldItemDragExtra = this._itemDragExtra;
        if (oldItemDragExtra === itemDragExtra) return;
        if (oldItemDragExtra) {
            if (this._element) this._element.notifyDropHoverEnd();
        }
        Amm.subUnsub(itemDragExtra, oldItemDragExtra, this, '_handleItemDragExtra');
        this._itemDragExtra = itemDragExtra;
        if (this._itemDragExtra) {
            this._allowedIntentsHash = this._itemDragExtra.getAllowedIntents(true);        
            if (this._element) this._element.notifyDropHoverStart(this._itemDragExtra);
        }
        return true;
    },
    
    _handleItemDragExtraAllowedIntentsChange: function(allowedIntents) {
        this._allowedIntentsHash = this._itemDragExtra.getAllowedIntents(true);
    },
    
    _handleItemDragExtraIntentChange: function(intent, oldIntent) {
        this._setIntent(intent);        
    },

    _getItemDragExtra: function() { return this._itemDragExtra; },
    
    _handleElementTargetNativeItemChange: function(nativeItem) {
        
        if (!nativeItem || !this._itemDragExtra) {
            this._setIntent(null);
            this._setItemContainer(null);
            this._setCollectionContainer(null);
            this._setItem(null);
            return;
        }
        
        var containerAllowed = !!this._allowedIntentsHash.container;
        
        var itemMatters = 
            this._allowedIntentsHash.over
            || this._allowedIntentsHash.before
            || this._allowedIntentsHash.after;
        
        this._neverLocateItem = !itemMatters;
        
        this._alwaysLocateContainer = containerAllowed;
        
        var destInfo = this._element.fillItemTargetInfo(nativeItem);
        
        if (destInfo.item === undefined || !itemMatters && destInfo.collection === undefined) {
            
            var shadow = this._itemDragExtra.getStaticDragShadowNativeElement();
            
            if (shadow && jQuery(nativeItem).closest(shadow).length) {
                destInfo.item = this._itemDragExtra.getItem();
                destInfo.itemNativeElement = shadow;
                destInfo.collection = this._itemDragExtra.getCollection();
                destInfo.containerNativeElement = this._itemDragExtra.getContainerNativeElement();
            } else {                            
        
                this._fillItemInfo(nativeItem, destInfo);
                
            }
        }
        
        // detect drag of item over itself
        if (destInfo.item && destInfo.item === this._itemDragExtra.getItem()
                && destInfo.collection && destInfo.collection === this._itemDragExtra.getCollection()) {
            destInfo.item = null;
            destInfo.collection = null;
        }
        
        this._lastDestInfo = destInfo;
        
        this._lastDragVectorInfo = null;
        
        if (!destInfo.item && !destInfo.collection) {
            this._lastIntentItem = null;
            this._setItem(null);
            this._setItemContainer(null);
            this._setCollectionContainer(null);
            destInfo.itemNativeElement = null;
            destInfo.collectionNativeElement = null;
            this._itemDragExtra.updateDestInfo(destInfo, Amm.Drag.Extra.ItemDrag.INTENT.NONE);
            return;
        }
        
        var intent = this._detectIntent(destInfo);
        
        if (intent === Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER) {
            destInfo.item = null;
            destInfo.itemNativeElement = null;
        }
        
        this._setItem(destInfo.item);
        this._setItemContainer(destInfo.itemNativeElement);
        this._setCollectionContainer(destInfo.collectionNativeElement);
        
        this._itemDragExtra.updateDestInfo(destInfo, intent);
        
    },
    
    _detectIntent: function(destInfo) {
        
        
        this._lastIntentItem = destInfo.item;
        
        if (!destInfo.item) {
            if (this._allowedIntentsHash.container && destInfo.collection) {
                return Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER;
            } else {
                return Amm.Drag.Extra.ItemDrag.INTENT.NONE;
            }
        }
        
        if (!(this._allowedIntentsHash.before || this._allowedIntentsHash.after)) {
            if (this._allowedIntentsHash.over) {
                return Amm.Drag.Extra.ItemDrag.INTENT.OVER;
            } else {
                return Amm.Drag.Extra.ItemDrag.INTENT.NONE;
            }
        }
        
        var canBefore = this._allowedIntentsHash.before;
        var canAfter = this._allowedIntentsHash.after;
        var canOver = this._allowedIntentsHash.over;
        
        if (canBefore && !canAfter && !canOver) return Amm.Drag.Extra.ItemDrag.INTENT.BEFORE;
        if (canAfter && !canBefore && !canOver) return Amm.Drag.Extra.ItemDrag.INTENT.AFTER;
        
        var srcCollection = this._itemDragExtra.getCollection();
        var destCollection = destInfo.collection;
        
        if (srcCollection && srcCollection === destCollection) {
            
            var srcIndex = srcCollection.indexOf(this._itemDragExtra.getItem());
            var destIndex = destCollection.indexOf(destInfo.item);
            if (srcIndex < destIndex) {
                if (!canOver) return Amm.Drag.Extra.ItemDrag.INTENT.AFTER;
                canBefore = false;
            } else {
                if (!canOver) return Amm.Drag.Extra.ItemDrag.INTENT.BEFORE;
                canAfter = false;
            }
            
        }
        
        var sectors = Amm.View.Html.Drag.getSectors(destInfo.itemNativeElement),
            threshold = this.intentOverThreshold,
            val;
        
        if (this.intentDetectAxis === Amm.View.Html.Drag.ItemTarget.AXIS_Y) {
            val = sectors[1];
        } else {
            val = sectors[0];
        }
        
        if (!canBefore) { // over and after
            if (val > threshold/2) return Amm.Drag.Extra.ItemDrag.INTENT.AFTER;
            return Amm.Drag.Extra.ItemDrag.INTENT.OVER;
        } else if (!canAfter) { // over and before
            if (val < -threshold/2) return Amm.Drag.Extra.ItemDrag.INTENT.BEFORE;
            return Amm.Drag.Extra.ItemDrag.INTENT.OVER;
        }
        
        if (canOver && this.intentOverThreshold && Math.abs(val) <= this.intentOverThreshold) {
            return Amm.Drag.Extra.ItemDrag.INTENT.OVER;
        }
        
        if (val < 0) return Amm.Drag.Extra.ItemDrag.INTENT.BEFORE;
        
        return Amm.Drag.Extra.ItemDrag.INTENT.AFTER;        
        
    },
    
    _handleDragSessionVectorChange: function() {
        if (this._allowedIntentsHash.before + this._allowedIntentsHash.after + this._allowedIntentsHash.hover < 2) return;
        if (!this._itemDragExtra) return;
        if (!this._lastDestInfo) return;
        if (this._lastDragVectorInfo && this._lastDragVectorInfo !== this._lastDestInfo) return;
        this._lastDragVectorInfo = this._lastDestInfo;
        this._setIntent(this._detectIntent(this._lastDestInfo));
    },
    
    _setIntent: function(intent) {
        intent = intent || Amm.Drag.Extra.ItemDrag.INTENT.NONE;
        var oldIntent = this._intent;
        if (oldIntent === intent) return;
        // remove old intent classes
        if (oldIntent) {
            if (this._item && this._item['ClassName'] === '__INTERFACE__') {
                this._updateIntentClass(this._item, this.intentClassPrefix, true);
            } else {
                this._updateIntentClass(this._itemContainer, this.intentClassPrefix, true);
            }
            if (this._collectionContainer) {
                this._updateIntentClass(
                    this._collectionContainer, 
                    oldIntent === Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER? 
                        this.intentClassPrefix : this.containerIntentInsideClassPrefix, 
                    true
                );
            }
            if (this._element['ClassName'] === '__INTERFACE__') {
                this._updateIntentClass(
                    this._element, 
                    oldIntent === Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER? 
                        this.intentClassPrefix : this.containerIntentInsideClassPrefix, 
                    true
                );
            }
        }
        this._intent = intent;
        if (this._itemDragExtra) {
            this._itemDragExtra.setIntent(intent);
        }
        if (intent) {
            if (intent !== Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER) {
                if (this._item && this._item['ClassName'] === '__INTERFACE__') {
                    this._updateIntentClass(this._item, this.intentClassPrefix);
                } else {
                    this._updateIntentClass(this._itemContainer, this.intentClassPrefix);
                }
            }
            if (this._collectionContainer) {
                this._updateIntentClass(
                    this._collectionContainer, 
                    intent === Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER? 
                        this.intentClassPrefix : this.containerIntentInsideClassPrefix, 
                );
            }
            if (this._element['ClassName'] === '__INTERFACE__') {
                this._updateIntentClass(
                    this._element, 
                    intent === Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER? 
                        this.intentClassPrefix : this.containerIntentInsideClassPrefix,
                );
            }
        }
        return true;
    },

    _getIntent: function() { return this._intent; },
    
    _handleItemDragExtraTargetItemChange: function(item) {
        this._setItem(item);
    },
    
    _setItem: function(item) {
        var oldItem = this._item;
        if (oldItem === item) return;
        if (oldItem && !(oldItem['ClassName'] === '__INTERFACE__') && this._itemContainer) {
            this._updateIntentClass(this._itemContainer, this.intentClassPrefix, true);
        }
        this._updateIntentClass(item, this.intentClassPrefix, oldItem);
        this._item = item;
        return true;
    },

    _getItem: function() { return this._item; },

    _setItemContainer: function(itemContainer) {
        var oldItemContainer = this._itemContainer;
        if (oldItemContainer === itemContainer) return;
        this._itemContainer = itemContainer;
        if (!(this._item && this._item['ClassName'] === '__INTERFACE__')) {
            this._updateIntentClass(itemContainer, this.intentClassPrefix, oldItemContainer);
        }
        return true;
    },

    _getItemContainer: function() { return this._itemContainer; },

    _setCollectionContainer: function(collectionContainer) {
        var oldCollectionContainer = this._collectionContainer;
        if (oldCollectionContainer === collectionContainer) return;
        this._collectionContainer = collectionContainer;
        if (this._intent === Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER) {
            this._updateIntentClass(collectionContainer, this.intentClassPrefix, oldCollectionContainer);
        } else if (this._intent) {
            this._updateIntentClass(collectionContainer, this.containerIntentInsideClassPrefix, oldCollectionContainer);
        }
        return true;
    },

    _getCollectionContainer: function() { return this._collectionContainer; },
    
    _updateIntentClass: function(what, prefix, remove) {
        
        if (!this._intent) return;
        
        if (!what) return;
        
        if (typeof prefix !== 'string' && !prefix) return;
        
        if (remove && typeof remove === 'object') {
            this._updateIntentClass(remove, prefix, true);
            remove = false;
        }
        
        var className = '' + prefix + this._intent;
        
        var curr = what['ClassName'] === '__INTERFACE__'? what.getClassName() : jQuery(what).attr('class');
        
        if (what['ClassName'] === '__INTERFACE__') what.setClassName(!remove, className);
        else if (('parentNode' in what) && ('tagName' in what) || what.jquery) {
            jQuery(what)[remove? 'removeClass' : 'addClass'](className);
        }
        
        var upd = what['ClassName'] === '__INTERFACE__'? what.getClassName() : jQuery(what).attr('class');
        
    },
    
};

Amm.extend(Amm.View.Html.Drag.ItemTarget, Amm.View.Html.Drag.ItemDragBase);
Amm.extend(Amm.View.Html.Drag.ItemTarget, Amm.View.Html.Drag.Target);
