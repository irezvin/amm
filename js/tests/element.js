/* global Amm */

(function() { 
    QUnit.module("Element");
    QUnit.test("Element.PropertyInitializers", function(assert) {
        var chg = [];
        var e = new Amm.Element({
            properties: {
                a: 10,
                b: {
                    defaultValue: 15
                },
                c: {
                    defaultValue: 30,
                    onChange: function(n, o) {
                        chg.push([n, o]);
                    }
                },
                in__d: 'this.a + this.b',
                in__e: function(g) { return g('this.c')*g('this.a'); },
                in__f: 'javascript: return({: this["c"] :} - {: this.b :})'
            },
            prop__x: 20,
            prop__in__y: 'this.x * 2'
        });
        assert.equal(e.getA(), 10);
        assert.equal(e.getB(), 15);
        assert.equal(e.getC(), 30);
        assert.equal(e.getD(), e.getA() + e.getB());
        assert.equal(e.getE(), e.getC() * e.getA());
        assert.equal(e.getF(), e.getC() - e.getB());
        e.setA(3);
        e.setC(10);
        assert.equal(e.getA(), 3);
        assert.equal(e.getC(), 10);
        assert.equal(e.getD(), e.getA() + e.getB());
        assert.equal(e.getE(), e.getC() * e.getA());
        assert.equal(e.getF(), e.getC() - e.getB());
        assert.equal(e.getX(), 20);
        assert.equal(e.getY(), e.getX() * 2);
        e.setX(25);
        assert.equal(e.getX(), 25);
        assert.equal(e.getY(), e.getX() * 2);
    });
    
    QUnit.test("Element.ElementHandlers", function(assert) {
        var v = new Amm.Element({
            traits: ['Amm.Trait.Field'],
            properties: {
                e: new Amm.Element({traits: ['Amm.Trait.Field'], value: 20})
            },
            in__value: 'this.e.value + 20',
            in__readOnly: function(g, s) { return g('this.value') === 40; }
        });
        assert.equal(v.getValue(), 40);
        assert.equal(v.getReadOnly(), true);
        v.getE().setValue(15);
        assert.equal(v.getValue(), 35);
        assert.equal(v.getReadOnly(), false);
    });
    
}) ();
