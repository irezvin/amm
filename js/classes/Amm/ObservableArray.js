/* global Amm */

Amm.ObservableArray = function(options) {
    Amm.WithEvents.call(this, options);
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
        this._unique = unique;
        return true;
    },

    getUnique: function() { return this._unique; },

    setComparison: function(comparison) {
        var oldComparison = this._comparison;
        if (oldComparison === comparison) return;
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
