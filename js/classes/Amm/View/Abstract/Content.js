/* global Amm */

Amm.View.Abstract.Content = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Content');
};

Amm.View.Abstract.Content.prototype = {

    'Amm.View.Abstract.Content': '__CLASS__', 
    
    /**
     * @type Amm.Translator
     * Translator that we receive from the element
     */
    _elementContentTranslator: null,

    /**
     * @type Amm.Translator
     * Translator that will be used instead of element-provided one
     */
    _contentTranslator: null,
    
    _lastContent: undefined,
    
    setContentTranslator: function(contentTranslator) {
        if (contentTranslator)
            contentTranslator = Amm.constructInstance(contentTranslator, 'Amm.Translator');
        else contentTranslator = null;
        
        var oldContentTranslator = this._contentTranslator;
        if (oldContentTranslator === contentTranslator) return;
        this._contentTranslator = contentTranslator;
        if (this._observing && this._lastContent !== undefined) this.setVContent(this._lastContent);
        return true;
    },

    getContentTranslator: function() { return this._contentTranslator; },

    setVContentTranslator: function(contentTranslator) {
        this._elementContentTranslator = contentTranslator;
        if (!this._contentTranslator && this._lastContent !== undefined && this._observing) {
            this.setVContent(this._lastContent);
        }
    },
    
    _doHandleInTranslationError: function(value, error) {
        
    },
    
    _doHandleOutTranslationError: function(value, error) {
        
    },
    
    setVContent: function(content) {
        this._lastContent = content;
        var translator = this._contentTranslator || this._elementContentTranslator;
        var translatedContent, e = {};
        if (translator) {
            translatedContent = translator.translateOut(content, e);
            if (e.error) translatedContent = this._doHandleInTranslationError(content, e.error);
        } else {
            translatedContent = content;
        }
        this._doSetContent(translatedContent);
    },
    
    getVContent: function() {
        var translatedContent = this._doGetContent();
        var translator = this._contentTranslator || this._elementContentTranslator;
        var content, e = {};
        if (translator) {
            content = translator.translateIn(translatedContent, e);
            if (e.error) content = this._doHandleInTranslationError(translatedContent, e.error);
        } else {
            content = translatedContent;
        }
        return content;
    },
    
    _doSetContent: function(translatedContent) {
        // should be overridden in concrete class
    },
    
    _doGetContent: function() {
        // should be overridden in concrete class
    }
    
};

Amm.extend(Amm.View.Abstract.Content, Amm.View.Abstract);

