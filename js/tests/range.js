/* global Amm */
/* global QUnit */

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
            lastValue = vv;
        });
        
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
    
    
    /**
     * Requires $items to have boolean 'pass' property that indicates that they should be in dest range
     * 
     * @param {Amm.Expression} Expression (must have $items var) that's first operator is Range
     * @param {int} offset 
     * @param {int} cutLength
     * @param {Array} insert Items that we will insert into $items variable
     * @param {boolean} doReplace Replace $items with new instance of array ('c' to replace with collection)
     * @param {boolean} needTimer 
     * @param {function} passFn function(item) If provided, should return TRUE to check if item passes
     * @param {function} innerFn optional function(exp) to be called after expression manipulation, but before checks
     * @returns {string} Empty string if all ok, or error description
     */    
    var testRangeStateCorrectness = function(exp, offset, cutLength, insert, doReplace, needTimer, passFn, innerFn) {
        
        if (!insert) insert = [];
        if (!offset) offset = 0;
        if (!cutLength) cutLength = 0;
        
        if (!passFn) passFn = function(e) { return Amm.getProperty(e, 'pass'); };
        var i;
        var op = exp.getOperator(0);
        if (!op['Amm.Operator.Range.Condition']) throw "exp doesn't have Condition range";
        var items = exp.getVars('items');
        var spliceArgs = [offset, cutLength].concat(insert);
        var valCopy = [];
        var properResult = [];
        var problems = [];
        var properMap = [];
        var iter = op._iteratorOperator;
        var iterCtxToIdx = {};
        var idxToIterCtx = {};
        var opCtxId = op.getContextId();
        var ctxId;
        var data;
        var numIterCtx = 0;
        var fn = exp.toFunction();
        
        if (items && items.length) {
            if (items instanceof Array) valCopy = items.concat([]);
            else valCopy = items.getItems();
        }
        valCopy.splice.apply(valCopy, spliceArgs);
        if (doReplace) {
            if (doReplace === 'c') valCopy = new Amm.Collection(valCopy);
            exp.setVars(valCopy, 'items');
        } else {
            items.splice.apply(items, spliceArgs);
        }
        
        if (innerFn) innerFn(exp);
        
        if (needTimer) Amm.getRoot().outInterval();
        
        for (i = 0; i < valCopy.length; i++) {
            if (passFn(valCopy[i]))
                properResult.push(valCopy[i]);
        }
        
        // check for bogus map items
        
        for (i = 0; i < valCopy.length; i++) {
            // search for appropriate context
            properMap.push({
                i: i,
                o: valCopy[i],
                c: null
            });
        }
        
        var iterCtx = op._iteratorOperator.listContexts();
        
        for (i = 0; i < iterCtx.length; i++) {
            ctxId = iterCtx[i];
            data = iter._contextId === ctxId? iter : iter._contextState[ctxId];
            if (data.parentContextId !== opCtxId) continue;
            if (!iterCtxToIdx[ctxId]) {
                iterCtxToIdx[ctxId] = [];
            }
            if (!idxToIterCtx[data.index]) idxToIterCtx[data.index] = [];
                idxToIterCtx[data.index].push(ctxId);
            iterCtxToIdx[ctxId].push(data.index);
            if (properMap[data.index] && properMap[data.index].c === null) {
                properMap[data.index].c = ctxId;
            }
            numIterCtx++;
        }

        // check for bogus contexts
        
        if (numIterCtx !== valCopy.length) problems.push(
            "Number of Iterator contexts: (" + numIterCtx + ") != number of items (" + valCopy.length + ")"
        );

        for (i in idxToIterCtx) if (idxToIterCtx.hasOwnProperty(i)) {
            if (idxToIterCtx[i].length > 1) {
                problems.push("More than one context (" + idxToIterCtx[i].join(", ") + ") referencing same index (" + i + ")");
            }
        }
        
        // check for map and state correctness
        
        var map = op._map;
        for (i = 0; i < properMap.length; i++) {
            if (!map[i]) {
                problems.push("Map item " + i + " missing");
                continue;
            }
            if (map[i].i !== i) problems.push("Map item " + i + " index is wrong (" + map[i].i + " instead of + " + i + ")");
            if (idxToIterCtx[i]) {
                if (idxToIterCtx[i][0] !== map[i].c) {
                    problems.push("Map item " + i + " is referenced by context " + idxToIterCtx[i][0] + ", but map specifies context " + map[i].c);
                } else {
                    ctxId = map[i].c;
                    data = iter._contextId === ctxId? iter : iter._contextState[ctxId];
                    if (op.keyVar !== null && data._vars[op.keyVar] !== i) {
                        problems.push("Context " + ctxId + ": keyVar value (" + data.vars[op.keyVar] + ") doesn't match index (" + i + ")");
                    }
                    if (op.valueVar !== null && data._vars[op.valueVar] !== properMap[i].o) {
                        problems.push("Context " + ctxId + ": valueVar value doesn't match proper object value");
                    }
                }
            } else {
                problems.push("Index " + i + " is not referenced by any of iterator contexts");
            }
            if (map[i].i !== i) problems.push("Map item " + i + " index is wrong (" + map[i].i + " instead of + " + i + ")");
            if (map[i].o !== valCopy[i]) problems.push("Map item " + i + " referencing wrong object");
        }
        
        // check for result correctness
        
        var val = exp.getValue();
        
        if (val.length !== properResult.length) {
            problems.push("Expression result length (" + val.length + ") doesn't match proper result length (" + properResult.length + ")");
        } else {
            var badResult = false;
            for (i = 0; i < val.length; i++) {
                if (val[i] !== properResult[i]) {
                    badResult = true;
                    problems.push("Expression result item #" + i + " doesn't match proper result item");
                }
            }
//            if (badResult) {
//                console.log(Amm.getProperty(val, 'name'), Amm.getProperty(properResult, 'name'));
//            }
        }

        var fnVal = fn();
        if (fnVal.length !== properResult.length) {
            problems.push("Function result length (" + fnVal.length + ") doesn't match proper result length (" + properResult.length + ")");
        } else {
            badResult = false;
            for (i = 0; i < fnVal.length; i++) {
                if (fnVal[i] !== properResult[i]) {
                    badResult = true;
                    problems.push("Function result item #" + i + " doesn't match proper result item");
                }
            }
//            if (badResult) {
//                console.log(Amm.getProperty(fnVal, 'name'), Amm.getProperty(properResult, 'name'));
//            }
        }
        
        
        return problems.join("\n");
    };
    
    var mkElement = function(name, pass) {
        return new Amm.Element({
            properties: {
                name: name,
                pass: pass
            }
        });
    };
    
    QUnit.test("Range.Condition: source manipulation", function(assert) {
        
        var e = 0;
        var els1 = [
            mkElement('e1_0', true),
            mkElement('e1_1', false),
            mkElement('e1_2', true),
            mkElement('e1_3', false),
            mkElement('e1_4', true),
            mkElement('e1_5', false),
            mkElement('e1_6', true),
            mkElement('e1_7', false),
            mkElement('e1_8', false),
            mkElement('e1_9', false)
        ];
        e = 0;
        var els2 = [
            mkElement('e2_0', true),
            mkElement('e2_1', false),
            mkElement('e2_2', true),
            mkElement('e2_3', false),
            mkElement('e2_4', true),
            mkElement('e2_5', false),
            mkElement('e2_6', true),
            mkElement('e2_7', false),
            mkElement('e2_8', false),
            mkElement('e2_9', false)
        ];
        var ex = new Amm.Expression("$items{$item: $item.pass}");
        var probl;
        
        probl = testRangeStateCorrectness(ex, 0, 0, els1.slice(0, 6), 'c', false);
        assert.equal(probl, '', 'Adding initial items');
        
        probl = testRangeStateCorrectness(ex, 2, 0, els2.slice(0, 3));
        assert.equal(probl, '', 'Inserting some items');
        
        probl = testRangeStateCorrectness(ex, 1, 2);
        assert.equal(probl, '', 'Deleting 2 items');
        
        probl = testRangeStateCorrectness(ex, 1, 2, els2.slice(3, 6));
        assert.equal(probl, '', 'Deleting 2, inserting 3 items');
        
        probl = testRangeStateCorrectness(ex, 1, 3, els2.slice(6, 8));
        assert.equal(probl, '', 'Deleting 3, inserting 2 items');
        
        probl = testRangeStateCorrectness(ex, 1, 2, els2.slice(8, 10));
        assert.equal(probl, '', 'Deleting 2, inserting 2 items');
    
        probl = testRangeStateCorrectness(ex, 0, 10, els2.slice(0, 10), 'c');
        assert.equal(probl, '', 'Replacing with partially matching items');

        probl = testRangeStateCorrectness(ex, 0, 10, els2.slice(0, 10), 'c');
        assert.equal(probl, '', 'Replacing with same items, different coll. instance');
        
        probl = testRangeStateCorrectness(ex, 0, 10, els2.slice(0, 10).reverse(), 'c');
        assert.equal(probl, '', 'Updating with reversed items, diff. instance');
        
        probl = testRangeStateCorrectness(ex, 0, 10, els1.slice(0, 7), 'c');
        assert.equal(probl, '', 'Replacing with completely diff. items & instance');
        
        probl = testRangeStateCorrectness(ex, 0, 7, els1.slice(0, 7));
        assert.equal(probl, '', 'Updating with reversed items');
        
        Amm.cleanup(els1, els2, ex);
    });
    
    QUnit.test("Range.Condition: with index", function(assert) {
        
        var ee = [
            mkElement('e0', true),
            mkElement('e1', false),
            mkElement('e2', true),
            mkElement('e3', false),
            mkElement('e4', true),
            mkElement('e5', false),
            mkElement('e6', true),
            mkElement('e7', false),
            mkElement('e8', false),
            mkElement('e9', false)
        ];
        
        var c = new Amm.Collection(ee.slice(0, 7));
        var ex = new Amm.Expression("this{$i =>: $i >= 2 && $i <= 4}", c);
        assert.deepEqual(Amm.getProperty(ex.getValue(), 'name'), ['e2', 'e3', 'e4'], 'correct index-based value');
        c.unshift(ee[8]);
        assert.deepEqual(Amm.getProperty(ex.getValue(), 'name'), ['e1', 'e2', 'e3'], 'correct value after prepending array');
        c.splice(2, 2);
        assert.deepEqual(Amm.getProperty(ex.getValue(), 'name'), ['e3', 'e4', 'e5'], 'correct value after splicing');
        ex.cleanup();
        
        c.setItems(ee);
        var ex2 = new Amm.Expression("this{$i => $item: $i >= 2 && $i <= 4 || $item.name === 'e9'}", c);
        assert.deepEqual(Amm.getProperty(ex2.getValue(), 'name'), ['e2', 'e3', 'e4', 'e9'], 'correct index&content based value');
        c[9].setName('zz');
        assert.deepEqual(Amm.getProperty(ex2.getValue(), 'name'), ['e2', 'e3', 'e4'], 'correct index&content based value (content changed)');
        c.moveItem(9, 2);
        assert.deepEqual(Amm.getProperty(ex2.getValue(), 'name'), ['zz', 'e2', 'e3'], 'correct index&content based value (index changed)');
        ex.cleanup();
    });
    
    QUnit.test("Range.slice", function(assert) {
        
        var c = new Amm.Array(['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10']);
        var ex = new Amm.Expression("this{$a..$a+3}", c);
        ex.setVars(1, 'a');
        var v;
        ex.subscribe('valueChange', function(val) { v = val; } );
        assert.deepEqual(ex.getValue(), ['a1', 'a2', 'a3'], 'initially proper slice range');
        c.unshift('a_');
        assert.deepEqual(v, ['a0', 'a1', 'a2'], 'proper value after unshift');
        c.removeItem('a1');
        assert.deepEqual(v, ['a0', 'a2', 'a3'], 'proper value after item is deleted');
        ex.setVars(4, 'a');
        assert.deepEqual(v, ['a4', 'a5', 'a6'], 'proper value after index changed');
        c.cleanup();
        
    });
    
    QUnit.test("Range.parsing", function(assert) {
        
        var c = new Amm.Collection();
        var ee = [];
        
        // -- REGULAR ranges --
        
        // "All" range (range object shouldn't be created; instead, toArray converter should be created)
        ee.push(new Amm.Expression("this{*}", c));
        
        // Index range (const)
        ee.push(new Amm.Expression("this{0}", c));
        
        // Index range (var)
        ee.push(new Amm.Expression("this{$foo}", c));
        
        // Index range (expr)
        ee.push(new Amm.Expression("this{$foo + 1}", c));
        
        // Slice (const, a to b)
        ee.push(new Amm.Expression("this{1..3}", c));
        
        // Slice (const, b only)
        ee.push(new Amm.Expression("this{..3}", c));
        
        // Slice (const, a only)
        ee.push(new Amm.Expression("this{3..}", c));
        
        // Slice (both a and b are expressions)
        ee.push(new Amm.Expression("this{$foo .. $foo + $bar}", c));
        
        // Condition
        ee.push(new Amm.Expression("this{$i => : $i % 2}", c));
        
        // Condition
        ee.push(new Amm.Expression("this{$v: $v.visible || $v.enabled}", c));

        // Condition
        ee.push(new Amm.Expression("this{$i => $v: $i == 3 || !($v.visible || $v.enabled)}", c));        
        
        // Slice
        ee.push(new Amm.Expression("this{..-5}", c));

        // Slice
        ee.push(new Amm.Expression("this{..}", c));
        
        // --- ELEMENT ACCESS ranges ---
        
        ee.push(new Amm.Expression("this->x{0}", c));
        
        ee.push(new Amm.Expression("this->x{*}", c));
        
        ee.push(new Amm.Expression("this->x{$foo}", c));
        
        ee.push(new Amm.Expression("this->x{1..3}", c));
        
        ee.push(new Amm.Expression("this->[$id]{0}", c));
        
        ee.push(new Amm.Expression("this->[$id]{*}", c));

        ee.push(new Amm.Expression("this->{$foo}", c));
        
        // every second child element
        ee.push(new Amm.Expression("this->{$i => : $i % 2}", c));
        
        // all children with "input" identifier, visible or enabled
        ee.push(new Amm.Expression("this->input{$v: $v.visible || $v.enabled}", c));

        // third element or not visible-or-enabled item
        ee.push(new Amm.Expression("this->x{$i => $v: $i == 3 || !($v.visible || $v.enabled)}", c));
        
        assert.ok(true); // everything parsed without errors
        Amm.cleanup(ee);
        
    });
    
    QUnit.test("Access operator ranges", function(assert) {
        
        var c = new Amm.Element({traits: ['Amm.Trait.Component'], properties: {name: 'c', v: 5}});
        var d = new Amm.Element({id: 'x', properties: {name: 'd', v: 10}, component: c});
        var e = new Amm.Element({properties: {name: 'e', v: 5}, component: c});
        var f = new Amm.Element({traits: ['Amm.Trait.Component'], properties: {name: 'f', v: 10}, isComponent: false, component: c});
        var g = new Amm.Element({id: 'x', properties: {name: 'g', v: 5}, component: f});
        var h = new Amm.Element({id: 'x', properties: {name: 'h', v: 10}, component: c});
        var i = new Amm.Element({properties: {name: 'i', v: 5}, component: f});
        var j = new Amm.Element({properties: {name: 'j', v: 10}, component: c});
        
        var ex = new Amm.Expression("this->x{$item: $item.v == 10}", c);
        window.d.ex = ex;
        window.d.c = c;
        var v;
        ex.subscribe('valueChange', function(val) { v = val; });
        assert.deepEqual(Amm.getProperty(ex.getValue(), 'name'), ['d', 'h'], 'proper element access using range selector');
        g.setV(10);
        assert.deepEqual(Amm.getProperty(v, 'name'), ['d', 'g', 'h'], 'element access + range value changed with properties');
        g.setV(5);
        assert.deepEqual(Amm.getProperty(v, 'name'), ['d', 'h'], 'element access + range value changed with properties');
       
        var ex1 = new Amm.Expression("this->x{*}", c);
        assert.deepEqual(Amm.getProperty(ex1.getValue(), 'name'), ['d', 'g', 'h'], 'proper element access using "all" range');
        
        var ex2 = new Amm.Expression("this->x{1}", c);
        assert.deepEqual(Amm.getProperty(ex2.getValue(), 'name'), 'g', 'proper element access using "index" range');
        
        var ex3 = new Amm.Expression("this->{$item: $item.v == 10}", c);
        assert.deepEqual(Amm.getProperty(ex3.getValue(), 'name'), ['d', 'f', 'h', 'j'], 'proper element access using range w/o id');
        
        var v3;
        ex3.subscribe('valueChange', function(val) { v3 = val; });
        j.setV(5);
        assert.deepEqual(Amm.getProperty(v3, 'name'), ['d', 'f', 'h'], 'proper element access using range w/o id > tracks changes');
        g.setV(10);
        assert.deepEqual(Amm.getProperty(v3, 'name'), ['d', 'f', 'g', 'h'], 'proper element access using range w/o id > tracks changes');
        
        return;
        
        Amm.cleanup(c, d, e, f, g, h, i, j, ex, ex1, ex2, ex3);
        
    });
    
    QUnit.test("RegExp ranges", function(assert) {
        
        var r = new Amm.Array(['aaa', 'aab', 'baa', 'aac', 'bbb']);
        
        var ex  = new Amm.Expression("this{/^aa/}", r);
        
        assert.equal(Amm.getClass(ex.getOperator(0)), 'Amm.Operator.Range.RegExp');
        
        var v;
        ex.subscribe('valueChange', function(val) { v = val; });
        
            assert.deepEqual(ex.getValue(), ['aaa', 'aab', 'aac']);
        
        r.push('aad');
        
            assert.deepEqual(v, ['aaa', 'aab', 'aac', 'aad']);
        
        r.unshift('aa');
        
            assert.deepEqual(v, ['aa', 'aaa', 'aab', 'aac', 'aad']);
            
        Amm.cleanup(r);
        
    });
    
    QUnit.test("Condition range in context", function(assert) {
        
        var els1 = [
            mkElement('e1_0', true),
            mkElement('e1_1', false),
            mkElement('e1_2', true),
            mkElement('e1_3', false),
            mkElement('e1_4', true),
            mkElement('e1_5', false),
            mkElement('e1_6', true),
            mkElement('e1_7', false),
            mkElement('e1_8', false),
            mkElement('e1_9', false)
        ];
        var els2 = [
            mkElement('e2_0', true),
            mkElement('e2_1', false),
            mkElement('e2_2', true),
            mkElement('e2_3', false),
            mkElement('e2_4', true),
            mkElement('e2_5', false),
            mkElement('e2_6', true),
            mkElement('e2_7', false),
            mkElement('e2_8', false),
            mkElement('e2_9', true)
        ];
        var a1 = new Amm.Array(els1);
        var a2 = new Amm.Array(els2);
        
        var probl;
        
        var v1, v2;
        
        var ex = new Amm.Expression("$items{$item: $item.pass}");
            ex.setVars(a1, 'items');
            ex.subscribe('valueChange', function(v) { v1 = v; });
            var vv = ex.getValue();
            assert.deepEqual(Amm.keys(ex.getVars()), ['items'], 'no bogus vars (regular)');
            var fn = ex.toFunction();
            var vf = fn();
            assert.deepEqual(Amm.getProperty(vv, 'name'), Amm.getProperty(vf, 'name'), 'function returns same result...');
            assert.deepEqual(Amm.keys(ex.getVars()), ['items'], 'no bogus vars (function)');
            
            probl = testRangeStateCorrectness(ex);
            assert.equal(probl, '', 'Initial items - context 1');
            
        var cid2 = ex.createContext({vars: {items: a2}});
            ex.subscribe('valueChange', function(v) { v2 = v; });
            probl = testRangeStateCorrectness(ex);
            assert.equal(probl, '', 'Initial items - context 2');
            
        v1 = null;
        a1.splice(3, 3);
        assert.deepEqual(Amm.getProperty(v1, 'name'), ['e1_0', 'e1_2', 'e1_6']);
        
        v2 = null;
        a2.splice(3, 4);
        assert.deepEqual(Amm.getProperty(v2, 'name'), ['e2_0', 'e2_2', 'e2_9']);
        
        a1[0].setPass(false);
        assert.deepEqual(Amm.getProperty(v1, 'name'), ['e1_2', 'e1_6']);
        
        a2[1].setPass(true);
        assert.deepEqual(Amm.getProperty(v2, 'name'), ['e2_0', 'e2_1', 'e2_2', 'e2_9']);
        
        Amm.cleanup(ex, a1, a2);
        
    });
    
}) ();
