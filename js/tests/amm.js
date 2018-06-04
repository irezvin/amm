/* global Amm */

QUnit.module("Amm Global Object");
QUnit.test("Amm get/set/destroy Item", function(assert) {
   
    var a = Amm;
    var item = {
        cleanupCalled: false,
        cleanup: function() {
            this.cleanupCalled = true;
        }
    };
    var itemNoCleanup = {
        
    };
    
    assert.ok(a.registerItem(item));
    assert.ok(a.registerItem(itemNoCleanup));
    
    assert.ok(a.registerItem(item) === undefined); // second call returns undefined
    assert.ok(item._amm_id !== undefined);
    assert.ok(a.getItem(item._amm_id) === item);
    assert.deepEqual(a.getItem([item._amm_id, itemNoCleanup._amm_id], true), [
        item, itemNoCleanup
    ]);
    assert.deepEqual(a.getItem([item._amm_id, '', itemNoCleanup._amm_id], true), [
        item, itemNoCleanup
    ], "Amm.getItem(Array) ignores empty identifiers");
    assert.throws(function() {
        a.getItem("nonExistent", true);
    }, "Amm.getItem /w throwIfNotFound");
    assert.ok(a.getItem("nonExistent") === undefined);
    a.destroyItem(item);
    assert.equal(item.cleanupCalled, true);
    var id = item._amm_id;
    a.destroyItem(itemNoCleanup);
    assert.equal(a.getItem(id), undefined);
});

QUnit.test("Amm object inheritance support", function(assert) {
    var ClassA = function() {};
    
    // b(a); c(b, d)
    
    ClassA.prototype = {
        ClassA: '__CLASS__',
        foo: null, 
        bar: function() {this.foo = 'a';},
        getFoo: function() { return this.foo; }
    };
    var ClassB = function() {};
    ClassB.prototype = {
        ClassB: '__CLASS__',
        bar: function() {this.foo = 'b';}
    };
    var ClassD = function() {};
    ClassD.prototype = {
        ClassD: '__CLASS__',
        dMethod: function() {}
    };
    var ClassC = function() {};
    ClassC.prototype = {
        ClassC: '__CLASS__',
        cMethod: function() {}
    };
    
    var traitX = function() {};
    traitX.prototype = {
         traitX: '__INTERFACE__'
    };
    
    var traitXbogus = function() {};
    traitXbogus.prototype = {
         traitX: '__INTERFACE__'
    };
    
    var traitY = function() {};
    traitY.prototype = {
         traitY: '__INTERFACE__'
    };
    
    Amm.extend(ClassB, ClassA);
    Amm.extend(ClassC, ClassB);
    Amm.extend(ClassC, ClassD);
    
    var a = new ClassA, b = new ClassB, c = new ClassC, d = new ClassD;
    assert.equal(Amm.getClass(a), 'ClassA');
    assert.equal(Amm.getClass(b), 'ClassB');
    assert.equal(Amm.getClass(c), 'ClassC');
    assert.ok(Amm.is(c, 'ClassA'));
    assert.ok(Amm.is(c, 'ClassC'));
    assert.ok(Amm.is(c, 'ClassB'));
    assert.ok(Amm.is(c, 'ClassD'));
    assert.ok(Amm.is(c, ClassD));
    var zz = function() {};
    var z = new zz;
    assert.ok(Amm.is(z, zz));
    assert.notOk(Amm.is(c, 'nonExistentClass'));
    assert.throws(function() {
        Amm.is(c, 'nonExistentClass', true); // throwIfNot := true
    });
    
    var c1 = new ClassC;
    Amm.augment(c1, new traitX);
    Amm.augment(c1, new traitY);
    assert.ok(Amm.hasInterfaces(c1, 'traitX'));
    assert.ok(Amm.hasInterfaces(c1, 'traitY'));
    assert.ok(Amm.hasInterfaces(c1, ['traitX', 'traitY']));
    assert.notOk(Amm.hasInterfaces(c1, ['traitX', 'traitY', 'traitZ']));
    assert.throws(function() {
        Amm.augment(c1, new traitXbogus()); // already implements interface X
    });
    assert.throws(function() {
        Amm.hasInterface(c1, 'nonExistentTrait', true); // throwIfNot := true
    });
    assert.deepEqual(Amm.getInterfaces(c1), ['traitX', 'traitY']);
    assert.deepEqual(Amm.getInterfaces(c), []);
    
    assert.ok(Amm.meetsRequirements(c, [['ClassA', 'ClassB', 'ClassC', ClassC]]));
    assert.ok(Amm.meetsRequirements(c, ClassC));
    assert.ok(Amm.meetsRequirements(c, ['foo', 'bar', 'ClassC']));
    assert.ok(Amm.meetsRequirements(c1, [['traitX', 'traitY', 'cMethod']]));
    assert.notOk(Amm.meetsRequirements(c, ['nx', 'ny', 'nz']));
    
});

