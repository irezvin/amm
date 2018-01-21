/* global Amm */

// returns Expression.getExpressionThis()

Amm.Operator.ExpressionThis = function() {
    Amm.Operator.call(this);
};

Amm.Operator.ExpressionThis.prototype = {

    'Amm.Operator.ExpressionThis': '__CLASS__', 
    
    setExpression: function(expression) {
        Amm.Operator.prototype.setExpression.call(this, expression);
        this._sub(expression, 'expressionThisChange');
        this._defaultHandler();
    },
    
    _initContextState: function(contextId, own) {    
        Amm.Operator.prototype._initContextState.call(this, contextId, own);
        if (own && this._expression) {
            this._sub(this._expression, 'expressionThisChange');
            this._defaultHandler();
        }
    },
    
    _doEvaluate: function(again) {
        if (!this._expression) {
            this._hasValue = false;
            return;
        } 
        return this._expression.getExpressionThis();
    },
    
    
    toFunction: function() {
        return function(e) {
            return e.expressionThis;
        };
    }
    
};

Amm.extend(Amm.Operator.ExpressionThis, Amm.Operator);

