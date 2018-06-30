/* global Amm */

// Variant A: 
// new Amm.Expression.FunctionHandler(options); 
// Variant B: new Amm.Expression.FunctionHandler(function, thisObject, options)
// Variant C: new Amm.Expression.FunctionHandler(function, thisObject, writeProperty, writeObject, writeArgs, options)
Amm.Expression.FunctionHandler = function(options) {
    Amm.WithEvents.call(this, options, true);
    this._expressions = {};
    this._get = {};
    this._set = {};
    var opt;
    var wp = null;
    
    var t = this;
    this._getter = function(expression, again) { return t.get(expression, again); };
    this._setter = function(expression, value) { return t.set(expression, value); };
    
    
    if (typeof options === 'function') {
        // case C?
        if (arguments.length >= 2 || 
            (typeof arguments[2] === 'object' && !(arguments[2] instanceof Array))
        ) {
            opt = arguments[6] || {};
            opt.fn = arguments[0];
            opt.thisObject = arguments[1];
            wp = true;
        } else {
            // case B
            opt = arguments[2] || {};
            opt.fn = arguments[0];
            opt.thisObject = arguments[1];
        }
    } else opt = options;
    Amm.init(this, opt);
    if (wp) this.setWriteProperty(arguments[2], arguments[3], arguments[4]);
};

Amm.Expression.FunctionHandler.prototype = {

    _fn: null,

    _thisObject: null,
    
    _isRun: 0,
    
    _get: null,
    
    _set: null,
    
    _again: false,
    
    _writeObject: null,

    _writeProperty: null,
    
    _writeArgs: null,
    
    _lockWrite: 0,
    
    _value: null,
    
    _gotValue: false,

    setFn: function(fn) {
        var oldFn = this._fn;
        if (oldFn === fn) return;
        if (this._fn) throw "Can setFn() only once";
        if (typeof fn !== 'function') throw "fn must be a function";
        this._fn = fn;
        return true;
    },

    getFn: function() { return this._fn; },

    setThisObject: function(thisObject) {
        var oldThisObject = this._thisObject;
        if (oldThisObject === thisObject) return;
        if (typeof thisObject !== 'object' || !thisObject)
            throw "thisObject must be a non-null object";
        this._thisObject = thisObject;
        if (thisObject['Amm.WithEvents'] && thisObject.hasEvent('cleanup')) {
            thisObject.subscribe('cleanup', this.cleanup, this);
        }
        return true;
    },

    getThisObject: function() { return this._thisObject; },

    _setValue: function(value) {
        var oldValue = this._value;
        if (oldValue === value) return;
        this._gotValue = true;
        this._value = value;
        if (this._writeProperty) this._write();
        this.outValueChange(value, oldValue);
        return true;
    },

    getValue: function(again) {
        if (again || !this._gotValue) {
            this._run(again);
        }
        return this._value;
    },
    
    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    },
    
    _run: function(again) {
        if (!this._fn) return;
        if (this._isRun) return;
        this._isRun++;
        this._again = !!again;
        var v = this._fn.call(this, this._getter, this._setter);
        this._setValue(v);
        this._cleanExpressions();
        this._isRun--;
    },
    
    setWriteProperty: function(writeProperty, writeObject, writeArgs) {
        if (arguments.length === 1 && writeProperty instanceof Array) {
            writeProperty = arguments[0][0];
            writeObject = arguments[0][1];
            writeArgs = arguments[0][2];
        }
        if (this._writeProperty) throw "Can setWriteProperty() only once";
        if (!writeProperty) throw "writeProperty must be non-falseable";
        if (writeProperty['Amm.Expression']) {
            if (writeObject || writeArgs) throw "When Amm.Expression is used as writeProperty, don't specify writeObject/writeArgs";
            writeObject = writeProperty;
            writeProperty = 'value';
            writeObject.subscribe('writeDestinationChanged', this._write, this);
        }
        if (writeArgs === null || writeArgs === undefined) {
            writeArgs = null;
        } else if (!(writeArgs instanceof Array)) {
            writeArgs = [writeArgs];
        }
        if (!writeObject && !this._thisObject) {
            throw "setThisObject() or provide writeObject when setting writeProperty";
        }
        this._writeProperty = writeProperty;
        this._writeObject = writeObject;
        if (writeObject && writeObject['Amm.WithEvents'] && writeObject.hasEvent('cleanup')) {
            writeObject.subscribe('cleanup', this.cleanup, this);
        }
        this._writeArgs = writeArgs;
        this._write();
    },
    
    _write: function() {
        if (this._lockWrite || !this._writeProperty) return;
        this._lockWrite++;
        var wo = this._writeObject || this._thisObject;
        Amm.setProperty(wo, this._writeProperty, this.getValue(), false, this._writeArgs);
        this._lockWrite--;
    },
    
    getWriteProperty: function(all) {
        return all? [this._writeProperty, this._writeObject, this._writeArgs] : this._writeProperty;
    },
    
    getWriteObject: function() {
        return this._writeObject;
    },
    
    getWriteArgs: function() {
        return this._writeArgs;
    },

    _handleExpressionValueChange: function(value, oldValue) {
        if (this._lockWrite) return;
        this._run();
    },
    
    _handleExpressionDestinationChange: function() {
        if (this._lockWrite) return;
        this._run();
    },
    
    _access: function(expression, set) {
        if (this._isRun) this[set? '_set' : '_get'][expression] = true;
        if (!this._expressions[expression]) {
            this._expressions[expression] = new Amm.Expression(
                expression, 
                this._thisObject
            );
            if (set) {
                this._expressions[expression].subscribe('writeDestinationChanged', 
                    this._handleExpressionDestinationChange, this);
            } else {
                this._expressions[expression].subscribe('valueChange', 
                    this._handleExpressionValueChange, this);
            }
        }
        return this._expressions[expression];
    },

    get: function(expression, again) {
        if (again === undefined) again = this._again;
        return this._access(expression).getValue(again);
    },
    
    set: function(expression, value) {
        return this._access(expression, true).setValue(value);
    },
    
    _cleanExpressions: function(all) {
        for (var i in this._expressions) {
            if (this._expressions.hasOwnProperty(i)) {
                if (all || !this._get[i] && !this._set[i]) {
                    this._expressions[i].unsubscribe(undefined, undefined, this);
                    this._expressions[i].cleanup();
                    delete this._expressions[i];
                }
            }
        }
        this._get = {};
        this._set = {};
    },
    
    cleanup: function() {
        this._cleanExpressions(true);
        if (this._writeObject && this._writeObject['Amm.Expression']) {
            this._writeObject.cleanup();
        }
        Amm.WithEvents.prototype.cleanup.call(this);
    }
    
    
};

Amm.extend(Amm.Expression.FunctionHandler, Amm.WithEvents);
