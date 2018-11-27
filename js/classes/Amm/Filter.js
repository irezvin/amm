/* global Amm */

Amm.Filter = function(options) {
    this._conditions = [];
    this._objects = [];
    this._matches = [];
    this._deferredChanges = [];
    Amm.WithEvents.DispatcherProxy.call(this);
    Amm.WithEvents.call(this, options);
};

Amm.Filter.prototype = {
    
    'Amm.Filter': '__CLASS__',
    
    _conditions: null,
    
    // numeric array with observed objects
    _objects: null,
    
    // `index in this._objects` => `match result`
    _matches: null,
    
    // [ [`index in this._objects`, `old match result`, `object`] ]
    _deferredChanges: null,
    
    _updateLevel: 0,
    
    _oldMatchingObjects: null,
    
    _matchingObjects: null,

    // TRUE to require matched object to match ALL conditions; match := last condition value (as JS &&)
    _requireAll: false,
    
    getObservedObjects: function() {
        return [].concat(this._objects);
    },
    
    // notice: does NOT change order of objects that were already observed. Adds new objects to the end of this._objects
    setObservedObjects: function(objects) {
        var i, l, match;
        
        if (!objects) objects = [];
        else objects = Amm.Array.unique(objects);
        
        var changes = Amm.Array.calcChanges(this._objects, objects, null, 0, true);
        
        if (!changes.added.length && !changes.deleted.length) return;
        
        this.beginUpdate();
        
        if (changes.deleted.length) {
            var deletedObjects = [], deletedMatches = [], deletedIndice = {};
            for (i = changes.deleted.length - 1; i >= 0; i--) {
                deletedObjects.unshift(changes.deleted[i][0]);
                match = this._matches[changes.deleted[i][1]];
                deletedMatches.unshift(match);
                this._objects.splice(i, 1);
                this._matches.splice(i, 1);
                deletedIndice[changes.deleted[i][1]] = true;
                this._deferredChanges.push([undefined, match, changes.deleted[i]]);
            }
            for (i = this._deferredChanges.length - changes.deleted.length; i >= 0; i--) {
                if (deletedIndice[this._deferredChanges[i][0]]) this._deferredChanges.splice(i, 1);
            }
            this._unsubConditions(deletedObjects, undefined, true);
            this.outObjectsUnobserved(deletedObjects, deletedMatches);
        }
        if (changes.added.length) {
            var addedObjects = [], addedMatches = [];
            for (i = 0, l = changes.added.length; i < l; i++) {
                addedObjects.push(changes.added[i][0]);
                match = this.evaluateMatch(changes.added[i][0]);
                this._matches.push(match);
                addedMatches.push(match);
                this._deferredChanges.push([this._objects.length - 1, undefined, changes.added[i][0]]);
            }
            this._objects.push.apply(this._objects, addedObjects);
            this._subConditions(addedObjects, undefined, false, true);
            this.outObjectsObserved(addedObjects, addedMatches);
        }
        this.endUpdate();
    },
    
    getMatches: function() {
        return [].concat(this._matches);
    },
    
    setConditions: function(conditions, id) {
        var condition = null, oldConditions;
        if (this._subscribers.outConditionsChange) {
            oldConditions = [].concat(this._conditions);
        }
        if (id) {
            if (conditions) {
                if (typeof conditions !== 'object') throw Error("setConditions(`conditions`, `id`): non-FALSEable `conditions` must be an object");
                conditions._id = id;
                condition = this._createCondition(conditions);
            }
            this.beginUpdate();
            var i, l;
            for (i = 0, l = this._conditions.length; i < l; i++) {
                if (this._conditions[i].id === id) {
                    this._conditions[i].cleanup();
                    this._conditions.splice(i, 1);
                    break;
                }
            }
            this._conditions.push(condition);
            if (this._subscribers.outConditionsChange) {
                this.outConditionsChange([].concat(this._conditions), oldConditions);
            }
            condition.observe(this._objects);
            this.refresh();
            this.endUpdate();
            return;
        }
        var instances = [];
        if (conditions) {
            if (!(conditions instanceof Array)) throw Error("`conditions` must be an Array");
            var ids = {};
            for (i = 0, l = conditions.length; i < l; i++) {
                condition = this._createCondition(conditions[i]);
                instances.push(condition);
                if (!condition.id) continue;
                if (condition.id in ids)
                    throw Error("conditions['" + i + "'].id is same as " + 
                        "conditions['" + ids[condition.id] + "'] ('" + condition.id + "')");
                ids[condition.id] = i;
            }
        }
        this.beginUpdate();
        for (i = this._conditions.length - 1; i >= 0; i--) { 
            this._conditions[i].cleanup();
        }
        this._conditions = instances;
        this._subConditions(this._objects);
        if (this._subscribers.outConditionsChange) {
            this.outConditionsChange([].concat(this._conditions), oldConditions);
        }
        this.refresh();
        this.endUpdate();
    },
    
    getConditions: function(id) {
        if (!id) return [].concat(this._conditions);
        for (i = 0, l = this._conditions.length; i < l; i++) {
            if (id === i + 1 || this._conditions[i].id === id)
                return this._conditions[i];
        }
        return null;
    },
    
    _subConditions: function(objects, conditions, unsubscribe, withCleanup) {
        objects = objects || this._objects;
        conditions = conditions || this._conditions;
        var i, l, m = unsubscribe? 'unobserve' : 'observe';
        for (i = 0, l = conditions.length; i < l; i++) {
            conditions[i][m](objects);
        }
        if (!withCleanup) return;
        m = unsubscribe? 'unsubscribeObject' : 'subscribeObject';
        for (i = 0, l = objects.length; i < l; i++) {
            var o = objects[i];
            if (!(o['Amm.WithEvents'] && o.hasEvent('cleanup'))) continue;
            this[m](o, 'cleanup', this._handleObjectCleanup, this);
        }
    },
    
    _handleObjectCleanup: function() {
        var o = Amm.event.origin;
        this.unobserveObject(o);
    },
    
    beforeDispatch: function(eventName, queue, arguments) {
        if (queue.length > 1 || queue[0][1] && queue[0][1]['Amm.Expression']) {
            this.beginUpdate();
        }
    },
    
    afterDispatch: function(eventName, queue, arguments) {
        if (queue.length > 1 || queue[0][1] && queue[0][1]['Amm.Expression']) {
            this.endUpdate();
        }
    },
    
    _unsubConditions: function(objects, conditions, withCleanup) {
        return this._subConditions(objects, conditions, true, withCleanup);
    },
    
    beginUpdate: function() {
        if (!this._updateLevel) this._oldMatchingObjects = this.getMatchingObjects();
        this._updateLevel++;
        this._matchingObjects = null;
    },
    
    endUpdate: function() {
        if (!this._updateLevel) throw Error("call to endUpdate() without prior beginUpdate()");
        
        if (this._updateLevel > 1) {
            this._updateLevel--;
            return;
        }
        
        if (!this._subscribers.matchesChange && !this._subscribers.matchingObjectsChange) {
            this._deferredChanges = [];
            this._updateLevel--;
            return;
        }
        
        var d = {}, objects = [], matches = [], oldMatches = [], idx;
        for (var i = this._deferredChanges.length - 1; i >= 0; i--) {
            idx = this._deferredChanges[i][0];
            if (idx !== undefined) {
                if (d[idx]) continue;
                d[idx] = true;
            }
            
            var oldMatch = this._deferredChanges[i][1],
                object = this._deferredChanges[i][2],
                newMatch = this._matches[idx];
            
            if (oldMatch === newMatch) continue;
            objects.unshift(object);
            oldMatches.unshift(oldMatch);
            matches.unshift(newMatch);
        }
        this._deferredChanges = [];
        
        this._updateLevel--;
        
        if (!objects.length) return; // nothing changed
        
        this.outMatchesChange(objects, matches, oldMatches);
        
        if (!this._subscribers.matchingObjectsChange) return;
        
        var matchingObjects = this.getMatchingObjects();
        
        if (Amm.Array.equal(matchingObjects, this._oldMatchingObjects)) return;
        
        var tmp = this._oldMatchingObjects;
        this._oldMatchingObjects = null;
        this.outMatchingObjectsChange(matchingObjects, tmp);
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    outConditionsChange: function(newConditions, oldConditions) {
        return this._out('conditionsChange', newConditions, oldConditions);
    },
    
    outMatchingObjectsChange: function(matchingObjects, oldMatchingObjects) {
        return this._out('matchingObjectsChange', matchingObjects, oldMatchingObjects);
    },
    
    getMatch: function(object) {
        var idx = Amm.Array.indexOf(object, this._objects);
        if (idx >= 0) return this._matches[idx];
        return undefined;
    },
    
    refresh: function(object) {
        if (object) {
            var idx = Amm.Array.indexOf(object, this._objects);
            if (idx < 0) throw Error("`object` not observed, cannot refresh()");
            var match = this.evaluateMatch(object);
            this._updateMatch(idx, match);
        } else {
            this.beginUpdate();
            this._deferredChanges = [];
            for (var i = 0, l = this._objects.length; i < l; i++) {
                var m = this.evaluateMatch(this._objects[i]);
                this._updateMatch(i, m);
            }
            this.endUpdate();
        }
    },
    
    _updateMatch: function(idx, newMatch) {
        var oldMatch = this._matches[idx];
        if (oldMatch === newMatch) return;
        if (this._updateLevel) {
            this._deferredChanges.push([idx, oldMatch, this._objects[idx]]);
        }
        this._matches[idx] = newMatch;
        
        if (this._updateLevel) return;
        this.outMatchesChange([this._objects[idx]], [newMatch], [oldMatch]);
        
        if (!!newMatch === !!oldMatch) return;
        
        this._matchingObjects = null;
        
        // check if we need to compose arrays for outMatchingObjectsChange
        if (!this._subscribers.matchingObjectsChange) return;
        
        var objects = [], oldObjects = [], i, l;
        for (i = 0, l = this._objects.length; i < l; i++) {
            if (i === idx && oldMatch) oldObjects.push(this._objects[i]);
            if (this._matches[i]) {
                objects.push(this._objects[i]);
                oldObjects.push(this._objects[i]);
            }
        }
        this._matchingObjects = objects;
        this.outMatchingObjectsChange(objects, oldObjects);
    },
    
    evaluateMatch: function(object) {
        if (!this._conditions.length) return true;
        var res;
        for (var i = 0, l = this._conditions.length; i < l; i++) {
            res = false;
            if (this._conditions[i].match(object))
                res = this._conditions[i].id || i + 1;
            if (this._requireAll) {
                if (!res) return false;
            } else {
                if (res) return res;
            }
        }
        if (this._requireAll) return res;
        return false;
    },
    
    observeObject: function(object) {
        var idx = Amm.Array.indexOf(object, this._objects), match;
        if (idx >= 0) return this._matches[idx];
        this._objects.push(object);
        this._subConditions([object], undefined, false, true);
        match = this.evaluateMatch(object);
        for (var i = this._deferredChanges.length - 1; i >= 0; i--) {
            if (this._deferredChanges[i][0] === undefined && this._deferredChanges[i][2] === object) {
                // save old match value so _updateMatch will work correctly
                this._matches[this._objects.length - 1] = this._deferredChanges[i][1];
                this._deferredChanges.splice(i, 1);
            }
        }
        this._updateMatch(this._objects.length - 1, match);
        this.outObjectsObserved([object], [match]);
        return match;
    },
    
    unobserveObject: function(object) {
        var idx = Amm.Array.indexOf(object, this._objects);
        var oldMatchingObjects;
        if (idx < 0) return;
        var match = this._matches[idx];
        this._objects.splice(idx, 1);
        this._matches.splice(idx, 1);
        if (match) {
            oldMatchingObjects = this._matchingObjects;
            this._matchingObjects = null;
        }
        for (var i = this._deferredChanges.length - 1; i >= 0; i--) {
            if (this._deferredChanges[i][0] > idx) this._deferredChanges[i][0]--;
            else if (this._deferredChanges[i][0] === idx)
                this._deferredChanges.splice(i, 1);
        }
        if (!this._updateLevel) {
            this.outMatchesChange([object], [undefined], [match]);
        } else {
            this._deferredChanges.push([undefined, match, object]);
        }
        this._unsubConditions([object]);
        if (this._updateLevel) return;
        if (match && this._subscribers.matchingObjectsChange)
            this.outMatchingObjectsChange(this.getMatchingObjects(), oldMatchingObjects);
        this.outObjectsUnobserved([object], [match]);
        return match;
    },
    
    hasObservedObject: function(object) {
        return Amm.Array.indexOf(object, this._objects) >= 0;
    },
    
    outObjectsObserved: function(objects, matches) {
        this._out('objectsObserved', objects, matches);
    },
    
    outObjectsUnobserved: function(objects, matches) {
        this._out('objectsUnobserved', objects, matches);
    },
    
    outMatchesChange: function(objects, matches, oldMatches) {
        this._out('matchesChange', objects, matches, oldMatches);
    },
    
    filter: function(objects, matches) {
        if (!(matches instanceof Array)) matches = [];
        else matches.splice(0, matches.length);
        var i, l, match, res = [];
        for (i = 0, l = objects.length; i < l; i++) {
            match = this.evaluateMatch(objects[i]);
            if (!match) continue;
            res.push(objects[i]);
            matches.push(match);
        }
        return res;
    },
    
    getMatchingObjects: function() {
        if (this._matchingObjects) return this._matchingObjects;
        var res = [], i, l;
        for (i = 0, l = this._objects.length; i < l; i++) {
            if (this._matches[i]) {
                res.push(this._objects[i]);
            }
        }
        if (this._oldMatchingObjects && Amm.Array.equal(res, this._oldMatchingObjects))
            res = this._oldMatchingObjects; // set to old instance if matching objects are same
        this._matchingObjects = res;
        return res;
    },
    
    _createCondition: function(condition) {

        if (!condition || typeof condition !== 'object')
            throw Error("filter condition must be an object, given: " 
                + Amm.describeType(condition));

        if (condition._expr) return new Amm.Filter.ExpressionCondition(this, condition);

        return new Amm.Filter.PropsCondition(this, condition);

    },
    
    setRequireAll: function(requireAll) {
        requireAll = !!requireAll;
        var oldRequireAll = this._requireAll;
        if (oldRequireAll === requireAll) return;
        this._requireAll = requireAll;
        this.outRequireAllChange(requireAll, oldRequireAll);
        if (this._conditions.length) this.refresh();
        return true;
    },

    getRequireAll: function() { return this._requireAll; },

    outRequireAllChange: function(requireAll, oldRequireAll) {
        this._out('requireAllChange', requireAll, oldRequireAll);
    }

};

Amm.extend(Amm.Filter, Amm.WithEvents.DispatcherProxy);
Amm.extend(Amm.Filter, Amm.WithEvents);
