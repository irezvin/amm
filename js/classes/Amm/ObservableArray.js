/* global Amm */

Amm.ObservableArray = function(options) {
    var a = arguments, val;
    if (a[0] instanceof Array) {
        val = a[0];
        options = a[1];
    } else if(a[0] instanceof Amm.ObservableArray) {
        val = a[0].getItems();
        options = a[1];
    }
    Amm.WithEvents.call(this, options);
    if (val !== undefined) this.setItems(val);
};

Amm.ObservableArray.arrayChangeEvents = {
    appendItems: 'outAppendItems',
    insertItem: 'outInsertItem',
    deleteItem: 'outDeleteItem',
    replaceItem: 'outReplaceItem',
    spliceItems: 'outSpliceItems',
    reorderItems: 'outReorderItems',
    moveItem: 'outMoveItem',
    clearItems: 'outClearItems',
    itemsChange: 'outItemsChange'
};

Amm.ObservableArray.prototype = {

    'Amm.ObservableArray': '__CLASS__', 

    // whether an array must have unique items. Attempt to insert same value for the second time will trigger an exception
    _unique: false,

    // comparison function. By default strict, === comparison is used
    _comparison: null,

    // when diff mode is enabled (almost always), setItems() calculates diff betwen old and new array, 
    // and tries to detect the specific action to call more concrete events.
    _diff: true,
    
    // more javascript-array-like behaviour: allow set index far behind length, create 'undefined' values in between
    // (won't make much sense when `unique` is TRUE)
    _sparse: false,
    
    _update: 0,
    
    _preUpdateItems: null,
    
    _evCache: null,
    
    length: 0,
    
    // array compat
    
    push: function(element, _) {
        var items = Array.prototype.slice.apply(arguments), l = items.length;
        if (!l) return this.length;
        if (this._unique) this._checkDuplicates("push()", items);
        for (var i = 0; i < l; i++) {
            this[this.length++] = items[i];
        }
        if (!this._update) this.outAppendItems(items);
        return this.length;
    },
    
    pop: function() {
        if (!this.length) return undefined;
        --this.length;
        res = this[this.length];
        delete this[this.length];
        if (!this._update) this.outDeleteItem(this.length, res);
        return res;
    },
    
    slice: function(start, end) {
        start = start || 0; 
        if (start < 0) start = this.length + start;
        if (start < 0) start = 0;
        end = end || this.length;
        if (end < 0) end = this.length + end;
        if (end < 0) end = 0;
        if (end > this.length) end = this.length;
        var res = [];
        for (var i = start; i < end; i++) res.push(this[i]);
        return res;
    },
    
    // triggers rerderItems event for all items if order of any item was
    // changed because of sorting 
    sort: function(fn) {
        
        if (this.length <= 1) return this; // nothing to do
        
        var items = this.getItems(), oldItems = [].concat(items),
            i, l = this.length;
    
        items.sort(fn);
        var changed = false;
        if (this._comparison) {
            for (i = 0; i < l; i++) {
                changed = changed || this._comparison(this[i], items[i]);
                if (!this._sparse || i in items) {
                    this[i] = items[i];
                } else {
                    delete this[i];
                }
            }
        } else {
            for (i = 0; i < l; i++) {
                changed = changed || this[i] !== items[i];
                this[i] = items[i];
                if (!this._sparse || i in items) {
                    this[i] = items[i];
                } else {
                    delete this[i];
                }
            }
        }
        if (changed) 
            this.outReorderItems(0, this.length, oldItems);
        return this;
    },
    
    // triggers rerderItems event
    reverse: function() {
        
        if (this.length <= 1) return this; // nothing to do
        
        var items = this.getItems(),
            i, l = this.length - 1, max = (l - l%2)/2, tmp, a, b;
    
            
        for (i = 0; i <= max; i++) {
            if (!this._sparse || ((i in this) && (l - i) in this)) {
                tmp = this[i];
                this[i] = this[l - i];
                this[l - i] = tmp;
            } else {
                a = i in this;
                b = (l - i) in this;
                if (!a && !b) continue;
                if (b) {
                    this[i] = this[l - i];
                    delete this[l - i];
                } else {
                    this[l - i] = this[i];
                    delete this[i];
                }
            }
        }
        this.outReorderItems(0, this.length, items);
        return this;
    },
    
    /* Rotates values in numeric keys to allocate or delete indexes.
       Updates this.length if {until} isn't provided.
       {start}: starting index to shift left or right
       {delta}: non-zero, negative or positive value
   */
    _rotate: function(start, delta, until) {
        if (!delta) return; // nothing to do
        var 
            a = delta < 0? start - delta : this.length - 1, 
            b = delta < 0? this.length : start - 1,
            d = delta < 0? 1 : -1;
    
        while(d*a < d*b) {
            if (a in this) 
                this[a + delta] = this[a];
            else
                delete this[a + delta];
            a += d;
        }
        if (delta < 0)
            for (var i = this.length + delta; i < this.length; i++) 
                delete(this[i]);
        
        this.length += delta;
    },
    
    _innerShift: function(a, b) {
        var d = a > b? -1 : 1;
        for (var i = a; i*d < b*d; i += d) {
            this[i] = this[i + d];
        }
    },
    
    /**
     * check duplicates both in `insert` and this.getItems() arrays
     * 
     * {method} - name of method to add to an exception message
     * {insert} - array - items to be inserted into this ObservableArray
     * {ignoreStart}, {ignoreLength} - interval to be NOT checked while
     *      duplicate hunt (i.e. if we're going to splice them out)
     * {checkOwn} - check own items for duplicates too (i.e. if we try to 
     *      change _comparisonFn or _unique, our internal perfect self
     *      may become inconsistent with new rules)
     * {comparison} - to use instead of this._comparison
     */ 
    _checkDuplicates: function(method, insert, ignoreStart, ignoreLength, checkOwn,
        comparison) {
        if (comparison === undefined) comparison = this._comparison;
        var o = this.getItems();
        if (ignoreLength) o.splice(ignoreStart, ignoreLength);
        var c = insert.concat(o), 
            d = Amm.ObservableArray.findDuplicates(
                c, true, comparison, checkOwn? null : insert.length
            );
        if (d.length) {
            var a = this._describeIdx(d[0][0], insert.length, ignoreStart || 0, 
                ignoreLength || 0),
                b = this._describeIdx(d[0][1], insert.length, ignoreStart || 0, 
                ignoreLength || 0);
            throw "Cannot " + method + ": duplicates found (" + a + " and " + b + ")";
        }
    },
    
    _describeIdx: function(idx, insertLength, ignoreStart, ignoreLength) {
        var length = this.length, what, resIdx;
        if (idx < insertLength) { what = "items"; resIdx = idx; }
        else if (idx < ignoreStart + insertLength) {
            what = "this";
            resIdx -= insertLength;
        } else {
            what = "this";
            resIdx = idx - insertLength + (ignoreLength || 0);
        }
        return what + "[" + resIdx + "]";
    },
    
    splice: function(start, deleteCount, item1, item2_) {
        var insert = Array.prototype.slice.call(arguments, 2), 
            insertCount = insert.length;
    
        var res = [], oldLength = this.length;
        
        start = +start || 0; 
        if (start < 0) {
            start = this.length + start;
            if (start < 0) start = 0;
        }
        else if (start > this.length) start = this.length;
        
        deleteCount = +deleteCount || 0;
        if (deleteCount < 0) deleteCount = 0;
        if (deleteCount > (this.length - start))
            deleteCount = this.length - start;
        
        if (this._unique && insertCount)
            this._checkDuplicates("splice()", insert, start, deleteCount);
        
        if (start === this.length) { // edge case - append
            this.push.apply(this, insert);
            return res;
        }
        
        var delta = insertCount - deleteCount; // how the length will change
        
        var i;
        for (i = 0; i < deleteCount; i++) res.push(this[start + i]);
        this._rotate(start, delta);
        for (i = 0; i < insertCount; i++) this[start + i] = insert[i];
        
        if (!this._update) this._outSmartSplice(start, res, insert);
        return res;
    },
    
    shift: function() {
        if (!this.length) return undefined;
        var res = this[0];
        this._rotate(0, -1);
        if (!this._update) this.outDeleteItem(0, res);
        return res;
    },
    
    unshift: function(element, _) {
        var items = Array.prototype.slice.apply(arguments), l = items.length;
        if (!l) return this.length;
        var oldLength = this.length;
        if (this._unique) this._checkDuplicates("unshift()", items);
        if (this.length) this._rotate(0, l);
            else this.length = l;
        for (var i = 0; i < l; i++) {
            this[i] = items[i];
        }
        if (!this._update) this._outSmartSplice(0, [], items);
        return this.length;
    },
    
    indexOf: function(item, start) {
        start = start || 0;
        if (start < 0) {
            start = this.length + start;
            if (start < 0) start = 0;
        }
        var res = -1;
        if (this._comparison) {
            for (var i = start, l = this.length; i < l; i++) {
                if (!this._comparison.call(item, this[i])) {
                    res = i;
                    break;
                }
            }
        } else {
            for (var i = start, l = this.length; i < l; i++) {
                if (item === this[i]) {
                    res = i;
                    break;
                }
            }
        }
        return res;
    },
    
    getItems: function() {
        return Array.prototype.slice.apply(this);
    },
    
    getItem: function(index) {
        return this[index];
    },
    
    getIndexExists: function(index) {
        return index in this;
    },
    
    setItem: function(index, item) {
        // already has the same item in place?
        if (
            this[index] 
            &&  this._comparison? 
                !this._comparison.call(this[index], item): this[index] === item
        )
            return; 
        if (this._unique) this._checkDuplicates("setItem()", [item], index, 1);
        if (index < 0) throw "`index` must be >= 0";
        if (index >= this.length) {
            if (!this._sparse) index = this.length;
            this.length = index + 1;
        }
        if (index in this) {
            var oldItem = this[index];
            this[index] = item;
            if (!this._update) this.outReplaceItem(index, item, oldItem);
        } else {
            this[index] = item;
            if (!this._update) this.outInsertItem(index, item);
        }
        return index;
    },
    
    removeAtIndex: function(index, sparse) {
        if (!this._sparse) sparse = false;
        if (!(index in this)) return false;
        if (index < 0) throw "`index` must be >= 0";
        var item = this[index];
        if (!sparse) this._rotate(index, -1);
            else delete this[index];
        if (!this._update) this.outDeleteItem(index, item);
        return true;
    },
    
    moveItem: function(index, newIndex) {
        if (index < 0) throw "`index` must be >= 0";
        if (index >= this.length) throw "No item with index " + index;
        if (newIndex < 0) throw "`newIndex` must be >= 0";
        if (newIndex >= this.length && !this._sparse) {
            newIndex = this.length - 1;
        }
        if (newIndex === index) return; // nothing to do
        var item = this[index], delta, start, until;
        this._innerShift(index, newIndex);
        this[newIndex] = item;
        this.outMoveItem(index, newIndex, item);
    },
    
    insertItem: function(item, index) {
        if (index === undefined || index >= this.length && !this._sparse) {
            return this.push(item) - 1; // new index will be length - 1
        }
        if (index < 0) throw "`index` must be >= 0";
        if (this._unique) this._checkDuplicates("insertItem()", [item]);
        if (index < this.length) this._rotate(index, 1);
        if (index >= this.length) this.length = index;
        this[index] = item;
        if (!this._update) this.outInsertItem(index, item);
        return index;
    },
    
    insertItemBefore: function(item, otherItem) {
        if (otherItem === undefined) return this.insertItem(item);
        var idx = this.indexOf(otherItem);
        if (idx < 0) throw "cannot insertItemBefore: `otherItem` not found";
        return this.insertItem(item, idx);
    },
    
    removeItem: function(item, all) {
        if (this._unique) all = false;
        var res = 0, idx = 0;
        while((idx = this.indexOf(item, idx)) >= 0) {
            this.removeAtIndex(idx);
            res++;
            if (!all) break;
        }
        return res;
    },
    
    setItems: function(items) {
        if (!items instanceof Array) throw "`items` must be an array";
        if (this._unique) this._checkDuplicates("setItems()", items, 0, this.length);
        var oldItems = this.getItems(), 
            l = items.length, 
            oldLength = this.length;
        var i, j;
        for (i = 0, j = 0; i < l; i++) {
            if (i in items) {
                this[j] = items[i];
                j++;
            } else {
                if (this._sparse) {
                    delete this[j];
                    j++;
                }
            }
        }
        this.length = j;
        while (j < oldLength) delete this[j++];
        if (!this._update) {
            if (this._diff) {
                this._doDiff(oldItems, items);
            } else {
                this._outSmartSplice(0, oldItems, items);
            }
        }
        return this.length;
    },
            
    clearItems: function() {
        return this.setItems([]);
    },
    
    setSparse: function(sparse) {
        var oldSparse = this._sparse;
        if (oldSparse === sparse) return;
        this._sparse = sparse;
        return true;
    },

    getSparse: function() { return this._sparse; },

    setUnique: function(unique) {
        var oldUnique = this._unique;
        if (oldUnique === unique) return;
        if (unique) {
            this._checkDuplicates("setUnique()", [], 0, 0, true);
        }
        this._unique = unique;
        return true;
    },

    getUnique: function() { return this._unique; },

    setComparison: function(comparison) {
        var oldComparison = this._comparison;
        if (oldComparison === comparison) return;
        if (this._unique) {
            this._checkDuplicates("setComparison()", [], 0, 0, true, comparison);
        }
        this._comparison = comparison;
        return true;
    },

    getComparison: function() { return this._comparison; },

    setDiff: function(diff) {
        var oldDiff = this._diff;
        if (oldDiff === diff) return;
        this._diff = diff;
        return true;
    },

    getDiff: function() { return this._diff; },
    
    _doBeginUpdate: function() {
        this._preUpdateItems = this.getItems();
    },
    
    _doEndUpdate: function() {
        if (this._diff) {
            this._doDiff();
        } else {
            if (!this._update) this.outItemsChange(this._getItems, this._preUpdateItems);
        }
        this._preUpdateItems = null;
    },
    
    beginUpdate: function() { 
        this._update++; 
        if (this._update === 1) {
            this._doBeginUpdate();
        }
    },
    
    endUpdate: function() {
        if (!this._update) throw "endUpdate() before beginUpdate()!";
        this._update--;
        if (this._update === 0) {
            this._doEndUpdate();
        }
    },
    
    getUpdateLevel: function() {
        return this._update;
    },
    
    _buildEvCache: function() {
        var ec = [{}], scp = [null]; 
        
        if (!scp.indexOf) {
            scp.indexOf = this.indexOf;
        }
        
        // sp used to keep scopes registry
        
        for (var ev in this._subscribers) {
            if (
                this._subscribers.hasOwnProperty(ev) 
        
                // only for events that are handled specially
                && Amm.ObservableArray.arrayChangeEvents[ev]
            ) {
                var l = this._subscribers[ev].length, hdl, i, idx;
                for (i = 0; i < l; i++) {
                    hdl = this._subscribers[ev][i];
                    if (hdl[1]) {
                        idx = scp.indexOf(hdl[1]);
                        if (idx < 0) {
                            idx = scp.length;
                            scp.push(hdl[1]);
                            ec.push({});
                        }
                    }
                    else idx = 0;
                    if (!ec[idx][ev]) ec[idx][ev] = [];
                    ec[idx][ev].push(hdl);
                }
            }
        }
        
        this._evCache = ec;
        return this._evCache;
    },
    
    _outChain: function(events) {
        if (!this._evCache) this._buildEvCache();
        if (!this._evCache.length) return;
        var ev = [], evName, spl, args;
        for (evName in events)
            if (events.hasOwnProperty(evName)) ev.push(evName);
        var evl = ev.length;
        for (var i = 0, l = this._evCache.length; i < l; i++) {
            for (var j = 0; j < evl; j++) {
                evName = ev[j];
                if (this._evCache[i][evName]) { // found suitable subscriber
                    var args = events[evName];
                    if (!args) {
                        args = [];
                        if (evName === 'itemsChange') {
                            args = [this.getItems()];
                            // already have'em
                            if (this._preUpdateItems) {
                                args.push(this._preUpdateItems);
                            } else if (spl = events['spliceItems']) {
                                // splice is reversibe - swap to get old value
                                var preup = [].concat(args[0]);
                                preup.splice.apply(preup, [spl[0], spl[2].length].concat(spl[1]));
                                args.push(preup);
                            }
                        }
                    }
                    Amm.WithEvents.invokeHandlers.call(
                        this,  // origin
                        evName,  // event name
                        args, // args (in "events[evName]")
                        this._evCache[i][evName] // event observers (same scope)
                    );
                    // first index in _evCache is reserved 
                    // to the subscribers w/o scope, so we notify them all
                    if (i !== 0) break;
                }
            }
        }
    },
    
    outClearItems: function(oldItems) {
        return this._outChain({
            clearItems: null, 
            spliceItems: [0, oldItems, []], 
            itemsChange: [[], oldItems]
        });
    },
    
    outDeleteItem: function(index, item) {
        return this._outChain({
            deleteItem: [index, item],
            spliceItems: [index, [item], []],
            itemsChange: null
        });
    },
            
    outInsertItem: function(index, newItem) {
        return this._outChain({
            insertItem: [index, newItem],
            spliceItems: [index, [], [newItem]],
            itemsChange: null
        });
    },
    
    outReplaceItem: function(index, newItem, oldItem) {
        return this._outChain({
            replaceItem: [index, newItem, oldItem],
            spliceItems: [index, [oldItem], [newItem]],
            itemsChange: null
        });
    },
    
    outAppendItems: function(items) {
        return this._outChain({
            appendItems: [items],
            spliceItems: [this.length - items.length, [], items],
            itemsChange: null
        });
    },
    
    outSpliceItems: function(index, cut, insert) {
        return this._outChain({
            spliceItems: [index, cut, insert],
            itemsChange: null
        });
    },
    
    outMoveItem: function(oldIndex, newIndex, item) {
        var old, offset, l;
        if (oldIndex < newIndex) {
            offset = oldIndex, l = newIndex - oldIndex + 1;
            old = this.slice(offset, newIndex);
            old.unshift(item);
        } else {
            offset = newIndex;
            l = oldIndex - newIndex + 1;
            old = this.slice(offset + 1, offset + 1 - l);
            old.push(item);
        }
        return this._outChain({
            moveItem: [oldIndex, newIndex, this[newIndex]],
            reorderItems: [offset, l, old],
            spliceItems: [offset, old, this.slice(offset, offset + l)],
            itemsChange: null
        });
    },
    
    outReorderItems: function(index, length, oldOrder) {
        return this._outChain({ 
            reorderItems: [index, length, oldOrder],
            spliceItems: [index, oldOrder, this.slice(index, index + length)],
            itemsChange: null
        });
    },
    
    // never call directly - is called from the chain when spliceItems event 
    // is encountered (since splice is reversible and we can figure out oldItems)
    outItemsChange: function(items, oldItems) {
        return this._outChain({
            itemsChange: [items, oldItems]
        });
    },
    
    // detects boundaries and transform them into more atomic events
    _outSmartSplice: function(start, cut, insert) {
        if (!cut.length && !insert.length) return; // nothing changed

        // clear
        if (start === 0 && !insert.length && !this.length) {
            return this.outClearItems(cut);
        }
        
        // append
        if (!cut.length && start >= this.length - insert.length) {
            return this.outAppendItems(insert);
        }
        
        // insert 1
        if (!cut.length && insert.length == 1) {
            return this.outInsertItem(start, insert[0]);
        }

        // replace
        if (cut.length == 1 && insert.length == 1) {
            return this.outReplaceItem(start, insert[0], cut[0]);
        }
        
        // delete
        if (cut.length == 1 && !insert.length) {
            return this.outDeleteItem(start, cut[0]);
        }

        // same... but different order?
        if (cut.length === insert.length) {
            var l1 = cut.length - 1;
            // same?
            if (Amm.ObservableArray.equal(cut, insert, undefined, undefined, undefined, this._comparison)) {
                return; // nothing changed
                
            // move first spliced element to end of splice
            } else if (this._comparison? !this._comparsion(cut[0], insert[l1]) : cut[0] === insert[l1]) { // move fwd?
                if (Amm.ObservableArray.equal(cut, insert, 1, 0, l1, this._comparison))
                    return this.outMoveItem(start, start + l1, cut[0]);
            // move last spliced element to beginning of splice
            } else if (this._comparison? !this._comparsion(cut[l1], insert[0]) : cut[l1] === insert[0]) {
                if (Amm.ObservableArray.equal(cut, insert, 0, 1, l1, this._comparison))
                    return this.outMoveItem(start + l1, start, cut[l1]);
            }
            // same elements, different order?
            if (!Amm.ObservableArray.symmetricDiff(cut, insert, this._comparison).length) {
                return this.outReorderItems(start, cut.length, cut);
            }
        }
        
        // phew... maybe just ordinary splice?
        return this.outSpliceItems(start, cut, insert);
    },
    
    _doDiff: function(oldItems, items) {
        oldItems = oldItems || this._preUpdateItems;
        items = items || this.getItems();
        var d = Amm.ObservableArray.smartDiff(oldItems, items);
        
        // * a) ['splice', start, length, elements[]]
        // * b) ['move', oldIndex, newIndex] - element was moved from `oldIndex` to `newIndex`, that's all
        // * c) ['reorder', start, length, oldItems] - `length` elements starting from `start` have different order, otherwise the same array
        // * d) null - nothing changed
        
        if (!d) return;
        if (d[0] === 'splice') {
            // will figure append/delete/insert/replace
            return this._outSmartSplice(d[1], oldItems.slice(d[1], d[1] + d[2]), d[3]);
        }
        
        if (d[0] === 'move') {
            return this.outMoveItem(d[1], d[2], this[d[2]]);
        }
            
        if (d[0] === 'reorder') {
            console.log(d);
            return this.outReorderItems(d[1], d[2], d[3]);
        }
    },

    subscribe: function(outEvent, handler, scope, extra, decorator) {    
        this._evCache = null;
        return Amm.WithEvents.prototype.subscribe.call
            (this, outEvent, handler, scope, extra, decorator);
    },
    
    unsubscribe: function(outEvent, handler, scope) {    
        this._evCache = null;
        return Amm.WithEvents.prototype.unsubscribe.call
            (this, outEvent, handler, scope);
    },
    
    clear: function() {
        var r = Amm.WithEvents.unsubscribe.call(this);
        this._evCache = null;
        this._update = 1;
        this.setItems([]);
        this._preUpdateItems = null;
        this._update = 0;
        return r;
    }
    
};

