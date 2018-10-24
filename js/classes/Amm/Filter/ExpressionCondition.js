/* global Amm */

Amm.Filter.ExpressionCondition = function(options) {
    Amm.Filter.Condition.call(this, options);
};

Amm.Filter.ExpressionCondition.prototype = {

    'Amm.Filter.ExpressionCondition': '__CLASS__', 
    
    _expression: null

};

Amm.extend(Amm.Filter.ExpressionCondition, Amm.Filter.Condition);