QUnit.test("Amm init() and detect/get/set Property", function(assert) {
   
    var ClassX = function() {};
    ClassX.prototype = {
        
        _foo: null,

        _bar: null,
        
        _etc: 0,

        setFoo: function(foo) {
            var oldFoo = this._foo;
            if (oldFoo === foo) return;
            this._foo = foo;

            // dummy
            return true;
        },

        getFoo: function() { return this._foo; },

        outFooChange: function(foo, oldFoo) {
            // dummy
        },

        setBar: function(bar) {
            var oldBar = this._bar;
            if (oldBar === bar) return;
            this._bar = bar;
            return true;
        },

        getBaz: function() {
            return 'baz';
        }, 
        
        getEtc: function(arg) {
            return this._etc + (arg || 0);
        },
        
        setEtc: function(quux, arg) {
            this._etc = quux + (arg || 0);
        },
        
        quux: undefined,
        
        hasEvent: function(event) {
            return Amm.WithEvents.prototype.hasEvent.call(this, event);
        }
        
    };
    
    var x = new ClassX;
    Amm.init(x, {foo: 'fooValue', bar: 'barValue', quux: 'quuxValue'});
    assert.equal(x.getFoo(), 'fooValue');
    assert.equal(x._bar, 'barValue');
    assert.equal(x.quux, 'quuxValue');
    
    var x = new ClassX;
    assert.throws(function() {
        Amm.init(x, {baz: 'bazValue'}); // no setter - will throw
    });
    assert.throws(function() {
        Amm.init(x, {_bar: 'barValue'}); // private - will throw
    });
    
    var x = new ClassX, props = {foo: 'fooValue', bar: 'barValue'};
    Amm.init(x, props, ['foo']);
    assert.equal(x.getFoo(), 'fooValue');
    assert.equal(x._bar, undefined);
    assert.notOk('foo' in props); // is deleted
    Amm.init(x, props);
    assert.equal(x._bar, 'barValue');
    
    assert.ok(Amm.detectProperty(x, 'foo')); // has setter, getter and event
    assert.notOk(Amm.detectProperty(x, 'bar')); // no event, no getter
    assert.notOk(Amm.detectProperty(x, 'baz')); // no setter
    assert.notOk(Amm.detectProperty(x, 'quux')); // nothing
    assert.notOk(Amm.detectProperty(x, 'nonExistent')); // nothing

    var caps = {};
    Amm.detectProperty(x, 'foo', caps);
    assert.equal(caps.getterName, 'getFoo');
    assert.equal(caps.setterName, 'setFoo');
    assert.equal(caps.eventName, 'fooChange');
    
    Amm.detectProperty(x, 'bar', caps);
    assert.equal(caps.getterName, null);
    assert.equal(caps.setterName, 'setBar');
    assert.equal(caps.eventName, null);
    
    Amm.detectProperty(x, 'baz', caps);
    assert.equal(caps.getterName, 'getBaz');
    assert.equal(caps.setterName, null);
    assert.equal(caps.eventName, null);
    
    Amm.detectProperty(x, 'quux', caps);
    assert.equal(caps.getterName, null);
    assert.equal(caps.setterName, null);
    assert.equal(caps.eventName, null);
    
    Amm.detectProperty(x, 'nonExistent', caps);
    assert.equal(caps.getterName, null);
    assert.equal(caps.setterName, null);
    assert.equal(caps.eventName, null);
    
    assert.equal(Amm.getProperty(x, 'nonExistent'), undefined);
    assert.equal(Amm.getProperty(x, 'nonExistent', 'defVal'), 'defVal');
    assert.throws(function() { 
        Amm.setProperty(x, 'nonExistent', 'val', true);  // throwIfNotFound
    });
    
    x.setFoo('fooValue');
    assert.equal(Amm.getProperty(x, 'foo'), 'fooValue');
    Amm.setProperty(x, 'foo', 'fooValue2');
    assert.equal(x.getFoo(), 'fooValue2');
    
    Amm.setProperty(x, 'etc', 5, false, 10);
    assert.equal(x._etc, 15);
    assert.equal(Amm.getProperty(x, 'etc', undefined, 5), 20);
});

