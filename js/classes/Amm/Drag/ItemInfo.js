/* global Amm */

Amm.Drag.ItemInfo = function(options) {
    if (options) Amm.override(this, options);
};

Amm.Drag.ItemInfo.prototype = {
    
    'Amm.Drag.ItemInfo': '__CLASS__',
    
    item: undefined,
    
    itemNativeElement: undefined,
    
    otherItems: null,
    
    collection: undefined,
    
    containerNativeElement: undefined,
    
};
