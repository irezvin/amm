/* global Amm */

Amm.Remote.Transport = function(options) {
    
    Amm.init(this, options);
    
};

Amm.Remote.Transport._default = null;

Amm.Remote.Transport.getDefault = function() {
    if (!this._default) this._default = new Amm.Remote.Transport.JqXhr();
    return this._default;
};

Amm.Remote.Transport.setDefault = function(defaultTransport) {
    if (!defaultTransport) defaultTransport = null;
    else Amm.is(defaultTransport, 'Amm.Remote.Transport', 'defaultTransport');
    this._default = defaultTransport;
};


Amm.Remote.Transport.prototype = {
    
    'Amm.Remote.Transport': '__CLASS__',
    
    _history: null,

    _historySize: null,

    setHistorySize: function(historySize) {
        var oldHistorySize = this._historySize;
        if (oldHistorySize === historySize) return;
        this._historySize = historySize;
        if (!this._historySize) {
            this._history = null;
            return true;
        }
        if (!this._history) this._history = [];
        else if (this._history.length > this._historySize) {
            this._history.splice(this._historySize, this._history.length - this._historySize);
        }
        return true;
    },
    
    getHistorySize: function() { return this._historySize; },

    getHistory: function() { this._history? [].concat(this._history) : []; },
    
    _push: function(request) {
        this._history.unshift(request);
        if (this._history.length > this._historySize) this._history.pop();
    },
    
    /**
     * @returns {Amm.Remote.RunningRequest}
     */
    makeRequest: function(constRequest, success, failure, scope) {
        var runningRequest = new Amm.Remote.RunningRequest(constRequest, success, failure, scope, this);
        this._doPrepareRunningRequest(runningRequest, constRequest, success, failure, scope);
        if (this._historySize) this._push(runningRequest);
        return runningRequest;
    },
    
    abortRunningRequest: function(runningRequest) {
        this._doAbortRunningRequest(runningRequest);
    },
    
    _doPrepareRunningRequest: function(runningRequest, constRequest, success, failure, scope) {
    }
    
};

