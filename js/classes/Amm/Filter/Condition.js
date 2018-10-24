/* global Amm */

Amm.Filter.Condition = function(filter, options) {
    
    this.filter = filter;

    if (!options || typeof options !== 'object') {
        throw Error("`options` must be a non-null object");
    }
  
    if (options._id) this.id = options._id;
    
    if (options._class) this.requiredClass = options._class;
    
};

Amm.Filter.Condition.prototype = {
    
    'Amm.Filter.Condition': '__CLASS__',
    
    filter: null, // Amm.Filter
    
    id: null, // For named conditions
    
    requiredClass: null, // one or more classes
    
    match: function(object) {
        if (this.requiredClass && !Amm.is(object, this.requiredClass)) return false;
        return this._doMatch(object);
    },
    
    _doMatch: function(object) {
        return true;
    },
    
    testValue: function(value, test) {
        if (test instanceof Array) {
            for (var i = 0, l = test.length; i < l; i++) {
                if (this.testValue(value, test[i])) return true;
            }
            return;
        }
        if (test instanceof RegExp) {
            return typeof value === 'string' && test.exec(value);
        }
        if (typeof test === 'function') {
            return !!test(value);
        }
        if (typeof test === 'object' && test) {
            if (test.validator) {
                return !Amm.Validator.iErr(test, 'validator', value);
            }
            if (test['Amm.Validator']) {
                return !test.getError(value);
            }
            if (test.strict) return value === test.strict;
            if (test.rq) return Amm.meetsRequirements(value, test.rq);
        }
        return test == value; // non-strict comparison
    },
    
    subscribe: function(object) {
    },
    
    unsubscribe: function(object) {
    }
    
};