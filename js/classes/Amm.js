/* global Ajs_Util */

Amm = {
    
    id: 'amm',
    
    _counter: 0,
    
    _constructors: {},
    
    _namespaces: {},

    /**
     * We maintain huge hash of all created items to reference them in appropriate places of the DOM (really?) or whatever
     */
    _items: {
    },

    /**
     * List of elementPath => function, scope
     */
    _waitList: {
    },
    
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
        this.stopWaiting(undefined, undefined, item);
        delete this._items[item._amm_id];
        item._amm_id = null;
    },
            
    destroyItem: function(item) {
        if (typeof item === 'string') item = this._items[item._amm_id];
        if (typeof item.cleanup === 'function') item.cleanup();
        for (var i in this._items) if (this._items.hasOwnProperty(i)) {
            if (this._items[i]['Amm.Element']) this._items[i].unsubscribe(item);
        }
        this.unregisterItem(item);
    },
    
    extend: function(subClass, parentClass) {
        Ajs_Util.extend(subClass, parentClass);
    },
    
    is: function(item, className, throwIfNot) {
        var res = item && item[className] === '__CLASS__';
        if (!res && throwIfNot) {
            var argname = typeof throwIfNot === 'string'? throwIfNot : '`item`';
            throw argname += " must be an instance of " + className;
        }
        return res;
    },
    
    getElementByPath: function(path) { // TODO
        return this.root.getElementByPath(path);
    },
    
    /**
     * adds function and scope to wait for the element with given path to appear
     */
    waitFor: function(elementPath, fn, scope) {
        scope = scope || null;
        if (!this._waitList[elementPath]) this._waitList[elementPath] = [];
        else {
            for (var i = this._waitList[elementPath].length - 1; i >= 0; i--) {
                // already waiting
                if (this._waitList[elementPath][i][0] === fn && this._waitList[elementPath][i][1] === scope) return false;
            }
            this._waitList[elementPath].push([fn, scope]);
        }
    },
            
    notifyElementAppeared: function(elementPath, element) {
        if (!this._waitList[elementPath]) return;
        var v = this._waitList[elementPath], l = v.length;
        delete this._waitList[elementPath];
        for (var i = 0; i < l; i++) this._waitList[i][0].call(this._waitList[i][1] || element, element, elementPath);
    },
    
    stopWaiting: function(elementPath, fn, scope) {
        elementPath = elementPath || null;
        fn = fn || null;
        if (elementPath === null) kk = this._waitList;
        else kk = { elementPath : true };
        for (var i in kk) if (this._waitList.hasOwnProperty(i)) {
            if (fn === undefined || scope === undefined) {
                delete this._waitList[i];
            } else {
                var v = this._waitList[elementPath];
                for (var j = v.length - 1; j >= 0; j--) {
                    if ((fn === undefined || v[j][0] === fn) && (scope === undefined || v[j][1] === scope)) {
                        v[i].splice(j, 1);
                    }
                }
            }
        }
    },
    
    init: function(object, constructorHash) {
        if (!constructorHash) return;
        for (var i in constructorHash) if (constructorHash.hasOwnProperty(i)) {
            var v = constructorHash[i], s = 'set' + ('' + i).slice(0, 1).toUpperCase() + ('' + i).slice(1);
            if (typeof object[s] === 'function') object[s](v);
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
