/* global Amm */

Amm.Data.Transaction = function(options) {
    var run = false;
    var tmp;
    if (options && 'run' in options) {
        tmp = Amm.override({}, options);
        options = tmp;
        run = options.run;
        delete options.run;
    }
    this._requiredTransactions = [];
    Amm.WithEvents.call(this, options);
    if (run) this.run();
};

Amm.Data.Transaction.TYPE_CREATE = 'create';
Amm.Data.Transaction.TYPE_LOAD = 'load';
Amm.Data.Transaction.TYPE_UPDATE = 'update';
Amm.Data.Transaction.TYPE_DELETE = 'delete';
Amm.Data.Transaction.TYPE_LIST = 'list';
Amm.Data.Transaction.TYPE_OFFSET = 'offset';

Amm.Data.Transaction.STATE_INIT = 'init';
Amm.Data.Transaction.STATE_WAITING = 'waiting';
Amm.Data.Transaction.STATE_RUNNING = 'running';
Amm.Data.Transaction.STATE_CANCELLED = 'cancelled';
Amm.Data.Transaction.STATE_FAILURE = 'failure';
Amm.Data.Transaction.STATE_SUCCESS = 'success';

/** 
 * Requirements for different types of transactions
 * 
 * true: means given property is required to be non-null and non-undefined
 * false: means given property is required to be null or undefined
 */

Amm.Data.Transaction.DEFAULT_REQUIREMENTS = {
};

Amm.Data.Transaction.DEFAULT_REQUIREMENTS
    [Amm.Data.Transaction.TYPE_CREATE] = { key: false, data: true };

Amm.Data.Transaction.DEFAULT_REQUIREMENTS
    [Amm.Data.Transaction.TYPE_LOAD] = { key: true, data: false };

Amm.Data.Transaction.DEFAULT_REQUIREMENTS
    [Amm.Data.Transaction.TYPE_UPDATE] = { key: true, data: true };

Amm.Data.Transaction.DEFAULT_REQUIREMENTS
    [Amm.Data.Transaction.TYPE_DELETE] = { key: true, data: false };

