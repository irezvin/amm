/* global Amm */

Amm.Builder.Node = function(options) {
    this.children = [];
    this.connected = [this];
    this.conIdx = 0;
    this.idx = Amm.Builder.Node._counter++;
    if (options) Amm.override(this, options);
};

Amm.Builder.Node._counter = 0;

Amm.Builder.Node.prototype = {
    
    htmlElement: null,
    
    v: null,
    
    e: null,
    
    x: null,
    
    id: null,
    
    global: false,
    
    parent: null,
    
    children: null,
    
    connected: null,
    
    idx: null,
    
    conIdx: null,
    
    conParent: false,
    
    conChild: false
    
};