/* global Amm */

Amm.Translator.List = function(options) {
    Amm.Translator.call(this, options);
};

/**
 * Converts Arrays (or Amm.Arrays) into HTML elements, typically lists.
 * 
 * Is defined by two parts:
 * -    enclouse HTML element, which will include list item elements;
 * -    list item element, which will include item content.
 * 
 * Expects array items to be strings.
 * To parse back, ignores enclosure element and tries to construct jQuery selector from definition of item element,
 * with degree of copying tag name, class and id. itemSelector may be used to supply jQuery selector that will extract
 * item elements.
 * 
 * If allowHTML is false, will escape list items using .text(value) 
 * or return .text() of elements when parsing back.
 * 
 * translateOut() may accept DOMElements as well as jQuery result as well as string.
 * If string is provided, will convert it into DOMElements using jQuery(string).
 * 
 * FALSEable in-values are interpreted as empty arrays.
 */

Amm.Translator.List.prototype = {

    'Amm.Translator.List': '__CLASS__', 

    _enclosureElement: '<ul></ul>',
    
    _itemElement: '<li></li>',
    
    emptyOutValue: null,

    itemSelector: null,
    
    _cachedItemSelector: null,
    
    allowHTML: true,
    
    // FALSEable in values are treated as empty arrays; strings are treated as 1-element arrays
    strict: false,
    
    msgInvalidInValueStrict: 'Amm.Translator.List.msgInvalidInValueStrict',
    
    msgInvalidInValueNonStrict: 'Amm.Translator.List.msgInvalidInValueNonStrict',
    
    msgInvalidOutValue: 'Amm.Translator.List.msgInvalidOutValue',
    
    // Whether to cache last in-out pair; if it is the same, pass last result. 
    // Compared using ===, including the arrays
    _cacheValues: null,
    
    _lastInValue: null,
    
    _lastOutValue: null,

    setCacheValues: function(cacheValues) {
        var oldCacheValues = this._cacheValues;
        if (oldCacheValues === cacheValues) return;
        this._cacheValues = cacheValues;
        return true;
    },

    getCacheValues: function() { return this._cacheValues; },

    setItemElement: function(itemElement) {
        var oldItemElement = this._itemElement;
        if (oldItemElement === itemElement) return;
        if (!itemElement) throw "itemElement is required";
        if (typeof itemElement !== "string") throw "itemElement must be a string";
        if (!itemElement.match(/^<.*>$/)) throw "itemElement must be a jQuery-compatible HTML element definition";
        this._itemElement = itemElement;
        this._cachedItemSelector = null;
        return true;
    },

    getItemElement: function() { return this._itemElement; },
    
    setEnclosureElement: function(enclosureElement) {
        var oldEnclosureElement = this._enclosureElement;
        if (oldEnclosureElement === enclosureElement) return;
        if (enclosureElement) {
            if (typeof enclosureElement !== "string") throw "enclosureElement must be a string";
            if (!enclosureElement.match(/^<.*>$/)) throw "enclosureElement must be a jQuery-compatible HTML element definition";
        } else {
            enclosureElement = '';
        }
        this._enclosureElement = enclosureElement;
        return true;
    },

    getEnclosureElement: function() { return this._enclosureElement; },
    
    _doTranslateOut: function(value) {
        if (!this.strict) {
            if (!value) value = [];
            else if (typeof value === 'string') value = [value];
        }
        if (!(value instanceof Array || value['Amm.Array'])) {
            var msg = this.strict? this.msgInvalidInValueStrict: this.msgInvalidInValueNonStrict;
            this.lastError = Amm._msg(msg, '%type', Amm.describeType(value));
            return;
        }
        if (!value.length && this.emptyOutValue !== null) return this.emptyOutValue;
        var innerItems = [];
        if (!this._itemElement) throw ("_")
        var res = '', e;
        for (var i = 0, l = value.length; i < l; i++) {
            var e = jQuery(this._itemElement);
            if (this.allowHTML) e.html(value[i]);
            else e.text(value[i]);
            if (!this._enclosureElement) res += e[0].outerHTML;
                else innerItems.push(e);
        }
        if (e && e[0] && !this._cachedItemSelector && !this.itemSelector) {        
            this._extractItemSelector(e[0]);
        }
        if (this._enclosureElement) return jQuery(this._enclosureElement).append(innerItems)[0].outerHTML;
        else return res;
    },
    
    _doTranslateIn: function(value) {
        if (value === this.emptyOutValue) return [];
        if (!value) return []; // empty string or FALSEable value corresponds to empty array
        if (!(value && (value.jquery || value.nodeName || typeof value === 'string'))) {
            this.lastError = Amm._msg(this.msgInvalidOutValue, '%type', Amm.describeType(value));
        }
        var sel = this.itemSelector || this._cachedItemSelector;
        if (!sel) {
            var e = jQuery(this._itemElement);
            sel = this._extractItemSelector(e[0]);
        }
        var res = [], h = this.allowHTML;
        var jq = jQuery(value).find(sel).addBack(sel).each(function(i, e) {
            res.push(h? jQuery(e).html() : jQuery(e).text());
        });
        return res;
    },
    
    _extractItemSelector: function(e) {
        var v;
        this._cachedItemSelector = e.tagName.toLowerCase();
        if (v = e.getAttribute('class')) this._cachedItemSelector += '.' + v;
        if (v = e.getAttribute('id')) this._cachedItemSelector += '#' + v;
        return this._cachedItemSelector;
    }

};

Amm.extend(Amm.Translator.List, Amm.Translator);

Amm.defineLangStrings({
    'Amm.Translator.List.msgInvalidInValueStrict': 'unsupported external value: %type provided, Array or Amm.Array expected',
    'Amm.Translator.List.msgInvalidInValueNonStrict': 'unsupported external value: %type provided, Array, Amm.Array, string or FALSEable value expected',
    'Amm.Translator.List.msgInvalidOutValue': 'internal value must be either string or FALSEable value or jQuery result or DOM Element, but %type was provided'
});