QUnit.test("Amm getFunction / registerNamespace / registerFunction", function(assert) {
    
    assert.ok(Amm.getFunction('Amm.Element') === Amm.Element);
    var ns = {
        Foo: function() {},
        Bar: {
            Baz: function() {}
        }
    };
    Amm.registerNamespace('TestNamespace', ns);
    assert.throws(function() {
        Amm.getFunction('TestNamespace.noSuchFn');
    });
    assert.throws(function() {
        Amm.getFunction('noSuchNs.noSuchFn');
    });
    assert.ok(Amm.getFunction('TestNamespace.Foo') === ns.Foo);
    assert.ok(Amm.getFunction('TestNamespace.Bar.Baz') === ns.Bar.Baz);
    Amm.registerFunction('xxx', ns.Foo);
    assert.ok(Amm.getFunction('xxx') === ns.Foo);
    
});

QUnit.test("Amm decorate", function(assert) {
    
    var decF = function(val) { return '*' + val + '*'; };
    var decO = {
        char: 'x',
        decorate: function(val) { return this.char + val + this.char; }
    };
    var decC = {
        char: 'y'
    };
    assert.equal(Amm.decorate('A', decF), '*A*');
    assert.equal(Amm.decorate('A', decO), 'xAx');
    assert.equal(Amm.decorate('A', decO.decorate, decC), 'yAy');
    assert.throws(function() { Amm.decorate('A', 'wtf'); });
    assert.ok(Amm.decorate(1, 'Amm.Translator.Bool') === true);
    
});

QUnit.test("Amm global events", function(assert) {
    var r = Amm.getRoot();
    var v;
    var f = function(value) {
        v = value;
    };
    assert.ok(Amm.is(r, "Amm.Root"), "Amm.getRoot() returns Amm.Root instance");
    assert.ok(r.subscribe('RandomEvent', f), 'Root allows to subscribe to random events...');
    r.raiseEvent('RandomEvent', 10);
    assert.ok(v === 10, 'Root\'s custom events can be successfully raised by raiseEvent() method');
});

QUnit.test("Amm.translate", function(assert) {
    
    assert.equal(Amm.translate("foo %foo bar %bar", "%foo", "foovalue", "%bar", "barvalue"), 
                 "foo foovalue bar barvalue");
    
    Amm.defineLangStrings({"test_lang_string": "xxx %yyy"});
    
        assert.equal(Amm.lang["test_lang_string", "xxx %yyy"]);
    
    Amm.defineLangStrings({"test_lang_string": "xxx %zzz"});
    
        assert.equal(Amm.lang["test_lang_string"], "xxx %yyy", "Lang string cannot be re-written without override param");
    
    Amm.defineLangStrings({"test_lang_string": "xxx %zzz"}, true);
    
        assert.equal(Amm.lang["test_lang_string"], "xxx %zzz", "Lang string can be re-written with override === TRUE");   
    
    assert.equal(Amm.translate("test_lang_string", "%zzz", "zzzvalue"), 
                 "xxx zzzvalue", "Lang string name can be passed as first param to Amm.translate");
    
    var xx = {};
    assert.ok(Amm.translate(xx) === xx, "Non-lang-string value translated remains the same");
    assert.ok(Amm.translate(null) === null, "Non-lang-string value translated remains the same");
    assert.ok(Amm.translate(undefined) === undefined, "Non-lang-string value translated remains the same");
    
});

