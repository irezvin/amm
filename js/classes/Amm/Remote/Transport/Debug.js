/* global Amm */

Amm.Remote.Transport.Debug = function(options) {
    Amm.Remote.Transport.call(this, {});
    Amm.WithEvents.call(this, options);
    var t = this;
    this._successClosure = function(data, textStatus) { return t.success.apply(t, Array.prototype.slice.call(arguments)); };
    this._failureClosure = function(textStatus, errorThrown, httpCode) { return t.failure.apply(t, Array.prototype.slice.call(arguments)) };
    this._pendingAsync = [];
};

Amm.Remote.Transport.Debug.prototype = {

    'Amm.Remote.Transport.Debug': '__CLASS__', 
    
    eventTime: 0,
    
    replyTime: 10,
    
    _pendingSuccess: null,
    
    _pendingFailure: null,
    
    _request: null,
    
    _successClosure: null,
    
    _failureClosure: null,
    
    _asyncCounter: 0,
    
    _pendingAsync: null,
    
    reply: function(runningRequest, isSuccess, timeout, args_) {
        this._pendingSuccess = null;
        this._pendingFailure = null;
        if (runningRequest.getAborted()) return;
        if (timeout === undefined || timeout === null) timeout = this.replyTime;
        var args = Array.prototype.slice.call(arguments, 3);
        var id = null;
        var t = this;
        if (timeout > 0) {
            id = ++this._asyncCounter;
        }
        var f = function() {
            var fn = isSuccess? runningRequest.success : runningRequest.failure;
            if (id) t.clearAsync(id);
            fn.apply(runningRequest, args);
        };
        if (timeout > 0) {
            runningRequest._timeout = window.setTimeout(f, this.replyTime);
            this._pendingAsync.push({
                id: id, fn: f, timeout: runningRequest._timeout, rq: runningRequest, type: 'response'
            });
        } else {
            f();
        }
        this._request = null;
    },
    
    hasAsync: function() {
        return !!this._pendingAsync.length;
    },
    
    replyAsync: function(all) {
        for (var i = this._pendingAsync.length - 1; i >= 0; i--) {
            this._pendingAsync[i].fn();
            if (!all) break;
        }
    },
    
    clearAsync: function(id) {
        for (var i = 0, l = this._pendingAsync.length; i < l; i++) {
            if (this._pendingAsync[i].id !== id) continue;
            window.clearTimeout(this._pendingAsync[i].timeout);
            this._pendingAsync.splice(i, 1);
            break;
        }
    },
    
    success: function(data, textStatus, timeout) {
        if (!this._request) {
            this._pendingSuccess = Array.prototype.slice.call(arguments);
            this._pendingFailure = null;
            return;
        }
        if (typeof data === 'function') data = data(this._request);
        var args = Array.prototype.slice.call(arguments);
        args.splice(2, 1); // delete 'timeout' arg
        args.unshift(this._request, true, timeout);
        this.reply.apply(this, args);
    },
    
    failure: function(textStatus, errorThrown, httpCode, timeout) {
        if (!this._request) {
            this._pendingFailure = Array.prototype.slice.call(arguments);
            this._pendingSuccess = null;
            return;
        }
        var args = Array.prototype.slice.call(arguments);
        args.splice(3, 1); // delete 'timeout' arg
        args.unshift(this._request, false, timeout);
        this.reply.apply(this, args);
    },
    
    outRequest: function(runningRequest, success, failure, asyncId) {
        if (asyncId) this.clearAsync(asyncId);
        this._request = runningRequest;
        var res = this._out('request', runningRequest, success, failure);
        if (this._pendingSuccess) {
            this.success.apply(this, this._pendingSuccess);
        } else if (this._pendingFailure) {
            this.failure.apply(this, this._pendingFailure);
        }
        return res;
    },
    
    getRequest: function() {
        return this._request;
    },
    
    outAbortRequest: function(runningRequest) {
        return this._out('abortRequest', runningRequest);
    },

    _doPrepareRunningRequest: function(runningRequest, constRequest, success, failure, scope) {
        var t = this;
        if (this.eventTime <= 0) {
            this.outRequest(runningRequest, this._successClosure, this._failureClosure);
        } else {
            var id = this._asyncCounter++;
            var f = function() {
                t.outRequest(runningRequest, t._successClosure, t._failureClosure, id);
            };
            runningRequest._timeout = window.setTimeout(f, this.eventTime);
            this._pendingAsync.push({id: id, fn: f, rq: runningRequest, timeout: runningRequest._timeout, type: 'event'});
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

