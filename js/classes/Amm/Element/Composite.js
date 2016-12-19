/* global Amm */

Amm.Element.Composite = function(options) {
    this._children = {};
    Amm.Element.call(this, options);
};

Amm.Element.Composite.prototype = {
    
    'Amm.Element.Composite': '__CLASS__',
    
    _requiredChildClass: 'Amm.Element',
    
    _children: null,
    
    _cleanupChildren: false,

    _autoId: function(child) {
        return (Amm.getClass(child) || '__auto__') + child._amm_id;
    },
    
    addChild: function(child) {
        if (!child || typeof child !== 'object') throw "`child` must be a non-null object";
        if (this._requiredChildClass) Amm.is(child, this._requiredChildClass, 'child');
        var id = child.getId();
        if (!id) {
            id = this._autoId(child);
            if (!id) throw "`child` doesn't have Id, cannot auto-assign";
            child.setId(id);
        }
        if (this.hasChild(child)) return; // bingo - have it already
        if (this._children[id]) {
            if (this._children[id] !== child) throw "Parent already has child with id '" + id + "'";
            else throw "Assertion: hasChild() returned FALSE, but the instance is there!";
        }
        child.setParent(this);
        this._children[id] = child;
        this._subscribeChild(child);
        this.outChildAdded(child);
        return true;
    },
    
    removeChild: function(child) {
        var hasChild = this.hasChild(child), isParent = child.getParent() === this;
        if (hasChild) {
            delete this._children[child.getId()];
            this._unsubscribeChild(child);
        }
        if (isParent) child.setParent(null);
        this.outChildRemoved(child);
    },
    
    outChildAdded: function(child) {
        this._out('childAdded', child);
    },
    
    outChildRemoved: function(child) {
        this._out('childRemoved', child);
    },
    
    outChildIdChanged: function(child, id, oldId) {
        this._out('childIdChanged', child, id, oldId);
    },
    
    _subscribeChild: function(child) {
        child.subscribe('idChange', this._childIdChange, this);
    },
    
    _unsubscribeChild: function(child) {
        child.unsubscribe('idChange', undefined, this);
    },
    
    _childIdChange: function(newId, oldId) {
        child = Amm.event.origin;
        if (this._children[newId] && this._children[newId] !== child)
            throw "Cannot handle _childIdChange to id that is already busy ('" + newId + "')";
        if (this._children[oldId] === child) {
            delete this._children[oldId];
        } else {
            console.warn("Wtf: childIdChange notification received, but child not found with child id");
        }
        this._children[newId] = child;
        this.outChildIdChanged(child, newId, oldId);
    },
    
    hasChild: function(child) {
        var res = false, id;
        if (typeof child !== 'object') {
            id = child;
            res = !!this._children[id];
        } else if (child && typeof child === 'object' && typeof child.getId === 'function') {
            id = child.getId();
            res = this._children[id] === child;
        }
        return res;
    },
    
    listChildren: function() {
        if (Object.getOwnPropertyNames) return Object.getOwnPropertyNames(this._children);
        var r = [];
        for (var i in this._children) {
            if (this._children.hasOwnProperty(i)) r.push(i);
        }
        return r;
    },
    
    getChild: function(id) {
        return this._children[id];
    },
    
    setCleanupChildren: function(cleanupChildren) {
        var oldCleanupChildren = this._cleanupChildren;
        if (oldCleanupChildren === cleanupChildren) return;
        this._cleanupChildren = cleanupChildren;
        return true;
    },

    getCleanupChildren: function() { return this._cleanupChildren; }
    
};

Amm.extend(Amm.Element.Composite, Amm.Element);