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
