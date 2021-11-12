/* global Amm */

Amm.Trait.Drag.ItemSource = function() {
};

Amm.Trait.Drag.ItemSource.prototype = {
    
    _dragCursor: 'grabbing',
    
    'DragItemSource': '__INTERFACE__',
    
    notifyDropItemSource: function(retHandled, itemDragExtra) {
        this.outDropItemSource(retHandled, itemDragExtra);
    },
    
    outDropItemSource: function(retHandled, itemDragExtra) {
        return this._out('dropItemSource', retHandled, itemDragExtra);
    },
    
    fillItemSourceInfo: function(dragNativeItem) {
        var info = new Amm.Drag.ItemInfo();
        this.outFillItemSourceInfo(dragNativeItem, info);
        return info;
    },
    
    outFillItemSourceInfo: function(dragNativeItem, itemInfo) {
        return this._out('fillItemSourceInfo', dragNativeItem, itemInfo);
    },
    
    notifyBeginItemDrag: function() {
        return this.outBeginItemDrag();
    },
    
    outBeginItemDrag: function() {
        return this._out('beginItemDrag');
    }
    
};

Amm.extend(Amm.Trait.Drag.ItemSource, Amm.Trait.Drag.Source);
