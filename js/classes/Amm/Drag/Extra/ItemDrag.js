/* global Amm */

Amm.Drag.Extra.ItemDrag = function(options) {
    this._allowedIntents = [];
    Amm.Drag.Extra.call(this, options);
};

Amm.Drag.Extra.ItemDrag.INTENT = {
    NONE:       '',
    OVER:       'over',
    BEFORE:     'before',
    AFTER:      'after',
    CONTAINER:  'container'
};

Amm.Drag.Extra.ItemDrag._INTENT = {
    '':             Amm.Drag.Extra.ItemDrag.INTENT.NONE,
    'over':         Amm.Drag.Extra.ItemDrag.INTENT.OVER,
    'before':       Amm.Drag.Extra.ItemDrag.INTENT.BEFORE,
    'after':        Amm.Drag.Extra.ItemDrag.INTENT.AFTER,
    'container':    Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER
};

Amm.Drag.Extra.ItemDrag._ALLOWED_INTENTS = [
    Amm.Drag.Extra.ItemDrag.INTENT.OVER,
    Amm.Drag.Extra.ItemDrag.INTENT.BEFORE,
    Amm.Drag.Extra.ItemDrag.INTENT.AFTER,
    Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER
];


Amm.Drag.Extra.ItemDrag.prototype = {
  
    'Amm.Drag.Extra.ItemDrag': '__CLASS__',

    _item: null,

    _otherItems: null,

    _collection: null,

    _itemNativeElement: null,

    _containerNativeElement: null,

    _targetItem: null,

    _targetItemNativeElement: null,

    _targetCollection: null,

    _targetContainerNativeElement: null,
    
    _allowedIntents: null,

    _intent: null,

    _staticDragShadowNativeElement: null,
    
    _beganDrag: false,
    
    beginDrag: function(srcInfo, staticDragShadowNativeElement) {
        if (this._beganDrag) throw Error("Can beginDrag() only once");
        this._beganDrag = true;
        Amm.is(srcInfo, 'Amm.Drag.ItemInfo', 'info');
        this._updateMany({
            item: srcInfo.item || null,
            itemNativeElement: srcInfo.itemNativeElement || null,
            otherItems: srcInfo.otherItems || [],
            collection: srcInfo.collection || null,
            containerNativeElement: srcInfo.containerNativeElement || null,
            staticDragShadowNativeElement: staticDragShadowNativeElement || null
        });
    },
    
    reportDestUnsupported: function() {
        this.setCanAccept(false);
        this.setAllowedIntents(null);
    },
    
    reportDestSupported: function(allowedIntents) {
        this._updateMany({
            canAccept: true,
            itemMatters: !!itemMatters,
            itemRequired: !!itemRequired,
            orderMatters: !!orderMatters,
        });
        this.outDragStage('destSupported');
    },
    
    updateDestInfo: function(info, intent) {
        intent = intent || Amm.Drag.Extra.ItemDrag.INTENT.NONE;
        Amm.is(info, 'Amm.Drag.ItemInfo', 'info');
        if (!(intent in Amm.Drag.Extra.ItemDrag._INTENT)) {
            throw Error("`intent` must be one of Amm.Drag.Extra.ItemDrag.INTENT constants, provided: " + Amm.describeType(intent) + " '" + intent + "'");
        }
        this._updateMany({
            intent: intent,
            targetItem: info.item || null,
            targetItemNativeElement: info.itemNativeElement || null,
            targetCollection: info.collection || null,
            targetContainerNativeElement: info.containerNativeElement || null
        });
        this.outDragStage('destHover');
    },
    
    outDragStage: function(stage) {
        return this._out('dragStage', stage);
    },
    
    _updateMany: function(props) {
        var old = {};
        var i;
        for (i in props) if (props.hasOwnProperty(i)) {
            var priv = '_' + i;
            if (this[priv] !== props[i]) {
                old[i] = this[priv];
                this[priv] = props[i];
            }
        }
        for (i in old) if (old.hasOwnProperty(i)) {
            this['out' + Amm.ucFirst(i) + 'Change'](this['_' + i], old[i]);
        }
    },
    
    setItem: function(item) {
        var oldItem = this._item;
        if (oldItem === item) return;
        this._item = item;
        this.outItemChange(item, oldItem);
        return true;
    },

    getItem: function() { return this._item; },

    outItemChange: function(item, oldItem) {
        this._out('itemChange', item, oldItem);
    },

    setOtherItems: function(otherItems) {
        var oldOtherItems = this._otherItems;
        if (oldOtherItems === otherItems) return;
        this._otherItems = otherItems;
        this.outOtherItemsChange(otherItems, oldOtherItems);
        return true;
    },

    getOtherItems: function() { return this._otherItems; },

    outOtherItemsChange: function(otherItems, oldOtherItems) {
        this._out('otherItemsChange', otherItems, oldOtherItems);
    },

    setCollection: function(collection) {
        var oldCollection = this._collection;
        if (oldCollection === collection) return;
        this._collection = collection;
        this.outCollectionChange(collection, oldCollection);
        return true;
    },

    getCollection: function() { return this._collection; },

    outCollectionChange: function(collection, oldCollection) {
        this._out('collectionChange', collection, oldCollection);
    },
    
    
    setItemNativeElement: function(itemNativeElement) {
        var oldItemNativeElement = this._itemNativeElement;
        if (oldItemNativeElement === itemNativeElement) return;
        this._itemNativeElement = itemNativeElement;
        this.outItemNativeElementChange(itemNativeElement, oldItemNativeElement);
        return true;
    },

    getItemNativeElement: function() { return this._itemNativeElement; },

    outItemNativeElementChange: function(itemNativeElement, oldItemNativeElement) {
        this._out('itemNativeElementChange', itemNativeElement, oldItemNativeElement);
    },

    setContainerNativeElement: function(containerNativeElement) {
        var oldContainerNativeElement = this._containerNativeElement;
        if (oldContainerNativeElement === containerNativeElement) return;
        this._containerNativeElement = containerNativeElement;
        this.outContainerNativeElementChange(containerNativeElement, oldContainerNativeElement);
        return true;
    },

    getContainerNativeElement: function() { return this._containerNativeElement; },

    outContainerNativeElementChange: function(containerNativeElement, oldContainerNativeElement) {
        this._out('containerNativeElementChange', containerNativeElement, oldContainerNativeElement);
    },

    setCanAccept: function(canAccept) {
        var oldCanAccept = this._canAccept;
        if (oldCanAccept === canAccept) return;
        this._canAccept = canAccept;
        this.outCanAcceptChange(canAccept, oldCanAccept);
        return true;
    },

    getCanAccept: function() { return this._canAccept; },

    outCanAcceptChange: function(canAccept, oldCanAccept) {
        this._out('canAcceptChange', canAccept, oldCanAccept);
    },

    setIntent: function(intent) {
        if (!(intent in Amm.Drag.Extra.ItemDrag._INTENT)) {
            throw Error("Invalid `intent` value: '" + intent + "'");
        }
        var oldIntent = this._intent;
        if (oldIntent === intent) return;
        this._intent = intent;
        this.outIntentChange(intent, oldIntent);
        return true;
    },

    getIntent: function() { return this._intent; },

    outIntentChange: function(intent, oldIntent) {
        this._out('intentChange', intent, oldIntent);
    },

    setTargetItem: function(targetItem) {
        var oldTargetItem = this._targetItem;
        if (oldTargetItem === targetItem) return;
        this._targetItem = targetItem;
        this.outTargetItemChange(targetItem, oldTargetItem);
        return true;
    },

    getTargetItem: function() { return this._targetItem; },

    outTargetItemChange: function(targetItem, oldTargetItem) {
        this._out('targetItemChange', targetItem, oldTargetItem);
    },

    setTargetItemNativeElement: function(targetItemNativeElement) {
        var oldTargetItemNativeElement = this._targetItemNativeElement;
        if (oldTargetItemNativeElement === targetItemNativeElement) return;
        this._targetItemNativeElement = targetItemNativeElement;
        this.outTargetItemNativeElementChange(targetItemNativeElement, oldTargetItemNativeElement);
        return true;
    },

    getTargetItemNativeElement: function() { return this._targetItemNativeElement; },

    outTargetItemNativeElementChange: function(targetItemNativeElement, oldTargetItemNativeElement) {
        this._out('targetItemNativeElementChange', targetItemNativeElement, oldTargetItemNativeElement);
    },

    setTargetCollection: function(targetCollection) {
        var oldTargetCollection = this._targetCollection;
        if (oldTargetCollection === targetCollection) return;
        this._targetCollection = targetCollection;
        this.outTargetCollectionChange(targetCollection, oldTargetCollection);
        return true;
    },

    getTargetCollection: function() { return this._targetCollection; },

    outTargetCollectionChange: function(targetCollection, oldTargetCollection) {
        this._out('targetCollectionChange', targetCollection, oldTargetCollection);
    },

    setTargetContainerNativeElement: function(targetContainerNativeElement) {
        var oldTargetContainerNativeElement = this._targetContainerNativeElement;
        if (oldTargetContainerNativeElement === targetContainerNativeElement) return;
        this._targetContainerNativeElement = targetContainerNativeElement;
        this.outTargetContainerNativeElementChange(targetContainerNativeElement, oldTargetContainerNativeElement);
        return true;
    },

    getTargetContainerNativeElement: function() { return this._targetContainerNativeElement; },

    outTargetContainerNativeElementChange: function(targetContainerNativeElement, oldTargetContainerNativeElement) {
        this._out('targetContainerNativeElementChange', targetContainerNativeElement, oldTargetContainerNativeElement);
    },
    
    setStaticDragShadowNativeElement: function(staticDragShadowNativeElement) {
        var oldStaticDragShadowNativeElement = this._staticDragShadowNativeElement;
        if (oldStaticDragShadowNativeElement === staticDragShadowNativeElement) return;
        this._staticDragShadowNativeElement = staticDragShadowNativeElement;
        return true;
    },

    getStaticDragShadowNativeElement: function() { return this._staticDragShadowNativeElement; },
    
    outStaticDragShadowNativeElementChange: function(staticDragShadowNativeElement, oldStaticDragShadowNativeElement) {
        this._out('staticDragShadowNativeElementChange', staticDragShadowNativeElement, oldStaticDragShadowNativeElement);
    },
    
    _chkIntents: function(intents) {
        if (!intents) intents = [];
        else if (typeof intents === 'string') intents = intents.split(/[\s,;]+/);
        else if (intents instanceof Array) intents = intents.slice();
        else throw Error("`intents` must be a string or an Array");
        var d = Amm.Array.diff(intents, Amm.Drag.Extra.ItemDrag._ALLOWED_INTENTS);
        if (d.length) throw Error("Unknown intent value(s): '" + d.join("', '"));
        intents.sort();
        return intents;
    },
    
    setAllowedIntents: function(allowedIntentsOrToggle, intent) {
        var oldAllowedIntents = this._allowedIntents;
        var allowedIntents;
        if (intent) {
            intent = this._chkIntents(intent);
            if (allowedIntentsOrToggle) {
                allowedIntents = Amm.Array.unique(this._allowedIntents.concat(intent));
            } else {
                allowedIntents = Amm.Array.diff(this._allowedIntents, intent);
            }
        } else {
            allowedIntents = this._chkIntents(allowedIntentsOrToggle);
        }
        if (Amm.Array.equal(allowedIntents, oldAllowedIntents)) return;
        this._allowedIntents = allowedIntents;
        this.outAllowedIntentsChange(allowedIntents, oldAllowedIntents);
        return true;
    },

    getAllowedIntents: function(allowedIntentOrAsHash) {
        if (allowedIntentOrAsHash === true) {
            var res = {};
            for (var i = 0, l = this._allowedIntents.length; i < l; i++) {
                res[this._allowedIntents[i]] = true;
            }
            return res;
        } else if (allowedIntentOrAsHash) {
            var diff = Amm.Array.diff(this._allowedIntents, this._chkIntents(allowedIntentOrAsHash));
            return !diff.length;
        }
        return this._allowedIntents.slice(); 
    },

    outAllowedIntentsChange: function(allowedIntents, oldAllowedIntents) {
        this._out('allowedIntentsChange', allowedIntents, oldAllowedIntents);
    },
    
    _handleSessionEnd: function() {
        
        if (!this._intent) return;
        
        var retHandled = {handled: false};
        this.outDrop(retHandled);
        if (retHandled.handled) return; // all ok
        var source = this._session.getSource();            
        var target = this._session.getTarget();
        if (source.notifyDropItemSource) {
            source.notifyDropItemSource(retHandled, this);
        }
        if (retHandled.handled) return;
        if (target && target.notifyDropItemTarget) {
            target.notifyDropItemTarget(retHandled, this);
        }
    },
    
    outDrop: function(retHandled) {
        retHandled = retHandled || {handled: false};
        return this._out('drop', retHandled);
    }
    
};

Amm.extend(Amm.Drag.Extra.ItemDrag, Amm.Drag.Extra);