/* global Amm */

Amm.Translator.Errors = function(options) {
    Amm.Translator.List.call(this, options);
};

Amm.Translator.Errors.prototype = {

    'Amm.Translator.Errors': '__CLASS__', 
    
    _enclosureElement: '<ul class="errors"></ul>',
    
    _itemElement: '<li class="error"></li>',
    
    emptyOutValue: '',
    
    itemSelector: '.error',
    
    strict: false,
    
    allowHTML: false

};

Amm.extend(Amm.Translator.Errors, Amm.Translator.List);

