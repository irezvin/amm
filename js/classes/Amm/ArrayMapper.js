/* global Amm */

Amm.ArrayMapper = function(options) {

    this._srcEntries = [];
    this._destEntries = [];
    this.beginUpdate();
    Amm.WithEvents.call(this, options);
    this.endUpdate();
    
};

/**
 * Items in destination array are sorted randomly
 */
Amm.ArrayMapper.SORT_NONE = 0;

/**
 * Items in destination array are in same order as in source array
 */
Amm.ArrayMapper.SORT_DIRECT = 1;

/**
 * Items in destination array are in reverse order of source array
 */
Amm.ArrayMapper.SORT_REVERSE = -1;

// Indexes in _srcEntries' items

Amm.ArrayMapper._SRC_ITEM = 0;

Amm.ArrayMapper._SRC_INDEX = 1;

Amm.ArrayMapper._SRC_REF_TO_DEST = 2;

// Indexes in _destEntries' items

Amm.ArrayMapper._DEST_REF_TO_SRC = 0;

Amm.ArrayMapper._DEST_PASS = 1;

Amm.ArrayMapper._DEST_SORT_VALUE = 2;

Amm.ArrayMapper._DEST_IN_SLICE = 3;

Amm.ArrayMapper._DEST_ITEM = 4;

