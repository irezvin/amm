/* global Amm */

Amm.Sorter = function(options) {
    this._compareClosureFn = ( function(o) { return function(a, b) { return o.compareObjects(a, b); }; } ) (this);    
    Amm.FilterSorter.call(this, options);
};

Amm.Sorter.ascendingDescRx = /\s+(asc|desc)$/i;
Amm.Sorter.propNameRx = /^\w+$/;

Amm.Sorter.prototype = {

    'Amm.Sorter': '__CLASS__', 
    
    _needReorderCriteria: false,
    
    _parseAscendingDesc: true,
    
    _allowExpressions: true,
    
    _cacheMatches: true,
    
    _lockIndexes: 0,
    
    _compareClosureFn: null,

    // [index in _observers => ascending]
    _directions: null,
    
    _oldDirections: null,
    
    _deleteCriterion: function(index, reorder) {
        if (!this._observers[index]) return;
        var instance = this._observers[index];
        this._unsubObservers(this._objects, [instance]);
        instance.cleanup();
        if (!reorder) return;
        this._innerShift(index, this._observers.length);
    },
    
    setCriteria: function(criteria, index) {
        
        if (index !== undefined) { // first type: add or replace one criterion
            
            this._directions = null;
            
            var targetIndex = index;
            if (targetIndex < 0) targetIndex = 0;
            if (targetIndex > this._observers.length)
                targetIndex = this._observers.length;
            
            
            if (criteria) {
            
                this._lockIndexes++;
                try {
                    criteria = this._getCriterionPrototype(criteria, targetIndex);
                } catch (e) {
                    this._lockIndexes--;
                    throw e;
                }
                this._lockIndexes--;
                
            } else {
                criteria = null;
            }
            
            if (this._observers[targetIndex]) {
                if (this._observers[targetIndex] === criteria) return;
                if (index >= 0) {
                    this._deleteCriterion(targetIndex, !criteria);
                    this._directions = null;
                    this.refresh();
                    return;
                }
            }
            if (!criteria) {
                this._directions = null;
                this.refresh();
                return true;
            }
            
            if (index < 0) { // intended to prepend
                this._innerShift(this._observers.length, 0, true);
            }
            this._observers[targetIndex] = criteria;
            this._directions = null;
            this.refresh();
            
            return true;
        }
            
        var i, l;

        try {
            this.beginUpdate();
            this._lockIndexes++;

            var proto = [], p;

            if (!(criteria instanceof Array)) criteria = [criteria];
            
            this._directions = null;

            for (i = 0, l = criteria.length; i < l; i++) {
                p = this._getCriterionPrototype(criteria[i], i);
                proto.push(p);
            }
            
            var newCriteria = Amm.constructMany(proto, 'Amm.Sorter.Criterion');
            newCriteria.sort(function(a, b) {
                return a.getIndex() - b.getIndex();
            });

            for (var i = 0, l = newCriteria.length; i < l; i++) {
                newCriteria[i].setIndex(i);
            }

            // delete old criteria
            for (i = 0, l = this._observers.length; i < l; i++) {
                this._observers[i].cleanup();
            }
            this._observers = newCriteria;

            if (this._objects.length) {
                this._subObservers(this._objects);
            }            
        } catch (e) {
            this._lockIndexes--;
            this.endUpdate();
            throw e;
        }
        
        this._lockIndexes--;
        this._directions = null;
        this.refresh();
        this.endUpdate();
    },
    
    getCriteria: function(index) {
        if (index === undefined) return [].concat(this._observers);
        return this._observers[index];
    },
    
    _getCriterionPrototype: function(criterion, index) {

        var res;

        if (criterion && typeof criterion === 'object') {
            if (criterion['Amm.Sorter.Criterion']) {
                if (criterion.getFilterSorter() !== this) {
                    throw Error("setCriteria(): `criteria[" + index + "]` doesn't belong to current Sorter");
                }
                if (criterion.getIndex() === null) criterion.setIndex(index);
                res = criterion;
            } else {
                res = {}.override(criterion);
                if (typeof res.index !== 'number') res.index = index;
            }
            res.filterSorter = this;
            return res;
        }

        var matches, ascending = true;
        
        res = {};
        
        if (typeof criterion !== 'string') 
            throw Error("`criteria[" + index + "]` should be either string or object; given: "
                + Amm.describeType(criterion));
        
        if (this._parseAscendingDesc) {
            matches = Amm.Sorter.ascendingDescRx.exec(criterion);
            if (matches) {
                ascending = matches[1].toLowerCase() === 'asc';
                criterion = criterion.slice(0, -matches[0].length);
            }
        }
        if (this._allowExpressions && !Amm.Sorter.propNameRx.exec(criterion)) {
            res.expression = criterion;
            res.class = Amm.Sorter.Expression;
        } else {
            res.class = Amm.Sorter.Property;
            res.property = criterion;
        }
        if (!('index' in res)) res.index = index;
        res.ascending = ascending;
        res.filterSorter = this;
        return res;
    },
    
    compareObjects: function(object1, object2) {
        var match1 = this.getMatch(object1, true);
        var match2 = this.getMatch(object2, true);
        return this.compareMatches(match1, match2);
    },
    
    calcSortValue: function(object, index) {
        return this.getMatch(object, true);
    },
    
    getCompareClosureFn: function() {
        return this._compareClosureFn;
    },
    
    _innerShift: function(a, b, setIndex) {
        this._lockIndexes++;
        var d = a > b? -1 : 1;
        for (var i = a; i*d < b*d; i += d) {
            this._observers[i] = this._observers[i + d];
            if (setIndex) this._observers[i].setIndex(i);
        }
        this._lockIndexes--;
    },
    
    notifyCriterionIndexChanged: function(criterion, newIndex, index) {
        if (this._lockIndexes) return;
        if (this._observers[index] !== criterion) {
            index = Amm.Array.indexOf(criterion, this._observers);
            if (index < 0) throw Error ("Provided criterion is not registered observer");
        }
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= this._observers.length) newIndex = this._observers.length - 1;
        if (newIndex === index) return; // nothing to do
        
        this._innerShift(index, newIndex, true);
        this._observers[newIndex] = criterion;
        criterion.setIndex(newIndex);
        this._lockIndexes--;
        this.refresh();
    },
    
    notifyCriterionDirectionChanged: function(criterion, ascending, oldAscending) {
        if (this._directions) { 
            this._directions = null;
            this.outNeedSort();
        }
    },
    
    compareMatches: function(a, b) { // compare matches to compare objects
        var i, l;
        if (!(a instanceof Array) && (b instanceof Array)) throw Error ("both matches must be Arrays");
        if (a.length !== b.length) throw Error ("both matches must have same length");
        if (!this._directions) {
            this._directions = this._getDirections();
        }        
        var res;
        for (i = 0, l = a.length; i < l; i++) {
            if (a[i] === b[i]) continue;
            if (a[i] < b[i]) res = -1;
            else if (a[i] > b[i]) res = 1;
            else res = 0;
            if (!this._directions[i]) res = -1*res;
            return res;
        }
        return 0;
    },
    
    _compareMatch: function(a, b) { // simple comparison of matches equality
        if (a === b) return 0;
        if (!a || !b) return 1;
        if (!(a instanceof Array || a['Amm.Array'])) return 1;
        if (!(b instanceof Array || b['Amm.Array'])) return 1;
        return !Amm.Array.equal(a, b);
    },
    
    outNeedSort: function() {
        this._oldDirections = null;
        return this._out('needSort');
    },
    
    sort: function(objects) {
        var o;
        if (objects && objects['Amm.Array']) o = objects.getItems();
        else if (objects && objects instanceof Array) o = objects.slice();
        else throw Error("`objects` must be Array or Amm.Array");
        return o.sort(this._compareClosureFn);
    },
    
    evaluateMatch: function(object) {
        if (!this._observers.length) return [];
        var res = [];
        for (var i = 0, l = this._observers.length; i < l; i++) {
            res.push(this._observers[i].getValue(object));
        }
        return res;
    },
    
    _doOnEndUpdateChange: function() {
        this.outNeedSort();
    },
    
    _doOnUpdateMatch: function(idx, oldMatch, newMatch) {
        this.outNeedSort();
    },
    
    _hasChangeSubscribers: function() {
        return this._subscribers.matchesChange || this._subscribers.needSort;
    },
    
    _getDirections: function() {
        if (this._directions) return this._directions;
        var res = [];
        for (i = 0, l = this._observers.length; i < l; i++) res.push(this._observers[i].getAscending());
        return res;
    },
    
    beginUpdate: function() {
        Amm.FilterSorter.prototype.beginUpdate.call(this);
        if (this._updateLevel === 1) {
            this._oldDirections = this._getDirections();
        }
    },
    
    endUpdate: function() {
        Amm.FilterSorter.prototype.endUpdate.call(this);
        if (this._oldDirections && !this._directions && !Amm.Array.equal(this._getDirections(), this._oldDirections)) {
            this._directions = null;
            this.outNeedSort();
        }
    }


};

Amm.extend(Amm.Sorter, Amm.FilterSorter);

