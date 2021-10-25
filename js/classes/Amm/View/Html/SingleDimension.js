/* global Amm */

Amm.View.Html.SingleDimension = function(options) {
    Amm.View.Abstract.SingleDimension.call(this, options);
    Amm.View.Html.call(this);
};

Amm.View.Html.SingleDimension.prototype = {
    
    selector: null,
    
    selectMethod: 'find',
    
    preSelector: null,
    
    preSelectMethod: 'parent',
    
    selectorSetOnly: false,

    'Amm.View.Html.SingleDimension': '__CLASS__', 
    
    _jqHtmlElement: null,
    
    _useInterval: true, 
    
    setHtmlElement: function(htmlElement) {
        var res = Amm.View.Html.prototype.setHtmlElement.call(this, htmlElement);
        if (res) {
            this._jqHtmlElement = htmlElement? jQuery(htmlElement) : null;
        }
        return res;
    },
    
    getDimensionValue: function() {
        var jq = this._jqHtmlElement;
        if (!jq || !jq.length) return;
        if (this.selector && !this.selectorSetOnly) {
            if (this.preSelector) jq = jq[this.preSelectMethod](this.preSelector);
            jq = jq[this.selectMethod](this.selector);
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.LEFT) {
            return jq.offset().left;
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.TOP) {
            return jq.offset().top;
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.WIDTH) {
            return jq.width();
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.HEIGHT) {
            return jq.height();
        }        
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.POSITION_LEFT) {
            return jq.position().left;
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.POSITION_TOP) {
            return jq.position().top;
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.INNER_WIDTH) {
            return jq.innerWidth();
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.INNER_HEIGHT) {
            return jq.innerHeight();
        }        
    },
    
    setDimensionValue: function(value) {
        var jq = this._jqHtmlElement;
        if (!jq || !jq.length) return;
        if (this.selector) {
            if (this.preSelector) jq = jq[this.preSelectMethod](this.preSelector);
            jq = jq[this.selectMethod](this.selector);
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.LEFT) {
            if (value === null) {
                jq.css('left', '');
                return;
            }                
            jq.offset({left: value});
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.TOP) {
            if (value === null) {
                jq.css('top', '');
                return;
            }                
            jq.offset({top: value});
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.WIDTH) {
            if (value === null) {
                jq.css('width', '');
                return;
            }                
            jq.width(value);
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.HEIGHT) {
            if (value === null) {
                jq.css('height', '');
                return;
            }                
            jq.height(value);
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.POSITION_LEFT) {
            if (value === null) {
                jq.css('left', '');
                return;
            }                
            jq.position({left: value});
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.POSITION_TOP) {
            if (value === null) {
                jq.css('top', '');
                return;
            }                
            jq.position({top: value});
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.INNER_WIDTH) {
            if (value === null) {
                jq.css('width', '');
                return;
            }                
            jq.innerWidth(value);
        }
        if (this._dimension === Amm.View.Abstract.SingleDimension.DIMENSION.INNER_HEIGHT) {
            if (value === null) {
                jq.css('height', '');
                return;
            }                
            jq.innerHeight(value);
        }
    },
    
};

Amm.extend(Amm.View.Html.SingleDimension, Amm.View.Html);
Amm.extend(Amm.View.Html.SingleDimension, Amm.View.Abstract.SingleDimension);
