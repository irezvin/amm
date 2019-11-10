/* global Amm */

Amm.Remote.RequestProducer = function(options) {
    this._data = {};
    Amm.Remote.Uri.call(this, options);
};

Amm.Remote.RequestProducer._allowedMethods = {
    'GET': 'Amm.Remote.ConstRequest.METHOD_GET',
    'POST': 'Amm.Remote.ConstRequest.METHOD_POST',
    'PUT': 'Amm.Remote.ConstRequest.METHOD_PUT',
    'DELETE': 'Amm.Remote.ConstRequest.METHOD_DELETE',
    'PATCH': 'Amm.Remote.ConstRequest.METHOD_PATCH',
    'HEAD': 'Amm.Remote.ConstRequest.METHOD_HEAD',
    'CONNECT': 'Amm.Remote.ConstRequest.METHOD_CONNECT',
    'OPTIONS': 'Amm.Remote.ConstRequest.METHOD_OPTIONS',
},


Amm.Remote.RequestProducer.prototype = {

    'Amm.Remote.RequestProducer': '__CLASS__',

    _method: 'GET',
    
    _data: null,

    setMethod: function(method) {
        method = ('' + method).toUpperCase();
        if (!(method in Amm.Remote.RequestProducer._allowedMethods)) {
            throw Error("Invalid 'method' value; allowed values are " 
                + Amm.keys(Amm.Remote.RequestProducer._allowedMethods).join('|'));
        }
        var oldMethod = this._method;
        if (oldMethod === method) return;
        this._method = method;
        this.outMethodChange(method, oldMethod);
        this.outRequestChangeNotify();
        return true;
    },

    getMethod: function() { return this._method; },

    outMethodChange: function(method, oldMethod) {
        this._out('methodChange', method, oldMethod);
    },
    
    produceRequest: function() {
        var options = {
            uri: this.getUri(),
            method: this._method
        };
        if (this._data) options.data = this._data;
        return new Amm.Remote.ConstRequest(options);
    },
    
    setData: function(data, path) {
        var oldData;
        if (path === undefined) {
            if (data === undefined || data === false) data = null;
            if (data === this._data) return;
            oldData = this._data? Amm.override({}, this._data) : this._data;
            if (JSON.stringify(oldData) === JSON.stringify(data)) return;
            this._data = data;
        } else {
            if ((data === undefined || data === null) && this._data === null) return; // unset in empty hash has no effect
            var arrPath = this._pathToArray(path);
            var c = {};
            oldData = this._data? Amm.override({}, this._data) : this._data;
            if (!this._data) this._data = {};
            this._setByPath(this._data, arrPath, data, c);
            var hasKeys = false;
            for (var key in this._data) if (this._data.hasOwnProperty(key)) {
                hasKeys = true;
            }
            if (!hasKeys) this._data = null;
            if (this._data === oldData) return;
            if (!c.changed) return;
        }
        this.outDataChange(data, oldData);
        this.outRequestChangeNotify();
        return true;
    },
    
    getData: function(path) {
        if (path === undefined) return this._data;
        if (!this._data) return undefined;
        var arrPath = this._pathToArray(path);
        return this._getByPath(this._data, arrPath);
    },
    
    outDataChange: function(data, oldData) {
        return this._out('dataChange', data, oldData);
    }

};

Amm.extend(Amm.Remote.RequestProducer, Amm.Remote.Uri);

