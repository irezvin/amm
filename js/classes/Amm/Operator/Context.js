/* global Amm */

Amm.Operator.Context = function(operator, data) {
    if (!operator || !operator['Amm.Operator']) throw "`operator` required";
    if (data) {
        if (typeof data !== 'object') throw "`data`: object required";
        for (var i in data) {
            if (data.hasOwnProperty(i)) {
                this[i] = data[i];
            }
        }
    }
    this.operator = operator;
    this.id = ++Amm.Operator.Context._iid;
    Amm.Operator.Context.instances[this.id] = this;
};

Amm.Operator.Context.instances = {};

Amm.Operator.Context._iid = 0;

Amm.Operator.Context.prototype = {
    
    id: null,
    
    operator: null,
    
   cleanup: function() {
        // TODO (something)
        delete Amm.Operator.Context.instances[this.id];
        if (this.operator) this.operator.deleteContext(this.id);
    }
    
};
