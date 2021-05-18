/* global Amm */

(function() { 
    QUnit.module("Expression.FunctionHandler");
    QUnit.test("FunctionHandler", function(assert) {
        
        var sub1, sub2, sub3;
        var adder = new Amm.Element({
            props: {
                a: 'sub1',
                b: 'sub2',
                sum: 0,
                oldSum: undefined,
                sub1: sub1 = new Amm.Element({
                    props: {
                        value: 100
                    }
                }),
                sub2: sub2 = new Amm.Element({
                    props: {
                        value: 2000
                    }
                }),
                sub3: sub3 = new Amm.Element({
                    props: {
                        value: 300
                    }
                })
            }
        });
        var alt = new Amm.Element({
            props: {
                value: 150
            }
        });
        var fh = new Amm.Expression.FunctionHandler(function(g, s) {
            // expression is computed dynamically
            var a = g('this.' + g('this.a') + '.value');
            
            // expression is static
            var b = g('this[this.b].value');
            
            s('this.oldSum', g('this.sum'));
            
            return a + b;
        }, adder, 'sum');
        assert.equal(adder.getOldSum(), 0);
        var o = adder.getSum();
        assert.equal(adder.getSum(), sub1.getValue() + sub2.getValue());
        sub1.setValue(150);
        assert.equal(adder.getOldSum(), o);
        o = adder.getSum();
        assert.equal(adder.getSum(), sub1.getValue() + sub2.getValue());
        adder.setA('sub2');
        assert.equal(adder.getSum(), sub2.getValue() + sub2.getValue());
        assert.equal(adder.getOldSum(), o);
        sub1.setValue(125);
        assert.equal(adder.getSum(), sub2.getValue() + sub2.getValue());
        adder.setA('sub3');
        assert.equal(adder.getSum(), sub3.getValue() + sub2.getValue());
        adder.setSub3(alt);
        assert.equal(adder.getSum(), alt.getValue() + sub2.getValue());
        fh.cleanup();
    });
}) ();
