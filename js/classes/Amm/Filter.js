/* global Amm */

Amm.Filter = function(options) {
    Amm.FilterSorter.call(this, options);
};

Amm.Filter.prototype = {
    
    'Amm.Filter': '__CLASS__',
    
    _oldMatchingObjects: null,
    
    _matchingObjects: null,    
    
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
    
    setConditions: function(conditions, id) {
        var condition = null, oldConditions, i, l;
        if (this._subscribers.outConditionsChange) {
            oldConditions = [].concat(this._observers);
        }
        if (id) {
            if (conditions) {
                if (typeof conditions !== 'object') throw Error("setConditions(`conditions`, `id`): `conditions` must be a null or an object");
                conditions._id = id;
                condition = this._createCondition(conditions);
            }
            this.beginUpdate();
            for (i = 0, l = this._observers.length; i < l; i++) {
                if (this._observers[i].id === id) {
                    this._observers[i].cleanup();
                    this._observers.splice(i, 1);
                    break;
                }
            }
            this._observers.push(condition);
            if (this._subscribers.outConditionsChange) {
                this.outConditionsChange([].concat(this._observers), oldConditions);
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
        for (i = this._observers.length - 1; i >= 0; i--) { 
            this._observers[i].cleanup();
        }
        this._observers = instances;
        this._subObservers(this._objects);
        if (this._subscribers.outConditionsChange) {
            this.outConditionsChange([].concat(this._observers), oldConditions);
        }
        this.refresh();
        this.endUpdate();
    },
    
    getConditions: function(id) {
        var i, l;
        if (!id) return [].concat(this._observers);
        for (i = 0, l = this._observers.length; i < l; i++) {
            if (id === i + 1 || this._observers[i].id === id)
                return this._observers[i];
        }
        return null;
    },
    
    outConditionsChange: function(newConditions, oldConditions) {
        return this._out('conditionsChange', newConditions, oldConditions);
    },
    
    outMatchingObjectsChange: function(matchingObjects, oldMatchingObjects) {
        return this._out('matchingObjectsChange', matchingObjects, oldMatchingObjects);
    },
    
    beginUpdate: function() {
        if (!this._updateLevel) this._oldMatchingObjects = this.getMatchingObjects();
        Amm.FilterSorter.prototype.beginUpdate.call(this);
        this._matchingObjects = null;
    },
    
    _doOnEndUpdateChange: function() {
        
        if (!this._subscribers.matchingObjectsChange) return;
        
        var matchingObjects = this.getMatchingObjects();
        
        if (Amm.Array.equal(matchingObjects, this._oldMatchingObjects)) return;
        
        var tmp = this._oldMatchingObjects;
        this._oldMatchingObjects = null;
        this.outMatchingObjectsChange(matchingObjects, tmp);
        
    },
    
    _createCondition: function(condition) {

        if (condition && typeof condition === 'string') {
            console.log(condition);
            condition = {_expr: condition};
        }

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
        if (this._observers.length) this.refresh();
        return true;
    },

    getRequireAll: function() { return this._requireAll; },

    outRequireAllChange: function(requireAll, oldRequireAll) {
        this._out('requireAllChange', requireAll, oldRequireAll);
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
    
    _doOnUpdateMatch: function(idx, oldMatch, newMatch) {
        
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
        if (!this._observers.length) return true;
        var res;
        for (var i = 0, l = this._observers.length; i < l; i++) {
            res = false;
            if (this._observers[i].match(object))
                res = this._observers[i].id || i + 1;
            if (this._requireAll) {
                if (!res) return false;
            } else {
                if (res) return res;
            }
        }
        if (this._requireAll) return res;
        return false;
    },
    
    _hasChangeSubscribers: function() {
        return this._subscribers.matchesChange || this._subscribers.matchingObjectsChange;
    }

};

Amm.extend(Amm.Filter, Amm.FilterSorter);