Amm.extend(Amm.ObservableArray, Amm.WithEvents);

/**
 * returns TRUE when a.slice(aOffset, aOffset + length) === b.slice(bOffset, bOffset+length)
 * Offset defaults to 0. Ommitting length will check if arrays are equal.
 */
Amm.ObservableArray.equal = function(a, b, aOffset, bOffset, length, comparisonFn) {
    // shortcut
    if (!aOffset && !bOffset && length === undefined) {
        if (a.length !== b.length) return false;
        aOffset = 0;
        bOffset = 0;
        length = a.length;
    } else {
        // check how many items we will actually compare
        aOffset = aOffset || 0;
        if (aOffset < 0) aOffset = a.length + aOffset;
        if (aOffset < 0) aOffset = 0;
        bOffset = bOffset || 0;
        if (bOffset < 0) bOffset = b.length + bOffset;
        if (bOffset < 0) bOffset = 0;
        // default toward remaining items
        if (length === undefined) length = a.length - aOffset;
        if (length < 0) length = 0;
        if (length === 0) return true;
        
        // rA, rB - how much items we actually have to compare in both arrays
        
        var 
            rA = length, 
            rB = length;
    
        
        if (aOffset + length > a.length) rA = a.length - aOffset;
        if (bOffset + length > b.length) rB = b.length - bOffset;
    
        // [] == []
        if (rA <= 0 && rB <= 0) return true;
        
        // slices are of different length
        if (rA !== rB) return false; 
    }
    // at this point we are guaranteed to have slices of equal length,
    // and have aOffset, bOffset and length populated
    if (comparisonFn) {
        for (var i = 0; i < length; i++) {
            if (comparisonFn(a[aOffset + i], b[bOffset + i])) 
                return false;
        }
    } else {
        for (var i = 0; i < length; i++) {
            if (a[aOffset + i] !== b[bOffset + i]) 
                return false;
        }
    }
    return true;
};

