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
    assert.throws(function() {
        a.destroyItem(item);
    }, "destroy not registered item");
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
    assert.notOk(Amm.is(c, 'nonExistentClass'));
    assert.throws(function() {
        Amm.is(c, 'nonExistentClass', true); // throwIfNot := true
    });
    
    c1 = new ClassC;
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
    var decF = function(val) { return '*' + val + '*'; }
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
    assert.throws(function() { Amm.decorate('A', 'wtf') });
});

