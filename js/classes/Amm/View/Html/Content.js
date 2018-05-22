/* global Amm */

/**
 * Subscribes to change, focus, blur events.
 * jQuery to Element: value, focus
 * Element to JQuery: value, focus, readOnly, enabled
 */
Amm.View.Html.Content = function(options) {
    Amm.View.Abstract.Content.call(this, options);
    Amm.DomHolder.call(this);
};

Amm.View.Html.Content.prototype = {

    'Amm.View.Html.Content': '__CLASS__',

    _doSetContent: function(content) {
        jQuery(this._htmlElement).html(content);
    },
    
    _doGetContent: function() { 
        return jQuery(this._htmlElement).html();
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Content];
    }

};

Amm.extend(Amm.View.Html.Content, Amm.View.Html);
Amm.extend(Amm.View.Html.Content, Amm.View.Abstract.Content);
