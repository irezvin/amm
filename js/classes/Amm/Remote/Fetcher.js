/* global Amm */

/**
 * Performs single request at a time.
 * Observes `request` and initiates requests when its' configuration changes.
 * When response is received, sets `response` property and, in case of errors, `error` property.
 */
Amm.Remote.Fetcher = function(options) {
    Amm.WithEvents.call(this, options);
};

/**
 * State of Fetcher when it doesn't have enough information to send request
 * (mostly when getRequestProducer() is null)
 */
Amm.Remote.Fetcher.STATE_CONFIGURING = 'configuring';

/**
 * Fetcher has enough information to send request, but wasn't commanded to do so
 */
Amm.Remote.Fetcher.STATE_IDLE = 'idle';

/**
 * Fetcher is configured to make requests automatically, 
 * but is waiting for Amm to finish bootstrapping to initiate first request
 */
Amm.Remote.Fetcher.STATE_PREINIT = 'preinit';

/**
 * Fetcher is waiting for firstDelay/throttleDelay timeout to initiate the request
 */
Amm.Remote.Fetcher.STATE_STARTED = 'started';

/**
 * Fetcher sent a request to the transport and is waiting for the response
 */
Amm.Remote.Fetcher.STATE_SENT = 'sent';

/**
 * Fetcher received a response from the transport
 */
Amm.Remote.Fetcher.STATE_RECEIVED = 'received';

/**
 * Fetcher received error message from the transport
 */
Amm.Remote.Fetcher.STATE_ERROR = 'error';

/**
 * Never automatically run any requests
 */
Amm.Remote.Fetcher.AUTO_NONE = 0;

/**
 * Start making requests once Amm is bootstrapped
 */
Amm.Remote.Fetcher.AUTO_BOOTSTRAP = 1;

/**
 * Make first request once in STATE_IDLE
 */
Amm.Remote.Fetcher.AUTO_ALWAYS = 2;

