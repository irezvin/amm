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

    _tryObserve: function() {
        var res = Amm.View.Abstract.prototype._tryObserve.call(this);
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

