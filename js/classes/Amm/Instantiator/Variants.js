/* global Amm */

Amm.Instantiator.Variants = function(options) {
    
    this._prototypes = {};
    this._matches = [];
    this._objects = [];
    this._instances = [];
    Amm.Instantiator.call(this);
    Amm.WithEvents.call(this, options);
    
};

Amm.Instantiator.Variants.prototype = {

    'Amm.Instantiator.Variants': '__CLASS__', 
    
    _defaultPrototype: null,
    
    _prototypes: null,
    
    _overrideDefaultPrototype: false,
    
    _matches: null,
    
    _objects: null,
    
    _instances: null,
    
    _filter: null,
    
    _filterIsAggregate: false,

    _subscribeFilter: true,
    
    _allowNullInstance: false,
    
    _assocProperty: null,
    
    _revAssocProperty: null,
    
    setPrototypes: function(prototypes, match) {
        if (!prototypes || typeof prototypes !== 'object')
            throw Error("`prototypes` must be a non-null object");
        if (match !== undefined) {
            this._prototypes[match] = Amm.override({}, prototypes);
            return;
        }
        this._prototypes = Amm.override({}, prototypes);
    },
    
    getPrototypes: function(match) {
        if (match === undefined) return this._prototypes;
        return this._prototypes[match];
    },
    
    setDefaultPrototype: function(defaultPrototype) {
        if (typeof defaultPrototype !== 'object') {
            throw Error("`defaultPrototype` must be a null or an object");
        }
        if (!defaultPrototype) {
            this._defaultPrototype = null;
        } else {
            this._defaultPrototype = Amm.override({}, defaultPrototype);
        }
    },
    
    getDefaultPrototype: function() {
        return this._defaultPrototype;
    },
    
    setOverrideDefaultPrototype: function(overrideDefaultPrototype) {
        overrideDefaultPrototype = !!overrideDefaultPrototype;
        var oldOverrideDefaultPrototype = this._overrideDefaultPrototype;
        if (oldOverrideDefaultPrototype === overrideDefaultPrototype) return;
        this._overrideDefaultPrototype = overrideDefaultPrototype;
        return true;
    },

    getOverrideDefaultPrototype: function() {
        return this._overrideDefaultPrototype; 
    },

    construct: function(object, match) {
        var idx = this._findObject(object);
        if (match === undefined && this._filter && this._subscribeFilter && idx >= 0) {
            match = this._filter.getMatch(object);
        } else if (match === undefined && this._filter) {
            match = this._filter.evaluateMatch(object);
        }
        var res = this._build(object, match);
        if (!object) return res;
        if (idx >= 0) { // we have already subscribed to this object
            this._matches[idx] = match;
        } else { // we didn't subscribe yet
            idx = this._objects.length;
            this._objects.push(object);
            this._matches.push(match);
            this._instances[idx] = [];
            this._subscribeObject(object);
            if (this._filter && this._subscribeFilter) {
                this._filter.observeObject(object);
            }
        }
        if (!res && this._instances[idx][0] !== null) {
            // we need to have non-empty list of instances
            // to keep subscribed to the object. We keep NULL
            // first item to always easily find it.
            this._instances[idx].unshift(null); 
        }
        if (res) {
            if (this._instances[idx][0] === null) {
                this._instances[idx].splice(0, 1);
            }
            this._instances[idx].push(res);
            this._subscribeInstance(res);
        }
        return res;
    },
    
    _build: function(object, match) {
        
        var proto, def = this._defaultPrototype;
        /* TODO: test */
        if (this._prototypes[match]) {
            proto = this._prototypes[match];
            if (Amm.Builder.isPossibleBuilderSource(proto)) {
                proto = Amm.Builder.calcPrototypeFromSource(proto, false);
            }
            if (def && this._overrideDefaultPrototype) {
                def = this._defaultPrototype;
                if (Amm.Builder.isPossibleBuilderSource(def)) {
                    def = Amm.Builder.calcPrototypeFromSource(def, false);
                }
                proto = Amm.override({}, def, proto);
            } else {
                proto = Amm.override({}, proto);
            }
        } else {
            if (!this._defaultPrototype) {
                if (!this._allowNullInstance) {
                    throw Error("No prototype for match '" + match + "' and `defaultPrototype` not set!");
                }
                return null;
            }
            if (Amm.Builder.isPossibleBuilderSource(def)) {
                def = Amm.Builder.calcPrototypeFromSource(def, false);
            } else {
                proto = Amm.override({}, def);
            }
        }
        var assocProperty = this._assocProperty, revAssocProperty = this._revAssocProperty;
        if ('__assocProperty' in proto) {
            assocProperty = proto.__assocProperty;
            delete proto.__assocProperty;
        }
        if ('__revAssocProperty' in proto) {
            revAssocProperty = proto.__revAssocProperty;
            delete proto.__revAssocProperty;
        }
        var res = Amm.constructInstance(proto);
        if (assocProperty) Amm.setProperty(res, assocProperty, object);
        if (revAssocProperty && typeof object === 'object' && object) {
            Amm.setProperty(object, revAssocProperty, res);
        }
        return res;
    },
    
    destruct: function(instance) {
        this.forgetInstance(instance);
        if (instance.cleanup) {
            instance.cleanup();
        }
    },
    
    getMatches: function(objects) {
        var dupes = Amm.Array.findDuplicates([].concat(this._objects, objects), false, null, this._objects.length);
        if (!dupes.length) return;
        var i, l, myIdx, inIdx;
        var res = [];
        for (i = 0, l = objects.length; i < l; i++) res.push(undefined);
        for (i = 0, l = dupes.length; i < l; i++) {
            var myIdx = dupes[i][0], inIdx = dupes[i][1] - this._objects.length;
            res[inIdx] = this._matches[myIdx];
        }
        return res;
    },
    
    setMatches: function(objects, matches) {
        if (!objects.length || !this._objects.length) return;
        if (matches.length !== objects.length) throw Exception("`objects` and `matches` must have same length (are: " + objects.length + " and " + matches.length + ")");
        var changedObjects = [], changedMatches = [];
        var dupes = Amm.Array.findDuplicates([].concat(this._objects, objects), false, null, this._objects.length);
        if (!dupes.length) return;
        var i, l, myIdx, inIdx;
        for (i = 0, l = dupes.length; i < l; i++) {
            var myIdx = dupes[i][0], inIdx = dupes[i][1] - this._objects.length;
            if (this._matches[myIdx] === matches[inIdx]) continue;
            
            var 
                hadProto = this._matches[myIdx] in this._prototypes,
                hasProto = matches[inIdx] in this._prototypes;

            this._matches[myIdx] = matches[inIdx];
            
            if (!hasProto && !hadProto) continue; // still resort to default proto
                        
            changedObjects.push(this._objects[myIdx]);
            changedMatches.push(this._matches[myIdx]);
        }
        if (!changedObjects.length) return;
        this.outNeedRebuild(changedObjects, changedMatches, this);
    },
    
    outNeedRebuild: function(objects, matches, instantiator) {
        this._out('needRebuild', objects, matches, instantiator);
    },
    
    cleanup: function() {
        if (this._filter) this.setFilter(null);
        Amm.WithEvents.prototype.cleanup.call(this);
        this._objects = [];
        this._matches = []; 
        for (var i = 0, l = this._instances.length; i < l; i++) {
            this._instances[i] = [];
        }
        this._instances = [];
        this._prototypes = {};
        this._defaultPrototype = {};
    },

    setFilter: function(filter) {
        var isAggregate = false;
        if (filter) {
            if (typeof filter === 'object' && !filter['Amm.MultiObserver.Filter']) {
                filter = Amm.constructInstance(filter, 'Amm.MultiObserver.Filter');
                isAggregate = true;
            }
        }  else {
            filter = null;
        }                
        var oldFilter = this._filter;
        if (oldFilter === filter) return;
        if (this._filter) { // delete old filter
            if (this._filterIsAggregate) this._filter.cleanup();
            else if (this._subscribeFilter) this._subFilter(true);
        }
                
        this._filterIsAggregate = isAggregate;
        this._filter = filter;
        
        if (this._filter && this._subscribeFilter) {
            this._subFilter();
            this.setMatches(this._filter.getObservedObjects(), this._filter.getMatches());
        }
        
        return true;
    },

    getFilter: function() { return this._filter; },

    setSubscribeFilter: function(subscribeFilter) {
        subscribeFilter = !!subscribeFilter;
        var oldSubscribeFilter = this._subscribeFilter;
        if (oldSubscribeFilter === subscribeFilter) return;
        this._subscribeFilter = subscribeFilter;
        if (this._filter) 
            this._subFilter(!this._subscribeFilter);
        return true;
    },

    getSubscribeFilter: function() { return this._subscribeFilter; },
    
    getFilterIsAggregate: function() { return this._filterIsAggregate; },
    
    hasObject: function(object) {
        return this._findObject(object) >= 0;
    },
    
    hasInstance: function(instance) {
        return !!this._findInstance(instance);
    },
    
    forgetObject: function(object) {
        var idx = this._findObject(object);
        if (idx < 0) return;
        this._forgetObject(idx);
        return true;
    },
    
    forgetInstance: function(instance) {
        if (!instance) return;
        var idx = this._findInstance(instance);
        if (!idx) return;
        this._unsubscribeInstance(instance);
        this._instances[idx[0]].splice(idx[1], 1);
        if (!this._instances[idx[0]].length) {
            this._forgetObject(idx[0]);
        }
        return true;
    },
    
    getInstances: function(object) {
        var idx = this._findObject(object);
        if (idx < 0) return [];
        return [].concat(this._instances[idx]);
    },
    
    _subFilter: function(unsub) {
        if (unsub) {
            this._filter.unsubscribe('matchesChange', this.handleFilterMatchesChange, this);
            this._filter.setObservedObjects([]);
            return;
        }
        this._filter.setObservedObjects(this._objects);
        this._filter.subscribe('matchesChange', this.handleFilterMatchesChange, this);
    },
    
    handleFilterMatchesChange: function(objects, matches, oldMatches) {
        
        var nObjects = [], nMatches = [], nOldMatches = [];
        for (var i = 0, l = objects.length; i < l; i++) {
            // we are not insterested in changes caused by adding/deleting objects to/from filter
            if (oldMatches[i] === undefined || matches[i] === undefined) continue;
            nObjects.push(objects[i]);
            nMatches.push(matches[i]);
        }
        if (nObjects.length) this.setMatches(nObjects, nMatches);
        
    },
    
    _findObject: function(object) {
        if (typeof object !== 'object' || !object) return -1;
        return Amm.Array.indexOf(object, this._objects);
    },
    
    _findInstance: function(instance) {
        var i, j, l, ll;
        for (i = 0, l = this._instances.length; i < l; i++) {
            for (j = 0, ll = this._instances[i].length; j < ll; j++) {
                if (this._instances[i][j] === instance) return [i, j];
            }
        }
        return null;
    },
    
    _forgetObject: function(idx) {
        var object = this._objects[idx], instances = this._instances[idx];
        if (this._filter) this._filter.unobserveObject(object);
        
        this._objects.splice(idx, 1);
        this._instances.splice(idx, 1);
        if (instances.length) this._unsubscribeInstance(instances, true);
        this._unsubscribeObject(object);
    },
    
    _subscribeObject: function(object) {
        if (!object || typeof object !== 'object') return;
        if (object['Amm.WithEvents'] && object.hasEvent('cleanup')) {
            object.subscribe('cleanup', this._handleObjectCleanup, this);
        }
    },
    
    _unsubscribeObject: function(object) {
        if (object['Amm.WithEvents'] && object.hasEvent('cleanup')) {
            object.unsubscribe('cleanup', this._handleObjectCleanup, this);
        }
    },
    
    _forgetObjectsWithoutInstances: function() {
        for (var i = this._objects.length - 1; i >= 0; i--) {
            if (this._instances[i][0] !== null) continue;
            this._instances[i].splice(0, 1);
            if (this._instances[i].length) continue;
            this._forgetObject(i);
        }
    },
    
    _unsubscribeInstance: function(instance, many) {
        if (many) {
            for (var i = 0, l = instance.length; i < l; i++)
                this._unsubscribeInstance(instance[i]);
            return;
        }
        if (instance['Amm.WithEvents'] && instance.hasEvent('cleanup')) {
            instance.unsubscribe('cleanup', this._handleInstanceCleanup, this);
        }
    },
    
    _subscribeInstance: function(instance) {
        if (instance['Amm.WithEvents'] && instance.hasEvent('cleanup')) {
            instance.subscribe('cleanup', this._handleInstanceCleanup, this);
        }
    },
    
    _handleObjectCleanup: function() {
        this.forgetObject(Amm.event.origin);
    },
    
    _handleInstanceCleanup: function() {
        this.forgetInstance(Amm.event.origin);
    },

    /**
     * if TRUE, no exception is thrown and NULL is returned 
     * when there's no match of filter. In this case all objects
     * passed to the instantiator will be tracked, and forgotten only
     * with forgetObject() call (even if they don't have any instances).
     * 
     * @TODO: auto-disposal of objects with instances
     * 
     * @param {bool} allowNullInstance
     * @return {Boolean|undefined}
     */
    setAllowNullInstance: function(allowNullInstance) {
        allowNullInstance = !!allowNullInstance;
        var oldAllowNullInstance = this._allowNullInstance;
        if (oldAllowNullInstance === allowNullInstance) return;
        this._allowNullInstance = allowNullInstance;
        if (!allowNullInstance) this._forgetObjectsWithoutInstances();
        return true;
    },

    getAllowNullInstance: function() { return this._allowNullInstance; },
    
    setAssocProperty: function(assocProperty) {
        if (!assocProperty) assocProperty = null;
        var oldAssocProperty = this._assocProperty;
        if (oldAssocProperty === assocProperty) return;
        this._assocProperty = assocProperty;
        return true;
    },

    getAssocProperty: function() { return this._assocProperty; },

    setRevAssocProperty: function(revAssocProperty) {
        if (!revAssocProperty) revAssocProperty = null;
        var oldRevAssocProperty = this._revAssocProperty;
        if (oldRevAssocProperty === revAssocProperty) return;
        this._revAssocProperty = revAssocProperty;
        return true;
    },

    getRevAssocProperty: function() { return this._revAssocProperty; },

    
    
};

Amm.extend(Amm.Instantiator.Variants, Amm.Instantiator);
Amm.extend(Amm.Instantiator.Variants, Amm.WithEvents);

