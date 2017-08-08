/* global Amm */

/**
 * @class Amm.Element
 * @constructor
 */
Amm.Element = function(options) {
    this._beginInit();
    this._cleanupList = [];
    Amm.registerItem(this);
    if (options && options.traits) {
        if (!(options.traits instanceof Array)) options.traits = [options.traits];
        for (var i = 0; i < options.traits.length; i++) {
            Amm.augment(this, options.traits[i]);
        }
        delete options.traits;    
    }
    var hh = [], extraProps;
    // create function handlers and expressions
    for (var i in options) if (options.hasOwnProperty(i)) { 
        if (i[0] === 'i' && i.slice(0, 4) === 'in__') {
            hh.push([i.slice(4), options[i]]);
            delete options[i];
        } else if (i[0] === 'p' && i.slice(0, 6) === 'prop__') {
            extraProps = extraProps || {};
            extraProps[i.slice(6)] = options[i];
            delete options[i];
        }
    }
    Amm.WithEvents.call(this, {});
    Amm.init(this, options, ['id', 'properties']);
    Amm.init(this, options);
    if (hh.length) this._initInProperties(hh);
    if (extraProps) this.setProperties(extraProps);
    this._endInit();
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
            ii = [];
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
            throw "`id` must not contain Amm.ID_SEPARATOR ('" + Amm.ID_SEPARATOR + "')";
        }
        var o = this._id, oldPath = this.getPath(), otherChild;
        if (this._parent && (otherChild = this._parent.getChild(id)) && otherChild !== this) {
            throw "Cannot setId() since the Parent already hasChild() with id '" + id + "'";
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
                if (e === this) throw "Cannot setParent() when `parent` is the child of me";
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
            throw "`path` must be a non-empty array or non-empty string";
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
    
    createProperty: function(propName, defaultValue, onChange) {
        return Amm.createProperty(this, propName, defaultValue, onChange);
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
        if (component) Amm.is(component, 'Component', 'component');
        var oldComponent = this._component;
        if (oldComponent === component) return;
        this._component = component;
        if (component) component.acceptElements([this]);
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
            throw "`properties` must be an object";
        }
        var hh = [];
        for (var i in properties) if (properties.hasOwnProperty(i)) {
            var defaultValue = properties[i], onChange = undefined;
            if (i.slice(0, 4) === 'in__') {
                i = i.slice(4);
                hh.push([i, defaultValue]);
                defaultValue = undefined;
            } else if (defaultValue && typeof defaultValue === 'object'
              && ('onChange' in defaultValue || 'defaultValue' in defaultValue || 'in__' in defaultValue)) {
                if ('in__' in defaultValue) {
                    hh.push([i, defaultValue.in__]);
                }
                onChange = defaultValue.onChange;
                defaultValue = defaultValue.defaultValue;
            }
            Amm.createProperty(this, i, defaultValue, onChange);
        }
        if (hh.length) this._initInProperties(hh);
    },
    
    _initInProperties: function(arrPropsValues) {
        for (var i = 0, l = arrPropsValues.length; i < l; i++) {
            var p = arrPropsValues[i][0], h = arrPropsValues[i][1];
            // in__class__foo <- write arg
            var args = p.split('__');
            if (args.length > 1) {
                p = args[0];
                args = args.slice(1);
            } else {
                args = undefined;
            }
            var fn, han;
            if (typeof h === 'string') { // expression?
                if (h.slice(0, 11) === 'javascript:') {
                    var body = this._prepareFunctionHandlerBody(h.slice(11));
                    fn = Function('g', 's', body);
                } else {
                    han = new Amm.Expression(h, this, p, undefined, args);
                }
            } else if (typeof h === 'function') {
                fn = h;
            } else {
                throw "in__<property> must be a string or a function";
            }
            if (fn) {
                han = new Amm.Expression.FunctionHandler(fn, this, p, undefined, args);
            }
            if (!han) throw "Assertion";
        }
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
                if (inside) throw "Cannot nest {: in function template";
                inside = true;
                return '';
            } else if (match === ':}') {
                if (!inside) throw ":} without opening {: in function template";
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
    }
    
};

Amm.extend(Amm.Element, Amm.WithEvents);
