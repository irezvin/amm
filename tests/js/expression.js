/* global Amm */
/* global QUnit */

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

        var res;

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
        
    });
    
    QUnit.test("Operator.ScopeElement", function(assert) {
        
        var parentComponent = new Amm.Element({id: 'parent', traits: ['Amm.Trait.Component']});
        
        var e01 = new Amm.Element({id: 'e1', component: parentComponent});
        var e02 = new Amm.Element({id: 'e2', component: parentComponent});
        var e03 = new Amm.Element({id: 'e3', component: parentComponent});
        
        var c1 = new Amm.Element({id: 'c1', traits: ['Amm.Trait.Component'], component: parentComponent});
        
        var e11 = new Amm.Element({id: 'e1', component: c1});
        
        var c2 = new Amm.Element({id: 'c2', traits: ['Amm.Trait.Component'], component: parentComponent});
        
        var e21 = new Amm.Element({id: 'e1', component: c2});
        var e22 = new Amm.Element({id: 'e2', component: c2});
        var e24 = new Amm.Element({id: 'e4', component: c2});
        
        var c21 = new Amm.Element({id: 'c21', traits: ['Amm.Trait.Component'], component: c2});
        
        var e211 = new Amm.Element({id: 'e211', component: c21});
        var e212 = new Amm.Element({id: 'e212', component: c21});
        var e212_2 = new Amm.Element({id: 'e212', component: c21});
        
        var xe1 = new Amm.Expression(new Amm.Operator.ScopeElement(e211, 'e1', 0, false));
        var xe1value = null;
        var xe1fn = xe1.toFunction();
        xe1.subscribe('valueChange', function(v) {xe1value = v;});
        
        var xe2 = new Amm.Expression(new Amm.Operator.ScopeElement(e211, 'e1', 1, false));
        var xe2value = null;
        var xe2fn = xe2.toFunction();
        xe2.subscribe('valueChange', function(v) {xe2value = v;});

        var xe3 = new Amm.Expression(new Amm.Operator.ScopeElement(e211, 'e1', '*', false));
        var xe3value = null;
        var xe3fn = xe3.toFunction();
        xe3.subscribe('valueChange', function(v) {xe3value = v;});
        
        var xe4 = new Amm.Expression(new Amm.Operator.ScopeElement(e21, 'e4', 0, false));
        var xe4value = null;
        xe4.subscribe('valueChange', function(v) {xe4value = v;});
        var xe4fn = xe4.toFunction();
        
        var xe41 = new Amm.Expression(new Amm.Operator.ScopeElement(e211, 'e4', 0, false));
        var xe41value = null;
        xe41.subscribe('valueChange', function(v) {xe41value = v;});
        var xe41fn = xe41.toFunction();
        
        var xe5 = new Amm.Expression(new Amm.Operator.ScopeElement(e211, 'e5', 0, false));
        var xe5value = null;
        xe5.subscribe('valueChange', function(v) {xe5value = v;});
        var xe5fn = xe5.toFunction();
        
        assert.ok(xe1.getValue() === e21);
        assert.ok(xe1fn() === e21);
        assert.ok(xe2.getValue() === e01);
        assert.ok(xe2fn() === e01);
        assert.ok(xe3.getValue()[0] === e21 && xe3.getValue()[1] === e01);
        assert.ok(xe3fn()[0] === e21 && xe3fn()[1] === e01);
        
        e01.setId('xx');
        assert.ok(xe1value === e21);
        assert.ok(xe2value === undefined);
        
        var oldxe3value = xe3.getValue();
        var newxe3value = xe3.getValue(true);
        assert.ok(oldxe3value === xe3value);
        
        
        assert.ok(xe3value[0] === e21 && xe3value.length === 1);
        
        assert.ok(xe4.getValue() === e24);
        assert.ok(xe4fn() === e24);
        assert.ok(xe41.getValue() === e24);
        assert.ok(xe41fn() === e24);
        assert.ok(xe5.getValue() === undefined);
        assert.ok(xe5fn() === undefined);

        e01.setId('e1');
        
        e24.setId('e5');
        assert.ok(xe4value === undefined);
        assert.ok(xe41value === undefined);
        assert.ok(xe5value === e24);
        assert.ok(xe5fn() === e24);
        
        e24.setComponent(c21);
        e24.setId('e4');
        assert.ok(xe4value === undefined);
        assert.ok(xe41value === e24);
        assert.ok(xe5value === undefined);
        
        e24.setComponent(c2);
        assert.ok(xe4value === e24);
        assert.ok(xe41value === e24);
        assert.ok(xe5value === undefined);
        
        var xec2 = new Amm.Expression(new Amm.Operator.ScopeElement(e211, 'c2', 0, true));
        var xec2value = 'zz';
        var xec2fn = xec2.toFunction();
        xec2.subscribe('valueChange', function(v) {xec2value = v;});
        assert.ok(xec2.getValue() === c2);
        assert.ok(xec2fn() === c2);
        c2.setIsComponent(false);
        assert.ok(xec2.getValue() === undefined);
        assert.ok(xec2fn() === undefined);
        assert.ok(xec2value === undefined);
        c2.setIsComponent(true);
        assert.ok(xec2.getValue() === c2);
        assert.ok(xec2value === c2);
        assert.ok(xec2fn() === c2);
    });
    
    QUnit.test("Operator.ComponentElement", function(assert) {
        
        var c = new Amm.Element({id: 'parent', traits: ['Amm.Trait.Component']});
        
        var e01 = new Amm.Element({id: 'e1', component: c});
        var e02 = new Amm.Element({id: 'e2', component: c});
        var e03 = new Amm.Element({id: 'e3', component: c});
        var e04 = new Amm.Element({
            id: 'e3', 
            component: c, 
            traits: ['Amm.Trait.Component'], 
            isComponent: false
        });
        
        var xe1 = new Amm.Expression(new Amm.Operator.ComponentElement(c, 'e1', 0, false));
        var xe1value = null;
        var xe1fn = xe1.toFunction();
        xe1.subscribe('valueChange', function(v) {xe1value = v;});
        
        assert.ok(xe1.getValue() === e01);
        assert.ok(xe1fn() === e01);
        
        e01.setComponent(null);
        assert.ok(xe1value === undefined);
        assert.ok(xe1fn() === undefined);
        
        e01.setComponent(c);
        assert.ok(xe1value === e01);
        assert.ok(xe1fn() === e01);
        
        var xe3 = new Amm.Expression(new Amm.Operator.ComponentElement(c, 'e3', '*', false));
        var xe3value = null;
        var xe3fn = xe3.toFunction();
        xe3.subscribe('valueChange', function(v) {xe3value = v;});
        
        assert.ok(xe3.getValue()[0] === e03 && xe3.getValue()[1] === e04);
        assert.ok(xe3fn()[0] === e03 && xe3fn()[1] === e04);
        
        var xe3_1 = new Amm.Expression(new Amm.Operator.ComponentElement(c, 'e3', 0, true));
        var xe3_1value = null;
        var xe3_1fn = xe3_1.toFunction();
        xe3_1.subscribe('valueChange', function(v) {xe3_1value = v;});
        assert.ok(xe3_1.getValue() === undefined);
        assert.ok(xe3_1fn() === undefined);
        e04.setIsComponent(true);
        assert.ok(xe3_1value === e04);
        assert.ok(xe3_1.getValue() === e04);
        assert.ok(xe3_1fn() === e04);
        e04.setIsComponent(false);
        assert.ok(xe3_1value === undefined);
        assert.ok(xe3_1.getValue() === undefined);
        assert.ok(xe3_1fn() === undefined);
        
    });

    QUnit.test("Expression valueChange event", function(assert) {
        
        var e = new Amm.Element();
        e.createProperty('foo', 10);
        e.createProperty('bar', 20);
        e.createProperty('prop', 'foo');
        var e2 = new Amm.Element();
        e2.createProperty('foo', 30);
        e2.createProperty('bar', 40);
        e2.createProperty('prop', 'foo');
        var exp = new Amm.Expression({
            vars: {
                el: e
            },
            src: "$el[$el.prop] + $el[$el.prop]" // el[el.prop] * num
        }, e);
        var num = 2;
        var changes = 0;
        var val;
        exp.subscribe('valueChange', function(v) { changes++; val = v; });
        assert.equal(exp.getValue(), e.getFoo() * num);
        changes = 0;
        e.setFoo(5);
        assert.equal(exp.getValue(), e.getFoo() * num, 'property value change - right result');
        assert.equal(changes, 1, 'property value change - valueChange triggered once');
        assert.equal(val, e.getFoo() * num, 'property value change - valueChange triggered with right argument');
        changes = 0;
        e.setProp('bar');
        assert.equal(exp.getValue(), e.getBar() * num, 'property name change - right result');
        assert.equal(changes, 1, 'property name change - valueChange triggered once');
        assert.equal(val, e.getBar() * num, 'property name change - valueChange triggered with right argument');
        changes = 0;
        exp.setVars(e2, 'el');
        assert.equal(exp.getValue(), e2.getFoo() * num, 'property owner, name and value change - right result');
        assert.equal(changes, 1, 'property owner, name and value change - valueChange triggered once');
        assert.equal(val, e2.getFoo() * num, 'property owner, name and value change - valueChange triggered with right argument');
    });
    
    QUnit.test("Expression.destinationChangeEvent", function(assert) {
        var e = new Amm.Element;
        e.createProperty('foo', 10);
        e.createProperty('bar', 20);
        e.createProperty('propName', 'foo');
        var e1 = new Amm.Element;
        e1.createProperty('moo', 30);
        e1.createProperty('propName', 'moo');
        var exp = new Amm.Expression({
            src: "$e[$e.propName]",
            vars: {
                e: e
            }
        });
        var c = 0;
        exp.subscribe("writeDestinationChanged", function() {
            c++;
        });
        assert.equal(exp.getValue(), 10);
        assert.equal(c, 0);
        e.setPropName('bar');
        assert.equal(exp.getValue(), 20);
        assert.equal(c, 1);
        d.exp = exp;
        exp.setVars(e1, 'e');
        assert.equal(exp.getValue(), 30);
        assert.equal(c, 2);
    });
    
    QUnit.test("Expression.writeProperty", function(assert) {
        
        var a = new Amm.Element();
        a.createProperty('prop', 5);
        a.createProperty('prop2', 0);
        var b = new Amm.Element();
        b.createProperty('prop', 0);
        var exp = new Amm.Expression('this.prop + 10', a, 'prop2');
        assert.equal(a.getProp2(), 15);
        a.setProp(10);
        assert.equal(a.getProp2(), 20);
        var writeExp = new Amm.Expression('this.prop', b);
        var exp2 = new Amm.Expression('this.prop + 10', a, writeExp);
        assert.equal(b.getProp(), 20);
        a.setProp(15);
        assert.equal(b.getProp(), 25);
        
    });
    
    QUnit.test("Expression.Operator.contentChanged", function(assert) {
        var arr = ['a', 'b', 'c'];
        var exp = new Amm.Expression({
            src: "$arr.join(', ')",
            vars: {
                arr: arr
            }
        });
        assert.equal(exp.getValue(), 'a, b, c', "Initial array value");
        assert.equal(!!exp.getIsCacheable(), false, 'Expression that observes native Array is non cacheable');
        var expV = null;
        exp.subscribe('valueChange', function(v) {expV = v;});
        arr.push('z');
        Amm.getRoot().outInterval();
        assert.equal(expV, 'a, b, c, z', "Change in native Array detected (first time)");
        arr.push('x');
        Amm.getRoot().outInterval();
        assert.equal(expV, 'a, b, c, z, x', "Change in native Array detected (second time)");
        exp.cleanup();
        
        var arr2 = new Amm.Array(['a', 'b', 'c']);
        var exp2 = new Amm.Expression({
            src: "$arr2.getItems()!!.join(', ')",
            vars: {
                arr2: arr2
            }
        });
        assert.equal(exp2.getValue(), 'a, b, c', 'Initial Amm.Array value');
        var expV2 = null;
        exp2.subscribe('valueChange', function(v) {expV2 = v;});
        assert.equal(exp2.getIsCacheable(), true, 'Expression that observes Amm.Array is cacheable');
        arr2.push('z');
        assert.equal(expV2, 'a, b, c, z', 'Change in Amm.Array detected (first time)');
        arr2.push('x');
        assert.equal(expV2, 'a, b, c, z, x', 'Change in Amm.Array detected (second time)');
        exp2.cleanup();
        arr2.cleanup();
        
        var arr3 = new Amm.Array(['a', 'b', 'c']);
        var exp3 = new Amm.Expression({operator: arr3});
        var expV3 = null;
        exp3.subscribe('valueChange', function(v, o, c) {expV3 = v;});
        arr3.push('x');
        
    });
    
    QUnit.test("Expression.expressionThis changeable", function(assert) {
        var foo = new Amm.Element({
            prop__a: 10,
            prop__b: 20
        });
        var bar = new Amm.Element({
            prop__a: 1,
            prop__b: 2
        });
        var changeCount = 0, val;
        var exp = new Amm.Expression("this.a + this.b");
        assert.ok(isNaN(exp.getValue()));
        exp.subscribe('valueChange', function(v) { changeCount++; val = v; } );
        exp.setExpressionThis(foo);
        assert.equal(changeCount, 1);
        assert.equal(val, 30);
        exp.setExpressionThis(bar);
        assert.equal(changeCount, 2);
        assert.equal(val, 3);
        
    });
    
    QUnit.test("Operator.varsProvider", function(assert) {
        // we need to create dummy varsProvider class 
        // that will return something
        
        var vp1, vp2;
        var xp = new Amm.Expression({
            vars: {
                a: 'a',
                b: 'b',
                c: 'c',
                d: 'd'
            },
            operator: new Amm.Operator.List([
                new Amm.Operator.Var('a'),
                new Amm.Operator.Var('b'),
                new Amm.Operator.Var('c'),
                new Amm.Operator.Var('d'),
                vp1 = new Amm.Operator.VarsProvider(
                    new Amm.Operator.List([
                        new Amm.Operator.Var('a'),
                        new Amm.Operator.Var('b'),
                        new Amm.Operator.Var('c'),
                        new Amm.Operator.Var('d'),
                        new Amm.Operator.Var('e'),
                        vp2 = new Amm.Operator.VarsProvider(
                            new Amm.Operator.List([
                                new Amm.Operator.Var('a'),
                                new Amm.Operator.Var('b'),
                                new Amm.Operator.Var('c'),
                                new Amm.Operator.Var('d'),
                                new Amm.Operator.Var('e'),
                                new Amm.Operator.Var('f')
                            ]),
                            {
                                b: 'b2',
                                e: 'e2',
                                f: 'f2'
                            }
                        )
                    ]),
                    {
                        a: 'a1',
                        e: 'e1'
                    }
                )
            ])
        });
        
        var vxp, numC = 0;
        
        xp.subscribe("valueChange", function(v) { vxp = v; numC++; });
        
        assert.deepEqual(xp.getValue(), [
            'a', 'b', 'c', 'd', [
                'a1', 'b', 'c', 'd', 'e1', 
                [ 'a1', 'b2', 'c', 'd', 'e2', 'f2' ]
            ]
        ]);
        
        numC = 0;
        
        xp.setVars('a0', 'a');
        
        assert.equal(numC, 1);
        assert.deepEqual(vxp, [
            'a0', 'b', 'c', 'd', [
                'a1', 'b', 'c', 'd', 'e1', 
                [ 'a1', 'b2', 'c', 'd', 'e2', 'f2' ]
            ]
        ]);

        xp.setVars({a: 'a', b: 'b0', c: 'c', d: 'd0'});
        assert.equal(numC, 2, 'change of variable that was referenced '
                + 'in several places of Expression triggered only one '
                + 'outside valueChange event');
        assert.deepEqual(vxp, [
            'a', 'b0', 'c', 'd0', [
                'a1', 'b0', 'c', 'd0', 'e1', 
                [ 'a1', 'b2', 'c', 'd0', 'e2', 'f2' ]
            ]
        ]);
        
        vp1.setVars('a11', 'a');
        
        assert.equal(numC, 3);
        assert.deepEqual(vxp, [
            'a', 'b0', 'c', 'd0', [
                'a11', 'b0', 'c', 'd0', 'e1', 
                [ 'a11', 'b2', 'c', 'd0', 'e2', 'f2' ]
            ]
        ]);
        
        vp1.setVars({a: 'a1', e: 'e11'});
        
        assert.equal(numC, 4);
        assert.deepEqual(vxp, [
            'a', 'b0', 'c', 'd0', [
                'a1', 'b0', 'c', 'd0', 'e11', 
                [ 'a1', 'b2', 'c', 'd0', 'e2', 'f2' ]
            ]
        ]);
        
        vp2.setVars('a21', 'a');
        
        assert.equal(numC, 5);
        assert.deepEqual(vxp, [
            'a', 'b0', 'c', 'd0', [
                'a1', 'b0', 'c', 'd0', 'e11', 
                [ 'a21', 'b2', 'c', 'd0', 'e2', 'f2' ]
            ]
        ]);
        
        vp2.setVars({});
        
        assert.equal(numC, 6);
        assert.deepEqual(vxp, [
            'a', 'b0', 'c', 'd0', [
                'a1', 'b0', 'c', 'd0', 'e11', 
                [ 'a1', 'b0', 'c', 'd0', 'e11', undefined ]
            ]
        ]);
        
        Amm.cleanup(xp);
        
    });
    
    QUnit.test("Expression.Sync", function(assert) {
       
        var a = new Amm.Element({
            prop__src: null,
            prop__val: 'oldVal', 
            prop__err: null,
            prop__boolVal: true,
            prop__strVal: undefined,
            sync__strVal: {
                src: 'this.boolVal',
                translator: {
                    class: 'Amm.Translator.Bool',
                    trueValue: 'TRUE',
                    falseValue: 'FALSE',
                    reverseMode: true,
                }
            }
        });
        
        assert.equal(a.getStrVal(), 'TRUE', 'Translator was instantiated and works forward');
        
        a.setStrVal('FALSE');
        
        assert.equal(a.getBoolVal(), false, 'Translator was instantiated and works backwards');
        
        var b = new Amm.Element({
            prop__x: 'bVal'
        });
        
        var c = new Amm.Element({
            prop__x: undefined
        });
        
        window.d.a = a;
        window.d.b = b;
        window.d.c = c;
        
        var sync = new Amm.Expression.Sync('this.src.x', a, 'val');
        
        window.d.sync = sync;
        
        a.setSrc(b);
            assert.equal(a.getVal(), 'bVal',
                'writeProperty was set from provider expression');
        
        a.setVal('newVal');
            assert.equal(b.getX(), 'newVal', 
                'writeProperty change -> provider expression target changed');
        
        a.setSrc(c);
            assert.equal(a.getVal(), 'newVal', 
                'expression change -> not updated from "undefined" result');
            
            assert.equal(c.getX(), 'newVal', 
                'expression change -> "undefined" expression rValue replaced');
                
        Amm.cleanup(a, b, c, sync);
        
        var t = new Amm.Translator({
            
            inDecorator: function(v) {
                var n = parseInt(v);
                if (isNaN(v)) throw "value must be a number";
                return n;
            },
            
            outDecorator: function(v) {
                return ' ' + v + ' ';
            }
            
        });
        
        var d = new Amm.Element({
            prop__val: 10,
            prop__e: null,
            sync__val: {
                src: 'this.e.val',
                translator: t,
                errProperty: 'err'
            },
            prop__err: null
        });
        
        var e = new Amm.Element({
            prop__val: undefined
        });
        
        d.setE(e);
        
            assert.equal(e.getVal(), ' 10 ',  
                'sync__ expression: overwrite and decorate undefined dest value');
        
        d.setVal(20);
            
            assert.equal(e.getVal(), ' 20 ',
                'sync__ expression: writeProperty value changed => dest updated');
        
        e.setVal(' 4 ');
        
            assert.equal(d.getVal(), 4, 
                'sync__ expression: dest => writeProperty');
                
            assert.equal(typeof d.getVal(), 'number',
                'value was properly translated');
        
        e.setVal('Foobar');
            
            assert.equal(d.getVal(), 4, 
                'sync__ expression: invalid dest => writeProperty unchanged');
                
            assert.equal(d.getErr(), 'value must be a number', 
                'Translation error was saved into errorProperty');
                
        e.setVal('5');
                
            assert.equal(d.getVal(), 5, 
                'sync__ expression: valid dest => writeProperty changed');
                
            assert.equal(d.getErr(), null, 
                'errorProperty nulled after success');
                
        
    });
    
    QUnit.test("Expression.Sync with updateLevel > 0", function(assert) {
       
        var a = new Amm.Element({
            prop__src: null,
            prop__val: 'old', 
            prop__err: null
        });
        
        var b = new Amm.Element({
            prop__x: 'new'
        });
        
        var sync = new Amm.Expression.Sync('this.src.x', a, 'val');
        
        sync._beginUpdate();
        
        a.setSrc(b);
        
        sync._endUpdate();
        
        assert.equal(a.getVal(), 'new',
            'writeProperty was set from provider expression');
    });
    
    QUnit.test("Expression.writeToExpressionThis", function(assert) {
       
        var a = new Amm.Element({
            prop__val: 10,
            prop__val2: null,
            prop__id: 'a'
        });
        
        var b = new Amm.Element({
            prop__val: 11,
            prop__val2: null,
            prop__id: 'b'
        });
        
        var c = new Amm.Element({
            prop__val: 12,
            prop__val2: null,
            prop__id: 'c'
        });
        
        var d = new Amm.Element({
            prop__val: 13,
            prop__val2: null,
            prop__id: 'd'
        });
        
        var e = new Amm.Expression({
            src: 'this.val + 1',
            dest: 'this.val2'
        });
        
        assert.deepEqual(Amm.getClass(e.getWriteObject()), 'Amm.Expression',
            'non-word writeProperty (setDest) is parsed as Amm.Expression');
            
        assert.ok(e.getDest() === e.getWriteObject(), 
            'getDest() returns created Amm.Expression');
            
        assert.equal(e.getWriteToExpressionThis(), Amm.Expression.THIS_WRITE_AUTO,
            'initial value of `writeToExpressionThis` is THIS_WRITE_AUTO');
            
        e.setExpressionThis(a);

        assert.equal(e.getWriteToExpressionThis(), Amm.Expression.THIS_WRITE_ALWAYS,
            'after propagation `writeToExpressionThis` THIS_WRITE_AUTO changed to THIS_WRITE_ALWAYS');
        
        assert.ok(e.getWriteObject().getExpressionThis() === e.getExpressionThis(),
            'expressionThis was propagated with Amm.Expression.THIS_WRITE_AUTO');
            
        assert.deepEqual(a.getVal2(), a.getVal() + 1, 'Value updated');
        
        e.setExpressionThis(b);
        
        assert.ok(e.getWriteObject().getExpressionThis() === e.getExpressionThis(),
            'THIS_WRITE_ALWAYS works');
            
        assert.deepEqual(b.getVal2(), b.getVal() + 1, 'Value updated');
        
        var e2 = new Amm.Expression({
            src: 'this.val + 1',
            writeToExpressionThis: Amm.Expression.THIS_WRITE_AUTO,
            expressionThis: c,
            writeProperty: new Amm.Expression ({
                src: 'this.val2',
                expressionThis: d
            })
        });
        
        assert.ok(e2.getExpressionThis() !== e2.getWriteObject().getExpressionThis(), 
            'THIS_WRITE_AUTO doesn\'t update expressionThis which was set before'
        );

        e2.setWriteToExpressionThis(Amm.Expression.THIS_WRITE_ONCE);
        
        assert.ok(e2.getExpressionThis() === e2.getWriteObject().getExpressionThis(), 
            'THIS_WRITE_ONCE did work'
        );
        
        assert.equal(e2.getWriteToExpressionThis(), Amm.Expression.THIS_WRITE_NEVER,
            'after first update THIS_WRITE_ONCE became THIS_WRITE_NEVER');
            
        e2.setExpressionThis(a);
        
        assert.ok(e2.getExpressionThis() !== e2.getWriteObject().getExpressionThis(), 
            'THIS_WRITE_NEVER works'
        );

        var e3 = new Amm.Expression({
            expressionThis: d,
            src: 'this.val',
            dest: 'val2'
        });
        
        assert.deepEqual(e3.getDest(), 'val2', 'setDest() for word-string property sets property name, getDest() returns string');
        assert.deepEqual(d.getVal2(), d.getVal(), 'src/dest: property values were sync\'d');

        Amm.cleanup(a, b, c, d, e, e2);
        
    });
    
    QUnit.test("Expression.sub/unsub on cacheability change", function(assert) {
        
        var cacheableObject = new Amm.Element({
            prop__val: 'cacheable'
        });
        
        var nonCacheableObject = {
            val: 'nonCacheable'
        };
        
        var expr = new Amm.Expression({
            src: '$obj.val'
        });
        
            assert.equal(expr.getHasNonCacheable(), false, "Empty object reference: expression is cacheable");

            assert.equal(Amm.getRoot().getSubscribers('interval', undefined, expr).length, 0, "...expression isn't subscribed");

        
        expr.setVars(nonCacheableObject, 'obj');
        
            assert.equal(expr.getHasNonCacheable(), true, "Plain object reference: expression isn't cacheable");

            assert.equal(Amm.getRoot().getSubscribers('interval', undefined, expr).length, 1, "...expression is subscribed");
        
        
        expr.setVars(cacheableObject, 'obj');
        
            assert.equal(expr.getHasNonCacheable(), false, "Element reference: expression is cacheable (again)");

            assert.equal(Amm.getRoot().getSubscribers('interval', undefined, expr).length, 0, "...expression is unsubscribed (again)");

        
        expr.setVars(nonCacheableObject, 'obj');
        
            assert.equal(expr.getHasNonCacheable(), 1, "Plain object reference: expression isn't cacheable");

            assert.equal(Amm.getRoot().getSubscribers('interval', undefined, expr).length, 1, "...expression is subscribed");
        
        Amm.cleanup(expr);
        
    });
    
    QUnit.test("Operator New", function(assert) {
        
        var e, el, res;
        
        e = new Amm.Expression('new "RegExp"');
        
            assert.ok(e.getValue() instanceof RegExp, 'basic New operator works');
        
        e.cleanup();
        
        e = new Amm.Expression({
            src: 'new $class ($arg)',
            vars: {
                'class': window.RegExp,
                'arg': '2020-01-11'
            },
            on__valueChange: function(v) { res = v; }
        });
        
            assert.ok(res instanceof RegExp, 'Proper constructor was used');
            assert.deepEqual(res + '', '/2020-01-11/', 'Constructor received proper argument');

        e.setVars('2016-12-20', 'arg');
        
            assert.deepEqual(res + '', '/2016-12-20/', 'Change to arg: new instance was created');
        

        e.setVars(window.Date, 'class');
        
            assert.ok(res instanceof Date, 'Change to class: new instance was created');
            assert.deepEqual(res + '', (new Date('2016-12-20') + ''), 'Change to class: constructor received proper argument');
            
        e.cleanup();
            
        var strConstructor = function(arg) { return arg || 'RegExp'; };
            
        el = new Amm.Element({
            prop__cls: { defaultValue: window.RegExp },
            getCon: function(arg) { return arg || 'RegExp'; }
        });
        
        res = null;
        
        e = new Amm.Expression({
            src: 'new this.cls("2011-04-27")',
            expressionThis: el,
            on__valueChange: function(v) { res = v; }
        });
        
            assert.ok(res instanceof RegExp, 'Proper instance was created');
            assert.deepEqual(res + '', '/2011-04-27/', 'Instance received proper params');
            
        el.setCls('Date');
        
            assert.ok(res instanceof Date, 'property changed => new instance');
            assert.deepEqual(res + '', (new Date('2011-04-27')) + '', 'new instance has proper args');
            
        e.cleanup();
                
        res = null;
        
        e = new Amm.Expression({
            src: 'new (this.getCon($cl)) ($arg)',
            expressionThis: el,
            vars: {
                cl: 'Date',
                arg: '1981-12-23'
            },
            on__valueChange: function(v) { res = v; }
        });
        
            assert.ok(res instanceof Date, 'Proper instance was created');
            assert.equal(res + '', new Date('1981-12-23') + '', 'Proper arg was passed');
            
        e.setVars('RegExp', 'cl');
        
            assert.ok(res instanceof RegExp, 'Class => diff instance was created');
            assert.equal(res + '', new RegExp('1981-12-23') + '', 'Class change => same arg');
            
        e.setVars('1982-04-11', 'arg');
            
            assert.equal(res + '', new RegExp('1982-04-11'), 'Arg change => new instance');
            
        e.cleanup();
        el.cleanup();
            
        var cleanup1 = 0;
        var cleanup2 = 0;
            
        var proto1 = { prop__p: 1, on__cleanup: function() { cleanup1++; } };
        var proto2 = { prop__q: 2, on__cleanup: function() { cleanup2++; } };
        
        res = null;
        
        e = new Amm.Expression({
            src: 'new "Amm.Element"($proto)',
            vars: { proto: proto1 },
            on__valueChange: function(v) { res = v; }
        });
        
            assert.ok (res instanceof Amm.Element, 'Element created');
            assert.equal (res.getP(), 1, 'Element had proper prototype');
        
        e.setVars(proto2, 'proto');
            
            assert.ok (res instanceof Amm.Element, 'Second element created');
            assert.equal (res.getQ(), 2, 'Second element had proper prototype');
            assert.equal (cleanup1, 1, 'First element cleanup');
        
        e.setVars(proto1, 'proto');
            
            assert.equal (cleanup2, 1, 'Second element cleanup');
            
        Amm.cleanup(res, e);
        
        el.setCls('Amm.Element');
        
        res = null;
        cleanup1 = 0;
        cleanup2 = 0;
        
        e = new Amm.Expression({
            src: 'new this.cls($proto)',
            vars: { proto: proto1 },
            expressionThis: el,
            on__valueChange: function(v) { res = v; }
        });
        
            d.e = e;
        
            assert.ok (res instanceof Amm.Element, 'Element created');
            assert.equal (res.getP(), 1, 'Element had proper prototype');
        
        e.setVars(proto2, 'proto');
            
            assert.ok (res instanceof Amm.Element, 'Second element created');
            assert.equal (res.getQ(), 2, 'Second element had proper prototype');
            assert.equal (cleanup1, 1, 'First element cleanup');
        
        e.setVars(proto1, 'proto');
            
            assert.equal (cleanup2, 1, 'Second element cleanup');
            
        Amm.cleanup(res, e, el);
        
        
    });
    
    QUnit.test("typeof, instanceof", function(assert) {
       
        
        var e;
        
        e = new Amm.Expression("typeof 10");
            
            assert.equal(e.getValue(), "number", "typeof constant works");
        
        e = new Amm.Expression("typeof $v");
            
            assert.equal(e.getValue(), "undefined", "typeof undefined var");
            
        e.setVars({}, "v");
            
            assert.equal(e.getValue(), "object", "typeof object var");
        
        e = new Amm.Expression("(new 'Date') instanceof $v");
        
            assert.equal(e.getValue(), false, "foo instanceof undefined === false");
        
        e.setVars(window.Date, 'v');
        
            assert.equal(e.getValue(), true, "foo instanceof <func>");
            
        e.setVars(window.RegExp, 'v');
        
            assert.equal(e.getValue(), false, "foo instanceof <func> (2)");
            
        e.setVars("Date", 'v');
        
            assert.equal(e.getValue(), true, "foo instanceof <string with existing class name> (find func)");
            
        e.setVars("non-existent", 'v');
        
            assert.equal(e.getValue(), false, "foo instanceof <string with non-existent class name> (find func)");
            
    });
    
    
}) ();

