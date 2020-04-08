/* global Amm */

Amm = {
    
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
     * Registry of items referenced from the DOM
     */
    _items: {},
    
    /**
     * Additional info about referenced items
     */
    itemDebugInfo: {},
    
    /**
     * Last item of itemDebugTag will be recorded into itemDebugInfo along with global item identifier
     * Usage: itemDebugTag.push(value); ...do something.... itemDebugTag.pop(value)
     */
    itemDebugTag: [],
        
    /**
     * Shortcut to root element
     */
    r: null,
    
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
        if (!this._root) {
            this._root = new this.Root();
            this.r = this._root;
        }
        return this._root;
    },
    
    registerItem: function(item) {
        if (item._amm_id) return;
        item._amm_id = this.id + '_' + this._counter++;
        this._items[item._amm_id] = item;
        if (this.itemDebugTag.length) {
            this.itemDebugInfo[item._amm_id] = this.itemDebugTag[this.itemDebugTag.length - 1];
        }
        return true;
    },
    
    unregisterItem: function(item) {
        if (!item._amm_id) return; // nothing to do
        if (typeof item === 'string') item = this._items[item];
        if (item._amm_id && this._items[item._amm_id] !== item) {
            throw Error("Mismatch of _amm_id detected during the item de-registration");
        }
        delete this._items[item._amm_id];
        delete this.itemDebugInfo[item._amm_id];
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
            if (!res && throwIfNotFound) throw Error("Item '" + item + "' not found");
            return res;
        }
    },
    
    extend: function(subClass, parentClass, dontIndicateParent) {
        if (typeof subClass !== 'function') {
            throw Error("Amm.extend: `subClass` is not a function");
        };
        if (typeof parentClass !== 'function') {
            throw Error("Amm.extend: `parentClass` is not a function");
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
     *  have corresponding members (notably Amm.Trait.Field's val__{name}
     *  validation expressions)
     */
    augment: function(instance, trait, options) {
        var traitInstance, proto;
        if (typeof trait === 'string') {
            trait = Amm.getFunction(trait);
        }
        if (typeof instance !== 'object') throw Error("`instance` must be an object");
        if (typeof trait === 'function') traitInstance = new trait();
        else if (typeof trait === 'object') traitInstance = trait;
        else throw Error("`trait` must be an object or a function (constructor)");
        var conflicts = this.getInterfaces(instance, traitInstance);
        if (conflicts.length) 
            throw Error("Cannot augment: `instance` already implements same interfaces as the `traitInstance`: "
                + conflicts.join(', ') + ")");
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
    
    overrideRecursive: function(modifiedObject, overrider, noOverwrite, deduplicate) {
        if (typeof modifiedObject !== 'object' || typeof overrider !== 'object')
            throw Error('Both modifiedObject and overrider must be objects');

        for (var i in overrider) if (overrider.hasOwnProperty(i)) {
            if (modifiedObject[i] instanceof Array && overrider[i] instanceof Array) {
                if (!deduplicate || !modifiedObject[i].length) {
                    modifiedObject[i] = modifiedObject[i].concat(overrider[i]);
                    continue;
                }
                for (var j = 0, l = overrider[i].length; j < l; j++) {
                    if (Amm.Array.indexOf(overrider[i][j], modifiedObject[i]) >= 0) continue;
                    modifiedObject[i].push(overrider[i][j]); 
                }
            } else if (typeof modifiedObject[i] === 'object' && typeof overrider[i] === 'object')  {
                this.overrideRecursive(modifiedObject[i], overrider[i], noOverwrite, deduplicate);
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
    
    meetsRequirements: function(object, requirements, paramName) {
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
        if (paramName) {
            throw Error("[" + Amm.describeType(object) + "] `" + paramName + "` " 
                    + "doesn't meet following requirement(s): " + Amm.describeRequirements(requirements));
        }
        return false;
    },
    
    describeRequirements: function (requirements) {
        var top = [];
        for (var i = 0; i < requirements.length; i++) {
            var rqs = requirements[i], strGroup;
            if (!(rqs instanceof Array)) rqs = [rqs];
            for (var j = 0; j < rqs.length; j++) {
                if (rqs[j][0].toLowerCase() === rqs[j][0]) {
                     rqs[j] += '()';
                }
            }
            if (rqs.length > 1) {
                strGroup = '( ' + rqs.join(' & ') + ' )';
            } else {
                strGroup = rqs[0];
            }
            top.push(strGroup);
        }
        return top.join(' || ');
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
                    throw Error(argname += " must implement all following interfaces: " + interfaces.join(',')
                        + " but it doesn't implement interface " + interfaces[i]);
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
                throw Error(argname + " must be an instance of " + className.join("|") + "; given: " + Amm.describeType(item));
            }
            return res;
        }
        if (typeof className === 'function') {
            if (item instanceof className) return true;
            var tmpClassName = Amm.getClass(className.prototype);
            if (!tmpClassName) return false;
            className = tmpClassName;
        }
        var res = item && (
                item[className] === '__CLASS__' 
            ||  item[className] === '__PARENT__' 
            ||  item[className] === '__INTERFACE__'
        );
        if (!res && throwIfNot) {
            var argname = typeof throwIfNot === 'string'? throwIfNot : '`item`';
            throw Error(argname + " must be an instance of " + className + "; given: " + Amm.describeType(item));
        }
        return res;
    },
    
    /**
     * If Array propList is provided, only properties in propList will be used to initialize object.
     * Found properties will be deleted from options array.
     * That allows us to prioritize properties using several init() calls
     */
    init: function(object, options, propList, noSuchPropertyCallback) {
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
            if (i[0] === '_') throw Error("Use of pseudo-private identifiers is prohibited in `optToSet`, encountered: '" + i + "'");
            if (i in object && typeof object[i] === 'function') {
                if (typeof optToSet[i] === 'function') object[i] = optToSet[i];
                else throw Error("Only function is allowed to override the function (`" + i +"` provided is " + (typeof optToSet[i]) + ")");
            } 
            var v = optToSet[i], s = 'set' + ('' + i).slice(0, 1).toUpperCase() + ('' + i).slice(1);
            if (typeof object[s] === 'function') object[s](v);
            else if (i in object) object[i] = v;
            else if (typeof v === 'function') object[i] = v;
            else {
                var shouldThrow = true;
                if (typeof noSuchPropertyCallback === 'function') {
                    shouldThrow = !noSuchPropertyCallback.call(object, i, v);
                }
                if (shouldThrow) {
                    throw Error("No such property: '" + i + "' in " + (this.getClass(object) || '`object`'));
                }
            }
        }
    },
    
    getFunction: function(strName, dontThrow) {
        if (typeof strName === 'function') return strName;
        if (typeof strName !== 'string') {
            throw Error("`strName` must be a string, given: " + this.describeType(strName));
        }
        if (this._functions[strName]) return this._functions[strName];
        var p = strName.split('.'), r = this._namespaces, s = [];
        while (p.length && r) {
            var h = p.splice(0, 1)[0];
            s.push (h);
            r = r[h];
        }
        if (!r) {
            if (dontThrow) return null;
            if (p.length) {
                throw Error("Unknown namespace '" + s.join('.') + "' (when trying to locate function '" + strName + "')");
            } 
            else {
                throw Error("Unknown function '" + s.join('.') + "'");
            }
        }
        return r;
    },
    
    registerNamespace: function(ns, hash) {
        if (typeof ns !== 'string') throw Error("`ns` must be a string");
        if (!hash || typeof hash !== 'object' && typeof hash !== 'function') {
            throw Error("Amm.registerNamespace: `hash` must be an object or a function");
        }
        this._namespaces[ns] = hash;
    },
    
    registerFunction: function(name, fn) {
        if (typeof name !== 'string') throw Error("`name` must be a string");
        if (!fn || typeof fn !== 'function') throw Error("`fn` must be a function");
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
    
    /**
     * Detects if object has Amm-style property (getter + setter + event methods)
     * To have Amm-style property 'value', object must have three methods:
     * setValue, getValue, outValueChange (more specifically, report
     * hasEvent('valueChange') === true).
     * 
     * if outCaps an object, then it will have 'setterName', 'getterName',
     * and 'eventName' properties set to names of respective object parts
     * (event name is 'valueChange' instead of outValueChange)
     * even if method retrns false.
     */ 
    detectProperty: function(object, property, outCaps) {
        var P = property[0].toUpperCase() + property.slice(1),
            getterName = 'get' + P, 
            setterName = 'set' + P, 
            eventName = property + 'Change';
        if (typeof object[getterName] !== 'function') getterName = null;
        if (typeof object[setterName] !== 'function') setterName = null;
        if (typeof object.hasEvent !== 'function' || !object.hasEvent(eventName))
            eventName = null;
        var res = eventName && getterName && setterName;
        if (outCaps && typeof outCaps === 'object') {
            outCaps.getterName = getterName;
            outCaps.setterName = setterName;
            outCaps.eventName = eventName;
        }
        return res;
    },
    
    getProperty: function(object, property, defaultValue, args) {
        var res;
        if (typeof object !== 'object' || !object) return defaultValue;
        if (object instanceof Array) {
            var r = [];
            for (var i = 0; i < object.length; i++) {
                r.push(this.getProperty(object[i], property, defaultValue));
            }
            return r;
        }
        if (property instanceof Array) {
            var r = {};
            for (var i = 0; i < property.length; i++) {
                r[property[i]] = (this.getProperty(object, property[i], defaultValue));
            }
            return r;
        }
        var P = ('' + property)[0].toUpperCase() + property.slice(1), getterName = 'get' + P;
        if (args !== undefined && args !== null) {
            if (!(args instanceof Array)) args = [args];
        }
        if (typeof object[getterName] === 'function') {
            res = args? object[getterName].apply(object, args) : object[getterName]();
        }
        else if (property in object) res = object[property];
        else if (property === 'class') res = Amm.getClass(object);
        else res = defaultValue;
        return res;
    },
    
    setProperty: function(object, property, value, throwIfNotFound, args) {
        if (object instanceof Array) {
            for (var i = 0, l = object.length; i < l; i++) {
                Amm.setProperty(object[i], property, value, throwIfNotFound, args);
            }
            return;
        }
        if (value === undefined && property && (typeof property === 'object')) {
            var res = {};
            for (var i in property) {
                if (property.hasOwnProperty(i)) res[i] = Amm.setProperty(object, i, property[i], throwIfNotFound);
            }
            return res;
        }
        var P = ('' + property[0]).toUpperCase() + property.slice(1), setterName = 'set' + P;
        if (args !== undefined && args !== null) {
            if (!(args instanceof Array)) args = [args];
            else args = [].concat(args);
            args.unshift(value);
        }
        if (typeof object[setterName] === 'function') {
            res = args? object[setterName].apply(object, args) : object[setterName](value);
        }
        else if (property in object) object[property] = value;
        else if (throwIfNotFound) throw Error("No setter for property: `" + property + "`");
        return res;
    },

    /**
     * 
     * onChange may be either function or {before: function, after: function}.
     * 
     * when before handler returns non-undefined result, it will be used insetad
     * of value.
     * 
     * when no before handler is provided, onChange will be ran assigning internal value.
     * 
     * @param {type} target
     * @param {type} propName
     * @param {type} defaultValue
     * @param {null|function|object} onChange
     * @param {type} defineProperty
     * @returns {undefined}
     */
    createProperty: function(target, propName, defaultValue, onChange, defineProperty) {
        
        if (!target || typeof target !== 'object') 
            throw Error("`target` must be an object");
        
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
        
        var beforeChange = onChange? onChange.before : null;
        var afterChange = onChange? onChange.after || onChange : null;
        if (typeof afterChange !== 'function') afterChange = null;
        
        if (!(setterName in target)) {
            target[setterName] = function(value) { 
                var old = this[memberName], ret;
                if (beforeChange) {
                    ret = beforeChange.call(this, value, old, propName);
                    if (ret !== undefined) value = ret;
                }
                if (old === value) return;
                this[memberName] = value;
                if (afterChange) {
                    afterChange.call(this, value, old, propName);
                    if (this[memberName] !== old) {
                        this[outName](this[memberName], old);
                    }
                } else {
                    this[outName](value, old);
                }
                return true;
            };
        }
        if (outName && !(outName in target)) {
            target[outName] = function(value, oldValue) {
                if (typeof this._out === 'function') {
                    this._out(eventName, value, oldValue);
                }
            };
        }
        if (defineProperty) {
            Object.defineProperty(target, l, {
                enumerable: true,
                get: target[getterName], 
                set: target[setterName]
            });
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
            throw Error("`decorator` must be either function or an object with .decorate() method");
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
            var hadCleanup = false;
            if (typeof itemOrItems.cleanup === 'function') {
                itemOrItems.cleanup();
                hadCleanup = true;
            }
            if (itemOrItems instanceof Array) {
                for (var i = s, l = itemOrItems.length; i < l; i++)
                    this.cleanup(itemOrItems[i]);
                return;
            }
            if ('_amm_id' in itemOrItems) this.unregisterItem(itemOrItems);
            else {
                if (!hadCleanup && !noThrow)
                    throw Error('`itemOrItems` must be either an object with .cleanup() method or an Array');
            }
        }
    },
    
    keys: function(hash) {
        var res = [];
        for (var i in hash) if (hash.hasOwnProperty(i)) res.push(i);
        return res;
    },
    
    values: function(hash) {
        var res = [];
        for (var i in hash) if (hash.hasOwnProperty(i)) res.push(hash[i]);
        return res;
    },
    
    bootstrap: function() {
        if (!jQuery) throw Error("Amm.bootstrap: jQuery not found");
        var t = this;
        jQuery(function() { t._doBootstrap(); });
    },
    
    getBootstrapped: function() {
        return this._bootstrapped;
    },
    
    _doBootstrap: function() {
        if (this._bootstrapped) return;
        this._bootstrapped = true;
        if (this.optionsObjectId && window[this.optionsObjectId]) {
            var opt = window[this.optionsObjectId];
            if (typeof opt === 'object') this.init(this, opt);
        }
        this.registerNamespace('v', this.View.Html);
        this.registerNamespace('t', this.Trait);
        if (this.autoBuildSelector) {
            var sel = this.autoBuildSelector;
            this._autoBuilder = new this.Builder(sel, this.defaultBuilderOptions);
            this._autoBuilder.build();
        }
        this.getRoot().raiseEvent('bootstrap');
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
        if (typeof options === 'string' || typeof options === 'function') {
            options = {class: options};
        }
        else if (!options) options = {};
        else if (typeof options !== 'object')
            throw Error("`options` must be a string, an object, a function or FALSEable value");
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
                    throw Error("`defaults` must be a string, an object or FALSEable value");
                for (var i in defaults) if (!(i in options) && defaults.hasOwnProperty(i)) {
                    options[i] = defaults[i];
                }
            }
            var cr = options['class'] || baseClass;
            if (typeof options === 'function') cr = options;
            cr = Amm.getFunction(cr);
            if (!cr) throw Error("Either options.class or baseClass are required");
            delete options['class'];
            instance = new cr(options);
        }
        
        if (baseClass) Amm.is(instance, baseClass, 'created instance');
        if (requirements && !Amm.meetsRequirements(instance, requirements)) {
            throw Error("created instance doesn't meet specified requirements");
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
            throw Error("`options` must be either Array or a hash");
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
                if (typeof e === "string") e = Error("item #'" + (keys[i] || i) + "': " + e);
                else if (e instanceof Error) {
                    e.message = "item #'" + (keys[i] || i) + "': " + e.message;
                }
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
    },
    
    /**
     * Traverses dom tree up until discovers Amm view that is bound to the node.
     * Returns element of that view
     */
    findElement: function(domNode) {
        var views = Amm.DomHolder.find(domNode);
        if (views[0] && views[0]['Amm.View.Abstract']) return views[0].getElement();
        return null;
    },
    
    callMethods: function(object, prefix /*, ...*/) {
        var rx = prefix instanceof RegExp, aa, res = {};
        for (var i in object) {
            if (typeof object[i] === 'function' && (rx? i.match(rx) : i.indexOf(prefix) === 0)) {
                aa = aa || Array.prototype.slice.call(arguments, 2);
                res[i] = object[i].apply(object, aa);
            }
        }
        return res;
    },
    
    /**
     * Creates HTML string from provided definition. Does NOT create DOM nodes.
     * 
     * Definition is:
     *
     * string - will return string
     * array - will concatenate array of definitions
     * hash:
     *      { $: tagName, $$: contentDefinition, attr: value, attr2: value2 }
     * where 
     * 
     *      value may be scalar, hash or arary.
     *      
     *  scalar value will be converted to string and added as-is.
     *  
     *  hashes and arrays will be converted to JSON and inserted into attribute, except for attr == 'style'.
     *  For 'style' attribute hash keys will be recursively merged using '-' as glue string, i.e.
     *  
     *      { style: { display: 'block', background: { color: 'red', image: 'url("foo.gif")', repeat: 'none' } } }
     *      
     *  will be converted into style="display: block; background-color: red; background-image: url("foo.gif"); background-repeat: 'none'"
     *  
     *  Note: this function returns HTML as string and does NOT create DOM nodes.
     *  
     *  $noIndent special attribute means element's content won't be indented (useful for <textarea>)
     *  $$: null means element will not have closing tag (i.e. <img />)
     *  
     *  Attributes with FALSE value will be ignored.
     *  Attributes with TRUE value will have same value as the name.
     *  By default, underscores ("_") will be converted to dashes in attribue names; that can be overridden by
     *  providing "dontReplaceUnderscores" === true.
     */
    html: function(definition, indent, indentIncrease, dontReplaceUnderscores) {
        if (indent === undefined) indent = 0;
        if (indentIncrease === undefined) indentIncrease = 4;
        var res, i, l, strIndent = '', strIndentIncrease = '';
        for (i = 0; i < indent; i++) strIndent += ' ';
        for (i = 0; i < indentIncrease; i++) strIndentIncrease += ' ';
        if (!definition || typeof definition !== 'object') return strIndent + definition;
        if (definition instanceof Array) {
            res = '';
            for (i = 0, l = definition.length; i < l; i++) {
                if (i > 0) res += '\n';
                res += Amm.html(definition[i], indent, indentIncrease, dontReplaceUnderscores);
            }
            return res;
        }
        if (!definition.$) throw Error ("`$` (tag name) must be present in attribute definition");
        res = strIndent + '<' + definition.$;
        for (i in definition) if (definition.hasOwnProperty(i)) {
            if (i[0] === '$') continue;
            var attrValue = definition[i];
            if (attrValue === false) continue;
            if (attrValue === true) attrValue = i;
            if (typeof attrValue === 'object' && attrValue) {
                if (i === 'style') {
                    var mkStyle;
                    mkStyle = function (h, v) {
                        var res = '';
                        if (!v || typeof v !== 'object') return h + ': ' + v + '; ';
                        if (v instanceof Array) return v.join(' ');
                        if (h.length) h += '-';
                        for (var i in v) if (v.hasOwnProperty(i)) {
                            res += mkStyle(h + i, v[i]);
                        }
                        return res;
                    };
                    attrValue = mkStyle('', attrValue);
                } else {
                    attrValue = JSON.stringify(attrValue).replace(/'/g, '&#39;');
                }
            }
            if (!dontReplaceUnderscores) i = i.replace(/_/g, '-');
            res += ' ' + i + "='" + attrValue + "'";
        }
        if (definition.$$ === null) {
            res += ' />';
            return res;
        }
        if (!definition.$$) {
            res += '></' + definition.$ + '>';
            return res;
        }
        var sub = definition['$noIndent']? 0 : indent + indentIncrease;
        res += '>';
        if (sub) res += '\n';
        res += Amm.html(definition.$$, sub, indentIncrease, dontReplaceUnderscores);
        if (sub) res += '\n' + strIndent;
        res += '</' + definition.$ + '>';
        return res;
    },
    
    getHtmlElements: function(elementOrHTMLElement) {
        if (elementOrHTMLElement instanceof window.HTMLElement) {
            elementOrDOMNode = Amm.findElement(elementOrHTMLElement);
        }
        if (!elementOrHTMLElement) return [];
        var ob = elementOrHTMLElement.getUniqueSubscribers('Amm.View.Html');
        var res = [];
        for (var i = 0; i < ob.length; i++) {
            var node = ob[i].getHtmlElement();
            if (node) res.push(node);
        }
        res = Amm.Array.unique(res);
        return res;
    }
    
};

Amm.event = null;

//Amm.id = 'amm_' + Math.trunc(Math.random() * 1000000);

Amm.registerNamespace('Amm', Amm);

if (window.jQuery) {
    Amm.bootstrap();
}
/* global Amm */

Amm.WithEvents = function(options, initOnHandlersOnly) {
    this._subscribers = {};
    if (options) {
        var onHandlers = this._extractOnHandlers(options);
        if (onHandlers) this._initOnHandlers(onHandlers);
        if (!initOnHandlersOnly) {
            Amm.init(this, options);
        }
    }
};

/* 
 * invokes event handler - this. must be set to the object that originated the event
 * {eventName} name of an event - will be usually accessible 
 *      with global Amm.event.name (unless {dontPush} is set to TRUE)
 * {args} are passed as arguments to the event handling function.
 * {handler} is, generally, function that will be called
 *      exceptions:
 *          -   string - scope[{handler}] will be used as function
 *          -   any object with .apply() method
 * {scope} is this. of event handler
 *          -   if scope is string, either this.getByPath(scope), - if such
 *              method exists, or with Amm.getByPath(scope) 
 *              will be used to resolve the actual scope object. 
 *          -   if the scope is not found after getByPath(), handler will be
 *              silently skipped.
 * {extra} is additional last argument that is added to the args (unless undefined)
 *          
 *  Before the call, Amm.pushEvent() is called and, during the handler invocation,
 *  Amm.event to be set to following hash:
 *      {origin: this. object, name: eventName, args: args(array)}.
 *  
 *  {dontPush} - don't populate Amm.event object
 */
Amm.WithEvents.invokeHandler = function(eventName, args, handler, scope, extra, dontPush) {
    return Amm.WithEvents.invokeHandlers.call(this, eventName, args, [[handler, scope, extra]], dontPush);
};

/*
 * Invokes group of event handlers. See Amm.WithEvents.invokeHandler().
 * Subscribers is two-dimentional array, where second index corresponds 
 * to {handler}, {scope}, {extra} of Amm.WithEvents.invokeHandler():
 * -    subscribers[i][0] is {handler}
 * -    subscribers[i][1] is {scope}
 * -    subscribers[i][2] is {extra}
 */
Amm.WithEvents.invokeHandlers = function(eventName, args, subscribers, dontPush) {
    if (!dontPush) {
        Amm.pushEvent({
            origin: this,
            name: eventName,
            args: args
            
        });
    }
    try {
        
        // if we have more than one subscriber, clone subscribers array and work on it, 
        // because both subscribers.length and subscriber may unpredictably change during
        // handlers execution and loop will not work as expected
        
        var l = subscribers.length, s = l < 2? subscribers : subscribers.slice();
        
        for (var i = 0; i < l; i++) {
            var 
                h = s[i],
                handler = h[0] || null,
                scope = h[1] || this,
                extra = h[2] || undefined;
            
            if (typeof scope === 'string') { // this is an Element
                if (typeof this.getByPath === 'function') scope = this.getByPath(scope);
                else scope = Amm.getByPath(scope);
                if (!scope) {
                    continue; // we don't have the scope yet
                }
            }
            if (!scope) scope = this;
            if (typeof handler === 'string') {
                handler = scope[handler];
            }
            var argsCpy = [].concat(args);
            if (extra !== undefined) argsCpy.push(extra);
            if (!handler || typeof handler !== 'function' && typeof handler.apply !== 'function') {
                throw Error("Cannot call non-function handler or handler without .apply");
            }
            handler.apply(scope, argsCpy);
        }
    } catch(e) {
        if (!dontPush) Amm.popEvent();
        throw e;
    }
    if (!dontPush) Amm.popEvent();
    return true;
};

Amm.WithEvents.prototype = {
    
    'Amm.WithEvents': '__CLASS__',
    
    _subscribers: null,

    // does not allow to subscribe to non-existent event
    strictEvents: true,
    
    // converts list of functions outFoo(), outBar() to 'foo', 'bar'
    listEvents: function() {
        var res = [];
        for (var i in this) {
            if (('' + i).slice(0, 3) === 'out' && typeof this[i] === 'function') {
                i = '' + i;
                i = i.slice(3, 4).toLowerCase() + i.slice(4, i.length);
                if (i.length) res.push(i);
            }
        }
        return res;
    },

    /**
     * Check if there's a "built-in" event `eventName` and returns method name to raise it 
     * (event 'foo' is built-in if function this['outFoo'] exists, and name of that function will be returned)
     * @param {string} eventName
     * @returns {String} Empty string if there is no such event, or method name to raise the event
     */
    hasEvent: function(eventName) {
        var c = eventName.charAt(0), cu = c.toUpperCase();
        if (c === cu) { // event name cannot begin from upper-case letter
            return null;
        }
        var res = '', n = 'out' + cu + eventName.slice(1);
        if (typeof this[n] === 'function') res = n;
        return res;
    },
    
    /**
     * @param {string} eventName
     * Accepts any number of additional arguments to be passed to event recipients
     */
    _out: function(eventName) {
        if (!this._subscribers) return;
        var ss = this._subscribers[eventName];
        if (!ss || !ss.length) return; // no subscribers - so we're done
        var args = Array.prototype.slice.call(arguments, 1);
        Amm.WithEvents.invokeHandlers.call(this, eventName, args, ss);
    },
    
    // returns true if subscriber was added or undefined if was already present
    subscribe: function(eventName, handler, scope, extra) {
        if (typeof eventName !== 'string' || !eventName.length) throw Error("`eventName` must be a non-empty string");
        scope = scope || null; // required by getSubscribers to work properly
        extra = extra || null;
        if (this.strictEvents && !this.hasEvent(eventName)) {
            var miss = this._handleMissingEvent(eventName, handler, scope, extra);
            if (miss === undefined) throw Error("No such out event: '" + eventName+ "'");
            if (miss === false) return true;
        }
        var isFirst = false;
        if (!this._subscribers[eventName]) {
            this._subscribers[eventName] = [];
            isFirst = true;
        }
        var res;
        if (!this.getSubscribers(eventName, handler, scope, extra).length) {
            this._subscribers[eventName].push([handler, scope, extra]);
            res = true;
        }
        if (isFirst) {
            var fn = '_subscribeFirst_' + eventName;
            if (this[fn] && typeof this[fn] === 'function') this[fn]();
        }
        return res;
    },
    
    // if returns undefined, exception "no such event" will be thrown
    // if returns FALSE, exception by subscribe() won't be raised, but event won't be added (this allow
    //      method to add event handler by itself)
    // any other result will cause event to be added by standard mechanism
    _handleMissingEvent: function(eventName, handler, scope, extra) {
    },
    
    /**
     * Returns subscribers for specific events
     * All arguments are optional
     * @return {Array[]}
     */ 
    getSubscribers: function(eventName, handler, scope, extra) {
        var res = [], keys = null;
        if (eventName === undefined) keys = this._subscribers; else {
            keys = {};
            keys[eventName] = true;
        }
        for (var i in keys) if (this._subscribers.hasOwnProperty(i)) {
            var arr = this._subscribers[i], n = arr.length;
            for (var j = 0; j < n; j++) {
                if (handler !== undefined && handler !== arr[j][0]) continue;
                if (scope !== undefined && scope !== arr[j][1]) continue;
                if (extra !== undefined && extra !== arr[j][2]) continue;
                res.push([].concat(arr[j], [i, j]));
            }
        }
        return res;
    },
    
    /**
     * Return unique scope objects for all events (if eventName not provided)
     * or an event with given id
     */
    getUniqueSubscribers: function(classOrInterface, eventName) {
        var res = [], keys = null;
        if (eventName === undefined) keys = this._subscribers; else {
            keys = {};
            keys[eventName] = true;
        }
        for (var i in keys) if (this._subscribers.hasOwnProperty(i)) {
            var arr = this._subscribers[i], n = arr.length;
            for (var j = 0; j < n; j++) {
                var scope = arr[j][1];
                if (!scope) continue;
                if (classOrInterface === undefined || Amm.is(scope, classOrInterface)) res.push(scope);
            }
        }
        return Amm.Array.unique(res);
    },
    
    /**
     * Unsubscribes eventName' handler with index {index}.
     * Returns array with one .getSubscribers() result if such handler existed,
     * otherwise returns empty array.
     */
    unsubscribeByIndex: function(eventName, index) {
        if (!this._subscribers[eventName] || !(index in this._subscribers[eventName])) return [];
        var res;
        res = [[].concat(this._subscribers[eventName][index], [eventName, index])];
        this._subscribers[eventName].splice(index, 1);
        if (!this._subscribers[eventName].length) {
            delete this._subscribers[eventName];
            var fn = '_unsubscribeLast_' + eventName;
            if (this[fn] && typeof this[fn] === 'function') this[fn]();
        }
        return res;
    },
    
    /**
     * All parameters are optional
     * @return {Array[]} list of unsubscribed handlers (as in 'getSubscribers()')
     * 
     * Special case: only one argument - Array eventName with .getSubscribers result
     * - will unset by found offsets w/o any checks.
     * 
     * Returns array with found subscribers
     */
    unsubscribe: function(eventName, handler, scope, extra) {
        var subscribers;
        if (eventName instanceof Array && arguments.length === 1) {
            subscribers = eventName;
        } else {
            subscribers = this.getSubscribers(eventName, handler, scope, extra);
        }
        for (var i = subscribers.length - 1; i >= 0; i--) {
            var r = subscribers[i];
            this._subscribers[r[3]].splice(r[4], 1);
            if (!this._subscribers[r[3]].length) {
                delete this._subscribers[r[3]];
                var fn = '_unsubscribeLast_' + eventName;
                if (this[fn] && typeof this[fn] === 'function') this[fn]();
            }
        }
        return subscribers;
    },
    
    cleanup: function() {
        this._subscribers = {};
        Amm.unregisterItem(this);
    },

    _extractOnHandlers: function(options) {
        var res = [];
        for (var i in options) {
            // on__
            if (i[0] === 'o' && i[1] === 'n' && i[2] === '_' && i[3] === '_'
                && options.hasOwnProperty(i)
            ) {
                var handler = options[i];
                if (!(handler instanceof Array)) handler = [handler];
                var eventName = i.split('__')[1]; // ignore everything past second '__'
                res.push([eventName, handler[0], handler[1], handler[2]]);
                delete options[i];
            }
        }
        return res.length? res : null;
    },
    
    _initOnHandlers: function(onHandlers) {
        for (var i = 0, l = onHandlers.length; i < l; i++) {
            this.subscribe(onHandlers[i][0], onHandlers[i][1], onHandlers[i][2], onHandlers[i][3]);
        }
    }
    
};
/* global Amm */

Amm.Array = function(options) {
    var arr = arguments, val;
    if (arr[0] instanceof Array) {
        val = arr[0];
        options = arr[1];
    } else if(arr[0] instanceof Amm.Array) {
        val = arr[0].getItems();
        options = arr[1];
    }
    Amm.WithEvents.call(this, options);
    if (val !== undefined) this.setItems(val);
};

Amm.Array.indexOf = function(item, arr, start) {
    start = start || 0;
    if (arr instanceof Array && arr.indexOf) return arr.indexOf(item, start);
    for (var i = start, l = arr.length; i < l; i++) if (item === arr[i]) return i;
    return -1;
};

Amm.Array.nonStrictIndexOf = function(item, arr, start) {
    start = start || 0;
    for (var i = start, l = arr.length; i < l; i++) if (item == arr[i]) return i;
    return -1;
};

Amm.Array.arrayChangeEvents = {
    appendItems: 'outAppendItems',
    insertItem: 'outInsertItem',
    deleteItem: 'outDeleteItem',
    replaceItem: 'outReplaceItem',
    spliceItems: 'outSpliceItems',
    reorderItems: 'outReorderItems',
    moveItem: 'outMoveItem',
    clearItems: 'outClearItems',
    itemsChange: 'outItemsChange'
};

Amm.Array.costlyEvents = {
    reorderItems: 'outReorderItems',
    moveItem: 'outMoveItem'
};

Amm.Array.prototype = {

    'Amm.Array': '__CLASS__', 

    // whether an array must have unique items. Attempt to insert same value for the second time will trigger an exception
    _unique: false,

    // comparison function. By default strict, === comparison is used
    _comparison: null,

    // when diff mode is enabled (almost always), setItems() calculates diff betwen old and new array, 
    // and tries to detect the specific action to call more concrete events.
    _diff: true,
    
    // more javascript-array-like behaviour: allow set index far behind length, create 'undefined' values in between
    // (won't make much sense when `unique` is TRUE)
    _sparse: false,
    
    _updateLevel: 0,
    
    _noTrigger: 0,
    
    _preUpdateItems: null,
    
    _evCache: null,
    
    _costlyEvents: false,
    
    length: 0,
    
    // array compat
    
    push: function(element, _) {
        var items = Array.prototype.slice.apply(arguments);
        if (this._unique) this._checkDuplicates("push()", items);
        var l = items.length;
        if (!l) return this.length;
        for (var i = 0; i < l; i++) {
            this[this.length++] = items[i];
        }
        if (!this._updateLevel) this.outAppendItems(items);
        return this.length;
    },
    
    pop: function() {
        if (!this.length) return undefined;
        --this.length;
        var res = this[this.length];
        delete this[this.length];
        if (!this._updateLevel) this.outDeleteItem(this.length, res);
        return res;
    },
    
    slice: function(start, end) {
        start = start || 0; 
        if (start < 0) start = this.length + start;
        if (start < 0) start = 0;
        if (end === undefined) end = this.length;
        if (!end) end = 0;
        if (end < 0) end = this.length + end;
        if (end < 0) end = 0;
        if (end > this.length) end = this.length;
        var res = [];
        for (var i = start; i < end; i++) res.push(this[i]);
        return res;
    },
    
    // triggers rerderItems event for all items if order of any item was
    // changed because of sorting 
    sort: function(fn, outChanged) {
        
        outChanged = outChanged || {};
        outChanged.changed = false;
        
        if (this.length <= 1) return this; // nothing to do
        
        var items = this.getItems(), oldItems = [].concat(items),
            i, l = this.length;
    
        items.sort(fn);
        var changed = false;
        if (this._comparison) {
            for (i = 0; i < l; i++) {
                changed = changed || this._comparison(this[i], items[i]);
                if (!this._sparse || i in items) {
                    this[i] = items[i];
                } else {
                    delete this[i];
                }
            }
        } else {
            for (i = 0; i < l; i++) {
                changed = changed || this[i] !== items[i];
                this[i] = items[i];
                if (!this._sparse || i in items) {
                    this[i] = items[i];
                } else {
                    delete this[i];
                }
            }
        }
        if (changed) {
            if (!this._updateLevel) this.outReorderItems(0, this.length, oldItems);
            outChanged.changed = true;
        }
        return this;
    },
    
    // triggers reorderItems event
    reverse: function() {
        
        if (this.length <= 1) return this; // nothing to do
        
        var items = this.getItems(),
            i, l = this.length - 1, max = (l - l%2)/2, tmp, a, b;
    
            
        for (i = 0; i <= max; i++) {
            if (!this._sparse || ((i in this) && (l - i) in this)) {
                tmp = this[i];
                this[i] = this[l - i];
                this[l - i] = tmp;
            } else {
                a = i in this;
                b = (l - i) in this;
                if (!a && !b) continue;
                if (b) {
                    this[i] = this[l - i];
                    delete this[l - i];
                } else {
                    this[l - i] = this[i];
                    delete this[i];
                }
            }
        }
        if (!this._updateLevel) this.outReorderItems(0, this.length, items);
        return this;
    },
    
    /* Rotates values in numeric keys to allocate or delete indexes.
       Updates this.length if {until} isn't provided.
       {start}: starting index to shift left or right
       {delta}: non-zero, negative or positive value
   */
    _rotate: function(start, delta, until) {
        if (!delta) return; // nothing to do
        var 
            a = delta < 0? start - delta : this.length - 1, 
            b = delta < 0? this.length : start - 1,
            d = delta < 0? 1 : -1;
    
        while(d*a < d*b) {
            if (a in this) 
                this[a + delta] = this[a];
            else
                delete this[a + delta];
            a += d;
        }
        if (delta < 0)
            for (var i = this.length + delta; i < this.length; i++) 
                delete(this[i]);
        
        this.length += delta;
    },
    
    _innerShift: function(a, b) {
        var d = a > b? -1 : 1;
        for (var i = a; i*d < b*d; i += d) {
            this[i] = this[i + d];
        }
    },
    
    /**
     * check duplicates both in `insert` and this.getItems() arrays
     * 
     * {method} - name of method to add to an exception message
     * {insert} - array - items to be inserted into this Array
     * {ignoreStart}, {ignoreLength} - interval to be NOT checked while
     *      duplicate hunt (i.e. if we're going to splice them out)
     * {checkOwn} - check own items for duplicates too (i.e. if we try to 
     *      change _comparisonFn or _unique, our internal perfect self
     *      may become inconsistent with new rules)
     * {comparison} - to use instead of this._comparison
     */ 
    _checkDuplicates: function(method, insert, ignoreStart, ignoreLength, checkOwn,
        comparison) {
        if (comparison === undefined) comparison = this._comparison;
        var o = this.getItems();
        if (ignoreLength) o.splice(ignoreStart, ignoreLength);
        var c = insert.concat(o), 
            d = Amm.Array.findDuplicates(
                c, true, comparison, checkOwn? null : insert.length
            );
        if (d.length) {
            var a = this._describeIdx(d[0][0], insert.length, ignoreStart || 0, 
                ignoreLength || 0),
                b = this._describeIdx(d[0][1], insert.length, ignoreStart || 0, 
                ignoreLength || 0);
            throw Error("Cannot " + method + ": duplicates found (" + a + " and " + b + ")");
        }
    },
    
    _describeIdx: function(idx, insertLength, ignoreStart, ignoreLength) {
        var length = this.length, what, resIdx;
        if (idx < insertLength) { what = "items"; resIdx = idx; }
        else if (idx < ignoreStart + insertLength) {
            what = "this";
            resIdx -= insertLength;
        } else {
            what = "this";
            resIdx = idx - insertLength + (ignoreLength || 0);
        }
        return what + "[" + resIdx + "]";
    },
    
    splice: function(start, deleteCount, item1, item2_) {
        var insert = Array.prototype.slice.call(arguments, 2), 
            insertCount = insert.length;
    
        var res = [], oldLength = this.length;
        
        start = +start || 0; 
        if (start < 0) {
            start = this.length + start;
            if (start < 0) start = 0;
        }
        else if (start > this.length) start = this.length;
        
        deleteCount = +deleteCount || 0;
        if (deleteCount < 0) deleteCount = 0;
        if (deleteCount > (this.length - start))
            deleteCount = this.length - start;
        
        if (this._unique && insertCount)
            this._checkDuplicates("splice()", insert, start, deleteCount);
        
        if (start === this.length) { // edge case - append
            this.push.apply(this, insert);
            return res;
        }
        
        var delta = insertCount - deleteCount; // how the length will change
        
        var i;
        for (i = 0; i < deleteCount; i++) res.push(this[start + i]);
        this._rotate(start, delta);
        for (i = 0; i < insertCount; i++) this[start + i] = insert[i];
        
        if (!this._updateLevel) this._outSmartSplice(start, res, insert);
        return res;
    },
    
    shift: function() {
        if (!this.length) return undefined;
        var res = this[0];
        this._rotate(0, -1);
        if (!this._updateLevel) this.outDeleteItem(0, res);
        return res;
    },
    
    unshift: function(element, _) {
        var items = Array.prototype.slice.apply(arguments), l = items.length;
        if (!l) return this.length;
        var oldLength = this.length;
        if (this._unique) this._checkDuplicates("unshift()", items);
        if (this.length) this._rotate(0, l);
            else this.length = l;
        for (var i = 0; i < l; i++) {
            this[i] = items[i];
        }
        if (!this._updateLevel) this._outSmartSplice(0, [], items);
        return this.length;
    },
    
    indexOf: function(item, start) {
        start = start || 0;
        if (start < 0) {
            start = this.length + start;
            if (start < 0) start = 0;
        }
        var res = -1;
        if (this._comparison) {
            for (var i = start, l = this.length; i < l; i++) {
                if (!this._comparison(item, this[i])) {
                    res = i;
                    break;
                }
            }
        } else {
            for (var i = start, l = this.length; i < l; i++) {
                if (item === this[i]) {
                    res = i;
                    break;
                }
            }
        }
        return res;
    },
    
    getItems: function() {
        return Array.prototype.slice.apply(this);
    },
    
    getItem: function(index) {
        return this[index];
    },
    
    getIndexExists: function(index) {
        return index in this;
    },
    
    setItem: function(index, item) {
        // already has the same item in place?
        if (
            this[index] 
            &&  this._comparison? 
                !this._comparison(this[index], item): this[index] === item
        )
            return; 
        if (this._unique) this._checkDuplicates("setItem()", [item], index, 1);
        if (index < 0) throw Error("`index` must be >= 0");
        if (index >= this.length) {
            if (!this._sparse) index = this.length;
            this.length = index + 1;
        }
        if (index in this) {
            var oldItem = this[index];
            this[index] = item;
            if (!this._updateLevel) this.outReplaceItem(index, item, oldItem);
        } else {
            this[index] = item;
            if (!this._updateLevel) this.outInsertItem(item, index);
        }
        return index;
    },
    
    removeAtIndex: function(index, sparse) {
        if (!this._sparse) sparse = false;
        if (!(index in this)) return false;
        if (index < 0) throw Error("`index` must be >= 0");
        var item = this[index];
        if (!sparse) this._rotate(index, -1);
            else delete this[index];
        if (!this._updateLevel) this.outDeleteItem(index, item);
        return true;
    },
    
    moveItem: function(index, newIndex) {
        if (index < 0) throw Error("`index` must be >= 0");
        if (index >= this.length) throw Error("No item with index " + index);
        if (newIndex < 0) throw Error("`newIndex` must be >= 0");
        if (newIndex >= this.length && !this._sparse) {
            newIndex = this.length - 1;
        }
        if (newIndex === index) return; // nothing to do
        var item = this[index], delta, start, until;
        this._innerShift(index, newIndex);
        this[newIndex] = item;
        if (!this._updateLevel) this.outMoveItem(index, newIndex, item);
    },
    
    insertItem: function(item, index) {
        if (index === undefined || index >= this.length && !this._sparse) {
            return this.push(item) - 1; // new index will be length - 1
        }
        if (index < 0) throw Error("`index` must be >= 0");
        if (this._unique) this._checkDuplicates("insertItem()", [item]);
        if (index < this.length) this._rotate(index, 1);
        if (index >= this.length) this.length = index;
        this[index] = item;
        if (!this._updateLevel) this.outInsertItem(item, index);
        return index;
    },
    
    insertItemBefore: function(item, otherItem) {
        if (otherItem === undefined) return this.insertItem(item);
        var idx = this.indexOf(otherItem);
        if (idx < 0) throw Error("cannot insertItemBefore: `otherItem` not found");
        return this.insertItem(item, idx);
    },
    
    removeItem: function(item, all) {
        if (this._unique) all = false;
        var res = 0, idx = 0;
        while((idx = this.indexOf(item, idx)) >= 0) {
            this.removeAtIndex(idx);
            res++;
            if (!all) break;
        }
        return res;
    },
    
    setItems: function(items) {
        if (!items instanceof Array) throw Error("`items` must be an array");
        if (this._unique) this._checkDuplicates("setItems()", items, 0, this.length);
        var oldItems = this.getItems(), 
            l = items.length, 
            oldLength = this.length;
        var i, j;
        for (i = 0, j = 0; i < l; i++) {
            if (i in items) {
                this[j] = items[i];
                j++;
            } else {
                if (this._sparse) {
                    delete this[j];
                    j++;
                }
            }
        }
        this.length = j;
        while (j < oldLength) delete this[j++];
        if (!this._updateLevel) {
            if (this._diff) {
                this._doDiff(oldItems, items);
            } else {
                this._outSmartSplice(0, oldItems, items);
            }
        }
        return this.length;
    },
            
    clearItems: function() {
        this.setItems([]);
    },
    
    setSparse: function(sparse) {
        var oldSparse = this._sparse;
        if (oldSparse === sparse) return;
        this._sparse = sparse;
        return true;
    },

    getSparse: function() { return this._sparse; },

    setUnique: function(unique) {
        unique = !!unique;
        var oldUnique = this._unique;
        if (oldUnique === unique) return;
        if (unique) {
            this._checkDuplicates("setUnique()", [], 0, 0, true);
        }
        this._unique = unique;
        return true;
    },
    
    getUnique: function() { return this._unique; },

    setComparison: function(comparison) {
        var oldComparison = this._comparison;
        if (oldComparison === comparison) return;
        if (this._unique) {
            this._checkDuplicates("setComparison()", [], 0, 0, true, comparison);
        }
        this._comparison = comparison;
        return true;
    },

    getComparison: function() { return this._comparison; },

    setDiff: function(diff) {
        var oldDiff = this._diff;
        if (oldDiff === diff) return;
        this._diff = diff;
        return true;
    },

    getDiff: function() { return this._diff; },
    
    _doBeginUpdate: function() {
        this._preUpdateItems = this.getItems();
    },
    
    _doEndUpdate: function() {
        if (this._diff) {
            this._doDiff();
        } else {
            if (!this._updateLevel) this.outItemsChange(this._getItems, this._preUpdateItems);
        }
        this._preUpdateItems = null;
    },
    
    beginUpdate: function() { 
        this._updateLevel++; 
        if (this._updateLevel === 1) {
            this._doBeginUpdate();
        }
    },
    
    endUpdate: function() {
        if (!this._updateLevel) throw Error("endUpdate() before beginUpdate()!");
        this._updateLevel--;
        if (this._updateLevel === 0) {
            this._doEndUpdate();
        }
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    _buildEvCache: function() {
        var ec = [{}], scp = [null]; 
        
        if (!scp.indexOf) {
            scp.indexOf = this.indexOf;
        }
        
        // scp is used to keep scopes registry
        
        for (var ev in this._subscribers) {
            if (
                this._subscribers.hasOwnProperty(ev) 
        
                // only for events that are handled specially
                && Amm.Array.arrayChangeEvents[ev]
            ) {
                var l = this._subscribers[ev].length, hdl, i, idx;
                for (i = 0; i < l; i++) {
                    hdl = this._subscribers[ev][i];
                    if (hdl[1]) {
                        idx = scp.indexOf(hdl[1]);
                        if (idx < 0) {
                            idx = scp.length;
                            scp.push(hdl[1]);
                            ec.push({});
                        }
                    }
                    else idx = 0;
                    if (!ec[idx][ev]) ec[idx][ev] = [];
                    ec[idx][ev].push(hdl);
                }
            }
        }
        
        this._evCache = ec;
        return this._evCache;
    },
    
    _outChain: function(events) {
        if (this._noTrigger || this._updateLevel) return;
        if (!this._evCache) this._buildEvCache();
        if (!this._evCache.length) return;
        var ev = [], evName, spl, args;
        for (evName in events)
            if (events.hasOwnProperty(evName)) ev.push(evName);
        // ev contains only names of events (keys from `events` argument)
        var evl = ev.length;
        for (var i = 0, l = this._evCache.length; i < l; i++) {
            for (var j = 0; j < evl; j++) {
                evName = ev[j];
                if (this._evCache[i][evName]) { // found suitable subscriber
                    var args = events[evName];
                    if (!args) {
                        args = [];
                        if (evName === 'itemsChange') {
                            args = [this.getItems()];
                            // already have'em
                            if (this._preUpdateItems) {
                                args.push(this._preUpdateItems);
                            } else if (spl = events['spliceItems']) {
                                // splice is reversibe - swap to get old value
                                var preup = [].concat(args[0]);
                                preup.splice.apply(preup, [spl[0], spl[2].length].concat(spl[1]));
                                args.push(preup);
                            }
                        }
                    }
                    Amm.WithEvents.invokeHandlers.call(
                        this,  // origin
                        evName,  // event name
                        args, // args (in "events[evName]")
                        this._evCache[i][evName] // event observers (same scope)
                    );
                    // first index in _evCache is reserved 
                    // to the subscribers w/o scope, so we notify them all
                    if (i !== 0) break;
                }
            }
        }
        this._checkLengthChange();
    },
    
    _checkLengthChange: function() {
        if (this._oldLength !== this.length) {
            var o = this._oldLength;
            this._oldLength = this.length;
            this.outLengthChange(this.length, o);
        }
    },
    
    getLength: function() {
        return this.length;
    },
    
    outLengthChange: function(newLength, oldLength) {
        return this._out('lengthChange', newLength, oldLength);
    },
    
    outClearItems: function(oldItems) {
        return this._outChain({
            clearItems: null, 
            spliceItems: [0, oldItems, []], 
            itemsChange: [[], oldItems]
        });
    },
    
    outDeleteItem: function(index, item) {
        return this._outChain({
            deleteItem: [index, item],
            spliceItems: [index, [item], []],
            itemsChange: null
        });
    },
            
    outInsertItem: function(newItem, index) {
        return this._outChain({
            insertItem: [newItem, index],
            spliceItems: [index, [], [newItem]],
            itemsChange: null
        });
    },
    
    outReplaceItem: function(index, newItem, oldItem) {
        return this._outChain({
            replaceItem: [index, newItem, oldItem],
            spliceItems: [index, [oldItem], [newItem]],
            itemsChange: null
        });
    },
    
    outAppendItems: function(items) {
        return this._outChain({
            appendItems: [items],
            spliceItems: [this.length - items.length, [], items],
            itemsChange: null
        });
    },
    
    outSpliceItems: function(index, cut, insert) {
        return this._outChain({
            spliceItems: [index, cut, insert],
            itemsChange: null
        });
    },
    
    outMoveItem: function(oldIndex, newIndex, item) {
        if (this._noTrigger) return;
        var old, offset, l;
        if (oldIndex < newIndex) {
            offset = oldIndex, l = newIndex - oldIndex + 1;
            old = this.slice(oldIndex, newIndex);
            old.unshift(item);
        } else {
            offset = newIndex;
            l = oldIndex - newIndex + 1;
            old = this.slice(newIndex + 1, oldIndex + 1);
            old.push(item);
        }
        return this._outChain({
            moveItem: [oldIndex, newIndex, this[newIndex]],
            reorderItems: [offset, l, old],
            spliceItems: [offset, old, this.slice(offset, offset + l)],
            itemsChange: null
        });
    },
    
    outReorderItems: function(index, length, oldOrder) {
        return this._outChain({ 
            reorderItems: [index, length, oldOrder],
            spliceItems: [index, oldOrder, this.slice(index, index + length)],
            itemsChange: null
        });
    },
    
    // never call directly - is called from the chain when spliceItems event 
    // is encountered (since splice is reversible and we can figure out oldItems)
    outItemsChange: function(items, oldItems) {
        return this._outChain({
            itemsChange: [items, oldItems]
        });
    },
    
    // detects boundaries and transform them into more atomic events
    _outSmartSplice: function(start, cut, insert) {
        if (this._noTrigger || this._updateLevel) return;
        
        if (!cut.length && !insert.length) return; // nothing changed

        // clear
        if (start === 0 && !insert.length && !this.length) {
            return this.outClearItems(cut);
        }
        
        // append
        if (!cut.length && start >= this.length - insert.length) {
            return this.outAppendItems(insert);
        }
        
        // insert 1
        if (!cut.length && insert.length === 1) {
            return this.outInsertItem(insert[0], start);
        }

        // replace
        if (cut.length === 1 && insert.length === 1) {
            return this.outReplaceItem(start, insert[0], cut[0]);
        }
        
        // delete
        if (cut.length === 1 && !insert.length) {
            return this.outDeleteItem(start, cut[0]);
        }

        // same... but different order?
        if (cut.length === insert.length) {
            var l1 = cut.length - 1;
            // same?
            if (Amm.Array.equal(cut, insert, undefined, undefined, undefined, this._comparison)) {
                return; // nothing changed
                
            // move first spliced element to end of splice
            } else if (this._comparison? !this._comparison(cut[0], insert[l1]) : cut[0] === insert[l1]) { // move fwd?
                if (Amm.Array.equal(cut, insert, 1, 0, l1, this._comparison))
                    return this.outMoveItem(start, start + l1, cut[0]);
            // move last spliced element to beginning of splice
            } else if (this._comparison? !this._comparison(cut[l1], insert[0]) : cut[l1] === insert[0]) {
                if (Amm.Array.equal(cut, insert, 0, 1, l1, this._comparison))
                    return this.outMoveItem(start + l1, start, cut[l1]);
            }
            // same elements, different order?
            if (!Amm.Array.symmetricDiff(cut, insert, this._comparison).length) {
                return this.outReorderItems(start, cut.length, cut);
            }
        }
        
        // phew... maybe just ordinary splice?
        return this.outSpliceItems(start, cut, insert);
    },
    
    _doDiff: function(oldItems, items) {
        oldItems = oldItems || this._preUpdateItems;
        items = items || this.getItems();
        
        var d = Amm.Array.smartDiff(oldItems, items, null, !this._costlyEvents);
        
        // * a) ['splice', start, length, elements[]]
        // * b) ['move', oldIndex, newIndex] - element was moved from `oldIndex` to `newIndex`, that's all
        // * c) ['reorder', start, length, oldItems] - `length` elements starting from `start` have different order, otherwise the same array
        // * d) null - nothing changed
        
        if (!d) return;
        if (d[0] === 'splice') {
            // will figure append/delete/insert/replace
            return this._outSmartSplice(d[1], oldItems.slice(d[1], d[1] + d[2]), d[3]);
        }
        
        if (d[0] === 'move') {
            return this.outMoveItem(d[1], d[2], this[d[2]]);
        }
            
        if (d[0] === 'reorder') {
            return this.outReorderItems(d[1], d[2], d[3]);
        }
    },

    subscribe: function(outEvent, handler, scope, extra, decorator) {    
        this._evCache = null;
        if (!this._costlyEvents && Amm.Array.costlyEvents[outEvent])
            this._costlyEvents = true;
        return Amm.WithEvents.prototype.subscribe.call
            (this, outEvent, handler, scope, extra, decorator);
    },
    
    unsubscribe: function(outEvent, handler, scope) {    
        this._evCache = null;
        var res = Amm.WithEvents.prototype.unsubscribe.call
            (this, outEvent, handler, scope);
        if (this._costlyEvents && !this._subscribers[outEvent] && Amm.Array.costlyEvents[outEvent]) {
            var hasCostly = false;
            for (var i in this._subscribers) {
                if (this._subscribers.hasOwnProperty(i) && Amm.Array.costlyEvents[i]) {
                    hasCostly = true;
                    break;
                }
            }
            if (!hasCostly) this._costlyEvents = true;
        }
        return res;
    },
    
    cleanup: function() {
        var r = Amm.WithEvents.prototype.unsubscribe.call(this);
        this._evCache = null;
        this._updateLevel = 1;
        this.setItems([]);
        this._preUpdateItems = null;
        this._updateLevel = 0;
        return r;
    }
    
};

Amm.extend(Amm.Array, Amm.WithEvents);

/**
 * returns TRUE when a.slice(aOffset, aOffset + length) === b.slice(bOffset, bOffset+length)
 * Offset defaults to 0. Ommitting length will check if arrays are equal.
 */
Amm.Array.equal = function(a, b, aOffset, bOffset, length, comparisonFn) {
    
    if (a === b) return true; // same array
    
    // shortcut
    if (!aOffset && !bOffset && length === undefined) {
        if (a.length !== b.length) return false;
        aOffset = 0;
        bOffset = 0;
        length = a.length;
    } else {
        // check how many items we will actually compare
        aOffset = aOffset || 0;
        if (aOffset < 0) aOffset = a.length + aOffset;
        if (aOffset < 0) aOffset = 0;
        bOffset = bOffset || 0;
        if (bOffset < 0) bOffset = b.length + bOffset;
        if (bOffset < 0) bOffset = 0;
        // default toward remaining items
        if (length === undefined) length = a.length - aOffset;
        if (length < 0) length = 0;
        if (length === 0) return true;
        
        // rA, rB - how much items we actually have to compare in both arrays
        
        var 
            rA = length, 
            rB = length;
    
        
        if (aOffset + length > a.length) rA = a.length - aOffset;
        if (bOffset + length > b.length) rB = b.length - bOffset;
    
        // [] == []
        if (rA <= 0 && rB <= 0) return true;
        
        // slices are of different length
        if (rA !== rB) return false; 
    }
    // at this point we are guaranteed to have slices of equal length,
    // and have aOffset, bOffset and length populated
    if (comparisonFn) {
        for (var i = 0; i < length; i++) {
            if (comparisonFn(a[aOffset + i], b[bOffset + i])) 
                return false;
        }
    } else {
        for (var i = 0; i < length; i++) {
            if (a[aOffset + i] !== b[bOffset + i]) 
                return false;
        }
    }
    return true;
};

/** 
 * @param {Array} a - old version of array. 
 * @param {Array} b - new version of array.
 * @param {function} [comparisonFn] - function that returns 0 if elements are equal (=== is used by default)
 * 
 * @param {boolean} [spliceOnly] - don't try to detect move/reorder events, 
 *      always return splice info in case of any changes
 * 
 * @param {Array} [matches] - reference to Array instance to be passed to symmetricDiff function.
 *      If symmetricDiff is not called, matches.length is 0
 * 
 * @returns {Array} [changeType, details...] - see below* 
 *      -   ['splice', start, length, elements[]]
 *      -   ['move', oldIndex, newIndex] - element was moved from `oldIndex` to `newIndex`, that's all
 *      -   ['reorder', start, length, oldItems] - `length` elements starting from `start` have different order
 *      -   null - nothing changed
 */
Amm.Array.smartDiff = function(a, b, comparisonFn, spliceOnly, matches) {
    
    var al = a.length, bl = b.length, 
            delta = bl - al,
            dBeginMax = al > bl? al : bl,
            i,
            dBegin, dEnd;
    
    if (matches && (matches instanceof Array)) matches.length = 0;
    
    // edge cases
    if (!al && !bl) return null; // edge case - both empty, thus no changes
    if (!al) return ['splice', 0, 0, [].concat(b)]; // fully insert b
    if (!bl) return ['splice', 0, al, []]; // fully clear a

    /* algorhythm
     * - start from left to right, stop on first discrepancy (dBegin)
     *      - end of array? ok, job done
     * - start from right to left, stop on first discrepancy (dEnd)
     *      - arrays of same length? - check if items between dBegin and dEnd were re-ordered 
     *          -   best case: element was moved from dBegin to dEnd or from dEnd to dBegin
     *          -   second base case: 'reorder' event
     *      - arrays of different length? - 'splicing' took place
     */
    for (dBegin = 0; dBegin < dBeginMax; dBegin++) { //dBegin is index in a
        if (comparisonFn? comparisonFn(a[dBegin], b[dBegin]) : (a[dBegin] !== b[dBegin])) {
            break;
        }
    }
    var dEndMin = delta > 0? dBegin + delta - 1 : dBegin;
    for (dEnd = al - 1; dEnd >= dEndMin; dEnd--) { //dEnd is index in a
        if (comparisonFn? comparisonFn(a[dEnd], b[dEnd + delta]) : (a[dEnd] !== b[dEnd + delta])) {
            break;
        }
    }
    dEnd++;
    
    var cutSize = dEnd - dBegin;
    var insertSize = cutSize + delta;
    var insert;
    
    if (insertSize) insert = b.slice(dBegin, dBegin + insertSize);
        else insert = [];
        
    if (!cutSize && !insertSize) return null; // same
        
    // check 1-element move or reorder
    if (cutSize === insertSize && !spliceOnly) {
        var cut = a.slice(dBegin, dBegin + cutSize), 
            dCut = 0, 
            dIns = 0,
            match = true;
        
        if (comparisonFn? !comparisonFn(cut[0], insert[insertSize - 1]) : (cut[0] === insert[insertSize - 1])) {
            // move forward - from beginning of cut to end of insert
            dCut = 1;
        } else if (comparisonFn? !comparisonFn(cut[cutSize - 1], insert[0]) : (cut[cutSize - 1] === insert[0])) { 
            // move back - from end of insert to beginning of cut
            dIns = 1;
        }
        if (dCut || dIns) { // check other items for exact match with regard to 'move' direction
            for (i = 0; i < cutSize - 1; i++) {
                if (comparisonFn? comparisonFn(cut[i + dCut], insert[i + dIns]) : (cut[i + dCut] !== insert[i + dIns])) {
                    match = false;
                    break;
                }
            }
            if (match) {
                if (dCut) return ['move', dBegin, dBegin + cutSize - 1];
                else return ['move', dEnd - 1, dEnd - cutSize];
            }
        }
        if (!Amm.Array.symmetricDiff(cut, insert, comparisonFn, matches).length) return ['reorder', dBegin, cutSize, cut];
    }
    
    return ['splice', dBegin, cutSize, insert];

};

// disable to always use slow arrayDiff version, i.e. for testing
Amm.Array._optArrayDiff = true;

/** 
 *  returns elements in A that are not in B, each instance is compared only once.
 *  If matches is provided and is an Array, it will contain indexes of 
 *  found indexes in `b` for same items in `a` 
 *      (if matches[i] !== null then b[matches[i]] === a[i])
 */
Amm.Array.symmetricDiff = function(a, b, comparisonFn, matches) {
    if (!a.length || !b.length) return [].concat(a);
    if (!(matches instanceof Array)) matches = [];
    
    // we use tmp as temporary unique object to obsoletize already found instances
    var al = a.length, bl = b.length, r, i, j, match, tmp = {},
        bb = [].concat(b);
    matches.length = al;
    if (comparisonFn) {
        r = [];
        for (i = 0; i < al; i++) {
            var v = a[i];
            match = null;
            for (j = 0; j < bl; j++) if (bb[j] !== tmp && !comparisonFn(v, bb[j])) {
                match = j;
                bb[j] = tmp;
                break;
            }
            if (j >= bl) {
                r.push(v);
            }
            matches[i] = match;
        }
    } else {
        // quick version for .indexOf-enabled browsers
        if (a.filter && b.indexOf && Amm.Array._optArrayDiff) {
            r = a.filter(function(v, ai) {
                var idx = bb.indexOf(v);
                if (idx >= 0) {
                    matches[ai] = idx;
                    bb[idx] = tmp;
                    return false;
                }
                matches[ai] = null;
                return true;
            });
        } else {
            r = [];
            for (i = 0; i < al; i++) {
                var v = a[i];
                match = null;
                for (j = 0; j < bl; j++) if (v === bb[j]) {
                    bb[j] = tmp;
                    match = j;
                    break;
                }
                if (j >= bl) r.push(v);
                matches[i] = j;
            }
        }
    }
    return r;
};

/**
 * Supplementary function for symmetricalDiff that takes `matches` output
 * argument from symmetricDiff and caluclates indexes in target array that
 * don't have matches.
 * 
 * Returns array with indexes of elements in target array that don't have
 * matches in source array.
 * 
 * @param {Array} matchesFromSymDiff list of indexes that have matches
 * @param {int} newLength Length of target array
 * @param {int} offset Number to add to each result item
 * 
 */ 
Amm.Array.findNonMatched = function(matchesFromSymDiff, newLength, offset) {
    var idx = {}, res = [], i, l;
    offset = offset || 0;
    for (i = 0, l = matchesFromSymDiff.length; i < l; i++) {
        idx[matchesFromSymDiff[i]] = true;
    }
    for (i = 0; i < newLength; i++) {
        if (!(i in idx)) res.push(i + offset);
    }
    return res;
};

// returns elements in A that are not in B
Amm.Array.diff = function(a, b, comparisonFn) {
    if (!a.length || !b.length) return [].concat(a);
    
    var al = a.length, bl = b.length, r, i, j;
    
    if (comparisonFn) {
        r = [];
        for (i = 0; i < al; i++) {
            var v = a[i];
            for (j = 0; j < bl; j++) {
                if (!comparisonFn(v, b[j])) break;
            }
            if (j >= bl) r.push(v);
        }
    } else {
        // quick version for .indexOf-enabled browsers
        if (a.filter && b.indexOf && Amm.Array._optArrayDiff) {
            r = a.filter(function(v) {return b.indexOf(v) < 0;});
        } else {
            r = [];
            for (i = 0; i < al; i++) {
                var v = a[i];
                for (j = 0; j < bl; j++) {
                    if (v === b[j]) break;
                }
                if (j >= bl) r.push(v);
            }
        }
    }
    return r;
};

/** 
 * Finds duplicate items in an array, using either a === b or !comparisonFn(a, b) comparison.
 * 
 * @param {Array} array -   array to search duplicates (or Amm.Array)
 * 
 * @param {boolean} onlyFirst - return after locating second instance of any item 
 * (result array will have at most 1 element with 2 items) instead of thoroughly
 * searching all possible duplicates. Note this shouldn't be used with reportSingles
 * 
 * @param {function} [comparisonFn] Function (a, b) that returns 0 if a and b are equal
 * 
 * @param {number} stopSearchIdx - if non-zero, the items after this index are assumed
 * to have NO duplicates, and routine will stop after searching duplicate
 * instances of items with indexes betetween 0 <= idx < stopSearchIdx.
 * 
 * @param {boolean} startAtStop - will assume items between 0 and stopSearchIdx 
 *      don't have duplicates, but search duplicates between two sets - 
 *      [0..stopSearchIdx) and [stopSearchIdx..array.length)
 * 
 * @param {boolean} reportSingles - add [idx1] items to result array for items w/o duplicates
 * 
 * @returns {Array} [[idx1, idx2, idx3...], ...] where idx1, idx2 etc are indexes 
 *      of found duplicates of the same items. idx1 is an index of first occurance,
 *      idx2 of second and so on. Note that it is always that idx1 < idx2 < idx3.
 */
Amm.Array.findDuplicates = function(array, onlyFirst, comparisonFn, stopSearchIdx, startAtStop, reportSingles) {
    var l = array.length, res = [], fnd, hasNone, rr, same;
    if (!stopSearchIdx || stopSearchIdx < 0 || stopSearchIdx > l)
        stopSearchIdx = l;
    if (startAtStop && (stopSearchIdx >= l) && !reportSingles) {
        return [];
    }
    for (var i = 0; i < stopSearchIdx; i++) {
        hasNone = true;
        for (var j = (startAtStop? stopSearchIdx : i + 1); j < l; j++) {
            var has;
            if (comparisonFn) same = !comparisonFn(array[i], array[j]);
            else same = (array[i] === array[j]);
            if (same) {
                hasNone = false;
                // fnd keeps registry of already found items so we don't include them again in result
                // otherwise items that have more than 2 instances will produce several results
                // (we don't want to "unset" found ones to not break numbering)
                if (!fnd) fnd = [i]; 
                else {
                    if (fnd.indexOf) has = fnd.indexOf(j) >= 0;
                    else {
                        for (var k = 0; k < fnd.length; k++) 
                            if (fnd[k] === j) {
                                has = true; 
                                break;
                            }
                    }
                    if (has) continue;
                }
                if (!rr) rr = [i];
                rr.push(j);
                if (onlyFirst) return [rr];
                fnd.push(j);
            }
        }
        if (rr) {
            res.push(rr);
            rr = null;
        } else if (reportSingles && hasNone) {
            var inFnd;
            if (!fnd) inFnd = false;
            else {
                if (fnd.indexOf) inFnd = fnd.indexOf(i) >= 0;
                else {
                    for (var k = 0; k < fnd.length; k++) 
                        if (fnd[k] === i) {
                            inFnd = true; 
                            break;
                        }
                }
            }
            if (!inFnd) res.push([i]);
        }        
    }
    if (startAtStop && reportSingles) {
        for (var ii = stopSearchIdx; ii < l; ii++) {
            var inFnd;
            if (!fnd) inFnd = false;
            else {
                if (fnd.indexOf) inFnd = fnd.indexOf(ii) >= 0;
                else {
                    for (var k = 0; k < fnd.length; k++) 
                        if (fnd[k] === ii) {
                            inFnd = true; 
                            break;
                        }
                }
            }
            if (!inFnd) res.push([ii]);
        }
    }
    return res;
};

/**
 * Calculates changes between two arrays
 * 
 * @param {Array} oldItems          - previous content or part of the array (i.e. "cut" of splice)
 * @param {Array} newItems          - new content or part of the array (i.e. "insert" of splice)
 * @param {function} [comparisonFn] - optional function to find equal items (should return 0)
 * @param {number} offset           - optional offset to add to both newIndex and oldIndex of result
 * @param {boolean} areUnique       - speedup by assuming oldItems and newItems have unique items inside
 * 
 * @returns {object}
 * 
 * Returns following structure:
 * 
 * {
 *      added:   [ [item, newIndex], ... ],
 *      deleled: [ [item, oldIndex], ... ]
 *      moved:   [ [item, oldIndex, newIndex], ... ]
 *      same:    [ [item, oldIndex] ]]
 * }
 * 
 */
Amm.Array.calcChanges = function(oldItems, newItems, comparisonFn, offset, areUnique) {
    
    var oldLength = oldItems.length;
    var stopIndex = areUnique? oldLength : null, startAtStop = !!areUnique;
    
    if (!offset) offset = 0;
    
    // we provide "reportSingles" to locate 'added' or 'deleted' items
    var dd = Amm.Array.findDuplicates(oldItems.concat(newItems), false, comparisonFn, stopIndex, startAtStop, true);
    
    var res = {
        added: [],
        deleted: [],
        moved: [],
        same: []
    };
    
    var l = dd.length, i;
    
    if (areUnique) { // simple case for unique items
        
        for (i = 0; i < l; i++) {
            if (dd[i].length === 1) { // one entry - item is either uniqe to oldItems or newItems
                
                if (dd[i][0] >= oldLength) 
                    res.added.push([newItems[dd[i][0] - oldLength], dd[i][0] - oldLength + offset]);
                else 
                    res.deleted.push([oldItems[dd[i][0]], dd[i][0] + offset]);
                continue;
            }
            // item moved or same
            var oi = dd[i][0], ni = dd[i][1] - oldLength;
            if (oi === ni) {
                res.same.push([oldItems[oi], oi + offset]);
            } else {
                res.moved.push([oldItems[oi], oi + offset, ni + offset]);
            }
        }
        
        return res;
    }
    
    for (i = 0; i < l; i++) {
        
        var oldIdx = [], newIdx = [], j, same = {}, sameIdx = [], ll;
        
        for (j = 0, ll = dd[i].length; j < ll; j++) {
            
            var idx = dd[i][j], isNew = idx >= oldLength, convIdx = isNew? idx - oldLength : idx;
            
            if (!same[convIdx]) same[convIdx] = 1;
            else {
                same[convIdx]++;
                sameIdx.push(convIdx);
            }
            
            if (isNew) {
                newIdx.push(convIdx);
            } else {
                oldIdx.push(convIdx);
            }                
            
        }
        
        if (sameIdx.length) {
            for (j = oldIdx.length; j >= 0; j--) if (same[oldIdx[j]] > 1) oldIdx.splice(j, 1);
            for (j = newIdx.length; j >= 0; j--) if (same[newIdx[j]] > 1) newIdx.splice(j, 1);
            for (j = 0; j < sameIdx.length; j++) res.same.push([oldItems[sameIdx[j]], sameIdx[j] + offset]);
        }
        
        var common = oldIdx.length < newIdx.length? oldIdx.length : newIdx.length;
        
        for (j = 0; j < common; j++) {
            if (newIdx[j] === oldIdx[j]) res.same.push([oldItems[oldIdx[j]], oldIdx[j] + offset]);
            else res.moved.push([oldItems[oldIdx[j]], oldIdx[j] + offset, newIdx[j] + offset]);
        }
        
        // in new, but not in old
        for (j = common; j < newIdx.length; j++) res.added.push([newItems[newIdx[j]], newIdx[j] + offset]);
        
        // in old, but not in new
        for (j = common; j < oldIdx.length; j++) res.deleted.push([oldItems[oldIdx[j]], oldIdx[j] + offset]);
        
    }
    
    return res;
    
};

Amm.Array.intersect = function(a, b, comparisonFn) {
    if (!(a instanceof Array || a['Amm.Array'])) throw Error("`a` must be an Array");
    if (!(b instanceof Array || b['Amm.Array'])) throw Error("`b` must be an Array");
    if (!a.length || !b.length) return []; // nothing to do
    var long = [].concat(a).concat(b);
    var dups = Amm.Array.findDuplicates(long, false, comparisonFn, a.length, true);
    var res = [];
    for (var j = 0, l = dups.length; j < l; j ++) {
        for (var k = 0, ll = dups[j].length; k < ll; k++) {
            if (dups[j][k] < a.length) {
                res.push(long[dups[j][k]]);
                break;
            }
        }
    }
    return res;
};

Amm.Array.unique = function(arr, comparisonFn) {
    if (!(arr instanceof Array || arr['Amm.Array'])) throw Error("`arr` must be an Array");
    var res = arr['Amm.Array']? arr.getItems() : [].concat(arr);
    // leave only unique items
    for (var i = 0; i < res.length; i++) {
        for (var j = res.length - 1; j > i; j--) {
            if (comparisonFn? !comparisonFn(res[j], res[i]) : res[j] === res[i]) res.splice(j, 1);
        }
    }
    return res;
};
/* global Amm */

Amm.Instantiator = function() {
    if (this['Amm.Instantiator'] === '__CLASS__') {
        throw Error("Attempt to instantiate abstract class");
    }
};

Amm.Instantiator.prototype = {
    
    'Amm.Instantiator': '__CLASS__'
    
};
/* global Amm */

Amm.Instantiator.Proto = function(optionsOrProto, assocProperty, revAssocProperty) {
    
    Amm.Instantiator.call(this);
    if (typeof optionsOrProto !== 'object' || optionsOrProto && !optionsOrProto.proto) {
        optionsOrProto = {
            proto: optionsOrProto
        };
    }
    if (optionsOrProto && Amm.Builder.isPossibleBuilderSource(optionsOrProto.proto)) {
        this.isElement = true;
    }
    if (assocProperty) optionsOrProto.assocProperty = assocProperty;
    if (revAssocProperty) optionsOrProto.revAssocProperty = revAssocProperty;
    Amm.init(this, optionsOrProto);

};

Amm.Instantiator.Proto.prototype = {
    
    'Amm.Instantiator.Proto': '__CLASS__',
    
    proto: null,
    
    isElement: false,
    
    assocProperty: null,
    
    revAssocProperty: null,
    
    construct: function(object) {
        if (!this.proto) throw Error("`proto` must be set");
        var proto = this.proto;
        var res;
        if (this.isElement) res = new Amm.Element(proto);
            else res = Amm.constructInstance(proto, null);
        if (this.assocProperty) Amm.setProperty(res, this.assocProperty, object);
        if (this.revAssocProperty) Amm.setProperty(object, this.revAssocProperty, res);
        return res;
    },
    
    destruct: function(object) {
        if (object.cleanup) {
            object.cleanup();
        }
    }
    
};


Amm.extend(Amm.Instantiator.Proto, Amm.Instantiator);/* global Amm */

Amm.Instantiator.Variants = function(options) {
    
    this._prototypes = {};
    this._matches = [];
    this._objects = [];
    this._instances = [];
    Amm.Instantiator.call(this);
    Amm.WithEvents.call(this, options);
    
};

Amm.Instantiator.Variants.prototype = {

    'Amm.Instantiator.Variants': '__CLASS__', 
    
    _defaultPrototype: null,
    
    _prototypes: null,
    
    _overrideDefaultPrototype: false,
    
    _matches: null,
    
    _objects: null,
    
    _instances: null,
    
    _filter: null,
    
    _filterIsAggregate: false,

    _subscribeFilter: true,
    
    _allowNullInstance: false,
    
    _assocProperty: null,
    
    _revAssocProperty: null,
    
    setPrototypes: function(prototypes, match) {
        if (!prototypes || typeof prototypes !== 'object')
            throw Error("`prototypes` must be a non-null object");
        if (match !== undefined) {
            this._prototypes[match] = Amm.override({}, prototypes);
            return;
        }
        this._prototypes = Amm.override({}, prototypes);
    },
    
    getPrototypes: function(match) {
        if (match === undefined) return this._prototypes;
        return this._prototypes[match];
    },
    
    setDefaultPrototype: function(defaultPrototype) {
        if (typeof defaultPrototype !== 'object') {
            throw Error("`defaultPrototype` must be a null or an object");
        }
        if (!defaultPrototype) {
            this._defaultPrototype = null;
        } else {
            this._defaultPrototype = Amm.override({}, defaultPrototype);
        }
    },
    
    getDefaultPrototype: function() {
        return this._defaultPrototype;
    },
    
    setOverrideDefaultPrototype: function(overrideDefaultPrototype) {
        overrideDefaultPrototype = !!overrideDefaultPrototype;
        var oldOverrideDefaultPrototype = this._overrideDefaultPrototype;
        if (oldOverrideDefaultPrototype === overrideDefaultPrototype) return;
        this._overrideDefaultPrototype = overrideDefaultPrototype;
        return true;
    },

    getOverrideDefaultPrototype: function() {
        return this._overrideDefaultPrototype; 
    },

    construct: function(object, match) {
        var idx = this._findObject(object);
        if (match === undefined && this._filter && this._subscribeFilter && idx >= 0) {
            match = this._filter.getMatch(object);
        } else if (match === undefined && this._filter) {
            match = this._filter.evaluateMatch(object);
        }
        var res = this._build(object, match);
        if (!object) return res;
        if (idx >= 0) { // we have already subscribed to this object
            this._matches[idx] = match;
        } else { // we didn't subscribe yet
            idx = this._objects.length;
            this._objects.push(object);
            this._matches.push(match);
            this._instances[idx] = [];
            this._subscribeObject(object);
            if (this._filter && this._subscribeFilter) {
                this._filter.observeObject(object);
            }
        }
        if (!res && this._instances[idx][0] !== null) {
            // we need to have non-empty list of instances
            // to keep subscribed to the object. We keep NULL
            // first item to always easily find it.
            this._instances[idx].unshift(null); 
        }
        if (res) {
            if (this._instances[idx][0] === null) {
                this._instances[idx].splice(0, 1);
            }
            this._instances[idx].push(res);
            this._subscribeInstance(res);
        }
        return res;
    },
    
    _build: function(object, match) {
        
        var proto, def = this._defaultPrototype;
        /* TODO: test */
        if (this._prototypes[match]) {
            proto = this._prototypes[match];
            if (Amm.Builder.isPossibleBuilderSource(proto)) {
                proto = Amm.Builder.calcPrototypeFromSource(proto, false);
            }
            if (def && this._overrideDefaultPrototype) {
                def = this._defaultPrototype;
                if (Amm.Builder.isPossibleBuilderSource(def)) {
                    def = Amm.Builder.calcPrototypeFromSource(def, false);
                }
                proto = Amm.override({}, def, proto);
            } else {
                proto = Amm.override({}, proto);
            }
        } else {
            if (!this._defaultPrototype) {
                if (!this._allowNullInstance) {
                    throw Error("No prototype for match '" + match + "' and `defaultPrototype` not set!");
                }
                return null;
            }
            if (Amm.Builder.isPossibleBuilderSource(def)) {
                def = Amm.Builder.calcPrototypeFromSource(def, false);
            } else {
                proto = Amm.override({}, def);
            }
        }
        var assocProperty = this._assocProperty, revAssocProperty = this._revAssocProperty;
        if ('__assocProperty' in proto) {
            assocProperty = proto.__assocProperty;
            delete proto.__assocProperty;
        }
        if ('__revAssocProperty' in proto) {
            revAssocProperty = proto.__revAssocProperty;
            delete proto.__revAssocProperty;
        }
        var res = Amm.constructInstance(proto);
        if (assocProperty) Amm.setProperty(res, assocProperty, object);
        if (revAssocProperty && typeof object === 'object' && object) {
            Amm.setProperty(object, revAssocProperty, res);
        }
        return res;
    },
    
    destruct: function(instance) {
        this.forgetInstance(instance);
        if (instance.cleanup) {
            instance.cleanup();
        }
    },
    
    setMatches: function(objects, matches) {
        if (!objects.length || !this._objects.length) return;
        if (matches.length !== objects.length) throw Exception("`objects` and `matches` must have same length (are: " + objects.length + " and " + matches.length + ")");
        var changedObjects = [], changedMatches = [];
        var dupes = Amm.Array.findDuplicates([].concat(this._objects, objects), false, null, this._objects.length);
        if (!dupes.length) return;
        var i, l, myIdx, inIdx;
        for (i = 0, l = dupes.length; i < l; i++) {
            var myIdx = dupes[i][0], inIdx = dupes[i][1] - this._objects.length;
            if (this._matches[myIdx] === matches[inIdx]) continue;
            
            var 
                hadProto = this._matches[myIdx] in this._prototypes,
                hasProto = matches[inIdx] in this._prototypes;

            this._matches[myIdx] = matches[inIdx];
            
            if (!hasProto && !hadProto) continue; // still resort to default proto
                        
            changedObjects.push(this._objects[myIdx]);
            changedMatches.push(this._matches[myIdx]);
        }
        if (!changedObjects.length) return;
        this.outNeedRebuild(changedObjects, changedMatches, this);
    },
    
    outNeedRebuild: function(objects, matches, instantiator) {
        this._out('needRebuild', objects, matches, instantiator);
    },
    
    cleanup: function() {
        if (this._filter) this.setFilter(null);
        Amm.WithEvents.prototype.cleanup.call(this);
        this._objects = [];
        this._matches = []; 
        for (var i = 0, l = this._instances.length; i < l; i++) {
            this._instances[i] = [];
        }
        this._instances = [];
        this._prototypes = {};
        this._defaultPrototype = {};
    },

    setFilter: function(filter) {
        var isAggregate = false;
        if (filter) {
            if (typeof filter === 'object' && !filter['Amm.Filter']) {
                filter = Amm.constructInstance(filter, 'Amm.Filter');
                isAggregate = true;
            }
        }  else {
            filter = null;
        }                
        var oldFilter = this._filter;
        if (oldFilter === filter) return;
        if (this._filter) { // delete old filter
            if (this._filterIsAggregate) this._filter.cleanup();
            else if (this._subscribeFilter) this._subFilter(true);
        }
                
        this._filterIsAggregate = isAggregate;
        this._filter = filter;
        
        if (this._filter && this._subscribeFilter) {
            this._subFilter();
            this.setMatches(this._filter.getObservedObjects(), this._filter.getMatches());
        }
        
        return true;
    },

    getFilter: function() { return this._filter; },

    setSubscribeFilter: function(subscribeFilter) {
        subscribeFilter = !!subscribeFilter;
        var oldSubscribeFilter = this._subscribeFilter;
        if (oldSubscribeFilter === subscribeFilter) return;
        this._subscribeFilter = subscribeFilter;
        if (this._filter) 
            this._subFilter(!this._subscribeFilter);
        return true;
    },

    getSubscribeFilter: function() { return this._subscribeFilter; },
    
    getFilterIsAggregate: function() { return this._filterIsAggregate; },
    
    hasObject: function(object) {
        return this._findObject(object) >= 0;
    },
    
    hasInstance: function(instance) {
        return !!this._findInstance(instance);
    },
    
    forgetObject: function(object) {
        var idx = this._findObject(object);
        if (idx < 0) return;
        this._forgetObject(idx);
        return true;
    },
    
    forgetInstance: function(instance) {
        if (!instance) return;
        var idx = this._findInstance(instance);
        if (!idx) return;
        this._unsubscribeInstance(instance);
        this._instances[idx[0]].splice(idx[1], 1);
        if (!this._instances[idx[0]].length) {
            this._forgetObject(idx[0]);
        }
        return true;
    },
    
    getInstances: function(object) {
        var idx = this._findObject(object);
        if (idx < 0) return [];
        return [].concat(this._instances[idx]);
    },
    
    _subFilter: function(unsub) {
        if (unsub) {
            this._filter.unsubscribe('matchesChange', this.handleFilterMatchesChange, this);
            this._filter.setObservedObjects([]);
            return;
        }
        this._filter.setObservedObjects(this._objects);
        this._filter.subscribe('matchesChange', this.handleFilterMatchesChange, this);
    },
    
    handleFilterMatchesChange: function(objects, matches, oldMatches) {
        
        var nObjects = [], nMatches = [], nOldMatches = [];
        for (var i = 0, l = objects.length; i < l; i++) {
            // we are not insterested in changes caused by adding/deleting objects to/from filter
            if (oldMatches[i] === undefined || matches[i] === undefined) continue;
            nObjects.push(objects[i]);
            nMatches.push(matches[i]);
        }
        if (nObjects.length) this.setMatches(nObjects, nMatches);
        
    },
    
    _findObject: function(object) {
        if (typeof object !== 'object' || !object) return -1;
        return Amm.Array.indexOf(object, this._objects);
    },
    
    _findInstance: function(instance) {
        var i, j, l, ll;
        for (i = 0, l = this._instances.length; i < l; i++) {
            for (j = 0, ll = this._instances[i].length; j < ll; j++) {
                if (this._instances[i][j] === instance) return [i, j];
            }
        }
        return null;
    },
    
    _forgetObject: function(idx) {
        var object = this._objects[idx], instances = this._instances[idx];
        if (this._filter) this._filter.unobserveObject(object);
        
        this._objects.splice(idx, 1);
        this._instances.splice(idx, 1);
        if (instances.length) this._unsubscribeInstance(instances, true);
        this._unsubscribeObject(object);
    },
    
    _subscribeObject: function(object) {
        if (!object || typeof object !== 'object') return;
        if (object['Amm.WithEvents'] && object.hasEvent('cleanup')) {
            object.subscribe('cleanup', this._handleObjectCleanup, this);
        }
    },
    
    _unsubscribeObject: function(object) {
        if (object['Amm.WithEvents'] && object.hasEvent('cleanup')) {
            object.unsubscribe('cleanup', this._handleObjectCleanup, this);
        }
    },
    
    _forgetObjectsWithoutInstances: function() {
        for (var i = this._objects.length - 1; i >= 0; i--) {
            if (this._instances[i][0] !== null) continue;
            this._instances[i].splice(0, 1);
            if (this._instances[i].length) continue;
            this._forgetObject(i);
        }
    },
    
    _unsubscribeInstance: function(instance, many) {
        if (many) {
            for (var i = 0, l = instance.length; i < l; i++)
                this._unsubscribeInstance(instance[i]);
            return;
        }
        if (instance['Amm.WithEvents'] && instance.hasEvent('cleanup')) {
            instance.unsubscribe('cleanup', this._handleInstanceCleanup, this);
        }
    },
    
    _subscribeInstance: function(instance) {
        if (instance['Amm.WithEvents'] && instance.hasEvent('cleanup')) {
            instance.subscribe('cleanup', this._handleInstanceCleanup, this);
        }
    },
    
    _handleObjectCleanup: function() {
        this.forgetObject(Amm.event.origin);
    },
    
    _handleInstanceCleanup: function() {
        this.forgetInstance(Amm.event.origin);
    },

    /**
     * if TRUE, no exception is thrown and NULL is returned 
     * when there's no match of filter. In this case all objects
     * passed to the instantiator will be tracked, and forgotten only
     * with forgetObject() call (even if they don't have any instances).
     * 
     * @TODO: auto-disposal of objects with instances
     * 
     * @param {bool} allowNullInstance
     * @return {Boolean|undefined}
     */
    setAllowNullInstance: function(allowNullInstance) {
        allowNullInstance = !!allowNullInstance;
        var oldAllowNullInstance = this._allowNullInstance;
        if (oldAllowNullInstance === allowNullInstance) return;
        this._allowNullInstance = allowNullInstance;
        if (!allowNullInstance) this._forgetObjectsWithoutInstances();
        return true;
    },

    getAllowNullInstance: function() { return this._allowNullInstance; },
    
    setAssocProperty: function(assocProperty) {
        if (!assocProperty) assocProperty = null;
        var oldAssocProperty = this._assocProperty;
        if (oldAssocProperty === assocProperty) return;
        this._assocProperty = assocProperty;
        return true;
    },

    getAssocProperty: function() { return this._assocProperty; },

    setRevAssocProperty: function(revAssocProperty) {
        if (!revAssocProperty) revAssocProperty = null;
        var oldRevAssocProperty = this._revAssocProperty;
        if (oldRevAssocProperty === revAssocProperty) return;
        this._revAssocProperty = revAssocProperty;
        return true;
    },

    getRevAssocProperty: function() { return this._revAssocProperty; },

    
    
};

Amm.extend(Amm.Instantiator.Variants, Amm.Instantiator);
Amm.extend(Amm.Instantiator.Variants, Amm.WithEvents);

/* global Amm */
Amm.Operator = function()  {
    this._subs = [];
};

Amm.Operator.CONTEXT_ID = 1;

Amm.Operator.getNextContextId = function() {
    return ('' + Amm.Operator.CONTEXT_ID++);
};

// for bitmask

Amm.Operator.NON_CACHEABLE_VALUE = 1;
Amm.Operator.NON_CACHEABLE_CONTENT = 2;

// Content reports its changes
Amm.Operator.CONTENT_NOTIFIED = 1;

// Operator should periodically check value content
Amm.Operator.CONTENT_PERIODICALLY_CHECKED = 2;

// Child operand reports changes in the content and we shouldn't bother
Amm.Operator.CONTENT_OPERAND_REPORTED = 4;

Amm.Operator.prototype = {

    'Amm.Operator': '__CLASS__',

    id: null,

    _parent: null,
    
    _parentOperand: null,
    
    _expression: null,
    
    _subs: null,
    
    // deferred subscriptions (until setExpression)
    _defSub: null,
    
    _value: undefined,
    
    _hasValue: false,
    
    _lockChange: 0,
    
    _isEvaluating: 0,
    
    _contentChanged: null,
    
    _evaluated: 0,
    
    _nonCacheable: 0,
    
    _hasNonCacheable: 0,
    
    _destChanged: 0,
    
    _level: null,
    
    /* Whether we should compare array results for identity and return reference to old value 
       if they contain same items */
    _checkArrayChange: false,
    
    OPERANDS: [],
    
    // whether such operator can be used on the left side of an assignment
    supportsAssign: false,
    
    beginPos: null,
    
    endPos: null,
    
    // members that don't change between states
    STATE_SHARED: {
        _contextState: true,
        _contextId: true,
        _numCtx: true,
        _parent: true,
        _parentOperand: true,
        _expression: true,
        _level: true,
        _instanceStateShared: true,
        beginPos: true,
        endPos: true,
        STATE_SHARED: true,
        STATE_VARS: true,
        STATE_PROTO: true,
        OPERANDS: true,
        _parenthesis: true,
    },
    
    // link to current instance prototype
    STATE_PROTO: {}, 

    STATE_VARS: [],
    
    _instanceStateShared: null,
    
    /* object { contextId: data } */
    _contextState: null,
    _contextId: '0',
    _numCtx: 1, // we have default context

    // sole purpose is tag expressions that are in parenthesis
    _parenthesis: false,
    
    setExpression: function(expression) {
        Amm.is(expression, 'Amm.Expression', 'Expression');
        if (this._expression === expression) return;
        else if (this._expression) Error("Can setExpression() only once");
        this._expression = expression;
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var o = this['_' + this.OPERANDS[i] + 'Operator'];
            if (o) {
                o.setExpression(expression);
            }
        }
        if (this._defSub) this._subscribeDeferreds();
        return true;
    },
    
    _subscribeDeferreds: function() {
        for (var j = 0; j < this._defSub.length; j++) {
            this._expression.subscribeOperator(
                this._defSub[j][0] || this._expression, 
                this._defSub[j][1], this, this._defSub[j][2]
            );
        }
        this._defSub = null;
    },

    getExpression: function() { 
        return this._expression;
    },

    setParent: function(parent, operand) {
        this._parent = parent;
        if (operand !== undefined) this._parentOperand = operand;
        var e = parent.getExpression();
        if (e) this.setExpression(e);
    },

    getParent: function() { return this._parent; },

    getParentOperand: function() { return this._parentOperand; },
    
    getLevel: function() {
        if (this._level === null && this._parent)
            this._level = this._parent? this._parent.getLevel() + 1 : 0;
        return this._level;
    },
    
    /**
     * map: A - event; B - [event, event...]; C - {event: method, event: method...}
     * object === null: sub to this._expression
     */
    _sub: function(object, map, method, extra, noCheck) {
        var exp = this._expression || (this['Amm.Expression']? this : null);
        if (!exp && !this._defSub) this._defSub = [];
        if (object) {
            var idx = Amm.Array.indexOf(object, this._subs);
            if (idx < 0) this._subs.push(object);
        } else {
            object = exp || null;
            if (!exp) noCheck = true;
        }
        extra = extra || null;
        method = method || this._defaultHandler;
        if (typeof map === 'string') {
            if (!noCheck && !object.hasEvent(map)) return;
            if (exp) {
                exp.subscribeOperator(object, map, this, method, extra);
            } else {
                this._defSub.push([object, map, method, extra]);
            }
            return;
        }
        if (map instanceof Array) {
            for (var i = 0, l = map.length; i < l; i++) {
                if (noCheck || object.hasEvent(map[i])) {
                    if (exp) {
                        exp.subscribeOperator(object, map[i], this, method, extra);
                    } else {
                        this._defSub.push([object, map[i], method, extra]);
                    }
                }
            }
        } else {
            for (var i in map) {
                if (!map.hasOwnProperty(i) || !noCheck && !object.hasEvent(i)) 
                    continue; // not an event or non-existing event
                if (exp) {
                    exp.subscribeOperator(object, i, this, map[i], extra);
                } else {
                    this._defSub.push([object, i, map[i], extra]);
                }
            }
        }
    },
    
    /**
     *  object === null: unsub. from this._expression
     */
    _unsub: function(object, event, method, extra) {
        if (extra === undefined && arguments.length < 4) extra = null;
        if (!object) object = null;
        if (this._defSub) {
            for (var i = this._defSub.length - 1; i >= 0; i--) {
                if (this._defSub[i][0] === object 
                && event === undefined || event === this._defSub[i][1]
                && method === undefined || method === this._defSub[i][2]
                && extra === undefined || extra ===  this._defSub[i][3])
                    this._defSub.splice(i, 1);
            }
        } else {
            var exp = this._expression || (this['Amm.Expression']? this : null);
            if (!exp) return;
            var opCount = exp.unsubscribeOperator(object, event, this, method, extra);
            if (!opCount) { // remove object from our list
                var idx = Amm.Array.indexOf(object, this._subs);
                if (idx >= 0) this._subs.splice(idx, 1);
            }
        }
    },
    
    notifyOperandChanged: function(operand, value, oldValue, operator) {
        this._propagateContext(operand, operator, false);
        if (this._lockChange) {
            return;
        }
        this._setOperandValue(operand, value);
    },
    
    /** 
     * is called by child Operand (internal === false) or by self (internal === true)
     * when operand Array or Collection items are changed, but reference is still the same
     * 
     * changeInfo is object {type: 'splice', 'index': number, 'cut': Array, 'insert': Array}
     * Objects with different 'type' and structure may be introduced later.
     */
    notifyOperandContentChanged: function(operand, changeInfo, internal) {
        // we assume concrete implementations will check if the changes aren't relevant 
        // to the result and return early
        
        // we are inside content check loop - will evaluate later
        if (this._contentChanged !== null) { 
            this._contentChanged++;
            return;
        }
        
        if (this._isEvaluating) return;
        
        var exp = this._expression || (this['Amm.Expression']? this : null);
        if (exp && exp.getUpdateLevel()) {
            exp.queueUpdate(this);
            return;
        }
            
        this.evaluate();
        return true;
        
    },

    /**
     * Wrapper method that begins/ends operand content observation.
     * 
     * When some value is begin observed at the moment (this[`operand` + 'Observe'] === true) and is asked to
     * observe, checks if operand content is currently observed; if yes, calls _implObserve...(false) 
     * to stop observation first; clears observation flag anyway.
     * 
     * When unobserve is requested and the observation flag is truthful, _always_ clears the flag disregarding
     * to _implObserveOperandContent call result.
     * 
     * When observation flag that was set or cleared equals Amm.Operator.CONTENT_PERIODICALLY_CHECKED,
     * may change cacheability mode
     * 
     * @final
     * @returns result of (un)observation implementation method if it was called; undefined otherwise
     */
    _observeOperandContent: function(operand, value, unobserve) {
        var observeVar = '_' + operand + 'Observe';
        var isObserved = this[observeVar];
        var cacheabilityMayChange = false;
        var res = false;
        if (isObserved && unobserve) { // need to unobserve
            res = this._implObserveOperandContent(operand, value, unobserve);
            this[observeVar] = false;
            cacheabilityMayChange = (isObserved === Amm.Operator.CONTENT_PERIODICALLY_CHECKED);
        } else if (!isObserved && !unobserve) { // need to observe
            res = this[observeVar] = this._implObserveOperandContent(operand, value, unobserve);
            cacheabilityMayChange = (res === Amm.Operator.CONTENT_PERIODICALLY_CHECKED);
        }
        
        if (!cacheabilityMayChange) return res;
        
        // set or clear non-cacheability flag if we need to watch the content
        if (!unobserve) {
            var nc;
            nc = this._nonCacheable | Amm.Operator.NON_CACHEABLE_CONTENT;
            this._setNonCacheable(nc);
        } else {
            var stillHaveChecked = false;
            for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
                stillHaveChecked = this['_' + this.OPERANDS[i] + 'Observe'] === Amm.Operator.CONTENT_PERIODICALLY_CHECKED;
                if (stillHaveChecked) break;
            }
            if (!stillHaveChecked) this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_CONTENT);
        }
        
        return res;
    },
    
    // returns true if we should bother with observing this value' content
    _isValueObservable: function(operand, value) {
        if (!value || typeof value !== 'object') return;
        return value['Amm.Array'] || value instanceof Array;
    },
    
    /**
     * Begins to observe content of value `value` of operand `operand`, or refuses to do it.
     * MUST return true (or truthful) value if obsevation actually began.
     * Should not check if already observed or not, set observation flag etc - this work is done by 
     * _observeOperandContent.
     * 
     * @param {string} name of operand
     * @param value What content we're going to (un)observe. Usually Array or Collection.
     * @param {boolean} unobserve true if we're going to stop observation
     * @returns true/undefined
     */
    _implObserveOperandContent: function(operand, value, unobserve) {
        if (!value || typeof value !== 'object') return;
        if (value['Amm.Array']) {
            if (unobserve) {
                this._unsub(value, 'spliceItems', this._handleAmmArraySplice, operand);
            } else {
                this._sub(value, 'spliceItems', this._handleAmmArraySplice, operand, true);
            }
            return Amm.Operator.CONTENT_NOTIFIED;
        }
        if (value instanceof Array) {
            this['_' + operand + 'Old'] = unobserve? undefined : [].concat(value);
            return Amm.Operator.CONTENT_PERIODICALLY_CHECKED;
        }
    },
    
    _handleAmmArraySplice: function(index, cut, insert, operand) {
        var ci = this._makeChangeInfoForSplice(index, cut, insert);
        
        // last argument is operand name. We do this to avoid breakage if event args will ever appear
        operand = arguments[arguments.length - 1]; 
        this.notifyOperandContentChanged(operand, ci, true);
    },
    
    _checkContentChanged: function(operand) {
        var 
            oldValueVar = '_' + operand + 'Old', 
            oldValue = this[oldValueVar],
            valueVar = '_' + operand + 'Value',
            value = this[valueVar];
        
        if (!(value instanceof Array)) {
            this[oldValueVar] = null; // reset saved value and dont trigger the event
            return;
        }
        
        // save value to `...Old` member. We still have `oldValue` to work with
        this[oldValueVar] = [].concat(value);
        
        if (!(oldValue instanceof Array)) return;
            
        var diff = Amm.Array.smartDiff(oldValue, value, null, true);
        
        if (!diff) return;
        
        if (diff[0] !== 'splice') Error("Assertion - should receive only 'splice' event (spliceOnly === true)");
        // 0 'splice', 1 `start`, 2 `length`, 3 `elements` (`insert`)
        var cut = diff[2]? oldValue.slice(diff[1], diff[1] + diff[2]) : [];
        var ci = this._makeChangeInfoForSplice(diff[1], cut, diff[3]);
        
        this.notifyOperandContentChanged(operand, ci, true);
    },
    
    _makeChangeInfoForSplice: function(index, cut, insert) {
        return {
            'Amm.SpliceInfo': '__STRUCT__', 
            type: 'splice', 
            index: index, 
            cut: cut, 
            insert: insert
        };
    },
            
    /** 
     * Returns TRUE if this operator observes own result' content and calls 
     * this._parent.notifyOperandContentChanged. Otherwise _parent needs to observe and subscribe
     * to operand value' changes.
     */
    getReportsContentChanged: function() {
        return false;
    },
            
    getValue: function(again) {
        if (again || !this._hasValue) this.evaluate(again);
        return this._value;
    },
    
    setValue: function(value, throwIfCant) {
        if (!this.supportsAssign) throw Error(Amm.getClass(this) + " cannot be used as lvalue");
        var err = this._doSetValue(value);
        if (!err) return true;
        if (throwIfCant) throw err;
        return false;
    },
    
    /*
     * Should return false or undefined if assignment was SUCCESSFUL,
     * error message describing the reason if not
     */ 
    _doSetValue: function(value, checkOnly) {
        if (checkOnly) return "assignment not supported";
        Error("Call to abstract method _doSetValue");
    },
    
    getReadonly: function() {
        var res = this.supportsAssign? this._doSetValue(undefined, true) : "assignment not supported";
        if (!res) res = false;
        return res;
    },
    
    // evaluates the expression
    _doEvaluate: function(again) {
        Error("Call to abstract method _doEvaluate");
    },
    
    // creates the function that recevies the Expression instance and evaluates it
    toFunction: function() {
        Error("Call to abstract method toFunction");
    },
    
    /**
     *  returns function that takes two arguments: expression and value-to-assign,
     *  and returns FALSEABLE value on success or exception description on failure
     **/
    assignmentFunction: function() {
        Error("Call to abstract method assignmentFunction");
    },
    
    // returns function that returns value of operand `operand`
    _operandFunction: function(operand) {
        var operatorVar = '_' + operand + 'Operator';
        if (this[operatorVar]) return this[operatorVar].toFunction();
        var v = this._getOperandValue(operand);
        return function() { return v; };
    },
    
    _reportChange: function(oldValue) {
        if (this._parent) {
            this._parent.notifyOperandChanged(this._parentOperand, this._value, oldValue, this);
        }
    },
    
    _checkNonCacheableOperators: function() {
        if (this._hasNonCacheable <= !!this._nonCacheable) return; // we don't have NC operators
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var op = '_' + this.OPERANDS[i] + 'Operator';
            if (!this[op]) continue;
            if (this[op]._contextId !== this._contextId) {
                this._propagateContext(op, this[op], true);
            }
            if (this[op]._hasNonCacheable) {
                this[op].checkForChanges();
            }
        }
    },
    
    // re-evaluates non-cacheable operators only
    checkForChanges: function() {
        if (!this._hasNonCacheable) return; // nothing to do
        var origEvaluated = this._evaluated;
        
        this._checkNonCacheableOperators();
        
        if (this._nonCacheable & Amm.Operator.NON_CACHEABLE_CONTENT) {
            this._contentChanged = 0;
            
            for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
                if (this['_' + this.OPERANDS[i] + 'Observe'] === Amm.Operator.CONTENT_PERIODICALLY_CHECKED) {
                    this._checkContentChanged(this.OPERANDS[i]);
                }
            }
            
            if (this._contentChanged) this.evaluate();
            this._contentChanged = null;
        }
        
        // we should evaluate ourselves and didn't evaluated() yet by propagating children changes...
        if ((this._nonCacheable & Amm.Operator.NON_CACHEABLE_VALUE) && this._evaluated === origEvaluated) {
            this.evaluate();
        }
    },
    
    evaluate: function(again) {
        this._isEvaluating++;
        this._evaluated++;
        this._hasValue = true; // do if before, allowing _doEvaluate to change _hasValue 
        var 
            v = this._doEvaluate(again),
            oldValue = this._value,
            changed = this._hasValue && this._value !== v;
    
        // _checkArrayChange? compare arrays item-by-item and update our value only if they're different
        if (changed && this._checkArrayChange && v instanceof Array && this._value instanceof Array) {
            if (Amm.Array.equal(this._value, v)) {
                changed = false;
                v = this._value;
            }
        }
        this._value = v;
        if (changed) this._reportChange(oldValue);
        if (this._destChanged) {
            this._destChanged = false;
            this._parent.notifyWriteDestinationChanged(this);
        }
        this._isEvaluating--;
        return this._value;
    },
    
    _defaultHandler: function() {
        var exp = this._expression || (this['Amm.Expression']? this : null);
        if (exp && exp.getUpdateLevel()) {
            exp.queueUpdate(this);
            return;
        }
        this.evaluate();
    },

    hasOperand: function(operand) {
        return !!(this['_' + operand + 'Exists'] || this['_' + operand + 'Operator']);
    },

    _setOperand: function(operand, value) {
        var operatorVar = '_' + operand + 'Operator';
        var valueVar = '_' + operand + 'Value';
        var hasValueVar = '_' + operand + 'Exists';
        var observedVar = '_' + operand + 'Observe';
        
        // check if operand is Operator
        var isOperator = value && typeof value === 'object' && value['Amm.Operator'];
        
        // need to delete old Operator if it's in place
        
        if (this[operatorVar]) {
            if (this[operatorVar] === value) return; // same - so nothing to do!
            if (this[operatorVar]._hasNonCacheable)
                this._setHasNonCacheable(this._hasNonCacheable - 1);
            this[operatorVar].cleanup(); // we cleanup child operators on dissocation
        }
        
        var realValue;
        
        if (isOperator) {
            if (this[observedVar]) this._observeOperandContent(operand, this[valueVar], true);
            if (value.getReportsContentChanged()) this[observedVar] = Amm.Operator.CONTENT_OPERAND_REPORTED;
            this[operatorVar] = value;
            if (value._hasNonCacheable) {
                this._setHasNonCacheable(this._hasNonCacheable + 1);
            }
            if (!this[hasValueVar]) {
                // no need to calculate at the moment
                this[operatorVar].setParent(this, operand);
                this[valueVar] = undefined;
                return;
            } else {
                // we don't need to receive change notification at the moment
                this._lockChange++;
                // we need to setParent() first 'cause if may need our Expression
                this[operatorVar].setParent(this, operand); 
                realValue = this[operatorVar].getValue();
                this._lockChange--;
            }
            var operandFn = operand + 'OperatorChange';
            if (typeof this[operandFn] === 'function') {
                this[operandFn](this[operatorVar]);
            }
        } else {
            realValue = value;
        }
        
        this._setOperandValue(operand, realValue);
    },
    
    _setOperandValue: function(operand, value) {
        var valueVar = '_' + operand + 'Value';
        var hasValueVar = '_' + operand + 'Exists';
        var changeMethod = '_' + operand + 'Change';
        var eventsMethod = '_' + operand + 'Events';
        var oldValue = this[valueVar];
        var hadValue = this[hasValueVar];
        var changed = !hadValue || this[valueVar] !== value;
        var valueWithEvents, oldWithEvents;
        if (this[eventsMethod]) {
            valueWithEvents = value && value['Amm.WithEvents']? value : null;
            oldWithEvents = this[hasValueVar] && this[valueVar] && this[valueVar]['Amm.WithEvents']? this[valueVar] : null;
        }
        this[hasValueVar] = true;
        this[valueVar] = value;
        if (valueWithEvents || oldWithEvents) this[eventsMethod](valueWithEvents, oldWithEvents);
        if (changed) {
            var observedVar = '_' + operand + 'Observe';
            if (this[observedVar] !== Amm.Operator.CONTENT_OPERAND_REPORTED) {
                // unobserve old value
                if (this[observedVar]) this._observeOperandContent(operand, oldValue, true);
                // begin to observe new value if we must
                if (this._isValueObservable(operand, value)) this._observeOperandContent(operand, value);
            }
            if (this.supportsAssign && this._parent && this._parent['Amm.Expression']) {
                this._destChanged = true;
            }
            if (this[changeMethod]) this[changeMethod](value, oldValue, hadValue);
            if (!this._isEvaluating) {
                var exp = this._expression || (this['Amm.Expression']? this : null);
                if (exp && exp.getUpdateLevel()) {
                    exp.queueUpdate(this);
                } else {
                    this.evaluate();
                }
            }
        }
    },
    
    finishUpdate: function() {
        this.evaluate();
    },
    
    // changes operand context (down === true) or own context (down === false)
    // if our context differs with operand operator' context
    _propagateContext: function(operand, operator, down) {
        if (down) operator.setContextId(this._contextId);
            else this.setContextId(operator._contextId);
    },
    
    _getOperandValue: function(operand, again) {
        var operatorVar = '_' + operand + 'Operator', opr = this[operatorVar];
        var valueVar = '_' + operand + 'Value';
        var hasValueVar = '_' + operand + 'Exists';
        // should - and how we should? - switch context here???
        if (opr && opr._contextId !== this._contextId)
            this._propagateContext(operand, opr, true);
        if (opr && (again || !this[hasValueVar] || opr._hasNonCacheable)) {
            this._setOperandValue(operand, opr.getValue(again));
        }
        if (this[hasValueVar])
            return this[valueVar];
        return undefined;
    },
    
    _setNonCacheable: function(nonCacheable) {
        var oldNonCacheable = this._nonCacheable;
        if (oldNonCacheable === nonCacheable) return;
        this._nonCacheable = nonCacheable;
        if (nonCacheable) this._setHasNonCacheable(this._hasNonCacheable + 1);
            else this._setHasNonCacheable(this._hasNonCacheable - 1);
        return true;
    },
    
    getNonCacheable: function() { return this._nonCacheable; },

    _setHasNonCacheable: function(hasNonCacheable) {
        hasNonCacheable = parseInt(hasNonCacheable);
        if (hasNonCacheable < 0) hasNonCacheable = 0;
        var oldHasNonCacheable = this._hasNonCacheable;
        if (oldHasNonCacheable === hasNonCacheable) return;
        this._hasNonCacheable = hasNonCacheable;
        if (!!oldHasNonCacheable !== !!hasNonCacheable)
            this._reportNonCacheabilityChanged(!!hasNonCacheable);
        return true;
    },
    
    _reportNonCacheabilityChanged: function(nonCacheability) {
        if (this._parent) {
            this._parent.notifyOperandNonCacheabilityChanged(this._parentOperand, nonCacheability, this);
        }
    },
    
    notifyOperandNonCacheabilityChanged: function(operand, nonCacheability, operator) {
        if (this._contextId !== operator._contextId) {
            this._propagateContext(operand, operator);
        }
        if (nonCacheability) this._setHasNonCacheable(this._hasNonCacheable + 1);
        else this._setHasNonCacheable(this._hasNonCacheable - 1);
    },

    getHasNonCacheable: function() { return this._hasNonCacheable; },
    
    getOperator: function(operand) {
        if (!operand) operand = this.OPERANDS[0];
        else if (typeof operand === 'number') operand = this.OPERANDS[operand];
        var op = '_' + operand + 'Operator';
        if (!(op in this)) throw Error("No such operand: '" + operand + "' in '" + Amm.getClass(this));
        var res;
        res = this[op];
        if (res && arguments.length > 1) {
            return res.getOperator.apply(res, Array.prototype.slice.call(arguments, 1));
        }
        return res;
    },
    
    // cleans data belonging to the CURRENT context
    deleteContext: function(id) {
        if (id === undefined) id = this._contextId;
        else if (id !== this._contextId) {
            // we don't have such context
            if (!this._contextState[id]) {
                return;
            } 
            this.setContextId(id);
        }
        this._partialCleanup();
        if (this._contextState !== null) this._contextState[id] = null;
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var o = this.OPERANDS[i], opVar = '_' + o + 'Operator', op = this[opVar];
            if (op) {
                op.deleteContext(id);
            }
        }
        this._numCtx--;
    },
    
    _partialCleanup: function() {
        var s = this._subs;
        this._subs = [];
        var exp = this._expression || (this['Amm.Expression']? this : null);
        if (exp) {
            for (var i = s.length - 1; i >= 0; i--) {
                exp.unsubscribeOperator(s[i], undefined, this, undefined, undefined);
            }
        }
    },
    
    cleanup: function() {
        this._partialCleanup();
        this._parent = null;
        var exp = this._expression || (this['Amm.Expression']? this : null);
        this._expression = null;
        this._defSub = null;
        this._contextState = {};
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var operand = this.OPERANDS[i];
            var operatorVar = '_' + operand + 'Operator';
            var valueVar = '_' + operand + 'Value';
            this[valueVar] = null;
            if (this[operatorVar]) {
                this[operatorVar].cleanup();
                this[operatorVar] = null;
            }
        }
    },
    
    getSrc: function() {
        var e = this._expression;
        if (!e) {
            e = this._parent;
            while(e && !e['Amm.Expression']) e = e._parent;
        }
        if (!e) return;
        if (this.beginPos === null) return;
        return e.getSrc(this.beginPos, this.endPos);
    },

    createContext: function(properties) {
        var id = Amm.Operator.getNextContextId();
        this.setContextId(id);
        if (properties && (typeof properties === 'object')) {
            Amm.init(this, properties);
        }
        return id;
    },
    
    setContextIdToDispatchEvent: function(contextId, event, args) {
        this.setContextId(contextId);
    },
    
    setContextId: function(contextId) {
        if (this._contextId === contextId) return;
        if (!this._contextState) {
            this._contextState = {};
            this._populateInstanceStateShared();
        }
        
        // save current context if it wasn't destroyed
        if (this._contextState[this._contextId] !== null)
            this._contextState[this._contextId] = this._getContextState();
        
        var newState, isNewState = false;
        if (contextId in this._contextState) {
            newState = this._contextState[contextId];
            if (newState === null) {
                Error("Attempt to setContextId() of already destroyed context");
            }
        } else {
            newState = this._constructContextState();
            isNewState = true;
            this._numCtx++;
        }
        this._contextId = contextId;
        this._setContextState(newState, isNewState);
    },
    
    getContextId: function() {
        return this._contextId;
    },
    
    hasContext: function(contextId) {
        return this._contextId === contextId || this._contextState && this._contextState[contextId];
    },
    
    listContexts: function() {
        var res = [];
        for (var i in this._contextState)
            if (this._contextState.hasOwnProperty(i) && this._contextState[i] !== null) {
                res.push(i);
            }
        if (!(this._contextId in this._contextState)) res.push(this._contextId);
        return res;
    },
    
    _getContextState: function() {
        var res = {};
        for (var i = 0, l = this.STATE_VARS.length; i < l; i++) {
            var v = this.STATE_VARS[i];
            if (!this._instanceStateShared || !this._instanceStateShared[v]) {
                res[v] = this[v];
            }
        }
        return res;
    },
    
    _constructContextState: function() {
        var res = {};
        for (var i = 0, l = this.STATE_VARS.length; i < l; i++) {
            var v = this.STATE_VARS[i];
            if (this._instanceStateShared && this._instanceStateShared[v]) continue;
            res[v] = this.STATE_PROTO[v];
        }
        res._subs = [];
        return res;
    },
    
    _setContextState: function(contextState, isNewState) {
        if (isNewState && !this._allSubs) this._allSubs = [].concat(this._subs);
        this.getExpression();
        for (var i in contextState) if (contextState.hasOwnProperty(i)) {
            this[i] = contextState[i];
        }
        if (isNewState) {
            this._initContextState(this._contextId, true);
        }
        if (this._defSub && this._expression) {
            this._subscribeDeferreds();
        }
    },
    
    _initContextState: function(contextId, own) {
        if (!own) {
            this.setContextId(contextId);
            return;
        }
        this._isEvaluating++;
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var op = '_' + this.OPERANDS[i], o = op + 'Operator', v = op + 'Value', x = op + 'Exists', ob = op + 'Observe';
            if (this[x] && !this[o]) {
                var val = this[v]; 
                this[v] = this.STATE_PROTO[v];
                this[x] = false;
                this._setOperandValue(this.OPERANDS[i], val);
            } else if (this[o]) {
                this[o]._initContextState(contextId);
            }
        }
        this._isEvaluating--;
    },
    
    // destroys current context. Will return to "context 0"
    destroyContext: function() {
        this._partialCleanup();
        var newStateId = 0;
        if (!(newStateId in this._contextState)) {
            newStateId = null;
            for (newStateId in this._contextState)
                if (this._contextState.hasOwnProperty(newStateId))
                    break;
        }
        if (newStateId !== null) 
            this._setContextState(this._contextState[newStateId]);
    },
    
    /**
     * Populates this._instanceStateShared variable according to current
     * operands. Makes operator operands'references (but not their values) shared
     * along with constant operands. Should be called AFTER we received all our
     * operands.
     */
    _populateInstanceStateShared: function() {
        if (!this._instanceStateShared) {
            this._instanceStateShared = {};
        }
        // suffixes: Operator, Value, Exists, Observe
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var operand = this.OPERANDS[i];
            var operatorVar = '_' + operand + 'Operator';
            var valueVar = '_' + operand + 'Value';
            var existsVar = '_' + operand + 'Exists';
            var observeVar = '_' + operand + 'Observe';
            this._instanceStateShared[operatorVar] = true;
            if (!this[operatorVar]) {
                this._instanceStateShared[valueVar] = true;
                this._instanceStateShared[existsVar] = true;
                this._instanceStateShared[observeVar] = true;
            }
        }
    },
    
    getNonCacheableChildren: function(recursive) {
        if (!this._hasNonCacheable) return [];
        var res = [];
        // TODO: all contexts? Is cacheability on per-context basis?
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var operator = this.getOperator(this.OPERANDS[i]);
            if (!operator) continue;
            if (operator._nonCacheable) res.push(operator);
            if (recursive && operator._hasNonCacheable) {
                res = res.concat(operator.getNonCacheableChildren(true));
            }
        }
        return res;
    }
    
};

Amm.Operator.beforeExtend = function(subClass, parentClass, dontIndicateParent) {
    
    if (!subClass.prototype.STATE_SHARED)
        subClass.prototype.STATE_SHARED = {};
    Amm.override(subClass.prototype.STATE_SHARED || {}, this.prototype.STATE_SHARED);
    if (!subClass.beforeExtend) subClass.beforeExtend = this.beforeExtend;
    if (!(subClass.prototype.STATE_VARS instanceof Array)) {
        subClass.prototype.STATE_VARS = [];
    }
    if (!subClass.prototype.STATE_PROTO) subClass.prototype.STATE_PROTO = {};
};

Amm.Operator.afterExtend = function(subClass, parentClass, dontIndicateParent) {
    
    Amm.Operator.populateStateVars(subClass);
    if (!subClass.afterExtend) subClass.afterExtend = this.afterExtend;
    
};

Amm.Operator.populateStateVars = function(constrFn) {
    var p = constrFn.prototype;
    for (var i in p) {
        if (
            p.hasOwnProperty(i) 
            && !p.STATE_SHARED[i]
            && typeof p[i] !== 'function'
            && p[i] !== '__CLASS__'
            && p[i] !== '__PARENT__'
            && p[i] !== '__INTERFACE__'
        ) {
            p.STATE_VARS.push(i);
            p.STATE_PROTO[i] = p[i];
        }
    }
    if (p.OPERANDS instanceof Array) {
        for (var i = 0, l = p.OPERANDS.length; i < l; i++) {
            var operand = p.OPERANDS[i];
            var valueVar = '_' + operand + 'Value';
            var existsVar = '_' + operand + 'Exists';
            var observeVar = '_' + operand + 'Observe';
            p.STATE_VARS.push(valueVar, existsVar, observeVar);
            p.STATE_PROTO[valueVar] = null;
            p.STATE_PROTO[existsVar] = null;
            p.STATE_PROTO[observeVar] = null;
        }
    }
    
};

Amm.Operator.populateStateVars(Amm.Operator);
/* global Amm */

Amm.WithEvents.Proxy = function() {
};

Amm.WithEvents.Proxy.prototype = {
    
    subscribeObject: function(object, eventName, handler, scope, extra, decorator) {
        return object.subscribe(eventName, handler, scope, extra, decorator);
    },
    
    unsubscribeObject: function(object, eventName, handler, scope, extra, decorator) {
        return object.unsubscribe(eventName, handler, scope, extra, decorator);
    },
    
    getObjectSubscribers: function(object, eventName, handler, scope, extra, decorator) {
        return object.getSubscribers(eventName, handler, scope, extra, decorator);
    },
    
    getUniqueObjectSubscribers: function(object, classOrInterface, eventName) {
        return object.getUniqueSubscribers(classOrInterface, eventName);
    },
    
    unsubscribeObjectByIndex: function(object, eventName, index) {
        return object.unsubscribeByIndex(eventName, index);
    }
    
};

Amm.WithEvents.Proxy.instance = new Amm.WithEvents.Proxy;

/* global Amm */

Amm.WithEvents.DispatcherProxy = function(options) {
    
    this._subscriptions = [];
    Amm.init(this, options);
    
};

Amm.WithEvents.DispatcherProxy.ANY = {};

Amm.WithEvents.DispatcherProxy.SKIP_CALL_HANDLER = {};

Amm.WithEvents.DispatcherProxy.SimpleCompareExtra = function(extra1, extra2) {
    if (extra1 === Amm.WithEvents.DispatcherProxy.ANY) return 0;
    if (extra2 === Amm.WithEvents.DispatcherProxy.ANY) return 0;
    return extra1 === extra2? 0 : -1;
};

Amm.WithEvents.DispatcherProxy.ArrCompareExtra = function(extra1, extra2) {
    if (extra1 === Amm.WithEvents.DispatcherProxy.ANY) return 0;
    if (extra2 === Amm.WithEvents.DispatcherProxy.ANY) return 0;
    if (!(extra1 instanceof Array) || !(extra2 instanceof Array)) return -1;
    if (extra1.length !== extra2.length) return -1;
    for (var i = 0, l = extra1.length; i < l; i++) {
        if (extra1[i] === Amm.WithEvents.DispatcherProxy.ANY) {
            continue;
        }
        if (extra2[i] === Amm.WithEvents.DispatcherProxy.ANY) {
            continue;
        }
        if (extra1[i] !== extra2[i]) return -1;
    }
    return 0;
};

/**
 * Combines subscriptions to the same event of same object.
 * 
 */
Amm.WithEvents.DispatcherProxy.prototype = {
    
    'Amm.WithEvents.DispatcherProxy': '__CLASS__',
    
    // proxy which methods are called to subscribe/unsubscribe/etc
    _eventsProxy: Amm.WithEvents.Proxy.instance,
    
    // all objects we're subscribed to
    _subscriptions: null,
    
    // scope of beforeDispatch, afterDispatch, beforeCallHandler, afterCallHandler
    scope: null,
    
    // overloadable function(eventName, queue, arguments)
    beforeDispatch: null,
    
    // overloadable function(eventName, queue, arguments)
    afterDispatch: null,
    
    // overloadable function(eventName, queue, arguments, queueIndex, extra)
    // To skip actual handler calling and afterCallHandler, return
    // Amm.WithEvents.DispatcherProxy.SKIP_CALL_HANDLER value
    beforeCallHandler: null,
    
    // overloadable function(eventName, queue, arguments, queueIndex, extra)
    afterCallHandler: null,

    // expects beforeCallHandler to return new 'extra' argument
    beforeCallHandlerReturnsNewExtra: false,
    
    compareExtra: Amm.WithEvents.DispatcherProxy.ArrCompareExtra,
    
    setEventsProxy: function(eventsProxy) {
        Amm.is(eventsProxy, Amm.WithEvents.Proxy, 'eventsProxy');
        this._eventsProxy = eventsProxy;
    },
    
    getEventsProxy: function() {
        return this._eventsProxy;
    },
    
    doCallHandler: function(queueItem, eventName, args, extra) {
        var 
            scope = queueItem[1],
            handler = queueItem[0];
            // extra is passed to us
    
        var argsCpy = [].concat(args);
        
        if (!handler.apply) handler = scope[handler];

        if (extra !== undefined) argsCpy.push(extra); // extra is last one
        
        handler.apply(scope, argsCpy);
    },
    
    // receives all events from subscribed objects
    dispatchEvent: function() { 
        var queue = arguments[arguments.length - 1], args = Array.prototype.slice.call(arguments, 0, -1);
        if (!queue.eventName)
            Error("Queue array (extra) not provided to Amm.WithEvents.DispatcherProxy.dispatchEvent method");
        var ev = queue.eventName;
        
        if (this.beforeDispatch) {
            if (this.scope) this.beforeDispatch.call(this.scope, queue.eventName, queue, arguments);
            else this.beforeDispatch(queue.eventName, queue, arguments);
        }
        
        for (var i = 0; i < queue.length; i++) {
            var extra = queue[i][2];
            if (this.beforeCallHandler) {
                var ret;
                if (this.scope) ret = this.beforeCallHandler.call(this.scope, queue.eventName, queue, arguments, i, extra);
                else ret = this.beforeCallHandler(queue.eventName, queue, arguments, i, extra);
                if (ret === Amm.WithEvents.DispatcherProxy.SKIP_CALL_HANDLER) continue;
                if (this.beforeCallHandlerReturnsNewExtra) extra = ret;
            }
            
            if (!extra) extra = undefined; // mimick Amm.WithEvents behavior
            
            this.doCallHandler(queue[i], queue.eventName, args, extra);
            
            if (this.afterCallHandler) {
                if (this.scope) this.afterCallHandler.call(this.scope, queue.eventName, queue, arguments, i, extra);
                else this.afterCallHandler(queue.eventName, queue, arguments, i, extra);
            }
        }
        
        if (this.afterDispatch) {
            if (this.scope) this.afterDispatch.call(this.scope, queue.eventName, queue, arguments);
            else this.afterDispatch(queue.eventName, queue, arguments);
        }
        
    },
    
    subscribeObject: function(object, eventName, handler, scope, extra) {
        // find handlers
        var currHandlers = this._eventsProxy.getObjectSubscribers(object, eventName, this.dispatchEvent, this);
        
        // queue is stored as Extra arg. Since it is stored and passed by reference, we can edit it later
        var queue;
        if (currHandlers.length > 1)
            Error("Assertion: Amm.WithEvents.DispatcherProxy.dispatchEvent handler must be subscribed only once");
        
        if (extra === undefined) extra = null;
        if (scope === undefined) scope = null;
        
        if (!currHandlers.length) { 
            // this is the first time we subscribe to this object
            this._subscriptions.push(object);
            queue = [[handler, scope, extra]];
            queue.eventName = eventName;
            this._eventsProxy.subscribeObject(object, eventName, this.dispatchEvent, this, queue);
            return;
        }
        queue = currHandlers[0][2];
        if (!queue || queue.eventName !== eventName) {
            Error("Assertion: we found wrong queue array");
        }
        for (var i = 0, l = queue.length; i < l; i++) {
            if (
                queue[i][0] === handler
                && queue[i][1] === scope
                && !this.compareExtra(queue[i][2], extra)
            ) return; // already subscribed
        }
        queue.push([handler, scope, extra]);
    },
    
    // returns number of remaining subscribers
    unsubscribeObject: function(object, eventName, handler, scope, extra) {
        if (!object) Error("`object` parameter is required");
        var currHandlers = this._eventsProxy.getObjectSubscribers(object, eventName, this.dispatchEvent, this);
        var opCount = 0; //number of remaining events to dispatch to operator `operator`
        if (!currHandlers.length) return 0; // not subscribed
        if (eventName && currHandlers.length > 1)
            throw Error("Assertion: Amm.WithEvents.DispatcherProxy.dispatchEvent handler must be subscribed only once");
        for (var j = 0, lj = currHandlers.length; j < lj; j++) {
            var queue = currHandlers[j][2];
            if (!queue || !queue.eventName || (eventName && queue.eventName !== eventName))
                Error("Assertion: we found wrong queue array");
            for (var i = queue.length - 1; i >= 0; i--) {
                if (
                        (handler === undefined || queue[i][0] === handler)
                    &&  (scope === undefined || queue[i][1] === scope)
                    &&  (extra === undefined || !this.compareExtra(queue[i][2], extra))
                ) {
                    queue.splice(i, 1);
                } else {
                    opCount++;
                }
            }
            if (!queue.length) {
                this._removeQueue(object, currHandlers[j][3], currHandlers[j][4]);
            }
        }
        
        return opCount;
    },
    
    getObjectSubscribers: function(object, eventName, handler, scope, extra) {
        
        if (!object) Error("`object` parameter is required");
        var currHandlers = this._eventsProxy.getObjectSubscribers(object, eventName, this.dispatchEvent, this);
        if (!currHandlers.length) return 0; // not subscribed
        if (eventName !== undefined && currHandlers.length > 1)
            Error("Assertion: Amm.WithEvents.DispatcherProxy.dispatchEvent handler must be subscribed only once");
        var res = [];
        for (var j = 0, hl = currHandlers.length; j < hl; j++) {
            var currEventName = currHandlers[j][3], queue = currHandlers[j][2];
            if (!queue || !queue.eventName || (queue.eventName !== currEventName))
                Error("Assertion: we found wrong queue array");
            for (var i = queue.length - 1; i >= 0; i--) {
                if (
                        (handler === undefined || queue[i][0] === handler)
                    &&  (scope === undefined || queue[i][1] === scope)
                    &&  (extra === undefined || !this.compareExtra(queue[i][2], extra))
                ) {
                    res.push([].concat(queue[i], [currEventName, i]));
                }
            }
        }
        return res;
    },
    
    getUniqueObjectSubscribers: function(object, classOrInterface, eventName) {
        var subs = this.getObjectSubscribers(object, undefined);
        var res = [];
        for (var i = 0, l = subs.length; i < l; i++) {
            var scope = subs[j][1];
            if (!scope) continue;
            if (classOrInterface === undefined || Amm.is(scope, classOrInterface))
                res.push(scope);
        }
        return Amm.Array.unique(res);
    },
    
    _removeQueue: function(object, eventName, index) {
        this._eventsProxy.unsubscribeObjectByIndex(object, eventName, index);
        // now we need to check if we are still subscribed to other
        // events and remove object from _allSubs
        var otherSubs = this._eventsProxy.getObjectSubscribers(object, undefined, this.dispatchEvent, this);
        if (!otherSubs.length) {
            var idx = Amm.Array.indexOf(this._subscriptions, object);
            if (idx >= 0) this._subscriptions.splice(idx, 1);
        }
    },
    
    unsubscribeObjectByIndex: function(object, eventName, index) {
        
        var currHandlers = this._eventsProxy.getObjectSubscribers(object, eventName, this.dispatchEvent, this);
        
        if (!currHandlers.length) return [];
          if (currHandlers.length > 1)
            Error("Assertion: Amm.WithEvents.DispatcherProxy.dispatchEvent handler must be subscribed only once");
               
        var queue = currHandlers[0][2];
        if (!queue.eventName || queue.eventName !== eventName) {
            throw Error("Assertion: we found wrong queue array");
        }
        if (!queue[index]) return [];
        var res = [[].concat(queue[index], [eventName, index])];
        queue.splice(index);
        
        if (!queue.length) {
            this._removeQueue(object, eventName, currHandlers[0][4]);
        }
        
        return res;
    }
    
};

Amm.extend(Amm.WithEvents.DispatcherProxy, Amm.WithEvents.Proxy);/* global Amm */

/**
 * Provides variables for child Operator. 
 */
Amm.Operator.VarsProvider = function(operator, vars) {
    this._isEvaluating++;
    if (vars && typeof vars !== 'object') {
        Error("`vars` must be an object");
    }
    this._vars = vars || {};
    Amm.Operator.call(this);
    if (operator) this.setOperator(operator);    
    this._isEvaluating--;
};

Amm.Operator.VarsProvider.prototype = {

    'Amm.Operator.VarsProvider': '__CLASS__', 
    
    _vars: null,
    
    _varsProvider: null,
    
    _varsProviderContextId: null,
    
    _allVars: null,
    
    _operatorOperator: null,
    
    _operatorValue: null,
     
    _operatorExists: null,
    
    /**
     *  Hash: { varName: [consumers], '': [consumersForAllVars] }
     *  where consumer is either `object` or [`object`, `contextId`];
     *  `object` must have 'notifyProviderVarsChange' (value, oldValue, name, object) event
     */
    _consumers: null,
    
    OPERANDS: ['operator'],
    
    STATE_SHARED: {
        _varsProvider: true
    },

    setOperator: function(operator) {
        this._setOperand('operator', operator);
        if (this._operatorOperator) {
            this.supportsAssign = this._operatorOperator.supportsAssign;
        }
        // Inherit default 'empty' value from operator to avoid unnecessary/incorrect valueChange events
        if (!this._hasValue && !this._operatorOperator._hasValue) {
            this._value = this._operatorOperator._value;
        }
    },
    
    
    _doSetValue: function(value, checkOnly) {
        if (!checkOnly) this._operatorOperator._doSetValue(value);
        var readonly = this._operatorOperator.getReadonly();
        return readonly;
    },
    
    _doEvaluate: function(again) {
        return this._getOperandValue('operator', again);
    },
    
    toFunction: function() {
        var op = this._operandFunction('operator');
        var v = this._vars? this._vars : {};
        var fn;
        if (this._operatorOperator && this._operatorOperator.supportsAssign) {
            var assign = this._operatorOperator.assignmentFunction();
            fn = function(e, value) {
                var tmp = e.vars;
                e.vars = Amm.override({}, e.vars, v);
                var res;
                if (arguments.length > 1) {
                    res = assign(e, value);
                }
                else res = op(e);
                e.vars = tmp;
                return res;
            };
        } else {
            fn = function(e) {
                var tmp = e.vars;
                e.vars = Amm.override({}, e.vars, v);
                var res = op(e);
                e.vars = tmp;
                return res;
            };
        }
        fn.vars = v;
        return fn;
    },
    
    assignmentFunction: function() {
        if (this._operatorOperator) {
            return this._operatorOperator.assignmentFunction();
        }
        return function() {
            return "`operator` not provided";
        };
    },
    
    setContextIdToDispatchEvent: function(contextId, ev, args) {
        if (ev === 'varsChange' && (args[3] !== this._varsProvider || args[4] !== contextId)) {
            return;
        }
        Amm.Operator.prototype.setContextIdToDispatchEvent.call(this, contextId, ev, args);
    },
    
    notifyProviderVarsChange: function(value, oldValue, name, object) {
        if (name) { // case A: single variable changed
            // nothing to do because our variables hide parent's ones
            if (this._vars && name in this._vars) return;
            var old = Amm.override({}, this._allVars || this.getVars());
            this._allVars[name] = value;
            if (this._providerVars) this._providerVars[name] = value;
            if (this._consumers) this._notifyConsumers(value, oldValue, name);
        } else { // case B: all parent vars changed
            old = Amm.override({}, this._allVars || this.getVars());
            this._allVars = Amm.override({}, value, this._vars);
            this._providerVars = value;
            if (this._consumers) this._notifyConsumers(this._allVars, old, '');
        }
    },
    
    setVarsProvider: function(varsProvider) {
        var oldVarsProvider = this._varsProvider;
        var oldVarsProviderContextId = this._varsProviderContextId;
        if (oldVarsProvider === varsProvider && oldVarsProviderContextId === this._varsProviderContextId) return;
        if (oldVarsProvider) Error("Can setVarsProvider() only once");
        if (!varsProvider || !varsProvider['Amm.Operator.VarsProvider'])
            Error("varsProvider must be an instance of Amm.Operator.VarsProvider");
        this._varsProvider = varsProvider;
        this._varsProviderContextId = varsProvider._contextId;
        this._varsProvider.addConsumer(this, '');
        return true;
    },
    
    _initContextState: function(contextId, own) {    
        Amm.Operator.prototype._initContextState.call(this, contextId, own);
        if (own && this._varsProvider) {
            this._varsProviderContextId = this._varsProvider._contextId;
            this._varsProvider.addConsumer(this, '');
        }
    },
    
    getVarsProvider: function() { return this._varsProvider; },
    
    setVars: function(value, name) {
        var exp = this['Amm.Expression']? this : this._expression;
        if (name) { // a - set item in vars
            if (typeof name !== 'string')
                Error("setVars(`value`, `name`): `name` must be a string");
            var old = this._vars[name];
            if (value === old) return; // nothing to do
            this._vars[name] = value;
            if (this._varsProvider) {
                if (!this._allVars) this.getVars();
                this._allVars[name] = value;
            }
            if (this._consumers) this._notifyConsumers(value, old, name);
        } else { // b - set whole vars
            if (typeof value !== 'object') Error("setVars(`value`): object required");
            var old = Amm.override({}, this._allVars || this.getVars());
            if (!value) value = {}; // delete all vars
            this._vars = Amm.override({}, value);
            this._allVars = null;
            if (this._consumers) this._notifyConsumers(this.getVars(), old, '');
        }
        return true;
    },
    
    getVars: function(name, noChain) {
        if (noChain || !this._varsProvider)
            return name? this._vars[name] : this._vars;
        if (!this._providerVars)
            this._providerVars = this._varsProvider.getVars();
        if (!this._allVars) {
            this._allVars = Amm.override({}, this._providerVars, this._vars);
        }
        return name? this._allVars[name] : this._allVars;
    },
    
    setExpression: function(expression) {
        var res = Amm.Operator.prototype.setExpression.call(this, expression);
        for (var p = this._parent; p; p = p._parent) {
            if (p['Amm.Operator.VarsProvider']) {
                this.setVarsProvider(p);
                return;
            }
        }
        return res;
    },

    _partialCleanup: function() {
        this._vars = {};
        this._providerVars = null;
        this._allVars = null;
        this._consumers = null;
        if (this._varsProvider && this._varsProvider.hasContext(this._varsProviderContextId)) {
            var tmp;
            if (this._varsProviderContextId !== this._varsProvider._contextId) {
                tmp = this._varsProvider._contextId;
                this._varsProvider.setContextId(this._varsProviderContextId);
            }
            this._varsProvider.deleteConsumer(this, '');
            if (tmp) this._varsProvider.setContextId(tmp);
        }
        Amm.Operator.prototype._partialCleanup.call(this);
    },
    
    cleanup: function() {
        if (this._varsProvider && this._varsProvider.hasContext(this._varsProviderContextId)) {
            var tmp;
            if (this._varsProviderContextId !== this._varsProvider._contextId) {
                tmp = this._varsProvider._contextId;
                this._varsProvider.setContextId(this._varsProviderContextId);
            }
            this._varsProvider.deleteConsumer(this, '');
            if (tmp) this._varsProvider.setContextId(tmp);
        }
        this._varsProvider = null;
        this._consumers = null;
        Amm.Operator.prototype.cleanup.call(this);
    },
    
    _constructContextState: function() {
        var res = Amm.Operator.prototype._constructContextState.call(this);
        res._vars = {};
        res._consumers = null;
        return res;
    },
    
    addConsumer: function(consumer, varName) {
        varName = varName || '';
        if (!this._consumers) {
            this._consumers = {};
            this._consumers[varName] = [];
        } else if (!this._consumers[varName]) {
            this._consumers[varName] = [];
        }
        var ins = consumer._contextId !== this._contextId?
            [consumer, consumer._contextId] : consumer;
        this._consumers[varName].push(ins);
    },
    
    deleteConsumer: function(consumer, varName) {
        if (!this._consumers) return;
        varName = varName || '';
        var contextId = consumer._contextId;
        if (contextId === this._contextId) contextId = null;
        if (!this._consumers[varName]) return;
        for (var i = 0, l = this._consumers[varName].length; i < l; i++) {
            var c = this._consumers[varName][i];
            if (contextId === null && c === consumer || c[0] === consumer && c[1] === contextId) {
                this._consumers[varName].splice(i, 1);
                return;
            }
        }
    },
    
    _notifyConsumers: function(value, oldValue, varName) {
        if (!this._consumers) return;
        var consumers = this._consumers, contextId = this._contextId;
        var gotAny = false;
        varName = varName || '';
        var i, j, l, cs, cx, o, n, v;
        var kk;
        if (varName === '') kk = Amm.keys(consumers);
        else {
            kk = ['', varName];
            n = value;
            o = oldValue;
            v = varName;
        }
        for (var ki = 0, kl = kk.length; ki < kl; ki++) if (consumers[kk[ki]]) {
            i = kk[ki];
            // check if our var changed or it is 'all vars' consumer (or no old/new value provided)
            if (varName === '') {
                // var is of no interest
                if (!(i === '' || !oldValue || !value || oldValue[i] !== value[i])) continue; 
                if (i !== '') {
                    n = value? value[i] : undefined;
                    o = oldValue? oldValue[i] : undefined;
                    v = i;
                } else {
                    n = value;
                    o = oldValue;
                    v = '';
                }
            }
            for (j = 0, l = consumers[i].length; j < l; j++) {
                if (consumers[i][j][0]) {
                    cs = consumers[i][j][0];
                    cx = consumers[i][j][1];
                } else {
                    cs = consumers[i][j];
                    cx = contextId;
                }
                if (!gotAny) {
                    gotAny = true;
                    if (this._expression) {
                        this._expression._beginUpdate();
                    } else if (this['Amm.Expression']) {
                        this._beginUpdate();
                    }
                }
                if (cs._contextId !== cx) {
                    cs.setContextId(cx);
                }
                cs.notifyProviderVarsChange(n, o, v, this);
            }
        }
        if (gotAny) {
            if (this._expression) {
                this._expression._endUpdate();
            } else if (this['Amm.Expression']) {
                this._endUpdate();
            }
        }
        
    }
    
};

Amm.extend(Amm.Operator.VarsProvider, Amm.Operator);

/* global Amm */

/**
 * Provides high-level methods to access value of operator and subscribe 
 * to its' events. Acts as event dispatcher between child operators 
 * and monitored objects to prevent excessive changes' triggering. 
 * Allows to parse operator from string definition.
 */
Amm.Expression = function(options, expressionThis, writeProperty, writeObject, writeArgs) {
    Amm.WithEvents.DispatcherProxy.call(this);
    if (options && typeof options === 'string') {
        options = {src: options};
    }
    var operator;
    if (options && options['Amm.Operator']) {
        operator = options;
        options = {};
    }
    Amm.Operator.VarsProvider.call(this, operator);
    Amm.WithEvents.call(this, options, true);
    if (expressionThis) options.expressionThis = expressionThis;
    if (options.writeProperty) {
        writeProperty = options.writeProperty;
        delete options.writeProperty;
    }
    if (options.writeObject) {
        writeObject = options.writeObject;
        delete options.writeObject;
    }
    if (options.writeArgs) {
        writeArgs = options.writeArgs;
        delete options.writeArgs;
    }
    Amm.init(this, options);
    if (writeProperty) this.setWriteProperty(writeProperty, writeObject, writeArgs);
};

Amm.Expression.compareByContextIdAndLevel = function(a, b) {
    if (b[1] !== a[1]) return a[1] - b[1];
    return b[0].getLevel() - a[0].getLevel();
};

/**
 * Never propagate expressionThis to Expression writeObject
 */
Amm.Expression.THIS_WRITE_NEVER = 0;

/**
 * Always propagate expressionThis to Expression writeObject
 */
Amm.Expression.THIS_WRITE_ALWAYS = 1;

/**
 * Once expressionThis was propagated, don't update it anymore
 */
Amm.Expression.THIS_WRITE_ONCE = 2;

/**
 * If expressionThis was already set, don't propagate. otherwise set to THIS_WRITE_ALWAYS
 */
Amm.Expression.THIS_WRITE_AUTO = 3;

Amm.Expression.prototype = {
    
    'Amm.Expression': '__CLASS__',
    
    _expressionThis: null,
    
    _writeProperty: null,
    
    _writeObject: null,
    
    _writeArgs: null,

    _lockWrite: 0,
    
    _writeDestinationChanged: false,
    
    _src: null,
    
    _updateLevel: 0,
    
    /**
     *  contains operators that need to be recalculated when one event intoduces changes to many parts of Expression
     *  i.e. "$foo + $foo + $foo + $foo" or "$bar[$bar.baz]" - we need to re-calculate each changing Operator only once
     *  do avoid excessive re-calculations
     */
    _updateQueue: null,
    
    _updateQueueSorted: false,
    
    _currChangeInfo: null,

    _writeToExpressionThis: Amm.Expression.THIS_WRITE_AUTO,

    /** 
     * If writeProperty is Amm.Expression, whether to sync this.`expressionThis` to this.`writeObject`.`expressionThis`
     * One of Amm.Expression.THIS_WRITE_ALWAYS | THIS_WRITE_ONCE | THIS_WRITE_NEVER constants
     * THIS_WRITE_ALWAYS: always update; 
     * THIS_WRITE_ONCE: once updated, will set to THIS_WRITE_NEVER.
     * THIS_WRITE_AUTO: set to NEVER is writeObject already has expressionThis set, otherwise behave as WRITE_ALWAYS
     */
    
    setWriteToExpressionThis: function(writeToExpressionThis) {
        var oldWriteToExpressionThis = this._writeToExpressionThis;
        if (oldWriteToExpressionThis === writeToExpressionThis) return;
        this._writeToExpressionThis = writeToExpressionThis;
        this._propagateExpressionThis();
        return true;
    },

    getWriteToExpressionThis: function() { return this._writeToExpressionThis; },
    
    _propagateExpressionThis: function() {
        if (!(
                this._writeToExpressionThis && this._expressionThis 
                && this._writeObject && this._writeObject['Amm.Expression']
        )) {
            return;
        }
        if (this._writeToExpressionThis === Amm.Expression.THIS_WRITE_AUTO) {
            if (this._writeObject.getExpressionThis()) {
                this._writeToExpressionThis = Amm.Expression.THIS_WRITE_NEVER;
                return;
            } else {
                this._writeToExpressionThis = Amm.Expression.THIS_WRITE_ALWAYS;
            }
        }
        this._writeObject.setExpressionThis(this._expressionThis);
        if (this._writeToExpressionThis === Amm.Expression.THIS_WRITE_ONCE) {
            this._writeToExpressionThis = Amm.Expression.THIS_WRITE_NEVER;
        }
    },

    STATE_SHARED: {
        _updateLevel: true,
        _updateQueue: true,
        _deferredValueChange: true,
        _src: true,
        _subscriptions: true,
        _eventsProxy: true,
        scope: true
    },
    
    setExpressionThis: function(expressionThis) {
        var oldExpressionThis = this._expressionThis;
        if (oldExpressionThis === expressionThis) return;
        if (oldExpressionThis && oldExpressionThis['Amm.WithEvents'] && oldExpressionThis.hasEvent('cleanup')) {
            this._unsub(oldExpressionThis, 'cleanup', this._deleteCurrentContext);
        }
        this._expressionThis = expressionThis;
        if (expressionThis && expressionThis['Amm.WithEvents'] && expressionThis.hasEvent('cleanup')) {
            this._sub(expressionThis, 'cleanup', this._deleteCurrentContext, undefined, true);
        }
        this._propagateExpressionThis();
        this.outExpressionThisChange(expressionThis, oldExpressionThis);
        return true;
    },

    getExpressionThis: function() { return this._expressionThis; },

    outExpressionThisChange: function(expressionThis, oldExpressionThis) {
        this._out('expressionThisChange', expressionThis, oldExpressionThis);
    },
    
    setWriteProperty: function(writeProperty, writeObject, writeArgs) {
        if (arguments.length === 1 && writeProperty instanceof Array) {
            writeProperty = arguments[0][0];
            writeObject = arguments[0][1];
            writeArgs = arguments[0][2];
        }
        if (this._writeProperty) Error("Can setWriteProperty() only once");
        if (!writeProperty) Error("writeProperty must be non-falseable");
        if (typeof writeProperty === 'string') { // this is not a simple property name, so we assume it is expression definition
            if (!writeProperty.match(/^\w+$/)) writeProperty = new Amm.Expression (writeProperty, this._expressionThis);
        }
        if (writeProperty['Amm.Expression']) {
            if (writeObject || writeArgs) Error("When Amm.Expression is used as writeProperty, don't specify writeObject/writeArgs");
            writeObject = writeProperty;
            writeProperty = 'value';
            this._sub(writeObject, 'writeDestinationChanged', this._write, undefined, true);
        }
        if (writeArgs === null || writeArgs === undefined) {
            writeArgs = null;
        } else if (!(writeArgs instanceof Array)) {
            writeArgs = [writeArgs];
        }
        if (!writeObject && !this._expressionThis) {
            Error("setExpressionThis() or provide writeObject when setting writeProperty");
        }
        this._writeProperty = writeProperty;
        this._writeObject = writeObject;
        if (writeObject && writeObject['Amm.WithEvents'] && writeObject.hasEvent('cleanup')) {
            this._sub(writeObject, 'cleanup', this._deleteCurrentContext, undefined, true);
        }
        this._writeArgs = writeArgs;
        this._propagateExpressionThis();
        this._write();
    },
    
    _write: function() {
        var wo = this._writeObject || this._expressionThis;
        if (!wo) return;
        if (this._lockWrite) return;
        this._lockWrite++;
        Amm.setProperty(wo, this._writeProperty, this.getValue(), false, this._writeArgs);
        this._lockWrite--;
    },
    
    getWriteProperty: function(all) {
        return all? [this._writeProperty, this._writeObject, this._writeArgs] : this._writeProperty;
    },
    
    getWriteObject: function() {
        return this._writeObject;
    },
    
    getWriteArgs: function() {
        return this._writeArgs;
    },
    
    /**
     * This event has a difference from standard "out<Foo>Change" 
     * because it can be triggered 
     * 
     * -    for one or many variables:
     *      a)  for all variables (`name` is null)
     *      b)  for single variable (`name` param will be provided)
     * 
     * -    for Expression or other variables provider
     * 
     *      x)  either for Expression object
     *          (`sourceObject` === this === Amm.event.Origin)
     *      y)  or for different `sourceObject`
     *          (`sourceObject` !== this)
     */
    outVarsChange: function(value, oldValue, name, sourceObject, contextId) {
        this._out('varsChange', value, oldValue, name, sourceObject, contextId);
    },
    
    setOperator: function(operator) {
        Amm.Operator.VarsProvider.prototype.setOperator.call(this, operator);
        if (this._operatorOperator) {
            this._operatorOperator.setExpression(this);
        }
    },
    
    _deferredValueChange: null,
    
    _reportChange: function(oldValue) {
        var k = 'ctx_' + this._contextId;
        this._currChangeInfo = null;
        if (this._updateLevel && this._deferredValueChange) {
            if (!this._deferredValueChange[k]) {
                this._deferredValueChange[k] = {'contextId': this._contextId, 'old': oldValue};
                if (!this._deferredValueChange.ids) {
                    this._deferredValueChange.ids = [k];
                } else {
                    this._deferredValueChange['ids'].push(k);
                }
            }
            return;
        }
        this.outValueChange(this._value, oldValue);
        if (this._writeProperty) this._write();
    },
    
    notifyOperandContentChanged: function(operand, changeInfo, internal) {
        
        var operator = this['_' + operand + 'Operator'];
        if (operator && operator._contextId !== this._contextId) {
            this._propagateContext(operand, operator);
        }
        
        this._currChangeInfo = changeInfo;
        
        var evaluated = Amm.Operator.VarsProvider.prototype.notifyOperandContentChanged.call(this, operand, changeInfo, internal);
        
        if (this._currChangeInfo) {
            // report change wasn't called...
            this.outValueChange(this._value, this._value, changeInfo);
            this._currChangeInfo = null;
        }
        
        
        return evaluated;
    },
    
    _reportNonCacheabilityChanged: function(nonCacheability) {
        Amm.Operator.VarsProvider.prototype._reportNonCacheabilityChanged.call(this, nonCacheability);
        if (nonCacheability) {
            this._sub(Amm.getRoot(), 'interval', this.checkForChanges, undefined, true);
        } else { 
            this._unsub(Amm.getRoot(), 'interval', this.checkForChanges);
        }
    },
    
    notifyWriteDestinationChanged: function() {
        if (this._updateLevel) {
            this._writeDestinationChanged = true;
            return true;
        } else {
            this._writeDestinationChanged = false;
        }
        if (this._operatorOperator._contextId !== this._contextId) {
            this._propagateContext('operator', this._operatorOperator);
        }
        return this.outWriteDestinationChanged();
    },
    
    outWriteDestinationChanged: function() {
        this._out('writeDestinationChanged');
    },
    
    outValueChange: function(value, oldValue, changeInfo) {
        this._out('valueChange', value, oldValue, changeInfo);
    },
    
    deleteContext: function(id) {
        Amm.Operator.VarsProvider.prototype.deleteContext.call(this, id);
        if (!this._numCtx) this.cleanup();
    },
    
    _deleteCurrentContext: function() {
        this.deleteContext();
    },
    
    cleanup: function() {
        // unsubscribe all our subscribers
        for (var i = this._subscriptions.length - 1; i >= 0; i--) {
            this._eventsProxy.unsubscribeObject(this._subscriptions[i], undefined, this.dispatchEvent, this);
        }
        Amm.WithEvents.prototype.cleanup.call(this);
        this._subscriptions = [];
        this._numCtx = 0;
        if (this._writeObject && this._writeObject['Amm.Expression']) {
            this._writeObject.cleanup();
        }
        Amm.Operator.VarsProvider.prototype.cleanup.call(this);
    },
    
    getIsCacheable: function() {
        return !this._hasNonCacheable;
    },
    
    setSrc: function(src) {
        this.parse(src);
    },
    
    /**
     * Alias of setWriteProperty() for more intuitive usage
     * @param {string|Amm.Expression} writeProperty
     */
    setDest: function(writeProperty) {
        return this.setWriteProperty(writeProperty, null);
    },
    
    /**
     * Tries to work as symmetric 'getter' for this.getDest(). 
     * Returns either this.getWriteProperty() 
     * or this.getWriteObject() if Amm.Expression is used as write target.
     * @returns {string|Amm.Expression}
     */
    getDest: function() {
        if (this._writeObject && this._writeObject['Amm.Expression']) 
            return this._writeObject;
        if (this._writeProperty) return this._writeProperty;
    },
    
    getSrc: function(beginPos, endPos) {
        if (arguments.length && this._src)
            return this._src.slice(beginPos, endPos);
        return this._src;
    },
    
    parse: function(string) {
        if (this._src) Error("Already parsed");
        this._src = string;
        if (!Amm.Expression._builder) {
            Amm.Expression._parser = new Amm.Expression.Parser();
            Amm.Expression._builder = new Amm.Expression.Builder();
            Amm.Expression._builder.configureParser(Amm.Expression._parser);
        }
        this.setOperator(Amm.Expression._builder.unConst(Amm.Expression._parser.parse(string)));
    },
    
    subscribeOperator: function(target, eventName, operator, method, extra) {
        var contextId = operator._contextId;
        if (extra === undefined) extra = null;
        this.subscribeObject(target, eventName, method, operator, [contextId, extra]);
    },
    
    unsubscribeOperator: function(target, eventName, operator, method, extra, allContexts) {
        var contextId = allContexts? Amm.WithEvents.DispatcherProxy.ANY : operator._contextId;
        if (extra === undefined) {
             if (arguments.length < 5) extra = null;
             else extra = Amm.WithEvents.DispatcherProxy.ANY;
        }
        return this.unsubscribeObject(target, eventName, method, operator, [contextId, extra]);
    },
    
    beforeDispatch: function(eventName, queue, arguments) {
        if (queue.length > 1) {
            this._beginUpdate();
        }
    },
    
    afterDispatch: function(eventName, queue, arguments) {
        if (queue.length > 1) {
            this._endUpdate();
        }
    },
    
    beforeCallHandler: function(eventName, queue, arguments, queueIndex, extra) {
        var contextId = extra[0], newExtra = extra[1];
        var operator = queue[queueIndex][1]; // 'scope'
        if (operator._contextId !== contextId) {
            operator.setContextIdToDispatchEvent(contextId, eventName, arguments);
        }
        return newExtra;
    },
    
    beforeCallHandlerReturnsNewExtra: true,
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    // TODO: think about completely ditching _lockWrite in favor of _updateLevel
    _beginUpdate: function() {
        if (!this._updateLevel) this._updateQueue = [];
        this._updateLevel++;
        this._lockWrite++;
    },
    
    // sorts operators in update queue by level, descending
    _sortUpdateQueue: function(start) {
        this._updateQueueSorted = true;
        if (!start) {
            this._updateQueue.sort(Amm.Expression.compareByContextIdAndLevel);
            return;
        }
        if (start >= this._updateQueue.length - 1) return; // nothing to do
        var items = this._updateQueue.splice(start, this._updateQueue.length - start);
        items.sort(Amm.Expression.compareByContextIdAndLevel);
        this._updateQueue.push.apply(this._updateQueue, items);
    },
    
    _endUpdate: function() {
        if (!this._updateLevel) {
            Error("Amm.Expression: _endUpdate() without _beginUpdate!");
        }
        if (this._updateLevel > 1) {
            this._updateLevel--;
            this._lockWrite--;
            return;
        }
        this._deferredValueChange = {};
        // process update queue
        for (var i = 0; i < this._updateQueue.length; i++) {
            if (!this._updateQueueSorted) {
                this._sortUpdateQueue(i);
            }
            var contextId = this._updateQueue[i][1];
            var op = this._updateQueue[i][0];
            if (op._contextId !== contextId) op.setContextId(contextId);
            op.finishUpdate();
        }
        this._updateLevel = 0;
        this._lockWrite--;
        var dv = this._deferredValueChange;
        this._deferredValueChange = null;
        if (dv.ids) {
            for (var i = 0, l = dv.ids.length; i < l; i++) {
                var d = dv[dv.ids[i]];
                if (this._contextId !== d.contextId) {
                    this.setContextId(d.contextId);
                }
                this._reportChange(d.old);
            }
        }
        if (this._writeDestinationChanged) {
            this.notifyWriteDestinationChanged();
        }
    },
    
    queueUpdate: function(operator) {
        this._updateQueue.push([operator, operator._contextId]);
        this._updateQueueSorted = false;
    },
    
    _constructContextState: function() {
        var res = Amm.Operator.VarsProvider.prototype._constructContextState.call(this);
        res._subscribers = {};
        return res;
    },
    
    toFunction: function() {
        var a = this._operandFunction('operator'), env = {
            vars: this._vars,
            expressionThis: this._expressionThis
        };
        var fn;
        if (this._operatorOperator && this._operatorOperator.supportsAssign) {
            var assign = this._operatorOperator.assignmentFunction();
            fn = function(value, throwIfCant) {
                if (arguments.length) {
                    var res = assign(env, value);
                    if (res && throwIfCant) throw res;
                    return !res;
                }
                else return a(env);
            };
        } else {
            fn = function() {
                return a(env);
            };
        }
        fn.env = env;
        return fn;
    },
    
    findContext: function(expressionThis) {
        if (this._expressionThis === expressionThis) return this._contextId;
        for (var i in this._contextState) if (this._contextState.hasOwnProperty(i)) {
            if (this._contextState[i] && this._contextState[i]._expressionThis === expressionThis) {
                return i;
            }
        }
        return undefined;
    }
    
};

Amm.Expression.getAllWatchers = function() {
    var res = [];
    var watches = Amm.getRoot().getUniqueSubscribers(Amm.Expression, 'interval');
    for (var i = 0, l = watches.length; i < l; i++) {
        res.push({expr: watches[i], nc: watches[i].getNonCacheableChildren(true)});
    }
    return res;
};

Amm.Expression._builder = null;
Amm.Expression._parser = null;

Amm.extend(Amm.Expression, Amm.WithEvents.DispatcherProxy);
Amm.extend(Amm.Expression, Amm.WithEvents);
Amm.extend(Amm.Expression, Amm.Operator.VarsProvider);/* global Amm */

Amm.ArrayMapper = function(options) {

    this._srcEntries = [];
    this._destEntries = [];
    this.beginUpdate();
    Amm.WithEvents.call(this, options);
    this.endUpdate();
    
};

/**
 * Items in destination array are sorted randomly
 */
Amm.ArrayMapper.SORT_NONE = 0;

/**
 * Items in destination array are in same order as in source array
 */
Amm.ArrayMapper.SORT_DIRECT = 1;

/**
 * Items in destination array are in reverse order of source array
 */
Amm.ArrayMapper.SORT_REVERSE = -1;

// Indexes in _srcEntries' items

Amm.ArrayMapper._SRC_ITEM = 0;

Amm.ArrayMapper._SRC_INDEX = 1;

Amm.ArrayMapper._SRC_REF_TO_DEST = 2;

// Indexes in _destEntries' items

Amm.ArrayMapper._DEST_REF_TO_SRC = 0;

Amm.ArrayMapper._DEST_PASS = 1;

Amm.ArrayMapper._DEST_SORT_VALUE = 2;

Amm.ArrayMapper._DEST_IN_SLICE = 3;

Amm.ArrayMapper._DEST_ITEM = 4;

Amm.ArrayMapper.prototype = {
    
    'Amm.ArrayMapper': '__CLASS__',
    
    // src Collection or Array (restrictions may be imposed by concrete classes)
    _src: null,

    // whether src Collection/Array instance was created by current ArrayMapper
    _srcIsOwn: null,

    // dest Collection or Array (restrictions may be imposed by concrete classes)
    _dest: null,
    
    // whether this._dest was created by Amm.ArrayMapper
    _destIsOwn: false,

    // Prototype of 'own' src - used when src is created, i.e. by assigning setSrc(array)
    _srcPrototype: null,
    
    // Prototype of 'own' dest - used when dest is created and not supplied by setDest()
    _destPrototype: null,

    srcClass: 'Amm.Array',
    
    destClass: 'Amm.Array',
    
    _filter: null,
    
    _filterIsFn: null,
    
    _sort: Amm.ArrayMapper.SORT_DIRECT,
    
    _sortIsFn: null,
    
    _offset: 0,
    
    _length: undefined,
    
    // TRUE if we have to calc "slice" (`offset` and/or `length` are set)
    _hasSlice: false,
    
    _instantiator: null,
    
    _instantiatorIsFn: null,
    
    // [ [src, srcIndex, refToDestEntry], ... ]
    // always ordered by srcIndex (so we could locate items faster)
    _srcEntries: null,
    
    // [ [refToSrcEntry, pass, orderValue, inSlice, dest ], ... ]
    _destEntries: null,
    
    /**
     * Extra items in the dest. Will always be in the beginning of dest sequence.
     * `offset` and `length` don't account for _destExtra items.
     */ 
    _destExtra: null,
    
    _updateLevel: 0,
    
    _applyFilter: false, // true: this.applyFilter was called
    
    _applySort: false, // true: this.applySort was called
    
    _applySlice: false, // true: slice parameters changed
    
    /**
     * Sets `src` Amm.Collection or Amm.Array. If javascript Array is provided, default instance is created if possible.
     * If null is provided, default instance will be created using the prototype.
     * getSrc() will return Amm.Array / Amm.Collection instance, not provided array
     */
    setSrc: function(src) {
        if (src instanceof Array) {
            if (this._src & this._srcIsOwn) {
                return this._src.setItems(src);
            } else {
               src = this._createSrc(src); 
            }
        } else if (!src) {
            src = this._createSrc();
        }
        var oldSrc = this._src;
        if (oldSrc === src) return;
        Amm.is(src, this.srcClass, 'src');
        Amm.is(src, 'Amm.Array', 'src');
        this._srcIsOwn = (src._ammArrayMapper === this);
        this._src = src;
        if (src) this._subscribeSrc(src);
        if (this._dest) {
            this._rebuild();
        }
        if (src) this._subscribeSrc(src);
        this.outSrcChange(src, oldSrc);
        if (oldSrc) this._cleanupCollectionIfOwn(oldSrc);
        return true;
    },

    /**
     * @returns {Amm.Array}
     */
    getSrc: function() {
        if (!this._src) this.setSrc(null); // will create src
        return this._src; 
    },
    
    outSrcChange: function(src, oldSrc) {
        this._out('srcChange', src, oldSrc);
    },

    setSrcPrototype: function(srcPrototype) {
        var oldSrcPrototype = this._srcPrototype;
        if (oldSrcPrototype === srcPrototype) return;
        this._srcPrototype = srcPrototype;
        // TODO: think if we need to change src properties...
        return true;
    },

    getSrcPrototype: function() { return this._srcPrototype; },
    
    getSrcIsOwn: function() { return this._srcIsOwn; },
    
    _createSrc: function(items) {
        var p = this._srcPrototype? Amm.override({}, this._srcPrototype) : {};
        if (items) p.items = items;
        var res = Amm.constructInstance(p, this.srcClass);
        res._ammArrayMapper = this;
        return res;
    },
    
    /**
     * Sets `dest` Amm.Collection or Amm.Array. In contrary to setSrc(), javascript Array cannot be provided.
     * If null is provided, current dest instance will be replaced with 'own' dest instance (unless it is 'own' 
     * now; in that case, no changes will be made)
     */
    setDest: function(dest) {
        if (!dest) {
            dest = this._createDest();
        }
        var oldDest = this._dest;
        if (oldDest === dest) return;
        Amm.is(dest, this.destClass, 'dest');
        Amm.is(dest, 'Amm.Array', 'dest');
        this._destIsOwn = (dest._ammArrayMapper === this);
        this._dest = dest;
        this._rebuild();
        this.outDestChange(dest, oldDest);
        if (oldDest) this._cleanupCollectionIfOwn(oldDest);
        return true;
    },
    
    setDestExtra: function(destExtra) {
        if (destExtra === this._destExtra) return;
        
        if (destExtra instanceof Array && !destExtra.length) destExtra = null;
        else if (!destExtra) destExtra = null;
        
        if (this._destExtra instanceof Array && destExtra instanceof Array 
            && Amm.Array.equal(destExtra, this._destExtra)) return;
        
        this._destExtra = destExtra;
        
        this._remap();
    },
    
    getDestExtra: function() {
        return this._destExtra;
    },

    /**
     * @returns {Amm.Array}
     */
    getDest: function() {
        if (!this._dest) this.setDest(null); // will create src        
        return this._dest;         
    },

    outDestChange: function(dest, oldDest) {
        this._out('destChange', dest, oldDest);
    },
    
    setDestPrototype: function(destPrototype) {
        var oldDestPrototype = this._destPrototype;
        if (oldDestPrototype === destPrototype) return;
        this._destPrototype = destPrototype;
        return true;
    },

    getDestPrototype: function() { return this._destPrototype; },
    
    getDestIsOwn: function() { return this._destIsOwn; },
    
    _createDest: function() {
        var p = this._destPrototype? this._destPrototype : {};
        var res = Amm.constructInstance(p, this.destClass);
        res._ammArrayMapper = this;
        return res;
    },

    setFilter: function(filter) {
        if (!filter) filter = null;
        var oldFilter = this._filter;
        if (oldFilter === filter) return;
        if (!filter) {
        } else if (typeof filter === 'object') {
            filter = Amm.constructInstance(filter, 'Amm.Filter', filter);
            this._filterIsFn = false;
        } else if (typeof filter === 'function') {
            this._filterIsFn = true;
        } else throw Error("`filter` must be an object, a function or a null");
        if (this._filter && !this._filterIsFn) this._unsubscribeFilter();
        this._filter = filter;
        if (this._filter && !this._filterIsFn) this._subscribeFilter();
        this.applyFilter();
        return true;
    },
    
    _subscribeFilter: function() {
        if (this._src) this._filter.setObservedObjects(this._src.getItems());
        this._filter.subscribe('matchesChange', this._handleFilterMatchesChange, this);
    },
    
    _unsubscribeFilter: function() {
        this._filter.unsubscribe('matchesChange', this._handleFilterMatchesChange, this);
        this._filter.setObservedObjects([]);
    },
    
    _subscribeSort: function() {
        if (this._src) this._sort.setObservedObjects(this._src.getItems());
        this._sort.subscribe('matchesChange', this._handleSortMatchesChange, this);
        this._sort.subscribe('needSort', this._handleSortNeedSort, this);
    },
    
    _unsubscribeSort: function() {
        this._sort.unsubscribe('matchesChange', this._handleFilterMatchesChange, this);
        this._sort.unsubscribe('needSort', this._handleSortNeedSort, this);
        this._sort.setObservedObjects([]);
    },
    
    _handleFilterMatchesChange: function(items, matches) {
        if (items.length > 1) this.beginUpdate();
        var i, l;
        for (i = 0, l = items.length; i < l; i++) {
            var item = items[i], match = matches[i];
            if (match !== undefined) this.applyFilter(item, match);
        }
        if (items.length > 1) this.endUpdate();
    },
    
    _handleSortMatchesChange: function(items, matches) {
        if (items.length > 1) this.beginUpdate();
        var i, l;
        for (i = 0, l = items.length; i < l; i++) {
            var item = items[i], match = matches[i];
            if (match !== undefined) this.applySort(item, match);
        }
        if (items.length > 1) this.endUpdate();
    },
    
    _handleSortNeedSort: function() {
        this._remap();
    },
    
    getFilter: function() { return this._filter; },
    
    /**
     * Re-applies filter to the source item(s). Useful in case when filter depends on some external data
     * or we know that items are changed.
     * 
     * @param [item] - src array memeber to re-calculate filter (if omitted, all items will be checked)
     * @param {boolean} [pass] - optonal parameter to provide pre-calculated 'pass' result 
     *      instead of calling the filter
     **/
    applyFilter: function(item, pass) {
        if (!this._src) return;
        if (item === undefined) {
            if (this._updateLevel) this._applyFilter = true;
            else {
                this._recalcAllFilter();
                this._remap();
            }
            return;
        }
        if (!this._filter) return;
        var idx = 0;
        while ((idx = Amm.Array.indexOf(item, this._src, idx)) >= 0) {
            var dest = this._srcEntries[idx][Amm.ArrayMapper._SRC_REF_TO_DEST];
            var old = dest[Amm.ArrayMapper._DEST_PASS];
            var n = pass === undefined? this._getFilterValue(dest[Amm.ArrayMapper._DEST_ITEM]) : pass;
            if (old != n && this._instantiator && this._instantiator['Amm.Instantiator.Variants'] && !this._instantiator.getFilter()) {
                this._instantiator.setMatches([item], [n]);
            }
            if (!!old !== !!n) {
                dest[Amm.ArrayMapper._DEST_PASS] = n;
                // TODO: optimize for possible change of one item
                if (!this._updateLevel) this._remap(); 
            }
            if (this._src.getUnique()) break;
        }
    },
    
    setSort: function(sort) {
        if (!sort) sort = null;
        var oldSort = this._sort;
        if (oldSort === sort) return;
        if (!sort) {
        } else if (typeof sort === 'object') {
            sort = Amm.constructInstance(sort, 'Amm.Sorter');
            this._sortIsFn = false;
            if (this._sort && this._sort['Amm.Sorter']) this._unsubscribeSort();
        } else if (typeof sort === 'function') {
            this._sortIsFn = true;
        } else if (!(sort === Amm.ArrayMapper.SORT_DIRECT || sort === Amm.ArrayMapper.SORT_REVERSE)) {
            throw Error("`sort` must be an object, a function, Amm.ArrayMapper.SORT_ constant or a null");
        }
        this._sort = sort;
        if (sort && sort['Amm.Sorter']) this._subscribeSort();
        this.applySort();
        return true;
    },
    
    getSort: function() {
        return this._sort;
    },
    
    /**
     * Re-calculates order value for source item(s).
     */
    applySort: function(item, value) {
        if (!this._src) return;
        if (item === undefined) {
            if (this._updateLevel) this._applySort = true;
            else {
                this._recalcAllSort();
                this._remap();
            }
            return;
        }
        if (!this._sort) return;
        var idx = -1;
        while ((idx = Amm.Array.indexOf(item, this._src, idx + 1)) >= 0) {
            var dest = this._srcEntries[idx][Amm.ArrayMapper._SRC_REF_TO_DEST];
            var old = dest[Amm.ArrayMapper._DEST_SORT_VALUE];
            var n = value === undefined? this._getSortValue(idx) : value;
            if (old !== n) {
                dest[Amm.ArrayMapper._DEST_SORT_VALUE] = value;
                // TODO: optimize for possible change of one item
                if (!this._updateLevel) this._remap();
            }
            if (this._src.getUnique()) break;
        }
    },
    
    _recalcAllSort: function() {
        var srcEntry, changed, newValue;
        for (var i = 0, l = this._destEntries.length; i < l; i++) {
            srcEntry = this._destEntries[i][Amm.ArrayMapper._DEST_REF_TO_SRC];
            if (!this._sort) newValue = null;
            else {
                newValue = this._getSortValue(srcEntry[Amm.ArrayMapper._SRC_ITEM], srcEntry[Amm.ArrayMapper._SRC_INDEX]);
            }
            changed = (this._destEntries[i][Amm.ArrayMapper._DEST_SORT_VALUE] !== newValue);
            this._destEntries[i][Amm.ArrayMapper._DEST_SORT_VALUE] = newValue;
        }
        this._applySort = false;
        if (this._sort && changed && !this._updateLevel) this._remap();
    },
    
    _recalcAllFilter: function() {
        var srcEntry, changed, newValue, affectedObjects = [], newMatches = [];
        var needNotifyInstantiator;
        needNotifyInstantiator = this._instantiator 
            && this._instantiator['Amm.Instantiator.Variants']
            && !this._instantiator.getFilter();

        for (var i = 0, l = this._destEntries.length; i < l; i++) {
            srcEntry = this._destEntries[i][Amm.ArrayMapper._DEST_REF_TO_SRC];
            if (!this._filter) newValue = true;
            else {
                newValue = this._getFilterValue(
                    srcEntry[Amm.ArrayMapper._SRC_ITEM]
                );
            }
            changed = this._destEntries[i][Amm.ArrayMapper._DEST_PASS] !== newValue;
            if (changed && needNotifyInstantiator) {
                affectedObjects.push(srcEntry[Amm.ArrayMapper._SRC_ITEM]);
                newMatches.push(newValue);
            }
            this._destEntries[i][Amm.ArrayMapper._DEST_PASS] = newValue;
        }
        this._applyFilter = false;
        if (affectedObjects.length) this._instantiator.setMatches(affectedObjects, newMatches);
        if (changed && !this._updateLevel) this._remap();
    },
        
    _getSortValue: function(srcItem, srcIndex) {
        if (!this._sort) return null;
        if (this._sort === Amm.ArrayMapper.SORT_DIRECT) return srcIndex;
        if (this._sort === Amm.ArrayMapper.SORT_REVERSE) return -srcIndex;
        if (this._sortIsFn) return this._sort(srcItem, srcIndex);
        return this._sort.calcSortValue(srcItem, srcIndex);
    },
    
    setOffset: function(offset) {
        if (!offset) offset = 0;
        if (typeof offset !== 'number') {
            offset = parseInt(offset);
        }
        if (isNaN(offset)) throw Error("`offset` must be a number");
        var oldOffset = this._offset;
        if (oldOffset === offset) return;
        this._offset = offset;
        var oldHasSlice = this._hasSlice;
        this._hasSlice = !(!this._offset && this._length === null);
        if (this._hasSlice || oldHasSlice) {
            if (this._updateLevel) {
                this._applySlice = true;
            } else {
                this._remap();
            }
        }
        this.outOffsetChange(offset, oldOffset);
        return true;
    },

    getOffset: function() { return this._offset; },

    outOffsetChange: function(offset, oldOffset) {
        this._out('offsetChange', offset, oldOffset);
    },

    setLength: function(length) {
        if (length === null || length === undefined || length === false || length === "") {
            length = null;
        } else {
            if (typeof length !== 'number') length = parseInt(length);
        }
        if (isNaN(length)) throw Error("`length` must be null/undefined/false/empty string or a number");
        var oldLength = this._length;
        if (oldLength === length) return;
        this._length = length;
        var oldHasSlice = this._hasSlice;
        this._hasSlice = !(!this._offset && this._length === null);
        if (this._hasSlice || oldHasSlice) {        
            if (this._updateLevel) {
                this._applySlice = true;
            } else {
                this._remap();
            }
        }
        this.outLengthChange(length, oldLength);
        return true;
    },

    getLength: function() { return this._length; },

    outLengthChange: function(length, oldLength) {
        this._out('lengthChange', length, oldLength);
    },
    
    setInstantiator: function(instantiator) {
        var oldInstantiator = this._instantiator;
        var instantiatorIsFn;
        if (!instantiator) instantiator = null;
        else if ((typeof instantiator) === 'function') {
            instantiatorIsFn = true;
        } else if (typeof instantiator === 'object') {
            if (instantiator['class']) instantiator = Amm.constructInstance(instantiator);
            Amm.meetsRequirements(instantiator, [['construct', 'destruct']], 'instantiator');
            instantiatorIsFn = false;
        } else {
            throw Error("`instantiator` must be an object, a function or a null");
        }
        if (oldInstantiator === instantiator) return;
        this.beginUpdate();
        // deconstruct old items, then re-construct them
        this._destructAll();
        this._unsubscribeInstantiator();
        this._instantiatorIsFn = instantiatorIsFn;
        this._instantiator = instantiator;
        this._subscribeInstantiator();
        this._constructAll();        
        this.endUpdate();
        // rebuild items here
        return true;
    },
    
    _subscribeInstantiator: function() {
        if (!(this._instantiator && this._instantiator['Amm.Instantiator.Variants'])) return;
        this._instantiator.subscribe('needRebuild', this._handleInstantiatorNeedRebuild, this);
        if (this._filter && this._filter['Amm.Filter']) {
            this._filter.subscribe('matchesChange', this._setInstantiatorMatches, this);
        }
    },
    
    _unsubscribeInstantiator: function() {
        if (!(this._instantiator && this._instantiator['Amm.Instantiator.Variants'])) return;
        this._instantiator.unsubscribe('needRebuild', this._handleInstantiatorNeedRebuild, this);
        if (this._filter && this._filter['Amm.Filter']) {
            this._filter.unsubscribe('matchesChange', this._setInstantiatorMatches, this);
        }
    },
    
    _setInstantiatorMatches: function(objects, matches, oldMatches) {
        if (this._instantiator.getFilter()) return;
        this._instantiator.handleFilterMatchesChange(objects, matches, oldMatches);
    },
    
    _handleInstantiatorNeedRebuild: function(objects, matches) {
        var i, l, idx, dest, destItem, destIdx = -1, item, srcUnique, match, newDestItem;
        srcUnique = this._src.getUnique();
        if (objects.length > 1 || !srcUnique) {
            this._dest.beginUpdate();
        }
        for (i = 0, l = objects.length; i < l; i++) {
            match = matches[i];
            // not interesed in non-matching object 
            // (it's dest instance won't appear in _dest because of filter)
            
            if (!match) continue; 
            item = objects[i];
            while ((idx = Amm.Array.indexOf(item, this._src, idx)) >= 0) {
                dest = this._srcEntries[idx][Amm.ArrayMapper._SRC_REF_TO_DEST];
                destItem = dest[Amm.ArrayMapper._DEST_ITEM];
                if (!destItem) continue; // we don't have dest item for some reason
                
                destIdx = Amm.Array.indexOf(destItem, this._dest, destIdx);
                if (destIdx < 0) continue;
                
                newDestItem = this._construct(item, match);
                this._dest.setItem(destIdx, newDestItem);
                this._destruct(destItem);
                dest[Amm.ArrayMapper._DEST_ITEM] = newDestItem;
                if (srcUnique) break; // we shouldn't try to find more items
            }
        }
        if (objects.length > 1 || !this._src.getUnique()) this._dest.endUpdate();
    },
    
    _construct: function(srcItem, pass) {
        if (!this._instantiator) return srcItem;
        if (this._instantiatorIsFn) return this._instantiator(srcItem, this);
        if (this._instantiator.getFilter) {
            var f = this._instantiator.getFilter();
            if (f && f !== this._filter) pass = undefined;
        }
        return this._instantiator.construct(srcItem, pass, this);
    },
    
    _destruct: function(destItem) {
        if (!this._instantiator || this._instantiatorIsFn) return;
        return this._instantiator.destruct(destItem, this);
    },
    
    _destructAll: function(entries) {
        entries = entries || this._destEntries;  
        if (!entries) return;
        for (var i = 0, l = this._destEntries.length; i < l; i++) {
            var item = this._destEntries[i][Amm.ArrayMapper._DEST_ITEM];
            if (!item) continue;
            if (this._instantiator) this._destruct(item);
            entries[i][Amm.ArrayMapper._DEST_ITEM] = null;
        }
    },
    
    _constructAll: function(entries) {
        entries = entries || this._destEntries;  
        if (!entries) return;
        for (var i = 0, l = entries.length; i < l; i++) {
            if (entries[i][Amm.ArrayMapper._DEST_ITEM]) continue;
            if (!entries[i][Amm.ArrayMapper._DEST_IN_SLICE]) continue;
            var srcItem = entries[i][Amm.ArrayMapper._DEST_REF_TO_SRC][Amm.ArrayMapper._SRC_ITEM];
            var pass = entries[i][Amm.ArrayMapper._DEST_PASS];
            var item = this._instantiator? this._construct(srcItem, pass) : srcItem;
            entries[i][Amm.ArrayMapper._DEST_ITEM] = item;
        }
    },

    getInstantiator: function() { return this._instantiator; },

    _cleanupCollectionIfOwn: function(collection) {
        if (collection && collection._ammArrayMapper === this) {
            delete collection._ammArrayMapper;
            collection.cleanup();
            return true;
        }
    },
    
    _subscribeSrc: function(instance, unsubscribe) {
        var m = unsubscribe? 'unsubscribe' : 'subscribe';
        instance[m]('spliceItems', this._handleSrcSpliceItems, this);
    },
    
    _getFilterValue: function(item) {
        if (!this._filter) return true;
        if (this._filterIsFn) return this._filter(item, this);
            else return this._filter.getMatch(item);
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    beginUpdate: function() {
        this._updateLevel++;
        if (this._dest) this._dest.beginUpdate();
    },
    
    endUpdate: function() {
        if (!this._updateLevel) throw Error("Call to endUpdate() w/o corresponding beginUpdate()");
        this._updateLevel--;
        if (!this._updateLevel) {
            if (this._applyFilter) this._recalcAllFilter();
            if (this._applySort) this._recalcAllSort();
            this._remap();
        }
        if (this._dest && this._dest.getUpdateLevel() > this._updateLevel)
            this._dest.endUpdate();
    },
    
    _handleSrcSpliceItems: function(index, cut, insert) {
        
        this.beginUpdate();
        
        if (this._filter && !this._filterIsFn) this._filter.beginUpdate();
        if (this._sort && typeof this._sort === 'object') this._sort.beginUpdate();
        
        var changes = Amm.Array.calcChanges(cut, insert, this._src.getComparison(), index, this._src.getUnique());
        
        var i, l;
        var replacement = [], 
            srcItem, srcIndex, newSrcIndex, srcEntry, 
            destEntry, destEntryIdx, destItem, 
            pass, inSlice, delta;
        
        // replacement is slice of this._srcEntries that will be put instead of old slice 
        // (between index..index+cut.length)
        
        replacement.length = insert.length;
        
        // add new items
        for (i = 0, l = changes.added.length; i < l; i++) {
            // code to create new item
            srcItem = changes.added[i][0];
            srcIndex = changes.added[i][1];
            srcEntry = [ srcItem, srcIndex, null ];
            
            // we register item in filter or sort objects' first, then retrieve filter or sort value
            if (srcItem && (typeof srcItem === 'object')) {
                if (this._filter && !this._filterIsFn) this._filter.observeObject(srcItem);
                if (this._sort && this._sort['Amm.Sorter']) {
                    this._sort.observeObject(srcItem);
                }
            }
            
            destEntry = [ 
                srcEntry, 
                (pass = this._filter? this._getFilterValue(srcItem) : true), 
                this._getSortValue(srcItem, srcIndex), 
                (inSlice = this._hasSlice? undefined: true),
                null
            ];
            destEntry[Amm.ArrayMapper._DEST_ITEM] = null; // will be built by _remap            
            
            this._destEntries.push(destEntry);
            
            srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST] = destEntry;
            replacement[srcIndex - index] = srcEntry;
        }
        
        // delete items
                
        for (i = 0, l = changes.deleted.length; i < l; i++) {
            srcItem = changes.deleted[i][0];
            srcIndex = changes.deleted[i][1];
            srcEntry = this._srcEntries[srcIndex];
            destEntry = srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST];
            destItem = destEntry[Amm.ArrayMapper._DEST_REF_TO_SRC];
            if (destItem !== undefined) {
                if (destItem !== srcItem && this._instantiator)
                    this._destruct(destItem);
            }
            destEntry.splice(0, destEntry.length); // delete everything from destEntry
            destEntryIdx = Amm.Array.indexOf(destEntry, this._destEntries);
            srcEntry.splice(0, srcEntry.length); // delete everything in srcEntry
            // no need to delete srcEntry since this part of this._srcEntry will be replaced anyway
            
            if (destEntryIdx >= 0) this._destEntries.splice(destEntryIdx, 1);
            if (srcItem && (typeof srcItem === 'object')) {
                if (this._filter && !this._filterIsFn) this._filter.unobserveObject(srcItem);
                if (this._sort && this._sort['Amm.Sorter']) this._sort.unobserveObject(srcItem);
            }
            
        }
        
        // move items
        
        for (i = 0, l = changes.moved.length; i < l; i++) {
            srcItem = changes.moved[i][0];
            srcIndex = changes.moved[i][1];
            newSrcIndex = changes.moved[i][1];
            srcEntry = this._srcEntries[srcIndex];
            srcEntry[Amm.ArrayMapper._SRC_INDEX] = newSrcIndex;
            destEntry = srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST];
            destEntry[Amm.ArrayMapper._DEST_SORT_VALUE] = this._getSortValue(srcItem, newSrcIndex);
            replacement[newSrcIndex - index] = srcEntry;
        }
        
        // copy items that weren't changed
        
        for (i = 0, l = changes.same.length; i < l; i++) {
            srcIndex = changes.same[i][1];
            srcEntry = this._srcEntries[srcIndex];
            replacement[srcIndex - index] = srcEntry;
        }
        
        // adjust indexes and orderValues for other items
        
        if (cut.length !== insert.length) {
            delta = insert.length - cut.length;
            for (i = index + cut.length; i < this._srcEntries.length; i++) {
                srcEntry = this._srcEntries[i];
                srcEntry[Amm.ArrayMapper._SRC_INDEX] = i + delta;
                if (this._sort) {
                    srcItem = srcEntry[Amm.ArrayMapper._SRC_ITEM];
                    destEntry = srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST];
                    destEntry[Amm.ArrayMapper._DEST_SORT_VALUE] = this._getSortValue(srcItem, i + delta);
                }
                
            }
        }
        
        // now replace old part of srcEntries with new one
        
        this._srcEntries.splice.apply(this._srcEntries, [index, cut.length].concat(replacement));
        
        this._remap();
        
        if (this._sort && typeof this._sort === 'object') this._sort.endUpdate();
        if (this._filter && !this._filterIsFn) this._filter.endUpdate();
        
        this.endUpdate();
        
    },
    
    _cleanAll: function() {
        if (!this._srcEntries) return;
        var i, l, srcEntry, destEntry, destItem;
        for (i = this._srcEntries.length - 1; i >= 0; i--) {
            srcEntry = this._srcEntries[i];
            destEntry = srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST];
            destItem = destEntry[Amm.ArrayMapper._DEST_ITEM];
            if (this._instantiator && !this._instantiatorIsFn && destItem && destItem !== srcEntry[Amm.ArrayMapper._SRC_ITEM]) {
                this._destruct(destItem);
            }
            srcEntry.splice(0, srcEntry.length);
            destEntry.splice(0, destEntry.length);
            if (this._dest) this._dest.setItems([] || this._destExtra);
        }
        this._srcEntries = [];
        this._destEntries = [];
    },
    
    _rebuild: function() {
        this.beginUpdate();
        this._cleanAll();
        if (this._src) this._handleSrcSpliceItems(0, [], this._src.getItems());
        this.endUpdate();
    },
    
    /**
     * Should be called when we already have this._srcEntries and this._destEntries
     */
    _remap: function() {
        
        if (!this._destEntries) return;
        
        this._applySort = false;
        this._applyFilter = false;
        this._applySlice = false;
        
        // now recalc everything and replace dest items
        
        var destItems = [], i, passing, l, e,
            pass = Amm.ArrayMapper._DEST_PASS,
            inSlice = Amm.ArrayMapper._DEST_IN_SLICE,
            destItem = Amm.ArrayMapper._DEST_ITEM,
            srcReference = Amm.ArrayMapper._DEST_REF_TO_SRC,
            srcItem = Amm.ArrayMapper._SRC_ITEM,
            k;
        
        if (this._sort) {
            // we keep sorted destEntries instead of post-filter array to have less work on subsequent sorts
            k = Amm.ArrayMapper._DEST_SORT_VALUE;
            if (this._sort['Amm.Sorter']) {
                var s = this._sort;
                this._destEntries.sort(function(a, b) {return s.compareMatches(a[k], b[k]);});
            } else {
                this._destEntries.sort(function(a, b) {return a[k] - b[k];});
            }
        }
        
        var passed, destItems = [];
        
        if (this._hasSlice) passed = [];
        
        for (i = 0, l = this._destEntries.length; i < l; i++) { // find passed items
            e = this._destEntries[i];
            passing = !this._filter || e[pass];
            if (!passing) { // surely not in slice
                e[inSlice] = false;
                if (e[destItem]) {
                    if (this._instantiator) this._destruct(e[destItem]);
                    e[destItem] = null;
                }                
            } else if (!this._hasSlice) { // surely in slice
                e[inSlice] = true;
                if (!e[destItem]) {
                    e[destItem] = this._instantiator? this._construct(e[srcReference][srcItem], passing) : e[srcReference][srcItem];
                }
                destItems.push(e[destItem]);
            } else { // passing && this._hasSlice - dunno if will reach to the slice
                e[inSlice] = undefined;
                passed.push(e);
            }
        }
        
        if (!this._hasSlice) {
            if (this._destExtra) {
                destItems = this._destExtra.concat(destItems);
            }
            this.getDest().setItems(destItems);
            return;
        }
        
        var _sliceInfo = this._getSlice(passed.length);
        var sliced = passed.splice(_sliceInfo[0], _sliceInfo[1] - _sliceInfo[0]);
        
        // now passed contain items not in slice, and sliced contain items in the slice
        
        for (i = 0, l = sliced.length; i < l; i++) {
            e = sliced[i];
            e[inSlice] = true;
            if (!e[destItem]) {
                e[destItem] = this._instantiator? this._construct(e[srcReference][srcItem], e[pass]) : e[srcReference][srcItem];
            }
            destItems.push(e[destItem]);
        }
        
        for (i = 0, l = passed.length; i < l; i++) {
            e = passed[i];
            e[inSlice] = false;
            if (e[destItem]) {
                if (this._instantiator) this._destruct(e[destItem]);
                e[destItem] = null;
            }       
        }
        
        if (this._destExtra) {
            destItems = this._destExtra.concat(destItems);
        }
        
        this.getDest().setItems(destItems);
        
    },
    
    //  returns part of full resulting array that is limited by _offset and _length
    _getSlice: function(fullLength) {
        var offset = this._offset, length = this._length;
        if (length === 0) return [0, 0];
        var start = offset || 0;
        if (start < 0) start = fullLength + start;
        if (start < 0) start = 0;
        var end;
        if (!length) end = fullLength;
        else if (length < 0) {
            end = fullLength + length;
            if (end < 0) end = 0;
        } else end = start + length;
        if (end < start) return [0, 0];
        return [start, end];
    },
    
    cleanup: function() {        
        if (this._filter && !this._filterIsFn) {
            this._unsubscribeFilter();
            this._filter = null;
        }
        if (this._sort && this._sort['Amm.Sorter']) {
            this._unsubscribeSort();
            this._sort = null;
        }
        this._cleanAll();
        if (this._src) this._cleanupCollectionIfOwn(this._src);
        if (this._dest) this._cleanupCollectionIfOwn(this._dest);
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    _getArrayItems: function(a, index) {
        return a.map(function(item) { return item? item[index]: undefined; });
    }

};

Amm.extend(Amm.ArrayMapper, Amm.WithEvents);
/* global Amm */

Amm.Collection = function(options) {
    var t = this;
    this._compareWithProps = function(a, b) {
        return t._implCompareWithProps(a, b);
    };
    this._sortWithProps = function(a, b) {
        return t._implSortWithProps(a, b);
    };
    this._itemUpdateQueue = [];
    this.k = {};
    Amm.Array.call(this, options);
};

Amm.Collection.ERR_NOT_AN_OBJECT = "Not an object.";

Amm.Collection.ERR_NOT_MEETING_REQUIREMENTS = "Doesn't meet requirements.";

Amm.Collection.ERR_DUPLICATE_UPDATE_NOT_ALLOWED = "Duplicate; update not allowed.";

Amm.Collection.ERR_ADD_DISALLOWED = "Adding new items disallowed";

Amm.Collection.ERR_DELETE_DISALLOWED = "Deleting items disallowed";

Amm.Collection.ERR_REORDER_DISALLOWED = "Reordering (and inserting/deleting items not at the end) disallowed";

Amm.Collection.ERR_KEY_PROPERTY_MISSING = "Key property missing";

Amm.Collection.ERR_KEY_PROPERTY_INVALID = "Invalid key property value (must be scalar)";

/**
 * Searches for position of item `item` in *sorted* array `arr` 
 * using binary search with some tricks (checks if item < start or if item > end,
 * only then dives deeper).
 * 
 * @param {Array} arr (or Amm.Array) to search in. Must be sorted 
 *      using `sortFunc` (or using javascript array.prototype.sort if no
 *      `sortFunc` is provided) to search properly.
 * @param {mixed} item Item which position we search for
 * @param {function} sortFunc function that was used to sort an array and that
 *      will be used to compare the items. If omitted, ===, < and > will be
 *      used. 
 *      
 *      sortFunc(a, b) must return -1, 0, 1 for a < b, a === b and a > b items.
 *      
 *      If neither a < b, nor a > b, items are considered _equal_.
 *      
 * @param {number} left Search start index, defaults to 0
 * @param {number} right Search end index, defaults to arr.length - 1
 * @returns {Array} [idx, found]
 *      If found === true, the item is found and has index idx. 
 *      If found === false, the item is not found and, if placed into an array,
 *      should be placed between arr[idx - 1] and arr[idx].
 *      
 *      Even if item exists in `arr` but not within [left, right] interval,
 *      found will be FALSE.
 */
Amm.Collection.binSearch = function(arr, item, sortFunc, left, right) {
    var leftIdx = typeof left === 'number'? left : 0;
    var rightIdx = typeof right === 'number'? right : arr.length - 1;
    var midIdx;
    if (leftIdx < 0) leftIdx = 0;
    if (rightIdx > arr.length - 1) rightIdx = arr.length - 1;

    // check if left index is within array bounds
    if (leftIdx > (arr.length - 1)) {
        return [left, false]; // not found; place (somewhere) before left
    }

    // important!! boilerplate for sort(a, b) is 
    // -(a < b) || (a !== b) | 0 
    // because - (a < b) is -1 if a < b, 
    // and then a !== b | 0 is 0 if a === b or 1 if a > b 
    // (| is to conv bool to int)

    var lCmp, rCmp, mCmp;
    
    // check if we are 'lefter' than left
    lCmp = sortFunc? sortFunc(item, arr[leftIdx]) : -(item < arr[leftIdx]) || (item !== arr[leftIdx] | 0);
    if (lCmp === 0) return [leftIdx, true]; // idx is left
    else if (lCmp < 0) return [leftIdx - 1, false]; // lefter than left, but not found

    // check if we are 'righter' than right
    rCmp = sortFunc? sortFunc(item, arr[rightIdx]) : -(item < arr[rightIdx]) || (item !== arr[rightIdx] | 0);
    if (rCmp === 0) return [rightIdx, true];
    else if (rCmp > 0) return [rightIdx + 1, false];
        
    while ((rightIdx - leftIdx) > 1) {
        
        midIdx = Math.floor((leftIdx + rightIdx) / 2);
        mCmp = sortFunc? sortFunc(item, arr[midIdx]) : -(item < arr[midIdx]) || (item !== arr[midIdx] | 0);
        
        if (mCmp === 0) {
            return [midIdx, true]; // direct hit!
        }
        
        if (mCmp < 0) rightIdx = midIdx;
            else leftIdx = midIdx;
            
    }
    // not found; must be placed between rightIdx and rightIdx - 1 (which is leftIdx)
    return [rightIdx, false]; 
    
};

/**
 * @TODO: disable sort routines / sort property modification if !this._allowReorder
 */
Amm.Collection.prototype = {

    'Amm.Collection': '__CLASS__', 
    
    /* JS hash that contains references to the objects by their keyProperty when keyProperty is set */
    k: null,
    
    _unique: true,
    
    _sparse: false,
    
    _requirements: null,
    
    _assocProperty: null,
    
    _assocInstance: null,

    _indexProperty: null,

    _observeIndexProperty: true,
    
    _indexPropertyIsWatched: false,

    _defaults: null,
    
    _undefaults: null,

    _changeEvents: null,

    _comparisonProperties: null,
    
    // comparison is only done using ===
    _onlyStrict: false, 

    _ignoreExactMatches: null,

    // whether we should re-check items' uniqueness on item change
    // (will make no sense if we don't have comparisonProperties/comparisonFn)
    _recheckUniqueness: false,

    // this._comparison is used when _comparisonProperties are used
    // thus we store value provided by setComparison() to _custComparison
    _custComparison: null,

    // comparison function that uses _comparisonProperties but sets proper scope
    _compareWithProps: null,
    
    // function that uses _sortProperties but sets proper scope
    _sortWithProps: null,
    
    _sortProperties: null,
    
    _sortReverse: false,

    _sortFn: null,
    
    _sorted: false,
    
    _sorter: null,
    
    _needSort: false,
    
    _lockSort: 0,
    
    _sorterIsAggregate: false,

    _updateProperties: null,
    
    _itemUpdateLevel: 0,
    
    _endItemsUpdateLock: false,
    
    _itemUpdateQueue: null,
            
    _updateFn: null,
    
    _allowUpdate: false,
    
    _suppressDeleteEvent: 0,
    
    _suppressIndexEvents: 0,

    // allow to add new items
    _allowAdd: true,

    // allow to delete items
    _allowDelete: true,

    // allow to change items order. Means also items can be only appended / deleted at the end
    _allowChangeOrder: true,
    
    _cleanupOnDissociate: false,

    /**
     * Hash: {eventName: handlerName, eventName2: handlerName2} where each object of collection
     * will be subscribed to assocObject' handlers handlerName, handlerName2 etc (objects that don't have
     * proper events won't be subscribed, no exception raised)
     */
    _assocEvents: null,
    
    _instantiator: null,
    
    _instantiateOnAccept: false,
    
    _keyProperty: null,
    
    _byKeyChange: false,
    
    setUnique: function(unique) {
        if (!unique) throw Error("setUnique(false) is never supported by Amm.Collection");
        return Amm.Array.prototype.setUnique.call(this, unique);
    },
    
    setSparse: function(sparse) {
        if (sparse) throw Error("setSparse(true) is never supported by Amm.Collection");
        return Amm.Array.prototype.setSparse.call(this, sparse);
    },

    /**
     * @see Amm.meetsRequirements
     * If we change the requirements, current items are re-checked and exception
     * is thrown if any of them desn't match the provided requirements
     */
    setRequirements: function(requirements) {
        var ok = requirements instanceof Array 
                || typeof requirements === 'string' 
                || typeof requirements === 'function';
        if (!ok) {
            throw Error("requirements must be an Array, a string or a function");
        } 
        var oldRequirements = this._requirements;
        if (oldRequirements === requirements) return;
        if (requirements) { // check brave new requirements
            for (var i = 0, l = this.length; i < l; i++) {
                if (!Amm.meetsRequirements(this[i], requirements)) {
                    throw Error("Cannot setRequirements(): at least one item (" + i + ")"
                        + " doesn't meet new `requirements`");
                }
            }
        }
        this._requirements = requirements;
        return true;
    },

    setInstantiator: function(instantiator) {
        
        if (!instantiator) instantiator = null;
        
        var oldInstantiator = this._instantiator;
        if (oldInstantiator === instantiator) return;
        this._instantiator = instantiator;
        return true;
    },

    getInstantiator: function() { return this._instantiator; },
    
    setInstantiateOnAccept: function(instantiateOnAccept) {
        instantiateOnAccept = !!instantiateOnAccept;
        var oldInstantiateOnAccept = this._instantiateOnAccept;
        if (oldInstantiateOnAccept === instantiateOnAccept) return;
        this._instantiateOnAccept = instantiateOnAccept;
        return true;
    },

    getInstantiateOnAccept: function() { return this._instantiateOnAccept; },

    createItem: function(arg) {
        if (!this._instantiator)
            throw Error("Cannot createItem() when `instantiator` not provided");
        var instance = this._instantiator.construct(arg);
        this.accept(instance);
        return instance;
    },
    
    getRequirements: function() { return this._requirements; },
    
    /**
     * Checks if item meets requirements and can be added to a collection
     * without throwing an exception. 
     * 
     * Always returns FALSE if this.getAllowAdd() === false.
     * 
     * If item is already in a collection, will return FALSE 
     * unless this.getAllowUpdate() === true - it means
     * the item will be accepted, but updated on accept().
     * Unless {checkRequirementsOnly} is specified - means that 
     * we won't search for item copy.
     * 
     * Raises onCanAccept(item, problem) event.
     * 
     * Note that basic requirement for an item is that it has to be at least
     * an object.
     * 
     * @param item Item to check
     * @param {boolean} checkRequirementsOnly Don't check if Item has 
     *      duplicates (the check itself is done only when !this.getAllowUpdate())
     * @param {Object} problem If object, problem.error will be set to the
     *      description of the problem (duplicate / requirements / not an object),
     *      and problem.index will contain index of found instance
     * @returns {boolean} If item can be accepted
     */
    canAccept: function(item, checkRequirementsOnly, problem) {
        problem = problem || {};
        if (!this._allowAdd) {
            problem.error = Amm.Collection.ERR_ADD_DISALLOWED;
            return false;
        }
        if (!(typeof item === 'object' && item)) {
            problem.error = Amm.Collection.ERR_NOT_AN_OBJECT;
            return false;
        }
        if (this._requirements && !Amm.meetsRequirements(item, this._requirements)) {
            problem.error = Amm.Collection.ERR_NOT_MEETING_REQUIREMENTS;
            return false;
        }
        if (this._keyProperty) {
            if (!Amm.detectProperty(item, this._keyProperty)) {
                problem.error = Amm.Collection.ERR_KEY_PROPERTY_MISSING;
                return false;
            }
            var key = Amm.getProperty(item, this._keyProperty);
            if (key && typeof key === 'object') {
                problem.error = Amm.Collection.ERR_KEY_PROPERTY_INVALID;
                return false;
            }
        }
        if (!checkRequirementsOnly && !this._allowUpdate) {
            var index = this.indexOf(item);
            if (index >= 0) {
                problem.error = Amm.Collection.ERR_DUPLICATE_UPDATE_NOT_ALLOWED;
                problem.index = index;
                return false;
            }
        }
        problem.index = null; 
        problem.error = null;
        this.outOnCanAccept(item, problem);
        return !problem.error;
    },
    
    /**
     * Expects both _instantiator && _instantiateOnAccept - no check
     * We consider item needed to be instantiated if
     *      a) we have requirements and item doesn't meet them
     *      b) we don't have requirements and item is not an object 
     *      c) we don't have requirements, item is object but !Amm.getClass(item)
     */
    _instantiateIfNeeded: function(item) {
        var should = false;
        if (this._requirements) should = !Amm.meetsRequirements(item, this._requirements);
        else if (typeof item !== 'object') should = true;
        else if (!Amm.getClass(item)) should = true;
        if (!should) return item;
        var instance = this._instantiator.construct(item);
        return instance;
    },
    
    /**
     * Checks if can accept items; returns SIX arrays:
     * 0. Items that are not added yet - excluding ones that have matches
     * 1. Subset of `items` that have matches
     * 2. Subset of `this` that is matches of those items (including exact duplicates)
     * 3. Indexes of original `items` that have matches (to re-create mapping later)
     * 4. Items within [deleteStart..deleteStart+deleteCount) that will be removed 
     *    from collection and not re-inserted - to support splice operation.
     * 5. Combined array with new and re-inserted items
     * 6. Indexes of items in ##4
     *    
     * Note on how "delete interval" (DI) works.
     * - items within DI that have exact matches in `items` will 
     *   produce no exceptions
     * - items within DI that have non-exact matches will be marked 
     *   to be removed from collection if this.getAllowUpdate() is false
     *    
     * Throws exceptions if some of items cannot be accepted.
     */
    _preAccept: function(items, deleteStart, deleteCount) {

        if (!deleteStart) deleteStart = 0;
        if (deleteStart < 0) deleteStart = this.length + deleteStart;
        if (deleteStart > this.length) deleteStart = this.length;
        if (!deleteCount) deleteCount = 0;

        var deleteEnd = deleteStart + deleteCount;
        
        if (deleteCount < 0) {
            deleteEnd = this.length + deleteCount;
            deleteCount = 0;
        }
        
        var long = items.concat(this.getItems()), i, n,
            toDelete = deleteCount? this.slice(deleteStart, deleteEnd) : [],
            toDeleteIdx = [],
            numNotDeleted = 0;
    
        for (var i = deleteStart; i < deleteEnd; i++)
            toDeleteIdx.push(i);

        if (this._instantiator && this._instantiateOnAccept) {
            for (i = 0, n = items.length; i < n; i++) {
                items[i] = this._instantiateIfNeeded(items[i]);
            }
        }
        
        // check requirements for each item
        for (i = 0, n = items.length; i < n; i++) {
            var problem = {};
            if (!this.canAccept(items[i], true, problem)) {
                throw Error("Cannot accept items[" + i + "]: " + problem.error);
            }
        }
        // check if there are duplicates in the added aray
        var dupes = Amm.Array.findDuplicates(long, false, this._comparison);
        if (!dupes.length) { // great, no matches
            return [[].concat(items), [], [], [], 
                toDelete, [].concat(items), toDeleteIdx];
        }
        // have to sort the matches
        var dl = dupes.length, 
            itemsWithMatches = [], 
            matches = [], 
            newItems = [].concat(items),
            numNotNew = 0,
            indexes = [], 
            newAndReInserted = [].concat(items);
        
        for (i = 0; i < dl; i++) {
            var idx = dupes[i];
            // we can have at most two legitimate duplicates, one in this and one in items
            if (idx.length > 2) {
                var s = [];
                for (j = 0; j < idx.length; j++) s.push(this._describeIdx(idx[j], items.length));
                throw Error("Multiple instances of same item: " + s.join (", "));
            }
            var exact = long[idx[0]] === long[idx[1]];
            
            if (idx[0] >= items.length)
                throw Error("WTF: we found two duplicates in `this`: " 
                    + this._describeIdx(idx[0], items.length) 
                    + (exact? ' === ' : ' ~= ') 
                    + this._describeIdx(idx[1], items.length));
            
            if (idx[1] < items.length)
                throw Error("There are at least two duplicates in `items`: " 
                    + this._describeIdx(idx[0], items.length) 
                    + (exact? ' === ' : ' ~= ') 
                    + this._describeIdx(idx[1], items.length));
            
            // now check if our index is in delete interval 
            // - therefore is a candidate for a reinsert
            var thisIdx = idx[1] - items.length;
            var reinsert = thisIdx >= deleteStart && thisIdx < deleteEnd;
            
            if (!exact && !this._allowUpdate) {
                // it is not re-insert because we cannot update non-exact match
                reinsert = false; 
            }
            
            if (exact && !reinsert && !this._ignoreExactMatches) {
                throw Error("Item already in collection: " 
                    + this._describeIdx(idx[0], items.length) 
                    + ' === ' 
                    + this._describeIdx(idx[1], items.length)
                    + ". setIgnoreExactMatches(true) next time.");
            }
            if (!exact && !reinsert && !this._allowUpdate) {
                throw Error("Added item matches existing one, but no update routine provided: "
                    + this._describeIdx(idx[0], items.length) 
                    + ' ~= ' 
                    + this._describeIdx(idx[1], items.length)
                    + ". setUpdateProperties() and/or setUpdateFn() may help.");
            }
                
            if (reinsert) {
                // mark re-inserted items as not-to-be-deleted
                // we only mark them now to maintain proper index mapping
                // between toDelete[] and this[] arrays; we will remove
                // marked elements later
                
                toDelete[thisIdx - deleteStart] = undefined;
                toDeleteIdx[thisIdx - deleteStart] = undefined;
                numNotDeleted++;
            }
            
            // remove the stuff that has duplicates from newItems array. 
            // 
            // Since we splice it from front to the end, we need to adjust index 
            // every time according to the number of already deleted items
            if (!reinsert) {
                newAndReInserted.splice(idx[0] - itemsWithMatches.length, 1); 
            }
            newItems.splice(idx[0] - numNotNew, 1); 
            numNotNew++;
            
            // checked everything
            indexes.push(idx[0]);
            itemsWithMatches.push(long[idx[0]]); // part from insert[]
            matches.push(long[idx[1]]); // part from this[]
        }
        
        if (numNotDeleted) {
            // remove marked items from toDelete and toDeleteIdx arrays
            for (i = toDelete.length - 1; i >= 0; i--) {
                if (toDelete[i] !== undefined) continue;
                toDelete.splice(i, 1);
                toDeleteIdx.splice(i, 1);
            }
        }
        
        return [newItems, itemsWithMatches, matches, 
            indexes, toDelete, newAndReInserted, toDeleteIdx];
    },
    
    // Adds new items to a non-sorted collection.
    // Doesn't check for duplicates. Doesn't trigger events.
    _addNew: function(newItems, index) {
        if (index === undefined || index >= this._length) {
            index = this.length;
            this.length += newItems.length;
        } else {
            this._rotate(index, newItems.length);
        }
        for (var i = 0, l = newItems.length; i < l; i++) {
            this[index + i] = newItems[i];
        }
    },

    // Adds new items to a sorted collection.
    // Doesn't check for duplicates. Doesn't trigger events.
    // Returns [newItemsSorted, theirIndexes] 
    //      (because all indexes are different)
    _addNewToSorted: function(newItems) {
        var sorted = [].concat(newItems);
        var idx = this._locateManyItemIndexesInSortedArray(sorted);
        for (var i = 0; i < idx.length; i++) {
            if (idx[i] < this.length) {
                this._rotate(idx[i], 1);
                this[idx[i]] = sorted[i];
            } else {
                this[this.length++] = sorted[i];
            }
        }
        return [sorted, idx];
    },

    // accepts item. Returns added item (same or one that was updated, or one that was instantiated)
    // TODO: add idx and use in array-ish methods below
    accept: function(item, index) {
        var pa = this._preAccept([item]);
        var res;
        if (this._sorted && index !== undefined) {
            throw Error("`index` must not be used with sorted Collection - check for getIsSorted() next time");
        }
        if (index === undefined) index = this.length;
        if (index < 0) index = this.length + index;
        if (index > this.length) index = this.length;
        if (pa[0].length) { // new item
            var sorted = this._sorted;
            var idx = sorted? 
                this._locateItemIndexInSortedArray(item) : index;
            if (idx === undefined || idx <= 0) idx = 0;
            res = pa[0][0];
            if (idx < this.length) {
                this._rotate(idx, 1);
                this[idx] = item;
            } else {
                this[this.length++] = item;
            }
            // ok, we have our item in place
            this._associate(item, idx);
            this._outSmartSplice(idx, [], [item]);
            this._subscribe(item);
            if (this._indexProperty && idx < this.length - 1)
                this._reportIndexes(null, idx + 1);
        } else { // existing item
            res = pa[2][0]; // match for updating
            this._updateItem(pa[2][0], pa[1][0]);
        }
        return res;
    },
    
    /* accepts many items. Returns an array of added or updated items
     * (updated items are _not_ the same as original items).
     * 
     * index can be used only for non-sorted array
     */
    acceptMany: function(items, index) {
        
        var sorted = this._sorted;
        if (sorted && index !== undefined) 
            throw Error("`index` must not be used with sorted Collection - check for getIsSorted() next time");
        if (!items.length) return []; // shortcut
        if (items.length === 1) return [this.accept(items[0])];
        this._byKeyChange = 1;
        var pa = this._preAccept([].concat(items));
        var i;
        if (pa[0].length) { // we have addable items
            var oldItems = this.getItems(), minIdx;

            // note that new items will have their indexes double-reported 
            // - don't know how to do that better
            if (sorted) {
                var sortIdx = this._addNewToSorted(pa[0]);
                // _sortIdx[0] is pa[0], but sorted
                // _sortIdx[1] is indexes of matching elements in _sortIdx[0]
                for (i = 0; i < sortIdx[0].length; i++) {
                    this._associate(sortIdx[0][i], sortIdx[1][i]);
                }
                // trigger the array-change events
                this._outFragmentedInsert(this._getInsertFragments(sortIdx[0], sortIdx[1]));
                minIdx = sortIdx[1][0];
            } else {
                if (index < 0) index = this.length + index;
                if (index === undefined || index > this.length) index = this.length;
                minIdx = index;
                this._addNew(pa[0], index);
                for (i = 0; i < pa[0].length; i++) {
                    this._associate(pa[0][i], index + i);
                }
                // trigger the array-change event
                this._outSmartSplice(index, [], pa[0]);
            }
            // subscribe to added items' change events
            for (i = 0; i < pa[0].length; i++) {
                this._subscribe(pa[0][i]);
            }
            // some of old elements were shifted
            if (this._indexProperty && minIdx < (this.length - pa[0].length - 1)) { 
                this._reportIndexes(oldItems, minIdx);
            }
        }
        var res = [].concat(pa[0]);
        
        for (var i = 0; i < pa[1].length; i++) {
            // update matching object with the object of `items` 
            this._updateItem(pa[2][i], pa[1][i]);
            // add matching object to the proper place of res using the 
            // previously-saved index
            res.splice(pa[3][i], 0, pa[2][i]);
        }
        
        if (this._byKeyChange === true) {
            this._byKeyChange = false;
            this.outByKeyChange();
        } else {
            this._byKeyChange = false;
        }
        
        return res;
    },
    
    hasItem: function(item, nonStrictCompare) {
        if (nonStrictCompare) return this.indexOf(item) >= 0;
        return Amm.Array.indexOf(item, this) >= 0;
    },
    
    strictIndexOf: function(item) {
        return Amm.Array.indexOf(item, this);
    },
    
    /**
     * Returns Array containing items of the Collection that have matches 
     * in `items` array
     * @param {Array} items Items to intesect our Collection with
     * @param {boolean} strict Use only strict (===) comparison
     * @param {Array} groups If provided, 
     *      will receive items [[`matchingThisItemIdx`, `itemsIdx1`, `itemsIdx2...`]] for src matches data
     *      from `items` array that had matches
     * @returns {Array}
     */
    intersect: function(items, strict, groups) {
        if (groups && !(groups instanceof Array))
            throw Error("`groups` must be an Array (or falseable value)");
        if (!items.length) return []; // nothing to do
        var long = this.getItems().concat(items);
        var dups = Amm.Array.findDuplicates(long, false, strict? null : this._comparison, this.length, true);
        var res = [];
        for (var j = 0, l = dups.length; j < l; j ++) {
            // start from 1 because first instance will always be be within
            // 0..items.length
            for (var k = 0, ll = dups[j].length; k < ll; k++) {
                if (dups[j][k] < this.length) {
                    res.push(long[dups[j][k]]);
                    if (groups) groups.push([dups[j][k]].concat(dups.slice(0, k)));
                    break;
                }
            }
        }
        return res;
    },
    
    reject: function(itemOrIndex, nonStrict) {
        if (!this._suppressDeleteEvent && !this._allowDelete) {
            throw Error(Amm.Collection.ERR_DELETE_DISALLOWED);
        }
        var index, item;
        if (typeof itemOrIndex !== 'object') {
            index = parseInt(itemOrIndex);
            if (isNaN(index)) throw Error("itemOrIndex must be an object or a number");
            if (index < 0) index = this.length + index;
            if (index >= this.length) throw Error("index [" + index + "] doesn't exist");
            item = this[index];
        } else {
            item = itemOrIndex;
            index = nonStrict? this.indexOf(item) : this.strictIndexOf(item);
            if (index < 0) throw Error("itemOrIndex specifies non-existing item");
            item = this[index];
        }
        if (!this._suppressDeleteEvent && !this._allowChangeOrder && index < this.length - 1) {
            throw Error(Amm.Collection.ERR_REORDER_DISALLOWED);
        }
        this._rotate(index, -1);
        this._dissociate(item);
        if (this._indexProperty && index < this.length) this._reportIndexes(null, index);
        
        // we need to report this event only when reject is called
        if (!this._suppressDeleteEvent && !this._updateLevel) {
            this.outDeleteItem(index, item);
        }
        return item;
    },
    
    push: function(element, _) {
        if (!this._allowAdd) {
            throw Error(Amm.Collection.ERR_ADD_DISALLOWED);
        }
        var items = Array.prototype.slice.apply(arguments);
        if (items.length === 1) this.accept(items[0]);
            else this.acceptMany(items);
        return this.length;
    },
    
    pop: function() {
        if (!this._allowDelete) throw Error(Amm.Collection.ERR_DELETE_DISALLOWED);
        if (this.length) return this.reject(this.length - 1);
    },
    
    unshift: function(element, _) {
        if (!this._allowAdd) {
            throw Error(Amm.Collection.ERR_ADD_DISALLOWED);
        }
        if (!this._allowChangeOrder) throw Error(Amm.Collection.ERR_REORDER_DISALLOWED);
        var items = Array.prototype.slice.apply(arguments);
        var index = this._sorted? undefined : 0;
        if (items.length === 1) this.accept(items[0], index);
            else this.acceptMany(items, index);
        return this.length;
    },
    
    shift: function() {
        if (!this._allowDelete) throw Error(Amm.Collection.ERR_DELETE_DISALLOWED);
        if (!this._allowChangeOrder) throw Error(Amm.Collection.ERR_REORDER_DISALLOWED);
        if (this.length) return this.reject(0);
    },

    /**
     * TODO: some better description on "re-insert" issues
     */
    splice: function(start, deleteCount, item1, item2_) {
        var items = Array.prototype.slice.call(arguments, 2);
        
        if (items.length && !this._allowAdd) {
            throw Error(Amm.Collection.ERR_ADD_DISALLOWED);
        }
        if (deleteCount && !this._allowDelete) {
            throw Error(Amm.Collection.ERR_DELETE_DISALLOWED);
        }
        if (start < 0) {
            start = this.length + start;
            if (start < 0) start = 0;
        } else if (start > this.length) start = this.length;
        if (start < (this.length - deleteCount) && !this._allowChangeOrder) {
            throw Error(Amm.Collection.ERR_REORDER_DISALLOWED);
        }
        
        if (deleteCount < 0) deleteCount = 0;
        var cut = this.slice(start, start + deleteCount);
        var pa = this._preAccept(items, start, deleteCount);
        var newInstances = pa[0],
            toRemove = pa[4],
            toRemoveIdx = pa[6],
            insert = pa[5];
        
        var i, j, l, n;
        
        var inserts, sortIdx, cuts, goodSplice;
        
        if (this._sorted) {
            sortIdx = this._addNewToSorted(pa[0]);
            
            // adjust insert indexes according to indexes of items we're going to remove
            for (var i = toRemoveIdx.length - 1; i >= 0; i--) {
                for (var j = sortIdx[1].length - 1; j >= 0; j--) {
                    if (sortIdx[1][j] > toRemoveIdx[i]) sortIdx[1][j]--;
                    else break;
                }
            }
            inserts = this._getInsertFragments(sortIdx[0], sortIdx[1]);
            cuts = toRemove.length? this._getCutFragments(start, toRemove) : [];
            goodSplice = this._getGoodSplice(cuts, inserts);
        } else {
            goodSplice = [start, cut, insert];
        }
        
        if (this._byKeyChange !== true) this._byKeyChange = 1;
        
        // We have to check splice to be "proper" and, if it is not,
        // split splice() event into series of delete/insert events
        // -- even with non-sorted array
        
        if (goodSplice) this._suppressDeleteEvent++;
        for (i = 0, l = toRemove.length; i < l; i++) {
            this.reject(toRemove[i]);
        }
        if (goodSplice) this._suppressDeleteEvent--;
        
        var oldItems = this.getItems();
        
        if (this._sorted) { 
            // _sortIdx[0] is pa[0], but sorted
            // _sortIdx[1] is indexes of matching elements in _sortIdx[0]
            for (i = 0; i < sortIdx[0].length; i++) {
                var idx = sortIdx[1][i];
                //if (idx < 0) idx = 0;
                this._associate(sortIdx[0][i], idx);
            }
            if (!goodSplice) {
                this._outFragmentedInsert(inserts);
            } else {
                this._outSmartSplice(goodSplice[0], goodSplice[1], goodSplice[2]);
            }
            // TODO: outFragmentedDelete - cuz' splice on sorted collection
            // produces no events 
       } else {
            // we need to remove the re-inserted items
            // and allocate the space for new items
            var alloc = insert.length - (cut.length - toRemove.length);
            this._rotate(start, alloc);
            // we use "j" to iterate through newItems which we need to associate
            j = 0; 
            l = insert.length; 
            n = newInstances.length;
            for (i = 0; i < l; i++) {
                // j is always <= i because newInstances.length <= insert.length;
                // `insert` is `newInstances` with scattered re-insert items
                j = 0;
                while(j <= i && insert[i] !== newInstances[j]) j++;
                this[start + i] = insert[i];
                if (insert[i] === newInstances[j]) {
                    this._associate(this[start + i], start + i);
                }
            }
            this._outSmartSplice(start, cut, insert);
        }
        for (i = 0; i < pa[0].length; i++) {
            this._subscribe(pa[0][i]);
        }
        
        if (this._byKeyChange === true) {
            this._byKeyChange = false;
            this.outByKeyChange();
        } else {
            this._byKeyChange = false;
        }
        
        if (this._indexProperty) this._reportIndexes(oldItems);
        
        for (var i = 0; i < pa[1].length; i++) {
            if (pa[2][i] !== pa[1][i]) this._updateItem(pa[2][i], pa[1][i]); 
        }
        
        return cut;
    },
    
    setItems: function(items) {
        var args = [0, this.length].concat(items);
        this.splice.apply(this, args);
        return this.length;
    },
    
    reverse: function() {
        if (!this._allowChangeOrder) throw Error(Amm.Collection.ERR_REORDER_DISALLOWED);
        if (this._sorted) {
            this.setSortReverse(!this.getSortReverse());
            return this.getItems();
        } else {
            var oldItems = this.getItems(), res;
            res = Amm.Array.prototype.reverse.apply(this);
            if (this._indexProperty) this._reportIndexes(oldItems);
            return res;
        }
    },
    
    setItem: function(index, item) {
        this.splice(index, 1, item);
        return this[index] === item? index : this.indexOf(item);
    },
    
    removeAtIndex: function(index, sparse) {
        this.reject(index);
        return true;
    },
    
    moveItem: function(index, newIndex) {
        if (!this._allowChangeOrder) throw Error(Amm.Collection.ERR_REORDER_DISALLOWED);
        if (this._sorted) {
            throw Error("Cannot moveItem() on sorted Collection. Check with getIsSorted() next time");
        }
        var low, high;
        if (index <= newIndex) {
            low = index;
            high = newIndex;
        } else {
            low = newIndex;
            high = index;
        }
        var res = Amm.Array.prototype.moveItem.call(this, index, newIndex);
        if (this._indexProperty) this._reportIndexes(null, low, high + 1);
        return res;        
    },
    

    /**
     * Returns sequential cuts in form [[offset, length, items], ...]
     * @param {type} start - start of deletion queue
     * @param {Array} toRemove - must be subset of this and same order 
     *      - see _preAccept(...)[4]
     * @returns {Array}
     */
    _getCutFragments: function(start, toRemove) {
        var res = [], 
            j = 0,
            k = start,
            seq = 0,
            rl = toRemove.length, 
            l = this.length;
        while (j < rl && k < l) {
            if (toRemove[j] === this[k]) {
                seq++;
                j++;
            }
            else {
                if (seq) res.push([k - seq, seq, toRemove.slice(j - seq, j)]);
                seq = 0;
            }
            k++;
        }
        if (seq) res.push([k - seq, seq, toRemove.slice(j - seq, j)]);
        return res;
    },

    _getInsertFragments: function(sortedItems, sortedIndexes) {
        if (!sortedItems.length) return [];
        var fragments = []; // [offset, items]
        var currentFragment = [sortedIndexes[0], [sortedItems[0]]];
        for (var i = 1, l = sortedItems.length; i < l; i++) {
            if (sortedIndexes[i] === (currentFragment[0] + currentFragment[1].length)) {
                currentFragment[1].push(sortedItems[i]);
            } else {
                fragments.push(currentFragment);
                currentFragment = [sortedIndexes[i], [sortedItems[i]]];
            }
        }
        fragments.push(currentFragment);
        return fragments;
    },
    
    /**
     * 
     * @param {Array} cutFragments result of _getCutFragments
     * @param {Array} insertFragments retsult of _getInsertFragments
     * @returns {Array} [start, cut, insert] or null
     */
    _getGoodSplice: function(cutFragments, insertFragments) {
        var cl = cutFragments.length, il = insertFragments.length;
        if (cl > 1 || il > 1) return null;
        if (!cl && !il) return null; // nothing done - WTF
        if (!cl && il)
            return [insertFragments[0][0], [], insertFragments[0][1]];
        if (cl && !il) 
            return [cutFragments[0][0], cutFragments[0][2], []];
        
        // TODO: check if that's always the case or there are proper
        // good splices where it's not
        if (cl && il && cutFragments[0][0] === insertFragments[0][0])
            return [insertFragments[0][0], cutFragments[0][2], insertFragments[0][1]];
        return null;
    },
    
    _outFragmentedInsert: function(fragments) {
        for (var j = 0; j < fragments.length; j++) {
            this._outSmartSplice(fragments[j][0], [], fragments[j][1]);
        }
    },
    
    insertItem: function(item, index) {
        if (index < 0) throw Error("`index` must be >= 0");
        var r;
        if (index === undefined || index >= this.length || this._sorted) r = this.accept(item);
        else r = this.accept(item, index);
        return this.strictIndexOf(item);
    },
    
    getIsSorted: function() {
        return this._sorted;
    },
    
    // Does NOT subscribe to item change events
    _associate: function(item, index, alsoSubscribe) {
        if (this[index] !== item) {
            throw Error("WTF - this[`index`] !== `item`");
        }
        
        if (this._assocProperty) {
            Amm.setProperty(item, this._assocProperty, this._assocInstance || this);
        }
        
        if (this._assocEvents) this._associateEvents([item]);
        
        if (this._indexProperty) {
            Amm.setProperty(item, this._indexProperty, index);
        }
        if (this._defaults) 
            Amm.setProperty(item, this._defaults);
        
        if (alsoSubscribe) this._subscribe(item);
        
        this.outOnAssociate(item, index);
        
        if (this._keyProperty) {
            var key = Amm.getProperty(item, this._keyProperty);
            if (key !== undefined && key !== null) {
                this.k[key] = item;
                this.outByKeyChange();
            }
        }
        
    },
    
    outOnAssociate: function(item, index) {
        return this._out('onAssociate', item, index);
    },

    _subscribe: function(item) {
        if (this._changeEvents) {
            for (var i = 0, l = this._changeEvents.length; i < l; i++) {
                item.subscribe(this._changeEvents[i], this._reportItemChangeEvent, this);
            }
        }
        if (this._indexPropertyIsWatched) {
            var event = this._indexProperty + 'Change';
            item.subscribe(event, this._reportItemIndexPropertyChange, this);
        }
        if (this._keyProperty) {
            item.subscribe(this._keyProperty + 'Change', this._handleKeyChange, this);
        }
    },
    
   _dissociate: function(item) {
        if (this._changeEvents) {
            item.unsubscribe(undefined, this._reportItemChangeEvent, this);
        }
        if (this._assocProperty && Amm.getProperty(item, this._assocProperty) === (this._assocInstance || this)) {
            Amm.setProperty(item, this._assocProperty, null);
        }
        
        if (this._assocEvents) this._associateEvents([item], true);
        
        if (this._indexPropertyIsWatched) {
            if (this._indexPropertyIsWatched) {
                var event = this._indexProperty + 'Change';
                item.unsubscribe(event, this._reportItemIndexPropertyChange, this);
            }
        }
        
        if (this._keyProperty) {
            var key = Amm.getProperty(item, this._keyProperty);
            if (key !== false && key !== undefined && this.k[key] === item) {
                delete this.k[key];
                this.outByKeyChange();
            }
            item.unsubscribe(this._keyProperty + 'Change', this._handleKeyChange, this);
        }
        
        if (this._undefaults) {
            Amm.setProperty(item, this._undefaults);
        }
        
        if (this._sorter) {
            this._lockSort++;
            this._sorter.unobserveObject(item);
            this._lockSort--;
        }
        
        this.outOnDissociate(item);
        if (this._cleanupOnDissociate && typeof (item.cleanup === 'function')) {
            item.cleanup();
        }
    },
    
    outOnDissociate: function(item) {
        return this._out('onDissociate', item);
    },
    
    
    /**
     * Error handlers should fill problem.error if item cannot be accepted.
     */
    outOnCanAccept: function(item, problem) {
        problem = problem || {};
        return this._out('onCanAccept', item, problem);
    },

    // will set old assocProperty of every this[i]
    setAssocProperty: function(assocProperty) {
        if (!assocProperty) assocProperty = null;
        var oldAssocProperty = this._assocProperty;
        if (oldAssocProperty === assocProperty) return;
        
        this._assocProperty = assocProperty;
        
        this._beginItemsUpdate(); // would be a lot of chatter from the items
        
        // report null to items that used oldAssocProperty
        var i, l = this.length;
        if (oldAssocProperty) {
            for (i = 0; i < l; i++) Amm.setProperty(this[i], oldAssocProperty, null);
        }
        if (assocProperty) {
            for (i = 0; i < l; i++) Amm.setProperty(this[i], assocProperty, this._assocInstance || this);
        }
        
        this._endItemsUpdate();
        
        return true;
    },

    getAssocProperty: function() { return this._assocProperty; },
    
    setAssocInstance: function(assocInstance) {
        var oldAssocInstance = this._assocInstance;
        if (oldAssocInstance === assocInstance) return;
        if (this._assocEvents) this._associateEvents(this, true);
        this._assocInstance = assocInstance;
        if (this._assocEvents) this._associateEvents(this);
        if (this._assocProperty) {
            for (var i = 0, l = this.length; i < l; i++) Amm.setProperty(this[i], this._assocProperty, this._assocInstance || this);
        }
        return true;
    },

    getAssocInstance: function() { return this._assocInstance; },

    setIndexProperty: function(indexProperty) {
        if (!indexProperty) indexProperty = null;
        var oldIndexProperty = this._indexProperty;
        if (oldIndexProperty === indexProperty) return;
        this._indexProperty = indexProperty;
        var tmp = this.getObserveIndexProperty();
        if (tmp) this.setObserveIndexProperty(false);
        if (this._indexProperty) {
            for (var i = 0, l = this.length; i < l; i++) {
                // report items their indexes
                Amm.setProperty(this[i], this._indexProperty, i);
            }
        }
        if (tmp) this.setObserveIndexProperty(tmp);
        this._checkIndexPropertyWatched();
        return true;
    },

    getIndexProperty: function() { return this._indexProperty; },
    
    setObserveIndexProperty: function(observeIndexProperty) {
        observeIndexProperty = !!observeIndexProperty;
        var oldObserveIndexProperty = this._observeIndexProperty;
        if (oldObserveIndexProperty === observeIndexProperty) return;
        this._observeIndexProperty = observeIndexProperty;
        this._checkIndexPropertyWatched();
        return true;
    },

    getObserveIndexProperty: function() { return this._observeIndexProperty; },

    _checkIndexPropertyWatched: function() {
        var observe = false;
        if (this._observeIndexProperty) {
            observe = !this._sorted && this._indexProperty !== null;
        }
        if (this._indexPropertyIsWatched !== observe) {
            var eventName = this._indexProperty + 'Change';
            this._indexPropertyIsWatched = observe;
            if (this._indexPropertyIsWatched) {
                for (var i = 0, l = this.length; i < l; i++) {
                    this[i].subscribe(eventName, 
                        this._reportItemIndexPropertyChange, this);
                }
            } else {
                for (var i = 0, l = this.length; i < l; i++) {
                    this[i].unsubscribe(eventName, 
                        this._reportItemIndexPropertyChange, this);
                }
            }
        }
    },
    
    _reportItemIndexPropertyChange: function(value, oldValue) {
        if (this._suppressIndexEvents) {
            return;
        }
        var item = Amm.event.origin;
        // check if item property change event is suppressed
        //if (!this._suppressIndexEvents.length && Amm.Array.indexOf(item, this._suppressIndexEvents) >= 0) return;
        var oldPos = oldValue;
        var newPos = value;
        if (newPos < 0) newPos = 0;
        else if (newPos >= this.length) newPos = this.length - 1;
        if (this[oldPos] !== item) {
            // quickly check if item's already at new place
             if (this[newPos] === item) return;
            // try to find the item
            oldPos = this.strictIndexOf(item);
            if (oldPos < 0) throw Error("WTF - received item indexProperty change event from item not belonging to this Collection");
        }
        if (oldPos === newPos) return;
        // now move item to the new place
        this.moveItem(oldPos, newPos);
    },
    
    // note: won't change for already accepted items
    setDefaults: function(defaults) {
        if (defaults && typeof defaults !== 'object') throw Error("`defaults` must be an object");
        if (!defaults) defaults = null;
        var oldDefaults = this._defaults;
        if (oldDefaults === defaults) return;
        this._defaults = defaults;
        return true;
    },

    getDefaults: function() { return this._defaults; },

    /**
     * Undefaults are properties that are set when objects are dissociated
     * @param {object|null} undefaults
     */
    setUndefaults: function(undefaults) {
        if (undefaults && typeof undefaults !== 'object') throw Error("`undefaults` must be an object");
        if (!undefaults) undefaults = null;
        var oldUndefaults = this._undefaults;
        if (oldUndefaults === undefaults) return;
        this._undefaults = undefaults;
        return true;
    },

    getUndefaults: function() { return this._undefaults; },

    getObservesItems: function() { return !!this._changeEvents; },

    setChangeEvents: function(changeEvents) {
        
        if (changeEvents) {
            if (!(changeEvents instanceof Array)) 
                changeEvents = [changeEvents];
            else if (!changeEvents.length) 
                changeEvents = null;
        } else {
            changeEvents = null;
        }
        
        var oldChangeEvents = this._changeEvents;
        
        if (oldChangeEvents === changeEvents) return;
        
        if (this._changeEvents && changeEvents
            && !Amm.Array.diff(changeEvents, this._changeEvents).length
            && !Amm.Array.diff(this._changeEvents, changeEvents).length
        ) return; // same events
        
        if (oldChangeEvents) { // unsubscribe from old events...
            for (var i = 0, l = this.length; i < l; i++) {
                this[i].unsubscribe(undefined, this._reportItemChangeEvent, this);
             }
        }
        
        if (changeEvents) { // ...and subscribe to the new!
            var l1 = changeEvents.length;
            for (var i = 0, l = this.length; i < l; i++) {
                for (var j = 0; j < l1; j++) {
                    this[i].subscribe(changeEvents[j], this._reportItemChangeEvent, this);
                }
            }
        }
        
        this._changeEvents = changeEvents;
        return true;
    },
    
    // to properly function, Amm.event.origin must be filled-in
    _reportItemChangeEvent: function() { 
        var item = Amm.event.origin;
        if (this._itemUpdateLevel) {
            if (Amm.Array.indexOf(item, this._itemUpdateQueue) < 0) {
                this._itemUpdateQueue.push(item);
            }
        } else {
            if (this._recheckUniqueness) this._performRecheckUniqueness(item);
            if (this._sorted) {
                this._checkItemPosition(item);
            }
            this.outItemChange(item);
        }
    },
    
    outItemChange: function(item) {
        return this._out('itemChange', item);
    },

    getChangeEvents: function() { return this._changeEvents; },

    setComparison: function(comparison) {
        if (this._comparison === comparison) return;
        // todo: check if uniqueness retained
        var tmp = this._custComparison;
        var tmp1 = this._comparison;
        this._custComparison = comparison;
        this._onlyStrict = !(this._keyProperty || this._comparisonProperties || comparison);
        if (!this._onlyStrict) {
            this._comparison = this._compareWithProps;
        } else {
            this._comparison = null;
        }
        try {
            this._custComparison = comparison;
            this._checkDuplicates("setComparison()", [], 0, 0, true, this._comparison);
        } catch (e) {
            this._custComparison = tmp;
            this._comparison = tmp1;
            throw e;
        }
        
        return true;
    },

    setComparisonProperties: function(comparisonProperties) {
        if (comparisonProperties) {
            if (!(comparisonProperties instanceof Array)) 
                comparisonProperties = [comparisonProperties];
            else if (!comparisonProperties.length) 
                comparisonProperties = null;
        } else {
            comparisonProperties = null;
        }
        var oldComparisonProperties = this._comparisonProperties;
        if (oldComparisonProperties === comparisonProperties) return;
        if (oldComparisonProperties && comparisonProperties 
            && oldComparisonProperties.length === comparisonProperties
            && !Amm.Array.equal (
                oldComparisonProperties, comparisonProperties
            ).length) return; // same content of arrays - order doesn't matter
        var tmp = this._comparisonProperties;
        var tmp1 = this._comparison;
        this._onlyStrict = !(this._keyProperty || comparisonProperties || this._custComparison);
        if (this._onlyStrict) {
            this._comparison = null;
        } else {
            this._comparison = this._compareWithProps;
        }
        try {
            this._comparisonProperties = comparisonProperties;
            this._checkDuplicates("setComparisonProperties()", [], 0, 0, true, this._comparison);
        } catch (e) {
            this._comparisonProperties = tmp;
            this._comparison = tmp1;
            throw e;
        }
        
        return true;
    },

    getComparisonProperties: function() { 
        if (!this._comparisonProperties) return [];
        return this._comparisonProperties; 
    },

    /**
     * @param {boolean} ignoreExactMatches
     * Whether to ignore attempts to add the same item twice without any warning
     */
    setIgnoreExactMatches: function(ignoreExactMatches) {
        var oldIgnoreExactMatches = this._ignoreExactMatches;
        if (oldIgnoreExactMatches === ignoreExactMatches) return;
        this._ignoreExactMatches = ignoreExactMatches;
        return true;
    },

    getIgnoreExactMatches: function() { return this._ignoreExactMatches; },
    
    setRecheckUniqueness: function(recheckUniqueness) {
        var oldRecheckUniqueness = this._recheckUniqueness;
        if (oldRecheckUniqueness === recheckUniqueness) return;
        this._recheckUniqueness = recheckUniqueness;
        return true;
    },

    getRecheckUniqueness: function() { return this._recheckUniqueness; },
    
    _implCompareWithProps: function(a, b) {
        var p, propA, propB;
        if (a === b) return 0; // exact match
        if (this._comparisonProperties) {
            for (var i = 0, l = this._comparisonProperties.length; i < l; i++) {
                p = this._comparisonProperties[i];
                propA = Amm.getProperty(a, p);
                propB = Amm.getProperty(b, p);
                if (propA !== propB) return -1;
            }
        }
        if (this._keyProperty) {
            propA = Amm.getProperty(a, this._keyProperty);
            if (typeof propA === 'object') throw this._keyPropertyError(a, propA);
            if (propA !== undefined && propA !== null) {
                propB = Amm.getProperty(b, this._keyProperty);
                if (propB !== undefined && propB !== null) {
                    if (typeof propB === 'object') throw this._keyPropertyError(b, propB);
                    if (('' + propA) !== ('' + propB)) return -1;
                }
            }
        }
        if (this._custComparison) return this._custComparison(a, b);
        return 0;
    },
    
    _keyPropertyError: function(object, value, keyProperty) {
        if (keyProperty === undefined) keyProperty = this._keyProperty;
        return new Error("Invalid value of keyProperty '" + this._keyProperty + "': object value isn't allowed");
    },

    setSortProperties: function(sortProperties) {
        if (sortProperties) {
            if (!(sortProperties instanceof Array)) 
                sortProperties = [sortProperties];
            else if (!sortProperties.length) 
                sortProperties = null;
        } else {
            sortProperties = null;
        }
        var oldSortProperties = this._sortProperties;
        if (oldSortProperties === sortProperties) return;
        if (oldSortProperties && sortProperties 
            && Amm.Array.equal(oldSortProperties, sortProperties))
            return; // same arrays
        this._sortProperties = sortProperties;
        this._sorted = !!(this._sortFn || this._sortProperties || this._sorter);
        this._checkIndexPropertyWatched();
        if (this._sorted) {
            this._sort();
        }
        return true;
    },

    getSortProperties: function() {
        if (!this._sortProperties) return [];
        return this._sortProperties; 
    },
    
    setSortReverse: function(sortReverse) {
        sortReverse = !!sortReverse;
        var oldSortReverse = this._sortReverse;
        if (oldSortReverse === sortReverse) return;
        this._sortReverse = sortReverse;
        if (this._sorted)
            this._sort();
        return true;
    },

    getSortReverse: function() { return this._sortReverse; },

    _implSortWithProps: function(a, b) {
        if (a === b) return 0; // exact match
        var r = this._sortReverse? -1 : 1;
        if (this._sortProperties) {
            for (var i = 0, l = this._sortProperties.length; i < l; i++) {
                var p = this._sortProperties[i];
                var pA = Amm.getProperty(a, p);
                var pB = Amm.getProperty(b, p);
                if (pA < pB) return -1*r;
                else if (pA > pB) return 1*r;
            }
        }
        if (this._sortFn) return this.sortFn(a, b)*r;
    },

    setSortFn: function(sortFn) {
        if (sortFn) {
            if (typeof sortFn !== 'function') throw Error("sortFn must be a function or a null");
        } else {
            sortFn = null;
        }
        var oldSortFn = this._sortFn;
        if (oldSortFn === sortFn) return;
        this._sortFn = sortFn;
        this._sorted = !!(this._sortFn || this._sortProperties || this._sorter);
        this._checkIndexPropertyWatched();
        if (this._sorted)
            this._sort();
        return true;
    },

    getSortFn: function() { return this._sortFn; },

    setSorter: function(sorter) {
        var isAggregate = false;
        if (sorter) {
            if (typeof sorter === 'object' && !sorter['Amm.Sorter']) {
                sorter = Amm.constructInstance(sorter, 'Amm.Sorter');
                isAggregate = true;
            }
        }  else {
            sorter = null;
        }                
        var oldSorter = this._sorter;
        if (oldSorter === sorter) return;
        if (this._sorter) { // delete old sorter
            if (this._sorterIsAggregate) this._sorter.cleanup();
            else this._subSorter(true);
        }
                
        this._sorterIsAggregate = isAggregate;
        this._sorter = sorter;
        
        if (this._sorter) {
            this._subSorter();
        }
        
        this._sorted = !!(this._sortFn || this._sortProperties || this._sorter);
        this._checkIndexPropertyWatched();
        if (this._sorted) {
            this._sort();
        }
        
        return true;
    },
    
    _subSorter: function(unsubscribe) {
        
        var m = unsubscribe? 'unsubscribe' : 'subscribe';
        this._sorter[m]('matchesChange', this._handleSorterNeedSort, this);
        this._sorter[m]('needSort', this._handleSorterNeedSort, this);
        this._sorter.setObservedObjects(unsubscribe? [] : this.getItems());
        
    },

    _handleSorterNeedSort: function() {
        if (this._lockSort) return;
        if (this._updateLevel) {
            this._needSort = true;
            return;
        }
        this._sort();
    },

    getSorter: function() { return this._sorter; },
    
    sort: function(fnOrProps) {
        this._needSort = false;
        if (fnOrProps instanceof Array) {
            var dummyObject = {
                _sortReverse: this._sortReverse,
                _sortWithProps: this._implSortWithProps,
                _sortProperties: fnOrProps,
                _sortFn: null
            };
            var dummyFn = function(a, b) {
                return dummyObject._sortWithProps(a, b);
            };
            var res = this.sort(dummyFn);
            return res;
        }

        if (this._sorter || this._sortFn) {
            if (fnOrProps) 
                throw Error("Cannot sort(fn) when `sortFn` or `sorter` is set; use sort() with no parameters");
            return this._sort();
        }
        if (this._sortProperties) {
            throw Error("Cannot sort() when `sortProperties` is set");
        }
        var changed = {}, old;
        if (this._indexProperty) old = this.getItems();
        var res;
        if (this._sorter) res = Amm.Array.prototype.sort.call(this, this._sorter.getCompareClosureFn(), changed);
        else res = Amm.Array.prototype.sort.call(this, fnOrProps, changed);
        if (this._indexProperty && changed.changed && old) this._reportIndexes(old);
        return res;
    },
    
    _doEndUpdate: function() {
        if (this._needSort) this._sort();
        if (this._indexProperty) this._reportIndexes(this._preUpdateItems);
        Amm.Array.prototype._doEndUpdate.call(this);
        if (this._byKeyChange) {
            this._byKeyChange = false;
            this.outByKeyChange();
        }
    },
    
    _reportIndexes: function(oldItems, start, stop) {
        this._suppressIndexEvents++;
        var l = stop || this.length, start = start || 0, e;
        try {
            for (var i = start; i < l; i++) {
                if (!oldItems || this[i] !== oldItems[i]) {
                    Amm.setProperty(this[i], this._indexProperty, i);
                }
            }
        } catch (e) {
            this._suppressIndexEvents--;
            throw e;
        }
        this._suppressIndexEvents--;
    },
    
    _sort: function() { // re-orders current array
        this._needSort = false;
        if (!(this._sortFn || this._sortProperties || this._sorter)) {
            throw Error("WTF - call to _sort() w/o _sorter, _sortFn or _sortProperties");
        }
        var changed = {}, old;
        if (this._indexProperty) old = this.getItems();
        Amm.Array.prototype.sort.call(this, this._sorter? this._sorter.getCompareClosureFn() : this._sortWithProps, changed);
        if (this._indexProperty && changed.changed && old) this._reportIndexes(old);
        return changed.changed;
    },
    
    // locates index of item to insert into sorted array using binary search
    _locateItemIndexInSortedArray: function(item) {
        if (!this.length) return 0;
        if (this._sorter) {
            this._lockSort++;
            this._sorter.observeObject(item);
            this._lockSort--;
        }
        var idx = Amm.Collection.binSearch(this, item, this._sorter? this._sorter.getCompareClosureFn() : this._sortWithProps);
        return idx[0];
    },
    
    // returns array of indexes of respective items
    // side effect: sorts the items!!!
    // res[i] = idxOfItems_i
    _locateManyItemIndexesInSortedArray: function(items) {
        
        var i, l = items.length, fn = this._sorter? this._sorter.getCompareClosureFn() : this._sortWithProps;
        
        if (this._sorter) {
            this._lockSort++;
            for (i = 0; i < l; i++) {
                this._sorter.observeObject(items[i]);
            }
            this._lockSort--;
        }
        
        items.sort(fn);
        var idx = 0, res = [];
        for (i = 0; i < l; i++) {
            
            // since items are sorted, we search location of next item 
            // starting from location of the last item
            idx = Amm.Collection.binSearch(this, items[i], fn, idx)[0];
            if (idx < 0) idx = 0;
            
            // we push idx + i since i items will be already added before
            // i-th item
            res.push(idx + i);
        }
        return res;
    },
    
    /**
     * @returns {Boolean} Whether we can update conflicting items 
     *      (if _updateProperties and/or _updateFn are set)
     */
    getAllowUpdate: function() { return this._allowUpdate; },

    setUpdateProperties: function(updateProperties) {
        if (updateProperties) {
            if (!(updateProperties instanceof Array)) 
                updateProperties = [updateProperties];
            else if (!updateProperties.length) 
                updateProperties = null;
        } else {
            updateProperties = null;
        }
        var oldUpdateProperties = this._updateProperties;
        if (oldUpdateProperties === updateProperties) return;
        this._updateProperties = updateProperties;
        this._allowUpdate = this._updateProperties || this._updateFn;
        return true;
    },

    getUpdateProperties: function() {
        if (!this._updateProperties) return [];
        return this._updateProperties; 
    },
    
    _updateItem: function(myItem, newItem) {
        this._beginItemsUpdate();
        try {
            if (this._updateProperties && myItem !== newItem) {
                for (var i = 0, l = this._updateProperties.length; i < l; i++) {
                    var p = this._updateProperties[i];
                    Amm.setProperty(myItem, p, Amm.getProperty(newItem, p));
                }
            }
            if (this._updateFn) this._updateFn(myItem, newItem);
            else {
                if (myItem === newItem) {
                    console.warn("updateFn not set; exactly matching items won't be update()'d)");
                }
            }
        } catch (e) {
            this._endItemsUpdate(); // handle with care
            throw e;
        }
        this._endItemsUpdate();
    },
    
    _beginItemsUpdate: function() {
        this._itemUpdateLevel++;
    },
    
    _endItemsUpdate: function() {
        this._itemUpdateLevel--;
        if (this._endItemsUpdateLock) return;
        this._endItemsUpdateLock = true;
        
        if (this._recheckUniqueness && this._itemUpdateQueue.length)
            this._performRecheckUniqueness(this._itemUpdateQueue, true);
        
        if (!this._itemUpdateLevel && this._itemUpdateQueue.length) {
            for (var i = 0; i < this._itemUpdateQueue.length; i++) {
                this.outItemChange(this._itemUpdateQueue[i]);
            }
            this._itemUpdateQueue = [];
        }
        this._endItemsUpdateLock = false;
        if (this._byKeyChange) {
            this._byKeyChange = false;
            this.outByKeyChange();
        }
        if (this._sorted) this._sort(); // re-sort items
    },
    
    // check item position in sorted array; updates it if needed
    _checkItemPosition: function(item, index) {
        if (index === undefined) {
            if (this._indexProperty) {
                // try to get index from an item
                index = Amm.getProperty(item, this._indexProperty);
                if (typeof index === 'number' && this[index] !== item)
                    index = this.strictIndexOf(item);
            } else {
                index = this.strictIndexOf(item);
            }
            if (index < 0) throw Error("WTF: `item` not found in this");
        }
        if (this[index] !== item) throw Error("WTF: this[`index`] !== `item`");
        var newIndex = undefined, sortError = false, low, high;

        // check left-side inversion
        if (index > 0 && this._sortWithProps(this[index - 1], item) > 0) { 
            var newPos = Amm.Collection.binSearch(this, item, this._sortWithProps, 0, index - 1);
            if (newPos[0] + 1 >= index) { // cannot find new position - need to sort whole collection
                sortError = true;
            } else {
                // move to the left
                newIndex = low = newPos[0] + 1;
                high = index;
            }
        }
        
        // check right-side inversion
        if (index < this.length - 1 && this._sortWithProps(item, this[index + 1]) > 0) {
            var newPos = Amm.Collection.binSearch(this, item, this._sortWithProps, index + 1, this.length - 1);
            if (newPos[0] + 1 <= index) { // cannot find new position - need to sort whole collection
                sortError = true;
            } else {
                // move to the left
                newIndex = high = newPos[0] + 1;
                low = index;
            }
        }
        if (sortError) this._sort();
        else if (newIndex !== undefined) {
            Amm.Array.prototype.moveItem.call(this, index, newIndex);
            if (high >= this.length) high = this.length - 1;
            if (this._indexProperty) this._reportIndexes(null, low, high);
        }
    },
    
    _performRecheckUniqueness: function(item, many) {
        if (!this._custComparison && !this._comparisonProperties) {
            console.warn("having setRecheckUniqueness(true) w/o prior setComparsion()" +
                " or setComparisonProperies() makes no sense - refusing to re-check");
            return;
        }
        var items;
        if (!many) items = [item];
            else items = item;
        // we will search for dupes' using indexOf
        for (var i = 0, l = items.length; i < l; i++) {
            var idx = -1, dp = [], ownIdx = null;
            do {
                idx = this.indexOf(items[i], idx + 1);
                if (idx >= 0) {
                    if (items[i] !== this[idx]) {
                        dp.push(idx);
                    } else {
                        ownIdx = idx;
                    }
                }
            } while(idx >= 0);
            if (ownIdx === null)
                console.warn("Item that was changed is no more in the collection");
            if (!dp.length) continue;
            // I don't know how under what circumstances this can happen
            if (!ownIdx && dp.length === 1) {
                console.warn("Item that was changed has a duplicate,"
                    + " but is no more in the collection."
                    + " Not throwing the exception since the collection"
                    + " is still unique.");
            } else {
                throw Error("After the change of this[" + ownIdx + "]," + 
                    " duplicate(s) appeared: this[" + dp.join("], this[") + ']');
            }
        }
    },

    // @param {function} updateFn - function(myUpdatedItem, externalItem)
    setUpdateFn: function(updateFn) {
        if (updateFn && typeof updateFn !== 'function') 
            throw Error("updateFn must be a function");
        var oldUpdateFn = this._updateFn;
        if (oldUpdateFn === updateFn) return;
        this._updateFn = updateFn;
        this._allowUpdate = this._updateProperties || this._updateFn;
        return true;
    },

    getUpdateFn: function() { return this._updateFn; },

    setCleanupOnDissociate: function(cleanupOnDissociate) {
        cleanupOnDissociate = !!cleanupOnDissociate;
        var oldCleanupOnDissociate = this._cleanupOnDissociate;
        if (oldCleanupOnDissociate === cleanupOnDissociate) return;
        this._cleanupOnDissociate = cleanupOnDissociate;
        return true;
    },

    getCleanupOnDissociate: function() { return this._cleanupOnDissociate; },

    setAllowAdd: function(allowAdd) {
        allowAdd = !!allowAdd;
        var oldAllowAdd = this._allowAdd;
        if (oldAllowAdd === allowAdd) return;
        this._allowAdd = allowAdd;
        return true;
    },

    getAllowAdd: function() { return this._allowAdd; },

    setAllowDelete: function(allowDelete) {
        allowDelete = !!allowDelete;
        var oldAllowDelete = this._allowDelete;
        if (oldAllowDelete === allowDelete) return;
        this._allowDelete = allowDelete;
        return true;
    },

    getAllowDelete: function() { return this._allowDelete; },

    setAllowChangeOrder: function(allowChangeOrder) {
        allowChangeOrder = !!allowChangeOrder;
        var oldAllowChangeOrder = this._allowChangeOrder;
        if (oldAllowChangeOrder === allowChangeOrder) return;
        this._allowChangeOrder = allowChangeOrder;
        return true;
    },

    getAllowChangeOrder: function() { return this._allowChangeOrder; },
    
    cleanup: function() {
        var tmp = this._allowDelete;
        if (!tmp) this.setAllowDelete(true);
        if (this._sorterIsAggregate) {
            this._sorter.cleanup();
            this._sorter = null;
        }
        Amm.Array.prototype.cleanup.call(this);
        if (!tmp) this.setAllowDelete(tmp);
    },
    
    setAssocEvents: function(assocEvents) {
        var assoc = null;
        if (assocEvents) {
            if (typeof assocEvents === 'object') {
                assoc = [];
                for (var i in assocEvents) if (assocEvents.hasOwnProperty(i)) {
                    assoc.push([i, assocEvents[i]]);
                }
            } else {
                throw Error("`assocEvents` must be an object");
            }
        }
        if (this._assocEvents && this.length) this._associateEvents(this, true);
        this._assocEvents = assoc;
        if (assocEvents) this._associateEvents(this);
        return true;
    },
    
    _associateEvents: function(items, dissoc) {
        if (!this._assocEvents) return;
        if (!items.length) return;
        var scope = this._assocInstance || this;
        var l1 = this._assocEvents.length;
        var action = dissoc? 'unsubscribe' : 'subscribe';
        for (var i = 0, l = items.length; i < l; i++) {
            for (var j = 0; j < l1; j++) {
                if (dissoc || items[i].hasEvent(this._assocEvents[j][0])) {
                    items[i][action](this._assocEvents[j][0], this._assocEvents[j][1], scope);
                }
            }
        }
    },
    
    getAssocEvents: function() { 
        if (!this._assocEvents) return {};
        var res = {};
        for (var i = 0, l = this._assocEvents.length; i < l; i++) {
            res[this._assocEvents[i][0]] = this._assocEvents[i][1];
        }
        return res;
    },

    /**
     * Allows to access objects of the Collection using value of their keyProperty.
     * 
     * Objects are allowed to have `null` or `undefined` value of keyProperty, in that case they won't be accessible
     * by keyProperty and such values won't be considering conflicting.
     * 
     * Comparison of keyProperty is non-strict; only scalar values are allowed (booleans, numbers, strings).
     * 
     * Attempt to insert object with object keyProperty will result in error.
     * Attempt to change keyProperty of object to already existing value will result in error, and value will be
     *      reverted back (if possible by setProperty).
     *      
     * Attempt to change keyProperty to value that will cause conflicts will trigger an error.
     * 
     * @param {string} keyProperty
     */
    setKeyProperty: function(keyProperty) {
        if (!keyProperty) keyProperty = null;
        var oldKeyProperty = this._keyProperty;
        if (oldKeyProperty === keyProperty) return;
        
        var tmp = this._keyProperty;
        var tmp1 = this._comparison;
        this._onlyStrict = !(keyProperty || this._comparisonProperties || this._custComparison);
        if (this._onlyStrict) {
            this._comparison = null;
        } else {
            this._comparison = this._compareWithProps;
        }
        try {
            this._keyProperty = keyProperty;
            this._checkDuplicates("setKeyProperty()", [], 0, 0, true, this._comparison);
        } catch (e) {
            this._keyProperty = tmp;
            this._comparison = tmp1;
            throw e;
        }
        if (oldKeyProperty) this._unobserveKeyProperty();
        this._keyProperty = keyProperty;
        this._observeKeyProperty();
        this._rebuildKeys();
        this.outKeyPropertyChange(keyProperty, oldKeyProperty);
        return true;
    },
    
    _unobserveKeyProperty: function() {
        var c = this._keyProperty + 'Change';
        for (var i = 0, l = this.length; i < l; i++) {
            this[i].unsubscribe(c, this._handleKeyChange, this);
        }
    },
    
    _observeKeyProperty: function() {
        var c = this._keyProperty + 'Change';
        for (var i = 0, l = this.length; i < l; i++) {
            this[i].subscribe(c, this._handleKeyChange, this);
        }
    },
    
    _lockKeyValueChange: false,

    _revertKeyValue: function(object, oldValue) {
        var tmp;
        tmp = this._lockKeyValueChange;
        this._lockKeyValueChange = object;
        try { 
            Amm.setProperty(object, this._keyProperty, oldValue);
        } catch (e) {
            this._lockKeyValueChange = tmp;
            throw e;
        }
        this._lockKeyValueChange = tmp;
    },
    
    _handleKeyChange: function(value, oldValue) {
        var object = Amm.event.origin, needTrigger;
        if (this._lockKeyValueChange && this._lockKeyValueChange === object) return;
        if (typeof value === 'object') {
            this._revertKeyValue(object, oldValue);
            throw this._keyPropertyError(object, value);
        }
        if (value !== null && value !== undefined) {
            if (this.k[value] && this.k[value] !== object) {
                this._revertKeyValue(object, oldValue);
                throw Error("Duplicate value of keyProperty '" + this._keyProperty + "': object with key '"
                    + value + "' already exists in the collection");
            }
            this.k[value] = object;
        }
        if (oldValue !== undefined && oldValue !== null) {
            if (this.k[oldValue] !== object) {
                this._rebuildKeys();
                return;
            } else {
                delete this.k[oldValue];
            }
        }
        this.outByKeyChange();
    },
    
    _rebuildKeys: function() {
        this.k = {};
        for (var i = 0, l = this.length; i < l; i++) {
            var key = Amm.getProperty(this[i], this._keyProperty);
            if (key === null || key === undefined) continue;
            if (typeof key === 'object') throw this._keyPropertyError(this[i], key);
            this.k[key] = this[i];
        }
        this.outByKeyChange();
    },

    getKeyProperty: function() { return this._keyProperty; },

    outKeyPropertyChange: function(keyProperty, oldKeyProperty) {
        this._out('keyPropertyChange', keyProperty, oldKeyProperty);
    },
    
    getByKey: function(key) {
        return this.k[key];
    },
    
    setByKey: function(key) {
        console.warn('byKey is read-only property');
    },
    
    outByKeyChange: function() {
        if (this._updateLevel || this._itemUpdateLevel || this._byKeyChange) {
            this._byKeyChange = true;
            return;
        }
        this._out('byKeyChange');
    }
    
};

Amm.extend(Amm.Collection, Amm.Array);
/* global Amm */
Amm.Selection = function(options) {
    Amm.Collection.call(this, options);
};

Amm.Selection.ERR_NOT_IN_OBSERVED_COLLECTION = "Not in observed collection.";

Amm.Selection.prototype = {
    
    "Amm.Selection": "__CLASS__",
    
    _multiple: true,

    _valueProperty: null,

    _selectedProperty: null,

    _sameOrder: false,

    _collection: null,
    
    _unselectOnItemValueChange: false,
    
    _cacheValue: true,

    _value: undefined,
    
    _suppressValueChangeEvent: 0,
    
    _selfSubscribed: false,

    /**
     * @param {Amm.Collection|null} collection Observed collection (one whose items may be selected or not)
     * Changing the `collection` will reset the selection content.
     */
    setCollection: function(collection) {
        var oldCollection = this._collection;
        var items;
        if (oldCollection === collection) return;
        if (oldCollection) {
            this._unobserveCollection();
        }
        this._collection = collection;
        if (this._selectedProperty) {
            items = this._findSelectedItems();
        } else {
            items = [];
        }
        if (!this._multiple) items.splice(1, items.length);
        this.setItems(items); // clear the value
        this.outCollectionChange(collection, oldCollection); 
        if (collection) {
            this._observeCollection();
        }
        return true;
    },
    
    getCollection: function() { return this._collection; },
    
    outCollectionChange: function(collection, oldCollection) {
        this._out('collectionChange', collection, oldCollection);
    },
    
    /**
     * Whether selection may have several elements
     * @param {bool} multiple
     * @returns {Boolean|undefined}
     */
    setMultiple: function(multiple) {
        multiple = !!multiple;
        var oldMultiple = this._multiple;
        if (oldMultiple === multiple) return;
        var old = this._value === undefined? this.getValue(true) : this._value;
        this._multiple = multiple;
        if (!multiple && this.length > 1) {
            this._suppressValueChangeEvent++;
            // reject all non-needed items
            this.splice(1, this.length - 1);
            this._suppressValueChangeEvent--;
        }
        var v = this.getValue(true);
        if (this._valueProperty) this._value = v;
        if (this._subscribers.valueChange) {
            this.outValueChange(v, old);
        }
        this.outMultipleChange(multiple, oldMultiple);
        return true;
    },

    getMultiple: function() { return this._multiple; },

    outMultipleChange: function(multiple, oldMultiple) {
        this._out('multipleChange', multiple, oldMultiple);
    },

    /**
     * Value can be A - object or array of objects (if !`multipleSelection`, first item will be used)
     * or B - value of item[`valueProperty`] or several such values, if `valueProperty` is set.
     * Example: 
     * 
     *      var foo = {label: 'Foo', value: 1};
     *      var bar = {label: 'Bar', value: 2};
     *      collection.setItems([foo, bar]);
     *      selection.setCollection(collection);
     *      selection.setValueProperty(null); // use objects
     *      selection.setValue([foo]); // selects only foo object
     *      selection.setValueProperty('value');
     *      > (selection.getValue()); // [1]
     *      selection.setValue([1, 2]);
     *      > (selection.getItems()); // will return [foo, bar]
     *      selection.setMultiple(false);
     *      > (selection.getValue()); // 1 - not an array (since not multiple)
     *      > (selection.getItems()); // [foo] - only first object remains selected
     *      selection.setValue([foo, bar]); // remember we still have valueProperty set?
     *      > (selection.getValue()); // undefined - we have no value
     * 
     * @param {mixed} value
     * @returns {undefined}
     */
    setValue: function(value) {
        this.beginUpdate();
        var empty;
        if (value === undefined || value === null) {
            empty = true;
            if (this._multiple) value = [];
        } else {
            if ((value instanceof Array || value['Amm.Array'])) {
                if (this._findItemsWithValue([value]).length) {
                    value = [value];
                } else {
                    empty = !value.length;
                }
            } else {
                value = [value];
            }
        }
        var items;
        if (empty) items = [];
        else items = this._findItemsWithValue(value);
        this.setItems(items);        
        this.endUpdate();
    },
    
    getValue: function(recalc) { 
        if (!this.length) return this._multiple? [] : null;
        var res;
        if (!this._valueProperty) {
            res = this.getItems();
            if (!this._multiple) {
                res = res[0];
            }
        } else {
            if (!this._cacheValue || recalc || this._value === undefined) {
                res = this._value = this._collectValueProperty(this, true);
            } else {
                res = this._value;
            }
        }
        return res;
    },

    outValueChange: function(value, oldValue) {
        if (this._suppressValueChangeEvent || this._updateLevel) return;
        this._out('valueChange', value, oldValue);
    },

    setValueProperty: function(valueProperty) {
        var oldValueProperty = this._valueProperty;
        if (oldValueProperty === valueProperty) return;
        if (this._collection && oldValueProperty) this._unsubscribeCollectionItems(this._collection, false, true);
        this._valueProperty = valueProperty;
        this.clearItems(); // TODO: think a bit on this
        if (!this._valueProperty) this._value = undefined;
        if (this._collection && valueProperty) this._subscribeCollectionItems(this._collection, false, true);
        return true;
    },

    getValueProperty: function() { return this._valueProperty; },

    /**
     * Whether to cache value or not. Is used only when valueProperty is set. 
     * Defaults to TRUE. Should be set to FALSE when objects with non-observable valueProperty
     * are used.
     * 
     * @param {boolean} cacheValue
     * @returns {undefined|Boolean}
     */
    setCacheValue: function(cacheValue) {
        cacheValue = !!cacheValue;
        var oldCacheValue = this._cacheValue;
        if (oldCacheValue === cacheValue) return;
        this._cacheValue = cacheValue;
        return true;
    },

    getCacheValue: function() { return this._cacheValue; },

    /**
     * When selected objects' valueProperty changes, it will be removed from Selection
     * (default behavior will trigger valueChange event that will have old valueProperty' value 
     * replaced with new one)
     * 
     * @param {type} unselectOnItemValueChange
     * @returns {undefined|Boolean}
     */
    setUnselectOnItemValueChange: function(unselectOnItemValueChange) {
        var oldUnselectOnItemValueChange = this._unselectOnItemValueChange;
        if (oldUnselectOnItemValueChange === unselectOnItemValueChange) return;
        this._unselectOnItemValueChange = unselectOnItemValueChange;
        return true;
    },

    getUnselectOnItemValueChange: function() { return this._unselectOnItemValueChange; },

    setSelectedProperty: function(selectedProperty) {
        var oldSelectedProperty = this._selectedProperty;
        if (oldSelectedProperty === selectedProperty) return;
        if (oldSelectedProperty && this._collection)
            this._unsubscribeCollectionItems(this._collection, true);
        this._selectedProperty = selectedProperty;
        if (selectedProperty && this._collection) {
            // only use new property values if we have no items
            if (!this.length) this.setItems(this._findSelectedItems());
            else this._setItemsSelectedProperty();
            
            this._subscribeCollectionItems(this._collection, true);
        }
        return true;
    },

    getSelectedProperty: function() { return this._selectedProperty; },

    /**
     * @param {boolean} sameOrder Whether objects in Selection must have exactly the same order 
     * as the objects in `collection`
     */
    setSameOrder: function(sameOrder) {
        sameOrder = !!sameOrder;
        var oldSameOrder = this._sameOrder;
        if (oldSameOrder === sameOrder) return;
        this._sameOrder = sameOrder;
        if (this._sameOrder) {
            this.setSortProperties(null);
            this.setSortFn(null);
            if (this._collection) {
                this._collection.subscribe('reorderItems', this._handleCollectionReorderItems, this);
                this._maintainOrder();
            }
        } else {
            if (this._collection) {
                this._collection.unsubscribe('reorderItems', this._handleCollectionReorderItems, this);
            }
        }
        return true;
    },

    getSameOrder: function() { return this._sameOrder; },
    
    sort: function(fnOrProps) {
        if (this._sameOrder) Error("Refusing to sort() when `sameOrder` === true");
        return Amm.Collection.prototype.sort.call(this, fnOrProps);
    },

    _collectValueProperty: function(what, deCardinalify, ignoreItem) {
        what = what || this;
        var res = [], l = what.length;
        for (var i = 0; i < l; i++) {
            var item = what[i];
            if (item !== ignoreItem) {
                var v = Amm.getProperty(item, this._valueProperty);
                if (v !== undefined && v !== null) res.push(v);
            }
        }
        if (deCardinalify && !this._multiple) res = res.length? res[0] : null;
        return res;
    },
    
    _findItemsWithValue: function(value) {
        if (!this._multiple && !(value instanceof Array)) {
            if (value === undefined || value === null) value = [];
                else value = [value];
        }
        if (!this._collection || !value.length) return [];
        if (!this._valueProperty) return this._collection.intersect(value, true);
        var res = [];
        for (var i = 0, l = this._collection.length; i < l; i++) {
            var item = this._collection[i], v = Amm.getProperty(item, this._valueProperty);
            if (Amm.Array.indexOf(v, value) >= 0) res.push(item);
        }
        return res;
    },
    
    _findSelectedItems: function() {
        if (!this._collection) return [];
        var res = [];
        for (var i = 0, l = this._collection.length; i < l; i++) {
            var item = this._collection[i], v = Amm.getProperty(item, this._selectedProperty);
            if (v) res.push(item);
        }
        return res;
    },
    
    _setItemsSelectedProperty: function() {
        // sub-optimal
        for (var i = 0, l = this._collection.length; i < l; i++) {
            Amm.setProperty(this._collection[i], this._selectedProperty, this.hasItem(this._collection[i]));
        }
    },

    _handleCollectionSpliceItems: function(index, cutItems, insertItems) {
        // exclude duplicates from both sets - we are interested 
        // in real cut/insert items only
        var cut = Amm.Array.symmetricDiff(cutItems, insertItems);
        var insert = Amm.Array.symmetricDiff(insertItems, cutItems);
        
        this._unsubscribeCollectionItems(cut);
        this._subscribeCollectionItems(insert);
        
        var toRemove = this.intersect(cut, true);
        
        var toAdd = Amm.Array.diff(insert, this);
        
        if (!toAdd.length && !toRemove.length) return; // nothing to do
        
        var canAdd = toAdd.length && (
            this._selectedProperty 
            || 
            // if not multiple we can't have more than one object anyway
            this._valueProperty && this.length && this._multiple 
        );
        
        this.beginUpdate();
        
        // remove old items from selection
        for (var i = 0, l = toRemove.length; i < l; i++)
            this.reject(toRemove[i], false);
        
        // check if new items have a - selectedProperty or b - matching valueProperty
        
        if (canAdd) {
            var willAdd = [];
            var v = this._valueProperty? this.getValue() : null;
            // check items that we should add
            for (var i = 0, l = toAdd.length; i < l; i++) {
                var o = toAdd[i];
                if (this._selectedProperty && Amm.getProperty(o, this._selectedProperty)) willAdd.push(o);
                else if (this._valueProperty && v && Amm.Array.indexOf(Amm.getProperty(o, this._valueProperty), v) >= 0)
                    willAdd.push(o);
            }
            if (willAdd.length) {
                this.acceptMany(willAdd);
                if (this._sameOrder) this._maintainOrder(true);
            }
        }
        
        this.endUpdate();
    },
    
    _handleCollectionReorderItems: function(index, length, oldOrder) {
        if (!this.length) return; // don't care
        
        // check if some of our items have indexes' changed
        var items = this.getItems();
        var d = Amm.Array.findDuplicates(
            items.concat(this._collection.slice(index, index+length)),
            true,
            undefined,
            this.length
        );
        
        if (d.length) { // some are affected - rebuild
            this._maintainOrder();
        }
    },
    
    _maintainOrder: function(dontTrigger) {
        if (!this._sameOrder || !this.length) return; // don't care
        
        var items = this.getItems(), newOrder = this._collection.intersect(items, true);
        // check if arrays are same
        var iMin = null, iMax = null;
        if (items.length !== newOrder.length) {
            console.warn("We have problem: it turned some elements disappeared from `collection` when only order might change");
            this.setItems(newOrder);
            return;
        }
        for (var i = 0, l = items.length; i < l; i++) {
            if (items[i] !== newOrder[i]) {
                if (iMin === null) iMin = i;
                iMax = i;
                this[i] = newOrder[i];
            }
        }
        if (iMin !== null && !dontTrigger) { // something was changed
            if (this._indexProperty) this._reportIndexes(items, iMin, iMax + 1);
            if (!this._updateLevel) 
                this.outReorderItems(iMin, iMax - iMin + 1, items.slice(iMin, iMax + 1));
        }
    },
    
    _observeCollection: function() {
        this._collection.subscribe('spliceItems', this._handleCollectionSpliceItems, this);
        if (this._sameOrder) this._collection.subscribe('reorderItems', this._handleCollectionReorderItems, this);
        this._subscribeCollectionItems(this._collection);
    },
    
    _unobserveCollection: function() {
        this._collection.unsubscribe('spliceItems', this._handleCollectionSpliceItems, this);
        if (this._sameOrder) this._collection.unsubscribe('reorderItems', this._handleCollectionReorderItems, this);
        this._unsubscribeCollectionItems(this._collection);
    },
    
    _subscribeCollectionItems: function(items, skipValueProperty, skipSelectedProperty, unsubscribe) {
        if (!this._valueProperty) skipValueProperty = true;
        var ve, se, m;
        m = unsubscribe? 'unsubscribe' : 'subscribe';
        if (!this._selectedProperty) skipSelectedProperty = true;
        if (skipValueProperty && skipSelectedProperty) return;
        if (!skipValueProperty) ve = this._valueProperty + 'Change';
        if (!skipSelectedProperty) se = this._selectedProperty + 'Change';
        for (var i = 0, l = items.length; i < l; i++) {
            var item = items[i];
            if (!item[m]) continue;
            if (unsubscribe || item.hasEvent) {
                if (ve && (unsubscribe || item.hasEvent(ve))) {
                    item[m](ve, this._handleItemValuePropertyChange, this);
                }
                if (se && (unsubscribe || item.hasEvent(se))) item[m](se, this._handleItemSelectedPropertyChange, this);
            }
        }
    },
    
    canAccept: function(item, checkRequirementsOnly, problem) {
        problem = problem || {};
        if (!this._collection || !this._collection.hasItem(item)) {
            problem.error = Amm.Selection.ERR_NOT_IN_OBSERVED_COLLECTION;
            return false;
        }
        return Amm.Collection.prototype.canAccept.call(this, item, checkRequirementsOnly, problem);
    },
    
    _unsubscribeCollectionItems: function(items, skipValueProperty, skipSelectedProperty) {
        return this._subscribeCollectionItems(items, skipValueProperty, skipSelectedProperty, true);
    },
    
    _handleItemValuePropertyChange: function(value, oldValue) {
        var item = Amm.event.origin;
        var hasItem = this.hasItem(item);
        var o = this._value;
        var hasValue = Amm.Array.indexOf(value, this._collectValueProperty(this, false, item)) >= 0;
        if (hasValue && !hasItem) {
            this.accept(item);
        } else if (!hasValue && hasItem) {
            if (this._unselectOnItemValueChange) {
                this.reject(item);
            }
            else {
                this._value = this._collectValueProperty(this, true);
                if (this._valueProperty && this._subscribers.valueChange) {
                    this.outValueChange(this._value, o);
                }
            }
        }
    },
    
    _handleItemSelectedPropertyChange: function(value, oldValue) {
        this.beginUpdate();
        var item = Amm.event.origin;
        var hasItem = this.hasItem(item);
        if (hasItem && !value) {
            this.reject(item);
            this.endUpdate();
            return;
        }
        else if (!hasItem && value) {
            if (this._multiple)
                this.accept(item);
            else
                this.setItems([item]);
        }
        this.endUpdate();
    },
    
    _subscribeFirst_valueChange: function() {
        // need to cache this
        if (this._valueProperty) this._value = this._collectValueProperty(this.getItems(), true);
        this._selfSubscribed = true;
        this.subscribe('itemsChange', this._handleSelfItemsChange, this);
    },
    
    _unsubscribeLast_valueChange: function() {
        this._selfSubscribed = false;
        this.unsubscribe('itemsChange', this._handleSelfItemsChange, this);
    },
    
    _handleSelfItemsChange: function(items, oldItems) {
        var o, n;
        if (!this._valueProperty) {
            if (this._multiple) {
                n = items;
                o = oldItems;
            } else {
                o = oldItems[0] || null;
                n = items[0] || null;
            }
        } else {
            if (this._value !== undefined) {
                o = this._value;
            } else {
                o = this._collectValueProperty(oldItems, true);
            }
            this._value = n = this._collectValueProperty(items, true);
        }
        this.outValueChange(n, o);
    },
    
    _associate: function(item, index, alsoSubscribe) {
        var res;
        res = Amm.Collection.prototype._associate.call(this, item, index, alsoSubscribe);
        if (!this._selfSubscribed) this._value = undefined;
        if (this._selectedProperty) {
            Amm.setProperty(item, this._selectedProperty, true);
        }
        return res;
    },
    
    _dissociate: function(item) {
        var res;
        res = Amm.Collection.prototype._dissociate.call(this, item);
        if (!this._selfSubscribed) this._value = undefined;
        if (this._selectedProperty) {
            Amm.setProperty(item, this._selectedProperty, false);
        }
        return res;
    },
    
    _oldValue: null,
    
    _doBeginUpdate: function() {
        Amm.Collection.prototype._doBeginUpdate.call(this);
        this._oldValue = this.getValue();
        if (this._oldValue instanceof Array) this._oldValue = [].concat(this._oldValue);
    },
    
    _doEndUpdate: function() {
        this._suppressValueChangeEvent++;
        Amm.Collection.prototype._doEndUpdate.call(this);
        this._suppressValueChangeEvent--;
        if (this._updateLevel) return;
        var newValue = this.getValue(), oldValue = this._oldValue;
        if (newValue instanceof Array && oldValue instanceof Array && Amm.Array.equal(newValue, oldValue)) return;
        if (newValue === oldValue) return;
        this.outValueChange(newValue, oldValue);
    },    
    
};

Amm.extend(Amm.Selection, Amm.Collection);
/* global Amm */

Amm.Remote = {
};/* global Amm */

Amm.Decorator = function(options) {
    if (options && this['Amm.Decorator'] === '__CLASS__' && options.decorate && typeof options.decorate === 'function') {
        this.decorate = options.decorate;
        delete options.decorate;
    }
    Amm.init(this, options);
};

Amm.Decorator.construct = function(proto, defaults, setToDefaults, requirements) {
    if (typeof proto === 'function') {
        proto = {decorate: proto};
    }
    return Amm.constructInstance(proto, 'Amm.Decorator', defaults, setToDefaults, requirements);
};

Amm.Decorator.prototype = {
  
    'Amm.Decorator': '__CLASS__',
    
    decorate: function(value) {
        return value;
    }
    
};

Amm.Decorator.cr = function(proto) {
    if (proto && proto['Amm.Decorator']) return proto;
    return Amm.Decorator.construct(proto);
};

/**
 * Shortcut for both lazy-instantiation and applying decorator
 * 
 * Takes decorator OR decorator prototype from owner[prop].
 * If needed, instantiates it and sets owner[prop] to created instance.
 * Applies the decorator to value and returns the result.
 * 
 * @param {mixed} value Value to decorate
 * @param {type} owner Owner object that has decorator or decorator prototype (defaults to 'this')
 * @param {type} prop Property of owner object that contains decorator or decorator prototype (defaults to 'decorator')
 * @returns {mixed} Decorated value
 */

Amm.Decorator.d = function(value, owner, prop) {
    if (!prop) prop = 'decorator';
    if (!owner) owner = this;
    var d = owner[prop];
    if (!d) return value;
    if (!d['Amm.Decorator']) d = owner[prop] = Amm.Decorator.construct(d);
    return d.decorate(value);
};/* global Amm */

Amm.Translator = function(options) {
    Amm.init(this, options);
};

Amm.Translator.prototype = {
  
    'Amm.Translator': '__CLASS__',
    
    lastError: null,
    
    errInValue: null,
    
    errOutValue: null,
    
    reverseMode: null, // swaps translateIn and translateOut
    
    field: undefined,
    
    trimInStrings: false,
    
    decorateBeforeValidate: false,
            
    _inDecorator: null,

    _outDecorator: null,
    
    _inValidator: null,

    _outValidator: null,
    
    _implTranslate: function(value, def, fn, error, inMode, validator, decorator) {
        this.lastError = null;
        if (!(error && typeof error === 'object')) error = {};
        error.error = null;
        var res;
        if (inMode) {
            if (this.trimInStrings && typeof value === 'string') {
                value = Amm.Util.trim(value);
            }
        }
        if (decorator && this.decorateBeforeValidate) {
            try {
                value = decorator.decorate(value);
            } catch (e) {
                error.error = this.lastError = e;
                return def;
            }
        }
        
        if (validator) {
            this.lastError = validator.getError(value, this.field);
            if (this.lastError) {
                error.error = this.lastError;
                return def;
            }
        }
        
        if (decorator && !this.decorateBeforeValidate) {
            try {
                value = decorator.decorate(value);
            } catch (e) {
                error.error = this.lastError = e;
                return def;
            }
        }
        try {
            res = this[fn](value);
        } catch (e) {
            this.lastError = e;
        }
        if (this.lastError) {
            res = def;
        }
        error.error = this.lastError;
        return res;
    },
    
    decorate: function(value) {
        return this.translateIn(value);
    },
    
    translateIn: function(externalValue, error) {
        if (this.reverseMode) {
            return this._implTranslate(externalValue, this.errOutValue, '_doTranslateOut', error, false,
                this._outValidator, this._outDecorator
            );
        }
        return this._implTranslate(externalValue, this.errInValue, '_doTranslateIn', error, true, 
            this._inValidator, this._inDecorator);
    },
    
    translateOut: function(internalValue, error) {
        if (this.reverseMode) {
            return this._implTranslate(internalValue, this.errInValue, '_doTranslateIn', error, false,
                this._inValidator, this._inDecorator
            );
        }
        return this._implTranslate(internalValue, this.errOutValue, '_doTranslateOut', error, false,
            this._outValidator, this._outDecorator
        );
    },
    
    _doTranslateIn: function(value) {
        return value;
    },
    
    _doTranslateOut: function(value) {
        return value;
    },
    
    setInDecorator: function(inDecorator) {
        var oldInDecorator = this._inDecorator;
        if (oldInDecorator === inDecorator) return;
        if (inDecorator) inDecorator = Amm.Decorator.construct(inDecorator, 'Amm.Decorator');
        this._inDecorator = inDecorator;
        return true;
    },

    getInDecorator: function() { return this._inDecorator; },

    setOutDecorator: function(outDecorator) {
        var oldOutDecorator = this._outDecorator;
        if (oldOutDecorator === outDecorator) return;
        if (outDecorator) outDecorator = Amm.Decorator.construct(outDecorator, 'Amm.Decorator');
        this._outDecorator = outDecorator;
        return true;
    },

    getOutDecorator: function() { return this._outDecorator; },

    setInValidator: function(inValidator) {
        var oldInValidator = this._inValidator;
        if (oldInValidator === inValidator) return;
        if (inValidator) inValidator = Amm.Validator.construct(inValidator);
        this._inValidator = inValidator;
        return true;
    },

    getInValidator: function() { return this._inValidator; },

    setOutValidator: function(outValidator) {
        var oldOutValidator = this._outValidator;
        if (oldOutValidator === outValidator) return;
        if (outValidator) outValidator = Amm.Validator.construct(outValidator);
        this._outValidator = outValidator;
        return true;
    },

    getOutValidator: function() { return this._outValidator; }
    
};

Amm.extend(Amm.Translator, Amm.Decorator);/* global Amm */

Amm.Translator.Bool = function(options) {
    Amm.Translator.call(this, options);
};

Amm.Translator.Bool.prototype = {

    'Amm.Translator.Bool': '__CLASS__', 

    trueValue: 'lang.Amm.True',

    falseValue: 'lang.Amm.False',

    errorMsg: 'lang.Amm.Translator.Bool.msg',

    caseSensitive: false,

    trimInStrings: true, // will trim the IN value

    guess: true, // will try to convert '0' or FALSEable value to FALSE, other to TRUE

    defaultValue: false, // if undefined, will set error. Not used if `guess` is true
        
    setStrictMode: function(strictMode) {
        if (strictMode) {
            this.caseSensitive = true;
            this.trimInStrings = false;
            this.defaultValue = undefined;
            this.guess = false;
        } else {
            this.caseSensitive = false;
            this.trimInStrings = true;
            this.defaultValue = false;
            this.guess = true;            
        }
    },
    
    getStrictMode: function() {
        if (this.caseSensitive && !this.trimInStrings && this.defaultValue === undefined && !this.guess) {
            return true;
        } else if (!this.caseSensitive && this.trimInStrings && this.defaultValue !== undefined && this.guess) {
            return false;
        }
        return undefined;
    },

    _doTranslateOut: function(value) {
        return Amm.translate(value? this.trueValue : this.falseValue);
    },

    _doTranslateIn: function(value) {
        var res;
        if (this._cmp(value, Amm.translate(this.trueValue))) res = true;
        else if (this._cmp(value, Amm.translate(this.falseValue))) res = false;
        else if (this.guess) {
            if (value === '0') res = false;
            else res = !!value;
        }
        else if (this.defaultValue !== undefined) res = this.defaultValue;
        else this.lastError = Amm.translate(this.errorMsg, '%value', value);
        return res;
    },

    _cmp: function (inValue, canonValue) {
        if (!this.caseSensitive) {
            inValue = ('' + inValue).toLowerCase();
            canonValue = ('' + canonValue).toLowerCase();
        }
        return inValue === canonValue;
    },

};

Amm.extend(Amm.Translator.Bool, Amm.Translator);

Amm.defineLangStrings({
    'lang.Amm.True': 'True',
    'lang.Amm.False': 'False',
    'lang.Amm.Translator.Bool.msg': '\'%value\' isn\'t allowed Boolean value'
});
/* global Amm */

Amm.Translator.RequiredMark = function(options) {
    Amm.Translator.Bool.call(this, options);
};

Amm.Translator.RequiredMark.prototype = {

    'Amm.Translator.RequiredMark': '__CLASS__', 
    
    trueValue: '<span class="required">*</span>',

    falseValue: ''

};

Amm.extend(Amm.Translator.RequiredMark, Amm.Translator.Bool);
/* global Amm */

Amm.Translator.List = function(options) {
    Amm.Translator.call(this, options);
};

/**
 * Converts Arrays (or Amm.Arrays) into HTML elements, typically lists.
 * 
 * Is defined by two parts:
 * -    enclouse HTML element, which will include list item elements;
 * -    list item element, which will include item content.
 * 
 * Expects array items to be strings.
 * To parse back, ignores enclosure element and tries to construct jQuery selector from definition of item element,
 * with degree of copying tag name, class and id. itemSelector may be used to supply jQuery selector that will extract
 * item elements.
 * 
 * If allowHTML is false, will escape list items using .text(value) 
 * or return .text() of elements when parsing back.
 * 
 * translateOut() may accept DOMElements as well as jQuery result as well as string.
 * If string is provided, will convert it into DOMElements using jQuery(string).
 * 
 * FALSEable in-values are interpreted as empty arrays.
 */

Amm.Translator.List.prototype = {

    'Amm.Translator.List': '__CLASS__', 

    _enclosureElement: '<ul></ul>',
    
    _itemElement: '<li></li>',
    
    emptyOutValue: null,

    itemSelector: null,
    
    _cachedItemSelector: null,
    
    allowHTML: true,
    
    // FALSEable in values are treated as empty arrays; strings are treated as 1-element arrays
    strict: false,
    
    msgInvalidInValueStrict: 'Amm.Translator.List.msgInvalidInValueStrict',
    
    msgInvalidInValueNonStrict: 'Amm.Translator.List.msgInvalidInValueNonStrict',
    
    msgInvalidOutValue: 'Amm.Translator.List.msgInvalidOutValue',
    
    // Whether to cache last in-out pair; if it is the same, pass last result. 
    // Compared using ===, including the arrays
    _cacheValues: null,
    
    _lastInValue: null,
    
    _lastOutValue: null,

    setCacheValues: function(cacheValues) {
        var oldCacheValues = this._cacheValues;
        if (oldCacheValues === cacheValues) return;
        this._cacheValues = cacheValues;
        return true;
    },

    getCacheValues: function() { return this._cacheValues; },

    setItemElement: function(itemElement) {
        var oldItemElement = this._itemElement;
        if (oldItemElement === itemElement) return;
        if (!itemElement) Error("itemElement is required");
        if (typeof itemElement !== "string") Error("itemElement must be a string");
        if (!itemElement.match(/^<.*>$/)) Error("itemElement must be a jQuery-compatible HTML element definition");
        this._itemElement = itemElement;
        this._cachedItemSelector = null;
        return true;
    },

    getItemElement: function() { return this._itemElement; },
    
    setEnclosureElement: function(enclosureElement) {
        var oldEnclosureElement = this._enclosureElement;
        if (oldEnclosureElement === enclosureElement) return;
        if (enclosureElement) {
            if (typeof enclosureElement !== "string") Error("enclosureElement must be a string");
            if (!enclosureElement.match(/^<.*>$/)) Error("enclosureElement must be a jQuery-compatible HTML element definition");
        } else {
            enclosureElement = '';
        }
        this._enclosureElement = enclosureElement;
        return true;
    },

    getEnclosureElement: function() { return this._enclosureElement; },
    
    _doTranslateOut: function(value) {
        if (!this.strict) {
            if (!value) value = [];
            else if (typeof value === 'string') value = [value];
        }
        if (!(value instanceof Array || value['Amm.Array'])) {
            var msg = this.strict? this.msgInvalidInValueStrict: this.msgInvalidInValueNonStrict;
            this.lastError = Amm._msg(msg, '%type', Amm.describeType(value));
            return;
        }
        if (!value.length && this.emptyOutValue !== null) return this.emptyOutValue;
        var innerItems = [];
        if (!this._itemElement) throw Error("itemElement not set");
        var res = '', e;
        for (var i = 0, l = value.length; i < l; i++) {
            var e = jQuery(this._itemElement);
            if (this.allowHTML) e.html(value[i]);
            else e.text(value[i]);
            if (!this._enclosureElement) res += e[0].outerHTML;
                else innerItems.push(e);
        }
        if (e && e[0] && !this._cachedItemSelector && !this.itemSelector) {        
            this._extractItemSelector(e[0]);
        }
        if (this._enclosureElement) return jQuery(this._enclosureElement).append(innerItems)[0].outerHTML;
        else return res;
    },
    
    _doTranslateIn: function(value) {
        if (value === this.emptyOutValue) return [];
        if (!value) return []; // empty string or FALSEable value corresponds to empty array
        if (!(value && (value.jquery || value.nodeName || typeof value === 'string'))) {
            this.lastError = Amm._msg(this.msgInvalidOutValue, '%type', Amm.describeType(value));
        }
        var sel = this.itemSelector || this._cachedItemSelector;
        if (!sel) {
            var e = jQuery(this._itemElement);
            sel = this._extractItemSelector(e[0]);
        }
        var res = [], h = this.allowHTML;
        var jq = jQuery(value).find(sel).addBack(sel).each(function(i, e) {
            res.push(h? jQuery(e).html() : jQuery(e).text());
        });
        return res;
    },
    
    _extractItemSelector: function(e) {
        var v;
        this._cachedItemSelector = e.tagName.toLowerCase();
        if (v = e.getAttribute('class')) this._cachedItemSelector += '.' + v;
        if (v = e.getAttribute('id')) this._cachedItemSelector += '#' + v;
        return this._cachedItemSelector;
    }

};

Amm.extend(Amm.Translator.List, Amm.Translator);

Amm.defineLangStrings({
    'Amm.Translator.List.msgInvalidInValueStrict': 'unsupported external value: %type provided, Array or Amm.Array expected',
    'Amm.Translator.List.msgInvalidInValueNonStrict': 'unsupported external value: %type provided, Array, Amm.Array, string or FALSEable value expected',
    'Amm.Translator.List.msgInvalidOutValue': 'internal value must be either string or FALSEable value or jQuery result or DOM Element, but %type was provided'
});

/* global Amm */

Amm.Translator.Errors = function(options) {
    Amm.Translator.List.call(this, options);
};

Amm.Translator.Errors.prototype = {

    'Amm.Translator.Errors': '__CLASS__', 
    
    _enclosureElement: '<ul class="errors"></ul>',
    
    _itemElement: '<li class="error"></li>',
    
    emptyOutValue: '',
    
    itemSelector: '.error',
    
    strict: false,
    
    allowHTML: false

};

Amm.extend(Amm.Translator.Errors, Amm.Translator.List);

/* global Amm */

/**
 * Decorates every item in hash or array in the loop, leaving same keys
 * TODO: port Ac_Decorator_ArrayMod
 */
Amm.Decorator.Loop = function(options) {
    Amm.Decorator.call(this, options);
};

Amm.Decorator.Loop.prototype = {

    'Amm.Decorator.Loop': '__CLASS__', 
    
    decorator: null,
    
    decorate: function(value) {
        if (!this.decorator || !(value && typeof value === 'object')) return value;
        var res, i;
        if (value instanceof Array) {
            res = [];
            for (i = 0; i < value.length; i++) {
                res.push(Amm.Decorator.d(value[i], this, 'decorator'));
            }
            return res;
        }
        res = {};
        for (i in value) if (value.hasOwnProperty(i)) {
            res[i] = Amm.Decorator.d(value[i], this, 'decorator');
        }
        return res;
    }

};

Amm.extend(Amm.Decorator.Loop, Amm.Decorator);

/* global Amm */

Amm.Decorator.WrapObject = function(options) {
    Amm.Decorator.call(this, options);
};

Amm.Decorator.WrapObject.prototype = {

    'Amm.Decorator.WrapObject': '__CLASS__', 
    
    decorate: function(value) {
        var res;
        if (!(value && typeof value === 'object')) return value;
        if (Amm.getClass(value)) return value;
        if (value instanceof Array) {
            var items = [], allObjects = true;
            for (var i = 0, l = value.length; i < l; i++) {
                if (!(value[i] && typeof value[i] === 'object')) allObjects = false;
                items.push(this.wrapObject(value[i]));
            }
            if (allObjects) res = new Amm.Collection(items);
            else res = new Amm.Array(items);
            return res;
        }
        res = new Amm.WithEvents;
        for (var i in value) if (value.hasOwnProperty(i)) {
            var v = value[i];
            if (v && typeof v === 'object') {
                v = this.wrapObject(v);
            }
            Amm.createProperty(res, i, v, function(value, old, memberName) {
                if (value && typeof value === 'object') {
                    this[memberName] = this.wrapObject(value);
                }
            }, true);
        }
        return res;        
    }

};

Amm.extend(Amm.Decorator.WrapObject, Amm.Decorator);

/* global Amm */

Amm.Decorator.Data = function(options) {
    Amm.Decorator.call(this, options);
};

Amm.Decorator.Data.prototype = {

    'Amm.Decorator.Data': '__CLASS__', 
    
    _filter: null,
    
    /**
     * "conditions" parameter for Amm.Filter intance
     * @type object
     */
    _conditions: null,

    setConditions: function(conditions) {
        if (!conditions && typeof conditions === 'object') {
            throw Error ("`conditions` must be a non-null object");
        }
        if (!Amm.keys(conditions).length) {
            conditions = null;
        }
        if (conditions && this._actions) this._checkActions(conditions, this._actions);
        this._conditions = conditions;
        if (this._filter) {
            this._filter.cleanup();
            this._filter = null;
        }
        return true;
    },

    getConditions: function() { return this._conditions; },

    /**
     * hash {matchValue: oneOrMoreActions[, default: action]}
     * where oneOrMoreActions is Array of Amm.Decorator.Data.Action prototypes
     * 
     * @type object
     */
    _actions: null,

    setActions: function(actions) {
        if (!actions && typeof actions === 'object') throw Error ("`actions` must be a non-null object");
        if (!Amm.keys(actions).length) {
            this._actions = null;
            return;
        }
        if (this._conditions && actions) this._checkActions(this._conditions, actions);
        this._actions = actions;
        return true;
    },
    
    _checkActions: function(conditions, actions) {
        var ck = Amm.keys(conditions);
        var ak = Amm.keys(actions);
        var extraCrit = Amm.Array.diff(ck, ak);
        if (extraCrit.length) throw Error("Mismatch in `critera` and `action` keys: some conditions ('" 
                + extraCrit.join("', '") + "') don't have corresponding actions");
        
        var extraAct =  Amm.Array.diff(ak, ck.concat(['default']));
        if (extraAct.length) throw Error("Mismatch in `critera` and `action` keys: some actions ('" 
                + extraCrit.join("', '") + "') don't have corresponding conditions");
    },

    getActions: function() { return this._actions; },

    decorate: function(value) {
        if (!this._conditions || !this._actions) return value;
        if (!this._filter) {
            var c = [], cond;
            for (var i in this._conditions) if (this._conditions.hasOwnProperty(i)) {
                cond = this._conditions[i];
                if (typeof cond === 'string') cond = {_expr: cond};
                c.push(Amm.override({_id: i}, cond));
            }
            this._filter = new Amm.Filter({conditions: c});
        }
        var result = this._filter.evaluateMatch(value);
        if (!this._actions[result]) result = 'default';
        if (!this._actions[result]) return value; // no matching action
        var out = {};
        this._applyActions(value, this._actions, result, out);
        return out;
    },
    
    _applyActions: function(value, actionsObject, action, out) {
        var action = actionsObject[action];
        if (action instanceof Array) {
            for (var i = 0, l = action.length; i < l; i++) {
                this._applyActions(value, action, i, out);
            }
            return;
        }
        if (!action['Amm.Decorator.Data.Action']) {
            action = actionsObject[action] = Amm.constructInstance(action, 'Amm.Decorator.Data.Action');
            action.apply(value, out);
        }
    }
    
};

Amm.extend(Amm.Decorator.Data, Amm.Decorator);

/* global Amm */

Amm.Decorator.Data.Action = function(options) {
    Amm.init(this, options);
};

Amm.Decorator.Data.Action.prototype = {

    'Amm.Decorator.Data.Action': '__CLASS__', 
    
    /**
     * Source path - where we take value from srcObject on applying the action.
     * Strings like foo[bar] are converted to paths ['foo', 'bar'] by setter.
     * 
     * @type {null|Array} source path (if null, this.def or entire srcObject are used)
     */
    _src: null,

    /**
     * Dest path - where we put value into destObject on applying the action.
     * Strings like foo[bar] are converted to paths ['foo', 'bar'] by setter.
     * If null path is provided and merge is set, value will be merged with destObject.
     * 
     * @type {null|Array} source path (if null, this.def or entire srcObject are used)
     */
    _dest: null,

    def: undefined,
    
    decorator: null,
    
    merge: false,

    /**
     * 
     */
    setSrc: function(src) {
        if (!src) src = null;
        else src = Amm.Util.pathToArray(src);
        var oldSrc = this._src;
        if (oldSrc === src) return;
        this._src = src;
        return true;
    },

    getSrc: function() { return this._src; },

    setDest: function(dest) {
        if (dest !== null && dest !== false && dest !== undefined) {
            dest = Amm.Util.pathToArray(dest);
        } else {
            dest = null;
        }
        var oldDest = this._dest;
        if (oldDest === dest) return;
        this._dest = dest;
        return true;
    },

    getDest: function() { return this._dest; },
    
    apply: function(srcObject, destObject) {
        if (!(srcObject && typeof srcObject === 'object')) throw Error("srcObject must be a non-null object");
        if (!(destObject && typeof destObject === 'object')) throw Error("destObject must be a non-null object");
        var value = undefined;
        if (this._src) value = Amm.Util.getByPath(srcObject, this._src, this.def);
        else value = this.def !== undefined? this.def : srcObject;
        if (value === undefined) return;
        value = Amm.Decorator.d(value, this, 'decorator'); // Apply this.decorator
        if (value === undefined) return;
        var dest = this._dest;
        if (dest === null && this.merge) {
            if (value && typeof value === 'object') Amm.override(destObject, value);
            return;
        }
        Amm.Util.setByPath(destObject, dest, value, {}, this.merge);
    }

};

// Amm.ex111tend(Amm.Decorator.Data.Action, Amm.Decorator.Data);

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
    
    // since we delete keys in options, we must clone the hash in case it will be reused
    if (options && typeof options === 'object') {
        options = Amm.override({}, options);
    }

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
/* global Amm */

/**
 * Base class for both Amm.Filter and Amm.Sorter. Observes multiple objects by multiple observers. 
 * Each observer computes "match" for every object.
 * Matches are cached and their changes produce events.
 */


Amm.FilterSorter = function(options) {
    this._observers = [];
    this._objects = [];
    this._matches = [];
    this._deferredChanges = [];
    Amm.WithEvents.DispatcherProxy.call(this);
    Amm.WithEvents.call(this, options);    
};

Amm.FilterSorter.prototype = {
    
    'Amm.FilterSorter': '__CLASS__',
    
    _observers: null,
    
    // numeric array with observed objects
    _objects: null,
    
    // `index in this._objects` => `match result`
    _matches: null,
    
    // [ [`index in this._objects`, `old match result`, `object`] ]
    _deferredChanges: null,
    
    _updateLevel: 0,
    
    // function that compares old and new match value
    _compareMatch: null,

    // TRUE to require matched object to match ALL conditions; match := last condition value (as JS &&)
    _requireAll: false,
    
    // Saves references to the matches in the observed objects
    _cacheMatches: false, // TODO: implement
    
    _cacheProp: null,
    
    getObservedObjects: function() {
        return [].concat(this._objects);
    },
    
    // notice: does NOT change order of objects that were already observed. Adds new objects to the end of this._objects
    setObservedObjects: function(objects) {
        var i, l, match;
        
        if (!objects) objects = [];
        else objects = Amm.Array.unique(objects);
        
        var changes = Amm.Array.calcChanges(this._objects, objects, null, 0, true);
        
        if (!changes.added.length && !changes.deleted.length) return;
        
        this.beginUpdate();
        
        if (changes.deleted.length) {
            var deletedObjects = [], deletedMatches = [], deletedIndice = {};
            for (i = changes.deleted.length - 1; i >= 0; i--) {
                deletedObjects.unshift(changes.deleted[i][0]);
                match = this._matches[changes.deleted[i][1]];
                deletedMatches.unshift(match);
                this._objects.splice(i, 1);
                this._matches.splice(i, 1);
                deletedIndice[changes.deleted[i][1]] = true;
                this._deferredChanges.push([undefined, match, changes.deleted[i]]);
            }
            for (i = this._deferredChanges.length - changes.deleted.length; i >= 0; i--) {
                if (deletedIndice[this._deferredChanges[i][0]]) this._deferredChanges.splice(i, 1);
            }
            if (this._cacheMatches) this._deleteCachedMatches(deletedObjects);
            this._unsubObservers(deletedObjects, undefined, true);
            this.outObjectsUnobserved(deletedObjects, deletedMatches);
        }
        if (changes.added.length) {
            var addedObjects = [], addedMatches = [], idxs = [];
            for (i = 0, l = changes.added.length; i < l; i++) {
                addedObjects.push(changes.added[i][0]);
                match = this.evaluateMatch(changes.added[i][0]);
                this._matches.push(match);
                addedMatches.push(match);
                idxs.push(this._objects.length + i);
                this._deferredChanges.push([this._objects.length + i, undefined, changes.added[i][0]]);
            }
            this._objects.push.apply(this._objects, addedObjects);
            if (this._cacheMatches) {
                this._saveCachedMatches(idxs);
            }
            this._subObservers(addedObjects, undefined, false, true);
            this.outObjectsObserved(addedObjects, addedMatches);
        }
        this.endUpdate();
    },
    
    getMatches: function() {
        return [].concat(this._matches);
    },
    
    _subObservers: function(objects, observers, unsubscribe, withCleanup) {
        objects = objects || this._objects;
        observers = observers || this._observers;
        var i, l, m = unsubscribe? 'unobserve' : 'observe';
        for (i = 0, l = observers.length; i < l; i++) {
            observers[i][m](objects);
        }
        if (!withCleanup) return;
        m = unsubscribe? 'unsubscribeObject' : 'subscribeObject';
        for (i = 0, l = objects.length; i < l; i++) {
            var o = objects[i];
            if (!(o['Amm.WithEvents'] && o.hasEvent('cleanup'))) continue;
            this[m](o, 'cleanup', this._handleObjectCleanup, this);
        }
    },
    
    _handleObjectCleanup: function() {
        var o = Amm.event.origin;
        this.unobserveObject(o);
    },
    
    beforeDispatch: function(eventName, queue, arguments) {
        if (queue.length > 1 || queue[0][1] && queue[0][1]['Amm.Expression']) {
            this.beginUpdate();
        }
    },
    
    afterDispatch: function(eventName, queue, arguments) {
        if (queue.length > 1 || queue[0][1] && queue[0][1]['Amm.Expression']) {
            this.endUpdate();
        }
    },
    
    _unsubObservers: function(objects, observers, withCleanup) {
        return this._subObservers(objects, observers, true, withCleanup);
    },
    
    beginUpdate: function() {
        this._updateLevel++;
    },
    
    _hasChangeSubscribers: function() {
        return this._subscribers.matchesChange;
    },
    
    endUpdate: function() {
        if (!this._updateLevel) throw Error("call to endUpdate() without prior beginUpdate()");
        
        if (this._updateLevel > 1) {
            this._updateLevel--;
            return;
        }
        
        if (!this._hasChangeSubscribers()) {
            this._deferredChanges = [];
            this._updateLevel--;
            return;
        }
        
        var d = {}, objects = [], matches = [], oldMatches = [], idx;
        for (var i = this._deferredChanges.length - 1; i >= 0; i--) {
            idx = this._deferredChanges[i][0];
            if (idx !== undefined) {
                if (d[idx]) continue;
                d[idx] = true;
            }
            
            var oldMatch = this._deferredChanges[i][1],
                object = this._deferredChanges[i][2],
                newMatch = this._matches[idx];
            if (oldMatch === newMatch || (this._compareMatch && !this._compareMatch(oldMatch, newMatch))) continue;
            objects.unshift(object);
            oldMatches.unshift(oldMatch);
            matches.unshift(newMatch);
        }
        this._deferredChanges = [];
        
        this._updateLevel--;
        
        if (!objects.length) return; // nothing changed
        
        this.outMatchesChange(objects, matches, oldMatches);
        
        this._doOnEndUpdateChange();
    },

    _doOnEndUpdateChange: function() {
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    getMatch: function(object, evaluate) {
        if (this._cacheMatches) {
            var res = this._getCachedMatch(object);
            if (res !== undefined) return res;
        }
        var idx = Amm.Array.indexOf(object, this._objects);
        if (idx >= 0) return this._matches[idx];
        if (evaluate) return this.evaluateMatch(object);
        return undefined;
    },
    
    refresh: function(object) {
        if (object) {
            var idx = Amm.Array.indexOf(object, this._objects);
            if (idx < 0) throw Error("`object` not observed, cannot refresh()");
            var match = this.evaluateMatch(object);
            this._updateMatch(idx, match);
        } else {
            this.beginUpdate();
            this._deferredChanges = [];
            for (var i = 0, l = this._objects.length; i < l; i++) {
                var m = this.evaluateMatch(this._objects[i]);
                this._updateMatch(i, m);
            }
            this.endUpdate();
        }
    },
    
    _doOnUpdateMatch: function(idx, oldMatch, newMatch) {
    },
    
    _updateMatch: function(idx, newMatch) {
        var oldMatch = this._matches[idx];
        
        if (oldMatch === newMatch || (this._compareMatch && !this._compareMatch(oldMatch, newMatch)))
            return;
        
        if (this._updateLevel) {
            this._deferredChanges.push([idx, oldMatch, this._objects[idx]]);
        }
        this._matches[idx] = newMatch;
        
        if (this._cacheMatches) this._saveCachedMatches([idx]);
        
        if (this._updateLevel) return;
        this.outMatchesChange([this._objects[idx]], [newMatch], [oldMatch]);

        this._doOnUpdateMatch(idx, oldMatch, newMatch);
    },
    
    evaluateMatch: function(object) {
        return null;
    },
    
    observeObject: function(object) {
        var idx = Amm.Array.indexOf(object, this._objects), match;
        if (idx >= 0) return this._matches[idx];
        this._objects.push(object);
        this._subObservers([object], undefined, false, true);
        match = this.evaluateMatch(object);
        for (var i = this._deferredChanges.length - 1; i >= 0; i--) {
            if (this._deferredChanges[i][0] === undefined && this._deferredChanges[i][2] === object) {
                // save old match value so _updateMatch will work correctly
                this._matches[this._objects.length - 1] = this._deferredChanges[i][1];
                this._deferredChanges.splice(i, 1);
            }
        }
        this._updateMatch(this._objects.length - 1, match);
        this.outObjectsObserved([object], [match]);
        return match;
    },
    
    unobserveObject: function(object) {
        var idx = Amm.Array.indexOf(object, this._objects);
        var oldMatchingObjects;
        if (idx < 0) return;
        if (this._cacheMatches) this._deleteCachedMatches([object]);
        var match = this._matches[idx];
        this._objects.splice(idx, 1);
        this._matches.splice(idx, 1);
        if (match) {
            oldMatchingObjects = this._matchingObjects;
            this._matchingObjects = null;
        }
        for (var i = this._deferredChanges.length - 1; i >= 0; i--) {
            if (this._deferredChanges[i][0] > idx) this._deferredChanges[i][0]--;
            else if (this._deferredChanges[i][0] === idx)
                this._deferredChanges.splice(i, 1);
        }
        if (!this._updateLevel) {
            this.outMatchesChange([object], [undefined], [match]);
        } else {
            this._deferredChanges.push([undefined, match, object]);
        }
        this._unsubObservers([object]);
        if (this._updateLevel) return;
        if (match && this._subscribers.matchingObjectsChange)
            this.outMatchingObjectsChange(this.getMatchingObjects(), oldMatchingObjects);
        this.outObjectsUnobserved([object], [match]);
        return match;
    },
    
    hasObservedObject: function(object) {
        return Amm.Array.indexOf(object, this._objects) >= 0;
    },
    
    outObjectsObserved: function(objects, matches) {
        this._out('objectsObserved', objects, matches);
    },
    
    outObjectsUnobserved: function(objects, matches) {
        this._out('objectsUnobserved', objects, matches);
    },
    
    outMatchesChange: function(objects, matches, oldMatches) {
        this._out('matchesChange', objects, matches, oldMatches);
    },
    
    _saveCachedMatches: function(indexes) {
        if (!this._cacheMatches) return;
        if (indexes !== undefined && !(indexes instanceof Array)) indexes = [indexes];
        if (!this._cacheProp) {
            Amm.registerItem(this);
            this._cacheProp = '_Amm.FilterSorter.' + this._amm_id;
            Amm.unregisterItem(this);
        }
        for (var i = 0, l = indexes? indexes.length : this._objects.length; i < l; i++) {
            var idx = indexes? indexes[i] : i, 
                object = this._objects[idx], 
                match = this._matches[idx];
            object[this._cacheProp] = match;
        }
    },
    
    _getCachedMatch: function(object) {
        if (!object || !this._cacheProp) return undefined;
        return object[this._cacheProp];
    },
    
    _deleteCachedMatches: function(objects) {
        if (!this._cacheProp) return;
        for (var i = 0, l = objects.length; i < l; i++) {
            delete objects[i][this._cacheProp];
        }
    },

    setCacheMatches: function(cacheMatches) {
        cacheMatches = !!cacheMatches;
        var oldCacheMatches = this._cacheMatches;
        if (oldCacheMatches === cacheMatches) return;
        this._cacheMatches = cacheMatches;
        if (!cacheMatches) this._deleteCachedMatches(this._objects);
        else this._saveCachedMatches();
        return true;
    },

    getCacheMatches: function() { return this._cacheMatches; },
    
    cleanup: function() {
        Amm.WithEvents.prototype.cleanup.apply(this);
        this._matches = [];
        this._unsubObservers();
        for (var i = 0, l = this._observers.length; i < l; i++) {
            this._observers[i].cleanup();
        }
        this._observers = [];
        this.setObservedObjects([]);
    }

};

Amm.extend(Amm.FilterSorter, Amm.WithEvents.DispatcherProxy);
Amm.extend(Amm.FilterSorter, Amm.WithEvents);
/* global Amm */

Amm.Sorter = function(options) {
    this._compareClosureFn = ( function(o) { return function(a, b) { return o.compareObjects(a, b); }; } ) (this);    
    Amm.FilterSorter.call(this, options);
};

Amm.Sorter.ascendingDescRx = /\s+(asc|desc)$/i;
Amm.Sorter.propNameRx = /^\w+$/;

Amm.Sorter.prototype = {

    'Amm.Sorter': '__CLASS__', 
    
    _needReorderCriteria: false,
    
    _parseAscendingDesc: true,
    
    _allowExpressions: true,
    
    _cacheMatches: true,
    
    _lockIndexes: 0,
    
    _compareClosureFn: null,

    // [index in _observers => ascending]
    _directions: null,
    
    _oldDirections: null,
    
    _deleteCriterion: function(index, reorder) {
        if (!this._observers[index]) return;
        var instance = this._observers[index];
        this._unsubObservers(this._objects, [instance]);
        instance.cleanup();
        if (!reorder) return;
        this._innerShift(index, this._observers.length);
    },
    
    setCriteria: function(criteria, index) {
        
        if (index !== undefined) { // first type: add or replace one criterion
            
            this._directions = null;
            
            var targetIndex = index;
            if (targetIndex < 0) targetIndex = 0;
            if (targetIndex > this._observers.length)
                targetIndex = this._observers.length;
            
            
            if (criteria) {
            
                this._lockIndexes++;
                try {
                    criteria = this._getCriterionPrototype(criteria, targetIndex);
                } catch (e) {
                    this._lockIndexes--;
                    throw e;
                }
                this._lockIndexes--;
                
            } else {
                criteria = null;
            }
            
            if (this._observers[targetIndex]) {
                if (this._observers[targetIndex] === criteria) return;
                if (index >= 0) {
                    this._deleteCriterion(targetIndex, !criteria);
                    this._directions = null;
                    this.refresh();
                    return;
                }
            }
            if (!criteria) {
                this._directions = null;
                this.refresh();
                return true;
            }
            
            if (index < 0) { // intended to prepend
                this._innerShift(this._observers.length, 0, true);
            }
            this._observers[targetIndex] = criteria;
            this._directions = null;
            this.refresh();
            
            return true;
        }
            
        var i, l;

        try {
            this.beginUpdate();
            this._lockIndexes++;

            var proto = [], p;

            if (!(criteria instanceof Array)) criteria = [criteria];
            
            this._directions = null;

            for (i = 0, l = criteria.length; i < l; i++) {
                p = this._getCriterionPrototype(criteria[i], i);
                proto.push(p);
            }
            
            var newCriteria = Amm.constructMany(proto, 'Amm.Sorter.Criterion');
            newCriteria.sort(function(a, b) {
                return a.getIndex() - b.getIndex();
            });

            for (i = 0, l = newCriteria.length; i < l; i++) {
                newCriteria[i].setIndex(i);
            }

            // delete old criteria
            for (i = 0, l = this._observers.length; i < l; i++) {
                this._observers[i].cleanup();
            }
            this._observers = newCriteria;

            if (this._objects.length) {
                this._subObservers(this._objects);
            }            
        } catch (e) {
            this._lockIndexes--;
            this.endUpdate();
            throw e;
        }
        
        this._lockIndexes--;
        this._directions = null;
        this.refresh();
        this.endUpdate();
    },
    
    getCriteria: function(index) {
        if (index === undefined) return [].concat(this._observers);
        return this._observers[index];
    },
    
    _getCriterionPrototype: function(criterion, index) {

        var res;

        if (criterion && typeof criterion === 'object') {
            if (criterion['Amm.Sorter.Criterion']) {
                if (criterion.getFilterSorter() !== this) {
                    throw Error("setCriteria(): `criteria[" + index + "]` doesn't belong to current Sorter");
                }
                if (criterion.getIndex() === null) criterion.setIndex(index);
                res = criterion;
            } else {
                res = {}.override(criterion);
                if (typeof res.index !== 'number') res.index = index;
            }
            res.filterSorter = this;
            return res;
        }

        var matches, ascending = true;
        
        res = {};
        
        if (typeof criterion !== 'string') 
            throw Error("`criteria[" + index + "]` should be either string or object; given: "
                + Amm.describeType(criterion));
        
        if (this._parseAscendingDesc) {
            matches = Amm.Sorter.ascendingDescRx.exec(criterion);
            if (matches) {
                ascending = matches[1].toLowerCase() === 'asc';
                criterion = criterion.slice(0, -matches[0].length);
            }
        }
        if (this._allowExpressions && !Amm.Sorter.propNameRx.exec(criterion)) {
            res.expression = criterion;
            res.class = Amm.Sorter.Expression;
        } else {
            res.class = Amm.Sorter.Property;
            res.property = criterion;
        }
        if (!('index' in res)) res.index = index;
        res.ascending = ascending;
        res.filterSorter = this;
        return res;
    },
    
    compareObjects: function(object1, object2) {
        var match1 = this.getMatch(object1, true);
        var match2 = this.getMatch(object2, true);
        return this.compareMatches(match1, match2);
    },
    
    calcSortValue: function(object, index) {
        return this.getMatch(object, true);
    },
    
    getCompareClosureFn: function() {
        return this._compareClosureFn;
    },
    
    _innerShift: function(a, b, setIndex) {
        this._lockIndexes++;
        var d = a > b? -1 : 1;
        for (var i = a; i*d < b*d; i += d) {
            this._observers[i] = this._observers[i + d];
            if (setIndex) this._observers[i].setIndex(i);
        }
        this._lockIndexes--;
    },
    
    notifyCriterionIndexChanged: function(criterion, newIndex, index) {
        if (this._lockIndexes) return;
        if (this._observers[index] !== criterion) {
            index = Amm.Array.indexOf(criterion, this._observers);
            if (index < 0) throw Error ("Provided criterion is not registered observer");
        }
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= this._observers.length) newIndex = this._observers.length - 1;
        if (newIndex === index) return; // nothing to do
        
        this._innerShift(index, newIndex, true);
        this._observers[newIndex] = criterion;
        criterion.setIndex(newIndex);
        this._lockIndexes--;
        this.refresh();
    },
    
    notifyCriterionDirectionChanged: function(criterion, ascending, oldAscending) {
        if (this._directions) { 
            this._directions = null;
            this.outNeedSort();
        }
    },
    
    compareMatches: function(a, b) { // compare matches to compare objects
        var i, l;
        if (!(a instanceof Array) && (b instanceof Array)) throw Error ("both matches must be Arrays");
        if (a.length !== b.length) throw Error ("both matches must have same length");
        if (!this._directions) {
            this._directions = this._getDirections();
        }        
        var res;
        for (i = 0, l = a.length; i < l; i++) {
            if (a[i] === b[i]) continue;
            if (a[i] < b[i]) res = -1;
            else if (a[i] > b[i]) res = 1;
            else res = 0;
            if (!this._directions[i]) res = -1*res;
            return res;
        }
        return 0;
    },
    
    _compareMatch: function(a, b) { // simple comparison of matches equality
        if (a === b) return 0;
        if (!a || !b) return 1;
        if (!(a instanceof Array || a['Amm.Array'])) return 1;
        if (!(b instanceof Array || b['Amm.Array'])) return 1;
        return !Amm.Array.equal(a, b);
    },
    
    outNeedSort: function() {
        this._oldDirections = null;
        return this._out('needSort');
    },
    
    sort: function(objects) {
        var o;
        if (objects && objects['Amm.Array']) o = objects.getItems();
        else if (objects && objects instanceof Array) o = objects.slice();
        else throw Error("`objects` must be Array or Amm.Array");
        return o.sort(this._compareClosureFn);
    },
    
    evaluateMatch: function(object) {
        if (!this._observers.length) return [];
        var res = [];
        for (var i = 0, l = this._observers.length; i < l; i++) {
            res.push(this._observers[i].getValue(object));
        }
        return res;
    },
    
    _doOnEndUpdateChange: function() {
        this.outNeedSort();
    },
    
    _doOnUpdateMatch: function(idx, oldMatch, newMatch) {
        this.outNeedSort();
    },
    
    _hasChangeSubscribers: function() {
        return this._subscribers.matchesChange || this._subscribers.needSort;
    },
    
    _getDirections: function() {
        if (this._directions) return this._directions;
        var res = [];
        for (var i = 0, l = this._observers.length; i < l; i++) res.push(this._observers[i].getAscending());
        return res;
    },
    
    beginUpdate: function() {
        Amm.FilterSorter.prototype.beginUpdate.call(this);
        if (this._updateLevel === 1) {
            this._oldDirections = this._getDirections();
        }
    },
    
    endUpdate: function() {
        Amm.FilterSorter.prototype.endUpdate.call(this);
        if (this._oldDirections && !this._directions && !Amm.Array.equal(this._getDirections(), this._oldDirections)) {
            this._directions = null;
            this.outNeedSort();
        }
    }


};

Amm.extend(Amm.Sorter, Amm.FilterSorter);

/* global Amm */

Amm.FilterSorter.Observer = function(filterSorter, options) {
    
    this._filterSorter = filterSorter;

    Amm.WithEvents.call(this, options, true);
    
};

Amm.FilterSorter.Observer.prototype = {
    
    'Amm.FilterSorter.Observer': '__CLASS__',
    
    _filterSorter: null,
    
    match: function(object) {
        return true;
    },
    
    cleanup: function(alreadyUnsubscribed) {
        this.unsubscribe();
        this._filterSorter = null;
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    observe: function(objects) {
        // template method
    },
    
    unobserve: function(objects) {
        // template method
    }
    
};

Amm.extend(Amm.FilterSorter.Observer, Amm.WithEvents);
/* global Amm */

Amm.Sorter.Criterion = function(sorter, options) {
    if (options === undefined && sorter && typeof sorter === 'object' && sorter.filterSorter) {
        options = sorter;
        sorter = options.filterSorter;
        delete options.filterSorter;
    }
    Amm.FilterSorter.Observer.call(this, sorter, options);
    Amm.init(this, options);
};

Amm.Sorter.Criterion.prototype = {

    'Amm.Sorter.Criterion': '__CLASS__', 
    
    _index: null,

    _ascending: true,

    _defaultValue: null,

    setIndex: function(index) {
        var oldIndex = this._index;
        if (oldIndex === index) return;
        this._index = index;
        this._filterSorter.notifyCriterionIndexChanged(this, index, oldIndex);
        this.outIndexChange(index, oldIndex);
        return true;
    },

    getIndex: function() { return this._index; },

    outIndexChange: function(index, oldIndex) {
        this._out('indexChange', index, oldIndex);
    },

    setAscending: function(ascending) {
        ascending = !!ascending;
        var oldAscending = this._ascending;
        if (oldAscending === ascending) return;
        this._ascending = ascending;
        this._filterSorter.notifyCriterionDirectionChanged(this, ascending, oldAscending);
            this.outAscendingChange(ascending, oldAscending);
        return true;
    },

    getAscending: function() { return this._ascending; },

    outAscendingChange: function(ascending, oldAscending) {
        this._out('ascendingChange', ascending, oldAscending);
    },

    setDefaultValue: function(defaultValue) {
        var oldDefaultValue = this._defaultValue;
        if (oldDefaultValue === defaultValue) return;
        this._defaultValue = defaultValue;
        this.outDefaultValueChange(defaultValue, oldDefaultValue);
        this._filterSorter.refresh();
        return true;
    },

    getDefaultValue: function() { return this._defaultValue; },

    outDefaultValueChange: function(defaultValue, oldDefaultValue) {
        this._out('defaultValueChange', defaultValue, oldDefaultValue);
    },
    
    getValue: function(object) {
        var res = this._doGetValue(object);
        if (res === undefined) res = this._defaultValue;
        return res;
    },
    
    _doGetValue: function(object) {
    }
    
};

Amm.extend(Amm.Sorter.Criterion, Amm.FilterSorter.Observer);

/* global Amm */

Amm.Sorter.Expression = function(sorter, options) {
    Amm.Sorter.Criterion.call(this, sorter, options);
    if (!this._expression) throw Error("Need to provide options.expression");
};

Amm.Sorter.Expression.prototype = {

    'Amm.Sorter.Expression': '__CLASS__', 

    _expression: null,
    
    _evaluator: null,
    
    setExpression: function(expression) {
        var oldExpression = this._expression;
        if (oldExpression === expression) return;
        if (this._expression) throw Error ("Can setExpression() only once");
        if (typeof expression !== 'string') throw Error("`expression` must be a string");
        this._expression = new Amm.Expression(expression);
        this._expression.setEventsProxy(this._filterSorter);
        return true;
    },

    getExpression: function() { return this._expression; },

    observe: function(objects) {
        for (var i = 0, l = objects.length; i < l; i++) {
            var o = objects[i];
            if (this._expression.findContext(o) !== undefined) continue; // already subscribed
            this._expression.createContext({expressionThis: o});
            this._expression.subscribe('valueChange', this._handleExpressionChanged, this);
        }
    },
    
    unobserve: function(objects) {
        for (var i = 0, l = objects.length; i < l; i++) {
            var id = this._expression.findContext(objects[i]);
            if (id === undefined) continue; // not subscribed
            this._expression.deleteContext(id);
        }
    },
    
    _handleExpressionChanged: function(value, oldValue) {
        var object = this._expression.getExpressionThis();
        this._filterSorter.refresh(object);
    },
    
    _doGetValue: function(object) {
        if (object === this._expression.getExpressionThis()) {
            return this._expression.getValue();
        }
        var ctx = this._expression.findContext(object);
        
        if (ctx !== undefined) { // return value for observed object
            this._expression.setContextId(ctx);
            return this._expression.getValue();
        }
        
        if (!this._evaluator) this._evaluator = this._expression.toFunction();
        
        this._evaluator.env.expressionThis = object;
        
        return this._evaluator();
    },
    
    cleanup: function() {
        Amm.Sorter.Criterion.prototype.cleanup.call(this);
        this._expression.cleanup();
        this._evaluator = null;
        this._expression = null;
    },
    
    
};

Amm.extend(Amm.Sorter.Expression, Amm.Sorter.Criterion);

/* global Amm */

Amm.Sorter.Property = function(sorter, options) {
    Amm.Sorter.Criterion.call(this, sorter, options);
    if (!this._property) throw Error("Need to specify options.property");
};

Amm.Sorter.Property.prototype = {

    'Amm.Sorter.Property': '__CLASS__', 
    
    _property: null,
    
    setProperty: function(property) {
        var oldProperty = this._property;
        if (oldProperty === property) return;
        if (this._property) throw Error ("Can setProperty() only once");
        this._property = property;
        return true;
    },

    getProperty: function() { return this._property; },
    
    observe: function(objects) {
        var oo = objects || this._filterSorter._objects, l = oo.length, i, o;
        var ev = this._property + 'Change';
        for (i = 0; i < l; i++) {
            o = oo[i];
            if (!o['Amm.WithEvents']) continue;
            if (!o.hasEvent(ev)) continue;
            this._filterSorter.subscribeObject(o, ev, this._handleChange, this);
        }
    },
    
    // if props is not provided, will unsubscribe from all events
    unobserve: function(objects) {
        var oo = objects || this._filterSorter._objects, l = oo.length, i, o;
        var ev = this._property + 'Change';
        for (i = 0; i < l; i++) {
            o = oo[i];
            if (!o['Amm.WithEvents']) continue;
            if (!o.hasEvent(ev)) continue;
            this._filterSorter.unsubscribeObject(o, ev, this._handleChange, this);
        }
    },
    
    _handleChange: function() {
        if (!this._filterSorter) return;
        var o = Amm.event.origin; // event origin must be our object
        
        // sub-optimal (eval all conditions for all observed change events)
        this._filterSorter.refresh(o); 
    },
    
    _doGetValue: function(object) {
        return Amm.getProperty(object, this._property);
    }
    

};

Amm.extend(Amm.Sorter.Property, Amm.Sorter.Criterion);

/* global Amm */

Amm.DomHolder = function() {
};

Amm.DomHolder.find = function(selector, inside, throwIfNotFound) {
    var att = Amm.domHolderAttribute, res = [], lst = {};
    jQuery(selector)[inside? 'find' : 'closest']('[' + att + ']').each(function(idx, domNode) {
        var ids = domNode.getAttribute(att).split(' ');
        for (var i = 0, l = ids.length; i < l; i++) if (ids[i].length) lst[ids[i]] = 1;
    });
    for (var i in lst) if (lst.hasOwnProperty(i)) {
        var elm = Amm.getItem(i, throwIfNotFound);
        if (elm) res.push(elm);
    }
    return res;
};

Amm.DomHolder.prototype = {
    
    'Amm.DomHolder': '__CLASS__',
    
    // temp. false - until I'll sort this out
    _domExclusive: true, 
    
    _notifyDomNodeConflict: function(domNode, otherDomHolder) {
        if (this._domExclusive && !this._domCompat(otherDomHolder)) {
            var e = "Element already acquired by a different DomHolder";
            console.error(e, this, domNode, otherDomHolder);
            throw Error(e);
            
        }
    },
    
    _domCompat: function(otherDomHolder) {
        var res = 
                this['Amm.ElementBound'] 
                && otherDomHolder['Amm.ElementBound'] 
                && this._element 
                && otherDomHolder._element === this._element;
        return res;
    },
    
    _acquireDomNode: function(selector) {
        Amm.registerItem(this);
        var t = this, att = Amm.domHolderAttribute;
        jQuery(selector).each(function(i, domNode) {
            var v = (domNode.getAttribute(att) || ''), idx = v.indexOf(' ' + t._amm_id);
            if (idx < 0) {
                // don't have our node registered yet
                var ids = v.split(' '), items = Amm.getItem(ids);
                
                // throw: we're want to be exclusive, but we can't
                for (var i = 0, l = items.length; i < l; i++) {
                    t._notifyDomNodeConflict(domNode, items[i])
                    items[i]._notifyDomNodeConflict(domNode, t);
                }
                ids.push(t._amm_id);
                domNode.setAttribute(att, ids.join(' '));
            }
        });
    },
    
    _releaseDomNode: function(selector) {
        var t = this, id = ' ' + t._amm_id, att = Amm.domHolderAttribute;
        jQuery(selector).each(function(i, domNode) {
            if (domNode.hasAttribute(att)) {
                var v = domNode.getAttribute(att).replace(id, '');
                if (v.length) domNode.setAttribute(att, v);
                    else domNode.removeAttribute(att);
            }
        });
    }
    
};
/* global Amm */

// Amm.Validator.prototype

Amm.Validator = function(options) {
    
    Amm.override(this, options);
    
};

Amm.Validator.construct = function(proto, defaults, setToDefaults, requirements) {
    if (typeof proto === 'function') {
        return Amm.constructInstance({func: proto}, 'Amm.Validator.Function', defaults, setToDefaults, requirements);
    }
    return Amm.constructInstance(proto, 'Amm.Validator', defaults, setToDefaults, requirements);
};

Amm.Validator.instantiate = function(object, key) {
    if (!object[key]['Amm.Validator']) object[key] = Amm.Validator.construct(object[key]);
    return object[key];
};

/*
 * instantiates object[key] and returns error
 */
Amm.Validator.iErr = function(object, key, value, field) {
    return Amm.Validator.instantiate(object, key).getError(value, field);
};

Amm.Validator.prototype = {
    
    'Amm.Validator': '__CLASS__',

    _msg: function(message) {
        for (var i = 1, l = arguments.length; i < l; i += 2) {
            if (arguments[i] === '%field' && arguments[i + 1] === undefined) {
                arguments[i + 1] = Amm.translate('lang.Amm.Validator.value');
                break;
            }
        }
        var args = Array.prototype.slice.apply(arguments);
        return Amm.translate.apply(Amm, args);
    },
    
    isEmpty: function(value) {
        return (value === "" || value === null || value === undefined);
    },
    
    /**
     *  Should return error message for given value or FALSEable if value is ok
     *  %field is field name
     */
    getError: function(value, field) {
        return null;
    }
    
};


Amm.defineLangStrings({
    'lang.Amm.Validator.value': "Value"
});
/* global Amm */

Amm.Validator.Number = function(options) {
    Amm.Validator.call(this, options);
};

Amm.Validator.Number.prototype = {
    
    'Amm.Validator.Number': '__CLASS__',

    allowEmpty: true,
    strict: true,
    allowFloat: true,
    gt: null,
    ge: null,
    lt: null,
    le: null,
    
    msgMustBeNumber: 'lang.Amm.Validator.Number.msgMustBeNumber',
    msgMustBeInteger: 'lang.Amm.Validator.Number.msgMustBeInteger',
    msgMustBeGt: 'lang.Amm.Validator.Number.msgMustBeGt',
    msgMustBeGe: 'lang.Amm.Validator.Number.msgMustBeGe',
    msgMustBeLt: 'lang.Amm.Validator.Number.msgMustBeLt',
    msgMustBeLe: 'lang.Amm.Validator.Number.msgMustBeLe',
        
    getError: function(value, field) {
        var isEmpty = this.isEmpty(value);
        if (isEmpty) {
            if (this.allowEmpty) return;
            return this._msg(this.msgMustBeNumber, "%field", field);
        }
        var i = parseInt(value);
        var f = parseFloat(value);
        var nonStrict = f != value && i != value;
        if (isNaN(i) || this.strict && nonStrict) {
            return this._msg(this.msgMustBeNumber, "%field", field);
        }
        if (i != f && !this.allowFloat) {
            return this._msg(this.msgMustBeInteger, "%field", field);
        }
        var v = this.allowFloat? f : i;
        var c;
        
        c = this.gt;
        if (c !== null && !(v > c)) {
            return this._msg(this.msgMustBeGt, "%field", field, "%val", c);
        }
        
        c = this.ge;
        if (c !== null && !(v >= c)) {
            return this._msg(this.msgMustBeGe, "%field", field, "%val", c);
        }
        
        c = this.lt;
        if (c !== null && !(v < c)) {
            return this._msg(this.msgMustBeLt, "%field", field, "%val", c);
        }
        
        c = this.le;
        if (c !== null && !(v <= c)) {
            return this._msg(this.msgMustBeLe, "%field", field, "%val", c);
        }
    }
    
};

Amm.extend(Amm.Validator.Number, Amm.Validator);

Amm.defineLangStrings ({
    'lang.Amm.Validator.Number.msgMustBeNumber': '%field must be a number',
    'lang.Amm.Validator.Number.msgMustBeInteger': '%field must be an integer number',
    'lang.Amm.Validator.Number.msgMustBeGt': '%field must be higher than %val',
    'lang.Amm.Validator.Number.msgMustBeGe': '%field must not be less than %val',
    'lang.Amm.Validator.Number.msgMustBeLt': '%field must be less than %val',
    'lang.Amm.Validator.Number.msgMustBeLe': '%field must not exceed %val'
});
/* global Amm */

Amm.Validator.Function = function(options) {
    Amm.Validator.call(this, options);
};

Amm.Validator.Function.prototype = {
    
    'Amm.Validator.Function': '__CLASS__',
    
    element: null,
    
    func: null,
    
    message: 'lang.Amm.Validator.Function.msg',

    getError: function(value, field) {
        
        var err = {message: null}, res = null;
        
        if (typeof this.func === 'function') {
            res = this.func(value, field, err, this.element);
            if (typeof res === 'string') {
                res = Amm.translate(res, '%field', field);
            } else if (!res && res !== undefined) {
                res = Amm.translate(err.message || this.message, '%field', field);
            } else {
                return;
            }
        } else {
            Error("Amm.Validator.Function: this.`func` not set (or not a function)");
        }
        return res;
        
    }
    
};

Amm.extend(Amm.Validator.Function, Amm.Validator);

Amm.defineLangStrings({
    'lang.Amm.Validator.Function.msg': "%field is invalid"
});
/* global Amm */

Amm.Validator.Required = function(options) {
    
    Amm.Validator.call(this, options);
    
};

Amm.Validator.Required.prototype = {
    
    'Amm.Validator.Required': '__CLASS__',
    
    message: 'lang.Amm.Validator.Required.msg',
    
    getError: function(value, field) {
        var empty = this.isEmpty(value);
        if (!empty) return;
        return this._msg(this.message, '%field', field);
    }
    
};

Amm.extend(Amm.Validator.Required, Amm.Validator);

Amm.defineLangStrings ({
    'lang.Amm.Validator.Required.msg': "%field is required"
});
/* global Amm */

Amm.View = {
};
/* global Amm */

Amm.JQueryListener = function(options) {
    Amm.init(this, options);
};

Amm.JQueryListener.prototype = {
    
    // function that handles events
    _handler: null,

    // JQuery result with selected elements that .on() was called on
    _onJQuery: null,

    // JQuery .on args to pass to .off
    _onArgs: null,
    
    // One or several names of element properties - or functions to retreive them - to extract from element (this._onJQuery)
    // Also works: jQuery.fn[:arg], i.e. jQuery.val, jQuery.prop:checked, jQuery.is::visible
    // Hash allows to re-map arguments passed to the element (numeric keys should be used)
    elementPass: null,
    
    // One or several names of event properties - or functions to retreive them - to extract from element
    // Hash allows to re-map arguments passed to the element (numeric keys should be used)
    eventPass: null,
    
    // One or several names of events
    _eventName: null,
    
    // Selector to select events' source (within _htmlRoot)
    _selector: null,
    
    // 'Delegate selector' to pass 'selector' arg to jQuery.on() function
    _delegateSelector: null,
    
    // Selector to locate _selector elements within using jQuery.find() - may be handy 
    // (i.e. _htmlRoot points to the container, and _selector specifies only 'input[type=text]' (relative to that container)
    _htmlRoot: null,
    
    setEventName: function(eventName) {
        var o;
        if ((o = this._eventName) === eventName) return;
        this._eventName = eventName;
        this._bind();
    },
    
    getEventName: function() { return this._eventName; },
    
    setSelector: function(selector) {
        var o;
        if ((o = this._selector) === selector) return;
        this._selector = selector;
        this._bind();
    },
    
    getSelector: function() { return this._selector; },
    
    setDelegateSelector: function(delegateSelector) {
        var o;
        if ((o = this._delegateSelector) === delegateSelector) return;
        this._delegateSelector = delegateSelector;
        this._bind();
    },
    
    getDelegateSelector: function() { return this._delegateSelector; },
    
    setHtmlRoot: function(htmlRoot) {
        var o;
        if ((o = this._htmlRoot) === htmlRoot) return;
        this._htmlRoot = htmlRoot;
        this._bind();
    },
    
    getHtmlRoot: function() { return this._htmlRoot; },
    
    _bind: function() {
        // un-bind old
        if (this._onJQuery) {
            this._onJQuery.off.apply(this._onJQuery, this._onArgs);
            this._onJQuery = null;
            this._onArgs = null;
        }
        // bind new
        if (this._selector && this._eventName && this._handler) {
            this._onArgs = [this._handler];
            if (this._delegateSelector) this._onArgs.unshift(this._delegateSelector);
            this._onArgs.unshift(this._eventName);
            this._onJQuery = this._htmlRoot? jQuery(this._htmlRoot).find(this._selector) : jQuery(this._selector);
            this._onJQuery.on.apply(this._onJQuery, this._onArgs);
        }
    },
    
    cleanup: function() {
        this._handler = null;
        this._bind();
    },

    setHandler: function(handler) {
        var oldHandler = this._handler;
        if (oldHandler === handler) return;
        this._handler = handler;
        this._bind();
        return true;
    },

    getHandler: function() { return this._handler; }
    
};/* global Amm */

Amm.Expression.Sync = function(options, expressionThis, writeProperty, writeObject, writeArgs, translator, errProperty, errObject) {
    
    Amm.Expression.call(this, options, expressionThis, writeProperty, writeObject, writeArgs);
    
};

Amm.Expression.Sync.prototype = {

    'Amm.Expression.Sync': '__CLASS__',

    _translator: null,

    _errProperty: null,

    _errObject: null,
    
    _writeGetter: null,
    
    _writeSetter: null,
    
    _writeEvent: null,
    
    _lastError: false,
    
    setTranslator: function(translator) {
        if (!translator) translator = null;
        else if (!Amm.getClass(translator)) {
            translator = Amm.constructInstance(translator, 'Amm.Translator');
        } else {
            Amm.is(translator, 'Amm.Translator', 'translator');
        }
        var oldTranslator = this._translator;
        if (oldTranslator === translator) return;
        this._translator = translator;
        this._write();
        return true;
    },

    getTranslator: function() { return this._translator; },

    setErrProperty: function(errProperty) {
        var oldErrProperty = this._errProperty;
        if (oldErrProperty === errProperty) return;
        this._errProperty = errProperty;
        return true;
    },

    getErrProperty: function() { return this._errProperty; },

    setErrObject: function(errObject) {
        var oldErrObject = this._errObject;
        if (oldErrObject === errObject) return;
        this._errObject = errObject;
        this._handleTranslationError(this._lastError, false, true);
        return true;
    },

    getErrObject: function() { return this._errObject; },

    setWriteProperty: function(writeProperty, writeObject, writeArgs) {
        // TODO: repeat when expressionThis changes...
        var res = Amm.Expression.prototype.setWriteProperty.call(this, writeProperty, writeObject, writeArgs);
        if (this._writeObject && this._writeObject['Amm.Expression']) {
            this._writeObject.subscribe('valueChange', this._handleWriteValueChange, this);
            return res;
        }
        if (!this._writeEvent) this._detectWriteProperty();
        if (this._writeEvent) {
            (this._writeObject || this._expressionThis).subscribe(this._writeEvent, this._handleWriteValueChange, this);
        } else {
            throw Error("writeObject doesn't have event for change of writeProperty '" + this._writeProperty + "' so Amm.Expression.Sync cannot function");
        }
    },
    
    _detectWriteProperty: function() {
        var wo = this._writeObject || this._expressionThis, prop = {};
        Amm.detectProperty(wo, this._writeProperty, prop);
        this._writeGetter = prop.getterName;
        this._writeSetter = prop.setterName;
        this._writeEvent =  prop.eventName;
    },
    
    _write: function() { // expression => writeProperty: translateIn
        var wo = this._writeObject || this._expressionThis;
        if (!wo) return;
        if (this._lockWrite) return;
        this._lockWrite++;
        var v = this.getValue(), ok = true;
        if (this._translator && v !== undefined) {
            var err = {};
            v = this._translator.translateIn(v, err);
            if (err.error) ok = false;
            this._handleTranslationError(err.error, true);
        }
        if (!ok) {
            this._lockWrite--;
            return;
        }
        if (!this._writeGetter) this._detectWriteProperty();
        var pv = wo[this._writeGetter]();
        if (v === undefined && pv !== undefined) {
            this._setTranslatedValue(pv);
            this._lockWrite--;
            return;
        }
        Amm.setProperty(wo, this._writeProperty, v, false, this._writeArgs);
        this._lockWrite--;
    },

    _setTranslatedValue: function(writePropertyValue) { // writeProperty => expression: translateOut
        if (!this._translator) {
            this.setValue(writePropertyValue);
            return;
        }
        var err = {};
        var translated = this._translator.translateOut(writePropertyValue, err);
        if (!err.error) {
            this.setValue(translated);
        }
        this._handleTranslationError(err.error || null, false);
    },
    
    _handleTranslationError: function(error, isIn, force) {
        if (error === this._lastError && !force) return;
        this._lastError = error;
        if (this._errProperty)
            Amm.setProperty(this._errObject || this._expressionThis, this._errProperty, error);
    },
    
    _handleWriteValueChange: function(value, oldValue) {
        if (this._lockWrite) return;
        this._lockWrite++;
        this._setTranslatedValue(value);
        this._lockWrite--;
    },
    
    parse: function(src) {
        Amm.Expression.prototype.parse.call(this, src);
        if (!this.supportsAssign)
            throw Error("Amm.Expression.Sync must be assignable, but '" + src + "' is not");
    },
    
    notifyWriteDestinationChanged: function() {
        if (Amm.Expression.prototype.notifyWriteDestinationChanged.call(this)) return true;
        if (this._writeGetter && this._hasValue && this._value === undefined) {
            var o = (this._writeObject || this._expressionThis), v;
            if (o) {
               v = o[this._writeGetter]();
               if (v !== undefined) this._setTranslatedValue(v);
            }
        }
    }
    
};

Amm.extend(Amm.Expression.Sync, Amm.Expression);/* global Amm */

// Variant A: 
// new Amm.Expression.FunctionHandler(options); 
// Variant B: new Amm.Expression.FunctionHandler(function, thisObject, options)
// Variant C: new Amm.Expression.FunctionHandler(function, thisObject, writeProperty, writeObject, writeArgs, options)
Amm.Expression.FunctionHandler = function(options) {
    Amm.WithEvents.call(this, options, true);
    this._expressions = {};
    this._get = {};
    this._set = {};
    var opt;
    var wp = null;
    
    var t = this;
    this._getter = function(expression, again) { return t.get(expression, again); };
    this._setter = function(expression, value) { return t.set(expression, value); };
    
    
    if (typeof options === 'function') {
        // case C?
        if (arguments.length >= 2 || 
            (typeof arguments[2] === 'object' && !(arguments[2] instanceof Array))
        ) {
            opt = arguments[6] || {};
            opt.fn = arguments[0];
            opt.thisObject = arguments[1];
            wp = true;
        } else {
            // case B
            opt = arguments[2] || {};
            opt.fn = arguments[0];
            opt.thisObject = arguments[1];
        }
    } else opt = options;
    Amm.init(this, opt);
    if (wp) this.setWriteProperty(arguments[2], arguments[3], arguments[4]);
};

Amm.Expression.FunctionHandler.prototype = {

    _fn: null,

    _thisObject: null,
    
    _isRun: 0,
    
    _get: null,
    
    _set: null,
    
    _again: false,
    
    _writeObject: null,

    _writeProperty: null,
    
    _writeArgs: null,
    
    _lockWrite: 0,
    
    _value: null,
    
    _gotValue: false,

    setFn: function(fn) {
        var oldFn = this._fn;
        if (oldFn === fn) return;
        if (this._fn) throw Error("Can setFn() only once");
        if (typeof fn !== 'function') throw Error("fn must be a function");
        this._fn = fn;
        return true;
    },

    getFn: function() { return this._fn; },

    setThisObject: function(thisObject) {
        var oldThisObject = this._thisObject;
        if (oldThisObject === thisObject) return;
        if (typeof thisObject !== 'object' || !thisObject)
            throw Error("thisObject must be a non-null object");
        this._thisObject = thisObject;
        if (thisObject['Amm.WithEvents'] && thisObject.hasEvent('cleanup')) {
            thisObject.subscribe('cleanup', this.cleanup, this);
        }
        return true;
    },

    getThisObject: function() { return this._thisObject; },

    _setValue: function(value) {
        var oldValue = this._value;
        if (oldValue === value) return;
        this._gotValue = true;
        this._value = value;
        if (this._writeProperty) this._write();
        this.outValueChange(value, oldValue);
        return true;
    },

    getValue: function(again) {
        if (again || !this._gotValue) {
            this._run(again);
        }
        return this._value;
    },
    
    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    },
    
    _run: function(again) {
        if (!this._fn) return;
        if (this._isRun) return;
        this._isRun++;
        this._again = !!again;
        var v = this._fn.call(this, this._getter, this._setter);
        this._setValue(v);
        this._cleanExpressions();
        this._isRun--;
    },
    
    setWriteProperty: function(writeProperty, writeObject, writeArgs) {
        if (arguments.length === 1 && writeProperty instanceof Array) {
            writeProperty = arguments[0][0];
            writeObject = arguments[0][1];
            writeArgs = arguments[0][2];
        }
        if (this._writeProperty) Error("Can setWriteProperty() only once");
        if (!writeProperty) Error("writeProperty must be non-falseable");
        if (writeProperty['Amm.Expression']) {
            if (writeObject || writeArgs) Error("When Amm.Expression is used as writeProperty, don't specify writeObject/writeArgs");
            writeObject = writeProperty;
            writeProperty = 'value';
            writeObject.subscribe('writeDestinationChanged', this._write, this);
        }
        if (writeArgs === null || writeArgs === undefined) {
            writeArgs = null;
        } else if (!(writeArgs instanceof Array)) {
            writeArgs = [writeArgs];
        }
        if (!writeObject && !this._thisObject) {
            Error("setThisObject() or provide writeObject when setting writeProperty");
        }
        this._writeProperty = writeProperty;
        this._writeObject = writeObject;
        if (writeObject && writeObject['Amm.WithEvents'] && writeObject.hasEvent('cleanup')) {
            writeObject.subscribe('cleanup', this.cleanup, this);
        }
        this._writeArgs = writeArgs;
        this._write();
    },
    
    _write: function() {
        if (this._lockWrite || !this._writeProperty) return;
        this._lockWrite++;
        var wo = this._writeObject || this._thisObject;
        Amm.setProperty(wo, this._writeProperty, this.getValue(), false, this._writeArgs);
        this._lockWrite--;
    },
    
    getWriteProperty: function(all) {
        return all? [this._writeProperty, this._writeObject, this._writeArgs] : this._writeProperty;
    },
    
    getWriteObject: function() {
        return this._writeObject;
    },
    
    getWriteArgs: function() {
        return this._writeArgs;
    },

    _handleExpressionValueChange: function(value, oldValue) {
        if (this._lockWrite) return;
        this._run();
    },
    
    _handleExpressionDestinationChange: function() {
        if (this._lockWrite) return;
        this._run();
    },
    
    _access: function(expression, set) {
        if (this._isRun) this[set? '_set' : '_get'][expression] = true;
        if (!this._expressions[expression]) {
            this._expressions[expression] = new Amm.Expression(
                expression, 
                this._thisObject
            );
            if (set) {
                this._expressions[expression].subscribe('writeDestinationChanged', 
                    this._handleExpressionDestinationChange, this);
            } else {
                this._expressions[expression].subscribe('valueChange', 
                    this._handleExpressionValueChange, this);
            }
        }
        return this._expressions[expression];
    },

    get: function(expression, again) {
        if (again === undefined) again = this._again;
        return this._access(expression).getValue(again);
    },
    
    set: function(expression, value) {
        return this._access(expression, true).setValue(value);
    },
    
    _cleanExpressions: function(all) {
        for (var i in this._expressions) {
            if (this._expressions.hasOwnProperty(i)) {
                if (all || !this._get[i] && !this._set[i]) {
                    this._expressions[i].unsubscribe(undefined, undefined, this);
                    this._expressions[i].cleanup();
                    delete this._expressions[i];
                }
            }
        }
        this._get = {};
        this._set = {};
    },
    
    cleanup: function() {
        this._cleanExpressions(true);
        if (this._writeObject && this._writeObject['Amm.Expression']) {
            this._writeObject.cleanup();
        }
        Amm.WithEvents.prototype.cleanup.call(this);
    }
    
    
};

Amm.extend(Amm.Expression.FunctionHandler, Amm.WithEvents);
/* global Amm */

Amm.Util = {
    
    regexEscape: function(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    },
    
    trim: function(string) {
        return string.replace(/^\s+|\s+$/g, '');
    },
    
    getByPath: function(source, arrPath, defaultValue) {
        if (!(arrPath instanceof Array)) arrPath = Amm.Util.pathToArray(arrPath);
        var curr = source, ap = [].concat(arrPath), seg;
        while (ap.length) {
            seg = ap.shift();
            if (!curr || typeof curr !== 'object' || !(seg in curr)) 
                return defaultValue;
            curr = curr[seg];
        }
        if (!ap.length) return curr;
        return defaultValue;
    },
    
    setByPath: function(target, arrPath, value, changed, merge) {
		
        if (!target && value === undefined) return;
        
        if (!(arrPath instanceof Array)) arrPath = Amm.Util.pathToArray(arrPath);
        
        var l = arrPath.length;
        changed = changed || {};
        changed.changed = false;

        if (!l) return value;
        
        if (typeof target !== 'object' || target === null) {
            target = {};
            changed.changed = true;
        }
        
        var root = {dummy : target}, prev = root, prevKey = 'dummy', seg, nKey;

        for (var i = 0; i < l; i++) {
            var last = (i >= (l - 1)), curr = prev[prevKey];
            seg = '' + arrPath[i], nKey = parseInt(seg);
            if (!seg.length) {
                if (curr instanceof Array) nKey = curr.length;
                else {
                    nKey = 0; 
                    for (var prop in curr) 
                        if (curr.hasOwnProperty(prop)) {
                            var idx = parseInt(prop);
                            if (idx >= nKey) nKey = idx + 1;
                        }
                }
                seg = nKey; // we need it to make next if() work
            }
            if ((nKey >= 0) && (('' + nKey) == seg)) { // we have numeric key!
                if (last) {
                    if (curr[nKey] !== value) {
                        // we can merge
                        if (merge 
                            && (value && typeof value === 'object' 
                            && (curr[nKey] && typeof curr[nKey] === 'object'))
                        ) {
                            Amm.override(curr[nKey], value);
                        } else {
                            curr[nKey] = value;
                        }
                        changed.changed = true;
                    }
                } else {
                    if (curr[nKey] === undefined) {
                        curr[nKey] = [];
                        changed.changed = true;
                    }
                }
                prev = curr;
                prevKey = nKey;
            } else {
                // it's a string key
                if (curr instanceof Array) {
                    changed.changed = true;
                    prev[prevKey] = Amm.Util.arrayToHash(prev[prevKey]);
                    curr = prev[prevKey];
                }
                if (last) {
                    if (curr[seg] !== value) {
                        changed.changed = true;
                        // we can merge
                        if (merge 
                            && (value && typeof value === 'object' 
                            && (curr[seg] && typeof curr[seg] === 'object'))
                        ) {
                            Amm.override(curr[seg], value);
                        } else {
                            curr[seg] = value;
                        }
                    }
                } else {
                    if (curr[seg] === undefined) {
                        curr[seg] = [];
                        changed.changed = true;
                    }
                    prev = curr;
                    prevKey = seg;
                }
            }
        }
        
        return root.dummy;
    },

    /**
     * Converts Array instance into generic object with same key-value pairs as
     * indexes in array (i.e. ['foo', 'bar'] converted to {'0': 'foo', '1': 'bar'}
     * (sometimes used in Uri parameters serializarion and deserialization)
     * 
     * @param {Array} array
     * @returns {object}
     */
    arrayToHash: function(array) { 
        var res = {}, l = array.length; 
        for (var i = 0; i < l; i++) {
            if (array[i] !== undefined) res[i] = array[i];
        }
        return res;
    },
    
    /**
     * Converts php-style square-bracketed path to array
     * i.e. foo[bar][baz][] will be converted to ['foo', 'bar', baz', '']
     * and foo will be converted to ['foo']
     * 
     * @param {string} string
     * @returns {Array}
     */
    pathToArray: function(string) { 
        if (!string.length) return [];
        if (string instanceof Array) return string;
        return string.replace(/\]/g, '').split('[');
    },
    
    /**
     * Converts array to php-style square-bracketed path i.e.
     * ['foo', 'bar'] will be converted to foo[bar]
     * and ['foo', 'bar', ''] will be converted to foo[bar][] (hello, PHP)
     * 
     * @param {Array} array Path like ['foo', 'bar', 'baz']
     * @returns {string}
     */
    arrayToPath: function(array) {
        if (!array.length) return '';
        var res = array;
        if (array instanceof Array) res = array.length > 1? array.join('][') + ']' : array[0];
        return '' + res;
    },
    
    /**
     * Swaps keys and values in the hash (i.e. converts { a: 'Ayval', b: 'Beeval' } to { Ayval: 'a', Beeval: 'b' }. 
     * Doesn't do checks for invalid or duplicate values.
     * 
     * @param {object} hash Object to have keys and values reversed
     * @return {object}
     */
    swapKeysValues: function(hash) {
       if (!hash || (typeof hash !== 'object')) throw Error("`hash` must be a non-null object");
       var res = {};
       for (var i in hash) if (hash.hasOwnProperty(i)) res[hash[i]] = i;
       return res;
    }
    
};
/* global Amm */
// Amm.extend(Amm.Expression.Token, Amm.Util)

Amm.Expression.Token = function(string, type, value, offset) {
    this.string = string;
    this.type = type;
    this.value = value;
    this.offset = offset;
};

Amm.Expression.Token.Type = {
    WHITESPACE: 1,
    SYMBOL: 2,
    WORD: 3,
    INTEGER: 4,
    FLOAT: 5,
    ILLEGAL: 6,
    SINGLE_QUOTED_STRING: 15,
    DOUBLE_QUOTED_STRING: 16,
    REGEXP: 17
};

Amm.Expression.Token.Keyword = {
    NEW: 'new',
    INSTANCEOF: 'instanceof',
    TYPEOF: 'typeof'
};

Amm.Expression.Token._swappedKeywords = Amm.Util.swapKeysValues(Amm.Expression.Token.Keyword);

Amm.Expression.Token.prototype = {

    string: undefined,
    
    type: undefined,
    
    value: undefined,
    
    offset: undefined,
    
    toArray: function() {
        return [this.string, this.type, this.value];
    },
    
    isSymbol: function(oneOf) {
        if (this.type !== Amm.Expression.Token.Type.SYMBOL) return false;
        if (!oneOf) return true;
        if (oneOf instanceof Array) return Amm.Array.indexOf(this.string, oneOf) >= 0;
        if (arguments.length === 1) return (this.string === oneOf);
        var args = Array.prototype.slice.apply(arguments);
        return Amm.Array.indexOf(this.string, args) >= 0;
    },
    
    isIdentifier: function() {
        return this.type === Amm.Expression.Token.Type.WORD;
    },
    
    isConstant: function() {
        return this.type === Amm.Expression.Token.Type.INTEGER 
            || this.type === Amm.Expression.Token.Type.FLOAT 
            || this.type === Amm.Expression.Token.Type.SINGLE_QUOTED_STRING
            || this.type === Amm.Expression.Token.Type.DOUBLE_QUOTED_STRING
            || this.type === Amm.Expression.Token.Type.REGEXP;
    }
};
/* global Amm */
//Amm.extend(Amm.Expression.Parser, Amm.Expression);

Amm.Expression.Parser = function() {
};

Amm.Expression.Parser.prototype = {
    
    'Amm.Expression.Parser': '__CLASS__',
    
    /**
     * 1 - whitespace
     * 2 - identifier or reserved word
     * 3 - number
     * 4 - tokens
     */
    tokensRx: /^(?:(\s+)|(typeof|instanceof|new|!!|\?\?|\.\.|::|->|&&|\|\||!==|!=|===|==|>=|<=|=>|[-&|+><\{\}$?!.,:\[\]()'"%*/])|([_a-zA-Z][_a-zA-Z0-9]*)|(0[xX]?[0-9]+)|([0-9]+(?:\.[0-9+])?(?:e[+-]?[0-9]+)?)|(.))/,
    
    regexTokens: /^(?:(\.)|([[\]()\/])|([^\\\[n\]()\/]+))/,
    
    regexFlags: /^[a-zA-Z]+/,
    
    stringSingleQuoteRx: /^((?:\\.)|')|[^\\']+/,
    
    stringDoubleQuoteRx: /^((?:\\.)|")|[^\\"]+/,
    
    unescapes: {
        '\\"': '"',
        "\\'": "'",
        "\\n": '\n',
        "\\r": '\r',
        "\\t": '\t',
        "\\v": '\v',
        "\\0": '\0',
        "\\f": '\f',
        "\\\\": '\\'
    },
    
    genFn: null,
    
    genObj: null,
    
    decorateFn: null,
    
    decorateObj: null,
    
    src: null,
    
    _lastNonWhitespace: null,
    
    _tokens: undefined,

    _oldPos: 0,    
    
    _pos: 0,
    
    _ignoreWhitespace: true,
    
    _fetches: 0,
    
    /**
     * string - the rest of the buffer without starting quote
     * doubleQuote - starting quote was double quote, not single quote
     * returns array: [result, processed length]
     */
    
    getString: function(string, doubleQuote) {
        var str = '', 
            buf = '' + string,
            quote = doubleQuote? '"' : "'",
            rx = doubleQuote? this.stringDoubleQuoteRx : this.stringSingleQuoteRx;
        while (buf) {
            var match = rx.exec(buf);
            if (!match) Error("Assertion: cannot match string part (shouldn't happen)");
            if (match[1] === quote) {
                break;
            };
            if (match[1]) {
                str += this.unescapes[match[1]] || match[1][1];
            }
                else str += match[0];
            buf = buf.slice(match[0].length);
        }
        return [str, string.length - buf.length];
    },
    
    /**
     * @returns {Amm.Expression.Token} 
     * string: regex definition; type: REGEXP; value: {RegExp}
     */
    getRegex: function(string) {
        var brackets = false; // we're in square brackets
        var buf = '' + string, res = '';
        var content = '', flags = '';
        var end = false;
        var match;
        var val;
        if (!buf || !buf[0] === '/') return; // not a regex
        res += buf[0];
        buf = buf.slice(1);
        while(buf && !end) {
            match = this.regexTokens.exec(buf);
            if (!match) Error("Assertion - shouldn't happen");
            if (match[2]) {
                if (match[2] === '[' && !brackets) brackets = true;
                else if (match[2] === ']' && brackets) brackets = false;
                else if (match[2] === '/' && !brackets) end = true;
            } 
            if (!end) content += match[0];
            res += match[0];
            buf = buf.slice(match[0].length);
        }
        if (!end) return;
        if (end) {
            match = this.regexFlags.exec(buf);
            if (match) {
                res += match[0];
                flags = match[0];
                buf = buf.slice(match[0]);
            }
        };
        try {
            val = new RegExp(content, flags);
        } catch(e) {
            throw {
                msg: "Cannot parse regex: " + e,
                origException: e,
                pos: 0
            };
        }
        return new Amm.Expression.Token(res, Amm.Expression.Token.Type.REGEXP, val);
    },
    
    /**
     * @returns array [string, tokenId, value]
     */
    getToken: function(string, lastNonWhitespace) {
        lastNonWhitespace = lastNonWhitespace || this._lastNonWhitespace;
        var rx = this.tokensRx.exec(string), id, value;
        if (!rx) {
            Error("Assertion: match next token (shouldn't happen)");
        }
        if (rx[1]) id = Amm.Expression.Token.Type.WHITESPACE;
        else if (rx[2]) {
            if (rx[2] === '"' || rx[2] === "'") {
                var sc = this.getStringConstantToken(string);
                if (sc) {
                    return sc;
                }
            } else if (rx[2] === '/') {
                if (!lastNonWhitespace || this.regexPossible(lastNonWhitespace)) {
                    var regex = this.getRegex(string);
                    if (regex) return regex;
                }
            }
            id = Amm.Expression.Token.Type.SYMBOL;
        }
        else if (rx[3]) id = Amm.Expression.Token.Type.WORD;
        else if (rx[4]) {
            id = Amm.Expression.Token.Type.INTEGER;
            if (rx[4][0] === '0' && (rx[4][1] !== 'x' && rx[4][1] !== 'X'))
                value = parseInt(rx[4], 8);
            else value = parseInt(rx[4]);
            
        }
        else if (rx[5]) {
            id = Amm.Expression.Token.Type.FLOAT;
            value = parseFloat(rx[5]);
        } else if (rx[6]) id = Amm.Expression.Token.Type.ILLEGAL;
        var res = new Amm.Expression.Token(rx[0], id, value);
        return res;
    },
    
    regexPossible: function(lastNonWhitespace) {
        var res = false;
        // TODO: check for keywords like instanceof, typeof etc - if any
        if (lastNonWhitespace.type === Amm.Expression.Token.Type.SYMBOL) res = true;
        return res;
    },
    
    getStringConstantToken: function(string, quote) {
        var quote = string[0];
        var tmp = string.slice(1);
        if ((quote !== "'" && quote !== '"') || !tmp.length) return;
        var double = (quote === '"');
        var str = this.getString(tmp, double);
        var closed = false;
        tmp = tmp.slice(str[1]);
        if (tmp[0] === quote) {
            closed = true;
            tmp = tmp.slice(1);
        }
        if (!closed) {
            throw {
                message: "Unmatched " + (double? 'double' : 'single') + " quote",
                pos: string.length - tmp.length,
                string: string
            };
        };
        var type = double? 
            Amm.Expression.Token.Type.DOUBLE_QUOTED_STRING : 
            Amm.Expression.Token.Type.SINGLE_QUOTED_STRING;
        var res = new Amm.Expression.Token(string.slice(0, string.length - tmp.length), type, str[0]);
        return res;
    },
    
    getAllTokens: function(string) {
        var _offset = 0;
        var buf = '' + string, res = [];
        var e;
        this._lastNonWhitespace = null;
        while (buf.length) {
            try {
                var token = this.getToken(buf);
                token.offset = _offset;
                if (!token.string.length) Error("WTF");
                buf = buf.slice(token.string.length);
                _offset += token.string.length;
                res.push(token);
                if (token.type !== Amm.Expression.Token.Type.WHITESPACE) {
                    this._lastNonWhitespace = token;
                }
            } catch(e) {
                if (e.pos) {
                    e.pos += (string.length - buf.length);
                    e.string = string;
                } else {
                    e = {
                        message: e,
                        pos: string.length - buf.length,
                        string: string
                    };
                }
                throw e;
            }
        }
        return res;
    },
    
    begin: function(string) {
        this._tokens = this.getAllTokens(string);
        this._pos = -1;
        this._fetches = 0;
    },

    _binaryPriority: [ // from lowest precedence to highest
        ['||'],
        ['&&'],
        ['!==', '===', '!=', '=='],
        ['>', '<', '>=', '<='],
        ['+', '-'],
        ['*', '/', '%'],
        ['instanceof']
    ],
    
    genOp: function(opType, _) {
        var a = Array.prototype.slice.apply(arguments);
        var res;
        if (this.genFn) {
            res = this.genFn.apply(this.genObj || this, a);
        } else {
            res = a;
        }
        if (this.decorateFn) {
            var _o = this._oldPos + 1;
            var tokens = this._tokens.slice(_o, this._pos + 1);
            if (tokens.length) {
                var lastToken = tokens[tokens.length - 1];
                var i = 0;
                if (this._ignoreWhitespace) {
                    while (tokens[i].type === Amm.Expression.Token.Type.WHITESPACE) {
                        i++;
                    }
                }
                var firstToken = tokens[i];
                var beginPos = firstToken.offset;
                var endPos = lastToken.offset + lastToken.string.length;
                this.decorateFn.call(this.decorateObj || this, res, beginPos, endPos, this.src, tokens.slice(i));
            }
        }
        return res;
    },
    
    parseExpression: function() {
        return this.parsePart('Conditional');
    },
    
    parseConditional: function() {
        var condition, trueOp, falseOp;
        
        condition = this.parsePart('Binary');
        
        if (!condition) return;
        
        var token = this.fetch();
        if (token && token.isSymbol('?')) {
            trueOp = this.parsePart('Expression');
            if (!trueOp) Error("Expected: expression");
            token = this.fetch();
            if (token && token.isSymbol(':')) {
                falseOp = this.parsePart('Expression');
                if (!falseOp) Error("Expected: expression");
                return this.genOp('Conditional', condition, trueOp, falseOp);
            } else {
                Error("Expected: ':'");
            }
        } else {
            if (token) this.unfetch();
        }
        return condition;
    },
    
    parseBinary: function(level) {
        if (!level) level = 0;
        if (level >= this._binaryPriority.length) {
            return this.parsePart('Unary');
        }
        var left, op, right;
        left = this.parsePart('Binary', level + 1);
        var token = this.fetch();
        if (!token) return left;
        if (token.isSymbol(this._binaryPriority[level])) {
            op = token;
            right = this.parsePart('Binary', level);
            if (!right) Error("Expected: binary " + this._binaryPriority[level].join(", ") + " operand");
            return this.genOp('Binary', left, op.string, right);
        }
        this.unfetch();
        return left;
    },
    
    parseUnary: function() {
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('!', '-', '!!', 'typeof')) {
            var expr = this.parsePart('Unary');
            if (!expr) Error("Expected: unary");
            return this.genOp('Unary', token.string, expr);
        } else {
            this.unfetch();
            return this.parsePart('New');
        }
    },
    
    parseList: function() {
        var exps = [], exp;
        exp = this.parsePart('Expression');
        if (!exp) return;
        exps.push(exp);
        do {
            var token = this.fetch();
            if (token.isSymbol(',')) {
                exp = this.parsePart('Expression');
                if (!exp) Error("Expected: expression");
                exps.push(exp);
            } else {
                this.unfetch();
                break;
            }
        } while(1);
        return this.genOp('List', exps);
    },
    
    parseNew: function() {
        var token = this.fetch();
        if (!token.isSymbol(Amm.Expression.Token.Keyword.NEW)) {
            this.unfetch();
            return this.parsePart('Item');
        }
        var op = this.parseNew();
        if (!op) op = this.parsePart('Item');
        if (!op) throw Error("Expected: new or value");
        return this.genOp('New', op);
    },
    
    parseItem: function() {
        var value = this.parsePart(true, 'Value');
        var op = this.parsePart(true, 'AccessOperator', value);
        if (op) return op;
        return value;
    },
    
    parseAccessOperator: function(value) {
        var sub;
        sub = 
                    this.parsePart(true, 'FunctionCall', value)
                ||  this.parsePart(true, 'PropertyAccess', value) 
                ||  this.parsePart(true, 'ComponentElement', value) 
                ||  this.parsePart(true, 'Range', value);
        
        if (sub) {
            var right = this.parsePart(true, 'AccessOperator', sub);
            if (right) return right;
            return sub;
        }
    },
    
    parseFunctionCall: function(value) {
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('(')) {
            this.unfetch();
            return;
        }
        var args = this.parsePart('List') || [];
        token = this.fetch();
        if (!token || !token.isSymbol(')')) Error("Expected: ')'");
        var cacheability = this.parsePart('CacheabilityModifier');
        return this.genOp('FunctionCall', value, args, cacheability === undefined? null : cacheability);
    },
    
    parsePropertyAccess: function(value) {
        var token = this.fetch();
        var prop;
        var brackets = false;
        var args = null;
        var cacheability = null;
        if (!token) return;
        if (token.isSymbol('.')) {
            var tmp = this._oldPos;
            this._oldPos = this._pos;
            var token = this.fetch();
            if (token && token.isIdentifier()) {
                prop = this.genOp('Constant', token.string); // use identifier as constant property name
            } else {
                this._oldPos = tmp;
                Error("Expected: identifier");
            }
            this._oldPos = tmp;
        } else {
            this.unfetch();
            prop = this.parsePart('Subexpression');
            if (prop) brackets = true;
            else return;
        }
        args = this.parsePart('PropertyArgs');
        cacheability = this.parsePart('CacheabilityModifier');
        return this.genOp('PropertyAccess', value, prop || null, args || null, brackets, cacheability || null);
    },
    
    parseCacheabilityModifier: function() {
         var token = this.fetch();
         if (!token) return;
         if (token.isSymbol('!!', '??')) return this.genOp('CacheabilityModifier', token.string);
         this.unfetch();
    },
    
    parseSubexpression: function() {
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('[')) {
            this.unfetch();
            return;
        }
        var expr = this.parsePart('Expression');
        if (!expr) Error("Expected: expression");
        var token = this.fetch();
        if (!token || !token.isSymbol(']')) Error("Expected: ']'");
        return this.genOp('Subexpression', expr);
    },
    
    parsePropertyArgs: function() {
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('::')) {
            this.unfetch();
            return;
        }
        var isList = false;
        var args = [], arg;
        do {
            token = this.fetch();
            if (!token) break;
            if (token.isSymbol('{')) {
                args = this.parsePart('List');
                if (!args) Error("Expected: list");
                token = this.fetch();
                if (!token || !token.isSymbol('}')) Error("Expected: '}'");
                isList = true;
                break;
            } else if (token.isSymbol('::')) {
                arg = this.genOp('Constant', undefined); // skipped item - undefined
            } else if (token.isIdentifier()) {
                arg = this.genOp('Constant', token.string); // use identifier as constant getter arg
            } else if (token.isConstant()) {
                arg = this.genOp('Constant', token.value);
            } else {
                this.unfetch();
                break;
            }
            args.push(arg);
        } while(true);
        if (!isList && !args.length) args = [undefined];
        return this.genOp('PropertyArgs', args, isList);
    },

    parseComponentElement: function(value) {    
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('->')) {
            this.unfetch();
            return;
        }
        var specifier = undefined;
        var rangeOnly = false;
        token = this.fetch();
        if (!(token && (token.isSymbol('{', '[') || token.isIdentifier()))) 
            Error("Expected: identifier, subexpression or range");
        if (token.string === '{') {
            rangeOnly = true;
        }
        if (!token.isIdentifier()) this.unfetch();
        if (!rangeOnly && token.isIdentifier()) {
            specifier = this.genOp('Constant', token.string);
        } else {
            if (!rangeOnly) {
                specifier = this.parsePart('Subexpression');
                if (!specifier) {
                    Error("Expected: subexpression");
                }
            }
        }
        var op = this.genOp('ComponentElement', value, specifier, null);
        var range = this.parsePart('Range', op);
        return range || op;
    },
    
    // parses [$key =>] $value: construct for ranges
    parseLoopIdentifiers: function() {
        var varName = this.parsePart('Variable', true);
        var keyName;
        if (!varName) return;
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('=>')) {
            keyName = varName;
            token = this.fetch();
            if (token.isSymbol(':')) {
                varName = null; // we have key name but not var name
            } else {
                this.unfetch();
                varName = this.parsePart('Variable', true);
                if (!varName) Error("Expected: variable");
                token = this.fetch();
                if (!token || !token.isSymbol(':')) Error("Expected: ':'");
            }
            return this.genOp('LoopIdentifiers', varName, keyName);
        } else if (token.isSymbol(':')) {
            return this.genOp('LoopIdentifiers', varName, null);
        } else {
            this.unfetch();
            if (varName) { // un-fetch fetched variable
                this.unfetch();
                this.unfetch();
            } 
        }
    },
    
    parseRange: function(value) {
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('{')) {
            this.unfetch();
            return;
        }
        var token = this.fetch();
        var rangeType, arg1 = null, arg2 = null;
        if (token.isSymbol('*')) {
            rangeType = 'All';
        } else if (token.isConstant() && token.type === Amm.Expression.Token.Type.INTEGER) {
            rangeType = 'Index';
            arg1 = this.genOp('Constant', token.value);
        } else if (token.isConstant() && token.type === Amm.Expression.Token.Type.REGEXP) {
            rangeType = 'RegExp';
            arg1 = this.genOp('Constant', token.value);
        } else {
            if (token.isSymbol('..')) { // first item of range skipped
                rangeType = 'Slice';
                arg1 = null;
                token = this.fetch();
                if (token.isSymbol('}')) {
                    arg2 = null;
                    this.unfetch();
                    // note: { .. } is NOT same as { * }, because { .. } returns a COPY of array contents
                } else {
                    this.unfetch();
                    arg2 = this.parsePart('Expression');
                }
            } else {
                this.unfetch();
                var loopId = this.parsePart('LoopIdentifiers');
                var arg1 = this.parsePart('Expression');
                if (!arg1) {
                    Error("Expected: expression");
                }
                if (loopId) { // {loopIdentifiers expression} is Condition
                    rangeType = 'Condition';
                    arg2 = loopId;
                } else {
                    token = this.fetch();
                    if (token.isSymbol('..')) { // {expression..}
                        rangeType = 'Slice';
                        arg2 = this.parsePart('Expression');
                    } else { // {expression} is Index
                        this.unfetch();
                        rangeType = 'Index';
                    }
                }
            }
        }
        token = this.fetch();
        if (!token || !token.isSymbol('}')) Error("Expected: '}'");
        return this.genOp('Range', rangeType, value, arg1, arg2);
    },

    parseVariable: function(getNameOnly) {
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('$')) { // the variable
            token = this.fetch();
            if (token && token.isIdentifier()) {
                if (getNameOnly) return this.genOp('Constant', token.string);
                return this.genOp('Variable', token.string);
            } else {
                Error("Expected: identifier");
            }
        } else {
            this.unfetch();
        }
    },
    
    parseValue: function() {
        var variable = this.parsePart('Variable');
        if (variable) return variable;
        var token = this.fetch();
        if (token.isSymbol('(')) { // the sub-expression
            var exp = this.parsePart('Expression');
            if (!exp) Error("Expected: expression");
            token = this.fetch();
            if (!token || !token.isSymbol(')')) Error("Expected: ')'");
            return this.genOp('Parenthesis', exp);
        }
        if (token.isConstant()) { // constant
            return this.genOp('Constant', token.value);
        }
        if (token.isIdentifier()) { // identifier
            var l = token.string.toLowerCase();
            if (l === 'true') return this.genOp('Constant', true);
            if (l === 'false') return this.genOp('Constant', false);
            if (l === 'null') return this.genOp('Constant', null);
            if (l === 'undefined') return this.genOp('Constant', undefined);
            return this.genOp('Identifier', token.string);
        }
        this.unfetch();
    },
    
    unfetch: function() {
        return this.fetch(false, true);
    },
    
    fetch: function(noAdvance, reverse) {
        
        if (this._fetches++ > 10000) Error("Guard: too much fetches (TODO: remove)");
        if (!this._tokens) return null;
        var res = null, d = reverse? -1 : 1, p = this._pos;
        do {
            res = this._tokens[p + d] || null;
            if (res || reverse) p = p + d;
        } while (res && (this._ignoreWhitespace && res.type === Amm.Expression.Token.Type.WHITESPACE));
        if ((res || reverse) && !noAdvance) this._pos = p;
        return res;
    },

    // Has optional first argument "true" - don't save offset
    parsePart: function(part, args_) {
        var args = Array.prototype.slice.call(arguments, 1);
        var res;
        var dontSaveOffset = false;
        if (part === true) {
            dontSaveOffset = true;
            part = args.shift();
        }
        if (!part) Error("`part` is required to be non-empty string");
        var method = 'parse' + part;
        if (typeof this[method] !== 'function') Error("Amm.Expression.Parser: no such method: '" + method + "'");
        if (part === 'Part') Error("WTF");
        var tmp = this._oldPos;
        if (!dontSaveOffset) this._oldPos = this._pos;
        if (!args.length) {
            res = this[method]();
        } else if (args.length === 1) {
            res = this[method](args[0]);
        } else {
            res = this[method].apply(this, args);
        }
        if (!dontSaveOffset) this._oldPos = tmp;
        return res;
    },
    
    parse: function(string) {
        var res;
        this.src = string;
        this._oldPos = 0;
        this.begin(string);
        res = this.parsePart('Expression');
        var token = this.fetch();
        if (token) Error("Expected: eof");
        return res;
    }
    
};
/* global Amm */
/* Amm.Extend (Amm.Expression.Builder, Amm.Operator) */

/**
 * Converts AST, which was returned by Amm.Expression.Parser, into ready-to-evaluate tree of Amm.Operator instances
 */

Amm.Expression.Builder = function() {
};

Amm.Expression.Builder.prototype = {

    build: function(lexType, _) {
        var args = Array.prototype.slice.call(arguments, 1);
        var method = lexType;
        if (!this[method]) throw Error("Uknown/unsupported lexeme: " + method);
        return this[method].apply(this, args);
    },
    
    decorate: function(subject, beginPos, endPos, src, tokens) {
        if (subject && subject['Amm.Operator']) {
            subject.beginPos = beginPos;
            subject.endPos = endPos;
        }
    },

    configureParser: function(parser) {
        parser.genFn = this.build;
        parser.genObj = this;
        parser.decorateFn = this.decorate;
        parser.decorateObj = this;
    },
    
    const: function(value) {
        if (value && value.Const) return value;
        return {'Const': true, const: value};
    },
    
    unConst: function(value, arr) {
        if (value && value.Const) return value.const;
        if (arr && value instanceof Array) {
            var r = [];
            for (var i = 0, l = value.length; i < l; i++) {
                r.push(this.unConst(value[i]));
            }
            return r;
        }
        return value;
    },
    
    Identifier: function(ident) {
        if (ident === 'this') {
            return new Amm.Operator.ExpressionThis;
        }
        if (ident === 'root') {
            return new Amm.getRoot();
        }
        return new Amm.Operator.ScopeElement(
            new Amm.Operator.ExpressionThis,
            this.unConst(ident)
        );   
    },
    
    Conditional: function(condition, trueValue, falseValue) {
        return new Amm.Operator.Conditional(
            this.unConst(condition), 
            this.unConst(trueValue),
            this.unConst(falseValue)
        );
    },
    
    binaryFn: function(left, operator, right) {
        switch (operator) {
            case '!==': return left !== right;
            case '===': return left === right;
            case '==':  return left === right;
            case '!=':  return left != right;
            case '+':   return left + right;
            case '-':   return left - right;
            case '*':   return left * right;
            case '/':   return left / right;
            case '%':   return left % right;
            case '>':   return left > right;
            case '<':   return left < right;
            case '<=':  return left <= right;
            case '>=':  return left >= right;
        }
        throw Error("Unknown operator: " + operator);
    },
    
    Binary: function(left, operator, right) {
        if (left && left.Const && right && right.Const) {
            return this.const(this.binaryFn(this.unConst(left), operator, this.unConst(right)));
        }
        return new Amm.Operator.Binary(
            this.unConst(left), 
            this.unConst(operator), 
            this.unConst(right)
        );
    },
    
    Unary: function(operator, operand) {
        if (operand.Const) {
            if (operator === '!') return this.const(!this.unConst(operand));
            else if (operator === '-') return this.const(- this.unConst(operand));
            else if (operator === '!!') return this.const(!! this.unConst(operand));
            else if (operator === 'typeof') return typeof this.unConst(operand);
            else throw Error("Unknown unary operator: '" + operator + "'");
        } else {
            return new Amm.Operator.Unary(
                operator, 
                this.unConst(operand)
            );
        }
    },
    
    List: function(arrOperands) {
        return new Amm.Operator.List(this.unConst(arrOperands, true));
    },
    
    Constant: function(value) {
        return this.const(value);
    },
    
    // The problem with function calls is that we have to remember
    // 'this' object! so we have to distinguish between var-function call
    // and property-function call
    FunctionCall: function(value, args, cacheability) {
        if (value && value['Amm.Operator.Property'] && !value.hasArguments()) {
            value.promoteToCall(args, cacheability);
            return value;
        }
        return new Amm.Operator.FunctionCall(this.unConst(value), args, cacheability);
    },
    
    New: function(value) {
        if (value && value['Amm.Operator.Property'] && !value._parenthesis && value.getIsCall()) {
            value.promoteToNew();
            return value;
        }
        if (value && value['Amm.Operator.FunctionCall'] && !value._parenthesis) {
            value._isNew = true;
            return value;
        }
        return new Amm.Operator.FunctionCall(this.unConst(value), null, true, true);
    },
    
    PropertyAccess: function(object, property, args, brackets, cacheability) {
        return new Amm.Operator.Property(
            this.unConst(object), 
            this.unConst(property), 
            this.unConst(args), 
            cacheability
        );
    },
    
    CacheabilityModifier: function(modifier) {
        return modifier === '!!'? true : false;
    },
    
    Subexpression: function(expr) {
        return expr;
    },
    
    Parenthesis: function(expr) {
        if (expr['Amm.Operator']) {
            expr._parenthesis = true;
        }
        return expr;
    },
    
    Variable: function(varName) {
        return new Amm.Operator.Var(varName);
    },
    
    PropertyArgs: function(args, isList) {
        return this.unConst(args, true);
    },
    
    ComponentElement: function(component, specifier, range) {
        return new Amm.Operator.ComponentElement(
            this.unConst(component), 
            this.unConst(specifier),
            this.unConst(range),
            false,
            specifier === undefined
        );
    },
    
    LoopIdentifiers: function(varName, keyName) {
        return {keyVar: keyName, valueVar: varName};
    },
    
    Range: function(rangeType, value, arg1, arg2) {
        var simpleRangeSupport = value && 
                (value['Amm.Operator.ComponentElement'] 
                || value['Amm.Operator.ScopeElement']);
        var res;
        if (rangeType === 'All') {
            if (simpleRangeSupport) {
                value._setOperand('range', '*');
                res = value;
            } else {
                res = new Amm.Operator.Range.All(this.unConst(value));
            }
        } else if (rangeType === 'Index') {
            if (simpleRangeSupport) {
                value._setOperand('range', this.unConst(arg1));
                res = value;
            } else {
                res = new Amm.Operator.Range.Index(this.unConst(value), this.unConst(arg1));
            }
        } else if (rangeType === 'RegExp') {
            res = new Amm.Operator.Range.RegExp(this.unConst(value), this.unConst(arg1));
        } else if (rangeType === 'Slice') {
            res = new Amm.Operator.Range.Slice(this.unConst(value), this.unConst(arg1), this.unConst(arg2));
        } else if (rangeType === 'Condition') {
            // TODO: fall to always-all or always-empty range in case condition (arg1) is constant
            res = new Amm.Operator.Range.Condition(
                this.unConst(value), 
                this.unConst(arg1), 
                this.unConst(arg2.keyVar), 
                this.unConst(arg2.valueVar)
            );
        } else {
            Error("Uknown range type: '" + rangeType + "'");
        }
        if (simpleRangeSupport) {
            if (!value._rangeOperator && value._rangeValue === null) {
                value._setOperand('range', '*');
            }
        }
        return res;
    }
    
};
/* global Amm */

Amm.Remote.Mapper = function(options) {
    
    this.patterns = [];
    
};

Amm.Remote.Mapper.prototype = {
    
    setPatterns: function(patterns) {
        
    }
    
};
/* global Amm */

Amm.Remote.Uri = function(options) {
    if (options === null || options === undefined) {
        options = '';
    }
    if (typeof options === 'string') {
        options = {uri: options};
    } else if (options && options['Amm.Remote.Uri']) {
        this._clone(options);
        options = undefined;
    } else if (options && typeof[options.toString] === 'function') {
        options = {uri: options.toString()};
    } else {
        if (options.uri) {
            options = Amm.override({}, options);
            this.setUri(options.uri);
            delete options.uri;
        }
    }
    Amm.WithEvents.call(this, options);
};

Amm.Remote.Uri.PART_SCHEME = 'SCHEME';
Amm.Remote.Uri.PART_USER = 'USER';
Amm.Remote.Uri.PART_PASSWORD = 'PASSWORD';
Amm.Remote.Uri.PART_HOST = 'HOST';
Amm.Remote.Uri.PART_PORT = 'PORT';
Amm.Remote.Uri.PART_PATH = 'PATH';
Amm.Remote.Uri.PART_QUERY = 'QUERY';
Amm.Remote.Uri.PART_FRAGMENT = 'FRAGMENT';

Amm.Remote.Uri._current = null;

Amm.Remote.Uri.getCurrent = function() {
    if (Amm.Remote.Uri._current) {
        return new Amm.Remote.Uri(Amm.Remote.Uri._current);
    } 
    if (window.location && window.location.href) {
        return new Amm.Remote.Uri(window.location.href);
    }
};

Amm.Remote.Uri.setCurrent = function(currentUri) {
    if (currentUri) Amm.Remote.Uri._current = new Amm.Remote.Uri('' + currentUri);
    else Amm.Remote.Uri._current = null;
};

Amm.Remote.Uri._const = {
    
    'SCHEME': '_scheme',
    'USER': '_user',
    'PASSWORD': '_pass',
    'HOST': '_host',
    'PORT': '_port',
    'PATH': '_path',
    'QUERY': '_query',
    'FRAGMENT': '_fragment'
    
};

Amm.Remote.Uri.prototype = {

    'Amm.Remote.Uri': '__CLASS__', 
    
    'RequestProvider': '__INTERFACE__',

    _scheme: null,

    _user: null,

    _pass: null,

    _host: null,

    _port: null,

    _path: null,
    
    _query: null,

    _fragment: null,
    
    _uri: null,
    
    _updateLevel: 0,
    
    _oldUri: null,
    
    _strQuery: null,

    setUri: function(uri, part) {
        if (part === undefined || part === null || part === '') {
            if (uri && uri['Amm.Remote.Uri']) {
                this._clone(uri);
            } else {
                this._parse(uri);
            }
            return;
        }
        if (Amm.Remote.Uri._const[part]) {
            this.beginUpdate();
            if (part === 'QUERY' && typeof uri !== 'object') {
                this._strQuery = uri || '';
                this._query = this._parseQuery(uri);
            }
            else this[Amm.Remote.Uri._const[part]] = '' + uri;
            this.endUpdate();
            return;
        }
        this.beginUpdate();
        var c = {};
        this._query = Amm.Util.setByPath(this._query, Amm.Util.pathToArray(part), uri, c);
        if (c.changed) this._strQuery = null;
        this.endUpdate();
    },
    
    getUri: function(part, asString) {
        if (!part) {
            if (this._uri !== null) return this._uri;
            return this._build();
        }
        if (asString && part === Amm.Remote.Uri.PART_QUERY) {
            if (this._strQuery === null) {
                this._strQuery = this._buildQuery(this._query, '', true);
            }
            return this._strQuery;
        }
        if (Amm.Remote.Uri._const[part]) return this[Amm.Remote.Uri._const[part]];
        return Amm.Util.getByPath(this._query, Amm.Util.pathToArray(part));
    },
    
    setUriOverrides: function(uriOverrides) {
        if (!uriOverrides) return;
        if (typeof uriOverrides !== 'object')
            throw Error("uriOverrides must be an object");
        var o = uriOverrides? Amm.override({}, uriOverrides) : {};
        this.beginUpdate();
        for (var i in o) if (o.hasOwnProperty(i)) {
            if (Amm.Remote.Uri._const[i]) {
                this.setUri(o[i], i);
                delete o[i];
            }
        }
        if (!this._query) this._query = {};
        Amm.overrideRecursive(this._query, o);
        this.endUpdate();
    },
    
    _clone: function(otherUri) {
        if (this._subscribers) this.beginUpdate();
        for (var i in Amm.Remote.Uri._const) {
            if (Amm.Remote.Uri._const.hasOwnProperty(i)) {
                this[Amm.Remote.Uri._const[i]] = otherUri[Amm.Remote.Uri._const[i]];
            }
            this._strQuery = otherUri._strQuery;
            this._uri = null;
        }
        if (this._subscribers) this.endUpdate();
    },
    
    outRequestChangeNotify: function() {
        return this._out('requestChangeNotify', this);
    },
    
    outUriChange: function(uri, oldUri) {
        return this._out('uriChange', uri, oldUri);
    },
    
    produceRequest: function() {
        return new Amm.Remote.ConstRequest({
            uri: this.getUri(),
            method: Amm.Remote.ConstRequest.METHOD_GET
        });
    },
    
    beginUpdate: function() {
        if (!this._updateLevel) {
            this._oldUri = this.getUri();
        }
        this._updateLevel++;
    },
    
    endUpdate: function() {
        if (!this._updateLevel) {
            throw Error("call to endUpdate() without prior beginUpdate()");
        }
        this._updateLevel--;
        if (this._updateLevel) return;
        var newUri = this._build(), oldUri = this._oldUri;
        this._oldUri = null;
        if (newUri !== oldUri) {
            this.outUriChange(newUri, oldUri);
            this.outRequestChangeNotify();
        }
    },
    
    _isSimpleNumArray: function(data, paramName) {
        if (!(data instanceof Array)) return false;
        var res = '';
        for (var i = 0, l = data.length; i < l; i++) {
            if (!(i in data) || data[i] === undefined || typeof data[i] === 'object') return false;
            res += '&' + paramName + '[]=' + encodeURIComponent(data[i]);
        }
        return res;
    },
    
    _buildQuery: function(data, paramName, stripLeadingAmpersand) {
        var res = '', i, n;
        if (data === undefined) return '';
        if ((n = this._isSimpleNumArray(data, paramName)) !== false) {
            res = n;
        } else if (data instanceof Array) {
        	if (data.length) {
	            for (i = 0; i < data.length; i++) {
                        res = res + this._buildQuery(data[i], paramName? paramName + '[' + i + ']' : i);
	            }
        	} else {
                    res = '&' + paramName + '=';
        	}
        } else {
            if ((typeof data) === 'object') {
                for (i in data) if (data.hasOwnProperty(i)) {
                    res = res + this._buildQuery(data[i], paramName? paramName + '[' + i + ']' : i);
                }
            } else {
                res = '&' + paramName + '=' + encodeURIComponent(data);
            }
        }
        if (stripLeadingAmpersand && res.length) res = res.slice(1);
        return res;
    },
    
    _parseQuery: function(string, delim, eq) {
        if (string === null || string === undefined) return null;
        
        if (!string.length) return {};
    	if (delim === undefined) delim = '&';
    	if (eq === undefined) eq = '=';
    	
    	var pairs = string.split(delim), l = pairs.length, res = [];
    	for (var i = 0; i < l; i++) {
            var nameVal = pairs[i].split(eq, 2), path = nameVal[0].replace(']', '');
            path = path.replace(/\]/g, '').split('[');
            if (nameVal.length < 2) nameVal.push('');
            res = Amm.Util.setByPath(res, path, nameVal[1]);
    	}
    	return res;
    },
            
    toString: function() {
        return this.getUri();
    },
    
    _parse: function(strUri) {
        strUri = '' + strUri;
        // need slashes to parse mailto:
        if (strUri[0] === 'm' && strUri[6] === ':') strUri = strUri.replace(/^mailto:/, 'mailto://'); 
        this.beginUpdate();
        // Credit for regular expression and keys length: JSURI project - http://code.google.com/p/jsuri/ 
        // (modified so host isn't required, to properly handle relative URIs)
        var regex = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?(((\/?(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
        var keys = [
            ".source",
            "_scheme",
            ".authority",
            ".userInfo",
            "_user",
            "_pass",
            "_host",
            "_port",
            ".relative",
            "_path",
            ".directory",
            ".file",
            "_strQuery",
            "_fragment"
        ];
        var h = {};
        var r = regex.exec(strUri);
        for (var i = keys.length - 1; i >= 0; i--) {
            var k = keys[i];
            if (k[0] !== '.') {
                if (r[i] === undefined) this[k] = null;
                else this[k] = r[i];
            }
            h[k] = r[i];
        }
        this._query = this._parseQuery(this._strQuery);
        
        // TODO: somewhere here we may need to unmap our URI???
        this.endUpdate();
    },
    
    _build: function(withQuery) {
        if (withQuery === undefined) withQuery = true;
        var res = '', q;
        if (this._scheme) res += this._scheme + ':';
        if (this._host) {
            if (this._scheme !== 'mailto') res += '//';
            if (this._user || this._pass) {
                res += this._user;
                if (this._pass) res += ':' + this._pass;
                res += '@';
            }
            res += this._host;
            res += this._port ? ':' + this._port : '';
        }
        if (this._path) {
            if (res && this._path[0] !== '/') res += '/';
            res += this._path;
        }
        
        if (withQuery && this._query) {
            if (this._strQuery !== null) q = this._strQuery;
            else {
                q = this._buildQuery(this._query, '', true);
                this._strQuery = q;
            };
            res += '?' + q;
        }
        
        if (this._fragment !== null) res += '#' + this._fragment;
        
        if (withQuery) this._uri = res;
        
        return res;
    },
    
    isFullyQualified: function() {
        return this._scheme && this._host;
    },
    
    isRelative: function() {
        return this._path && this._path[0] !== '/';
    },
    
    /**
     * @return Ac_Url
     */
    resolve: function (baseUri) {
        var b, res, path;
        
        if (this.isFullyQualified()) return new Amm.Remote.Uri(this);
        if (!baseUri) baseUri = Amm.Remote.Uri.getCurrent();
        if (baseUri['Amm.Remote.Uri']) b = baseUri;
        else b = new Amm.Remote.Uri(baseUri);
        // empty URI inherits query string of base URI (for compatibility with A element)
        // TODO: if URI has only fragment, it should work too
        if (this.getUri() === '') {
            res = new Amm.Remote.Uri(b);
            res._fragment = '';
            return res;
        }
        else if (this.getUri().charAt(0) === '#') {
            res = new Amm.Remote.Uri(b);
            res.setUri(this._fragment, Amm.Remote.Uri.PART_FRAGMENT);
            return res;
        }
        
        res = new Amm.Remote.Uri(this);
        if (!res._scheme) res._scheme = b._scheme;
        if (!res._host) res._host = b._host;
        if (res._path && res._path.charAt(0) === '/') {
            return res;
        }
        
        // resolve the path
        path = b._path;
        if (!res._path) {
            res._path = path;
            return res;
        }
        
        // strip trailing '/' or '/something; replace // with /
        path = path.replace(/\/[^/]*$/, '').replace(/\/{2,}/, '/') + '/' + res._path.replace(/^\//, '');
        
        // check if we have '/./' or '/../' segments
        if (!path.match(/(^|\/)\.\.?(\/|)/)) {
            res._path = path;
            return res;
        }
        
        var curr, i;
        
        path = path.split('/');
        i = 0;
        while (i < path.length) {
            curr = path[i];
            if (curr === '.' || curr === '') {
                path.splice(i, 1);
                continue;
            }
            if (curr !== '..') {
                i++;
                continue;
            }
            if (i > 1) {
                path.splice(i - 1, 2);
                i--;
                continue;
            }
            path.splice(i, 1);
        }
        path = '/' + path.join('/');
        res._path = path;
        return res;
    }
    
    
};

Amm.extend(Amm.Remote.Uri, Amm.WithEvents);/* global Amm */

Amm.Remote.RequestProducer = function(options) {
    this._data = {};
    Amm.Remote.Uri.call(this, options);
};

Amm.Remote.RequestProducer._allowedMethods = {
    'GET': 'Amm.Remote.ConstRequest.METHOD_GET',
    'POST': 'Amm.Remote.ConstRequest.METHOD_POST',
    'PUT': 'Amm.Remote.ConstRequest.METHOD_PUT',
    'DELETE': 'Amm.Remote.ConstRequest.METHOD_DELETE',
    'PATCH': 'Amm.Remote.ConstRequest.METHOD_PATCH',
    'HEAD': 'Amm.Remote.ConstRequest.METHOD_HEAD',
    'CONNECT': 'Amm.Remote.ConstRequest.METHOD_CONNECT',
    'OPTIONS': 'Amm.Remote.ConstRequest.METHOD_OPTIONS',
},


Amm.Remote.RequestProducer.prototype = {

    'Amm.Remote.RequestProducer': '__CLASS__',

    _method: 'GET',
    
    _data: null,

    setMethod: function(method) {
        method = ('' + method).toUpperCase();
        if (!(method in Amm.Remote.RequestProducer._allowedMethods)) {
            throw Error("Invalid 'method' value '" + method + "'; allowed values are " 
                + Amm.keys(Amm.Remote.RequestProducer._allowedMethods).join('|'));
        }
        var oldMethod = this._method;
        if (oldMethod === method) return;
        this._method = method;
        this.outMethodChange(method, oldMethod);
        this.outRequestChangeNotify();
        return true;
    },

    getMethod: function() { return this._method; },

    outMethodChange: function(method, oldMethod) {
        this._out('methodChange', method, oldMethod);
    },
    
    produceRequest: function() {
        var options = {
            uri: this.getUri(),
            method: this._method
        };
        if (this._data) options.data = this._data;
        return new Amm.Remote.ConstRequest(options);
    },
    
    setData: function(data, path) {
        var oldData;
        if (path === undefined) {
            if (data === undefined || data === false) data = null;
            if (data === this._data) return;
            oldData = this._data? Amm.override({}, this._data) : this._data;
            if (JSON.stringify(oldData) === JSON.stringify(data)) return;
            this._data = data;
        } else {
            if ((data === undefined || data === null) && this._data === null) return; // unset in empty hash has no effect
            var arrPath = Amm.Util.pathToArray(path);
            var c = {};
            oldData = this._data? Amm.override({}, this._data) : this._data;
            if (!this._data) this._data = {};
            Amm.Util.setByPath(this._data, arrPath, data, c);
            var hasKeys = false;
            for (var key in this._data) if (this._data.hasOwnProperty(key)) {
                hasKeys = true;
            }
            if (!hasKeys) this._data = null;
            if (this._data === oldData) return;
            if (!c.changed) return;
        }
        this.outDataChange(data, oldData);
        this.outRequestChangeNotify();
        return true;
    },
    
    getData: function(path) {
        if (path === undefined) return this._data;
        if (!this._data) return undefined;
        var arrPath = Amm.Util.pathToArray(path);
        return this._getByPath(this._data, arrPath);
    },
    
    setDataOverrides: function(dataOverrides) {
        if (!dataOverrides) return;
        if (typeof dataOverrides !== 'object')
            throw Error("dataOverrides must be an object");
        var newData = Amm.overrideRecursive({}, this._data);
        Amm.overrideRecursive(newData, dataOverrides);
        this.setData(newData);
    },
    
    outDataChange: function(data, oldData) {
        return this._out('dataChange', data, oldData);
    }

};

Amm.extend(Amm.Remote.RequestProducer, Amm.Remote.Uri);/* global Amm */

Amm.Remote.Transport = function(options) {
    
    Amm.init(this, options);
    
};

Amm.Remote.Transport._default = null;

Amm.Remote.Transport.getDefault = function() {
    if (!this._default) this._default = new Amm.Remote.Transport.JqXhr();
    return this._default;
};

Amm.Remote.Transport.setDefault = function(defaultTransport) {
    if (!defaultTransport) defaultTransport = null;
    else Amm.is(defaultTransport, 'Amm.Remote.Transport', 'defaultTransport');
    this._default = defaultTransport;
};


Amm.Remote.Transport.prototype = {
    
    'Amm.Remote.Transport': '__CLASS__',
    
    _history: null,

    _historySize: null,

    setHistorySize: function(historySize) {
        var oldHistorySize = this._historySize;
        if (oldHistorySize === historySize) return;
        this._historySize = historySize;
        if (!this._historySize) {
            this._history = null;
            return true;
        }
        if (!this._history) this._history = [];
        else if (this._history.length > this._historySize) {
            this._history.splice(this._historySize, this._history.length - this._historySize);
        }
        return true;
    },
    
    getHistorySize: function() { return this._historySize; },

    getHistory: function() { this._history? [].concat(this._history) : []; },
    
    _push: function(request) {
        this._history.unshift(request);
        if (this._history.length > this._historySize) this._history.pop();
    },
    
    /**
     * @returns {Amm.Remote.RunningRequest}
     */
    makeRequest: function(constRequest, success, failure, scope) {
        var runningRequest = new Amm.Remote.RunningRequest(constRequest, success, failure, scope, this);
        this._doPrepareRunningRequest(runningRequest, constRequest, success, failure, scope);
        if (this._historySize) this._push(runningRequest);
        return runningRequest;
    },
    
    abortRunningRequest: function(runningRequest) {
        this._doAbortRunningRequest(runningRequest);
    },
    
    _doPrepareRunningRequest: function(runningRequest, constRequest, success, failure, scope) {
    }
    
};

/* global Amm */

Amm.Remote.Transport.JqXhr = function(options) {
    Amm.Remote.Transport.call(this, options);
};

Amm.Remote.Transport.JqXhr.prototype = {

    'Amm.Remote.Transport.JqXhr': '__CLASS__', 

    _doPrepareRunningRequest: function(runningRequest, constRequest, success, failure, scope) {
        var options = constRequest.getJqXhrOptions();
        options.context = runningRequest;
        var xhr = jQuery.ajax(constRequest.getUri(), options).done(runningRequest.success).fail(this._failure);
        runningRequest.setExtra(xhr);
    },
    
    _failure: function(jqXhr, textStatus, errorThrown) { // is ran in RunningRequest scope
        this.failure(textStatus, errorThrown, this.getExtra().status, jqXhr);
    },
    
    _doAbortRunningRequest: function(runningRequest) {
        runningRequest.getExtra().abort();
    }
    
};

Amm.extend(Amm.Remote.Transport.JqXhr, Amm.Remote.Transport);

Amm.Remote.Transport.JqXhr.parseResponseHeaders = function(strResponseHeaders) {
    var s = strResponseHeaders.split(/[\n\r]+/);
    var res = {}, key, value;
    for (var i = 0; i < s.length; i++) {
        s[i] = s[i].replace(/(^\s+)|(\s+$)/g, "");
        if (!s[i].length) continue;
        var m = s[i].match(/^([^:]+)\s*:\s*(.*)$/);
        if (!m) {
            key = "";
            value = s[i];
        } else {
            key = m[1].toLowerCase().replace(/(^\s+)|(\s+$)/g, "");
            value = m[2];
        }
        if (!res[key]) {
            res[key] = value;
            continue;
        }
        else if (typeof res[key] !== "Array") res[key] = [res[key]];
        res[key].push(value);
    }
    return res;
};
/* global Amm */

Amm.Remote.Transport.Debug = function(options) {
    Amm.Remote.Transport.call(this, {});
    Amm.WithEvents.call(this, options);
    var t = this;
    this._successClosure = function(data, textStatus) { return t.success.apply(t, Array.prototype.slice.call(arguments)); };
    this._failureClosure = function(textStatus, errorThrown, httpCode) { return t.failure.apply(t, Array.prototype.slice.call(arguments)) };
};

Amm.Remote.Transport.Debug.prototype = {

    'Amm.Remote.Transport.Debug': '__CLASS__', 
    
    eventTime: 0,
    
    replyTime: 10,
    
    _pendingSuccess: null,
    
    _pendingFailure: null,
    
    _request: null,
    
    _successClosure: null,
    
    _failureClosure: null,
    
    reply: function(runningRequest, isSuccess, timeout, args_) {
        this._pendingSuccess = null;
        this._pendingFailure = null;
        if (runningRequest.getAborted()) return;
        if (timeout === undefined || timeout === null) timeout = this.replyTime;
        var args = Array.prototype.slice.call(arguments, 3);
        var f = function() {
            var fn = isSuccess? runningRequest.success : runningRequest.failure;
            fn.apply(runningRequest, args);
        };
        if (timeout > 0) {
            runningRequest._timeout = window.setTimeout(f, this.replyTime);
        } else {
            f();
        }
        this._request = null;
    },
    
    success: function(data, textStatus, timeout) {
        if (!this._request) {
            this._pendingSuccess = Array.prototype.slice.call(arguments);
            this._pendingFailure = null;
            return;
        }
        if (typeof data === 'function') data = data(this._request);
        var args = Array.prototype.slice.call(arguments);
        args.splice(2, 1); // delete 'timeout' arg
        args.unshift(this._request, true, timeout);
        this.reply.apply(this, args);
    },
    
    failure: function(textStatus, errorThrown, httpCode, timeout) {
        if (!this._request) {
            this._pendingFailure = Array.prototype.slice.call(arguments);
            this._pendingSuccess = null;
            return;
        }
        var args = Array.prototype.slice.call(arguments);
        args.splice(3, 1); // delete 'timeout' arg
        args.unshift(this._request, false, timeout);
        this.reply.apply(this, args);
    },
    
    outRequest: function(runningRequest, success, failure) {
        this._request = runningRequest;
        var res = this._out('request', runningRequest, success, failure);
        if (this._pendingSuccess) {
            this.success.apply(this, this._pendingSuccess);
        } else if (this._pendingFailure) {
            this.failure.apply(this, this._pendingFailure);
        }
        return res;
    },
    
    getRequest: function() {
        return this._request;
    },
    
    outAbortRequest: function(runningRequest) {
        return this._out('abortRequest', runningRequest);
    },

    _doPrepareRunningRequest: function(runningRequest, constRequest, success, failure, scope) {
        var t = this, f = function() {
            t.outRequest(runningRequest, t._successClosure, t._failureClosure);
        };
        if (this.eventTime <= 0) {
            f();
        }
        else {
            runningRequest._timeout = window.setTimeout(f, this.eventTime);
        }
    },
    
    _doAbortRunningRequest: function(runningRequest) {
        if (runningRequest._timeout) {
            window.clearTimeout(runningRequest._timeout, null);
            runningRequest._timeout = null;
        }
        this.outAbortRequest(runningRequest);
    },
    
};

Amm.extend(Amm.Remote.Transport.Debug, Amm.Remote.Transport);
Amm.extend(Amm.Remote.Transport.Debug, Amm.WithEvents);

/* global Amm */

/**
 * @param {string} definition Path pattern definition
 * @returns {Amm.Remote.MapperPattern}
 * 
 * Definition is like
 * 
 * pathSegment/otherPathSegment/{argName}/etc/something-{argName2}/{freeArgName...}/paramContinues/{moreParams}/etc
 * 
 * {argName} is name of argument that is expected to have alphanumeric value
 * without slashes
 * 
 * {argNames} must be separated by some characters
 * (so you cannot have {argName}{argName2} together)
 * 
 * {tailArgName...} means path can have any string with slashes etc here - it is
 */
Amm.Remote.MapperPattern = function(definition) {

    if (typeof definition !== 'string' || !definition.length)
        throw Error ("`definition` must be non-empty string");

    this._parseDefinition(definition);
    
};

Amm.Remote.MapperPattern._parseRx = /([^{}]+)|(\{\w+(\.\.\.)?)|[{}]/g;

Amm.Remote.MapperPattern.prototype = {
    
    definition: null,
    
    regex: null,
    
    args: null,
    
    segments: null,
    
    _parseDefinition: function(definition) {
        this._definition = definition;
        var matches = definition.match(Amm.Remote.MapperPattern._parseRx);
        if (matches.join('') !== definition) {
            console.log(matches, definition);
            throw Error ("MapperPattern definition wasn't fully matched");
        }
        var currArg, isFree, pos = 0, len;
        this.regex = '';
        this.args = [];
        this.segments = [];
        while((curr = matches.shift()) !== undefined) {
            len = curr.length;
            if (curr[0] === '{') {
                if (currArg) {
                    throw Error("Error at position "
                            + pos + " of definition '" 
                            + definition 
                            + "': arguments must be always separated by non-argument string");
                }
                if (matches[0] === '}') {
                    matches.shift();
                    len++;
                }
                else {
                    throw Error("Unmatched '{' at position " + pos + "of definition '" + definition + "'");
                }
                currArg = curr.slice(1);
                if (currArg.slice(-3) === '...') {
                    isFree = true;
                    currArg = currArg.slice(1, -3);
                }
                this.args.push(currArg);
                if (isFree) this.regex += '(.+)';
                    else this.regex += '([-\\w]+)';
                this.segments.push([currArg]);
            } else {
                currArg = null;
                this.regex += Amm.Util.regexEscape(curr);
                this.segments.push(curr);
            }
            pos += len;
        }
        this.regex = '^' + this.regex + '$';
    },
    
    /**
     * Checks path against the definition.
     * If it matches, populates output object outArgs with argument values and returns TRUE.
     * Otherwise lives outArgs unchanged and returns FALSE.
     * 
     * @param {string} path
     * @param {object} outArgs
     * @returns {Boolean}
     */
    parse: function(path, outArgs) {
        if (!outArgs) outArgs = {};
        if (typeof this.regex === 'string') this.regex = new RegExp(this.regex);
        var r = this.regex.exec(path);
        if (!r) return false;
        for (var i = 0, l = this.args.length; i < l; i++) {
            outArgs[this.args[i]] = r[i + 1];
        }
        return true;
    },
    
    /**
     * If there's enough args in `args` parameter, produces the path, otherwise returns undefined
     * Doesn't check args for validity (only word characters should be in non-free args), only for their presence.
     * Empty args ('') doesn't count as ones.
     *
     * @param {object} args Hash with args
     * @param {boolean} removeBuilt Will delete `args` members 
     *                  that were incorporated to the result string
     */
    build: function(args, removeBuilt) {
        var i, l;
        for (i = 0, l = this.args.length; i < l; i++) {
            var v = args[this.args[i]];
            if (v === null || v === undefined || v === '' || ('' + v) === '') return; 
        }
        var res = '';
        for (i = 0, l = this.segments.length; i < l; i++) {
            if (this.segments[i] instanceof Array) {
                res += '' + args[this.segments[i][0]];
                if (removeBuilt) delete args[this.segments[i][0]];
            }
            else res += this.segments[i];
        }
        return res;
    }
    
};
/* global Amm */

/**
 * Performs single request at a time.
 * Observes `request` and initiates requests when its' configuration changes.
 * When response is received, sets `response` property and, in case of errors, `error` property.
 */
Amm.Remote.Fetcher = function(options) {
    Amm.WithEvents.call(this, options);
};

/**
 * State of Fetcher when it doesn't have enough information to send request
 * (mostly when getRequestProducer() is null)
 */
Amm.Remote.Fetcher.STATE_CONFIGURING = 'configuring';

/**
 * Fetcher has enough information to send request, but wasn't commanded to do so
 */
Amm.Remote.Fetcher.STATE_IDLE = 'idle';

/**
 * Fetcher is configured to make requests automatically, 
 * but is waiting for Amm to finish bootstrapping to initiate first request
 */
Amm.Remote.Fetcher.STATE_PREINIT = 'preinit';

/**
 * Fetcher is waiting for firstDelay/throttleDelay timeout to initiate the request
 */
Amm.Remote.Fetcher.STATE_STARTED = 'started';

/**
 * Fetcher sent a request to the transport and is waiting for the response
 */
Amm.Remote.Fetcher.STATE_SENT = 'sent';

/**
 * Fetcher received a response from the transport
 */
Amm.Remote.Fetcher.STATE_RECEIVED = 'received';

/**
 * Fetcher received error message from the transport
 */
Amm.Remote.Fetcher.STATE_ERROR = 'error';

/**
 * Never automatically run any requests
 */
Amm.Remote.Fetcher.AUTO_NONE = 0;

/**
 * Start making requests once Amm is bootstrapped
 */
Amm.Remote.Fetcher.AUTO_BOOTSTRAP = 1;

/**
 * Make first request once in STATE_IDLE
 */
Amm.Remote.Fetcher.AUTO_ALWAYS = 2;

Amm.Remote.Fetcher.prototype = {

    'Amm.Remote.Fetcher': '__CLASS__',

    _requestProducer: null,
    
    _requestProducerIsOwn: false,
        
    _response: undefined,

    _state: Amm.Remote.Fetcher.STATE_CONFIGURING,
    
    _error: null,
    
    /**
     * Amm.Remote.Fetcher.AUTO_NONE: this.run() needed to call server.
     * Amm.Remote.Fetcher.AUTO_BOOTSTRAP: any change to this.request initiates
     * new request, but only after Amm is bootstrapped
     * Amm.Remote.Fetcher.AUTO_BOOTSTRAP - change always initiates new request
     */
    _auto: Amm.Remote.Fetcher.AUTO_NONE,
    
    // how much milliseconds we should wait before initiating from request
    _firstDelay: 10,
    
    // how much milliseconds we should wait since requestProducer.outRequestChangeNotify()
    // to initiate new request. Applicable if request already running; 
    // if request isn't running, firstDelay is used
    _throttleDelay: 500,

    _timeout: null,
    
    _waitingForBootstrap: false,
    
    // constRequest that is currently processing
    _constRequest: null,

    _runningRequest: null,
    
    // is set before creating the request
    _starting: 0,
    
    _gotResultOnStart: false,
    
    _prevRequest: null,

    // function that calls this._doRequest()
    _timeoutCallback: null,
    
    _transport: null,

    _poll: false,

    /**
     * If TRUE, setResponse / setError will compare JSON result with last one and, if it didn't change, 
     * outResponseChange() / outErrorChange() won't be triggered
     * 
     * @type Boolean
     * @see isDataChanged
     */
    _detectChanges: true,
    
    _lastResponseJson: undefined,
    
    _lastErrorJson: undefined,
    
    run: function() {
        this._doRequest();
    },
    
    setRequestProducer: function(requestProducer) {
        var oldRequestProducer = this._requestProducer;
        if (oldRequestProducer === requestProducer) return;
        if (oldRequestProducer) {
            oldRequestProducer.unsubscribe('requestChangeNotify', this._requestChangeNotify, this);
            if (this._requestProducerIsOwn) oldRequestProducer.cleanup();
        }
        if (typeof requestProducer === 'string') requestProducer = new Amm.Remote.RequestProducer(requestProducer);
        if (!requestProducer) requestProducer = null;
        else if (typeof requestProducer === 'object' && !Amm.getClass(requestProducer)) {
            requestProducer = Amm.constructInstance(requestProducer, 'Amm.Remote.RequestProducer', undefined, false, 'RequestProvider');
            this._requestProducerIsOwn = true;
        } else {
            Amm.meetsRequirements(requestProducer, 'RequestProvider', 'request');
        }
        this._requestProducer = requestProducer;
        if (requestProducer) {
            requestProducer.subscribe('requestChangeNotify', this._requestChangeNotify, this);
        }
        this.setConstRequest(requestProducer.produceRequest());
        this.outRequestProducerChange(requestProducer, oldRequestProducer);
        this._updateState();
        return true;
    },

    getRequestProducer: function() { return this._requestProducer; },
    
    outRequestProducerChange: function(requestProducer, oldRequestProducer) {
        this._out('requestProducerChange', requestProducer, oldRequestProducer);
    },
    
    _requestChangeNotify: function() {
        var constRequest = this._requestProducer.produceRequest();
        this.setConstRequest(constRequest);
    },

    setConstRequest: function(constRequest) {
        if (!constRequest) constRequest = null;
        var oldConstRequest = this._constRequest;
        if (oldConstRequest === constRequest) return;
        this._constRequest = constRequest;
        this.outConstRequestChange(constRequest, oldConstRequest);
        this._scheduleAutoRequest();
        this._updateState();
        return true;
    },

    getConstRequest: function() { return this._constRequest; },

    outConstRequestChange: function(constRequest, oldConstRequest) {
        return this._out('constRequestChange', constRequest, oldConstRequest);
    },

    setTransport: function(transport) {
        if (!transport) transport = null;
        else if (typeof transport !== 'object' || !Amm.getClass(transport)) {
            transport = Amm.constructInstance(transport, 'Amm.Remote.Transport');
        } else Amm.is(transport, 'Amm.Remote.Transport', 'transport');
        var oldTransport = this._transport;
        if (oldTransport === transport) return;
        this._transport = transport;
        this.outTransportChange(transport, oldTransport);
        return true;
    },

    outTransportChange: function(transport, oldTransport) {
        return this._out('transportChange', transport, oldTransport);
    },

    getTransport: function() { return this._transport; },

    _doGetTransport: function() {
        return this._transport || Amm.Remote.Transport.getDefault();
    },

    _runOnBootstrap: function() {
        if (!this._waitingForBootstrap) return;
        this._scheduleAutoRequest();
        this._updateState();
    },
    
    _scheduleAutoRequest: function(polling) {
        if (!this._auto) {
            return;
        }
        if (this._auto === Amm.Remote.Fetcher.AUTO_BOOTSTRAP && !Amm.getBootstrapped()) {
            Amm.getRoot().subscribe('bootstrap', this._runOnBootstrap, this);
            this._waitingForBootstrap = true;
            return;
        }
        if (!this._constRequest) {
            return;
        }
        var delay = this._runningRequest || polling? this._throttleDelay : this._firstDelay;
        var t = this;
        if (this._timeout) window.clearTimeout(this._timeout);
        if (this._runningRequest) {
            this._abort();
        }
        if (delay > 0) {
            if (!this._timeoutCallback) {
                this._timeoutCallback = function() {
                    t._doRequest();
                };
            };
            this._timeout = window.setTimeout(this._timeoutCallback, delay);
        } else {
            this._timeout = null;
            this._doRequest();
        }
    },
    
    _abort: function() {
        if (!this._runningRequest) return;
        this._prevRequest = this._runningRequest;
        this._runningRequest = null;
        this._prevRequest.abort();
    },
    
    _doRequest: function() {
        if (!this._constRequest) {
             throw Error("Cannot _doRequest() without _constRequest");
        }
        this._waitingForBootstrap = false;
        // cancel old request
        if (this._runningRequest) this._abort();
        if (this._timeout) {
            window.clearTimeout(this._timeout);
            this._timeout = null;
        }
        this._starting++;
        this._runningRequest = this._doGetTransport().makeRequest(this._constRequest, this._requestDone, this._requestFail, this);
        this._starting--;
        this.setError(null);
        if (this._gotResultOnStart) {
            this._prevRequest = this._runningRequest;
            this._runningRequest = null;
        }
        this._updateState();
        return;
    },
    
    _requestDone: function(data, textStatus) {
        if (!this._runningRequest && !this._starting) return; // aborted - do not process
        if (this._runningRequest) {
            this._prevRequest = this._runningRequest;
            this._runningRequest = null;
        }
        this.setResponse(data);
    },
    
    _requestFail: function(textStatus, errorThrown, httpCode) {
        if (!this._runningRequest && !this._starting) return; // aborted - do not process
        if (this._runningRequest) {
            this._prevRequest = this._runningRequest;
            this._runningRequest = null;
        }
        this.setError({
            textStatus: textStatus,
            errorThrown: errorThrown,
            httpCode: httpCode
        });
    },
    
    _setState: function(state) {
        var oldState = this._state;
        if (oldState === state) return;
        this._state = state;
        this.outStateChange(state, oldState);
        return true;
    },

    getState: function() { return this._state; },
    
    outStateChange: function(state, oldState) {
        this._out('stateChange', state, oldState);
    },

    /**
     * Is called when getDetectChange() === TRUE.
     * Returns TRUE when provided result is changed.
     * 
     * May be replaced by user function.
     * 
     * @param {mixed} data
     * @param {string} property Either 'response' or 'error'
     * @returns {boolean}
     */
    isDataChanged: function(data, property) {
        // _lastResponseJson or _lastErrorJson 
        var lastData = '_last' + property.charAt(0).toUpperCase() + property.slice(1) + 'Json';
        var json = JSON.stringify(data);
        if (this[lastData] === json) return false;
        this[lastData] = json;
        return true;
    },

    /**
     * Note that setResponse() aborts a running request (if it was running) and sets error to NULL
     */
    setResponse: function(response) {
        var oldResponse = this._response;
        if (oldResponse === response) return;
        if (this._runningRequest) this._abort();
        if (this._starting) this._gotResultOnStart = true;
        var changed = !this._detectChanges || this.isDataChanged(response, 'response');
        if (changed) this._response = response;
        this._updateState();        
        if (changed) {
            this.outResponseChange(response, oldResponse);
            return true;
        }
    },

    getResponse: function() { return this._response; },

    outResponseChange: function(response, oldResponse) {
        this._out('responseChange', response, oldResponse);
    },
    
    /**
     * Note that setError() to non-false value sets state to STATE_ERROR
     */
    setError: function(error) {
        var oldError = this._error;
        if (oldError === error) return;
        if (this._detectChanges && !this.isDataChanged(error, 'error')) return;
        if (error) {
            if (this._runningRequest) {
                this._abort();
            }
            this.setResponse(undefined);
        }
        this._error = error;
        if (this._starting) this._gotResultOnStart = true;        
        this._updateState();
        this.outErrorChange(error, oldError);
        return true;
    },

    getError: function() { return this._error; },

    outErrorChange: function(error, oldError) {
        this._out('errorChange', error, oldError);
    },

    setThrottleDelay: function(throttleDelay) {
        var oldThrottleDelay = this._throttleDelay;
        if (oldThrottleDelay === throttleDelay) return;
        this._throttleDelay = throttleDelay;
        this.outThrottleDelayChange(throttleDelay, oldThrottleDelay);
        return true;
    },

    getThrottleDelay: function() { return this._throttleDelay; },

    outThrottleDelayChange: function(throttleDelay, oldThrottleDelay) {
        this._out('throttleDelayChange', throttleDelay, oldThrottleDelay);
    },
    
    setFirstDelay: function(firstDelay) {
        var oldFirstDelay = this._firstDelay;
        if (oldFirstDelay === firstDelay) return;
        this._firstDelay = firstDelay;
        this.outFirstDelayChange(firstDelay, oldFirstDelay);
        return true;
    },

    getFirstDelay: function() { return this._firstDelay; },

    outFirstDelayChange: function(firstDelay, oldFirstDelay) {
        this._out('firstDelayChange', firstDelay, oldFirstDelay);
    },

    setAuto: function(auto) {
        var oldAuto = this._auto;
        if (oldAuto === auto) return;
        this._auto = auto;
        this.outAutoChange(auto, oldAuto);
        if (auto && this._constRequest) this._scheduleAutoRequest();
        return true;
    },

    getAuto: function() { return this._auto; },

    outAutoChange: function(auto, oldAuto) {
        this._out('autoChange', auto, oldAuto);
    },
    
    cleanup: function() {
        this.reset();
        if (this._requestProducer && this._requestProducerIsOwn && this._requestProducer.cleanup) {
            this._requestProducer.cleanup();
            this._requestProducer = null;
        }
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    reset: function() {
        if (this._poll) this.setPoll(false);
        if (this._runningRequest) this._abort();
        if (this._timeout) {
            window.clearTimeout(this._timeout);
            this._timeout = null;
        }
        this.setResponse(undefined);
        this._updateState();
    },
    
    // single place to update state information. Also, if polling enabled, will schedule next request
    _updateState: function() {
        var newState;
        if (this._runningRequest) {
            newState = Amm.Remote.Fetcher.STATE_SENT;
        } else if (this._timeout) {
            newState = Amm.Remote.Fetcher.STATE_STARTED;
        } else if (this._error) {
            newState = Amm.Remote.Fetcher.STATE_ERROR;
        } else if (this._response !== undefined) {
            newState = Amm.Remote.Fetcher.STATE_RECEIVED;
        } else if (!this._constRequest) {
            newState = Amm.Remote.Fetcher.STATE_CONFIGURING;
        } else if (this._waitingForBootstrap) {
            newState = Amm.Remote.Fetcher.STATE_PREINIT;
        } else {
            newState = Amm.Remote.Fetcher.STATE_IDLE;
        }
        if (this._poll && (
                newState === Amm.Remote.Fetcher.STATE_IDLE 
                || newState === Amm.Remote.Fetcher.STATE_RECEIVED 
                || newState === Amm.Remote.Fetcher.STATE_ERROR
        ))  {
            this._scheduleAutoRequest(true);
        }
        this._setState(newState);
    },
    
    setPoll: function(poll) {
        poll = !!poll;
        var oldPoll = this._poll;
        if (oldPoll === poll) return;
        this._poll = poll;
        this.outPollChange(poll, oldPoll);
        if (poll) this._scheduleAutoRequest();
        return true;
    },

    getPoll: function() { return this._poll; },

    outPollChange: function(poll, oldPoll) {
        this._out('pollChange', poll, oldPoll);
    },

    setDetectChanges: function(detectChanges) {
        detectChanges = !!detectChanges;
        var oldDetectChanges = this._detectChanges;
        if (oldDetectChanges === detectChanges) return;
        this._detectChanges = detectChanges;
        return true;
    },

    getDetectChanges: function() { return this._detectChanges; },

};

Amm.extend(Amm.Remote.Fetcher, Amm.WithEvents);/* global Amm */

Amm.Remote.ConstRequest = function(options) {
    
    if (!options) return;
    if (options.uri) this._uri = options.uri;
    if (options.method) this._method = options.method;
    if (options.data) this._data = options.data;
    if (options.headers) this._headers = options.headers;
    if (options.misc) this._misc = options.misc;
    
};

Amm.Remote.ConstRequest.METHOD_GET = 'GET';
Amm.Remote.ConstRequest.METHOD_POST = 'POST';
Amm.Remote.ConstRequest.METHOD_PUT = 'PUT';
Amm.Remote.ConstRequest.METHOD_DELETE = 'DELETE';
Amm.Remote.ConstRequest.METHOD_PATCH = 'PATCH';
Amm.Remote.ConstRequest.METHOD_HEAD = 'HEAD';
Amm.Remote.ConstRequest.METHOD_CONNECT = 'CONNECT';
Amm.Remote.ConstRequest.METHOD_OPTIONS = 'OPTIONS';

Amm.Remote.ConstRequest.prototype = {
    
    'ConstRequest': '__INTERFACE__',
    
    _uri: undefined,
    
    _method: undefined,
    
    _data: null,
    
    _headers: undefined,
    
    _misc: undefined,
    
    getUri: function() {
        return this._uri;
    },
    
    getMethod: function() {
        return this._method;
    },
    
    getData: function() {
        return this._data;
    },
    
    getHeaders: function() {
        return this._headers;
    },
    
    getMisc: function() {
        return this._misc;
    },
    
    getJqXhrOptions: function() {
        var res = {};
        if (this._misc && typeof this._misc === 'object') Amm.override(res, this._misc);
        if (this._data) res.data = this._data;
        if (this._headers) res.headers = this._headers;
        if (this._method) res.method = this._method;
        return res;
    },
            
    getAll: function() {
        var res = this.getJqXhrOptions();
        if (this._uri) res.uri = this._uri;
        return res;
    }
    
};
/* global Amm */

Amm.Remote.RunningRequest = function(constRequest, success, failure, scope, transport, extra) {
    
    this._constRequest = constRequest;
    this._success = success;
    this._failure = failure;
    this._scope = scope;
    this._transport = transport;
    this._extra = extra;
        
};

Amm.Remote.RunningRequest.ERROR_TIMEOUT = "timeout";
Amm.Remote.RunningRequest.ERROR_SERVER_ERROR = "error";
Amm.Remote.RunningRequest.ERROR_ABORT = "abort";
Amm.Remote.RunningRequest.ERROR_PARSER_ERROR = "parsererror";

Amm.Remote.RunningRequest.prototype = {

    'Amm.Remote.RunningRequest': '__CLASS__', 
    
    _constRequest: null,
    
    _success: null,
    
    _failure: null,
    
    _scope: null,
    
    _transport: null,
    
    _extra: undefined,

    _finished: false,
    
    _result: null,
    
    _error: null,
    
    getConstRequest: function() {
        return this._constRequest;
    },
    
    getSuccess: function() {
        return this._success;
    },
    
    getFailure: function() {
        return this._failure;
    },
    
    getScope: function() {
        return this._scope;
    },
    
    getTransport: function() {
        return this._transport;
    },
        
    getExtra: function() {
        return this._extra;
    },
    
    setExtra: function(extra) {
        if (this._extra === extra) return;
        if (this._extra !== undefined) throw Error("Cant setExtra() only once");
        this._extra = extra;
    },
    
    getFinished: function() {
        return this._finished;
    },
    
    success: function(data, textStatus) {
        this._result = Array.prototype.slice.call(arguments);
        if (!this._finished) {
            this._finished = 1;
        }
        if (!this._success) return;
        return this._success.apply(this._scope || window, this._result);
    },
    
    failure: function(textStatus, errorThrown, httpCode) {
        this._error = Array.prototype.slice.call(arguments);
        if (!this._finished) {
            this._finished = -1;
        }
        if (!this._failure) return;
        return this._failure.apply(this._scope || window, this._error);
    },
    
    abort: function() {
        this._transport.abortRunningRequest(this);
        this._finished = -3;
    },
    
    getRunning: function() {
        return !this._finished;
    },
    
    getAborted: function() {
        return this._finished === -3;
    }

};



/* global Amm */

/**
 *  Locates elements in scope of owner component of `origin` and its' parent components.
 *  Range is either index or '*' (means array will be returned)
 */
Amm.Operator.ScopeElement = function(origin, id, range, componentOnly, allElements) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    this._componentOnly = componentOnly;
    if (origin !== undefined) this._setOperand('origin', origin);
    if (id !== undefined) this._setOperand('id', id);
    if (range !== undefined) this._setOperand('range', range);
    if (allElements !== undefined) this._allElements = !!allElements;
    this._isEvaluating--;
};

Amm.Operator.ScopeElement.prototype = {

    'Amm.Operator.ScopeElement': '__CLASS__', 

    // Searches only components
    _componentOnly: false,
    
    // Means if no id is provided, should return all elements
    _allElements: false,
    
    _originOperator: null,
    
    _originValue: null,
    
    _originExists: null,
    
    _idOperator: null,
    
    _idValue: null,
    
    _idExists: null,
    
    _rangeOperator: null,
    
    _rangeValue: null,
    
    _rangeExists: null,
    
    _component: null,
    
    OPERANDS: ['origin', 'id', 'range'],
    
    STATE_SHARED: {
        _componentOnly: true
    },
    
    supportsAssign: false,
    
    getReportsContentChanged: function() {
        return true;
    },

    _originEvents: function(origin, oldOrigin) {
        if (oldOrigin && oldOrigin['Amm.Element']) {
            this._unsub(oldOrigin, 'closestComponentChange');
        }
        if (origin && origin['Amm.Element']) {
            this._sub(origin, 'closestComponentChange', this._originComponentChange);
        }
    },
    
    _originChange: function(origin) {
        if (origin && origin['Amm.Element']) this._setComponent(origin.getClosestComponent());
    },
    
    _originComponentChange: function(component) {
        this._setComponent(component);
    },
    
    _rangeChange: function(range) {
        this._checkArrayChange = range === '*';
    },

    _setComponent: function(component) {
        if (!component) component = null;
        var oldComponent = this._component;
        if (oldComponent === component) return;
        if (oldComponent) {
            this._unsub(oldComponent, 'acceptedInScope');
            this._unsub(oldComponent, 'rejectedInScope');
            this._unsub(oldComponent, 'renamedInScope');
            this._unsub(oldComponent, 'componentStackChange');
            if (this._componentOnly) {
                this._unsub(oldComponent, 'childComponentStatusChangeInScope');
            }
        }
        this._component = component;
        if (this._component) {
            var map = {
                acceptedInScope: this._acceptedInScope,
                rejectedInScope: this._rejectedInScope,
                renamedInScope: this._renamedInScope,
                componentStackChange: this._componentStackChange,
            };
            if (this._componentOnly) {
                map['childComponentStatusChangeInScope'] = this._childComponentStatusChangeInScope;
            }
            this._sub(component, map);
        }
        if (this._isEvaluating) return;
        this.evaluate();
    },
    
    _acceptedInScope: function(component, elements) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._idExists || !this._idValue) return;
        var found = false;
        // only if we have element with interesting id
        for (var i = 0, l = elements.length; i < l; i++) {
            if (elements[i].getId() === this._idValue) {
                found = true;
                break;
            }
        }
        if (found) this.evaluate();
    },
    
    _rejectedInScope: function(component, elements) {
        return this._acceptedInScope(component, elements);
    },
    
    _renamedInScope: function(component, element, id, oldId) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._idExists || !this._idValue) return;
        if (id === this._idValue || oldId === this._idValue) this.evaluate();
    },
    
    _componentStackChange: function() {
        if (this._isEvaluating) return;
        this.evaluate();
    },
    
    _childComponentStatusChangeInScope: function(originComponent, component, status) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._idExists || !this._idValue) return;
        if (component.getId() === this._idValue || component.getInternalId() === this._idValue) this.evaluate();
    },
    
    setOrigin: function(origin) {
        this._setOperand('origin', origin);
    },
    
    setId: function(id) {
        this._setOperand('id', id);
    },
    
    _doEvaluate: function(again) {
        var range = this._getOperandValue('range', again);
        var id = this._getOperandValue('id', again);
        var origin = this._getOperandValue('origin', again);
        return Amm.Operator.ScopeElement._eval(origin, id, range, this._componentOnly, this._allElements);
    },
    
    toFunction: function() {
        var _origin = this._operandFunction('origin');
        var _id = this._operandFunction('id');
        var _range = this._operandFunction('range');
        var _allElements = this._allElements;
        var componentOnly = this._componentOnly;
        return function(e) {
            var range = _range(e);
            var id = _id(e);
            var origin = _origin(e);
            return Amm.Operator.ScopeElement._eval(origin, id, range, componentOnly, _allElements);
        };
    }
    
};

Amm.Operator.ScopeElement._eval = function(origin, id, range, componentOnly, allElements) {
    var multi = range === '*' || !id && allElements;
    var def = multi? [] : undefined;
    if (!origin || !origin['Amm.Element']) return def;
    if (!id && !allElements) return def;
    var closestComponent = origin.getClosestComponent();
    if (!closestComponent) return def;
    if (componentOnly) {
        var items;
        if (!id && allElements) {
            var h = closestComponent.getAllNamedElements();
            items = [];
            for (var i in h) if (h.hasOwnProperty(i)) {
                items = items.concat(h[i]);
            }
        } else {
            items = closestComponent.getAllNamedElements(id, true);
        }
        var components = [];
        for (var i = 0; i < items.length; i++) if (items[i]['Component'] && items[i].getIsComponent()) 
            components.push(items[i]);
        return multi? components: components[range];
    }
    if (multi) return closestComponent.getAllNamedElements(id, true);
    return closestComponent.getNamedElement(id, range, true);
};

Amm.extend(Amm.Operator.ScopeElement, Amm.Operator);/* global Amm */

// returns Expression.getExpressionThis()

Amm.Operator.ExpressionThis = function() {
    Amm.Operator.call(this);
};

Amm.Operator.ExpressionThis.prototype = {

    'Amm.Operator.ExpressionThis': '__CLASS__', 
    
    setExpression: function(expression) {
        Amm.Operator.prototype.setExpression.call(this, expression);
        this._sub(expression, 'expressionThisChange');
        this._defaultHandler();
    },
    
    _initContextState: function(contextId, own) {    
        Amm.Operator.prototype._initContextState.call(this, contextId, own);
        if (own && this._expression) {
            this._sub(this._expression, 'expressionThisChange');
            this._defaultHandler();
        }
    },
    
    _doEvaluate: function(again) {
        if (!this._expression) {
            this._hasValue = false;
            return;
        } 
        return this._expression.getExpressionThis();
    },
    
    
    toFunction: function() {
        return function(e) {
            return e.expressionThis;
        };
    }
    
};

Amm.extend(Amm.Operator.ExpressionThis, Amm.Operator);

/* global Amm */

Amm.Operator.Conditional = function(condition, trueValue, falseValue) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    if (condition !== undefined) this._setOperand('condition', condition);
    if (trueValue !== undefined) this._setOperand('trueValue', trueValue);
    if (falseValue !== undefined) this._setOperand('falseValue', falseValue);
    this._isEvaluating--;
};

// returns Expression variable with the name that matches the operand

Amm.Operator.Conditional.prototype = {

    'Amm.Operator.Condition': '__CLASS__', 
    
    _conditionOperator: null,
    
    _conditionValue: null,
    
    _conditionExists: null,

    _trueValueOperator: null,
    
    _trueValueValue: null,
    
    _trueValueExists: null,

    _falseValueOperator: null,
    
    _falseValueValue: null,
    
    _falseValueExists: null,
    
    OPERANDS: ['condition', 'trueValue', 'falseValue'],
    
    supportsAssign: false,
    
    _doEvaluate: function(again) {
        var condition = this._getOperandValue('condition', again);
        var res = condition? 
                this._getOperandValue('trueValue', again)
            :   this._getOperandValue('falseValue', again);
        return res;
    },
    
    setCondition: function(condition) {
        this._setOperand('condition', condition);
    },
        
    setTrueValue: function(trueValue) {
        this._setOperand('trueValue', trueValue);
    },
        
    setFalseValue: function(falseValue) {
        this._setOperand('falseValue', falseValue);
    },
    
    toFunction: function() {
        var c = this._operandFunction('condition');
        var t = this._operandFunction('trueValue');
        var f = this._operandFunction('falseValue');
        return function(e) {
            return c(e)? t(e) : f(e);
        };
    }
    
};

Amm.extend(Amm.Operator.Conditional, Amm.Operator);

/* global Amm */

Amm.Operator.Unary = function(operator, operand) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    this._setOperator(operator);
    if (operand !== undefined) this._setOperand('operand', operand);
    this._isEvaluating--;
};

Amm.Operator.Unary.Unary_OPERATORS = {
    '!!': function(operand) { return !!operand; },
    '!': function(operand) { return !operand; },
    '-': function(operand) { return -operand; },
    'typeof': function(operand) { return typeof operand; }
};
    


// returns Expression variable with the name that matches the operand

Amm.Operator.Unary.prototype = {

    'Amm.Operator.Unary': '__CLASS__', 
    
    _operandOperator: null,
    
    _operandValue: null,
    
    _operandExists: null,

    _operator: null,
    
    _operatorFn: null,

    OPERANDS: ['operand'],
    
    STATE_SHARED: {
        _operator: true,
        _operatorFn: true
    },
    
    supportsAssign: false,
    
    _setOperator: function(operator) {
        var fn = Amm.Operator.Unary.Unary_OPERATORS[operator];
        if (!fn)
            Error("Unsupported Unary operator type: '" + operator + "'");
        this._operator = operator;
        this._operatorFn = fn;
    },

    _doEvaluate: function(again) {
        var operand = this._getOperandValue('operand', again);
        return this._operatorFn(operand);
    },
    
    setOperand: function(operand) {
        this._setOperand('operand', operand);
    },
        
    toFunction: function() {
        var o = this._operandFunction('operand');
        var op = this._operatorFn;
        return function(e) {
            return op(o(e));
        };
    }
    
};

Amm.extend(Amm.Operator.Unary, Amm.Operator);

/* global Amm */

Amm.Operator.Property = function(object, property, args, cacheability, isCall, isNew) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    if (isCall || isNew) {
        this._isCall = true;
        this.supportsAssign = false;
    }
    if (cacheability !== undefined && cacheability !== null) {
        this._cacheability = !!cacheability;
    }
    this._isNew = !!isNew;
    if (object !== undefined) this._setOperand('object', object);
    if (property !== undefined) this._setOperand('property', property);
    if (args !== undefined) this._setOperand('arguments', args);
    this._isEvaluating--;
};

// returns Expression variable with the name that matches the operand

Amm.Operator.Property.prototype = {

    'Amm.Operator.Property': '__CLASS__', 
    
    _objectOperator: null,
    
    _objectValue: null,
    
    _objectExists: null,
    
    _propertyOperator: null,
    
    _propertyValue: null,
    
    _propertyExists: null,
    
    _argumentsOperator: null,
    
    _argumentsValue: null,
    
    _argumentsExists: null,
    
    _isCall: false,
    
    _isNew: false,
    
    _cacheability: null,
    
    _eventName: false,
    
    supportsAssign: true,
    
    OPERANDS: ['object', 'property', 'arguments'],
    
    STATE_SHARED: {
        _isCall: true,
        _cacheability: true,
        supportsAssign: true,
        _isNew: true
    },
    
    setObject: function(object) {
        this._setOperand('object', object);
    },
    
    promoteToCall: function(args, cacheability) {
        if (this._hasValue) Error("Cannot promoteToCall(): already evaluated");
        this._isEvaluating++;
        this._isCall = true;
        this.supportsAssign = false;
        if (this._argumentsOperator || !(this._arguments === null || this._arguments === undefined))
            Error("Getter arguments already defined - cannot promote to call");
        if (cacheability !== undefined && cacheability !== null) {
            this._cacheability = !!cacheability;
        }
        if (args !== undefined) this._setOperand('arguments', args);
        this._isEvaluating--;
    },
    
    getIsCall: function() {
        return this._isCall;
    },
    
    getIsNew: function() {
        return this._isNew;
    },
    
    promoteToNew: function() {
        if (this._hasValue) Error("Cannot promoteToNew(): already evaluated");
        if (!this._isCall) Error("Cannot promoteToNew(): not is call");
        this._isNew = true;
    },
    
    hasArguments: function() {
        return this._argumentsOperator || !(this._arguments === null || this._arguments === undefined);
    },
    
    setProperty: function(property) {
        this._setOperand('property', property);
    },
    
    setArguments: function(args) {
        this._setOperand('arguments', args);
    },

    _handleObjectCleanup: function() {
        this._setOperandValue('object', null);
    },
    
    _objectChange: function(object, oldObject) {
        if (object && !object['Amm.WithEvents'] && !this._isCall && this._cacheability === null) {
            this._setNonCacheable(this._nonCacheable | Amm.Operator.NON_CACHEABLE_VALUE);
        }
    },
    
    _objectEvents: function(object, oldObject) {
        if (oldObject) this._unsub(oldObject);
        if (!object) {
            this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_VALUE); // always-null cacheable value
        } else if (this._isCall && !this._isNew || (object && !object['Amm.WithEvents'])) {
            // we don't watch for properties that return method calls
            var cacheability = this._cacheability;
            if (cacheability === null) cacheability = this._isCall;
            if (cacheability) {
                 this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_CONTENT);
            } else {
                 this._setNonCacheable(this._nonCacheable | Amm.Operator.NON_CACHEABLE_CONTENT);
            }
        } else {
            this._subToProp(this._propertyValue);
            if (object.outCleanup) this._sub(object, 'cleanup', this._handleObjectCleanup, undefined, true);
        }
    },

    
    getReportsContentChanged: function() {
        return this._cacheability;
    },
    
    _subToProp: function(property) {
        if (!property && property !== 0 || (this._objectValue['Amm.Array'] && parseInt(property) == property)) {
            // become cacheable
            // Also we don't need to observe Amm.Array because it is done by Amm.Operator
            if (this._nonCacheable) this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_VALUE); 
            return;
        }
        var e = property + 'Change';
        if (!this._objectValue.hasEvent(e)) e = null;
        if (e) {
            this._sub(this._objectValue, e, undefined, undefined, true);
            this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_VALUE);
        } else {
            this._setNonCacheable(this._nonCacheable | Amm.Operator.NON_CACHEABLE_VALUE);
        }
        this._eventName = e;
    },
    
    _propertyChange: function(property, oldProperty) {
        if (!this._objectValue || !this._objectValue['Amm.WithEvents']) return;
        if (this._eventName === 'spliceItems' && parseInt(property) == property) return; // index changed - ok than
        if (this._eventName) this._unsub(this._objectValue, this._eventName);
        if (!this._isCall) {
            this._subToProp(property);
        } else {
            var cacheability = this._cacheability;
            if (cacheability === null) cacheability = true;
            if (cacheability) {
                 this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_VALUE);
            } else {
                 this._setNonCacheable(this._nonCacheable | Amm.Operator.NON_CACHEABLE_VALUE);
            }
        }
    },
    
    _doEvaluate: function(again) {
        
        var property = this._getOperandValue('property', again);
        
        if (!property && property !== 0) return; 
        property = '' + property;
        
        var object = this._getOperandValue('object', again);
        
        if (!object) return;
        
        if (this._isCall && !this._isNew) {
            
            if (typeof object[property] !== 'function') throw Error("cannot call a non-function property");
            var args = this._getOperandValue('arguments', again);
            if (args === null || args === undefined) return object[property]();
            else if (args instanceof Array) return object[property].apply(object, args);
            else return object[property](args);
        }
        
        var getter = 'get' + property[0].toUpperCase() + property.slice(1);
        
        if (this._isNew) {
            var constructor;
            if (typeof object[getter] !== 'function') constructor = object[property];
            else constructor = object[getter]();
            
            if (!constructor) return;
            
            constructor = Amm.Operator.FunctionCall.getFunction(constructor);
            args = this._getOperandValue('arguments', again);
            
            return Amm.Operator.FunctionCall.newVarArgs(constructor, args);
        }
        
        if (typeof object[getter] !== 'function') return object[property];

        args = this._getOperandValue('arguments', again);

        if (args === null || args === undefined) {

        } else if (args instanceof Array) {
            if (!args.length) args = null;
        } else {
            args = [args];
        }
        
        if (args) return object[getter].apply(object, args);
        else return object[getter]();
        
    },

    toFunction: function() {
        var _property = this._operandFunction('property');
        var _object = this._operandFunction('object');
        var _args = this._operandFunction('arguments');
        var _isNew = this._isNew;

        if (this._isCall) return function(e) {
            var property = _property(e);
            if (!property && property !== 0) return; 
            property = '' + property;
            
            var object = _object(e);
            if (!object) return;
            
            if (typeof object[property] !== 'function') Error("cannot call a non-function property");
            var args = _args(e);
            if (_isNew) return Amm.Operator.FunctionCall.newVarArgs(object[property], args);
            if (args === null || args === undefined) return object[property]();
            else if (args instanceof Array) return object[property].apply(object, args);
            return object[property](args);
        };
        
        return function(e) {
            
            var property = _property(e);
            if (!property && property !== 0) return; 
            property = '' + property;
            
            var object = _object(e);
            if (!object) return;
            
            var getter = 'get' + property[0].toUpperCase() + property.slice(1);
            
            if (typeof object[getter] !== 'function') return object[property];
            
            var args = _args(e);

            if (args === null || args === undefined) {

            } else if (args instanceof Array) {
                if (!args.length) args = null;
            } else {
                args = [args];
            }

            if (args) return object[getter].apply(object, args);
            else return object[getter]();
        };
    },
    
    _doSetValue: function(value, checkOnly) {
        
        var property = this._getOperandValue('property');
        
        if (!property && property !== 0) return; 
        property = '' + property;
        
        if (property[0] === '_') return 'cannot assign to pseudo-private properties(beginning with \'_\')';
        
        var object = this._getOperandValue('object');
        if (!object) return '`object` is empty';
        
        var getter = 'get' + property[0].toUpperCase() + property.slice(1);

        var suff = property[0].toUpperCase() + property.slice(1);
        var getter = 'get' + suff;
        var setter = 'set' + suff;
        var hasGetter = typeof object[getter] === 'function';
        var hasSetter = typeof object[setter] === 'function';
        
        if (hasGetter && !hasSetter) return 'property is read-only (has getter but no setter)';
        
        if (checkOnly) return false;
        
        if (!hasSetter) {
            object[property] = value;
            return;
        }
        
        var args = this._getOperandValue('arguments');

        if (args === null || args === undefined) {
        } else if (args instanceof Array) {
            if (!args.length) args = null;
        } else {
            args = [args];
        }

        if (args) {
            args = [].concat([value], args);
            object[setter].apply(object, args);
            return;
        }
        object[setter](value);
        
    },
        
    assignmentFunction: function() {
        var _property = this._operandFunction('property');
        var _object = this._operandFunction('object');
        var _args = this._operandFunction('arguments');
        return function(e, value) {
            
            var property = _property(e);
            if (!property) return '`property` is empty';
            property = '' + property;
            if (property[0] === '_') return 'cannot assign to pseudo-private properties(beginning with \'_\')';
            
            var object = _object(e);
            if (!object) return '`object` is empty';        
            
            var suff = property[0].toUpperCase() + property.slice(1);
            var getter = 'get' + suff;
            var setter = 'set' + suff;
            var hasGetter = typeof object[getter] === 'function';
            var hasSetter = typeof object[setter] === 'function';
            
            if (hasGetter && !hasSetter) return 'property is read-only (has getter but no setter)';
            
            if (!hasSetter) {
                object[property] = value;
                return;
            }
            
            var args = _args(e);

            if (args === null || args === undefined) {
            } else if (args instanceof Array) {
                if (!args.length) args = null;
            } else {
                args = [args];
            }

            if (args) {
                args.unshift(value);
                object[setter].apply(object, args);
                return;
            }
            object[setter](value);
        };
    },
    
    _isValueObservable: function(operand, value) {
        if (operand === 'arguments') return false; // array result of "list" operator DOES NOT change
        return Amm.Operator.prototype._isValueObservable.call(this, operand, value);
    },
    
    _reportChange: function(oldValue) {
        Amm.Operator.prototype._reportChange.call(this, oldValue);
        if (this._isNew && oldValue && typeof oldValue.cleanup === 'function') {
            oldValue.cleanup();
        }
    },

};

Amm.extend(Amm.Operator.Property, Amm.Operator);

/* global Amm */

Amm.Operator.Binary = function(left, operator, right) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    this._setOperator(operator);
    if (left !== undefined) this._setOperand('left', left);
    if (right !== undefined) this._setOperand('right', right);
    this._isEvaluating--;
};

Amm.Operator.Binary.BINARY_OPERATORS = {
    '!==': function(left, right) { return left !== right; },
    '===': function(left, right) {return left === right; },
    '==': function(left, right) {return left == right; },
    '!=': function(left, right) {return left != right; },
    '+': function(left, right) {return left + right; },
    '-': function(left, right) {return left - right; },
    '*': function(left, right) {return left * right; },
    '%': function(left, right) {return left % right; },
    '/': function(left, right) {return left / right; },
    '>': function(left, right) {return left > right; },
    '<': function(left, right) {return left < right; },
    '<=': function(left, right) {return left <= right; },
    '>=': function(left, right) {return left >= right; },
    '&': function(left, right) {return left & right; },
    '|': function(left, right) {return left | right; },
    '&&': function(left, right) {return left && right; },
    '||': function(left, right) {return left || right; },
    'instanceof': function(left, right) { return Amm.Operator.Binary.instanceof(left, right); }
};
    


// returns Expression variable with the name that matches the operand

Amm.Operator.Binary.prototype = {

    'Amm.Operator.Binary': '__CLASS__', 
    
    _leftOperator: null,
    
    _leftValue: null,
    
    _leftExists: null,

    _operator: null,
    
    _operatorFn: null,

    _rightOperator: null,
    
    _rightValue: null,
    
    _rightExists: null,
    
    OPERANDS: ['left', 'right'],
    
    STATE_SHARED: {
        _operator: true,
        _operatorFn: true
    },
    
    supportsAssign: false,
    
    _setOperator: function(operator) {
        var fn = Amm.Operator.Binary.BINARY_OPERATORS[operator];
        if (!fn)
            Error("Unsupported binary operator type: '" + operator + "'");
        this._operator = operator;
        this._operatorFn = fn;
    },

    _doEvaluate: function(again) {
        var left = this._getOperandValue('left', again);
        var right = this._getOperandValue('right', again);
        return this._operatorFn(left, right);
    },
    
    setLeft: function(left) {
        this._setOperand('left', left);
    },
        
    setRight: function(right) {
        this._setOperand('right', right);
    },
    
    toFunction: function() {
        var l = this._operandFunction('left');
        var r = this._operandFunction('right');
        var op = this._operatorFn;
        return function(e) {
            return op(l(e), r(e));
        };
    }
    
};

Amm.extend(Amm.Operator.Binary, Amm.Operator);

Amm.Operator.Binary.instanceof = function(object, constructor) {
    if (!constructor) return false;
    if (!object && typeof object !== 'object') return false;
    if (typeof constructor === 'string') {
        constructor = Amm.Operator.FunctionCall.getFunction(constructor, true);
        if (!constructor) return false;
    }
    if (typeof constructor !== 'function') {
        throw Error("right-side of instanceof must be either string or function");
    }
    if (object instanceof constructor) return true;
    return Amm.is(object, constructor);
};


/* global Amm */

/**
 *  Locates elements in scope of owner component of `component` and its' parent components.
 *  Range is either index or '*' (means array will be returned)
 */
Amm.Operator.ComponentElement = function(component, id, range, componentOnly, allElements) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    this._componentOnly = componentOnly;
    if (component !== undefined) this._setOperand('component', component);
    if (id !== undefined) this._setOperand('id', id);
    if (range !== undefined) this._setOperand('range', range);
    if (allElements !== undefined) this._allElements = !!allElements;
    this._isEvaluating--;
};

Amm.Operator.ComponentElement.prototype = {

    'Amm.Operator.ComponentElement': '__CLASS__', 

    // Searches only components
    _componentOnly: false,
    
    // Means if no id is provided, should return all elements
    _allElements: false,
    
    _componentOperator: null,
    
    _componentValue: null,
    
    _componentExists: null,
    
    _idOperator: null,
    
    _idValue: null,
    
    _idExists: null,
    
    _rangeOperator: null,
    
    _rangeValue: null,
    
    _rangeExists: null,
    
    OPERANDS: ['component', 'id', 'range'],
    
    STATE_SHARED: {
        _componentOnly: true
    },
    
    supportsAssign: false,
    
    getReportsContentChanged: function() {
        return true;
    },

    _componentEvents: function(component, oldComponent) {
        if (oldComponent && oldComponent['Component'])
            this._unsub(oldComponent);
        if (component && component['Component']) {
            var map = {
                acceptedElements: this._acceptedElements,
                rejectedElements: this._rejectedElements,
                renamedElement: this._renamedElement
            };
            if (this._componentOnly) {
                map['childComponentStatusChange'] = this._childComponentStatusChange;
            }
            this._sub(component, map);
        }
    },
    
    _rangeChange: function(range) {
        this._checkArrayChange = range === '*';
    },

    _acceptedElements: function(elements) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._allElements && (!this._idExists || !this._idValue)) return;
        var found = false;
        // only if we have element with interesting id
        for (var i = 0, l = elements.length; i < l; i++) {
            if (elements[i].getId() === this._idValue) {
                found = true;
                break;
            }
        }
        if (found) this.evaluate();
    },
    
    _rejectedElements: function(elements) {
        return this._acceptedElements(elements);
    },
    
    _renamedElement: function(element, id, oldId) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._idExists || !this._idValue) return;
        if (id === this._idValue || oldId === this._idValue) this.evaluate();
    },
    
    _childComponentStatusChange: function(component, status) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._idExists || !this._idValue) return;
        if (component.getId() === this._idValue || component.getInternalId() === this._idValue) this.evaluate();
    },
    
    setComponent: function(component) {
        this._setOperand('component', component);
    },
    
    setId: function(id) {
        this._setOperand('id', id);
    },
    
    _doEvaluate: function(again) {
        var range = this._getOperandValue('range', again);
        var id = this._getOperandValue('id', again);
        var component = this._getOperandValue('component', again);
        return Amm.Operator.ComponentElement._eval(component, id, range, this._componentOnly, this._allElements);
    },
    
    toFunction: function() {
        var _component = this._operandFunction('component');
        var _id = this._operandFunction('id');
        var _range = this._operandFunction('range');
        var componentOnly = this._componentOnly;
        var allElements = this._allElements;
        return function(e) {
            var range = _range(e);
            var id = _id(e);
            var component = _component(e);
            return Amm.Operator.ComponentElement._eval(component, id, range, componentOnly, allElements);
        };
    }
    
};

Amm.Operator.ComponentElement._eval = function(component, id, range, componentOnly, allElements) {
    var multi = range === '*' || !id && allElements;
    var def = multi? [] : undefined;
    if (!component || !component['Component'] || !component.getIsComponent()) return def;
    if (componentOnly) {
        var items;
        if (!id && allElements) items = component.getElements();
            else items = component.getAllNamedElements(id);
        var components = [];
        for (var i = 0; i < items.length; i++) if (items[i]['Component'] && items[i].getIsComponent()) 
            components.push(items[i]);
        return multi? components: components[range];
    }
    if (multi) {
        if (!id && allElements) return component.getElements();
        return component.getAllNamedElements(id);
    }
    return component.getNamedElement(id, range);
};

Amm.extend(Amm.Operator.ComponentElement, Amm.Operator);/* global Amm */

Amm.Operator.Var = function(varName) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    if (varName !== undefined) this._setOperand('varName', varName);
    this._isEvaluating--;
};

// returns Expression variable with the name that matches the operand

Amm.Operator.Var.prototype = {

    'Amm.Operator.Var': '__CLASS__', 
    
    _varNameOperator: null,
    
    _varNameValue: null,
    
    _varNameExists: null,
    
    _varsProvider: null,
    
    _varsProviderContextId: null,
    
    OPERANDS: ['varName'],

    STATE_SHARED: {
        _varsProvider: true
    },
    
    supportsAssign: true,
    
    notifyProviderVarsChange: function(value, oldValue, name, provider) {
        if (this._varNameValue && name && this._varNameValue !== name) {
            Error("WTF - we shouldn't received wrong varsChange notification");
        }
        if (this._expression && this._expression.getUpdateLevel()) {
            this._expression.queueUpdate(this);
        } else {
            this.evaluate();
        }
    },

    setExpression: function(expression) {
        Amm.Operator.prototype.setExpression.call(this, expression);
        this._varsProvider = expression;
        this._varsProviderContextId = expression._contextId;
        for (var p = this._parent; p; p = p._parent) {
            if (p['Amm.Operator.VarsProvider']) {
                this._varsProvider = p;
                this._varsProviderContextId = p._contextId;
                break;
            }
        }
        if (this._varsProvider && this._varNameExists && this._varNameValue) {
            this._varsProvider.addConsumer(this, this._varNameValue + '');
        }
    },
    
    _initContextState: function(contextId, own) {
        Amm.Operator.prototype._initContextState.call(this, contextId, own);
        if (own && this._varsProvider) {
            this._varsProviderContextId = this._varsProvider._contextId;
        }
    },
    
    _doEvaluate: function(again) {
        var varName = this._getOperandValue('varName', again);
        if (!varName) return; // no variable
        if (!this._varsProvider) {
            this._hasValue = false;
            return;
        }
        var tmp;
        if (this._varsProviderContextId && this._varsProviderContextId !== this._varsProvider._contextId) {
            tmp = this._varsProvider._contextId;
            this._varsProvider.setContextId(this._varsProviderContextId);
        }
        var res = this._varsProvider.getVars(varName);
        if (tmp) this._varsProvider.setContextId(tmp);
        return res;
    },
    
    _varNameChange: function(value, oldValue, hasValue) {
        if (!this._varsProvider) return;
        var tmp;
        if (this._varsProviderContextId && this._varsProviderContextId !== this._varsProvider._contextId) {
            tmp = this._varsProvider._contextId;
            this._varsProvider.setContextId(this._varsProviderContextId);
        }
        if (oldValue) this._varsProvider.deleteConsumer(this, oldValue);
        if (value) this._varsProvider.addConsumer(this, value);
        if (tmp) this._varsProvider.setContextId(tmp);
    },
        
    _doSetValue: function(value, checkOnly) {
        var varName = this._getOperandValue('varName');
        if (!varName && varName !== 0) return "`varName` is empty";
        if (!this._varsProvider) return "expression not provided";
        if (checkOnly) return '';
        var tmp;
        if (this._varsProviderContextId && this._varsProviderContextId !== this._varsProvider._contextId) {
            tmp = this._varsProvider._contextId;
            this._varsProvider.setContextId(this._varsProviderContextId);
        }
        this._varsProvider.setVars(value, varName);
        if (tmp) this._varsProvider.setContextId(tmp);
    },
        
    setVarName: function(varName) {
        this._setOperand('varName', varName);
    },
    
    toFunction: function() {
        var f = this._operandFunction('varName');
        return function(e) {
            var varName = f(e);
            if (!varName) return;
            return e.vars[varName];
        };
    },
    
    assignmentFunction: function() {
        var f = this._operandFunction('varName');
        return function(e, value) {
            var varName = f(e);
            if (!varName && varName !== 0) return "`varName` is empty";
            e.vars[varName] = value;
        };
    },
    
    _partialCleanup: function() {
        if (this._expression && this._varsProvider) {
            this._expression.unsubscribeOperator(this._expression, 'varsChange', this);
        }
        if (this._varsProvider && this._varsProvider.hasContext(this._varsProviderContextId)) {
            var tmp;
            if (this._varsProviderContextId && this._varsProviderContextId !== this._varsProvider._contextId) {
                tmp = this._varsProvider._contextId;
                this._varsProvider.setContextId(this._varsProviderContextId);
            }
            this._varsProvider.deleteConsumer(this, this._varNameValue + '');
            if (tmp) this._varsProvider.setContextId(tmp);
        }
        Amm.Operator.prototype._partialCleanup.call(this);
    }
    
};

Amm.extend(Amm.Operator.Var, Amm.Operator);

/* global Amm */
Amm.Operator.Range = function(source) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    if (source !== undefined) this._setOperand('source', source);
    this._isEvaluating--;
};

Amm.Operator.Range.prototype = {

    'Amm.Operator.Range': '__CLASS__', 

    _sourceOperator: null,
    
    _sourceValue: null,
    
    _sourceExists: null,
    
    OPERANDS: ['source'],
    
    supportsAssign: false,
    
    getReportsContentChanged: function() {
        return true;
    },

    _setSource: function(source) {
        this._setOperand('source', source);
    },

    _doEvaluate: function(again) {
        Error("Call to abstract function");
    },
    
    toFunction: function() {
        Error("Call to abstract function");
    }
    
};

Amm.extend(Amm.Operator.Range, Amm.Operator);

/* global Amm */

/**
 * Range that returns items with values and/or indexes matching certain condition.
 * Examples:
 * $pupils{$pupil: $pupil.age > 7} // pupils with age above 7
 * $items{$i => $item: $i < 20 && $item.selected} // selected items from first 20
 * $rows{$i => : $i % 2 == 0} // only even rows
 */
Amm.Operator.Range.Condition = function(source, condition, keyVar, valueVar) {
    this._isEvaluating++;
    this._map = [];
    Amm.Operator.Range.call(this, source);
    this._value = [];
    this._nonCacheableIteratorContexts = {};
    if (keyVar !== undefined) this.keyVar = keyVar;
    if (valueVar !== undefined) this.valueVar = valueVar;
    var iterator = new Amm.Operator.Range.Iterator(condition, keyVar, valueVar);
    this._setOperand('iterator', iterator);
    this._isEvaluating--;
};

Amm.Operator.Range.Condition.prototype = {

    'Amm.Operator.Range.Condition': '__CLASS__', 

    _iteratorOperator: null,
    
    _iteratorValue: null,
    
    _iteratorExists: null,
    
    _checkArrayChange: true,
    
    keyVar: null,
    
    valueVar: null,
    
    _nonCacheableIteratorContexts: null,
    
    _numNonCacheableIteratorContexts: 0,
    
    /**
     * Maps source items to this._iteratorOperator contexts
     * @type Array [ index: {c: contextId, o: item, i: index, v: iterator value} ]
     */
    _map: null,
    
    OPERANDS: ['source', 'iterator'],
    
    STATE_SHARED: {
        keyVar: true,
        valueVar: true
    },
    
    supportsAssign: false,
    
    _setSource: function(source) {
        this._setOperand('source', source);
    },

    _sourceEvents: function(source, oldSource) {
        
        // todo: properly subscribe to Collection events
    },

    _sortMap: function(start) {
        var res = start? this._map.slice(0, start) : [];
        res.length = this._map.length;
        for (var i = start || 0, l = this._map.length; i < l; i++) {
            if (!this._map[i]) {
                res.length--;
                continue;
            }
            res[this._map[i].i] = this._map[i];
        }
        this._map = res;
    },
    
    _doEvaluate: function(again) {
        var res = [], s = true;
        for (var i = 0, l = this._map.length; i < l; i++) {
            if (s && (!this._map[i] || this._map[i].i !== i)) {
                s = false;
                this._sortMap(i);
                l = this._map.length;
                i--;
            }
            var cxid = this._map[i].c;
            if (again) {
                this._iteratorOperator.setContextId(cxid);
                this._map[i].v = this._iteratorOperator.getValue(again);
            } else {
                var d = this._iteratorOperator._contextId === cxid? 
                    this._iteratorOperator : this._iteratorOperator._contextState[cxid];
                if (d._hasValue) this._map[i].v = d._value;
                else {
                    this._iteratorOperator.setContextId(cxid);
                    this._map[i].v = this._iteratorOperator.getValue();
                }
            }
            if (this._map[i].v) res.push(this._map[i].o);
        }
        return res;
    },
    
    toFunction: function() {
        var s = this._operandFunction('source');
        var c = this._operandFunction('iterator');
        var k = this.keyVar || '';
        var v = this.valueVar || '';
        var fn = function(e) {
            var items = s(e), l = items.length;
            if (!l) return [];
            var vars = c.vars, tmp1 = vars[k], tmp2 = vars[v], res = [];
            for (var i = 0; i < l; i++) {
                vars[k] = i;
                vars[v] = items[i];
                if (c(e)) res.push(items[i]);
            }
            vars[k] = tmp1;
            vars[v] = tmp2;
            return res;
        };
        return fn;
    },
    
    _clearIteratorContexts: function() {
        this._isEvaluating++;
        this._map = [];
        for (var i in this._iteratorOperator._contextState) {
            if (i !== '0' && this._iteratorOperator._contextState.hasOwnProperty(i) && this._iteratorOperator._contextState[i]) {
                this._iteratorOperator.deleteContext(i);
            }
        }
        this._isEvaluating--;
    },
    
    notifyOperandChanged: function(operand, value, oldValue, operator) {
        if (operator === this._iteratorOperator) {
            if (operator.parentContextId !== null && operator.parentContextId !== this._contextId)
                this.setContextId(operator.parentContextId);
            if (this._lockChange) return;
            var idx = operator.index;
            if (this._map[idx] && this._map[idx].c === operator._contextId && this._map[idx].v !== value) { // check map is up-to-date
                this._map[idx].v = value;
                if (!this._isEvaluating) this.evaluate();
            }
            return;
        }
        Amm.Operator.Range.prototype.notifyOperandChanged.call(this, operand, value, oldValue, operator);
    },
    
    // Builds iterator contexts from scratch
    _buildIteratorContexts: function() {
        this._isEvaluating++;
        var items = this._sourceValue, l = items.length, it = this._iteratorOperator;
        this._map.length = items.length;
        for (var i = 0; i < l; i++) {
            var v = {};
            if (this.keyVar !== null) v[this.keyVar] = i;
            if (this.valueVar !== null) v[this.valueVar] = items[i];
            this._iteratorOperator.createContext({index: i, parentContextId: this._contextId, vars: v});
            this._map[i] = {
                c: this._iteratorOperator._contextId,
                i: i,
                o: items[i],
                v: undefined
            };
        }
        this._isEvaluating--;
    },

    /**
     * symDiff: true: always, false - never, 
     * undefined - smart. will be done only when
     * a) cut.length = insert.length
     * b) cut.length < oldItems.length (it means items.length < changeInfo.insert.length)
     */
    _adjustIteratorContexts: function(changeInfo, symDiff) {
        var items = this._sourceValue || [];
        if (symDiff === undefined) 
            symDiff = changeInfo.cut.length === changeInfo.insert.length 
            || items.length < changeInfo.insert.length;
        
        if (!changeInfo.cut.length || !changeInfo.insert.length) symDiff = false;
        
        // shortcut 1: clear items (all deleted)
        if (!items.length) {
            this._clearIteratorContexts();
            return;
        }
        
        // shortcut 2: rebuild everything when all added
        // (either to empty array or no sym diff thus we assume all replaced)
        if ((!changeInfo.cut.length || !symDiff) && changeInfo.insert.length === items.length) { 
            if (this._map.length) this._clearIteratorContexts();
            this._buildIteratorContexts();            
            return;
        }
        this._isEvaluating++;
        
        var offset = changeInfo.index;

        var addedIdx,
            deletedIdx = [], 
            movedIdx; // moved: [[oldIdx => newIdx]]
        
        if (symDiff) {
            var matches = [], deleted; 
            // note that `matches` indexes in this.items are off by `offset`
            deleted = Amm.Array.symmetricDiff(changeInfo.cut, changeInfo.insert, null, matches);
            addedIdx = Amm.Array.findNonMatched(matches, changeInfo.insert.length);
            movedIdx = [];
            for (var i = 0, l = matches.length; i < l; i++) {
                if (matches[i] === null) deletedIdx.push(i);
                else if (matches[i] !== i) 
                    movedIdx.push([i, matches[i]]);
            }
        } else {
            addedIdx = [];
            for (var i = 0; i < changeInfo.cut.length; i++) {
                deletedIdx.push(i);
            }
            for (var i = 0; i < changeInfo.insert.length; i++) {
                addedIdx.push(i);
            }
            movedIdx = [];
        }
        
        // now we need to calculate adjustments to our map and contexts
        
        var m = this._map, mmb;
        
        // need also move items rightside of the splice
        var delta = changeInfo.insert.length - changeInfo.cut.length;
        if (delta) {
            for (var i = offset + changeInfo.cut.length; i < m.length; i++) {
                movedIdx.push([i - offset, i + delta - offset]);
            }
        }
        
        //console.log('sd', symDiff, 'a', addedIdx, 'd', deletedIdx, 'm', movedIdx, 'o', offset, 'dt', delta, 'ci', changeInfo);
        
        var iter = this._iteratorOperator;
                            
        // move what's moved
        for (var i = 0, l = movedIdx.length; i < l; i++) {
            mmb = m[movedIdx[i][0] + offset];
            mmb.i = movedIdx[i][1] + offset;
            if (mmb.c === iter._contextId) {
                iter.index = mmb.i;
            } else {
                iter._contextState[mmb.c].index = mmb.i;
            }
            if (this.keyVar) {
                iter.setContextId(mmb.c);
                iter.setVars(mmb.i, this.keyVar);
            }
        }
        var numReuse = deletedIdx.length < addedIdx.length? deletedIdx.length : addedIdx.length;
        //console.log('nr', numReuse);
        
        // delete + create: replace item and index
        for (var i = 0; i < numReuse; i++) {
            mmb = m[deletedIdx[i] + offset];
            mmb.i = addedIdx[i] + offset;
            mmb.o = changeInfo.insert[addedIdx[i]];
            iter.setContextId(mmb.c);
            iter.index = mmb.i;
            var v = {};
            if (this.keyVar) v[this.keyVar] = mmb.i;
            if (this.valueVar) v[this.valueVar] = mmb.o;
            iter.setVars(v);
        }
        
        // delete (leftovers)
        for (var i = addedIdx.length; i < deletedIdx.length; i++) {
            iter.deleteContext(m[deletedIdx[i] + offset].c);
            m[deletedIdx[i] + offset] = null; // should work
        }
        
        // create (we need new items)
        for (var i = deletedIdx.length; i < addedIdx.length; i++) {
            var v = {};
            if (this.keyVar !== null) v[this.keyVar] = addedIdx[i] + offset;
            if (this.valueVar !== null) v[this.valueVar] = changeInfo.insert[addedIdx[i]];
            iter.createContext({index: addedIdx[i] + offset, parentContextId: this._contextId, vars: v});
            m.push({
                c: iter._contextId,
                i: addedIdx[i] + offset,
                o: changeInfo.insert[addedIdx[i]],
                v: undefined
            });
        }
        
        this._map = m;
        this._sortMap();
        
        this._isEvaluating--;
    },
    
    _sourceChange: function(value, oldValue) {
        // todo: rebuild contexts in iterator and re-evaluate
        var items = value && value.length? value : null;
        var oldItems = oldValue && oldValue.length? oldValue : null;
        var index, cut, insert;
        if (!oldItems) {
            if (!items) return; // nothing to do - both items and oldItems are empty
            cut = []; insert = items; index = 0; 
        }
        else if (!items) { cut = oldItems? oldItems.slice(0, oldItems.length) : []; insert = []; index = 0; }
        else { // we have both items and oldItems
            var diff = Amm.Array.smartDiff(oldItems, items, null, true);
            if (!diff) return; // arrays are equal
            if (diff[0] !== 'splice') Error("Assertion - should receive only 'splice' event (spliceOnly === true)");
            cut = diff[2]? oldValue.slice(diff[1], diff[1] + diff[2]) : [];
            insert = diff[3];
            index = diff[1];
        }
        var changeInfo = this._makeChangeInfoForSplice (index, cut, insert);
        this._adjustIteratorContexts(changeInfo);
    },
    
    notifyOperandContentChanged: function(operand, changeInfo, internal) {
        if (operand === 'source') {
            this._adjustIteratorContexts(changeInfo, true);
        }
        return Amm.Operator.prototype.notifyOperandContentChanged.call
            (this, operand, changeInfo, internal);
    },

    _constructContextState: function() {
        var res = Amm.Operator.Range.prototype._constructContextState.call(this);
        res._map = [];
        res._value = [];
        res._nonCacheableIteratorContexts = {};
        return res;
    },
    
    _propagateContext: function(operand, operator, down) {    
        // TODO: sometimes we still need to propagate contexts
        if (operator === this._iteratorOperator) {
            if (this._contextId !== operator.parentContextId) {
                if (!down) this.setContextId(operator.parentContextId);
                return;
            }
            return;
        }
        return Amm.Operator.Range.prototype._propagateContext.call(this, operand, operator, down);
    },
    
    notifyOperandNonCacheabilityChanged: function(operand, nonCacheability, operator) {
        if (operator === this._iteratorOperator) {
            if (operator.parentContextId !== this._contextId) return; // ignore irrelevant context
            var contextId = operator._contextId;
            if (nonCacheability) {
                this._nonCacheableIteratorContexts[contextId] = true;
                this._numNonCacheableIteratorContexts++;
            } else {
                delete this._nonCacheableIteratorContexts[contextId];
                this._numNonCacheableIteratorContexts--;
            }
        }
        return Amm.Operator.prototype.notifyOperandNonCacheabilityChanged.call(this, operand, nonCacheability, operator);
    },
    
    _checkNonCacheableIterator: function() {
        for (var i in this._nonCacheableIteratorContexts) {
            if (this._nonCacheableIteratorContexts.hasOwnProperty(i)) {
                this._iteratorOperator.setContextId(i);
                this._iteratorOperator.checkForChanges();
            }
        }
    },
    
    _checkNonCacheableOperators: function() {
        if (this._hasNonCacheable <= !!this._nonCacheable) return; // we don't have NC operators
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var op = '_' + this.OPERANDS[i] + 'Operator';
            if (this[op] === this._iteratorOperator) {
                if (this._numNonCacheableIteratorContexts)
                    this._checkNonCacheableIterator();
                continue;
            }
            if (!this[op]) continue;
            if (this[op]._contextId !== this._contextId) {
                this._propagateContext(op, this[op], true);
            }
            if (this[op]._hasNonCacheable) {
                this[op].checkForChanges();
            }
        }
    }
    
};

Amm.extend(Amm.Operator.Range.Condition, Amm.Operator.Range);
/* global Amm */

/**
 * Range like $source{$index} - returns SINGLE element from an array.
 * If $index is zero (0) and $source is NOT an array, will return the $source
 */
Amm.Operator.Range.Slice = function(source, start, end) {
    this._isEvaluating++;
    Amm.Operator.Range.call(this);
    if (source !== undefined) this._setOperand('source', source);
    if (start !== undefined) this._setOperand('start', start);
    if (end !== undefined) this._setOperand('end', end);
    this._isEvaluating--;
};

Amm.Operator.Range.Slice.prototype = {

    'Amm.Operator.Range.Slice': '__CLASS__', 

    _startOperator: null,
    
    _startValue: null,
    
    _startExists: null,
    
    OPERANDS: ['source', 'start', 'end'],
    
    supportsAssign: false,
    
    _doEvaluate: function(again) {
        var source = this._getOperandValue('source', again);
        var start = this._getOperandValue('start', again);
        var end = this._getOperandValue('end', again);
        if (!start && typeof start !== 'number') start = null;
        if (!end && typeof end !== 'number') end = null;
        if (source && (source instanceof Array || source['Amm.Array'])) {
            return source.slice(start, end);
        }        
        return undefined;
    },
    
    toFunction: function() {
        var _source = this._operandFunction('source');
        var _start = this._operandFunction('start');
        var _end = this._operandFunction('end');
        return function(e) {
            var source = _source(e);
            var start = _start(e);
            var end = _end(e);
            if (!start && typeof start !== 'number') start = null;
            if (!end && typeof end !== 'number') end = null;
            if (source && (source instanceof Array || source['Amm.Array'])) {
                return source.slice(start, end);
            }        
            return undefined;
        };
    }
    
};

Amm.extend(Amm.Operator.Range.Slice, Amm.Operator.Range);
/* global Amm */

/**
 * Range like $source{$index} - returns SINGLE element from an array.
 * If $index is zero (0) and $source is NOT an array, will return the $source
 */
Amm.Operator.Range.RegExp = function(source, regexp) {
    this._isEvaluating++;
    Amm.Operator.Range.call(this);
    if (source !== undefined) this._setOperand('source', source);
    if (regexp !== undefined) this._setOperand('regexp', regexp);
    this._isEvaluating--;
};

Amm.Operator.Range.RegExp.prototype = {

    'Amm.Operator.Range.RegExp': '__CLASS__', 

    _regexpOperator: null,
    
    _regexpValue: null,
    
    _regexpExists: null,
    
    OPERANDS: ['source', 'regexp'],
    
    supportsAssign: false,
    
    _doEvaluate: function(again) {
        var source = this._getOperandValue('source', again);
        var regexp = this._getOperandValue('regexp', again);
        if (!(source && (source instanceof Array || source['Amm.Array']) && regexp instanceof RegExp))
            return undefined;
        var res = [];
        for (var i = 0, l = source.length; i < l; i++) if (regexp.exec('' + source[i])) {
            res.push(source[i]);
        }
        return res;
    },
    
    toFunction: function() {
        var _source = this._operandFunction('source');
        var _regexp = this._operandFunction('regexp');
        return function(e) {
            var source = _source(e);
            var regexp = _regexp(e);
            if (!(source && (source instanceof Array || source['Amm.Array']) && regexp instanceof RegExp))
                return undefined;
            var res = [];
            for (var i = 0, l = source.length; i < l; i++) if (regexp.exec('' + source[i])) {
                res.push(source[i]);
            }
            return res;
        };
    }
    
};

Amm.extend(Amm.Operator.Range.RegExp, Amm.Operator.Range);
/* global Amm */

/**
 * Range like $source{*} - returns ALL elements of an array; converts non-arrays to arrays
 * (null => [], undefined => undefined)
 */
Amm.Operator.Range.All = function(source) {
    Amm.Operator.Range.call(this, source);
};

Amm.Operator.Range.All.prototype = {

    'Amm.Operator.Range.All': '__CLASS__', 

    _sourceOperator: null,
    
    _sourceValue: null,
    
    _sourceExists: null,
    
    OPERANDS: ['source'],
    
    supportsAssign: false,

    _doEvaluate: function(again) { 
        var source = this._getOperandValue('source', again);
        if (source === null) return [];
        if (source === undefined) return undefined;
        if (source instanceof Array || source['Amm.Array']) return source;
        return [source];
    },
    
    toFunction: function() {
        var _source = this._operandFunction('source');
        return function(e) {
            var source = _source(e);
            if (source === null) return [];
            if (source === undefined) return undefined;
            if (source instanceof Array || source['Amm.Array']) return source;
            return [source];
        };
    }
    
};

Amm.extend(Amm.Operator.Range.All, Amm.Operator.Range);
/* global Amm */

Amm.Operator.Range.Iterator = function(condition, keyVar, valueVar) {
    this._isEvaluating++;
    Amm.Operator.VarsProvider.call(this, condition);
    this.keyVar = keyVar || null;
    this.valueVar = valueVar || null;
    this._isEvaluating--;
};

Amm.Operator.Range.Iterator.prototype = {

    'Amm.Operator.Range.Iterator': '__CLASS__',

    keyVar: null,
    
    valueVar: null,
    
    index: null,
    
    parentContextId: null,
    
    supportsAssign: false,
    
    STATE_SHARED: {
        keyVar: true,
        valueVar: true
    },
    
    _doEvaluate: function(again) { // converts result to boolean
        var res = this._getOperandValue('operator', again);
        if (res === undefined) return res;
        return !!res;
    }
    
};

Amm.extend(Amm.Operator.Range.Iterator, Amm.Operator.VarsProvider);

/* global Amm */

/**
 * Range like $source{$index} - returns SINGLE element from an array.
 * If $index is zero (0) and $source is NOT an array, will return the $source
 */
Amm.Operator.Range.Index = function(source, index) {
    this._isEvaluating++;
    Amm.Operator.Range.call(this);
    if (source !== undefined) this._setOperand('source', source);
    if (index !== undefined) this._setOperand('index', index);
    this._isEvaluating--;
};

Amm.Operator.Range.Index.prototype = {

    'Amm.Operator.Range.Index': '__CLASS__', 

    _indexOperator: null,
    
    _indexValue: null,
    
    _indexExists: null,
    
    OPERANDS: ['source', 'index'],
    
    supportsAssign: false,

    _doEvaluate: function(again) {
        var source = this._getOperandValue('source', again);
        var index = this._getOperandValue('index', again);
        if (source && (source instanceof Array || source['Amm.Array'])) {
            return source[index];
        }
        if (!index) return source;
        return undefined;
    },
    
    toFunction: function() {
        var _source = this._operandFunction('source');
        var _index = this._operandFunction('index');
        return function(e) {
            var source = _source(e);
            var index = _index(e);
            if (source && (source instanceof Array || source['Amm.Array'])) {
                return source[index];
            }
            if (!index) return source;
            return undefined;
        };
    }
    
};

Amm.extend(Amm.Operator.Range.Index, Amm.Operator.Range);
/* global Amm */

Amm.Operator.List = function(items) {
    this._isEvaluating++;
    this.OPERANDS = []; // each instance has own number of operands
    Amm.Operator.call(this);
    if (items !== undefined) this.setItems(items);
    this._isEvaluating--;
};

// zero or many arguments. Expression result is always an array

Amm.Operator.List.prototype = {

    'Amm.Operator.List': '__CLASS__', 

    _length: 0,
    
    OPERANDS: null,
    
    STATE_SHARED: {
        _length: true
    },
    
    _getContextState: function() {
        var res = Amm.Operator.prototype._getContextState.call(this);
        for (var i = 0; i < this._length; i++) {
            var v = '_' + i + 'Value', o = '_' + i + 'Operator', x = '_' + i + 'Exists', ob = '_' + i + 'Observe';
            res[v] = this[v];
            res[0] = this[o];
            res[x] = this[x];
            res[ob] = this[ob];
        }
        return res;
    },
    
    getReportsContentChanged: function() {
        // actually we won't report any content changes because
        // that's not possible for list content to change without
        // assigning new array
        return true;
    },
    
    setItems: function(items) {
        if (!(items instanceof Array)) Error("items must be an Array");
        var oldLength = this._length,
            newLength = items.length;
    
        // remove extraneous items
        for (var i = newLength; i < oldLength; i++) {
            var v = '_' + i + 'Value', o = '_' + i + 'Operator', x = '_' + i + 'Exists', ob = '_' + i + 'Observe';
            if (this[o]) this[o].cleanup();
            delete this[o];
            delete this[v];
            delete this[x];
            delete this[ob];
        }
        this._isEvaluating++;
        this.OPERANDS = [];
        for (var i = 0; i < newLength; i++) {
            this._setOperand(i, items[i]);
            this.OPERANDS.push(i);
        }
        this._length = newLength;
        this._isEvaluating--;
    },
    
    _doEvaluate: function(again) {
        var res = [], 
            same = !!this._value && this._length === this._value.length, 
            v;
        
        for (var i = 0; i < this._length; i++) {
            res.push(v = this._getOperandValue(i, again));
            same = (same && this._value[i] === v);
        }
        
        if (same) {
            return this._value; // otherwise change event will be triggered
        }
        
        return res;
    },
    
    toFunction: function() {
        var ff = [];
        for (var i = 0; i < this._length; i++)
            ff.push(this._operandFunction(i));
        var l = ff.length;
        return function(e) {
            var res = [];
            for (var i = 0; i < l; i++) res.push(ff[i]());
            return res;
        };
    }
    
};

Amm.extend(Amm.Operator.List, Amm.Operator);

/* global Amm */

Amm.Operator.FunctionCall = function(func, args, cacheability, isNew) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    this._cacheability = !!cacheability || !!isNew;
    this._isNew = !!isNew;
    if (args !== undefined) this._setOperand('args', args);
    if (func !== undefined) this._setOperand('func', func);
    if (cacheability !== undefined && cacheability !== null && !cacheability) {
        this._setNonCacheable(Amm.Operator.NON_CACHEABLE_VALUE);
    }
    this._isEvaluating--;
};

// functions that can be accessed using string identifiers
Amm.Operator.FunctionCall.WINDOW_PASSTHROUGH = [
    'RegExp', 'Intl', 'JSON', 'Math', 'Date', 'isNaN', 'isFinite', 'parseInt', 'parseFloat'
];

// returns Expression variable with the name that matches the operand

Amm.Operator.FunctionCall.prototype = {

    'Amm.Operator.FunctionCall': '__CLASS__', 

    _isNew: false,
    
    _funcOperator: null,
    
    _funcValue: null,
    
    _funcExists: null,
    
    _argsOperator: null,
    
    _argsValue: null,
    
    _argsExists: null,
    
    _cacheability: null,
    
    OPERANDS: ['func', 'args'],
    
    STATE_SHARED: {
        _cacheability: true,
        _isNew: true
    },
    
    getReportsContentChanged: function() {
        return this._cacheability;
    },
    
    _doEvaluate: function(again) {
        var func = this._getOperandValue('func', again);
        if (!func) return;
        func = Amm.Operator.FunctionCall.getFunction(func);
        var args = this._getOperandValue('args', again);
        if (this._isNew) return Amm.Operator.FunctionCall.newVarArgs(func, args);
        if (args === null || args === undefined || args instanceof Array && !args.length) {
            return func();
        } else {
            if (args instanceof Array) return func.apply(window, args);
            else return func(args);
        }
    },
    
    toFunction: function() {
        var f = this._operandFunction('func');
        var a = this._operandFunction('args');
        var isNew = this._isNew;
        return function(e) {
            var func = f(e);
            if (!func) return;
            func = Amm.Operator.FunctionCall.getFunction(func);
            var args = a(e);
            if (isNew) return Amm.Operator.FunctionCall.newVarArgs(func, args);
            if (args === null || args === undefined || args instanceof Array && !args.length) {
                return func();
            } else {
                if (args instanceof Array) return func.apply(window, args);
                else return func(args);
            }
        };
    },
    
    _isValueObservable: function(operand, value) {
        if (operand === 'args') return false; // array result of "list" operator DOES NOT change
        return Amm.Operator.prototype._isValueObservable.call(this, operand, value);
    },
    
    _reportChange: function(oldValue) {
        Amm.Operator.prototype._reportChange.call(this, oldValue);
        if (this._isNew && oldValue && typeof oldValue.cleanup === 'function') {
            oldValue.cleanup();
        }
    },
    
};

Amm.extend(Amm.Operator.FunctionCall, Amm.Operator);

Amm.Operator.FunctionCall.getFunction = function(fn, dontThrow) {
    var res;
    if (typeof fn === 'function') return fn;
    else if (typeof fn === 'string') {
        res = Amm.getFunction(fn, true);
        if (!res) {
            if (Amm.Array.indexOf(fn, Amm.Operator.FunctionCall.WINDOW_PASSTHROUGH) >= 0) {
                res = window[fn];
            }
        }
        if (!res && !dontThrow) Amm.getFunction(fn); // just to throw the exception
    } else {
        if (dontThrow) return;
        throw Error("Callee must be either function or string, given: "
                + Amm.describeType(fn));
    }
    return res;
};

Amm.Operator.FunctionCall.newVarArgs = function(fn, a) {

    if (a === null || a === undefined || (a instanceof Array && !a.length)) return new fn;
    else if (!(a instanceof Array)) return new fn(a);
    
    var l = a.length;
    if (!l) return new fn;
    if (l === 1) return new fn(a[0]); 
    if (l === 2) return new fn(a[0], a[1]); 
    if (l === 3) return new fn(a[0], a[1], a[2]); 
    if (l === 4) return new fn(a[0], a[1], a[2], a[3]); 
    if (l === 5) return new fn(a[0], a[1], a[2], a[3], a[4]); 
    if (l === 6) return new fn(a[0], a[1], a[2], a[3], a[4], a[5]); 
    if (l === 7) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6]); 
    if (l === 8) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]); 
    if (l === 9) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]); 
    if (l === 10) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]); 
    if (l === 11) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10]); 
    if (l === 12) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11]); 
    if (l === 13) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12]); 
    if (l === 14) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13]); 
    if (l === 15) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14]); 
    if (l === 16) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15]); 
    if (l === 17) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16]); 
    if (l === 18) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17]); 
    if (l === 19) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17], a[18]); 
    if (l === 20) return new fn(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13], a[14], a[15], a[16], a[17], a[18], a[19]);
    throw Error("Only argument arrays of size up to 20 are supported");
    
};/* global Amm */

Amm.ElementBound = function(options) {
    Amm.init(this, options);
};

Amm.ElementBound.prototype = {

    'Amm.ElementBound': '__CLASS__',
    
    requiredElementClass: 'Amm.Element',
    
    requiredElementInterfaces: null,
    
    /**
     * @type {Amm.Element}
     */
    _element: null,
    
    /**
     * Lock - means we don't need to unsubscribe from element events since element already
     * unsubscribed all its' subscriber since we are in the middle of his cleanup() procedure
     */
    _isElementCleanup: 0,
    
    /** 
     * element.cleanup() leads to cleanup()
     */
    cleanupWithElement: true,
    
    _doElementChange: function(element, oldElement) {
        if (oldElement && !this._isElementCleanup) {
            oldElement.unsubscribe('cleanup', this._handleElementCleanup, this);
        }
        this._element = element;
        if (this._element) this._element.subscribe('cleanup', this._handleElementCleanup, this);
    },
    
    setElement: function(element) {
        if (element !== null) {
            if (this.requiredElementClass)
                Amm.is(element, this.requiredElementClass, 'element');
            if (this.requiredElementInterfaces)
                Amm.hasInterfaces(element, this.requiredElementInterfaces, 'element');
        }
        var o = this._element;
        if (element === o) return; // nothing to do
        this._doElementChange(element, o);
        return true;
    },
    
    getElement: function() { return this._element; },
    
    _handleElementCleanup: function() {
        this._isElementCleanup++;
        if (this.cleanupWithElement) {
            this.cleanup();
        }
        this.setElement(null);
        this._isElementCleanup--;

        return true;
    },
    
    cleanup: function() {
        if (this._element) {
            if (!this._isElementCleanup) {
                // full un-subscription
                this._element.unsubscribe(undefined, undefined, this);
            }
            this.setElement(null);
        }
        Amm.callMethods(this, '_cleanup_');
        Amm.unregisterItem(this);
    },

    _requireInterfaces: function(interface, _) {
        var args = Array.prototype.slice.call(arguments);
        if (!(this.requiredElementInterfaces instanceof Array)) {
            this.requiredElementInterfaces = this.requiredElementInterfaces? [this.requiredElementInterfaces] : [];
        }
        this.requiredElementInterfaces = this.requiredElementInterfaces.concat(args);
    }
    
    
};

/* global Amm */

/**
 * Adapter binds events {Name}Change of element to setV{Name} setters of the adapter.
 * 
 * Also, initially, adapter applies two-way initialization:
 * - element values that are "undefined" are set to the values extracted from the adapter
 *   (methods getV{Name});
 * - other element values are passed to corresponding setters
 */
Amm.View.Abstract = function(options) {
    Amm.callMethods(this, '_preInit_', options);
    Amm.ElementBound.call(this, options);
    Amm.init(this, options, ['element', 'elementPath']);
    if (!this.id) this.id = Amm.getClass(this);
};

Amm.View.Abstract.waitForView = function(element, id, className, callback, scope) {
    var v = element.findView(id, className);
    if (v && v.getObserving()) {
        callback.call(scope, v, element);
        return null;
    }
    var handler = ( function() { 
        var localHandler;
        localHandler = function(view) {
            if (id !== undefined && view.id !== id) return;
            if (className !== undefined && !Amm.is(view, className)) return;
            callback.call(scope, v, element);
            element.unsubscribe('viewReady', localHandler);
        };
        return localHandler;
    } ) ();
    element.subscribe('viewReady', handler);
    return handler;
};

Amm.View.Abstract.stopWaitingForView = function(element, handler) {
    element.unsubscribe('viewReady', handler);
};


Amm.View.Abstract.prototype = {

    'Amm.View.Abstract': '__CLASS__', 
    
    // Init "undefined" element properties with values extracted from the adapter
    twoWayInit: true,
    
    // Define this in descendants to make _hasPresentation work properly. 
    // Only when both this[this._presentationPropery] and this._element are non-null, 
    // _canObserve() will return true.
    _presentationProperty: null,
    
    _observing: null,
    
    id: null,
    
    getIsReady: function() {
        return this.getObserving();
    },
    
    getObserving: function() {
        return this._observing;
    },
    
    _doElementChange: function(element, oldElement) {
        if (this._observing) this._endObserve();
        if (oldElement) oldElement.outViewDeleted(this);
        Amm.ElementBound.prototype._doElementChange.call(this, element, oldElement);
        if (element) element.outViewAdded(this);
        Amm.callMethods(this, '_elementChange_', element, oldElement);
        this._observeElementIfPossible();
    },
    
    _canObserve: function() {
        if (!this._presentationProperty) return false;
        return !!(this._element && this[this._presentationProperty]);
    },
    
    _endObserve: function() {
        this._observing = false;
        if (this._element) this._element.unsubscribe(undefined, undefined, this);
        this._releaseResources();
    },
    
    _observeElementIfPossible: function() {
        var can = this._canObserve();
        if (!can) {
            if (this._observing) this._endObserve();
            return;
        }
        if (this._observing) return;
        this._observing = true;
        this._acquireResources();
        var bindList = [], props = {};
        for (var i in this) {
            if (typeof this[i] === 'function') {
                var px = ('' + i).slice(0, 4);
                if (px === 'setV' || px === 'getV') {
                    var prop = i[4].toLowerCase() + i.slice(5);
                    if (!props[prop]) {
                        props[prop] = true;
                        this._observeProp(prop, 'setV' + i.slice(4), bindList);
                    }
                } else {
                    if (('' + i).slice(0, 14) === '_handleElement') {
                        var ev = i[14].toLowerCase() + i.slice(15);
                        if (this._element.hasEvent(ev)) 
                            this._element.subscribe(ev, this[i], this);
                    }
                }
            }
        }
        this._initProperties(bindList);
        this._element.outViewReady(this);
        return true;
    },
    
    _acquireResources: function() {
    },
    
    _releaseResources: function() {
    },
    
    _observeProp: function(propName, setterName, bindList) {
        var caps = {};
        Amm.detectProperty(this._element, propName, caps);
        if (this[setterName]) {
            // fooChanged -> setVFoo(v)
            if (caps.eventName) this._element.subscribe(caps.eventName, setterName, this);
        }
        
        if (caps.getterName) {
            caps.propName = propName;
            bindList.push(caps);
        }
    },
    
    _initProperties: function(bindList) {
        for (var i = 0; i < bindList.length; i++) {
            var caps = bindList[i], propName = caps.propName;
            propName = propName[0].toUpperCase() + propName.slice(1);
            var setV = 'setV' + propName, getV = 'getV' + propName;
            // perform 2-way init
            var elementVal = this._element[caps.getterName]();
            if (this.twoWayInit && elementVal === undefined && caps.setterName && typeof this[getV] === 'function') {
                var myVal = this[getV]();
                if (myVal !== undefined) {
                    this._element[caps.setterName](myVal);
                }
            } else {
                if (typeof this[setV] === 'function') this[setV](elementVal);
            }
        }
    },

    /**
     * If View instance is provided during element construction, element
     * may acquire list of suggested traits from a View
     */
    getSuggestedTraits: function() {
        return [];
    }
    
};

Amm.extend(Amm.View.Abstract, Amm.ElementBound);
/* global Amm */
/* global HTMLElement */

Amm.View.Html = function(options) {
    Amm.DomHolder.call(this, {});
};

Amm.View.Html.prototype = {
    
    'Amm.View.Html': '__CLASS__', 
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    _deferHtmlElementRef: null,
    
    _resolveHtmlElement: true,
    
    _relativeToView: null,
    
    _waitHandler: null,
    
    _preInit_htmlView: function(options) {
        if (options && options.relativeToView) {
            this.setRelativeToView(options.relativeToView);
        }
    },
    
    setHtmlSource: function(selector) {
        var e = jQuery(selector);
        if (!e.length)
            throw Error("Cannot setHtmlSource: selector '" + selector + "' doesn't return any elements");
        var domNode = jQuery.parseHTML(e[0].innerHTML.replace(/^\s+|\s+$/g, ''))[0];
        this.setHtmlElement(domNode);
    },
    
    setHtmlElement: function(htmlElement) {
        if (this._resolveHtmlElement || this._relativeToView)
            htmlElement = this._implResolveHtmlElement(htmlElement);
        var old = this._htmlElement;
        if (old === htmlElement) return;
        if (old) {
            this._releaseDomNode(old);
        }
        this._htmlElement = htmlElement;
        this._doSetHtmlElement(htmlElement, old);
        this._observeElementIfPossible();
        return true;
    },

    _implResolveHtmlElementRelativeToView: function(view) {
        var node, jq;
        if (this._deferHtmlElementRef['Amm.Builder.Ref']) {
            this._deferHtmlElementRef.setNode(view.getHtmlElement());
            node = this._deferHtmlElementRef.resolve(true);
        } else {
            jq = jQuery(view.getHtmlElement());
            node = jq.find(this._deferHtmlElementRef)[0];
            if (!node) node = jq.closest(this._deferHtmlElementRef)[0];
        }
        if (node && (node instanceof HTMLElement || node.nodeType)) this.setHtmlElement(node);
        else {
            console.warn(
                Amm.getClass(this) + " of " + Amm.getClass(this._element) + 
                ": cannot resolve HTMLElement relative to view '" + view.id 
                + "' using selector '" + this._deferHtmlElementRef);
        }
        this._deferHtmlElementRef = null;
    },
    
    _elementChange_htmlView: function(element, oldElement) {
        if (oldElement && this._waitHandler) {
            Amm.View.Abstract.stopWaitingForView(oldElement, this._waitHandler);
            this._waitHandler = null;
        }
        if (element && this._deferHtmlElementRef) {
            this._resolveOrDeferHtmlElementRelativeToView(this._deferHtmlElementRef);
        }
    },
    
    _resolveOrDeferHtmlElementRelativeToView: function(htmlElement) {
        this._deferHtmlElementRef = htmlElement;
        if (!this._element) return null;
        var viewId = this._relativeToView === true? undefined : this._relativeToView;
        if (this._element) {
            var r = Amm.View.Abstract.waitForView(this._element, viewId, 'Amm.View.Html',
                this._implResolveHtmlElementRelativeToView, this);
            this._waitHandler = r;
        }
    },
    
    _implResolveHtmlElement: function(htmlElement) {
        if (!htmlElement) return null;
        if (htmlElement instanceof HTMLElement || htmlElement.nodeType) {
            return htmlElement;
        }
        if (typeof htmlElement === "string" || htmlElement['Amm.Builder.Ref'] || '$ref' in htmlElement) {
            if (htmlElement.$ref) htmlElement = new Amm.Builder.Ref(htmlElement);
            if (this._relativeToView) {
                return this._resolveOrDeferHtmlElementRelativeToView(htmlElement);
            }
            if (htmlElement['Amm.Builder.Ref']) return htmlElement.resolve(true);
            return jQuery(htmlElement)[0] || null;
        }
        if (htmlElement.jquery) return htmlElement[0] || null;
        throw Error("`htmlElement` of Amm.View.Html is expected to be HTMLElement instance"
            + ", string or jQuery result or FALSEable value; provided: "
            + Amm.describeType(htmlElement));
    },
    
    _doSetHtmlElement: function(htmlElement, old) {
    },

    setRelativeToView: function(relativeToView) {
        var oldRelativeToView = this._relativeToView;
        if (oldRelativeToView === relativeToView) return;
        this._relativeToView = relativeToView;
        return true;
    },

    getRelativeToView: function() { return this._relativeToView; },

    getHtmlElement: function() { return this._htmlElement; },    
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    },
    
    _releaseResources: function() {
        if (this._htmlElement) this._releaseDomNode(this._htmlElement);
    },
    
    _cleanup_AmmViewHtml: function() {
        this.setHtmlElement(null);
    }
    
};

Amm.extend(Amm.View.Html, Amm.DomHolder);
/* global Amm */

Amm.View.Abstract.Visual = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Visual', 'ClassName');
};

Amm.View.Abstract.Visual.prototype = {

    'Amm.View.Abstract.Visual': '__CLASS__', 
    
    setVVisible: function(visible) {
    },

    getVVisible: function() { 
    },

    setVDisplayParent: function(displayParent) {
    },

    getVDisplayParent: function() { 
    },
 
    setVDisplayOrder: function(displayOrder) {
    },

    getVDisplayOrder: function() { 
    },
 
    setVClassName: function(className) {
    },

    getVClassName: function() { 
    }
 
};

Amm.extend(Amm.View.Abstract.Visual, Amm.View.Abstract);

/* global Amm */

Amm.View.Abstract.Annotated = function(options) {
    this._childViews = [];
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Annotated');
};

Amm.View.Abstract.Annotated.prototype = {

    'Amm.View.Abstract.Annotated': '__CLASS__', 
    
    _childViews: null,
    
    // if annotationClass is provided, will search all children with that class,
    // and use remaining HTML classes as IDs (if annotationClassPrefix is provided, it will
    // be taken into accordance)
    // if {explode} is true, will treat htmlClass as attribute value with many space-separated classes,
    // and will return first non-empty result
    enumerateExisting: true,

    _observeElementIfPossible: function() {
        var r = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (r) {
            if (this.enumerateExisting) this._createExisting();
        }
        return r;
    },
    
    _createExisting: function() {
    },
    
    // we need to remove current views
    _doElementChange: function(element, oldElement) {
        Amm.View.Abstract.prototype._doElementChange.call(this, element, oldElement);
        if (oldElement) oldElement.getAnnotationsContainer().unsubscribe(undefined, undefined, this);
        this._clearChildViews();
        if (element) {
            var anc = element.getAnnotationsContainer();
            anc.subscribe('acceptedElements', this._onAnnotationAdded, this);
            var cc = anc.getElements();
            for (var i = 0; i < cc.length; i++) {
                this._createChildViewsOrDefer(cc[i]);
            }
        }
    },
    
    _clearChildViews: function() {
        for (var i = this._childViews.length - 1; i >= 0; i--) {
            this._childViews[i].cleanup();
            delete this._childViews[i];
        }
    },
    
    _createViewOnChildContentChange: function(newValue, oldValue) {
        var child = Amm.event.origin;
        if (newValue && child._annotated_needCreateViews) {
            if (this._createChildViews(child)) {
                child.unsubscribe('contentChange', this._createViewOnChildContentChange, this);
                child._annotated_needCreateViews = false;
            }
        }
    },
    
    _createChildViewsOrDefer: function(child) {
        if (!this._createChildViews(child)) {
            child._annotated_needCreateViews = true;
            child.subscribe('contentChange', this._createViewOnChildContentChange, this);
        }
    },
    
    // child is a child element of this.element.getAnnotationsContainer()
    _onAnnotationAdded: function(elements) {
        for (var i = 0, l = elements.length; i < l; i++) {
            this._createChildViewsOrDefer(elements[i]);
        }
    },
    
    // child is a child element of this.element.getAnnotationsContainer()
    _createChildViews: function(child, throwIfCant) {
        // abstract
    },
    
    cleanup: function() {
        this._clearChildViews();
        Amm.View.Abstract.prototype.cleanup.call(this);
    }
    
};

Amm.extend(Amm.View.Abstract.Annotated, Amm.View.Abstract);

/* global Amm */

Amm.View.Abstract.Input = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Focusable', 'Editor', 'Lockable');
};

Amm.View.Abstract.Input.prototype = {

    'Amm.View.Abstract.Input': '__CLASS__', 
    
    setVFocused: function(focus) {
    },
    
    getVFocused: function() { 
    },
    
    setVReadOnly: function(readOnly) {
    },
    
    getVReadOnly: function() { 
    },
    
    setVEnabled: function(enabled) {
    },
    
    getVEnabled: function() { 
    },
    
    setVValue: function(value) {
    },
    
    getVValue: function() {
    },
    
    setVLocked: function(locked) {
    }
    
};

Amm.extend(Amm.View.Abstract.Input, Amm.View.Abstract);

/* global Amm */

Amm.View.Abstract.Collection = function(options) {
    Amm.View.Abstract.call(this, options);
};

Amm.View.Abstract.Collection.prototype = {

    'Amm.View.Abstract.Collection': '__CLASS__',
    
    _observesCollection: false,
    
    /** 
     * Collection that is observed. May be set separately.
     */
    _collection: null,

    /** 
     * If set to TRUE, having `collection` and (if set) this[`presentationProperty`]
     * is enough to start observation of the collection even without `element`.  
     * Change of this property may lead to the end of observation of the 
     * `collection`.
     * 
     * Note that element observation won't happen if there's no `collection`!
     */
    _requiresElement: false,

    /** 
     * Property of the `element` that contains the reference to the collection.
     * When changed, collection property will change (except when 
     * `collectionProperty` is set to null AND `element` isn't also a Collection.
     * If element has `collectionProperty`Change event, the View will subscribe
     * to that event.
     */
    _collectionProperty: null,
    
    _colEv: null,
    
    _canObserveCollection: function() {
        var res = (this._collection && (!this._requiresElement || this._element));
        if (this._presentationProperty) 
            res = res && this[this._presentationProperty];
        return !!res;
    },
    
    _observeCollectionIfPossible: function() {
        var can = this._canObserveCollection();
        if (can) {
            if (!this._observesCollection) {
                this._beginObserveCollection();
            }
        } else {
            if (this._observesCollection) {
                this._endObserveCollection();
            }
        }
    },
            
    _beginObserveCollection: function() {
        if (this._observesCollection) return;
        this._observesCollection = true;
        this._colEv = [];
        var s = '_handleCollection', l = s.length;
        for (var i in this) {
            if (i[0] === '_' && i.slice(0, l) === s && typeof this[i] === 'function') {
                var ev = i.charAt(l).toLowerCase() + i.slice(l + 1);
                this._collection.subscribe(ev, this[i], this);
                this._colEv.push(ev);
            }
        }
    },
    
    _endObserveCollection: function() {
        if (!this._observesCollection) return;
        this._observesCollection = false;
        if (this._colEv) {
            for (var i = 0, l = this._colEv.length; i < l; i++)
                this._collection.unsubscribe(this._colEv[i], undefined, this);
        }
    },

    setCollection: function(collection) {
        var oldCollection = this._collection;
        if (oldCollection === collection) return;
        if (oldCollection) this._endObserveCollection();
        this._collection = collection;
        this._observeCollectionIfPossible();
        return true;
    },

    getCollection: function() { return this._collection; },

    setRequiresElement: function(requiresElement) {
        var oldRequiresElement = this._requiresElement;
        if (oldRequiresElement === requiresElement) return;
        this._requiresElement = requiresElement;
        this._observeCollectionIfPossible();
        return true;
    },

    getRequiresElement: function() { return this._requiresElement; },
    
    getObservesCollection: function() { return this._observesCollection; },

    setCollectionProperty: function(collectionProperty) {
        var oldCollectionProperty = this._collectionProperty;        
        if (oldCollectionProperty === collectionProperty) return;
        if (this._element && oldCollectionProperty) 
            this._element.unsubscribe(oldCollectionProperty + 'Change', undefined, this);
        this._collectionProperty = collectionProperty;
        var e = collectionProperty + 'Change';
        if (this._element && this._element.hasEvent(e))
            this._element.subscribe(e, this._onElementCollectionPropertyChange, this);
        this._checkCollectionProperty();
        return true;
    },
    
    _checkCollectionProperty: function(force) {
        if (!this._element && !force) return;
        var collection = null;
        if (this._element) {
            if (this._collectionProperty) {
                collection = Amm.getProperty(this._element, this._collectionProperty);
            }
            else if (Amm.is(this._element, 'Amm.Collection')) {
                collection = this._element;
            }
        }
        this.setCollection(collection);
    },

    getCollectionProperty: function() { return this._collectionProperty; },
    
    _onElementCollectionPropertyChange: function(collection, oldCollection) {
        this.setCollection(collection);
    },

    _doElementChange: function(element, oldElement) {
        Amm.View.Abstract.prototype._doElementChange.call(this, element, oldElement);
        this._checkCollectionProperty(!!oldElement);
    },

    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        this._observeCollectionIfPossible();
        if (!res) return res;
        if (this._collectionProperty) {
            var e = this._collectionProperty + 'Change';
            if (this._element && this._element.hasEvent(e)) {
                this._element.subscribe(e, this._onElementCollectionPropertyChange, this);
            }
        }
        return res;
    }
    
    // _handleCollection<Event> methods are defined in the concrete 
    // child classes because level of Collection events' support may 
    // differ with the implementation
    
};

Amm.extend(Amm.View.Abstract.Collection, Amm.View.Abstract);

/* global Amm */

Amm.View.Abstract.Content = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Content');
};

Amm.View.Abstract.Content.prototype = {

    'Amm.View.Abstract.Content': '__CLASS__', 
    
    /**
     * @type Amm.Translator
     * Translator that we receive from the element
     */
    _elementContentTranslator: null,

    /**
     * @type Amm.Translator
     * Translator that will be used instead of element-provided one
     */
    _contentTranslator: null,
    
    _lastContent: undefined,
    
    setContentTranslator: function(contentTranslator) {
        if (contentTranslator)
            contentTranslator = Amm.constructInstance(contentTranslator, 'Amm.Translator');
        else contentTranslator = null;
        
        var oldContentTranslator = this._contentTranslator;
        if (oldContentTranslator === contentTranslator) return;
        this._contentTranslator = contentTranslator;
        if (this._observing && this._lastContent !== undefined) this.setVContent(this._lastContent);
        return true;
    },

    getContentTranslator: function() { return this._contentTranslator; },

    setVContentTranslator: function(contentTranslator) {
        this._elementContentTranslator = contentTranslator;
        if (!this._contentTranslator && this._lastContent !== undefined && this._observing) {
            this.setVContent(this._lastContent);
        }
    },
    
    _doHandleInTranslationError: function(value, error) {
        
    },
    
    _doHandleOutTranslationError: function(value, error) {
        
    },
    
    setVContent: function(content) {
        this._lastContent = content;
        var translator = this._contentTranslator || this._elementContentTranslator;
        var translatedContent, e = {};
        if (translator) {
            translatedContent = translator.translateOut(content, e);
            if (e.error) translatedContent = this._doHandleInTranslationError(content, e.error);
        } else {
            translatedContent = content;
        }
        this._doSetContent(translatedContent);
    },
    
    getVContent: function() {
        var translatedContent = this._doGetContent();
        var translator = this._contentTranslator || this._elementContentTranslator;
        var content, e = {};
        if (translator) {
            content = translator.translateIn(translatedContent, e);
            if (e.error) content = this._doHandleInTranslationError(translatedContent, e.error);
        } else {
            content = translatedContent;
        }
        return content;
    },
    
    _doSetContent: function(translatedContent) {
        // should be overridden in concrete class
    },
    
    _doGetContent: function() {
        // should be overridden in concrete class
    }
    
};

Amm.extend(Amm.View.Abstract.Content, Amm.View.Abstract);

/* global Amm */

Amm.View.Abstract.Select = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Select');
};

Amm.View.Abstract.Select.prototype = {

    'Amm.View.Abstract.Select': '__CLASS__', 
    
    _fieldView: null,
    
    _collectionView: null,
    
    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (res) this._doObserveSelect();
        return res;
    },
    
    _createFieldView: function() {
        // must be overridden
    },
    
    _createCollectionView: function() {
        // must be overridden
    },
    
    _doObserveSelect: function() {
        if (!this._collectionView) this._createCollectionView();
        this._collectionView.setElement(this._element);
        if (!this._fieldView) this._createFieldView();
        this._fieldView.setElement(this._element);
    },
    
    _endObserve: function() {
        this._fieldView.setElement(null);
        this._collectionView.setElement(null);
    }
    
};

Amm.extend(Amm.View.Abstract.Select, Amm.View.Abstract);
/* global Amm */

Amm.View.Html.Visual = function(options) {
    Amm.View.Abstract.Visual.call(this, options);
    Amm.View.Html.call(this);
};

Amm.View.Html.Visual.defaultDelay = 250;

Amm.View.Html.Visual.prototype = {

    'Amm.View.Html.Visual': '__CLASS__', 
    
    delay: undefined,
    
    setVVisible: function(visible) {
        var delay = this.delay;
        if (delay === undefined) delay = Amm.View.Html.Visual.defaultDelay;
        jQuery(this._htmlElement)[visible? 'show' : 'hide'](delay);
    },

    getVVisible: function() {
        if (!this._htmlElement) return undefined;
        var res = this._htmlElement.style.display !== "none";
        return res;
    },

    setVDisplayParent: function(displayParent) {
        // TODO
    },

    getVDisplayParent: function() {
        // TODO... but unreal?
    },
 
    setVDisplayOrder: function(displayOrder) {
    },

    getVDisplayOrder: function() { 
    },
 
    setVToggleClass: function(className, enabled) {
        jQuery(this._htmlElement)[enabled? 'addClass' : 'removeClass'](className);
    },
    
    getVToggleClass: function(className) {
        return jQuery(this._htmlElement).hasClass(className);
    },
    
    setVClassName: function(className) {
        jQuery(this._htmlElement).attr('class', className);
    },

    getVClassName: function() {
        return jQuery(this._htmlElement).attr('class');
    },
    
    cleanup: function() {
        Amm.View.Abstract.Visual.prototype.cleanup.call(this);
        if (this._htmlElement) this._releaseDomNode(this._htmlElement);
    },
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Visual];
    }
    
};

Amm.extend(Amm.View.Html.Visual, Amm.View.Html);
Amm.extend(Amm.View.Html.Visual, Amm.View.Abstract.Visual);
 /* global Amm */

Amm.View.Html.Annotated = function(options) {
    Amm.DomHolder.call(this);
    Amm.View.Abstract.Annotated.call(this, options);
};

Amm.View.Html.Annotated.prototype = {

    'Amm.View.Html.Annotated': '__CLASS__', 
    
    annotationClass: 'annotation',
    
    annotationClassPrefix: 'a_',
    
    createNodesOnDemand: true,
    
    classToId: function(htmlClass, explode) {
        if (explode) {
            var classes = htmlClass.replace(/^\s+|\s+$/g, '').split(/\s+/);
            for (var i = 0; i < classes.length; i++) {
                var r = this.classToId(classes[i]);
                if (r) return r;
            }
            return null;
        }
        if (htmlClass === this.annotationClass) return null;
        var l = this.annotationClassPrefix.length, res = null;
        // begins with class prefix
        if (!l) res = htmlClass;
        else if (htmlClass.slice(0, l) === this.annotationClassPrefix) {
            res = htmlClass.slice(l);
        }
        return res;
    },
    
    idToClass: function(annotationId) {
        return this.annotationClassPrefix + annotationId;
    },
    
    locateChildHtmlElement: function(id, create) {
        if (!this._htmlElement) return null;
        var idc = this.idToClass(id), q = '.' + this.idToClass(id);
        if (this.annotationClass) q = '.' + this.annotationClass + q;
        var res = jQuery(this._htmlElement).find(q);
        if (!res.length) {
            if (create) {
                res = jQuery('<div class="' + this.annotationClass + ' ' + idc + '"></div>');
                jQuery(this._htmlElement).append(res);
            } else {
                res = null;
            }
        }
        return res;
    },
    
    _createExisting: function() {
        if (!this._htmlElement) return null; // element not set
        var t = this, res = {};
        jQuery(this._htmlElement).find('.' + this.annotationClass).each(function(i, domNode) {
            var id = t.classToId(domNode.getAttribute('class'), true);
            var el = t._element.getAnnotationsContainer().getAnnotationElement(id);
            t._createChildViews(el, true, domNode);
        });
        return res;
    },
    
    // child is a child element of this.element.getAnnotationsContainer()
    _createChildViews: function(child, throwIfCant, childHtmlElement) {
        childHtmlElement = childHtmlElement || this.locateChildHtmlElement(child.getId(), this.createNodesOnDemand);
        if (!childHtmlElement) {
            if (throwIfCant) throw Error("Cannot locate child htmlElement for child with id " + child.getId());
            if (this.createNodesOnDemand) {
                child._annotated_needCreateViews = true; // hack that will allow us to remember views yet have to be created
            }
            return null;
        }
        var res = [];
        if (child['Visual']) {
            res.push(new Amm.View.Html.Visual({
                element: child,
                htmlElement: childHtmlElement
            }));
        }
        res.push(new Amm.View.Html.Content({
            element: child,
            htmlElement: childHtmlElement
        }));
        return res;
    },
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Annotated];
    }
    
    
};

Amm.extend(Amm.View.Html.Annotated, Amm.View.Html);
Amm.extend(Amm.View.Html.Annotated, Amm.View.Abstract.Annotated);
/* global Amm */

Amm.View.Html.Collection = function(options) {
    Amm.registerItem(this);
    Amm.View.Html.call(this);
    this._mappingProp = '_map_vhc_' + this._amm_id;
    Amm.View.Abstract.Collection.call(this, options);
};

Amm.View.Html.Collection.prototype = {

    'Amm.View.Html.Collection': '__CLASS__', 
    
    debug: false,
    
    itemHtmlElementsMustBeOrphans: true,

    _mappingProp: null,
    
    createItemHtml: function(item) {
        // To-be-overridden
        return "<div>Overwrite createItemHtml!</div>";
    },
    
    updateItemHtml: function(item, existingNode) {
        // To-be-overwritten for more effective item updating
        return jQuery(this.createItemHtml(item))[0];
    },
    
    
    _doSetHtmlElement: function(htmlElement, old) {
        if (!this._canObserve() && this._canObserveCollection()) this._acquireResources();
    },
    
    getItemHtmlElement: function(item) {
        if (item[this._mappingProp]) return item[this._mappingProp];
        var node = this._createAndBindHtmlNode(item);
        if (!node[this._mappingProp]) {
            node[this._mappingProp] = item;
            item[this._mappingProp] = node;
        }
        return node;
    },
    
    getHtmlElementItem: function(htmlElement) {
        return htmlElement[this._mappingProp];
    },

    /**
     * Fully rebuilds HTML container content by purging it and then re-creating every item' HTML
     */
    rebuild: function() { return this._rebuild(); },

    _canObserve: function() {
        if (!this._presentationProperty) return false;
        return !!(this._element && this[this._presentationProperty]);
    },
    
    _createAndBindHtmlNode: function(item) {
        var r = this.createItemHtml(item);
        if (typeof r === 'string') r = jQuery(r)[0];
        if (!r || !r.nodeType) 
            Error("Cannot reliabliy create and bind Html Node");
        if (r.parentNode && r.parentNode.nodeType !== 11) {
            if (this.itemHtmlElementsMustBeOrphans) {
                Error("createItemHtml() is supposed to create new nodes, but this one already has parentNode");
            } else {
                r.parentNode.removeChild(r);
            }
        }
        r[this._mappingProp] = item;
        item[this._mappingProp] = r;
        return r;
    },
    
    _beginObserveCollection: function() {
        this._rebuild();
        Amm.View.Abstract.Collection.prototype._beginObserveCollection.call(this);
    },
    
    _clearContainer: function() {
        var qe = jQuery(this._htmlElement);
        var p = this._mappingProp;
        qe.contents().each(function(i, node) {
            if (node[p]) {
                if (node[p][p] === node) delete node[p][p];
                delete node[p];
            }
            qe[0].removeChild(node);
        });
    },
    
    _rebuild: function() {
        if (this.debug) console.log(this.debug, '_rebuild');
        // empty the html element
        this._clearContainer();
        this._insertToContainer();
    },
    
    _insertToContainer: function(items, before, doThrow) {
        doThrow = doThrow || false;
        items = items || this._collection;
        for (var i = 0; i < items.length; i++) {
            var container = this.getItemHtmlElement(items[i], !doThrow);
            if (container) {
                if (!before) this._htmlElement.appendChild(container);
                    else this._htmlElement.insertBefore(container, before);
            }
        }
    },
    
    _handleCollectionAppendItems: function(items) {
        if (this.debug) console.log(this.debug, '_handleCollectionAppendItems', 
            items.length);
        this._insertToContainer(items);
    },
    
    _handleCollectionDeleteItem: function(index, item) {
        if (this.debug) console.log(this.debug, '_handleCollectionDeleteItem', 
            index, item._amm_id);
        var p = this._mappingProp, cnt = item[p];
        if (cnt) {
            if (cnt.parentNode === this._htmlElement) 
                this._htmlElement.removeChild(cnt);
            if (cnt[p]) delete cnt[p];
            delete item[p];
        }
    },
    
    /**
     * Calls refreshItem() on event item
     */
    refreshAllItems: function() {
        if (!this._collection || !this._htmlElement) return;
        for (var i = 0, l = this._collection.length; i < l; i++) {
            this.refreshItem(this._collection[i]);
        }
    },
    
    /**
     * Refreshes item by calling this.updateItemHtml() for that item. Usually this is called on item
     * change event
     */
    refreshItem: function(item) {
        if (!this._collection || !this._htmlElement) return;
        var p = this._mappingProp, currNode = item[p], up = this.updateItemHtml(item, currNode);
        if (!up) return;
        var newNode = jQuery(up)[0];
        if (!newNode || newNode === currNode) return;
        
        // we need to replace old node with new node (returned by updateItemHtml)
        if (!newNode.nodeType) {
            Error("updateItemHtml() returned something that is not an HTML Node");
        }
        if (newNode.parentNode && newNode.parentNode.nodeType !== 11) {
            if (this.itemHtmlElementsMustBeOrphans) {
                Error("updateItemHtml() is supposed to create new nodes, but this one already has parentNode");
            } else {
                newNode.parentNode.removeChild(newNode);
            }
        }
        // check if new node isn't accidentally parent of current node 
        // (we won't be able to replace current node then)
        // example: when we wrap current node (as in Amm.View.Html.Select)
        if(!jQuery(newNode).has(currNode).length) { 
            jQuery(currNode).replaceWith(newNode);
        }
        currNode[p] = null;
        newNode[p] = item;
        item[p] = newNode;
    },
    
    _handleCollectionItemChange: function(item) {
        this.refreshItem(item);
    },
    
    _handleCollectionSpliceItems: function(index, cut, insert) {
        // will remove the nodes
        if (cut.length >= this._htmlElement.childNodes.length) {
            this._rebuild();
            return;
        }
        var cn = this._htmlElement.childNodes;
        for (var i = index, l = Math.min(index + cut.length, cn.length); i < l; i++) {
            this._htmlElement.removeChild(cn[index]);
        }
        this._insertToContainer(insert, cn[index]);
        
        // now remove the circular references from the orphaned nodes
        var p = this._mappingProp;
        for (var i = 0, l = cut.length; i < l; i++) {
            if (cut[i][p] && !cut[i][p].parentNode) {
                if (cut[i][p][p]) delete cut[i][p][p];
                delete cut[i][p];
            }
        }
    },
    
    _handleCollectionMoveItem: function(oldIndex, newIndex, item) {
        if (this.debug) console.log(this.debug, '_handleCollectionMoveItem',
            oldIndex, newIndex, item._amm_id);
        var delta, cn = this._htmlElement.childNodes;
        var node = cn[oldIndex];
        this._htmlElement.removeChild(node);
        var before = cn[newIndex];
        if (before) this._htmlElement.insertBefore(node, before);
            else this._htmlElement.appendChild(node);
    },
    
    _handleCollectionClearItems: function() {
        if (this.debug) console.log(this.debug, '_handleCollectionClearItems');
        this._clearContainer();
    },
    
    _handleCollectionItemsChange: function(items, oldItems) {
        if (this.debug) console.log(this.debug, '_handleCollectionItemsChange',
            items.length, oldItems.length);
        // the lamest possible solution
        this._rebuild();
    }
        
};

Amm.extend(Amm.View.Html.Collection, Amm.View.Html);
Amm.extend(Amm.View.Html.Collection, Amm.View.Abstract.Collection);
/* global Amm */

Amm.View.Html.DisplayParent = function(options) {
    this.requiredElementInterfaces = this.requiredElementInterfaces || [];
    this.requiredElementInterfaces.push('DisplayParent');
    // we don't handle item change
    delete this._handleCollectionItemChange;
    Amm.View.Html.Collection.call(this, options);
};

Amm.View.Html.DisplayParent.prototype = {

    'Amm.View.Html.DisplayParent': '__CLASS__', 
    
    debug: false,
    
    _collectionProperty: 'displayChildren',
    
    itemHtmlElementsMustBeOrphans: false,
    
    scanForItems: true,
    
    buildItems: false,
    
    scanForDisplayOrder: true,
    
    getItemHtmlElement: function(item, dontThrow) {
        var cv = this._getItemView(item, dontThrow);
        var res = null;
        if (cv) res = cv.getHtmlElement();
        if (!res && !dontThrow) {
            Error("Collection item doesn't have view with htmlElement");
        }
        if (!res[this._mappingProp]) {
            res[this._mappingProp] = item;
            item[this._mappingProp] = res;
        }
        return res;
    },
    
    updateItemHtml: function(item, existingNode) {    
        
    },

    _getItemView: function(item, dontThrow) {
        var elViews = item.getUniqueSubscribers('Amm.View.Html.Visual');
        if (!elViews.length) {
            if (!dontThrow) 
                Error("Collection item doesn't have respective Amm.View.Html.Visual view");
            return null;
        }
        if (!elViews.length > 1) console.warn("Collection item have more than one Amm.View.Html.Visual view");
        return elViews[0];
    },
    
    /**
     * @returns {Array}
     */
    _getHtmlElementsWithItems: function() {
        var attr = Amm.domHolderAttribute;
        return jQuery(this._htmlElement).children('['+ attr + ']').toArray();
    },
    
    _getElementOfHtmlElement: function(htmlElement) {
        var attr = Amm.domHolderAttribute;
        var ids = (htmlElement.getAttribute(attr) + '').split(' ');
        var items = Amm.getItem(ids);
        var res = null;
        for (var i = 0, l = items.length; i < l; i++) {
            if (Amm.is(items[i], 'Amm.View.Html.Visual')) {
                res = items[i].getElement();
                if (res) return res;
            }
        }
        return null;
    },

    /**
     * @returns {Array}
     */
    _getItemsInContainer: function() {
        var htmlElements = this._getHtmlElementsWithItems();
        var res = [];
        for (var index = 0, l = htmlElements.length; index < l; index++) {
            var ammElement = this._getElementOfHtmlElement(htmlElements[index]);
            if (!ammElement) continue;
            res.push(ammElement);
        };
        return res;
    },
    
    /**
     * @param {Array} foundItems Elements which views were located 
     *      inside the collection container in the order of appearance
     */
    _updateCollectionWithFoundItems: function(foundItems) {
        var scanForItems = this.scanForItems, scanForDisplayOrder = this.scanForDisplayOrder;
        // otherwise update the display order
        if (scanForItems && scanForDisplayOrder) {
            var newItems = Amm.Array.diff(foundItems, this._collection);
            if (newItems.length) this._collection.push.apply(this._collection, newItems);
            for (var i = 0; i < foundItems.length; i++) foundItems[i].setDisplayOrder(i); // both for old and new items
        } else if (scanForItems) {
            var newItems = Amm.Array.diff(foundItems, this._collection);            
            if (newItems.length) this._collection.push.apply(this._collection, this._collection.length, foundItems);
        } else { // scanForDisplayOrder only
            for (var i = 0; i < foundItems.length; i++) foundItems[i].setDisplayOrder(i);
        }
    },
    
    _scanForItems: function() {
        
        if (this.buildItems) {
            var b = new Amm.Builder(jQuery(this._htmlElement));
            b.build();
        }
        
        var scanForItems = this.scanForItems, scanForDisplayOrder = this.scanForDisplayOrder;
        if (!scanForItems && !scanForDisplayOrder) return;
        
        var foundItems = this._getItemsInContainer();
        if (foundItems.length)
            this._updateCollectionWithFoundItems(foundItems);
    },

    _beginObserveCollection: function() {
        this._scanForItems();
        Amm.View.Html.Collection.prototype._beginObserveCollection.call(this);
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.DisplayParent];
    }

};

Amm.extend(Amm.View.Html.DisplayParent, Amm.View.Html.Collection);
/* global Amm */

Amm.View.Html.StaticDisplayParent = function(options) {
    Amm.View.Html.DisplayParent.call(this, options);
};

Amm.View.Html.StaticDisplayParent.prototype = {

    'Amm.View.Html.StaticDisplayParent': '__CLASS__',
    
    _oldAllowAdd: null,
    _oldAllowDelete: null,
    _oldAllowChangeOrder: null,
    
    _scanForItems: function() {
        if (!this.scanForItems) {
            console.warn("Setting Amm.View.Html.StaticDisplayParent::scanForItems to FALSE has no effect; property was reset back to TRUE");
            this.scanForItems = true;
        }
        if (!this.scanForDisplayOrder) {
            console.warn("Setting Amm.View.Html.StaticDisplayParent::scanForDisplayOrder to FALSE has no effect; property was reset back to TRUE");
            this.scanForDisplayOrder = true;
        }
        return Amm.View.Html.DisplayParent.prototype._scanForItems.apply(this);
    },
    
    _beginObserveCollection: function() {
        this._oldAllowAdd = this._collection.getAllowAdd();
        this._oldAllowDelete = this._collection.getAllowDelete();
        this._oldAllowChangeOrder = this._collection.getAllowChangeOrder();
        
        // allow collection to be mutable
        if (!this._oldAllowAdd) this._collection.setAllowAdd(true);
        if (!this._oldAllowDelete) this._collection.setAllowDelete(true);
        if (!this._oldAllowChangeOrder) this._collection.setAllowChangeOrder(true);
        
        return Amm.View.Html.DisplayParent.prototype._beginObserveCollection.apply(this);
    },
    
    _freezeCollection: function() {
        this._collection.setAllowAdd(false);
        this._collection.setAllowDelete(false);
        this._collection.setAllowChangeOrder(false);
    },
    
    _endObserveCollection: function() {
        this._collection.setAllowAdd(this._oldAllowAdd);
        this._collection.setAllowDelete(this._oldAllowDelete);
        this._collection.setAllowChangeOrder(this._oldAllowChangeOrder);
        return Amm.View.Html.DisplayParent.prototype._endObserveCollection.apply(this);
    },
    
    _getHtmlElementsWithItems: function() {
        var attr = Amm.domHolderAttribute;
        var all = jQuery(this._htmlElement).find('['+ attr + ']');
        var res = all.not(all.find('['+ attr + ']'));
        return res;
    },
    
    _updateCollectionWithFoundItems: function(foundItems) {
        if (this._collection.length && !Amm.Array.equal(this._collection, foundItems)) {
            console.warn("Pre-populated display children are replaced by Amm.View.Html.StaticDisplayParent detection routine");
        }
        this._collection.setItems(foundItems);
        this._freezeCollection();
    },
    
    _rebuild: function() {
        // do nothing
    }    

};

Amm.extend(Amm.View.Html.StaticDisplayParent, Amm.View.Html.DisplayParent);/* global Amm */

Amm.View.Html.StaticDisplayParent.WithContainers = function(options) {
    Amm.View.Html.StaticDisplayParent.call(this, options);
};

Amm.View.Html.StaticDisplayParent.WithContainers.prototype = {

    'Amm.View.Html.StaticDisplayParent.WithContainers': '__CLASS__', 

};

Amm.extend(Amm.View.Html.StaticDisplayParent.WithContainers, Amm.View.Html.StaticDisplayParent);

/* global Amm */

/**
 * Subscribes to change, focus, blur events.
 * jQuery to Element: value, focus
 * Element to JQuery: value, focus, readOnly, enabled
 */
Amm.View.Html.Input = function(options) {
    var t = this;
    this._handler = function(event) { return t._receiveEvent(event, this); };
    Amm.View.Abstract.Input.call(this, options);
    Amm.View.Html.call(this);
    Amm.JQueryListener.call(this, {});
};

Amm.View.Html.Input.prototype = {

    'Amm.View.Html.Input': '__CLASS__', 

    _eventName: 'change focus blur',
    
    _blurTimeoutHandler: null,
    
    _resolveHtmlElement: false,
    
    _watchKeys: false,
    
    _receiveEvent: function(event) {
        if (!this._element) return;
        /** @TODO changeEvents property (that will be also added to event names) */
        if (event.type === 'focus') {
            this._element.setFocusedView(this);
            return true;
        } 
        if (event.type === 'blur') {
            var t = this;
            // in browser, focus switching from one element to another fires first 'blur' event, 
            // then 'focus'. Timeout is added to avoid flapping of `focused` propety when focus
            // is switched to another view of the same element.
            if (!this._blurTimeoutHandler) this._blurTimeoutHandler = function() { 
                if (t._element.getFocusedView() === t)
                    t._element.setFocusedView(null);
            };
            window.setTimeout(this._blurTimeoutHandler, 1);
            return true;
        }
        if (!this._element.getReadOnly()) {
            this._element.setValue(this.getVValue());
        }
        return true;
    },
    
    setVFocusedView: function(value) {
        var focused = (value === this);
        var q = jQuery(this._htmlElement);        
        if (q[0]) {
            if (focused && !q.is(':focus')) q.focus();
            else if (!focused && q.is(':focus')) q.blur();
        }
    },
    
    getVFocusedView: function() { 
        if (jQuery(this._htmlElement).is(':focus')) return this;
    },
    
    setVReadOnly: function(readOnly) {
        var q = jQuery(this._htmlElement);
        if (q[0]) {
            if (readOnly && !q[0].hasAttribute('readonly')) q[0].setAttribute('readonly', 'readonly');
            else if (!readOnly && q[0].hasAttribute('readonly')) q[0].removeAttribute('readonly');
        }
    },
    getVReadOnly: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return e.getAttribute('readonly'); 
    },

    _doSetEnabled: function(enabled, locked) {
        if (enabled === undefined) enabled = this._element.getEnabled();
        if (locked === undefined) locked = this._element.getLocked();
        disabled = !enabled || locked;
        var q = jQuery(this._htmlElement), disabled = !enabled || locked;
        if (q[0]) {
            if (disabled && !q[0].hasAttribute('disabled')) q[0].setAttribute('disabled', 'disabled');
            else if (!disabled && q[0].hasAttribute('disabled')) q[0].removeAttribute('disabled');
        }
    },
    
    setVEnabled: function(enabled) {
        this._doSetEnabled(enabled, undefined);
    },
    getVEnabled: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return !e.hasAttribute('disabled'); 
    },
    
    setVValue: function(value) {
        if (this._htmlElement) {
            jQuery(this._htmlElement).val(value);
        }
    },
    
    setVLocked: function(locked) {
        this._doSetEnabled(undefined, locked);
    },
    
    getVValue: function() {
        if (this._htmlElement) 
            return jQuery(this._htmlElement).val();
    },
    
    _doSetHtmlElement: function(htmlElement) {
        this.setSelector(htmlElement);
    },
    
    cleanup: function() {
        Amm.View.Abstract.Input.prototype.cleanup.call(this);
        Amm.JQueryListener.prototype.cleanup.call(this);
        if (this._htmlElement) this._releaseDomNode(this._htmlElement);
    },
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Input];
    },
    
    setUpdateOnKeyUp: function(updateOnKeyUp) {
        updateOnKeyUp = !!updateOnKeyUp;
        var ev = this._eventName;
        var hasKeyUp = this.getUpdateOnKeyUp();
        if (updateOnKeyUp === hasKeyUp) return;
        if (updateOnKeyUp && !hasKeyUp) ev += ' keyup';
        else ev = ev.replace(/\bkeyup\b/g, '').replace(/ +/, ' ').replace(/^ +| +$/g, '');
        this.setEventName(ev);
    },
    
    getUpdateOnKeyUp: function() {
        return !!this._eventName.match(/\bkeyup\b/);
    }

};

Amm.extend(Amm.View.Html.Input, Amm.View.Html);
Amm.extend(Amm.View.Html.Input, Amm.JQueryListener);
Amm.extend(Amm.View.Html.Input, Amm.View.Abstract.Input);
/* global Amm */

/**
 * Extracts variants' settings from HTML to provide 
 * variants-based instantiator for element 
 * with Instantiator trait.
 * 
 * Doesn't update any HTML.
 * 
 * Example markup:
 * 
 * <div data-amm-dont-build="" data-amm-criteria="{json}">
 *      <!-- element prototype -->
 * </div>
 * <!-- more such divs ... -->
 * <div data-amm-dont-build="" data-amm-default="">
 *      <!-- default element prototype -->
 * </div>
 */
Amm.View.Html.Variants = function(options) {
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this, options);
    Amm.DomHolder.call(this);
    this._requireInterfaces('InstantiatorOrRepeater');
};

Amm.View.Html.Variants.ERROR_BOTH_ATTRIBS = "HTML definition of variant prototype cannot have both data-amm-default and data-amm-condition";
Amm.View.Html.Variants.ERROR_DEFAULT_DEFINED = "Default variant prototype was already defined";
Amm.View.Html.Variants.ERROR_INVALID_ATTRIBUTE = "Attribute data-amm-condition should contain hash value";

Amm.View.Html.Variants.prototype = {

    'Amm.View.Html.Variants': '__CLASS__',
    
//    getSuggestedTraits: function() {
//        return [Amm.Trait.Instantiator];
//    },
    
    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (!res) return res;
        
        this._scanHtmlElementAndConfigureInstantiator();
        
        return res;
    },
    
    _scanHtmlElementAndConfigureInstantiator: function() {
        
        var r = Amm.View.Html.Variants.scanNodeForVairants(this._htmlElement);
        if (!r) return;
        this._element.reportInstantiatorOptions(r.default, r.conditions, r.prototypes);
    
    }
    

};

Amm.extend(Amm.View.Html.Variants, Amm.View.Html);
Amm.extend(Amm.View.Html.Variants, Amm.View.Abstract);


Amm.View.Html.Variants.builderExtension_build = function (htmlElement, proto, arg) {
    var r = Amm.View.Html.Variants.scanNodeForVairants(htmlElement);
    if (!r) return;
    proto.initialInstantiatorOptions = [r.default, r.conditions, r.prototypes];
};

Amm.View.Html.Variants.scanNodeForVairants = function(node) {

    var i, id;

    var conditions = [], prototypes = {};

    var def = null;

    for (i = 0; i < node.childNodes.length; i++) {
        var n = node.childNodes[i];
        if (!n.hasAttribute) continue;
        var d = n.hasAttribute('data-amm-default');
        var c = n.hasAttribute('data-amm-condition');
        /* @TODO Subclass Error so it will output message + node to console automatically */
        if (d && c) {
            console.error(Amm.View.Html.Variants.ERROR_BOTH_ATTRIBS, n);
            throw Error(Amm.View.Html.Variants.ERROR_BOTH_ATTRIBS);
        }
        if (d) {
            if (def) {
                console.error(Amm.View.Html.Variants.ERROR_DEFAULT_DEFINED, n, def);
                throw Error(Amm.View.Html.Variants.ERROR_DEFAULT_DEFINED);
            }
            def = n;
            continue;
        }
        var cond = (window.RJSON || window.JSON).parse(n.getAttribute('data-amm-condition'));
        if (!(cond && typeof cond === 'object')) {
            console.error(Amm.View.Html.Variants.ERROR_INVALID_ATTRIBUTE, n);
            throw Error(n);
        }
        id = cond._id || 'condition_' + conditions.length;
        cond._id = id;
        conditions.push(cond);
        prototypes[id] = n;
    }

    if (!conditions.length && !def) return; // nothing to do

    return {
        'default': def,
        conditions: conditions,
        prototypes: prototypes
    };

};/* global Amm */

Amm.View.Html.Toggle = function(options) {
    Amm.View.Html.Input.call(this, options);
};

Amm.View.Html.Toggle.prototype = {

    'Amm.View.Html.Toggle': '__CLASS__', 

    getVIsRadio: function() { return jQuery(this._htmlElement).attr('type') === 'radio'? true : undefined; },
    
    setVIsRadio: function(value) { jQuery(this._htmlElement).attr('type', value? 'radio' : 'checkbox'); },
    
    getVChecked: function() { var e = jQuery(this._htmlElement)[0]; if (e) return e.checked; },
    
    setVChecked: function(value) { var e = jQuery(this._htmlElement)[0]; if (e) e.checked = !!value },
    
    setVValue: function() {
    },
    
    getVValue: function() {
    },
    
    getVCheckedValue: function() {
        var e = jQuery(this._htmlElement)[0]; if (e) return e.value;
    },
    
    setVCheckedValue: function(value) {
        var e = jQuery(this._htmlElement)[0]; if (e) e.value = value;
    },
    
    _receiveEvent: function(event) {
        if (!this._element) return;
        if (event.type === 'change') {
            if (this._element.getReadOnly()) {
                this.setVChecked(this._element.getChecked());
                // put our beloved radio button back!
                if (this._element.getIsRadio()) {
                    var items = this._element.findGroupItems(true, true);
                    for (var i = 0, l = items.length; i < l; i++) {
                        if (items[i].getChecked()) {
                            var vv = items[i].getUniqueSubscribers('Amm.View.Html.Toggle');
                            for (var ii = 0, ll = vv.length; ii < ll; ii++)
                                vv[ii].setVChecked(true);
                        }
                    }
                }
            } else {
                this._element.setChecked(this._htmlElement.checked);
            }
            return true;
        }
        return Amm.View.Html.Input.prototype._receiveEvent.call(this, event);
    },

    getVGroupName: function() {
        return jQuery(this._htmlElement).attr('name');
    },
    
    getVGroupParent: function() {
        return jQuery(this._htmlElement).closest('form')[0];
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Toggle];
    }
    
};

Amm.extend(Amm.View.Html.Toggle, Amm.View.Html.Input);
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
/* global Amm */

/** 
 * -    selector is either string or jQuery result
 * -    options is a hash
 * 
 * Possible usages:
 * 
 * new Amm.Builder(selector, options)
 * new Amm.Builder(selector)
 * new Amm.Builder(options)
 */

Amm.Builder = function(selector, options) {
    this.selIgnore += ', [' + Amm.domHolderAttribute + ']';
    this.elements = [];
    this.topLevel = [];
    this.problems = [];
    if (selector && selector.jquery || typeof selector === 'string') {
        this.selector = selector;
    } else if (!options && selector && typeof selector === 'object') {
        options = selector;
        selector = null;
    }
    if (options) Amm.init(this, options);
};

Amm.Builder._EXT_NOT_FOUND = {};

Amm.Builder.PROBLEM_SILENT = 0;

Amm.Builder.PROBLEM_CONSOLE = 1;

Amm.Builder.PROBLEM_HTML = 2;

Amm.Builder.TOP_LEVEL_ROOT = 'root';

Amm.Builder.problemReportMode = Amm.Builder.PROBLEM_SILENT;

Amm.Builder._scanId = 1;

Amm.Builder.prototype = {
    
    _globalIds: null,

    selector: null,
    
    problemReportMode: undefined, // use global
    
    sel: '[data-amm-id], [data-amm-e], [data-amm-v], [data-amm-x]',

    selIgnore: '[data-amm-dont-build], [data-amm-dont-build] *, [data-amm-built]',
    
    // 'root' is Amm.Root
    topLevelComponent: null,
    
    // whether to save all created top-level elements to this.elementsp
    rememberElements: false,
    
    // whether to save issued problems
    rememberProblems: false,
    
    elements: null,
    
    topLevel: null,
    
    reportMode: Amm.Builder.PROBLEM_CONSOLE | Amm.Builder.PROBLEM_HTML,
    
    problems: null,
    
    _parent: null,
    
    calcPrototypes: function() {
        return this.build(true);
    },
    
    calcViewPrototypes: function(forElementOrPrototype) {
        var res, eProto;
        var tmp = this._parent;
        if (forElementOrPrototype) {
            this._parent = new Amm.Builder.Node({e: forElementOrPrototype});
            if (Amm.getClass(forElementOrPrototype)) {
                Amm.is(forElementOrPrototype, 'Amm.Element', 'forElement');
                this._parent.id = forElementOrPrototype.getId();
            } else {
                this._parent.id = forElementOrPrototype.id || null;
            }
        } else {
            this._parent = new Amm.Builder.Node({e: {}});
        }
        try {
            eProto = this.build(true);
            if (eProto.length !== 1 || !eProto[0].views || !eProto[0].views.length) {
                console.log({fe: forElementOrPrototype, ep: eProto});
                var reason;
                if (eProto.length !== 1) reason = "found " + eProto.length + " top-level elements";
                else if (!eProto[0].views || !eProto[0].views.length) reason = "no views defined for top-level element";
                throw new Error("Amm.Builder: cannot calcViewPrototypes(): " + reason);
            } res = eProto[0].views;
            if (forElementOrPrototype) {
                for (var i = 0; i < res.length; i++) res[i].element = forElementOrPrototype;
            }
        } catch (e) {
            this._parent = tmp;
            throw e;
        }
        this._parent = tmp;
        return res;
    },
    
    build: function(prototypesOnly) {
        var root = this.selector;
        var tmp = this._globalIds;
        this._globalIds = {};
        var nodes = this._scanNodes(root), res = [];
        var topLevel = [];
        this._detectConnectedRecursive(nodes);
        for (var i = 0, l = nodes.length; i < l; i++) {
            res = res.concat(this._buildElements(nodes[i], topLevel, prototypesOnly));
        }
        if (this.rememberElements) {
            if (res.length) this.elements.push.apply(this.elements, res);
            if (topLevel.length) this.topLevel.push.apply(this.topLevel, topLevel);
        }
        this._globalIds = tmp;
        if (prototypesOnly) return topLevel;
        return res;
    },
    
    clear: function() {
        this.elements = [];
        this.topLevel = [];
        this.problems = [];
    },

    _scanNodes: function(root) {
        if (!root) root = window.document.documentElement;
        var scProp = '_amm_builder_scn_' + (Amm.Builder._scanId++);
        var rootNodes = [], allNodes = [], t = this;
        var jq = 
            jQuery(root)
            .filter(this.sel)
            .add(jQuery(root).find(this.sel))
            .not(this.selIgnore);
        jq.each(function(i, htmlElement) {
            var node = t._createNode(htmlElement);
            htmlElement[scProp] = allNodes.length;
            allNodes.push(node);
        });
        if (this._parent) {
            rootNodes.push(this._parent);
            
            // line below calls infinite recursing with _detectChildrenConnectedByIds/_detectConnectedNodes
            
            // allNodes.push(this._parent);
        }
        for (var i = 0, l = allNodes.length; i < l; i++) {
            var node = allNodes[i];
            var htmlElement = node.htmlElement;
            var pp = jQuery(htmlElement).parent().closest(this.sel)[0];
            if (pp && pp[scProp] !== undefined) {
                node.parent = allNodes[pp[scProp]];
                allNodes[pp[scProp]].children.push(node);
            } else {
                if (this._parent) {
                    node.parent = this._parent;
                    this._parent.children.push(node);
                }
                rootNodes.push(node);
            }
        }
        return rootNodes;
    },
    
    getExtData: function(entry, path, defaultValue) {
        if (defaultValue === undefined) defaultValue = Amm.Builder._EXT_NOT_FOUND;
        if (!(path instanceof Array)) path = ('' + path).split('.');
        var curr = entry, prop, currPath = [].concat(path);
        while ((prop = currPath.shift()) !== undefined) {
            if (typeof curr !== 'object' || !(prop in curr)) return defaultValue;
            curr = curr[prop];
        }
        return curr;
    },
    
    _replaceRefsAndInstaniateObjects: function(json, htmlElement) {
        if (!json || typeof json !== 'object') return json;
        var i, l;
        if ('$ref' in json) return new Amm.Builder.Ref(json, htmlElement);
        if ('$ext' in json) {
            var data = this.getExtData(window, json.$ext);
            if (data === Amm.Builder._EXT_NOT_FOUND) throw Error("Cannot resolve '$ext' " + json.$ext);
            if (json['$resolve']) json = data;
            else return data;
        }
        if (json instanceof Array) {
            for (i = 0, l = json.length; i < l; i++) {
                if (json[i] && typeof json[i] === 'object') 
                    json[i] = this._replaceRefsAndInstaniateObjects(json[i], htmlElement);
            }
        } else {
            for (i in json) if (json.hasOwnProperty(i) && json[i] && typeof json[i] === 'object') {
                json[i] = this._replaceRefsAndInstaniateObjects(json[i], htmlElement);
            }
            if ('__construct' in json) {
                var tmp = json.__construct;
                delete json.__construct;
                json = Amm.constructInstance(json, tmp);
            }
        }
        return json;
    },
    
    _createNode: function(htmlElement) {
        var json = window.RJSON || window.JSON; // use relaxed json when possible
        var n = new Amm.Builder.Node(), a;
        n.htmlElement = htmlElement;
        a = htmlElement.getAttribute('data-amm-v');
        if (a && a.length) {
            n.v = this._replaceRefsAndInstaniateObjects(json.parse(a), n.htmlElement);
            if (!(n.v instanceof Array)) n.v = n.v? [n.v] : [];
            for (var i = 0, l = n.v.length; i < l; i++) {
                if ((typeof n.v[i]) === 'string') {
                    n.v[i] = {class: n.v[i]};
                }
                n.v[i].htmlElement = htmlElement;
            }
        }
        a = htmlElement.getAttribute('data-amm-e');
        if (a && a.length) n.e = this._replaceRefsAndInstaniateObjects(json.parse(a), n.htmlElement);
        a = htmlElement.getAttribute('data-amm-id');
        if (a && a.length) {
            a = a.replace(/^\s+|\s+$/g, '');
            if (a[0] === '@' && a[1]) {
                n.global = true;
                a = a.slice(1);
                if (!this._globalIds[a]) this._globalIds[a] = [n];
                    else this._globalIds[a].push(n);
            }
        }
        if (a && a.length) {
            n.id = a;
            n.connected.id = a; // add to shared array for speedup
        }
        a = htmlElement.getAttribute('data-amm-x');
        if (a && a.length) n.x = this._replaceRefsAndInstaniateObjects(json.parse(a), n.htmlElement);
        return n;
    },

    // marks two nodes as semantically related to one element and makes necessary changes
    // (when we already decided that they are)
    _connect: function(node, toNode) {
        if (node.e || toNode.e) node.connected.groupHasElement = true;
        var l = node.connected.length;
        var x;
        x = Amm.Array.diff(toNode.connected, node.connected);
        node.connected.push.apply(node.connected, x);
        if (toNode.connected.groupHasElement) node.connected.groupHasElement = true;
        if (toNode.connected.id && !node.connected.id) node.connected.id = toNode.connected.id;
        if (toNode.connected.alreadyBuilt) node.connected.alreadyBuilt = toNode.connected.alreadyBuilt;
        toNode.connected = node.connected;
        for (var i = l, cl = node.connected.length; i < cl; i++) {
            toNode.connected[i].conIdx = i;
            toNode.connected[i].connected = toNode.connected;
        }
    },
    
    /**
     * Searches descendant nodes between nodeWithChildren' child nodes 
     * that can be possibly connected to node `node` using `id`.
     * Doesn't descend into children that have 'id' set, but it is different
     * (children that have no id will be scanned, but not 'connected')
     * Only descendants that have same 'id' are eligible to connecting
     */
    
    _detectChildrenConnectedByIds: function(node, nodeWithChildren) {
        if (!node.id) return;
        for (var i = 0, l = nodeWithChildren.children.length; i < l; i++) {
            var child = nodeWithChildren.children[i];
            if (child === node) continue;
            
            // TODO: descend to connected nodes, not only nodes with same id
            if (child.id && child.id !== node.id) { 
                continue;
            }
            
            if (child.id === node.id) {
                this._connect(node, child);
            }
            this._detectChildrenConnectedByIds(node, child);
        }
    },
    
    _detectConnectedNodes: function(node) {
        var p, gids;
        if (node.id) {
            if (node.global && (gids = this._globalIds[node.id])) {
                for (var i = 0, l = gids.length; i < l; i++) {
                    if (gids[i] !== node) this._connect(node, gids[i]);
                }
            }
            for (p = node.parent; p; p = p.parent) {
                if (node.id === '__parent') {
                    node.id = null;
                    this._connect(node, p);
                }
                if (p.id === node.id) this._connect(node, p);
                this._detectChildrenConnectedByIds(node, p);
            }
        }
        this._detectConnectedRecursive(node.children);
        p = node.parent;
        if (p && (((node.v || node.x) && !node.e) || ((p.v || p.x) && !p.e))) {
            if (p && p.children.length === 1) {
                var nodeHasElement = !!(node.e || node.connected.groupHasElement);
                var parentHasElement = !!(p.e || p.connected.groupHasElement);
                var acceptable = !(nodeHasElement && parentHasElement);
                if (acceptable && (!p.id || !node.id) && (p.e || p.v || p.x)) {
                    this._connect(p, node);
                    node.conParent = true;
                    p.conChild = true;
                }
            }
        }
    },
    
    _getAllViews: function(node) {
        var res = node.v;
        if (!res) res = [];
        for (var i = 0, l = node.connected.length; i < l; i++) {
            if (node.connected[i] !== node)
                if (node.connected[i].v) {
                    res = res.concat(node.connected[i].v);
                }
        }
        return res;
    },
    
    _detectConnectedRecursive: function(items) {
        for (var i = 0, l = items.length; i < l; i++) {
            this._detectConnectedNodes(items[i]);
            //this._detectConnectedRecursive(items[i].children);
        }
    },
    
    _buildElements: function(node, topLevel, prototypesOnly) {
        var res = [];
        
        // first build node children and add them to result
        for (var i = 0, l = node.children.length; i < l; i++) {
            res = res.concat(this._buildElements(node.children[i], topLevel, prototypesOnly));
        }
        
        // do we have connected nodes? (belonging to the same element)
        if (!node.e && node.connected.length > 1) {
            
            // always use ID that is provided by the node group
            if (node.connected.id !== undefined) node.id = node.connected.id;
            
            // we don't have element definition - check if node is primary
            // between connected items
            
            if (node.connected.groupHasElement) {
                return res;
            } else {
                // we don't have element so build only when we got to the last node (why?)
                if (node.conIdx < node.connected.length - 1) {
                    return res;
                }
            }
            
            // "already built" flag is set - don't build same element again
            if (node.connected.alreadyBuilt) return res;
        }
        
        var nodePrototypeOrElement = node.e || {};
        var views;
        
        // check if we have Amm.Element instance provided instead of node prototype
        if (nodePrototypeOrElement['Amm.Element']) {
            if (!node.connected.views) node.connected.views = [];
            views = node.connected.views;
        } else {
            if (!nodePrototypeOrElement.views) nodePrototypeOrElement.views = [];
            views = nodePrototypeOrElement.views;
        }
        
        views.push.apply(views, this._getAllViews(node));
        if (!views.length) views.push({'class': 'Amm.View.Html.Default', reportMode: this.reportMode});
        for (var i = 0, l = views.length; i < l; i++) {
            if (!views[i].htmlElement) {
                views[i].htmlElement = node.htmlElement;
            }
        }
        
        if (node.id && !nodePrototypeOrElement.id) 
            nodePrototypeOrElement.id = node.id;
        if (!node.parent && this.topLevelComponent && !('component' in nodePrototypeOrElement)) {
            nodePrototypeOrElement.component = this.topLevelComponent;
        }
        
        this._applyExtensions(nodePrototypeOrElement, node);
        
        var element;
        
        if (nodePrototypeOrElement['Amm.Element']) { // we have prototype instance
            element = {'class': 'Amm.Element', views: views};
        } else {
            element = Amm.override({'class': 'Amm.Element'}, nodePrototypeOrElement);
        }
        
        if (!prototypesOnly) {
            element = Amm.constructInstance(nodePrototypeOrElement, 'Amm.Element');
        }
        if (topLevel && (!node.parent || node.parent === this._parent || node.conParent && !node.parent.parent)) {
            topLevel.push(element);
        }
        res.push(element);
        node.connected.alreadyBuilt = true;
        return res;
    },
    
    _applyExtensions: function(elementPrototype, node) {
        for (var i = 0, l = node.connected.length; i < l; i++) {
            if (node.connected[i].x) {
                var parsed = this._parseExtensions(node.connected[i].x);
                for (var j = 0, ll = parsed.length; j < ll; j++) {
                    var res = parsed[j].fn(node.connected[i].htmlElement, elementPrototype, parsed[j].arg);
                    if (res && typeof res === 'object') Amm.overrideRecursive(elementPrototype, res);
                }
            }
        }
    },
    
    _getExtension: function(path) {
        path = path.replace(/(\.|^)(\w+)$/, "$1builderExtension_$2");
        return Amm.getFunction(path);
    },
    
    _parseExtensions: function(param) {
        if (typeof param === 'string') return [{ fn: this._getExtension(param), arg: undefined }];
        if (typeof param !== 'object') {
            throw Error("data-amm-x must contain either string or an object");
        }
        var res = [];
        for (var path in param) if (param.hasOwnProperty(path)) {
            res.push({ fn: this._getExtension(path), arg: param[path] });
        }
        return res;
    },
    
    _regProblem: function(node, problem) {
        if (node instanceof Array) {
            for (var i = 0, l = node.length; i < l; i++)
                this._regProblem(node[i], problem);
            return;
        }
        if (!node.htmlElement.hasAttribute(Amm.domHolderAttribute)) {
            // prevent from re-creating on re-runs
            node.htmlElement.setAttribute(Amm.domHolderAttribute, "");
        }
        if (this.rememberProblems) this.problems.push({
            element: node.htmlElement, problem: problem
        });
        if (this.reportMode & Amm.Builder.PROBLEM_CONSOLE) {
            console.warn('Amm.Builder problem with HTML element', node.htmlElement, problem);
        }
        if (this.reportMode & Amm.Builder.PROBLEM_HTML) {
            this._annotate(node, problem);
        }
    },
    
    _annotate: function(node, content) {
        node.htmlElement.setAttribute('data-amm-warning', content);
    }
    
};

Amm.Builder.isPossibleBuilderSource = function(source) {
    if (!source) return false;
    if (source['Amm.Builder.Ref']) return true;
    if (typeof source === 'object' && 'parentNode' in source && 'tagName' in source) return true;
    if (source.jquery) return true;
    if (typeof source === 'string' && source.match(/^\<(?:.|[\n])*\>$/)) return true;
    return false;
};

Amm.Builder.calcPrototypeFromSource = function(builderSource, dontClone, views) {
    if (!builderSource) throw Error("`builderSource` is required");
    var source;
    if (typeof builderSource === 'string') {
        if (builderSource.match(/\s*<(?:.|[\n])*>\s*$/)) dontClone = true;
        source = builderSource;
    } else if (builderSource['Amm.Builder.Ref']) {
        source = builderSource.resolve();
    }
    else if(builderSource.tagName || builderSource.jquery) {
        source = builderSource;
    }
    else throw Error ("Unsupported builderSource type: " + Amm.describeType(builderSource));
    var jq = jQuery(source);
    if (!jq.length) throw Error("Cannot resolve builderSource reference");
    if (dontClone === undefined) dontClone = jq.attr('data-amm-dont-build') === undefined;
    if (!dontClone) jq = jq.clone();
    jq.removeAttr('data-amm-dont-build');
    var builder = new Amm.Builder(jq);
    var proto = views? builder.calcViewPrototypes() : builder.calcPrototypes(true);
    
    if (!proto.length) throw Error("Builder returned no prototypes");
    if (!views) {
        if (proto.length > 1) throw Error("Builder returned more than one prototype");
        if (!proto[0].class) proto[0].class = 'Amm.Element';
        return proto[0];
    }
    return proto;
};




/* global Amm */
/* global HTMLElement */

/**
 * "Default" view just asks Element to createDefaultView() and then sets its _htmlElement to own _htmlElement.
 * If Element doesn't have createDefaultView() method, or that method doesn't return proper View (or View prototype),
 * ...
 */
Amm.View.Html.Default = function (options) {
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this);
};

Amm.View.Html.Default.prototype = {
    
    'Amm.View.Html.Default': '__CLASS__',
    
    _defaultViews: null,
    
    _replacedMyElement: false,
    
    _ownHtmlElement: null,
    
    _viewHtmlElements: null,
    
    _replaceOwnHtmlElement: true,
    
    reportMode: Amm.Builder.PROBLEM_CONSOLE | Amm.Builder.PROBLEM_HTML,

    setReplaceOwnHtmlElement: function(replaceOwnHtmlElement) {
        var oldReplaceOwnHtmlElement = this._replaceOwnHtmlElement;
        if (oldReplaceOwnHtmlElement === replaceOwnHtmlElement) return;
        if (this._observing) {
            throw new Error("Cannot Amm.View.Html.Default::setReplaceOwnHtmlElement() while getObserving()");
        };
        this._replaceOwnHtmlElement = replaceOwnHtmlElement;
        return true;
    },

    getReplaceOwnHtmlElement: function() { return this._replaceOwnHtmlElement; },

    getOwnHtmlElement: function() {
        return this._ownHtmlElement;
    },

    setDefaultViews: function() {
        if (this._defaultViews !== null)
            throw Error("can setDefaultViews() only once, before element observation");
    },
    
    getDefaultViews: function() {
        return this._defaultViews? [].concat(this._defaultViews) : [];
    },
    
    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (!res) return res;
        var defaultViews;
        if (this._defaultViews) defaultViews = this._defaultViews; 
        else defaultViews = this._element.constructDefaultViews();
        if (!defaultViews || typeof defaultViews === 'Array' && !defaultViews.length) {
            if (this.reportMode & Amm.Builder.PROBLEM_HTML) {
                this._htmlElement.setAttribute('data-amm-warning', "Element has no default view(s)");
            }
            if (this.reportMode & Amm.Builder.PROBLEM_CONSOLE) {
                console.warn("Element has no default view(s): ", this._element);
            }
            return;
        }
        this._defaultViews = [];
        if (typeof defaultViews !== 'Array') defaultViews = [defaultViews];
        var viewHtmlElements = [];
        for (var i = 0, l = defaultViews.length; i < l; i++) {
            var v = defaultViews[i], inst;
            if (!v) continue;
            if (typeof v === 'object' && ('class' in v || Amm.is(v, 'Amm.View.Abstract'))) {
                inst = [v];
            } else if (Amm.Builder.isPossibleBuilderSource(v)) {
                inst = Amm.Builder.calcPrototypeFromSource(v, false, true);
            } else {
                throw new Error("incorrect result returned by Amm.Element.consturctDefaultViews() - cannot construct view");
            }
            for (var j = 0, l2 = inst.length; j < l2; j++) {
                inst[j] = Amm.constructInstance(inst[j], null, {element: this._element}, true, ['Amm.View.Html']);               
                this._defaultViews.push(inst[j]);
                var viewHtmlElement = inst[j].getHtmlElement();
                if (viewHtmlElement) {
                    viewHtmlElements.push(viewHtmlElement);
                }
            }
        }
        this._deleteNonTopNodes(viewHtmlElements);
        this._setViewHtmlElements(viewHtmlElements);
        return res;
    },
    
    /**
     * Scans all views nodes and leaves only ones that are applicable to placing instead of / within DefaultViews' HTMLElement
     */
    _deleteNonTopNodes: function(viewNodes) {
        for (var i = viewNodes.length - 1; i >= 0; i--) {
            if (viewNodes[i].parentNode && viewNodes[i].parentNode.tagName) {
                viewNodes.splice(i, 1);
            }
        }
    },
    
    /**
     * Both nodes and newNodes MUST be non-empty arrays
     */
    _replaceHtmlNodes: function(nodes, newNodes) {
        if (this._htmlElement === nodes[0]) {
            if (!this._ownHtmlElement) this._ownHtmlElement = this._htmlElement;
            this._htmlElement = newNodes[0];
        }
        if (!nodes[0].parentNode) return; // we cannot replace into nowhere
        var i;
        for (i = newNodes.length - 1; i >= 0; i--) {
            nodes[0].parentNode.insertBefore(newNodes[i], nodes[0]);
        }
        for (i = 0; i < nodes.length; i++) {
            nodes[i].parentNode.removeChild(nodes[i]);
        }
    },

    _setViewHtmlElements: function(viewHtmlElements) {
        var newNodes, oldNodes;
        newNodes = viewHtmlElements;
        
        if (!this._replaceOwnHtmlElement) return this._replaceContents(viewHtmlElements);
        
        if (!newNodes || !newNodes.length) {
            if (this._ownHtmlElement) newNodes = [this._ownHtmlElement];
            else newNodes = [];
        }
        
        oldNodes = this._viewHtmlElements;
        if (!oldNodes || !oldNodes.length) {
            oldNodes = [this._htmlElement];
        }
        
        if (Amm.Array.equal(oldNodes, newNodes)) return; // nothing to do
        
        if (!newNodes.length) return; // nothing to do
        
        if (this._observing) {
            if (oldNodes.length) this._releaseDomNode(newNodes);
            this._acquireDomNode(newNodes);
        }
        
        if (oldNodes[0] === this._htmlElement && !this._ownHtmlElement) this._ownHtmlElement = oldNodes[0];
        
        this._replaceHtmlNodes(oldNodes, newNodes);
        
        this._viewHtmlElements = viewHtmlElements && viewHtmlElements.length? viewHtmlElements : null;
        
        this._htmlElement = newNodes[0];
    },
    
    // move contents from old HTML element to new one
    _doSetHtmlElement: function(htmlElement, old) {
        if (!htmlElement || !old || !this._observing) return; // nothing to do

        var oldOwnHtmlElement = this._ownHtmlElement;
        if (oldOwnHtmlElement && !this._viewHtmlElements) {
            this._releaseDomNode(this._ownHtmlElement);
            return;
        }
        
        // since we're observing, we need to move contents in place of or into new element
        var currViewHtmlElements = [].concat(this._viewHtmlElements);
        this._setViewHtmlElements([]);
        this._releaseResources(oldOwnHtmlElement);
        this._htmlElement = htmlElement;
        this._ownHtmlElement = null;
        this._setViewHtmlElements(currViewHtmlElements);
    },
    
    _replaceContents: function(viewHtmlElements) {
        var node = this._htmlElement.firstChild, next;
        while (node) {
            next = node.nextSibling;
            this._htmlElement.removeChild(node);
            node = next;
        }
        this._viewHtmlElements = viewHtmlElements || null;
        if (!viewHtmlElements) return;
        for (var i = 0; i < viewHtmlElements.length; i++) {
            this._htmlElement.appendChild(viewHtmlElements[i]);
        }
        return;
    },
    
    _releaseResources: function() {
        this._setViewHtmlElements([]);
        if (!this._defaultViews) return;
        for (var i = 0, l = this._defaultViews.length; i < l; i++) {
            this._defaultViews[i].setElement(null);
            this._defaultViews[i].setHtmlElement(null);
            this._defaultViews[i].cleanup();
        }
        this._defaultViews = null;
        Amm.View.Html.prototype._releaseResources.call(this);
    },
    
};

//Amm.extend(Amm.View.Html.Default, Amm.Builder);
Amm.extend(Amm.View.Html.Default, Amm.View.Html);
Amm.extend(Amm.View.Html.Default, Amm.View.Abstract);
/* global Amm */

Amm.View.Html.Select = function(options) {
    Amm.View.Html.call(this);
    Amm.View.Abstract.Select.call(this, options);
};

Amm.View.Html.Select.prototype = {

    'Amm.View.Html.Select': '__CLASS__', 
    
    _fieldView: null,
    
    _collectionView: null,
    
    _createFieldView: function() {
        var proto = {
            getVReadOnly: this._fieldView_getVReadOnly,
            setVReadOnly: this._fieldView_setVReadOnly,
            htmlElement: this._htmlElement,
            getVValue: this._fieldView_getVValue,
            setVValue: this._fieldView_setVValue,
            //element: this._element
        };
        this._fieldView = new Amm.View.Html.Input(proto);
        this._fieldView._selectView = this;
        this._fieldView._receiveEvent = this._fieldView_receiveEvent;
    },
    
    _fieldView_getVReadOnly: function() { return false; },
    
    _fieldView_setVReadOnly: function(readOnly) {},
    
    _fieldView_receiveEvent: function(event) {
        if (!this._element) return;
        if (event.type === 'change' && this._element.getReadOnly()) {
            this.setVValue(this._element.getValue());
            return true;
        }
        return Amm.View.Html.Input.prototype._receiveEvent.call(this, event);
    },
    
    _fieldView_setVValue: function (value) {
        if (!this._selectView._element) return;
        var cv = this._selectView._collectionView;
        var i, l;
        if (!cv) return Amm.View.Html.Input.prototype.getVValue.call(this);
        if (this._element.getMultiple()) {
            for (i = 0, l = this._htmlElement.options.length; i < l; i++) {
                var item = cv.getHtmlElementItem(this._htmlElement.options[i]);
                if (!item) continue;
                this._htmlElement.options[i].selected = Amm.Array.indexOf(item.getValue(), value) >= 0;
            }
            return;
        } 
        for (i = 0, l = this._htmlElement.options.length; i < l; i++) {
            var item = cv.getHtmlElementItem(this._htmlElement.options[i]);
            this._htmlElement.options[i].selected = (item.getValue() === value);
        }
    },
    
    _fieldView_getVValue: function() {
        if (this._element.getOptions() === undefined && this._htmlElement) {
            
            // very stupid method - because first time this method is called during
            // property auto-detection, we need to auto-detect options first, otherwise
            // setValue() will be applied to element w/o options
            
            this._element.setOptions(this._detectOptions(this._htmlElement));
            return;
        }
        var res = [];
        var multi = this._element.getMultiple();
        var cv = this._selectView._collectionView;
        if (!cv) return Amm.View.Html.Input.prototype.getVValue.call(this);
        for (var i = 0, l = this._htmlElement.options.length; i < l; i++) {
            if (!this._htmlElement.options[i].selected) continue;
            var item = cv.getHtmlElementItem(this._htmlElement.options[i]);
            if (!item) continue;
            var val = item.getValue();
            if (!multi) {
                return val;
            }
            else res.push(val);
        }
        if (!multi) return null;
        return res;
    },
    
    _detectOptions: function(element) {
        var jq = jQuery(element);
        var options = [];
        for (var i = 0; i < element.options.length; i++) {
            var htmlOption = element.options[i];
            var elementOption = {
                label: jQuery(htmlOption).html(), 
                value: htmlOption.value
            };
            if (htmlOption.disabled) elementOption.disabled = true;
            elementOption.selected = !!htmlOption.selected;
            options.push(elementOption);
        };
        return options;
    },
    
    _createCollectionView: function() {
        var options = this._element.getOptions();
        
        if (options === undefined) {
            this._element.setOptions(this._detectOptions(this._htmlElement));
        }
        
        var t = this;
        var proto = {
            collectionProperty: 'optionsCollection',
            //element: this._element,
            htmlElement: this._htmlElement,
            createItemHtml: function(item) {
                var r = jQuery('<option>' + item.getLabel() + '</option>');
                var v = item.getValue();
                if (typeof v !== 'object') {
                    r.attr('value', v);
                } else {
                    r.removeAttr('value');
                }
                if (item.getDisabled()) r.attr('disabled', 'disabled');
                if (item.getSelected()) r.attr('selected', 'selected');
                if (!item.getVisible()) return r.wrap('<span>').parent()[0];
                else return r[0];
            },
            updateItemHtml: function(item, node) {
                var wasSpan = false;
                if (node.tagName === 'SPAN') {
                    wasSpan = true;
                    node = node.firstChild;
                }
                var selected = !!item.getSelected();
                node.selected = selected;
                node.disabled = t._element.getReadOnly() && !selected || !!item.getDisabled();
                var v = item.getValue();
                if (typeof v !== 'object') {
                    node.value = v;
                } else {
                    node.removeAttribute('value');
                }
                jQuery(node).html(item.getLabel());
                if (!item.getVisible()) {
                    if (!wasSpan) node = jQuery(node).wrap('<span></span>').parent()[0];
                    else node = node.parentNode;
                } else if (wasSpan) {
                    node.parentNode.removeChild(node);
                }
                return node;
            }
        };
        this._collectionView = new Amm.View.Html.Collection(proto);
    },
    
    _doObserveSelect: function() {
        Amm.View.Abstract.Select.prototype._doObserveSelect.call(this);
        this._fieldView.setElement(this._element);
        this._collectionView.setElement(this._element);
    },
    
    _endObserve: function() {
        this._fieldView.setElement(null);
        this._collectionView.setElement(null);
    },
    
    setHtmlElement: function(htmlElement) {
        if (htmlElement && htmlElement.tagName !== 'SELECT') {
            Error("<select> element must be provided");
        }
        return Amm.View.Html.prototype.setHtmlElement.call(this, htmlElement);
    },
    
    _doSetHtmlElement: function(htmlElement, old) {
        if (this._fieldView) this._fieldView.setHtmlElement(this._htmlElement);
        if (this._collectionView) this._collectionView.setHtmlElement(this._htmlElement);
    },
    
    getVMultiple: function() { 
        var e = jQuery(this._htmlElement);
        if (e[0]) return !!e.attr('multiple'); 
    },
    
    setVMultiple: function(value) { 
        var e = jQuery(this._htmlElement);
        if (e[0]) e.attr('multiple', value? 'multiple': null); 
    },
    
    setVReadOnly: function(readOnly) {
        if (this._collectionView) this._collectionView.refreshAllItems();
    },
    
    getVSelectSize: function() {
        var e = jQuery(this._htmlElement);
        if (e[0]) {
            return e[0].size || 1;
        } 
    },
    
    setVSelectSize: function(value) {
        var e = jQuery(this._htmlElement);
        if (e[0]) e.attr('size', value); 
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Select];
    }

};

Amm.extend(Amm.View.Html.Select, Amm.View.Html);
Amm.extend(Amm.View.Html.Select, Amm.View.Abstract.Select);
/* global Amm */

Amm.Root = function(options) {
    Amm.augment(this, Amm.Trait.Component);
    Amm.Element.call(this, options);
};

Amm.Root.prototype = {
    
    'Amm.Root': '__CLASS__',
    
    _id: '^',
    
    _internalId: 'root',
    
    _intervalDelay: 250,
    
    _interval: null,
    
    _counter: 0,
    
    // Root is allowed to have ANY events to create global events
    strictEvents: false,
    
    setId: function(id) {
        if (id !== '^') Error("Cannot setId() of root to anything other than '^'");
    },
    
    raiseEvent: function(eventName) {
        var args = Array.prototype.slice.call(arguments, 0);
        var res = this._out.apply(this, args);
        if (eventName === 'bootstrap' && Amm.getBootstrapped()) {
            // delete so next handler will have _subscribeFirst too
            // and current handlers won't be called again            
            delete this._subscribers['bootstrap'];
        }
        return res;
    },
    
    outInterval: function() {
        this._out('interval', this._counter++);
    },
    
    _subscribeFirst_bootstrap: function() {
        if (Amm.getBootstrapped()) {
            // will call newly subscribed handler and clear the handlers list
            this.raiseEvent('bootstrap');
        }
    },
    
    _subscribeFirst_interval: function() {
        var t = this;
        this._interval = window.setInterval(function() {t.outInterval();}, this._intervalDelay);
    },
    
    _unsubscribeLast_interval: function() {
        if (this._interval) {
            window.clearInterval(this._interval);
            this._interval = null;
        }
    },
    
    subscribe: function(eventName, handler, scope, extra, decorator) {
        if (Amm.itemDebugTag && Amm.itemDebugTag.length && Amm.getClass(scope)) {
            if (!scope._root_sub) scope._root_sub = {};
            scope._root_sub[eventName] = Amm.itemDebugTag[Amm.itemDebugTag.length - 1];
        }
        return Amm.WithEvents.prototype.subscribe.call(this, eventName, handler, scope, extra, decorator);
    }
    
};

Amm.extend(Amm.Root, Amm.Element);
/* global Amm */

//Amm.extend(Amm.Trait, Amm.ElementBound);
//Amm.Trait.prototype

Amm.Trait = {

    //add: function()

};
/* global Amm */

Amm.Trait.Field = function() {
  
  this._validators = [];
  
};

/**
 * Never automatically validate
 */
Amm.Trait.Field.VALIDATE_NEVER = 0;

/**
 * Validates when editor loses focus (`focused` field changes from TRUE to FALSE)
 */
Amm.Trait.Field.VALIDATE_BLUR = 1;

/**
 * Validates when `valueChange` event is triggered
 */ 
Amm.Trait.Field.VALIDATE_CHANGE = 2;

/**
 * Validates both on lost focus or valueChange event
 */
Amm.Trait.Field.VALIDATE_BLUR_CHANGE = 3;

/**
 * Validates when validation expressions are changed
 */ 
Amm.Trait.Field.VALIDATE_EXPRESSIONS = 4;

/**
 * Validates instantly when `needValidate` becomes TRUE
 */ 
Amm.Trait.Field.VALIDATE_INSTANT = 8;

/**
 * We had translation error during input
 */
Amm.Trait.Field.TRANSLATION_ERROR_IN = 1;

/**
 * We had translation error during output
 */
Amm.Trait.Field.TRANSLATION_ERROR_OUT = -1;

/**
 * Important! Field does not validate its' value when it's empty (has undefined, empty string or null)
 */
Amm.Trait.Field.prototype = {  

    'Field': '__INTERFACE__',

    _form: null,

    // _fieldName defaults to element.getId() if 'undefined'
    _fieldName: undefined,
    
    _fieldLabel: undefined,

    _validators: null,

    _validateMode: Amm.Trait.Field.VALIDATE_CHANGE | Amm.Trait.Field.VALIDATE_EXPRESSIONS,

    _fieldLocalErrors: undefined,
    
    _fieldRemoteErrors: undefined,
    
    _fieldErrors: undefined,
    
    _needValidate: false,

    _fieldApplied: true,
    
    _fieldRequired: undefined,
    
    fieldRequiredMessage: 'lang.Amm.Validator.Required.msg',
    
    _fieldRequiredValidator: null,
    
    _fieldEmpty: undefined,
    
    _fieldValue: undefined,
    
    _fieldSyncsValue: false,
    
    _lockFieldValueChange: 0,
    
    _lockAnnotationSync: 0,
    
    _fieldTranslator: null,
        
    _translationErrorState: null,
    
    _fieldSyncWithAnnotations: true,
    
    _fieldInSyncWithAnnotations: false,
        
    _initValidationExpressions: null,
    
    _validationExpressions: null,
    
    _fieldIndex: undefined,
    
    __augment: function(traitInstance, options) {
        
        Amm.Element.regInit(this, '99.Amm.Trait.Field', function() {
            this._fieldSyncsValue = !!Amm.detectProperty(this, 'value');
            if (this._fieldSyncsValue) this.subscribe('valueChange', this._handleFormExtValueChange, this);
            if (Amm.detectProperty(this, 'focused')) {
                this.subscribe('focusedChange', this._handleFieldFocusedChange, this);
            }
            if (this['Annotated'] === '__INTERFACE__' && this._fieldSyncWithAnnotations) {
                this._syncWithAnnotations();
            }
            if (this._fieldSyncsValue) {
                if (this._fieldValue === undefined) {
                    var v = this.getValue();
                    if (v !== undefined) {
                        this._handleFormExtValueChange(v, undefined);
                    }
                } else {
                    this._syncFieldValueToElement(this._fieldValue);
                }
            }
        });
    },
    
    _syncWithAnnotations: function() {
        if (!this._fieldInSyncWithAnnotations) {
            this.subscribe('requiredChange', this._handleSelfAnnotationRequiredChange, this);
            this.subscribe('labelChange', this._handleSelfAnnotationLabelChange, this);
            this.subscribe('errorChange', this._handleSelfAnnotationErrorChange, this);
            this._fieldInSyncWithAnnotations = true;
        }

        if (this._fieldRequired !== undefined) this.setRequired(this._fieldRequired);
        else if (this._required !== undefined) this.setFieldRequired(this._required);

        if (this._fieldLabel !== undefined) this.setLabel(this._fieldLabel);
        else if (this._label !== undefined) this.setFieldLabel(this._label);

        if (this._fieldErrors !== undefined) this.setError(this._fieldErrors);
        else if (this._error !== undefined) this.setFieldRemoteErrors(this._error);
    },
    
    getFieldSyncsValue: function() {
        return this._fieldSyncsValue;
    },
    
    _handleSelfAnnotationRequiredChange: function(required, oldRequired) {
        if (this._lockAnnotationSync) return;
        if (this._fieldInSyncWithAnnotations && this._fieldRequired === undefined)
            this.setFieldRequired(required);
    },
    
    _handleSelfAnnotationLabelChange: function(label, oldLabel) {
        if (this._lockAnnotationSync) return;
        if (this._fieldInSyncWithAnnotations && this._fieldLabel === undefined) {
            this.setFieldLabel(label);
        }
    },
    
    _handleSelfAnnotationErrorChange: function(error, oldError) {
        if (this._lockAnnotationSync) return;
        if (this._fieldInSyncWithAnnotations && this._fieldLocalErrors === undefined) {
            this.setFieldLocalErrors(error);
        }
    },
    
    setForm: function(form) {
        if (form) Amm.is(form, 'Form', 'form');
        else form = null;
        var oldForm = this._form;
        if (oldForm === form) return;
        if (oldForm) {
            var idx = oldForm.fields.strictIndexOf(this);
            if (idx >= 0) oldForm.fields.removeAtIndex(idx);
        }
        if (form) {
            var idxNew = form.fields.strictIndexOf(this);
            if (idxNew < 0) form.fields.accept(this);
        }
        this._form = form;
        this._callOwnMethods('_setForm_', this._form, oldForm);
        this.outFormChange(form, oldForm);
        return true;
    },
    
    outFormChange: function(form, oldForm) {
        return this._out('formChange', form, oldForm);
    },

    getForm: function() { return this._form; },

    setFieldName: function(fieldName) {
        var oldFieldName = this._fieldName;
        if (oldFieldName === fieldName) return;
        this._fieldName = fieldName;
        this.outFieldNameChange(fieldName, oldFieldName);
        return true;
    },

    getFieldName: function() { 
        if (this._fieldName === undefined) return this._id;
        return this._fieldName; 
    },
    
    _setId_Field: function(id, oldId) {
        if (this._fieldName === undefined) this.outFieldNameChange(id, oldId);
    },
    
    outFieldNameChange: function(name, oldName) {
        this._callOwnMethods('_fieldNameChange_', name, oldName);
        this._out('fieldNameChange', name, oldName);
    },

    setFieldIndex: function(fieldIndex) {
        var oldFieldIndex = this._fieldIndex;
        if (oldFieldIndex === fieldIndex) return;
        this._fieldIndex = fieldIndex;
 
        this.outFieldIndexChange(fieldIndex, oldFieldIndex);
        return true;
    },

    getFieldIndex: function() { return this._fieldIndex; },

    outFieldIndexChange: function(fieldIndex, oldFieldIndex) {
        this._out('fieldIndexChange', fieldIndex, oldFieldIndex);
    },
    
    setFieldLabel: function(fieldLabel) {
        var oldFieldLabel = this._fieldLabel;
        if (oldFieldLabel === fieldLabel) return;
        this._fieldLabel = fieldLabel;
        if (this._fieldTranslator && this._fieldTranslator.field === oldFieldLabel) {
            this._fieldTranslator.field = fieldLabel;
        }
        // re-validate since our error messages will change
        if (this._fieldLocalErrors) this._revalidate();
        if (this._fieldInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('label')) {
            this._lockAnnotationSync++;
            this.setLabel(this._fieldLabel);
            this._lockAnnotationSync--;
        }
        this.outFieldLabelChange(fieldLabel, oldFieldLabel);
        return true;
    },

    getFieldLabel: function() { return this._fieldLabel; },
    
    outFieldLabelChange: function(fieldLabel, oldFieldLabel) {
        return this._out('fieldLabelChange', fieldLabel, oldFieldLabel);
    },
    
    setValidators: function(validators) {
        Amm.cleanup(true, this.validators);
        this._validators = [];
        if (!validators) return;
        if (!(validators instanceof Array)) {
            Error("`validators` must be an Array");
        }
        for (var i = 0; i < validators.length; i++) {
            var instance = Amm.Validator.construct(validators[i]);
            if (typeof instance.setElement === 'function')  {
                instance.setElement(this);
            } else if ('element' in instance) {
                instance.element = this;
            }
            this._validators.push(instance);
        }
        this.setNeedValidate(true);
    },
    
    /**
     * Generally, returns boolean (true if valid); sets fieldLocalErrors field
     * Doesn't call validators or trigger onValidate event if field value is empty.
     * Fields with !getFieldApplied() are always valid
     * 
     * @param {onlyReturnErrors} boolean Return Array with errors; don't set this.fieldLocalErrors
     * @returns Array|boolean
     */
    validate: function(onlyReturnErrors) {
        if (!this._fieldApplied) {
            if (onlyReturnErrors) return [];
            return true;
        }
        if (this._translationErrorState) {
            if (onlyReturnErrors) return this._fieldLocalErrors? [].concat(this._fieldLocalErrors) : [];
            return false;
        }
        var errors = [];
        var empty = this.getFieldEmpty();
        var value = this.getFieldValue();
        var label = this.getFieldLabel();
        this._doValidate(errors, value, empty, label);
        if (onlyReturnErrors) {
            return errors;
        }
        this.setFieldLocalErrors(errors);
        this.setNeedValidate(false);
        this.outAfterFieldValidate(!errors.length, errors);
        return !errors.length;
    },
    
    outAfterFieldValidate: function(isValid, errors) {
        return this._out('afterFieldValidate', isValid, errors);
    },
    
    _doValidate: function(errors, value, empty, label) {
        var err;
        if (this._fieldRequiredValidator) {
            err = this._fieldRequiredValidator.getError(value, this.getFieldLabel());
            if (err) {
                if (this._fieldRequired) errors.push(err);
                empty = true;
            } else {
                empty = false;
            }
        } else {
            if (empty && this._fieldRequired) {
                errors.push(Amm.translate(this.fieldRequiredMessage, '%field', label));
            }
        }
        if (!empty) {
            this.outOnValidate(value, errors);
            if (this._validationExpressions) {
                this._applyValidationExpressions(errors);
            }
            for (var i = 0; i < this._validators.length; i++) {
                err = this._validators[i].getError(value, label);
                if (err) errors.push(err);
            }
        }        
    },
    
    _revalidate: function() {
        if (
            this._fieldSyncsValue && 
            this._translationErrorState === Amm.Trait.Field.TRANSLATION_ERROR_IN
        ) {
            var v = this.getValue();
            this._handleFormExtValueChange(v, v);
        } else if (
            this._fieldSyncsValue && 
            this._translationErrorState === Amm.Trait.Field.TRANSLATION_ERROR_OUT
        ) {
            this._syncFieldValueToElement(this._fieldValue);
        } else {
            this.validate();
        }
    },
    
    outOnValidate: function(value, errors) {
        return this._out('onValidate', value, errors);
    },
    
    getValidators: function() { return this._validators; },

    setValidateMode: function(validateMode) {
        var oldValidateMode = this._validateMode;
        if (oldValidateMode === validateMode) return;
        this._validateMode = validateMode;
        if (this._needValidate && validateMode & (Amm.Trait.Field.VALIDATE_INSTANT)) {
            this.validate();
        }
        return true;
    },

    getValidateMode: function() { return this._validateMode; },

    _setFieldErrorsArray: function(targetProperty, errors, add) {
        var oldValue = this[targetProperty];
        var sameArrays = false;
        if (errors) {
            if (!(errors instanceof Array))
                errors = [errors];
            else if (!errors.length) errors = null;
        } else {
            if (errors !== undefined) errors = null;
        }
        if (add && this[targetProperty]) {
            if (!errors) return false; // nothing to add
            var extra = Amm.Array.diff(errors, this[targetProperty]);
            if (!extra.length) return false; // nothing to add
            errors = [].concat(this[targetProperty], extra);
        } else {
            if (oldValue instanceof Array && errors instanceof Array) {
                if (oldValue.length === errors.length 
                    && !Amm.Array.symmetricDiff(oldValue, errors).length
                ) sameArrays = true;
            }
        }
        if (oldValue === errors || sameArrays) return false;
        this[targetProperty] = errors;
        return oldValue;
    },

    _updateFieldErrors: function() {
        var old = this._fieldErrors;
        this._fieldErrors = [].concat(this.getFieldLocalErrors() || [], this._fieldRemoteErrors || []);
        this._fieldErrors = Amm.Array.unique(this._fieldErrors);
        if (!this._fieldErrors.length) this._fieldErrors = null;
        if (old === this._fieldErrors || (old && this._fieldErrors && Amm.Array.equal(this._fieldErrors, old))) {
            this._fieldErrors = old;
            return;
        }
        this.outFieldErrorsChange(this._fieldErrors, old);
        if (!this._fieldInSyncWithAnnotations || this._lockAnnotationSync || !this.hasAnnotation('error')) {
            return;
        }
        this._lockAnnotationSync++;
        this.setError(this._fieldErrors && this._fieldErrors.length? [].concat(this._fieldErrors) : null);
        this._lockAnnotationSync--;
    },
    
    getFieldErrors: function() {
        if (!this._fieldApplied) return [];
        if (!this._fieldErrors) {
            this._fieldErrors = [].concat(this.getFieldLocalErrors() || [], this._fieldRemoteErrors || []);
            this._fieldErrors = Amm.Array.unique(this._fieldErrors);
        }
        return this._fieldErrors && this._fieldErrors.length? 
            [].concat(this._fieldErrors) : null;
    },
    
    setFieldErrors: function(fieldErrors, add) {
        if (!add) this.setFieldRemoteErrors(null);
        this.setFieldLocalErrors(fieldErrors, add);
    },
    
    outFieldErrorsChange: function(errors, oldErrors) {
        return this._out('fieldErrorsChange', errors, oldErrors);
    },
    
    setFieldLocalErrors: function(fieldLocalErrors, add) {
        
        var oldValue = this._setFieldErrorsArray('_fieldLocalErrors', fieldLocalErrors, add);
        
        if (oldValue === false) return;
      
        this._updateFieldErrors();
        
        this.outFieldLocalErrorsChange(fieldLocalErrors, oldValue);
        
        return true;
    },
    
    getFieldLocalErrors: function() {
        if (!this._fieldApplied) return [];
        if (this._fieldLocalErrors === undefined) this.validate(); 
        return this._fieldLocalErrors? [].concat(this._fieldLocalErrors) : null;
    },

    outFieldLocalErrorsChange: function(fieldLocalErrors, oldFieldLocalErrors) {
        this._out('fieldLocalErrorsChange', fieldLocalErrors, oldFieldLocalErrors);
    },

    
    setFieldRemoteErrors: function(fieldRemoteErrors, add) {
        var oldValue = this._setFieldErrorsArray('_fieldRemoteErrors', fieldRemoteErrors, add);
        
        if (oldValue === false) return;
      
        this._updateFieldErrors();
        
        this.outFieldRemoteErrorsChange(fieldRemoteErrors, oldValue);
        
        return true;
    },
    
    getFieldRemoteErrors: function() {
        if (!this._fieldApplied) return [];
        if (this._fieldRemoteErrors === undefined) this.validate(); 
        return this._fieldRemoteErrors? [].concat(this._fieldRemoteErrors) : null;
    },

    outFieldRemoteErrorsChange: function(fieldRemoteErrors, oldFieldRemoteErrors) {
        this._out('fieldRemoteErrorsChange', fieldRemoteErrors, oldFieldRemoteErrors);
    },

    setFieldApplied: function(fieldApplied) {
        fieldApplied = !!fieldApplied;
        var oldFieldApplied = this._fieldApplied;
        if (oldFieldApplied === fieldApplied) return;
        this._fieldApplied = fieldApplied;
        this.outFieldAppliedChange(fieldApplied, oldFieldApplied);
        this.setNeedValidate(true);
        return true;
    },

    outFieldAppliedChange: function(fieldApplied, oldFieldApplied) {
        this._out('fieldAppliedChange', fieldApplied, oldFieldApplied);
    },

    getFieldApplied: function() { return this._fieldApplied; },
    
    setFieldSyncWithAnnotations: function(fieldSyncWithAnnotations) {
        fieldSyncWithAnnotations = !!fieldSyncWithAnnotations;
        var oldFieldSyncWithAnnotations = this._fieldSyncWithAnnotations;
        if (oldFieldSyncWithAnnotations === fieldSyncWithAnnotations) return;
        this._fieldSyncWithAnnotations = fieldSyncWithAnnotations;
        if (this._fieldSyncWithAnnotations) this._syncWithAnnotations();
        return true;
    },

    getFieldSyncWithAnnotations: function() { return this._fieldSyncWithAnnotations; },
    
    getFieldInSyncWithAnnotations: function() { return this._fieldInSyncWithAnnotations; },
    
    setFieldRequired: function(fieldRequired) {
        fieldRequired = !!fieldRequired;
        var oldFieldRequired = this._fieldRequired;
        if (oldFieldRequired === fieldRequired) return;
        this._fieldRequired = fieldRequired;
        if (this._fieldInSyncWithAnnotations && !this._lockAnnotationSync && this.hasAnnotation('required')) {
            this._lockAnnotationSync++;
            this.setRequired(this._fieldRequired);
            this._lockAnnotationSync--;
        }
        this.outFieldRequiredChange(fieldRequired, oldFieldRequired);
        this.setNeedValidate(true);
        return true;
    },
    
    outFieldRequiredChange: function(fieldRequired, oldFieldRequired) {
        return this._out('fieldRequiredChange', fieldRequired, oldFieldRequired);
    },

    getFieldRequired: function() { return this._fieldRequired; },
    
    setFieldRequiredValidator: function(fieldRequiredValidator) {
        var oldFieldRequiredValidator = this._fieldRequiredValidator;
        if (oldFieldRequiredValidator === fieldRequiredValidator) return;
        if (fieldRequiredValidator) {
            if (typeof fieldRequiredValidator === 'function') {
                fieldRequiredValidator = new Amm.Validator.Function({func: fieldRequiredValidator});
            } else {
                fieldRequiredValidator = Amm.constructInstance(
                    fieldRequiredValidator, 'Amm.Validator'
                );
            }
            Amm.setField(fieldRequiredValidator, 'element', this);
        }
        this._fieldRequiredValidator = fieldRequiredValidator;
        this.setNeedValidate(true);
        return true;
    },

    getFieldRequiredValidator: function() { return this._fieldRequiredValidator; },

    setFieldEmpty: function(fieldEmpty) {
        var oldFieldEmpty = this._fieldEmpty;
        if (oldFieldEmpty === fieldEmpty) return;
        this._fieldEmpty = fieldEmpty;
 
        this.outFieldEmptyChange(fieldEmpty, oldFieldEmpty);
        return true;
    },
    
    _handleFormExtValueChange: function(value, oldValue) {
        if (this._lockFieldValueChange) return;
        this._lockFieldValueChange = 1;
        this._translationErrorState = 0;
        var err = {}, fieldValue = value;
        if (this._fieldTranslator) {
            fieldValue = this._fieldTranslator.translateIn(value, err);
        }
        if (err.error) {
            this._setInTranslationErrorState(fieldValue, err.error);
        } else {
            this.setFieldValue(fieldValue);
        }
        this._lockFieldValueChange = 0;
    },

    setFieldValue: function(fieldValue) {
        var oldFieldValue = this._fieldValue;
        if (oldFieldValue === fieldValue) return;
        this._fieldValue = fieldValue;
        this.setFieldEmpty(this._isFieldEmpty(fieldValue));
        this.setNeedValidate(true);
        this.outFieldValueChange(fieldValue, oldFieldValue);
        // check for _needValidate since validate() may be called during
        // "outFieldValueChange" invocation
        if (this._validateMode & Amm.Trait.Field.VALIDATE_CHANGE && this._needValidate) {
            this.validate();
        }
        if (!this._lockFieldValueChange && this._fieldSyncsValue) {
            this._syncFieldValueToElement(fieldValue);
        }
        
        return true;
    },
    
    _syncFieldValueToElement: function(fieldValue) {
        if (this._lockFieldValueChange || !this._fieldSyncsValue) return;
        this._translationErrorState = 0;
        this._lockFieldValueChange = 1;
        var value = fieldValue, err = {};
        if (this._fieldTranslator) {
            value = this._fieldTranslator.translateOut(fieldValue, err);
        }
        if (err.error) {
            this._setOutTranslationErrorState(value, err.error);
        } else {
            this.setValue(value);
        }
        this._lockFieldValueChange = 0;
    },
    
    _setInTranslationErrorState: function(fieldValue, error) {
        this._translationErrorState = Amm.Trait.Field.TRANSLATION_ERROR_IN;
        this.setFieldValue(fieldValue);
        this.setFieldLocalErrors(error, false);
    },
    
    _setOutTranslationErrorState: function(value, error) {
        this._translationErrorState = Amm.Trait.Field.TRANSLATION_ERROR_OUT;
        this.setValue(value);
        this.setFieldLocalErrors(error, false);
    },

    getFieldValue: function() { return this._fieldValue; },

    outFieldValueChange: function(fieldValue, oldFieldValue) {
        this._out('fieldValueChange', fieldValue, oldFieldValue);
    },

    _handleFieldFocusedChange: function(focused, oldFocused) {
        if (oldFocused && this._needValidate && !focused && 
            this._validateMode & Amm.Trait.Field.VALIDATE_BLUR) {
            this.validate();
        }
    },

    _isFieldEmpty: function(v) {
        var res = (v === undefined || v === null || v === '');
        return res;
    },
    
    getFieldEmpty: function() { 
        if (this._fieldEmpty === undefined) {
            var pe = this._isFieldEmpty(this.getFieldValue());
            this.setFieldEmpty(pe);
        }
        return this._fieldEmpty; 
    },

    outFieldEmptyChange: function(fieldEmpty, oldFieldEmpty) {
        this._out('fieldEmptyChange', fieldEmpty, oldFieldEmpty);
    },
    
    setNeedValidate: function(needValidate) {
        needValidate = !!needValidate;
        if (this._needValidate === needValidate) return;
        var oldNeedValidate = this._needValidate;
        this._needValidate = needValidate;
        this._out('needValidateChange', needValidate, oldNeedValidate);
        if (needValidate && (this._validateMode & Amm.Trait.Field.VALIDATE_INSTANT)) {
            this.validate();
        }
        return true;
    },
    
    outNeedValidateChange: function(needValidate, oldNeedValidate) {
        this._out('needValidateChange', needValidate, oldNeedValidate);
    },
    
    getNeedValidate: function() {
        return this._needValidate;
    },

    setFieldTranslator: function(fieldTranslator) {
        if (fieldTranslator) 
            fieldTranslator = Amm.constructInstance(fieldTranslator, 'Amm.Translator');
        else
            fieldTranslator = null;
        var oldFieldTranslator = this._fieldTranslator;
        if (oldFieldTranslator === fieldTranslator) return;
        if (fieldTranslator && fieldTranslator.field === undefined)
            fieldTranslator.field = this.getFieldLabel();
        this._fieldTranslator = fieldTranslator;
        if (this._translationErrorState) this._revalidate();
        return true;
    },

    getFieldTranslator: function() { return this._fieldTranslator; },
    
    getTranslationErrorState: function() { return this._translationErrorState; },
    
    setValidationExpressions: function(validationExpressions) {
        if (this._validationExpressions) {
            Amm.cleanup(this._validationExpressions);
        }
        this._validationExpressions = null;
        if (!validationExpressions) {
            return;
        } else if (!(validationExpressions instanceof Array)) {
            throw Error("`validationExpressions` must be an Array or FALSEable, provided: "
                    + Amm.describeType(validationExpressions));
        }
        if (!validationExpressions.length) {
            return;
        }
        this._validationExpressions = [];
        for (var i = 0, l = validationExpressions.length; i < l; i++) {
            var expression = this._createExpression(validationExpressions[i]);
            this._validationExpressions.push(expression);
            expression.subscribe('valueChange', this._handleValidationExpressionChange, this, i);
        }
    },
    
    _handleValidationExpressionChange: function(value, oldValue) {
        // var extra = arguments[arguments.length - 1];
        this.setNeedValidate(true);
        if (this._needValidate && (this._validateMode & Amm.Trait.Field.VALIDATE_EXPRESSIONS)) {
            this.validate();
        }
    },
    
    _applyValidationExpressions: function(errors) {
        if (!this._validationExpressions) return;
        var label = this.getFieldLabel();
        for (var i = 0, l = this._validationExpressions.length; i < l; i++) {
            var e = this._validationExpressions[i].getValue();
            if (e) {
                var msg = Amm.translate(e + "", '%field', label);
                errors.push(msg);
            }
        }
    }
    
};
/* global Amm */

Amm.Trait.Form = function(options) {
    Amm.Trait.Field.call(this, options);
};

Amm.Trait.Form.prototype = {

    'Form': '__INTERFACE__',
    
    invalidFieldsMessage: 'lang.Amm.Trait.Form.invalidFieldsMsg',

    /**
     * @type {Amm.Collection}
     */
    fields: null,
    
    /**
     * Temporary variable that holds fields' array when setFields() is called 
     * before this.fields collection is created
     */
    _setFormFields: null,

    // if also Amm.Trait.Component, adding Field to Component adds it to `fields`
    _elementsAreFields: true,

    _displayChildrenAreFields: true,

    _fieldsUpdateLevel: 0,
    
    _fieldMap: null,
    
    _setFieldMap: null,
    
    _fieldsChanged: false,
    
    _lastNum: null,
    
    _beginUpdateFields: function() {
        this._fieldsUpdateLevel++;
        this.fields.beginUpdate();
    },
    
    _endUpdateFields: function() {
        if (!this._fieldsUpdateLevel) Error("Call to _endUpdateFields() w/o corresponding _beginUpdateFields()");
        this.fields.endUpdate();
        this._fieldsUpdateLevel--;
        if (!this._fieldsUpdateLevel && this._fieldsChanged) {
            this._fieldsChanged = false;
            this._recalcFields();
        }
    },

    __augment: function(traitInstance, options) {
        
        Amm.Trait.Field.prototype.__augment.call(this, traitInstance, options);
        
        var proto = {
            
            indexProperty: 'fieldIndex',
            assocProperty: 'form',
            assocInstance: this,
            assocEvents: {
                fieldNameChange: this._softRecalc,
                fieldValueChange: this._softRecalc,
                fieldAppliedChange: this._softRecalc,
                needValidateChange: this._fieldNeedValidate,
            },
            on__spliceItems: [this._softRecalc, this]
        };
        
        if (this._setFormFields) {
            proto.items = this._setFormFields.slice();
            this._setFormFields = null;
        }
        
        if ('fieldsPrototype' in options) {
            if (typeof options.fieldsPrototype === 'object' && options.fieldsPrototype) {
                Amm.override(proto, options.fieldsPrototype);
            }
            delete options.fieldsPrototype;
        }
        
        this.fields = new Amm.Collection(proto);
        
        Amm.Element.regInit(this, '99.Amm.Trait.Form', function() {        
            
            this._beginUpdateFields();
        
            if (this._elementsAreFields) this.setElementsAreFields(true, true);
        
            if (this._displayChildrenAreFields) this.setDisplayChildrenAreFields(true, true);
        
            this._endUpdateFields();
            
        });
        
    },
    
    _softRecalc: function() {
        this._recalcFields();
    },
    
    _fieldNeedValidate: function(needValidate) {
        this.setNeedValidate(true);
    },
    
    _recalcFields: function(force) {
        if (this._fieldsUpdateLevel && !force) {
            this._fieldsChanged = true;
            return true;
        }
        this._fieldsChanged = false;
        var newVal = {}, arr = [], idx = 0, setIdx = 0, hadNames = false, diff = !this._fieldValue, num = 0;
        this._fieldMap = {};
        this._setFieldMap = {};
        for (var i = 0, l = this.fields.length; i < l; i++) {
            var f = this.fields[i];
            var v = f.getFieldValue(), n = f.getFieldName();
            if (n === undefined || n === null) {
                this._setFieldMap[setIdx] = f;
                setIdx++;
                if (!f.getFieldApplied()) continue;
                num++;
                arr.push(v);
                newVal[idx] = v;
                this._fieldMap[idx] = f;
                if (!diff && this._fieldValue[idx] !== v) diff = true;
                idx++;
            } else {
                this._setFieldMap[n] = f;
                if (!f.getFieldApplied()) continue;
                num++;
                hadNames = true;
                newVal[n] = v;
                this._fieldMap[n] = f;
                if (!diff && this._fieldValue[n] !== newVal[n]) diff = true;
            }
        }
        if (!diff && num === this._lastNum) { // same
            return;
        }
        this._lastNum = num;
        var old = this._fieldValue;
        this._fieldValue = hadNames? newVal : arr;
        if (window.Object && window.Object.freeze) window.Object.freeze(this._fieldValue);
        this.outFieldValueChange(this._fieldValue, old);
        return true;
    },
    
    _addFields: function(fields) {
        var newFields = fields.slice();
        for (var i = newFields.length - 1; i >= 0; i--) {
            if (newFields[i]['Field'] !== '__INTERFACE__') newFields.splice(i, 1);
        }
        newFields = Amm.Array.diff(newFields, this.fields);
        if (newFields.length) {
            if (newFields.length > 1) this._beginUpdateFields();
            this.fields.acceptMany(newFields);
            if (newFields.length > 1) this._endUpdateFields();
        }
        return newFields;
    },
    
    _delFields: function(fields, xElements, xDisplayChildren) {
        
        var tmpFields = [];
        
        for (var i = 0, l = fields.length; i < l; i++) {
            if (fields[i]['Field'] === '__INTERFACE__') tmpFields.push(fields[i]);
        }        
        
        // exclude items that are in other to-be-included sets
        if (
            xElements 
            && tmpFields.length
            && this._elementsAreFields && this['Component'] 
            && this._elements.length
        ) {
            tmpFields = Amm.Array.diff(tmpFields, this._elements);
        }
        
        if (
            xDisplayChildren
            && tmpFields.length
            && this._displayChildrenAreFields && this['DisplayParent'] 
            && this.displayChildren.length
        ) {
            tmpFields = Amm.Array.diff(tmpFields, this.displayChildren);
        }
            
        if (!tmpFields.length) return;
            
        this._beginUpdateFields();
        var res = [];
        for (var i = 0, l = tmpFields.length; i < l; i++) {
            var idx = this.fields.indexOf(tmpFields[i]);
            if (idx >= 0) {
                this.fields.removeAtIndex(idx);
                res.push(tmpFields[i]);
            }
        }
        this._endUpdateFields();
        return res;
    },
    
    setElementsAreFields: function(elementsAreFields, force) {
        
        elementsAreFields = !!elementsAreFields;
        
        var oldElementsAreFields = this._elementsAreFields;
        if (oldElementsAreFields === elementsAreFields && !force) return;
        this._elementsAreFields = elementsAreFields;
        if (!this.fields || this['Component'] !== '__INTERFACE__') return true; // nothing to do

        var m = elementsAreFields? 'subscribe' : 'unsubscribe';
        this[m]('acceptedElements', this._handleFieldComponentAcceptedElements, this);
        this[m]('rejectedElements', this._handleFieldComponentRejectedElements, this);
        if (this._elements.length) {
            if (elementsAreFields) 
                this._addFields(this._elements);
            else 
                this._delFields(this._elements, false, true);
        }
        
        return true;
    },
    
    _handleFieldComponentAcceptedElements: function(fields) {
        this._addFields(fields);
    },
    
    _handleFieldComponentRejectedElements: function(fields) {
        if (fields.length && this._displayChildrenAreFields && this['DisplayParent']
            && this.displayChildren.length) {
            fields = Amm.Array.diff(fields, this.displayChildren);
        }
        if (fields.length) this._delFields(fields, false, true);
    },

    getElementsAreFields: function() { return this._elementsAreFields; },

    setDisplayChildrenAreFields: function(displayChildrenAreFields, force) {
        
        displayChildrenAreFields = !!displayChildrenAreFields;
        
        var oldDisplayChildrenAreFields = this._displayChildrenAreFields;
        if (oldDisplayChildrenAreFields === displayChildrenAreFields && !force) return;
        this._displayChildrenAreFields = displayChildrenAreFields;
        if (!this.fields || this['DisplayParent'] !== '__INTERFACE__') return true; // nothing to do

        var m = displayChildrenAreFields? 'subscribe' : 'unsubscribe';
        this.displayChildren[m]('spliceItems', this._handleFieldDisplayChildrenSpliceItems, this);
        if (this.displayChildren.length) {
            if (displayChildrenAreFields) 
                this._addFields(this.displayChildren);
            else 
                this._delFields(this.displayChildren, true, false);
        }
        
        return true;
    },
    
    _handleFieldDisplayChildrenSpliceItems: function(index, cut, insert) {
        var del = Amm.Array.symmetricDiff(cut, insert);
        var add = Amm.Array.symmetricDiff(insert, cut);
        if (del.length && add.length) this._beginUpdateFields();
        if (del.length) this._delFields(del, true, false);
        if (add.length) this._addFields(add);
        if (del.length && add.length) this._endUpdateFields();
   },

    getDisplayChildrenAreFields: function() { return this._displayChildrenAreFields; },

    _cleanup_Model: function() {    
        this.fields.cleanup();
    },
    
    _acquirePossibleFields: function(arr) {
        pp = [];
        for (var i = 0, l = arr.length; i < l; i++) {
            var item = arr[i];
            if (!(item && item['Field'] === '__INTERFACE__')) continue;
            if (!(item._parentModel || item === this)) continue;
            
            pp.push(item);
        }
        if (pp.length) this.fields.push.apply(this.fields, pp);
    },
    
    setFields: function(fields) {
        
        if (!this.fields) {
            if (!this._setFormFields) this._setFormFields = fields;
            else {
                if (!fields) this._setFormFields = null;
                else if (!(fields instanceof Array || fields['Amm.Array']))
                    throw Error("`fields` must be an Array or Amm.Array");
                this._setFormFields = fields;
            }
            return;
        }
        
        var toDel = Amm.Array.diff(this.fields, fields);
        var toAdd = Amm.Array.diff(fields, this.fields);
        if (!toDel.length && !toAdd.length) return;
        this._beginUpdateFields();
        if (toDel.length) this._delFields(toDel, true, true);
        if (fields.length) this.fields.acceptMany(fields);
        this._endUpdateFields();
        
    },
    
    getFields: function() {
        
        if (!this.fields) {
            if (!this._setFormFields) this._setFormFields = [];
            return this._setFormFields;
        }
        
        return this.fields;
        
    },
    
    /**
     * locates target field, first key and tail of the key
     * for methods like setFieldValue, getFieldValue
     * 
     * {allArgs} is Arguments of calling function; arg #0 is ignored
     * 
     * returns: [targetField, firstKey, remainingKey]
     */

    _parseKeyArgs: function(start, allArgs, toSet) {
        var key = allArgs[start];
        if (key !== undefined) {
            // we support both setFieldValue(value, ['key', 'subKey']) 
            // and setFieldValue(value, 'key', 'subkey')
            // and even mixed mode: setFieldValue(value, ['key', 'subkey'], 'sub-subkey')
            var fullKey = key, topKey;
            if (allArgs.length > start + 1) {
                if (!(fullKey instanceof Array)) fullKey = [fullKey];
                fullKey = fullKey.concat(Array.prototype.slice.call(allArgs, start + 1));
            }
            if (fullKey instanceof Array) {
                topKey = fullKey.shift();
                if (!fullKey.length) fullKey = undefined;
            } else {
                topKey = fullKey;
                fullKey = undefined;
            }            
            var targetField = toSet? this._setFieldMap[topKey] : this._fieldMap[topKey];
            return [targetField, topKey, fullKey];
        }
    },
    
    setFieldValue: function(value, key) {
        if (!this._fieldMap) this._recalcFields(true);
        // TODO: variable-length arrays aren't supported yet
        // TODO: what to do with extra or missing keys?
        if (key !== undefined) {
            var args = this._parseKeyArgs(1, arguments, true), targetField = args[0];         
            if (targetField)  return targetField.setFieldValue(value, args[2]);
            else return undefined;
        }
        this._beginUpdateFields();
        if (typeof value !== 'object' || !value) throw Error("`value` must be a hash or an Array; provided: " + Amm.describeType(value));
        for (var i in value) if (value.hasOwnProperty(i) && this._setFieldMap[i]) {
            this._setFieldMap[i].setFieldValue(value[i]);
        }
        this._endUpdateFields();
    },
    
    
    // if we will return cached _fieldValue, it will pass === checks
    getFieldValue: function(key) {
        if (this._fieldValue === undefined) {
            this._recalcFields(true);
        }
        if (key === undefined) return this._fieldValue;

        var 
            args = this._parseKeyArgs(0, arguments, false), 
            targetField = args[0], 
            topKey = args[1],
            fullKey = args[2];
    
        var res = this._fieldValue[topKey];
        if (fullKey) {
            do {
                var subKey = fullKey.shift();
                if ((typeof res === 'object') && (res instanceof Array || res) && subKey in res) {
                    res = res[subKey];
                } else {
                    res = undefined;
                }
            } while (fullKey.length);
            if (fullKey.length) res = undefined; // we didn't process whole length
        }
        return res;
    },
    
    _doValidate: function(errors, value, empty, label) {
        Amm.Trait.Field.prototype._doValidate.call(this, errors, value, empty, label);
        var fieldsHaveErrors = false;
        for (var i = 0, l = this.fields.length; i < l; i++) {
            if (!this.fields[i].validate()) fieldsHaveErrors = true;
        }
        if (fieldsHaveErrors) {
            errors.push(Amm.translate(this.invalidFieldsMessage, '%field', label || Amm.translate('lang.Amm.Trait.Form.form')));
        }
    }

};

Amm.extend(Amm.Trait.Form, Amm.Trait.Field);

Amm.defineLangStrings ({
    'lang.Amm.Trait.Form.invalidFieldsMsg': 'One or more fields of %field are filled with errors',
    'lang.Amm.Trait.Form.form': 'the form'
});
/* global Amm */
Amm.Trait.Instantiator = function() {
};

Amm.Trait.Instantiator.prototype = {

    Instantiator: '__INTERFACE__',
    
    InstantiatorOrRepeater: '__INTERFACE__',
    
    __augment: function(traitInstance, options) {
        
        Amm.Element.regInit(this, '99.Amm.Trait.Instantiator', function() {        
            if (this['DisplayParent'] !== '__INTERFACE__') throw Error("Instantiator must be also a DisplayParent");
        });
        if (options && options.initialInstantiatorOptions) {
            this._reportedInstantiatorOptions = options.initialInstantiatorOptions;
            delete options.initialInstantiatorOptions;
        }
        
    },
    
    _instantiator: null,

    _src: null,

    _dest: null,

    _instantiatorOptions: null,
    
    _reportedInstantiatorOptions: null,

    _construct: function() {
        if (!this._instantiator || !this._src) return;
        var dest = this._instantiator.construct(this._src);
        this.setDest(dest);
    },

    _destruct: function() {
        if (!this._dest) return;
        this._dest.setDisplayParent(null);
        if (this._instantiator) {
            this._instantiator.destruct(this._dest);
        }
        this._dest = null;
    },

    setInstantiator: function(instantiator) {
        if (!instantiator) instantiator = null;
        else instantiator = Amm.constructInstance(instantiator, 'Amm.Instantiator');
        var oldInstantiator = this._instantiator;
        if (oldInstantiator === instantiator) return;
        if (oldInstantiator && oldInstantiator['Amm.WithEvents'])
            oldInstantiator.unsubscribe('needRebuild', this._handleInstantiatorNeedRebuild, this);
        this._instantiator = instantiator;
        if (instantiator && instantiator['Amm.WithEvents'] && instantiator.hasEvent('needRebuild')) {
            instantiator.subscribe('needRebuild', this._handleInstantiatorNeedRebuild, this);
        }
        this._reportedInstantiatorOptions = null;
        this._destruct();
        this.outInstantiatorChange(instantiator, oldInstantiator);
        this._construct();
        return true;
    },

    getInstantiator: function() { return this._instantiator; },

    outInstantiatorChange: function(instantiator, oldInstantiator) {
        this._out('instantiatorChange', instantiator, oldInstantiator);
    },

    setSrc: function(src) {
        var oldSrc = this._src;
        if (oldSrc === src) return;
        this._src = src;
        this._construct();
        this.outSrcChange(src, oldSrc);
        return true;
    },

    getSrc: function() { return this._src; },

    outSrcChange: function(src, oldSrc) {
        this._out('srcChange', src, oldSrc);
    },

    setDest: function(dest) {
        var oldDest = this._dest;
        if (oldDest === dest) return;
        if (dest) Amm.is(dest, 'Visual', 'dest');
        this._destruct();
        this._dest = dest;
        if (this._dest) this._dest.setDisplayParent(this);
        this.outDestChange(dest, oldDest);
        return true;
    },

    getDest: function() { return this._dest; },

    outDestChange: function(dest, oldDest) {
        this._out('destChange', dest, oldDest);
    },
    
    _handleInstantiatorNeedRebuild: function(changedObjects, changedMatches, instantiator) {
        if (!this._src || instantiator !== this._instantiator) return;
        if (Amm.Array.indexOf(this._src, changedObjects) < 0) return;
        this._construct();
    },
    
    _cleanup_Instantiator: function() {
        this.setInstantiator(null);
        this.setSrc(null);
    },
    
    setInstantiatorOptions: function(instantiatorOptions) {
        if (!instantiatorOptions) instantiatorOptions = null;
        var oldInstantiatorOptions = this._instantiatorOptions;
        if (oldInstantiatorOptions === instantiatorOptions) return;
        this._instantiatorOptions = instantiatorOptions;
        if (this._reportedInstantiatorOptions) {
            this.reportInstantiatorOptions.apply(this, this._reportedInstantiatorOptions);
        }
        return true;
    },

    getInstantiatorOptions: function() { return this._instantiatorOptions; },

    reportInstantiatorOptions: function (defaultPrototype, conditions, prototypes) {
        
        this._reportedInstantiatorOptions = [defaultPrototype, conditions, prototypes];
        var instantiatorPrototype;
        
        if (conditions && conditions.length) {
            
            instantiatorPrototype = {
                'class': Amm.Instantiator.Variants,
                defaultPrototype: defaultPrototype,
                filter: {
                    conditions: conditions
                },
                prototypes: prototypes,
                allowNullInstance: true
            };
            
        } else {
            
            instantiatorPrototype = {
                'class': Amm.Instantiator.Proto,
                proto: defaultPrototype,
            };
            
        }
                
        if (this._instantiatorOptions) {
            instantiatorPrototype = Amm.overrideRecursive(instantiatorPrototype, this._instantiatorOptions);
        }
        this.setInstantiator(Amm.constructInstance(instantiatorPrototype, Amm.Instantiator.Abstract));
    }

};
/* global Amm */

Amm.Trait.Annotated = function() {
    // these elements will always be created by annotated element html views
    this._defaultAnnotations = ['label', 'description', 'required', 'error'];
};

Amm.Trait.Annotated.annotationElementDefaults = {
    
    BASE: { traits: ['Amm.Trait.Content', 'Amm.Trait.Visual'] },
    
    required: { contentTranslator: { class: 'Amm.Translator.RequiredMark' } },
    
    error: { contentTranslator: { class: 'Amm.Translator.Errors' } }
    
};

// used to merge defaults from Amm.Trait.Annotated.annotationElementDefaults and instance' annotationElementDefaults
Amm.Trait.Annotated.mergePrototypes = function (leftSrc, leftKey, rightSrc, rightKey) {
    var left, right;
    if (leftSrc && leftKey && leftKey in leftSrc) left = leftSrc[leftKey];
    if (leftKey) {
        if (leftSrc && leftKey in leftSrc) left = leftSrc[leftKey];
    } else {
        left = leftSrc;
    }
    if (rightKey) {
        if (rightSrc && rightKey in rightSrc) right  = rightSrc[rightKey];
    } else {
        right = rightSrc;
    }
    if (right === null) return null;
    if (!right) return left;
    if (!left) return right;
    if (typeof right !== 'object' || typeof left !== 'object') return right;
    return Amm.override({}, left, right);
};

Amm.Trait.Annotated.prototype = {

    'Annotated': '__INTERFACE__',
    
    _defaultAnnotations: null,
    
    _label: undefined,
    
    _description: undefined,
    
    _required: undefined,
    
    _error: undefined,
    
    annotationElementDefaults: null, // local overrides for Amm.Trait.Annotated.annotationElementDefaults

    // Element that contains Content elements showing annotations
    _annotationsContainer: undefined,
    
    getAnnotationsContainer: function() {
        if (this._annotationsContainer === undefined) {
            var cntId = 'annotations';
            cntId = 'annotations';
            this._annotationsContainer = new Amm.Trait.Annotated.Container({
                id: cntId,
                component: this.getClosestComponent(),
                element: this
            });
            this._assignDefaultAnnotations();
        }
        this.subscribe('closestComponentChange', this._annotated_onSelfClosestComponentChange, this);
        return this._annotationsContainer;
    },
    
    _annotated_onSelfClosestComponentChange: function(closestComponent) {
        if (this._annotationsContainer) this._annotationsContainer.setComponent(closestComponent);
    },
    
    getAnnotationElementPrototype: function(id) {
        
        var def = Amm.Trait.Annotated.annotationElementDefaults, own = this.annotationElementDefaults;
        
        var base = Amm.Trait.Annotated.mergePrototypes(def, 'BASE', own, 'BASE');

        var spec = Amm.Trait.Annotated.mergePrototypes(def, id, own, id);
        
        var res = Amm.Trait.Annotated.mergePrototypes(base, null, spec, null);
        
        return Amm.override({}, res);
        
    },
    
    _assignDefaultAnnotations: function() {
        if (this._defaultAnnotations instanceof Array) {
            for (var i = 0, l = this._defaultAnnotations.length; i < l; i++) {
                var id = this._defaultAnnotations[i];
                var p = Amm.getProperty(this, id, undefined);
                if (p !== undefined) {
                    this.getAnnotationsContainer().getAnnotationElement(id).setContent(p);
                } else {
                    var cnt = this.getAnnotationsContainer().getAnnotationElement(id).getContent();
                    if (cnt !== undefined) Amm.setProperty(this, id, cnt);
                }
            }
        }
    },

    setLabel: function(label) {
        var oldLabel = this._label;
        if (oldLabel === label) return;
        this._label = label;
 
        this.outLabelChange(label, oldLabel);
        return true;
    },

    getLabel: function() { return this._label; },

    outLabelChange: function(label, oldLabel) {
        this._out('labelChange', label, oldLabel);
    },

    setDescription: function(description) {
        var oldDescription = this._description;
        if (oldDescription === description) return;
        this._description = description;
 
        this.outDescriptionChange(description, oldDescription);
        return true;
    },

    getDescription: function() { return this._description; },

    outDescriptionChange: function(description, oldDescription) {
        this._out('descriptionChange', description, oldDescription);
    },

    setRequired: function(required) {
        var oldRequired = this._required;
        if (oldRequired === required) return;
        this._required = required;
 
        this.outRequiredChange(required, oldRequired);
        return true;
    },

    getRequired: function() { return this._required; },

    outRequiredChange: function(required, oldRequired) {
        this._out('requiredChange', required, oldRequired);
    },
    
    setError: function(error) {
        var oldError = this._error;
        if (oldError === error) return;
        this._error = error;
 
        this.outErrorChange(error, oldError);
        return true;
    },

    getError: function() { return this._error; },

    outErrorChange: function(error, oldError) {
        this._out('errorChange', error, oldError);
    },

    listAnnotations: function() {
        return Amm.keys(this.getAnnotationsContainer().getAllNamedElements());
    },
    
    hasAnnotation: function(id) {
        return !!this.getAnnotationsContainer().getAnnotationElement(id, true);
    },
    
    getAnnotationValue: function(id) {
        if (id) {
            var ane = this.getAnnotationsContainer().getAnnotationElement(id, true);
            if (ane) return ane.getContent();
            return undefined;
        }
        // case when id's not used - return hash with all annotations
        var ll = this.listAnnotations(), cnt = this.getAnnotationsContainer();
        var res = {};
        for (var i = 0, l = ll.length; i < l; i++) {
            var id = ll[i];
            var e = cnt.getAnnotationElement(id, true);
            if (e) res[id] = e.getContent();
        }
        return res;
    },
    
    setAnnotationValue: function(value, id) {
        return this.getAnnotationsContainer().getAnnotationElement(id).setContent(value);
    }

};/* global Amm */

// Not a trait (but used only by Amm.Trait.Annotated, therefore such name)
Amm.Trait.Annotated.Container = function(options) {
    this._requireInterfaces('Annotated'); // our element must support annotated interface
    Amm.ElementBound.call(this);
    Amm.Element.call(this, options);
};

Amm.Trait.Annotated.Container.prototype = {

    'Amm.Trait.Annotated.Container': '__CLASS__', 
    
    setElement: function(element) {
        if (this._element !== null && this._element !== element)
            Error("can setElement() only once in Amm.Trait.Annotated.Container");
        return Amm.ElementBound.prototype.setElement.call(this, element);
    },

    _passAnnotatedContentChange: function(value, oldValue) {
        if (this._element) Amm.setProperty(this._element, Amm.event.origin.getId(), value);
    },
    
    createAnnotationElement: function(id) {
        var proto = this._element.getAnnotationElementPrototype(id);
        proto.id = id;
        proto.component = this;
        var res = new Amm.Element(proto);
        var prop = {};
        if (Amm.detectProperty(this._element, id, prop)) {
            res.subscribe('contentChange', this._passAnnotatedContentChange, this);
            var p = this._element[prop.getterName](), v = res.getContent();
            if (p !== undefined) res.setContent(p);
            else if (p === undefined && v !== undefined) {
                this._element[prop.setterName](v);
            }
            this._element.subscribe(prop.eventName, res.setContent, res);
        }
        return res;
    },
    
    // lazily returns annotation element
    getAnnotationElement: function(id, onlyIfExists) {
        if (this._namedElements[id] || onlyIfExists) {
            return this.getNamedElement(id, 0, true);
        }
        return this.createAnnotationElement(id);
    },
    
    _getDefaultTraits: function() {
        return ['Amm.Trait.Component'];
    },
    
};

Amm.extend(Amm.Trait.Annotated.Container, Amm.Element);
Amm.extend(Amm.Trait.Annotated.Container, Amm.ElementBound);

/* global Amm */
Amm.Trait.Component = function() {
    this._namedElements = {};
    this._elements = [];
    this._components = [];
    this.e = {}; // shortcut for _namedElements
};

Amm.Trait.Component.changeComponent = function(items, component, oldComponent) {
    var setItems = [];
    if (oldComponent !== undefined) {
        for (var i = 0, l = items.length; i < l; i++) {
            if (items[i].getComponent() === oldComponent) {
                setItems.push(items[i]);
            }
        }
    } else {
        setItems = items;
    }
    if (component) {
        component.acceptElements(setItems);
    } else {
        for (var i = 0, l = setItems.length; i < l; i++) {
            setItems[i].setComponent(component);
        }
    }
};

Amm.Trait.Component.prototype = {

    Component: '__INTERFACE__',

    _internalId: 'component',

    _isComponent: true,
    
    _namedElements: null,
    
    _elements: null,
    
    e: null,
    
    _components: null,
    
    setInternalId: function(internalId) {
        var oldInternalId = this._internalId;
        if (oldInternalId === internalId) return;
        this._internalId = internalId;
 
        this.outInternalIdChange(internalId, oldInternalId);
        this.outRenamedElement(this, internalId, oldInternalId);
        this.outRenamedInScope(this, this, internalId, oldInternalId);
        return true;
    },

    getInternalId: function() { return this._internalId; },

    outInternalIdChange: function(internalId, oldInternalId) {
        this._out('internalIdChange', internalId, oldInternalId);
    },
    
    getClosestComponent: function() {
        return this._isComponent? this: this._component;
    },
    
    __augment: function() {
        Amm.Element.regInit(this, '95_Component_setClosestComponent', this._setClosestComponent);
    },
    
    setIsComponent: function(isComponent) {
        isComponent = !!isComponent;
        var oldIsComponent = this._isComponent;
        if (oldIsComponent === isComponent) return;
        this._isComponent = isComponent;
        this._setClosestComponent();
        this._callOwnMethods('_setIsComponent_');
        if (isComponent) {
            var children = this.findChildElements();
            if (children.length) this.acceptElements(children);
        } else {
            if (this._component) this._component.acceptElements(this.getElements());
            else this.rejectElements(this.getElements());
        }
        this.outIsComponentChange(isComponent, oldIsComponent);
        return true;
    },

    getIsComponent: function() { return this._isComponent; },

    outIsComponentChange: function(isComponent, oldIsComponent) {
        this._out('isComponentChange', isComponent, oldIsComponent);
    },
    
    _extractNameEventFromMethodName: function(methodName) {
        var px = 'handle__';
        if (methodName.indexOf(px) !== 0) return;
        var sfx = methodName.slice(px.length).split("__");
        var name, event;
        if (sfx.length === 1) { // handle__event
            name = '';
            event = sfx[0];
        } else { // handle__name__event
            name = sfx[0];
            event = sfx.slice(1).join('__');
        }
        return [name, event];
    },
    
    _listHandlersForElements: function() {
        var res = {};
        var ne;
        for (var i in this) if (typeof this[i] === 'function') {
            var ne = this._extractNameEventFromMethodName(i);
            if (!ne) continue;
            if (!res[ne[0]]) res[ne[0]] = [];
            res[ne[0]].push([ne[1], i]);
        }
        return res;
    },
    
    _subscribeElement: function(element, namedOnly, handlersList, checkAgain) {
        var name = element.getId();
        if ((!name || !name.length) && namedOnly) return; // nothing to do
        var handlersList = handlersList || this._listHandlersForElements();
        var kk = [];
        if (!namedOnly && handlersList['']) kk = handlersList[''];
        if (handlersList[name]) kk = kk.concat(handlersList[name]);
        for (var i = 0, l = kk.length; i < l; i++) {
            if (element.hasEvent(kk[i][0])) {
                if (checkAgain && element.getSubscribers(kk[i][0], kk[i][1], this).length) continue;
                // we subscribe using the form `methodName`, `object`
                element.subscribe(kk[i][0], kk[i][1], this);
            }
        }
    },

    _unsubscribeElement: function(element, namedOnly) {
        var hh = element.getSubscribers(undefined, undefined, this);
        for (var i = 0, l = hh.length; i < l; i++) {
            var hdl = hh[i], m;
            if (typeof hdl[0] !== 'string') continue;
            m = this._extractNameEventFromMethodName(hdl[0]);
            if (!m) continue;
            if (!namedOnly || m[0])
                element.unsubscribe(hdl[3], hdl[0], this);
        }
    },
    
    resubscribeAllElements: function() {
        var handlersList = this._listHandlersForElements();
        for (var i = 0, l = this._elements.length; i < l; i++) {
            this._subscribeElement(this._elements[i], false, handlersList, true);
        }
    },
    
    handle__componentChange: function(component, oldComponent) {
        var element = Amm.event.origin;
        if (component === this) this.acceptElements([element]);
        else if (oldComponent === this) this.rejectElements([element]);
    },
    
    handle__idChange: function(id, oldId) {
        var element = Amm.event.origin;
        if (oldId) {
            this._deleteNamedElementEntry(element, oldId);
            this._unsubscribeElement(element, true);
        }
        if (id) {
            if (!this._namedElements[id]) {
                this._namedElements[id] = [];
            }
            this._namedElements[id].push(element);
            if (this._namedElements[id].length === 1) {
                this.e[id] = element;
            } else {
                this.e[id] = this._namedElements[id];
            }
            this._subscribeElement(element, true, undefined);
        }
        this.outRenamedElement(element, id, oldId);
        this.outRenamedInScope(this, element, id, oldId);
    },
    
    handle__isComponentChange: function(isComponent, oldIsComponent) {
        var component = Amm.event.origin;
        if (isComponent) this._registerComponent(component);
            else this._unregisterComponent(component);
        this.outChildComponentStatusChange(component, isComponent);
        this.outChildComponentStatusChangeInScope(this, component, isComponent);
    },
    
    outRenamedElement: function(element, id, oldId) {
        this._out('renamedElement', element, id, oldId);
    },
    
    handle__cleanup: function() {
        var element = Amm.event.origin;
        this.rejectElements([element]);
    },
    
    g: function(name, index, bubble) {
        return this.getNamedElement(name, index, bubble);
    },
    
    getNamedElement: function(name, index, bubble) {
        if (!index || index < 0) index = 0;
        if (this._internalId && name === this._internalId && !index) return this; // always
        var res;
        if (this._namedElements[name]) {
            res = this._namedElements[name][index];
        }
        if (!res && bubble) {
            var nn = this.getAllNamedElements(name, bubble);
            if (nn && nn[index]) res = nn[index];
        }
        return res;
    },
    
    getAllNamedElements: function(name, bubble) {
        var res;
        // variant A - name specified - return Array
        if (name) {
            res = [];
            if (this._internalId && name === this._internalId) {
                res.push(this);
            }
            if (this._namedElements[name]) {
                res = res.concat(this._namedElements[name]); 
            }
            // AA - bubble - include parent component' elements with same name, but excluding this
            if (bubble && this._component) {
                var p = this._component.getAllNamedElements(name, bubble);
                if (this._internalId === name) {
                    for (var i = 0, l = p.length; i < l; i++) {
                        if (p[i] === this) {
                            p.splice(i, 1);
                            break;
                        }
                    }
                }
                res = res.concat(p);
            }
            return res;
        }
        // variant B - name not specified - return hash of Arrays
        res = {};
        if (this._internalId) res[this._internalId] = [this];
        for (var i in this._namedElements) {
            if (this._namedElements.hasOwnProperty(i)) {
                res[i] = (res[i] || []).concat(this._namedElements[i]);
            }
        }
        // BB - bubble - merge with parent components' elements, but excluding this
        if (bubble && this._component) {
            var p = this._component.getAllNamedElements(undefined, bubble);
            var id = this._id;
            if (id && p[id]) {
                for (var j = 0, l = p[id].length; j < l; j++) if (p[id][j] === this) {
                    p[i].splice(j, 1);
                    if (!p[i].length) delete p[i];
                    break;
                };
            }
            for (var i in p) if (p.hasOwnProperty(i)) {
                res[i] = (this._namedElements[i] || []).concat(p[i]);
            }
        }
        return res;
    },
    
    _includeAllChildren: function(elements) {
        var res = [].concat(elements);
        for (var i = 0, l = elements.length; i < l; i++) {
            if (!elements[i]['Component'] || !elements[i].getIsComponent()) {
                var sub = this._includeAllChildren(elements[i].findChildElements());
                res = res.concat(sub);
            }
        }
        return res;
    },
    
    /**
     * @param {Array} elements
     * @returns {Array} Elements that were actually accepted this time 
     *      (including children, excluding ones that were already associated)
     */
    acceptElements: function(elements) {
        // include all children... 
        var ee = this._includeAllChildren(elements), res = [];
        // exclude items already under our control
        ee = Amm.Array.diff(ee, this._elements);
        if (!ee.length) return;
        this._elements.push.apply(this._elements, ee);
        var hh = this._listHandlersForElements();
        for (var i = 0, l = ee.length; i < l; i++) {
            this._subscribeElement(ee[i], false, hh);
            var id = ee[i].getId();
            if (id) {
                if (!this._namedElements[id]) {
                    this._namedElements[id] = [];
                }
                this._namedElements[id].push(ee[i]);
                if (this._namedElements[id].length === 1) {
                    this.e[id] = this._namedElements[id][0];
                } else {
                    this.e[id] = this._namedElements[id];
                }
            }
            if (ee[i].Component === '__INTERFACE__' && ee[i].getIsComponent()) {
                this._registerComponent(ee[i]);
            }
            ee[i].setComponent(this);
            res.push(ee[i]);
        }
        if (res.length) {
            this.outAcceptedElements(res);
            this.outAcceptedInScope(this, res);
        }
        return res;
    },
    
    _registerComponent: function(component) {
        this._components.push(component);
    },
    
    outAcceptedElements: function(elements) {
        return this._out('acceptedElements', elements);
    },
    
    _deleteNamedElementEntry: function(element, id) {
        if (!id) id = element.getId();
        if (!id) id = element.getId();
        if (!this._namedElements[id]) return;
        var idx = Amm.Array.indexOf(element, this._namedElements[id]);
        if (idx >= 0) {
            this._namedElements[id].splice(idx, 1);
            if (this._namedElements[id].length === 1) {
                this.e[id] = this._namedElements[id][0];
            } else if (!this._namedElements[id].length) {
                delete this._namedElements[id];
                delete this.e[id];
            }
            return true;
        }
    },
    
    /**
     * @param {Array} elements
     * @returns {Array} Elements that were actually rejected (inc. children)
     */
    rejectElements: function(elements) {
        var res = [];
        // include all children...
        var ee = this._includeAllChildren(elements), el = this._elements.length;
        var dups = Amm.Array.findDuplicates(this._elements.concat(ee), false, null, el, true);
        for (var i = dups.length - 1; i >= 0; i--) {
            if (dups[i][0] >= el) continue;  // not likely though
            var element = this._elements[dups[i][0]], id = element.getId();
            if (id) this._deleteNamedElementEntry(element, id);
            this._elements.splice(dups[i][0], 1);
            this._unsubscribeElement(element);
            if (element.getComponent() === this) {
                // shouldn't normally trigger this.rejectElements again
                // because we've already unsubscribed
                element.setComponent(null);                
            }
            if (ee[i].Component === '__INTERFACE__' && ee[i].getIsComponent()) {
                this._unregisterComponent(ee[i]);
            }
            res.unshift(element); // don't push but unshift 'cause we reject them in reverse order!
        }
        if (res.length) {
            this.outRejectedElements(res);
            this.outRejectedInScope(this, res);
        }
        return res;
    },
    
    _unregisterComponent: function(component) {
        for (var j = 0, l = this._components.length; j < l; j++) {
            if (this._components[j] === component) {
                this._components.splice(j, 1);
                break;
            }
        }
    },
    
    outRejectedElements: function(elements) {
        return this._out('rejectedElements', elements);
    },
    
    getElements: function() {
        return [].concat(this._elements);
    },
    
    _listCall: function(list, methodName, args) {
        var res = [];
        for (var i = 0, l = list.length; i < l; i++) {
            var e = list[i];
            if (typeof methodName === 'function') res.push([e, methodName.apply(e, args)]);
            else if (typeof e[methodName] === 'function') res.push([e, e[methodName].apply(e, args)]);
        }
        return res;
    },
    
    callElements: function(methodName, _) {
        return this._listCall(this._elements, methodName, Array.prototype.slice.call(arguments, 1));
    },
    
    callComponents: function(methodName, _) {
        return this._listCall(this._components, methodName, Array.prototype.slice.call(arguments, 1));
    },
    
    _cleanup_Component: function() {
        this._namedElements = {};
        this.e = {};
        var ee = this._elements;
        this._elements = [];
        for (var i = 0, l = ee.length; i < l; i++) {
            this._unsubscribeElement(ee[i]);
            ee[i].setComponent(null);
            if (ee[i].getCleanupWithComponent()) {
                ee[i].cleanup();
            }
        }
    },
    
    outAcceptedInScope: function(component, elements) {
        var res = this._out('acceptedInScope', component, elements);
        this.callComponents('outAcceptedInScope', component, elements);
        return res;
    },
    
    outRejectedInScope: function(component, elements) {
        var res = this._out('rejectedInScope', component, elements);
        this.callComponents('outRejectedInScope', component, elements);
        return res;
    },
    
    outRenamedInScope: function(component, element, id, oldId) {
        var res = this._out('renamedInScope', component, element, id, oldId);
        this.callComponents('outRenamedInScope', component, element, id, oldId);
        return res;
    },
    
    outChildComponentStatusChange: function(component, status) {
        return this._out('childComponentStatusChange', component, status);
    },
    
    outChildComponentStatusChangeInScope: function(parentComponent, component, status) {
        var res = this._out('childComponentStatusChangeInScope', parentComponent, component, status);
        this.callComponents('outChildComponentStatusChangeInScope', parentComponent, component, status);
        return res;
    },
    
    _setComponent_Component: function(component) {
        this.outComponentStackChange();
    },
    
    outComponentStackChange: function() {
        this.callComponents('outComponentStackChange');
        this._out('componentStackChange');
    }
    
};
/* global Amm */

Amm.Trait.Visual = function() {
};
 
Amm.Trait.Visual.prototype = {

    'Visual': '__INTERFACE__',
    'ClassName': '__INTERFACE__',
    'DisplayChild': '__INTERFACE__',

    _visible: undefined,

    _displayParent: undefined,

    _displayOrder: undefined,

    _className: undefined,

    setVisible: function(visible) {
        var oldVisible = this._visible;
        if (oldVisible === visible) return;
        this._visible = visible;
 
        this.outVisibleChange(visible, oldVisible);
        return true;
    },

    getVisible: function() { return this._visible; },

    outVisibleChange: function(visible, oldVisible) {
        this._out('visibleChange', visible, oldVisible);
    },

    setDisplayParent: function(displayParent) {
        if (displayParent) Amm.is(displayParent, 'DisplayParent', 'displayParent');
        else displayParent = null;
        var oldDisplayParent = this._displayParent;
        if (oldDisplayParent === displayParent) return;
        this._displayParent = displayParent;
        if (oldDisplayParent) {
            var idx = oldDisplayParent.displayChildren.strictIndexOf(this);
            if (idx >= 0) oldDisplayParent.displayChildren.removeAtIndex(idx);
        }
        if (displayParent) {
            var idxNew = displayParent.displayChildren.strictIndexOf(this);
            if (idxNew < 0) displayParent.displayChildren.accept(this);
        }
        this.outDisplayParentChange(displayParent, oldDisplayParent);
        return true;
    },

    getDisplayParent: function() { return this._displayParent; },
 
    outDisplayParentChange: function(displayParent, oldDisplayParent) {
        this._out('displayParentChange', displayParent, oldDisplayParent);
    },

    setDisplayOrder: function(displayOrder) {
        if (typeof displayOrder !== 'number') {
            displayOrder = parseInt(displayOrder);
            if (isNaN(displayOrder)) throw Error("`displayOrder` must be a number");
        }
        var oldDisplayOrder = this._displayOrder;
        if (oldDisplayOrder === displayOrder) return;
        if (this._displayParent && displayOrder >= this._displayParent.displayChildren.length) {
            displayOrder = this._displayParent.displayChildren.length - 1;
        }
        if (displayOrder < 0) displayOrder = 0;
        this._displayOrder = displayOrder;
        this.outDisplayOrderChange(displayOrder, oldDisplayOrder);
        return true;
    },

    getDisplayOrder: function() { return this._displayOrder; },
 
    outDisplayOrderChange: function(displayOrder, oldDisplayOrder) {
        this._out('displayOrderChange', displayOrder, oldDisplayOrder);
    },

    /**
     * A: setClassName('foo bar')
     * B: setClassName(true, 'foo') - will add 'foo' to class name
     * C: setClassName(false, 'foo') - will remove 'foo' from class name
     */
    setClassName: function(classNameOrToggle, part) {
        var oldClassName = this._className;
        var className;
        if (part) {
            var rx = new RegExp('\\s*\\b' + Amm.Util.regexEscape(part) + '\\b\\s*', 'g');
            if (this._className === undefined) this._className = '';
            if (!classNameOrToggle) {
                if (this._className === undefined) this._className = '';
                className = this._className.replace(rx, ' ').replace(/ {2,}/g, ' ');
                if (className[0] === ' ') className = className.slice(1);
                if (className[className.length - 1] === ' ') className = className.slice(0, -1);
            } else {
                if (!rx.exec(this._className)) 
                    className = this._className + ' ' + part;
                else className = this._className;
            }
        } else {
            className = classNameOrToggle;
        }
        if (className === oldClassName) return;
        this._className = className;
        this.outClassNameChange(className, oldClassName);
        return true;
    },

    getClassName: function(part) { 
        if (!part) 
            return this._className; 
        return (' ' + this._className + ' ').indexOf(' ' + part + ' ') >= 0;
    },
 
    outClassNameChange: function(className, oldClassName) {
        this._out('classNameChange', className, oldClassName);
    },
    
};/* global Amm */

 Amm.Trait.Input = function() {
 };

Amm.Trait.Input.prototype = {

    'Focusable': '__INTERFACE__',
    'Editor': '__INTERFACE__',
    'Lockable': '__INTERFACE__',

    _readOnly: undefined,

    _focused: undefined,

    _enabled: true,

    _value: undefined,
    
    _locked: false,
    
    _focusedView: null,

    setValue: function(value) {
        var oldValue = this._value;
        if (oldValue === value) return;
        this._value = value;
 
        this.outValueChange(value, oldValue);
        return true;
    },

    getValue: function() { return this._value; },
 
    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    },

    setReadOnly: function(readOnly) {
        var old = this._readOnly;
        if (old === readOnly) return;
        this._readOnly = readOnly;
 
        this.outReadOnlyChange(readOnly, old);
        return true;
    },

    getReadOnly: function() { return this._readOnly; },
 
    outReadOnlyChange: function(readOnly, oldReadOnly) {
        this._out('readOnlyChange', readOnly, oldReadOnly);
    },
    
    setFocused: function(focused) {
        focused = !!focused;
        var old = this._focused;
        if (old === focused) return;
        this._focused = focused;
        this.outFocusedChange(focused, old);
        return true;
    },

    getFocused: function() { return this._focused; },
    
    outFocusedChange: function(focused, oldFocused) {
        this._out('focusedChange', focused, oldFocused);
    },

    setFocusedView: function(focusedView) {
        if (!focusedView) focusedView = null;
        var oldFocusedView = this._focusedView;
        if (oldFocusedView === focusedView) return;
        this._focusedView = focusedView;        
        if (focusedView === null) this.setFocused(false); 
            else if (!this._focused) this.setFocused(true);
        this.outFocusedViewChange(focusedView, oldFocusedView);
        return true;
    },

    getFocusedView: function() { return this._focusedView; },

    outFocusedViewChange: function(focusedView, oldFocusedView) {
        this._out('focusedViewChange', focusedView, oldFocusedView);
    },

    setEnabled: function(enabled) {
        var old = this._enabled;
        if (old === enabled) return;
        this._enabled = enabled;
 
        this.outEnabledChange(enabled, old);
        return true;
    },

    getEnabled: function() { return this._enabled; },
 
    outEnabledChange: function(enabled, oldEnabled) {
        this._out('enabledChange', enabled, oldEnabled);
    },
    
    setLocked: function(locked) {
        var oldLocked = this._locked;
        if (oldLocked === locked) return;
        this._locked = locked;
 
        this.outLockedChange(locked, oldLocked);
        return true;
    },

    getLocked: function() { return this._locked; },
 
    outLockedChange: function(locked, oldLocked) {
        this._out('lockedChange', locked, oldLocked);
    }

};


 /* global Amm */

 Amm.Trait.Toggle = function() {
 };

 Amm.Trait.Toggle.prototype = {

    'Toggle': '__INTERFACE__',

    _isRadio: undefined,

    _groupName: undefined,

    _groupParent: undefined,

    _checked: undefined,

    _checkedValue: undefined,

    _uncheckedValue: undefined,

    _valueIsStandalone: false,
    
    _lockGroup: 0,
    
    _lockGroupSearch: 0,
    
    _value: undefined,
    
    __augment: function(traitInstance) {
        Amm.Element.regInit(this, '99.Amm.Trait.Toggle', this._subscribeToggleToRoot);
    },
    
    setIsRadio: function(isRadio) {
        if (isRadio !== undefined) isRadio = !!isRadio;
        var oldIsRadio = this._isRadio;
        if (oldIsRadio === isRadio) return;
        var significant = this._getOwnValue() !== undefined;
        this._isRadio = isRadio;
        significant = significant || this._getOwnValue() !== undefined;
        this.outIsRadioChange(isRadio, oldIsRadio);
        if (this._uncheckOtherRadios() || significant) this._notifyGroup();
        return true;
    },

    getIsRadio: function() { return this._isRadio; },

    outIsRadioChange: function(isRadio, oldIsRadio) {
        this._out('isRadioChange', isRadio, oldIsRadio);
    },

    setGroupName: function(groupName) {
        if (!groupName) groupName = undefined;
        var oldGroupName = this._groupName;
        if (oldGroupName === groupName) return;
        var oldGroup = this.findGroupItems(false, true);
        this._groupName = groupName;
        if (oldGroup.length) this._notifyGroup(oldGroup);
        this.outGroupNameChange(groupName, oldGroupName);
        this._notifyGroup();
        return true;
    },

    getGroupName: function() { return this._groupName; },

    outGroupNameChange: function(groupName, oldGroupName) {
        this._out('groupNameChange', groupName, oldGroupName);
    },

    setGroupParent: function(groupParent) {
        if (!groupParent) groupParent = undefined;
        var oldGroupParent = this._groupParent;
        if (oldGroupParent === groupParent) return;
        var oldGroup = this.findGroupItems(false, true);        
        this._groupParent = groupParent;
        if (oldGroup.length) this._notifyGroup(oldGroup);
        this.outGroupParentChange(groupParent, oldGroupParent);
        this._notifyGroup();
        return true;
    },

    getGroupParent: function() { return this._groupParent; },

    outGroupParentChange: function(groupParent, oldGroupParent) {
        this._out('groupParentChange', groupParent, oldGroupParent);
    },

    _uncheckOtherRadios: function() {
        if (!this._checked || !this._isRadio) return;
        var g = this.findGroupItems(true), changed = false;
        if (g.length <= 1) return;
        for (var i = 0, l = g.length; i < l; i++) {
            if (g[i] !== this && g[i].getChecked()) {
                g[i]._uncheckByGroup();
                changed = true;
            }
        }
        return changed;
    },
    
    _uncheckByGroup: function() {
        this._lockGroup++;
        this.setChecked(false);
        this._lockGroup--;
    },
    
    setEnabled: function(enabled) {
        var significant = this._getOwnValue() !== undefined;
        var res = Amm.Trait.Input.prototype.setEnabled.call(this, enabled);
        if (res && (significant || this._getOwnValue() !== undefined)) this._reportChange();
        return res;
    },
    
    setChecked: function(checked) {
        if (checked !== undefined) checked = !!checked;
        var oldChecked = this._checked;
        if (oldChecked === checked) return;
        this._checked = checked;
        this._uncheckOtherRadios();
        this._reportChange();
        this.outCheckedChange(checked, oldChecked);
        return true;
    },

    getChecked: function() { return this._checked; },

    outCheckedChange: function(checked, oldChecked) {
        this._out('checkedChange', checked, oldChecked);
    },

    setCheckedValue: function(checkedValue) {
        var oldCheckedValue = this._checkedValue;
        if (oldCheckedValue === checkedValue) return;
        this._checkedValue = checkedValue;
        this.outCheckedValueChange(checkedValue, oldCheckedValue);
        if (this._checked) this._reportChange();
        return true;
    },

    getCheckedValue: function() { return this._checkedValue; },

    outCheckedValueChange: function(checkedValue, oldCheckedValue) {
        this._out('checkedValueChange', checkedValue, oldCheckedValue);
    },

    // if the control is member of the group, the property will be set for 
    // the whole group - this is the value of the group when there is 
    // no checked members, either radios or toggles
    setUncheckedValue: function(uncheckedValue) {
        var oldUncheckedValue = this._uncheckedValue;
        if (oldUncheckedValue === uncheckedValue) return;
        this._uncheckedValue = uncheckedValue;
        this.outUncheckedValueChange(uncheckedValue, oldUncheckedValue);
        if (!this._checked) this._reportChange();
        return true;
    },

    getUncheckedValue: function() { return this._uncheckedValue; },

    outUncheckedValueChange: function(uncheckedValue, oldUncheckedValue) {
        this._out('uncheckedValueChange', uncheckedValue, oldUncheckedValue);
    },

    setValueIsStandalone: function(valueIsStandalone) {
        valueIsStandalone = !!valueIsStandalone;
        var oldValueIsStandalone = this._valueIsStandalone;
        if (oldValueIsStandalone === valueIsStandalone) return;
        this._valueIsStandalone = valueIsStandalone;
        var old = this._value;
        this.outValueIsStandaloneChange(valueIsStandalone, oldValueIsStandalone);
        this._value = valueIsStandalone? this._getOwnValue() : this._getGroupValue();
        if (!Amm.Trait.Select.valuesAreSame(old, this._value))
            this.outValueChange(this._value, old);
        return true;
    },

    getValueIsStandalone: function() { return this._valueIsStandalone; },

    outValueIsStandaloneChange: function(valueIsStandalone, oldValueIsStandalone) {
        this._out('valueIsStandaloneChange', valueIsStandalone, oldValueIsStandalone);
    },
    
    // notifies self too
    _notifyGroup: function(group, groupValue) {
        if (!group) group = this.findGroupItems();
        if (arguments.length < 2) groupValue = this._getGroupValue(group);
        for (var i = 0, l = group.length; i < l; i++) {
            group[i]._receiveGroupNotification(groupValue, this);
        }
    },

    // is called when the value should change. If behaviour is group-oriented 
    // (valueIsStandalone === false), will notify group and wait to _receiveGroupNotification.
    // Otherwise will report value
    _reportChange: function() {
        if (this._valueIsStandalone) {
            var curr = this._getOwnValue();
            if (curr !== this._value) {
                var old = this._value;
                this._value = curr;
                this.outValueChange(this._value, old);
            }
        }
        var groupValue = this._getGroupValue();
        var group = this.findGroupItems();
        for (var i = 0, l = group.length; i < l; i++) {
            group[i]._receiveGroupNotification(groupValue, this);
        }
    },
    
    setValue: function(value) {
        var old = this._value;
        if (this._valueIsStandalone) {
            this._setOwnValue(value);
        } else {
            this._setGroupValue(value);
        }
        if (!Amm.Trait.Select.valuesAreSame(this._value, old)) return true;
    },
    
    _receiveGroupNotification: function(groupValue, origin) {
        if (this._valueIsStandalone) return;
        if (!Amm.Trait.Select.valuesAreSame(groupValue, this._value)) {
            var oldValue = this._value;
            this._value = groupValue;
            this.outValueChange(groupValue, oldValue);
        }
    },
    
    _setGroupValue: function(value) {
        var v;
        if (value instanceof Array) v = value;
        else {
            if (value === null || value === undefined) v = [];
            else v = [value];
        }
        var items = this.findGroupItems();
        var radioSet = false;
        var changed = false;
        var i, l;
        for (i = 0, l = items.length; i < l; i++) {
            items[i]._lockGroup++;
        }
        for (i = 0, l = items.length; i < l; i++) {
            var item = items[i];
            if (item['Toggle'] !== '__INTERFACE__') return;
            var isRadio = item.getIsRadio(), found = Amm.Array.nonStrictIndexOf(item.getCheckedValue(), v) >= 0,
                checked = item.getChecked();
            // radioSet: we set radio box to 'checked' only once
            radioSet = radioSet || found && checked && isRadio;
            if (!(isRadio && radioSet) && (found && !checked || !found && checked)) {
                if (isRadio && found) radioSet = true;
                changed = true;
                item.setChecked(!!found);
            }
        }
        for (i = 0, l = items.length; i < l; i++) {
            items[i]._lockGroup--;
        }
        if (changed) this._reportChange();
        return changed;
    },
    
    _getGroupValue: function(group) {
        if (!group) group = this.findGroupItems();
        var res = [], numChecks = 0, numRadios = 0;
        for (var i = 0, l = group.length; i < l; i++) {
            var item = group[i], value = item._getOwnValue();
            if (item['Toggle'] !== '__INTERFACE__') continue;
            if (item.getIsRadio()) {
                numRadios++;
            }
            else {
                numChecks++;
            }
            if (value !== undefined) {
                res.push(value);
            }
        }
        var scalar = (numRadios === 0 && numChecks === 1) || (numRadios && !numChecks);
        var res;
        if (scalar) res = res[0];
        return res;
    },
    
    _setOwnValue: function(value) {
        if (value == this._checkedValue) {
            this.setChecked(true);
        } else {
            this.setChecked(false);
        }
    },
    
    _getOwnValue: function() {
        if (!this._enabled) return;
        if (this._checked) return this._checkedValue;
        if (!this._isRadio) return this._uncheckedValue;
    },
    
    findGroupItems: function(radiosOnly, excludeThis) {
        var res = [];
        if (excludeThis) this._lockGroupSearch++;
        Amm.getRoot().raiseEvent('findToggleGroupItems', this._groupParent, this._groupName, radiosOnly, res);
        if (excludeThis) this._lockGroupSearch--;
        return res;
    },
    
    _handleFindToggleGroupItems: function(groupParent, groupName, radiosOnly, res) {
        if (this._lockGroupSearch) return;
        if (groupParent === this._groupParent && groupName === this._groupName) {
            if (!radiosOnly || this._isRadio) {
                res.push(this);
            }
        }
    },
    
    _subscribeToggleToRoot: function() {
        Amm.getRoot().subscribe('findToggleGroupItems', this._handleFindToggleGroupItems, this);
    },
    
    _setComponent_Toggle: function(component, oldComponent) {
        if (this._groupParent === oldComponent  // was set to old component
            || !this._groupParent // was not set
            || this._groupParent.tagName) // was set to HTML element
        {
            this.setGroupParent(component); // component becomes group parent
        }
    },
    
    _cleanup_Toggle: function() {
        Amm.getRoot().unsubscribe('findToggleGroupItems', this._handleFindToggleGroupItems, this);
    }
     
 };

Amm.extend(Amm.Trait.Toggle, Amm.Trait.Input);
/* global Amm */

Amm.Trait.Content = function() {
};

Amm.Trait.Content.prototype = {

    'Content': '__INTERFACE__', 
    
    _content: undefined,

    /**
     *  Note: content translator is used only by views (and may be overriden by them!)
     *  
     * @type Amm.Translator
     */
    _contentTranslator: null,

    setContent: function(content) {
        var oldContent = this._content;
        if (oldContent === content) return;
        this._content = content;
 
        this.outContentChange(content, oldContent);
        return true;
    },

    getContent: function() { return this._content; },

    outContentChange: function(content, oldContent) {
        this._out('contentChange', content, oldContent);
    },

    setContentTranslator: function(contentTranslator) {
        if (contentTranslator)
            contentTranslator = Amm.constructInstance(contentTranslator, 'Amm.Translator');
        else contentTranslator = null;
        var oldContentTranslator = this._contentTranslator;
        if (oldContentTranslator === contentTranslator) return;
        this._contentTranslator = contentTranslator;
        this.outContentTranslatorChange(contentTranslator, oldContentTranslator);
        return true;
    },

    getContentTranslator: function() { return this._contentTranslator; },

    outContentTranslatorChange: function(contentTranslator, oldContentTranslator) {
        this._out('contentTranslatorChange', contentTranslator, oldContentTranslator);
    }

};


/* global Amm */

Amm.Trait.Select = function() {
};

// compares two values. Order doesn't matter. Multiple occurances of same value are same as one.
// comparison is non-strict
Amm.Trait.Select.valuesAreSame = function(a, b) {
    if (a === undefined && b !== undefined) return false;
    if (b === undefined && a !== undefined) return false;
    if (a === b) return true;
    if (a && a['Amm.Array']) a = a.getItems();
    if (b && b['Amm.Array']) b = b.getItems();
    var cmp = function(a, b) { return a == b? 0 : 1; };
    if (a instanceof Array) {
         if (!(b instanceof Array)) return false;         
         if (!(Amm.Array.diff(a, b, cmp).length) && !(Amm.Array.diff(b, a, cmp).length)) {
             return true;
         }
         return false;
    } else {
        if (b instanceof Array) return false;
    }
    return !cmp(a, b);
};

Amm.Trait.Select.prototype = {

    'Select': '__INTERFACE__',
    
    options: null,

    /**
     * @type Amm.ArrayMapper
     */
    _objectsMapper: null,
    
    _selectionCollection: null,
    
    _multiple: undefined,

    _selectSize: undefined,
    
    _numChanges: 0,
    
    _labelProperty: null,

    _valueProperty: null,
    
    _disabledProperty: null,
    
    // If non-null and `multiple` is FALSE, extra first item is added with caption 
    // `dummyLabel`, with value `dummyValue` (to substitute "nothing is selected")
    _dummyLabel: null,
    
    _dummyValue: null,
    
    // Amm.Trait.Select.Option with `dummyLabel`/`dummyValue`; 
    // get/setOptions() doesn't interfere with the instance.
    _dummyOption: null,
    
    _optionPrototype: null,
    
    _sorter: null,
    
    /**
     * @param {Array|Object} options
     * a - Amm.Trait.Select.Option instances
     * b - Amm.Trait.Select.Option prototypes
     * c - hash {value: label, value2: label2...} 
    */
    setOptions: function(options) {
        /* @TODO: setOptions() should always be processed AFTER setOptionPrototype */
        if (!options) options = [];
        var items = [];
        if (options instanceof Array || options['Amm.Array']) {
            items = options;
        } else if (typeof options === 'object') {
            for (var i in options) if (options.hasOwnProperty(i)) {
                items.push({label: options[i], value: i});
            }
        }
        var instances = [];
        for (var i = 0; i < items.length; i++) {
            var item;
            var proto = this._optionPrototype? Amm.overrideRecursive({}, this._optionPrototype) : {};
            if (typeof items[i] !== 'object') {
                proto.label = items[i];
                proto.value = items[i];
            } else {
                var c = Amm.getClass(items[i]);
                if (!c) proto = Amm.overrideRecursive(proto, items[i]);
                else item = items[i];
            }
            proto.component = this.getClosestComponent();
            instances.push(Amm.constructInstance(proto, Amm.Trait.Select.Option));
        }
        if (this._dummyOption) instances.unshift(this._dummyOption);
        var sel = this.getSelectionCollection(), oldValue = this.getValue();
        if (oldValue instanceof Array) oldValue = [].concat(oldValue);
        sel.beginUpdate();
        this.getOptionsCollection().setItems(instances);
        if (oldValue !== undefined) sel.setValue(oldValue);
        //this.getSelectionCollection().setValue(oldValue);
        sel.endUpdate();
        if (!this._multiple && (this._value === null || this._value === undefined) && this._selectSize === 1) {
            if (this._correctValueForSingleSelect()) return;
        }
    },
    
    _updateDummyOption: function(objectsMapper) {
        var newOption = null;
        objectsMapper = objectsMapper || this._objectsMapper;
        if (!this._multiple 
            && this._dummyLabel !== null 
            && this._dummyLabel !== undefined
        ) {
            if (this._dummyOption) newOption = this._dummyOption;
            else newOption = new Amm.Trait.Select.Option;
            newOption.setLabel(this._dummyLabel);
            newOption.setValue(this._dummyValue);
        }
        if (objectsMapper) {
            objectsMapper.setDestExtra(newOption? [newOption] : null);
            return;
        }
        if (!this.options) return; // nothing to do
        
        if (newOption && !this._dummyOption) {
            this.options.splice(0, 0, newOption);
        }
        else if (!newOption && this._dummyOption) {
            this.options.reject(this._dummyOption);
        }
        this._dummyOption = newOption;
    },
    
    getOptions: function() {
        if (!this.options) return undefined;
        var res = this.getOptionsCollection().getItems();
        if (this._dummyOption) return res.slice(1);
        return res;
    },
    
    getOptionsCollection: function() {
        if (this.options) return this.options;
        var proto = {
            changeEvents: ['labelChange', 'valueChange', 'disabledChange', 'visibleChange', 'selectedChange'],
            requirements: ['Amm.Trait.Select.Option'],
            indexProperty: 'index',
            observeIndexProperty: true,
            cleanupOnDissociate: true,
            sorter: this._sorter
        };
        this.options = new Amm.Collection(proto);
        if (this._cleanupList) this._cleanupList.push(this.options);
        this.getSelectionCollection();
        this.options.subscribe('itemsChange', this._handleOptionsChange, this);
        return this.options;
    },
    
    // stub; in practice this event never happens
    outOptionsCollectionChange: function() {
    },
    
    getSelectionCollection: function() {
        if (this._selectionCollection) return this._selectionCollection;
        var proto = {
            multiple: this._multiple,
            valueProperty: 'value',
            selectedProperty: 'selected',
            //ignoreExactMatches: true
        };
        this._selectionCollection = new Amm.Selection(proto);
        this._selectionCollection.setCollection(this.getOptionsCollection());
        this._selectionCollection.subscribe('valueChange', this._handleSelfSelectionValueChange, this);
        this._selectionCollection.setValue(this._value);
        if (this._cleanupList) this._cleanupList.push(this._selectionCollection);
        return this._selectionCollection;
    },

    setSelectSize: function(selectSize) {
        if (selectSize !== undefined) {
            selectSize = parseInt(selectSize) || 1;
            if (selectSize < 0) selectSize = 1;
        }
        var oldSelectSize = this._selectSize;
        if (oldSelectSize === selectSize) return;
        this._selectSize = selectSize;
        if (selectSize === 1 && !this._multiple && (this._value === null || this._value === undefined)) {
            if (this.options && this.options.length) {
                this._correctValueForSingleSelect();
            }
        }
 
        this.outSelectSizeChange(selectSize, oldSelectSize);
        return true;
    },

    getSelectSize: function() { return this._selectSize; },

    outSelectSizeChange: function(selectSize, oldSelectSize) {
        this._out('selectSizeChange', selectSize, oldSelectSize);
    },
    
    _handleSelfSelectionValueChange: function(value, oldValue) {
        if (value === undefined) value = null;
        if (!Amm.Trait.Select.valuesAreSame(value, this._value)) {
            var old = this._value;
            this._value = value;
            if (!this._multiple && this._value === null && this._selectSize === 1) {
                if (this._correctValueForSingleSelect()) return;
            }
            this._numChanges++;
            this.outValueChange(value, old);
        }
    },
    
    _handleOptionsChange: function(items, oldItems) {
        // set first item as selected? but when?
        if (!oldItems.length && items.length && this._selectSize === 1 && this._value === undefined) {
            this._correctValueForSingleSelect();
        }
    },
    
    _correctValueForSingleSelect: function() {
        if (this._selectionCollection && this._selectionCollection.getUpdateLevel()) {
            return;
        }
        var options = this.getOptionsCollection();
        for (var i = 0, l = options.length; i < l; i++) {
            var op = options[i];
            if (!op.getDisabled() && op.getVisible()) {
                this.setValue(op.getValue());
                return true;
            }
        }
    },
    
    setMultiple: function(multiple) {
        multiple = !!multiple;
        var oldMultiple = this._multiple;
        if (oldMultiple === multiple) return;
        this._multiple = multiple;
        this._updateDummyOption();
        if (this._selectionCollection)
            this._selectionCollection.setMultiple(multiple);
        this.outMultipleChange(multiple, oldMultiple);
        return true;
    },

    getMultiple: function() { return this._multiple; },

    outMultipleChange: function(multiple, oldMultiple) {
        this._out('multipleChange', multiple, oldMultiple);
    },
    
    setObjects: function(objects) {
        if (!objects) {
            this._detachObjects();
            return;
        }
        if (!(objects instanceof Array || Amm.is(objects, 'Amm.Array')))
            throw new Error("objects must be FALSEable, Array or Amm.Array; provided: " + Amm.describeType(objects));
        if (!this._objectsMapper) {
            this._objectsMapper = this._createObjectsMapper(objects);
        }
    },
    
    getObjects: function() {
        if (!this._objectsMapper) return null;
        return this._objectsMapper.getSrc();
    },
    
    getObjectsItems: function() {
         if (!this._objectsMapper) return [];
         return this._objectsMapper.getSrc().getItems();
    },
    
    _detachObjects: function(objects) {
        if (!this._objectsMapper) return;
        this._objectsMapper.setSrc([]);
        this._objectsMapper.cleanup();
        for (var i = 0, l = this._cleanupList.length; i < l; i++) {
            if (this._cleanupList[i] === this._objectsMapper) {
                this._cleanupList[i].splice(i, 1);
                break;
            }
        }
        this._objectsMapper = null;
    },
    
    outObjectsChange: function(objects, oldObjects) {
        // TODO
    },
    
    setValue: function(value) {
        var o = this._numChanges;
        this.getSelectionCollection().setValue(value);
        if (this._numChanges !== o) return true; // compat. with 'set' behaviour
    },

    setLabelProperty: function(labelProperty) {
        var oldLabelProperty = this._labelProperty;
        if (oldLabelProperty === labelProperty) return;
        this._labelProperty = labelProperty;
        this.outLabelPropertyChange(labelProperty, oldLabelProperty);
        this._updateInstantiator();
        return true;
    },

    getLabelProperty: function() { return this._labelProperty; },

    outLabelPropertyChange: function(labelProperty, oldLabelProperty) {
        this._out('labelPropertyChange', labelProperty, oldLabelProperty);
    },

    setValueProperty: function(valueProperty) {
        var oldValueProperty = this._valueProperty;
        if (oldValueProperty === valueProperty) return;
        this._valueProperty = valueProperty;
        this.outValuePropertyChange(valueProperty, oldValueProperty);
        this._updateInstantiator();
        return true;
    },

    getValueProperty: function() { return this._valueProperty; },
    
    setDisabledProperty: function(disabledProperty) {
        var oldDisabledProperty = this._disabledProperty;
        if (oldDisabledProperty === disabledProperty) return;
        this._disabledProperty = disabledProperty;
        this.outDisabledPropertyChange(disabledProperty, oldDisabledProperty);
        this._updateInstantiator();
        return true;
    },

    getDisabledProperty: function() { return this._disabledProperty; },

    outDisabledPropertyChange: function(disabledProperty, oldDisabledProperty) {
        this._out('disabledPropertyChange', disabledProperty, oldDisabledProperty);
    },

    /** 
     * For given labelProperty or valueProperty, returns proper in__ expression
     * for option instance's label or value
     */
    _objectPropToExp: function(propOrExp) {
        if (propOrExp.match(/^\w+$/)) return 'this.origin.' + propOrExp;
        return propOrExp;
    },
    
    _updateInstantiator: function() {
        if (!this._objectsMapper) return;
        // TODO: save selected objects and select them back
        var oldSel = Amm.getProperty(this._selectionCollection.getItems(), 'origin');
        this._selectionCollection.beginUpdate();
        this._objectsMapper.setInstantiator(this._createInstantiator());
        if (oldSel.length) {
            var newSel = [];
            for (var i = 0, l = this.options.length; i < l; i++) {
                if (Amm.Array.indexOf(this.options[i].getOrigin(), oldSel) < 0) continue;
                newSel.push(this.options[i]);
            }
            this._selectionCollection.setItems(newSel);
        }
        this._selectionCollection.endUpdate();
    },
    
    _createInstantiator: function() {
        var optionProto = {
            class: 'Amm.Trait.Select.Option'
        };
        if (this._labelProperty) {
            optionProto['in__label'] = this._objectPropToExp(this._labelProperty);
        }
        if (this._disabledProperty) {
            optionProto['in__disabled'] = this._objectPropToExp(this._disabledProperty);
        }
        if (this._valueProperty) {
            optionProto['in__value'] = this._objectPropToExp(this._valueProperty);
        } else {
            optionProto['in__value'] = 'this.origin';
        }
        optionProto['component'] = this.getClosestComponent();
        if (this._optionPrototype) {
            optionProto = Amm.overrideRecursive(optionProto, this._optionPrototype);
        }
        return new Amm.Instantiator.Proto(optionProto, 'origin');
    },
    
    _createObjectsMapper: function(src) {
        var proto = {
            instantiator: this._createInstantiator(),
            dest: this.getOptionsCollection(),
        };
        var res = new Amm.ArrayMapper(proto);
        res.beginUpdate();
        res.setSrc(src);
        this._updateDummyOption(res);
        res.endUpdate();
        return res;
    },
    
    outValuePropertyChange: function(valueProperty, oldValueProperty) {
        this._out('valuePropertyChange', valueProperty, oldValueProperty);
    },
    
    _cleanup_AmmTraitSelect: function() {
        this._detachObjects();
    },
    
    setDummyLabel: function(dummyLabel) {
        var oldDummyLabel = this._dummyLabel;
        if (oldDummyLabel === dummyLabel) return;
        this._dummyLabel = dummyLabel;
        this._updateDummyOption();
        this.outDummyLabelChange(dummyLabel, oldDummyLabel);
        return true;
    },

    getDummyLabel: function() { return this._dummyLabel; },

    outDummyLabelChange: function(dummyLabel, oldDummyLabel) {
        this._out('dummyLabelChange', dummyLabel, oldDummyLabel);
    },

    setDummyValue: function(dummyValue) {
        var oldDummyValue = this._dummyValue;
        if (oldDummyValue === dummyValue) return;
        this._dummyValue = dummyValue;
        this._updateDummyOption();
        this.outDummyValueChange(dummyValue, oldDummyValue);
        return true;
    },

    getDummyValue: function() { return this._dummyValue; },

    outDummyValueChange: function(dummyValue, oldDummyValue) {
        this._out('dummyValueChange', dummyValue, oldDummyValue);
    },

    setOptionPrototype: function(optionPrototype) {
        if (!optionPrototype) optionPrototype = null;
        if (typeof optionPrototype === 'string') {
            optionPrototype = {'class': optionPrototype};
        } else if (typeof optionPrototype !== 'object') {
            throw Error("optionProtoype must be null, a string or an object");
        }
        var oldOptionPrototype = this._optionPrototype;
        if (oldOptionPrototype === optionPrototype) return;
        this._optionPrototype = optionPrototype;
        this.outOptionPrototypeChange(optionPrototype, oldOptionPrototype);
        this._updateInstantiator();
        return true;
    },

    getOptionPrototype: function() { return this._optionPrototype; },

    outOptionPrototypeChange: function(optionPrototype, oldOptionPrototype) {
        this._out('optionPrototypeChange', optionPrototype, oldOptionPrototype);
    },
    
    _setClosestComponent_ammTraitSelect: function(component) {
        var c = this.getOptionsCollection();
        Amm.setProperty(c.getItems(), 'component', component);
    },

    /**
     * @param {object|Amm.Sorter} sorter Sorter or its' prototype
     */
    setSorter: function(sorter) {
        if (this.options) return this.options.setSorter(sorter);
        this._sorter = sorter;
    },

    getSorter: function() {
        if (this.options) return this.options.getSorter(); 
        else return this._sorter; 
    },

};

Amm.extend(Amm.Trait.Select, Amm.Trait.Input);
/* global Amm */
Amm.Trait.Select.Option = function(options) {
    Amm.Element.call(this, options);
};

Amm.Trait.Select.Option.prototype = {
    
    'Amm.Trait.Select.Option': '__CLASS__',
    
    _value: null,

    _label: null,

    _disabled: false,
    
    _selected: false,
    
    _index: null,
    
    _origin: null,

    _visible: true,

    setValue: function(value) {
        var oldValue = this._value;
        if (oldValue === value) return;
        this._value = value;
 
        this.outValueChange(value, oldValue);
        return true;
    },

    getValue: function() { return this._value; },

    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    },

    setLabel: function(label) {
        var oldLabel = this._label;
        if (oldLabel === label) return;
        this._label = label;
 
        this.outLabelChange(label, oldLabel);
        return true;
    },

    getLabel: function() { return this._label; },

    outLabelChange: function(label, oldLabel) {
        this._out('labelChange', label, oldLabel);
    },

    setDisabled: function(disabled) {
        disabled = !!disabled;
        var oldDisabled = this._disabled;
        if (oldDisabled === disabled) return;
        this._disabled = disabled;
        this.outDisabledChange(disabled, oldDisabled);
        if (this._disabled && this._selected) this.setSelected(false); 
        return true;
    },

    getDisabled: function() { return this._disabled; },

    outDisabledChange: function(disabled, oldDisabled) {
        this._out('disabledChange', disabled, oldDisabled);
    },

    setSelected: function(selected) {
        selected = !!selected;
        if (this._disabled || !this._visible) selected = false;
        var oldSelected = this._selected;
        if (oldSelected === selected) return;
        this._selected = selected;
        this.outSelectedChange(selected, oldSelected);
        return true;
    },

    getSelected: function() { return this._selected; },

    outSelectedChange: function(selected, oldSelected) {
        this._out('selectedChange', selected, oldSelected);
    },
    
    setIndex: function(index) {
        var oldIndex = this._index;
        if (oldIndex === index) return;
        this._index = index;
 
        this.outIndexChange(index, oldIndex);
        return true;
    },

    getIndex: function() { return this._index; },

    outIndexChange: function(index, oldIndex) {
        this._out('indexChange', index, oldIndex);
    },
    
    setOrigin: function(origin) {
        var oldOrigin = this._origin;
        if (oldOrigin === origin) return;
        this._origin = origin;
        this.outOriginChange(origin, oldOrigin);
        return true;
    },

    getOrigin: function() { return this._origin; },

    outOriginChange: function(origin, oldOrigin) {
        this._out('originChange', origin, oldOrigin);
    },
    
    setVisible: function(visible) {
        visible = !!visible;
        var oldVisible = this._visible;
        if (oldVisible === visible) return;
        this._visible = visible;
        if (!this._visible && this._selected) this.setSelected(false);
        this.outVisibleChange(visible, oldVisible);
        return true;
    },

    getVisible: function() { return this._visible; },

    outVisibleChange: function(visible, oldVisible) {
        this._out('visibleChange', visible, oldVisible);
    },
    
};

Amm.extend(Amm.Trait.Select.Option, Amm.Element);/* global Amm */

// all visual children must implement DisplayChild interface

Amm.Trait.DisplayParent = function() {
};

Amm.Trait.DisplayParent.prototype = {
    
    'DisplayParent': '__INTERFACE__',

    /**
     * @type {Amm.Collection}
     */
    displayChildren: null,
    
    _displayChildrenPrototype: null,
    
    _passDisplayChildrenToComponent: true,
    
    _displayChildrenObservedForComponent: false,
    
    __augment: function(traitInstance, options) {
        
        var proto = {
            requirements: ['Visual'],
            assocInstance: this,
            assocProperty: 'displayParent',
            indexProperty: 'displayOrder',
            observeIndexProperty: true,
            assocEvents: {
                cleanup: '_handleDisplayChildCleanup'
            }
        };
        
        if (this._displayChildrenPrototype) {
            Amm.overrideRecursive(proto, this._displayChildrenPrototype);
        }
        
        this.displayChildren = new Amm.Collection(proto);
        
        Amm.Element.regInit(this, '99_DisplayParent_observe', this._observeDisplayChildrenForComponent);
    },
    
    setDisplayChildrenPrototype: function(displayChildrenPrototype) {
        if (!displayChildrenPrototype) displayChildrenPrototype = null;
        else if (typeof displayChildrenPrototype !== 'object') {
            Error("`displayChildrenPrototype` must be a nullable or an object");
        }
        var oldDisplayChildrenPrototype = this._displayChildrenPrototype;
        if (oldDisplayChildrenPrototype === displayChildrenPrototype) return;
        this._displayChildrenPrototype = displayChildrenPrototype;
        if (this.displayChildren && this._displayChildrenPrototype) {
            Amm.init(this.displayChildren, this._displayChildrenPrototype);
        }
        return true;
    },

    getDisplayChildrenPrototype: function() { return this._displayChildrenPrototype; },

    /**
     * @returns {Amm.Collection}
     */
    getDisplayChildren: function() {
        return this.displayChildren;
    },
    
    setDisplayChildren: function(items) {
        return this.displayChildren.setItems(items);
    },
    
    _observeDisplayChildrenForComponent: function(mode) {
        var should = mode === undefined? !! (this._closestComponent && this._passDisplayChildrenToComponent) : !!mode, 
            is = !! (this._displayChildrenObservedForComponent);
    
        if (should === is) return;
        
        if (should) {
            this.displayChildren.subscribe('spliceItems', this._passDisplayChildrenOnSplice, this);
        } else {
            this.displayChildren.unsubscribe('spliceItems', this._passDisplayChildrenOnSplice, this);
        }
        
        this._displayChildrenObservedForComponent = !!should;
    },
    
    _passDisplayChildrenOnSplice: function(index, cut, insert) {
        if (!this._passDisplayChildrenToComponent || !this._closestComponent) return;
        var removed = Amm.Array.symmetricDiff(cut, insert);
        var added = Amm.Array.symmetricDiff(insert, cut);
        if (removed) this._closestComponent.rejectElements(removed);
        if (added) {
            this._closestComponent.acceptElements(added);
        }
    },
    
    setPassDisplayChildrenToComponent: function(passDisplayChildrenToComponent) {
        passDisplayChildrenToComponent = !!passDisplayChildrenToComponent;
        var oldPassDisplayChildrenToComponent = this._passDisplayChildrenToComponent;
        if (oldPassDisplayChildrenToComponent === passDisplayChildrenToComponent) return;
        this._passDisplayChildrenToComponent = passDisplayChildrenToComponent;
        if (this._closestComponent) {
            var items = [];
            items = items.concat(this.displayChildren.getItems());
            if (this._passDisplayChildrenToComponent) {
                this._closestComponent.acceptElements(items);
            } else {
                this._closestComponent.rejectElements(items);
            }
        }
        this._observeDisplayChildrenForComponent();
        this.outPassDisplayChildrenToComponentChange(passDisplayChildrenToComponent, oldPassDisplayChildrenToComponent);
        return true;
    },

    getPassDisplayChildrenToComponent: function() { return this._passDisplayChildrenToComponent; },

    outPassDisplayChildrenToComponentChange: function(passDisplayChildrenToComponent, oldPassDisplayChildrenToComponent) {
        this._out('passDisplayChildrenToComponentChange', passDisplayChildrenToComponent, oldPassDisplayChildrenToComponent);
    },
    
    _findChildElements_DisplayParent: function(items) {
        if (this._passDisplayChildrenToComponent) {
            items.push.apply(items, this.displayChildren.getItems());
        }
    },
    
    _setClosestComponent_DisplayParent: function(component, oldComponent) {
        if (this._passDisplayChildrenToComponent) {
            Amm.Trait.Component.changeComponent(this.displayChildren, component, oldComponent);
        }
        this._observeDisplayChildrenForComponent();
    },
    
    _cleanup_DisplayParent: function() {
        this.displayChildren.cleanup();
    },
    
    _handleDisplayChildCleanup: function(displayChild) {
        if (displayChild.getDisplayParent() === this) {
            var allowDelete = this.displayChildren.getAllowDelete();
            var allowChangeOrder = this.displayChildren.getAllowChangeOrder();
            this.displayChildren.setAllowDelete(true);
            this.displayChildren.setAllowChangeOrder(true);
            this.displayChildren.reject(displayChild);
            this.displayChildren.setAllowDelete(allowDelete);
            this.displayChildren.setAllowChangeOrder(allowChangeOrder);
        }
    }

};

/* global Amm */

Amm.Trait.Repeater = function() {
};

Amm.Trait.Repeater.prototype = {

    Repeater: '__INTERFACE__',
    
    InstantiatorOrRepeater: '__INTERFACE__',
    
    _useFilter: true,
    
    _arrayMapperOptions: null,
    
    _reportedInstantiatorOptions: null,
    
    _withVariantsView: false,

    _assocProperty: null,

    _revAssocProperty: null,
    
    _repeaterItems: null,
    
    __augment: function(traitInstance, options) {
        
        // provide options.withVariantsView = TRUE to avoid creating ArrayMapper before Amm.View.Variants is available
        // this is an UGLY hack. whole idea with VIEW containing part of ArrayMapper prototype is STUPID, it souhld be resolved in BUILD TIME
        
        if (typeof options === 'object' && options && 'withVariantsView' in options) {
            this._withVariantsView = !!options.withVariantsView;
            delete options.withVariantsView;
        }
        
        Amm.Element.regInit(this, '99.Amm.Trait.Repeater', function() {        
            if (this['DisplayParent'] !== '__INTERFACE__') throw Error("Repeater must be also a DisplayParent");
        });
        
        if ('items' in options) { // we set items at the very end
            var items = options.items;
            Amm.Element.regInit(this, '99.Amm.Trait.Repeater.setItems', function() {
                this.setItems(items);
            });
            delete options.items;
        }
        
        if (options && options.initialInstantiatorOptions) {
            this._reportedInstantiatorOptions = options.initialInstantiatorOptions;
            delete options.initialInstantiatorOptions;
        }
        
    },
    
    setItems: function(items) {
        if (!items) items = [];
        else if (!(items instanceof Array) && !items['Amm.Array']) items = [items];
        if (this._withVariantsView && !this._arrayMapper) this._repeaterItems = items;
        else this.getArrayMapper().setSrc(items);
    },
    
    getItems: function() {
        return this.getArrayMapper().getSrc();
    },
    
    outItemsChange: function(items, oldItems) {
        return this._out('itemsChange', items, oldItems);
    },
    
    _handleArrayMapperSrcChange: function(src, oldSrc) {
        this.outItemsChange(src, oldSrc);
    },
    
    getArrayMapper: function() {
        if (!this._arrayMapper) {
            this._createArrayMapper();
        }
        return this._arrayMapper;
    },
    
    setArrayMapper: function(arrayMapper) {
        // do nothing
        console.warn('Amm.Trait.Repeater: setArrayMapper() isn\'t supported; use setArrayMapperOptions() instead');
    },
    
    outArrayMapperChange: function(arrayMapper, oldArrayMapper) {
        return this._out('arrayMapperChange', arrayMapper, oldArrayMapper);
    },
    
    _createArrayMapper: function() {
        var old = this._arrayMapper, items;
        this.displayChildren.setCleanupOnDissociate(true); // didn't find the better place
        if (old) {
            items = old.getSrcIsOwn()? old.getSrc().getItems() : old.getSrc();
            old.cleanup();
        }
        var arrayMapperConfig = this._calcArrayMapperOptions.apply(this, this._reportedInstantiatorOptions || []);
        if (items) arrayMapperConfig.src = items;
        else if (this._repeaterItems) {
            arrayMapperConfig.src = this._repeaterItems;
            this._repeaterItems = null;
        }
        if (this._arrayMapperOptions) arrayMapperConfig = Amm.overrideRecursive(arrayMapperConfig, this._arrayMapperOptions);
        var arrayMapper = Amm.constructInstance(arrayMapperConfig, Amm.ArrayMapper);
        this._arrayMapper = arrayMapper;
        this.outArrayMapperChange(this._arrayMapper, old);
    },
    
    _calcArrayMapperOptions: function(defaultPrototype, conditions, prototypes) {
        var instantiatorPrototype;
        if ((!conditions || !conditions.length) && defaultPrototype) {
            instantiatorPrototype = {
                'class': Amm.Instantiator.Proto,
                isElement: true,
                proto: defaultPrototype
            };
        } else {
            instantiatorPrototype = {
                'class': Amm.Instantiator.Variants,
                prototypes: prototypes || [],
                defaultPrototype: defaultPrototype || null
            };
        }
        var res = {
            dest: this.displayChildren,
            filter: {
                'class': Amm.Filter,
                conditions: conditions
            },
            instantiator: instantiatorPrototype
        };
        if (!conditions || !conditions.length) delete res.filter;
        if (this._assocProperty) res.instantiator.assocProperty = this._assocProperty;
        if (this._revAssocProperty) res.instantiator.revAssocProperty = this._revAssocProperty;
        return res;
    },
    
    _cleanup_Repeater: function() {
        this._arrayMapper.cleanup();
    },
    
    setArrayMapperOptions: function(arrayMapperOptions) {
        if (!arrayMapperOptions) arrayMapperOptions = null;
        var oldArrayMapperOptions = this._arrayMapperOptions;
        if (oldArrayMapperOptions === arrayMapperOptions) return;
        this._arrayMapperOptions = arrayMapperOptions;
        if (this._arrayMapper) this._createArrayMapper();
        return true;
    },

    getArrayMapperOptions: function() { return this._arrayMapperOptions; },

    reportInstantiatorOptions: function (defaultPrototype, conditions, prototypes) {
        this._reportedInstantiatorOptions = [defaultPrototype, conditions, prototypes];
        this._createArrayMapper();
    },
    
    setAssocProperty: function(assocProperty) {
        var oldAssocProperty = this._assocProperty;
        if (oldAssocProperty === assocProperty) return;
        this._assocProperty = assocProperty;
        
        // TODO: we can replace instantiator only
        if (this._arrayMapper) this._createArrayMapper();
        return true;
    },

    getAssocProperty: function() { return this._assocProperty; },

    setRevAssocProperty: function(revAssocProperty) {
        var oldRevAssocProperty = this._revAssocProperty;
        if (oldRevAssocProperty === revAssocProperty) return;
        this._revAssocProperty = revAssocProperty;
        
        // TODO: we can replace instantiator only
        if (this._arrayMapper) this._createArrayMapper();
        return true;
    },

    getRevAssocProperty: function() { return this._revAssocProperty; },

};
/* global Amm */


Amm.Trait.Data = function() {
};

Amm.Trait.Data.UPDATE_VALIDATE = 'validate';
Amm.Trait.Data.UPDATE_CHANGE = 'change';
Amm.Trait.Data.UPDATE_BLUR = 'blur';
Amm.Trait.Data.UPDATE_NEVER = 'never';

Amm.Trait.Data.LOCK_NEVER = 0;
Amm.Trait.Data.LOCK_DURING_TRANSACTION = 1;
Amm.Trait.Data.LOCK_WITHOUT_PROPERTY = 2;

Amm.Trait.Data._revDataUpdate = {
    validate: 'UPDATE_VALIDATE',
    change: 'UPDATE_CHANGE',
    blur: 'UPDATE_BLUR',
    never: 'UPDATE_NEVER',
};

Amm.Trait.Data.prototype = {

    'Data': '__INTERFACE__',

    _dataObject: undefined,

    _dataProperty: undefined,

    _dataHasProperty: undefined,

    _dataValue: undefined,

    _dataSyncAnnotations: true,

    _dataUpdateMode: undefined,

    _dataParent: undefined,
    
    _dataSyncWithField: undefined,
    
    _dataSyncProperties: null,
    
    _subDataObject: null,
    
    _subDataProperty: null,
    
    _dataObjectUpdating: 0,
    
    _dataControlUpdating: 0,
    
    _dataLockMode: Amm.Trait.Data.LOCK_DURING_TRANSACTION | Amm.Trait.Data.LOCK_WITHOUT_PROPERTY,
    
    _dataModified: undefined,
    
    __augment: function(traitInstance, options) {
        
        this._dataSyncProperties = {
            dataObject: true,
            dataProperty: true,
            dataParent: true
        };
        
        Amm.Element.regInit(this, 'aa.Amm.Trait.Data', this._initDataSync);
    },
    
    _initDataSync: function() {
        if (this._dataSyncWithField === undefined) {
            this.setDataSyncWithField(this['Field'] === '__INTERFACE__');
            if (this._dataUpdateMode === undefined) {
                if (this['Field'] === '__INTERFACE__') {
                    this._dataUpdateMode = Amm.Trait.Data.UPDATE_VALIDATE;
                } else {
                    this._dataUpdateMode = Amm.Trait.Data.UPDATE_CHANGE;
                }
            }
        }
        if (this._dataProperty === undefined) this._dataSyncProperty();
        if (this._dataParent === undefined) this._dataSyncParent();
        if (this['Focusable'] === '__INTERFACE__') {
            this.subscribe('focusedChange', this._handleSelfDataFocusedChange, this);
        }
        this._dataUpdateModified();
        this._dataUpdateLock();

    },
    
    _setClosestComponent_Data: function(component) {
        this._dataSyncParent();
    },
    
    _setForm_Data: function(form) {
        this._dataSyncParent();
    },
    
    _setId_Data: function() {
        this._dataSyncProperty();
    },
    
    _fieldNameChange_Data: function() {
        this._dataSyncProperty();
    },
    
    _dataSyncParent: function() {
        if (!this._dataSyncProperties.dataParent) return;
        var value = null;
        if (this._dataSyncWithField && this._form && this._form['Data'] === '__INTERFACE__') {
            value = this._form;
        } else if (this._closestComponent && this._closestComponent['Data'] === '__INTERFACE__') {
            value = this._closestComponent;
        }
        this.setDataParent(value, true);
    },
    
    _dataSyncProperty: function() {
        var value = null;
        if (!this._dataSyncProperties.dataProperty) return;
        if (this._dataSyncWithField && this.getFieldName()) {
            value = this.getFieldName();
        } else if (this._id) {
            value = this._id;
        }
        this.setDataProperty(value, true);
    },
    
    _dataSyncObject: function() {
        var value = null;
        if (!this._dataSyncProperties.dataObject) return;
        if (this._dataParent) {
            if (this._dataParent.getDataProperty()) {
                value = this._dataParent.getDataValue();
            } else {
                value = this._dataParent.getDataObject();
            }
        }
        if (!value) value = null;
        this.setDataObject(value, true);
    },
    
    setDataParent: function(dataParent, isSync) {
        var oldDataParent = this._dataParent;
        if (oldDataParent === dataParent) return;
        if (!isSync) this._dataSyncProperties.dataParent = (dataParent === undefined);
        if (oldDataParent) {
            oldDataParent.unsubscribe('dataObjectChange', this._dataSyncObject, this);
            oldDataParent.unsubscribe('dataValueChange', this._dataSyncObject, this);
        }
        this._dataParent = dataParent;
        if (dataParent) {
            dataParent.subscribe('dataObjectChange', this._dataSyncObject, this);
            dataParent.subscribe('dataValueChange', this._dataSyncObject, this);
        }
        this._dataSyncObject();
        this.outDataParentChange(dataParent, oldDataParent);
        return true;
    },

    getDataParent: function() { return this._dataParent; },
    
    outDataParentChange: function(dataParent, oldDataParent) {
        this._out('dataParentChange', dataParent, oldDataParent);
    },

    setDataObject: function(dataObject, isSync) {
        if (dataObject) Amm.is(dataObject, 'Amm.Data.Record', dataObject);
        else if (dataObject !== undefined) dataObject = null;
        
        var oldDataObject = this._dataObject;
        if (oldDataObject === dataObject) return;
        this._dataObject = dataObject;
        if (oldDataObject) {
            oldDataObject.mm.unsubscribe('propertiesChanged', this._dataCheckProperty, this);
            oldDataObject.mm.unsubscribe('errorsChange', this._handleDataErrorsChange, this);
            oldDataObject.mm.unsubscribe('transactionChange', this._handleDataTransactionChange, this);
            oldDataObject.mm.unsubscribe('modifiedChange', this._dataUpdateModified, this);
            oldDataObject.mm.getMapper().unsubscribe('metaChange', this._handleDataMetaChange, this);
        }
        if (!isSync) this._dataSyncProperties.dataObject = (dataObject === undefined);
        if (dataObject) {
            dataObject.mm.subscribe('propertiesChanged', this._dataCheckProperty, this);
            dataObject.mm.subscribe('errorsChange', this._handleDataErrorsChange, this);
            dataObject.mm.subscribe('transactionChange', this._handleDataTransactionChange, this);
            dataObject.mm.subscribe('modifiedChange', this._dataUpdateModified, this);
            dataObject.mm.getMapper().subscribe('metaChange', this._handleDataMetaChange, this);
        }
        this.outDataObjectChange(dataObject, oldDataObject);
        this._dataUpdateModified();
        this._dataUpdateLock();
        this._dataCheckProperty();
        this._dataSyncMeta();
        this._dataSyncErrors();
        return true;
    },

    getDataObject: function() { return this._dataObject; },

    outDataObjectChange: function(dataObject, oldDataObject) {
        this._out('dataObjectChange', dataObject, oldDataObject);
    },
    
    _handleDataTransactionChange: function() {
        this._dataUpdateLock();
    },
    
    _handleDataErrorsChange: function(e) {
        this._dataSyncErrors();
    },
    
    _dataSyncErrors: function() {
        var error = null;
        var sync = this._dataSyncWithField || this['Annotated'] === '__INTERFACE__';
        if (!sync) return;
        if (this._dataHasProperty) error = this._dataObject.mm.getErrors(this._dataProperty);
        if (this._dataSyncWithField) {
            this.setFieldRemoteErrors(error);
        } else {
            this.setError(error);
        }
    },
    
    _handleDataMetaChange: function(meta, oldMeta, field, metaProperty, value, oldValue) {
        if (!this._dataHasProperty) return;
        if (!field || field === this._dataProperty) {
            this._dataSyncMeta(meta[this._dataProperty]);
        }
    },
    
    _dataSyncMeta: function(meta) {
        if (!this._dataHasProperty || !this._dataSyncAnnotations) return;
        if (!meta) meta = this._dataObject.mm.getMapper().getMeta(this._dataProperty);
        var _syncField = this._dataSyncWithField;
        if (_syncField) {
            this.setFieldLabel(meta.label);
            this.setFieldRequired(meta.required);
        } else if (this['Annotated'] === '__INTERFACE__') {
            if (!_syncField) {
                this.setLabel(meta.label);
                this.setRequired(meta.required);
            }
            this.setDescription(meta.description, 'description');
        }
    },
    
    setDataProperty: function(dataProperty) {
        var oldDataProperty = this._dataProperty;
        if (oldDataProperty === dataProperty) return;
        this._dataProperty = dataProperty;
        this.outDataPropertyChange(dataProperty, oldDataProperty);
        this._dataCheckProperty();
        return true;
    },

    getDataProperty: function() { return this._dataProperty; },

    outDataPropertyChange: function(dataProperty, oldDataProperty) {
        this._out('dataPropertyChange', dataProperty, oldDataProperty);
    },
    
    _dataCheckProperty: function() {
        var hasField = false;
        if (this._dataObject && this._dataProperty) {
            hasField = Amm.detectProperty(this._dataObject, this._dataProperty);
        }
        var properlySubscribed =
                    this._subDataObject === this._dataObject
                &&  this._subDataProperty === this._dataProperty;
        
        if (this._subDataObject && !properlySubscribed) {
            this._subDataObject.unsubscribe(this._subDataProperty + 'Change', 
                this._handleDataValueChange, this);
            this._subDataObject = null;
            this._subDataProperty = null;
        }
        if (hasField && !properlySubscribed) {
            this._subDataObject = this._dataObject;
            this._subDataProperty = this._dataProperty;
            this._subDataObject.subscribe(this._subDataProperty + 'Change', 
                this._handleDataValueChange, this);
            this._dataObjectUpdating++;
            this.setDataValue(this._subDataObject[this._subDataProperty]);
            this._dataObjectUpdating--;
        }
        this.setDataHasProperty(hasField);
    },
    
    _handleDataValueChange: function(dataValue) {
        this._dataObjectUpdating++;
        this.setDataValue(dataValue);
        this._dataUpdateModified();        
        this._dataObjectUpdating--;
    },
    
    setDataHasProperty: function(dataHasProperty) {
        dataHasProperty = !!dataHasProperty;
        var oldDataHasProperty = this._dataHasProperty;
        if (oldDataHasProperty === dataHasProperty) return;
        this._dataHasProperty = dataHasProperty;
        this._dataUpdateLock();
        this._dataUpdateModified();
        this.outDataHasPropertyChange(dataHasProperty, oldDataHasProperty);
        if (dataHasProperty) {
            this._dataUpdateValueSync();
            this._dataSyncMeta(this._dataObject.mm.getMapper().getMeta(this._dataProperty));
        }
        return true;
    },

    getDataHasProperty: function() { return this._dataHasProperty; },

    outDataHasPropertyChange: function(dataHasProperty, oldDataHasProperty) {
        this._out('dataHasPropertyChange', dataHasProperty, oldDataHasProperty);
    },

    setDataValue: function(dataValue, force) {
        var oldDataValue = this._dataValue;
        if (oldDataValue === dataValue && !force) return;
        this._dataValue = dataValue;
        if (!this._dataObjectUpdating && this._dataHasProperty) {
            this._dataObject[this._dataProperty] = dataValue;
        }
        if (!this._dataControlUpdating) {
            if (this._dataSyncWithField) this.setFieldValue(dataValue);
            else this.setValue(dataValue);
        }
        if (!force || (oldDataValue !== dataValue)) {
            this.outDataValueChange(dataValue, oldDataValue);
        }
        return true;
    },

    getDataValue: function() { return this._dataValue; },

    outDataValueChange: function(dataValue, oldDataValue) {
        this._out('dataValueChange', dataValue, oldDataValue);
    },

    setDataSyncAnnotations: function(dataSyncAnnotations) {
        dataSyncAnnotations = !!dataSyncAnnotations;
        var oldDataSyncAnnotations = this._dataSyncAnnotations;
        if (oldDataSyncAnnotations === dataSyncAnnotations) return;
        this._dataSyncAnnotations = dataSyncAnnotations;
        if (dataSyncAnnotations && this._dataHasProperty) {
            this._dataSyncMeta(this._dataObject.mm.getMapper().getMeta(this._dataProperty));
        }
        return true;
    },

    getDataSyncAnnotations: function() { return this._dataSyncAnnotations; },

    setDataUpdateMode: function(dataUpdateMode) {
        if (!Amm.Trait.Data._revDataUpdate[dataUpdateMode]) 
            throw Error("dataUpdateMode must be one of Amm.Trait.Data.UPDATE_*");
        var oldDataUpdateMode = this._dataUpdateMode;
        if (oldDataUpdateMode === dataUpdateMode) return;
        this._dataUpdateMode = dataUpdateMode;
        this._dataSyncUpdateMode();
        return true;
    },
    
    getDataUpdateMode: function() {
        return this._dataUpdateMode;
    },

    setDataSyncWithField: function(dataSyncWithField) {
        dataSyncWithField = !!dataSyncWithField;
        if (dataSyncWithField && (this['Field'] !== '__INTERFACE__')) {
            throw Error("Need Field trait to enable data sync with field");
        }
        var oldDataSyncWithField = this._dataSyncWithField;
        if (oldDataSyncWithField === dataSyncWithField) return;
        this._dataSyncWithField = dataSyncWithField;
        this._dataUpdateValueSync();
        return true;
    },
    
    _dataUpdateValueSync: function() {        
        var hasValueEvent = typeof this.outValueChange === 'function';
        var isField = this['Field'] === '__INTERFACE__';
        if (this._dataSyncWithField) {
            if (hasValueEvent) {
                this.unsubscribe('valueChange', this._handleSelfControlValueChange, this);
            }
            this.subscribe('fieldValueChange', this._handleSelfControlValueChange, this);
            this.subscribe('afterFieldValidate', this._handleSelfDataAfterFieldValidate, this);
        } else {
            if (hasValueEvent) {
                this.subscribe('valueChange', this._handleSelfControlValueChange, this);
            }
            if (isField) {
                this.unsubscribe('fieldValueChange', this._handleSelfControlValueChange, this);
                this.unsubscribe('afterFieldValidate', this._handleSelfDataAfterFieldValidate, this);
            }
        }
    },

    getDataSyncWithField: function() { return this._dataSyncWithField; },
    
    _updateDataValueFromControl: function(value) {
        this._dataControlUpdating++;
        if (!arguments.length) {
            value = this._dataSyncWithField? this.getFieldValue() : this.getValue();
        }
        this.setDataValue(value);
        this._dataControlUpdating--;
    },
    
    _handleSelfDataAfterFieldValidate: function(valid) {
        if (this._dataUpdateMode === Amm.Trait.Data.UPDATE_VALIDATE && valid) {
            this._updateDataValueFromControl();
        }
    },
    
    _handleSelfControlValueChange: function(value) {
        if (this._dataObjectUpdating) return;
        if (this._dataUpdateMode === Amm.Trait.Data.UPDATE_CHANGE) {
            this._updateDataValueFromControl(value);
        }
    },
    
    _handleSelfDataFocusedChange: function(value) {
        if (value) return; // we're interested only in blur event
        
        // we don't update on blur?
        if (this._dataUpdateMode !== Amm.Trait.Data.UPDATE_BLUR) return;
        
        this._updateDataValueFromControl();
    },
    
    setDataLockMode: function(dataLockMode) {
        if (!dataLockMode) dataLockMode = 0;
        if (typeof dataLockMode !== 'Number') {
            throw Error("dataLockMode must be a number");
        }
        var oldDataLockMode = this._dataLockMode;
        if (oldDataLockMode === dataLockMode) return;
        this._dataLockMode = dataLockMode;
        this._dataUpdateLock();
        return true;
    },

    getDataLockMode: function() { return this._dataLockMode; }, 
    
    _dataUpdateLock: function() {
        if (this['Lockable'] !== '__INTERFACE__' || !this._dataLockMode) return;
        var locked = false;
        if (this._dataLockMode & Amm.Trait.Data.LOCK_WITHOUT_PROPERTY) {
            if (!this._dataHasProperty) locked = true;
        }
        if (this._dataLockMode & Amm.Trait.Data.LOCK_DURING_TRANSACTION) {
            if (this._dataObject && this._dataObject.mm.getTransaction()) {
                locked = true;
            }
        }
        this.setLocked(locked);
    },

    setDataModified: function(dataModified, isSync) {
        
        dataModified = !!dataModified;
        var oldDataModified = this._dataModified;
        if (oldDataModified === dataModified) return;
        if (!isSync && dataModified) return; // no effect
        if (!isSync && !dataModified && this._dataHasProperty) {
            this.setDataValue(this._dataObject.mm.getOldValue(this._dataProperty));
            return;
        }
        this._dataModified = dataModified;
        this.outDataModifiedChange(dataModified, oldDataModified);
        return true;
    },
    
    outDataModifiedChange: function(modified, oldModified) {
        return this._out('dataModifiedChange', modified, oldModified);
    },
    
    getDataModified: function() { return this._dataModified; },
    
    _dataUpdateModified: function() {
        var modified = false;
        if (this._dataHasProperty) {
            modified = this._dataObject.mm.getModified(this._dataProperty);
        } else if (this._dataObject && !this._dataProperty) {
            modified = this._dataObject.mm.getModified();
        }
        this.setDataModified(modified, true);
    }
    
};/* global Amm */

Amm.Builder.Node = function(options) {
    this.children = [];
    this.connected = [this];
    this.conIdx = 0;
    if (options) Amm.override(this, options);
};

Amm.Builder.Node.prototype = {
    
    htmlElement: null,
    
    v: null,
    
    e: null,
    
    x: null,
    
    id: null,
    
    global: false,
    
    parent: null,
    
    children: null,
    
    connected: null,
    
    conIdx: null,
    
    conParent: false,
    
    conChild: false
    
};/* global Amm */
/* global HTMLElement */

Amm.Builder.Ref = function(options, node) {
    
    if (options && '$ref' in options) {
        if (options['$ref'] && !('find' in options))
            options['find'] = options['$ref'];
        delete options['$ref'];
    }
    
    if (node) this.setNode(node);
    
    Amm.init(this, options);
    
};

Amm.Builder.Ref.prototype = {
    
    'Amm.Builder.Ref': '__CLASS__',

    _node: null,

    _parent: 0,

    _closest: null,

    _find: null,

    _index: 0,

    _global: false,

    setNode: function(node) {
        if (!node) node = null;
        else if (!(node instanceof HTMLElement || node.tagName)) {
            throw Error ("`node` must be an instance of HTMLElement");
        }
        this._node = node;
    },

    getNode: function() { return this._node; },

    setGlobal: function(global) {
        global = !!global;
        this._global = global;
    },

    getGlobal: function() { return this._global; },

    setParent: function(parent) {
        if (typeof parent !== 'number') {
            parent = parseInt(parent);
        }
        if (isNaN(parent) || parent < 0) {
            throw Error("`parent` must be a number >= 0");
        }
        this._parent = parent;
    },

    getParent: function() { return this._parent; },

    setClosest: function(closest) {
        if (!closest) closest = null;
        else if (typeof closest !== 'string')
            throw Error("`closest` must be a null or a string");
        this._closest = closest;
    },

    getClosest: function() { return this._closest; },

    setFind: function(find) {
        this._find = find;
    },

    getFind: function() { return this._find; },

    setIndex: function(index) {
        if (index !== null) {
            if (typeof index !== 'number') {
                index = parseInt(index);
                if (isNaN(index) || index < 0) {
                    throw Error("`index` must be a number >= 0");
                }
            }
        }
        this._index = index;
    },

    getIndex: function() { return this._index; },
    
    resolve: function(onlyScalar) {
        
        if (!this._global && !this._node) throw Error("Cannot resolve without `node`");
        
        var curr = this._global? jQuery : jQuery(this._node);
        
        if (this._parent && !this._global) {
            for (var i = 0; (i < this._parent) && curr.length; i++) {
                curr = curr.parent();
            }
            if (!curr.length) return null;
        }
        
        if (this._closest && !this._global) {
            curr = curr.closest(this._closest);
            if (!curr) return null;
        }
        
        if (this._find) {
            curr = curr.find(this._find);
            if (!curr) return null;
        }
        
        if (this._index !== null) {
            return curr[this._index] || null;
        }
        
        if (onlyScalar) return curr[0] || null;
        
        return curr;
        
    }

};
/* global Amm */

Amm.Filter = function(options) {
    Amm.FilterSorter.call(this, options);
};

Amm.Filter.prototype = {
    
    'Amm.Filter': '__CLASS__',
    
    _oldMatchingObjects: null,
    
    _matchingObjects: null,    
    
    filter: function(objects, matches) {
        if (!(matches instanceof Array)) matches = [];
        else matches.splice(0, matches.length);
        var i, l, match, res = [];
        for (i = 0, l = objects.length; i < l; i++) {
            match = this.evaluateMatch(objects[i]);
            if (!match) continue;
            res.push(objects[i]);
            matches.push(match);
        }
        return res;
    },
    
    setConditions: function(conditions, id) {
        var condition = null, oldConditions, i, l;
        if (this._subscribers.outConditionsChange) {
            oldConditions = [].concat(this._observers);
        }
        if (id) {
            if (conditions) {
                if (typeof conditions !== 'object') throw Error("setConditions(`conditions`, `id`): `conditions` must be a null or an object");
                conditions._id = id;
                condition = this._createCondition(conditions);
            }
            this.beginUpdate();
            for (i = 0, l = this._observers.length; i < l; i++) {
                if (this._observers[i].id === id) {
                    this._observers[i].cleanup();
                    this._observers.splice(i, 1);
                    break;
                }
            }
            this._observers.push(condition);
            if (this._subscribers.outConditionsChange) {
                this.outConditionsChange([].concat(this._observers), oldConditions);
            }
            condition.observe(this._objects);
            this.refresh();
            this.endUpdate();
            return;
        }
        var instances = [];
        if (conditions) {
            if (!(conditions instanceof Array)) throw Error("`conditions` must be an Array");
            var ids = {};
            for (i = 0, l = conditions.length; i < l; i++) {
                condition = this._createCondition(conditions[i]);
                instances.push(condition);
                if (!condition.id) continue;
                if (condition.id in ids)
                    throw Error("conditions['" + i + "'].id is same as " + 
                        "conditions['" + ids[condition.id] + "'] ('" + condition.id + "')");
                ids[condition.id] = i;
            }
        }
        this.beginUpdate();
        for (i = this._observers.length - 1; i >= 0; i--) { 
            this._observers[i].cleanup();
        }
        this._observers = instances;
        this._subObservers(this._objects);
        if (this._subscribers.outConditionsChange) {
            this.outConditionsChange([].concat(this._observers), oldConditions);
        }
        this.refresh();
        this.endUpdate();
    },
    
    getConditions: function(id) {
        var i, l;
        if (!id) return [].concat(this._observers);
        for (i = 0, l = this._observers.length; i < l; i++) {
            if (id === i + 1 || this._observers[i].id === id)
                return this._observers[i];
        }
        return null;
    },
    
    outConditionsChange: function(newConditions, oldConditions) {
        return this._out('conditionsChange', newConditions, oldConditions);
    },
    
    outMatchingObjectsChange: function(matchingObjects, oldMatchingObjects) {
        return this._out('matchingObjectsChange', matchingObjects, oldMatchingObjects);
    },
    
    beginUpdate: function() {
        if (!this._updateLevel) this._oldMatchingObjects = this.getMatchingObjects();
        Amm.FilterSorter.prototype.beginUpdate.call(this);
        this._matchingObjects = null;
    },
    
    _doOnEndUpdateChange: function() {
        
        if (!this._subscribers.matchingObjectsChange) return;
        
        var matchingObjects = this.getMatchingObjects();
        
        if (Amm.Array.equal(matchingObjects, this._oldMatchingObjects)) return;
        
        var tmp = this._oldMatchingObjects;
        this._oldMatchingObjects = null;
        this.outMatchingObjectsChange(matchingObjects, tmp);
        
    },
    
    _createCondition: function(condition) {

        if (condition && typeof condition === 'string') {
            console.log(condition);
            condition = {_expr: condition};
        }

        if (!condition || typeof condition !== 'object')
            throw Error("filter condition must be an object, given: " 
                + Amm.describeType(condition));

        if (condition._expr) return new Amm.Filter.ExpressionCondition(this, condition);

        return new Amm.Filter.PropsCondition(this, condition);

    },
    
    setRequireAll: function(requireAll) {
        requireAll = !!requireAll;
        var oldRequireAll = this._requireAll;
        if (oldRequireAll === requireAll) return;
        this._requireAll = requireAll;
        this.outRequireAllChange(requireAll, oldRequireAll);
        if (this._observers.length) this.refresh();
        return true;
    },

    getRequireAll: function() { return this._requireAll; },

    outRequireAllChange: function(requireAll, oldRequireAll) {
        this._out('requireAllChange', requireAll, oldRequireAll);
    },
    
    getMatchingObjects: function() {
        if (this._matchingObjects) return this._matchingObjects;
        var res = [], i, l;
        for (i = 0, l = this._objects.length; i < l; i++) {
            if (this._matches[i]) {
                res.push(this._objects[i]);
            }
        }
        if (this._oldMatchingObjects && Amm.Array.equal(res, this._oldMatchingObjects))
            res = this._oldMatchingObjects; // set to old instance if matching objects are same
        this._matchingObjects = res;
        return res;
    },
    
    _doOnUpdateMatch: function(idx, oldMatch, newMatch) {
        
        if (!!newMatch === !!oldMatch) return;
        
        this._matchingObjects = null;
        
        // check if we need to compose arrays for outMatchingObjectsChange
        if (!this._subscribers.matchingObjectsChange) return;
        
        var objects = [], oldObjects = [], i, l;
        for (i = 0, l = this._objects.length; i < l; i++) {
            if (i === idx && oldMatch) oldObjects.push(this._objects[i]);
            if (this._matches[i]) {
                objects.push(this._objects[i]);
                oldObjects.push(this._objects[i]);
            }
        }
        this._matchingObjects = objects;
        this.outMatchingObjectsChange(objects, oldObjects);
        
    },
    
    evaluateMatch: function(object) {
        if (!this._observers.length) return true;
        var res;
        for (var i = 0, l = this._observers.length; i < l; i++) {
            res = false;
            if (this._observers[i].match(object))
                res = this._observers[i].id || i + 1;
            if (this._requireAll) {
                if (!res) return false;
            } else {
                if (res) return res;
            }
        }
        if (this._requireAll) return res;
        return false;
    },
    
    _hasChangeSubscribers: function() {
        return this._subscribers.matchesChange || this._subscribers.matchingObjectsChange;
    }

};

Amm.extend(Amm.Filter, Amm.FilterSorter);
/* global Amm */

Amm.Filter.Condition = function(filter, options) {
    
    if (options && options._id) {
        this.id = options._id;
        delete options._id;
    }
    
    if (options && options._class) {
        this.requiredClass = options._class;
        delete options._class;
    }
    
    if (options && options._not) {
        this.not = true;
        delete options._not;
    }
    
    Amm.FilterSorter.Observer.call(this, filter, options, true);
    
};


/**
 * Function to check if `value` matches `criterion`.
 * May be used statically.
 * 
 * Array values: will return TRUE if at least one item satisfies criterion, unless criterion.only provided.
 * Array criteria: will return TRUE if value satisfies ANY criterion, unless criterion.and provided.
 * 
 * Possible `criterion` values:
 * 
 * -    [`criterion`, `criterion`, `criterion`]: value meets at least one of specified criteria
 * -    { only: [`criterion`, `criterion`, `criterion`] }: when array `value` provided, all items should match at least one of specified criteria
 * -    { and: ['`criterion`, `criterion`, `criterion`] }: value must meet ALL of specified criteria; when array `value` provided, all items must match all specified criteria
 * -    { typeof: `type` }: typeof value === `type`
 * -    { not: `criterion` }: TRUE if value does NOT meet specified criterion
 * -    function(value): callback that returns true if test is passed
 * -    { fn: function(value), [scope: object] }: callback that will be called with provided scope
 * -    /RegExp/: value matches RegExp
 * -    { regExp: '/RegExp/', [flags: 'flags'] }: value matches RegExp (with provided string definition)
 * -    { validator: `validator` }: value passes Amm.Validator (prototype may be provided instead of instance)
 * -    Amm.Validator instance: value passes Amm.Validator
 * -    { rq: `requirements` }: Amm.meetsRequirements(value, `requirements`
 * -    { strict: `testValue` }: value === `testValue` (force strict comparison)
 * -    `otherCriterion`: value == `otherCriterion` (all other criterion values: non-strict comparison)
 */
Amm.Filter.Condition.testValue = function(value, criterion) {
    var i, l;
    if (value instanceof Array || value && value['Amm.Array']) {
        if (typeof criterion === 'object' && criterion && criterion.only) { // will return TRUE only if ALL array items meet condition
            for (i = 0, l = value.length; i < l; i++) {
                if (!Amm.Filter.Condition.testValue(value[i], criterion.only)) return false;
            }
            return true;
        }
        for (i = 0, l = value.length; i < l; i++) {
            if (Amm.Filter.Condition.testValue(value[i], criterion)) return true;
        }
        return false;
    }
    if (criterion instanceof Array) {
        for (i = 0, l = criterion.length; i < l; i++) {
            if (this.testValue(value, criterion[i])) return true;
        }
        return;
    }
    if (criterion instanceof RegExp) {
        return typeof value === 'string' && criterion.exec(value);
    }
    if (typeof criterion === 'function') {
        return !!criterion(value);
    }
    if (typeof criterion === 'object' && criterion) {
        if ('and' in criterion) {
            if (!criterion.and || !(criterion.and instanceof Array)) return Amm.Filter.Condition.testValue(value, criterion.and);
            for (i = 0, l = criterion.and.length; i < l; i++) {
                if (!this.testValue(value, criterion.and[i])) return false;
            }
            return true;
        }
        if ('only' in criterion) return Amm.Filter.Condition.testValue(value, criterion.only);
        if ('typeof' in criterion) {
            return Amm.Filter.Condition.testValue(typeof value, criterion.typeof)
        }
        if (typeof criterion.fn === 'function') return criterion.scope? criterion.fn.call(criterion.scope, value) : criterion.fn(value);
        if ('regExp' in criterion) return Amm.Filter.Condition.testValue(value, new RegExp(criterion.regExp, criterion.flags || ''));
        if ('validator' in criterion) {
            return !Amm.Validator.iErr(criterion, 'validator', value);
        }
        if (criterion['Amm.Validator']) {
            return !criterion.getError(value);
        }
        if ('strict' in criterion) return value === criterion.strict;
        if ('rq' in criterion) return Amm.meetsRequirements(value, criterion.rq);
        if ('not' in criterion) return !Amm.Filter.Condition.testValue(value, criterion.not);
        throw Error ("object `test` must contain at least one of following keys: `and`, `only`, `fn`, `regExp`, `validator`, `strict`, `rq`, `not`");
    }
    return criterion == value; // non-strict comparison
};

Amm.Filter.Condition.prototype = {
    
    'Amm.Filter.Condition': '__CLASS__',
    
    id: null, // For named conditions
    
    requiredClass: null, // one or more classes
    
    not: false, // inverses the condition
    
    match: function(object) {
        var res = true;
        
        if (this.requiredClass && !Amm.is(object, this.requiredClass)) res = false;
        else res = this._doMatch(object);
        
        if (this.not) res = !res;
        return res;
    },
    
    _doMatch: function(object) {
        return true;
    },
    
    setProps: function(props, propName) {
        // template method
    },
    
    getProps: function(propName) {
        // template method
    },
    
    outPropsChange: function(props, oldProps) {
        return this._out('propsChange', props, oldProps);
    }
    
};

Amm.extend(Amm.Filter.Condition, Amm.FilterSorter.Observer);
/* global Amm */

Amm.Filter.PropsCondition = function(filter, options) {
    
    options = Amm.override({}, options);
    if ('_allowExpressions' in options) {
        this.allowExpressions = !!options._allowExpressions;
        delete options._allowExpressions;
    }
    this._props = {};
    this._expressions = {};
    this._evaluators = {};
    this._propList = [];
    Amm.Filter.Condition.call(this, filter, options);
    this.setProps(options);
    
};

Amm.Filter.propNameRx = /^\w+$/;

Amm.Filter.PropsCondition.prototype = {

    'Amm.Filter.PropsCondition': '__CLASS__', 
    
    allowExpressions: true,
    
    _props: null,
    
    _expressions: null,
    
    _evaluators: null,
    
    _propList: null,
    
    _noRefresh: 0,
    
    _checkProps: function(props, expressionList) {
        if (!expressionList) expressionList = {};
        for (var i = 0, l = props.length; i < l; i++) {
            if (Amm.Filter.propNameRx.exec(props[i])) continue;
            if (!this.allowExpressions) {
                throw Error("'" + props[i] + "' doesn't look like simple property name; "
                    + " set `allowExpressions` to true to access expression values");
            }
            if (this._expressions[props[i]]) {
                expressionList[props[i]] = this._expressions[props[i]];
                continue;
            }
            expressionList[props[i]] = new Amm.Expression(props[i]);
            expressionList[props[i]].setEventsProxy(this._filterSorter);
        }
    },
    
    setProps: function(props, propName) {
        this._noRefresh++;
        var expressionList = {};
        var oldProps;
        if (this._subscribers.propsChange) {
            oldProps = Amm.override({}, this._props);
        }
        if (propName) {
            var isNewProp = !(propName in this._props);
            this._checkProps([propName], expressionList);
            this._props[propName] = props;
            if (isNewProp) {
                if (this.allowExpressions) {
                    Amm.override(this._expressions, expressionList);
                }
                this._propList.push(propName);
                this._sub(propName);
            }
        } else if (props) {
            var propList = Amm.keys(props);
            this._checkProps(propList, expressionList);
            this.deleteProps(null, expressionList);
            if (this.allowExpressions) {
                Amm.override(this._expressions, expressionList);
            }
            this._props = Amm.override({}, props);
            this._propList = propList;
            this._sub();
        } else {
            this.deleteProps();
        }
        if (this._subscribers.propsChange)
            this.outPropsChange(this._props, oldProps);
        this._noRefresh--;
        if (!this._noRefresh) this._filterSorter.refresh();
    },
    
    _handleChange: function() {
        var o = Amm.event.origin; // event origin must be our object
        
        // sub-optimal (eval all conditions for all observed change events)
        this._filterSorter.refresh(o); 
    },
    
    _handleExpressionChange: function(value, oldValue) {
        var o = Amm.event.origin.getExpressionThis();
        this._filterSorter.refresh(o); 
    },
    
    _sub: function(props, objects) {
        var oo = objects || this._filterSorter._objects, l = oo.length, i, o, ev;
        if (!props) props = this._propList;
        var j, pl = props.length;
        for (i = 0; i < l; i++) {
            o = oo[i];
            if (!o['Amm.WithEvents']) continue;
            for (j = 0; j < pl; j++) {
                
                if (this._expressions[props[j]]) {
                    var c = this._expressions[props[j]].findContext(o);
                    if (c !== undefined) continue;
                    this._expressions[props[j]].createContext({expressionThis: o});
                    this._expressions[props[j]].subscribe('valueChange', this._handleExpressionChange, this);
                    continue;
                }
                
                ev = props[j] + 'Change';
                
                // no need to subscribe objects that don't have required class
                if (this.requiredClass && !Amm.is(o, this.requiredClass)) continue; 
                if (!o.hasEvent(ev)) continue;
                this._filterSorter.subscribeObject(o, ev, this._handleChange, this);
            }
        }
    },
    
    // if props is not provided, will unsubscribe from all events
    _unsub: function(props, objects) {
        var oo = objects || this._filterSorter._objects, l = oo.length, i, o, ev;
        if (!props) props = this._propList;
        var j, pl = props? props.length : 0;
        for (i = 0; i < l; i++) {
            o = oo[i];
            if (!o['Amm.WithEvents']) continue;
                
            // we didn't subscribed to objects that didn't have required class
            if (this.requiredClass && !Amm.is(o, this.requiredClass)) continue; 
            
            for (j = 0; j < pl; j++) {
                if (this._expressions[props[j]]) {
                    var ctx = this._expressions[props[j]].findContext(o);
                    if (ctx !== undefined) this._expressions[props[j]].deleteContext(ctx);
                    continue;
                }
                ev = props[j] + 'Change';
                if (this._expressions[props[j]]) continue;
                if (!o.hasEvent(ev)) continue;
                this._filterSorter.unsubscribeObject(o, ev, this._handleChange, this);
            }
        }
    },
    
    _doMatch: function(object) {
        var exp, ctxId, val;
        for (var i = 0, l = this._propList.length; i < l; i++) {
            if ((exp = this._expressions[this._propList[i]])) {
                if (exp.getExpressionThis() === object) {
                    val = exp.getValue();
                } else {
                    ctxId = exp.findContext(object);
                    if (ctxId === undefined) {
                        if (!this._evaluators[this._propList[i]]) 
                            this._evaluators[this._propList[i]] = exp.toFunction();
                        this._evaluators[this._propList[i]].env.expressionThis = object;
                        val = this._evaluators[this._propList[i]]();
                    } else {
                        exp.setContextId(ctxId);
                        val = exp.getValue();
                    }
                }
            } else {
                val = Amm.getProperty(object, this._propList[i]);
            }
            if (!Amm.Filter.Condition.testValue(val, this._props[this._propList[i]])) {
                return false;
            }
        }
        return true;
    },
    
    observe: function(objects) {
        this._sub(this._propList, objects);
    },
    
    unobserve: function(objects) {
        this._unsub(null, objects);
    },
    
    getProps: function(propName) {
        if (propName) return this._props[propName];
        
        // notice: returning internal data structure by reference
        return this._props;
    },
    
    deleteProps: function(propName, expressionsToLeave) {
        
        if (propName && !(propName instanceof Array)) {
            propName = [propName];
        }
        
        this._unsub(propName);
        
        if (!propName) {
            this._props = {};
            this._propList = [];
        } else {
            for (var i = 0, l = propName.length; i < l; i++) {
                delete this._props(propName[i]);
                if (!this._expressions[propName[i]]) continue;
                if (expressionsToLeave && expressionsToLeave[propName[i]]) continue;
                this._expressions[propName[i]].cleanup();
                if (this._evaluators[[propName[i]]]) {
                    this._evaluators[[propName[i]]].env.expressionThis = {};
                    delete this._evaluators[[propName[i]]];
                }
                delete this._expressions[propName[i]];
            }
            this._propList = Amm.Array.diff(this._propList, propName);
        }
        
        if (!this._noRefresh) this._filterSorter.refresh();
        
    },
    
    cleanup: function() {
        Amm.Filter.Condition.prototype.cleanup.call(this);
        for (var i in this._expressions) if (this._expressions.hasOwnProperty(i)){
            this._expressions[i].cleanup();
        }
        this._expressions = {};
        this._evaluators = {};
        this._propList = [];
        this._props = {};
    },
    
    
};

Amm.extend(Amm.Filter.PropsCondition, Amm.Filter.Condition);
/* global Amm */

Amm.Filter.ExpressionCondition = function(filter, options) {
    var opt = Amm.override({}, options);
    var expression = null;
    if (options._expr) {
        expression = options._expr;
        delete options._expr;
    }
    if (!expression) 
        throw Error("options._expr must be provided for Amm.Filter.ExpressionCondition");
    Amm.Filter.Condition.call(this, filter, options);
    this._props = Amm.override({}, options);
    
    this._setExpression(expression);
};

Amm.Filter.ExpressionCondition.prototype = {

    'Amm.Filter.ExpressionCondition': '__CLASS__', 
    
    _expression: null,
    
    _evaluator: null,
    
    _props: null,
    
    _setExpression: function(expression) {
        this._expression = new Amm.Expression(expression);
        this._expression.setEventsProxy(this._filterSorter);
    },
    
    _handleExpressionChanged: function(value, oldValue) {
        var object = this._expression.getExpressionThis();
        this._filterSorter.refresh(object);
    },
    
    match: function(object) {
        if (object === this._expression.getExpressionThis()) {
            return this._expression.getValue();
        }
        var ctx = this._expression.findContext(object);
        
        if (ctx !== undefined) { // return value for observed object
            this._expression.setContextId(ctx);
            return this._expression.getValue();
        }
        
        if (!this._evaluator) this._evaluator = this._expression.toFunction();
        
        this._evaluator.env.expressionThis = object;
        this._evaluator.env.vars = this._props;
        
        return this._evaluator();
    },
    
    observe: function(objects) {
        for (var i = 0, l = objects.length; i < l; i++) {
            var o = objects[i];
            if (this._expression.findContext(o) !== undefined) continue; // already subscribed
            this._expression.createContext({expressionThis: o, vars: this._props});
            this._expression.subscribe('valueChange', this._handleExpressionChanged, this);
        }
    },
    
    unobserve: function(objects) {
        for (var i = 0, l = objects.length; i < l; i++) {
            var id = this._expression.findContext(objects[i]);
            if (id === undefined) continue; // not subscribed
            this._expression.deleteContext(id);
        }
    },
    
    cleanup: function() {
        Amm.Filter.Condition.prototype.cleanup.call(this);
        this._expression.cleanup();
        this._evaluator = null;
        this._expression = null;
        this._props = {};
    },
    
    setProps: function(props, propName) {
        var oldProps;
        if (this._subscribers.propsChange) oldProps = Amm.override({}, this._props);
        if (propName) this._props[propName] = props;
        else {
            if (!props || (typeof props) !== 'object')
                throw Error("`props` must be a non-null object when `propName` not provided");
            this._props = propName;
        }
        if (this._expression) {
            if (this._filterSorter) this._filterSorter.beginUpdate();
            var cc = this._expression.listContexts(), i, l;
            for (i = 0, l = cc.length; i < l; i++) {
                this._expression.setContextId(cc[i]);
                this._expression.setVars(props, propName);
            }
            if (this._filterSorter) this._filterSorter.endUpdate();
        }
        if (this._subscribers.propsChange) this.outPropsChange(this._props, oldProps);
    },
    
    getProps: function(propName) {
        if (propName !== undefined) return this._props[propName];
        return this._props;
    }

};

Amm.extend(Amm.Filter.ExpressionCondition, Amm.Filter.Condition);

/* global Amm */

Amm.Data = {
    
    isEmpty: function(v) {
        if (!v) return true;
        if (v instanceof Array) return !v.length;
        if (typeof v === 'object') {
            for (var i in v) if (v.hashOwnProperty(i)) return !isEmpty(v[i]);
            return true;
        }
        return false;
    },
    
    flattenErrors: function(hash, target) {
        if (!hash) return [];
        if (typeof hash !== 'object') return [hash];
        var i, l;
        var res = target || [], target = target || res;
        if (hash instanceof Array) {
            for (i = 0, l = hash.length; i < l; i++) {
                if (Amm.Data.isEmpty(hash[i])) continue;
                if (typeof hash[i] === 'object' && hash[i]) Amm.Data.flattenErrors(hash[i], res);
                if (Amm.Array.indexOf(target, hash[i]) < 0) target.push(hash[i]);
            }
        } else {
            for (i in hash) if (hash.hasOwnProperty(i)) {
                if (Amm.Data.isEmpty(hash[i])) continue;
                if (typeof hash[i] === 'object' && hash[i]) Amm.Data.flattenErrors(hash[i], res);
                if (hash[i] instanceof Array && !hash[i].length) {
                    delete hash[i];
                    continue;
                }
                if (Amm.Array.indexOf(target, hash[i]) < 0) target.push(hash[i]);
            }
        }
        return res;
    }
        
};

Amm.Data.STATE_NEW = 'new';

Amm.Data.STATE_EXISTS = 'exists';

Amm.Data.STATE_DELETED = 'deleted';

Amm.Data.StateEnum = {};

Amm.Data.StateEnum[Amm.Data.STATE_NEW] = Amm.Data.STATE_NEW;
Amm.Data.StateEnum[Amm.Data.STATE_EXISTS] = Amm.Data.STATE_EXISTS;
Amm.Data.StateEnum[Amm.Data.STATE_DELETED] = Amm.Data.STATE_DELETED;

Amm.Data.ERROR_OTHER = 'ERROR_OTHER'; // special value to get errors that are not bound to the fields
Amm.Data.ERROR_GENERIC = 'ERROR_GENERIC'; // default key for errors without proper key
Amm.Data.ERROR_EXCEPTION = 'ERROR_EXCEPTION'; // default key to store exceptions

/**
 * check() occurs only upon direct calling or on save()
 */
Amm.Data.AUTO_CHECK_NEVER = 0;

/**
 * Fields are auto-checked individually; 
 * A field is checked only if it's non-empty AND when it's modified.
 * So if a required field is changed from non-empty to empty, it will produce "required" error.
 * Full check (all fields PLUS expressions and meta) is performed only during check() method
 * (and so before save).
 * 
 * Note: if there are no subscribers to allErrors/localErrors, none auto-check will occur.
 */
Amm.Data.AUTO_CHECK_SMART = 1;

/**
 * Full auto: full check() occurs on every change. (a bit inefficient)
 * Note: if there are no subscribers to allErrors/localErrors, none auto-check will occur.
 */
Amm.Data.AUTO_CHECK_ALWAYS = 2;
/* global Amm */

Amm.Data.MetaProvider = function(options) {
    // set it first so setMeta() will instantiate objects with proper classes
    this._meta = {};
    if (options && 'metaClass' in options) {
        this.metaClass = options.metaClass;
    }
};

Amm.Data.MetaProvider.prototype = {
    
    'MetaProvider': '__INTERFACE__',
    
    metaClass: 'Amm.Data.FieldMeta',
    
    requiredValidatorPrototype: null,
    
    _meta: null,
    
    _combinedMeta: null,
    
    _metaProvider: null,
    
    _requiredValidator: null,
    
    _modelValidators: null,
    
    _metaUpdating: 0,
    
    _metaChanged: false,
    
    setModelValidators: function(modelValidators) {
        if (typeof modelValidators !== 'object') {
            throw Error("modelValidators must be an object or null");
        }
        this._modelValidators = Amm.Data.MetaProvider.checkValidatorsHash(modelValidators, 'modelValidators');
        return true;
    },

    getModelValidators: function() {
        return this._modelValidators; 
    },

    setMetaProvider: function(metaProvider) {
        if (!metaProvider) metaProvider = null;
        var oldMetaProvider = this._metaProvider;
        if (oldMetaProvider === metaProvider) return;
        if (oldMetaProvider) {
            oldMetaProvider.unsubscribe('metaChange', this._handleProviderMetaChange, this);
        }
        this._metaProvider = metaProvider;
        this._combinedMeta = null;
        if (this._metaProvider) {
            this._metaProvider.subscribe('metaChange', this._handleProviderMetaChange, this);
        }
        this.notifyMetaChange(this.getMeta());
        return true;
    },

    getMetaProvider: function() { return this._metaProvider; },
    
    _combineMeta: function() {
        if (this._combinedMeta) return this._combinedMeta;
        if (!this._metaProvider) {
            this._combinedMeta = this._meta;
            return this._meta;
        }
        this._combinedMeta = {};
        Amm.override(this._combinedMeta, this._metaProvider.getMeta(), this._meta);
        return this._combinedMeta;
    },
    
    beginUpdateMeta: function() {
        this._metaUpdating++;
    },
    
    endUpdateMeta: function() {
        if (!this._metaUpdating) throw Error("Cannot call endUpdateMeta() without prior call to beginUpdateMeta()");
        this._metaUpdating--;
        if (!this._metaUpdating && this._metaChanged) {
            this._metaChanged = false;
            this.outMetaChange(this._combineMeta);
        }
    },
    
    
    _createMetas: function(defs, noAssign) {
        var res = {}, i;
        for (i in defs) if (defs.hasOwnProperty(i)) {
            res[i] = this._createMeta(defs[i], i, true);
        }
        if (noAssign) return res;
        this.beginUpdateMeta();
        this._meta = {};
        for (i in res) if (res.hasOwnProperty(i)) {
            this._assignMeta(res[i], i);
        }
        this.endUpdateMeta();
        return res;
    },
    
    _createMeta: function(definition, name, noAssign) {
        var def = {};
        if (name !== undefined) def.name = name;
        def.metaProvider = this;
        var res = Amm.constructInstance(definition, this.metaClass, def, true);
        name = res.getName();
        if (!noAssign && name) this._assignMeta(res, name);
        return res;
    },
    
    _assignMeta: function(meta, field) {
        var old = this._meta[field];
        if (old === meta) return;
        delete this._meta[field];
        if (old) old.setMetaProvider(null); 
        this._meta[field] = meta;
        this.outMetaChange(this._meta, {}, field, undefined, meta, old);
    },
    
    setMeta: function(meta, field, property) {
        // form1: setMeta(meta) -- replace everything
        if (!field) {
            this._createMetas(meta);
            return true;
        }
        if (!property) {
            if (meta) {
                this._createMeta(meta, field);
            } else if (this._meta[field]) { 
                // meta is false -> delete exisiting meta-property
                this._meta[field].setMetaProvider(null);
                delete this._meta[field];
                this.outMetaChange();
            }
            return true;
        }
        var myMeta, providerMeta;
        var myMeta = this._meta[field];
        if (!myMeta && (providerMeta = this._metaProvider.getMeta(field))) {
            // override provider' meta
            this.beginUpdateMeta();
            myMeta = providerMeta.clone(this);
            this._assignMeta(myMeta, field);
            myMeta.setProperty(meta, property);
            this.endUpdateMeta();
            return;
        }
        if (!myMeta) {
            throw Error("Cannot set property of non-existent meta '" + field + "'");
        }
        myMeta.setProperty(meta, property);
    },
    
    getMeta: function(field, property) {
        if (!this._combinedMeta) this._combineMeta();
        if (!field) return Amm.override({}, this._combinedMeta);
        if (!(field in this._combinedMeta)) return undefined;
        if (!property) return this._combinedMeta[field];
        return this._combinedMeta[field][property];
    },
    
    notifyMetaChange: function(meta, field, property, value, oldValue) {
        if (!property) this._combinedMeta = null;
        this.outMetaChange(meta, null, field, property, value, oldValue);
    },
    
    /**
     * oldMeta argument is for compatibility purposes; 
     * always ignored and set to null in every call.
     */
    outMetaChange: function(meta, oldMeta, field, property, value, oldValue) {
        if (!field) { 
            this._combinedMeta = null;
        }
        if (this._metaUpdating) {
            this._metaChanged = true;
            return;
        }
        this._onMetaChange(field, property, value, oldValue);
        return this._out('metaChange', this._combineMeta(), null, field, property, value, oldValue);
    },
    
    _onMetaChange: function(meta, oldMeta, field, property, value, oldValue) {
    },
    
    getRequiredValidator: function() {
        if (this._requiredValidator) return this._requiredValidator;
        var proto = this.requiredValidatorPrototype || Amm.Data.MetaProvider.requiredValidatorPrototype;
        this._requiredValidator = Amm.constructInstance(Amm.override({}, proto), 'Amm.Validator');
        return this._requiredValidator;
    },
    
    getFieldValidators: function(field) {
        var m = this.getMeta(field);
        if (!m) return null;
        var res = [];
        if (m.required) {
            res.push(this.getRequiredValidator());
        }
        var v = m.validators;
        if (v && v.length) res = res.concat(v);
        if (!res.length) return null;
        return res;
    },
    
    _handleProviderMetaChange: function(meta, oldMeta, field, property, value, oldValue) {
        if (!field || !this._meta || !this._meta[field]) {
            this.notifyMetaChange(meta, field, property, value, oldValue);
        }
    }
    
};

Amm.Data.MetaProvider.checkValidatorsHash = function(validators, name) {
    if (!validators) return {};
    var res = {}, validatorsArray;
    for (var i in validators) if (validators.hasOwnProperty(i)) {
        validatorsArray = validators[i];
        if (!validatorsArray) continue;
        if (!(validatorsArray instanceof Array)) validatorsArray = [validatorsArray];
        if (!validatorsArray.length) continue;
        res[i] = Amm.Data.MetaProvider.checkValidatorsArray(validatorsArray, name + "['" + i + "']");
    }
    return res;
};
    
Amm.Data.MetaProvider.checkValidatorsArray = function(validators, name) {
    var res = [], i, l = validators.length;
    for (i = 0; i < l; i++) {
        var v = validators[i];
        if (typeof v === 'function') {
        } else if (typeof v === 'string') {
            if (Amm.getFunction(v, true)) v = Amm.constructInstance(v, 'Amm.Validator');
            else v = new Amm.Expression(v);
        } else if (v && (typeof v === 'object')) {
            if (v.class) v = Amm.constructInstance(v);
            Amm.meetsRequirements(v, ['Amm.Expression', 'Amm.Validator'], name + '[' + i + ']');
        } else {
            throw new Error("name[" + i + "] must be a function, a string or a non-null object");
        }
        res.push(v);
    }
    return res;
};


Amm.Data.MetaProvider.requiredValidatorPrototype = {
    'class': 'Amm.Validator.Required'
};
/* global Amm */

Amm.Data.Mapper = function(options) {
    Amm.Data.MetaProvider.call(this, options);
    Amm.WithEvents.call(this, options);
};

Amm.Data.Mapper.instances = {};

Amm.Data.Mapper.get = function(id, dontThrow) {
    if (this.instances[id] || dontThrow) return this.instances[id] || null;
    throw Error ("No such mapper: '" + id + "'");
};

Amm.Data.Mapper.transactionDefault = null;

Amm.Data.Mapper.prototype = {

    'Amm.Data.Mapper': '__CLASS__',
    
    _id: null,

    /**
     * Key field (if one) or key fields (if many)
     * @type string|array
     */
    _key: 'id',
    
    _recordPrototype: null,
    
    /**
     * Name or constructor of objects that are created by this mapper or associated with it.
     * Is used by Amm.Data.Mapper::construct(), also checked when Amm.Data.Record accepts __mapper.
     * 
     * @type string|function
     */
    _recordClass: null,
    
    /**
     * @type {Amm.Data.Interface}
     */
    _interface: null,
    
    _transactionPrototypes: null,
    
    _uri: null,
    
    requireLoadDataNotEmpty: true,
    
    requireLoadDataHasKey: true,
    
    requireCreateDataHasKey: true,
    
    partialHydrateOnCreate: true,
    
    partialHydrateOnUpdate: true,
    
    setId: function(id) {
        if (typeof id !== 'string' || !id) throw Error("`id` must be a non-empty string");
        var oldId = this._id;
        if (oldId === id) return;
        if (oldId !== null) throw Error("Can setId() only once");
        if (Amm.Data.Mapper.instances[id]) throw Error("Mapper with id '" + id + "' already registered");
        this._id = id;
        return true;
    },

    getId: function() { return this._id; },

    setRecordPrototype: function(recordPrototype) {
        if (!recordPrototype) recordPrototype = {};
        var oldRecordPrototype = this._recordPrototype;
        if (oldRecordPrototype === recordPrototype) return;
        if (oldRecordPrototype !== null) throw Error("can setRecordPrototype() only once");
        this._recordPrototype = recordPrototype;
        return true;
    },

    getRecordPrototype: function() { return this._recordPrototype? Amm.override({}, this._recordPrototype) : {}; },
    
    setKey: function(key) {
        var oldKey = this._key;
        if (oldKey === key) return;
        this._key = key;
        return true;
    },

    getKey: function() { return this._key; },
    
    setRecordClass: function(recordClass) {
        var oldRecordClass = this._recordClass;
        if (oldRecordClass === recordClass) return;
        if (oldRecordClass !== recordClass) throw Error("can setRecordClass() only once");
        this._recordClass = recordClass;
        return true;
    },

    getRecordClass: function() { return this._recordClass; },
    
    construct: function(objectOrArray) {
        if (!objectOrArray || typeof objectOrArray !== 'object')
            throw Error("`objectOrArray` must be an object");
        
        if (objectOrArray instanceof Array || objectOrArray['Amm.Array']) {
            var res = [];
            for (var i = 0, l = objectOrArray.length; i < l; i++) {
                res.push(this.construct(objectOrArray[i]));
            }
            return res;
        }
        if (Amm.getClass(objectOrArray)) throw Error("`objectOrArray` must have no class");
        var cl = this.getRecordClass() || Amm.Data.Record, constructor = Amm.getFunction(cl);
        var proto = Amm.override({}, objectOrArray);
        proto._mapper = this;
        return new constructor (proto);
    },

    setUri: function(uri) {
        var oldUri = this._uri;
        if (oldUri === uri) return;
        this._uri = uri;
        return true;
    },

    getUri: function() { return this._uri; },
    
    setTransactionPrototypes: function(transactionPrototypes) {
        if (typeof transactionPrototypes !== 'object') {
            throw Error("transactionPrototypes must be an object or null");
        }
        var oldTransactionPrototypes = this._transactionPrototypes;
        if (oldTransactionPrototypes === transactionPrototypes) return;
        this._transactionPrototypes = transactionPrototypes;
        return true;
    },

    getTransactionPrototypes: function() { return this._transactionPrototypes; },
    
    createTransaction: function(type, key, data) {
        var prototypes = this._transactionPrototypes || {};
        var globalDefault = Amm.Data.Mapper.transactionDefault? Amm.override({}, Amm.Data.Mapper.transactionDefault) : {};
        var proto = prototypes.default? Amm.overrideRecursive(globalDefault, prototypes.default) : {};
        if (prototypes[type]) {
            if (prototypes[type].noDefault) proto = Amm.override({}, prototypes[type]);
            else proto = Amm.overrideRecursive(prototypes[type], proto);
        }
        if (!proto.class) proto.class = 'Amm.Data.HttpTransaction';
        if (!proto.uri && this._uri) proto.uri = this._uri;
        var res = Amm.constructInstance(proto, 'Amm.Data.Transaction', {type: type, key: key || null, data: data || null});
        res.subscribe('validateResult', this._validateTransactionResult, this);
        return res;
    },
    
    extractKey: function(data) {
        var k = this._key;
        if (!(k instanceof Array)) {
            if (k in data) return data[k];
            return undefined;
        }
        var res = [], i, l = k.length;
        for (var i = 0; i < l; i++) {
            if (k[i] in data) res.push(this.o._old[k[i]]);
            else break;
        }
        if (res.length === l) return res;
        return undefined;
    },
    
    _validateTransactionResult: function(result, transaction) {
        var data = result.getData() || {};
        if (transaction.getType() === Amm.Data.Transaction.TYPE_LOAD) {
            if (this.requireLoadDataNotEmpty) {
                var isEmpty = true;
                for (var i in data) if (data.hasOwnProperty(i)) {
                    isEmpty = false;
                    break;
                }
                if (isEmpty) throw Error("TYPE_LOAD transaction result contains no data");
            }
            if (this.requireLoadDataHasKey) {
                if (this.extractKey(data) === undefined) {
                    throw Error("Data of TYPE_LOAD transaction result contains no key");
                }
            }
        } else if (transaction.getType() === Amm.Data.Transaction.TYPE_CREATE) {
            if (this.requireCreateDataHasKey) {
                if (this.extractKey(data) === undefined) {
                    throw Error("Data of TYPE_CREATE transaction result contains no key");
                }
            }
        }
        transaction.unsubscribe('validateResult', this._validateTransactionResult, this);
    },
    
};

Amm.extend(Amm.Data.Mapper, Amm.WithEvents);
Amm.extend(Amm.Data.Mapper, Amm.Data.MetaProvider);

/* global Amm */

Amm.Data.Model = function(options) {

    if (!options) options = {};
    else options = Amm.override({}, options);

    this._old = {};
    this._data = {};
    this._propNames = {};
    
    var i;

    Object.defineProperty(this, 'mm', {
        get: function() { return this.getMm(); },
        set: function() {}
    });
    
    var newOptions = this._preInitOptions(options);
    if (newOptions !== undefined) options = newOptions;

    var mmOptions = null;
    if (options.mm && typeof options.mm === 'object') mmOptions = options.mm;
    this._mm = new (Amm.getFunction(this._metaClass)) (this, options.mm || {});
    delete options.mm;
    
    // all options except "on__" and functions are considered properties
    Amm.WithEvents.call(this, options, true);
    for (i in options) if (options.hasOwnProperty(i)) {
        if (typeof options[i] === 'function') {
            this[i] = options[i];
            delete options[i];
        }
    }
    var hasOtherProps = false;
    for (i in options) if (options.hasOwnProperty(i)) {
        hasOtherProps = true;
        break;
    }
    if (hasOtherProps) this._initData(options);
    
};

Amm.Data.Model.prototype = {
    
    _metaClass: 'Amm.Data.ModelMeta',
    
    /**
     * { field: value } hash of current values
     * 
     * @type object
     */
    _data: null,
    
    /**
     * { field: value } hash of original (source-provided) values.
     * Also contains current key that will be used when we need to modify the key during the saving.
     * Updated when object is loaded/saved.
     * 
     * @type object 
     */
    _old: null,

    /**
     * ModelMeta instance that is responsible for working with current object.
     * @type Amm.Data.ModelMeta
     */
    _mm: null,
    
    /**
     * Whether cleanup in progress
     * @type bool
     */
    _cu: false,
    
    _state: Amm.Data.STATE_NEW,
    
    _propNames: null,
    
    _preUpdateValues: null,
    
    /**
     * Contains three hashes: local, remote, all
     */
    _errors: null,
    
    /**
     * Contains three hashes: local, remote, all
     */
    _oldErrors: null,
    
    _preInitOptions: function(options) {
    },
    
    _initData: function(options) {
        this.mm.hydrate(options);
    },
    
    /**
     * @returns {Amm.Data.ModelMeta}
     */
    getMm: function() {
        return this._mm;
    },
    
    // mm is read-only; does nothing
    setMm: function() {
    },
    
    // added for compatibility with observers; never fires
    outMmChange: function() {
    },
    
    _doOnActual: function(forSave) {
    },
    
    _doOnCheck: function() {
    },
    
    _checkField: function(field, value) {
    },
    
    _handleMissingEvent: function(eventName, handler, scope, extra) {
        
        // we alllow to subscribe to change events of arbitrary properties 
        // because there are times when properties are created 
        // AFTER the event handlers are attached
        
        if (eventName.match(/Change$/)) return true;
    },
    
    cleanup: function() {
        if (this._cu) return;
        this._cu = true;
        this.mm.cleanup();
        this._data = {};
        this._old = {};
        Amm.WithEvents.prototype.cleanup.call(this);
    }
    
};

Amm.extend(Amm.Data.Model, Amm.WithEvents);/* global Amm */

Amm.Data.HttpResponse = function(options) {
    
    this.httpHeaders = [];
    
    Amm.init(this, options);
    
    
};

Amm.Data.HttpResponse.prototype = {
    
    'Amm.Data.HttpResponse': '__CLASS__',
    
    isError: false,
    
    errorText: "",
    
    rawContent: null,
    
    parsedContent: null,
    
    httpHeaders: null,
    
    httpCode: null,
    
};/* global Amm */

Amm.Data.Record = function(options) {
    Amm.Data.Model.call(this, options);
};

Amm.Data.Record.prototype = {

    'Amm.Data.Record': '__CLASS__',
    
    _metaClass: 'Amm.Data.RecordMeta',
    
    /**
     * @type {Amm.Data.Mapper}
     */
    _mapper: null,
    
    _preInitOptions: function(options) {
    
        var mapper;
        if (!options.__mapper) throw Error("__mapper is required");
        if (options.__mapper['Amm.Data.Mapper']) mapper = options.__mapper;
        else mapper = Amm.Data.Mapper.get(options.__mapperId);
        this._mapper = mapper;

        var requiredClass = this._mapper.getRecordClass();
        if (requiredClass && !Amm.is(this, requiredClass)) {
            throw Error(
                "Cannot use instance of " + Amm.getClass(this)
                + " with mapper " + mapper.getId()
                + "; required class is " + requiredClass
            );
        }
        options = Amm.override(this._mapper.getRecordPrototype(), options);
        delete options.__mapper;
        return options;
        
    },
    
    _doOnActual: function(forSave) {
    },
    
    /**
     * possible return values: 
     * - FALSE to abort loading; 
     * - any other value than undefined will replace the key that will be used to load record
     */
    _doBeforeLoad: function(keyArg) {
    },
    
    _doAfterLoad: function() {
    },
    
    _doBeforeDelete: function() {
    },
    
    _doAfterDelete: function() {
    },
    
    _doBeforeSave: function() {
    },
    
    _doAfterSave: function() {
    },
    
};

Amm.extend(Amm.Data.Record, Amm.Data.Model);
/* global Amm */

Amm.Data.Transaction = function(options) {
    var run = false;
    var tmp;
    if (options && 'run' in options) {
        tmp = Amm.override({}, options);
        options = tmp;
        run = options.run;
        delete options.run;
    }
    if (this['Amm.Data.Transaction'] === '__CLASS__') {
        throw Error("Attempt to instantiate abstract class: Amm.Data.Transaction");
    }
    Amm.WithEvents.call(this, options);
    if (run) this.run();
};

Amm.Data.Transaction.TYPE_CREATE = 'create';
Amm.Data.Transaction.TYPE_LOAD = 'load';
Amm.Data.Transaction.TYPE_UPDATE = 'update';
Amm.Data.Transaction.TYPE_DELETE = 'delete';

Amm.Data.Transaction.STATE_INIT = 'init';
Amm.Data.Transaction.STATE_RUNNING = 'running';
Amm.Data.Transaction.STATE_SUCCESS = 'success';
Amm.Data.Transaction.STATE_FAILURE = 'failure';
Amm.Data.Transaction.STATE_CANCELLED = 'cancelled';

/** 
 * Requirements for different types of transactions
 * 
 * true: means given property is required to be non-null and non-undefined
 * false: means given property is required to be null or undefined
 */

Amm.Data.Transaction.DEFAULT_REQUIREMENTS = {
};

Amm.Data.Transaction.DEFAULT_REQUIREMENTS
    [Amm.Data.Transaction.TYPE_CREATE] = { key: false, data: true };

Amm.Data.Transaction.DEFAULT_REQUIREMENTS
    [Amm.Data.Transaction.TYPE_LOAD] = { key: true, data: false };

Amm.Data.Transaction.DEFAULT_REQUIREMENTS
    [Amm.Data.Transaction.TYPE_UPDATE] = { key: true, data: true };

Amm.Data.Transaction.DEFAULT_REQUIREMENTS
    [Amm.Data.Transaction.TYPE_DELETE] = { key: true, data: false };

Amm.Data.Transaction.prototype = {
    
    'Amm.Data.Transaction': '__CLASS__',

    _type: null,

    _state: Amm.Data.Transaction.STATE_INIT,
    
    /**
     * Transaction key (usually ID of object that transaction is applied on).
     * Required to be non-null for transactions with types 'load', 'update' and 'delete'.
     * Required to be null for transaction with type 'create'
     * @type string|array|null
     */
    key: null,
    
    /**
     * Transaction data (usually properties of object that are set).
     * @type object
     */
    data: null,
    
    /**
     * @type object
     * Overrides for Amm.Data.Transaction.DEFAULT_REQUIREMENTS
     */
    requirements: null,
    
    _unparsedResponseClass: null,

    setType: function(type) {
        this._type = type;
    },
    
    getType: function() {
        return this._type;
    },

    setState: function(state) {
        var oldState = this._state;
        if (oldState === state) return;
        this._state = state;
        this.outStateChange(state, oldState);
        return true;
    },

    getState: function() { return this._state; },
    
    outStateChange: function(state, oldState) {
        return this._out('stateChange', state, oldState);
    },
    
    setResult: function(result) {
        if (!result || !result['Amm.Data.TransactionResult'])
            throw Error("`result` must be Amm.Data.TransactionResult");
        var oldResult = this._result;
        if (oldResult === result) return;
        if (this._result) throw new Error("can setResult only once");
        if (!result.getIsError()) { // check result that is presumably correct
            try {
                this.outValidateResult(result, this);
            } catch (e) {
                result.setException(e);
            }
        }
        result.makeImmutable();
        this._result = result;
        if (result.getIsError()) this.setState(Amm.Data.Transaction.STATE_FAILURE);
            else this.setState(Amm.Data.Transaction.STATE_SUCCESS);
        this.outResultChange(result, oldResult);
    },
    
    getResult: function() {
        return this._result;
    },
    
    outValidateResult: function(result, transaction) {
        return this._out('validateResult', result, transaction);
    },
    
    outResultChange: function(result, oldResult) {
        return this._out('resultChange', result, oldResult);
    },
    
    _setException: function(exception, extra) {
        var proto = {
            exception: exception
        };
        if (extra) Amm.override(proto, extra);
        this.setResult(new Amm.Data.TransactionResult(proto));
    },
    
    validate: function(throwException) {
        
        var rq;
        
        if (this.requirements) {
            rq = Amm.override({}, this.requirements, Amm.Data.Transaction.DEFAULT_REQUIREMENTS);
        } else {
            rq = Amm.Data.Transaction.DEFAULT_REQUIREMENTS;
        }
        
        if (!rq[this._type]) return; // everything ok
        
        for (var i in rq[this._type]) if (rq[this._type].hasOwnProperty(i)) {
            var should = !!rq[this._type][i];
            var has = this[i] !== undefined && this[i] !== null;
            if (should !== has) {
                if (!throwException) return false;
                throw Error("Transaction doesn't meet requirements for type '"
                    + this._type + "': property '" + i + "' is " + 
                    (has? "non-empty" : "empty") + ' while it should be ' + 
                    (should? "non-empty" : "empty")
                );
            }
        }
        
        return true;
        
    },
    
    run: function() {
        if (this._state !== Amm.Data.Transaction.STATE_INIT) {
            throw Error("Can run() only from Amm.Data.Transaction.STATE_INIT");
        }
        try {
            
            this.validate(true);
            var handled = {handled: false};
            this.outRun(handled);
            if (!handled.handled) this._runDefault();
            if (this._state === Amm.Data.Transaction.STATE_INIT) {
                this.setState(Amm.Data.Transaction.STATE_RUNNING);
            }
            
        } catch (e) {
            
            console.warn(e);
            this._setException(e);
        }
    },
    
    outRun: function(handled) {
        return this._out('run', handled);
    },
    
    _runDefault: function() {
        throw Error("Call to abstract method");
    },
    
    _parseDefault: function(unparsedResponse) {
        throw Error("Call to abstract method");
    },
    
    cancel: function() {
        if (this._state !== Amm.Data.Transaction.STATE_RUNNING) {
            throw Error("Can cancel() only Transaction with STATE_RUNNING");
        }
        var handled = { handled: false };
        this.outCancel(handled);
        if (!handled) {
            this._cancelDefault();
        }
        this.setState(Amm.Data.Transaction.STATE_CANCELLED);
    },
    
    outCancel: function(handled) {
        return this._out('cancel', handled);
    },
    
    _cancelDefault: function() {
        throw Error("Call to abstract method");
    },
    
    setUnparsedResponse: function(unparsedResponse) {
        if (!unparsedResponse || typeof unparsedResponse !== 'object') {
            throw Error("`unparsedResponse` must be an object");
        }
        if (this._unparsedResponseClass) {
            Amm.is(unparsedResponse, this._unparsedResponseClass, 'unparsedResponse');
        }
        var tr = {
            transactionResult: null
        };
        try {
            var resultInstance = null;
            this.outParseResponse(unparsedResponse, tr);
            if (!tr.transactionResult) tr.transactionResult = this._parseDefault(unparsedResponse);
            resultInstance = Amm.constructInstance(tr.transactionResult, Amm.Data.TransactionResult);
            if (!resultInstance.getImmutable()) {
                resultInstance.setUnparsedResponse(unparsedResponse);
            }
            this.setResult(resultInstance);
        } catch (e) {
            if (!this._result) this._setException(e);
            else throw e;
        }
    },
    
    /**
     * @param {object} unparsedResponse
     * @param {object} tr.transactionResult Out - will be used as Amm.Data.TransactionResult
     */
    outParseResponse: function(unparsedResponse, tr) {
        return this._out(unparsedResponse, tr);
    },
    
    cleanup: function() {
        if (this._state === Amm.Data.Transaction.STATE_RUNNING) this.cancel();
        Amm.WithEvents.prototype.cleanup.call(this);
    }
    
};

Amm.extend(Amm.Data.Transaction, Amm.WithEvents);/* global Amm */

Amm.Data.TransactionResult = function(options) {
    
    Amm.init(this, options);
    
};

Amm.Data.TransactionResult.ERROR_TYPE_NONE = null;

/**
 * We weren't able to produce request or parse response
 */ 
Amm.Data.TransactionResult.ERROR_TYPE_CLIENT = 'client';

/**
 * HTTP protocol error (i.e. 500 or 404)
 */
Amm.Data.TransactionResult.ERROR_TYPE_HTTP = 'http';

/**
 * Server or 'soft' error - valid request that we couldn't satisfy
 */
Amm.Data.TransactionResult.ERROR_TYPE_SERVER = 'server';

Amm.Data.TransactionResult._revErrorType = {
    client: 'CLIENT',
    http: 'HTTP',
    server: 'SERVER'
};

Amm.Data.TransactionResult.prototype = {
    
    'Amm.Data.TransactionResult': '__CLASS__',

    /**
     * Unparsed response that was source of this Result
     */
    _unparsedResponse: null,

    /**
     * One of Amm.Data.TransactionResult.ERROR_TYPE_* constants -- what kind of error occured
     * @type string|null
     */
    _errorType: null,

    /**
     * Structured response data (usually to update object fields)
     * @type object
     */
    _data: null,
    
    /**
     * Structured error data ({[field]: error_in_that_field})
     * @type type
     */
    _errorData: null,

    /**
     * Exception that caused the error (if any)
     * @type type
     */
    _exception: null,

    /**
     * Unstructured (textual) error data
     * @type string
     */
    _error: null,
    
    /**
     * If TRUE, setters that change TransactionResult' properties will throw exception
     * @type Boolean
     */
    _immutable: false,

    setUnparsedResponse: function(unparsedResponse) {
        if (!unparsedResponse) unparsedResponse = null;
        if (typeof unparsedResponse !== 'object')
            throw Error("`unparsedResponse` must be an object");
        var oldUnparsedResponse = this._unparsedResponse;
        if (oldUnparsedResponse === unparsedResponse) return;
        this._checkMutability();
        this._unparsedResponse = unparsedResponse;
        return true;
    },
    
    getUnparsedResponse: function() { return this._unparsedResponse; },
    
    _checkMutability: function() {
        if (this._immutable) {
            throw Error("Cannot change property of immutable TransactionResult");
        }
    },

    setErrorType: function(errorType) {
        if (!errorType) errorType = null;
        if (errorType && !(errorType in Amm.Data.TransactionResult._revErrorType)) {
            throw Error ("`errorType` must be one of Amm.Data.TransactionResult.ERROR_TYPE_ constants");
        }
        var oldErrorType = this._errorType;
        if (oldErrorType === errorType) return;
        this._checkMutability();
        this._errorType = errorType;
        if (!this._errorType && this._error) {
            this.setError(null);
        } else if (this._errorType && !this._error) {
            this.setError({});
        }
        return true;
    },
    
    getErrorType: function() { return this._errorType; },

    setData: function(data) {
        var oldData = this._data;
        if (oldData === data) return;
        this._checkMutability();
        this._data = data;
        return true;
    },

    getData: function() { return this._data; },
    
    setErrorData: function(errorData) {
        var oldErrorData = this._errorData;
        if (oldErrorData === errorData) return;
        this._checkMutability();
        this._errorData = errorData;
        return true;
    },

    getErrorData: function() { return this._errorData; },
    
    setException: function(exception) {
        var oldException = this._exception;
        if (oldException === exception) return;
        this._checkMutability();
        this._exception = exception;
        // exceptions usually imply ERROR_TYPE.CLIENT
        if (!this._errorType) this.setErrorType('client');
        return true;
    },

    getException: function() { return this._exception; },

    setError: function(error) {
        var oldError = this._error;
        if (oldError === error) return;
        this._checkMutability();
        this._error = error;
        return true;
    },

    getError: function() { return this._error; },
    
    getIsError: function() {
        return !!this._errorType;
    },
    
    getIsSuccess: function() {
        return !this._errorType;
    },
    
    makeImmutable: function() {
        this._immutable = true;
    },
    
    getImmutable: function() {
        return this._immutable;
    }
    
};

/* global Amm */

Amm.Data.Interface = function() {
    
};

Amm.Data.Interface.prototype = {
    
    _uri: null,
    
    _key: null,
    
    /**
     * @param {object} data
     * @returns {Amm.Data.Transaction}
     */
    actionCreate: function(data) {
        
    },
    
    /**
     * @param {string|object} key
     * @returns {Amm.Data.Transaction}
     */
    actionLoad: function(key) {
        
    },
    
    
    /**
     * @param {string|object} key
     * @param {object} data
     * @returns {Amm.Data.Transaction}
     */
    actionUpdate: function(key, data) {
        
    },
    
    /**
     * @param {string|object} key
     * @returns {Amm.Data.Transaction}
     */
    actionDelete: function(key) {
        
    },
    
    
};


// Amm.extend(Amm.Data.Interface, Amm.Data)
/* global Amm */

Amm.Data.ModelMeta = function(model, options) {
    this._m = model;
    Object.defineProperty(this, 'm', {value: model, writable: false});
    Amm.WithEvents.call(this, options);
};

Amm.Data.ModelMeta.prototype = {

    'Amm.Data.ModelMeta': '__CLASS__', 
    
    /**
     * @type {Amm.Data.Record}
     */
    _m: null,
    
    /**
     * @type {Amm.Data.Mapper}
     */
    _mapper: null,
    
    _updateLevel: 0,
    
    _modified: null,
    
    _transaction: null,

    _lastTransaction: null,
    
    _oldState: null,
    
    _checked: false,
    
    _cu: false,
    
    _propertiesChanged: false,
    
    _fieldMeta: null,
    
    _validators: null,
    
    /**
     * Means doOnCheck will occur every time when get*Errors() or, when anything is subscribed
     * to localErrorsChange / errorsChange events, instantly after every change (with respect
     * to updateLevel).
     * 
     * Should be one of Amm.Data.AUTO_CHECK_ constants
     */
    _autoCheck: Amm.Data.AUTO_CHECK_SMART,
    
    /**
     * Means all local errors are reset when object is hydrated w/ STATE_EXISTS
     * and not modified; onCheck() will skip _doOnCheck() in this case too.
     * 
     * @type Boolean
     */ 
    _validWhenHydrated: true,

    getObject: function() { return this._m; },
    
    getO: function() { return this._m; },
    
    hydrate: function(data, partial, noTrigger) {
        this.beginUpdate();
        if (!partial) {
            this._m._old = {};
            this._m._data = {};
        }
        for (var i in data) if (data.hasOwnProperty(i)) {
            this._m._old[i] = data[i];
            this._m._data[i] = data[i];
            if (!this._m._propNames[i]) this._createProperty(i);
        }
        if (this.getKey()) {
            this.setState(Amm.Data.STATE_EXISTS);
            if (!noTrigger) this._m._doOnActual(false);
        } else {
            this.setState(Amm.Data.STATE_NEW);
        }
        this.outHydrate();
        this.endUpdate();
    },
    
    outHydrate: function() {
        return this._out('hydrate');
    },
    
    listDataFields: function() {
        return Amm.keys(this._m._data);
    },
    
    getData: function() {
        return Amm.override({}, this._m._data);
    },
    
    beginUpdate: function() {
        this._updateLevel++;
        if (this._updateLevel > 1) return;
        this._m._preUpdateValues = this.getData();
    },
    
    endUpdate: function() {
        if (!this._updateLevel) 
            throw Error ("Call to endUpdate() without corresponding beginUpdate(); check with getUpdateLevel() first");
        this._updateLevel--;
        if (this._updateLevel) return;
        var pv = this._m._preUpdateValues;
        var v = this._m._data, oldVal, newVal;
        for (var i in pv) if (pv.hasOwnProperty(i)) {
            oldVal = pv[i];
            newVal = v[i];
            delete pv[i];
            if (newVal !== oldVal) this._reportFieldChange(i, newVal, oldVal, true);
            if (this._m._updateLevel) break; // in case event handler done beginUpdate()
        }
        if (this._oldState !== null) {
            if (this._oldState !== this._m.state) {
                var oldState = this._oldState;
                this._oldState = null;
                this.outStateChange(this._m._state, this._oldState);
            }
        }
        this._checkModified();
        if (this._propertiesChanged) {
            this._propertiesChanged = false;
            this.outPropertiesChanged();
        }
        if (this._m._oldErrors !== null) {
            this._endUpdateErrors();
        }
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    _checkFieldModified: function(field) {
        var modified = false;
        if (field in this._m._data) {
            if (!(field in this._m._old) || this._m._old[field] !== this._m._data[field])
            modified = true;
        }
        if (modified !== this._modified) this._checkModified();
    },
    
    _checkModified: function() {
        var modified = false;
        for (var i in this._m._data) if (this._m._data.hasOwnProperty(i)) {
            if (!(i in this._m._old) || this._m._old[i] !== this._m._data[i]) {
                modified = true;
                break;
            }
        }
        this.setModified(modified);
    },
    
    _reportFieldChange: function(field, val, oldVal, dontReportModified) {
        if (this._updateLevel) return;
        
        var propName = this._m._propNames[field];
        var outName = 'out' + propName.charAt(0).toUpperCase() + propName.slice(1) + 'Change';
        
        this._correctCheckStatus(field, val || oldVal);
        
        this._m[outName](val, oldVal);
        if (!dontReportModified) {
            this._checkFieldModified(field);
        }
    },

    setModified: function(modified) {
        var oldModified = this._modified;
        if (oldModified === modified) return;
        this._modified = modified;
        this.outModifiedChange(modified, oldModified);
        if (!this._modified) this._checkHydratedAndValid(true);
        return true;
    },

    getModified: function(field) { 
        if (field) {
            return this._m._old[field] !== this._m._data[field];
        }
        return this._modified;
    },
    
    getOldValue: function(field) {
        return this._m._old[field];
    },

    outModifiedChange: function(modified, oldModified) {
        this._out('modifiedChange', modified, oldModified);
    },
    
    revert: function() {
        this.beginUpdate();
        this._m._data = Amm.override({}, this._m._old);
        this.endUpdate();
    },
    
    isSpecial: function(field) {
        return field in this.constructor.prototype;
    },
    
    getFieldValue: function(field) {
        return this._m._data[field];
    },
    
    setFieldValue: function(field, value) {
        var old = this._m._data[field];
        if (old === value) return;
        this._m._data[field] = value;
        if (this._updateLevel) return;
        this._reportFieldChange(field, value, old);
    },
    
    _createProperty: function(field) {
        if (field in this._m._propNames) throw Error("Amm.Data.Record already has property for field '" + field + "'");
        var propName = field, suff = '';
        while (this.isSpecial(propName)) {
            propName = field + 'Field' + suff;
            suff = (suff || 1) + 1;
        }
        this._m._propNames[field] = propName;
        var sfx = propName.slice(1);
        var u = propName.charAt(0).toUpperCase() + sfx;
        var l = propName.charAt(0).toLowerCase() + sfx;
        var eventName = l + 'Change';
        var outName = 'out' + u + 'Change';
        var setterName = 'set' + u;
        var getterName = 'get' + u;
        
        if (!(getterName in this._m)) {
            this._m[getterName] = function() {
                return this._data[field];
            };
        }
        if (!(setterName in this._m)) {
            this._m[setterName] = function(value) {
                return this.mm.setFieldValue(field, value);
            };
        }
        if (!(outName in this._m)) {
            this._m[outName] = function(value, oldValue) {
                if (this._updateLevel) return;
                return this._out(eventName, value, oldValue);
            };
        }
        Object.defineProperty(this._m, propName, {
            enumerable: true,
            get: this._m[getterName],
            set: this._m[setterName]
        });
        
        // we need to create pre-update values' key so change event will be triggered
        // during endUpdate()
        if (!(field in this._m._preUpdateValues)) {
            this._m._preUpdateValues[field] = undefined;
        }
        
        if (!this._updateLevel) this.outPropertiesChanged();
        else this._propertiesChanged = true;
        
        return propName;
    },
    
    outPropertiesChanged: function() {
        return this._out('propertiesChanged');
    },
    
    getState: function() {
        return this._m._state;
    },
    
    setState: function(state) {
        var oldState = this._m._state;
        if (oldState === state) return;
        if (!Amm.Data.StateEnum[state]) 
            throw Error("`state` must be one of Amm.Data.STATE_ values; given: '" + state + "'");
        this._m._state = state;
        if (!this._updateLevel) {
            this.outStateChange(state, oldState);
            return;
        }
        if (this._oldState === null) {
            this._oldState = oldState;
        }
    },
    
    outStateChange: function(state, oldState) {
        return this._out('stateChange', state, oldState);
    },
    
    _hasLocalErrors: function() {
        if (this._m._errors.local) {
            // fail if we have any local errors
            for (var i in this._m._errors.local) {
                if (this._m._errors.local.hasOwnProperty(i)) return true;
            }
        }
        return false;
    },
    
    check: function(again) {
        if (this._checked && !again) return !this._hasLocalErrors();
        if (this._checkHydratedAndValid(true)) return true;
        this._beginUpdateErrors();
        this._m._errors.local = {};
        this._coreCheckFields();
        this._coreCheckWhole();
        this._m._doOnCheck();
        this._checked = true;
        this._endUpdateErrors();
        return !this._hasLocalErrors();
    },
    
    _coreCheckFields: function(field) {
        // check individual fields first
        var hasFieldCheckFn = this._m._checkField !== Amm.Data.Record.prototype._checkField;
        // everything a-ok
        var fieldsSrc;
        if (field) {
            if (!this._m._propNames[field]) return;
            fieldsSrc = {};
            fieldsSrc[field] = this._m._propNames[field];
        } else {
            fieldsSrc = this._m._propNames;
        }
        var err, i, j, l, v, validators;
        for (i in fieldsSrc) if (fieldsSrc.hasOwnProperty(i)) {
            v = this._m._data[i];
            if (hasFieldCheckFn) {
                err = this._m._checkField(i, v);
                if (err === false) err = Amm.translate("lang.Amm.ModelMeta.invalidFieldValue");
                if (err) {
                    this.addError(err, i);
                }
            }
            
            validators = this.getFieldValidators(i);
            if (!validators) continue;
            if (!(validators instanceof Array)) validators = [validators];
            var label = this.getMeta(i, 'label') || i;
            for (var j = 0, l = validators.length; j < l; j++) {
                if (typeof validators[j] === 'function') {
                    err = validators[j](v, label);
                }
                else if (typeof validators[j].getError === 'function') {
                    err = validators[j].getError(v, label);
                }
                if (err) {
                    err = err.replace(/%field/g, label);
                    // we stop on first error
                    this.addError(err, i);
                    break;
                }
            }
            if (!err) delete this._m._errors.local[i];
        }
    },
    
    _coreCheckWhole: function() {
        var modelValidators = this._mapper.getModelValidators();
        if (!modelValidators) return;
        for (var key in modelValidators) if (modelValidators.hasOwnProperty(key)) {
            var vals = modelValidators[key];
            var error;
            for (var j = 0, l = vals.length; j < l; j++) {
                var val = vals[j];
                if (val['Amm.Expression']) { // check for cached function
                    if (!val.__func) val.__func = val.toFunction();
                    val.__func.env.expressionThis = this._m;
                    error = val.__func();
                }
                else if (val['Amm.Validator']) {
                    error = val.getError(this);
                }
                else if (typeof val === 'function') { // check it is an expression
                    error = val.call(this._m);
                } else {
                    throw Error("modelValidators['" + key + "'] must be either a function, an Amm.Expression or an Amm.Validator; provided: " 
                        + Amm.describeType(modelValidators[key]));
                }
                if (error === false) error = Amm.translate(key);
                if (error) {
                    this.addError(error, key);
                    continue;
                }
            }
        }
    },
    
    setChecked: function(checked) {
        var oldChecked = this._checked;
        if (oldChecked === checked) return;
        this._checked = checked;
        this.outCheckedChange(checked, oldChecked);
        return true;
    },

    getChecked: function() { return this._checked; },

    outCheckedChange: function(checked, oldChecked) {
        this._out('checkedChange', checked, oldChecked);
    },
    
    setAutoCheck: function(autoCheck) {
        if (typeof autoCheck === 'boolean') autoCheck = autoCheck + 0;
        else if (typeof autoCheck === 'string') autoCheck = parseInt(autoCheck);
        if (autoCheck !== Amm.Data.AUTO_CHECK_NEVER && autoCheck !== Amm.Data.AUTO_CHECK_ALWAYS && autoCheck !== Amm.Data.AUTO_CHECK_SMART) {
            throw Error("Invalid autoCheck value; must be one of Amm.Data.AUTO_CHECK_ constants");
        }
        var oldAutoCheck = this._autoCheck;
        if (oldAutoCheck === autoCheck) return;
        this._autoCheck = autoCheck;
        if (autoCheck) this._instaCheck();
        return true;
    },

    getAutoCheck: function() { return this._autoCheck; },

    setValidWhenHydrated: function(validWhenHydrated) {
        var oldValidWhenHydrated = this._validWhenHydrated;
        if (oldValidWhenHydrated === validWhenHydrated) return;
        this._validWhenHydrated = validWhenHydrated;
        if (validWhenHydrated) this._checkHydratedAndValid(true);
        else if (this.getState() === Amm.Data.STATE_EXISTS && !this._modifierd) {
            if (this._autoCheck === Amm.Data.AUTO_CHECK_ALWAYS) {
                this._instaCheck(true);
            } else {
                this.setChecked(false);
            }
        }
        return true;
    },

    getValidWhenHydrated: function() { return this._validWhenHydrated; },
    
    _checkHydratedAndValid: function(resetErrors) {
        if (!this._validWhenHydrated) return;
        if (this._modified || this.getState() !== Amm.Data.STATE_EXISTS) return;
        if (resetErrors) this.setLocalErrors({});
        return true;
    },
    
    _correctCheckStatus: function(field, hasValue) {
        if (this._autoCheck === Amm.Data.AUTO_CHECK_SMART && hasValue) {
            this._beginUpdateErrors();
            this.setChecked(false);
            this._coreCheckFields(field);
            this._endUpdateErrors();
        } else if (this._autoCheck === Amm.Data.AUTO_CHECK_ALWAYS) {
            this._instaCheck(true);
        } else {
            this.setChecked(false);
        }
    },
    
    _instaCheck: function(recheck) {
        if (this._checked && !recheck) return;
        if (!this._autoCheck) return;
        if (recheck) this._checked = false;
        if (!this._subscribers.localErrorsChange && !this._subscribers.errorsChange) return;
        if (this._autoCheck === Amm.Data.AUTO_CHECK_ALWAYS) {
            this.check();
            return;
        }
    },

    _beginUpdateErrors: function() {
        if (!this._subscribers.localErrorsChange && !this._subscribers.remoteErrorsChange && !this._subscribers.errorsChange) {
            this._m._oldErrors = false; // special value means we defer JSON calculation
        }
        if (!this._m._errors) this._m._errors = {local: {}, remote: {}};
        this._combineErrors();
        if (!this._m._oldErrors) this._m._oldErrors = {
            local: JSON.stringify(this._m._errors.local),
            remote: JSON.stringify(this._m._errors.remote),
            all: JSON.stringify(this._m._errors.all)
        }; 
    },
    
    _subscribeFirst_localErrorsChange: function() {
        if (this._m._oldErrors === false) this._beginUpdateErrors();
    },
    
    _subscribeFirst_remoteErrorsChange: function() {
        return this._subscribeFirst_localErrorsChange();
    },
    
    _subscribeFirst_errorsChange: function() {
        return this._subscribeFirst_localErrorsChange();
    },
    
    _endUpdateErrors: function() {
        this._m._errors.all = null; // to be calculated
        if (this._updateLevel) return; // nothing to do yet
        if (!this._m._oldErrors) return; // nothing to do at all
        if (!this._m._errors) if (!this._m._errors) this._m._errors = {local: {}, remote: {}};
        else {
            if (!this._m._errors.local) this._m._errors.local = {};
            if (!this._m._errors.remote) this._m._errors.remote = {};
        }
        var oldErrors = this._m._oldErrors;
        this._m._oldErrors = null;
        if (!this._subscribers.localErrorsChange && !this._subscribers.remoteErrorsChange && !this._subscribers.errorsChange) {
            return;
        }
        var localChanged = oldErrors.local !== JSON.stringify(this._m._errors.local);
        var remoteChanged = oldErrors.remote !== JSON.stringify(this._m._errors.remote);
        if (!localChanged && !remoteChanged) {
            return;
        }
        var triggerLocal = localChanged && this._subscribers.localErrorsChange;
        var triggerRemote = remoteChanged && this._subscribers.remoteErrorsChange;
        var triggerAll = this._subscribers.errorsChange;
        if (triggerLocal) this.outLocalErrorsChange(this._m._errors.local, JSON.parse(oldErrors.local));
        if (triggerRemote) this.outRemoteErrorsChange(this._m._errors.remote, JSON.parse(oldErrors.remote));
        if (triggerAll) this.outErrorsChange(this.getErrors(), JSON.parse(oldErrors.all));
    },
    
    getLocalErrors: function(field) {
        if (this._autoCheck && this._modified && !this._checked) this.check();
        return this._getErrors('local', field);
    },
    
    _getErrors: function(type, field) {
        if (!this._m._errors[type] || field && (field !== Amm.Data.ERROR_OTHER) && !(this._m._errors[type][field])) return null;
        if (!field) return this._m._errors[type];
        if (field === Amm.Data.ERROR_OTHER) return this._getOtherErrors(this._m._errors[type]);
        return this._m._errors[type][field];
    },
    
    _setErrors: function(type, errors, field) {
        this._beginUpdateErrors();
        if (field) {
            this._m._errors[type][field] = this._flattenErrors(errors);
            if (!this._m._errors[type][field].length) delete this._m._errors[type][field];
            this._endUpdateErrors();
            return;
        } 
        if (!errors) errors = {};
        else if (typeof errors !== 'object' || (errors instanceof Array)) {
            errors[Amm.Data.ERROR_GENERIC] = this._flattenErrors(errors);
            if (!errors[Amm.Data.ERROR_GENERIC] || !errors[Amm.Data.ERROR_GENERIC].length) {
                delete errors[Amm.Data.ERROR_GENERIC];
            }
        }
        var i, v, e = {};
        for (var i in errors) if (errors.hasOwnProperty(i)) {
            v = this._flattenErrors(errors[i]);
            if (!v.length) continue;
            e[i] = v;
        }
        this._m._errors[type] = e;
        this._endUpdateErrors();
    },
    
    setLocalErrors: function(errors, field) {
        this._setErrors('local', errors, field);
    },
    
    addError: function(error, field) {
        if (!error || (error instanceof Array && !error.length)) return;
        this._beginUpdateErrors();
        if (!field || field === Amm.Data.ERROR_OTHER) field = Amm.Data.ERROR_GENERIC;
        var e = {};
        e[field] = this._flattenErrors(error);
        Amm.override(this._m._errors.local, e, false, true);
        this._endUpdateErrors();
    },
    
    outLocalErrorsChange: function(errors, oldErrors) {
        return this._out('localErrorsChange', errors, oldErrors);
    },
    
    getRemoteErrors: function(field) {
        return this._getErrors('remote', field);
    },
    
    setRemoteErrors: function(errors, field) {
        this._setErrors('remote', errors, field);
    },
    
    outRemoteErrorsChange: function(errors, oldErrors) {
        return this._out('remoteErrorsChange', errors, oldErrors);
    },
    
    _flattenErrors: function(hash) {
        return Amm.Data.flattenErrors(hash);
    },
    
    _getOtherErrors: function(src) {
        var r, res;
        for (var i in src) if (src.hasOwnProperty(i) && !(i in this._m._propNames)) {
            r[i] = src[i];
        }
        return this._flattenErrors(r);
    },
    
    _combineErrors: function() {
        this._m._errors.all = {};
        if (this._m._errors.local) Amm.overrideRecursive(this._m._errors.all, this._m._errors.local);
        if (this._m._errors.remote) Amm.overrideRecursive(this._m._errors.all, this._m._errors.remote, false, true);
    },
    
    getErrors: function(field) {
        if (this._autoCheck && this._modified && !this._checked) this.check();
        if (!this._m._errors) return null;
        if (!this._m._errors.all) {
            this._combineErrors();
        }
        return this._getErrors('all', field);
    },
    
    outErrorsChange: function(errors, oldErrors) {
        return this._out('errorsChange', errors, oldErrors);
    },
    
    setErrors: function() {
        console.warn("setErrors has no effect; use either setLocalErrors() or setRemoteErrors()");
    },

    _setTransaction: function(transaction) {
        if (transaction) Amm.is(transaction, 'Amm.Data.Transaction');
        else transaction = null;
        
        var oldTransaction = this._transaction;
        if (oldTransaction === transaction) return;
        
        if (oldTransaction) oldTransaction.unsubscribe(undefined, undefined, this);
        if (transaction) transaction.subscribe('stateChange', this._notifyTransactionStateChange, this);
        
        this._transaction = transaction;

        this.outTransactionChange(transaction, oldTransaction);
        if (oldTransaction) this._setLastTransaction(oldTransaction);
        
        return true;
    },

    getTransaction: function() { return this._transaction; },

    outTransactionChange: function(transaction, oldTransaction) {
        this._out('transactionChange', transaction, oldTransaction);
    },
    
    _notifyTransactionStateChange: function(state, oldState) {
        // ignore if we don't track this transaction anymore
        if (!this._transaction || Amm.event.origin !== this._transaction) return;
        if (state === Amm.Data.Transaction.STATE_RUNNING) {
            // don't handle transaction start event
            return;
        }
        if (state === Amm.Data.Transaction.STATE_CANCELLED) { // business as usual
            this._setTransaction(null);
            return;
        }
        
        if (this._handleTransactionFinished(state)) {
            this._setTransaction(null);
        }
    },
    
    _handleTransactionFinished: function(state) {
        
        if (state === Amm.Data.Transaction.STATE_CANCELLED) return true;
        
        var failure = (state === Amm.Data.Transaction.STATE_FAILURE);
        
        if (failure) {
            this._handleGenericTransactionFailure();
            return true;
        }
        
        var success = (state === Amm.Data.Transaction.STATE_SUCCESS);
        
        if (!success) return;
        
        var type = this._transaction.getType() + '';
        
        var method = '_handle' + type[0].toUpperCase() + type.slice(1) + 'Success';
        
        if (typeof this[method] === 'function' ) {
            this[method]();
        }
        
        return true;
        
    },
    
    _hydrateFromTransactionDataAndTrigger: function(forSave, newState, partial) {
        var result = this._transaction.getResult();
        var wasCreated = (this._m._state === Amm.Data.STATE_NEW);
        this.beginUpdate();
        this.setRemoteErrors({});
        var data = result.getData();
        if (data) this.hydrate(data, partial, true);
        if (newState) this.setState(newState);
        if (forSave) {
            this._m._doAfterSave(wasCreated);
        } else {
            this._m._doAfterLoad();
        }
        this._m._doOnActual(forSave);
        this.endUpdate();
    },
    
    _handleGenericTransactionFailure: function() {
        var result = this._transaction.getResult();
        var remoteErrors = result.getErrorData(), tmp, 
                error = result.getError(), exception = result.getException();
        if (!remoteErrors) remoteErrors = {};
        else if (typeof remoteErrors !== 'object') {
            tmp = {};
            tmp[Amm.Data.ERROR_GENERIC] = [remoteErrors];
            remoteErrors = tmp;
        }
        
        var f;
        if (error) {
            if (remoteErrors[Amm.Data.ERROR_GENERIC]) {
                remoteErrors[Amm.Data.ERROR_GENERIC].push(error);
                /*remoteErrors[Amm.Data.ERROR_GENERIC] = Amm.Data.flattenErrors(remoteErrors[Amm.Data.ERROR_GENERIC]);
                if (!remoteErrors[Amm.Data.ERROR_GENERIC] || !remoteErrors[Amm.Data.ERROR_GENERIC].length) {
                    delete remoteErrors[Amm.Data.ERROR_GENERIC];
                }*/
            } else {
                remoteErrors[Amm.Data.ERROR_GENERIC] = [error];
            }
        }
        if (exception) {
            remoteErrors[Amm.Data.ERROR_EXCEPTION] = '' + exception;
        }
        
        this.setRemoteErrors(remoteErrors);
        
        this.outTransactionFailure (this._transaction);
    },
    
    outTransactionFailure: function(transaction) {
        return this._out('transactionFailure', transaction);
    },
    
    _handleCreateSuccess: function() {
        this._hydrateFromTransactionDataAndTrigger(true, Amm.Data.STATE_EXISTS, this._mapper.partialHydrateOnCreate);
    },
    
    _handleDeleteSuccess: function() {
        this.setState(Amm.Data.STATE_DELETED);
        this.setRemoteErrors({});
        this._m._doAfterDelete();
    },
    
    _handleUpdateSuccess: function() {
        this._hydrateFromTransactionDataAndTrigger(true, undefined, this._mapper.partialHydrateOnUpdate);
    },
    
    _handleLoadSuccess: function() {
        this.beginUpdate();
        this._hydrateFromTransactionDataAndTrigger(false, Amm.Data.STATE_EXISTS);
        this.endUpdate();
    },

    _setLastTransaction: function(lastTransaction) {
        if (lastTransaction) Amm.is(lastTransaction, 'Amm.Data.Transaction');
        else lastTransaction = null;
        
        var oldLastTransaction = this._lastTransaction;
        if (oldLastTransaction === lastTransaction) return;
        this._lastTransaction = lastTransaction;
        this.outLastTransactionChange(lastTransaction, oldLastTransaction);
        return true;
    },

    getLastTransaction: function() { return this._lastTransaction; },

    outLastTransactionChange: function(lastTransaction, oldLastTransaction) {
        this._out('lastTransactionChange', lastTransaction, oldLastTransaction);
    },
    
    _getTransactionData: function() {
        return Amm.override({}, this._m._data);
    },
    
    _runTransaction: function(transaction) {
        this._setTransaction(transaction);
        transaction.run();
        if (transaction.getState() === Amm.Data.Transaction.STATE_FAILURE) {
            var x = transaction.getResult().getException();
            if (x) throw x;
        }
    },
    
    save: function(noCheck) {
        if (!noCheck && !this.check()) return;
        if (this._m._doBeforeSave() === false) return;
        var data = this._getTransactionData(), tr, state = this.getState();
        if (state === Amm.Data.STATE_NEW) {
            tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_CREATE, null, data);
        } else if (state === Amm.Data.STATE_EXISTS) {
            tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_UPDATE, this.getKey(), data);
        } else {
            throw Error("Cannot save an object with state '" + state + "'");
        }
        this._runTransaction(tr);
        return true;
    },
    
    delete: function() {
        var tr, state = this.getState(), key;
        if (state !== Amm.Data.STATE_EXISTS) {
            this.setState(Amm.Data.STATE_DELETED);
            return true;
        }
        if (this._m._doBeforeDelete() === false) return false;
        key = this.getKey();
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_DELETE, this.getKey());
        this._runTransaction(tr);
        return true;
    },
    
    load: function(key) {
        var newKey = this._m._doBeforeLoad(key);
        if (newKey === false) return false;
        if (newKey !== undefined) key = newKey;
        if (key === undefined) key = this.getKey();
        if (!key) throw new Error ("Cannot load(): key not provided");
        var tr;
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_LOAD, key);
        this._runTransaction(tr);
        return true;
    },
    
    cleanup: function() {
        if (this._cu) return;
        this._cu = true;
        if (this._transaction) {
            this._transaction.cleanup();
            this._transaction = null;
        }
        if (this._lastTransaction) {
            this._lastTransaction.cleanup();
            this._lastTransaction = null;
        }
        if (this._mapper) this._mapper.unsubscribe(undefined, undefined, this);
        this._m.cleanup();
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    getMapper: function() {
        return this._mapper;
    },
    
    setMapper: function() {
        // dummy
    },
    
    outMapperChange: function() {
        // dummy
    },
    
    _onMetaChange: function(field, property, value, oldValue) {
        Amm.Data.MetaProvider.prototype._onMetaChange.call(
            this, field, property, value, oldValue
        );
        // we know _that_ meta-property isn't validation-related
        if (property 
            && property !== 'required'      // requiredness affects validation
            && property !== 'label'         // label may affect error messages
            && property !== 'validators'    // validators affect validation
        ) return;
        var hasValue = field && this._m._data[field] || this._m._old[field];
        var shouldCheck = hasValue || property === 'required' && !value;
        this._correctCheckStatus(field, shouldCheck);
    }
    
};

Amm.extend(Amm.Data.ModelMeta, Amm.WithEvents);
Amm.extend(Amm.Data.ModelMeta, Amm.Data.MetaProvider);

Amm.defineLangStrings({
    'lang.Amm.ModelMeta.invalidFieldValue': "The field contains invalid value"
});
/* global Amm */

Amm.Data.RecordMeta = function(record, options) {
    Amm.Data.ModelMeta.call(this, record, options);
    this._mapper = record._mapper;
    this.setMetaProvider(this._mapper);
};

Amm.Data.RecordMeta.prototype = {

    'Amm.Data.RecordMeta': '__CLASS__', 
    
    /**
     * @type {Amm.Data.Mapper}
     */
    _mapper: null,
    
    _updateLevel: 0,
    
    _modified: null,
    
    getKey: function() {
        var res = this._mapper.extractKey(this._m._old);
        if (res === undefined) res = this._mapper.extractKey(this._m._data);
        return res;
    },
    
    _setTransaction: function(transaction) {
        if (transaction) Amm.is(transaction, 'Amm.Data.Transaction');
        else transaction = null;
        
        var oldTransaction = this._transaction;
        if (oldTransaction === transaction) return;
        
        if (oldTransaction) oldTransaction.unsubscribe(undefined, undefined, this);
        if (transaction) transaction.subscribe('stateChange', this._notifyTransactionStateChange, this);
        
        this._transaction = transaction;

        this.outTransactionChange(transaction, oldTransaction);
        if (oldTransaction) this._setLastTransaction(oldTransaction);
        
        return true;
    },

    getTransaction: function() { return this._transaction; },

    outTransactionChange: function(transaction, oldTransaction) {
        this._out('transactionChange', transaction, oldTransaction);
    },
    
    _notifyTransactionStateChange: function(state, oldState) {
        // ignore if we don't track this transaction anymore
        if (!this._transaction || Amm.event.origin !== this._transaction) return;
        if (state === Amm.Data.Transaction.STATE_RUNNING) {
            // don't handle transaction start event
            return;
        }
        if (state === Amm.Data.Transaction.STATE_CANCELLED) { // business as usual
            this._setTransaction(null);
            return;
        }
        
        if (this._handleTransactionFinished(state)) {
            this._setTransaction(null);
        }
    },
    
    _handleTransactionFinished: function(state) {
        
        if (state === Amm.Data.Transaction.STATE_CANCELLED) return true;
        
        var failure = (state === Amm.Data.Transaction.STATE_FAILURE);
        
        if (failure) {
            this._handleGenericTransactionFailure();
            return true;
        }
        
        var success = (state === Amm.Data.Transaction.STATE_SUCCESS);
        
        if (!success) return;
        
        var type = this._transaction.getType() + '';
        
        var method = '_handle' + type[0].toUpperCase() + type.slice(1) + 'Success';
        
        if (typeof this[method] === 'function' ) {
            this[method]();
        }
        
        return true;
        
    },
    
    _hydrateFromTransactionDataAndTrigger: function(forSave, newState, partial) {
        var result = this._transaction.getResult();
        var wasCreated = (this._m._state === Amm.Data.STATE_NEW);
        this.beginUpdate();
        this.setRemoteErrors({});
        var data = result.getData();
        if (data) this.hydrate(data, partial, true);
        if (newState) this.setState(newState);
        if (forSave) {
            this._m._doAfterSave(wasCreated);
        } else {
            this._m._doAfterLoad();
        }
        this._m._doOnActual(forSave);
        this.endUpdate();
    },
    
    _handleGenericTransactionFailure: function() {
        var result = this._transaction.getResult();
        var remoteErrors = result.getErrorData(), tmp, 
                error = result.getError(), exception = result.getException();
        if (!remoteErrors) remoteErrors = {};
        else if (typeof remoteErrors !== 'object') {
            tmp = {};
            tmp[Amm.Data.ERROR_GENERIC] = [remoteErrors];
            remoteErrors = tmp;
        }
        
        var f;
        if (error) {
            if (remoteErrors[Amm.Data.ERROR_GENERIC]) {
                remoteErrors[Amm.Data.ERROR_GENERIC].push(error);
                /*remoteErrors[Amm.Data.ERROR_GENERIC] = Amm.Data.flattenErrors(remoteErrors[Amm.Data.ERROR_GENERIC]);
                if (!remoteErrors[Amm.Data.ERROR_GENERIC] || !remoteErrors[Amm.Data.ERROR_GENERIC].length) {
                    delete remoteErrors[Amm.Data.ERROR_GENERIC];
                }*/
            } else {
                remoteErrors[Amm.Data.ERROR_GENERIC] = [error];
            }
        }
        if (exception) {
            remoteErrors[Amm.Data.ERROR_EXCEPTION] = '' + exception;
        }
        
        this.setRemoteErrors(remoteErrors);
        
        this.outTransactionFailure (this._transaction);
    },
    
    outTransactionFailure: function(transaction) {
        return this._out('transactionFailure', transaction);
    },
    
    _handleCreateSuccess: function() {
        this._hydrateFromTransactionDataAndTrigger(true, Amm.Data.STATE_EXISTS, this._mapper.partialHydrateOnCreate);
    },
    
    _handleDeleteSuccess: function() {
        this.setState(Amm.Data.STATE_DELETED);
        this.setRemoteErrors({});
        this._m._doAfterDelete();
    },
    
    _handleUpdateSuccess: function() {
        this._hydrateFromTransactionDataAndTrigger(true, undefined, this._mapper.partialHydrateOnUpdate);
    },
    
    _handleLoadSuccess: function() {
        this.beginUpdate();
        this._hydrateFromTransactionDataAndTrigger(false, Amm.Data.STATE_EXISTS);
        this.endUpdate();
    },

    _setLastTransaction: function(lastTransaction) {
        if (lastTransaction) Amm.is(lastTransaction, 'Amm.Data.Transaction');
        else lastTransaction = null;
        
        var oldLastTransaction = this._lastTransaction;
        if (oldLastTransaction === lastTransaction) return;
        this._lastTransaction = lastTransaction;
        this.outLastTransactionChange(lastTransaction, oldLastTransaction);
        return true;
    },

    getLastTransaction: function() { return this._lastTransaction; },

    outLastTransactionChange: function(lastTransaction, oldLastTransaction) {
        this._out('lastTransactionChange', lastTransaction, oldLastTransaction);
    },
    
    _getTransactionData: function() {
        return Amm.override({}, this._m._data);
    },
    
    _runTransaction: function(transaction) {
        this._setTransaction(transaction);
        transaction.run();
        if (transaction.getState() === Amm.Data.Transaction.STATE_FAILURE) {
            var x = transaction.getResult().getException();
            if (x) throw x;
        }
    },
    
    save: function(noCheck) {
        if (!noCheck && !this.check()) return;
        if (this._m._doBeforeSave() === false) return;
        var data = this._getTransactionData(), tr, state = this.getState();
        if (state === Amm.Data.STATE_NEW) {
            tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_CREATE, null, data);
        } else if (state === Amm.Data.STATE_EXISTS) {
            tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_UPDATE, this.getKey(), data);
        } else {
            throw Error("Cannot save an object with state '" + state + "'");
        }
        this._runTransaction(tr);
        return true;
    },
    
    delete: function() {
        var tr, state = this.getState(), key;
        if (state !== Amm.Data.STATE_EXISTS) {
            this.setState(Amm.Data.STATE_DELETED);
            return true;
        }
        if (this._m._doBeforeDelete() === false) return false;
        key = this.getKey();
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_DELETE, this.getKey());
        this._runTransaction(tr);
        return true;
    },
    
    load: function(key) {
        var newKey = this._m._doBeforeLoad(key);
        if (newKey === false) return false;
        if (newKey !== undefined) key = newKey;
        if (key === undefined) key = this.getKey();
        if (!key) throw new Error ("Cannot load(): key not provided");
        var tr;
        tr = this._mapper.createTransaction(Amm.Data.Transaction.TYPE_LOAD, key);
        this._runTransaction(tr);
        return true;
    },
    
    _handleMapperMetaChange: function(meta, oldMeta, field, property, value, oldValue) {
        // we know _that_ meta-property isn't validation-related
        if (property 
            && property !== 'required'      // requiredness affects validation
            && property !== 'label'         // label may affect error messages
            && property !== 'validators'    // validators affect validation
        ) return;
        var hasValue = field && this._m._data[field] || this._m._old[field];
        var shouldCheck = hasValue || property === 'required' && !value;
        this._correctCheckStatus(field, shouldCheck);
    },
    
    cleanup: function() {
        if (this._cu) return;
        this._cu = true;
        if (this._transaction) {
            this._transaction.cleanup();
            this._transaction = null;
        }
        if (this._lastTransaction) {
            this._lastTransaction.cleanup();
            this._lastTransaction = null;
        }
        if (this._mapper) this._mapper.unsubscribe(undefined, undefined, this);
        this._m.cleanup();
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    getMapper: function() {
        return this._mapper;
    },
    
    setMapper: function() {
        // dummy
    },
    
    outMapperChange: function() {
        // dummy
    }
    
    
};

Amm.extend(Amm.Data.RecordMeta, Amm.Data.ModelMeta);
/* global Amm */

/**
 * 
 * HttpTransaction is configure-than-shoot object.
 * It doesn't react to changes to its' configuration properties like
 * uri, uriOverrides, keyPath, keyToUri and like (those don't have any
 * setters, getters or events). Properties are applied and validated 
 * on transaction start and end.
 * 
 * @param {type} options
 * @returns {Amm.Data.HttpTransaction}
 */


Amm.Data.HttpTransaction = function(options) {
    Amm.Data.Transaction.call(this, options);
};

Amm.Data.HttpTransaction.DEFAULT_METHOD_MAP = {
    'load': 'GET',
    '': 'POST' // default method
};

Amm.Data.HttpTransaction.prototype = {

    'Amm.Data.HttpTransaction': '__CLASS__',
    
    /**
     * @type {Amm.Remote.RequestProducer}
     */
    _requestProducer: null,
    
    /**
     * @type string
     */
    uri: null,
    
    /**
     * Apply additional values to request' URI (uri parts such
     * as SCHEME, USER, PASSWORD, PATH and so on accepted)
     * @type object
     */
    uriOverrides: null,
    
    /**
     * Apply additional values to request' data
     * @type object 
     */
    dataOverrides: null,
    
    method: null,
    
    methodMap: null,
    
    typePath: null,
    
    /**
     * If typeToUri === true and typePath is empty string (''), 
     * type will be appended to URI after the slash (i.e. example.com/path/create/)
     * @type Boolean
     */
    typeToUri: true,
    
    typeDecorator: null,
    
    /**
     * @type string
     */
    keyPath: 'id',
    
    /**
     * If keyToUri === true and keyPath is null or empty, key will be appended to URI after the slash
     * @type Boolean
     */
    keyToUri: true,
    
    dataPath: null,
    
    dataToUri: false,
    
    /**
     * If this key is contained in JSON response, 
     * it will be put to transaction result' `error` property
     * @type string
     */
    responseErrorPath: 'error',
    
    /**
     * If this key is contained in JSON response, 
     * it will be put to transaction result' `errorData` property.
     * If it is the same as responseDataPath, this will be done 
     * only to unsuccessful results.
     * 
     * @type string
     */
    responseErrorDataPath: 'errorData',
    
    /**
     * If this key is contained in JSON response, 
     * it will be put to transaction result' `data` property
     * If it is the same as responseErrorDataPath, this will be done 
     * only successful results.
     * 
     * @type string
     */
    responseDataPath: 'data',
    
    /**
     * Result will be considered successful only if this key 
     * is contained in JSON response and is non-false
     * @type string|null
     */
    responseSuccessPath: null,
    
    /**
     * Which HTTP error codes are considered as 'server', 
     * not 'http' errors. In case of soft HTTP error, when server
     * text cannot be parsed, it will be used as result error message
     * unless error descriptions are provided
     * 
     * When object is provided, it should be {httpCode: error description}
     * 
     * @type int|array|object
     */
    softErrorCodes: null,
    
    _unparsedResponseClass: 'Amm.Data.HttpResponse',
    
    // intentionally same shared instance
    _transport: new Amm.Remote.Transport.JqXhr,
    
    _responseDecorator: null,
    
    _runningRequest: null,
    
    setTransport: function(transport) {
        this._transport = Amm.constructInstance(transport, 'Amm.Remote.Transport');
    },
    
    /**
     * @returns {Amm.Remote.Transport}
     */
    getTransport: function() {
        return this._transport;
    },
    
    createRequestProducer: function() {
        var outRequestProducer = {prototype: null}, proto;
        this.outRequestProducerPrototype(outRequestProducer, this);
        if (outRequestProducer.prototype) {
            proto = outRequestProducer.prototype;
        }
        if (!proto) proto = this.createDefaultRequestProducer();
        return Amm.constructInstance(proto, 'Amm.Remote.RequestProducer');        
    },
    
    createDefaultRequestProducer: function() {
        var res = new Amm.Remote.RequestProducer({
            uri: this.uri,
            uriOverrides: this.uriOverrides,
            dataOverrides: this.dataOverrides
        });
        if (this.data) {
            var d = Amm.overrideRecursive({}, this.data);
            if (!this.dataPath) res.setDataOverrides(this.data);
            else {
                res.setData(d, this.dataPath);
            }
        }
        var type = Amm.Decorator.d(this._type, this, 'typeDecorator');
        if (type) {
            if (this.typeToUri)  {
                if (this.typePath === '') {
                    res.setUri(res.getUri().replace(/\/$/g, '') + '/' + type);
                } else if (this.typePath) {
                    res.setUri(type, this.typePath);
                }
            } else if (this.typePath) {
                res.setData(type, this.typePath);
            }
        }
        if (this.key !== null) {
            if (this.keyToUri) {
                // no key path => append key
                if (!this.keyPath) res.setUri(res.getUri().replace(/\/$/g, '') + '/' + this.key);
                else {
                    res.setUri(this.key, this.keyPath);
                }
            } else {
                res.setData(this.key, this.keyPath);
            }
        }
        res.setMethod(this.getAppliedMethod());
        // TODO: action path
        return res;
    },
    
    /**
     * @returns HTTP method based on this._type value
     */
    getAppliedMethod: function() {
        var map = this.methodMap || Amm.Data.HttpTransaction.DEFAULT_METHOD_MAP;
        var res = map[this._type] || map[''];
        return res;
    },
    
    _runDefault: function() {
        var producer = this.createRequestProducer();
        var constRequest = producer.produceRequest();
        this._runningRequest = this.getTransport().makeRequest(constRequest, this._handleSuccess, this._handleFailure, this);
    },
    
    _handleSuccess: function(data, textStatus, jqXhr) {
        if (this._state !== Amm.Data.Transaction.STATE_RUNNING) return;
        var headers = {}, statusCode = 200, responseText = "";
        if (typeof jqXhr === "object") {
            if (typeof (jqXhr.getAllResponseHeaders) === "function") {
                headers = Amm.Remote.Transport.JqXhr.parseResponseHeaders(jqXhr.getAllResponseHeaders());
            }
            if ('statusCode' in jqXhr) statusCode = jqXhr.statusCode;
            if ('responseText' in jqXhr) responseText = jqXhr.responseText;
            else if (typeof data === "string") responseText = data;
        }
        this.setUnparsedResponse(new Amm.Data.HttpResponse({
            rawContent: responseText,
            parsedContent: data,
            httpHeaders: headers,
            httpCode: statusCode
        }));
    },
    
    _handleFailure: function(textStatus, errorThrown, httpCode, jqXhr) {
        if (this._state !== Amm.Data.Transaction.STATE_RUNNING) return;
        var headers = {}, statusCode = httpCode, responseText = "";
        if (typeof jqXhr === "object") {
            if (typeof (jqXhr.getAllResponseHeaders) === "function") {
                headers = Amm.Remote.Transport.JqXhr.parseResponseHeaders(jqXhr.getAllResponseHeaders());
            }
            if ('statusCode' in jqXhr) statusCode = jqXhr.statusCode;
            if ('responseText' in jqXhr) responseText = jqXhr.responseText;
        }
        this.setUnparsedResponse(new Amm.Data.HttpResponse({
            isError: true,
            errorText: errorThrown,
            rawContent: responseText,
            parsedContent: null,
            httpHeaders: headers,
            httpCode: statusCode
        }));
    },
    
    /**
     * Event handlers must set requestProducer.proto to consider result successful
     * 
     * @param {Amm.Data.HttpTransaction} transaction This transaction
     * @param {object} requestProducerPrototype {res: null} - change prototype to return
     */
    outRequestProducerPrototype: function(outRequestProducer, transaction) {
        return this._out('requestProducerPrototype', outRequestProducer, transaction);
    },
    
    // @TODO: support other parsedContent than JSON (XML?)
    _parseDefault: function(httpResponse) {
        var res;
        
        if (this._responseDecorator) {
            res = this._applyDataDecorator(httpResponse);
            if (res) return res;
        }
        
        res = {
        };
        
        var softError = null;
        
        if (httpResponse.isError && !httpResponse.httpCode) {
        
            // check for local error
        
            return {
                errorType: Amm.Data.TransactionResult.ERROR_TYPE_CLIENT,
                error: httpResponse.errorText
            };
            
        } else if (httpResponse.isError) {
            
            // check "soft" http error
            
            if (this.softErrorCodes instanceof Array) {
                if (Amm.Array.indexOf(httpResponse.httpCode, this.softErrorCodes) >= 0)
                    softError = httpResponse.errorText;
            } else if (this.softErrorCodes && this.softErrorCodes[httpResponse.httpCode]) {
                softError = this.softErrorCodes[httpResponse.httpCode];
            }
            
            if (softError) {
                res.errorType = Amm.Data.TransactionResult.ERROR_TYPE_SERVER;
                res.error = softError;
            } else {
                res.errorType = Amm.Data.TransactionResult.ERROR_TYPE_HTTP;
                res.error = httpResponse.errorText;
                // we won't search structured data in HTTP error
                return res;
            }
            
        }
        
        // check if result contains error
        
        var responseHasError = false;
        var isParsed = (httpResponse.parsedContent && typeof httpResponse.parsedContent === 'object');
        
        if (!isParsed) { // check if unparsable result is ok
            
            if (softError) return res; // soft error - don't do anything
            
            if (this.responseDataPath || this.responseSuccessPath)
                throw Error("Cannot parse the response");
            
            // assume success
            return res;
            
        }
        
        // result data is parsed
        
        if (softError) {
            if (this.responseErrorDataPath) {
                res.errorData = Amm.Util.getByPath(httpResponse.parsedContent,
                    this.responseErrorDataPath);
            }
            return res;
        }
        
        if (this.responseSuccessPath) {
            responseHasError = !Amm.Util.getByPath(httpResponse.parsedContent,
                    this.responseSuccessPath);
        } else if (this.responseErrorPath) {
            responseHasError = Amm.Util.getByPath(httpResponse.parsedContent,
                    this.responseErrorPath);
            if (responseHasError !== undefined) res.error = responseHasError;
        }
        
        if (this.responseErrorDataPath && (responseHasError || (this.responseErrorDataPath !== this.responseDataPath))) {
            res.errorData = Amm.Util.getByPath(httpResponse.parsedContent,
                    this.responseErrorDataPath, null);
        }
        
        if (res.errorData || responseHasError)  {
            res.errorType = Amm.Data.TransactionResult.ERROR_TYPE_SERVER;
        }
        
        if ((!res.errorType || (this.responseErrorDataPath !== this.responseDataPath))) {
            if (this.responseDataPath !== null) {
                res.data = Amm.Util.getByPath(httpResponse.parsedContent,
                        this.responseDataPath, null);
            } else {
                res.data = httpResponse.parsedContent;
            }
        }
            
        return res;
    },
    
    _applyDataDecorator: function(unparsedResponse) {
        var res = this._responseDecorator.decorate(unparsedResponse);
        if (res && typeof res === 'object') {
            return Amm.constructInstance(res, 'Amm.Data.TransactionResult');
        }
    },
    
    _cancelDefault: function() {
        if (!this._runningRequest) {
            throw Error("Assertion: _runningRequest during _cancelDefault()");
        }
        this.getTransport().abortRunningRequest(this._runningRequest);
    },
    
    setResponseDecorator: function(responseDecorator) {
        if (!responseDecorator) {
            this._responseDecorator = null;
            return;
        }
        this._responseDecorator = Amm.constructInstance(responseDecorator, 'Amm.Decorator.Data');
    }
    
    
};

Amm.extend(Amm.Data.HttpTransaction, Amm.Data.Transaction);

/* global Amm */

Amm.Data.FieldMeta = function(options) {
    this._validators = [];
    var o = Amm.override(options || {});
    if ('metaProvider' in o) {
        this.setMetaProvider(o.metaProvider);
        delete o.metaProvider;
    }
    this._i = true;
    Amm.init(this, o, null, function(prop, val) {
        this.setProperty(val, prop);
        return true;
    });
    this._i = false;
    this._notify();
};

Amm.Data.FieldMeta._afterPropChange = function(value, oldValue, propName) {
    this._notify(value, oldValue, propName);
};

Amm.Data.FieldMeta.prototype = {
    
    'Amm.Data.FieldMeta': '__CLASS__',
    
    _i: null,
    
    _metaProvider: null,
    
    _validators: null,
    
    _requiredValidator: null,

    _name: null,
    
    _properties: null,
    
    clone: function(metaProvider, name) {
        var res = new Amm.Data.FieldMeta;
        for (var i in this) {
            var hp = this.hasOwnProperty(i);
            if (hp || Amm.Data.FieldMeta.prototype.hasOwnProperty(i)) {
                if (this[i] instanceof Array) res[i] = [].concat(this[i]);
                res[i] = this[i];
            }
            // clone properties that were created with 'defineProperty'
            if (hp && typeof this[i] === 'function' && i.slice(0, 3) === 'set') {
                var gtr, pn;
                if (typeof this[gtr = 'get' + (pn = i.slice(3))] === 'function') {
                    pn[0] = pn[0].toLowerCase();
                    Object.defineProperty(res, pn, {
                        enumerable: true,
                        set: this[i],
                        get: this[gtr]
                    });
                }
            }
        }
        res._metaProvider = null;
        if (name) res._name = name;
        if (metaProvider) res.setMetaProvider(metaProvider);
        return res;
    },
    
    _notify: function(value, oldValue, prop) {
        if (this._metaProvider && this._name) {
            this._metaProvider.notifyMetaChange(this, this._name, prop, value, oldValue);
        }
    },

    setName: function(name) {
        var oldName = this._name;
        if (oldName === name) return;
        if (this._name !== null) throw Error("Can setName() only once");
        this._name = name;
        this._notify(name, oldName, 'name');
        return true;
    },

    getName: function() { return this._name; },

    setMetaProvider: function (metaProvider) {
        if (metaProvider === this._metaProvider) return;
        if (metaProvider) {
            if (this._metaProvider) throw Error("Can setMetaProvider() only once");
            Amm.is(metaProvider, 'MetaProvider', 'metaProvider');
        } else {
            metaProvider = null;
        }
        this._metaProvider = metaProvider;
    },
    
    getMetaProvider: function() {
        return this.metaProvider;
    },
    
    setValidators: function(validators) {
        if (this._validators === validators) return;
        var oldValidators = this._validators;
        if (!(validators instanceof Array)) validators = validators? [validators]: [];
        var newValidators = Amm.Data.MetaProvider.checkValidatorsArray(validators, 'validators');
        this._validators = newValidators;
        this._notify(this._validators, oldValidators, 'validators');
    },
    
    getValidators: function() {
        return [].concat(this._validators);
    },
    
    setProperty: function(value, property) {
        if (property[0] === '_') {
            throw Error("Cannot set pseudo-private property");
        }
        if (!(property in this)) {
            this.defineProperty(property);
        }
        this[property] = value;
    },
    
    getProperty: function(property) {
        if (property[0] === '_') {
            throw Error("Cannot return pseudo-private property");
        }
        if (property in this) return this[property];
    },
    
    defineProperty: function(property, defaultValue, beforeChange) {
        Amm.createProperty(this, property, defaultValue, {
            before: beforeChange, 
            after: Amm.Data.FieldMeta._afterPropChange
        }, true);
    }
    
};
    
Amm.createProperty(Amm.Data.FieldMeta.prototype, 'name', null, {
    before: function(name, oldName) {
        if (oldName !== null) {
            throw Error("Can setName() only once");
        }
    },
    after: Amm.Data.FieldMeta._afterPropChange
}, true);

Amm.createProperty(Amm.Data.FieldMeta.prototype, 'required', null, {
    before: function(required) {
        return !!required;
    },
    after: function(value, oldValue, propName) {
        Amm.Data.FieldMeta._afterPropChange.call(this, value, oldValue, propName);
    }
}, true);

Amm.createProperty(
    Amm.Data.FieldMeta.prototype, 'default', null, Amm.Data.FieldMeta._afterPropChange, true
);

Amm.createProperty(
    Amm.Data.FieldMeta.prototype, 'label', null, Amm.Data.FieldMeta._afterPropChange, true
);

Amm.createProperty(
    Amm.Data.FieldMeta.prototype, 'validators', null, null, true
);

Amm.createProperty(
    Amm.Data.FieldMeta.prototype, 'description', null, Amm.Data.FieldMeta._afterPropChange, true
);
