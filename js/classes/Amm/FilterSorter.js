/* global Amm */

/**
 * Base class for both Amm.Filter and Amm.Sorter. Observes multiple objects by multiple observers. 
 * Each observer computes "match" for every object.
 * Matches are cached and their changes produce events.
 */


Amm.FilterSorter = function(options) {
    this._observers = [];
    this._objects = [];
    this._matches = [];
    this._deferredChanges = [];
    Amm.WithEvents.DispatcherProxy.call(this);
    Amm.WithEvents.call(this, options);    
};

Amm.FilterSorter.prototype = {
    
    'Amm.FilterSorter': '__CLASS__',
    
    _observers: null,
    
    // numeric array with observed objects
    _objects: null,
    
    // `index in this._objects` => `match result`
    _matches: null,
    
    // [ [`index in this._objects`, `old match result`, `object`] ]
    _deferredChanges: null,
    
    _updateLevel: 0,
    
    // function that compares old and new match value
    _compareMatch: null,

    // TRUE to require matched object to match ALL conditions; match := last condition value (as JS &&)
    _requireAll: false,
    
    // Saves references to the matches in the observed objects
    _cacheMatches: false, // TODO: implement
    
    _cacheProp: null,
    
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
            if (this._cacheMatches) this._deleteCachedMatches(deletedObjects);
            this._unsubObservers(deletedObjects, undefined, true);
            this.outObjectsUnobserved(deletedObjects, deletedMatches);
        }
        if (changes.added.length) {
            var addedObjects = [], addedMatches = [], idxs = [];
            for (i = 0, l = changes.added.length; i < l; i++) {
                addedObjects.push(changes.added[i][0]);
                match = this.evaluateMatch(changes.added[i][0]);
                this._matches.push(match);
                addedMatches.push(match);
                idxs.push(this._objects.length + i);
                this._deferredChanges.push([this._objects.length + i, undefined, changes.added[i][0]]);
            }
            this._objects.push.apply(this._objects, addedObjects);
            if (this._cacheMatches) {
                this._saveCachedMatches(idxs);
            }
            this._subObservers(addedObjects, undefined, false, true);
            this.outObjectsObserved(addedObjects, addedMatches);
        }
        this.endUpdate();
    },
    
    getMatches: function() {
        return [].concat(this._matches);
    },
    
    _subObservers: function(objects, observers, unsubscribe, withCleanup) {
        objects = objects || this._objects;
        observers = observers || this._observers;
        var i, l, m = unsubscribe? 'unobserve' : 'observe';
        for (i = 0, l = observers.length; i < l; i++) {
            observers[i][m](objects);
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
    
    _unsubObservers: function(objects, observers, withCleanup) {
        return this._subObservers(objects, observers, true, withCleanup);
    },
    
    beginUpdate: function() {
        this._updateLevel++;
    },
    
    _hasChangeSubscribers: function() {
        return this._subscribers.matchesChange;
    },
    
    endUpdate: function() {
        if (!this._updateLevel) throw Error("call to endUpdate() without prior beginUpdate()");
        
        if (this._updateLevel > 1) {
            this._updateLevel--;
            return;
        }
        
        if (!this._hasChangeSubscribers()) {
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
            if (oldMatch === newMatch || (this._compareMatch && !this._compareMatch(oldMatch, newMatch))) continue;
            objects.unshift(object);
            oldMatches.unshift(oldMatch);
            matches.unshift(newMatch);
        }
        this._deferredChanges = [];
        
        this._updateLevel--;
        
        if (!objects.length) return; // nothing changed
        
        this.outMatchesChange(objects, matches, oldMatches);
        
        this._doOnEndUpdateChange();
    },

    _doOnEndUpdateChange: function() {
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    getMatch: function(object, evaluate) {
        if (this._cacheMatches) {
            var res = this._getCachedMatch(object);
            if (res !== undefined) return res;
        }
        var idx = Amm.Array.indexOf(object, this._objects);
        if (idx >= 0) return this._matches[idx];
        if (evaluate) return this.evaluateMatch(object);
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
    
    _doOnUpdateMatch: function(idx, oldMatch, newMatch) {
    },
    
    _updateMatch: function(idx, newMatch) {
        var oldMatch = this._matches[idx];
        
        if (oldMatch === newMatch || (this._compareMatch && !this._compareMatch(oldMatch, newMatch)))
            return;
        
        if (this._updateLevel) {
            this._deferredChanges.push([idx, oldMatch, this._objects[idx]]);
        }
        this._matches[idx] = newMatch;
        
        if (this._cacheMatches) this._saveCachedMatches([idx]);
        
        if (this._updateLevel) return;
        this.outMatchesChange([this._objects[idx]], [newMatch], [oldMatch]);

        this._doOnUpdateMatch(idx, oldMatch, newMatch);
    },
    
    evaluateMatch: function(object) {
        return null;
    },
    
    observeObject: function(object) {
        var idx = Amm.Array.indexOf(object, this._objects), match;
        if (idx >= 0) return this._matches[idx];
        this._objects.push(object);
        this._subObservers([object], undefined, false, true);
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
        if (this._cacheMatches) this._deleteCachedMatches([object]);
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
        this._unsubObservers([object]);
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
    
    _saveCachedMatches: function(indexes) {
        if (!this._cacheMatches) return;
        if (indexes !== undefined && !(indexes instanceof Array)) indexes = [indexes];
        if (!this._cacheProp) {
            Amm.registerItem(this);
            this._cacheProp = '_Amm.FilterSorter.' + this._amm_id;
        }
        for (var i = 0, l = indexes? indexes.length : this._objects.length; i < l; i++) {
            var idx = indexes? indexes[i] : i, 
                object = this._objects[idx], 
                match = this._matches[idx];
            object[this._cacheProp] = match;
        }
    },
    
    _getCachedMatch: function(object) {
        if (!object || !this._cacheProp) return undefined;
        return object[this._cacheProp];
    },
    
    _deleteCachedMatches: function(objects) {
        if (!this._cacheProp) return;
        for (var i = 0, l = objects.length; i < l; i++) {
            delete objects[i][this._cacheProp];
        }
    },

    setCacheMatches: function(cacheMatches) {
        cacheMatches = !!cacheMatches;
        var oldCacheMatches = this._cacheMatches;
        if (oldCacheMatches === cacheMatches) return;
        this._cacheMatches = cacheMatches;
        if (!cacheMatches) this._deleteCachedMatches(this._objects);
        else this._saveCachedMatches();
        return true;
    },

    getCacheMatches: function() { return this._cacheMatches; },
    
    cleanup: function() {
        Amm.WithEvents.prototype.cleanup.apply(this);
        this._matches = [];
        this._unsubObservers();
        for (var i = 0, l = this._observers.length; i < l; i++) {
            this._observers[i].cleanup();
        }
        this._observers = [];
        this.setObservedObjects([]);
        if (this._amm_id) Amm.unregisterItem(this);
    }

};

Amm.extend(Amm.FilterSorter, Amm.WithEvents.DispatcherProxy);
Amm.extend(Amm.FilterSorter, Amm.WithEvents);
