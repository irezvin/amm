/* global Amm */

Amm.Remote.Transport.Debug = function(options) {
    Amm.Remote.Transport.call(this, {});
    Amm.WithEvents.call(this, options);
    var t = this;
    this._successClosure = function(data, textStatus) { return t.success(data, textStatus); };
    this._failureClosure = function(textStatus, errorThrown, httpCode) { return t.failure(textStatus, errorThrown, httpCode); };
};

Amm.Remote.Transport.Debug.prototype = {

    'Amm.Remote.Transport.Debug': '__CLASS__', 
    
    eventTime: 0,
    
    replyTime: 10,
    
    _pendingSuccess: null,
    
    _pendingFailure: null,
    
    _lastRequest: null,
    
    _successClosure: null,
    
    _failureClosure: null,
    
    reply: function(runningRequest, isSuccess, timeout, args_) {
        this._pendingSuccess = null;
        this._pendingFailure = null;
        if (runningRequest.getAborted()) return;
        if (timeout === undefined || timeout === null) timeout = this.replyTime;
        var args = Array.prototype.slice.call(arguments, 3);
        var f = function() {
            var fn = isSuccess? runningRequest.success : runningRequest.failure;
            fn.apply(runningRequest, args);
        };
        if (timeout > 0) {
            runningRequest._timeout = window.setTimeout(f, this.replyTime);
        } else {
            f();
        }
    },
    
    success: function(data, textStatus, timeout) {
        if (!this._lastRequest) {
            this._pendingSuccess = Array.prototype.slice.call(arguments);
            this._pendingFailure = null;
            return;
        }
        if (typeof data === 'function') data = data(this._lastRequest);
        this.reply(this._lastRequest, true, timeout, data, textStatus);
    },
    
    failure: function(textStatus, errorThrown, httpCode, timeout) {
        if (!this._lastRequest) {
            this._pendingFailure = Array.prototype.slice.call(arguments);
            this._pendingSuccess = null;
            return;
        }
        this.reply(this._lastRequest, false, timeout, textStatus, errorThrown, httpCode);
    },
    
    outRequest: function(runningRequest, success, failure) {
        var tmp = this._lastRequest, res;
        this._lastRequest = runningRequest;
        res = this._out('request', runningRequest, success, failure);
        if (this._pendingSuccess) {
            this.success.apply(this, this._pendingSuccess);
        } else if (this._pendingFailure) {
            this.failure.apply(this, this._pendingFailure);
        }
        this._lastRequest = tmp;
        return res;
    },
    
    outAbortRequest: function(runningRequest) {
        return this._out('abortRequest', runningRequest);
    },

    _doPrepareRunningRequest: function(runningRequest, constRequest, success, failure, scope) {
        var t = this, f = function() {
            t.outRequest(runningRequest, t._successClosure, t._failureClosure);
        };
        if (this.eventTime < 0) f();
        else {
            runningRequest._timeout = window.setTimeout(f, this.eventTime);
        }
    },
    
    _doAbortRunningRequest: function(runningRequest) {
        if (runningRequest._timeout) {
            window.clearTimeout(runningRequest._timeout, null);
            runningRequest._timeout = null;
        }
        this.outAbortRequest(runningRequest);
    },
    
};

Amm.extend(Amm.Remote.Transport.Debug, Amm.Remote.Transport);
Amm.extend(Amm.Remote.Transport.Debug, Amm.WithEvents);

