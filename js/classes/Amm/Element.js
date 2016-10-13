/* global Amm */
/* global Ajs_Util */

/**
 * @class Amm.Element
 * @constructor
 */
Amm.Element = function(options) {
    Amm.HasOutSignals.call(this, options);
    Amm.init(this, options, ['id']);
    Amm.init(this, options);
};

Amm.Element.prototype = {

    'Amm.Element': '__CLASS__',
    
    _requiredParentClass: 'Amm.Element.Composite',
    
    _id: null,
    
    /**
     * Default signal when some observer pushes data to the element without specifying the signal name
     * @type {string}
     */
    defaultIn: null,
    
    setId: function(id) {
        if (this._id === id) return;
        var o = this._id;
        if (this._parent && this._parent.hasChild(id) && this._parent.getChild(id) !== this) {
            throw "Cannot setId() since the Parent already hasChild() with id '" + id + "'";
        }
        this._id = id;
        this.outIdChanged(this, o);
        this.outPathChanged();
    },
    
    getId: function() {
        return this._id;
    },
    
    _parent: null,
    
    setParent: function(parent) {
        if (parent === this._parent) return; // nothing to do
        this._parent = null;
        if (this._parent)
            this._parent.removeChild(this);
        this.outDetached();
        if (parent) {
            if (this._requiredParentClass) Amm.is(parent, this._requiredParentClass, 'parent');
            try {
                this._parent = parent;
                this._parent.addChild(this);
            } catch (e) {
                this._parent = null;
                throw e;
            }
        }
        return true;
    },
    
    outDetached: function() {
        this._out('detached', this);
    },
    
    outAttached: function() {
        this._out('attached');
    },
    
    outIdChanged: function() {
        this._out('idChanged', this);
    },
    
    outPathChanged: function() {
        this._out('pathChanged', this);
    },
    
    /**
     * Returns an element that is specified by a path
     * @param {string|Array} path (path must be non-empty!)
     * @return {Amm.Element}
     */
    getElementByPath: function(path) {
        if ((!typeof path === 'string' && !path instanceof Array) || !path.length) 
            throw "`path` must be a non-empty array or non-empty string";
        var res = null, scope;
        
        // head, tail. Use regExp to treat multiple occurances of '/' as one (more UNIXy)
        var head, tail; 
        if (typeof path === 'string') {
            tail = path.split(/\/+/);
        } else {
            tail = [].concat(path);
        }
        head = tail.splice(0, 1)[0];
        if (head === '') {
            scope = this.getRoot();
        }
        else if (head === '.') scope = this;
        else if (head === '..') scope = this.getParent();
        else scope = this.getChild(head);
        if (scope) {
            if (!tail.length) { // nothing left to do
                res = scope;
            } else {
                res = scope.getElementByPath(tail);
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
    getRoot: function() {
        var res = null;
        for (var e = this.getParent(); e; e = e.getParent()) res = e;
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
    
    // converts list of functions inFoo(), inBar() to 'foo', 'bar'
    listInSignals: function() {
        var res = [];
        for (var i in this) {
            if (('' + i).slice(0, 2) === 'in' && typeof this[i] === 'function') {
                i = '' + i;
                i = i.slice(2, 3).toLowerCase() + i.slice(3, i.length);
                if (i.length) res.push(i);
            }
        }
        return res;
    },
    
    /**
     * @param {string} inSignal
     * @returns {String} Empty string if there is no such in signal, or function name to receive the signal
     */
    hasInSignal: function(inSignal) {
        var res = '', n = 'in' + Ajs_Util.ucFirst(inSignal);
        if (typeof this[n] === 'function') res = n;
        return res;
    },
    
    /**
     * Accepts any number of additional arguments
     * @param {string} inSignal
     * @returns {bool} Whether such signal was found or not 
     * If there was no such signal, will raise an error if strictSignals === TRUE, instead of returning FALSE
     */
    receiveSignal: function(inSignal) {
        var args = Array.prototype.slice.call(arguments, 1), sn = this.hasInSignal(inSignal), res = true;
        if (sn) {
            this[sn].apply(this, args);
        } else {
            if (this.strictSignals)
                throw "No such inSignal: '" + inSignal + "'";
            res = false;
        }
        return res;
    },
    
    outCleanup: function() {
        this._out('cleanup', this);
    },
    
    cleanup: function() {
        Amm.HasOutSignals.prototype.cleanup.call(this);
        this.setParent(null);
        this.outCleanup();
    }
    
};

Amm.extend(Amm.Element, Amm.HasOutSignals);