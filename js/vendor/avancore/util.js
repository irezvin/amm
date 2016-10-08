if (!window.console) window.console = new function () {this.log = function() {};} ();

Ajs_Util = {

    indexOf: function(item, arr, start, strict) {
        if (start === undefined) start = 0;
        var i, l = arr.length;
        if (strict) {
            for (i = start; i < l; i++)
                if (arr[i] === item) return i;
        } else {
            for (i = start; i < l; i++)
                if (arr[i] == item) return i;
        }
        return -1;
    },
    
    keyOf: function(item, hash, returnAll) {
        var res = returnAll? [] : undefined;
        if (hash && typeof hash == 'object') {
            for (var i in item) if (hash[i] == item) {
                if (returnAll) res.push(item); else return i;
            }
            return res;
        } else return res;
    },
    
    _addListener: function() {
		if (window.addEventListener) {
			return function(element, eventType, fn, capture) {
				element.addEventListener(eventType, fn, capture);
			};
		} else if (window.attachEvent) {
			return function(element, eventType, fn, capture) {
				element.attachEvent("on" + eventType, fn);
			};
		} else {
			return function() {};
		}
	} (),
	
	_removeListener: function() {
		if (window.removeEventListener) {
			return function(element, eventType, fn, capture) {
				element.removeEventListener(eventType, fn, capture);
			};
		} else if (window.detachEvent) {
			return function(element, eventType, fn) {
				element.detachEvent("on" + eventType, fn);
			};
		} else {
			return function() {};
		}
	} (),
    
    addListener: function(element, eventType, fn, scope, args) {
		if (!scope) scope = element;
		var extraArgs = Array.prototype.slice.call(arguments, 4);
		var wrappedFn = function(e) {
			var a = [e].concat(extraArgs);			
			return fn.apply(scope, a);
		};
		var res = {'fn': wrappedFn, 'eventType': eventType};
		this._addListener(element, eventType, wrappedFn);
		return res;
	},

	removeListener: function(element, listener) {
		if (listener.fn && listener.eventType)
			this._removeListener(element, listener.eventType, listener.fn);
	},
    
		
    ucFirst: function(s) {
        return s.substr(0, 1).toUpperCase() + s.substr(1);
    },

    extend: function(subClass, baseClass) {
    	for (var i in baseClass.prototype) if (!subClass.prototype[i]) subClass.prototype[i] = baseClass.prototype[i];
    },
    
    initFromOptions: function(object, proto) {
        var setter;
        for (var i in proto) if (proto.hasOwnProperty(i)) {
            setter = 'set' + Ajs_Util.ucFirst(i);
            if (object[setter] && typeof (object[setter] == 'function')) object[setter].call(object, proto[i]);
            else object[i] = proto[i];
        }
    },

    augment: function(modifiedObject, extraObject) {
        for (var i in extraObject) if (modifiedObject[i] === undefined) {
            modifiedObject[i] = extraObject[i];
        }
    },
    
    deleteNodes: function(nodes) {
    	for (var i = 0; i < nodes.length; i++) if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]);
    },

    pushWithOrder: function(array, item, orderProperty) {
        var idx = 0;
        for (var i = 0; i < array.length; i++) {
            if (array[i][orderProperty] < item[orderProperty]) {
                idx = i + 1;
            }
        }
        if (idx < array.length) array.splice(idx, 0, item);
            else array.push(item);
    },
    
    /**
     * Converts value to string in PHP manner
     */
    toString: function(value) {
    	var res;
    	switch (true) {
    		case value === false:
    		case value === undefined:
    		case value === null:
    		case value instanceof Array && !value.length:
    			res = '';
    			break;
    			
    		case value === true:
    			res = 1;
    			break;
    		
    		default:
    			res = '' + value;
    	}
    	return res;
    },

    /**
     * Converts value to an array.
     * If value is already an array, it isn't changed.
     * If value is NULL, undefined or FALSE, it's converted to an empty array.
     * Otherwise result is [value].
     */
    toArray: function(value) {
        if (value instanceof Array) return value;
        if (value === null || value === false || value === undefined) return [];
        return [value];
    },

    hasOwnProperty: function(object, prop) {
        if (typeof(object.hasOwnProperty) === 'function') return object.hasOwnProperty(prop);
        else return (typeof(object[prop]) !== 'undefined') && object.prototype[prop] !== object[prop];
    },
    
    listOwnProperties: function(object) {
    	var res = [];
        if (typeof(object.hasOwnProperty) === 'function') {
        	for (var i in object) if (object.hasOwnProperty(i)) res.push(i);
        } else {
        	for (var i in object) 
        		if ((typeof(object[i]) !== 'undefined') && object.prototype[i] !== object[i]) res.push(i);
        }
        return res;
    },

    /**
     * Recursively and aggressively overrides modifiedObject properties
     * with overrider's ones. Concats numerical Arrays.
     *
     * Special values can be provided in overrider:
     * - new Ajs_Util.override.Value(value) -- will replace corresponding modifiedObject property with value;
     * - new Ajs_Util.override.Remove() -- will delete corresponding modifiedObject property with delete statement;
     * - new Ajs_Util.override.Remove -- same as new Ajs_Util.override.Remove().
     *
     * @param {object} modifiedObject Object that is being changed.
     * @param {object} overrider Source of override properties.
     */
     override: function(modifiedObject, overrider, noOverwrite) {
        if (typeof modifiedObject != 'object' || typeof overrider != 'object')
            throw 'Both modifiedObject and overrider must be objects';

        for (var i in overrider) {
            if (Ajs_Util.hasOwnProperty(overrider, i)) {
                switch (true) {
                    case overrider[i] instanceof Ajs_Util.override.Value:

                        if (!noOverwrite || !Ajs_Util.hasOwnProperty(modifiedObject, i))
                            modifiedObject[i] = overrider[i].value;
                            
                        break;

                    case overrider[i] instanceof  Ajs_Util.override.Remove:
                        delete modifiedObject[i];
                        break;

                    case modifiedObject[i] instanceof Array && overrider[i] instanceof Array:
                        modifiedObject[i] = modifiedObject[i].concat(overrider[i]);
                        break;

                    case typeof modifiedObject[i] === 'object' && typeof overrider[i] === 'array':
                        new Ajs_Util.override(modifiedObject[i], overrider[i], noOverwrite);
                        break;

                    default:

                        if (!noOverwrite || !Ajs_Util.hasOwnProperty(modifiedObject, i))
                            modifiedObject[i] = overrider[i];
                            
                        break;
                }
            }
        }
        
        return modifiedObject;
    },
    
    makeQuery: function(data, paramName, stripLeadingAmpersand, assoc) {
        var res = '', i;
        if (assoc) res = typeof assoc === 'object'? assoc : {};
        if (data === undefined) return '';
        if (data instanceof Array) {
        	if (data.length) {
	            for (i = 0; i < data.length; i++) {
                    if (assoc) Ajs_Util.makeQuery(data[i], paramName? paramName + '[' + i + ']' : i, false, res);
	                else res = res + Ajs_Util.makeQuery(data[i], paramName? paramName + '[' + i + ']' : i);
	            }
        	} else {
        		if (assoc) res[paramName] = '';
                    else res = '&' + paramName + '=';
        	}
        } else {
            if ((typeof data) == 'object') {
                for (i in data) if (Ajs_Util.hasOwnProperty(data, i)) {
                    if (assoc) Ajs_Util.makeQuery(data[i], paramName? paramName + '[' + i + ']' : i, false, res);
                    else res = res + Ajs_Util.makeQuery(data[i], paramName? paramName + '[' + i + ']' : i);
                }
            } else {
                if (assoc) res[paramName] = '' + data;
                else res = '&' + paramName + '=' + encodeURIComponent(data);
            }
        }
        if (!assoc && stripLeadingAmpersand && res.length) res = res.slice(1);
        return res;
    },
	
	arrayToObject: function(arr) { 
		var res = {}, l = arr.length; 
		for (var i = 0; i < l; i++) {
			if (arr[i] !== undefined) res[i] = arr[i];
		}
		return res;
	},
	
	/**
	 * Since type of target may need to be changed to Array or more general object, 
	 * the recommended usage is as follows:
	 *  
	 * 		var foo = Ajs_Util.setByPath(foo, ['a', 1, 'c'], 'val'); 
	 */
	setByPath: function(target, arrPath, value) {
		
		var l = arrPath.length;
		
		if (!l) target = value;
		else {
			if (typeof target != 'object' || target === null) target = [];
			
			var root = {'dummy' : target}, prev = root, prevKey = 'dummy', seg, nKey;
			
			for (var i = 0; i < l; i++) {
				var last = (i >= (l - 1)), curr = prev[prevKey];
				seg = '' + arrPath[i], nKey = parseInt(seg);
				if (!seg.length) {
					if (curr instanceof Array) nKey = curr.length;
					else {
						nKey = 0; 
						for (var prop in curr) 
							if (Ajs_Util.hasOwnProperty(curr, prop)) {
								var idx = parseInt(prop);
								if (idx >= nKey) nKey = idx + 1;
							}
					}
					seg = nKey; // we need this to make next if() work
				}
				if ((nKey >= 0) && (('' + nKey) == seg)) { // we have numeric key!
					if (last) curr[nKey] = value;
					else {
						if (curr[nKey] === undefined) curr[nKey] = [];
					}
					prev = curr;
					prevKey = nKey;
				} else {
					// it's a string key
					if (curr instanceof Array) {
						prev[prevKey] = Ajs_Util.arrayToObject(prev[prevKey]);
						curr = prev[prevKey];
					}
					if (last) curr[seg] = value;
					else {
						if (curr[seg] === undefined) curr[seg] = [];
						prev = curr;
						prevKey = seg;
					}
				}
			}
			
			target = root['dummy'];
		}
		return target;
	},
    
    parseQuery: function(string, delim, eq) {
    	if (delim === undefined) delim = '&';
    	if (eq === undefined) eq = '=';
    	
    	var pairs = string.split(delim), l = pairs.length, res = [];
    	for (var i = 0; i < l; i++) {
    		var nameVal = pairs[i].split(eq, 2), path = nameVal[0].replace(']', '');
    		path = path.replace(/\]/g, '').split('[');
    		if (nameVal.length < 2) nameVal.push('');
    		res = Ajs_Util.setByPath(res, path, nameVal[1]);
    	}
    	return res;
    },
    
    pathToArray: function(string) { 
        return string.replace(/\]/g, '').split('[');
    },
    
    arrayToPath: function(array) {
        var res = array;
        if (array instanceof Array) res = array.length > 1? array.join('][') + ']' : array[0];
        return res;
    },
    
    hashKeys: function(hash) {
        var res = [];
        for (var i in hash) if (hash.hasOwnProperty(i)) res.push(i);
        return res;
    },
    
    arrayDiff: function(arr1, arr2, useLooseCompare) {
        var a1 = [].concat(arr1), a2 = [].concat(arr2);

        for (var i = a2.length - 1; i >= 0; i--) {
            for (var j = a1.length - 1; j >= 0; j--) {
                if ((useLooseCompare && Ajs_Util.looseCompare(a1[j], a2[j])) || (a1[j] === a2[i])) {
                    a1.splice(j, 1);
                }
            }
        }
        return a1;
    },
    
    
    /**
     * Perform a loose recursive comparison of objects and arrays.
     * 
     * Arrays are considered equal if they have equal values in the same order;
     * objects (hashes) are considered equal if they have loosely-equal "own" properties.
     * 
     * @return bool true if {value1} 'loosely equals' {value2}, false otherwise 
     */
    looseCompare: function(value1, value2) {
    	var res;
    	if ((typeof value1) == 'object' && value1 !== null && value2 !== null) {
    		if ((value1 instanceof Array)) {
    			// Compare arrays
    			var l = value1.length;
    			if (value2 instanceof Array && (l == value2.length)) {
    				res = true;
    				for (var i = 0; (i < l) && res; i++) if (!Ajs_Util.looseCompare(value1[i], value2[i])) res = false;
    			} else {
    				res = false;
    			}
    		} else {
    			if ((typeof value2) == 'object') {
    				// Compare objects
    				var p1 = Ajs_Util.listOwnProperties(value1), p2 = Ajs_Util.listOwnProperties(value2), l = p1.length; 
    				if ((l == p2.length) && !Ajs_Util.arrayDiff(p2, p1).length) {
    					res = true;
    					for (var i = l - 1; res && (i >= 0); i--) if (!Ajs_Util.looseCompare(value1[p1[i]], value2[p1[i]])) res = false;
    				} else res = false;
    			} else {
    				res = false;
    			}
    		}
    	} else {
    		res = (value1 == value2);
    	}
    	return res;
    },

    trim: function(string) {
        if (window.trim && typeof window.trim === 'function') {
            return trim(string);
        } else {
            return string.replace(/^\s+/, '').replace(/\s+$/, '');
        }
    },
    
    addRemoveClassName: function(element, toAdd, toRemove) {
    	if (typeof toAdd == 'string') toAdd = toAdd.split(' ');
    	else if (!toAdd) toAdd = [];
    	
    	if (typeof toRemove == 'string') toRemove = toRemove.split(' ');
    	else if (!toRemove) toRemove = [];
    	
    	var o = c = element.getAttribute('class');
    	if (!c) c = '';
    	
        var ol, l, i;
        
    	for (i = 0, l = toRemove.length; i < l; i++) {
            do {
                ol = c.length;
                c = c.replace(toRemove[i], '');
            } while (c.length != ol);
    	}    	
    	
    	if (toAdd.length) {
             for (i = 0, l = toAdd.length; i < l; i++) {
                if (c.indexOf(toAdd[i]) < 0) c = c + ' ' + toAdd[i];
             }
        }
    	if (c != 0) element.setAttribute('class', c);
    },
    
    /**
     * Returns browser-safe fragment identifier;
     * If it points to local page, returns the fragment, else returns whole {href} (or {def} if it's given  
     */
    getLocalFragment: function(href, def) {
    	href = '' + href;
    	if (href.slice(0, 1) == '#') return href;
    	else {
    		var s = href.indexOf('#'), foo = [];
    		if (s >= 0) {
    			foo.push (href.slice(0, s));
    			foo.push (href.slice(s + 1, href.length));
    		}
    		var bar = document.location.href.split('#', 2);
    		if ((foo.length == 2) && (foo[0] == bar[0])) {
    			href = '#' + foo[1];
    		}
    			else if (def !== undefined) href = def;
    	}
    	return href;
    },
    
	callScripts: function(data, args, context) {
    	if (context === undefined) context = window;
		if (!(args instanceof Array)) args = [];
		if (data instanceof Array) {
			for (var i = 0, c = data.length; i < c; i++) {
				this.callScripts(data[i], args, context);
			}
		} else if (typeof data == 'object') {
			for (var i in data) {
				if (Ajs_Util.hasOwnProperty(data, i)) this.callScripts(data[i], args, context);
			}
		} else if (typeof data == 'function') {
			data.apply(context, args);
		} else if (typeof data == 'string') {
			(function(d){eval(d);}).call(context, data);
		}
	},
    
    getElementsBy: function(method, tag, root, firstOnly) {
        tag = tag || '*';
        root = root || document;

            var ret = (firstOnly) ? null : [],
                elements;

        if (root) {
            elements = root.getElementsByTagName(tag);
            for (var i = 0, len = elements.length; i < len; ++i) {
                if ( method(elements[i]) ) {
                    if (firstOnly) {
                        ret = elements[i]; 
                        break;
                    } else {
                        ret[ret.length] = elements[i];
                    }
                }
            }
        }
        return ret;
    },


    getData: function (oForm, submitButton) {

        var
        	aElements,
            nTotalElements,
            oData,
            sName,
            oElement,
            nElements,
            sType,
            sTagName,
            aOptions,
            nOptions,
            aValues,
            oOption,
            oRadio,
            oCheckbox,
            valueAttr,
            i,
            n;

        function isFormElement(p_oElement) {
            var sTag = p_oElement.tagName.toUpperCase();
            return ((sTag == "INPUT" || sTag == "TEXTAREA" ||
                    sTag == "SELECT") && p_oElement.name == sName);
        }

        if (oForm) {

            aElements = oForm.elements;
            nTotalElements = aElements.length;
            oData = {};

            for (i = 0; i < nTotalElements; i++) {
                sName = aElements[i].name;

                /*
                    Using "Dom.getElementsBy" to safeguard user from JS
                    errors that result from giving a form field (or set of
                    fields) the same name as a native method of a form
                    (like "submit") or a DOM collection (such as the "item"
                    method). Originally tried accessing fields via the
                    "namedItem" method of the "element" collection, but
                    discovered that it won't return a collection of fields
                    in Gecko.
                */

                oElement = Dom.getElementsBy(isFormElement, "*", oForm);
                nElements = oElement.length;
                
                if (nElements > 1) { // remove disabled elements from results
                    for (var j = nElements - 1; j >= 0; j--) {
                        if (oElement[j].hasAttribute('disabled')) {
                            oElement.splice(j, 1);
                            nElements--;
                        }
                    }
                }

                if (nElements > 0) {
                    if (nElements == 1) {
                        oElement = oElement[0];

                        sType = oElement.type.toLowerCase();
                        sTagName = oElement.tagName.toUpperCase();

                        switch (sTagName) {
                            case "INPUT":
                                if (sType == "checkbox") {
                                    if (oElement.checked) oData[sName] = oElement.value;
                                } else if (sType != "radio") {
                                    if (sType == "submit") {
                                    	if (!submitButton || submitButton === oElement) oData[sName] = oElement.value;
                                    } else {
                                    	oData[sName] = oElement.value;
                                    }
                                }
                                break;

                            case "TEXTAREA":
                                oData[sName] = oElement.value;
                                break;

                            case "SELECT":
                                aOptions = oElement.options;
                                nOptions = aOptions.length;
                                aValues = [];

                                for (n = 0; n < nOptions; n++) {
                                    oOption = aOptions[n];
                                    if (oOption.selected) {
                                        valueAttr = oOption.attributes.value;
                                        aValues.push((valueAttr && valueAttr.specified) ? oOption.value : oOption.text);
                                    }
                                }

                                if (aValues.length) {
	                                if (!oElement.getAttribute('multiple')) {
	                                	oData[sName] = aValues[0];
	                                } else {
	                                    oData[sName] = aValues;
	                                }
                                }
                                break;
                        }

                    } else {
                        sType = oElement[0].type;
                        switch (sType) {
                            case "radio":
                                for (n = 0; n < nElements; n++) {
                                    oRadio = oElement[n];
                                    if (oRadio.checked) {
                                        oData[sName] = oRadio.value;
                                        break;
                                    }
                                }
                                break;

                            case "checkbox":
                                aValues = [];
                                for (n = 0; n < nElements; n++) {
                                    oCheckbox = oElement[n];
                                    if (oCheckbox.checked) {
                                        aValues[aValues.length] =  oCheckbox.value;
                                    }
                                }
                                oData[sName] = aValues;
                                break;
                        }
                    }
                }
            }
        }

        return oData;
    },
    

    /**
     * @return HTMLElement
     */
    createElement: function(tagName, attribs, content, namedElements) {
        var res = document.createElement(tagName);
        if (typeof attribs === 'object') {
            for (var i in attribs)
                if (attribs.hasOwnProperty(i) && i !== '_content' && i !== '_tagName' && i !== '_html' && i !== '_id') {
                    if (attribs[i] !== false)
                        res.setAttribute(i, attribs[i] === true? i : attribs[i]);
                }
            if (attribs['_id'] && namedElements && typeof namedElements == 'object' ) {
                if (attribs['_id'] instanceof Array) Ajs_Util.setByPath(namedElements, attribs['_id'], res);
                    else namedElements[attribs['_id']] = res;
            }
            if (attribs['_html']) res.innerHTML = attribs['_html'];
            if (content === undefined && attribs['_content'] !== undefined) content = attribs['_content'];
        }
        if (content !== undefined) Ajs_Util.appendElementContent(res, content, namedElements);
        return res;
    },
    
    appendElementContent: function(element, content, namedElements) {
        if (content !== null && content !== undefined && content !== false) {
            if (typeof content === 'object') {
                if (content instanceof Array) {
                    for (var i = 0; i < content.length; i++)
                        Ajs_Util.appendElementContent(element, content[i], namedElements);
                } else {
                    if  (content['_tagName']) {
                        if (!content['_ignore']) {
                            element.appendChild(Ajs_Util.createElement(content['_tagName'], content, undefined, namedElements));
                        }
                    } else {
                        if (content.parentNode !== undefined) element.appendChild(content);
                            else {
                                console.log("content is ", content);
                                throw "content._tagName not provided";
                            }
                    }
                }
            } else {
                element.appendChild(document.createTextNode(content));
            }
        }
    },
    
    /**
     * Returns array with members of hash 
     * @type {Array}
     */
    getHashItems: function(hash) {
        var res = [];
        for (var i in hash) if (hash.hasOwnProperty(i)) res.push(hash[i]);
        return res;
    }
    
};

