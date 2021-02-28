/* global Amm */

Amm.MultiObserver.Sorter.Expression = function(options) {
    Amm.MultiObserver.Abstract.Expression.call(this, options);
    Amm.MultiObserver.Sorter.Criterion.call(this, null);
};

Amm.MultiObserver.Sorter.Expression.prototype = {

    'Amm.MultiObserver.Sorter.Expression': '__CLASS__', 
    
};

Amm.extend(Amm.MultiObserver.Sorter.Expression, Amm.MultiObserver.Abstract.Expression);
Amm.extend(Amm.MultiObserver.Sorter.Expression, Amm.MultiObserver.Sorter.Criterion);

