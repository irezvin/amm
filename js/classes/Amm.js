/* global Ajs_Util */

Amm = {
    
    ID_SEPARATOR: '/',
    
    id: 'amm',
    
    _counter: 0,
    
    _constructors: {},
    
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
    
    getRoot: function() {
        if (!this._root) this._root = new this.Root();
        return this._root;
    },
    
    registerItem: function(item) {
        if (item._amm_id) return;
        item._amm_id = this.id + '_' + this._counter++;
    },
    
    unregisterItem: function(item) {
        if (typeof item === 'string') item = this._items[item._amm_id];
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
            
    destroyItem: function(item) {
        if (typeof item === 'string') item = this._items[item._amm_id];
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
    
    getClass: function(object) {
        for (var i in object) {
            if (object[i] === '__CLASS__') {
                return i;
            }
        }
        return null;
    },
    
    is: function(item, className, throwIfNot) {
        var res = item && (item[className] === '__CLASS__' || item[className] === '__PARENT__');
        if (!res && throwIfNot) {
            var argname = typeof throwIfNot === 'string'? throwIfNot : '`item`';
            throw argname += " must be an instance of " + className;
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
        var hasExtra = arguments.length > 3;
        if (elementPath === null) kk = this._waitList;
        else kk = { elementPath : true };
        for (var i in kk) if (this._waitList.hasOwnProperty(i)) {
            if (fn === undefined && scope === undefined && !hasExtra) {
                delete this._waitList[i];
            } else {
                var v = this._waitList[elementPath];
                for (var j = v.length - 1; j >= 0; j--) {
                    if (    (fn === undefined || v[j][0] === fn) 
                         && (scope === undefined || v[j][1] === scope) 
                         && (!hasExtra || v[j][2] === extra)
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
    
    
    
    getConstructor: function(strName) {
        if (typeof strName !== 'string') throw "`strName` must be a string";
        if (this._constructors[strName]) return this._constructors[strName];
        var p = strName.split('.'), r = this._namespaces, s = [];
        while (p.length && r) {
            var h = p.splice(0, 1)[0];
            s.push (h);
            r = r[h];
        }
        if (!r) {
            if (p.length) {
                throw "Unknown namespace '" + s.join('.') + "' (when trying to locate constructor '" + strName + "')";
            } 
            else throw "Unknown constructor '" + s.join('.') + "'";
        }
        return r;
    },
    
    registerNamespace: function(ns, hash) {
        if (typeof ns !== 'string') throw "`ns` must be a string";
        if (!hash || typeof hash !== 'object') throw "`hash` must be an object";
        this._namespaces[ns] = hash;
    },
    
    registerConstructor: function(name, fn) {
        if (typeof name !== 'string') throw "`name` must be a string";
        if (!fn || typeof fn !== 'function') throw "`fn` must be a function";
        this._constructors[name] = fn;
    }
    
};

Amm.id = 'amm_' + Math.trunc(Math.random() * 1000000);

Amm.registerNamespace('Amm', Amm);
