/* global Amm */

/**
 * Range that returns items with values and/or indexes matching certain condition.
 * Examples:
 * $pupils{$pupil: $pupil.age > 7} // pupils with age above 7
 * $items{$i => $item: $i < 20 && $item.selected} // selected items from first 20
 * $rows{$i => : $i % 2 == 0} // only even rows
 */
Amm.Operator.Range.Condition = function(source, condition, keyVar, valueVar) {
    this._map = [];
    Amm.Operator.Range.call(this, source);
    this._value = [];
    this._nonCacheableIteratorContexts = {};
    if (keyVar !== undefined) this.keyVar = keyVar;
    if (valueVar !== undefined) this.valueVar = valueVar;
    var iterator = new Amm.Operator.Range.Iterator(condition, keyVar, valueVar);
    this._setOperand('iterator', iterator);
};

Amm.Operator.Range.Condition.prototype = {

    'Amm.Operator.Range.Condition': '__CLASS__', 

    _iteratorOperator: null,
    
    _iteratorValue: null,
    
    _iteratorExists: null,
    
    _checkArrayChange: true,
    
    keyVar: null,
    
    valueVar: null,
    
    _nonCacheableIteratorContexts: null,
    
    _numNonCacheableIteratorContexts: 0,
    
    /**
     * Maps source items to this._iteratorOperator contexts
     * @type Array [ index: {c: contextId, o: item, i: index, v: iterator value} ]
     */
    _map: null,
    
    OPERANDS: ['source', 'iterator'],
    
    STATE_SHARED: {
        keyVar: true,
        valueVar: true
    },
    
    supportsAssign: false,
    
    _setSource: function(source) {
        this._setOperand('source', source);
    },

    _sourceEvents: function(source, oldSource) {
        
        // todo: properly subscribe to Collection events
    },

    _sortMap: function(start) {
        var res = start? this._map.slice(0, start) : [];
        res.length = this._map.length;
        for (var i = start || 0, l = this._map.length; i < l; i++) {
            if (!this._map[i]) {
                res.length--;
                continue;
            }
            res[this._map[i].i] = this._map[i];
        }
        this._map = res;
    },
    
    _doEvaluate: function(again) {
        var res = [], s = true;
        for (var i = 0, l = this._map.length; i < l; i++) {
            if (s && (!this._map[i] || this._map[i].i !== i)) {
                s = false;
                this._sortMap(i);
                l = this._map.length;
                i--;
            }
            var cxid = this._map[i].c;
            if (again) {
                this._iteratorOperator.setContextId(cxid);
                this._map[i].v = this._iteratorOperator.getValue(again);
            } else {
                var d = this._iteratorOperator._contextId === cxid? 
                    this._iteratorOperator : this._iteratorOperator._contextState[cxid];
                if (d._hasValue) this._map[i].v = d._value;
                else {
                    this._iteratorOperator.setContextId(cxid);
                    this._map[i].v = this._iteratorOperator.getValue();
                }
            }
            if (this._map[i].v) res.push(this._map[i].o);
        }
        return res;
    },
    
    toFunction: function() {
        var s = this._operandFunction('source');
        var c = this._operandFunction('iterator');
        var k = this.keyVar || '';
        var v = this.valueVar || '';
        var fn = function(e) {
            var items = s(e), l = items.length;
            if (!l) return [];
            var vars = c.vars, tmp1 = vars[k], tmp2 = vars[v], res = [];
            for (var i = 0; i < l; i++) {
                vars[k] = i;
                vars[v] = items[i];
                if (c(e)) res.push(items[i]);
            }
            vars[k] = tmp1;
            vars[v] = tmp2;
            return res;
        };
        return fn;
    },
    
    _clearIteratorContexts: function() {
        this._isEvaluating++;
        this._map = [];
        for (var i in this._iteratorOperator._contextState) {
            if (i !== '0' && this._iteratorOperator._contextState.hasOwnProperty(i) && this._iteratorOperator._contextState[i]) {
                this._iteratorOperator.deleteContext(i);
            }
        }
        this._isEvaluating--;
    },
    
    notifyOperandChanged: function(operand, value, oldValue, operator) {
        if (operator === this._iteratorOperator) {
            if (operator.parentContextId !== null && operator.parentContextId !== this._contextId)
                this.setContextId(operator.parentContextId);
            if (this._lockChange) return;
            var idx = operator.index;
            if (this._map[idx] && this._map[idx].c === operator._contextId && this._map[idx].v !== value) { // check map is up-to-date
                this._map[idx].v = value;
                if (!this._isEvaluating) this.evaluate();
            }
            return;
        }
        Amm.Operator.Range.prototype.notifyOperandChanged.call(this, operand, value, oldValue, operator);
    },
    
    // Builds iterator contexts from scratch
    _buildIteratorContexts: function() {
        this._isEvaluating++;
        var items = this._sourceValue, l = items.length, it = this._iteratorOperator;
        this._map.length = items.length;
        for (var i = 0; i < l; i++) {
            var v = {};
            if (this.keyVar !== null) v[this.keyVar] = i;
            if (this.valueVar !== null) v[this.valueVar] = items[i];
            this._iteratorOperator.createContext(null, {index: i, parentContextId: this._contextId, vars: v});
            this._map[i] = {
                c: this._iteratorOperator._contextId,
                i: i,
                o: items[i],
                v: undefined
            };
        }
        this._isEvaluating--;
    },

    /**
     * symDiff: true: always, false - never, 
     * undefined - smart. will be done only when
     * a) cut.length = insert.length
     * b) cut.length < oldItems.length (it means items.length < changeInfo.insert.length)
     */
    _adjustIteratorContexts: function(changeInfo, symDiff) {
        var items = this._sourceValue || [];
        if (symDiff === undefined) 
            symDiff = changeInfo.cut.length === changeInfo.insert.length 
            || items.length < changeInfo.insert.length;
        
        if (!changeInfo.cut.length || !changeInfo.insert.length) symDiff = false;
        
        // shortcut 1: clear items (all deleted)
        if (!items.length) {
            this._clearIteratorContexts();
            return;
        }
        
        // shortcut 2: rebuild everything when all added
        // (either to empty array or no sym diff thus we assume all replaced)
        if ((!changeInfo.cut.length || !symDiff) && changeInfo.insert.length === items.length) { 
            if (this._map.length) this._clearIteratorContexts();
            this._buildIteratorContexts();            
            return;
        }
        this._isEvaluating++;
        
        var offset = changeInfo.index;

        var addedIdx,
            deletedIdx = [], 
            movedIdx; // moved: [[oldIdx => newIdx]]
        
        if (symDiff) {
            var matches = [], deleted; 
            // note that `matches` indexes in this.items are off by `offset`
            deleted = Amm.Array.symmetricDiff(changeInfo.cut, changeInfo.insert, null, matches);
            addedIdx = Amm.Array.findNonMatched(matches, changeInfo.insert.length);
            movedIdx = [];
            for (var i = 0, l = matches.length; i < l; i++) {
                if (matches[i] === null) deletedIdx.push(i);
                else if (matches[i] !== i) 
                    movedIdx.push([i, matches[i]]);
            }
        } else {
            addedIdx = [];
            for (var i = 0; i < changeInfo.cut.length; i++) {
                deletedIdx.push(i);
            }
            for (var i = 0; i < changeInfo.insert.length; i++) {
                addedIdx.push(i);
            }
            movedIdx = [];
        }
        
        // now we need to calculate adjustments to our map and contexts
        
        var m = this._map, mmb;
        
        // need also move items rightside of the splice
        var delta = changeInfo.insert.length - changeInfo.cut.length;
        if (delta) {
            for (var i = offset + changeInfo.cut.length; i < m.length; i++) {
                movedIdx.push([i - offset, i + delta - offset]);
            }
        }
        
        //console.log('sd', symDiff, 'a', addedIdx, 'd', deletedIdx, 'm', movedIdx, 'o', offset, 'dt', delta, 'ci', changeInfo);
        
        var iter = this._iteratorOperator;
                            
        // move what's moved
        for (var i = 0, l = movedIdx.length; i < l; i++) {
            mmb = m[movedIdx[i][0] + offset];
            mmb.i = movedIdx[i][1] + offset;
            if (mmb.c === iter._contextId) {
                iter.index = mmb.i;
            } else {
                iter._contextState[mmb.c].index = mmb.i;
            }
            if (this.keyVar) {
                iter.setContextId(mmb.c);
                iter.setVars(mmb.i, this.keyVar);
            }
        }
        var numReuse = deletedIdx.length < addedIdx.length? deletedIdx.length : addedIdx.length;
        //console.log('nr', numReuse);
        
        // delete + create: replace item and index
        for (var i = 0; i < numReuse; i++) {
            mmb = m[deletedIdx[i] + offset];
            mmb.i = addedIdx[i] + offset;
            mmb.o = changeInfo.insert[addedIdx[i]];
            iter.setContextId(mmb.c);
            iter.index = mmb.i;
            var v = {};
            if (this.keyVar) v[this.keyVar] = mmb.i;
            if (this.valueVar) v[this.valueVar] = mmb.o;
            iter.setVars(v);
        }
        
        // delete (leftovers)
        for (var i = addedIdx.length; i < deletedIdx.length; i++) {
            iter.deleteContext(m[deletedIdx[i] + offset].c);
            m[deletedIdx[i] + offset] = null; // should work
        }
        
        // create (we need new items)
        for (var i = deletedIdx.length; i < addedIdx.length; i++) {
            var v = {};
            if (this.keyVar !== null) v[this.keyVar] = addedIdx[i] + offset;
            if (this.valueVar !== null) v[this.valueVar] = changeInfo.insert[addedIdx[i]];
            iter.createContext(null, {index: addedIdx[i] + offset, parentContextId: this._contextId, vars: v});
            m.push({
                c: iter._contextId,
                i: addedIdx[i] + offset,
                o: changeInfo.insert[addedIdx[i]],
                v: undefined
            });
        }
        
        this._map = m;
        this._sortMap();
        
        this._isEvaluating--;
    },
    
    _sourceChange: function(value, oldValue) {
        // todo: rebuild contexts in iterator and re-evaluate
        var items = value && value.length? value : null;
        var oldItems = oldValue && oldValue.length? oldValue : null;
        var index, cut, insert;
        if (!oldItems) {
            if (!items) return; // nothing to do - both items and oldItems are empty
            cut = []; insert = items; index = 0; 
        }
        else if (!items) { cut = oldItems? oldItems.slice(0, oldItems.length) : []; insert = []; index = 0; }
        else { // we have both items and oldItems
            var diff = Amm.Array.smartDiff(oldItems, items, null, true);
            if (!diff) return; // arrays are equal
            if (diff[0] !== 'splice') throw "Assertion - should receive only 'splice' event (spliceOnly === true)";
            cut = diff[2]? oldValue.slice(diff[1], diff[1] + diff[2]) : [];
            insert = diff[3];
            index = diff[1];
        }
        var changeInfo = this._makeChangeInfoForSplice (index, cut, insert);
        this._adjustIteratorContexts(changeInfo);
    },
    
    notifyOperandContentChanged: function(operand, changeInfo, internal) {
        if (operand === 'source') {
            this._adjustIteratorContexts(changeInfo, true);
        }
        return Amm.Operator.prototype.notifyOperandContentChanged.call
            (this, operand, changeInfo, internal);
    },

    _constructContextState: function() {
        var res = Amm.Operator.Range.prototype._constructContextState.call(this);
        res._map = [];
        res._value = [];
        res._nonCacheableIteratorContexts = {};
        return res;
    },
    
    _propagateContext: function(operand, operator, down) {    
        // TODO: sometimes we still need to propagate contexts
        if (operator === this._iteratorOperator) {
            if (this._contextId !== operator.parentContextId) {
                if (!down) this.setContextId(operator.parentContextId);
                return;
            }
            return;
        }
        return Amm.Operator.Range.prototype._propagateContext.call(this, operand, operator, down);
    },
    
    notifyOperandNonCacheabilityChanged: function(operand, nonCacheability, operator) {
        if (operator === this._iteratorOperator) {
            if (operator.parentContextId !== this._contextId) return; // ignore irrelevant context
            var contextId = operator._contextId;
            if (nonCacheability) {
                this._nonCacheableIteratorContexts[contextId] = true;
                this._numNonCacheableIteratorContexts++;
            } else {
                delete this._nonCacheableIteratorContexts[contextId];
                this._numNonCacheableIteratorContexts--;
            }
        }
        return Amm.Operator.prototype.notifyOperandNonCacheabilityChanged.call(this, operand, nonCacheability, operator);
    },
    
    _checkNonCacheableIterator: function() {
        for (var i in this._nonCacheableIteratorContexts) {
            if (this._nonCacheableIteratorContexts.hasOwnProperty(i)) {
                this._iteratorOperator.setContextId(i);
                this._iteratorOperator.checkForChanges();
            }
        }
    },
    
    _checkNonCacheableOperators: function() {
        if (this._hasNonCacheable <= !!this._nonCacheable) return; // we don't have NC operators
        for (var i = 0, l = this.OPERANDS.length; i < l; i++) {
            var op = '_' + this.OPERANDS[i] + 'Operator';
            if (this[op] === this._iteratorOperator) {
                if (this._numNonCacheableIteratorContexts)
                    this._checkNonCacheableIterator();
                continue;
            }
            if (!this[op]) continue;
            if (this[op]._contextId !== this._contextId) {
                this._propagateContext(op, this[op], true);
            }
            if (this[op]._hasNonCacheable) {
                this[op].checkForChanges();
            }
        }
    }
    
};

Amm.extend(Amm.Operator.Range.Condition, Amm.Operator.Range);