/** 
 * {a} - old version of array. 
 * {b} - new version of array.
 * {comparisonFn} - function that returns 0 if elements are equal (=== is used by default)
 * 
 * returns Array:
 * 
 * a) ['splice', start, length, elements[]]
 * b) ['move', oldIndex, newIndex] - element was moved from `oldIndex` to `newIndex`, that's all
 * c) ['reorder', start, length, oldItems] - `length` elements starting from `start` have different order, otherwise the same array
 * d) null - nothing changed
 */
Amm.ObservableArray.smartDiff = function(a, b, comparisonFn) {
    
    var al = a.length, bl = b.length, 
            delta = bl - al,
            dBeginMax = al > bl? al : bl,
            i,
            dBegin, dEnd;
    
    // edge cases
    if (!al && !bl) return null; // edge case - both empty, thus no changes
    if (!al) return ['splice', 0, 0, [].concat(b)]; // fully insert b
    if (!bl) return ['splice', 0, al, []]; // fully clear a

    /* algorhythm
     * - start from left to right, stop on first discrepancy (dBegin)
     *      - end of array? ok, job done
     * - start from right to left, stop on first discrepancy (dEnd)
     *      - arrays of same length? - check if items between dBegin and dEnd were re-ordered 
     *          -   best case: element was moved from dBegin to dEnd or from dEnd to dBegin
     *          -   second base case: 'reorder' event
     *      - arrays of different length? - 'splicing' took place
     */
    for (dBegin = 0; dBegin < dBeginMax; dBegin++) { //dBegin is index in a
        if (comparisonFn? comparisonFn(a[dBegin], b[dBegin]) : (a[dBegin] !== b[dBegin])) {
            break;
        }
    }
    var dEndMin = delta > 0? dBegin + delta - 1 : dBegin;
    for (dEnd = al - 1; dEnd >= dEndMin; dEnd--) { //dEnd is index in a
        if (comparisonFn? comparisonFn(a[dEnd], b[dEnd + delta]) : (a[dEnd] !== b[dEnd + delta])) {
            break;
        }
    }
    dEnd++;
    
    var cutSize = dEnd - dBegin;
    var insertSize = cutSize + delta;
    
    /*
    console.log(a, al);
    console.log(b, bl);
    console.log('dBegin', dBegin, 'dEndMin', dEndMin, 'delta', delta, 'dEnd', dEnd, 
        'cutSize', cutSize, 'insertSize', insertSize);
    */
    
    if (insertSize) insert = b.slice(dBegin, dBegin + insertSize);
        else insert = [];
        
    if (!cutSize && !insertSize) return null; // same
        
    // check 1-element move or reorder
    if (cutSize === insertSize) {
        var cut = a.slice(dBegin, dBegin + cutSize), 
            dCut = 0, 
            dIns = 0,
            match = true;
        
        if (comparisonFn? !comparisonFn(cut[0], insert[insertSize - 1]) : (cut[0] === insert[insertSize - 1])) {
            // move forward - from beginning of cut to end of insert
            dCut = 1;
        } else if (comparisonFn? !comparisonFn(cut[cutSize - 1], insert[0]) : (cut[cutSize - 1] === insert[0])) { 
            // move back - from end of insert to beginning of cut
            dIns = 1;
        }
        if (dCut || dIns) { // check other items for exact match with regard to 'move' direction
            for (i = 0; i < cutSize - 1; i++) {
                if (comparisonFn? comparisonFn(cut[i + dCut], insert[i + dIns]) : (cut[i + dCut] !== insert[i + dIns])) {
                    match = false;
                    break;
                }
            }
            if (match) {
                if (dCut) return ['move', dBegin, dBegin + cutSize - 1];
                else return ['move', dEnd - 1, dEnd - cutSize];
            }
        }
        if (!Amm.ObservableArray.symmetricDiff(cut, insert, comparisonFn).length) return ['reorder', dBegin, cutSize, cut];
    }
    
    return ['splice', dBegin, cutSize, insert];

};