Ajs_Util.override.Value = function(value) {
    this.value = value;
};

Ajs_Util.override.Value.prototype = {
    value: null
}

Ajs_Util.override.Remove = function() {
}

Ajs_Util.Uri = function(uri) {
    this.query = {};
    if (typeof uri == 'object' && uri['Ajs_Util.Uri']) this.assign(uri);
        else this.parse(uri);
}

// A javascript replacement for Ac_Url
Ajs_Util.Uri.prototype = {
    
    'Ajs_Util.Uri': true,
    
    scheme: '',
    user: '',
    password: '',
    host: '',
    port: '',
    path: '',
    query: null,
    fragment: '',
    
    parse: function(str) {
        
        // Credit for regular expression and keys length: JSURI project - http://code.google.com/p/jsuri/
        var regex = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
        var keys = [
            ".source",
            "scheme",
            ".authority",
            ".userInfo",
            "user",
            "password",
            "host",
            "port",
            ".relative",
            "path",
            ".directory",
            ".file",
            "query",
            "fragment"
        ];
        var r = regex.exec(str);
        for (var i = keys.length - 1; i >= 0; i--) {
            var k = keys[i];
            if (k.charAt(0) != '.') this[k] = r[i] || '';
        }
        if (this.query.length) {
            this.query = Ajs_Util.parseQuery(this.query);
        } else {
            this.query = {};
        }
    },
    
    assign: function(uri) {
        var a = ['scheme', 'user', 'password', 'host', 'port', 'path'];
        for (var i = a.length - 1; i >=0; i--) this[a[i]] = uri[a[i]];
        this.query = {};
        Ajs_Util.override(this.query, uri.query);
    },
    
    build: function(withQuery) {
        if (withQuery === undefined) withQuery = true;
        var uri, q, s;
        s = this.scheme? ('' + this.scheme) : '';
        
        uri  = s ? (s + ':' + (s.toLowerCase() == 'mailto' ? '' : '//')) : '';
        uri += this.user ? this.user + (this.pass?   ':' + this.pass  :  '') + '@' : '';
        uri += this.host ? this.host : '';
        uri += this.port ? ':' + this.port : '';
        uri += this.path ? this.path : '';
        
        if (withQuery) {
            q = Ajs_Util.makeQuery(this.query, '', true);
        } else {
            q = '';
        }
        
        //if (!this.path && (withQuery && q.length || this.fragment && uri.slice(-1) !== '/')) uri += '/';
        if (withQuery && q.length) {
            uri += '?' + q;
        }
        uri += this.fragment ? '#' + this.fragment : '';
        return uri;
    },
    
    clone: function() {
        return new Ajs_Util.Uri(this);
    },
    
    toString: function() {
        return this.build();
    },
    
    overrideQuery: function(extra) {
        if (typeof extra !== 'object') {
            extra = Ajs_Util.parseQuery(extra);
        }
        Ajs_Util.override(this.query, extra);
    }
    
}

