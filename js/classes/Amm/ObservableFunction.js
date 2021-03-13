/* global Amm */

Amm.ObservableFunction = function(fn, expressionThis, writeProperty, writeObject) {

    var options;
    
    if (fn && typeof fn === 'object' && arguments.length === 1) {
        options = Amm.override({}, fn);
        fn = options.fn;
        delete options.fn;
        expressionThis = options.expressionThis;
        delete options.expressionThis;
        writeProperty = options.writeProperty;
        delete options.writeProperty;
        writeObject = options.writeObject;
        delete options.writeObject;
    }
    
    Amm.WithEvents.call(this);
    this._links = [];
    this._vars = {};
    if (!fn || typeof fn !== 'function') throw Error("`fn` is required and must be a function");
    this._fn = fn;
    this._expressionThis = expressionThis || null;
    if (expressionThis && expressionThis['Amm.WithEvents'] && expressionThis.hasEvent('cleanup')) {
        expressionThis.subscribe('cleanup', this.handleExpressionThisCleanup, this);
    }
    this._writeObject = writeObject || null;
    this._writeProperty = writeProperty || null;
    var t = this;
    this._get = function(source, property, args, extraEvents) {
        if (arguments.length === 1) return t.get(source);
        if (arguments.length === 2) return t.get(source, property);
        if (arguments.length === 3) return t.get(source, property, args);
        if (arguments.length === 4) return t.get(source, property, args, extraEvents);
    };
    this._get.prop = function(source, property, args, extraEvents) {
        if (arguments.length === 1) return t.prop(source);
        if (arguments.length === 2) return t.prop(source, property);
        if (arguments.length === 3) return t.prop(source, property, args);
        if (arguments.length === 4) return t.prop(source, property, args, extraEvents);
    },
    this._get.vars = function(varName) {
        return t.get(t, 'vars', varName);
    };
    var onHandlers = this._extractOnHandlers(options);
    Amm.init(this, options);
    if (onHandlers) this._initOnHandlers(onHandlers);
    this._checkNeedObserve();
    if (this._writeProperty && (this._writeObject || this._expressionThis)) {
        this.update();
    }
};

