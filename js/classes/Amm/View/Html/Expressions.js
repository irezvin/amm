/* global Amm */

/**
 * One-way binding of properties or expressions of observed element to html, classes, style 
 * and attributes of one or several DOM nodes
 */
Amm.View.Html.Expressions = function(options) {
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this, options);
};

Amm.View.Html.Expressions.TARGET_TYPE = {
    HTML: 'Html', // _html
    CLASS: 'Class', // class__className
    STYLE: 'Style', // style__styleName
    ATTR: 'Attr',
    VISIBLE: 'Visible', // _visible[__delay]
    JQUERY: 'Jquery', // jquery__func[__arg,__arg...]
    DOMPROP: 'DomProp', // dom__{prop}
};

Amm.View.Html.Expressions.IDX = {
    TYPE: 0,
    SOURCE: 1,
    IDX: 2,
    SELECTOR: 3,
    ARGS: 4
};

/* 
 * TODO: add more targets.
 * a) dom__{prop} (setting properties of DOM node: jQuery(htmlElement)[0][prop] = value,
 * b) jquery__{func}__{arg}: jQuery(htmlElement)[func](arg, value)
 * c) ability to prefix each target with jquery selector and ':::', 
 *    i.e. 'p:first-child ::: _html' will set html of 
 *    jQuery(htmlElement).find(p:first-child)
 */
