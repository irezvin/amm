/* global Amm */

console.log("Amm test file", Amm);

Test = {};

/**
 * @constructor
 * @augments {Amm.Element}
 */
Test.Element = function(options) {
    Amm.Element.call(this, options);
};

Test.Element.prototype = {
    
    value: undefined,
    
    inValue: function(value) {
        var o = this.value;
        this.value = value;
        if (o !== this.value) this.outChange(this.value, o);
    },
    
    outChange: function(value, oldValue) {
        this._out('change', value, oldValue);
    }
};

Amm.extend(Test.Element, Amm.Element);

var testElement = new Test.Element();