Amm.ObservableFunction.prototype = {

    'Amm.ObservableFunction': '__CLASS__', 
    
    _fn: null,
    
    _expressionThis: null,
    
    _links: null,
    
    _vars: null,
    
    _value: undefined,
    
    _level: 0,
    
    /**
     * @type function
     */
    _get: null,
    
    _observes: false,
    
    cleanupWithExpressionThis: true,
    
    _setObserves: function(observes) {
        observes = !!observes;
        if (observes === this._observes) return;
        this._observes = observes;
        if (observes) this.update();
            else this.clean();
    },
    
    getObserves: function() {
        return this._observes;
    },
    
    _subscribeFirst_valueChange: function() {
        this._checkNeedObserve();
    },
    
    _unsubscribeLast_valueChange: function() {
        this._checkNeedObserve();
    },
    
    _checkNeedObserve: function() {
        var needObserve = false;
        if (this._writeProperty && (this._writeObject || this._expressionThis)) needObserve = true;
        else if (this._subscribers['valueChange']) needObserve = true;
        if (needObserve !== this._observes) this._setObserves(needObserve);
    },
    
    update: function() {
        if (!this._fn) return; // called after cleanup?
        var i, l, value, ex, exception;
        if (!this._level) {
            for (i = 0, l = this._links.length; i < l; i++) this._links[i].used = false;
        }
        this._level++;
        try {
            value = this._coreCalc();
        } catch (ex) {
            exception = ex;
        }
        this._level--;
        if (exception) throw exception;
        this.clean(true);
        this.setValue(value);
    },
    
    clean: function(unusedOnly) {
        for (i = this._links.length - 1; i >= 0; i--) {
            if (unusedOnly && this._links[i].used) continue;
            this._links[i].dispose(true);
            if (unusedOnly) this._links.splice(i, 1);
        }
        if (!unusedOnly) this._links = [];
    },
    
    _getOrProp: function(returnVal, source, property, args, extraEvents) {
        if (!source) return undefined;
        if ((typeof source === 'string')) {
            if (arguments.length < 5) {
                extraEvents = args;
                args = property;
                property = null;
            }
            if (property === null || property === undefined) {
                var headTail = source.split('.');
                property = headTail.pop();
                if (headTail.length) source = this.get(headTail.join('.'));
                else source = this._expressionThis;
            }
        }
        if (!this._observes && returnVal) return this._implGet(source, property, args);
        var link = new Amm.ObservableFunction.Link(this, source, property, args, extraEvents);
        if (returnVal) return link.val();
        return link;
    },
    
    prop: function(source, property, args, extraEvents) {
        if (arguments.length === 1) return this._getOrProp(false, source);
        if (arguments.length === 2) return this._getOrProp(false, source, property);
        if (arguments.length === 3) return this._getOrProp(false, source, property, args);
        if (arguments.length === 4) return this._getOrProp(false, source, property, args, extraEvents);
        
    },
    
    get: function(source, property, args, extraEvents) {
        if (arguments.length === 1) return this._getOrProp(true, source);
        if (arguments.length === 2) return this._getOrProp(true, source, property);
        if (arguments.length === 3) return this._getOrProp(true, source, property, args);
        if (arguments.length === 4) return this._getOrProp(true, source, property, args, extraEvents);
    },
    
    _implGet: function(source, property, args) {
        if (!source || typeof source !== 'object') return undefined;
        return Amm.getProperty(source, property, undefined, args);
    },
    
    findLink: function(source, property, args, extraEvents, prepared) {
        if (!prepared) {
            extraEvents = Amm.ObservableFunction.prepareArgs(extraEvents) || null;
            args = Amm.ObservableFunction.prepareArgs(args);
        }
        for (var i = 0, l = this._links.length; i < l; i++) {
            if (this._links[i].match(source, property, args, extraEvents, true)) return i;
        }
        return -1;
    },

    setValue: function(value) {
        var oldValue = this._value;
        if (oldValue === value) return;
        this._value = value;
        if (this._writeProperty) {
            var writeObject = this._writeObject || this._expressionThis;
            if (writeObject) Amm.setProperty(writeObject, this._writeProperty, value);
        }
        this.outValueChange(value, oldValue);
        return true;
    },
    
    _coreCalc: function() {
        return this._fn.call(this._expressionThis || window, this._get, this);
    },

    getValue: function() {
        if (!this._observes) {
            this._value = this._coreCalc();
        }
        return this._value; 
    },

    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    },
    
    cleanup: function() {
        this.clean();
        this._links = [];
        this._expressionThis = null;
        this._writeObject = null;
        this._value = null;
        this._fn = null;
        this._get = null;
        this.outCleanup();
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    outCleanup: function() {
        this._out('cleanup');
    },
    
    getWasCleanup: function() {
        return !this._fn;
    },
    
    setExpressionThis: function(expressionThis) {
        var oldExpressionThis = this._expressionThis;
        if (oldExpressionThis === expressionThis) return;
        this._expressionThis = expressionThis;
        var subExpressionThis = expressionThis && expressionThis['Amm.WithEvents'] && expressionThis.hasEvent('cleanup')?
            expressionThis: null;
        Amm.subUnsub(subExpressionThis, oldExpressionThis, this, 'cleanup', this.handleExpressionThisCleanup);
        this.outExpressionThisChange(expressionThis, oldExpressionThis);
        this._checkNeedObserve();
        this.update();
        return true;
    },

    getExpressionThis: function() { return this._expressionThis; },

    outExpressionThisChange: function(expressionThis, oldScope) {
        this._out('expressionThisChange', expressionThis, oldScope);
    },

    handleExpressionThisCleanup: function() {
        if (this.cleanupWithExpressionThis) {
            this.cleanup();
        } else {
            this.setExpressionThis(null);
        }
    },

    setVars: function(vars, varName) {
        var oldVars = this._vars;
        if (varName !== undefined && varName !== null) {
            if (this._vars[varName] === vars) return;
            oldVars = Amm.override({}, oldVars);
            if (vars === undefined) delete this._vars[varName];
            else this._vars[varName] = vars;
            this.outVarsChange(this._vars, oldVars);
            return true;
        }
        vars = vars || {};
        if (oldVars === vars) return;
        this._vars = vars;
        this.outVarsChange(vars, oldVars);
        return true;
    },

    getVars: function(varName) {
        return (varName === undefined || varName === null)? this._vars : this._vars[varName]; 
    },

    outVarsChange: function(vars, oldVars) {
        this._out('varsChange', vars, oldVars);
    },
    
};

Amm.extend(Amm.ObservableFunction, Amm.WithEvents);

Amm.ObservableFunction.prepareArgs = function(args) {
    if (args instanceof Array) {
        if (!args.length) return null;
        if (args.length === 1 && !(args[0] instanceof Array)) return args[0];
        return args.length? args : null;
    }
    if (args === null || args === undefined) return null;
    return args;
};

