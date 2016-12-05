(function() {

    var currAssert;

    /* global Amm */

    QUnit.test("Amm.ObservableArray.diff", function(assert) {

        var arrayDiff = Amm.ObservableArray.arrayDiff;
        var symmetricDiff = Amm.ObservableArray.symmetricDiff;

        var f = Amm.ObservableArray._optArrayDiff;

        var cmp = function(a, b) { return a !== b };
        var appCmpFn = null;
        var plan = [
            [false, undefined],
            [false, cmp],
            [true, undefined],
            [true, cmp]
        ];

        for (var i = 0; i < plan.length; i++) {

            Amm.ObservableArray._optArrayDiff = plan[i][0], appCmpFn = plan[i][1];

            var a = [1, 1, 2, 2, 3];
            var b = [3, 2, 1, 3];
            assert.deepEqual(arrayDiff(a, b), []);
            assert.deepEqual(arrayDiff(b, a), []);

            assert.deepEqual(symmetricDiff(a, b), [1, 2]);
            assert.deepEqual(symmetricDiff(b, a), [3], plan[i][0] + '_' + plan[i][1]);

            var a = [3, 1, 2, 1, 2, 3];
            var b = [1, 1, 2, 2, 3, 3];
            assert.deepEqual(symmetricDiff(a, b), []);
            assert.deepEqual(symmetricDiff(b, a), []);
        }


    });

    QUnit.test("Amm.ObservableArray.smartDiff.noComparisonFn", function(assert) {

        var smartDiff = Amm.ObservableArray.smartDiff;

        var a, b;

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        assert.deepEqual(smartDiff(a, b), null);

        a = [];
        b = [];
        assert.deepEqual(smartDiff(a, b), null);

        a = [];
        b = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        assert.deepEqual(smartDiff(a, b), ['splice', 0, 0, b]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = [];
        assert.deepEqual(smartDiff(a, b), ['splice', 0, 6, []]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a1', 'a2', 'a2.1', 'a3', 'a4', 'a5', 'a6'];
        assert.deepEqual(smartDiff(a, b), ['splice', 2, 0, ['a2.1']]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a1', 'a2', 'a5', 'a6'];
        assert.deepEqual(smartDiff(a, b), ['splice', 2, 2, []]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a1', 'a2', 'a7', 'a5', 'a6'];
        assert.deepEqual(smartDiff(a, b), ['splice', 2, 2, ['a7']]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['ax', 'ax', 'ax', 'ax', 'ax'];
        assert.deepEqual(smartDiff(a, b), ['splice', 0, 6, b]);


        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = [];
        assert.deepEqual(smartDiff(a, b), ['splice', 0, 6, []]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a6', 'a4', 'a1', 'a2', 'a3', 'a5'];
        assert.deepEqual(smartDiff(a, b), ['reorder', 0, 6]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a1', 'a4', 'a3', 'a2', 'a5', 'a6'];
        assert.deepEqual(smartDiff(a, b), ['reorder', 1, 3]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a1', 'a7', 'a8', 'a9', 'a10', 'a6'];
        assert.deepEqual(smartDiff(a, b), ['splice', 1, 4, ['a7', 'a8', 'a9', 'a10']]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a1', 'a3', 'a4', 'a2', 'a5', 'a6'];
        assert.deepEqual(smartDiff(a, b), ['move', 1, 3]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a6', 'a1', 'a2', 'a3', 'a4', 'a5'];
        assert.deepEqual(smartDiff(a, b), ['move', 5, 0]);

        a = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
        b = ['a2', 'a3', 'a4', 'a5', 'a6', 'a1'];
        assert.deepEqual(smartDiff(a, b), ['move', 0, 5]);

    });

    QUnit.test("Amm.ObservableArray.smartDiff.withComparisonFn", function(assert) {

        var smartDiff = Amm.ObservableArray.smartDiff;

        var cmp = function(a, b) { return a != b; };

        var a, b;

        a = [1, 2, 3, 4, 5, 6];
        b = ['1', '2', '3', '4', '5', '6'];
        assert.deepEqual(smartDiff(a, b, cmp), null);

        a = [];
        b = [];
        assert.deepEqual(smartDiff(a, b, cmp), null);

        a = [];
        b = ['1', '2', '3', '4', '5', '6'];
        assert.deepEqual(smartDiff(a, b, cmp), ['splice', 0, 0, b]);

        a = [1, 2, 3, 4, 5, 6];
        b = [];
        assert.deepEqual(smartDiff(a, b, cmp), ['splice', 0, 6, []]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['1', '2', '2.1', '3', '4', '5', '6'];
        assert.deepEqual(smartDiff(a, b, cmp), ['splice', 2, 0, ['2.1']]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['1', '2', '5', '6'];
        assert.deepEqual(smartDiff(a, b, cmp), ['splice', 2, 2, []]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['1', '2', '7', '5', '6'];
        assert.deepEqual(smartDiff(a, b, cmp), ['splice', 2, 2, ['7']]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['x', 'x', 'x', 'x', 'x'];
        assert.deepEqual(smartDiff(a, b, cmp), ['splice', 0, 6, b]);


        a = [1, 2, 3, 4, 5, 6];
        b = [];
        assert.deepEqual(smartDiff(a, b, cmp), ['splice', 0, 6, []]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['6', '4', '1', '2', '3', '5'];
        assert.deepEqual(smartDiff(a, b, cmp), ['reorder', 0, 6]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['1', '4', '3', '2', '5', '6'];
        assert.deepEqual(smartDiff(a, b, cmp), ['reorder', 1, 3]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['1', '7', '8', '9', '10', '6'];
        assert.deepEqual(smartDiff(a, b, cmp), ['splice', 1, 4, ['7', '8', '9', '10']]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['1', '3', '4', '2', '5', '6'];
        assert.deepEqual(smartDiff(a, b, cmp), ['move', 1, 3]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['6', '1', '2', '3', '4', '5'];
        assert.deepEqual(smartDiff(a, b, cmp), ['move', 5, 0]);

        a = [1, 2, 3, 4, 5, 6];
        b = ['2', '3', '4', '5', '6', '1'];
        assert.deepEqual(smartDiff(a, b, cmp), ['move', 0, 5]);

    });

    var descCall = function(items, method, args) {
        var aa = [];
        for (var i = 0; i < args.length; i++) aa.push(JSON.stringify(args[i]));
        var desc = method + '(' + aa.join(', ') + ')';
        if (items instanceof Array) desc = JSON.stringify(items) + '.' + desc;
        return desc;
    };

    var testArrayCompat = function(items, method, arg_) {
        var a, b;
        if (items instanceof Amm.ObservableArray) {
            a = items;
            b = items.getItems();
        } else if (items instanceof Array) {
            a = new Amm.ObservableArray;
            a.push.apply(a, items);
            b = items;
        } else throw "WTF: `items` must be an Array or an Amm.ObservableArray!";
        var args = args = Array.prototype.slice.call(arguments, 2);
        var desc = descCall(b, method, args);
        var r1 = a[method].apply(a, args);
        var r2 = b[method].apply(b, args);
        currAssert.deepEqual(r1, r2, desc + ' [result]');
        currAssert.deepEqual(a.getItems(), b, desc + ' [state]');
    };

    QUnit.test("Amm.ObservableArray.arrayCompat", function(assert) {
        currAssert = assert;

        testArrayCompat([], 'push', 4, 5, 6, 7);
        testArrayCompat([], 'pop');
        testArrayCompat([1, 2, 3], 'pop');
        testArrayCompat([], 'shift');
        testArrayCompat([1, 2, 3], 'shift');

        testArrayCompat(['a', 'b', 'c'], 'unshift', 'x', 'y', 'z');
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'slice', 0, 3);
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'slice', -1, 2);
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'slice');
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'slice', 1, -1);
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'slice', -3, -1);
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'slice', -1, 1);

        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'splice', 0, 2);
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'splice', 1, -1);
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'splice', 2, 2, 'm', 'n', 'k');
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'splice', -1, 0, 'x', 'y');
        testArrayCompat(['a', 'b', 'c', 'd', 'e'], 'splice', -1, 0, ['x', 'y']);

        testArrayCompat(['a', 'b', 'c', 'b', 'c'], 'indexOf', 'b');
        testArrayCompat(['a', 'b', 'c', 'b', 'c'], 'indexOf', 'b', -1);
        testArrayCompat(['a', 'b', 'c', 'b', 'c'], 'indexOf', 'b', 3);
        testArrayCompat(['a', 'b', 'c', 'b', 'c'], 'indexOf', 'nx');
    });
    
    var testArrayManipulation = function(items, method, args, resItems, result) {
        var a, b;
        if (items instanceof Amm.ObservableArray) {
            a = items;
            b = items.getItems();
        } else if (items instanceof Array) {
            a = new Amm.ObservableArray;
            a.push.apply(a, items);
            b = items;
        } else throw "WTF: `items` must be an Array or an Amm.ObservableArray!";
        var desc = descCall(b, method, args);
        var r1 = a[method].apply(a, args);
        currAssert.deepEqual(a.getItems(), resItems, desc + ' [state]');
        if (arguments.length > 3) currAssert.deepEqual(r1, result, desc + ' [result]');
        return a;
    };
    
    QUnit.test("Amm.ObservableArray.arrayManipulation", function(assert) {
        currAssert = assert;
        
        var a = ['a', 'b', 'c'];
        var r;
        
        testArrayManipulation(a, 'getItem', [0], a, 'a');
        testArrayManipulation(a, 'getIndexExists', [0], a, true);
        
        testArrayManipulation(a, 'getItem', [a.length - 1], a, 'c');
        testArrayManipulation(a, 'getIndexExists', [a.length - 1], a, true);
        
        testArrayManipulation(a, 'getItem', [-1], a, undefined);
        testArrayManipulation(a, 'getIndexExists', [-1], a, false);
        
        testArrayManipulation(a, 'getItem', [a.length], a, undefined);
        testArrayManipulation(a, 'getIndexExists', [a.length], a, false);

        testArrayManipulation(a, 'setItem', [0, 'z'], ['z', 'b', 'c'], 0);
        
        // not sparse
        testArrayManipulation(a, 'setItem', [4, 'z'], ['a', 'b', 'c', 'z'], 3);
        testArrayManipulation(a, 'removeAtIndex', [1], ['a', 'c'], true);
        testArrayManipulation(a, 'removeAtIndex', [a.length], a, false);

        
        
        // "sparse" argument has no effect if ObservableArray._sparse === false
        testArrayManipulation(a, 'removeAtIndex', [1, true], ['a', 'c'], true);
        
        // sparse
        testArrayManipulation(new Amm.ObservableArray(a, {sparse: true}), 
            'setItem', [4, 'z'], ['a', 'b', 'c', undefined, 'z'], 4);
        testArrayManipulation(new Amm.ObservableArray(a, {sparse: true}), 
            'removeAtIndex', [1, true], ['a', undefined, 'c'], true);
        testArrayManipulation(new Amm.ObservableArray(a, {sparse: true}), 
            'removeAtIndex', [a.length, true], a, false);
        
        testArrayManipulation(a, 'insertItem', ['*'], ['a', 'b', 'c', '*'], 3);
        testArrayManipulation(a, 'insertItem', ['*', 0], ['*', 'a', 'b', 'c'], 0);
        testArrayManipulation(a, 'insertItem', ['*', 1], ['a', '*', 'b', 'c'], 1);
        testArrayManipulation(a, 'insertItem', ['*', 2], ['a', 'b', '*', 'c'], 2);
        testArrayManipulation(a, 'insertItem', ['*', 3], ['a', 'b', 'c', '*'], 3);
        
        testArrayManipulation(a, 'setItems', [[]], [], 0);
        testArrayManipulation(a, 'setItems', [['x']], ['x'], 1);
        testArrayManipulation(a, 'setItems', [['x', 'y']], ['x', 'y'], 2);
        testArrayManipulation(a, 'setItems', [a], a, a.length);

        testArrayManipulation(a, 'insertItemBefore', ['x', 'a'], ['x', 'a', 'b', 'c'], 0);
        testArrayManipulation(a, 'insertItemBefore', ['x', 'c'], ['a', 'b', 'x', 'c'], 2);
        testArrayManipulation(a, 'insertItemBefore', ['x', 'c'], ['a', 'b', 'x', 'c'], 2);
        testArrayManipulation(a, 'insertItemBefore', ['x'], ['a', 'b', 'c', 'x'], 3);
        assert.throws(function() {
            var oa = new Amm.ObservableArray(a);
            oa.insertItemBefore('x', 'nonExistent');
        });
        
        var a1 = a.concat(a);
        testArrayManipulation(a1, 'removeItem', ['a'], ['b', 'c', 'a', 'b', 'c'], 1);
        testArrayManipulation(a1, 'removeItem', ['a', true], ['b', 'c', 'b', 'c'], 2);
        testArrayManipulation(a1, 'removeItem', ['nx'], a1, 0);
               
    });
    
    QUnit.test("Amm.ObservableArray.arrayManipulation", function(assert) {
        
        var findDuplicates = Amm.ObservableArray.findDuplicates;
        var cmp = function(a, b) { return a != b; };
        
        //       0  1  2  3  4  5  6  7
        var a = [1, 1, 2, 3, 2, 4, 1, '4'];
        
        assert.deepEqual(findDuplicates(a), [[0, 1, 6], [2, 4]]);
        assert.deepEqual(findDuplicates(a, true), [[0, 1]]);
        assert.deepEqual(
            findDuplicates(a, false, cmp),  // 4 == '4'
            [[0, 1, 6], [2, 4], [5, 7]]
        );
        
        assert.deepEqual(findDuplicates([]), []);
        assert.deepEqual(findDuplicates([1, 2, 3, 4, 5, 6]), []);
        
        // check up to 3rd element therefore 4, 4, 4 are ignored
        assert.deepEqual(findDuplicates([1, 2, 3, 4, 4, 4], false, false, 3), []); 
        
        // check up to 3rd element but first 4 will have its' dupes' found
        assert.deepEqual(findDuplicates([4, 2, 3, 4, 4, 4], false, false, 3), [[0, 3, 4, 5]]);
        
    });
    
    QUnit.test("Amm.ObservableArray.arrayUnique", function(assert) {
        
        var OA = Amm.ObservableArray;
        var a = [1, 2, 3, 4, 5, '5', 6];
        var b = [1, 2, 3, 4, 5, 6, 1];
        var cmp = function(x, y) { return x != y };
   
        var oa;
        oa = new OA(a, {unique: true});
        assert.throws(function(){
            oa.setComparison(cmp);
        });
        
        oa = new OA(b);
        assert.throws(function(){
            oa.setUnique(true);
        });
        
        oa = new OA(a, {unique: true});
        assert.throws(function(){
            oa.push(2);
        });
        
        oa = new OA(a, {unique: true});
        assert.throws(function(){
            oa.unshift(2);
        });
        
        oa = new OA(a, {unique: true});
        assert.throws(function(){
            oa.splice(1, 0, 2);
        });
        
        oa = new OA(a, {unique: true});
        oa.setItems([1, 2, 3]);
        
        oa = new OA(a, {unique: true});
        oa.splice(0, 3, 2, 1);
        
    });
    
    
})();