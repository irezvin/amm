/* global Amm */

Amm.Drag.Constraint = function(options) {
    if (this['Amm.Drag.Constraint'] === '__CLASS__') {
        throw Error("Attempt to instantiate abstract class Amm.Drag.Constraint");
    }
    Amm.init(this, options);
};

Amm.Drag.Constraint.prototype = {

    'Amm.Drag.Constraint': '__CLASS__',

    /**
     * @return {Amm.Drag.Vector} Original vector or its' modified clone
     */
    apply: function(vector) {
        throw Error("Call to abstract method: Amm.Drag.Constraint.apply()");
    }

};