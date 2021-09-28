/* global Amm */

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
        
        var o = null;
        
        if (leftTop.left === undefined) { }
        else if (leftTop.left === null) this._jqHtmlElement.css('left', '');
        else o = {left: leftTop.left};
        
        if (leftTop.top === undefined) { }
        else if (leftTop.top === null) this._jqHtmlElement.css('top', '');
        else {
            if (!o) o = {};
            o.top = leftTop.top;
        }
        
        if (o) {
            this._jqHtmlElement.offset(o);
        }
    },
    
    getWidthHeight: function() {
        if (!this._jqHtmlElement) return {width: undefined, height: undefined};
        return {width: this._jqHtmlElement.outerWidth(), height: this._jqHtmlElement.outerHeight()};
    },
    
    setWidthHeight: function(widthHeight) {
        if (!this._jqHtmlElement) return;
        if (widthHeight.width === undefined) { }
        else if (widthHeight.width === null) this._jqHtmlElement.css('width', '');
        else this._jqHtmlElement.outerWidth(widthHeight.width);
        
        if (widthHeight.height === undefined) { }
        else if (widthHeight.height === null) this._jqHtmlElement.css('height', '');
        else this._jqHtmlElement.outerHeight(widthHeight.height);
    },
    
};

Amm.extend(Amm.View.Html.Dimensions, Amm.View.Html);
Amm.extend(Amm.View.Html.Dimensions, Amm.View.Abstract.Dimensions);
