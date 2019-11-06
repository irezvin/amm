/* global Amm */

/**
 * @class Amm.Element
 * @constructor
 */
Amm.Element = function(options) {
    this._beginInit();
    this._cleanupList = [];
    this._expressions = {};
    if (!options) {
        Amm.WithEvents.call(this);
        this._endInit();
        return;
    }
    var expressions;
    var traits = this._getDefaultTraits(), hasTraits = options.traits;
    var views = [];

    options = Amm.Element._checkAndApplyOptionsBuilderSource(options);

    if ('expressions' in options) { // we should init expressions last
        expressions = options.expressions;
        delete options.expressions;
    }
    
    Amm.Element._checkAndApplyOptionsViews(options, views, hasTraits? null : traits);
    
    if (options.extraTraits) {
        if (hasTraits) throw Error("extraTraits and traits options cannot be used simultaneously");
        traits = traits.concat(options.extraTraits);
        delete options.extraTraits;
    }
    if (hasTraits) {
        if (options.traits instanceof Array) traits = traits.concat(options.traits);
        else traits.push(options.traits);
        delete options.traits;    
    }
    if (traits.length) {
        var usedTraits = [];
        for (var i = 0; i < traits.length; i++) {
            var trait = Amm.getFunction(traits[i]);
            if (Amm.Array.indexOf(trait, usedTraits) >= 0) continue; // already used
            usedTraits.push(trait);
            Amm.augment(this, trait, options);
        }
    }
    var inProps = [], extraProps;
    // create function handlers and expressions
    for (var i in options) if (options.hasOwnProperty(i)) { 
        if (i[0] === 'i' && i[2] === '_' && i.slice(0, 4) === 'in__') {
            inProps.push([i.slice(4), options[i], Amm.Element.EXPROP_IN]);
            delete options[i];
        } if (i[0] === 's' && i[4] === '_' && i.slice(0, 6) === 'sync__') {
            inProps.push([i.slice(6), options[i], Amm.Element.EXPROP_SYNC]);
            delete options[i];
        } if (i[0] === 'e' && i[4] === '_' && i.slice(0, 6) === 'expr__') {
            inProps.push([i.slice(6), options[i], Amm.Element.EXPROP_EXPR]);
            delete options[i];
        } else if (i[0] === 'p' && i[4] === '_' && i.slice(0, 6) === 'prop__') {
            extraProps = extraProps || {};
            extraProps[i.slice(6)] = options[i];
            delete options[i];
        }
    }
    Amm.WithEvents.call(this);
    var onHandlers = this._extractOnHandlers(options);
    Amm.init(this, options, ['id', 'properties']);
    Amm.init(this, options);
    if (extraProps) this.setProperties(extraProps);
    if (inProps.length) this._initInProperties(inProps);
    if (onHandlers) this._initOnHandlers(onHandlers);
    if (expressions) this.setExpressions(expressions);
    this._endInit();
    if (views.length) {
        for (var i = 0, l = views.length; i < l; i++) {
            views[i].setElement(this);
        }
    }
};

/**
 * Special type of Amm.Element pseudo-property: 
 * in__`propName`: expressionDefinition
 * Expression updates value in property `propName`
 * (the property must exist)
 * 
 * @type Number
 */
Amm.Element.EXPROP_IN = 0;

/**
 * Special type of Amm.Element pseudo-property: 
 * sync__`propName`: expressionDefinition
 * there is two-way sync between Expression 
 * and property `propName`. Update of any of them
 * causes update of other.
 * (the property must exist)
 * 
 * @type Number
 */
Amm.Element.EXPROP_SYNC = 1;


/**
 * Special type of Amm.Element pseudo-property: 
 * expr__`propName`: expressionDefinition
 * 
 * (the property must NOT exist and will be created)
 * 
 * @type Number
 */
Amm.Element.EXPROP_EXPR = 2;

Amm.Element._checkAndApplyOptionsBuilderSource = function(options) {
    if (Amm.Builder.isPossibleBuilderSource(options)) {
        options = {
            builderSource: options
        };
    }
    if (!options.builderSource) return options;
    var extraOptions = Amm.Builder.calcPrototypeFromSource(options.builderSource);
    var newOptions = options.builderPriority? 
        Amm.override({}, options, extraOptions) : Amm.override(extraOptions, options);
    delete newOptions.builderSource;
    delete newOptions.builderPriority;
    delete newOptions.class;
    return newOptions;
};

