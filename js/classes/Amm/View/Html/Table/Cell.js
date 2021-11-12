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
    
    setVActive: function(active) {

        if (!active || !this._htmlElement) return;
        if (!this._element.getActiveEditor()) {
            this._htmlElement.focus();
        }
        
    },
    
    _handleElementBeginEdit: function() {
        var jq = jQuery(this._htmlElement).find('.cellContent');
        if (!jq.length) return;
        this._savedWidth = jq[0].style.width || '';
        this._savedHeight = jq[0].style.height || '';
        jq.innerWidth(jq.innerWidth());
        jq.innerHeight(jq.innerHeight());
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
            //Amm.getRoot().defer(function() {
            //    if (this._element.getActive()) this.setVActive(true);
            //}
        }
        if (editor && editor.focus) editor.focus();
        
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
