/* global Amm */
(function() {
QUnit.module("Context");

    QUnit.test("Context.basic", function(assert) {
        
        var e1 = new Amm.Element({
            properties: {
                a: 10,
                b: 20
            }
        });
        var e2 = new Amm.Element({
            properties: {
                a: 100,
                b: 200
            }
        });
        var e3 = new Amm.Element({
            properties: {
                a: 1,
                b: 2
            }
        });
        var xp = new Amm.Expression("this.a + this.b", e1);
        var v1, v2, v3, v4, cid1, cid2, cid3, cid4;
        xp.subscribe("valueChange", function(v) { v1 = v; });
        cid1 = xp.getContextId();
        
            //assert.equal(xp.getValue(), e1.getA() + e1.getB(), 'evaluation in default context works');
        
        xp.createContext();
        xp.setExpressionThis(e2);
        
        xp.subscribe("valueChange", function(v) { v2 = v; });
        
        cid2 = xp.getContextId();
        
            assert.ok(cid1 !== cid2, 'new context id after createContext() is different from old context id');
            //assert.equal(xp.getValue(), e2.getA() + e2.getB(), 'evaluation in second context works');
        
        xp.createContext();
        xp.setExpressionThis(e3);
        xp.subscribe("valueChange", function(v) { v3 = v; });
        cid3 = xp.getContextId();
        
            assert.ok(cid1 !== cid3, 'new context id (3) after createContext() is different from default context id');
            assert.ok(cid2 !== cid3, 'new context id (3) after createContext() is different from context id (2)');
            assert.equal(xp.getValue(), e3.getA() + e3.getB(), 'evaluation in third context works');
        
        e1.setA(5);
        
            assert.equal(v1, e1.getA() + e1.getB(), 'correct event handling in first context');
            assert.equal(xp.getContextId(), cid1, 'expression switched to proper context after the event');
            assert.equal(xp.getValue(), e1.getA() + e1.getB(), 'getValue() contains value in current context');
        
        e2.setA(150);
        
            assert.equal(v1, e1.getA() + e1.getB(), 'value from default context remains unchanged');
            assert.equal(v2, e2.getA() + e2.getB(), 'correctly changed value from context (2)');
            
            assert.equal(xp.getContextId(), cid2, 'expression switched to proper context (2) after the event');
            assert.equal(xp.getValue(), e2.getA() + e2.getB(), 'getValue() contains value in current context (2)');
        
        e3.setB(3);
            
            assert.equal(v1, e1.getA() + e1.getB(), 'value from default context remains unchanged');
            assert.equal(v2, e2.getA() + e2.getB(), 'value from context (2) remains unchanged');
            assert.equal(v3, e3.getA() + e3.getB(), 'value from context (3) is correctly changed');
            
            assert.equal(xp.getContextId(), cid3, 'expression switched to proper context (3) after the event');
            assert.equal(xp.getValue(), e3.getA() + e3.getB(), 'getValue() contains value in current context (3)');

        xp.createContext();
        cid4 = xp.getContextId();
        
        xp.setExpressionThis(e3);
        v3 = null;
        xp.subscribe("valueChange", function(v, o) { v4 = v; });
        e3.setA(8);
        
            assert.equal(v3, e3.getA() + e3.getB(), 'shared expressionThis(), context(3) value changed');
            assert.equal(v4, e3.getA() + e3.getB(), 'shared expressionThis(), context(4) value changed');
            
        xp.setContextId(cid1);
        assert.equal(xp.getValue(), e1.getA() + e1.getB());
        xp.setContextId(cid4);
        assert.equal(xp.getValue(), e3.getA() + e3.getB());
        
        xp.cleanup(); // todo: test cleanup
        
            assert.equal(e1.getSubscribers().length, 0, '0 observers for expressionThis(), context (0) after cleanup()');
            assert.equal(e2.getSubscribers().length, 0, '0 observers for expressionThis(), context (1) after cleanup()');
            assert.equal(e3.getSubscribers().length, 0, '0 observers for expressionThis(), context (2) after cleanup()');
        
    });

    QUnit.test("Context.mixedCacheability", function(assert) {
        
        var a = new Amm.Element({
            properties: {
                x: 10,
                y: 20
            }
        });
        
        var b = {
            x: 100,
            y: 200
        };
        
        var xp = new Amm.Expression("this.x + this.y", a);
        window.d.xp = xp;
        
        var v1, v2, cid1, cid2;
        
        xp.subscribe('valueChange', function(v) { v1 = v; });
        
        cid1 = xp.getContextId();

            assert.equal(xp.getIsCacheable(), true, 'cacheable object1');
            assert.equal(xp.getValue(), a.getX() + a.getY(), 'correct value for object1');
        
        cid2 = xp.createContext(null, {expressionThis: b}).id;
        
        xp.subscribe('valueChange', function(v) { v2 = v; });
        
            assert.ok (xp.getExpressionThis() === b);
            assert.equal(xp.getValue(), b.x + b.y, 'correct value of object2');
            assert.equal(xp.getIsCacheable(), false, 'non-cacheable object2');
            
            b.x = 50;
            b.y = 70;
            
            Amm.getRoot().outInterval();
            
            assert.equal(v2, b.x + b.y, 'object2 change detected (1)');
            
            a.setY(25);
            
            assert.equal(v1, a.getX() + a.getY(), 'object1 change detected');
            
            b.y = 75;
        
            Amm.getRoot().outInterval();
            assert.equal(v2, b.x + b.y, 'object2 change detected (2)');
            
        xp.cleanup();
            
    });
    
}) ();