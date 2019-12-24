/* global Amm */

Amm.Remote.Uri = function(options) {
    if (options === null || options === undefined) {
        options = '';
    }
    if (typeof options === 'string') {
        options = {uri: options};
    } else if (options && options['Amm.Remote.Uri']) {
        this._clone(options);
        options = undefined;
    } else if (options && typeof[options.toString] === 'function') {
        options = {uri: options.toString()};
    } else {
        if (options.uri) {
            options = Amm.override({}, options);
            this.setUri(options.uri);
            delete options.uri;
        }
    }
    Amm.WithEvents.call(this, options);
};

Amm.Remote.Uri.PART_SCHEME = 'SCHEME';
Amm.Remote.Uri.PART_USER = 'USER';
Amm.Remote.Uri.PART_PASSWORD = 'PASSWORD';
Amm.Remote.Uri.PART_HOST = 'HOST';
Amm.Remote.Uri.PART_PORT = 'PORT';
Amm.Remote.Uri.PART_PATH = 'PATH';
Amm.Remote.Uri.PART_QUERY = 'QUERY';
Amm.Remote.Uri.PART_FRAGMENT = 'FRAGMENT';

Amm.Remote.Uri._current = null;

Amm.Remote.Uri.getCurrent = function() {
    if (Amm.Remote.Uri._current) {
        return new Amm.Remote.Uri(Amm.Remote.Uri._current);
    } 
    if (window.location && window.location.href) {
        return new Amm.Remote.Uri(window.location.href);
    }
};

Amm.Remote.Uri.setCurrent = function(currentUri) {
    if (currentUri) Amm.Remote.Uri._current = new Amm.Remote.Uri('' + currentUri);
    else Amm.Remote.Uri._current = null;
};

Amm.Remote.Uri._const = {
    
    'SCHEME': '_scheme',
    'USER': '_user',
    'PASSWORD': '_pass',
    'HOST': '_host',
    'PORT': '_port',
    'PATH': '_path',
    'QUERY': '_query',
    'FRAGMENT': '_fragment'
    
};

