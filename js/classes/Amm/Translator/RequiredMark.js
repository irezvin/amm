/* global Amm */

Amm.Translator.RequiredMark = function(options) {
    Amm.Translator.Bool.call(this, options);
};

Amm.Translator.RequiredMark.prototype = {

    'Amm.Translator.RequiredMark': '__CLASS__', 
    
    trueValue: '<span class="required">*</span>',

    falseValue: ''

};

Amm.extend(Amm.Translator.RequiredMark, Amm.Translator.Bool);
