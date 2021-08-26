/* global Amm */

/**
 * Subscribes to change, focus, blur events.
 * jQuery to Element: value, focus
 * Element to JQuery: value, focus, readOnly, enabled
 */
Amm.View.Html.Dimensions = function(options) {
    Amm.View.Abstract.Dimensions.call(this, options);
    Amm.View.Html.call(this);
};

Amm.View.Html.Dimensions.prototype = {

    'Amm.View.Html.Dimensions': '__CLASS__', 
    
    _jqHtmlElement: null,
    
    _usePositionInterval: true, 
    
    _useSizeInterval: true,
    
    setHtmlElement: function(htmlElement) {
        var res = Amm.View.Html.prototype.setHtmlElement.call(this, htmlElement);
        if (res) {
            this._jqHtmlElement = jQuery(htmlElement);
        }
        return res;
    },
    
    getLeftTop: function() {
        if (!this._jqHtmlElement) return {left: undefined, top: undefined};
        return this._jqHtmlElement.offset();
    },
    
    setLeftTop: function(leftTop) {
        if (!this._jqHtmlElement) return;
        var l = {left: leftTop.left, top: leftTop.top};
        if (l.left === null) l.left = this._jqHtmlElement.offset().left;
        if (l.top === null) l.top = this._jqHtmlElement.offset().top;
        this._jqHtmlElement.offset(leftTop);
    },
    
    getWidthHeight: function() {
        if (!this._jqHtmlElement) return {width: undefined, height: undefined};
        return {width: this._jqHtmlElement.outerWidth(), height:  this._jqHtmlElement.outerHeight()};
    },
    
    setWidthHeight: function(widthHeight) {
        if (!this._jqHtmlElement) return;
        if (widthHeight.width !== null) this._jqHtmlElement.outerWidth(widthHeight.width);
        if (widthHeight.height !== null) this._jqHtmlElement.outerHeight(widthHeight.height);
    },
    
};

Amm.extend(Amm.View.Html.Dimensions, Amm.View.Html);
Amm.extend(Amm.View.Html.Dimensions, Amm.View.Abstract.Dimensions);
