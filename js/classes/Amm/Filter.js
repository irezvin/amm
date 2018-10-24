/* global Amm */

Amm.Filter = function(options) {
    this._conditions = [];
    this._props = [];
    this._observerdObjects = [];
    Amm.WithEvents.call(this, options);
};

Amm.Filter.createCondition = function(condition) {
    
    if (!condition || typeof condition !== 'object')
        throw Error("filter condition must be a string or an object, given: " 
            + Amm.describeType(condition));
    
    if (condition._expr) return new Amm.Filter.ExpressionCondition(this, condition);
    
    return new Amm.Filter.PropsCondition(this, condition);
    
},

Amm.Filter.prototype = {
    
    'Amm.Filter': '__CLASS__',
    
    _conditions: null,
    
    _props: null,
    
    _observedObjects: null,
    
    _expressions: null,
    
    setConditions: function(conditions, name) {
        
    },
    
    getConditions: function(name) {
        
    },
    
    hasNamedCondition: function(name) {
        
    },
    
    outConditionsChange: function(oldConditions, newConditions) {
        
    },
    
    getMatch: function(object) {
        
    },
    
    observeObject: function(object) {
        
    },
    
    unobserveObject: function(object) {
        
    },
    
    hasObservedObject: function(object) {
        
    },
    
    getObservedObjects: function(withMatches) {
        
    },

    outObjectObserved: function(object) {
        
    },
    
    outObjectUnobserved: function(object) {
        
    },
    
    outObservedObjectMatchChange: function(object, oldMatch, newMatch) {
        
    }
    
};

Amm.extend(Amm.Filter, Amm.WithEvents);