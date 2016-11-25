/* global Ajs_Util */

Amm = {
    
    ID_SEPARATOR: '/',
    
    id: 'amm',
    
    domHolderAttribute: 'data-amm-id',
    
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
    },
    
    unregisterItem: function(item) {
        if (typeof item === 'string') item = this._items[item];
        if (!item._amm_id || this._items[item._amm_id] !== item) throw "Item not found";
        if (typeof item.getPath === 'function') {
            var p = item.getPath();
            if (p[0] === '^') {
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
                    var item = this.getItem(item[i], throwIfNotFound);
                    if (item) r.push(item);
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
    
    extend: function(subClass, parentClass) {
        Ajs_Util.extend(subClass, parentClass);
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
                if (instance[i] === undefined) 
                    instance[i] = traitInstance[i];
            }
            if (typeof traitInstance.__augment === 'function') {
                traitInstance.__augment.call(instance, traitInstance);
            }
        }
    },
    
    getClass: function(object, all) {
        var r;
        if (all) r = [];
        for (var i in object) {
            if (object[i] === '__CLASS__') {
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
        if (!interfaces instanceof Array) interfaces = [interfaces];
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
            var v = optToSet[i], s = 'set' + ('' + i).slice(0, 1).toUpperCase() + ('' + i).slice(1);
            if (typeof object[s] === 'function') object[s](v);
            else if (i in object) object[i] = v;
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
    
    cleanupComponents: function() {
        if (this._components instanceof Array) {
            for (var i = 0, l = this._components.length; i < l; i++) {
                var prop = this._components[i], ag = this[prop];
                if (ag && typeof ag.cleanup === 'function') {
                    this[prop] = null;
                    ag.cleanup();
                }
            }
        }
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
    
    getProperty: function(element, property, defaultValue) {
        var P = ('' + property)[0].toUpperCase() + property.slice(1), getterName = 'get' + P;
        if (typeof element[getterName] === 'function') res = element[getterName]();
            else res = defaultValue;
        return res;
    },
    
    setProperty: function(element, property, value, throwIfNotFound) {
        var P = ('' + property[0]).toUpperCase() + property.slice(1), setterName = 'set' + P;
        if (typeof element[setterName] === 'function') res = element[setterName](value);
        else if (throwIfNotFound) throw "No setter for property: `" + property + "`";
        return res;
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
    }
    
};

Amm.event = null;

//Amm.id = 'amm_' + Math.trunc(Math.random() * 1000000);

Amm.registerNamespace('Amm', Amm);