Amm.ArrayMapper.prototype = {
    
    'Amm.ArrayMapper': '__CLASS__',
    
    // src Collection or Array (restrictions may be imposed by concrete classes)
    _src: null,

    // whether src Collection/Array instance was created by current ArrayMapper
    _srcIsOwn: null,

    // dest Collection or Array (restrictions may be imposed by concrete classes)
    _dest: null,
    
    // whether this._dest was created by Amm.ArrayMapper
    _destIsOwn: false,

    // Prototype of 'own' src - used when src is created, i.e. by assigning setSrc(array)
    _srcPrototype: null,
    
    // Prototype of 'own' dest - used when dest is created and not supplied by setDest()
    _destPrototype: null,

    srcClass: 'Amm.Array',
    
    destClass: 'Amm.Array',
    
    _filter: null,
    
    _filterIsFn: null,
    
    _sort: Amm.ArrayMapper.SORT_DIRECT,
    
    _sortIsFn: null,
    
    _offset: 0,
    
    _length: undefined,
    
    // TRUE if we have to calc "slice" (`offset` and/or `length` are set)
    _hasSlice: false,
    
    _instantiator: null,
    
    _instantiatorIsFn: null,
    
    // [ [src, srcIndex, refToDestEntry], ... ]
    // always ordered by srcIndex (so we could locate items faster)
    _srcEntries: null,
    
    // [ [refToSrcEntry, pass, orderValue, inSlice, dest ], ... ]
    _destEntries: null,
    
    /**
     * Extra items in the dest. Will always be in the beginning of dest sequence.
     * `offset` and `length` don't account for _destExtra items.
     */ 
    _destExtra: null,
    
    _updateLevel: 0,
    
    _applyFilter: false, // true: this.applyFilter was called
    
    _applySort: false, // true: this.applySort was called
    
    _applySlice: false, // true: slice parameters changed
    
    /**
     * Sets `src` Amm.Collection or Amm.Array. If javascript Array is provided, default instance is created if possible.
     * If null is provided, default instance will be created using the prototype.
     * getSrc() will return Amm.Array / Amm.Collection instance, not provided array
     */
    setSrc: function(src) {
        if (src instanceof Array) {
            if (this._src & this._srcIsOwn) {
                return this._src.setItems(src);
            } else {
               src = this._createSrc(src); 
            }
        } else if (!src) {
            src = this._createSrc();
        }
        var oldSrc = this._src;
        if (oldSrc === src) return;
        Amm.is(src, this.srcClass, 'src');
        Amm.is(src, 'Amm.Array', 'src');
        this._srcIsOwn = (src._ammArrayMapper === this);
        this._src = src;
        if (src) this._subscribeSrc(src);
        if (this._dest) {
            this._rebuild();
        }
        if (src) this._subscribeSrc(src);
        this.outSrcChange(src, oldSrc);
        if (oldSrc) this._cleanupCollectionIfOwn(oldSrc);
        return true;
    },

    /**
     * @returns {Amm.Array}
     */
    getSrc: function() {
        if (!this._src) this.setSrc(null); // will create src
        return this._src; 
    },
    
    outSrcChange: function(src, oldSrc) {
        this._out('srcChange', src, oldSrc);
    },

    setSrcPrototype: function(srcPrototype) {
        var oldSrcPrototype = this._srcPrototype;
        if (oldSrcPrototype === srcPrototype) return;
        this._srcPrototype = srcPrototype;
        // TODO: think if we need to change src properties...
        return true;
    },

    getSrcPrototype: function() { return this._srcPrototype; },
    
    getSrcIsOwn: function() { return this._srcIsOwn; },
    
    _createSrc: function(items) {
        var p = this._srcPrototype? Amm.override({}, this._srcPrototype) : {};
        if (items) p.items = items;
        var res = Amm.constructInstance(p, this.srcClass);
        res._ammArrayMapper = this;
        return res;
    },
    
    /**
     * Sets `dest` Amm.Collection or Amm.Array. In contrary to setSrc(), javascript Array cannot be provided.
     * If null is provided, current dest instance will be replaced with 'own' dest instance (unless it is 'own' 
     * now; in that case, no changes will be made)
     */
    setDest: function(dest) {
        if (!dest) {
            dest = this._createDest();
        }
        var oldDest = this._dest;
        if (oldDest === dest) return;
        Amm.is(dest, this.destClass, 'dest');
        Amm.is(dest, 'Amm.Array', 'dest');
        this._destIsOwn = (dest._ammArrayMapper === this);
        this._dest = dest;
        this._rebuild();
        this.outDestChange(dest, oldDest);
        if (oldDest) this._cleanupCollectionIfOwn(oldDest);
        return true;
    },
    
    setDestExtra: function(destExtra) {
        if (destExtra === this._destExtra) return;
        
        if (destExtra instanceof Array && !destExtra.length) destExtra = null;
        else if (!destExtra) destExtra = null;
        
        if (this._destExtra instanceof Array && destExtra instanceof Array 
            && Amm.Array.equal(destExtra, this._destExtra)) return;
        
        this._destExtra = destExtra;
        
        this._remap();
    },
    
    getDestExtra: function() {
        return this._destExtra;
    },

    /**
     * @returns {Amm.Array}
     */
    getDest: function() {
        if (!this._dest) this.setDest(null); // will create src        
        return this._dest;         
    },

    outDestChange: function(dest, oldDest) {
        this._out('destChange', dest, oldDest);
    },
    
    setDestPrototype: function(destPrototype) {
        var oldDestPrototype = this._destPrototype;
        if (oldDestPrototype === destPrototype) return;
        this._destPrototype = destPrototype;
        return true;
    },

    getDestPrototype: function() { return this._destPrototype; },
    
    getDestIsOwn: function() { return this._destIsOwn; },
    
    _createDest: function() {
        var p = this._destPrototype? this._destPrototype : {};
        var res = Amm.constructInstance(p, this.destClass);
        res._ammArrayMapper = this;
        return res;
    },

    setFilter: function(filter) {
        if (!filter) filter = null;
        var oldFilter = this._filter;
        if (oldFilter === filter) return;
        if (!filter) {
        } else if (typeof filter === 'object') {
            filter = Amm.constructInstance(filter, 'Amm.Filter', filter);
            this._filterIsFn = false;
        } else if (typeof filter === 'function') {
            this._filterIsFn = true;
        } else throw Error("`filter` must be an object, a function or a null");
        if (this._filter && !this._filterIsFn) this._unsubscribeFilter();
        this._filter = filter;
        if (this._filter && !this._filterIsFn) this._subscribeFilter();
        this.applyFilter();
        return true;
    },
    
    _subscribeFilter: function() {
        if (this._src) this._filter.setObservedObjects(this._src.getItems());
        this._filter.subscribe('matchesChange', this._handleFilterMatchesChange, this);
    },
    
    _unsubscribeFilter: function() {
        this._filter.unsubscribe('matchesChange', this._handleFilterMatchesChange, this);
        this._filter.setObservedObjects([]);
    },
    
    _subscribeSort: function() {
        if (this._src) this._sort.setObservedObjects(this._src.getItems());
        this._sort.subscribe('matchesChange', this._handleSortMatchesChange, this);
        this._sort.subscribe('needSort', this._handleSortNeedSort, this);
    },
    
    _unsubscribeSort: function() {
        this._sort.unsubscribe('matchesChange', this._handleFilterMatchesChange, this);
        this._sort.unsubscribe('needSort', this._handleSortNeedSort, this);
        this._sort.setObservedObjects([]);
    },
    
    _handleFilterMatchesChange: function(items, matches) {
        if (items.length > 1) this.beginUpdate();
        var i, l;
        for (i = 0, l = items.length; i < l; i++) {
            var item = items[i], match = matches[i];
            if (match !== undefined) this.applyFilter(item, match);
        }
        if (items.length > 1) this.endUpdate();
    },
    
    _handleSortMatchesChange: function(items, matches) {
        if (items.length > 1) this.beginUpdate();
        var i, l;
        for (i = 0, l = items.length; i < l; i++) {
            var item = items[i], match = matches[i];
            if (match !== undefined) this.applySort(item, match);
        }
        if (items.length > 1) this.endUpdate();
    },
    
    _handleSortNeedSort: function() {
        this._remap();
    },
    
    getFilter: function() { return this._filter; },
    
    /**
     * Re-applies filter to the source item(s). Useful in case when filter depends on some external data
     * or we know that items are changed.
     * 
     * @param [item] - src array memeber to re-calculate filter (if omitted, all items will be checked)
     * @param {boolean} [pass] - optonal parameter to provide pre-calculated 'pass' result 
     *      instead of calling the filter
     **/
    applyFilter: function(item, pass) {
        if (!this._src) return;
        if (item === undefined) {
            if (this._updateLevel) this._applyFilter = true;
            else {
                this._recalcAllFilter();
                this._remap();
            }
            return;
        }
        if (!this._filter) return;
        var idx = 0;
        while ((idx = Amm.Array.indexOf(item, this._src, idx)) >= 0) {
            var dest = this._srcEntries[idx][Amm.ArrayMapper._SRC_REF_TO_DEST];
            var old = dest[Amm.ArrayMapper._DEST_PASS];
            var n = pass === undefined? this._getFilterValue(dest[Amm.ArrayMapper._DEST_ITEM]) : pass;
            if (old != n && this._instantiator && this._instantiator['Amm.Instantiator.Variants'] && !this._instantiator.getFilter()) {
                this._instantiator.setMatches([item], [n]);
            }
            if (!!old !== !!n) {
                dest[Amm.ArrayMapper._DEST_PASS] = n;
                // TODO: optimize for possible change of one item
                if (!this._updateLevel) this._remap(); 
            }
            if (this._src.getUnique()) break;
        }
    },
    
    setSort: function(sort) {
        if (!sort) sort = null;
        var oldSort = this._sort;
        if (oldSort === sort) return;
        if (!sort) {
        } else if (typeof sort === 'object') {
            sort = Amm.constructInstance(sort, 'Amm.Sorter');
            this._sortIsFn = false;
            if (this._sort && this._sort['Amm.Sorter']) this._unsubscribeSort();
        } else if (typeof sort === 'function') {
            this._sortIsFn = true;
        } else if (!(sort === Amm.ArrayMapper.SORT_DIRECT || sort === Amm.ArrayMapper.SORT_REVERSE)) {
            throw Error("`sort` must be an object, a function, Amm.ArrayMapper.SORT_ constant or a null");
        }
        this._sort = sort;
        if (sort && sort['Amm.Sorter']) this._subscribeSort();
        this.applySort();
        return true;
    },
    
    getSort: function() {
        return this._sort;
    },
    
    /**
     * Re-calculates order value for source item(s).
     */
    applySort: function(item, value) {
        if (!this._src) return;
        if (item === undefined) {
            if (this._updateLevel) this._applySort = true;
            else {
                this._recalcAllSort();
                this._remap();
            }
            return;
        }
        if (!this._sort) return;
        var idx = -1;
        while ((idx = Amm.Array.indexOf(item, this._src, idx + 1)) >= 0) {
            var dest = this._srcEntries[idx][Amm.ArrayMapper._SRC_REF_TO_DEST];
            var old = dest[Amm.ArrayMapper._DEST_SORT_VALUE];
            var n = value === undefined? this._getSortValue(idx) : value;
            if (old !== n) {
                dest[Amm.ArrayMapper._DEST_SORT_VALUE] = value;
                // TODO: optimize for possible change of one item
                if (!this._updateLevel) this._remap();
            }
            if (this._src.getUnique()) break;
        }
    },
    
    _recalcAllSort: function() {
        var srcEntry, changed, newValue;
        for (var i = 0, l = this._destEntries.length; i < l; i++) {
            srcEntry = this._destEntries[i][Amm.ArrayMapper._DEST_REF_TO_SRC];
            if (!this._sort) newValue = null;
            else {
                newValue = this._getSortValue(srcEntry[Amm.ArrayMapper._SRC_ITEM], srcEntry[Amm.ArrayMapper._SRC_INDEX]);
            }
            changed = (this._destEntries[i][Amm.ArrayMapper._DEST_SORT_VALUE] !== newValue);
            this._destEntries[i][Amm.ArrayMapper._DEST_SORT_VALUE] = newValue;
        }
        this._applySort = false;
        if (this._sort && changed && !this._updateLevel) this._remap();
    },
    
    _recalcAllFilter: function() {
        var srcEntry, changed, newValue, affectedObjects = [], newMatches = [];
        var needNotifyInstantiator;
        needNotifyInstantiator = this._instantiator 
            && this._instantiator['Amm.Instantiator.Variants']
            && !this._instantiator.getFilter();

        for (var i = 0, l = this._destEntries.length; i < l; i++) {
            srcEntry = this._destEntries[i][Amm.ArrayMapper._DEST_REF_TO_SRC];
            if (!this._filter) newValue = true;
            else {
                newValue = this._getFilterValue(
                    srcEntry[Amm.ArrayMapper._SRC_ITEM]
                );
            }
            changed = this._destEntries[i][Amm.ArrayMapper._DEST_PASS] !== newValue;
            if (changed && needNotifyInstantiator) {
                affectedObjects.push(srcEntry[Amm.ArrayMapper._SRC_ITEM]);
                newMatches.push(newValue);
            }
            this._destEntries[i][Amm.ArrayMapper._DEST_PASS] = newValue;
        }
        this._applyFilter = false;
        if (affectedObjects.length) this._instantiator.setMatches(affectedObjects, newMatches);
        if (changed && !this._updateLevel) this._remap();
    },
        
    _getSortValue: function(srcItem, srcIndex) {
        if (!this._sort) return null;
        if (this._sort === Amm.ArrayMapper.SORT_DIRECT) return srcIndex;
        if (this._sort === Amm.ArrayMapper.SORT_REVERSE) return -srcIndex;
        if (this._sortIsFn) return this._sort(srcItem, srcIndex);
        return this._sort.calcSortValue(srcItem, srcIndex);
    },
    
    setOffset: function(offset) {
        if (!offset) offset = 0;
        if (typeof offset !== 'number') {
            offset = parseInt(offset);
        }
        if (isNaN(offset)) throw Error("`offset` must be a number");
        var oldOffset = this._offset;
        if (oldOffset === offset) return;
        this._offset = offset;
        var oldHasSlice = this._hasSlice;
        this._hasSlice = !(!this._offset && this._length === null);
        if (this._hasSlice || oldHasSlice) {
            if (this._updateLevel) {
                this._applySlice = true;
            } else {
                this._remap();
            }
        }
        this.outOffsetChange(offset, oldOffset);
        return true;
    },

    getOffset: function() { return this._offset; },

    outOffsetChange: function(offset, oldOffset) {
        this._out('offsetChange', offset, oldOffset);
    },

    setLength: function(length) {
        if (length === null || length === undefined || length === false || length === "") {
            length = null;
        } else {
            if (typeof length !== 'number') length = parseInt(length);
        }
        if (isNaN(length)) throw Error("`length` must be null/undefined/false/empty string or a number");
        var oldLength = this._length;
        if (oldLength === length) return;
        this._length = length;
        var oldHasSlice = this._hasSlice;
        this._hasSlice = !(!this._offset && this._length === null);
        if (this._hasSlice || oldHasSlice) {        
            if (this._updateLevel) {
                this._applySlice = true;
            } else {
                this._remap();
            }
        }
        this.outLengthChange(length, oldLength);
        return true;
    },

    getLength: function() { return this._length; },

    outLengthChange: function(length, oldLength) {
        this._out('lengthChange', length, oldLength);
    },
    
    setInstantiator: function(instantiator) {
        var oldInstantiator = this._instantiator;
        var instantiatorIsFn;
        if (!instantiator) instantiator = null;
        else if ((typeof instantiator) === 'function') {
            instantiatorIsFn = true;
        } else if (typeof instantiator === 'object') {
            if (instantiator['class']) instantiator = Amm.constructInstance(instantiator);
            Amm.meetsRequirements(instantiator, [['construct', 'destruct']], 'instantiator');
            instantiatorIsFn = false;
        } else {
            throw Error("`instantiator` must be an object, a function or a null");
        }
        if (oldInstantiator === instantiator) return;
        this.beginUpdate();
        // deconstruct old items, then re-construct them
        this._destructAll();
        this._unsubscribeInstantiator();
        this._instantiatorIsFn = instantiatorIsFn;
        this._instantiator = instantiator;
        this._subscribeInstantiator();
        this._constructAll();        
        this.endUpdate();
        // rebuild items here
        return true;
    },
    
    _subscribeInstantiator: function() {
        if (!(this._instantiator && this._instantiator['Amm.Instantiator.Variants'])) return;
        this._instantiator.subscribe('needRebuild', this._handleInstantiatorNeedRebuild, this);
        if (this._filter && this._filter['Amm.Filter']) {
            this._filter.subscribe('matchesChange', this._setInstantiatorMatches, this);
        }
    },
    
    _unsubscribeInstantiator: function() {
        if (!(this._instantiator && this._instantiator['Amm.Instantiator.Variants'])) return;
        this._instantiator.unsubscribe('needRebuild', this._handleInstantiatorNeedRebuild, this);
        if (this._filter && this._filter['Amm.Filter']) {
            this._filter.unsubscribe('matchesChange', this._setInstantiatorMatches, this);
        }
    },
    
    _setInstantiatorMatches: function(objects, matches, oldMatches) {
        if (this._instantiator.getFilter()) return;
        this._instantiator.handleFilterMatchesChange(objects, matches, oldMatches);
    },
    
    _handleInstantiatorNeedRebuild: function(objects, matches) {
        var i, l, idx, dest, destItem, destIdx = -1, item, srcUnique, match, newDestItem;
        srcUnique = this._src.getUnique();
        if (objects.length > 1 || !srcUnique) {
            this._dest.beginUpdate();
        }
        for (i = 0, l = objects.length; i < l; i++) {
            match = matches[i];
            // not interesed in non-matching object 
            // (it's dest instance won't appear in _dest because of filter)
            
            if (!match) continue; 
            item = objects[i];
            while ((idx = Amm.Array.indexOf(item, this._src, idx)) >= 0) {
                dest = this._srcEntries[idx][Amm.ArrayMapper._SRC_REF_TO_DEST];
                destItem = dest[Amm.ArrayMapper._DEST_ITEM];
                if (!destItem) continue; // we don't have dest item for some reason
                
                destIdx = Amm.Array.indexOf(destItem, this._dest, destIdx);
                if (destIdx < 0) continue;
                
                newDestItem = this._construct(item, match);
                this._dest.setItem(destIdx, newDestItem);
                this._destruct(destItem);
                dest[Amm.ArrayMapper._DEST_ITEM] = newDestItem;
                if (srcUnique) break; // we shouldn't try to find more items
            }
        }
        if (objects.length > 1 || !this._src.getUnique()) this._dest.endUpdate();
    },
    
    _construct: function(srcItem, pass) {
        if (!this._instantiator) return srcItem;
        if (this._instantiatorIsFn) return this._instantiator(srcItem, this);
        if (this._instantiator.getFilter) {
            var f = this._instantiator.getFilter();
            if (f && f !== this._filter) pass = undefined;
        }
        return this._instantiator.construct(srcItem, pass, this);
    },
    
    _destruct: function(destItem) {
        if (!this._instantiator || this._instantiatorIsFn) return;
        return this._instantiator.destruct(destItem, this);
    },
    
    _destructAll: function(entries) {
        entries = entries || this._destEntries;  
        if (!entries) return;
        for (var i = 0, l = this._destEntries.length; i < l; i++) {
            var item = this._destEntries[i][Amm.ArrayMapper._DEST_ITEM];
            if (!item) continue;
            if (this._instantiator) this._destruct(item);
            entries[i][Amm.ArrayMapper._DEST_ITEM] = null;
        }
    },
    
    _constructAll: function(entries) {
        entries = entries || this._destEntries;  
        if (!entries) return;
        for (var i = 0, l = entries.length; i < l; i++) {
            if (entries[i][Amm.ArrayMapper._DEST_ITEM]) continue;
            if (!entries[i][Amm.ArrayMapper._DEST_IN_SLICE]) continue;
            var srcItem = entries[i][Amm.ArrayMapper._DEST_REF_TO_SRC][Amm.ArrayMapper._SRC_ITEM];
            var pass = entries[i][Amm.ArrayMapper._DEST_PASS];
            var item = this._instantiator? this._construct(srcItem, pass) : srcItem;
            entries[i][Amm.ArrayMapper._DEST_ITEM] = item;
        }
    },

    getInstantiator: function() { return this._instantiator; },

    _cleanupCollectionIfOwn: function(collection) {
        if (collection && collection._ammArrayMapper === this) {
            delete collection._ammArrayMapper;
            collection.cleanup();
            return true;
        }
    },
    
    _subscribeSrc: function(instance, unsubscribe) {
        var m = unsubscribe? 'unsubscribe' : 'subscribe';
        instance[m]('spliceItems', this._handleSrcSpliceItems, this);
    },
    
    _getFilterValue: function(item) {
        if (!this._filter) return true;
        if (this._filterIsFn) return this._filter(item, this);
            else return this._filter.getMatch(item);
    },
    
    getUpdateLevel: function() {
        return this._updateLevel;
    },
    
    beginUpdate: function() {
        this._updateLevel++;
        if (this._dest) this._dest.beginUpdate();
    },
    
    endUpdate: function() {
        if (!this._updateLevel) throw Error("Call to endUpdate() w/o corresponding beginUpdate()");
        this._updateLevel--;
        if (!this._updateLevel) {
            if (this._applyFilter) this._recalcAllFilter();
            if (this._applySort) this._recalcAllSort();
            this._remap();
        }
        if (this._dest && this._dest.getUpdateLevel() > this._updateLevel)
            this._dest.endUpdate();
    },
    
    _handleSrcSpliceItems: function(index, cut, insert) {
        
        this.beginUpdate();
        
        if (this._filter && !this._filterIsFn) this._filter.beginUpdate();
        if (this._sort && typeof this._sort === 'object') this._sort.beginUpdate();
        
        var changes = Amm.Array.calcChanges(cut, insert, this._src.getComparison(), index, this._src.getUnique());
        
        var i, l;
        var replacement = [], 
            srcItem, srcIndex, newSrcIndex, srcEntry, 
            destEntry, destEntryIdx, destItem, 
            pass, inSlice, delta;
        
        // replacement is slice of this._srcEntries that will be put instead of old slice 
        // (between index..index+cut.length)
        
        replacement.length = insert.length;
        
        // add new items
        for (i = 0, l = changes.added.length; i < l; i++) {
            // code to create new item
            srcItem = changes.added[i][0];
            srcIndex = changes.added[i][1];
            srcEntry = [ srcItem, srcIndex, null ];
            
            // we register item in filter or sort objects' first, then retrieve filter or sort value
            if (srcItem && (typeof srcItem === 'object')) {
                if (this._filter && !this._filterIsFn) this._filter.observeObject(srcItem);
                if (this._sort && this._sort['Amm.Sorter']) {
                    this._sort.observeObject(srcItem);
                }
            }
            
            destEntry = [ 
                srcEntry, 
                (pass = this._filter? this._getFilterValue(srcItem) : true), 
                this._getSortValue(srcItem, srcIndex), 
                (inSlice = this._hasSlice? undefined: true),
                null
            ];
            destEntry[Amm.ArrayMapper._DEST_ITEM] = null; // will be built by _remap            
            
            this._destEntries.push(destEntry);
            
            srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST] = destEntry;
            replacement[srcIndex - index] = srcEntry;
        }
        
        // delete items
                
        for (i = 0, l = changes.deleted.length; i < l; i++) {
            srcItem = changes.deleted[i][0];
            srcIndex = changes.deleted[i][1];
            srcEntry = this._srcEntries[srcIndex];
            destEntry = srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST];
            destItem = destEntry[Amm.ArrayMapper._DEST_REF_TO_SRC];
            if (destItem !== undefined) {
                if (destItem !== srcItem && this._instantiator)
                    this._destruct(destItem);
            }
            destEntry.splice(0, destEntry.length); // delete everything from destEntry
            destEntryIdx = Amm.Array.indexOf(destEntry, this._destEntries);
            srcEntry.splice(0, srcEntry.length); // delete everything in srcEntry
            // no need to delete srcEntry since this part of this._srcEntry will be replaced anyway
            
            if (destEntryIdx >= 0) this._destEntries.splice(destEntryIdx, 1);
            if (srcItem && (typeof srcItem === 'object')) {
                if (this._filter && !this._filterIsFn) this._filter.unobserveObject(srcItem);
                if (this._sort && this._sort['Amm.Sorter']) this._sort.unobserveObject(srcItem);
            }
            
        }
        
        // move items
        
        for (i = 0, l = changes.moved.length; i < l; i++) {
            srcItem = changes.moved[i][0];
            srcIndex = changes.moved[i][1];
            newSrcIndex = changes.moved[i][1];
            srcEntry = this._srcEntries[srcIndex];
            srcEntry[Amm.ArrayMapper._SRC_INDEX] = newSrcIndex;
            destEntry = srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST];
            destEntry[Amm.ArrayMapper._DEST_SORT_VALUE] = this._getSortValue(srcItem, newSrcIndex);
            replacement[newSrcIndex - index] = srcEntry;
        }
        
        // copy items that weren't changed
        
        for (i = 0, l = changes.same.length; i < l; i++) {
            srcIndex = changes.same[i][1];
            srcEntry = this._srcEntries[srcIndex];
            replacement[srcIndex - index] = srcEntry;
        }
        
        // adjust indexes and orderValues for other items
        
        if (cut.length !== insert.length) {
            delta = insert.length - cut.length;
            for (i = index + cut.length; i < this._srcEntries.length; i++) {
                srcEntry = this._srcEntries[i];
                srcEntry[Amm.ArrayMapper._SRC_INDEX] = i + delta;
                if (this._sort) {
                    srcItem = srcEntry[Amm.ArrayMapper._SRC_ITEM];
                    destEntry = srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST];
                    destEntry[Amm.ArrayMapper._DEST_SORT_VALUE] = this._getSortValue(srcItem, i + delta);
                }
                
            }
        }
        
        // now replace old part of srcEntries with new one
        
        this._srcEntries.splice.apply(this._srcEntries, [index, cut.length].concat(replacement));
        
        this._remap();
        
        if (this._sort && typeof this._sort === 'object') this._sort.endUpdate();
        if (this._filter && !this._filterIsFn) this._filter.endUpdate();
        
        this.endUpdate();
        
    },
    
    _cleanAll: function() {
        if (!this._srcEntries) return;
        var i, l, srcEntry, destEntry, destItem;
        for (i = this._srcEntries.length - 1; i >= 0; i--) {
            srcEntry = this._srcEntries[i];
            destEntry = srcEntry[Amm.ArrayMapper._SRC_REF_TO_DEST];
            destItem = destEntry[Amm.ArrayMapper._DEST_ITEM];
            if (this._instantiator && !this._instantiatorIsFn && destItem && destItem !== srcEntry[Amm.ArrayMapper._SRC_ITEM]) {
                this._destruct(destItem);
            }
            srcEntry.splice(0, srcEntry.length);
            destEntry.splice(0, destEntry.length);
            if (this._dest) this._dest.setItems([] || this._destExtra);
        }
        this._srcEntries = [];
        this._destEntries = [];
    },
    
    _rebuild: function() {
        this.beginUpdate();
        this._cleanAll();
        if (this._src) this._handleSrcSpliceItems(0, [], this._src.getItems());
        this.endUpdate();
    },
    
    /**
     * Should be called when we already have this._srcEntries and this._destEntries
     */
    _remap: function() {
        
        if (!this._destEntries) return;
        
        this._applySort = false;
        this._applyFilter = false;
        this._applySlice = false;
        
        // now recalc everything and replace dest items
        
        var destItems = [], i, passing, l, e,
            pass = Amm.ArrayMapper._DEST_PASS,
            inSlice = Amm.ArrayMapper._DEST_IN_SLICE,
            destItem = Amm.ArrayMapper._DEST_ITEM,
            srcReference = Amm.ArrayMapper._DEST_REF_TO_SRC,
            srcItem = Amm.ArrayMapper._SRC_ITEM,
            k;
        
        if (this._sort) {
            // we keep sorted destEntries instead of post-filter array to have less work on subsequent sorts
            k = Amm.ArrayMapper._DEST_SORT_VALUE;
            if (this._sort['Amm.Sorter']) {
                var s = this._sort;
                this._destEntries.sort(function(a, b) {return s.compareMatches(a[k], b[k]);});
            } else {
                this._destEntries.sort(function(a, b) {return a[k] - b[k];});
            }
        }
        
        var passed, destItems = [];
        
        if (this._hasSlice) passed = [];
        
        for (i = 0, l = this._destEntries.length; i < l; i++) { // find passed items
            e = this._destEntries[i];
            passing = !this._filter || e[pass];
            if (!passing) { // surely not in slice
                e[inSlice] = false;
                if (e[destItem]) {
                    if (this._instantiator) this._destruct(e[destItem]);
                    e[destItem] = null;
                }                
            } else if (!this._hasSlice) { // surely in slice
                e[inSlice] = true;
                if (!e[destItem]) {
                    e[destItem] = this._instantiator? this._construct(e[srcReference][srcItem], passing) : e[srcReference][srcItem];
                }
                destItems.push(e[destItem]);
            } else { // passing && this._hasSlice - dunno if will reach to the slice
                e[inSlice] = undefined;
                passed.push(e);
            }
        }
        
        if (!this._hasSlice) {
            if (this._destExtra) {
                destItems = this._destExtra.concat(destItems);
            }
            this.getDest().setItems(destItems);
            return;
        }
        
        var _sliceInfo = this._getSlice(passed.length);
        var sliced = passed.splice(_sliceInfo[0], _sliceInfo[1] - _sliceInfo[0]);
        
        // now passed contain items not in slice, and sliced contain items in the slice
        
        for (i = 0, l = sliced.length; i < l; i++) {
            e = sliced[i];
            e[inSlice] = true;
            if (!e[destItem]) {
                e[destItem] = this._instantiator? this._construct(e[srcReference][srcItem], e[pass]) : e[srcReference][srcItem];
            }
            destItems.push(e[destItem]);
        }
        
        for (i = 0, l = passed.length; i < l; i++) {
            e = passed[i];
            e[inSlice] = false;
            if (e[destItem]) {
                if (this._instantiator) this._destruct(e[destItem]);
                e[destItem] = null;
            }       
        }
        
        if (this._destExtra) {
            destItems = this._destExtra.concat(destItems);
        }
        
        this.getDest().setItems(destItems);
        
    },
    
    //  returns part of full resulting array that is limited by _offset and _length
    _getSlice: function(fullLength) {
        var offset = this._offset, length = this._length;
        if (length === 0) return [0, 0];
        var start = offset || 0;
        if (start < 0) start = fullLength + start;
        if (start < 0) start = 0;
        var end;
        if (!length) end = fullLength;
        else if (length < 0) {
            end = fullLength + length;
            if (end < 0) end = 0;
        } else end = start + length;
        if (end < start) return [0, 0];
        return [start, end];
    },
    
    cleanup: function() {        
        if (this._filter && !this._filterIsFn) {
            this._unsubscribeFilter();
            this._filter = null;
        }
        if (this._sort && this._sort['Amm.Sorter']) {
            this._unsubscribeSort();
            this._sort = null;
        }
        this._cleanAll();
        if (this._src) this._cleanupCollectionIfOwn(this._src);
        if (this._dest) this._cleanupCollectionIfOwn(this._dest);
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    _getArrayItems: function(a, index) {
        return a.map(function(item) { return item? item[index]: undefined; });
    }

};

Amm.extend(Amm.ArrayMapper, Amm.WithEvents);
