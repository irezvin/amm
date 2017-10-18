Amm = {
    
    ID_SEPARATOR: '/',
    
    id: 'amm',
    
    domHolderAttribute: 'data-amm-iid',
    
    _counter: 1,
    
    _functions: {},
    
    _namespaces: {},

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
        args: []
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
    	for (var i in parentClass.prototype)
            if (!(i in subClass.prototype))
                subClass.prototype[i] = parentClass.prototype[i];
        if (dontIndicateParent) return;
        var c = this.getClass(parentClass.prototype);
        if (c) subClass.prototype[c] = '__PARENT__';
    },
    
    augment: function(instance, trait) {
        var l = arguments.length;
        if (l > 2) {
            for (var j = 1; j < l; j++) {
                Amm.augment(instance, arguments[j]);
            }
        } else {
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
                traitInstance.__augment.call(instance, traitInstance);
            }
        }
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
        if (typeof strName !== 'string') throw "`strName` must be a string";
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
        if (!hash || typeof hash !== 'object') throw "`hash` must be an object";
        this._namespaces[ns] = hash;
    },
    
    registerFunction: function(name, fn) {
        if (typeof name !== 'string') throw "`name` must be a string";
        if (!fn || typeof fn !== 'function') throw "`fn` must be a function";
        this._functions[name] = fn;
    },
    
    pushEvent: function(event) {
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
        else if (typeof decorator === 'object') {
            if (typeof decorator.decorate === 'function') return decorator.decorate(value, context);
            else throw "`decorator` has no function decorate";
        } else {
            throw "`decorator` must be either function or an object with .decorate() method";
        }
    },
    
    override: function(modifiedObject, overrider, noOverwrite) {
        if (typeof modifiedObject !== 'object' || typeof overrider !== 'object')
            throw 'Both modifiedObject and overrider must be objects';

        for (var i in overrider) if (overrider.hasOwnProperty(i)) {
            if (modifiedObject[i] instanceof Array && overrider[i] instanceof Array) {
                modifiedObject[i] = modifiedObject[i].concat(overrider[i]);
            } else if (typeof modifiedObject[i] === 'object' && typeof overrider[i] === 'object')  {
                this.override(modifiedObject[i], overrider[i], noOverwrite);
            } else if (!noOverwrite || !(i in modifiedObject)) {
                modifiedObject[i] = overrider[i];
            }
        };
        return modifiedObject;
    },
    
    cleanup: function(itemOrItems) {
        for (var j = 0, al = arguments.length; j < al; j++) {
            itemOrItems = arguments[j];
            if (typeof itemOrItems.cleanup === 'function') itemOrItems.cleanup();
            else if (itemOrItems instanceof Array) {
                for (var i = 0, l = itemOrItems.length; i < l; i++)
                    this.cleanup(itemOrItems[i]);
            } else {
                console.log(itemOrItems);
                throw '`itemOrItems` must be either an object with .cleanup() method or an Array';
            }
        }
    }
};

Amm.event = null;

//Amm.id = 'amm_' + Math.trunc(Math.random() * 1000000);

Amm.registerNamespace('Amm', Amm);