Amm.View.Html.Expressions.prototype = {

    'Amm.View.Html.Expressions': '__CLASS__', 

    // @var array[type, target, source, idx, selector, args]
    _links: null,
    
    updateWhenEmpty: false,
    
    _subbed: false,
    
    _jqHtmlElement: null,
    
    _defaultHtml: null,
    
    _needUpdateElement: null,
    
    /**
     * @param {object} map
     * 
     * Map format:
     * 'specification': expression|propertyName
     * 
     * where specification is
     * [selector:::]targetDef
     * 
     * targetDef is one of:
     * `attributeName`
     * _html
     * _visible
     * class__`className`
     * style__`styleProperty`
     * 
     * 
     */
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
    

    setDefaultHtml: function(defaultHtml) {
        var oldDefaultHtml = this._defaultHtml;
        if (oldDefaultHtml === defaultHtml) return;
        this._defaultHtml = defaultHtml;
        if (this._observing) this.updateDom(true);
        return true;
    },

    getDefaultHtml: function() { return this._defaultHtml; },

    
    _createLink: function(type, source) {
        var target, type, sourceObject, fn, idx, link;
        var selector = type.match(/^(.*):::/);
        var args = null;
        if (selector) {
            type = type.slice(selector[0].length);
            selector = selector[1];
        } else {
            selector = '';
        }
        args = type.split('__');
        if (args.length > 1) {
            type = args.shift();
        } else {
            args = null;
        }
        if (type === '_html') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.HTML;
        } else if (type === '_visible') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.VISIBLE;
        } else if (!args) {
            args = [type];
            type = Amm.View.Html.Expressions.TARGET_TYPE.ATTR;
        } else if (type === 'class') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.CLASS;
        } else if (type === 'style') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.STYLE;
        } else if (type === 'dom') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.DOMPROP;
        } else if (type === 'jquery') {
            type = Amm.View.Html.Expressions.TARGET_TYPE.JQUERY;
        } else {
            throw Error("Unknown binding type: '" + type + "'");
        }
        if (typeof source === 'object') sourceObject = Amm.constructInstance(source, 'Amm.Expression');
        else if (typeof source === 'function') sourceObject = new Amm.Expression.FunctionHandler(source);
        else if (typeof source !== 'string') {
            throw Error("Map entry '" + type + ' must be object, function or string; given: '
                + Amm.describeType(source));
        } else if (source[0] === 'j' && source.slice(0, 11) === 'javascript:') {
            sourceObject = new Amm.Expression.FunctionHandler(source.slice(11));
        } else if (source.match(/^\w+$/)) { // only word chars, no dots etc - simple props condition
            sourceObject = source;
        } else {
            sourceObject = new Amm.Expression(source);
        }
        idx = this._links.length;
        link = [type, sourceObject, idx, selector, args];
        if (sourceObject['Amm.WithEvents']) {
            sourceObject.subscribe('valueChange', this._handleChange, this, link);
        }
        this._links.push(link);
    },
    
    _doSetHtmlElement: function(htmlElement, old) {
        Amm.View.Html.prototype._doSetHtmlElement.call(this, htmlElement, old);
        if (htmlElement) this._jqHtmlElement = jQuery(htmlElement);
        else this._jqHtmlElement = null;
        this._needUpdateElement = true;
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
            var srco = link[Amm.View.Html.Expressions.IDX.SOURCE];
            if (typeof srco === 'string') { // property name
                var evName = srco + 'Change';
                if (!e.hasEvent(evName)) continue;
                e.subscribe(evName, this._handleChange, this, this._links[i]);
            } else {
                srco.setExpressionThis(e);
            }
        }
        this.updateDom();
    },
    
    _unsubscribe: function() {
        this._subbed = false;
        var e = this._element;
        for (var i = 0, l = this._links.length; i < l; i++) {
            var link = this._links[i];
            var srco = link[Amm.View.Html.Expressions.IDX.SOURCE];
            if (typeof srco === 'string') { // property name
                var evName = srco + 'Change';
                e.unsubscribe(evName, this._handleChange, this, this._links[i]);
            } else {
                srco.setExpressionThis(null);
            }
        }
    },
    
    _getSourceValue: function(source) {
        if (typeof source === 'string') return Amm.getProperty(this._element, source);
        return source.getValue();
    },
    
    _handleChange: function(value) {
        var link = arguments[arguments.length - 1];
        var type = link[Amm.View.Html.Expressions.IDX.TYPE];
        var selector = link[Amm.View.Html.Expressions.IDX.SELECTOR];
        var args = link[Amm.View.Html.Expressions.IDX.ARGS];
        if (!this._jqHtmlElement || !this._subbed && !this.updateWhenEmpty) return;
        this._applyTarget(this._jqHtmlElement, value, type, selector, args);
    },
    
    _applyTarget: function(jq, value, type, selector, args) {
        if (selector) jq = jq.find(selector);
        if (!this['_assign' + type]) console.log("Wtf", type);
        this['_assign' + type](jq, value, args);
    },
    
    _assignHtml: function(jq, value, args) {
        jq.html(value);
    },
    
    _assignAttr: function(jq, value, args) {
        jq.attr(args[0], value);
    },
    
    _assignStyle: function(jq, value, args) {
        jq.css(args[0], value);
    },
    
    _assignClass: function(jq, value, args) {
        if (value) jq.addClass(args[0]);
        else jq.removeClass(args[0]);
    },
    
    _assignVisible: function(jq, value, args) {
        jq[value? 'show': 'hide'](args? args[0] : undefined)
    },
    
    _assignJquery: function(jq, value, args) {
        var aa = [].concat(args, [value]);
        var fn = aa.shift();
        jq[fn].apply(jq, aa);
    },
    
    _assignDomProp: function(jq, value, args) {
        jq.each(function(i, node) {
            if (typeof(node[args[0]]) === 'function') node[args[0]](value);
            else node[args[0]] = value;
        });
    },
    
    _cleanup_AmmViewHtmlExpressions: function() {
        if (!this._links) return;
        for (var i = 0, l = this._links.length; i < l; i++) {
            var ob = this._links[i][Amm.View.Html.Expressions.IDX.SOURCE];
            if (ob.cleanup) ob.cleanup();
        }
        this._links = null;
    },
    
    updateDom: function(withHtml) {
        if (!this._jqHtmlElement || !this._observing) return;
        if ((withHtml || this._needUpdateElement) && this._defaultHtml) {
            this._jqHtmlElement.html(this._defaultHtml);
        }
        this._needUpdateElement = false;
        for (var i = 0; i < this._links.length; i++) {
            var v = this._getSourceValue(this._links[i][Amm.View.Html.Expressions.IDX.SOURCE]);
            this._handleChange(v, undefined, this._links[i]);
        }
    },

};

Amm.extend(Amm.View.Html.Expressions, Amm.View.Html);
Amm.extend(Amm.View.Html.Expressions, Amm.View.Abstract);