Amm.Remote.Uri.prototype = {

    'Amm.Remote.Uri': '__CLASS__', 
    
    'RequestProvider': '__INTERFACE__',

    _scheme: null,

    _user: null,

    _pass: null,

    _host: null,

    _port: null,

    _path: null,
    
    _query: null,

    _fragment: null,
    
    _uri: null,
    
    _updateLevel: 0,
    
    _oldUri: null,
    
    _strQuery: null,

    setUri: function(uri, part) {
        if (part === undefined || part === null || part === '') {
            if (uri && uri['Amm.Remote.Uri']) {
                this._clone(uri);
            } else {
                this._parse(uri);
            }
            return;
        }
        if (Amm.Remote.Uri._const[part]) {
            this.beginUpdate();
            if (part === 'QUERY' && typeof uri !== 'object') {
                this._strQuery = uri || '';
                this._query = this._parseQuery(uri);
            }
            else this[Amm.Remote.Uri._const[part]] = '' + uri;
            this.endUpdate();
            return;
        }
        this.beginUpdate();
        var c = {};
        this._query = Amm.Util.setByPath(this._query, this._pathToArray(part), uri, c);
        if (c.changed) this._strQuery = null;
        this.endUpdate();
    },
    
    getUri: function(part, asString) {
        if (!part) {
            if (this._uri !== null) return this._uri;
            return this._build();
        }
        if (asString && part === Amm.Remote.Uri.PART_QUERY) {
            if (this._strQuery === null) {
                this._strQuery = this._buildQuery(this._query, '', true);
            }
            return this._strQuery;
        }
        if (Amm.Remote.Uri._const[part]) return this[Amm.Remote.Uri._const[part]];
        return Amm.Util.getByPath(this._query, this._pathToArray(part));
    },
    
    _clone: function(otherUri) {
        if (this._subscribers) this.beginUpdate();
        for (var i in Amm.Remote.Uri._const) {
            if (Amm.Remote.Uri._const.hasOwnProperty(i)) {
                this[Amm.Remote.Uri._const[i]] = otherUri[Amm.Remote.Uri._const[i]];
            }
            this._strQuery = otherUri._strQuery;
            this._uri = null;
        }
        if (this._subscribers) this.endUpdate();
    },
    
    outRequestChangeNotify: function() {
        return this._out('requestChangeNotify', this);
    },
    
    outUriChange: function(uri, oldUri) {
        return this._out('uriChange', uri, oldUri);
    },
    
    produceRequest: function() {
        return new Amm.Remote.ConstRequest({
            uri: this.getUri(),
            method: Amm.Remote.ConstRequest.METHOD_GET
        });
    },
    
    beginUpdate: function() {
        if (!this._updateLevel) {
            this._oldUri = this.getUri();
        }
        this._updateLevel++;
    },
    
    endUpdate: function() {
        if (!this._updateLevel) {
            throw Error("call to endUpdate() without prior beginUpdate()");
        }
        this._updateLevel--;
        if (this._updateLevel) return;
        var newUri = this._build(), oldUri = this._oldUri;
        this._oldUri = null;
        if (newUri !== oldUri) {
            this.outUriChange(newUri, oldUri);
            this.outRequestChangeNotify();
        }
    },
    
    _isSimpleNumArray: function(data, paramName) {
        if (!(data instanceof Array)) return false;
        var res = '';
        for (var i = 0, l = data.length; i < l; i++) {
            if (!(i in data) || data[i] === undefined || typeof data[i] === 'object') return false;
            res += '&' + paramName + '[]=' + encodeURIComponent(data[i]);
        }
        return res;
    },
    
    _buildQuery: function(data, paramName, stripLeadingAmpersand) {
        var res = '', i, n;
        if (data === undefined) return '';
        if ((n = this._isSimpleNumArray(data, paramName)) !== false) {
            res = n;
        } else if (data instanceof Array) {
        	if (data.length) {
	            for (i = 0; i < data.length; i++) {
                        res = res + this._buildQuery(data[i], paramName? paramName + '[' + i + ']' : i);
	            }
        	} else {
                    res = '&' + paramName + '=';
        	}
        } else {
            if ((typeof data) === 'object') {
                for (i in data) if (data.hasOwnProperty(i)) {
                    res = res + this._buildQuery(data[i], paramName? paramName + '[' + i + ']' : i);
                }
            } else {
                res = '&' + paramName + '=' + encodeURIComponent(data);
            }
        }
        if (stripLeadingAmpersand && res.length) res = res.slice(1);
        return res;
    },
    
    _parseQuery: function(string, delim, eq) {
        if (string === null || string === undefined) return null;
        
        if (!string.length) return {};
    	if (delim === undefined) delim = '&';
    	if (eq === undefined) eq = '=';
    	
    	var pairs = string.split(delim), l = pairs.length, res = [];
    	for (var i = 0; i < l; i++) {
            var nameVal = pairs[i].split(eq, 2), path = nameVal[0].replace(']', '');
            path = path.replace(/\]/g, '').split('[');
            if (nameVal.length < 2) nameVal.push('');
            res = Amm.Util.setByPath(res, path, nameVal[1]);
    	}
    	return res;
    },
    
    _pathToArray: function(string) { 
        if (string instanceof Array) return string;
        return string.replace(/\]/g, '').split('[');
    },
    
    _arrayToPath: function(array) {
        var res = array;
        if (array instanceof Array) res = array.length > 1? array.join('][') + ']' : array[0];
        return res;
    },
            
    toString: function() {
        return this.getUri();
    },
    
    _parse: function(strUri) {
        strUri = '' + strUri;
        // need slashes to parse mailto:
        if (strUri[0] === 'm' && strUri[6] === ':') strUri = strUri.replace(/^mailto:/, 'mailto://'); 
        this.beginUpdate();
        // Credit for regular expression and keys length: JSURI project - http://code.google.com/p/jsuri/ 
        // (modified so host isn't required, to properly handle relative URIs)
        var regex = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?(((\/?(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
        var keys = [
            ".source",
            "_scheme",
            ".authority",
            ".userInfo",
            "_user",
            "_pass",
            "_host",
            "_port",
            ".relative",
            "_path",
            ".directory",
            ".file",
            "_strQuery",
            "_fragment"
        ];
        var h = {};
        var r = regex.exec(strUri);
        for (var i = keys.length - 1; i >= 0; i--) {
            var k = keys[i];
            if (k[0] !== '.') {
                if (r[i] === undefined) this[k] = null;
                else this[k] = r[i];
            }
            h[k] = r[i];
        }
        this._query = this._parseQuery(this._strQuery);
        
        // TODO: somewhere here we may need to unmap our URI???
        this.endUpdate();
    },
    
    _build: function(withQuery) {
        if (withQuery === undefined) withQuery = true;
        var res = '', q;
        if (this._scheme) res += this._scheme + ':';
        if (this._host) {
            if (this._scheme !== 'mailto') res += '//';
            if (this._user || this._pass) {
                res += this._user;
                if (this._pass) res += ':' + this._pass;
                res += '@';
            }
            res += this._host;
            res += this._port ? ':' + this._port : '';
        }
        if (this._path) {
            if (res && this._path[0] !== '/') res += '/';
            res += this._path;
        }
        
        if (withQuery && this._query) {
            if (this._strQuery !== null) q = this._strQuery;
            else {
                q = this._buildQuery(this._query, '', true);
                this._strQuery = q;
            };
            res += '?' + q;
        }
        
        if (this._fragment !== null) res += '#' + this._fragment;
        
        if (withQuery) this._uri = res;
        
        return res;
    },
    
    isFullyQualified: function() {
        return this._scheme && this._host;
    },
    
    isRelative: function() {
        return this._path && this._path[0] !== '/';
    },
    
    /**
     * @return Ac_Url
     */
    resolve: function (baseUri) {
        var b, res, path;
        
        if (this.isFullyQualified()) return new Amm.Remote.Uri(this);
        if (!baseUri) baseUri = Amm.Remote.Uri.getCurrent();
        if (baseUri['Amm.Remote.Uri']) b = baseUri;
        else b = new Amm.Remote.Uri(baseUri);
        // empty URI inherits query string of base URI (for compatibility with A element)
        // TODO: if URI has only fragment, it should work too
        if (this.getUri() === '') {
            res = new Amm.Remote.Uri(b);
            res._fragment = '';
            return res;
        }
        else if (this.getUri().charAt(0) === '#') {
            res = new Amm.Remote.Uri(b);
            res.setUri(this._fragment, Amm.Remote.Uri.PART_FRAGMENT);
            return res;
        }
        
        res = new Amm.Remote.Uri(this);
        if (!res._scheme) res._scheme = b._scheme;
        if (!res._host) res._host = b._host;
        if (res._path && res._path.charAt(0) === '/') {
            return res;
        }
        
        // resolve the path
        path = b._path;
        if (!res._path) {
            res._path = path;
            return res;
        }
        
        // strip trailing '/' or '/something; replace // with /
        path = path.replace(/\/[^/]*$/, '').replace(/\/{2,}/, '/') + '/' + res._path.replace(/^\//, '');
        
        // check if we have '/./' or '/../' segments
        if (!path.match(/(^|\/)\.\.?(\/|)/)) {
            res._path = path;
            return res;
        }
        
        var curr, i;
        
        path = path.split('/');
        i = 0;
        while (i < path.length) {
            curr = path[i];
            if (curr === '.' || curr === '') {
                path.splice(i, 1);
                continue;
            }
            if (curr !== '..') {
                i++;
                continue;
            }
            if (i > 1) {
                path.splice(i - 1, 2);
                i--;
                continue;
            }
            path.splice(i, 1);
        }
        path = '/' + path.join('/');
        res._path = path;
        return res;
    }
    
    
};

Amm.extend(Amm.Remote.Uri, Amm.WithEvents);

