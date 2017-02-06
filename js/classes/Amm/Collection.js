/* global Amm */

Amm.Collection = function(options) {
    var t = this;
    this._compareWithProps = function(a, b) {
        return t._implComparison(a, b);
    };
    this._sortWithProps = function(a, b) {
        return t._implSortWithProperties(a, b);
    };
    this._itemUpdateQueue = [];
    Amm.Array.call(this, options);
};

Amm.Collection.ERR_NOT_AN_OBJECT = "Not an object.";

Amm.Collection.ERR_NOT_MEETING_REQUIREMENTS = "Doesn't meet requirements.";

Amm.Collection.ERR_DUPLICATE_UPDATE_NOT_ALLOWED = "Duplicate; update not allowed.";

/**
 * Searches for position of item `item` in *sorted* array `arr` 
 * using binary search with some tricks (checks if item < start or if item > end,
 * only then dives deeper).
 * 
 * @param {Array} arr (or Amm.Array) to search in. Must be sorted 
 *      using `sortFunc` (or using javascript array.prototype.sort if no
 *      `sortFunc` is provided) to search properly.
 * @param {mixed} item Item which position we search for
 * @param {function} sortFunc function that was used to sort an array and that
 *      will be used to compare the items. If omitted, ===, < and > will be
 *      used. 
 *      
 *      sortFunc(a, b) must return -1, 0, 1 for a < b, a === b and a > b items.
 *      
 *      If neither a < b, nor a > b, items are considered _equal_.
 *      
 * @param {number} left Search start index, defaults to 0
 * @param {number} right Search end index, defaults to arr.length - 1
 * @returns {Array} [idx, found]
 *      If found === true, the item is found and has index idx. 
 *      If found === false, the item is not found and, if placed into an array,
 *      should be placed between arr[idx - 1] and arr[idx].
 *      
 *      Even if item exists in `arr` but not within [left, right] interval,
 *      found will be FALSE.
 */
Amm.Collection.binSearch = function(arr, item, sortFunc, left, right) {
    var leftIdx = typeof left === 'number'? left : 0;
    var rightIdx = typeof right === 'number'? right : arr.length - 1;
    var midIdx;
    if (leftIdx < 0) leftIdx = 0;
    if (rightIdx > arr.length - 1) rightIdx = arr.length - 1;

    // check if left index is within array bounds
    if (leftIdx > (arr.length - 1)) {
        return [left, false]; // not found; place (somewhere) before left
    }

    // important!! boilerplate for sort(a, b) is 
    // -(a < b) || (a !== b) | 0 
    // because - (a < b) is -1 if a < b, 
    // and then a !== b | 0 is 0 if a === b or 1 if a > b 
    // (| is to conv bool to int)

    var lCmp, rCmp, mCmp;
    
    // check if we are 'lefter' than left
    lCmp = sortFunc? sortFunc(item, arr[leftIdx]) : -(item < arr[leftIdx]) || (item !== arr[leftIdx] | 0);
    if (lCmp === 0) return [leftIdx, true]; // idx is left
    else if (lCmp < 0) return [leftIdx - 1, false]; // lefter than left, but not found

    // check if we are 'righter' than right
    rCmp = sortFunc? sortFunc(item, arr[rightIdx]) : -(item < arr[rightIdx]) || (item !== arr[rightIdx] | 0);
    if (rCmp === 0) return [rightIdx, true];
    else if (rCmp > 0) return [rightIdx + 1, false];
        
    while ((rightIdx - leftIdx) > 1) {
        
        midIdx = Math.floor((leftIdx + rightIdx) / 2);
        mCmp = sortFunc? sortFunc(item, arr[midIdx]) : -(item < arr[midIdx]) || (item !== arr[midIdx] | 0);
        
        if (mCmp === 0) {
            return [midIdx, true]; // direct hit!
        }
        
        if (mCmp < 0) rightIdx = midIdx;
            else leftIdx = midIdx;
            
    }
    // not found; must be placed between rightIdx and rightIdx - 1 (which is leftIdx)
    return [rightIdx, false]; 
    
};

