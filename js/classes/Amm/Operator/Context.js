/* global Amm */

Amm.Operator.Context = function(operator, data, parentContext) {
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
    this.parentContext = parentContext || null;
    if (parentContext === undefined) this._detectParentContext();    
    var p = this.parentContext;
    this.parentContextIds = {};
    while (p) {
        this.parentContextIds[p.id] = true;
        p = p.parentContext;
    }
};

Amm.Operator.Context.instances = {};

Amm.Operator.Context._iid = 0;

Amm.Operator.Context.prototype = {
    
    id: null,
    
    parentContext: null,
    
    operator: null,
    
    /**
     * @type object {id: true, id: true...}
     */
    parentContextIds: null,
    
    _detectParentContext: function() {
        var p = this.operator._parent;
        while (p && !this.parentContext) {
            this.parentContext = p.getCurrentContext() || null;
            p = p._parent;
        }
    },
    
    cleanup: function() {
        // TODO (something)
        delete Amm.Operator.Context.instances[this.id];
    }
    
};
