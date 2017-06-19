/* global Amm */

Amm.Operator.Property = function(object, property, args) {
    Amm.Operator.call(this);
    if (object !== undefined) this._setOperand('object', object);
    if (property !== undefined) this._setOperand('property', property);
    if (args !== undefined) this._setOperand('arguments', args);
};

// returns Expression variable with the name that matches the operand

Amm.Operator.Property.prototype = {

    'Amm.Operator.Property': '__CLASS__', 
    
    _objectOperator: null,
    
    _objectValue: null,
    
    _objectExists: null,
    
    _propertyOperator: null,
    
    _propertyValue: null,
    
    _propertyExists: null,
    
    _argumentsOperator: null,
    
    _argumentsValue: null,
    
    _argumentsExists: null,
    
    _eventName: false,
    
    supportsAssign: true,
    
    OPERANDS: ['object', 'property', 'arguments'],
    
    setObject: function(object) {
        this._setOperand('object', object);
    },
    
    setProperty: function(property) {
        this._setOperand('property', property);
    },
    
    setArguments: function(args) {
        this._setOperand('arguments', args);
    },

    _handleObjectCleanup: function() {
        this._setOperandValue('object', null);
    },

    _objectEvents: function(object, oldObject) {
        if (oldObject) this._unsub(oldObject);
        if (!object) {
            this._setNonCacheable(false); // always-null cacheable value
        } else if (object && !object['Amm.WithEvents']) {
            this._setNonCacheable(true); // cannot subscribe. So we're non-cacheable
        } else {
            this._subToProp(this._propertyValue);
            if (object.outCleanup) object.subscribe('cleanup', this._handleObjectCleanup, this);
        }
    },
    
    _subToProp: function(property) {
        if (!property && property !== 0) {
            if (this._nonCacheable) this._setNonCacheable(false); //become cacheable
            return;
        }
        if (this._objectValue['Amm.Array'] && parseInt(property) == property) e = 'spliceItems';
        else {
            e = property + 'Change';
            if (!this._objectValue.hasEvent(e)) e = null;
        }
        if (e) this._sub(this._objectValue, e, true);
        this._setNonCacheable(!e); // we're non-cacheable if we aren't subscribed to anything
        this._eventName = e;
    },
    
    _propertyChange: function(property, oldProperty) {
        if (!this._objectValue || !this._objectValue['Amm.WithEvents']) return;
        if (this._eventName === 'spliceItems' && parseInt(property) == property) return; // index changed - ok than
        if (this._eventName) this._objectValue.unsubscribe(this._eventName, undefined, this);
        this._subToProp(property);
    },
    
    _doEvaluate: function() {
        
        var property = this._getOperandValue('property');
        
        if (!property && property !== 0) return; 
        property = '' + property;
        
        var object = this._getOperandValue('object');
        if (!object) return;
        
        var getter = 'get' + property[0].toUpperCase() + property.slice(1);

        if (typeof object[getter] !== 'function') return object[property];

        var args = this._getOperandValue('arguments');

        if (args === null || args === undefined) {

        } else if (args instanceof Array) {
            if (!args.length) args = null;
        } else {
            args = [args];
        }

        if (args) return object[getter].apply(object, args);
        else return object[getter]();
        
    },

    toFunction: function() {
        var _property = this._operandFunction('property');
        var _object = this._operandFunction('object');
        var _args = this._operandFunction('arguments');
        return function(e, value) {
            
            var property = _property(e);
            if (!property && property !== 0) return; 
            property = '' + property;
            
            var object = _object(e);
            if (!object) return;
            
            var getter = 'get' + property[0].toUpperCase() + property.slice(1);
            
            if (typeof object[getter] !== 'function') return object[property];
            
            var args = _args(e);

            if (args === null || args === undefined) {

            } else if (args instanceof Array) {
                if (!args.length) args = null;
            } else {
                args = [args];
            }

            if (args) return object[getter].apply(object, args);
            else return object[getter]();
        };
    },
    
    _doSetValue: function(value, checkOnly) {
        
        var property = this._getOperandValue('property');
        
        if (!property && property !== 0) return; 
        property = '' + property;
        
        if (property[0] === '_') return 'cannot assign to pseudo-private properties(beginning with \'_\')';
        
        var object = this._getOperandValue('object');
        if (!object) return '`object` is empty';
        
        var getter = 'get' + property[0].toUpperCase() + property.slice(1);

        var suff = property[0].toUpperCase() + property.slice(1);
        var getter = 'get' + suff;
        var setter = 'set' + suff;
        var hasGetter = typeof object[getter] === 'function';
        var hasSetter = typeof object[setter] === 'function';
        
        if (hasGetter && !hasSetter) return 'property is read-only (has getter but no setter)';
        
        if (checkOnly) return false;
        
        if (!hasSetter) {
            object[property] = value;
            return;
        }
        
        var args = this._getOperandValue('arguments');

        if (args === null || args === undefined) {
        } else if (args instanceof Array) {
            if (!args.length) args = null;
        } else {
            args = [args];
        }

        if (args) {
            args.unshift(value);
            object[setter].apply(object, args);
            return;
        }
        object[setter](value);
        
    },
        
    assignmentFunction: function() {
        var _property = this._operandFunction('property');
        var _object = this._operandFunction('object');
        var _args = this._operandFunction('arguments');
        return function(e, value) {
            
            var property = _property(e);
            if (!property) return '`property` is empty';
            property = '' + property;
            if (property[0] === '_') return 'cannot assign to pseudo-private properties(beginning with \'_\')';
            
            var object = _object(e);
            if (!object) return '`object` is empty';        
            
            var suff = property[0].toUpperCase() + property.slice(1);
            var getter = 'get' + suff;
            var setter = 'set' + suff;
            var hasGetter = typeof object[getter] === 'function';
            var hasSetter = typeof object[setter] === 'function';
            
            if (hasGetter && !hasSetter) return 'property is read-only (has getter but no setter)';
            
            if (!hasSetter) {
                object[property] = value;
                return;
            }
            
            var args = _args(e);

            if (args === null || args === undefined) {
            } else if (args instanceof Array) {
                if (!args.length) args = null;
            } else {
                args = [args];
            }

            if (args) {
                args.unshift(value);
                object[setter].apply(object, args);
                return;
            }
            object[setter](value);
        };
    }


};

Amm.extend(Amm.Operator.Property, Amm.Operator);

