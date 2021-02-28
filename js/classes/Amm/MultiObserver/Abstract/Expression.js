/* global Amm */

Amm.MultiObserver.Abstract.Expression = function(options) {
    Amm.MultiObserver.Abstract.Observer.call(this, options);
};

Amm.MultiObserver.Abstract.Expression.prototype = {
    
    'Amm.MultiObserver.Abstract.Expression': '__CLASS__', 
    
    _expression: null,
    
    _evaluator: null,
    
    _vars: null,
    
    setMultiObserver: function(multiObserver) {
        var res = Amm.MultiObserver.Abstract.Observer.prototype.setMultiObserver.call(this, multiObserver);
        if (res) {
            if (this._expression) {
                this._expression.setEventsProxy(this._multiObserver);
            }
        }
        return res;
    },
    
    getExpression: function() {
        return this._expression;
    },
    
    setExpression: function(expression) {
        if (this._expression) throw Error("Can set setExpression() only once");
        this._expression = new Amm.Expression({src: expression, vars: this._vars});
        if (this._multiObserver) this._expression.setEventsProxy(this._multiObserver);
    },
    
    _handleExpressionChanged: function(value, oldValue) {
        var object = this._expression.getExpressionThis();
        this._multiObserver.refresh(object);
    },
    
    _doGetValue: function(object) {
        if (object === this._expression.getExpressionThis()) {
            return this._expression.getValue();
        }
        var ctx = this._expression.findContext(object);
        
        if (ctx !== undefined) { // return value for observed object
            this._expression.setContextId(ctx);
            return this._expression.getValue();
        }
        
        if (!this._evaluator) this._evaluator = this._expression.toFunction();
        
        this._evaluator.env.expressionThis = object;
        this._evaluator.env.vars = this._vars;
        
        return this._evaluator();
    },
    
    observe: function(objects) {
        for (var i = 0, l = objects.length; i < l; i++) {
            var o = objects[i];
            if (this._expression.findContext(o) !== undefined) continue; // already subscribed
            this._expression.createContext({expressionThis: o, vars: this._vars});
            this._expression.subscribe('valueChange', this._handleExpressionChanged, this);
        }
    },
    
    unobserve: function(objects) {
        for (var i = 0, l = objects.length; i < l; i++) {
            var id = this._expression.findContext(objects[i]);
            if (id === undefined) continue; // not subscribed
            this._expression.deleteContext(id);
        }
    },
    
    cleanup: function() {
        Amm.MultiObserver.Abstract.Observer.prototype.cleanup.call(this);
        this._expression.cleanup();
        this._evaluator = null;
        this._expression = null;
        this._vars = {};
    },
    
    setVars: function(vars, varName) {
        if (!this._expression) {
            if (varName) {
                if (!this._vars) this._vars = {};
                this._vars[varName] = vars;
            }
            else this._vars = vars;
            return;
        }
        var oldVars;
        if (this._subscribers.varsChange) oldVars = Amm.override({}, this._vars);
        if (varName) this._vars[varName] = vars;
        else {
            if (!vars || (typeof vars) !== 'object')
                throw Error("`vars` must be a non-null object when `varName` not provided");
            this._vars = vars;
        }
        if (this._expression) {
            if (this._multiObserver) this._multiObserver.beginUpdate();
            var cc = this._expression.listContexts(), i, l;
            for (i = 0, l = cc.length; i < l; i++) {
                this._expression.setContextId(cc[i]);
                this._expression.setVars(vars, varName);
            }
            if (this._multiObserver) this._multiObserver.endUpdate();
        }
        if (this._subscribers.varsChange) this.outVarsChange(this._vars, oldVars);
    },
    
    getVars: function(varName) {
        if (varName !== undefined) return this._vars[varName];
        return this._vars;
    },
    
    outVarsChange: function(vars, oldVars) {
        return this._out('varsChange', vars, oldVars);
    }

};

Amm.extend(Amm.MultiObserver.Abstract.Expression, Amm.MultiObserver.Abstract.Observer);
