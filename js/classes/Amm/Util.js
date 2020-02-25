/* global Amm */

Amm.Util = {
    
    regexEscape: function(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    },
    
    trim: function(string) {
        return string.replace(/^\s+|\s+$/g, '');
    },
    
    getByPath: function(source, arrPath, defaultValue) {
        if (!(arrPath instanceof Array)) arrPath = Amm.Util.pathToArray(arrPath);
        var curr = source, ap = [].concat(arrPath), seg;
        while (ap.length) {
            seg = ap.shift();
            if (!curr || typeof curr !== 'object' || !(seg in curr)) 
                return defaultValue;
            curr = curr[seg];
        }
        if (!ap.length) return curr;
        return defaultValue;
    },
    
    setByPath: function(target, arrPath, value, changed, merge) {
		
        if (!target && value === undefined) return;
        
        if (!(arrPath instanceof Array)) arrPath = Amm.Util.pathToArray(arrPath);
        
        var l = arrPath.length;
        changed = changed || {};
        changed.changed = false;

        if (!l) return value;
        
        if (typeof target !== 'object' || target === null) {
            target = {};
            changed.changed = true;
        }
        
        var root = {dummy : target}, prev = root, prevKey = 'dummy', seg, nKey;

        for (var i = 0; i < l; i++) {
            var last = (i >= (l - 1)), curr = prev[prevKey];
            seg = '' + arrPath[i], nKey = parseInt(seg);
            if (!seg.length) {
                if (curr instanceof Array) nKey = curr.length;
                else {
                    nKey = 0; 
                    for (var prop in curr) 
                        if (curr.hasOwnProperty(prop)) {
                            var idx = parseInt(prop);
                            if (idx >= nKey) nKey = idx + 1;
                        }
                }
                seg = nKey; // we need it to make next if() work
            }
            if ((nKey >= 0) && (('' + nKey) == seg)) { // we have numeric key!
                if (last) {
                    if (curr[nKey] !== value) {
                        // we can merge
                        if (merge 
                            && (value && typeof value === 'object' 
                            && (curr[nKey] && typeof curr[nKey] === 'object'))
                        ) {
                            Amm.override(curr[nKey], value);
                        } else {
                            curr[nKey] = value;
                        }
                        changed.changed = true;
                    }
                } else {
                    if (curr[nKey] === undefined) {
                        curr[nKey] = [];
                        changed.changed = true;
                    }
                }
                prev = curr;
                prevKey = nKey;
            } else {
                // it's a string key
                if (curr instanceof Array) {
                    changed.changed = true;
                    prev[prevKey] = Amm.Util.arrayToHash(prev[prevKey]);
                    curr = prev[prevKey];
                }
                if (last) {
                    if (curr[seg] !== value) {
                        changed.changed = true;
                        // we can merge
                        if (merge 
                            && (value && typeof value === 'object' 
                            && (curr[seg] && typeof curr[seg] === 'object'))
                        ) {
                            Amm.override(curr[seg], value);
                        } else {
                            curr[seg] = value;
                        }
                    }
                } else {
                    if (curr[seg] === undefined) {
                        curr[seg] = [];
                        changed.changed = true;
                    }
                    prev = curr;
                    prevKey = seg;
                }
            }
        }
        
        return root.dummy;
    },

    /**
     * Converts Array instance into generic object with same key-value pairs as
     * indexes in array (i.e. ['foo', 'bar'] converted to {'0': 'foo', '1': 'bar'}
     * (sometimes used in Uri parameters serializarion and deserialization)
     * 
     * @param {Array} array
     * @returns {object}
     */
    arrayToHash: function(array) { 
        var res = {}, l = array.length; 
        for (var i = 0; i < l; i++) {
            if (array[i] !== undefined) res[i] = array[i];
        }
        return res;
    },
    
    /**
     * Converts php-style square-bracketed path to array
     * i.e. foo[bar][baz][] will be converted to ['foo', 'bar', baz', '']
     * and foo will be converted to ['foo']
     * 
     * @param {string} string
     * @returns {Array}
     */
    pathToArray: function(string) { 
        if (!string.length) return [];
        if (string instanceof Array) return string;
        return string.replace(/\]/g, '').split('[');
    },
    
    /**
     * Converts array to php-style square-bracketed path i.e.
     * ['foo', 'bar'] will be converted to foo[bar]
     * and ['foo', 'bar', ''] will be converted to foo[bar][] (hello, PHP)
     * 
     * @param {Array} array Path like ['foo', 'bar', 'baz']
     * @returns {string}
     */
    arrayToPath: function(array) {
        if (!array.length) return '';
        var res = array;
        if (array instanceof Array) res = array.length > 1? array.join('][') + ']' : array[0];
        return '' + res;
    },
    
    /**
     * Swaps keys and values in the hash (i.e. converts { a: 'Ayval', b: 'Beeval' } to { Ayval: 'a', Beeval: 'b' }. 
     * Doesn't do checks for invalid or duplicate values.
     * 
     * @param {object} hash Object to have keys and values reversed
     * @return {object}
     */
    swapKeysValues: function(hash) {
       if (!hash || (typeof hash !== 'object')) throw Error("`hash` must be a non-null object");
       var res = {};
       for (var i in hash) if (hash.hasOwnProperty(i)) res[hash[i]] = i;
       return res;
    }
    
};
