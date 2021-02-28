/* global Amm */

Amm.MultiObserver.Filter.ExpressionCondition = function(options) {
    Amm.MultiObserver.Filter.Condition.call(this, options);
    Amm.MultiObserver.Abstract.Expression.call(this, {});
};

Amm.MultiObserver.Filter.ExpressionCondition.prototype = {

    'Amm.MultiObserver.Filter.ExpressionCondition': '__CLASS__', 
    
    setExpr: function(expr) {
        return this.setExpression(expr);
    },
    
};

Amm.extend(Amm.MultiObserver.Filter.ExpressionCondition, Amm.MultiObserver.Abstract.Expression);
Amm.extend(Amm.MultiObserver.Filter.ExpressionCondition, Amm.MultiObserver.Filter.Condition);

