/* global Amm */

Amm.Decorator.Data.Action = function(options) {
    Amm.init(this, options);
};

Amm.Decorator.Data.Action.prototype = {

    'Amm.Decorator.Data.Action': '__CLASS__', 
    
    /**
     * Source path - where we take value from srcObject on applying the action.
     * Strings like foo[bar] are converted to paths ['foo', 'bar'] by setter.
     * 
     * @type {null|Array} source path (if null, this.def or entire srcObject are used)
     */
    _src: null,

    /**
     * Dest path - where we put value into destObject on applying the action.
     * Strings like foo[bar] are converted to paths ['foo', 'bar'] by setter.
     * If null path is provided and merge is set, value will be merged with destObject.
     * 
     * @type {null|Array} source path (if null, this.def or entire srcObject are used)
     */
    _dest: null,

    def: undefined,
    
    decorator: null,
    
    merge: false,

    /**
     * 
     */
    setSrc: function(src) {
        if (!src) src = null;
        else src = Amm.Util.pathToArray(src);
        var oldSrc = this._src;
        if (oldSrc === src) return;
        this._src = src;
        return true;
    },

    getSrc: function() { return this._src; },

    setDest: function(dest) {
        if (dest !== null && dest !== false && dest !== undefined) {
            dest = Amm.Util.pathToArray(dest);
        } else {
            dest = null;
        }
        var oldDest = this._dest;
        if (oldDest === dest) return;
        this._dest = dest;
        return true;
    },

    getDest: function() { return this._dest; },
    
    apply: function(srcObject, destObject) {
        if (!(srcObject && typeof srcObject === 'object')) throw Error("srcObject must be a non-null object");
        if (!(destObject && typeof destObject === 'object')) throw Error("destObject must be a non-null object");
        var value = undefined;
        if (this._src) value = Amm.Util.getByPath(srcObject, this._src, this.def);
        else value = this.def !== undefined? this.def : srcObject;
        if (value === undefined) return;
        value = Amm.Decorator.d(value, this, 'decorator'); // Apply this.decorator
        if (value === undefined) return;
        var dest = this._dest;
        if (dest === null && this.merge) {
            if (value && typeof value === 'object') Amm.override(destObject, value);
            return;
        }
        Amm.Util.setByPath(destObject, dest, value, {}, this.merge);
    }

};

// Amm.ex111tend(Amm.Decorator.Data.Action, Amm.Decorator.Data);

