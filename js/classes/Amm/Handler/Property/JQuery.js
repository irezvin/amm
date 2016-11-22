/* global Amm */

Amm.Handler.Property.JQuery = function(options) {
    Amm.init(this, options, ['extractQuery', 'extractMethod', 'htmlRoot', 'query', 'method']);
    Amm.Handler.Property.call(this, options);
};

/** 
 * Acts in following way: on each property change: jQuery(this.query)[this.method](value)
 * If htmlRoot is provided, acts slightly different: jQuery(this.htmlRoot).find(this.query)[this.method](value)
 */
Amm.Handler.Property.JQuery.prototype = {

    'Amm.Handler.Property.JQuery': '__CLASS__',
    
    extractQuery: null,
    
    extractMethod: null,
    
    htmlRoot: null,
    
    query: null,
    
    method: null,
    
    args: null,
    
    valueArgIndex: 0,
    
    /**
     * Default to true because still won't work if extractMethod not set
     */
    setValueOnBind: true,
    
    extractValue: function() {
        if (this.extractMethod && (this.extractQuery  || this.query)) {
            var q = this.htmlRoot? jQuery(this.htmlRoot).find(this.extractQuery || this.query) : jQuery(this.extractQuery || this.query);
            if (q.length) return q[this.extractMethod]();
        }
    },
    
    _handleEvent: function(value) {
        if (this.query && this.method) {
            var q = this.htmlRoot? jQuery(this.htmlRoot).find(this.query) : jQuery(this.query);
            if (this.args instanceof Array || this.valueArgIndex) {
                var args = this.args || [];
                args[this.valueArgIndex] = value;
                q[this.method].apply(q, args);
            } else {
                q[this.method](value);
            }
        }
    }
    
};

Amm.extend(Amm.Handler.Property.JQuery, Amm.Handler.Property);