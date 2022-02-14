/* global Amm */

Amm.Data.TransactionResult = function(options) {
    
    Amm.init(this, options);
    
};

Amm.Data.TransactionResult.ERROR_TYPE_NONE = null;


/**
 * One of associated transactions failed, so current one failed too
 */
Amm.Data.TransactionResult.ERROR_TYPE_CHAIN = 'chain';

/**
 * We weren't able to produce request or parse response
 */ 
Amm.Data.TransactionResult.ERROR_TYPE_CLIENT = 'client';

/**
 * HTTP protocol error (i.e. 500 or 404)
 */
Amm.Data.TransactionResult.ERROR_TYPE_HTTP = 'http';

/**
 * Server or 'soft' error - valid request that we couldn't satisfy
 */
Amm.Data.TransactionResult.ERROR_TYPE_SERVER = 'server';

Amm.Data.TransactionResult._revErrorType = {
    chain: 'CHAIN',
    client: 'CLIENT',
    http: 'HTTP',
    server: 'SERVER'
};

Amm.Data.TransactionResult.prototype = {
    
    'Amm.Data.TransactionResult': '__CLASS__',

    /**
     * Unparsed response that was source of this Result
     */
    _unparsedResponse: null,

    /**
     * One of Amm.Data.TransactionResult.ERROR_TYPE_* constants -- what kind of error occured
     * @type string|null
     */
    _errorType: null,

    /**
     * Structured response data (usually to update object fields)
     * @type object
     */
    _data: null,
    
    /**
     * Structured error data ({[field]: error_in_that_field})
     * @type type
     */
    _errorData: null,

    /**
     * Exception that caused the error (if any)
     * @type type
     */
    _exception: null,

    /**
     * Unstructured (textual) error data
     * @type string
     */
    _error: null,
    
    /**
     * If TRUE, setters that change TransactionResult' properties will throw exception
     * @type Boolean
     */
    _immutable: false,

    setUnparsedResponse: function(unparsedResponse) {
        if (!unparsedResponse) unparsedResponse = null;
        if (typeof unparsedResponse !== 'object')
            throw Error("`unparsedResponse` must be an object");
        var oldUnparsedResponse = this._unparsedResponse;
        if (oldUnparsedResponse === unparsedResponse) return;
        this._checkMutability();
        this._unparsedResponse = unparsedResponse;
        return true;
    },
    
    getUnparsedResponse: function() { return this._unparsedResponse; },
    
    _checkMutability: function() {
        if (this._immutable) {
            throw Error("Cannot change property of immutable TransactionResult");
        }
    },

    setErrorType: function(errorType) {
        if (!errorType) errorType = null;
        if (errorType && !(errorType in Amm.Data.TransactionResult._revErrorType)) {
            throw Error ("`errorType` must be one of Amm.Data.TransactionResult.ERROR_TYPE_ constants");
        }
        var oldErrorType = this._errorType;
        if (oldErrorType === errorType) return;
        this._checkMutability();
        this._errorType = errorType;
        if (!this._errorType && this._error) {
            this.setError(null);
        } else if (this._errorType && !this._error) {
            this.setError({});
        }
        return true;
    },
    
    getErrorType: function() { return this._errorType; },

    setData: function(data) {
        var oldData = this._data;
        if (oldData === data) return;
        this._checkMutability();
        this._data = data;
        return true;
    },

    getData: function() { return this._data; },
    
    setErrorData: function(errorData) {
        var oldErrorData = this._errorData;
        if (oldErrorData === errorData) return;
        this._checkMutability();
        this._errorData = errorData;
        return true;
    },

    getErrorData: function() { return this._errorData; },
    
    setException: function(exception) {
        var oldException = this._exception;
        if (oldException === exception) return;
        this._checkMutability();
        this._exception = exception;
        // exceptions usually imply ERROR_TYPE.CLIENT
        if (!this._errorType) this.setErrorType('client');
        return true;
    },

    getException: function() { return this._exception; },

    setError: function(error) {
        var oldError = this._error;
        if (oldError === error) return;
        this._checkMutability();
        this._error = error;
        return true;
    },

    getError: function() { return this._error; },
    
    getIsError: function() {
        return !!this._errorType;
    },
    
    getIsSuccess: function() {
        return !this._errorType;
    },
    
    makeImmutable: function() {
        this._immutable = true;
    },
    
    getImmutable: function() {
        return this._immutable;
    }
    
};