Amm.Collection.prototype = {

    'Amm.Collection': '__CLASS__', 
    
    _unique: true,
    
    _sparse: false,
    
    _requirements: null,

    _assocProperty: null,

    _indexProperty: null,

    _defaults: null,

    _changeEvents: null,

    _comparisonProperties: null,
    
    // comparison is only done using ===
    _onlyStrict: false, 

    _ignoreExactMatches: null,

    // whether we should re-check items' uniqueness on item change
    // (will make no sense if we don't have comparisonProperties/comparisonFn)
    _recheckUniqueness: false,

    // this._comparison is used when _comparisonProperties are used
    // thus we store value provided by setComparison() to _custComparison
    _custComparison: null,

    // comparison function that uses _comparisonProperties but sets proper scope
    _compareWithProps: null,
    
    // function that uses _sortProperties but sets proper scope
    _sortWithProps: null,
    
    _sortProperties: null,

    _sortFn: null,
    
    _sorted: false,

    _updateProperties: null,
    
    _itemUpdateLevel: 0,
    
    _endItemsUpdateLock: false,
    
    _itemUpdateQueue: null,
            
    _updateFn: null,
    
    _allowUpdate: false,
    
    setUnique: function(unique) {
        if (!unique) throw "setUnique(false) is never supported by Amm.Collection";
        return Amm.Array.prototype.setUnique.call(this, unique);
    },
    
    setSparse: function(sparse) {
        if (sparse) throw "setSparse(true) is never supported by Amm.Collection";
        return Amm.Array.prototype.setSparse.call(this, sparse);
    },

    /**
     * @see Amm.meetsRequirements
     * If we change the requirements, current items are re-checked and exception
     * is thrown if any of them desn't match the provided requirements
     */
    setRequirements: function(requirements) {
        var ok = requirements instanceof Array 
                || typeof requirements === 'string' 
                || typeof requirements === 'function';
        if (!ok) {
            throw "requirements must be an Array, a string or a function";
        } 
        var oldRequirements = this._requirements;
        if (oldRequirements === requirements) return;
        if (requirements) { // check brave new requirements
            for (var i = 0, l = this.length; i < l; i++) {
                if (!Amm.meetsRequirements(this[i], requirements)) {
                    throw "Cannot setRequirements(): at least one item (" + i + ")"
                        + " doesn't meet new `requirements`";
                }
            }
        }
        this._requirements = requirements;
        return true;
    },

    getRequirements: function() { return this._requirements; },
    
    /**
     * Checks if item meets requirements and can be added to a collection
     * without throwing an exception. 
     * 
     * If item is already in a collection, will return FALSE 
     * unless this.getAllowUpdate() === true - it means
     * the item will be accepted, but updated on accept().
     * Unless {checkRequirementsOnly} is specified - means that 
     * we won't search for item copy.
     * 
     * Raises onCanAccept(item, problem) event.
     * 
     * Note that basic requirement for an item is that it has to be at least
     * an object.
     * 
     * @param item Item to check
     * @param {boolean} checkRequirementsOnly Don't check if Item has 
     *      duplicates (the check itself is done only when !this.getAllowUpdate())
     * @param {Object} problem If object, problem.error will be set to the
     *      description of the problem (duplicate / requirements / not an object),
     *      and problem.index will contain index of found instance
     * @returns {boolean} If item can be accepted
     */
    canAccept: function(item, checkRequirementsOnly, problem) {
        problem = problem || {};
        if (!(typeof item === 'object' && item)) {
            problem.error = Amm.Collection.ERR_NOT_AN_OBJECT;
            return false;
        }
        if (this._requirements && !Amm.meetsRequirements(item, this._requirements)) {
            problem.error = Amm.Collection.ERR_NOT_MEETING_REQUIREMENTS;
            return false;
        }
        if (!checkRequirementsOnly && !this._allowUpdate) {
            var index = this.indexOf(item);
            if (index >= 0) {
                problem.error = Amm.Collection.ERR_DUPLICATE_UPDATE_NOT_ALLOWED;
                problem.index = index;
                return false;
            }
        }
        problem.index = null; 
        problem.error = null;
        this.outOnCanAccept(item, problem);
        return !problem.error;
    },
    
    /**
     * Checks if can accept items; returns SIX arrays:
     * 0. Items that are not added yet - excluding ones that have matches
     * 1. Subset of `items` that have matches
     * 2. Subset of `this` that is matches of those items (including exact duplicates)
     * 3. Indexes of original `items` that have matches (to re-create mapping later)
     * 4. Items within [deleteStart..deleteStart+deleteCount) that will be removed 
     *    from collection and not re-inserted - to support splice operation.
     * 5. Combined array with new and re-inserted items
     *    
     * Note on how "delete interval" (DI) works.
     * - items within DI that have exact matches in `items` will 
     *   produce no exceptions
     * - items within DI that have non-exact matches will be marked 
     *   to be removed from collection if this.getAllowUpdate() is false
     *    
     * Throws exceptions if some of items cannot be accepted.
     */
    _preAccept: function(items, deleteStart, deleteCount) {

        if (!deleteStart) deleteStart = 0;
        if (deleteStart < 0) deleteStart = this.length + deleteStart;
        if (deleteStart > this.length) deleteStart = this.length;
        if (!deleteCount) deleteCount = 0;

        var deleteEnd = deleteStart + deleteCount;
        
        if (deleteCount < 0) {
            deleteEnd = this.length + deleteCount;
            deleteCount = 0;
        }
        
        var long = items.concat(this.getItems()), l = this.length, i,
            toDelete = deleteCount? this.slice(deleteStart, deleteEnd) : [],
            numNotDeleted = 0;
    
        // check requirements for each item
        for (i = 0, n = items.length; i < n; i++) {
            var problem = {};
            if (!this.canAccept(items[i], true, problem)) {
                throw "Cannot accept items[" + i + "]: " + problem.error;
            }
        }
        // check if there are duplicates in the added aray
        var dupes = Amm.Array.findDuplicates(long, false, this._comparison);
        if (!dupes.length) { // great, no matches
            return [[].concat(items), [], [], [], toDelete, [].concat(items)];
        }
        // have to sort the matches
        var dl = dupes.length, 
            itemsWithMatches = [], 
            matches = [], 
            newItems = [].concat(items),
            numNotNew = 0,
            indexes = [], 
            newAndReInserted = [].concat(items);
        
        for (i = 0; i < dl; i++) {
            var idx = dupes[i];
            // we can have at most two legitimate duplicates, one in this and one in items
            if (idx.length > 2) {
                var s = [];
                for (j = 0; j < idx.length; j++) s.push(this._describeIdx(idx[j], items.length));
                throw "Multiple duplicates of item: " + s.join (", ");
            }
            var exact = long[idx[0]] === long[idx[1]];
            
            if (idx[0] >= items.length)
                throw "WTF: we found two duplicates in `this`: " 
                    + this._describeIdx(idx[0], items.length) 
                    + (exact? ' === ' : ' ~= ') 
                    + this._describeIdx(idx[1], items.length);
            
            if (idx[1] < items.length)
                throw "There are at least two duplicates in `items`: " 
                    + this._describeIdx(idx[0], items.length) 
                    + (exact? ' === ' : ' ~= ') 
                    + this._describeIdx(idx[1], items.length);
            
            // now check if our index is in delete interval 
            // - therefore is a candidate for a reinsert
            var thisIdx = idx[1] - items.length;
            var reinsert = thisIdx >= deleteStart && thisIdx < deleteEnd;
            
            if (!exact && !this._allowUpdate) {
                // it is not re-insert because we cannot update non-exact match
                reinsert = false; 
            }
            
            if (exact && !reinsert && !this._ignoreExactMatches) {
                throw "Item already in collection: " 
                    + this._describeIdx(idx[0], items.length) 
                    + ' === ' 
                    + this._describeIdx(idx[1], items.length)
                    + ". setIgnoreExactMatches(true) next time.";
            }
            if (!exact && !reinsert && !this._allowUpdate) {
                throw "Added item matches existing one, but no update routine provided: "
                    + this._describeIdx(idx[0], items.length) 
                    + ' ~= ' 
                    + this._describeIdx(idx[1], items.length)
                    + ". setUpdateProperties() and/or setUpdateFn() may help.";
            }
                
            if (reinsert) {
                toDelete.splice(thisIdx - deleteStart, 1);
                numNotDeleted++;
            }
            
            // remove the stuff that has duplicates from newItems array. 
            // 
            // Since we splice it from front to the end, we need to adjust index 
            // every time according to the number of already deleted items
            if (!reinsert) {
                newAndReInserted.splice(idx[0] - itemsWithMatches.length, 1); 
            }
            newItems.splice(idx[0] - numNotNew, 1); 
            numNotNew++;
            
            // checked everything
            indexes.push(idx[0]);
            itemsWithMatches.push(long[idx[0]]); // part from insert[]
            matches.push(long[idx[1]]); // part from this[]
        }
        
        return [newItems, itemsWithMatches, matches, indexes, toDelete, newAndReInserted];
    },
    
    // Adds new items to a non-sorted collection.
    // Doesn't check for duplicates. Doesn't trigger events.
    _addNew: function(newItems, index) {
        if (index === undefined || index >= this._length) {
            index = this.length;
            this.length += newItems.length;
        } else {
            this._rotate(index, newItems.length);
        }
        for (var i = 0, l = newItems.length; i < l; i++) {
            this[index + i] = newItems[i];
        }
    },

    // Adds new items to a sorted collection.
    // Doesn't check for duplicates. Doesn't trigger events.
    // Returns [newItemsSorted, theirIndexes] 
    //      (because all indexes are different)
    _addNewToSorted: function(newItems) {
        var sorted = [].concat(newItems);
        var idx = this._locateManyItemIndexesInSortedArray(sorted);
        for (var i = 0; i < idx.length; i++) {
            if (idx[i] < this.length) {
                this._rotate(idx[i], 1);
                this[idx[i]] = sorted[i];
            } else {
                this[this.length++] = sorted[i];
            }
        }
        return [sorted, idx];
    },

    // accepts item. Returns added item (same or one that was updated)
    // TODO: add idx and use in array-ish methods below
    accept: function(item, index) {
        var pa = this._preAccept([item]);
        var res;
        if (this._sorted && index !== undefined) {
            throw "`index` must not be used with sorted Collection - check for getIsSorted() next time";
        }
        if (index === undefined) index = this.length;
        if (index < 0) index = this.length + index;
        if (index > this.length) index = this.length;
        if (pa[0].length) { // new item
            var sorted = this._sorted;
            var idx = sorted? 
                this._locateItemIndexInSortedArray(item) : index;
            if (idx < 0) idx = 0;
            res = item;
            if (idx < this.length) {
                this._rotate(idx, 1);
                this[idx] = item;
            } else {
                this[this.length++] = item;
            }
            // ok, we have our item in place
            this._associate(item, idx);
            this._outSmartSplice(idx, 0, [item]);
            this._subscribe(item);
            if (this._indexProperty && idx < this.length - 1)
                this._reportIndexes(null, idx + 1);
        } else { // existing item
            res = pa[2][0]; // match for updating
            this._update(pa[2][0], pa[1][0]);
        }
        return res;
    },
    
    /* accepts many items. Returns an array of added or updated items
     * (updated items are _not_ the same as original items).
     * 
     * index can be used only for non-sorted array
     */
    acceptMany: function(items, index) {
        var sorted = this._sorted;
        if (sorted && index !== undefined) 
            throw "`index` must not be used with sorted Collection - check for getIsSorted() next time";
        if (!items.length) return []; // shortcut
        if (items.length === 1) return [this.accept(items[0])];
        var pa = this._preAccept(items);
        var i;
        if (pa[0].length) { // we have addable items
            var oldItems = this.getItems(), minIdx;

            // note that new items will have their indexes double-reported 
            // - don't know how to do that better
            if (sorted) {
                var _sortIdx = this._addNewToSorted(pa[0]);
                // _sortIdx[0] is pa[0], but sorted
                // _sortIdx[1] is indexes of matching elements in _sortIdx[0]
                for (i = 0; i < _sortIdx[0].length; i++) {
                    this._associate(_sortIdx[0][i], _sortIdx[1][i]);
                }
                // trigger the array-change events
                this._outFragmentedInsert(_sortIdx[0], _sortIdx[1]);
                minIdx = _sortIdx[1][0];
            } else {
                if (index < 0) index = this.length + index;
                if (index === undefined || index > this.length) index = this.length;
                minIdx = index;
                this._addNew(pa[0], index);
                for (i = 0; i < pa[0].length; i++) {
                    this._associate(pa[0][i], index + i);
                }
                // trigger the array-change event
                this._outSmartSplice(index, [], pa[0]);
            }
            // subscribe to added items' change events
            for (i = 0; i < pa[0].length; i++) {
                this._subscribe(pa[0][i]);
            }
            // some of old elements were shifted
            if (this._indexProperty && minIdx < (this.length - pa[0].length - 1)) { 
                this._reportIndexes(oldItems, minIdx);
            }
        }
        var res = [].concat(pa[0]);
        
        for (var i = 0; i < pa[1].length; i++) {
            // update matching object with the object of `items` 
            this._update(pa[2][i], pa[1][i]);
            // add matching object to the proper place of res using the 
            // previously-saved index
            res.splice(pa[3][i], 0, pa[2][i]);
        }
        return res;
    },
    
    hasItem: function(item, nonStrictCompare) {
        if (nonStrictCompare) return this.indexOf(item) > 0;
        return Amm.Array.indexOf(item, this) > 0;
    },
    
    strictIndexOf: function(item) {
        return Amm.Array.indexOf(item, this);
    },
    
    /**
     * Returns Array containing items of the Collection that have matches 
     * in `items` array
     * @param {Array} items Items to intesect our Collection with
     * @param {boolean} strict Use only strict (===) comparison
     * @param {Array} groups If provided, 
     *      will receive items [[`matchingThisItemIdx`, `itemsIdx1`, `itemsIdx2...`]] for src matches data
     *      from `items` array that had matches
     * @returns {Array}
     */
    intersect: function(items, strict, groups) {
        if (groups && !(groups instanceof Array))
            throw "`groups` must be an Array (or falseable value)";
        if (!items.length) return []; // nothing to do
        var long = items.concat(this.getItems());
        var dups = Amm.Array.findDuplicates(long, false, strict? null : this._comparison, items.length);
        var res = [];
        for (var j = 0, l = dups.length; j < l; j ++) {
            // start from 1 because first instance will always be be within
            // 0..items.length
            for (var k = 1, ll = dups[j].length; k < ll; k++) {
                if (dups[j][k] >= items.length) {
                    res.push(long[dups[j][k]]);
                    if (groups) groups.push([dups[j][k] - items.length].concat(dups.slice(0, k)));
                    break;
                }
            }
        }
        return res;
    },
    
    reject: function(itemOrIndex, nonStrict) {
        var index, item;
        if (typeof itemOrIndex !== 'object') {
            index = parseInt(itemOrIndex);
            if (isNaN(index)) throw "itemOrIndex must be an object or a number";
            if (index < 0) index = this.length + index;
            if (index >= this.length) throw "index [" + index + "] doesn't exist";
            item = this[index];
        } else {
            item = itemOrIndex;
            index = nonStrict? this.indexOf(item) : this.strictIndexOf(item);
            if (index < 0) throw "itemOrIndex specifies non-existing item";
            item = this[index];
        }
        this._rotate(index, -1);
        this._dissociate(item);
        if (this._indexProperty && index < this.length) this._reportIndexes(null, index);
        this.outDeleteItem(index, item);
        return item;
    },
    
    push: function(element, _) {
        var items = Array.prototype.slice.apply(arguments);
        if (items.length === 1) this.accept(items[0]);
            else this.acceptMany(items);
        return this.length;
    },
    
    pop: function() {
        if (this.length) return this.reject(this.length - 1);
    },
    
    shift: function(element, _) {
        var items = Array.prototype.slice.apply(arguments);
        var index = this._sorted? undefined : 0;
        if (items.length === 1) this.accept(items[0], index);
            else this.acceptMany(items, index);
        return this.length;
    },
    
    unshift: function() {
        if (this.length) return this.reject(0);
    },

    /**
     * TODO: some better description on "re-insert" issues
     */
    splice: function(start, deleteCount, item1, item2_) {
        var items = Array.prototype.slice.call(arguments, 2);
        if (deleteCount < 0) deleteCount = 0;
        var cut = this.slice(start, start + deleteCount);
        var pa = this._preAccept(items, start, deleteCount);
        var newInstances = pa[0],
            toRemove = pa[4],
            insert = pa[5];
            
        var i, j, l, n;
        
        for (i = 0, l = toRemove.length; i < l; i++)
            this.reject(toRemove[i], true);
        
        var oldItems = this.getItems();
        
        if (this._sorted) { 
            var _sortIdx = this._addNewToSorted(pa[0]);
            // _sortIdx[0] is pa[0], but sorted
            // _sortIdx[1] is indexes of matching elements in _sortIdx[0]
            for (i = 0; i < _sortIdx[0].length; i++) {
                var idx = _sortIdx[1][i];
                //if (idx < 0) idx = 0;
                this._associate(_sortIdx[0][i], idx);
            }
            this._outFragmentedInsert(_sortIdx[0], _sortIdx[1]);
        } else {
            // we need to remove the re-inserted items
            // and allocate the space for new items
            var alloc = insert.length - (cut.length - toRemove.length);
            this._rotate(start, alloc);
            // we use "j" to iterate through newItems which we need to associate
            for (i = 0, j = 0, l = insert.length, n = newInstances.length; i < l; i++) {
                // j is always <= i because newInstances.length <= insert.length;
                // `insert` is `newInstances` with scattered re-insert items
                while(j <= i && insert[i] !== newInstances[j]) j++;
                this[start + i] = insert[i];
                if (insert[i] !== newInstances[j]) {
                    this._associate(this[start + i], start + i);
                }
            }
            this._outSmartSplice(start, cut, insert);
        }
        for (i = 0; i < pa[0].length; i++) {
            this._subscribe(pa[0][i]);
        }
        
        if (this._indexProperty) this._reportIndexes(oldItems);
        
        for (var i = 0; i < pa[1].length; i++) {
            if (pa[2][i] !== pa[1][i]) this._update(pa[2][i], pa[1][i]); 
        }
        
        return cut;
    },
    
    setItems: function(items) {
        var args = [0, this.length].concat(items);
        this.splice.apply(this, args);
        return this.length;
    },
    
    reverse: function() {
        if (this._sorted)
            throw "Cannot reverse() on sorted Collection. Check with getIsSorted() next time";
        var oldItems = this.getItems(),
            res = Amm.Array.prototype.reverse.apply(this);
        if (this._indexProperty) this._reportIndexes(oldItems);
    },
    
    setItem: function(index, item) {
        this.splice(index, 1, item);
        return this[index] === item? index : this.indexOf(item);
    },
    
    removeAtIndex: function(index, sparse) {
        this.reject(index);
        return true;
    },
    
    moveItem: function(index, newIndex) {
        if (this._sorted) {
            throw "Cannot moveItem() on sorted Collection. Check with getIsSorted() next time";
        }
        var low, high;
        if (index <= newIndex) {
            low = index;
            high = newIndex;
        } else {
            low = newIndex;
            high = index;
        }
        var res = Amm.Array.prototype.moveItem.call(this, index, newIndex);
        if (this._indexProperty) this._reportIndexes(null, low, high + 1);
        return res;        
    },
    
    _outFragmentedInsert: function(sortedItems, sortedIndexes) {
        var fragments = []; // [offset, items]
        var currentFragment = [sortedIndexes[0], [sortedItems[0]]];
        for (var i = 1, l = sortedItems.length; i < l; i++) {
            if (sortedIndexes[i] === (currentFragment[0] + currentFragment[1].length)) {
                currentFragment[1].push(sortedItems[i]);
            } else {
                fragments.push(currentFragment);
                currentFragment = [sortedIndexes[i], [sortedItems[i]]];
            }
        }
        fragments.push(currentFragment);
        for (var j = 0; j < fragments.length; j++) {
            this._outSmartSplice(fragments[j][0], [], fragments[j][1]);
        }
    },
            
    getIsSorted: function() {
        return this._sorted;
    },
    
    // Does NOT subscribe to item change events
    _associate: function(item, index, alsoSubscribe) {
        if (this[index] !== item) {
            console.trace();
            throw "WTF - this[`index`] !== `item`";
        }
        if (this._assocProperty) {
            Amm.setProperty(item, this._assocProperty, this);
        }
        if (this._indexProperty) {
            Amm.setProperty(item, this._indexProperty, index);
        }
        if (this._defaults) {
            for (var i in this._defaults) {
                if (this._defaults.hasOwnProperty(i)) {
                    Amm.setProperty(item, i, this._defaults[i]);
                }
            }
        }
        if (alsoSubscribe) this._subscribe(item);
    },

    _subscribe: function(item) {
        if (this._changeEvents) {
            for (var i = 0, l = this._changeEvents.length; i < l; i++) {
                item.subscribe(this._changeEvents[i], this._reportItemChangeEvent, this);
            }
        }
    },
    
   _dissociate: function(item) {
        if (this._changeEvents) {
            item.unsubscribe(undefined, this._reportItemChangeEvent, this);
        }
        if (this._assocProperty) {
            Amm.setProperty(item, this._assocProperty, null);
        }
    },
    
    /**
     * Error handlers should fill problem.error if item cannot be accepted.
     */
    outOnCanAccept: function(item, problem) {
        problem = problem || {};
        return this._out('onCanAccept', item, problem);
    },

    // will set old assocProperty of every this[i]
    setAssocProperty: function(assocProperty) {
        if (!assocProperty) assocProperty = null;
        var oldAssocProperty = this._assocProperty;
        if (oldAssocProperty === assocProperty) return;
        
        this._assocProperty = assocProperty;
        
        this._beginItemsUpdate(); // 'would be a lot of chatter from the items
        
        // report null to items that used oldAssocProperty
        var i, l = this.length;
        if (oldAssocProperty) {
            for (i = 0; i < l; i++) Amm.setProperty(this[i], oldAssocProperty, null);
        }
        if (assocProperty) {
            for (i = 0; i < l; i++) Amm.setProperty(this[i], assocProperty, this);
        }
        
        this._endItemsUpdate();
        
        return true;
    },

    getAssocProperty: function() { return this._assocProperty; },

    setIndexProperty: function(indexProperty) {
        if (!indexProperty) indexProperty = null;
        var oldIndexProperty = this._indexProperty;
        if (oldIndexProperty === indexProperty) return;
        this._indexProperty = indexProperty;
        if (this._indexProperty) {
            for (var i = 0, l = this.length; i < l; i++) {
                // report items their indexes
                Amm.setProperty(this[i], i);
            }
        }
        return true;
    },

    getIndexProperty: function() { return this._indexProperty; },

    // note: won't change for already accepted items
    setDefaults: function(defaults) {
        if (defaults && typeof defaults !== 'object') throw "`defaults` must be an object";
        if (!defaults) defaults = null;
        var oldDefaults = this._defaults;
        if (oldDefaults === defaults) return;
        this._defaults = defaults;
        return true;
    },

    getDefaults: function() { return this._defaults; },

    getObservesItems: function() { return !!this._changeEvents; },

    setChangeEvents: function(changeEvents) {
        
        if (changeEvents) {
            if (!(changeEvents instanceof Array)) 
                changeEvents = [changeEvents];
            else if (!changeEvents.length) 
                changeEvents = null;
        } else {
            changeEvents = null;
        }
        
        var oldChangeEvents = this._changeEvents;
        
        if (oldChangeEvents === changeEvents) return;
        
        if (this._changeEvents && changeEvents && 
            !Amm.Array.arrayDiff(changeEvents, this._changeEvents).length
        ) return; // same events
        
        if (oldChangeEvents) { // unsubscribe from old events...
            for (var i = 0, l = this.length; i < l; i++) {
                this[i].unsubscribe(undefined, this._reportItemChangeEvent, this);
             }
        }
        
        if (changeEvents) { // ...and subscribe to the new!
            var l1 = changeEvents.length;
            for (var i = 0, l = this.length; i < l; i++) {
                for (var j = 0; j < l1; j++)
                    this[i].subscribe(changeEvents[j], this._reportItemChangeEvent, this);
            }
        }
        
        this._changeEvents = changeEvents;
        return true;
    },
    
    // to properly function, Amm.event.origin must be filled-in
    _reportItemChangeEvent: function() { 
        var item = Amm.event.origin;
        if (this._itemUpdateLevel) {
            if (Amm.Array.indexOf(item, this._itemUpdateQueue) < 0) {
                this._itemUpdateQueue.push(item);
            }
        } else {
            if (this._recheckUniqueness) this._performRecheckUniqueness(item);
            if (this._sorted) {
                this._checkItemPosition(item);
            }
            this.outItemChange(item);
        }
    },
    
    outItemChange: function(item) {
        return this._out('itemChange', item);
    },

    getChangeEvents: function() { return this._changeEvents; },

    setComparison: function(comparison) {
        if (this._comparison === comparison) return;
        // todo: check if uniqueness retained
        var tmp = this._custComparison;
        var tmp1 = this._comparison;
        this._custComparison = comparison;
        this._onlyStrict = this._comparisonProperties || comparison;
        if (this._onlyStrict) {
            this._comparison = this._compareWithProps;
        } else {
            this._comparison = null;
        }
        try {
            this._custComparison = comparison;
            this._checkDuplicates("setComparison()", [], 0, 0, true, this._comparison);
        } catch (e) {
            this._custComparison = tmp;
            this._comparison = tmp1;
            throw e;
        }
        
        return true;
    },

    setComparisonProperties: function(comparisonProperties) {
        if (comparisonProperties) {
            if (!(comparisonProperties instanceof Array)) 
                comparisonProperties = [comparisonProperties];
            else if (!comparisonProperties.length) 
                comparisonProperties = null;
        } else {
            comparisonProperties = null;
        }
        var oldComparisonProperties = this._comparisonProperties;
        if (oldComparisonProperties === comparisonProperties) return;
        if (oldComparisonProperties && comparisonProperties 
            && !Amm.Array.arrayDiff(
                oldComparisonProperties, comparisonProperties
            ).length) return; // same content of arrays - order doesn't matter
        var tmp = this._comparisonProperties;
        var tmp1 = this._comparison;
        this._onlyStrict = !(comparisonProperties || this._custComparison);
        if (this._onlyStrict) {
            this._comparison = null;
        } else {
            this._comparison = this._compareWithProps;
        }
        try {
            this._comparisonProperties = comparisonProperties;
            this._checkDuplicates("setComparisonProperties()", [], 0, 0, true, this._comparison);
        } catch (e) {
            this._comparisonProperties = tmp;
            this._comparison = tmp1;
            throw e;
        }
        
        return true;
    },

    getComparisonProperties: function() { 
        if (!this._comparisonProperties) return [];
        return this._comparisonProperties; 
    },

    /**
     * @param {boolean} ignoreExactMatches
     * Whether to ignore attempts to add the same item twice without any warning
     */
    setIgnoreExactMatches: function(ignoreExactMatches) {
        var oldIgnoreExactMatches = this._ignoreExactMatches;
        if (oldIgnoreExactMatches === ignoreExactMatches) return;
        this._ignoreExactMatches = ignoreExactMatches;
        return true;
    },

    getIgnoreExactMatches: function() { return this._ignoreExactMatches; },
    
    setRecheckUniqueness: function(recheckUniqueness) {
        var oldRecheckUniqueness = this._recheckUniqueness;
        if (oldRecheckUniqueness === recheckUniqueness) return;
        this._recheckUniqueness = recheckUniqueness;
        return true;
    },

    getRecheckUniqueness: function() { return this._recheckUniqueness; },
    
    _implComparison: function(a, b) {
        if (a === b) return 0; // exact match
        if (this._comparisonProperties) {
            for (var i = 0, l = this._comparisonProperties.length; i < l; i++) {
                var p = this._comparisonProperties[i];
                var propA = Amm.getProperty(a, p);
                var propB = Amm.getProperty(b, p);
                if (propA !== propB) return -1;
            }
        }
        if (this._custComparison) return this._custComparison(a, b);
        return 0;
    },

    setSortProperties: function(sortProperties) {
        if (sortProperties) {
            if (!(sortProperties instanceof Array)) 
                sortProperties = [sortProperties];
            else if (!sortProperties.length) 
                sortProperties = null;
        } else {
            sortProperties = null;
        }
        var oldSortProperties = this._sortProperties;
        if (oldSortProperties === sortProperties) return;
        if (oldSortProperties && sortProperties 
            && Amm.Array.equal(oldSortProperties, sortProperties))
            return; // same arrays
        this._sortProperties = sortProperties;
        this._sorted = this._sortFn || this._sortProperties;
        if (this._sorted)
            this._sort();
        return true;
    },

    getSortProperties: function() {
        if (!this._sortProperties) return [];
        return this._sortProperties; 
    },
    
    _implSortWithProperties: function(a, b) {
        if (a === b) return 0; // exact match
        if (this._sortProperties) {
            for (var i = 0, l = this._sortProperties.length; i < l; i++) {
                var p = this._sortProperties[i];
                var pA = Amm.getProperty(a, p);
                var pB = Amm.getProperty(b, p);
                if (pA < pB) return -1;
                else if (pA > pB) return 1;
            }
        }
        if (this._sortFn) return this.sortFn(a, b);
    },

    setSortFn: function(sortFn) {
        var oldSortFn = this._sortFn;
        if (oldSortFn === sortFn) return;
        this._sortFn = sortFn;
        this._sorted = this._sortFn || this._sortProperties;
        if (this._sorted)
            this._sort();
        return true;
    },

    getSortFn: function() { return this._sortFn; },
    
    sort: function(fn) {
        if (this._sortFn) {
            if (fn) 
                throw "Cannot sort(fn) when `sortFn` is set; use sort() with no parameters";
            return this._sort();
        }
        if (this._sortProperties) {
            throw "Cannot sort() when `sortProperties` is set";
        }
        var changed = {}, old;
        if (this._indexProperty) old = this.getItems();
        var res = Amm.Array.prototype.sort.call(this, fn, changed);
        if (this._indexProperty && changed.changed && old) this._reportIndexes(old);
        return res;
    },
    
    _reportIndexes: function(oldItems, start, stop) {
        var l = stop || this.length, start = start || 0;
        for (var i = start; i < l; i++) {
            if (!oldItems || this[i] !== oldItems[i]) {
                Amm.setProperty(this[i], this._indexProperty, i);
            }
        }
    },
    
    _sort: function() { // re-orders current array
        if (!(this._sortFn || this._sortProperties)) {
            throw "WTF - call to _sort() w/o _sortFn or _sortProperties";
        }
        var changed = {}, old;
        if (this._indexProperty) old = this.getItems();
        Amm.Array.prototype.sort.call(this, this._sortWithProps, changed);
        if (this._indexProperty && changed.changed && old) this._reportIndexes(old);
        return changed.changed;
    },
    
    // locates index of item to insert into sorted array using binary search
    _locateItemIndexInSortedArray: function(item) {
        var idx = Amm.Collection.binSearch(this, item, this._sortWithProps);
        return idx[0];
    },
    
    // returns array of indexes of respective items
    // side effect: sorts the items!!!
    // res[i] = idxOfItems_i
    _locateManyItemIndexesInSortedArray: function(items) {
        items.sort(this._sortWithProps);
        var idx = 0, res = [];
        for (var i = 0; i < items.length; i++) {
            // since items are sorted, we search location of next item 
            // starting from location of the last item
            idx = Amm.Collection.binSearch(this, items[i], this._sortWithProps, idx)[0];
            
            // we push idx + i since i items will be already added before
            // i-th item
            res.push(idx + i);
        }
        return res;
    },
    
    /**
     * @returns {Boolean} Whether we can update conflicting items 
     *      (if _updateProperties and/or _updateFn are set)
     */
    getAllowUpdate: function() { return this._allowUpdate; },

    setUpdateProperties: function(updateProperties) {
        if (updateProperties) {
            if (!(updateProperties instanceof Array)) 
                updateProperties = [updateProperties];
            else if (!updateProperties.length) 
                updateProperties = null;
        } else {
            updateProperties = null;
        }
        var oldUpdateProperties = this._updateProperties;
        if (oldUpdateProperties === updateProperties) return;
        this._updateProperties = updateProperties;
        this._allowUpdate = this._updateProperties || this._updateFn;
        return true;
    },

    getUpdateProperties: function() {
        if (!this._updateProperties) return [];
        return this._updateProperties; 
    },
    
    _update: function(myItem, newItem) {
        this._beginItemsUpdate();
        try {
            if (this._updateProperties && myItem !== newItem) {
                for (var i = 0, l = this._updateProperties.length; i < l; i++) {
                    var p = this._updateProperties[i];
                    Amm.setProperty(myItem, p, Amm.getProperty(newItem, p));
                }
            }
            if (this._updateFn) this._updateFn(myItem, newItem);
            else {
                if (myItem === newItem) {
                    console.warn("updateFn not set; exactly matching items won't be update()'d)");
                }
            }
        } catch (e) {
            this._endItemsUpdate(); // handle with care
            throw e;
        }
        this._endItemsUpdate();
    },
    
    _beginItemsUpdate: function() {
        this._itemUpdateLevel++;
    },
    
    _endItemsUpdate: function() {
        this._itemUpdateLevel--;
        if (this._endItemsUpdateLock) return;
        this._endItemsUpdateLock = true;
        
        if (this._recheckUniqueness && this._itemUpdateQueue.length)
            this._performRecheckUniqueness(this._itemUpdateQueue, true);
        
        if (this._itemUpdateLevel === 1 && this._itemUpdateQueue.length) {
            this._itemUpdateLevel--;
            for (var i = 0; i < this._itemUpdateQueue.length; i++) {
                this.outItemChange(this._itemUpdateQueue[i]);
            }
            this._itemUpdateQueue = [];
        }
        this._endItemsUpdateLock = false;
        if (this._sorted) this._sort(); // re-sort items
    },
    
    // check item position in sorted array; updates it if needed
    _checkItemPosition: function(item, index) {
        if (index === undefined) {
            if (this._indexProperty) {
                // try to get index from an item
                index = Amm.getProperty(item, this._indexProperty);
                if (typeof index === 'number' && this[index] !== item)
                    index = this.strictIndexOf(item);
            } else {
                index = this.strictIndexOf(item);
            }
            if (index < 0) throw "WTF: `item` not found in this";
        }
        if (this[index] !== item) throw "WTF: this[`index`] !== `item`";
        var newIndex = undefined, sortError = false, low, high;

        // check left-side inversion
        if (index > 0 && this._sortWithProps(this[index - 1], item) > 0) { 
            var newPos = Amm.Collection.binSearch(this, item, this._sortWithProps, 0, index - 1);
            if (newPos[0] + 1 >= index) { // cannot find new position - need to sort whole collection
                sortError = true;
            } else {
                // move to the left
                newIndex = low = newPos[0] + 1;
                high = index;
            }
        }
        
        // check right-side inversion
        if (index < this.length - 1 && this._sortWithProps(item, this[index + 1]) > 0) {
            var newPos = Amm.Collection.binSearch(this, item, this._sortWithProps, index + 1, this.length - 1);
            if (newPos[0] + 1 <= index) { // cannot find new position - need to sort whole collection
                sortError = true;
            } else {
                // move to the left
                newIndex = high = newPos[0] + 1;
                low = index;
            }
        }
        if (sortError) this._sort();
        else if (newIndex !== undefined) {
            Amm.Array.prototype.moveItem.call(this, index, newIndex);
            if (high >= this.length) high = this.length - 1;
            if (this._indexProperty) this._reportIndexes(null, low, high);
        }
    },
    
    _performRecheckUniqueness: function(item, many) {
        if (!this._custComparison && !this._comparisonProperties) {
            console.warn("having setRecheckUniqueness(true) w/o prior setComparsion()" +
                " or setComparisonProperies() makes no sense - refusing to re-check");
            return;
        }
        var items;
        if (!many) items = [item];
            else items = item;
        // we will search for dupes' using indexOf
        for (var i = 0, l = items.length; i < l; i++) {
            var idx = -1, dp = [], ownIdx = null;
            do {
                idx = this.indexOf(items[i], idx + 1);
                if (idx >= 0) {
                    if (items[i] !== this[idx]) {
                        dp.push(idx);
                    } else {
                        ownIdx = idx;
                    }
                }
            } while(idx >= 0);
            if (ownIdx === null)
                console.warn("Item that was changed is no more in the collection");
            if (!dp.length) continue;
            // I don't know how under what circumstances this can happen
            if (!ownIdx && dp.length === 1) {
                console.warn("Item that was changed has a duplicate,"
                    + " but is no more in the collection."
                    + " Not throwing the exception since the collection"
                    + " is still unique.");
            } else {
                throw "After the change of this[" + ownIdx + "]," + 
                    " duplicate(s) appeared: this[" + dp.join("], this[") + ']';
            }
        }
    },

    // @param {function} updateFn - function(myUpdatedItem, externalItem)
    setUpdateFn: function(updateFn) {
        if (updateFn && typeof updateFn !== 'function') 
            throw "updateFn must be a function";
        var oldUpdateFn = this._updateFn;
        if (oldUpdateFn === updateFn) return;
        this._updateFn = updateFn;
        this._allowUpdate = this._updateProperties || this._updateFn;
        return true;
    },

    getUpdateFn: function() { return this._updateFn; }

};

Amm.extend(Amm.Collection, Amm.Array);

