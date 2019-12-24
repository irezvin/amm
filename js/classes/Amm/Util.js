/* global Amm */

Amm.Util = {
    
    regexEscape: function(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    },
    
    trim: function(string) {
        return string.replace(/^\s+|\s+$/g, '');
    },
    
    getByPath: function(source, arrPath, defaultValue) {
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
    
    arrayToHash: function(array) { 
        var res = {}, l = array.length; 
        for (var i = 0; i < l; i++) {
            if (array[i] !== undefined) res[i] = array[i];
        }
        return res;
    },
    
};