Amm.Remote.Fetcher.prototype = {

    'Amm.Remote.Fetcher': '__CLASS__',

    _requestProducer: null,
    
    _requestProducerIsOwn: false,
        
    _response: undefined,

    _state: Amm.Remote.Fetcher.STATE_CONFIGURING,
    
    _error: null,
    
    /**
     * Amm.Remote.Fetcher.AUTO_NONE: this.run() needed to call server.
     * Amm.Remote.Fetcher.AUTO_BOOTSTRAP: any change to this.request initiates
     * new request, but only after Amm is bootstrapped
     * Amm.Remote.Fetcher.AUTO_BOOTSTRAP - change always initiates new request
     */
    _auto: Amm.Remote.Fetcher.AUTO_NONE,
    
    // how much milliseconds we should wait before initiating from request
    _firstDelay: 10,
    
    // how much milliseconds we should wait since requestProducer.outRequestChangeNotify()
    // to initiate new request. Applicable if request already running; 
    // if request isn't running, firstDelay is used
    _throttleDelay: 500,

    _timeout: null,
    
    _waitingForBootstrap: false,
    
    // constRequest that is currently processing
    _constRequest: null,

    _runningRequest: null,
    
    // is set before creating the request
    _starting: 0,
    
    _gotResultOnStart: false,
    
    _prevRequest: null,

    // function that calls this._doRequest()
    _timeoutCallback: null,
    
    _transport: null,

    _poll: false,
    
    run: function() {
        this._doRequest();
    },
    
    setRequestProducer: function(requestProducer) {
        var oldRequestProducer = this._requestProducer;
        if (oldRequestProducer === requestProducer) return;
        if (oldRequestProducer) {
            oldRequestProducer.unsubscribe('requestChangeNotify', this._requestChangeNotify, this);
            if (this._requestProducerIsOwn) oldRequestProducer.cleanup();
        }
        if (typeof requestProducer === 'string') requestProducer = new Amm.Remote.RequestProducer(requestProducer);
        if (!requestProducer) requestProducer = null;
        else if (typeof requestProducer === 'object' && !Amm.getClass(requestProducer)) {
            requestProducer = Amm.constructInstance(requestProducer, 'Amm.Remote.RequestProducer', undefined, false, 'RequestProvider');
            this._requestProducerIsOwn = true;
        } else {
            Amm.meetsRequirements(requestProducer, 'RequestProvider', 'request');
        }
        this._requestProducer = requestProducer;
        if (requestProducer) {
            requestProducer.subscribe('requestChangeNotify', this._requestChangeNotify, this);
        }
        this.setConstRequest(requestProducer.produceRequest());
        this.outRequestProducerChange(requestProducer, oldRequestProducer);
        this._updateState();
        return true;
    },

    getRequestProducer: function() { return this._requestProducer; },
    
    outRequestProducerChange: function(requestProducer, oldRequestProducer) {
        this._out('requestProducerChange', requestProducer, oldRequestProducer);
    },
    
    _requestChangeNotify: function() {
        var constRequest = this._requestProducer.produceRequest();
        this.setConstRequest(constRequest);
    },

    setConstRequest: function(constRequest) {
        if (!constRequest) constRequest = null;
        var oldConstRequest = this._constRequest;
        if (oldConstRequest === constRequest) return;
        this._constRequest = constRequest;
        this.outConstRequestChange(constRequest, oldConstRequest);
        this._scheduleAutoRequest();
        this._updateState();
        return true;
    },

    getConstRequest: function() { return this._constRequest; },

    outConstRequestChange: function(constRequest, oldConstRequest) {
        return this._out('constRequestChange', constRequest, oldConstRequest);
    },

    setTransport: function(transport) {
        if (!transport) transport = null;
        else if (typeof transport !== 'object' || !Amm.getClass(transport)) {
            transport = Amm.constructInstance(transport, 'Amm.Remote.Transport');
        } else Amm.is(transport, 'Amm.Remote.Transport', 'transport');
        var oldTransport = this._transport;
        if (oldTransport === transport) return;
        this._transport = transport;
        this.outTransportChange(transport, oldTransport);
        return true;
    },

    outTransportChange: function(transport, oldTransport) {
        return this._out('transportChange', transport, oldTransport);
    },

    getTransport: function() { return this._transport; },

    _doGetTransport: function() {
        return this._transport || Amm.Remote.Transport.getDefault();
    },

    _runOnBootstrap: function() {
        if (!this._waitingForBootstrap) return;
        this._scheduleAutoRequest();
        this._updateState();
    },
    
    _scheduleAutoRequest: function(polling) {
        if (!this._auto) {
            return;
        }
        if (this._auto === Amm.Remote.Fetcher.AUTO_BOOTSTRAP && !Amm.getBootstrapped()) {
            Amm.getRoot().subscribe('bootstrap', this._runOnBootstrap, this);
            this._waitingForBootstrap = true;
            return;
        }
        if (!this._constRequest) {
            return;
        }
        var delay = this._runningRequest || polling? this._throttleDelay : this._firstDelay;
        var t = this;
        if (this._timeout) window.clearTimeout(this._timeout);
        if (this._runningRequest) {
            this._abort();
        }
        if (delay > 0) {
            if (!this._timeoutCallback) {
                this._timeoutCallback = function() {
                    t._doRequest();
                };
            };
            this._timeout = window.setTimeout(this._timeoutCallback, delay);
        } else {
            this._timeout = null;
            this._doRequest();
        }
    },
    
    _abort: function() {
        if (!this._runningRequest) return;
        this._prevRequest = this._runningRequest;
        this._runningRequest = null;
        this._prevRequest.abort();
    },
    
    _doRequest: function() {
        if (!this._constRequest) {
             throw Error("Cannot _doRequest() without _constRequest");
        }
        this._waitingForBootstrap = false;
        // cancel old request
        if (this._runningRequest) this._abort();
        if (this._timeout) {
            window.clearTimeout(this._timeout);
            this._timeout = null;
        }
        this._starting++;
        this._runningRequest = this._doGetTransport().makeRequest(this._constRequest, this._requestDone, this._requestFail, this);
        this._starting--;
        this.setError(null);
        if (this._gotResultOnStart) {
            this._prevRequest = this._runningRequest;
            this._runningRequest = null;
        }
        this._updateState();
        return;
    },
    
    _requestDone: function(data, textStatus) {
        if (!this._runningRequest && !this._starting) return; // aborted - do not process
        if (this._runningRequest) {
            this._prevRequest = this._runningRequest;
            this._runningRequest = null;
        }
        this._parseResponse(data);
    },
    
    _requestFail: function(textStatus, errorThrown, httpCode) {
        if (!this._runningRequest && !this._starting) return; // aborted - do not process
        if (this._runningRequest) {
            this._prevRequest = this._runningRequest;
            this._runningRequest = null;
        }
        this.setError(textStatus);
    },
    
    _setState: function(state) {
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

    _parseResponse: function(response) {
        // TODO: use translator, filters etc
        //console.log(response);
        this.setResponse(response);
        return true;
    },

    /**
     * Note that setResponse() aborts a running request (if it was running) and sets error to NULL
     */
    setResponse: function(response) {
        var oldResponse = this._response;
        if (oldResponse === response) return;
        this._response = response;
        if (this._runningRequest) this._abort();
        if (this._starting) this._gotResultOnStart = true;
        this._updateState();
        this.outResponseChange(response, oldResponse);
        return true;
    },

    getResponse: function() { return this._response; },

    outResponseChange: function(response, oldResponse) {
        this._out('responseChange', response, oldResponse);
    },
    
    /**
     * Note that setError() to non-false value sets state to STATE_ERROR
     */
    setError: function(error) {
        var oldError = this._error;
        if (oldError === error) return;
        if (error) {
            if (this._runningRequest) {
                this._abort();
            }
            this.setResponse(undefined);
        }
        this._error = error;
        if (this._starting) this._gotResultOnStart = true;        
        this._updateState();
        this.outErrorChange(error, oldError);
        return true;
    },

    getError: function() { return this._error; },

    outErrorChange: function(error, oldError) {
        this._out('errorChange', error, oldError);
    },

    setThrottleDelay: function(throttleDelay) {
        var oldThrottleDelay = this._throttleDelay;
        if (oldThrottleDelay === throttleDelay) return;
        this._throttleDelay = throttleDelay;
        this.outThrottleDelayChange(throttleDelay, oldThrottleDelay);
        return true;
    },

    getThrottleDelay: function() { return this._throttleDelay; },

    outThrottleDelayChange: function(throttleDelay, oldThrottleDelay) {
        this._out('throttleDelayChange', throttleDelay, oldThrottleDelay);
    },
    
    setFirstDelay: function(firstDelay) {
        var oldFirstDelay = this._firstDelay;
        if (oldFirstDelay === firstDelay) return;
        this._firstDelay = firstDelay;
        this.outFirstDelayChange(firstDelay, oldFirstDelay);
        return true;
    },

    getFirstDelay: function() { return this._firstDelay; },

    outFirstDelayChange: function(firstDelay, oldFirstDelay) {
        this._out('firstDelayChange', firstDelay, oldFirstDelay);
    },

    setAuto: function(auto) {
        var oldAuto = this._auto;
        if (oldAuto === auto) return;
        this._auto = auto;
        this.outAutoChange(auto, oldAuto);
        if (auto && this._constRequest) this._scheduleAutoRequest();
        return true;
    },

    getAuto: function() { return this._auto; },

    outAutoChange: function(auto, oldAuto) {
        this._out('autoChange', auto, oldAuto);
    },
    
    cleanup: function() {
        this.reset();
        if (this._requestProducer && this._requestProducerIsOwn && this._requestProducer.cleanup) {
            this._requestProducer.cleanup();
            this._requestProducer = null;
        }
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    reset: function() {
        if (this._poll) this.setPoll(false);
        if (this._runningRequest) this._abort();
        if (this._timeout) {
            window.clearTimeout(this._timeout);
            this._timeout = null;
        }
        this.setResponse(undefined);
        this._updateState();
    },
    
    // single place to update state information. Also, if polling enabled, will schedule next request
    _updateState: function() {
        var newState;
        if (this._runningRequest) {
            newState = Amm.Remote.Fetcher.STATE_SENT;
        } else if (this._timeout) {
            newState = Amm.Remote.Fetcher.STATE_STARTED;
        } else if (this._error) {
            newState = Amm.Remote.Fetcher.STATE_ERROR;
        } else if (this._response !== undefined) {
            newState = Amm.Remote.Fetcher.STATE_RECEIVED;
        } else if (!this._constRequest) {
            newState = Amm.Remote.Fetcher.STATE_CONFIGURING;
        } else if (this._waitingForBootstrap) {
            newState = Amm.Remote.Fetcher.STATE_PREINIT;
        } else {
            newState = Amm.Remote.Fetcher.STATE_IDLE;
        }
        if (this._poll && (
                newState === Amm.Remote.Fetcher.STATE_IDLE 
                || newState === Amm.Remote.Fetcher.STATE_RECEIVED 
                || newState === Amm.Remote.Fetcher.STATE_ERROR
        ))  {
            this._scheduleAutoRequest(true);
        }
        this._setState(newState);
    },
    
    setPoll: function(poll) {
        poll = !!poll;
        var oldPoll = this._poll;
        if (oldPoll === poll) return;
        this._poll = poll;
        this.outPollChange(poll, oldPoll);
        if (poll) this._scheduleAutoRequest();
        return true;
    },

    getPoll: function() { return this._poll; },

    outPollChange: function(poll, oldPoll) {
        this._out('pollChange', poll, oldPoll);
    },
    

};

Amm.extend(Amm.Remote.Fetcher, Amm.WithEvents);