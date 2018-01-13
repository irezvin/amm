/* global Amm */
(function() { 
    QUnit.module("Range");
    
    QUnit.test("Range.Condition", function(assert) {
       
        // check if Condition is correctly parsed

        var s1, s2, s3;
        var r1 = new Amm.Expression(s1 = "$pupils{$pupil: $pupil.age > $min}");

            assert.equal(Amm.getClass(r1.getOperator(0)), 'Amm.Operator.Range.Condition', 'Condition Range "' + s1 + '" is properly parsed');
            assert.equal(r1.getOperator(0).keyVar, null, 'keyVar is null when it is not provided');
            assert.equal(r1.getOperator(0).valueVar, 'pupil', 'valueVar is one as provided');
        
        var r2 = new Amm.Expression(s2 = "$items{$i => $item: $i < 3 && $item.selected}");
        
            assert.equal(Amm.getClass(r2.getOperator(0)), 'Amm.Operator.Range.Condition', 'Condition Range "' + s2 + '" is properly parsed');
            assert.equal(r2.getOperator(0).keyVar, 'i', 'keyVar is one as provided');
            assert.equal(r2.getOperator(0).valueVar, 'item', 'valueVar is one as provided');
        
        var r3 = new Amm.Expression(s3 = "$rows{$i => : $i % 2 == 0}");
        
            assert.equal(Amm.getClass(r3.getOperator(0)), 'Amm.Operator.Range.Condition', 'Condition Range "' + s3 + '" is properly parsed');
            assert.equal(r3.getOperator(0).keyVar, 'i', 'keyVar is one as provided');
            assert.equal(r3.getOperator(0).valueVar, null, 'valueVar is null when not provided');
        
        window.d.r1 = r1;
        window.d.r1c = r1.getOperator(0);
        
        var pp = [
            new Amm.Element({properties: {name: 'Pup1', age: 6}}),
            new Amm.Element({properties: {name: 'Pup2', age: 7}}),
            new Amm.Element({properties: {name: 'Pup3', age: 8}}),
            new Amm.Element({properties: {name: 'Pup4', age: 5}}),
            new Amm.Element({properties: {name: 'Pup5', age: 4}}) 
        ];
        var ncpp = [
            { name: 'Pup6', age: 11 },
            { name: 'Pup7', age: 9 }
        ];
        
        var pupils = new Amm.Collection(pp);
        
        var changes = [];
        var lastValue = null;
        
        r1.subscribe('valueChange', function(value, oldValue) {
            var vv = Amm.getProperty(value, 'name');
            var ov = oldValue? Amm.getProperty(oldValue, 'name') : oldValue;
            changes.push([vv, ov]); 
            //console.log("range changed", vv, "old:", ov);
            lastValue = vv;
        });
        
        window.d.pp = pupils;
        
            assert.deepEqual(r1.getValue(), [], "Initial range value is an empty array");
            assert.deepEqual(changes, [], "No changes upon getValue()");
        
        r1.setVars({pupils: pupils, min: 6});
        
            assert.deepEqual(lastValue, ['Pup2', 'Pup3'], "Array is properly filtered when data is provided");
            assert.deepEqual(changes, [[['Pup2', 'Pup3'], []]], "Only one change is reported; old value is []");
        
        changes = [];
        pp[0].setAge(9);
        
            assert.deepEqual(lastValue, ['Pup1', 'Pup2', 'Pup3'], "Array is properly changed when data is changed");
            assert.deepEqual(changes, [[['Pup1', 'Pup2', 'Pup3'], ['Pup2', 'Pup3']]], "Only one change is reported; old value is proper");
        
        changes = [];
        r1.setVars(3, 'min');
        
            assert.deepEqual(changes, [[['Pup1', 'Pup2', 'Pup3', 'Pup4', 'Pup5'], ['Pup1', 'Pup2', 'Pup3']]], "Only one change is reported; old value is proper");
        
        changes = [];
        r1.setVars(10, 'min');
        
            assert.deepEqual(changes, [[[], ['Pup1', 'Pup2', 'Pup3', 'Pup4', 'Pup5']]], "Only one change is reported; old value is proper");
        
        changes = [];
        var arrPupils = [];
        r1.setVars(arrPupils, 'pupils');
        
            assert.equal(pp[0].getSubscribers().length, 0, "Objects not observed anymore after range observes different source");
            assert.equal(r1.getIsCacheable(), false, "Range expression that observes array is no more cacheable");
        
        arrPupils.push(ncpp[0]);
        arrPupils.push(ncpp[1]);
        arrPupils.push(pp[0]);
        Amm.getRoot().outInterval();
        
            assert.deepEqual(changes, [[['Pup6'], []]], "Non-cachable array is properly observed");
        
        
        changes = [];
        pp[0].setAge(12);
        
            assert.deepEqual(changes, [[['Pup6', 'Pup1'], ['Pup6']]], "Change of subscribeable object propagate immediately");
            
        changes = [];
        ncpp[1].age = 12;
        Amm.getRoot().outInterval();
        
            assert.deepEqual(changes, [[['Pup6', 'Pup7', 'Pup1'], ['Pup6', 'Pup1']]], "Non-subscribleable objects are updated after time interval passed");
        
        r1.cleanup();
        
            assert.equal(pp[0].getSubscribers().length, 0, "Objects not observed anymore after range cleanup");
        
        
    });
    
    if (0) // don't do at the time
    QUnit.test("Range.parsing", function(assert) {
        
        /*var dummyExp = new Amm.Expression();
        dummyExp.setThisObject(new Amm.Element);
        
        var p = new Amm.Expression.Parser();
        var b = new Amm.Expression.Builder(dummyExp);
        
        var tt = function(t) {
            var r = '';
            for (var i = 0; i < t.length; i++) {
                r += t[i].string;
            }
            return r;
        };*/
        
        var c = new Amm.Collection();
        
        // -- REGULAR ranges --
        
        // "All" range (range object shouldn't be created; instead, toArray converter should be created)
        var r1 = new Amm.Expression("this{*}", c);
        
        // Index range (const)
        var r2 = new Amm.Expression("this{0}", c);
        
        // Index range (var)
        var r3 = new Amm.Expression("this{$foo}", c);
        
        // Index range (expr)
        var r4 = new Amm.Expression("this{$foo + 1}", c);
        
        // Interval (const, a to b)
        var r5 = new Amm.Expression("this{1..3}", c);
        
        // Interval (const, b only)
        var r5 = new Amm.Expression("this{..3}", c);
        
        // Interval (const, a only)
        var r6 = new Amm.Expression("this{3..}", c);
        
        // Interval (both a and b are expressions)
        var r7 = new Amm.Expression("this{$foo .. $foo + $bar}", c);
        
        var r8 = new Amm.Expression("this{$i => : $i % 2}", c);
        
        var r9 = new Amm.Expression("this{$v: $v.visible or $v.enabled}", c);

        var r10 = new Amm.Expression("this{$i: $v: $i == 3 or !($v.visible || $v.enabled)}", c);        
        
        var r11 = new Amm.Expression("this{..-5}", c);
        
        // --- ELEMENT ACCESS ranges --
        
        var e1 = new Amm.Expression("this->x{0}", c);
        
        var e2 = new Amm.Expression("this->x{*}", c);
        
        var e3 = new Amm.Expression("this->x{$foo}", c);
        
        var e4 = new Amm.Expression("this->x{1..3}", c);
        
        var e5 = new Amm.Expression("this->[$id]{0}", c);
        
        var e6 = new Amm.Expression("this->[$id]{*}", c);
        
        var e7 = new Amm.Expression("this->{$foo}", c);
        
        // every second child element
        var e8 = new Amm.Expression("this->{$i => : $i % 2}", c);
        
        // all children with "input" identifier, visible or enabled
        var e9 = new Amm.Expression("this->input{$v: $v.visible or $v.enabled}", c);

        // third element or not visible-or-enabled item
        var e10 = new Amm.Expression("this->x{$i: $v: $i == 3 or !($v.visible || $v.enabled)}", c);        
        
        
    });
}) ();
