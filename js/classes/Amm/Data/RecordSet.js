/* global Amm */

Amm.Data.RecordSet = function(options) {
    options = Amm.override({}, options);
    var initialFetch = true;
    if ('initialFetch' in options) {
        initialFetch = !!options.initialFetch;
        delete options.initialFetch;
    }
    Amm.Element.call(this, options);
    if (initialFetch) {
        this._fetch();
    }
};

/**
 * Try to keep offset when filter changes, otherwise resort to pastOffsetAction
 * (value for Amm.Data.RecordSet.filterOffsetAction: what to do with absolute index when filter changes:)
 */
Amm.Data.RecordSet.FILTER_KEEP_POS = 'same';

/**
 * Display page with current record when filter changes, otherwise apply pastOffsetAction
 * (value for Amm.Data.RecordSet.filterOffsetAction: what to do with absolute index when filter changes:)
 */
Amm.Data.RecordSet.FILTER_KEEP_KEY = 'keepKey';

/**
 * Always go to first record when filter changes
 * (value for filterOffsetAction property: what to do with absolute index when filter changes)
 */
Amm.Data.RecordSet.FILTER_GOTO_FIRST = 'first';

/**
 * Show empty list if offset past last
 * (value for pastOffsetAction property: what to do when offset is greater than number of records)
 */
Amm.Data.RecordSet.PAST_OFFSET_IGNORE = 'ignore';

/**
 * Show last page if offset past last
 * (value for pastOffsetAction property: what to do when offset is greater than number of records)
 */
Amm.Data.RecordSet.PAST_OFFSET_GOTO_LAST = 'last';

/**
 * Goto first page if offset past lasts
 * (value for pastOffsetAction property: what to do when offset is greater than number of records)
 */
Amm.Data.RecordSet.PAST_OFFSET_GOTO_FIRST = 'first';

/**
 * Any navigation is allowed
 * (value for lockNavigation and appliedNavigationLock)
 */
Amm.Data.RecordSet.ALLOW_NAVIGATION = 0;

/**
 * Current record can be changed within the page, but changing filters, sort or offset not allowed
 * (value for lockNavigation and appliedNavigationLock)
 */
Amm.Data.RecordSet.LOCK_FETCH = 1;

/**
 * No actions that change current record can be applied (including creation of new record)
 * (value for lockNavigation and appliedNavigationLock)
 */
Amm.Data.RecordSet.LOCK_NAVIGATION = 3;

