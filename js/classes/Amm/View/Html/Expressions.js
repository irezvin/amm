/* global Amm */

Amm.View.Html.Expressions = function(options) {
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this, options);
};

Amm.View.Html.Expressions.TARGET_TYPE = {
    HTML: 'Html', // _html
    CLASS: 'Class', // class__
    STYLE: 'Style', // style__
    ATTR: 'Attr',
};

Amm.View.Html.Expressions.IDX = {
    TYPE: 0,
    TARGET: 1,
    SOURCE_OBJECT: 2,
    IDX: 3
};

/* 
 * TODO: add more targets.
 * a) dom__prop (setting properties of DOM node: jQuery(htmlElement)[0][prop] = value,
 * b) jq__func__arg: jQuery(htmlElement)[func](arg, value)
 * c) ability to prefix each target with jquery selector and ':::', 
 *    i.e. 'p:first-child ::: _html' will set html of 
 *    jQuery(htmlElement).find(p:first-child)
 */
Amm.View.Html.Expressions.prototype = {

    'Amm.View.Html.Expressions': '__CLASS__', 

    // @var array[type, target, source, idx]
    _links: null,
    
    updateWhenEmpty: false,
    
    _subbed: false,
    
    _jqHtmlElement: null,
    
    setMap: function(map) {
        if (!map || typeof map !== 'object') {
            throw Error("map must be a non-null object");
        }
        if (this._links !== null) throw Error("can setMap() only once");
        this._links = [];
        for (var i in map) if (map.hasOwnProperty(i)) {
            this._createLink(i, map[i]);
        }
    },
    
    _createLink: function(targetAndType, source) {
        var target, type, sourceObject, fn, idx, link;
        if (targetAndType === '_html') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.HTML;
            target = '';
        } else if (targetAndType.slice(0, 7) === 'class__') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.CLASS;
            target = targetAndType.slice(7);
        } else if (targetAndType.slice(0, 7) === 'style__') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.STYLE;
            target = targetAndType.slice(7);
        } else {
            type = Amm.View.Html.Expressions.TARGET_TYPE.ATTR;
            target = targetAndType;
        }
        if (typeof source === 'object') sourceObject = Amm.constructInstance(source, 'Amm.Expression');
        else if (typeof source === 'function') sourceObject = new Amm.Expression.FunctionHandler(source);
        else if (typeof source !== 'string') {
            throw Error("Map entry '" + targetAndType + ' must be object, function or string; given: '
                + Amm.describeType(source));
        } else if (source[0] === 'j' && source.slice(0, 11) === 'javascript:') {
            sourceObject = new Amm.Expression.FunctionHandler(source.slice(11));
        } else if (source.match(/^\w+$/)) { // only word chars, no dots etc - simple props condition
            sourceObject = source;
        } else {
            sourceObject = new Amm.Expression(source);
        }
        idx = this._links.length;
        link = [type, target, sourceObject, idx];
        if (sourceObject['Amm.WithEvents']) {
            sourceObject.subscribe('valueChange', this._handleChange, this, link);
        }
        this._links.push(link);
    },
    
    _doSetHtmlElement: function(htmlElement, old) {
        Amm.View.Html.prototype._doSetHtmlElement.call(this, htmlElement, old);
        if (htmlElement) this._jqHtmlElement = jQuery(htmlElement);
        else this._jqHtmlElement = null;
    },
    
    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (res) {
            this._subscribe();
        }
        return res;
    },
    
    _endObserve: function() {
        var res = Amm.View.Abstract.prototype._endObserve.call(this);
        this._unsubscribe();
        return res;
    },
    
    _subscribe: function() {
        var e = this._element;
        this._subbed = true;
        for (var i = 0, l = this._links.length; i < l; i++) {
            var link = this._links[i];
            var srco = link[Amm.View.Html.Expressions.IDX.SOURCE_OBJECT];
            if (typeof srco === 'string') { // property name
                var evName = srco + 'Change';
                if (!e.hasEvent(evName)) continue;
                e.subscribe(evName, this._handleChange, this, this._links[i]);
                this._handleChange(Amm.getProperty(e, srco), undefined, this._links[i]);
            } else {
                srco.setExpressionThis(e);
                this._handleChange(srco.getValue(), undefined, this._links[i]);
            }
        }
    },
    
    _unsubscribe: function() {
        this._subbed = false;
        var e = this._element;
        for (var i = 0, l = this._links.length; i < l; i++) {
            var link = this._links[i];
            var srco = link[Amm.View.Html.Expressions.IDX.SOURCE_OBJECT];
            if (typeof srco === 'string') { // property name
                var evName = srco + 'Change';
                e.unsubscribe(evName, this._handleChange, this, this._links[i]);
            } else {
                srco.setExpressionThis(null);
            }
        }
    },
    
    _handleChange: function(value) {
        var link = arguments[arguments.length - 1];
        var type = link[Amm.View.Html.Expressions.IDX.TYPE];
        var target = link[Amm.View.Html.Expressions.IDX.TARGET];
        if (!this._jqHtmlElement || !this._subbed && !this.updateWhenEmpty) return;
        this._applyTarget(this._jqHtmlElement, type, target, value);
    },
    
    _applyTarget: function(jq, type, target, value) {
        this['_assign' + type](jq, target, value);
    },
    
    _assignHtml: function(jq, target, value) {
        jq.html(value);
    },
    
    _assignAttr: function(jq, target, value) {
        jq.attr(target, value);
    },
    
    _assignStyle: function(jq, target, value) {
        jq.css(target, value);
    },
    
    _assignClass: function(jq, target, value) {
        if (value) jq.addClass(target);
        else jq.removeClass(target);
    },
    
    _cleanup_AmmViewHtmlExpressions: function() {
        for (var i = 0, l = this._links.length; i < l; i++) {
            var ob = this._links[i][Amm.View.Html.Expressions.IDX.SOURCE_OBJECT];
            if (ob.cleanup) ob.cleanup();
        }
        this._links = null;
    }

};

Amm.extend(Amm.View.Html.Expressions, Amm.View.Html);
Amm.extend(Amm.View.Html.Expressions, Amm.View.Abstract);

