/* global Amm */

Amm.Data.Interface = function() {
    
};

Amm.Data.Interface.prototype = {
    
    _uri: null,
    
    _key: null,
    
    /**
     * @param {object} data
     * @returns {Amm.Data.Transaction}
     */
    actionCreate: function(data) {
        
    },
    
    /**
     * @param {string|object} key
     * @returns {Amm.Data.Transaction}
     */
    actionLoad: function(key) {
        
    },
    
    
    /**
     * @param {string|object} key
     * @param {object} data
     * @returns {Amm.Data.Transaction}
     */
    actionUpdate: function(key, data) {
        
    },
    
    /**
     * @param {string|object} key
     * @returns {Amm.Data.Transaction}
     */
    actionDelete: function(key) {
        
    },
    
    
};


// Amm.extend(Amm.Data.Interface, Amm.Data)
