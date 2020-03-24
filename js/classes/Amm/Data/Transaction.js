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
    if (this['Amm.Data.Transaction'] === '__CLASS__') {
        throw Error("Attempt to instantiate abstract class: Amm.Data.Transaction");
    }
    Amm.WithEvents.call(this, options);
    if (run) this.run();
};

Amm.Data.Transaction.TYPE_CREATE = 'create';
Amm.Data.Transaction.TYPE_LOAD = 'load';
Amm.Data.Transaction.TYPE_UPDATE = 'update';
Amm.Data.Transaction.TYPE_DELETE = 'delete';

Amm.Data.Transaction.STATE_INIT = 'init';
Amm.Data.Transaction.STATE_RUNNING = 'running';
Amm.Data.Transaction.STATE_SUCCESS = 'success';
Amm.Data.Transaction.STATE_FAILURE = 'failure';
Amm.Data.Transaction.STATE_CANCELLED = 'cancelled';

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
    
    setResult: function(result) {
        if (!result || !result['Amm.Data.TransactionResult'])
            throw Error("`result` must be Amm.Data.TransactionResult");
        var oldResult = this._result;
        if (oldResult === result) return;
        if (this._result) throw new Error("can setResult only once");
        if (!result.getIsError()) { // check result that is presumably correct
            try {
                this.outValidateResult(result, this);
            } catch (e) {
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
        if (this._state !== Amm.Data.Transaction.STATE_INIT) {
            throw Error("Can run() only from Amm.Data.Transaction.STATE_INIT");
        }
        try {
            
            this.validate(true);
            var handled = {handled: false};
            this.outRun(handled);
            if (!handled.handled) this._runDefault();
            if (this._state === Amm.Data.Transaction.STATE_INIT) {
                this.setState(Amm.Data.Transaction.STATE_RUNNING);
            }
            
        } catch (e) {
            
            console.warn(e);
            this._setException(e);
        }
    },
    
    outRun: function(handled) {
        return this._out('run', handled);
    },
    
    _runDefault: function() {
        throw Error("Call to abstract method");
    },
    
    _parseDefault: function(unparsedResponse) {
        throw Error("Call to abstract method");
    },
    
    cancel: function() {
        if (this._state !== Amm.Data.Transaction.STATE_RUNNING) {
            throw Error("Can cancel() only Transaction with STATE_RUNNING");
        }
        var handled = { handled: false };
        this.outCancel(handled);
        if (!handled) {
            this._cancelDefault();
        }
        this.setState(Amm.Data.Transaction.STATE_CANCELLED);
    },
    
    outCancel: function(handled) {
        return this._out('cancel', handled);
    },
    
    _cancelDefault: function() {
        throw Error("Call to abstract method");
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
            if (!tr.transactionResult) tr.transactionResult = this._parseDefault(unparsedResponse);
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
        Amm.WithEvents.prototype.cleanup.call(this);
    }
    
};

Amm.extend(Amm.Data.Transaction, Amm.WithEvents);