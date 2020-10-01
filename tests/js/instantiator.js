/* global Amm */
/* global QUnit */

(function() {

QUnit.module("Instantiator");

QUnit.test("instantiator.Abstract", function(assert) {
    
    assert.throws(function() {
        var i = new Amm.Instantiator();
    }, /attempt.*abstract.*class/i, 'Cannot instantiate Amm.Instantiator directly');
    
});


QUnit.test("instantiator.Proto", function(assert) {
    
    var a = new Amm.Element({ prop__b: null});
    
    var ins = new Amm.Instantiator.Proto({
        'class': "Amm.Element",
        prop__a: null
    }, "a", "b");
    
    var b = ins.construct(a);
    
    assert.ok(b && typeof b === 'object', "Amm.Instantiator.Proto.construct() returned object");
    assert.ok(b.getA() === a, "Link from created object to arg (assocProperty) works");
    assert.ok(a.getB() === b, "Link from arg to created object (revAssocProperty) works");
    
    var ins2 = new Amm.Instantiator.Proto("<input type='text' data-amm-e='' data-amm-v='v.Input' />");
    assert.ok(ins2.isElement, 'Instantiator.isElement was automatically set because builder source was provided');
    var e = ins2.construct();
    assert.ok(Amm.is(e, 'Amm.Element') && Amm.is(e, 'Editor'), 'Element was created with specified definition');
    Amm.cleanup(e);
    
    var ins3 = new Amm.Instantiator.Proto({
        proto: {
            'class': 'Amm.Element',
            prop__assoc: null,
            prop__extra: null
            
        },
        overrideProto: true,
        assocProperty: 'assoc'
    });
    
    var p1 = {'extraTraits': ['t.Input'], 'extra': 'zz'};
    var e1 = ins3.construct(p1);
    
    assert.ok(Amm.is(e1, 'Amm.Element'), 'class as defined in proto');
    assert.ok(Amm.is(e1, 'Editor'), 'trait as defined in override');
    assert.ok(e1.assoc === p1, 'assoc property assigned');
    assert.deepEqual(e1.extra, 'zz', 'extra property as in override');
    
    var p2 = 'xxx';
    var e2 = ins3.construct(p2);
    assert.ok(Amm.is(e2, 'Amm.Element'), 'class as defined in proto');
    assert.notOk(Amm.is(e2, 'Editor'), 'no extra traits');
    assert.equal(e2.assoc, 'xxx', 'assoc property assigned');
    
    
});

QUnit.test("Instantiator.Variants", function(assert) {

    var objects = {
        objectA: new Amm.Element({id: 'objectA', prop__ins: null}),
        objectB: new Amm.Element({id: 'objectB', prop__ins: null}),
        objectC: new Amm.Element({id: 'objectC', prop__ins: null})
    };
    
    var instances = {
    };
    
    var ins = new Amm.Instantiator.Variants({
        
        defaultPrototype: {
            'class': 'Amm.Element', 
            prop__proto: 'default',
            prop__orig: null,
            __assocProperty: 'orig',
            __revAssocProperty: 'ins'
        },
        
        prototypes: {
            a: {
                prop__proto: 'a'
            },
            
            b: {
                prop__proto: 'b'
            }
        },
        
        overrideDefaultPrototype: true
        
    });
    
    var rb = [];
    
    ins.subscribe('needRebuild', function(objects, matches) {
        rb.push([Amm.getProperty(objects, 'id'), matches]);
    });
    
    instances.instanceA = ins.construct(objects.objectA, 'a');
    assert.deepEqual(instances.instanceA.getProto(), 'a', 'Proto selected according to match');
    assert.ok(instances.instanceA.getOrig() === objects.objectA, '__assocProperty works');
    assert.ok(objects.objectA.getIns() === instances.instanceA, '__revAssocProperty works');
    
    instances.instanceB = ins.construct(objects.objectA, 'b');
    instances.instanceC = ins.construct(objects.objectA, 'c');
    
    assert.deepEqual(instances.instanceC.getProto(), 'default', 'Default proto selected');
    
    ins.setMatches([objects.objectA, objects.objectC], ['b', 'd']);
    
    assert.deepEqual(rb, [
        [['objectA'], ['b']]
    ], 'needRebuild triggered on setMatches()');
    
});

QUnit.test("Instantiator.Variants: filter and objects' observation", function(assert) {
    
    var objects = {
        objectA: new Amm.Element({id: 'objectA', prop__type: '1', prop__ins: null}),
        objectB: new Amm.Element({id: 'objectB', prop__type: '1', prop__ins: null}),
        objectC: new Amm.Element({id: 'objectC', prop__type: '2', prop__ins: null})
    };
    
    var instances = {
    };
    
    var ins = new Amm.Instantiator.Variants({
        
        defaultPrototype: {
            'class': 'Amm.Element',
            prop__proto: 'default',
            prop__orig: null,
            __assocProperty: 'orig',
            __revAssocProperty: 'ins'
        },
        
        prototypes: {
            type1: {
                prop__proto: 'type1'
            },
            
            type2: {
                prop__proto: 'type2'
            }
        },
        
        filter: {
            conditions: [
                {
                    _id: 'type1', type: 1
                },
                {
                    _id: 'type2', type: 2
                }
            ]
        },
        
        overrideDefaultPrototype: true
        
    });
    
    var rb = [];
    
    ins.subscribe('needRebuild', function(objects, matches) {
        rb.push([Amm.getProperty(objects, 'id'), matches]);
    });
    
        assert.deepEqual(Amm.getClass(ins.getFilter()), 'Amm.Filter',
            'Instantiator created and associated filter using provided prototype');
        
        assert.deepEqual(ins.getFilterIsAggregate(), true, 
            'getFilterIsAggregate() is true for filter that is created by instantiator');
    
    var instanceA1 = ins.construct(objects.objectA);
    var instanceA2 = ins.construct(objects.objectA);
    
        assert.deepEqual(instanceA1.getProto(), 'type1', 'Instance is created correctly');
        assert.deepEqual(instanceA2.getProto(), 'type1', 'Second instance is created correctly');
        assert.ok(ins.hasObject(objects.objectA), 'Object is registered in Instantiator');
        assert.notOk(ins.hasObject(objects.objectB), 'Second object is NOT registered in Instantiator (yet)');
        assert.ok(ins.hasInstance(instanceA1), 'Instance 1 is registered in Instantiator');
        assert.ok(ins.hasInstance(instanceA2), 'Instance 2 is registered in Instantiator');
        assert.ok(ins.getFilter().hasObservedObject(objects.objectA), 'Instance added observed object to the filter');
        
        var instanceB1 = ins.construct(objects.objectB);
        var instanceB2 = ins.construct(objects.objectB);
            assert.ok(ins.hasObject(objects.objectB), 'Second object is registered in Instantiator');
            
            
        assert.ok(
            ins.getInstances(objects.objectA)[0] == instanceA1 && 
            ins.getInstances(objects.objectA)[1] == instanceA2 &&
            ins.getInstances(objects.objectA).length == 2
            , 'getInstances() work properly');
        
    instanceA2.cleanup();
        assert.notOk(ins.hasInstance(instanceA2), 
            'Instance 2 is not registered in Instantiator anymore after instance.cleanup()');
        
    ins.destruct(instanceA1);
        assert.notOk(ins.hasInstance(instanceA1),
            'Instance 1 is not registered in Instantiator anymore after ins.destruct(instance)');
        assert.notOk(ins.hasObject(objects.objectA), 
            'Object that is no longer observed by Instantiator after both instances deleted');
        assert.notOk(ins.getFilter().hasObservedObject(objects.objectA), 
            'Object that is no longer observed by Instantiator is now removed from the filter');
        
    objects.objectB.setType(2);
        assert.deepEqual(rb, [[['objectB'], ['type2']]]);
        
    ins.setSubscribeFilter(false);
        assert.deepEqual(ins.getFilter().getObservedObjects(), [], 
            'setSubscribeFilter(false) => filter\'s objects unobserved');
        
    rb = [];
    objects.objectB.setType(1);
        assert.deepEqual(rb, [], 'Change of observed object after setSubscribeFilter(false) ' 
        + 'doesn\'t cause needRebuild event');
            
    ins.forgetInstance(instanceB1);
        assert.notOk(ins.hasInstance(instanceB1), 'forgetInstance() works');
    ins.forgetObject(objects.objectB);
        assert.notOk(ins.hasObject(objects.objectB), 'forgetObject() works');
        assert.notOk(ins.hasInstance(instanceB2), 'forgetObject() deletes reference to the instances');
        
    var instanceC1 = ins.construct(objects.objectC);
        assert.deepEqual(instanceC1.getProto(), 'type2', 'proper instance is created...');
        assert.deepEqual(ins.getFilter().getObservedObjects(), [], 'but filter still doesn\'t observe object '
            + 'when setSubscribeFilter(false)'
        );
        
    var filterCleanup = false;
    var oldCleanup = ins.getFilter().cleanup;
    ins.getFilter().cleanup = function() {
        filterCleanup = true;
        oldCleanup.call(ins.getFilter());
    };
    ins.cleanup();
        
        assert.ok(filterCleanup, '.cleanup() => .getFilter.cleanup() when getFilterIsAggregate');

});

QUnit.test("Instantiator.Variants.allowNullInstance", function(assert) {

    var ins = new Amm.Instantiator.Variants({
        prototypes: {
            a: "<input type='text' data-amm-e='' data-amm-v='v.Input' value='xx' />",
            b: "<div data-amm-e='' data-amm-v='v.Content>Foo</div>"
        }

    });
    
    assert.throws(function() {
        ins.construct();
    }, /default.*prototype.*not.*set/i, 'When allowNullInstance is FALSE, instantiator requires default prototype');
    
    ins.setAllowNullInstance(true);
    
    assert.equal(ins.construct(), null, 'When allowNullInstance is TRUE, instantiator returns NULL when there\'s no match');
    
    // now things will become a bit more interesting
    
    var f = new Amm.Filter({
        conditions: [
            {r: 'a', _id: 'a'},
            {r: 'b', _id: 'b'}
        ]
    });
    
    var object1 = new Amm.Element({prop__r: 'x'});
    
    var instance;
    
    var needRebuildLog = [];
    
    ins.subscribe('needRebuild', function(changedObjects, changedMatches) {
        needRebuildLog.push([changedObjects, changedMatches]);
    });
    
    ins.setFilter(f);
    
    ins.setAllowNullInstance(false);

    assert.throws(function() {
        instance = ins.construct(object1);
    }, /default.*prototype.*not.*set/i, 'When allowNullInstance is FALSE, instantiator requires default prototype');
    
    assert.notOk(ins.hasObject(object1), 'allowNullInstance is FALSE: object that produced no match isn\'t subscribed');
    
    ins.setAllowNullInstance(true);
    
    instance = ins.construct(object1);
    
    assert.ok(ins.hasObject(object1), 'allowNullInstance is FALSE: object that produced no match is observed');
    
    needRebuildLog = [];
    
    object1.setR('a');
    
    assert.equal(needRebuildLog.length, 1, 'needRebuild was triggered when object that previously produced no match changed to produce match');
    
    needRebuildLog = [];
    
    object1.setR('x');
    
    assert.equal(needRebuildLog.length, 1, 'needRebuild was triggered when object stopped to produce match');
    assert.deepEqual(needRebuildLog[0][1], [false], 'needRebuild reported that match is FALSE');
    
    ins.setAllowNullInstance(false);
    
    assert.notOk(ins.hasObject(object1), 'after allowNullInstance became FALSE, object that produced no match isn\'t observed anymore');
    
});
    
    
QUnit.test("Instantiator.Variants.assocProperty, revAssocProperty", function(assert) {
    
    var object1 = new Amm.Element({prop__ins: null, prop__otherIns: null});
    var object2 = new Amm.Element({prop__ins: null, prop__otherIns: null});
    var object3 = new Amm.Element({prop__ins: null, prop__otherIns: null});

    var ins = new Amm.Instantiator.Variants({
        assocProperty: 'obj',
        revAssocProperty: 'ins',
        prototypes: {
            a: {
                'class': 'Amm.Element',
                prop__obj: null
            },
            b: {
                'class': 'Amm.Element',
                prop__obj: null,
                prop__otherObj: null,
                __assocProperty: 'otherObj'
            },
            c: {
                'class': 'Amm.Element',
                prop__obj: null,
                prop__otherObj: null,
                __revAssocProperty: 'otherIns'
            }
        }

    });
    
    var i1 = ins.construct(object1, 'a');
    
    assert.ok(i1.getObj() === object1, 'global assocProperty works');
    assert.ok(object1.getIns() === i1, 'global revAssocProperty works');
    
    var i2 = ins.construct(object2, 'b');
    
    assert.ok(i2.getOtherObj() === object2, 'local __assocProperty takes precedence');
    assert.ok(i2.getObj() === null);
    assert.ok(object2.getIns() === i2);
    
    var i3 = ins.construct(object3, 'c');
    
    assert.ok(i3.getObj() === object3);
    assert.ok(object3.getOtherIns() === i3, 'local __revAssocProperty takes precedence');
    assert.ok(object3.getIns() === null);
    
});

QUnit.test("Instantiator.Variants: allow to pass nulls or non-objects to construct()", function(assert) {

    var ins = new Amm.Instantiator.Variants({
        assocProperty: 'src',
        allowNullInstance: true,
        filter: {
            conditions: [
                {dummyProp: 'dummyVal', _id: 'a'},
            ]
        },
        prototypes: {
            a: {'class': 'Amm.Element', prop__src: '-not updated-'},
        }
    });
    
    var e1 = ins.construct(null, 'a');
    assert.ok(Amm.is(e1, 'Amm.Element'));
    assert.deepEqual(e1.getSrc(), null);
    
    var e2 = ins.construct(1, 'a');
    assert.ok(Amm.is(e2, 'Amm.Element'));
    assert.deepEqual(e2.getSrc(), 1);

    var e3 = ins.construct(1, 'x');
    assert.deepEqual(e3, null);

});    

QUnit.test("Instantiator.Variants: builderSource as proto", function(assert) {

    var ins = new Amm.Instantiator.Variants({
        prototypes: {
            a: "<input type='text' data-amm-e='' data-amm-v='v.Input' value='xx' />",
            b: "<div data-amm-e='' data-amm-v='v.Content'>Foo</div>"
        }
    });
    
    var e1 = ins.construct(null, 'a');
    assert.ok(Amm.is(e1, 'Amm.Element'));
    assert.ok(Amm.is(e1, 'Editor'));
    var e2 = ins.construct(null, 'b');
    assert.ok(Amm.is(e2, 'Amm.Element'));
    assert.ok(Amm.is(e2, 'Content'));
    
    Amm.cleanup(e1, e2);

});    

})();