Amm.Data.Transaction.prototype = {
    
    'Amm.Data.Transaction': '__CLASS__',

    _type: null,

    _state: Amm.Data.Transaction.STATE_INIT,
    
    /**
     * Array of required transactions
     * @type Array
     */
    _requiredTransactions: null,

    _runner: null,
    
    _waiting: null,
    
    /**
     * Transaction key (usually ID of object that transaction is applied on).
     * Required to be non-null for transactions with types 'load', 'update' and 'delete'.
     * Required to be null for transaction with type 'create'
     * @type string|array|null
     */
    key: null,
    
    /**
     * Transaction data (usually properties of object that are set).
     * @type object
     */
    data: null,
    
    /**
     * @type object
     * Overrides for Amm.Data.Transaction.DEFAULT_REQUIREMENTS
     */
    requirements: null,
    
    _unparsedResponseClass: null,

    setType: function(type) {
        this._type = type;
    },
    
    getType: function() {
        return this._type;
    },

    setState: function(state) {
        var oldState = this._state;
        if (oldState === state) return;
        this._state = state;
        this.outStateChange(state, oldState);
        return true;
    },

    getState: function() { return this._state; },
    
    outStateChange: function(state, oldState) {
        return this._out('stateChange', state, oldState);
    },
    
    calcPayload: function() {
        var res = {
            key: this.key,
            data: this.data
        };
        var ret = {payload: res};
        this.outCalcPayload(ret);
        return res;
    },
    
    outCalcPayload: function(ret) {
        return this._out('calcPayload', ret);
    },
    
    setResult: function(result) {
        if (!result || !result['Amm.Data.TransactionResult'])
            throw Error("`result` must be Amm.Data.TransactionResult");
        var oldResult = this._result;
        if (oldResult === result) return;
        if (this._result) {
            console.log(this._result, result);
            console.trace();
            throw new Error("can setResult only once");
        }
        if (!result.getIsError()) { // check result that is presumably correct
            try {
                this.outValidateResult(result, this);
            } catch (e) {
                console.error("Exception when running transaction: ", e);
                result.setException(e);
            }
        }
        result.makeImmutable();
        this._result = result;
        if (result.getIsError()) this.setState(Amm.Data.Transaction.STATE_FAILURE);
            else this.setState(Amm.Data.Transaction.STATE_SUCCESS);
        this.outResultChange(result, oldResult);
    },
    
    getResult: function() {
        return this._result;
    },
    
    setRequiredTransactions: function(requiredTransactions) {
        requiredTransactions = this._checkRequiredTransactionsArg(requiredTransactions, 'setRequiredTransactions');
        var remove, add;
        if (this._requiredTransactions && this._requiredTransactions.length) {
            remove = Amm.Array.diff(this._requiredTransactions, requiredTransactions);
        }
        if (requiredTransactions.length) {
            add = this._requiredTransactions.length? Amm.Array.diff(requiredTransactions, this._requiredTransactions)
                : requiredTransactions;
        }
        if (add || remove) this._modifyRequiredTransactions(add, remove);
    },
    
    addRequiredTransactions: function(requiredTransactions) {
        requiredTransactions = this._checkRequiredTransactionsArg(requiredTransactions, 'addRequiredTransactions');
        if (!requiredTransactions.length) return;
        var add = Amm.Array.diff(requiredTransactions, this._requiredTransactions);
        if (add.length) this._modifyRequiredTransactions(add);
    },
    
    removeRequiredTransactions: function(requiredTransactions) {
        requiredTransactions = this._checkRequiredTransactionsArg(requiredTransactions, 'removeRequiredTransactions');
        if (!requiredTransactions.length) return;
        var remove = Amm.Array.intersect(this._requiredTransactions, requiredTransactions);
        if (remove.length) this._modifyRequiredTransactions(null, remove);
    },
    
    _modifyRequiredTransactions: function(add, remove) {
        Amm.subUnsub(add, remove, this, {
            'stateChange': this._handleRequiredTransactionStateChange,
            'cleanup': this._handleRequiredTransactionCleanup,
        });
        var oldRequiredTransactions = [].concat(this._requiredTransactions);
        this._requiredTransactions = Amm.Array.diff(this._requiredTransactions, remove || []).concat(add || []);
        this._updateRequiredTransactions();
        this.outRequiredTransactionsChange(this._requiredTransactions, oldRequiredTransactions, add, remove);
    },
    
    _handleRequiredTransactionStateChange: function(state) {
        if (state === Amm.Data.Transaction.STATE_CANCELLED) {
            this._cancelBecauseRequired(Amm.event.origin);
        }
        if (state === Amm.Data.Transaction.STATE_FAILURE) {
            this._failBecauseRequired(Amm.event.origin);
        }
        this._updateRequiredTransactions();        
    },
    
    _cancelBecauseRequired: function(transaction) {
        if (this._state !== Amm.Data.Transaction.STATE_CANCELLED 
            && this._state !== Amm.Data.Transaction.STATE_FAILURE
            && this._state !== Amm.Data.Transaction.STATE_SUCCESS) 
        {
            this.cancel();
            return true;
        }
    },
    
    _failBecauseRequired: function(transaction) {
        if (this._state !== Amm.Data.Transaction.STATE_CANCELLED 
            && this._state !== Amm.Data.Transaction.STATE_FAILURE
            && this._state !== Amm.Data.Transaction.STATE_SUCCESS) 
        {
            this.setResult(new Amm.Data.TransactionResult({
                errorType: Amm.Data.TransactionResult.ERROR_TYPE_CHAIN,
                errorData: {
                    'association': 'required',
                    'transaction': transaction,
                }
            }));
            return true;
        }
    },
    
    _updateRequiredTransactions: function() {
        var hasWaiting = false, state = this._state;
        if (state === Amm.Data.Transaction.STATE_CANCELLED
            || state === Amm.Data.Transaction.STATE_FAILURE
            || state === Amm.Data.Transaction.STATE_SUCCESS) return;

        for (var i = 0, l = this._requiredTransactions.length; i < l; i++) {
            var tr = this._requiredTransactions[i], st = tr.getState();
            if (st === Amm.Data.Transaction.STATE_CANCELLED) {
                if (this._cancelBecauseRequired(tr)) return;
            } else if (st === Amm.Data.Transaction.STATE_FAILURE) {
                if (this._failBecauseRequired(tr)) return;
            } else if (st !== Amm.Data.Transaction.STATE_SUCCESS) {
                hasWaiting = true;
            }
        }
        this._waiting = !!hasWaiting;
        if (!this._waiting && this._state === Amm.Data.Transaction.STATE_WAITING) {
            this.run();
        }
    },
    
    _handleRequiredTransactionCleanup: function() {
        this._modifyRequiredTransactions(null, [Amm.event.origin]);
    },
    
    _checkRequiredTransactionsArg: function(requiredTransactions, method) {
        if (
            this._state !== Amm.Data.Transaction.STATE_INIT 
            && this._state !== Amm.Data.Transaction.STATE_WAITING
        ) 
        {
            throw Error("Can " + method + "() only in STATE_INIT or STATE_WAITING; current state is '"
                + this._state + "'");
        }
        if (!requiredTransactions) requiredTransactions = [];
        else if (!(requiredTransactions instanceof Array)) {
            requiredTransactions = [requiredTransactions];
        }
        for (var i = 0, l = requiredTransactions; i < l; i++) {
            Amm.is(requiredTransactions[i], Amm.Data.Transaction, 'requiredTransactions[' + i + ']');
        }
        return requiredTransactions;
    },
    
    /**
     * @returns {Array}
     */
    getRequiredTransactions: function() {
        return [].concat(this._requiredTransactions);
    },
    
    outRequiredTransactionsChange: function(requiredTransactions, oldRequiredTransactions, added, removed) {
        return this._out('requiredTransactionsChange', requiredTransactions, oldRequiredTransactions, added, removed);
    },
    
    outValidateResult: function(result, transaction) {
        return this._out('validateResult', result, transaction);
    },
    
    outResultChange: function(result, oldResult) {
        return this._out('resultChange', result, oldResult);
    },
    
    _setException: function(exception, extra) {
        var proto = {
            exception: exception
        };
        if (extra) Amm.override(proto, extra);
        this.setResult(new Amm.Data.TransactionResult(proto));
    },
    
    validate: function(throwException) {
        
        var rq;
        
        if (this.requirements) {
            rq = Amm.override({}, this.requirements, Amm.Data.Transaction.DEFAULT_REQUIREMENTS);
        } else {
            rq = Amm.Data.Transaction.DEFAULT_REQUIREMENTS;
        }
        
        if (!rq[this._type]) return; // everything ok
        
        for (var i in rq[this._type]) if (rq[this._type].hasOwnProperty(i)) {
            var should = !!rq[this._type][i];
            var has = this[i] !== undefined && this[i] !== null;
            if (should !== has) {
                if (!throwException) return false;
                throw Error("Transaction doesn't meet requirements for type '"
                    + this._type + "': property '" + i + "' is " + 
                    (has? "non-empty" : "empty") + ' while it should be ' + 
                    (should? "non-empty" : "empty")
                );
            }
        }
        
        return true;
        
    },
    
    run: function() {
        if (this._state !== Amm.Data.Transaction.STATE_INIT
            && this._state !== Amm.Data.Transaction.STATE_WAITING) {
            throw Error("Can run() only from Amm.Data.Transaction.STATE_INIT or STATE_WAITING");
        }
        
        if (this._waiting === null || this._waiting === true) {
            this._updateRequiredTransactions();
            if (this._state !== Amm.Data.Transaction.STATE_INIT
                && this._state !== Amm.Data.Transaction.STATE_WAITING            
            ) 
            // _updateRequiredTransactions moved us to cancelled or failure state
            return;
        }
        
        try {
            
            this.validate(true);
            
            if (this._waiting) {
                // still waiting
                this.setState(Amm.Data.Transaction.STATE_WAITING);
                return;
            }
            
            var handled = {handled: false};
            this.outRun(handled);
            this.setState(Amm.Data.Transaction.STATE_RUNNING);
            this.outRunning(handled);
            if (!handled.handled) {
                this._runDefault();
            }
            
        } catch (e) {
            
            console.error("Exception while running a transaction:", e);
            this._setException(e);
            
        }
    },
    
    _runDefault: function() {
        this._createOrGetRunner().run();
    },
    
    setRunner: function(runner) {
        var oldRunner = this._runner;
        if (oldRunner === runner) return;
        if (this._runner) {
            throw Error("Can setRunner() only once");
        }
        runner = Amm.constructInstance(
            runner,
            'Amm.Data.TransactionRunner',
            {
                transaction: this
            }, 
            true
        );
        this._runner = runner;
        this.outRunnerChange(runner, oldRunner);
        return true;
    },

    getRunner: function(createIfNeeded) { 
        if (createIfNeeded) return this._createOrGetRunner();
        return this._runner; 
    },

    outRunnerChange: function(runner, oldRunner) {
        this._out('runnerChange', runner, oldRunner);
    },
    
    _createOrGetRunner: function() {
        if (this._runner) return this._runner;
        var ret = {runner: null};
        this.outCreateRunner(ret);
        if (!ret.runner) throw Error("Cannot create runner");
        this.setRunner(ret.runner);
        return this._runner;
    },
    
    outCreateRunner: function(ret) {
        return this._out('createRunner', ret);
    },
    
    outRun: function(handled) {
        if (!handled) handled = {handled: false};
        return this._out('run', handled);
    },
    
    // same as outRun, but called after state is Amm.Transaction.STATE_RUNNING,
    // thus we can complete the transaction there
    outRunning: function(handled) {
        if (!handled) handled = {handled: false};
        return this._out('running', handled);
    },
    
    cancel: function() {
        var 
            init = this._state === Amm.Data.Transaction.STATE_INIT,
            running = this._state === Amm.Data.Transaction.STATE_RUNNING,
            waiting = this._state === Amm.Data.Transaction.STATE_WAITING;
    
        if (!(running || init || waiting)) {
            throw Error("Can cancel() only Transaction with STATE_INIT, STATE_WAITING or STATE_RUNNING");
        }
        if (init || waiting) { // not running - don't need to stop runner
            this.setState(Amm.Data.Transaction.STATE_CANCELLED);
            return;
        }
        var handled = { handled: false };
        this.outCancel(handled);
        if (!handled) {
            if (this._runner) this._runner.cancel();
        }
        this.setState(Amm.Data.Transaction.STATE_CANCELLED);
    },
    
    // this event is triggered ONLY when before cancellation state was STATE_RUNNING
    outCancel: function(handled) {
        return this._out('cancel', handled);
    },
    
    setUnparsedResponse: function(unparsedResponse) {
        if (!unparsedResponse || typeof unparsedResponse !== 'object') {
            throw Error("`unparsedResponse` must be an object");
        }
        if (this._unparsedResponseClass) {
            Amm.is(unparsedResponse, this._unparsedResponseClass, 'unparsedResponse');
        }
        var tr = {
            transactionResult: null
        };
        try {
            var resultInstance = null;
            this.outParseResponse(unparsedResponse, tr);
            if (!tr.transactionResult) {
                tr.transactionResult = this._createOrGetRunner().parse(unparsedResponse);
            }
            resultInstance = Amm.constructInstance(tr.transactionResult, Amm.Data.TransactionResult);
            if (!resultInstance.getImmutable()) {
                resultInstance.setUnparsedResponse(unparsedResponse);
            }
            this.setResult(resultInstance);
        } catch (e) {
            if (!this._result) this._setException(e);
            else throw e;
        }
    },
    
    /**
     * @param {object} unparsedResponse
     * @param {object} tr.transactionResult Out - will be used as Amm.Data.TransactionResult
     */
    outParseResponse: function(unparsedResponse, tr) {
        return this._out(unparsedResponse, tr);
    },
    
    cleanup: function() {
        if (this._state === Amm.Data.Transaction.STATE_RUNNING) this.cancel();
        this.outCleanup();
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    outCleanup: function() {
        return this._out('cleanup');
    },
    
};

Amm.extend(Amm.Data.Transaction, Amm.WithEvents);