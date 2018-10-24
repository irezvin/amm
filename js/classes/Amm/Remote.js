/* global Amm */

Amm.Remote = function(options) {
    Amm.WithEvents.call(this, options);
};

Amm.Remote.METHOD_GET = 'GET';
Amm.Remote.METHOD_POST = 'POST';
Amm.Remote.METHOD_PUT = 'PUT';
Amm.Remote.METHOD_DELETE = 'DELETE';

Amm.Remote.STATE_INCOMPLETE = 'incomplete';
Amm.Remote.STATE_IDLE = 'idle';
Amm.Remote.STATE_RUNNING = 'running';
Amm.Remote.STATE_ERROR = 'error';
Amm.Remote.STATE_RECEIVED = 'received';


Amm.Remote.prototype = {

    'Amm.Remote': '__CLASS__', 
    
    _url: null,

    _args: null,

    // GET, POST etc
    _method: Amm.Remote.METHOD_GET,
    
    _state: null,
        
    _response: null,
    
    _error: null,
    
    _running: false,

    // how much milliseconds should pass from change of remote-related properties 
    // to actually begin remote to the server
    _throttle: 0,

    setUrl: function(url) {
        var oldUrl = this._url;
        if (oldUrl === url) return;
        this._url = url;
        this.outUrlChange(url, oldUrl);
        return true;
    },

    getUrl: function() { return this._url; },

    outUrlChange: function(url, oldUrl) {
        this._out('urlChange', url, oldUrl);
    },

    setArgs: function(args) {
        var oldArgs = this._args;
        if (oldArgs === args) return;
        this._args = args;
        this.outArgsChange(args, oldArgs);
        return true;
    },

    getArgs: function() { return this._args; },

    outArgsChange: function(args, oldArgs) {
        this._out('argsChange', args, oldArgs);
    },

    setMethod: function(method) {
        var oldMethod = this._method;
        if (oldMethod === method) return;
        this._method = method;
        this.outMethodChange(method, oldMethod);
        return true;
    },

    getMethod: function() { return this._method; },

    outMethodChange: function(method, oldMethod) {
        this._out('methodChange', method, oldMethod);
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
        this._out('stateChange', state, oldState);
    },

    setResponse: function(response) {
        var oldResponse = this._response;
        if (oldResponse === response) return;
        this._response = response;
        this.outResponseChange(response, oldResponse);
        return true;
    },

    getResponse: function() { return this._response; },

    outResponseChange: function(response, oldResponse) {
        this._out('responseChange', response, oldResponse);
    },
    
    setError: function(error) {
        var oldError = this._error;
        if (oldError === error) return;
        this._error = error;
        this.outErrorChange(error, oldError);
        return true;
    },

    getError: function() { return this._error; },

    outErrorChange: function(error, oldError) {
        this._out('errorChange', error, oldError);
    },

    setRunning: function(running) {
        var oldRunning = this._running;
        if (oldRunning === running) return;
        this._running = running;
        this.outRunningChange(running, oldRunning);
        return true;
    },

    getRunning: function() { return this._running; },

    outRunningChange: function(running, oldRunning) {
        this._out('runningChange', running, oldRunning);
    },

    setThrottle: function(throttle) {
        var oldThrottle = this._throttle;
        if (oldThrottle === throttle) return;
        this._throttle = throttle;
        this.outThrottleChange(throttle, oldThrottle);
        return true;
    },

    getThrottle: function() { return this._throttle; },

    outThrottleChange: function(throttle, oldThrottle) {
        this._out('throttleChange', throttle, oldThrottle);
    },



};

Amm.extend(Amm.Remote, Amm.WithEvents);

