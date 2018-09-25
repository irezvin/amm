/* global Amm */
/* global QUnit */

(function() {

QUnit.module("instantiator");

QUnit.test("instantiator.Proto", function(assert) {
    
    var a = new Amm.Element({ prop__b: null});
    
    var ins = new Amm.Instantiator.Proto({
        'class': "Amm.Element",
        prop__a: null
    }, "a", "b");
    
    var b = ins.construct(a);
    
    assert.ok(b && typeof b === 'object', "Amm.Instantiator.Proto.construct() returned object");
    assert.ok(b.getA() === a, "Link from created object to arg (assocProperty) works");
    assert.ok(a.getB() === b, "Link from arg to created object (revAssocProperty) works");
    
});

})();