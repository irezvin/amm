/* global Amm */

Amm.Trait.Drag.Target = function() {
};

Amm.Trait.Drag.Target.prototype = {
    
    'DragTarget': '__INTERFACE__',
    
    _dropEnabled: true,
       
    _dragSession: null,

    _dragSource: null,

    _sourceNativeItem: null,

    _targetNativeItem: null,
    
    canAcceptDrop: function(session, dragSource, targetNativeItem) {
        return true;
    },

    setDropEnabled: function(dropEnabled) {
        var oldDropEnabled = this._dropEnabled;
        if (oldDropEnabled === dropEnabled) return;
        this._dropEnabled = dropEnabled;
        this.outDropEnabledChange(dropEnabled, oldDropEnabled);
        return true;
    },

    getDropEnabled: function() { return this._dropEnabled; },

    outDropEnabledChange: function(dropEnabled, oldDropEnabled) {
        this._out('dropEnabledChange', dropEnabled, oldDropEnabled);
    },
    
    setDragSession: function(dragSession) {
        var oldDragSession = this._dragSession;
        if (oldDragSession === dragSession) return;
        this._dragSession = dragSession;
        this.outDragSessionChange(dragSession, oldDragSession);
        return true;
    },

    getDragSession: function() { return this._dragSession; },

    outDragSessionChange: function(dragSession, oldDragSession) {
        this._out('dragSessionChange', dragSession, oldDragSession);
    },

    setDragSource: function(dragSource) {
        var oldDragSource = this._dragSource;
        if (oldDragSource === dragSource) return;
        this._dragSource = dragSource;
        this.outDragSourceChange(dragSource, oldDragSource);
        return true;
    },

    getDragSource: function() { return this._dragSource; },

    outDragSourceChange: function(dragSource, oldDragSource) {
        this._out('dragSourceChange', dragSource, oldDragSource);
    },

    setSourceNativeItem: function(sourceNativeItem) {
        var oldSourceNativeItem = this._sourceNativeItem;
        if (oldSourceNativeItem === sourceNativeItem) return;
        this._sourceNativeItem = sourceNativeItem;
        this.outSourceNativeItemChange(sourceNativeItem, oldSourceNativeItem);
        return true;
    },

    getSourceNativeItem: function() { return this._sourceNativeItem; },

    outSourceNativeItemChange: function(sourceNativeItem, oldSourceNativeItem) {
        this._out('sourceNativeItemChange', sourceNativeItem, oldSourceNativeItem);
    },

    setTargetNativeItem: function(targetNativeItem) {
        var oldTargetNativeItem = this._targetNativeItem;
        if (oldTargetNativeItem === targetNativeItem) return;
        this._targetNativeItem = targetNativeItem;
        this.outTargetNativeItemChange(targetNativeItem, oldTargetNativeItem);
        return true;
    },

    getTargetNativeItem: function() { return this._targetNativeItem; },

    outTargetNativeItemChange: function(targetNativeItem, oldTargetNativeItem) {
        this._out('targetNativeItemChange', targetNativeItem, oldTargetNativeItem);
    },
    
    setDragInfo(dragSource, sourceNativeItem, targetNativeItem) {
        var oldDragSource = this._dragSource;
        var oldSourceNativeItem = this._sourceNativeItem;
        var oldTargetNativeItem = this._targetNativeItem;
        this._dragSource = dragSource;
        this._sourceNativeItem = sourceNativeItem;
        this._targetNativeItem = targetNativeItem;
        if (dragSource !== oldDragSource) {
            this.outDragSourceChange(dragSource, oldDragSource);
        }
        if (sourceNativeItem !== oldSourceNativeItem) {
            this.outSourceNativeItemChange(sourceNativeItem, oldSourceNativeItem);
        }
        if (targetNativeItem !== oldTargetNativeItem) {
            this.outTargetNativeItemChange(targetNativeItem, oldTargetNativeItem);
        }
        return true;
    },

    notifyDrop: function(session) {
        this.outDrop(session);
    },
    
    outDrop: function(session) {
        return this._out('drop', session);
    }
    
};
