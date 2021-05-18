/* global Amm */
/* global QUnit */

(function() {

    QUnit.module("ObservableFunction");

    QUnit.test("Amm.ObservableFunction - basic", function(assert) {
        
        var subject = new Amm.Element({props: {
            name: 'John',
            surname: 'Doe',
            workplace: new Amm.Element({props: {
                company: 'Betadyne',
                salary: 60000,
            }}),
            things: new Amm.Collection({cleanupOnDissociate: true, items: [
                new Amm.Element({props: {
                    item: 'computer',
                    cost: 1000,
                }}),
                new Amm.Element({props: {
                    item: 'car',
                    cost: 20000,
                }}),
                new Amm.Element({props: {
                    item: 'phone',
                    cost: 900
                }}),
            ], keyProperty: 'item'})
        }});
    
        var report = new Amm.Element({props: {
                fullName: null,
                monthlySalary: null,
                thingsCost: null
        }});
    
        var fullNameReporter = new Amm.ObservableFunction(function(get) {
            return (get.vars('prefix') || '') + get('name') + ' ' + get('surname');
        }, subject, 'fullName', report, true);
        
        var monthlySalaryReporter = new Amm.ObservableFunction(function(get) {
            return Math.round(get('workplace.salary')/12);
        }, subject, 'monthlySalary', report, true);
        
        var thingsCostReporter = new Amm.ObservableFunction(function(get) {
            var items = get('things.items');
            var res = 0;
            if (!items) return res;
            for (var i = 0; i < items.length; i++) res += get(items[i], 'cost');
            return res;
        }, subject, 'thingsCost', report, true);
        
        assert.deepEqual(report.fullName, 'John Doe', 'initial value correct (1)');
            assert.deepEqual(report.monthlySalary, 5000, 'initial value correct (2)');
            assert.deepEqual(report.thingsCost, 21900, 'initial value correct (3)');
        
        var numCarCalc = 0;
        
        var carCostReporter = new Amm.ObservableFunction(function(get) {
            numCarCalc++;
            return get.prop(this, 'things').prop('byKey', 'car').prop('cost').val();
        }, subject, undefined, undefined, true);
        
            assert.deepEqual(carCostReporter.getObserves(), false, 
                'not observing when no subscriber or writeObject/propertyOrHandler provided');
        
            subject.things.k.car.cost = 15000;
            
            assert.deepEqual(numCarCalc, 0, 'no recalc on change when not observing');
            
            assert.deepEqual(carCostReporter.getValue(), 15000,
                'value correct with .prop() chain');
                
        var carCostReport = [];

            carCostReporter.subscribe('valueChange', function(val, oldVal) { carCostReport.push([val, oldVal]); });
            
            assert.deepEqual(carCostReporter.getObserves(), true, 
                'not observing when no subscriber or writeObject/propertyOrHandler provided');
                
            assert.deepEqual(carCostReport, [], 'change not recorded');
            
            d.c = carCostReporter, d.s = subject;
            
        subject.name = 'Jane';
        subject.workplace.salary = 120000;
        subject.things.k.car.cost = 10000;

            assert.deepEqual(carCostReport, [[10000, 15000]], 'first change recorded by observing function');

        
            assert.deepEqual(report.fullName, 'Jane Doe', 'changed value correct (1)');
            assert.deepEqual(report.monthlySalary, 10000, 'changed value correct (2)');
            assert.deepEqual(report.thingsCost, 11900, 'changed value correct (3)');
        
        subject.things.reject(subject.things.k.phone);
        
            assert.deepEqual(report.thingsCost, 11000, 'changed value correct (4)');
            
        subject.things.k.car.cost = 12000;
            
            assert.deepEqual(carCostReport, [[10000, 15000], [12000, 10000]],
                'second change recorded by observing function');

        numCarCalc = 0;
        
        carCostReporter.unsubscribe('valueChange');
        
            assert.deepEqual(carCostReporter.getObserves(), false,
                'When valueChange not observed, getObserves() is false');
                
            assert.deepEqual(numCarCalc, 0, 'no recalc on change after unobserving');
        
        fullNameReporter.cleanupWithExpressionThis = false;
            
        Amm.cleanup(subject.items, subject);
        
            assert.notOk(fullNameReporter.getWasCleanup(), '!cleanupWithExpressionThis works');
            assert.ok(fullNameReporter.getObserves(), '...and function still observes');
            assert.deepEqual(report.fullName, 'undefined undefined', 'Value changed with expressionThis cleanup-ed');
        
            assert.ok(thingsCostReporter.getWasCleanup(), 'ObservableFunction was cleaned up after expressionThis (1)');
            assert.ok(monthlySalaryReporter.getWasCleanup(), 'ObservableFunction was cleaned up after expressionThis (2)');
            assert.ok(!carCostReporter.getWasCleanup(), 'ObservableFunction was NOT cleaned up after expressionThis when getObserves() is false');
            
        var newGuy = new Amm.Element({prop__name: 'Foo', prop__surname: 'Bar'});
        
        fullNameReporter.setExpressionThis(newGuy);
        
            assert.deepEqual(report.fullName, 'Foo Bar', 'Value changed with expressionThis changed');
            
        fullNameReporter.setVars('Mr. ', 'prefix');
            
            assert.deepEqual(report.fullName, 'Mr. Foo Bar', 'Value changed with vars changed');
        
        fullNameReporter.setVars({prefix: 'Sir '});
            
            assert.deepEqual(report.fullName, 'Sir Foo Bar', 'Value changed with vars changed (2)');
        
        fullNameReporter.cleanupWithExpressionThis = true;
        
        Amm.cleanup(newGuy, report);
        
            assert.ok(fullNameReporter.getWasCleanup(), 'ObservableFunction was cleaned up after expressionThis (2)');
        
    });
    
    QUnit.test("Amm.ObservableFunction - extra events", function(assert) {
        
        var elem = new Amm.Element({props: {
                a: 0,
                b: 1,
                c: 2,
                d: 3,
                e: 4,
                res: null
        }});
    
        var changeCounter = 0;
    
        var ofun = new Amm.ObservableFunction({
            fn: function(get) {
                if (get('a') === 1) {
                    return get('b', null, 'cChange') + this.c;
                }
                if (get('a') === 2) {
                    return get('c', null, ['dChange', 'eChange']) + get('c', null, ['dChange', 'eChange'])
                           + this.d + this.e;
                }
                return 0;
            }, 
            expressionThis: elem, 
            propertyOrHandler: 'res',
            on__valueChange: function() {
                changeCounter++;
            },
            cleanupWithExpressionThis: false,
            update: true
        });
        
            assert.deepEqual(elem.res, 0, 'initial value correct');
            assert.deepEqual(ofun.cleanupWithExpressionThis, false, 'options-style init works (prop)');
            assert.deepEqual(ofun.getSubscribers('valueChange').length, 1, 'options-style init works (event)');
            
        d.ofun = ofun;
            
        elem.a = 1;
            assert.deepEqual(ofun._links.length, 2, 'two props are observed');
            assert.deepEqual(elem.res, elem.b + elem.c, 'value is correct (1)'); // b + c
            assert.deepEqual(ofun._links.length, 2, 'only two links in use');
            
        elem.c += 1;
            assert.deepEqual(elem.res, elem.b + elem.c, 'value is correct (2)'); // still b + c
            
        elem.a = 2;
            // c + c + d + e
            assert.deepEqual(elem.res, elem.c + elem.c + elem.d + elem.e, 'value is correct (3)'); 
            assert.deepEqual(ofun._links.length, 2, 'only two links in use');
            
        elem.d += 1;
        elem.e += 2;
            // c + c + d + e
            assert.deepEqual(elem.res, elem.c + elem.c + elem.d + elem.e, 'value is correct (4)');
            assert.deepEqual(ofun._links.length, 2, 'only two links still in use');

        elem.a = 0;
            assert.deepEqual(elem.res, 0, 'change - value is proper');
            assert.deepEqual(ofun._links.length, 1, 'change - only one prop is observed');
            
        ofun.cleanupWithExpressionThis = true;
        elem.cleanup();
    });
    
    
    QUnit.test("Amm.ObservableFunction - writeFn", function(assert) {
        
        var el = new Amm.Element({
            props: {
                a: 10,
                b: 20
            }
        });
        var first, second;
        var ofn1 = new Amm.ObservableFunction(
            function(g) { return g('a') + g('b'); }, el, 
            function(v) { first = v; }, 
            undefined, 
            false // update is false
        );
        var ofn2 = new Amm.ObservableFunction(
            function(g) { return g('a') + g('b'); }, el, 
            function(v) { second = v; }, 
            undefined, 
            true // update is true
        );
        assert.deepEqual(first, undefined, 'Update is FALSE: first value is NOT set on OFN init');
        assert.deepEqual(second, 30, 'Update is TRUE: second value IS set on OFN init');
        el.a += 5;
        assert.deepEqual(first, 35, 'First change after init: first value is updated');
        assert.deepEqual(second, 35, 'First change after init: second value is updated');
    });
    
    QUnit.test("Amm.ObservableFunction - createCalcProperty", function(assert) {
        
        var p = Amm.ObservableFunction.createCalcProperty('sum');
        
        assert.equal(typeof p.getSum, 'function', 'createCalcProperty: hash.get<Foo> is function');
        assert.equal(typeof p.setSum, 'function', 'createCalcProperty: hash.set<Foo> is function');
        assert.equal(typeof p.outSumChange, 'function', 'createCalcProperty: hash.out<Foo>Change is function');
        assert.equal(typeof p._subscribeFirst_sumChange, 'function', 'createCalcProperty: _subscribeFirst_...');
        assert.equal(typeof p._unsubscribeLast_sumChange, 'function', 'createCalcProperty: _unsubscribeLast_...');
        assert.equal(p._ofunSum, null, 'createCalcProperty: _ofun<Foo> is null');
        
        var o = new Amm.Element({
            props: {
                a: 10, 
                b: 20, 
            },
        });
        o._calcSum = function(g) { 
            return g('a') + g('b'); 
        };
    
        Amm.ObservableFunction.createCalcProperty('sum', o);
        
            assert.deepEqual(o.getSum(), 30, 
                'createCalcProperty: getter works');
            assert.deepEqual(o._ofunSum, null,
                'when not observed, _ofun<Foo> for calc property is not created');
            
        o.a += 10;
            assert.deepEqual(o.getSum(), 40, 'after change, getter still works');
            assert.deepEqual(o._ofunSum, null, 
                'after change, _ofun is not created');
        
        var sum;
        o.subscribe('sumChange', function(v) { sum = v; });
            assert.deepEqual(sum, undefined, 
                'initial subscription to calc prop doesn\'t cause change event');
            assert.ok(o._ofunSum instanceof Amm.ObservableFunction, 
                'subscription to calc prop: _ofun is created');
        
        o.b += 5;
            assert.deepEqual(sum, 45,
                'change of observed property dependency: event triggered');
            
        o.unsubscribe('sumChange');
        assert.deepEqual(o._ofunSum, null,
            'calc property observed no more: _ofun<Prop> deleted');
        
        var o2 = new Amm.Element({
            props: {
                a: 10,
                b: 20,
                sum: function(g) { return g('a') + g('b'); }
            }
        });
        
            assert.deepEqual(o2.sum, 30, 
                'props.function: calc property was created & getter works');
            assert.deepEqual(o2._ofunSum, null,
                'when not observed, _ofun<Foo> for calc property is not created');
            
        o2.a += 10;
            assert.deepEqual(o2.getSum(), 40, 'after change, getter still works');
            assert.deepEqual(o2._ofunSum, null, 
                'after change, _ofun is not created');
        
        var sum2;
        o2.subscribe('sumChange', function(v) { sum2 = v; });
            assert.deepEqual(sum2, undefined, 
                'initial subscription to calc prop doesn\'t cause change event');
            assert.ok(o2._ofunSum instanceof Amm.ObservableFunction, 
                'subscription to calc prop: _ofun is created');
        
        o2.b += 5;
            assert.deepEqual(sum2, 45,
                'change of observed property dependency: event triggered');
            
        o2.unsubscribe('sumChange');
        assert.deepEqual(o2._ofunSum, null,
            'calc property observed no more: _ofun<Prop> deleted');
            
        Amm.cleanup(o, o2);
        
    });
    
}) ();