/* global Amm */

Amm.View.Html.Table.Cell = function(options) {
    Amm.View.Html.Visual.call(this, options);
};


Amm.View.Html.Table.Cell.prototype = {

    'Amm.View.Html.Table.Cell': '__CLASS__',
    
    requiredElementClass: 'Amm.Table.Cell',
    
    delay: 0,
    
    _savedWidth: '',
    
    _savedHeight: '',
    
    // TODO: scroll in most conservative way

    _getNodes: function(element, viewClassName) {
        if (!viewClassName) viewClassName = 'Amm.View.Abstract';
        return Amm.getProperty(
            element.getUniqueSubscribers(viewClassName),
            'htmlElement'
        );
    },
    
    /** 
     * checks if table has any view that has focus, and that view has 
     * other views of current cell - it is preferred that THAT view
     * become focused, and not ours
     */
    _hasBetterFocusCandidate: function(focus) {
        if (!focus || !this._element.table) return false;
        var myViews = this._element.getUniqueSubscribers('Amm.View.Html.Table.Cell');
        // cell view >> row view >> section view >> table view
        var myFocusPriority = this.parentView.parentView.parentView.focusPriority;
        var myElements = [];
        for (var i = 0, l = myViews.length; i < l; i++) {
            var otherFocusPriority = myViews[i].parentView.parentView.parentView.focusPriority;
            if (otherFocusPriority > myFocusPriority) return true;
            if (otherFocusPriority < myFocusPriority) continue;
            myElements.push(myViews[i].getHtmlElement());
        }
        if (myElements.length < 2) return false; // we have only one view
        var myElement = this._htmlElement;
        var tableElements = Amm.Array.unique(this._getNodes(this._element.table));
        if (tableElements.length < 2) return false;
        var focusParents = jQuery(focus).parents(),
            myParents = jQuery(myElement).parents();
        var betterFocusCandidate = jQuery(tableElements).filter(function(i, e) {
            return focusParents.is(e) && !myParents.is(e);
        });
        if (betterFocusCandidate.length) return true;
    },
    
    setVActive: function(active) {

        if (!active || !this._htmlElement) return;
        if (this._element.getActiveEditor()) return;
        
        // check if our element already has focus
        var focus = Amm.View.Html.getFocusedNode(), cellHasFocus = false;
        cellHasFocus = focus && Amm.findElement(focus, function(e) {
            return e === this._element;
        }, this);
        
        if (cellHasFocus) return; // we already have focus

        if (this._hasBetterFocusCandidate(focus)) {
            return;
        }
            
        Amm.View.Html.focusNode(this._htmlElement);
    },
    
    _handleElementBeginEdit: function() {
        var jq = jQuery(this._htmlElement).find('.cellContent');
        if (!jq.length) return;
        this._savedWidth = jq[0].style.width || '';
        this._savedHeight = jq[0].style.height || '';
        // innerWidth is fixed to lesser value since otherwise
        // multi-view auto-adjusting algo won't adjust whole column (its' width
        // already matches required width)
        jq.innerWidth(jq.innerWidth() - .4);
        jq.innerHeight(jq.innerHeight() - .4);
    },
    
    _handleElementEndEdit: function() {
        var jq = jQuery(this._htmlElement).find('.cellContent');
        jQuery(this._htmlElement).find('.cellContent').css('width', this._savedWidth);
        jQuery(this._htmlElement).find('.cellContent').css('height', this._savedHeight);
        this._savedWidth = '';
        this._savedHeight = '';
    },
    
    setVActiveEditor: function(editor) {
        
        if (!editor && this._element.getActive()) { // lost editor - try preserve focus
            this.setVActive(true);
        }
        if (editor) this._element.focusEditor();
        
    },
    
    setVId: function(id) {
        if (id) {
            jQuery(this._htmlElement).attr('data-col-id', id);
        } else {
            jQuery(this._htmlElement).removeAttr('data-col-id');
        }
    },

};

Amm.extend(Amm.View.Html.Table.Cell, Amm.View.Html.Visual);
