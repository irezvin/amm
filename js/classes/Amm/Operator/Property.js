/* global Amm */

Amm.Operator.Property = function(object, property, args, cacheability, isCall) {
    this._isEvaluating++;
    Amm.Operator.call(this);
    if (object !== undefined) this._setOperand('object', object);
    if (property !== undefined) this._setOperand('property', property);
    if (args !== undefined) this._setOperand('arguments', args);
    if (isCall) {
        this._isCall = true;
        this.supportsAssign = false;
    }
    if (cacheability !== undefined && cacheability !== null) {
        this._cacheability = !!cacheability;
    }
    this._isEvaluating--;
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
    
    _isCall: false,
    
    _cacheability: null,
    
    _eventName: false,
    
    supportsAssign: true,
    
    OPERANDS: ['object', 'property', 'arguments'],
    
    STATE_SHARED: {
        _isCall: true,
        _cacheability: true,
        supportsAssign: true
    },
    
    setObject: function(object) {
        this._setOperand('object', object);
    },
    
    promoteToCall: function(args, cacheability) {
        if (this._hasValue) Error("Cannot promoteToCall(): already evaluated")
        this._isEvaluating++;
        this._isCall = true;
        this.supportsAssign = false;
        if (this._argumentsOperator || !(this._arguments === null || this._arguments === undefined))
            Error("Getter arguments already defined - cannot promote to call")
        if (cacheability !== undefined && cacheability !== null) {
            this._cacheability = !!cacheability;
        }
        if (args !== undefined) this._setOperand('arguments', args);
        this._isEvaluating--;
    },
    
    hasArguments: function() {
        return this._argumentsOperator || !(this._arguments === null || this._arguments === undefined);
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
    
    _objectChange: function(object, oldObject) {
        if (object && !object['Amm.WithEvents'] && !this._isCall && this._cacheability === null) {
            this._setNonCacheable(this._nonCacheable | Amm.Operator.NON_CACHEABLE_VALUE);
        }
    },
    
    _objectEvents: function(object, oldObject) {
        if (oldObject) this._unsub(oldObject);
        if (!object) {
            this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_VALUE); // always-null cacheable value
        } else if (this._isCall || (object && !object['Amm.WithEvents'])) {
            // we don't watch for properties that return method calls
            var cacheability = this._cacheability;
            if (cacheability === null) cacheability = this._isCall;
            if (cacheability) {
                 this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_CONTENT);
            } else {
                 this._setNonCacheable(this._nonCacheable | Amm.Operator.NON_CACHEABLE_CONTENT);
            }
        } else {
            this._subToProp(this._propertyValue);
            if (object.outCleanup) this._sub(object, 'cleanup', this._handleObjectCleanup, undefined, true);
        }
    },
    
    getReportsContentChanged: function() {
        return this._cacheability;
    },
    
    _subToProp: function(property) {
        if (!property && property !== 0 || (this._objectValue['Amm.Array'] && parseInt(property) == property)) {
            // become cacheable
            // Also we don't need to observe Amm.Array because it is done by Amm.Operator
            if (this._nonCacheable) this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_VALUE); 
            return;
        }
        var e = property + 'Change';
        if (!this._objectValue.hasEvent(e)) e = null;
        if (e) {
            this._sub(this._objectValue, e, undefined, undefined, true);
            this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_VALUE);
        } else {
            this._setNonCacheable(this._nonCacheable | Amm.Operator.NON_CACHEABLE_VALUE);
        }
        this._eventName = e;
    },
    
    _propertyChange: function(property, oldProperty) {
        if (!this._objectValue || !this._objectValue['Amm.WithEvents']) return;
        if (this._eventName === 'spliceItems' && parseInt(property) == property) return; // index changed - ok than
        if (this._eventName) this._unsub(this._objectValue, this._eventName);
        if (!this._isCall) {
            this._subToProp(property);
        } else {
            var cacheability = this._cacheability;
            if (cacheability === null) cacheability = true;
            if (cacheability) {
                 this._setNonCacheable(this._nonCacheable & ~Amm.Operator.NON_CACHEABLE_VALUE);
            } else {
                 this._setNonCacheable(this._nonCacheable | Amm.Operator.NON_CACHEABLE_VALUE);
            }
        }
    },
    
    _doEvaluate: function(again) {
        
        var property = this._getOperandValue('property', again);
        
        if (!property && property !== 0) return; 
        property = '' + property;
        
        var object = this._getOperandValue('object', again);
        if (!object) return;
        
        var args;
        
        if (this._isCall) {
            
            if (typeof object[property] !== 'function') Error("cannot call a non-function property")
            args = this._getOperandValue('arguments', again);
            if (args === null || args === undefined) return object[property]();
            else if (args instanceof Array) return object[property].apply(object, args);
            else return object[property](args);
        }
        
        var getter = 'get' + property[0].toUpperCase() + property.slice(1);

        if (typeof object[getter] !== 'function') return object[property];

        var args = this._getOperandValue('arguments', again);

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

        if (this._isCall) return function(e) {
            var property = _property(e);
            if (!property && property !== 0) return; 
            property = '' + property;
            
            var object = _object(e);
            if (!object) return;
            
            if (typeof object[property] !== 'function') Error("cannot call a non-function property")
            var args = _args(e);
            
            if (args === null || args === undefined) return object[property]();
            else if (args instanceof Array) return object[property].apply(object, args);
            return object[property](args);
        };
        
        return function(e) {
            
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

