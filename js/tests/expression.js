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
    
    QUnit.test("Operator.ChildElement", function(assert) {
        
        var p = new Amm.Element({id: 'p', traits: ['Amm.Trait.Composite']});
        var a = new Amm.Element({id: 'a', parent: p});
        var b = new Amm.Element({id: 'b', parent: p, traits: ['Amm.Trait.Composite']});
        var bb = new Amm.Element({id: 'bb', parent: b, traits: ['Amm.Trait.Composite']});
        
        var v_a;
        var e_a = new Amm.Expression('this->>a', p);
        var f_a = e_a.toFunction();
        e_a.subscribe('valueChange', function(v) {v_a = v;});
        var v_b_cc;
        var e_b_cc = new Amm.Expression('this->>b->>cc', p);
        var f_b_cc = e_b_cc.toFunction();
        e_b_cc.subscribe('valueChange', function(v) {v_b_cc = v;});
        var v_cc;
        var e_cc = new Amm.Expression('this->>cc', p);
        var f_cc = e_cc.toFunction();
        e_cc.subscribe('valueChange', function(v) {v_cc = v;});
        
        assert.ok(e_a.getValue() === a);
        assert.ok(f_a() === a);
        assert.ok(e_b_cc.getValue() === undefined);
        assert.ok(f_b_cc() === undefined);
        assert.ok(e_cc.getValue() === undefined);
        assert.ok(f_cc() === undefined);
        bb.setId('cc');
        assert.ok(e_b_cc.getValue() === bb);
        assert.ok(v_b_cc === bb);
        assert.ok(f_b_cc() === bb);
        bb.setParent(p);
        assert.ok(e_b_cc.getValue() === undefined);
        assert.ok(v_b_cc === undefined);
        assert.ok(f_b_cc() === undefined);
        assert.ok(e_cc.getValue() === bb);
        assert.ok(v_cc === bb);
        assert.ok(f_cc() === bb);
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
        
    });
    
    QUnit.test("Expression.Sync", function(assert) {
       
        var a = new Amm.Element({
            prop__src: null,
            prop__val: 'aVal', 
            prop__err: null
        });
        
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
    
}) ();