QUnit.test("Amm.constructInstance", function(assert) {
    var t = { class: 'Amm.Decorator' };
    var t2 = { class: 'Amm.Decorator' };
    var i1 = Amm.constructInstance(t);
    var i2 = Amm.constructInstance(t);
    assert.deepEqual(t, t2, 'Options array wasn\'t changed during instantiation');
    assert.ok(i1['Amm.Decorator'], 'Instance created is of proper class');
    assert.ok(i2['Amm.Decorator'], 'Instance created with same prototype is of proper class');
    
    i1 = Amm.constructInstance('Amm.Decorator');
    assert.ok(i1['Amm.Decorator'], 'Instance created is of proper class (string class name provided)');
    i1 = Amm.constructInstance('Amm.Translator.Bool', 'Amm.Translator');
    i1 = Amm.constructInstance(false, 'Amm.Translator');
    assert.ok(i1['Amm.Translator'], 'Default class used');
    assert.throws(function() {
        Amm.constructInstance('Amm.Translator', 'Amm.Element');
    }, "Class check in Amm.constructInstance works");
    
    var i3 = new Amm.Decorator;
    assert.ok(Amm.constructInstance(i3, 'Amm.Decorator') === i3, 'Provided instance is used');
    assert.throws(function() {
        Amm.constructInstance(i3, 'Amm.Translator');
    }, "Class check in Amm.constructInstance works when instance is provided");
    var options = {'class': 'Amm.Translator.Bool', 'reverseMode': true};
    var oldOptions = {'class': 'Amm.Translator.Bool', 'reverseMode': true};
    var defaults = {'field': 'z', 'reverseMode': false};
    i1 = Amm.constructInstance(options, 'Amm.Translator', defaults);
    assert.ok(i1['Amm.Translator.Bool'], 'Proper instance class when defaults provided');
    assert.ok(i1['reverseMode'] === true, 'Options have priority over defaults');
    assert.ok(i1['field'] === 'z', 'Value from defaults was used');
    assert.throws(function() {
        Amm.constructInstance(1, 'Amm.Translator');
    }, "Wrong options -> throw exception");
    assert.throws(function() {
        Amm.constructInstance({});
    }, "Class not provided -> throw exception");
    assert.deepEqual(options, oldOptions, "options not modified");
    var def2 = {'field': 'yyy'};
    i1 = Amm.constructInstance(new Amm.Translator, null, def2, true);
    assert.ok(i1.field === def2.field, 'Value was set from defaults when instance is provided');
    i1 = Amm.constructInstance(null, 'Amm.Translator', null, false, ['translateIn']);
    assert.ok(i1, 'Instance meets requirements');
    
    assert.throws(function() {
        Amm.constructInstance(null, 'Amm.Translator', null, false, ['Amm.Element']);
    }, 'Instance doesn\'t meets requirements -> exception');
    
    i1 = Amm.constructInstance({}, Amm.Translator);
    assert.ok(i1['Amm.Translator'], 'Instantiation function can be used instead of class name');
    i2 = Amm.constructInstance({class: Amm.Translator.Bool}, Amm.Translator);
    assert.ok(i2['Amm.Translator.Bool'], 'Instantiation function can be used instead of options.class');
    i3 = Amm.constructInstance(i2, Amm.Translator);
    assert.ok(i3 === i2, 'Valid class check when function is used instead of class name');
    

});

QUnit.test("Amm.constructMany", function(assert) {
    
    // constructMany: function(options, baseClass, defaults, keyToProperty, setToDefaults, requirements) {
    var Obj = function(options) {
        Amm.Element.call(this, options);
    };
    Obj.prototype['Obj'] = '__CLASS__';
    Amm.createProperty(Obj.prototype, 'val', null);
    Amm.createProperty(Obj.prototype, 'val2', null);
    Amm.extend(Obj, Amm.Element);
    
    var g = function(arr) {
        return Amm.getProperty(arr, ['id', 'val', 'val2', 'class']);
    };
    
    var coll;
    var ob1 = new Obj({id: 'ob1', 'val': 1});
    coll = Amm.constructMany([ob1, Obj, {class: Obj, id: "ob3", val: 3}], Obj);
    
    assert.ok(coll[0], ob1, 'Direct instance remains unchanged');
    assert.deepEqual(g(coll), 
    [
        {id: 'ob1', 'val': 1, 'val2': null, class: 'Obj'},
        {id: null, 'val': null, 'val2': null, class: 'Obj'},
        {id: 'ob3', 'val': 3, 'val2': null, class: 'Obj'}
    ], 'Many items are properly created');
    
    var def = {val2: 'x'};
    var oDef = {val2: 'x'};
    
    coll = Amm.constructMany({
        'a': ob1,
        'b': Obj, 
        'c': {class: Obj, id: 'ob3'}
    }, Obj, {val2: 'x'}, 'id', false);
    
    assert.deepEqual(g(coll), 
    [
        {id: 'a', 'val': 1, 'val2': null, class: 'Obj'},
        {id: 'b', 'val': null, 'val2': 'x', class: 'Obj'},
        {id: 'ob3', 'val': null, 'val2': 'x', class: 'Obj'}
    ], 'Key-to-property works (unless already in options)');
    
    assert.deepEqual(def, oDef, 'defaults unchanged');
    
});