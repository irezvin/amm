/* global Amm */
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

    _clone: false,
    
    _dynamic: false,
    
    _result: undefined,
    
    setDynamic: function(dynamic) {
        dynamic = !!dynamic;
        var oldDynamic = this._dynamic;
        if (oldDynamic === dynamic) return;
        this._dynamic = dynamic;
        return true;
    },

    getDynamic: function() { return this._dynamic; },

    toJSON: function() {
        var res = { $ref: this._find };
        if (this._closest !== null) res.closest = this._closest;
        if (this._index !== 0) res.index = this._index;
        if (this._global) res.global = this._global;
        if (this._parent) res.parent = this._parent;
        return res;
    },

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
    
    setClone: function(clone) {
        clone = !!clone;
        var oldClone = this._clone;
        if (oldClone === clone) return;
        this._clone = clone;
        return true;
    },

    getClone: function() { return this._clone; },

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
        
        if (!this._dynamic) {
            if (this._result) return this._result;
            this._dynamic = true;
            this._result = this.resolve(onlyScalar);
            this._dynamic = false;
            return this._result;
        }
        
        var c;
        
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
            c = curr[this._index] || null;
            if (this._clone) return jQuery(c).clone(true, true)[0];
            return c;
        }
        
        if (onlyScalar) {
            c = curr[0] || null;
            if (this._clone) return jQuery(c).clone(true, true)[0];
            return c;
        }
        
        if (this._clone) {
            return curr.clone();
        }
        
        return curr;
        
    }

};
