/* global Amm */

Amm.View.Abstract.Content = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Content');
};

Amm.View.Abstract.Content.prototype = {

    'Amm.View.Abstract.Content': '__CLASS__', 
    
    _decorator: undefined,
    
    setVContentDecorator: function(contentDecorator) {
        this._decorator = contentDecorator;
        if (this._lastContent !== undefined)
            this.setVContent(this._lastContent);
    },
    
    setVContent: function(focus) {
    },
    
    getVContent: function() { 
    }
    
};

Amm.extend(Amm.View.Abstract.Content, Amm.View.Abstract);