// disable to always use slow arrayDiff version
Amm.ObservableArray._optArrayDiff = true;


// returns elements in A that are not in B, each instance is compared only once
Amm.ObservableArray.symmetricDiff = function(a, b, comparisonFn) {
    if (!a.length || !b.length) return [].concat(a);
    
    var al = a.length, bl = b.length, bb = [].concat(b), r, i, j;
    if (comparisonFn) {
        r = [];
        for (i = 0; i < al; i++) {
            var v = a[i];
            for (j = 0; j < bl; j++) if (!comparisonFn(v, bb[j])) {
                bb.splice(j, 1);
                bl--;
                j--;
                break;
            }
            if (j >= bl) r.push(v);
        }
    } else {
        // quick version for .indexOf-enabled browsers
        if (a.filter && bb.indexOf && Amm.ObservableArray._optArrayDiff) {
            r = a.filter(function(v) {
                var idx = bb.indexOf(v);
                if (idx >= 0) {
                    bb.splice(idx, 1);
                    return false;
                }
                return true;
            });
        } else {
            r = [];
            for (i = 0; i < al; i++) {
                var v = a[i];
                for (j = 0; j < bl; j++) if (v === bb[j]) {
                    bb.splice(j, 1);
                    bl--;
                    j--;
                    break;
                }
                if (j >= bl) r.push(v);
            }
        }
    }
    return r;
};


