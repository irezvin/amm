/* global Amm */

Amm.View.Html.Drag.ItemSource = function(options) {
    Amm.View.Html.Drag.Source.call(this, options);
};

Amm.View.Html.Drag.ItemSource.prototype = {

    'Amm.View.Html.Drag.ItemSource': '__CLASS__', 
    
    disablePointerEvents: false,
    
    requiredElementInterfaces: ['DragItemSource', 'DragSource'],
    
    draggingClass: 'dragItemDragging',
    
    dragFloatingClass: 'dragItemFloating',
    
    useDragShadow: true,
    
    useStaticDragShadow: true,
    
    shadowClass: 'dragItemShadow',
    
    staticShadowClass: 'dragItemStaticShadow',

    shadowCloneClass: 'dragItemShadowClone',
    
    dragShadowHtml: '<div></div>',
    
    cloneDragShadow: true,
    
    dragHandleSelector: null,
    
    dropSelector: null,
    
    _jqShadow: null,
    
    _bookmark: null,

    _dragHandle: null,

    _dragItemContainer: null,
    
    _jqDragItemContainer: null,

    _dragItemContainerDimensions: null,
    
    _savedDragItemContainerStyle: null,
    
    _srcInfo: null,
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Drag.ItemSource];
    },
    
    _handleElementDragStart: function() {
        
        var s = this._element.getDragSession(), 
            sni = s.getStartNativeItem(),
            handle = sni;
    
        if (this.dragHandleSelector) {
            handle = jQuery(sni).closest(this.dragHandleSelector);
            if (!handle.length) {
                s.cancel();
                return;
            }
            this._setDragHandle(handle);
        }
        
        var srcItem;
        
        var srcInfo = this._element.fillItemSourceInfo(sni);
        
        if (srcInfo.item) {
            srcItem = srcInfo.item;
        } else if (srcInfo.item === undefined) {
            this._fillItemInfo(sni, srcInfo);
            srcItem = srcInfo.item;
        }
        
        if (!srcItem) {
            s.cancel();
            return;
        } else {
            this._srcInfo = srcInfo;
        }
        
        var extra = new Amm.Drag.Extra.ItemDrag; 
        
        s.setExtra(extra);
        
        this._element.notifyBeginItemDrag();
        
        var srcContainer = srcInfo.itemNativeElement;
        
        if (srcContainer) this._setDragItemContainer(srcContainer);
        
        extra.beginDrag(srcInfo, this._jqShadow);
        
    },

    _setDragHandle: function(dragHandle) {
        var oldDragHandle = this._dragHandle;
        if (oldDragHandle === dragHandle) return;
        this._dragHandle = dragHandle;
        return true;
    },

    _getDragHandle: function() { return this._dragHandle; },
    
    _handleElementDragVectorChange: function(dragVector) {
        var moveElement = this.useStaticDragShadow? this._jqDragItemContainer : this._jqShadow;
        if (!moveElement) return;
        var offset = moveElement.offset();
        if (this.axis !== 'y') offset.left = dragVector.x1;
        if (this.axis !== 'x') offset.top = dragVector.y1;
        moveElement.offset(offset);
    },
    
    _handleElementDragEnd: function() {
        this._setDragItemContainer(null);
        this._setDragHandle(null);
    },

    _updateShadow: function() {
        if (!this._jqDragItemContainer) {
            if (this._jqShadow) this._jqShadow.remove();
            this._jqShadow = null;
            
            return;
        }
        
        if (!this._jqShadow) {
            if (this.cloneDragShadow) {
                this._jqShadow = this._jqDragItemContainer.clone()
                            .removeClass(this.dragFloatingClass)
                            .removeClass(this.draggingClass)
                            .addClass(this.shadowCloneClass);
                jQuery(this._bookmark).before(this._jqShadow);
            } else {
                this._jqShadow = jQuery('<div />');
                if (this.useStaticDragShadow) jQuery(this._bookmark).before(this._jqShadow);
                else jQuery(document.body).prepend(this._jqShadow);
            }
        }
        
        if (!this.cloneDragShadow && this._dragItemContainerDimensions) {
            this._jqShadow
            .width(this._dragItemContainerDimensions.width)
            .height(this._dragItemContainerDimensions.height);
            if (this.useStaticDragShadow) {
                this._jqShadow.css('marginTop', this._jqDragItemContainer.css('marginTop'));
                this._jqShadow.css('marginBottom', this._jqDragItemContainer.css('marginBottom'));
                this._jqShadow.css('marginLeft', this._jqDragItemContainer.css('marginLeft'));
                this._jqShadow.css('marginRight', this._jqDragItemContainer.css('marginRight'));
                
            }
        }
        if (this.useStaticDragShadow) {
            this._jqShadow.addClass(this.staticShadowClass);
        } else {
            this._jqShadow.addClass(this.shadowClass);
        }
    },

    _setDragItemContainer: function(dragItemContainer) {
        
        var oldDragItemContainer = this._dragItemContainer;
        var oldJqDragItemContainer = this._jqDragItemContainer;
        if (oldDragItemContainer === dragItemContainer) return;
        if (this._bookmark && this._bookmark.parentNode) {
            this._bookmark.parentNode.removeChild(this._bookmark);
            this._bookmark = null;
        }
        if (oldDragItemContainer && this._savedDragItemContainerStyle !== null) {
            oldJqDragItemContainer.attr('style', this._savedDragItemContainerStyle || null);
            this._savedDragItemContainerStyle = null;
            if (this.useStaticDragShadow) oldJqDragItemContainer.removeClass(this.dragFloatingClass);
        }
        if (dragItemContainer) {
            this._jqDragItemContainer = jQuery(dragItemContainer);
            this._bookmark = document.createTextNode('');
            this._jqDragItemContainer.before(this._bookmark);
            this._dragItemContainerDimensions = { 
                width: this._jqDragItemContainer.width(), 
                height: this._jqDragItemContainer.height(),
                outerWidth: this._jqDragItemContainer.outerWidth(true), 
                outerHeight: this._jqDragItemContainer.outerHeight(true),
            };
            if (this.useStaticDragShadow) {
                this._savedDragItemContainerStyle = this._jqDragItemContainer.attr('style');
                this._jqDragItemContainer
                    .width(this._dragItemContainerDimensions.width)
                    .height(this._dragItemContainerDimensions.height)
                    .addClass(this.dragFloatingClass);
            }
        } else {
            this._dragItemContainerDimensions = null;
            this._jqDragItemContainer = null;
        }
        if (this.draggingClass) {
            if (oldJqDragItemContainer) {
                oldJqDragItemContainer.removeClass(this.draggingClass);
            }
            if (dragItemContainer) {
                this._jqDragItemContainer.addClass(this.draggingClass);
            }
        }
        this._dragItemContainer = dragItemContainer;
        this._updateShadow();
        return true;
    },
    
    _getDragItemContainer: function() { return this._dragItemContainer; },
    
};

Amm.extend(Amm.View.Html.Drag.ItemSource, Amm.View.Html.Drag.ItemDragBase);
Amm.extend(Amm.View.Html.Drag.ItemSource, Amm.View.Html.Drag.Source);
