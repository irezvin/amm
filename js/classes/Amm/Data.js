/* global Amm */

Amm.Data = {
    
    isEmpty: function(v) {
        if (!v) return true;
        if (v instanceof Array) return !v.length;
        if (typeof v === 'object') {
            for (var i in v) if (v.hashOwnProperty(i)) return !isEmpty(v[i]);
            return true;
        }
        return false;
    },
    
    flattenErrors: function(hash, target) {
        if (!hash) return [];
        if (typeof hash !== 'object') return [hash];
        var i;
        var res = target || [], target = target || res;
        if (hash instanceof Array) {
            for (i = 0, l = hash.length; i < l; i++) {
                if (Amm.Data.isEmpty(hash[i])) continue;
                if (typeof hash[i] === 'object' && hash[i]) Amm.Data.flattenErrors(hash[i], res);
                if (Amm.Array.indexOf(target, hash[i]) < 0) target.push(hash[i]);
            }
        } else {
            for (i in hash) if (hash.hasOwnProperty(i)) {
                if (Amm.Data.isEmpty(hash[i])) continue;
                if (typeof hash[i] === 'object' && hash[i]) Amm.Data.flattenErrors(hash[i], res);
                if (hash[i] instanceof Array && !hash[i].length) {
                    delete hash[i];
                    continue;
                }
                if (Amm.Array.indexOf(target, hash[i]) < 0) target.push(hash[i]);
            }
        }
        return res;
    }
        
};

Amm.Data.STATE_NEW = 'new';

Amm.Data.STATE_EXISTS = 'exists';

Amm.Data.STATE_DELETED = 'deleted';

Amm.Data.StateEnum = {};

Amm.Data.StateEnum[Amm.Data.STATE_NEW] = Amm.Data.STATE_NEW;
Amm.Data.StateEnum[Amm.Data.STATE_EXISTS] = Amm.Data.STATE_EXISTS;
Amm.Data.StateEnum[Amm.Data.STATE_DELETED] = Amm.Data.STATE_DELETED;

Amm.Data.ERROR_OTHER = 'ERROR_OTHER'; // special value to get errors that are not bound to the fields
Amm.Data.ERROR_GENERIC = 'ERROR_GENERIC'; // default key for errors without proper key
Amm.Data.ERROR_EXCEPTION = 'ERROR_EXCEPTION'; // default key to store exceptions

/**
 * check() occurs only upon direct calling or on save()
 */
Amm.Data.AUTO_CHECK_NEVER = 0;

/**
 * Fields are auto-checked individually; 
 * A field is checked only if it's non-empty AND when it's modified.
 * So if a required field is changed from non-empty to empty, it will produce "required" error.
 * Full check (all fields PLUS expressions and meta) is performed only during check() method
 * (and so before save).
 * 
 * Note: if there are no subscribers to allErrors/localErrors, none auto-check will occur.
 */
Amm.Data.AUTO_CHECK_SMART = 1;

/**
 * Full auto: full check() occurs on every change. (a bit inefficient)
 * Note: if there are no subscribers to allErrors/localErrors, none auto-check will occur.
 */
Amm.Data.AUTO_CHECK_ALWAYS = 2;
