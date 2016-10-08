/* global Amm */

Amm.Handler.Html = function(options) {
    Amm.Handler.call(this, options);
};

Amm.Handler.Html.prototype = {

    'Amm.Handler.Html': '__CLASS__'
    
};

Amm.extend(Amm.Handler.Html, Amm.Handler.Property);