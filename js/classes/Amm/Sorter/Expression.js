/* global Amm */

Amm.Sorter.Expression = function(sorter, options) {
    Amm.Sorter.Criterion.call(this, sorter, options);
    if (!this._expression) throw Error("Need to provide options.expression");
};

Amm.Sorter.Expression.prototype = {

    'Amm.Sorter.Expression': '__CLASS__', 

    _expression: null,
    
    _evaluator: null,
    
    setExpression: function(expression) {
        var oldExpression = this._expression;
        if (oldExpression === expression) return;
        if (this._expression) throw Error ("Can setExpression() only once");
        if (typeof expression !== 'string') throw Error("`expression` must be a string");
        this._expression = new Amm.Expression(expression);
        this._expression.setEventsProxy(this._filterSorter);
        return true;
    },

    getExpression: function() { return this._expression; },

    observe: function(objects) {
        for (var i = 0, l = objects.length; i < l; i++) {
            var o = objects[i];
            if (this._expression.findContext(o) !== undefined) continue; // already subscribed
            this._expression.createContext({expressionThis: o});
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
    
    _handleExpressionChanged: function(value, oldValue) {
        var object = this._expression.getExpressionThis();
        this._filterSorter.refresh(object);
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
        
        return this._evaluator();
    },
    
    cleanup: function() {
        Amm.Sorter.Criterion.prototype.cleanup.call(this);
        this._expression.cleanup();
        this._evaluator = null;
        this._expression = null;
    },
    
    
};

Amm.extend(Amm.Sorter.Expression, Amm.Sorter.Criterion);