Amm.Data.RecordSet.prototype = {

    'Amm.Data.RecordSet': '__CLASS__', 
    
    /**
     * Create blank record when navigating past last
     */
    _autoAdd: true,
    
    /**
     * if limit is changed, ajdust offset to closest multiplier of limit
     */
    alignOffsetToLimit: true,

    /**
     * set to FALSE if mapper doesn't support get-offset transaction
     * (workaround using selection of all keys will be applied)
     */
    useOffsetTransactions: true,
    
    // what to do when filter changes
    
    /**
     * what to do with current record' absolute index when filter changes
     */
    filterOffsetAction: Amm.Data.RecordSet.FILTER_KEEP_KEY,
    
    /**
     * what to do with offset if it is beyound total ## of records
     */
    pastOffsetAction: Amm.Data.RecordSet.PAST_OFFSET_GOTO_LAST,
    
    /**
     * Call to any fetch-issuing command until recordset has uncommitted records will fail
     */
    _dontFetchUntilCommitted: false,

    /**
     * Fetch-issuing action will automatically commit uncommited records
     */
    _commitOnFetch: false,

    /**
     * Call to any navigation-issuing command until recordset has uncommitted records will fail
     */
    _dontNavigateUntilCommitted: false,
    
    /**
     * Navigation from uncommitted record will automatically commit it
     */
    _commitOnNavigate: false,
    
    /**
     * delete() calls record.mm.delete() immediately instead of using intentDelete()
     */
    deleteImmediately: false,

    _mapper: null,

    _recordsCollection: null,

    /**
     * filter values that are specified by application and are always applied
     */
    _baseFilter: null,

    /**
     * filter values that are supposedly changed by interaction with the user
     */
    _filter: null,

    _sort: null,

    _offset: 0,

    _limit: null,
    
    // "listOptions" (combination of sort/filter/offset/limit) that was used during last fetch
    _lastListOptions: null,

    _totalRecords: 0,

    _readOnly: false,

    _lockNavigation: Amm.Data.RecordSet.LOCK_NONE,

    _transaction: null,        
    
    _lastTransaction: null,
    
    _updateLevel: 0,

    _currentRecord: null,

    _absoluteIndexUpdateLevel: 0,
    
    _currentIndex: null,
    
    _nextCurrentIndex: 0,
    
    _nextOffset: null, 
    
    _nextKey: null,
    
    _oldAbsoluteIndex: undefined,
    
    _multiTransactionOptions: null,

    _defaults: null,
    
    _fetchError: false,
    
    _skipNavFetchCheck: 0,
    
    setMapper: function(mapper) {
        Amm.is(mapper, 'Amm.Data.Mapper');
        var oldMapper = this._mapper;
        if (oldMapper === mapper) return;
        this._checkNavFetchPossible(true, 'setMapper');
        if (oldMapper && this._recordsCollection) {
            this.revert();
            // setItems([]) won't work with smartUpdate
            this._recordsCollection.splice(0, this._recordsCollection.length);
            this._recordsCollection.setKeyProperty(mapper.getKey());
            this._recordsCollection.setInstantiator(mapper);
        }
        this._mapper = mapper;
        if (this._recordsCollection && !this._initLevel) {
            this._fetch();
        }
        this.outMapperChange(mapper, oldMapper);
        return true;
    },

    getMapper: function() { return this._mapper; },

    outMapperChange: function(mapper, oldMapper) {
        this._out('mapperChange', mapper, oldMapper);
    },
    
    setDefaults: function(defaults) {
        if (!defaults) defaults = null;
        else if (typeof defaults !== 'object') {
            throw Error("`defaults` must be an object");
        }
        var oldDefaults = this._defaults;
        if (oldDefaults === defaults) return;
        this._defaults = defaults;
        this.outDefaultsChange(defaults, oldDefaults);
        return true;
    },

    getDefaults: function() { return this._defaults; },

    outDefaultsChange: function(defaults, oldDefaults) {
        this._out('defaultsChange', defaults, oldDefaults);
    },

    setMultiTransactionOptions: function(multiTransactionOptions) {
        if (!multiTransactionOptions) multiTransactionOptions = null;
        else if (typeof multiTransactionOptions !== 'object') {
            throw Error("`multiTransactionOptions` must be an object");
        }
        var oldMultiTransactionOptions = this._multiTransactionOptions;
        if (oldMultiTransactionOptions === multiTransactionOptions) return;
        this._multiTransactionOptions = multiTransactionOptions;
        if (this._recordsCollection) {
            this._recordsCollection.setMultiTransactionOptions(this._multiTransactionOptions);
        }
        return true;
    },

    getMultiTransactionOptions: function() { return this._multiTransactionOptions; },        

    beginUpdate: function() {
        if (!this._updateLevel) {
            this._checkNavFetchPossible(true, 'beginUpdate');
            this._lastListOptions = this._calcListOptions();
        }
        this._updateLevel++;
    },
    
    endUpdate: function() {
        if (!this._updateLevel) throw Error("call to endUpdate() w/o beginUpdate()");
        this._updateLevel--;
        if (this._updateLevel) return;
        var currListOptions = this._calcListOptions();
        var lastListOptions = this._lastListOptions;
        this._lastListOptions = null;
        var whatChanged = this._compareOptions(currListOptions, lastListOptions);
        if (!whatChanged) {
            if (this._nextKey) this.gotoKey(this._nextKey);
            return;
        }
        this._fetch(currListOptions, whatChanged);
    },
    
    forward: function(page) {
        return this._forwardOrBack(page);
    },
    
    back: function(page) {
        return this._forwardOrBack(page, true);
    },
    
    _forwardOrBack: function(page, back) {
        var delta = 1;
        if (page) {
            if (this._limit) {
                delta = this._limit;
                // adjust for the case when we have additional uncommitted records
                if (this.getRecordsCollection().getLength() > this._limit) {
                    delta = this.getRecordsCollection().getLength();
                }                
            }
            if (!delta) delta = this.getRecordsCollection().getLength();
        }
        if (!delta) return;
        if (back) delta = -delta;
        this.setCurrentIndex(this.getCurrentIndex() + delta);
    },
    
    indexOfKey: function(key) {
        for (var i = 0, l = this._recordsCollection.length; i < l; i++) {
            if (this._recordsCollection[i].mm.getKey() == key) return i;
        }
        return -1;
    },
    
    gotoKey: function(key) {
        if (this._updateLevel) {
            this._nextKey = key;
            return;
        } else {
            this._nextKey = null;
        }
        // locate key in current set of records
        if (this._recordsCollection) {
            if (this._recordsCollection.getKeyProperty()) {
                var idx = this.indexOfKey(key);
                if (idx >= 0) {
                    this._checkNavFetchPossible(false, 'gotoKey');
                    return this.setCurrentIndex(idx);
                }
            }
        }
        this._checkNavFetchPossible(true, 'gotoKey');
        if (!this.useOffsetTransactions) {
            // TODO (probably should fetch all keys in one run, and then find the offset)
            throw Error("gotoKey() without offset transactions isn't implemented");
        }
        var tr = this._createOffsetTransaction(key);
        this._setTransaction(tr);
        tr.run();
    },
    
        
    outBeforeDeleteCurrent: function(record, retHandled) {
        if (typeof retHandled !== 'object' || !retHandled) retHandled = {handled: false};
        return this._out('beforeDeleteCurrent', record, retHandled);
    },

    
    deleteCurrent: function() {
        if (this.getReadOnly()) {
            throw Error("Cannot deleteCurrent() in read-only recordset");
        }
        var record = this.getCurrentRecord();
        if (!record) return;
    
        var retHandled = {handled: false};
        this.outBeforeDeleteCurrent(record, retHandled);
        if (retHandled.handled) return retHandled.handled;
        
        if (record.mm.getState() === Amm.Data.STATE_NEW) {
            this._recordsCollection.reject(record);
            record.cleanup();
            return true;
        }
        if (record.mm.getState() !== Amm.Data.STATE_EXISTS) return;
        if (this.deleteImmediately) {
            return record.mm.delete();
        }
        return record.mm.intentDelete();
    },
    
    outBeforeAdd: function(options, retHandled) {
        if (typeof retHandled !== 'object' || !retHandled) retHandled = {handled: false};
        return this._out('beforeAdd', options, retHandled);
    },
    
    outAfterAdd: function(record) {
        return this._out('afterAdd', record);
    },
    
    add: function(options) {
        this._checkNavFetchPossible(false, 'add');
        if (this.getReadOnly()) {
            throw Error("Cannot add() in read-only recordset");
        }
        var defs = this._defaults? Amm.override({}, this._defaults) : {};
        if (options) {
            if (typeof options !== 'object') throw Error("`data` must be an object");
            Amm.override(defs, options);
        }
        var retHandled = {handled: false};
        this.outBeforeAdd(options, retHandled);
        if (retHandled.handled) return false;
        var record = this._mapper.construct(defs);
        this._recordsCollection.accept(record);
        this.setCurrentRecord(record);
        this.outAfterAdd(record);
        return record;
    },
    
    outBeforeSave: function(retHandledRecords) {
        if (typeof retHandledRecords !== 'object' || !retHandledRecords) {
            retHandledRecords = {handled: false, records: []};
        }
        return this._out('beforeSave', retHandledRecords);
    },
    
    save: function(noCheck, dontRun) {
        if (this.getReadOnly()) {
            throw Error("Cannot save() in read-only recordset");
        }
        var retHandledRecords = {handled: false, records: []};
        this.outBeforeSave(retHandledRecords);
        if (retHandledRecords.handled) return retHandledRecords.records;
        return this._recordsCollection.save(noCheck, dontRun);
    },
    
    revert: function() {
        return this._recordsCollection.revert(true);
    },    
    
    refresh: function() {
        this._checkNavFetchPossible(true, 'refresh');
        if (!this._updateLevel) {
            this._fetch();
        } else {
            this._lastListOptions = null;
        }
    },
    
    combineFilters: function(baseFilter, filter) {
        if (!baseFilter, !filter) return null;
        if (!baseFilter) return filter;
        if (!filter) return baseFilter;
        var retCombinedHandled = {combined: null, handled: false};
        this.outCombineFilters(baseFilter, filter, retCombinedHandled);
        if (retCombinedHandled.handled) {
            return retCombinedHandled.combined;
        }
        var res = {};
        if (filter) Amm.overrideRecursive(res, filter, false, true, true);
        if (baseFilter) Amm.overrideRecursive(res, baseFilter, false, true, true);
        return res;
        
    },
    
    outCombineFilters: function(baseFilter, filter, retCombinedHandled) {
        if (!(retCombinedHandled && typeof retCombinedHandled === 'object'))
            retCombinedHandled = {combined: null, handled: false};
        return this._out('combineFilters', baseFilter, filter, retCombinedHandled);
    },
    
    _calcFilter: function() {
        if (!this._baseFilter && !this._filter) return null;
        var res = this.combineFilters(this._baseFilter, this._filter);
        return res;
    },
    
    _calcListOptions: function() {
        return {
            filter: this._calcFilter(),
            sort: this._sort,
            offset: this._offset,
            limit: this._limit
        };
    },

    setCurrentRecord: function(currentRecord) {
        if (!currentRecord) currentRecord = null;
        else Amm.is(currentRecord, 'Amm.Model.Record');
        var oldCurrentRecord = this._currentRecord;
        if (oldCurrentRecord === currentRecord) return;
        var oldCurrentIndex = this._currentIndex;
        var newCurrentIndex;
        if (currentRecord) {
            newCurrentIndex = this._recordsCollection.indexOf(currentRecord);
            if (newCurrentIndex < 0) {
                throw Error("Cannot setCurrentRecord() because provided record isn't present in the recordset");
            }
        } else {
            newCurrentIndex = null;
        }
        if (newCurrentIndex !== this._currentIndex) {
            // if we didn't change index yet, we have to use setCurrentIndex
            // to trigger all navigational chain
            return this.setCurrentIndex(newCurrentIndex);
        }
        this._currentRecord = currentRecord;
        this.outCurrentRecordChange(currentRecord, oldCurrentRecord);
        return true;
    },

    getCurrentRecord: function() { return this._currentRecord; },
    
    outCurrentRecordChange: function(currentRecord, oldCurrentRecord) {
        this._out('currentRecordChange', currentRecord, oldCurrentRecord);
    },

    setCurrentIndex: function(currentIndex) {
        currentIndex = parseInt(currentIndex);
        if (isNaN(currentIndex)) {
            throw Error("`currentIndex` must be a number");
        }
        var oldCurrentIndex = this._currentIndex;
        if (oldCurrentIndex === currentIndex) return;
        
        var coll = this.getRecordsCollection();
        if (!coll.length) {
            return this.setCurrentRecord(0);
        }
        if (currentIndex >= 0 && currentIndex < coll.length) {
            this._checkNavFetchPossible(false, 'setCurrentIndex');
            var coll = this.getRecordsCollection(), nc, tr;
            if (this._commitOnNavigate && (nc = coll.getNumUncommitted())) {
                var save = coll.save();
                if (this._dontNavigateUntilCommitted) {
                    if (save.length !== nc) {
                        throw new Error("cannot navigate: dontNavigateUntilCommitted is true, but not all records can be saved");
                    }
                    var required = [];
                    for (var i = 0, l = save.length; i < l; i++) {
                        var saveTr = save[i].mm.getTransaction();
                        if (saveTr) required.push(saveTr);
                    }
                    if (required.length) {
                        var t = this;
                        // create dummy transaction that actually 
                        // sets current index when required ones are complete;
                        // as a bonus, it will block fetch or navigation attempts
                        tr = new Amm.Data.Transaction({
                            requiredTransactions: required,
                            on__running: function(handled) {
                                handled.handled = true;
                                tr.setState(Amm.Data.Transaction.STATE_SUCCESS);
                                t.setCurrentIndex(currentIndex);
                            },
                        });
                        this._setTransaction(tr);
                        tr.run();
                        return;
                    }
                }
            }
            var oldCurrentRecord = this._currentRecord;
            var oldCurrentIndex = this._currentIndex;
            this._currentIndex = currentIndex;
            this._currentRecord = coll[currentIndex];
            var res;
            if (this._currentIndex !== oldCurrentIndex) {
                res = true;
                this.outCurrentIndexChange(this._currentIndex, oldCurrentIndex);
            }
            if (this._currentRecord !== oldCurrentRecord) {
                res = true;
                this.outCurrentRecordChange(this._currentRecord, oldCurrentRecord);
            }
            return res;
        }
        
        var delta = currentIndex - this._currentIndex;
        
        if (this._limit && coll.length > this._limit) {
            // since our collection contains more items due to uncommitted items, 
            // we adjust step size during the pagination
            
            if (delta < 0) delta += (coll.length - this._limit);
            else delta -= (coll.length - this._limit);
        }
        
        // navigation to out-of-view records is done with absoluteIndex
        
        var newAbsoluteIndex = this.getAbsoluteIndex() + delta;
        if  (newAbsoluteIndex < 0) newAbsoluteIndex = 0;
        return this.setAbsoluteIndex(newAbsoluteIndex);
    },

    getCurrentIndex: function() { return this._currentIndex; },

    outCurrentIndexChange: function(currentIndex, oldCurrentIndex) {
        this._out('currentIndexChange', currentIndex, oldCurrentIndex);
    },
    
    setAbsoluteIndex: function(absoluteIndex) {
        absoluteIndex = parseInt(absoluteIndex);
        if (isNaN(absoluteIndex) || absoluteIndex < 0) {
            throw Error("`absoluteIndex` must be a number not less than 0");
        }
        var oldIndex = this.getAbsoluteIndex();
        if (absoluteIndex === oldIndex) return;
        var maxIndex = this.getTotalRecordsIncludingNew() - 1;
        if (absoluteIndex > maxIndex) {
            if (this._autoAdd && this.getCanAdd()) {
                this.add();
            } else {
                return this.setAbsoluteIndex(maxIndex);
            }
        }
        var newOffset, newIndex;
        newOffset = Math.floor(absoluteIndex / this._limit) * this._limit;
        newIndex = absoluteIndex - newOffset;
        
        // we're on the same page AND we have enough records
        if (this._offset === newOffset && newIndex < this.getRecordsCollection().length) { 
            return this.setCurrentIndex(newIndex);
        }
        this._nextCurrentIndex = newIndex;
        this._checkNavFetchPossible(true, 'setAbsoluteIndex');
        
        if (this._offset !== newOffset) {
            this.setOffset(newOffset);
        } else {
            this.refresh();
        }
        return true;
    },
    
    _createListTransaction: function(listOptions) {
        if (!this._mapper) {
            throw Error("Cannot issue transactions without mapper");
        }
        var proto = listOptions || this._calcListOptions();
        proto.class = 'Amm.Data.Transaction.List';
        var res = this._mapper.createTransaction(
            Amm.Data.Transaction.TYPE_LIST,
            proto
        );
        return res;
    },
    
    _createOffsetTransaction: function(key, listOptions) {
        if (!this._mapper) {
            throw Error("Cannot issue transactions without mapper");
        }
        var proto = listOptions || this._calcListOptions();
        delete proto.offset;
        delete proto.limit;
        proto.class = 'Amm.Data.Transaction.Offset';
        proto.key = key;
        var res = this._mapper.createTransaction(
            Amm.Data.Transaction.TYPE_OFFSET,
            proto
        );
        return res;
    },    
    
    outBeforeFetch: function(listOptions, retWhatChanged) {
        if (!retWhatChanged || (typeof retWhatChanged) !== 'object') {
            retWhatChanged = {whatChanged: {}};
        }
        this._out('beforeFetch', listOptions, retWhatChanged);
    },
    
    _fetch: function(listOptions, whatChanged) {
        if (this._initLevel) return; // we don't fetch until init
        if (!listOptions) listOptions = this._calcListOptions();
        var retWhatChanged = {whatChanged: whatChanged || {}};
        this.outBeforeFetch(listOptions, retWhatChanged);
        if ((whatChanged && whatChanged.filter) || retWhatChanged.whatChanged.filter) {
            if (this.filterOffsetAction === Amm.Data.RecordSet.FILTER_KEEP_KEY && this.getCurrentRecord()) {
                if (this._nextKey === null) this._nextKey = this.getCurrentRecord().mm.getKey();
                if (this._nextKey === undefined) this._nextKey = null;
            } else if (this.filterOffsetAction === Amm.Data.RecordSet.FILTER_GOTO_FIRST) {
                return this.setAbsoluteIndex(0);
            }
        }
        var coll = this.getRecordsCollection(), tr, nc;
        var required = [];
        if (
            (this._commitOnFetch || this._commitOnNavigate) 
            && (nc = coll.getNumUncommitted())
        ) {
            var save = coll.save();
            if (this._dontFetchUntilCommitted) {
                if (save.length !== nc) {
                    this.setFetchError({
                        msg: 'some records cannot be saved'
                    });
                    return;
                }
                // now set save transaction(s) as 'required' for fetch
                for (var i = 0, l = save.length; i < l; i++) {
                    var recordTr = save[i].mm.getTransaction();
                    if (recordTr) required.push(recordTr);
                }
            }
        }
        if (this._nextKey !== null) {
            tr = this._createOffsetTransaction(this._nextKey, listOptions);
            this._nextKey = null;
        } else {
            tr = this._createListTransaction();
        }
        if (required.length) {
            tr.setRequiredTransactions(required);
        }
        this._setTransaction(tr);
        tr.run();
    },
    
    _cloneOptions: function(what) {
        return Amm.overrideRecursive({}, what, false, false, true);
    },
    
    _compareOptions: function(a, b, whatChanged) {
        whatChanged = whatChanged || {};
        var diff = false, i;
        for (i in a) if (!(i in b)) {
            diff = true;
            whatChanged[i] = true;
        }
        for (i in b) if (!(i in a) || Amm.Util.compareRecursive(a, b)) {
            diff = true;
            whatChanged[i] = true;
        }
        if (diff) return whatChanged;
        return 0;
    },
    
    _setCompositeParam: function(prop, event, value, key, whatChanged) {
        if (typeof whatChanged === 'string') {
            var k = whatChanged;
            whatChanged = {};
            whatChanged[k] = true;
        }
        if (!value) value = null;
        var copy;
        if (key) {
            copy = this._cloneOptions(this[prop]);
            var changed = {};
            Amm.Util.setByPath(copy, Amm.Util.pathToArray(key), value, changed);
            if (!changed.changed) return;
            value = copy;
        } else {
            if (!Amm.Util.compareRecursive(value, this[prop])) return;
        }
        var oldValue = this[prop];
        this[prop] = value;
        this[event](value, oldValue);
        if (!this._updateLevel) this._fetch(undefined, whatChanged);
        return true;
    },

    setTransaction: function(transaction) {
        console.warn('Amm.Data.RecordSet.prototype.setTransaction() has no effect');
    },

    _setTransaction: function(transaction) {
        if (transaction) {
            Amm.is(transaction, 'Amm.Data.Transaction', 'transaction');
        }
        else transaction = null;
        var lastTransaction = this._transaction;
        if (lastTransaction === transaction) return;
        if (transaction !== null) this.setFetchError(null);
        this._transaction = transaction;
        if (lastTransaction) {
            this.setLastTransaction(lastTransaction);
            lastTrState = lastTransaction.getState();
            if (
                lastTrState === Amm.Data.Transaction.STATE_RUNNING
                || lastTrState === Amm.Data.Transaction.STATE_INIT
                || lastTrState === Amm.Data.Transaction.STATE_WAITING
            ) {
                lastTransaction.cancel();
            }
        }
        Amm.subUnsub(transaction, lastTransaction, this, {
            'stateChange': this._handleTransactionStateChange
        });
        this.outTransactionChange(transaction, lastTransaction);
        return true;
    },

    getTransaction: function() { return this._transaction; },
    
    outTransactionChange: function(transaction, lastTransaction) {
        this._out('transactionChange', transaction, lastTransaction);
    },
    
    _handleTransactionStateChange: function(state, oldState) {
        try {
            if (state === Amm.Data.Transaction.STATE_CANCELLED) {
                this._setTransaction(null);
                return;
            }
            if (state === Amm.Data.Transaction.STATE_FAILURE) {
                this._setTransaction(null);
                this.setFetchError({
                    msg: 'fetch transaction failure',
                    transaction: Amm.event.origin
                });
                return;
            }
            if (state === Amm.Data.Transaction.STATE_SUCCESS) {
                try {
                    var tr = this._transaction;
                    if (tr.getType() === Amm.Data.Transaction.TYPE_LIST) {
                        this._processListResult(this._transaction);
                    } else if (tr.getType() === Amm.Data.Transaction.TYPE_OFFSET) {
                        this._processOffsetResult(this._transaction);
                    }
                    if (this._transaction === tr) { // another wasn't ran
                        this._setTransaction(null);
                    }
                    return;
                } catch(e) {
                    console.error(e);
                }
            }
        } finally {
            if (this._absoluteIndexUpdateLevel) {
                this._endAbsoluteIndexUpdate();
            }
        }
    },
    
    outAfterFetch: function(data) {
        this._out('afterFetch', data);
    },
    
    _processListResult: function(transaction) {
        var res = transaction.getResult();
        var data = res.getData();
        var idx = this._currentIndex, 
            currentRec = this._currentRecord;
        var currentKey;
        
        if (currentRec) currentKey = currentRec.mm.getKey();
        
        var coll = this.getRecordsCollection();
        
        this.outAfterFetch(data);
        
        if (!data.records || !data.records.length && data.lastFoundRows && this._offset > data.lastFoundRows) {
            // handle past-the-offset situation
            if ( 
                this.pastOffsetAction === Amm.Data.RecordSet.PAST_OFFSET_GOTO_FIRST 
                || this.pastOffsetAction === Amm.Data.RecordSet.PAST_OFFSET_GOTO_LAST
            ) {
                var newAbsoluteIndex = 0;
                if (this.pastOffsetAction === Amm.Data.RecordSet.PAST_OFFSET_GOTO_LAST) {
                    newAbsoluteIndex = data.lastFoundRows - this._limit;
                    if (newAbsoluteIndex >= data.lastFoundRows || newAbsoluteIndex < 0) {
                        newAbsoluteIndex = 0;
                    }
                }
                return this.setAbsoluteIndex(newAbsoluteIndex);
            }
        }
        
        coll.setItems(data.records || []);
        
        var newIdx = -1;
        
        if (this._nextCurrentIndex !== null) {
            newIdx = this._nextCurrentIndex;
            this._nextCurrentIndex = null;
            if (newIdx < 0) {
                newIdx = coll.length + newIdx;
            }
        } else {
            if (currentKey) {
                newIdx = this.indexOfKey(currentKey);
            }
            if (newIdx < 0) {
                newIdx = this._currentIndex || 0;
            }
        }
        if (newIdx > coll.length) {
            newIdx = coll.length - 1;
        }
        if (newIdx < 0) newIdx = 0;
        this._skipNavFetchCheck++;
        try {
            this.setCurrentRecord(coll[newIdx] || null);
        } finally {
            this._skipNavFetchCheck--;
        }
        this.setTotalRecords(data.lastFoundRows || 0);
    },    
    
    _processOffsetResult: function(transaction) {
        var res = transaction.getResult();
        var data = res.getData();
        if (!data) {
            return;
        }
        if (data && ('lastFoundRows' in data)) {
            this.setTotalRecords(data.lastFoundRows || 0);
        }
        if (data.offset >= 0) {
            this.setAbsoluteIndex(data.offset);
        }
        // TODO: handle record-not-found situation
    },
        
    setLastTransaction: function(lastTransaction) {
        var oldLastTransaction = this._lastTransaction;
        if (oldLastTransaction === lastTransaction) return;
        this._lastTransaction = lastTransaction;
        this.outLastTransactionChange(lastTransaction, oldLastTransaction);
        return true;
    },

    getLastTransaction: function() { return this._lastTransaction; },

    outLastTransactionChange: function(lastTransaction, oldLastTransaction) {
        this._out('lastTransactionChange', lastTransaction, oldLastTransaction);
    },    
    
    setFilter: function(filter, key) {
        this._checkNavFetchPossible(true, 'setFilter');
        return this._setCompositeParam('_filter', 'outFilterChange', filter, key, 'filter');
    },

    getFilter: function() { return this._filter; },

    outFilterChange: function(filter, oldFilter) {
        this._out('filterChange', filter, oldFilter);
    },
    
    setBaseFilter: function(baseFilter, key) {
        this._checkNavFetchPossible(true, 'setBaseFilter');
        return this._setCompositeParam('_baseFilter', 'outBaseFilterChange', baseFilter, key, 'filter');
    },

    getBaseFilter: function() { return this._baseFilter; },

    outBaseFilterChange: function(baseFilter, oldBaseFilter) {
        this._out('baseFilterChange', baseFilter, oldBaseFilter);
    },

    setSort: function(sort, key) {
        this._checkNavFetchPossible(true, 'setSort');
        return this._setCompositeParam('_sort', 'outSortChange', sort, key, 'sort');
    },

    getSort: function() { return this._sort; },

    outSortChange: function(sort, oldSort) {
        this._out('sortChange', sort, oldSort);
    },
    
    _beginAbsoluteIndexUpdate: function() {
        if (!this._absoluteIndexUpdateLevel) {
            this._oldAbsoluteIndex = this.getAbsoluteIndex();
        }
        this._absoluteIndexUpdateLevel++;
    },
    
    _endAbsoluteIndexUpdate: function() {
        if (!this._absoluteIndexUpdateLevel) {
            throw Error("call to _endAbsoluteIndexUpdate() w/o _beginAbsoluteIndexUpdate()");
        }
        this._absoluteIndexUpdateLevel--;
        if (!this._absoluteIndexUpdateLevel) {
            this.outAbsoluteIndexChange(this.getAbsoluteIndex(), this._oldAbsoluteIndex);
        }
    },
    
    outAbsoluteIndexChange: function(absoluteIndex, oldAbsoluteIndex) {
        if (this._absoluteIndexUpdateLevel) return;
        return this._out('absoluteIndexChange', absoluteIndex, oldAbsoluteIndex);
    },

    setOffset: function(offset) {
        this._checkNavFetchPossible(true, 'setOffset');
        if (offset === null) offset = 0;
        offset = parseInt(offset);
        if (isNaN(offset) || offset < 0) {
            throw Error("`offset` must be a number not less than 0");
        }
        var oldOffset = this._offset;
        if (oldOffset === offset) return;
        if (offset >= this._totalRecords) {
            offset = this._totalRecords - this._limit;
        }
        if (offset < 0) {
            offset = 0;
        }
        if (this.alignOffsetToLimit && offset && this._limit) {
            offset = Math.floor(offset / this._limit)*this._limit;
        }
        this._offset = offset;
        if (!this._updateLevel) this._fetch(null, 'offset');
        if (offset != oldOffset) this._beginAbsoluteIndexUpdate();
        this.outOffsetChange(offset, oldOffset);
        return true;
    },

    getOffset: function() { return this._offset; },

    outOffsetChange: function(offset, oldOffset) {
        this._out('offsetChange', offset, oldOffset);
    },

    setLimit: function(limit) {
        this._checkNavFetchPossible(true, 'setLimit');
        if (limit === undefined || limit === false) limit = null;
        if (limit !== null) {
            limit = parseInt(limit);
            if (isNaN(limit) || limit < 0) {
                throw Error("`limit` must be a null or a number not less than 0");
            }
        }
        var oldLimit = this._limit, oldOffset = this._offset;
        if (oldLimit === limit) return;
        if (this.alignOffsetToLimit && limit && this._offset) {
            this._offset = Math.floor(this._offset / this.limit)*this._limit;
        }
        this._limit = limit;
        if (this.alignOffsetToLimit && this._offset && limit) {
            this._offset = Math.floor(this._offset / limit)*this._limit;
        }
        if (!this._updateLevel) this._fetch(null, 'limit');
        this.outLimitChange(limit, oldLimit);
        if (oldOffset !== this._offset) this.outOffsetChange(this._offset, oldOffset);
        return true;
    },

    getLimit: function() { return this._limit; },

    outLimitChange: function(limit, oldLimit) {
        this._out('limitChange', limit, oldLimit);
    },

    setTotalRecords: function(totalRecords) {
        totalRecords = parseInt(totalRecords);
        if (isNaN(totalRecords) || totalRecords < 0) {
            throw Error("`totalRecords` must be a number not less than 0");
        }
        var oldTotalRecords = this._totalRecords;
        if (oldTotalRecords === totalRecords) return;
        this._totalRecords = totalRecords;
        this.outTotalRecordsChange(totalRecords, oldTotalRecords);
        return true;
    },

    getTotalRecords: function() { return this._totalRecords; },

    outTotalRecordsChange: function(totalRecords, oldTotalRecords) {
        this._out('totalRecordsChange', totalRecords, oldTotalRecords);
    },

    setReadOnly: function(readOnly) {
        var oldReadOnly = this._readOnly;
        if (oldReadOnly === readOnly) return;
        this._readOnly = readOnly;
        this.outReadOnlyChange(readOnly, oldReadOnly);
        return true;
    },

    getReadOnly: function() { return this._readOnly; },

    outReadOnlyChange: function(readOnly, oldReadOnly) {
        this._out('readOnlyChange', readOnly, oldReadOnly);
    },
    
    setDontNavigateUntilCommitted: function(dontNavigateUntilCommitted) {
        dontNavigateUntilCommitted = !!dontNavigateUntilCommitted;
        var oldDontNavigateUntilCommitted = this._dontNavigateUntilCommitted;
        if (oldDontNavigateUntilCommitted === dontNavigateUntilCommitted) return;
        this._dontNavigateUntilCommitted = dontNavigateUntilCommitted;
        this.outDontNavigateUntilCommittedChange(dontNavigateUntilCommitted, oldDontNavigateUntilCommitted);
        return true;
    },

    getDontNavigateUntilCommitted: function() { return this._dontNavigateUntilCommitted; },

    outDontNavigateUntilCommittedChange: function(dontNavigateUntilCommitted, oldDontNavigateUntilCommitted) {
        this._out('dontNavigateUntilCommittedChange', dontNavigateUntilCommitted, oldDontNavigateUntilCommitted);
    },

    setCommitOnNavigate: function(commitOnNavigate) {
        commitOnNavigate = !!commitOnNavigate;
        var oldCommitOnNavigate = this._commitOnNavigate;
        if (oldCommitOnNavigate === commitOnNavigate) return;
        this._commitOnNavigate = commitOnNavigate;
        this.outCommitOnNavigateChange(commitOnNavigate, oldCommitOnNavigate);
        return true;
    },

    getCommitOnNavigate: function() { return this._commitOnNavigate; },

    outCommitOnNavigateChange: function(commitOnNavigate, oldCommitOnNavigate) {
        this._out('commitOnNavigateChange', commitOnNavigate, oldCommitOnNavigate);
    },

    setDontFetchUntilCommitted: function(dontFetchUntilCommitted) {
        dontFetchUntilCommitted = !!dontFetchUntilCommitted;
        var oldDontFetchUntilCommitted = this._dontFetchUntilCommitted;
        if (oldDontFetchUntilCommitted === dontFetchUntilCommitted) return;
        this._dontFetchUntilCommitted = dontFetchUntilCommitted;
        this.outDontFetchUntilCommittedChange(dontFetchUntilCommitted, oldDontFetchUntilCommitted);
        return true;
    },

    getDontFetchUntilCommitted: function() { return this._dontFetchUntilCommitted; },

    outDontFetchUntilCommittedChange: function(dontFetchUntilCommitted, oldDontFetchUntilCommitted) {
        this._out('dontFetchUntilCommittedChange', dontFetchUntilCommitted, oldDontFetchUntilCommitted);
    },

    setCommitOnFetch: function(commitOnFetch) {
        commitOnFetch = !!commitOnFetch;
        var oldCommitOnFetch = this._commitOnFetch;
        if (oldCommitOnFetch === commitOnFetch) return;
        this._commitOnFetch = commitOnFetch;
        this.outCommitOnFetchChange(commitOnFetch, oldCommitOnFetch);
        return true;
    },

    getCommitOnFetch: function() { return this._commitOnFetch; },

    outCommitOnFetchChange: function(commitOnFetch, oldCommitOnFetch) {
        this._out('commitOnFetchChange', commitOnFetch, oldCommitOnFetch);
    },

    setLockNavigation: function(lockNavigation) {
        var oldLockNavigation = this._lockNavigation;
        if (oldLockNavigation === lockNavigation) return;
        this._lockNavigation = lockNavigation;
        this.outLockNavigationChange(lockNavigation, oldLockNavigation);
        return true;
    },

    getLockNavigation: function() { return this._lockNavigation; },

    outLockNavigationChange: function(lockNavigation, oldLockNavigation) {
        this._out('lockNavigationChange', lockNavigation, oldLockNavigation);
    },

    setRecordsCollection: function() {
        console.warn('Amm.Data.RecordSet: setRecordsCollection() has no effect');
    },
    
    getRecordsCollection: function() {
        if (this._recordsCollection && this._recordsCollection['Amm.Data.Collection']) {
            return this._recordsCollection;
        }
        var proto = this._recordsCollection || {};
        if (this._mapper) {
            proto.instantiator = this._mapper;
            proto.keyProperty = this._mapper.getKey();
            proto.instantiateOnAccept = true;
            proto.preserveUncommitted = true;
            proto.rejectOnDelete = true;
        }
        if (this._multiTransactionOptions) {
            proto.multiTransactionOptions = this._multiTransactionOptions;
        }
        this._recordsCollection = new Amm.Data.Collection(proto);
        this._recordsCollection.subscribe('deleteItem', this._handleRecordsCollectionDeleteItem, this);
        if (this._subscribers && this._subscribers.recordsChange) {
            this._recordsCollection.subscribe('itemsChange', this.outRecordsChange, this);
        }
        return this._recordsCollection;
    },
    
    outRecordsCollectionChange: function(recordsCollection, oldRecordsCollection) {
        return this._out('recordsCollectionChange', recordsCollection, oldRecordsCollection);
    },
    
    setFetchError: function(fetchError) {
        if (!fetchError) fetchError = null;
        var oldFetchError = this._fetchError;
        if (oldFetchError === fetchError) return;
        this._fetchError = fetchError;
        this.outFetchErrorChange(fetchError, oldFetchError);
        return true;
    },

    getFetchError: function() { return this._fetchError; },

    outFetchErrorChange: function(fetchError, oldFetchError) {
        this._out('fetchErrorChange', fetchError, oldFetchError);
    },
    
    _handleRecordsCollectionDeleteItem: function(index, item) {
        var newItems = this._recordsCollection.getItems(), oldItems = [].concat(oldItems);
        oldItems.splice(index, 0, [item]);
        var curr = this._currentRecord;
        this.outRecordsChange(newItems, oldItems);
        if (item !== curr) return;
        if (this.getNavigationLocked() & Amm.Data.RecordSet.LOCK_NAVIGATION) return;
        var ci = this._currentIndex;
        if (ci >= this._recordsCollection.length) ci = this._recordsCollection.length - 1;
        if (ci < 0) return;
        this.setCurrentRecord(this._recordsCollection[ci]);
    },
    
    setRecords: function(records) {
        return this._recordsCollection.setItems(records);
    },
    
    getRecords: function() {
        return this.getRecordsCollection().getItems();
    },
    
    outRecordsChange: function(records, oldRecords) {
        return this._out('recordsChange', records, oldRecords);
    },
    
    _subscribeFirst_recordsChange: function() {
        if (this._recordsCollection) {
            this._recordsCollection.subscribe('itemsChange', this.outRecordsChange, this);
        }
    },
    
    _unsubscribeLast_recordsChange: function() {
        if (this._recordsCollection) {
            this._recordsCollection.unsubscribe('itemsChange', this.outRecordsChange, this);
        }
    },
    
    setAutoAdd: function(autoAdd) {
        autoAdd = !!autoAdd;
        var oldAutoAdd = this._autoAdd;
        if (oldAutoAdd === autoAdd) return;
        this._autoAdd = autoAdd;
        this.outAutoAddChange(autoAdd, oldAutoAdd);
        return true;
    },

    getAutoAdd: function() { return this._autoAdd; },

    outAutoAddChange: function(autoAdd, oldAutoAdd) {
        this._out('autoAddChange', autoAdd, oldAutoAdd);
    },
    
    _checkNavFetchPossible: function(isFetch, opDescr) {
        if (this._skipNavFetchCheck) return;
        var possible = isFetch? this.getCanFetch() : this.getCanNavigate();
        if (possible) return;
        var op = isFetch? 'fetch' : 'navigation';
        var err = '';
        if (opDescr) err = 'Cannot ' + opDescr + '() at the moment - ';
        err += op + ' denied: ';
        if (this.getLockNavigation() & (isFetch? Amm.Data.RecordSet.LOCK_FETCH : Amm.Data.RecordSet.LOCK_NAVIGATION)) {
            err += 'due to prior setLockNavigation() call';
        } else if (this.getTransaction()) {
            err += 'unfinished fetch transaction in progress';
        } else if (isFetch && this._dontFetchUntilCommitted && !this._commitOnFetch && this._recordsCollection.getNumUncommitted()) {
            err += 'because dontFetchUntilCommitted is set, and collection has uncommitted records';
        } else if (this._dontNavigateUntilCommitted && !this._commitOnNavigate && this._recordsCollection.getNumUncommitted()) {
            err += 'because dontNavigateUntilCommitted is set, and collection has uncommitted records';
        }
        throw Error(err);
    },
    
    _calcTotalRecordsIncludingNew: function(get) {
        return get('totalRecords') + get.prop('recordsCollection').prop('numNew').val();
    },

    _calcAbsoluteIndex: function(get) {
        return get('offset') + get('currentIndex');
    },
    
    _calcCanNavigate: function(get) {
        return !(get('navigationLocked') & Amm.Data.RecordSet.LOCK_NAVIGATION);
    },
    
    _calcCanFetch: function(get) {
        return !(get('navigationLocked') & Amm.Data.RecordSet.LOCK_FETCH);
    },
    
    _calcCanBack: function(get) {
        if (get('absoluteIndex') <= 0) return false;
        if (!get('currentIndex')) return get('canFetch');
            else return get('canNavigate');
    },
    
    _calcCanForward: function(get) {
        if (get('absoluteIndex') >= (get('totalRecordsIncludingNew') - 1)) return !!get('autoAdd');
        if (get('currentIndex') >= get.prop('recordsCollection').prop('length').val() - 1) {
            return get('canFetch');
        }
        return get('canNavigate');
    },
    
    _calcCanBackPage: function(get) {
        return get('absoluteIndex') > 0 && get('canFetch');
    },
    
    _calcCanForwardPage: function(get) {
        return (get('absoluteIndex') < get('totalRecords') - 1) && get('canFetch');
    },
    
    _calcCanJump: function(get) {
        return (get('totalRecords') > 0 && get('canNavigate'));
    },
    
    _calcCanAdd: function(get) {
        return get('canNavigate') && !get('readOnly');
    },
    
    _calcCanDelete: function(get) {
        if (this.deleteImmediately && !get('canNavigate') || get('readOnly')) return false;
        var mm = get.prop('currentRecord').prop('mm');
        if (!mm.val()) return false;
        return mm.prop('state').val() !== Amm.Data.STATE_DELETED;
    },
    
    _calcCanSaveOrRevert: function(get) {
        if (get('readOnly')) return false;
        return get.prop('recordsCollection').prop('numUncommitted').val() > 0;
    },
    
    _calcNavigationLocked: function(get) {
        var res = get('lockNavigation');
        
        // max possible lock - no need to check more
        if (res === Amm.Data.RecordSet.LOCK_NAVIGATION) return res; 

        var state = get.prop('transaction').prop('state').val(),
            isFetch = state === Amm.Data.Transaction.STATE_INIT 
                || state === Amm.Data.Transaction.STATE_WAITING
                || state === Amm.Data.Transaction.STATE_RUNNING;
        if (isFetch) return res | Amm.Data.RecordSet.LOCK_NAVIGATION;
        if (get('dontNavigateUntilCommitted') || get('dontFetchUntilCommitted')) {
            var hasUncommitted = get.prop('recordsCollection').prop('numUncommitted').val() > 0;
            if (hasUncommitted) {
                if (get('dontNavigateUntilCommitted') && !get('commitOnNavigate')) {
                    return res | Amm.Data.RecordSet.LOCK_NAVIGATION;
                }
                if (get('dontFetchUntilCommitted') && !get('commitOnFetch')) {
                    return res | Amm.Data.RecordSet.LOCK_FETCH;
                }
            }
        }
        return res;
    },

};

Amm.extend(Amm.Data.RecordSet, Amm.Element);

Amm.createProperty(Amm.Data.RecordSet.prototype, 'records', null, null, {enumerable: false});
Amm.ObservableFunction.createCalcProperty('navigationLocked', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canFetch', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canNavigate', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canBack', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canBackPage', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canForward', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canForwardPage', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canJump', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canAdd', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canDelete', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('canSaveOrRevert', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('absoluteIndex', Amm.Data.RecordSet.prototype);
Amm.ObservableFunction.createCalcProperty('totalRecordsIncludingNew', Amm.Data.RecordSet.prototype);


