/* global Amm */

Amm.Builder.Node = function(options) {
    this.children = [];
    this.connected = [this];
    if (options) Amm.override(this, options);
};

Amm.Builder.Node.prototype = {
    
    htmlElement: null,
    
    v: null,
    
    e: null,
    
    id: null,
    
    global: false,
    
    parent: null,
    
    children: null,
    
    connected: null
    
};