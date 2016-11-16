/* global Amm */

Amm.Trait.Content = function() {
};

Amm.Trait.Content.prototype = {

    'Content': '__INTERFACE__', 
    
    _content: undefined,

    _contentDecorator: null,

    setContent: function(content) {
        var oldContent = this._content;
        if (oldContent === content) return;
        this._content = content;
 
        this.outContentChange(content, oldContent);
        return true;
    },

    getContent: function() { return this._content; },

    outContentChange: function(content, oldContent) {
        this._out('contentChange', content, oldContent);
    },

    setContentDecorator: function(contentDecorator) {
        var oldContentDecorator = this._contentDecorator;
        if (oldContentDecorator === contentDecorator) return;
        this._contentDecorator = contentDecorator;
 
        this.outContentDecoratorChange(contentDecorator, oldContentDecorator);
        return true;
    },

    getContentDecorator: function() { return this._contentDecorator; },

    outContentDecoratorChange: function(contentDecorator, oldContentDecorator) {
        this._out('contentDecoratorChange', contentDecorator, oldContentDecorator);
    }


};


