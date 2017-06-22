/* global Amm */

//Amm.extend(Amm.Util, Amm);
//Amm.Util.prototype

Amm.Util = {
    
    regexEscape: function(string) {
          return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
    
};