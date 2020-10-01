/* global QUnit */
/* global Amm */

(function() {

    QUnit.module("View.Html.Input");

    QUnit.test("View.Html.InputupdateOnKeyUp", function(assert) {
        
        var f = jQuery('#qunit-fixture');
        f.html('<input data-amm-e="" value="zz" data-amm-v="v.Input" />');
        var i = f.find('input');
        var e = new Amm.Element(i);
        assert.equal(e.getValue(), 'zz');
        var v = e.getUniqueSubscribers('Amm.View.Html.Input')[0];
        
        assert.equal(v.getUpdateOnKeyUp(), false);
        
        assert.notOk(v.getEventName().match(/\bkeyup\b/));
        
        v.setEventName(v.getEventName() + ' keyup');
        
        assert.equal(v.getUpdateOnKeyUp(), true);
        
        v.setUpdateOnKeyUp(false);
        assert.notOk(v.getEventName().match(/\bkeyup\b/));
        assert.equal(v.getUpdateOnKeyUp(), false);
        
        
        v.setUpdateOnKeyUp(true);
        assert.ok(v.getEventName().match(/\bkeyup\b/));
        v.setUpdateOnKeyUp(false);
        assert.notOk(v.getEventName().match(/\bkeyup\b/));
        
        var val;
        e.subscribe('valueChange', function(v) { val = v; });
        i[0].value = 'yy';
        assert.equal(val, undefined);
        i.trigger('keyup');
        assert.equal(val, undefined);
        v.setUpdateOnKeyUp(true);
        i.trigger('keyup');
        assert.equal(val, 'yy');
        
        Amm.cleanup(e);
        
    });    
    
}) ();
