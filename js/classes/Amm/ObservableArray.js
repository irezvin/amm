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
    
    length: 0,
    
    // array compat
    
    push: function(element, _) {
        var items = Array.prototype.slice.apply(arguments), l = items.length;
        if (!l) return this.length;
        if (this._unique) this._checkDuplicates("push()", items);
        for (var i = 0; i < l; i++) {
            this[this.length++] = items[i];
        }
        this.outAppendItems(items);
        return this.length;
    },
    
    pop: function() {
        if (!this.length) return undefined;
        --this.length;
        res = this[this.length];
        delete this[this.length];
        this.outDeleteItem(this.length, res);
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
    
    // rotates values in numeric keys to allocate or delete indexes.
    // updates length.
    // start: starting index to shift left or right
    // delta: non-zero, negative or positive value
    _rotate: function(start, delta) {
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
        
        this._outSmartSplice(start, res, insert, oldLength);
        return res;
    },
    
    shift: function() {
        if (!this.length) return undefined;
        var res = this[0];
        this._rotate(0, -1);
        this.outDeleteItem(0, res);
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
        this._outSmartSplice(0, [], items, oldLength);
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
        if (this[index] && this._comparison? !this._comparison.call(this[index], item): this[index] === item)
            return; // already has the item in place
        if (this._unique) this._checkDuplicates("setItem()", [item], index, 1);
        if (index < 0) throw "`index` must be >= 0";
        if (index >= this.length) {
            if (!this._sparse) index = this.length;
            this.length = index + 1;
        }
        if (index in this) {
            var oldItem = this[index];
            this[index] = item;
            this.outReplaceItem(index, item, oldItem);
        } else {
            this[index] = item;
            this.outInsertItem(index, item);
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
        this.outDeleteItem(index, item);
        return true;
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
        this.outInsertItem(index, item);
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
        this._outSmartSplice(0, oldItems, items, oldLength);
        return this.length;
    },
            
    clear: function() {
        return this.setItems([]);
    },
    
    outDeleteItem: function(index, item) {
        
    },
            
    outInsertItem: function(index, newItem) {
        
    },
    
    outReplaceItem: function(index, newItem, oldItem) {
        
    },
    
    outAppendItems: function(items) {
        
    },
    
    outRebuild: function() {
        
    },
    
    // detects boundaries and transform them into more atomic events
    _outSmartSplice: function(start, cut, insert, oldLength) {
        
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
        if (this._diff) this._preUpdateItems = this.getItems();
    },
    
    _doEndUpdate: function() {
        if (this._diff && this._preUpdateItems) {
            this._doDiff();
        } else {
            this.outRebuild();
        }
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
    }
};

Amm.extend(Amm.ObservableArray, Amm.WithEvents);

/** 
 * {a} - old version of array. 
 * {b} - new version of array.
 * {comparisonFn} - function that returns 0 if elements are equal (=== is used by default)
 * 
 * returns Array:
 * 
 * a) ['splice', start, length, elements[]]
 * b) ['move', oldIndex, newIndex] - element was moved from `oldIndex` to `newIndex`, that's all
 * c) ['reorder', start, length] - `length` elements starting from `start` have different order, otherwise the same array
 * d) null - nothing changed
 */
Amm.ObservableArray.smartDiff = function(a, b, comparisonFn) {
    
    var al = a.length, bl = b.length, 
            maxL = al > bl? al: bl, 
            minL = al < bl? al: bl,
            delta = al - bl,
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
    for (dBegin = 0; dBegin < minL; dBegin++) { //dBegin is index in a
        if (comparisonFn? comparisonFn(a[dBegin], b[dBegin]) : (a[dBegin] !== b[dBegin])) {
            break;
        }
    }
    
    var dEndMin = dBegin > delta? dBegin : delta;
    for (dEnd = al; dEnd > dEndMin; dEnd--) { //dEnd is index in a
        if (comparisonFn? comparisonFn(a[dEnd], b[dEnd - delta]) : (a[dEnd] !== b[dEnd - delta])) {
            dEnd++;
            break;
        }
    }
    
    var matchStartNum = dBegin;
    var matchEndNum = al - dEnd;
    var cutSize = al - matchEndNum - matchStartNum;
    var insertSize = bl - matchEndNum - matchStartNum;
    
    if (insertSize) insert = b.slice(bl - matchEndNum - insertSize, bl - matchEndNum);
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
        if (!Amm.ObservableArray.symmetricDiff(cut, insert, comparisonFn).length) return ['reorder', dBegin, cutSize];
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