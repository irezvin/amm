/* global Amm */

(function() { 
    QUnit.module("Trait.Visual");
    
    QUnit.test("className property", function(assert) {
        var v = new Amm.Element({traits: ['Amm.Trait.Visual']});
        var classNameValue = null;
        v.subscribe('classNameChange', function(v) { classNameValue = v; });
        v.setClassName('foo bar bar baz');
        assert.equal(v.getClassName(), 'foo bar bar baz');
        assert.equal(classNameValue, 'foo bar bar baz');
        assert.equal(v.getClassName('foo'), true);
        assert.equal(v.getClassName('bar'), true);
        assert.equal(v.getClassName('baz'), true);
        assert.equal(v.getClassName('quux'), false);
        v.setClassName(false, 'foo');
        assert.equal(v.getClassName(), 'bar bar baz');
        assert.equal(classNameValue, 'bar bar baz');
        v.setClassName(false, 'foo');
        assert.equal(v.getClassName(), 'bar bar baz');
        v.setClassName(true, 'bar');
        assert.equal(v.getClassName(), 'bar bar baz');
        v.setClassName(false, 'bar');
        assert.equal(v.getClassName(), 'baz');
        assert.equal(classNameValue, 'baz');
        v.setClassName(true, 'quux');
        assert.equal(v.getClassName(), 'baz quux');
        assert.equal(classNameValue, 'baz quux');
        v.setClassName(false, 'quux');
        assert.equal(v.getClassName(), 'baz');
        assert.equal(classNameValue, 'baz');
    });
}) ();

