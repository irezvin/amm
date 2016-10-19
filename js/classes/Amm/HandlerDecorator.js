/* global Amm */

Amm.HandlerDecorator = {
    
    MapArgs: function(scope, args, outSignal, fn) {
        // this.map must be an Array
        // this.defs must be either Array or undefined
        
        var res = [];
        if (this.defs instanceof Array) res = res.concat(this.defs);
        for (var i = 0; i < this.map.length; i++) {
            var v = this.map[i];
            if (v in args) res[i] = args[v];
        }
        return res;
    }
    
};