Amm.Element._checkAndApplyOptionsViews = function(options, views, traits) {
    if (!options.views) return;
    for (var i = 0, l = options.views.length; i < l; i++) {
        var view = options.views[i];
        if (!Amm.getClass(view)) {
            if (typeof view === 'string') view = {class: view};
            var cl = view['class'];
            if (!cl) {
                throw Error("views[" + i + "].class not provided");
            }
            var cr = Amm.getFunction(cl);
            if (!cr.prototype['Amm.View.Abstract'])
                throw Error("View class must be a descendant of Amm.View.Abstract");
            var tmp = view.class, hash = view;
            delete view.class;
            view = new cr(view);
            hash.class = tmp; // add class back to the options hash
        }
        if (!view['Amm.View.Abstract'])
            throw Error("Created instance isn't a descendant of Amm.View.Abstract");
        views.push(view);
        if (traits) {
            traits.push.apply(traits, view.getSuggestedTraits());
        }
    }
    delete options.views;
};

Amm.Element.regInit = function(element, key, fn) {
    if (element._initLevel === false) fn.call(element);
    element._init = element._init || {};
    element._init[key] = fn;
};

Amm.Element.prototype = {

    'Amm.Element': '__CLASS__',
    
    _requiredParentClass: 'Composite',
    
    _id: null,
    
    _path: null,
    
    _parent: null,
    
    _cleanupList: null,
    
    // null means "check parent cleanupChildren value", true and false - specific action on parent cleanup event
    _cleanupWithParent: null,
    
    _cleanupWithComponent: true,
    /*
     * Path to the non-exiting (yet) parent for deferred association
     */
    _deferredParentPath: null,
    
    defaultProperty: null,
    
    _init: null,
    
    _initLevel: 0,

    _component: null,
    
    // will reference `this` if `this` is component
    _closestComponent: null,
    
    _beginInit: function() {
        if (this._initLevel === false)
            return false;
        this._initLevel++;
        this._init = this._init || {};
    },
            
    _endInit: function() {
        if (this._initLevel === false)
            return false;
        if (this._initLevel > 0) {
            this._initLevel--;
        };
        if (this._initLevel) return;
        if (this._init) {
            this._initLevel = false;
            var ii = [];
            for (var i in this._init) {
                if (this._init.hasOwnProperty(i) && (typeof (this._init[i]) === 'function')) {
                    ii.push(i);
                }
            }
            ii.sort();
            for (var i = 0, l = ii.length; i < l; i++) this._init[ii[i]].call(this);
        }
        this._init = null;
    },
    
    setId: function(id) {
        if (this._id === id) return;
        if (('' + id).indexOf(Amm.ID_SEPARATOR) >= 0) {
            throw Error("`id` must not contain Amm.ID_SEPARATOR ('" + Amm.ID_SEPARATOR + "')");
        }
        var o = this._id, oldPath = this.getPath(), otherChild;
        if (this._parent && (otherChild = this._parent.getChild(id)) && otherChild !== this) {
            throw Error("Cannot setId() since the Parent already hasChild() with id '" + id + "'");
        }
        this._id = id;
        this.outIdChange(id, o);
        this._path = null;
        var path = this.getPath();
        if (path !== oldPath)
            this.outPathChanged(path, oldPath);
        return true;
    },
    
    getPath: function() {
        if (this._path === null && this._id !== null) {
            this._path = (this._parent? this._parent.getPath() : '') + Amm.ID_SEPARATOR + this._id;
        }
        return this._path;
    },
    
    getId: function() {
        return this._id;
    },
    
    setDeferredParentPath: function(parentPath) {
        if (this._deferredParentPath === parentPath) return;
        if (this._deferredParentPath) Amm.stopWaiting(this._parent, this.setParent, this);
        var p = this.getByPath(parentPath);
        if (p) return this.setParent(p);
        if (this._parent) this.setParent(null);
        this._deferredParentPath = parentPath;
        if (parentPath) {
            Amm.waitFor(this._deferredParentPath, this.setParent, this);
        }
    },
    
    getDeferredParentPath: function() {
        return this._deferredParentPath;
    },
    
    setParent: function(parent) {
        if (parent === this._parent) return; // nothing to do
        
        if (typeof parent === 'string') return this.setDeferredParentPath(parent);
        
        // check that parent isn't our child
        if (parent) {
            for (var e = parent; e; e = e.getParent()) {
                if (e === this) throw Error("Cannot setParent() when `parent` is the child of me");
            }
        }
        var oldParent = this._parent, oldPath = this.getPath();
        this._parent = null;
        this._path = null;
        if (oldParent) {
            oldParent.unsubscribe('pathChanged', this._deferredParentPathChanged, this);
            oldParent.unsubscribe('cleanup', this._handleParentCleanup, this);
            oldParent.removeChild(this);
        }
        if (parent) {
            parent.subscribe('pathChanged', this._deferredParentPathChanged, this);
            parent.subscribe('cleanup', this._handleParentCleanup, this);
            if (this._requiredParentClass) Amm.is(parent, this._requiredParentClass, 'parent');
            try {
                this._parent = parent;
                this._parent.addChild(this);
            } catch (e) {
                this._parent = null;
                throw e;
            }
        }
        this.outParentChanged(parent, oldParent);
        var path = this.getPath();
        if (path !== oldPath) this.outPathChanged(path, oldPath);
        return true;
    },
    
    _deferredParentPathChanged: function(path, oldPath) {
        var oldPath = this._path;
        this._path = path + Amm.ID_SEPARATOR + this._id;
        if (this._path !== oldPath) this.outPathChanged(this._path, oldPath);
    },
    
    outIdChange: function(id, oldId) {
        this._out('idChange', id, oldId);
    },
    
    outPathChanged: function(path, oldPath) {
        this._out('pathChanged', path, oldPath);
        if (path && path[0] === '^' || oldPath && oldPath[0] === '^') {
            Amm.notifyElementPathChanged(this, path, oldPath);
        }
    },
    
    outParentChanged: function(oldParent) {
        this._out('parentChanged', oldParent);
    },
    
    p: function(path) {
        if (path === undefined) return this.getPath();
        return this.getByPath(path);
    },
    
    /**
     * Returns an element that is specified by a path
     * @param {string|Array} path (path must be non-empty!)
     * @return {Amm.Element}
     */
    getByPath: function(path) {
        if (!((typeof path === 'string' || path instanceof Array) && path.length)) 
            throw Error("`path` must be a non-empty array or non-empty string");
        var res = null, scope;
        
        if (path[0] === '^' && this._id !== '^') // it's a root - take a shortcut
            return Amm.p(path);
        
        var head, tail; 
        if (typeof path === 'string') {
            tail = path.split(Amm.ID_SEPARATOR);
        } else {
            tail = [].concat(path);
        }
        head = tail.splice(0, 1)[0];
        if (head === '') {
            scope = this.getTopElement();
        }
        else if (head === '^') scope = Amm.getRoot();
        else if (head === '.') scope = this;
        else if (head === '..') scope = this.getParent();
        else scope = this.getChild(head);
        if (scope) {
            if (!tail.length) { // nothing left to do
                res = scope;
            } else {
                res = scope.getByPath(tail);
            }
        }
        return res;
    },
    
    listChildren: function() {
        return [];
    },
    
    hasChild: function(child) {
        return false;
    },
    
    /**
     * @return {Amm.Element}
     */
    getTopElement: function() {
        var res = null;
        for (var e = this; e; e = e.getParent()) res = e;
        return res;
    },
    
    /**
     * @return {Amm.Element}
     */
    getParent: function() {
        return this._parent;
    },

    outCleanup: function() {
        this._out('cleanup', this);
    },

    _handleParentCleanup: function() {
        var shouldCleanup = this._cleanupWithParent;
        if (shouldCleanup === null) shouldCleanup = this._parent.getCleanupChildren();
        if (shouldCleanup) this.cleanup();
        else this.setParent(null);
    },

    setCleanupWithParent: function(cleanupWithParent) {
        var oldCleanupWithParent = this._cleanupWithParent;
        if (oldCleanupWithParent === cleanupWithParent) return;
        this._cleanupWithParent = cleanupWithParent;
        return true;
    },

    getCleanupWithParent: function() { return this._cleanupWithParent; },

    setCleanupWithComponent: function(cleanupWithComponent) {
        cleanupWithComponent = !!cleanupWithComponent;
        var oldCleanupWithComponent = this._cleanupWithComponent;
        if (oldCleanupWithComponent === cleanupWithComponent) return;
        this._cleanupWithComponent = cleanupWithComponent;
        return true;
    },

    getCleanupWithComponent: function() { return this._cleanupWithComponent; },

    createProperty: function(propName, defaultValue, onChange, defineProperty) {
        return Amm.createProperty(this, propName, defaultValue, onChange, defineProperty);
    },

    cleanup: function() {
        this.setParent(null);
        this.setComponent(null);
        this._callOwnMethods('_cleanup_');
        for (var i = this._cleanupList.length - 1; i >= 0; i--) {
            if (typeof this._cleanupList[i].cleanup === 'function') this._cleanupList[i].cleanup();
        }
        this.outCleanup();
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    // calls all methods that start with prefix (useful for asking Traits which cannot have methods with the same name)
    // returns result of every method
    _callOwnMethods: function(prefix /*, ...*/) {
        var rx = prefix instanceof RegExp, aa, res = {};
        for (var i in this) {
            if (typeof this[i] === 'function' && (rx? i.match(rx) : i.indexOf(prefix) === 0)) {
                aa = aa || Array.prototype.slice.call(arguments, 1);
                res[i] = this[i].apply(this, aa);
            }
        }
        return res;
    },

    setComponent: function(component) {
        if (!component) component = null;
        if (component === 'root') component = Amm.getRoot();
        if (component) Amm.is(component, 'Component', 'component');
        var oldComponent = this._component;
        if (oldComponent === component) return;
        this._component = component;
        if (component) {
            component.acceptElements([this]);
        }
        this._callOwnMethods('_setComponent_', component, oldComponent);
        this._setClosestComponent();
        this.outComponentChange(component, oldComponent);
        return true;
    },

    getComponent: function() { return this._component; },

    outComponentChange: function(component, oldComponent) {
        this._out('componentChange', component, oldComponent);
    },
    
    getClosestComponent: function() {
        return this._component;
    },
    
    _setClosestComponent: function() {
        var old = this._closestComponent;
        this._closestComponent = this.getClosestComponent();
        if (old !== this._closestComponent) {
            this._callOwnMethods('_setClosestComponent_', this._closestComponent, old);
            this.outClosestComponentChange(this._closestComponent, old);
        }
    },
    
    outClosestComponentChange: function(closestComponent, oldClosestComponent) {
        return this._out('closestComponentChange', closestComponent, oldClosestComponent);
    },

    _findChildElementsRecursive: function(items) {
        var res = [];
        for (var i = 0, l = items.length; i < l; i++) {
            var item = items[i];
            // we don't descend into the other components
            if (item.Component && item.getIsComponent()) continue;
            res = res.concat(item.findChildElements(true));
        }
        return res;
        
    },
    
    findChildElements: function(recursive) {
        var items = [];
        this._callOwnMethods('_findChildElements_', items);
        if (recursive) items = items.concat(this._findChildElementsRecursive(items));
        return items;
    },
    
    setProperties: function(properties) {
        if (!properties || typeof properties !== 'object') {
            throw Error("`properties` must be an object");
        }
        var hh = [];
        for (var i in properties) if (properties.hasOwnProperty(i)) {
            var value = properties[i], onChange = undefined;
            if (i.slice(0, 4) === 'in__') {
                i = i.slice(4);
                hh.push([i, value, Amm.Element.EXPROP_IN]);
                value = undefined;
            } else if (value && typeof value === 'object'
              && ('onChange' in value || 'defaultValue' in value || 'in__' in value)) {
                if ('in__' in value) {
                    hh.push([i, value.in__]);
                }
                onChange = value.onChange;
                value = value.defaultValue;
            }
            Amm.createProperty(this, i, value, onChange);
        }
        if (hh.length) this._initInProperties(hh);
    },
    
    _initInProperties: function(arrPropValues) {
        for (var i = 0, l = arrPropValues.length; i < l; i++) {
            var propName = arrPropValues[i][0];
            var definition = arrPropValues[i][1];
            var exprType = arrPropValues[i][2];
        
            // we may supply write-args to setters using double underscores
            // format of in-property is in__setter__arg1__arg2...
            // example: in__class__foo - will call setClass(value, 'foo')
            // note: in__ prefix is stripped outside of this function
            
            var args = propName.split('__');
            if (args.length > 1) {
                propName = args[0];
                args = args.slice(1);
            } else {
                args = undefined;
            }
            this._createExpression(definition, propName, args, exprType);
        }
    },
    
    _createExpression: function(definition, propName, args, exprType) {
        var expression;
        var fn, proto;
        
        if (typeof definition === 'function') {
            fn = definition;
        } else if (typeof definition === 'string' && definition.slice(0, 11) === 'javascript:') {
            var body = this._prepareFunctionHandlerBody(definition.slice(11));
            fn = Function('g', 's', body);
        } else if (typeof definition === 'string') {
            proto = {
                src: definition
            };
        } else if (definition && typeof definition === 'object') {
            proto = definition;
        } else {
            throw Error("Expression-property (in__`prop`, sync__`prop`, expr__`prop`) "
                + "must be a string, function or Amm.Expression prototype");
        }
        
        if (fn) {
            if (exprType !== Amm.Element.EXPROP_IN) {
                throw Error("javascript function handler can be used only for in__`prop` expressions");
            }
            expression = new Amm.Expression.FunctionHandler(fn, this, propName, undefined, args);
            return expression;
        }

        if (!proto) throw Error('Logic error');
        
        // suppose if an insance was supplied, it's already configured in proper way
        if (proto['Amm.Expression']) return proto;
        
        // 'class' can be specified in expression proto
        var exprClass = exprType === Amm.Element.EXPROP_SYNC? Amm.Expression.Sync : Amm.Expression;
        if (proto['class']) exprClass = Amm.getFunction(proto['class']);
        var appliedPropName = propName;
        if (exprType === Amm.Element.EXPROP_EXPR) appliedPropName = undefined;
        expression = new exprClass (proto, this, appliedPropName, undefined, args);
        if (exprType === Amm.Element.EXPROP_EXPR) {
            this._configureExprExpression(expression, propName);
        }
        Amm.is(expression, exprType === Amm.Element.EXPROP_SYNC? 'Amm.Expression.Sync' : 'Amm.Expression', 'expression');
        
        return expression;
    },
    
    _configureExprExpression: function(expression, propName) {
        var uPropName = propName.charAt(0).toUpperCase() + propName.slice(1);
        var getter = 'get' + uPropName;
        var setter = 'set' + uPropName;
        var out = 'out' + uPropName + 'Change';
        var priv = '_' + propName;
        var e = [];
        if (getter in this) e.push(getter);
        if (setter in this) e.push(setter);
        if (out in this) e.push(out);
        if (priv in this) e.push(priv);
        if (e.length) {
            throw Error ("Cannot define expr__" + propName + " expression-property: " 
                + "memeber(s) '" + e.join("', '") + " already defined");
        }
        this[getter] = function() {
            return expression.getValue();
        };
        this[setter] = function(value) {
            return expression.setValue(value);
        };
        this[out] = function(value, oldValue, changeInfo) {
            return this._out(propName + 'Change', value, oldValue, changeInfo);
        };
        expression.subscribe('valueChange', this[out], this);
        this[priv] = expression;
    },
    
    /** 
     * replaces structures like 
     *      "(2 + {: a['xx'] :}) / 3" 
     * with 
     *      "(2 + this.g(' a[\'xx\'] ')) / 3"
     */
    _prepareFunctionHandlerBody: function(template) {
        var inside = false, buf = '';
        var rep = function(match) {
            if (match === '{:') {
                if (inside) throw Error("Cannot nest {: in function template");
                inside = true;
                return '';
            } else if (match === ':}') {
                if (!inside) throw Error(":} without opening {: in function template");
                inside = false;
                var res = "g('" + buf.replace(/(['"\\])/g, '\\$1') + "')";
                buf = '';
                return res;
            } else if (inside) {
                buf += match;
                return '';
            }
            return match;
        };
        var res = template.replace(/([{]:|:[}]|:|[{}]|[^:{}]+)/g, rep);
        return res;
    },
    
    outViewAdded: function(view) {
        this._out('viewAdded', view);
    },
    
    outViewDeleted: function(view) {
        this._out('viewDeleted', view);
    },
    
    outViewReady: function(view) {
        this._out('viewReady', view);
    },
    
    findView: function(id, className) {
        var s = this.getUniqueSubscribers('Amm.View.Abstract');
        for (var i = 0, l = s.length; i < l; i++) {
            if (id !== undefined && s[i].id !== id) continue;
            if (className !== undefined && !Amm.is(s[i], className)) 
                continue;
            return s[i];
        }
    },
    
    _getDefaultTraits: function() {
        return [];
    },
    
    /**
     * Returns prototype, prototypes or instance or array of instances of 
     * views, when requested by Amm.View.Html.Default.
     * 
     * To be overridden in concrete sub-classes.
     */    
    constructDefaultViews: function() {
    }
    
};

Amm.extend(Amm.Element, Amm.WithEvents);
