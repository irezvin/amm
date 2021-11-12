/* global Amm */

Amm.Trait.Drag.ItemTarget = function() {
};

Amm.Trait.Drag.ItemTarget.prototype = {
    
    'DragItemTarget': '__INTERFACE__',
    
    _intents: 'over,before,after,container',    
    
    _itemDragExtra: null,
    
    defaultDropItemTargetHandler: {class: 'Amm.Drag.ItemDropHandler'},
    
    notifyDropItemTarget: function(retHandled, itemDragExtra) {
        this.outDropItemTarget(retHandled, itemDragExtra);
        if (retHandled.handled) return;
        if (this.defaultDropItemTargetHandler) {
            if (typeof this.defaultDropItemTargetHandler === 'function') {
                this.defaultDropItemTargetHandler(retHandled, itemDragExtra, this);
            } else {
                var defaultHandler = Amm.constructInstance(this.defaultDropItemTargetHandler);
                defaultHandler.notfyDropItemTarget(retHandled, itemDragExtra, this);
            }
        }
    },
    
    outDropItemTarget: function(retHandled, itemDragExtra) {
        return this._out('dropItemTarget', retHandled, itemDragExtra);
    },

    canAcceptDrop: function(session, dragSource, targetNativeItem) {
        var extra = session.getExtra('Amm.Drag.Extra.ItemDrag');
        if (!extra) return false;
        var res = this.checkCanAcceptDragItem(extra);
        if (res === undefined) res = true;
        return res;
    },

    setIntents: function(intents) {
        var oldIntents = this._intents;
        if (oldIntents === intents) return;
        this._intents = intents;
        return true;
    },

    getIntents: function() { return this._intents; },
    
    fillItemTargetInfo: function(nativeTargetItem) {
        var itemTargetInfo = new Amm.Drag.ItemInfo();
        this.outFillItemTargetInfo(nativeTargetItem, itemTargetInfo);
        return itemTargetInfo;
    },
    
    outFillItemTargetInfo: function(nativeTargetItem, itemTargetInfo) {
        return this._out('fillItemTargetInfo', nativeTargetItem, itemTargetInfo);
    },
    
    checkCanAcceptDragItem: function(itemDragExtra) {
        var ret = { canAccept: undefined };
        this.outCheckCanAcceptDragItem(itemDragExtra, ret);
        return ret.canAccept;
    },
    
    outCheckCanAcceptDragItem: function(itemDragExtra, ret) {
        return this._out('checkCanAcceptDragItem', itemDragExtra, ret);
    },
    
    notifyDropHoverStart: function(itemDragExtra) {
        this.setItemDragExtra(itemDragExtra);
        if (this._intents !== null) {
            itemDragExtra.setAllowedIntents(this._intents);
        }
        this.outDropHoverStart(itemDragExtra);
    },
    
    outDropHoverStart: function(itemDragExtra) {
        return this._out('dropHoverStart', itemDragExtra);
    },
    
    notifyDropHoverEnd: function() {
        this.outDropHoverEnd();
        this.setItemDragExtra(null);
    },
    
    outDropHoverEnd: function() {
        return this._out('dropHoverEnd');
    },
    
    setItemDragExtra: function(itemDragExtra) {
        var oldItemDragExtra = this._itemDragExtra;
        if (oldItemDragExtra === itemDragExtra) return;
        this._itemDragExtra = itemDragExtra;
        this.outItemDragExtraChange(itemDragExtra, oldItemDragExtra);
        return true;
    },

    getItemDragExtra: function() { return this._itemDragExtra; },

    outItemDragExtraChange: function(itemDragExtra, oldItemDragExtra) {
        this._out('itemDragExtraChange', itemDragExtra, oldItemDragExtra);
    },
    
};

Amm.extend(Amm.Trait.Drag.ItemTarget, Amm.Trait.Drag.Target);
