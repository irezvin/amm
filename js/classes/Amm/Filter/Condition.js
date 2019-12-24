/* global Amm */

Amm.Filter.Condition = function(filter, options) {
    
    if (options && options._id) {
        this.id = options._id;
        delete options._id;
    }
    
    if (options && options._class) {
        this.requiredClass = options._class;
        delete options._class;
    }
    
    if (options && options._not) {
        this.not = true;
        delete options._not;
    }
    
    Amm.FilterSorter.Observer.call(this, filter, options, true);
    
};


/**
 * Function to check if `value` matches `criterion`.
 * May be used statically.
 * 
 * Array values: will return TRUE if at least one item satisfies criterion, unless criterion.only provided.
 * Array criteria: will return TRUE if value satisfies ANY criterion, unless criterion.and provided.
 * 
 * Possible `criterion` values:
 * 
 * -    [`criterion`, `criterion`, `criterion`]: value meets at least one of specified criteria
 * -    { only: [`criterion`, `criterion`, `criterion`] }: when array `value` provided, all items should match at least one of specified criteria
 * -    { and: ['`criterion`, `criterion`, `criterion`] }: value must meet ALL of specified criteria; when array `value` provided, all items must match all specified criteria
 * -    { typeof: `type` }: typeof value === `type`
 * -    { not: `criterion` }: TRUE if value does NOT meet specified criterion
 * -    function(value): callback that returns true if test is passed
 * -    { fn: function(value), [scope: object] }: callback that will be called with provided scope
 * -    /RegExp/: value matches RegExp
 * -    { regExp: '/RegExp/', [flags: 'flags'] }: value matches RegExp (with provided string definition)
 * -    { validator: `validator` }: value passes Amm.Validator (prototype may be provided instead of instance)
 * -    Amm.Validator instance: value passes Amm.Validator
 * -    { rq: `requirements` }: Amm.meetsRequirements(value, `requirements`
 * -    { strict: `testValue` }: value === `testValue` (force strict comparison)
 * -    `otherCriterion`: value == `otherCriterion` (all other criterion values: non-strict comparison)
 */
Amm.Filter.Condition.testValue = function(value, criterion) {
    var i, l;
    if (value instanceof Array || value && value['Amm.Array']) {
        if (typeof criterion === 'object' && criterion && criterion.only) { // will return TRUE only if ALL array items meet condition
            for (i = 0, l = value.length; i < l; i++) {
                if (!Amm.Filter.Condition.testValue(value[i], criterion.only)) return false;
            }
            return true;
        }
        for (i = 0, l = value.length; i < l; i++) {
            if (Amm.Filter.Condition.testValue(value[i], criterion)) return true;
        }
        return false;
    }
    if (criterion instanceof Array) {
        for (i = 0, l = criterion.length; i < l; i++) {
            if (this.testValue(value, criterion[i])) return true;
        }
        return;
    }
    if (criterion instanceof RegExp) {
        return typeof value === 'string' && criterion.exec(value);
    }
    if (typeof criterion === 'function') {
        return !!criterion(value);
    }
    if (typeof criterion === 'object' && criterion) {
        if ('and' in criterion) {
            if (!criterion.and || !(criterion.and instanceof Array)) return Amm.Filter.Condition.testValue(value, criterion.and);
            for (i = 0, l = criterion.and.length; i < l; i++) {
                if (!this.testValue(value, criterion.and[i])) return false;
            }
            return true;
        }
        if ('only' in criterion) return Amm.Filter.Condition.testValue(value, criterion.only);
        if ('typeof' in criterion) {
            return Amm.Filter.Condition.testValue(typeof value, criterion.typeof)
        }
        if (typeof criterion.fn === 'function') return criterion.scope? criterion.fn.call(criterion.scope, value) : criterion.fn(value);
        if ('regExp' in criterion) return Amm.Filter.Condition.testValue(value, new RegExp(criterion.regExp, criterion.flags || ''));
        if ('validator' in criterion) {
            return !Amm.Validator.iErr(criterion, 'validator', value);
        }
        if (criterion['Amm.Validator']) {
            return !criterion.getError(value);
        }
        if ('strict' in criterion) return value === criterion.strict;
        if ('rq' in criterion) return Amm.meetsRequirements(value, criterion.rq);
        if ('not' in criterion) return !Amm.Filter.Condition.testValue(value, criterion.not);
        throw Error ("object `test` must contain at least one of following keys: `and`, `only`, `fn`, `regExp`, `validator`, `strict`, `rq`, `not`");
    }
    return criterion == value; // non-strict comparison
};

Amm.Filter.Condition.prototype = {
    
    'Amm.Filter.Condition': '__CLASS__',
    
    id: null, // For named conditions
    
    requiredClass: null, // one or more classes
    
    not: false, // inverses the condition
    
    match: function(object) {
        var res = true;
        
        if (this.requiredClass && !Amm.is(object, this.requiredClass)) res = false;
        else res = this._doMatch(object);
        
        if (this.not) res = !res;
        return res;
    },
    
    _doMatch: function(object) {
        return true;
    },
    
    setProps: function(props, propName) {
        // template method
    },
    
    getProps: function(propName) {
        // template method
    },
    
    outPropsChange: function(props, oldProps) {
        return this._out('propsChange', props, oldProps);
    }
    
};

Amm.extend(Amm.Filter.Condition, Amm.FilterSorter.Observer);
