/* global Amm */

Amm.Decorator.Data.Action = function(options) {
    Amm.init(this, options);
};

Amm.Decorator.Data.Action.prototype = {

    'Amm.Decorator.Data.Action': '__CLASS__', 
    
    src: null,
    
    /**
     * When this.merge is true, Amm.override will be applied to destObject directly
     * @type type
     */
    dest: null,
    
    def: undefined,
    
    decorator: null,
    
    merge: false,
    
    apply: function(srcObject, destObject) {
        if (!(srcObject && typeof srcObject === 'object')) throw Error("srcObject must be a non-null object");
        if (!(destObject && typeof destObject === 'object')) throw Error("destObject must be a non-null object");
        var value = undefined;
        if (!this.src) value = this.def !== undefined? this.def : srcObject;
        else value = Amm.Util.getByPath(srcObject, this.src, this.def);
        if (value === undefined) return;
        value = Amm.Decorator.d(value, this, 'decorator'); // Apply this.decorator
        if (value === undefined) return;
        var dest = this.dest;
        if (dest === '' && this.merge) {
            if (value && typeof value === 'object') Amm.override(destObject, value);
            return;
        }
        Amm.Util.setByPath(destObject, dest, value, {}, this.merge);
    }

};

// Amm.ex111tend(Amm.Decorator.Data.Action, Amm.Decorator.Data);

