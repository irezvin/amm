/* global Amm */

/**
 * @class Amm.Element
 * @constructor
 */
Amm.Element = function(options) {
    Amm.registerItem(this);
    if (options && options.traits) {
        if (!(options.traits instanceof Array)) options.traits = [options.traits];
        for (var i = 0; i < options.traits.length; i++) {
            Amm.augment(this, options.traits[i]);
        }
        delete options.traits;
    }
    Amm.WithEvents.call(this, {});
    Amm.init(this, options, ['id']);
    Amm.init(this, options);
};

Amm.Element.prototype = {

    'Amm.Element': '__CLASS__',
    
    _requiredParentClass: 'Amm.Element.Composite',
    
    _id: null,
    
    _path: null,
    
    _parent: null,
    
    // null means "check parent cleanupChildren value", true and false - specific action on parent cleanup event
    _cleanupWithParent: null,
    
    /*
     * Path to the non-exiting (yet) parent for deferred association
     */
    _deferredParentPath: null,
    
    defaultProperty: null,
    
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

    /**
     * Locates child element by id. Returns NULL if specific child element isn't find
     * @return {Amm.Element}
     */
    getChild: function(id) {
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
        return Amm.createSimpleProperty(this, propName, defaultValue, onChange);
    },

    cleanup: function() {
        Amm.WithEvents.prototype.cleanup.call(this);
        this.setParent(null);
        this.outCleanup();
    }
    
};

Amm.extend(Amm.Element, Amm.WithEvents);