/* global Amm */

Amm.Data.HttpResponse = function(options) {
    
    this.httpHeaders = [];
    
    Amm.init(this, options);
    
    
};

Amm.Data.HttpResponse.prototype = {
    
    'Amm.Data.HttpResponse': '__CLASS__',
    
    isError: false,
    
    errorText: "",
    
    rawContent: null,
    
    parsedContent: null,
    
    httpHeaders: null,
    
    httpCode: null,
    
};