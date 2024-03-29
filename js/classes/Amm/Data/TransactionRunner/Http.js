/* global Amm */

Amm.Data.TransactionRunner.Http = function(options) {
    Amm.Data.Transaction.call(this, options);
};

Amm.Data.TransactionRunner.Http.DEFAULT_METHOD_MAP = {
    'load': 'GET',
    'list': 'GET',
    'offset': 'GET',
    '': 'POST' // default method
};

Amm.Data.TransactionRunner.Http.prototype = {

    'Amm.Data.TransactionRunner.Http': '__CLASS__',
    
    /**
     * @type {Amm.Remote.RequestProducer}
     */
    _requestProducer: null,
    
    /**
     * @type string
     */
    uri: null,
    
    /**
     * Apply additional values to request' URI (uri parts such
     * as SCHEME, USER, PASSWORD, PATH and so on accepted)
     * @type object
     */
    uriOverrides: null,
    
    /**
     * Apply additional values to request' data
     * @type object 
     */
    dataOverrides: null,
    
    method: null,
    
    methodMap: null,
    
    typePath: null,
    
    /**
     * If typeToUri === true and typePath is empty string (''), 
     * type will be appended to URI after the slash (i.e. example.com/path/create/)
     * @type Boolean
     */
    typeToUri: true,
    
    typeDecorator: null,
    
    /**
     * @type string
     */
    keyPath: 'id',
    
    /**
     * If keyToUri === true and keyPath is null or empty, key will be appended to URI after the slash
     * @type Boolean
     */
    keyToUri: true,
    
    dataPath: null,
    
    dataToUri: false,
    
    /**
     * If this key is contained in JSON response, 
     * it will be put to transaction result' `error` property
     * @type string
     */
    responseErrorPath: 'error',
    
    /**
     * If this key is contained in JSON response, 
     * it will be put to transaction result' `errorData` property.
     * If it is the same as responseDataPath, this will be done 
     * only to unsuccessful results.
     * 
     * @type string
     */
    responseErrorDataPath: 'errorData',
    
    /**
     * If this key is contained in JSON response, 
     * it will be put to transaction result' `data` property
     * If it is the same as responseErrorDataPath, this will be done 
     * only successful results.
     * 
     * @type string
     */
    responseDataPath: 'data',
    
    /**
     * Result will be considered successful only if this key 
     * is contained in JSON response and is non-false
     * @type string|null
     */
    responseSuccessPath: null,
    
    /**
     * Which HTTP error codes are considered as 'server', 
     * not 'http' errors. In case of soft HTTP error, when server
     * text cannot be parsed, it will be used as result error message
     * unless error descriptions are provided
     * 
     * When object is provided, it should be {httpCode: error description}
     * 
     * @type int|array|object
     */
    softErrorCodes: null,
    
    _unparsedResponseClass: 'Amm.Data.HttpResponse',
    
    // intentionally same shared instance
    _transport: new Amm.Remote.Transport.JqXhr,
    
    _responseDecorator: null,
    
    _runningRequest: null,
    
    setTransport: function(transport) {
        this._transport = Amm.constructInstance(transport, 'Amm.Remote.Transport');
    },
    
    /**
     * @returns {Amm.Remote.Transport}
     */
    getTransport: function() {
        return this._transport;
    },
    
    createRequestProducer: function() {
        var outRequestProducer = {prototype: null}, proto;
        this.outRequestProducerPrototype(outRequestProducer, this);
        if (outRequestProducer.prototype) {
            proto = outRequestProducer.prototype;
        }
        if (!proto) proto = this.createDefaultRequestProducer();
        return Amm.constructInstance(proto, 'Amm.Remote.RequestProducer');        
    },
    
    calcPayload: function() {
        return this._transaction.calcPayload();
    },
    
    createDefaultRequestProducer: function() {
        var payload = this.calcPayload();
        var res = new Amm.Remote.RequestProducer({
            uri: this.uri,
            uriOverrides: this.uriOverrides,
            dataOverrides: this.dataOverrides
        });
        var method = this.getAppliedMethod();
        if (payload.data) {
            var d = Amm.overrideRecursive({}, payload.data);
            if (!this.dataPath) res.setDataOverrides(payload.data);
            else {
                res.setData(d, this.dataPath);
            }
        }
        var other = {}, hasOther = false;
        for (var i in payload) if (payload.hasOwnProperty(i)) {
            if (i === 'key' || i === 'data') continue;
            if (payload[i] === null) continue;
            other[i] = payload[i];
            hasOther = true;
        }
        if (hasOther) {
            res.setUriOverrides(other);
        }
        var type = Amm.Decorator.d(this._transaction.getType(), this, 'typeDecorator');
        res.setMethod(method);
        if (type) {
            if (this.typeToUri)  {
                if (this.typePath === '') {
                    res.setUri(res.getUri(Amm.Remote.Uri.PART_PATH).replace(/\/$/g, '') + '/' + type, Amm.Remote.Uri.PART_PATH);
                } else if (this.typePath) {
                    res.setUri(type, this.typePath);
                }
            } else if (this.typePath) {
                res.setData(type, this.typePath);
            }
        }
        if (payload.key !== null) {
            if (this.keyToUri) {
                // no key path => append key
                if (!this.keyPath) res.setUri(res.getUri(Amm.Remote.Uri.PART_PATH).replace(/\/$/g, '') + '/' + payload.key, Amm.Remote.Uri.PART_PATH);
                else {
                    res.setUri(payload.key, this.keyPath);
                }
            } else {
                res.setData(payload.key, this.keyPath);
            }
        }
        // TODO: action path
        return res;
    },
    
    /**
     * @returns HTTP method based on this._type value
     */
    getAppliedMethod: function() {
        var map = this.methodMap || Amm.Data.TransactionRunner.Http.DEFAULT_METHOD_MAP;
        var res = map[this._transaction.getType()] || map[''];
        return res;
    },
    
    run: function() {
        var producer = this.createRequestProducer();
        var constRequest = producer.produceRequest();
        this._runningRequest = this.getTransport().makeRequest(constRequest, this._handleSuccess, this._handleFailure, this);
    },
    
    _handleSuccess: function(data, textStatus, jqXhr) {
        if (this._transaction.getState() !== Amm.Data.Transaction.STATE_RUNNING) return;
        var headers = {}, statusCode = 200, responseText = "";
        if (typeof jqXhr === "object") {
            if (typeof (jqXhr.getAllResponseHeaders) === "function") {
                headers = Amm.Remote.Transport.JqXhr.parseResponseHeaders(jqXhr.getAllResponseHeaders());
            }
            if ('statusCode' in jqXhr) statusCode = jqXhr.statusCode;
            if ('responseText' in jqXhr) responseText = jqXhr.responseText;
            else if (typeof data === "string") responseText = data;
        }
        var resp = new Amm.Data.HttpResponse({
            rawContent: responseText,
            parsedContent: data,
            httpHeaders: headers,
            httpCode: statusCode
        });
        this._transaction.setUnparsedResponse(resp);
    },
    
    _handleFailure: function(textStatus, errorThrown, httpCode, jqXhr) {
        if (this._transaction.getState() !== Amm.Data.Transaction.STATE_RUNNING) return;
        var headers = {}, statusCode = httpCode, responseText = "";
        if (typeof jqXhr === "object") {
            if (typeof (jqXhr.getAllResponseHeaders) === "function") {
                headers = Amm.Remote.Transport.JqXhr.parseResponseHeaders(jqXhr.getAllResponseHeaders());
            }
            if ('statusCode' in jqXhr) statusCode = jqXhr.statusCode;
            if ('responseText' in jqXhr) responseText = jqXhr.responseText;
        }
        this._transaction.setUnparsedResponse(new Amm.Data.HttpResponse({
            isError: true,
            errorText: errorThrown,
            rawContent: responseText,
            parsedContent: null,
            httpHeaders: headers,
            httpCode: statusCode
        }));
    },
    
    /**
     * Event handlers must set requestProducer.proto to consider result successful
     * 
     * @param {Amm.Data.TransactionRunner.Http} transaction This transaction
     * @param {object} requestProducerPrototype {res: null} - change prototype to return
     */
    outRequestProducerPrototype: function(outRequestProducer, transaction) {
        return this._out('requestProducerPrototype', outRequestProducer, transaction);
    },
    
    // @TODO: support other parsedContent than JSON (XML?)
    parse: function(httpResponse) {
        var res;
        
        if (this._responseDecorator) {
            res = this._applyDataDecorator(httpResponse);
            if (res) return res;
        }
        
        res = {
        };
        
        var softError = null;
        
        if (httpResponse.isError && !httpResponse.httpCode) {
        
            // check for local error
        
            return {
                errorType: Amm.Data.TransactionResult.ERROR_TYPE_CLIENT,
                error: httpResponse.errorText
            };
            
        } else if (httpResponse.isError) {
            
            // check "soft" http error
            
            if (this.softErrorCodes instanceof Array) {
                if (Amm.Array.indexOf(httpResponse.httpCode, this.softErrorCodes) >= 0)
                    softError = httpResponse.errorText;
            } else if (this.softErrorCodes && this.softErrorCodes[httpResponse.httpCode]) {
                softError = this.softErrorCodes[httpResponse.httpCode];
            }
            
            if (softError) {
                res.errorType = Amm.Data.TransactionResult.ERROR_TYPE_SERVER;
                res.error = softError;
            } else {
                res.errorType = Amm.Data.TransactionResult.ERROR_TYPE_HTTP;
                res.error = httpResponse.errorText;
                // we won't search structured data in HTTP error
                return res;
            }
            
        }
        
        // check if result contains error
        
        var responseHasError = false;
        var isParsed = (httpResponse.parsedContent && typeof httpResponse.parsedContent === 'object');
        
        if (!isParsed) { // check if unparsable result is ok
            
            if (softError) return res; // soft error - don't do anything
            
            if (this.responseDataPath || this.responseSuccessPath)
                throw Error("Cannot parse the response");
            
            // assume success
            return res;
            
        }
        
        // result data is parsed
        
        if (softError) {
            if (this.responseErrorDataPath) {
                res.errorData = Amm.Util.getByPath(httpResponse.parsedContent,
                    this.responseErrorDataPath);
            }
            return res;
        }
        
        if (this.responseSuccessPath) {
            responseHasError = !Amm.Util.getByPath(httpResponse.parsedContent,
                    this.responseSuccessPath);
        } else if (this.responseErrorPath) {
            responseHasError = Amm.Util.getByPath(httpResponse.parsedContent,
                    this.responseErrorPath);
            if (responseHasError !== undefined) res.error = responseHasError;
        }
        
        if (this.responseErrorDataPath && (responseHasError || (this.responseErrorDataPath !== this.responseDataPath))) {
            res.errorData = Amm.Util.getByPath(httpResponse.parsedContent,
                    this.responseErrorDataPath, null);
        }
        
        if (res.errorData || responseHasError)  {
            res.errorType = Amm.Data.TransactionResult.ERROR_TYPE_SERVER;
        }
        
        if ((!res.errorType || (this.responseErrorDataPath !== this.responseDataPath))) {
            if (this.responseDataPath !== null) {
                res.data = Amm.Util.getByPath(httpResponse.parsedContent,
                        this.responseDataPath, null);
            } else {
                res.data = httpResponse.parsedContent;
            }
        }
            
        return res;
    },
    
    _applyDataDecorator: function(unparsedResponse) {
        var res = this._responseDecorator.decorate(unparsedResponse);
        if (res && typeof res === 'object') {
            return Amm.constructInstance(res, 'Amm.Data.TransactionResult');
        }
    },
    
    _cancelDefault: function() {
        if (!this._runningRequest) {
            throw Error("Assertion: _runningRequest during _cancelDefault()");
        }
        this.getTransport().abortRunningRequest(this._runningRequest);
    },
    
    setResponseDecorator: function(responseDecorator) {
        if (!responseDecorator) {
            this._responseDecorator = null;
            return;
        }
        this._responseDecorator = Amm.constructInstance(responseDecorator, 'Amm.Decorator.Data');
    }
    
    
};

Amm.extend(Amm.Data.TransactionRunner.Http, Amm.Data.TransactionRunner);

