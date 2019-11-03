/* global Amm */

Amm.Remote.ConstRequest = function(options) {
    
    if (!options) return;
    if (options.uri) this._uri = options.uri;
    if (options.method) this._method = options.method;
    if (options.data) this._data = options.data;
    if (options.headers) this._headers = options.headers;
    if (options.misc) this._misc = options.misc;
    
};

Amm.Remote.ConstRequest.METHOD_GET = 'GET';
Amm.Remote.ConstRequest.METHOD_POST = 'POST';
Amm.Remote.ConstRequest.METHOD_PUT = 'PUT';
Amm.Remote.ConstRequest.METHOD_DELETE = 'DELETE';
Amm.Remote.ConstRequest.METHOD_PATCH = 'PATCH';
Amm.Remote.ConstRequest.METHOD_HEAD = 'HEAD';
Amm.Remote.ConstRequest.METHOD_CONNECT = 'CONNECT';
Amm.Remote.ConstRequest.METHOD_OPTIONS = 'OPTIONS';

Amm.Remote.ConstRequest.prototype = {
    
    'ConstRequest': '__INTERFACE__',
    
    _uri: undefined,
    
    _method: undefined,
    
    _data: null,
    
    _headers: undefined,
    
    _misc: undefined,
    
    getUri: function() {
        return this._uri;
    },
    
    getMethod: function() {
        return this._method;
    },
    
    getData: function() {
        return this._data;
    },
    
    getHeaders: function() {
        return this._headers;
    },
    
    getMisc: function() {
        return this._misc;
    },
    
    getJqXhrOptions: function() {
        var res = {};
        if (this._misc && typeof this._misc === 'object') Amm.override(res, this._misc);
        if (this._data) res.data = this._data;
        if (this._headers) res.headers = this._headers;
        if (this._method) res.method = this._method;
        return res;
    },
            
    getAll: function() {
        var res = this.getJqXhrOptions();
        if (this._uri) res.uri = this._uri;
        return res;
    }
    
};
