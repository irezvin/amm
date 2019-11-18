/* global Amm */
/* global QUnit */

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
                in__f: 'javascript: return({:this["c"]:} - {:this.b:})'
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
            traits: ['Amm.Trait.Input'],
            properties: {
                e: new Amm.Element({traits: ['Amm.Trait.Input'], value: 20})
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
    
    QUnit.test("Element.on__handlers", function(assert) {
        
        var f = function() {};
        
        var scp1 = {};
        
        var e = new Amm.Element({
            prop__a: 10,
            on__aChange: f,
            on__aChange__1: [f, null, 'extra'],
            on__aChange__2: [f, scp1, 'extra2']
        });
        
        assert.equal(e.getSubscribers('aChange').length, 3, 'There was 3 subscribers using on__ handlers');
        assert.equal(e.getSubscribers('aChange', f, null, null)[0][4], 0, 'First handler matches definition');
        assert.equal(e.getSubscribers('aChange', f, null, 'extra')[0][4], 1, 'Second handler matches definition');
        assert.equal(e.getSubscribers('aChange', f, scp1, 'extra2')[0][4], 2, 'Third handler matches definition');
        
    });
    
    QUnit.test("Element.expr__ expressions", function(assert) {
        
        var v = null;
        
        var e = new Amm.Element({
            prop__a: 10,
            prop__b: 20,
            prop__c: 13,
            expr__sum: 'this.a + this.b',
            expr__cShortcut: 'this.c',
            on__sumChange: function(val) { v = val; }
        });
        
        assert.deepEqual(typeof e.getSum, 'function', 'getter was created');
        assert.deepEqual(typeof e.setSum, 'function', 'setter was created');
        assert.deepEqual(typeof e.outSumChange, 'function', 'event was created');
        assert.deepEqual(Amm.getClass(e._sum), 'Amm.Expression', 'private property was set to an expression');
        assert.deepEqual(e.getSum(), 30, 'returns proper value');
        e.setA(15);
        assert.deepEqual(v, 35, 'change event triggered');
        e.setB(25);
        assert.deepEqual(v, 40, 'change event triggered');
        e.setCShortcut(14);
        assert.deepEqual(e.getC(), 14, 'setter works for settable expression');
        
    });
    
}) ();
