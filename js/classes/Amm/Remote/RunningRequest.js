/* global Amm */

Amm.Remote.RunningRequest = function(constRequest, success, failure, scope, transport, extra) {
    
    this._constRequest = constRequest;
    this._success = success;
    this._failure = failure;
    this._scope = scope;
    this._transport = transport;
    this._extra = extra;
        
};

Amm.Remote.RunningRequest.ERROR_TIMEOUT = "timeout";
Amm.Remote.RunningRequest.ERROR_SERVER_ERROR = "error";
Amm.Remote.RunningRequest.ERROR_ABORT = "abort";
Amm.Remote.RunningRequest.ERROR_PARSER_ERROR = "parsererror";

Amm.Remote.RunningRequest.prototype = {

    'Amm.Remote.RunningRequest': '__CLASS__', 
    
    _constRequest: null,
    
    _success: null,
    
    _failure: null,
    
    _scope: null,
    
    _transport: null,
    
    _extra: undefined,

    _finished: false,
    
    _result: null,
    
    _error: null,
    
    getConstRequest: function() {
        return this._constRequest;
    },
    
    getSuccess: function() {
        return this._success;
    },
    
    getFailure: function() {
        return this._failure;
    },
    
    getScope: function() {
        return this._scope;
    },
    
    getTransport: function() {
        return this._transport;
    },
        
    getExtra: function() {
        return this._extra;
    },
    
    setExtra: function(extra) {
        if (this._extra === extra) return;
        if (this._extra !== undefined) throw Error("Cant setExtra() only once");
        this._extra = extra;
    },
    
    getFinished: function() {
        return this._finished;
    },
    
    success: function(data, textStatus) {
        this._result = Array.prototype.slice.call(arguments);
        if (!this._finished) {
            this._finished = 1;
        }
        if (!this._success) return;
        return this._success.apply(this._scope || window, this._result);
    },
    
    failure: function(textStatus, errorThrown, httpCode) {
        this._error = Array.prototype.slice.call(arguments);
        if (!this._finished) {
            this._finished = -1;
        }
        if (!this._failure) return;
        return this._failure.apply(this._scope || window, this._error);
    },
    
    abort: function() {
        this._transport.abortRunningRequest(this);
        this._finished = -3;
    },
    
    getRunning: function() {
        return !this._finished;
    },
    
    getAborted: function() {
        return this._finished === -3;
    }

};



