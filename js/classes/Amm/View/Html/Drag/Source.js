/* global Amm */

Amm.View.Html.Drag.Source = function(options) {
    Amm.View.Html.Drag.call(this, options);
};

Amm.View.Html.Drag.Source.prototype = {

    'Amm.View.Html.Drag.Source': '__CLASS__', 
    
    requiredElementInterfaces: ['DragSource'],
    
    _mouseDownHandler: null,
    
    _handleSelector: null,
    
    _pointerEvents: null,
    
    disablePointerEvents: true,
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Drag.Source];
    },
    
    setVHandleSelector: function(handleSelector) {
        if (!this._mouseDownHandler) {
            this._handleSelector = handleSelector;
            return;
        }
        this._unregMousedown();
        this._handleSelector = handleSelector;
        this._regMousedown();
    },
    
    _tryObserve: function() {
        var r = Amm.View.Abstract.prototype._tryObserve.apply(this);
        if (!r) return r;
        this._regMousedown();
        return r;
    },
    
    _regMousedown: function() {
        var t = this;
        this._mouseDownHandler = function(event) {
            if (event.button && event.button !== 1) return;
            t.getDragControllerView().registerDragIntent(event, t);
        };
        if (this._handleSelector) {
            jQuery(this._htmlElement).on('mousedown pointerdown', this._handleSelector, this._mouseDownHandler);
        } else {
            jQuery(this._htmlElement).on('mousedown pointerdown', this._mouseDownHandler);
        }
    },
    
    _unregMousedown: function() {
        if (!this._mouseDownHandler) return;
        if (this._handleSelector) {
            jQuery(this._htmlElement).off('mousedown pointerdown', this._handleSelector, this._mouseDownHandler);
        } else {
            jQuery(this._htmlElement).off('mousedown pointerdown', this._mouseDownHandler);
        }
        this._mouseDownHandler = null;
    },
    
    _endObserve: function() {
        Amm.View.Abstract.prototype._endObserve.apply(this);
        this._unregMousedown();
    },
    
    _handleElementDragStart: function() {
        
        /* 
         * it is possible that session is cancelled during the dragStart handlers that occur before
         * current view handles them. In that case dragEnd will occur before dragStart, and 
         * this._element.getDragSession() will be null (or will not be active).
         */
        var sess = this._element.getDragSession();
        if (!sess || !sess.getActive() || sess.getSourceView() !== this) return;
        if (this.disablePointerEvents) {
            this._pointerEvents = jQuery(this._htmlElement).css('pointerEvents');
            jQuery(this._htmlElement).css('pointerEvents', 'none');
        } else {
            this._pointerEvents = false;
        }
        return true;
    },
    
    _handleElementDragEnd: function() {
        if (this._pointerEvents !== false) {
            jQuery(this._htmlElement).css('pointerEvents', this._pointerEvents);
        }
    },
    
    setDragCursor: function(dragCursor) {
        var oldDragCursor = this._dragCursor;
        if (oldDragCursor === dragCursor) return;
        this._dragCursor = dragCursor;
        this.outDragCursorChange(dragCursor, oldDragCursor);
        return true;
    },

};

Amm.extend(Amm.View.Html.Drag.Source, Amm.View.Html.Drag);

