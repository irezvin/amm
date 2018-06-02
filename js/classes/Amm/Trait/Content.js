/* global Amm */

Amm.Trait.Content = function() {
};

Amm.Trait.Content.prototype = {

    'Content': '__INTERFACE__', 
    
    _content: undefined,

    /**
     *  Note: content translator is used only by views (and may be overriden by them!)
     *  
     * @type Amm.Translator
     */
    _contentTranslator: null,

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

    setContentTranslator: function(contentTranslator) {
        if (contentTranslator)
            contentTranslator = Amm.constructInstance(contentTranslator, 'Amm.Translator');
        else contentTranslator = null;
        var oldContentTranslator = this._contentTranslator;
        if (oldContentTranslator === contentTranslator) return;
        this._contentTranslator = contentTranslator;
        this.outContentTranslatorChange(contentTranslator, oldContentTranslator);
        return true;
    },

    getContentTranslator: function() { return this._contentTranslator; },

    outContentTranslatorChange: function(contentTranslator, oldContentTranslator) {
        this._out('contentTranslatorChange', contentTranslator, oldContentTranslator);
    }

};


