/* global Amm */
/* global QUnit */

(function() {

QUnit.module("Instantiator");

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
    
    var v = new Amm.Instantiator.Variants();
    
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

})();
