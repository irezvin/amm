/* global Amm */

Amm.View.Html.Drag.Reorder = function(options) {
    Amm.View.Html.Drag.Source.call(this, options);
};

Amm.View.Html.Drag.Reorder.AXIS_BOTH = 'both';
Amm.View.Html.Drag.Reorder.AXIS_X = 'x';
Amm.View.Html.Drag.Reorder.AXIS_Y = 'y';

Amm.View.Html.Drag.Reorder.prototype = {

    'Amm.View.Html.Drag.Reorder': '__CLASS__', 
    
    requiredElementInterfaces: ['DragReorder', 'DragSource'],
    
    dragHandleSelector: null,
    
    dragContainerSelector: null,
    
    draggingClass: 'reorderDragging',
    
    dragFloatingClass: 'reorderFloating',
    
    useDragShadow: true,
    
    moveDragContainer: true,
    
    dragShadowClass: 'reorderDragShadow',
    
    staticDragShadowClass: 'reorderStaticDragShadow',
    
    dragShadowHtml: '<div></div>',
    
    dropSelector: null,
    
    intentBeforeClass: 'reorderIntentBefore',
    
    intentAfterClass: 'reorderIntentAfter',
    
    axis: Amm.View.Html.Drag.Reorder.AXIS_BOTH,
    
    _jqShadow: null,
    
    _bookmark: null,

    _dragHandle: null,

    _dragContainer: null,
    
    _jqDragContainer: null,

    _dropContainer: null,
    
    _jqDropContainer: null,
    
    _dragContainerDimensions: null,
    
    _savedDragContainerStyle: null,
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Drag.Source, Amm.Trait.Drag.Reorder];
    },
    
    _handleElementDragStart: function() {
        
        var s = this._element.getDragSession(), sni = s.getStartNativeItem(),
            handle = sni;
    
        if (this.dragHandleSelector) {
            handle = jQuery(sni).closest(this.dragHandleSelector);
            if (!handle.length) {
                s.cancel();
                return;
            }
        }
        
        var srcItem;
        
        var srcInfo = this._element.detectDragSrc(sni);
        
        if (srcInfo.item) {
            srcItem = srcInfo.item;
        } else if (srcInfo.item === undefined) {
            srcItem = Amm.findElement(sni, this._element.getDragSrcItemRequirements(), this._element);
        }
        
        if (!srcItem) {
            s.cancel();
            return;
        }
        
        this._element.setDragSrcItem(srcItem);
        
        if (srcInfo.collection) this._element.setDragSrcCollection(srcInfo.collection);
        
        var srcContainer = srcInfo.container;
        
        if (!srcContainer) {
            if (this.dragContainerSelector) srcContaner = sni.closest(this.dragContainerSelector);
            else srcContainer = sni;
        }
        
        if (srcContainer) this._setDragContainer(srcContainer);
        
    },

    _setShadow: function(shadow) {
        var oldShadow = this._shadow;
        if (oldShadow === shadow) return;
        this._shadow = shadow;
        return true;
    },

    _getShadow: function() { return this._shadow; },

    _setDragHandle: function(dragHandle) {
        var oldDragHandle = this._dragHandle;
        if (oldDragHandle === dragHandle) return;
        this._dragHandle = dragHandle;
        return true;
    },

    _getDragHandle: function() { return this._dragHandle; },
    
    _handleElementDragVectorChange: function(dragVector) {
        var moveElement = this.moveDragContainer? this._jqDragContainer : this._jqShadow;
        if (!moveElement) return;
        var offset = moveElement.offset();
        if (this.axis !== 'y') offset.left = dragVector.x1;
        if (this.axis !== 'x') offset.top = dragVector.y1;
//        if (this._dropContainer) {
//            console.log(Amm.View.Html.Drag.getSectors(this._dropContainer));
//        }
        moveElement.offset(offset);
    },
    
    _handleElementDragEnd: function() {
        this._setDragContainer(null);
        this._setDropContainer(null);
    },

    _updateShadow: function() {
        if (!this._jqDragContainer) {
            if (this._jqShadow) this._jqShadow.remove();
            this._jqShadow = null;
            return;
        }
        if (!this._jqShadow) {
            this._jqShadow = jQuery('<div />');
            if (this.moveDragContainer) jQuery(this._bookmark).before(this._jqShadow);
            else jQuery(document.body).prepend(this._jqShadow);
        }
        
        if (this.moveDragContainer) this._jqShadow.attr('class', this.staticDragShadowClass);
        else this._jqShadow.attr('class', this.dragShadowClass);
        if (this._dragContainerDimensions) {
            this._jqShadow
            .width(this._dragContainerDimensions.width)
            .height(this._dragContainerDimensions.height);
            if (this.moveDragContainer) {
                this._jqShadow.css('marginTop', this._jqDragContainer.css('marginTop'));
                this._jqShadow.css('marginBottom', this._jqDragContainer.css('marginBottom'));
                this._jqShadow.css('marginLeft', this._jqDragContainer.css('marginLeft'));
                this._jqShadow.css('marginRight', this._jqDragContainer.css('marginRight'));
                
            }
        }
    },

    _setDragContainer: function(dragContainer) {
        var oldDragContainer = this._dragContainer;
        var oldJqDragContainer = this._jqDragContainer;
        if (oldDragContainer === dragContainer) return;
        if (this._bookmark) {
            this._bookmark.parentNode.removeChild(this._bookmark);
            this._bookmark = null;
        }
        if (oldDragContainer && this._savedDragContainerStyle !== null) {
            oldJqDragContainer.attr('style', this._savedDragContainerStyle);
            this._savedDragContainerStyle = null;
            if (this.moveDragContainer) oldJqDragContainer.removeClass(this.dragFloatingClass);
        }
        if (dragContainer) {
            this._jqDragContainer = jQuery(dragContainer);
            this._bookmark = document.createTextNode('');
            this._jqDragContainer.before(this._bookmark);
            this._dragContainerDimensions = { 
                width: this._jqDragContainer.width(), 
                height: this._jqDragContainer.height(),
                outerWidth: this._jqDragContainer.outerWidth(true), 
                outerHeight: this._jqDragContainer.outerHeight(true),
            };
            if (this.moveDragContainer) {
                this._savedDragContainerStyle = this._jqDragContainer.attr('style');
                this._jqDragContainer
                    .width(this._dragContainerDimensions.width)
                    .height(this._dragContainerDimensions.height)
                    .addClass(this.dragFloatingClass);
            }
        } else {
            this._dragContainerDimensions = null;
            this._jqDragContainer = null;
        }
        if (this.draggingClass) {
            if (oldJqDragContainer) {
                oldJqDragContainer.removeClass(this.draggingClass);
            }
            if (dragContainer) {
                this._jqDragContainer.addClass(this.draggingClass);
            }
        }
        this._dragContainer = dragContainer;
        this._updateShadow();
        return true;
    },
    
    _getDragContainer: function() { return this._dragContainer; },

    _setDropContainer: function(dropContainer) {
        var oldDropContainer = this._dropContainer, 
            oldJqDropContainer = this._jqDropContainer;
        if (oldDropContainer === dropContainer) return;
        this._jqDropContainer = dropContainer? jQuery(dropContainer) : null;
        this._dropContainer = dropContainer || null;
        
        if (oldJqDropContainer) {
            if (this.intentBeforeClass) oldJqDropContainer.removeClass(this.intentBeforeClass);
            if (this.intentAfterClass) oldJqDropContainer.removeClass(this.intentAfterClass);
        }
        
        if (this._jqDropContainer) {
            if (this.intentBeforeClass) this._jqDropContainer.addClass(this.intentBeforeClass);
        }
        
        return true;
    },

    _getDropContainer: function() { return this._dropContainer; },
    
    _handleElementDragNativeItemChange: function(nativeItem) {
        
        if (!nativeItem) {
            this._element.setDragDestItem(null);
            this._setDropContainer(null);
            return;
        }
        
        var destInfo = this._element.detectDragDest(nativeItem);
        var destItem;
        if (destInfo.item) {
            destItem = destInfo.item;
        } else if (destInfo.item === undefined) {
            destItem = Amm.findElement(nativeItem, this._element.getDragDestItemRequirements(), this._element);
        }
        
        if (destItem && this._element.getDragSrcItem() === destItem) destItem = null;
        
        this._element.setDragDestItem(destItem);
        
        if (!destItem) {
            this._setDropContainer(null);
            return;
        }
        
        if (destInfo.collection) this._element.setDragDestCollection(destInfo.collection);
        
        var destContainer = destInfo.container;
        
        if (!destContainer) {
            if (this.dropContainerSelector) destContaner = nativeItem.closest(this.dropContainerSelector);
            else destContainer = nativeItem;
        }
        
        if (destContainer) {
            this._setDropContainer(destContainer);
        }
        
    }

};

Amm.extend(Amm.View.Html.Drag.Reorder, Amm.View.Html.Drag.Source);
