/* global Amm */

Amm = {
    
    id: 'amm',
    
    domHolderAttribute: 'data-amm-iid',
    
    debugTraitConflicts: false,
    
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
            if (this._eventStack.length) this._root.beginDefer();
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
            // we need to use getOwnPropertyNames instead of for..in to be able to inherit
            // non-enumerable properties created with Object.defineProperty(class.prototype...)
            var pn = Object.getOwnPropertyNames(parentClass.prototype);
            for (var i = 0, l = pn.length; i < l; i++) {
                var prop = pn[i];
                if (prop in subClass.prototype) continue;
                var propertyDescriptor = Object.getOwnPropertyDescriptor(parentClass.prototype, prop);
                if (propertyDescriptor.get || propertyDescriptor.set || !propertyDescriptor.writable) {
                    Object.defineProperty(subClass.prototype, prop, propertyDescriptor);
                    continue;
                }
                if (!parentClass.prototype.hasOwnProperty(prop)) continue;
                subClass.prototype[prop] = parentClass.prototype[prop];
                if (!dontIndicateParent && subClass.prototype[prop] === '__CLASS__')
                    subClass.prototype[prop] = '__PARENT__';
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
        var traitInstance;
        if (typeof trait === 'string') {
            trait = Amm.getFunction(trait);
        }
        if (typeof instance !== 'object') throw Error("`instance` must be an object");
        if (typeof trait === 'function') traitInstance = new trait();
        else if (typeof trait === 'object') traitInstance = trait;
        else throw Error("`trait` must be an object or a function (constructor)");
        if (Amm.debugTraitConflicts) {
            var conflicts = this.getInterfaces(instance, traitInstance);
            if (conflicts.length) 
                throw Error("Cannot augment: `instance` already implements same interfaces as the `traitInstance`: "
                    + conflicts.join(', ') + ")");
        }
        for (var i in traitInstance) if (!(i[1] === '_' && i[0] === '_')) {
            if (i in instance) {
                if (typeof instance[i] !== 'function') continue;
                if (instance[i] !== Amm.Element['prototype'][i]) continue;
            }
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
    
    copy: function(hash) {
        if (!hash || (typeof hash !== 'object')) return hash;
        var res, i, l;
        if (hash instanceof Array) {
            res = [];
            for (i = 0; i < hash.length; i++) {
                if (typeof hash[i] !== 'object' || !hash[i]) res.push(hash[i]);
                else res.push(Amm.copy(hash[i]));
            }
            return res;
        }
        if (Object.getPrototypeOf(hash) !== Object.prototype) {
            // not instance of Array or Object
            return hash;
        }
        res = {};
        for (i in hash) if (hash.hasOwnProperty(i)) {
            if (typeof hash[i] !== 'object' || !hash[i]) res[i] = hash[i];
            else res[i] = Amm.copy(hash[i]);
        }
        return res;
    },
    
    overrideRecursive: function(modifiedObject, overrider, noOverwrite, deduplicate, detectInstances) {
        var spec = Amm.overrideRecursive.special;
        if (detectInstances === undefined) detectInstances = true;
        if (typeof modifiedObject !== 'object' || typeof overrider !== 'object')
            throw Error('Both modifiedObject and overrider must be objects');

        for (var i in overrider) if (overrider.hasOwnProperty(i)) {
            var to = typeof overrider[i] === 'object';
            if (to && overrider[i] instanceof spec) {
                if (overrider[i].remove) {
                    delete modifiedObject[i];
                } else if (overrider[i].replace) {
                    modifiedObject[i] = overrider[i].with;
                } else if (overrider[i].func) {
                    var scope = overrider[i].scope || window;
                    overrider[i].func.call(scope, i, modifiedObject, overrider);
                }
                continue;
            }
            var recurse = false, hasDest = i in modifiedObject;
            if (to) {   
                recurse = overrider[i] && !hasDest || (typeof modifiedObject[i] === 'object');
            }
            if (recurse && detectInstances) {
                if (typeof detectInstances === 'function') {
                    var ret = detectInstances(modifiedObject[i], overrider[i], noOverwrite, deduplicate, detectInstances);
                    if (ret === false) recurse = false;
                    if (ret === true) continue;
                } else if (Amm.getClass(modifiedObject[i]) || Amm.getClass(overrider[i])) {
                    recurse = false;
                }
            }
            if (recurse && !hasDest && overrider[i]) {
                modifiedObject[i] = overrider[i] instanceof Array? [] : {};
            }
            
            if (recurse && modifiedObject[i] instanceof Array && overrider[i] instanceof Array) {
                if (!deduplicate || !modifiedObject[i].length) {
                    modifiedObject[i] = modifiedObject[i].concat(overrider[i]);
                    continue;
                }
                for (var j = 0, l = overrider[i].length; j < l; j++) {
                    if (Amm.Array.indexOf(overrider[i][j], modifiedObject[i]) >= 0) continue;
                    modifiedObject[i].push(overrider[i][j]); 
                }
            } else if (recurse) {
                this.overrideRecursive(modifiedObject[i], overrider[i], noOverwrite, deduplicate, detectInstances);
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
        var r = null;
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
            for (var j = 0, n = className.length; j < n; j++) if (Amm.is(item, className[j])) return true;
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
    
    ucFirst: function(str) {
        str = '' + str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    lcFirst: function(str) {
        str = '' + str;
        return str.charAt(0).toLowerCase() + str.slice(1);
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
            var h = p.shift();
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
        if (!this._eventStack.length && this._root) this._root.beginDefer();
        var tmp = this.event;
        event.parent = tmp;
        this._eventStack.push(this.event);
        this.event = event;
    },
    
    popEvent: function() {
        this.event = this._eventStack.pop();
        if (!this._eventStack.length && this._root) {
            this._root.endDefer();
        }
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
            var enumerable = defineProperty.enumerable !== undefined? defineProperty.enumerable : true;
            var configurable = defineProperty.configurable !== undefined? defineProperty.configurable : true;
            Object.defineProperty(target, l, {
                enumerable:  enumerable,
                configurable: configurable,
                get: function() { 
                    return this[getterName](); 
                }, 
                set: function(value) {
                    return this[setterName](value); 
                },
            });
        }
    },
    
    
    /**
     * Creates new Amm-style class (complete with __CLASS__ and __PARENT__ values); 
     * registers it in specified namespace;. allows to define properties.
     * 
     * @param {string|null} name Path to new class (Namespace.SubNamespace.ClassName). Parent namespaces must be defined.
     * @param {string|function|null} parent Constructor of parent class, or path to parent class. Optional.
     * @param {object|null} proto Prototype of new class. Use prop__propName: defaultValue, prop__propName: options
     * @param {function|null} constructorFn Constructor method. If not provided, default constructor is created.
     * @returns {function} constructor of new class
     */
    createClass: function(name, parent, proto, constructorFn) {
        if (name && typeof name !== 'string') throw Error("`name` must be a string");
        // locate namespace
        var ns = this._namespaces, p = name.split('.'), seg, parentConstructor;
        if (name) {
            while (p.length > 1) {
                seg = p.shift();
                if (!(seg in ns)) {
                    throw Error("Cannot find namespace for class `name` (segment '" + seg + "' failed)");
                }
                ns = ns[seg];
            }
            if (p[0] in ns) throw Error("class or namespace '" + name + "' is already registered");
        }
        if (parent) parentConstructor = Amm.getFunction(parent);
        if (!constructorFn) {
            if (!parentConstructor) {
                constructorFn = function(options) { 
                    Amm.init(this, options); 
                };
            } else {
                constructorFn = function() { 
                    parentConstructor.apply(this, Array.prototype.slice.apply(arguments));
                };
            }
        } else if (typeof constructorFn !== 'function') {
            throw Error("`constructor` must be a function");
        }
        if (name) ns[p[0]] = constructorFn;
        var pr = constructorFn.prototype, i, v;
        if (name) pr[name] = '__CLASS__';
        if (proto) for (i in proto) if (proto.hasOwnProperty(i)) {
            v = proto[i];
            if (i[4] === '_' && i.slice(0, 6) === 'prop__') {
                if (v && typeof v === 'object') {
                    Amm.createProperty(pr, i.slice(6), v.defaultValue, v.onChange, 
                    'defineProperty' in v? v.defineProperty : true);
                } else {
                    Amm.createProperty(pr, i.slice(6), v, null, true);
                }
                continue;
            }
            pr[i] = v;
        }
        // weird notation to be ignored by dependency detection script
        Amm['extend'](constructorFn, parentConstructor);
        return constructorFn;
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
        this.registerNamespace('ui', this.Ui);
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
    
    constructMany: function(manyOptions, baseClass, defaults, keyToProperty, setToDefaults, requirements) {
        var keys = [];
        var items;
        if (manyOptions instanceof Array) {
            items = manyOptions;
        } else if (manyOptions && typeof manyOptions === 'object') {
            items = [];
            for (var i in manyOptions) if (manyOptions.hasOwnProperty(i)) {
                keys.push(i);
                items.push(manyOptions[i]);
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
    findElement: function(domNode, requirements, scope) {
        var res;
        while (domNode) {
            res = null;
            var nodes = [];
            var views = Amm.DomHolder.find(domNode, false, false, nodes);
            if (!(views[0] && views[0]['Amm.View.Abstract'])) break;
            res = views[0].getElement();
            if (!requirements) break;
            if (typeof requirements === 'function') {
                var callRet = requirements.call(scope || window, res);
                if (callRet) break;
            } else if (Amm.meetsRequirements(res, requirements)) break;
            domNode = nodes.length? nodes[0].parentNode : null;
        }
        return res;
    },
    
    callMethods: function(object, prefix /*, ...*/) {
        var aa, res;
        for (var i in object) {
            if (i.length < prefix.length) continue;
            if (!(i[0] === prefix[0] && i[1] === prefix[1] && i[2] === prefix[2] && 
                i.slice(0, prefix.length) === prefix)) continue;
            if (typeof object[i] !== 'function') continue;
            if (arguments.length === 1) res = object[i]();
            else if (arguments.length === 2) res = object[i](arguments[1]);
            else if (arguments.length === 3) res = object[i](arguments[1], arguments[2]);
            else if (arguments.length === 4) res = object[i](arguments[1], arguments[2], arguments[3]);
            aa = aa || Array.prototype.slice.call(arguments, 2);
            res = object[i].apply(object, aa);
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
                        h = h.replace(/_/g, '-');
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

    /**
     * Same as Amm.html, but directly produces DOM nodes, so they don't need to be parsed by Jquery.
     * References to created items with _id key will be put into `outNodes`.
     * Definitions of the elements with matched _id key will be overridden by respective value
     * in `overrides` object by Amm.overrideRecursive.
     */
    dom: function(definition, dontReplaceUnderscores, outNodes, stringifyJson, overrides) {
        var res, i, l;
        if (typeof definition === 'object' && (definition.nodeType || 'nodeType' in definition)) return definition;
        if (stringifyJson && typeof stringifyJson === 'object' && overrides === undefined) {
            overrides = stringifyJson;
            stringifyJson = false;
        }
        if (!definition || typeof definition !== 'object') {
            definition = '' + definition;
            if (definition[0] === '<' && definition[definition.length - 1] === '>') return jQuery(definition).get();
            return document.createTextNode(definition);
        }
        if (definition instanceof Array) {
            res = [];
            for (i = 0, l = definition.length; i < l; i++) {
                res.push(Amm.dom(definition[i], dontReplaceUnderscores, outNodes, stringifyJson, overrides));
            }
            return res;
        }
        if (!definition.$) {
            console.log(definition);
            throw Error ("`$` (tag name) must be present in attribute definition");
        }
        if (overrides && ('_id' in definition) && definition._id in overrides && overrides[definition._id] !== definition) {
            definition = Amm.overrideRecursive({}, definition, false, false, true);
            definition = Amm.overrideRecursive(definition, overrides[definition._id], false, true, true);
        }
        res = document.createElement(definition.$);
        for (i in definition) if (definition.hasOwnProperty(i)) {
            var nativeJson = false;
            if (i[0] === '$') continue;
            var attrValue = definition[i];
            if (attrValue === false) continue;
            if (attrValue === true) attrValue = i;
            if (typeof attrValue === 'object' && attrValue) {
                if (i === 'style') {
                    var mkStyle;
                    mkStyle = function (h, v) {
                        var res = '';
                        h = h.replace(/_/g, '-');
                        if (!v || typeof v !== 'object') return h + ': ' + v + '; ';
                        if (v instanceof Array) return v.join(' ');
                        if (h.length) h += '-';
                        for (var i in v) if (v.hasOwnProperty(i)) {
                            res += mkStyle(h + i, v[i]);
                        }
                        return res;
                    };
                    attrValue = mkStyle('', attrValue);
                } else if (i.slice(0, 4) === 'data' && i.slice(5, 8) === 'amm' && !stringifyJson) {
                    nativeJson = true;
                } else {
                    attrValue = JSON.stringify(attrValue);
                }
            } else if (typeof attrValue === 'function' && i.slice(0, 2) === 'on') {
                // not compatible with IE < 9
                res.addEventListener(i.slice(2), attrValue);
                continue;
            }
            if (i === '_id') {
                if (outNodes) outNodes[attrValue] = res;
                continue;
            }
            if (i === '_text') {
                res.textContent = attrValue;
                continue;
            }
            if (i === '_html') {
                res.innerHTML = attrValue;
                continue;
            }
            if (!dontReplaceUnderscores) i = i.replace(/_/g, '-');
            if (nativeJson) {
                jQuery.data(res, 'x-' + i, attrValue);
                attrValue = '';
            }
            res.setAttribute(i, attrValue);
        }
        res._ammDom = true;
        if (!definition.$$) {
            return res;
        }
        var children = Amm.dom(definition.$$ instanceof Array? definition.$$ : [definition.$$],
            dontReplaceUnderscores, outNodes, stringifyJson, overrides);   
        for (i = 0, l = children.length; i < l; i++) {
            if ((children[i] instanceof Array)) {
                for (var j = 0, ll = children[i].length; j < ll; j++) {
                    res.appendChild(children[i][j]);
                }
            } else {
                 res.appendChild(children[i]);
            }
        }
        return res;
    },
    
    stringifyDomJson: function(dom) {
        jQuery(dom).find('*').addBack().each(function(idx, element) {
            var a = jQuery(element).data();
            //for (var i in data)
        });
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
    },
    
    /**
     * Subscribes to new association events, optionally unsubscribes from old association' events.
     * Is done to automate tedious task of procedurally re-subscribing when associated object
     * changes.
     * 
     * `event` may be string (than handler is required), Array (list of events, that will have
     * the same handler), or hash in format event: handler.
     * 
     * `handler` can be string, fn or Array[handlerFn, extra] where extra is additional argument
     * that will be passed to the handler.
     * 
     * Special form: assigning handlers to events using prefix
     * 
     * If `event` is a string, and no handler is provided, event is treated like method prefix,
     * `scope` is scanned for functions with prefix `event`, and remaining part of method name
     * is treated like name of event that it handles, i.e.
     *  
     * subUnsub: function(element, oldElement, view, '_handleElement')
     * 
     * when view has methods _handleElementVisibleChange, _handleElementEnabledChange
     * 
     * will subscribe to event visibleChange with handler view._handleElementVisibleChange, 
     * and event enabledChange with handler view._handleElementEnabledChange.
     * 
     * @param {Amm.WithEvents} assoc
     * @param {Amm.WithEvents} oldAssoc
     * @param scope
     * @param {string|object|Array} event
     * @param {string} handler
     * @param {boolean} reverse Subscribe new object first, unsubscribe old last
     */
    subUnsub: function(assoc, oldAssoc, scope, event, handler, reverse) {
        
        var i, l;
        
        if (scope && typeof scope === 'object' && event && typeof event === 'string' && !handler) {
            // prefix-type call
            
            var prefix = event, map = {}, foundAny = false;
            for (var method in scope) {
                if (!(typeof scope[method] === 'function'
                    && method[0] === prefix[0]
                    && method[1] === prefix[1]
                    && method.slice(0, prefix.length) === prefix
                    && method.length > prefix.length
                )) continue;
                foundAny = true;
                map[Amm.lcFirst(method.slice(prefix.length))] = scope[method];
            }
            if (!foundAny) return;
            return Amm.subUnsub(assoc, oldAssoc, scope, map, undefined, reverse);
            
        }
        
        if (event && typeof event === 'object') {
            if (event instanceof Array) {
                for (i = 0, l = event.length; i < l; i++) {
                    this.subUnsub(assoc, oldAssoc, scope, event[i], handler, reverse);
                }
            } else {
                if (handler) {
                    throw Error(
                        "Amm.subUnsub: when `event` is a hash, `handler` must not be set"
                    );
                }
                for (i in event) if (event.hasOwnProperty(i)) {
                    this.subUnsub(assoc, oldAssoc, scope, i, event[i], reverse);
                }
            }
            return;
        }
        if (!handler) throw Error("`handler` is required");
        var extra;
        if (handler instanceof Array) {
            extra = handler[1];
            handler = handler[0];
        }
        if (reverse && assoc) {
            if (assoc instanceof Array) {
                for (i = 0, l = assoc.length; i < l; i++) {
                    assoc[i].subscribe(event, handler, scope, extra);
                }
            } else {
                assoc.subscribe(event, handler, scope, extra);
            }
        }
        if (oldAssoc) {
            if (oldAssoc instanceof Array) {
                for (i = 0, l = oldAssoc.length; i < l; i++) {
                    oldAssoc[i].unsubscribe(event, handler, scope, extra);
                }
            } else {
                oldAssoc.unsubscribe(event, handler, scope, extra);
            }
        }
        if (!reverse && assoc) {
            if (assoc instanceof Array) {
                for (i = 0, l = assoc.length; i < l; i++) {
                    assoc[i].subscribe(event, handler, scope, extra);
                }
            } else {
                assoc.subscribe(event, handler, scope, extra);
            }
        }
    },
    
    isDomNode: function(object) {
        return object
            && (typeof object === 'object') 
            && ('nodeType' in object)
            && ('parentNode' in object);
    }
    
};

Amm.overrideRecursive.special 
    = function(what, scope) 
{
        
    if (!arguments.length) {
        this.remove = true;
        return this;
    }
    if (typeof what === 'function') {
        this.func = what;
        this.scope = scope;
        return this;
    }
    this.replace = what;
};

Amm.event = null;

//Amm.id = 'amm_' + Math.trunc(Math.random() * 1000000);

Amm.registerNamespace('Amm', Amm);

if (window.jQuery) {
    Amm.bootstrap();
}
