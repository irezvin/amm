Amm = {
    
    ID_SEPARATOR: '/',
    
    id: 'amm',
    
    domHolderAttribute: 'data-amm-iid',
    
    _counter: 1,
    
    _functions: {},
    
    _namespaces: {},
    
    _bootstrapped: false,
    
    lang: {},

    /** 
     * Amm object properties will be updated from window[optionsObjectId] before
     * bootstrapping
     */
    optionsObjectId: 'ammOptions',
    
    /**
     * Attribute to detect elements to automatically build on bootstrapping
     */
    autoBuildSelector: '[data-amm-build]',
    
    defaultBuilderOptions: {
        topLevelComponent: 'root'
    },
    
    _autoBuilder: null,
    
    /**
     * We maintain huge hash of all created items to reference them in appropriate places of the DOM (really?) or whatever
     */
    _items: {},
        
    /**
     * Cache of root-bound elements
     */
    _byPaths: {},

    /**
     * List of elementPath => function, scope
     */
    _waitList: {},
    
    _root: null,
    
    /**
     * Event stack
     */
    _eventStack: [],
    
    event: {
        origin: null,
        name: '',
        args: [],
        parent: null
    },
    
    getRoot: function() {
        if (!this._root) this._root = new this.Root();
        return this._root;
    },
    
    registerItem: function(item) {
        if (item._amm_id) return;
        item._amm_id = this.id + '_' + this._counter++;
        this._items[item._amm_id] = item;
        return true;
    },
    
    unregisterItem: function(item) {
        if (!item._amm_id) return; // no work
        if (typeof item === 'string') item = this._items[item];
        if (item._amm_id && this._items[item._amm_id] !== item) {
            throw "Mismatch of _amm_id detected during the item de-registration";
        }
        if (typeof item.getPath === 'function') {
            var p = item.getPath();
            if (p && p[0] === '^') {
                delete this._byPaths[p];
            }
        }
        this.stopWaiting(undefined, undefined, item);
        delete this._items[item._amm_id];
        item._amm_id = null;
    },
    
    getItem: function(item, throwIfNotFound) {
        if (item instanceof Array) {
            var r = [];
            for (var i = 0, l = item.length; i < l; i++) {
                if (item[i] && item[i].length) { // ignore empty identifiers
                    var resItem = this.getItem(item[i], throwIfNotFound);
                    if (resItem) r.push(resItem);
                }
            }
            return r;
        } else {
            var res = this._items[item];
            if (!res && throwIfNotFound) throw "Item '" + item + "' not found";
            return res;
        }
    },
    
    destroyItem: function(item) {
        if (typeof item === 'string') item = this._items[item];
        if (typeof item.cleanup === 'function') item.cleanup();
        for (var i in this._items) if (this._items.hasOwnProperty(i)) {
            if (typeof this._items[i].unsubscribe === 'function')
                this._items[i].unsubscribe(undefined, undefined, item);
        }
        this.unregisterItem(item);
    },
    
    extend: function(subClass, parentClass, dontIndicateParent) {
        if (typeof subClass !== 'function') {
            throw "Amm.extend: `subClass` is not a function";
        };
        if (typeof parentClass !== 'function') {
            throw "Amm.extend: `parentClass` is not a function";
        };
        var skip = false;
        if (typeof parentClass.beforeExtend === 'function') {
            skip = parentClass.beforeExtend(subClass, parentClass, dontIndicateParent);
        }
    	if (!skip) {
            for (var i in parentClass.prototype) {
                if (!(i in subClass.prototype))
                    subClass.prototype[i] = parentClass.prototype[i];
                    if (!dontIndicateParent && subClass.prototype[i] === '__CLASS__')
                        subClass.prototype[i] = '__PARENT__';
            }
        }
        if (typeof parentClass.afterExtend === 'function') {
            parentClass.afterExtend(subClass, parentClass, dontIndicateParent);
        }
    },

    /**
     *  `options` is argument that will be passed to traitInstance.__augment,
     *  if such function exists.
    
     *  It is implemented to allow traits to pick-and-delete options that don't
     *  have corresponding members (notably Amm.Trait.Property's val__{name}
     *  validation expressions)
     */
    augment: function(instance, trait, options) {
        var l = arguments.length;
        var traitInstance, proto;
        if (typeof trait === 'string') {
            trait = Amm.getFunction(trait);
        }
        if (typeof instance !== 'object') throw "`instance` must be an object";
        if (typeof trait === 'function') traitInstance = new trait();
        else if (typeof trait === 'object') traitInstance = trait;
        else throw "`trait` must be an object or a function (constructor)";
        var conflicts = Amm.getInterfaces(instance, traitInstance);
        if (conflicts.length) 
            throw "Cannot augment: `instance` already implements same interfaces as the `traitInstance`: "
                + conflicts.join(', ') + ")";
        for (var i in traitInstance) if (i.slice(0, 2) !== '__') {
            if (instance[i] === undefined || typeof instance[i] === 'function') 
                instance[i] = traitInstance[i];
        }
        if (typeof traitInstance.__augment === 'function') {
            traitInstance.__augment.call(instance, traitInstance, options);
        }
    },
    
    /**
     * can specify any number of overriders
     */
    override: function(object, overrider, _) {
        for (var a = 0, l = arguments.length; a < l; a++) {
            for (var i in arguments[a]) {
                if (arguments[a].hasOwnProperty(i)) object[i] = arguments[a][i];
            }
        }
        return object;
    },
    
    overrideRecursive: function(modifiedObject, overrider, noOverwrite) {
        if (typeof modifiedObject !== 'object' || typeof overrider !== 'object')
            throw 'Both modifiedObject and overrider must be objects';

        for (var i in overrider) if (overrider.hasOwnProperty(i)) {
            if (modifiedObject[i] instanceof Array && overrider[i] instanceof Array) {
                modifiedObject[i] = modifiedObject[i].concat(overrider[i]);
            } else if (typeof modifiedObject[i] === 'object' && typeof overrider[i] === 'object')  {
                this.overrideRecursive(modifiedObject[i], overrider[i], noOverwrite);
            } else if (!noOverwrite || !(i in modifiedObject)) {
                modifiedObject[i] = overrider[i];
            }
        };
        return modifiedObject;
    },
    
    /**
     * Checks if object matches any of sets of classes, interfaces or methods in the {requirements}
     * Requirements are [[AND, AND] OR [AND, AND]] and so on.
     * Example:
     * ['WithEvents', ['subscribe', 'hasEvent'], Object, ['Visual', 'Annotated']]
     * will match any of the following:
     * - objects of WithEvents class
     * - objects having both subscribe/hasEvent methods
     * - Object instances
     * - objects implementing both Visual and Annotated interfaces
     * 
     * Of course we don't distinguish which identifiers mean Classes, Interfaces
     * or method names. (except real functions that we check with instanceof).
     * Usually we have methods starting with lowercase letter and Classes/Interfaces
     * with capital letters.
     * 
     * Note: non-object {requirements} param is treated in such way:
     * scalar -> [[scalar]]; [scalar] -> [[scalar]]
     * 
     * @param {Object} object Object that we check
     * @param array|string {requirements} one/two dimensional array or single element
     *          with class/interface name(s), method name(s) or constructors
     * @returns boolean TRUE if matches, FALSE if not
     */
    
    meetsRequirements: function(object, requirements) {
        if (!(requirements instanceof Array)) requirements = [[requirements]];
        for (var i = 0, l = requirements.length; i < l; i++) {
            var rqs = requirements[i], matches = true;
            if (!(rqs instanceof Array)) rqs = [rqs];
            for (var j = 0, l1 = rqs.length; j < l1; j++) {
                var rq = rqs[j], m = false, v;
                if (typeof rq === 'function') m = object instanceof rq;
                else {
                    v = object[rq];
                    m =     v === '__CLASS__' 
                        ||  v === '__INTERFACE__' 
                        ||  v === '__PARENT__' 
                        ||  typeof v === 'function';
                }
                if (!m) { matches = false; break; }
            }
            if (matches) return true;
        }
        return false;
    },
    
    getClass: function(object, all) {
        var r;
        if (all) r = [];
        for (var i in object) {
            if (object[i] === '__CLASS__' || (all && object[i] === '__PARENT__')) {
                if (all) r.push(i); 
                    else return i;
            }
        }
        if (!all) return null;
            else return r;
    },
    
    // commonWithObject - list only interfaces that are already present in object "commonWithObject" argument
    getInterfaces: function(object, commonWithObject) {
        var res = [];
        for (var i in object) {
            if (object[i] === '__INTERFACE__') {
                if (!commonWithObject || commonWithObject[i]) {
                    res.push(i); 
                }
            }
        }
        return res;
    },

    // Returns true if `item` has all aff the `interfaces` (may be array or a string)
    hasInterfaces: function(item, interfaces, throwIfNot) {
        if (!interfaces) return true; // empty parameter - don't do anything
        if (!(interfaces instanceof Array)) interfaces = [interfaces];
        for (var i = interfaces.length - 1; i >=0; i--) {
            if (!item || item[interfaces[i]] !== '__INTERFACE__') {
                if (throwIfNot) {
                    var argname = typeof throwIfNot === 'string'? throwIfNot : '`item`';
                    throw argname += " must implement all following interfaces: " + interfaces.join(',')
                        + " but it doesn't implement interface " + interfaces[i];
                } else {
                    return false;
                }
            }
        }
        return true;
    },
    
    is: function(item, className, throwIfNot) {
        if (className instanceof Array) {
            for (var j = 0, n = j.length; j < n; j++) if (Amm.is(item, className[j])) return true;
            if (throwIfNot) {
                var argname = typeof throwIfNot === 'string'? throwIfNot : '`item`';
                throw argname + " must be an instance of " + className.join("|");
            }
            return res;
        }
        if (typeof className === 'function') {
            if (item instanceof className) return true;
            var tmpClassName = Amm.getClass(className.prototype);
            if (!tmpClassName) return false;
            className = tmpClassName;
        }
        var res = item && (item[className] === '__CLASS__' || item[className] === '__PARENT__' || item[className] === '__INTERFACE__');
        if (!res && throwIfNot) {
            var argname = typeof throwIfNot === 'string'? throwIfNot : '`item`';
            throw argname + " must be an instance of " + className;
        }
        return res;
    },
    
    getByPath: function(path) {
        return this.p(path);
    },
    
    p: function(path) {
        if (path[0] === '^' && this._byPaths[path]) return this._byPaths[path];
        return this.getRoot().getByPath(path);
    },
    
    /**
     * adds function and scope to wait for the element with given path to appear
     */
    waitFor: function(elementPath, fn, scope, extra) {
        scope = scope || null;
        extra = extra || null;
        if (!this._waitList[elementPath]) this._waitList[elementPath] = [];
        else {
            for (var i = this._waitList[elementPath].length - 1; i >= 0; i--) {
                // already waiting
                if (
                       this._waitList[elementPath][i][0] === fn 
                    && this._waitList[elementPath][i][1] === scope 
                    && this._waitList[elementPath][i][2] === extra
                   ) 
                    return false;
            }
        }
        this._waitList[elementPath].push([fn, scope, extra]);
    },
            
    notifyElementPathChanged: function(element, path, oldPath) {
        if (oldPath && oldPath[0] === '^' && this._byPaths[oldPath] === element) delete this._byPaths[oldPath];
        if (path && path[0] === '^') this._byPaths[path] = element;
        if (!this._waitList[path]) return;
        var v = this._waitList[path], l = v.length;
        delete this._waitList[path];
        for (var i = 0; i < l; i++) v[i][0].call(v[i][1] || element, element, path, v[i][2]);
    },
    
    stopWaiting: function(elementPath, fn, scope, extra) {
        elementPath = elementPath || null;
        fn = fn || null;
        var kk;
        if (elementPath === null) kk = this._waitList;
        else kk = { elementPath : true };
        for (var i in kk) if (this._waitList.hasOwnProperty(i)) {
            if (fn === undefined && scope === undefined && extra === undefined) {
                delete this._waitList[i];
            } else {
                var v = this._waitList[elementPath];
                for (var j = v.length - 1; j >= 0; j--) {
                    if (    (fn === undefined || v[j][0] === fn) 
                         && (scope === undefined || v[j][1] === scope) 
                         && (extra === undefined || v[j][2] === extra)
                        ) {
                        v[i].splice(j, 1);
                    }
                }
            }
        }
    },
    
    /**
     * If Array propList is provided, only properties in propList will be used to initialize object.
     * Found properties will be deleted from options array.
     * That allows us to prioritize properties using several init() calls
     */
    init: function(object, options, propList) {
        if (!options) return;
        var optToSet = null;
        if (propList instanceof Array) {
            for (var j = 0, l = propList.length; j < l; j++) {
                if (propList[j] in options) {
                    if (!optToSet) optToSet = {};
                    optToSet[propList[j]] = options[propList[j]];
                    delete options[propList[j]];
                }
            }
        } else {
            optToSet = options;
        }
        if (!optToSet) return;
        for (var i in optToSet) if (optToSet.hasOwnProperty(i)) {
            if (i[0] === '_') throw "Use of pseudo-private identifiers is prohibited in `optToSet`, encountered: '" + i + "'";
            if (i in object && typeof object[i] === 'function') {
                if (typeof optToSet[i] === 'function') object[i] = optToSet[i];
                else throw "Only function is allowed to override the function (`" + i +"` provided is " + (typeof optToSet[i]) + ")";
            } 
            var v = optToSet[i], s = 'set' + ('' + i).slice(0, 1).toUpperCase() + ('' + i).slice(1);
            if (typeof object[s] === 'function') object[s](v);
            else if (i in object) object[i] = v;
            else if (typeof v === 'function') object[i] = v;
            else {
                throw "No such property: '" + i + "' in " + (this.getClass(object) || '`object`');
            }
        }
    },
    
    getFunction: function(strName) {
        if (typeof strName === 'function') return strName;
        if (typeof strName !== 'string') {
            throw "`strName` must be a string, given: " + this.describeType(strName);
        }
        if (this._functions[strName]) return this._functions[strName];
        var p = strName.split('.'), r = this._namespaces, s = [];
        while (p.length && r) {
            var h = p.splice(0, 1)[0];
            s.push (h);
            r = r[h];
        }
        if (!r) {
            if (p.length) {
                throw "Unknown namespace '" + s.join('.') + "' (when trying to locate function '" + strName + "')";
            } 
            else throw "Unknown function '" + s.join('.') + "'";
        }
        return r;
    },
    
    registerNamespace: function(ns, hash) {
        if (typeof ns !== 'string') throw "`ns` must be a string";
        if (!hash || typeof hash !== 'object' && typeof hash !== 'function') {
            throw "Amm.registerNamespace: `hash` must be an object or a function";
        }
        this._namespaces[ns] = hash;
    },
    
    registerFunction: function(name, fn) {
        if (typeof name !== 'string') throw "`name` must be a string";
        if (!fn || typeof fn !== 'function') throw "`fn` must be a function";
        this._functions[name] = fn;
    },
    
    pushEvent: function(event) {
        var tmp = this.event;
        event.parent = tmp;
        this._eventStack.push(this.event);
        this.event = event;
    },
    
    popEvent: function() {
        this.event = this._eventStack.pop();
    },
    
    // returns TRUE if `element` has together setter, getter and change event for given `property`.
    // if outCaps is object, then it will have 'setterName', 'getterName' and 'eventName' properties set to either
    // respective value (i.e. getFoo, setFoo and fooChange) or NULL if such method or event doesn't exists 
    // -- disregarding to the method result
    
    detectProperty: function(element, property, outCaps) {
        var P = property[0].toUpperCase() + property.slice(1),
            getterName = 'get' + P, 
            setterName = 'set' + P, 
            eventName = property + 'Change';
        if (typeof element[getterName] !== 'function') getterName = null;
        if (typeof element[setterName] !== 'function') setterName = null;
        if (typeof element.hasEvent !== 'function' || !element.hasEvent(eventName)) eventName = null;
        var res = eventName && getterName && setterName;
        if (outCaps && typeof outCaps === 'object') {
            outCaps.getterName = getterName;
            outCaps.setterName = setterName;
            outCaps.eventName = eventName;
        }
        return res;
    },
    
    getProperty: function(element, property, defaultValue, args) {
        var res;
        if (!element) return defaultValue;
        if (element instanceof Array) {
            var r = [];
            for (var i = 0; i < element.length; i++) {
                r.push(this.getProperty(element[i], property, defaultValue));
            }
            return r;
        }
        if (property instanceof Array) {
            var r = {};
            for (var i = 0; i < property.length; i++) {
                r[property[i]] = (this.getProperty(element, property[i], defaultValue));
            }
            return r;
        }
        var P = ('' + property)[0].toUpperCase() + property.slice(1), getterName = 'get' + P;
        if (args !== undefined && args !== null) {
            if (!(args instanceof Array)) args = [args];
        }
        if (typeof element[getterName] === 'function') {
            res = args? element[getterName].apply(element, args) : element[getterName]();
        }
        else if (property in element) res = element[property];
        else if (property === 'class') res = Amm.getClass(element);
        else res = defaultValue;
        return res;
    },
    
    setProperty: function(element, property, value, throwIfNotFound, args) {
        if (value === undefined && property && (typeof property === 'object')) {
            var res = {};
            for (var i in property) {
                if (property.hasOwnProperty(i)) res[i] = Amm.setProperty(element, i, property[i], throwIfNotFound);
            }
            return res;
        }
        var P = ('' + property[0]).toUpperCase() + property.slice(1), setterName = 'set' + P;
        if (args !== undefined && args !== null) {
            if (!(args instanceof Array)) args = [args];
            args.unshift(value);
        }
        if (typeof element[setterName] === 'function') {
            res = args? element[setterName].apply(element, args) : element[setterName](value);
        }
        else if (property in element) element[property] = value;
        else if (throwIfNotFound) throw "No setter for property: `" + property + "`";
        return res;
    },
    
    createProperty: function(target, propName, defaultValue, onChange) {
        
        if (!target || typeof target !== 'object') 
            throw "`target` must be an object";
        
        var 
            sfx = propName.slice(1), 
            u = propName[0].toUpperCase() + sfx, 
            l = propName[0].toLowerCase() + sfx,
            getterName = 'get' + u,
            setterName = 'set' + u,
            outName = 'out' + u + 'Change',
            eventName = l + 'Change',
            memberName = '_' + l;
        
        if (!(memberName in target)) target[memberName] = defaultValue;
        if (!(getterName in target)) {
            target[getterName] = function() { 
                return this[memberName]; 
            };
        }
        if (!(setterName in target)) {
            target[setterName] = function(value) { 
                var old = this[memberName];
                if (old === value) return;
                this[memberName] = value;
                if (onChange) onChange.call(this, value, old);
                this[outName](value, old);
                return true;
            };
        }
        if (!(outName in target)) {
            target[outName] = function(value, oldValue) {
                this._out(eventName, value, oldValue);
            };
        }
    },
    
    decorate: function(value, decorator, context) {
        if (!decorator) return value;
        else if (typeof decorator === 'function') return context? decorator.call(context, value) : decorator(value);
        else if (typeof decorator === 'object' || typeof decorator === 'string') {
            if (!decorator.class && typeof decorator.decorate === 'function') return decorator.decorate(value, context);
            else {
                var instance = Amm.Decorator.construct(decorator);
                return instance.decorate(value);
            }
        } else {
            throw "`decorator` must be either function or an object with .decorate() method";
        }
    },
    
    /**
     * Accepts any number of arguments to call .cleanup() function of each.
     * Arrays memebers will be .cleanup()-ed recursively.
     * Throws if arg is not an array AND doesn't have cleanup() method.
     * If first argument is TRUE, that will be overridden and args/members without .cleanup() will be ignored.
     * If first argument is FALSE, default behaviour is applied.
     */
    cleanup: function(itemOrItems, _) {
        var noThrow = false, s = 0;
        if (typeof itemOrItems === 'boolean') {
            noThrow = itemOrItems[0];
            s = 1;
        }
        for (var j = s, al = arguments.length; j < al; j++) {
            itemOrItems = arguments[j];
            if (!itemOrItems) continue;
            if (typeof itemOrItems.cleanup === 'function') itemOrItems.cleanup();
            else if (itemOrItems instanceof Array) {
                for (var i = s, l = itemOrItems.length; i < l; i++)
                    this.cleanup(itemOrItems[i]);
            } else {
                if (!noThrow)
                    throw '`itemOrItems` must be either an object with .cleanup() method or an Array';
            }
        }
    },
    
    keys: function(hash) {
        var res = [];
        for (var i in hash) if (hash.hasOwnProperty(i)) res.push(i);
        return res;
    },
    
    bootstrap: function() {
        if (!jQuery) throw "Amm.bootstrap: jQuery not found";
        if (this._bootstrapped) return;
        this._bootstrapped = true;
        var t = this;
        jQuery(function() { t._doBootstrap(); });
    },
    
    _doBootstrap: function() {
        if (this.optionsObjectId && window[this.optionsObjectId]) {
            var opt = window[this.optionsObjectId];
            if (typeof opt === 'object') Amm.init(this, opt);
        }
        Amm.registerNamespace('v', Amm.View.Html);
        Amm.registerNamespace('t', Amm.Trait);
        if (this.autoBuildSelector) {
            var sel = this.autoBuildSelector;
            this._autoBuilder = new Amm.Builder(sel, this.defaultBuilderOptions);
            this._autoBuilder.build();
        }
    },
    
    /**
     * Constructs instance from options array, in many ways similar to Avancore' Ac_Prototyped::factory.
     * If instance of any class (Amm.getClass(options) != false) is provided, `options` is treated as already instantiated object,
     * and "new" isn't called.
     * 
     * Instantiation is performed as follows:
     * -    try to use options.class constructor, if provided.
     * -    if `options` is string, treat that string as class name (`options` := {class: `options`})
     * Will add `defaults` to options hash, if provided (again, for strings, `defaults` := {class: `defaults`}).
     * Will merge `options` hash with `defaults`.
     * If no `class` provided, `baseClass` will be used (if provided).
     * 
     * If instance was already passed instead of `options`, and `setToDefaults` is TRUE, will set instance properties
     *  to values from `defaults` (except `class`).
     * 
     * Performs checks after instantiation:
     * -    if `baseClass` was provided, checks against `baseClass`
     * -    if `requirements` was provided, checks against `requirements` using Amm.meetsRequirements
     * 
     * Returns created instance.
     * 
     * @param {object|string|instance} options
     * @param {string} baseClass
     * @param {string|object} defaults
     * @param {type} setToDefaults
     * @param {type} requirements
     * @returns {undefined}
     */
    constructInstance: function(options, baseClass, defaults, setToDefaults, requirements) {
        var instance;
        if (typeof options === 'string' || typeof options === 'function')
            options = {class: options};
        else if (!options) options = {};
        else if (typeof options !== 'object')
            throw "`options` must be a string, an object, a function or FALSEable value";
        if (Amm.getClass(options)) {
            instance = options;
            if (setToDefaults && defaults && typeof defaults === 'object') {
                Amm.setProperty(instance, defaults);
            }
        } else {
            options = Amm.override({}, options);
            if (defaults) {
                if (typeof defaults === 'string') defaults = {class: defaults};
                else if (typeof defaults !== 'object') 
                    throw "`defaults` must be a string, an object or FALSEable value";
                for (var i in defaults) if (!(i in options) && defaults.hasOwnProperty(i)) {
                    options[i] = defaults[i];
                }
            }
            var cr = options['class'] || baseClass;
            if (typeof options === 'function') cr = options;
            cr = Amm.getFunction(cr);
            if (!cr) throw "Either options.class or baseClass are required";
            delete options['class'];
            instance = new cr(options);
        }
        
        if (baseClass) Amm.is(instance, baseClass, 'created instance');
        if (requirements && !Amm.meetsRequirements(instance, requirements)) {
            throw "created instance doesn't meet specified requirements";
        }
        
        return instance;
    },
    
    constructMany: function(options, baseClass, defaults, keyToProperty, setToDefaults, requirements) {
        var keys = [];
        var items;
        if (options instanceof Array) {
            items = options;
        } else if (options && typeof options === 'object') {
            items = [];
            for (var i in options) if (options.hasOwnProperty(i)) {
                keys.push(i);
                items.push(options[i]);
            }
        } else {
            throw "`options` must be either Array or a hash";
        }
        var res = [];
        var def;
        
        if (defaults) def = keyToProperty? Amm.override({}, defaults) : defaults;
        else def = {};
        
        for (var i = 0, l = items.length; i < l; i++) {
            try {
                if (keyToProperty && def) {
                    if (keys[i]) def[keyToProperty] = keys[i];
                    else if (keyToProperty in defaults) def[keyToProperty] = defaults[keyToProperty];
                    else delete def[keyToProperty];
                }
                var instance = new Amm.constructInstance(items[i], baseClass, def, setToDefaults, requirements);
                if (instance === items[i] && keyToProperty && keys[i] && !setToDefaults) { // have to do it ourselves
                    Amm.setProperty(instance, keyToProperty, keys[i]);
                }
                res.push(instance);
            } catch (e) {
                if (typeof e === "string") e = "item #'" + (keys[i] || i) + "': " + e;
                throw e;
            }
        }
        return res;
    },
    
    /**
     * Tries to translate message string using key from Amm.lang.
     * Replaces placeholders provided in variable-length arguments list.
     * _msg(message, placeholder1, value1, placeholder2, value2...)
     * @param {string} message
     * @returns {string} Translated + placeholders-replaced string
     */
    translate: function(message, args_) {
        var m = message;
        if (Amm.lang[m]) m = Amm.lang[m];
        for (var i = 1, l = arguments.length; i < l; i += 2) {
            m = m.replace(new RegExp(Amm.Util.regexEscape(arguments[i]), 'g'), arguments[i + 1]);
        }
        return m;
    },
    
    /**
     * @param {object} langStrings { stringId: value }
     * @param {boolean} overwrite overwrite already defined strings
     */
    defineLangStrings: function(langStrings, overwrite) {
        for (var i in langStrings) if (langStrings.hasOwnProperty(i)) {
            if (overwrite || !(i in this.lang)) this.lang[i] = langStrings[i];
        }
    },
    
    describeType: function(value) {
        var t = typeof value;
        if (t !== 'object') return t;
        if (!value) return 'null';
        var c = Amm.getClass(value);
        if (c) return c;
        if (value.constructor && value.constructor.name) return value.constructor.name;
        return 'object';
    }
    
};

Amm.event = null;

//Amm.id = 'amm_' + Math.trunc(Math.random() * 1000000);

Amm.registerNamespace('Amm', Amm);

if (window.jQuery) {
    Amm.bootstrap();
}