// returns elements in A that are not in B
Amm.ObservableArray.arrayDiff = function(a, b, comparisonFn) {
    if (!a.length || !b.length) return [].concat(a);
    
    var al = a.length, bl = b.length, r, i, j;
    
    if (comparisonFn) {
        for (i = 0; i < al; i++) {
            r = [];
            var v = a[i];
            for (j = 0; j < bl; j++) {
                if (!comparisonFn(v, b[j])) break;
            }
            if (j >= bl) r.push(v);
        }
    } else {
        // quick version for .indexOf-enabled browsers
        if (a.filter && b.indexOf && Amm.ObservableArray._optArrayDiff) {
            r = a.filter(function(v) {return b.indexOf(v) < 0;});
        } else {
            r = [];
            for (i = 0; i < al; i++) {
                var v = a[i];
                for (j = 0; j < bl; j++) {
                    if (v === b[j]) break;
                }
                if (j >= bl) r.push(v);
            }
        }
    }
    return r;
};

/* Finds duplicate items in an array, using either a === b 
 * or !comparisonFn(a, b) comparison.
 * 
 * Returns [[aIdx1, aIdx2, aIdx3...], ...] where aIdx1, aIdx2, ... - indexes 
 * of found duplicates of the same items (aIdx is an index of first occurance,
 * etc)
 * 
 * {onlyFirst} - bool - return after locating second instance of any item 
 * (result array will have at most 1 element with 2 items) instead of thoroughly
 * searching all possible duplicates
 * 
 * {stopSearchIdx} - int - if non-zero, the items after this index are assumed
 * to have NO duplicates, and routine will stop after searching duplicate
 * instances of items with indexes betetween 0 <= idx < stopSearchIdx.
 */
Amm.ObservableArray.findDuplicates = function(array, onlyFirst, comparisonFn, stopSearchIdx) {
    var l = array.length, res = [], fnd, rr, same;
    if (!stopSearchIdx) stopSearchIdx = l - 1;
    for (var i = 0; i < stopSearchIdx; i++) {
        for (var j = i + 1; j < l; j++) {
            if (comparisonFn) same = !comparisonFn(array[i], array[j]);
            else same = (array[i] === array[j]);
            if (same) {
                // fnd keeps registry of already found items to we don't include them again in result
                // otherwise items that have more than 2 instances will produce several results
                // (we don't want to "unset" found ones to not break numbering)
                if (!fnd) fnd = [i]; 
                else {
                    var has;
                    if (fnd.indexOf) has = fnd.indexOf(j) >= 0;
                    else {
                        for (var k = 0; k < fnd.length; k++) 
                            if (fnd[k] === j) {
                                has = true; 
                                break;
                            }
                    }
                    if (has) continue;
                }
                if (!rr) rr = [i];
                rr.push(j);
                if (onlyFirst) return [rr];
                fnd.push(j);
            }
        }
        if (rr) {
            res.push(rr);
            rr = null;
        }
    }
    return res;
};
