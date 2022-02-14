/* global Amm */

Amm.Data.Transaction.Multi = function(options) {
    this.transactions = [];
    Amm.Data.Transaction.call(this, options);
};

Amm.Data.Transaction.Multi.prototype = {

    'Amm.Data.Transaction.Multi': '__CLASS__', 
    
    /**
     * If set to true, first failure will immediately fail transaction and cancel running ones
     * @type Boolean
     */
    stopOnFirstFail: false,
    
    cleanupTransactions: false,
    
    transactions: null,

    /**
     * Max number of Running transactions to run. Decreasing won't stop
     * already running ones. Increasing will run waiting ones immediately.
     * 0 or Null (default) means all transactions are run simultaneously.
     * One (1) means strictly sequentinal execution.
     */
    _maxRunning: null,
    
    _numTotal: 0,

    _numRunning: 0,

    _numWaiting: 0,

    _numDone: 0,

    _numFailed: 0,
    
    _numSuccess: 0,
    
    _numCancelled: 0,
    
    setTransactions: function(transactions) {
        if (this.transactions.length) {
            throw Error("can setTransactions() only once; use add() to add more");
        }
        if (!(transactions instanceof Array)) {
            throw Error("`transactions` must be an Array");
        }
        this.add(transactions);
    },
    
    getTransactions: function() {
        return this.transactions.slice();
    },
    
    add: function(transaction) {
        if (transaction instanceof Array) {
            for (var i = 0, l = transaction.length; i < l; i++) {
                this.add(transaction[i]);
            }
            return;
        }
        Amm.is(transaction, 'Amm.Data.Transaction', 'transaction');
        if (Amm.Array.indexOf(transaction, this.transactions) > 0) {
            throw Error("cannot add() same transaction again");
        }
        this.transactions.push(transaction);
        this._reg(transaction);
    },
    
    _change: function(what) {
        var delta, i;
        for (i in what) if (what.hasOwnProperty(i)) {
            delta = what[i];
            if (!delta) continue;
            this['_num' + Amm.ucFirst(i)] += delta;
        }
        for (i in what) if (what.hasOwnProperty(i)) {
            delta = what[i];
            i = Amm.ucFirst(i);
            if (!delta) continue;
            this['outNum' + i + 'Change'](this['_num' + i], this['_num' + i] - delta);
        }
    },
    
    _reg: function(transaction) {
        transaction.subscribe('stateChange', this._handleTransactionStateChange, this);
        transaction.subscribe('cleanup', this._handleTransactionCleanup, this);
        this._handleTransactionStateChange(transaction.getState(), null);
        if (this._state === Amm.Data.Transaction.STATE_RUNNING) {
            this._runMore();
        }
    },
    
    _handleTransactionCleanup: function() {
        var transaction = Amm.event.origin;
        transaction.unsubscribe(undefined, undefined, this);
        var idx = Amm.Array.indexOf(transaction, this.transactions);
        if (idx < 0) return;
        this.transactions.splice(idx, 1);
        this._handleTransactionStateChange(null, transaction.getState());
    },
    
    _handleTransactionStateChange: function(state, oldState) {
        
        var what = {};
        
        if (state === Amm.Data.Transaction.STATE_RUNNING) {
            what.running = 1;
        } else if (state === Amm.Data.Transaction.STATE_WAITING) {
            what.waiting = 1;
        } else if (state === Amm.Data.Transaction.STATE_CANCELLED) {
            what.cancelled = 1;
            what.done = 1;
        } else if (state === Amm.Data.Transaction.STATE_SUCCESS) {
            what.success = 1;
            what.done = 1;
        } else if (state === Amm.Data.Transaction.STATE_FAILURE) {
            what.failed = 1;
            what.done = 1;
        } else if (state === null) { // special case - transaction removed
            what.total = -1;
        }
        
        if (oldState === Amm.Data.Transaction.STATE_RUNNING) {
            what.running = -1;
        } else if (oldState === Amm.Data.Transaction.STATE_WAITING) {
            what.waiting = -1;
        } else if (oldState === Amm.Data.Transaction.oldState_CANCELLED) {
            what.cancelled = -1;
            what.done = -1;
        } else if (oldState === Amm.Data.Transaction.oldState_SUCCESS) {
            what.success = -1;
            what.done = -1;
        } else if (oldState === Amm.Data.Transaction.oldState_FAILURE) {
            what.failed = -1;
            what.done = -1;
        } else if (oldState === null) { // special case - transaction removed
            what.total = 1;
        }
        
        this._change(what);
        
        if (this._state === Amm.Data.Transaction.STATE_RUNNING) {
            if (oldState === Amm.Data.Transaction.STATE_RUNNING || state === Amm.Data.Transaction.STATE_INIT) {
                this._runMore();
            }
        }
        
        if (this.stopOnFirstFail && what.failed === 1) {
            this._cancelAllAndFail();
        }
        
        if (what.running === 1 && this._state !== Amm.Data.Transaction.STATE_RUNNING) {
            this.run();
        }
    },
    
    setMaxRunning: function(maxRunning) {
        if (!maxRunning) maxRunning = 0;
        else {
            maxRunning = parseInt(maxRunning);
            if (isNaN(maxRunning) || maxRunning < 0) {
                throw Error("maxRunning must be 0, null, or positive number");
            }
        }
        var oldMaxRunning = this._maxRunning;
        if (oldMaxRunning === maxRunning) return;
        this._maxRunning = maxRunning;
        if (!maxRunning || oldMaxRunning && (maxRunning > oldMaxRunning)) {
            this._runMore();
        }
        this.outMaxRunningChange(maxRunning, oldMaxRunning);
        return true;
    },

    getMaxRunning: function() { return this._maxRunning; },

    outMaxRunningChange: function(maxRunning, oldMaxRunning) {
        this._out('maxRunningChange', maxRunning, oldMaxRunning);
    },
    
    _runDefault: function() {
        if (this._state === Amm.Data.Transaction.STATE_INIT) {
            this.setState(Amm.Data.Transaction.STATE_RUNNING);
        }
        this._runMore();
    },
    
    _runMore: function() {
        var max = this._maxRunning? this._maxRunning : this.transactions.length;
        var curr = this._numRunning;
        for (var i = 0, l = this.transactions.length; i < l && curr < max; i++) {
            if (this.transactions[i].getState() === Amm.Data.Transaction.STATE_INIT) {
                curr++;
                this.transactions[i].run();
            }
        }
    },
    
    _succeed: function() {
        var data = [];
        for (var i = 0, l = this.transactions.length; i < l; i++) {
            data.push(this.transactions[i].getResult());
        }
        this.setResult(new Amm.Data.TransactionResult({
            data: data
        }));
    },
    
    _fail: function() {
        this.setResult(new Amm.Data.TransactionResult({
            errorType: Amm.Data.TransactionResult.ERROR_TYPE_CLIENT,
            errorData: this._numFailed + " transaction(s) failed out of " + this._numTotal
        }));
    },
    
    cancel: function() {
        var res = Amm.Data.Transaction.prototype.cancel.call(this);
        if (this._state === Amm.Data.Transaction.STATE_CANCELLED) {
            for (var i = this.transactions.length - 1; i >= 0; i--) {
                var s = this.transactions[i].getState();
                if (!(s === Amm.Data.Transaction.STATE_INIT || s === Amm.Data.Transaction.STATE_RUNNING)) {
                    continue;
                }
                this.transactions[i].cancel();
            }
        }
        return res;
    },
    
    _cancelAllAndFail: function() {
        for (var i = 0, l = this.transactions.length; i < l; i++) {
            if (this.transactions[i].getState() !== Amm.Data.Transaction.STATE_RUNNING) continue;
            this.transactions[i].cancel();
        }
        if (!this._result) {
            this._fail();
        }
    },
    
    _checkFinished() {
        if (this._numDone < this._numTotal) return;
        if (this._numFailed && this._state !== Amm.Data.Transaction.STATE_CANCELLED) {
            this._fail();
            return;
        }
        if (!this._result && this._state !== Amm.Data.Transaction.STATE_CANCELLED) {
            this._succeed();
        }
    },
    
    setNumTotal: function(numTotal) {
        var oldNumTotal = this._numTotal;
        if (oldNumTotal === numTotal) return;
        this._numTotal = numTotal;
        this.outNumTotalChange(numTotal, oldNumTotal);
        return true;
    },

    getNumTotal: function() { return this._numTotal; },

    outNumTotalChange: function(numTotal, oldNumTotal) {
        this._out('numTotalChange', numTotal, oldNumTotal);
        if (oldNumTotal < numTotal) {
            this._checkFinished();
        }
    },

    setNumRunning: function(numRunning) {
        var oldNumRunning = this._numRunning;
        if (oldNumRunning === numRunning) return;
        this._numRunning = numRunning;
        this.outNumRunningChange(numRunning, oldNumRunning);
        return true;
    },

    getNumRunning: function() { return this._numRunning; },

    outNumRunningChange: function(numRunning, oldNumRunning) {
        this._out('numRunningChange', numRunning, oldNumRunning);
    },

    setNumWaiting: function(numWaiting) {
        var oldNumWaiting = this._numWaiting;
        if (oldNumWaiting === numWaiting) return;
        this._numWaiting = numWaiting;
        this.outNumWaitingChange(numWaiting, oldNumWaiting);
        return true;
    },

    getNumWaiting: function() { return this._numWaiting; },

    outNumWaitingChange: function(numWaiting, oldNumWaiting) {
        this._out('numWaitingChange', numWaiting, oldNumWaiting);
    },

    setNumDone: function(numDone) {
        var oldNumDone = this._numDone;
        if (oldNumDone === numDone) return;
        this._numDone = numDone;
        this.outNumDoneChange(numDone, oldNumDone);
        return true;
    },

    getNumDone: function() { return this._numDone; },

    outNumDoneChange: function(numDone, oldNumDone) {
        this._out('numDoneChange', numDone, oldNumDone);
        if (numDone >= this._numTotal) {
            this._checkFinished();
        }
    },
    
    setNumSuccess: function(numSuccess) {
        var oldNumSuccess = this._numSuccess;
        if (oldNumSuccess === numSuccess) return;
        this._numSuccess = numSuccess;
        this.outNumSuccessChange(numSuccess, oldNumSuccess);
        return true;
    },

    getNumSuccess: function() { return this._numSuccess; },

    outNumSuccessChange: function(numSuccess, oldNumSuccess) {
        this._out('numSuccessChange', numSuccess, oldNumSuccess);
    },

    setNumFailed: function(numFailed) {
        var oldNumFailed = this._numFailed;
        if (oldNumFailed === numFailed) return;
        this._numFailed = numFailed;
        this.outNumFailedChange(numFailed, oldNumFailed);
        return true;
    },

    getNumFailed: function() { return this._numFailed; },

    outNumFailedChange: function(numFailed, oldNumFailed) {
        this._out('numFailedChange', numFailed, oldNumFailed);
    },

    setNumCancelled: function(numCancelled) {
        var oldNumCancelled = this._numCancelled;
        if (oldNumCancelled === numCancelled) return;
        this._numCancelled = numCancelled;
        this.outNumCancelledChange(numCancelled, oldNumCancelled);
        return true;
    },

    getNumCancelled: function() { return this._numCancelled; },

    outNumCancelledChange: function(numCancelled, oldNumCancelled) {
        this._out('numCancelledChange', numCancelled, oldNumCancelled);
    },
 
    cleanup: function() {
        var t = this.transactions;
        this.transactions = [];
        for (var i = 0, l = t.length; i < l; i++) {
            t[i].unsubscribe(undefined, undefined, this);
            if (this.cleanupTransactions) {
                t[i].cleanup();
            }
        }
        Amm.Data.Transaction.prototype.cleanup.call(this);
    }
    
};

Amm.extend(Amm.Data.Transaction.Multi, Amm.Data.Transaction);

