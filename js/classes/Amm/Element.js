/* global Amm */

/**
 * @class Amm.Element
 * @constructor
 */
Amm.Element = function(options) {
    
    this._beginInit();
    this._cleanupList = [];
    this._expressions = {};
    
//    if (!options) {
//        Amm.WithEvents.call(this);
//        this._endInit();
//        return;
//    }

    if (options) options = Amm.Element._checkAndApplyOptionsBuilderSource(options);
    else options = {};
    
    // since we delete keys in options, we must clone the hash in case it will be reused
    if (options && typeof options === 'object') {
        options = Amm.override({}, options);
    }
    
    var expressions;
    var traits = this._getDefaultTraits(options), hasTraits = options.traits;
    var views = [];

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
    var inProps = [], extraProps, extraPropsVals, extraPropName;
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
            extraPropName = i.slice(6);
            extraProps[extraPropName] = options[i];
            if (extraPropName in options) {
                extraPropsVals = extraPropsVals || {};
                extraPropsVals[extraPropName] = options[extraPropName];
                delete options[extraPropName];
            }
            delete options[i];
        }
    }
    Amm.WithEvents.call(this);
    var onHandlers = this._extractOnHandlers(options);
    Amm.init(this, options, ['id', 'props']);
    Amm.init(this, options);
    if (extraProps) this.setProps(extraProps);
    if (extraPropsVals) {
        Amm.init(this, extraPropsVals);
    }
    if (inProps.length) this._initInProps(inProps);
    if (expressions) this.setExpressions(expressions);
    if (onHandlers) this._initOnHandlers(onHandlers);
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
    
    _id: null,
    
    _cleanupList: null,
    
    _cleanupWithComponent: true,
    
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
        this._callOwnMethods('_endInit_');
    },
    
    setId: function(id) {
        if (this._id === id) return;
        var old = this._id;
        this._id = id;
        this._callOwnMethods('_setId_', id, old);
        this.outIdChange(id, old);
        return true;
    },
    
    getId: function() {
        return this._id;
    },
    
    outIdChange: function(id, oldId) {
        this._out('idChange', id, oldId);
    },
    
    outCleanup: function() {
        this._out('cleanup', this);
    },

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
        if (component) {
            Amm.is(component, 'Component', 'component');
            if (!component.getIsComponent()) {
                component = component.getClosestComponent() || null;
            }
        }
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
    
    setProps: function(props) {
        if (!props || typeof props !== 'object') {
            throw Error("`props` must be an object");
        }
        var hh = [];
        for (var i in props) if (props.hasOwnProperty(i)) {
            var value = props[i], onChange = undefined;
            if (i.slice(0, 4) === 'in__') {
                i = i.slice(4);
                hh.push([i, value, Amm.Element.EXPROP_IN]);
                value = undefined;
            } else if (value && typeof value === 'function') {
                this['_calc' + Amm.ucFirst(i)] = value;
                Amm.ObservableFunction.createCalcProperty(i, this);
            } else if (value && typeof value === 'object'
              && ('onChange' in value || 'defaultValue' in value || 'in__' in value)) {
                if ('in__' in value) {
                    hh.push([i, value.in__]);
                }
                onChange = value.onChange;
                value = value.defaultValue;
            }
            Amm.createProperty(this, i, value, onChange, true);
        }
        if (hh.length) this._initInProps(hh);
    },
    
    _initInProps: function(arrPropValues) {
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
            fn = definition.slice(11);
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
        if (proto['class']) {
            exprClass = Amm.getFunction(proto['class']);
            delete proto['class'];
        }
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
    
    notifyViewAdded: function(view) {
        this.outViewAdded(view);
    },
    
    outViewAdded: function(view) {
        this._out('viewAdded', view);
    },
    
    notifyViewDeleted: function(view) {
        this.outViewDeleted(view);
    },
    
    outViewDeleted: function(view) {
        this._out('viewDeleted', view);
    },
    
    notifyViewReady: function(view) {
        this.outViewReady(view);
    },
    
    outViewReady: function(view) {
        this._out('viewReady', view);
    },
    
    findView: function(id, className) {
        var s = this.getUniqueSubscribers('Amm.View.Abstract');
        for (var i = 0, l = s.length; i < l; i++) {
            if ((id !== null && id !== undefined) && s[i].id !== id) continue;
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
