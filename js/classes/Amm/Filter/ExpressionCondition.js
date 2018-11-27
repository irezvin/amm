/* global Amm */

Amm.Filter.ExpressionCondition = function(filter, options) {
    var opt = Amm.override({}, options);
    var expression = null;
    if (options._expr) {
        expression = options._expr;
        delete options._expr;
    }
    if (!expression) 
        throw Error("options._expr must be provided for Amm.Filter.ExpressionCondition");
    Amm.Filter.Condition.call(this, filter, options);
    this._props = Amm.override({}, options);
    
    this._setExpression(expression);
};

Amm.Filter.ExpressionCondition.prototype = {

    'Amm.Filter.ExpressionCondition': '__CLASS__', 
    
    _expression: null,
    
    _evaluator: null,
    
    _props: null,
    
    _setExpression: function(expression) {
        this._expression = new Amm.Expression(expression);
        this._expression.setEventsProxy(this._filter);
    },
    
    _handleExpressionChanged: function(value, oldValue) {
        var object = this._expression.getExpressionThis();
        this._filter.refresh(object);
    },
    
    match: function(object) {
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
        this._evaluator.env.vars = this._props;
        
        return this._evaluator();
    },
    
    observe: function(objects) {
        for (var i = 0, l = objects.length; i < l; i++) {
            var o = objects[i];
            if (this._expression.findContext(o) !== undefined) continue; // already subscribed
            this._expression.createContext({expressionThis: o, vars: this._props});
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
        Amm.Filter.Condition.prototype.cleanup.call(this);
        this._expression.cleanup();
        this._evaluator = null;
        this._expression = null;
        this._props = {};
    },
    
    setProps: function(props, propName) {
        var oldProps;
        if (this._subscribers.propsChange) oldProps = Amm.override({}, this._props);
        if (propName) this._props[propName] = props;
        else {
            if (!props || (typeof props) !== 'object')
                throw Error("`props` must be a non-null object when `propName` not provided");
            this._props = propName;
        }
        if (this._expression) {
            if (this._filter) this._filter.beginUpdate();
            var cc = this._expression.listContexts(), i, l;
            for (i = 0, l = cc.length; i < l; i++) {
                this._expression.setContextId(cc[i]);
                this._expression.setVars(props, propName);
            }
            if (this._filter) this._filter.endUpdate();
        }
        if (this._subscribers.propsChange) this.outPropsChange(this._props, oldProps);
    },
    
    getProps: function(propName) {
        if (propName !== undefined) return this._props[propName];
        return this._props;
    }

};

Amm.extend(Amm.Filter.ExpressionCondition, Amm.Filter.Condition);

