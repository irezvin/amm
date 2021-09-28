/* global Amm */

Amm.Trait.Drag.Source = function() {
};

Amm.Trait.Drag.Source.prototype = {
    
    'DragSource': '__INTERFACE__',
    
    _handleSelector: null,
    
    _dragSession: null,

    _dragCursor: null,

    setHandleSelector: function(handleSelector) {
        var oldHandleSelector = this._handleSelector;
        if (oldHandleSelector === handleSelector) return;
        this._handleSelector = handleSelector;
        this.outHandleSelectorChange(handleSelector, oldHandleSelector);
        return true;
    },

    getHandleSelector: function() { return this._handleSelector; },

    outHandleSelectorChange: function(handleSelector, oldHandleSelector) {
        this._out('handleSelectorChange', handleSelector, oldHandleSelector);
    },
    
    setDragSession: function(dragSession) {
        var oldDragSession = this._dragSession;
        if (oldDragSession === dragSession) return;
        this._dragSession = dragSession;
        this.outDragSessionChange(dragSession, oldDragSession);
        Amm.subUnsub(dragSession, oldDragSession, this, '_handleDragSession');
        if (this._dragCursor) dragSession.setCursor(this._dragCursor);
        return true;
    },

    getDragSession: function() { return this._dragSession; },

    outDragSessionChange: function(dragSession, oldDragSession) {
        this._out('dragSessionChange', dragSession, oldDragSession);
    },

    notifyDragStart: function(session) {
        this.setDragSession(session);
        this.outDragStart(session);
    },
    
    outDragStart: function(session) {
        this._out('dragStart', session);
    },
    
    _handleDragSessionVectorChange: function(newVector, oldVector) {
        return this.outDragVectorChange(newVector, oldVector);
    },
    
    outDragVectorChange: function(newVector, oldVector) {
        return this._out('dragVectorChange', newVector, oldVector);
    },
    
    _handleDragSessionNativeItemChange: function(dragNativeItem, oldDragNativeItem) {
        return this.outDragNativeItemChange(dragNativeItem, oldDragNativeItem);
    },
    
    outDragNativeItemChange: function(dragNativeItem, oldDragNativeItem) {
        return this._out('dragNativeItemChange', dragNativeItem, oldDragNativeItem);
    },
    
    _handleDragSessionTargetChange: function(target, oldTarget) {
        return this.outDragTargetChange(target, oldTarget);
    },
    
    outDragTargetChange: function(target, oldTarget) {
        return this._out('dragTargetChange', target, oldTarget);
    },
    
    _handleDragSessionTargetNativeItemChange: function(targetNativeItem, oldTargetNativeItem) {
        return this.outTargetNativeItemChange(targetNativeItem, oldTargetNativeItem);
    },
    
    outTargetNativeItemChange: function(targetNativeItem, oldTargetNativeItem) {
        return this._out('targetNativeItemChange', targetNativeItem, oldTargetNativeItem);
    },
    
    _handleDragSessionActiveChange: function(active) {
        if (!active) this.notifyDragSessionEnd(this._dragSession.getTarget(), this._dragSession.getNativeItem());
    },

    notifyDragSessionEnd: function(target, nativeItem) {
        this._callOwnMethods('_beforeDragEnd_', target, nativeItem);
        this.outDragEnd(target, nativeItem);
        this._dragSession.applyDragData(null, null, null);
        this.setDragSession(null);
    },
    
    outDragEnd: function(target, nativeItem) {
        return this._out('dragEnd', target, nativeItem);
    },
    
    setDragCursor: function(dragCursor) {
        var oldDragCursor = this._dragCursor;
        if (oldDragCursor === dragCursor) return;
        this._dragCursor = dragCursor;
        if (this._dragSession) this._dragSession.setCursor(this._dragCursor);
        this.outDragCursorChange(dragCursor, oldDragCursor);
        return true;
    },

    getDragCursor: function() { return this._dragCursor; },

    outDragCursorChange: function(dragCursor, oldDragCursor) {
        this._out('dragCursorChange', dragCursor, oldDragCursor);
    },
    
    _cleanup_AmmTraitDragSource: function() {
        if (this.getDragSession()) this.getDragSession().cancel();
    }
    
};
