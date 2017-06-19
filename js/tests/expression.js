/* global Amm */

(function() { 
    QUnit.module("Expression");
    
    QUnit.test("Operator.Var", function(assert) {
        
        var op = new Amm.Operator.Var('foo');
        
        var exp_val;
        
        var exp = new Amm.Expression({
            vars: {
                foo: 'bar',
                var2: 'val2'
            },
            operator: op
        });
        
        exp.subscribe('valueChange', function(value) { exp_val = value; });
        
        assert.equal(op.evaluate(), 'bar', 'Variable is returned from an expression');
        var fn = exp.toFunction();
        assert.equal(fn(), 'bar', 'function form works too');
        
        exp.setVars('baz', 'foo');
        assert.equal(exp_val, 'baz', 'After variable changed, expression value is changed');
        
        exp.setValue('New Foo Value');
        assert.equal(exp.getVars('foo'), 'New Foo Value', 'setValue() works');
        fn('Another Foo Value');
        assert.equal(exp.getVars('foo'), 'Another Foo Value', 'fn(value) works to assign');
        
    });
    
    QUnit.test("Operator.Property", function(assert) {

        var simplePath = function(root, path, fn, scope) {
            var segments = path.split('.');
            var top = root;
            for (var i = 0, l = segments.length; i < l; i++) {
                top = new Amm.Operator.Property(top, segments[i]);
            }
            var res = new Amm.Expression(top);
            if (fn) res.subscribe('valueChange', fn, scope);
            res._tag = path;
            return res;
        };

        var a = new Amm.Element();
        Amm.createProperty(a, 'child');
        
        var a1 = new Amm.Element();
        Amm.createProperty(a1, 'child');
        
        var a2 = new Amm.Element();
        Amm.createProperty(a2, 'child');
        
        var a11 = new Amm.Element();
        Amm.createProperty(a11, 'child');
        
        var a12 = new Amm.Element();
        Amm.createProperty(a12, 'child');
        
        var a21 = new Amm.Element();
        Amm.createProperty(a21, 'child');
        
        a.setChild(a1);
        a.child2 = a2; // don't have change event
        
        a1.setChild(a11);
        a1.child2 = a12;
        
        a2.setChild(a21);
        
        var a_child_value;
        var a_child_child_value;
        var a_child_child_child_value;
        var a_child2_child_value;
        var a_child2_child2_value;
        
        // a.child
        var a_child = simplePath(a, 'child', function(v) { a_child_value = v; });
        var fn_a_child = a_child.toFunction();
        
        // a.child.child
        var a_child_child = simplePath(a, 'child.child', function(v) { a_child_child_value = v; });
        var fn_a_child_child = a_child_child.toFunction();
        
        // a.child.child.child
        var a_child_child_child = simplePath(a, 'child.child.child', function(v) { a_child_child_child_value = v; });
        var fn_a_child_child_child = a_child_child_child.toFunction();
        
        var a_child_child_nx = simplePath(a, 'child.child.nx.ny');
        var fn_a_child_child_nx = a_child_child_nx.toFunction();
        
        var a_child2_child = simplePath(a, 'child2.child', function(v) { a_child2_child_value = v; });
        var fn_a_child2_child = a_child2_child.toFunction();
        
        var a_child2_child2 = simplePath(a, 'child2.child2', function(v) { a_child2_child2_value = v; });
        var fn_a_child2_child2 = a_child2_child2.toFunction();
        
        assert.ok(a_child.getValue() === a1, 'object.property works');
        assert.ok(a_child_child.getValue() === a11, 'object.property.property works');
        assert.ok(a_child_child_child.getValue() === undefined, 'object.property.property.property works');
        assert.ok(a_child_child_nx.getValue() === undefined, 'non-existent prop: undefined');
        assert.ok(a_child2_child.getValue() === a21, 'non-getter.getter works');
        assert.ok(a_child2_child2.getValue() === undefined, 'non-getter.non-getter works');
        
        assert.ok(fn_a_child() === a1, 'Function: object.property works');
        assert.ok(fn_a_child_child() === a11, 'Function: object.property.property works');
        assert.ok(fn_a_child_child_child() === undefined, 'Function: object.property.property.property works');
        assert.ok(fn_a_child_child_nx() === undefined, 'Function: non-existent prop: undefined');
        assert.ok(fn_a_child2_child() === a21, 'Function: non-getter.getter works');
        assert.ok(fn_a_child2_child2() === undefined, 'Function: non-getter.non-getter works');
                
        a11.setChild(a21);
        assert.ok(a_child_child_child_value === a21, 'change event works');
        
        
        a2.child2 = 'xx';
        Amm.getRoot().outInterval(); // to re-calc non-cacheable items
        assert.ok(a_child2_child2_value === 'xx', 'non-cacheable observer works (1)');
        a.child2 = a1;
        Amm.getRoot().outInterval(); // to re-calc non-cacheable items
        assert.ok(a_child2_child_value === a11, 'non-cacheable / cacheable observing chain works');
        assert.ok(a_child2_child2_value === a12, 'non-cacheable observer works (2)');
        
        
        Amm.cleanup(
            a_child,
            a_child_child,
            a_child_child_child,
            a_child2_child,
            a_child2_child2,
            a_child_child_nx
        );
        
        // Test with arrays
        
        var arr = new Amm.Array([0, 1, 2, 3, 4]);
        a.setChild(arr);

        var a_child_1_value;
        var a_child_1 = simplePath(a, 'child.1', function(v) { a_child_1_value = v; });
        var fn_a_child_1 = a_child_1.toFunction();
        
        var a_child_3_value;
        var a_child_3 = simplePath(a, 'child.3', function(v) { a_child_3_value = v; });
        var fn_a_child_3 = a_child_3.toFunction();
        
        assert.ok(a_child_1.getValue() === 1, 'array access works(1)');
        assert.ok(a_child_3.getValue() === 3, 'array access works(2)');
        
        assert.ok(fn_a_child_1() === 1, 'Function: array access works(1)');
        assert.ok(fn_a_child_3() === 3, 'Function: array access works(2)');
        
        arr.unshift('x');
        
        assert.ok(a_child_1_value === 0, 'splice observer works(1)');
        assert.ok(a_child_3_value === 2, 'splice observer works(2)');
        
        a_child_1_value = null;
        
        arr.splice(2, 1);
        
        assert.ok(a_child_1_value === null, 'splice observer works(3)');
        assert.ok(a_child_3_value === 3, 'splice observer works(4)');
        assert.ok(!a_child_1._hasNonCacheable, 'splice observer is cacheable');
        
        Amm.cleanup(a_child_1, a_child_3);
        
        // Test property change

        a._className = '';
        a.setClassName = function(className, part) {
            var setClassName;
            if (part === undefined) {
                setClassName = className;
            } else {
                var wide = ' ' + this._className + ' ';
                var hasClass = wide.indexOf(' ' + part + ' ') >= 0;
                if (hasClass && !className) {
                    setClassName = wide.replace(' ' + part + ' ', ' ').slice(1, -1);
                } else if (!hasClass && className) {
                    setClassName = this._className.length? this._className + ' ' + part : part; 
                }
            }
            var old = this._className;
            if (setClassName === old) return;
            this._className = setClassName;
            this._out('classNameChange', this._className, old);
            return true;
        };
        a.getClassName = function(part) {
            if (part === undefined) res = this._className;
            else res = (' ' + this._className + ' ').indexOf(' ' + part + ' ') >= 0;
            return res;
        };
        a.outClassNameChange = function(n, o) {
            this._out('classNameChange', n, o);
        };
        
        a.setChild(a1);
        a.child2 = a2;
        
        a_child = new Amm.Expression({
            vars: {
                'object': a1,
                'propName': 'child',
                'args': undefined
            },
            operator: new Amm.Operator.Property(
                new Amm.Operator.Var('object'), 
                new Amm.Operator.Var('propName'),
                new Amm.Operator.Var('args')
            )
        });
        
        fn_a_child = a_child.toFunction();
        
        a_child_value = null;
        
        a_child.subscribe('valueChange', function(v) { a_child_value = v; });
        
        a.setClassName('foo bar');
        
        assert.ok(a_child.getValue() === a11);
        assert.ok(a_child_value === a11);
        
        a_child.setValue(a21);
        assert.ok(a1.getChild() === a21, 'setValue() works');
        
        a_child.setVars(a, 'object');
        
        assert.ok(a_child_value === a1, 'Object changed -> change event raised');
        assert.ok(fn_a_child() === a1, 'Object changed -> function works');
                
        
        a_child.setVars('child2', 'propName');
        assert.ok(!a_child.getIsCacheable(), 
            'Property name changed -> non-observable property -> expression became non-cacheable');
        assert.ok(a_child_value === a2,
            'Property name changed -> change event raised');
        assert.ok(fn_a_child() === a2, 'Property name changed -> function works');
        
        a_child.setVars('className', 'propName');
        assert.ok(a_child.getIsCacheable(),
            'Property name changed -> observable property -> expression became cacheable');
            
        assert.ok(a_child_value === 'foo bar', 'Property name changed - change event raised (2)');
        assert.ok(fn_a_child() === 'foo bar', 'Property name changed -> function works (2)');
        
        a_child.setVars('foo', 'args');
        
        assert.ok(a_child_value === true, 'Args changed - change event raised');
        assert.ok(fn_a_child() === true, 'Args changed - function works');
        
        a_child.setVars('xx', 'args');
        
        assert.ok(a_child_value === false, 'Args changed - change event raised (2)');
        assert.ok(fn_a_child() === false, 'Args changed - function works (2)');

        a_child.setVars(undefined, 'args');
        
        assert.ok(a_child_value === 'foo bar', 'Args changed - change event raised (3)');
        assert.ok(fn_a_child() === 'foo bar', 'Args changed - function works (3)');
        
        fn_a_child('aa');
        assert.equal(a.getClassName(), 'aa', 'fn(value) works');
        a_child.setValue('zz');
        assert.equal(a.getClassName(), 'zz', 'setValue() works');
        
        // let's test assignment
        
        a_child.setVars('xx', 'args');
        fn_a_child(true);
        assert.equal(a.getClassName(), 'zz xx', 'fn(value) works to assign with args');
        a_child.setValue(false);
        assert.equal(a.getClassName(), 'zz', 'setValue(value) works to assign with args');
         

        Amm.cleanup(a_child, a, a1, a2, a11, a12, a21);
    });
    
    QUnit.test("Operator.List", function(assert) {
        
        var fooOp = new Amm.Operator.Var('foo');
        var barOp = new Amm.Operator.Var('bar');
        var listOp = new Amm.Operator.List(['xx', fooOp, barOp, 'zz']);
        
        var exp_val;
        
        var exp = new Amm.Expression({
            vars: {
                foo: 'fooValue',
                bar: 'barValue'
            },
            operator: listOp
        });
        
        exp.subscribe('valueChange', function(v) { exp_val = v; });
        
        assert.deepEqual(exp.getValue(), ['xx', 'fooValue', 'barValue', 'zz'], 'List returns proper value');
        exp.setVars('fooValue2', 'foo');
        assert.deepEqual(exp_val, ['xx', 'fooValue2', 'barValue', 'zz'], 'List item change triggers expression change');
        
        window.listOp = listOp;
        
    });
    
}) ();

