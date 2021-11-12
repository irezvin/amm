/* global Amm */

Amm.Drag.ItemDropHandler = function(options) {
    Amm.init(this, options);
};

Amm.Drag.ItemDropHandler.prototype = {
    
    'Amm.Drag.ItemDropHandler': '__CLASS__',
    
    rejectFromSourceBefore: false,
    
    rejectFromSourceAfter: true,
    
    notfyDropItemTarget: function(retHandled, itemDragExtra, itemTarget) {
        
        var srcCollection = itemDragExtra.getCollection();
        var srcItem = itemDragExtra.getItem();
        var targetCollection = itemDragExtra.getTargetCollection();
        var targetItem = itemDragExtra.getTargetItem();
        
        if (!targetCollection) {
            console.warn("Amm.Drag.ItemDropHandler: Target collection not provided");
            return;
        }
        
        var intent = itemDragExtra.getIntent();
        var targetIndex = targetItem? targetCollection.indexOf(targetItem) : -1;
        var srcIndex = srcCollection.indexOf(srcItem);
        
        if (srcCollection !== targetCollection && this.rejectFromSourceBefore) {
            if (srcIndex >= 0) {
                srcCollection.removeAtIndex(srcIndex);
            }
        }
        
        var shouldIndex = null;
        
        var srcIndexInTarget = targetCollection.indexOf(srcItem);
        
        if (targetIndex >= 0) {
            if (intent === Amm.Drag.Extra.ItemDrag.INTENT.BEFORE) {
                shouldIndex = targetIndex;
            } else {
                shouldIndex = targetIndex + 1;
            }
            if (srcIndexInTarget >= 0) {
                if (srcIndexInTarget < targetIndex) shouldIndex -= 1;
                targetCollection.moveItem(srcIndexInTarget, shouldIndex);
            } else {
                targetCollection.splice(shouldIndex, 0, srcItem);
            }
        } else if (targetCollection !== srcCollection) {
            targetCollection.push(srcItem);
        }
        if (srcCollection !== targetCollection && this.rejectFromSourceAfter) {
            if (srcIndex >= 0) {
                srcCollection.removeAtIndex(srcIndex);
            }
        }
        
        retHandled.handled = true;
    }
    
};