Ajs_Util.DelayedCall = function(func, id, contextObject, args, delay, immediate) {
    if (id === undefined) id = Ajs_Util.DelayedCall.lastId++;
        else Ajs_Util.DelayedCall.cancelCall(id);
    this.id = id;
    this.func = func;
    if (this.contextObject !== undefined) this.contextObject = contextObject;
    if (args !== undefined) this.args = args;
    if (delay !== undefined) this.delay = delay;
    if (immediate !== undefined) this._immediate = immediate;
    if (this._immediate) this.call();
};

Ajs_Util.DelayedCall.prototype = {
	jsClassName: "Ajs_Util.DelayedCall", 
    func: null,
    id: null,
    contextObject: null,
    args: [],
    delay: 100,
    _immediate: false,

    _timeout: null,
    _tmFn: null,

    _clearTimeout: function() {
        if (this._timeout) window.clearTimeout(this._timeout);
        this._timeout = null;
    },

    cancel: function() {
        this._clearTimeout();
        if (this.id !== null) if (Ajs_Util.DelayedCall[this.id]) delete Ajs_Util.DelayedCall[this.id];
    },

    call: function() {
    	this._clearTimeout();
    	
        if (this.delay) {
            if (!this._tmFn) this._tmFn = function(t) {
                return function() {t._run();};
            } (this);
            this._timeout = window.setTimeout(this._tmFn, this.delay);
        }
        else this._run();
    },
    
    callWithArgs: function() {
    	this.args = Array.prototype.slice.call(arguments, 0);
    	this.call();
    },

    _run: function() {
        this._timeout = null;
        if (this.func) {
            var ctx = this.contextObject? this.contextObject : this;
            this.func.apply(ctx, this.args);
        }
    },
    
    immediate: function() {
    	this.cancel();
        if (this.func) {
            var ctx = this.contextObject? this.contextObject : this;
            this.func.apply(ctx, this.args);
        }
    },
    
    isActive: function() {
    	return !!this._timeout;
    },

    destroy: function() {
        this.cancel();
        delete this.args;
        delete this.contextObject;
    }
    
};

Ajs_Util.augment(Ajs_Util.DelayedCall, {
    delayedCalls: {},
    lastId: 0,
    cancelCall: function(id) {
        if (Ajs_Util.DelayedCall[id]) Ajs_Util.DelayedCall[id].cancel();
    }
});
