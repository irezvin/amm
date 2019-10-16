/* global Amm */
/* global QUnit */

(function() {

QUnit.module("Repeater and Instantiator Traits");

QUnit.test("Amm.Trait.Instantiator: simple Proto", function(assert) {

    var fx = jQuery('#qunit-fixture');
    
    fx.html(
            
        Amm.html({
            $: 'div',
            data_amm_id: 'inst',
            data_amm_e: {
                extraTraits: ['t.Instantiator', 't.Component'],
                instantiatorOptions: {
                    assocProperty: 'ref'
                }
            },
            $$: [
                {$: 'div', data_amm_v: 'v.DisplayParent', data_amm_id: 'inst'},
                {$: 'div', data_amm_v: 'v.Variants', data_amm_id: 'inst', $$: [
                    {
                        $: 'div',
                        data_amm_dont_build: '', 
                        data_amm_default: '', 
                        data_amm_e: { 
                            prop__ref: null, 
                            prop__type: 'typeA',
                        }, 
                        data_amm_v: ['v.Visual']
                    }
                ]}
            ]
        })
                
    );
    
    var spi = new Amm.Element(fx.children('div')); // simple proto instantiator
    
        assert.ok(Amm.is(spi.getInstantiator(), 'Amm.Instantiator.Proto'),
            'since only default prototype was provided, Amm.Instantiator.Proto was created');
    
    
    var e = new Amm.Element();
    
    spi.setSrc(e);
    
    var dest = spi.getDest(); // constructed element
    
        assert.ok(Amm.is(dest, 'Amm.Element'), 'Amm.Element was constructed');

        assert.ok(dest.getDisplayParent() === spi, '...with proper display parent');

        assert.ok(dest.getRef() === e, '...and reference to source element');
        
    
    var e1 = new Amm.Element();
    
    var numCleanups = 0;
    
    dest.subscribe('cleanup', function() { numCleanups++; });
    
    spi.setSrc(e1);
    
        assert.deepEqual(numCleanups, 1, 
            'When source element was changed, old constructed element was deleted');
    
    var dest2 = spi.getDest();
    
        assert.ok(dest !== dest2,
            'New constructed element is different');
    
    Amm.cleanup(spi);
    
});

QUnit.test("Amm.Trait.Instantiator: Variants + builder extensions", function(assert) {

    var fx = jQuery('#qunit-fixture');
    
    fx.html(
            
        Amm.html({
            $: 'div',
            data_amm_id: 'inst',
            data_amm_e: {
                extraTraits: ['t.Instantiator', 't.Component'],
                instantiatorOptions: {
                    assocProperty: 'ref'
                }
            },
            $$: [
                {$: 'div', data_amm_v: 'v.DisplayParent', data_amm_id: 'inst'},
                {$: 'div', data_amm_x: 'v.Variants.build', data_amm_id: 'inst', $$: [
                    {
                        $: 'div',
                        data_amm_dont_build: '', 
                        data_amm_condition: '{type: "A"}',
                        data_amm_e: {
                            prop__ref: null, 
                            prop__type: 'typeA',
                        }, 
                        data_amm_v: ['v.Visual']
                    },
                    {
                        $: 'div',
                        data_amm_dont_build: '', 
                        data_amm_condition: '{type: "B"}',
                        data_amm_e: {
                            prop__ref: null, 
                            prop__type: 'typeB',
                        }, 
                        data_amm_v: ['v.Visual']
                    }
                ]}
            ]
        })
                
    );
    
    var b = Amm.Builder.calcPrototypeFromSource(fx.children('div'));
    
    var vi = new Amm.Element(fx.children('div')); // variants instantiator
    
        assert.ok(Amm.is(vi.getInstantiator(), 'Amm.Instantiator.Variants'),
            'since several prototypes were provided, Amm.Instantiator.Variants was created');
        
    var e = new Amm.Element({prop__type: "A"});
    
    vi.setSrc(e);
    
    var dest = vi.getDest(); // constructed element
    
        assert.ok(Amm.is(dest, 'Amm.Element'), 'Amm.Element was constructed');

        assert.equal(dest.getType(), 'typeA', '...of proper type');

        assert.ok(dest.getDisplayParent() === vi, '...with proper display parent');

        assert.ok(dest.getRef() === e, '...and reference to source element');

    e.setType('B');
    
    var dest2 = vi.getDest();
    
        assert.ok(dest2 !== dest, 'Different element was constructed when matching conditionchanged' );

        assert.equal(dest2.getType(), 'typeB', '...and it had proper type');

    e.setType('C');
    
        assert.equal(vi.getDest(), null, 'Since there\'s no match, constructed element is deleted');

    Amm.cleanup(vi);
    
});

QUnit.test("Amm.Trait.Repeater: simple Proto", function(assert) {

    var fx = jQuery('#qunit-fixture');
    
    fx.html(
            
        Amm.html({
            $: 'div',
            data_amm_id: 'inst',
            data_amm_e: {
                extraTraits: ['t.Repeater', 't.Component'],
                arrayMapperOptions: {
                    instantiator: {
                        assocProperty: 'ref'
                    }
                }
            },
            $$: [
                {$: 'div', data_amm_v: 'v.DisplayParent', data_amm_id: 'inst'},
                {$: 'div', data_amm_v: 'v.Variants', data_amm_id: 'inst', $$: [
                    {
                        $: 'div',
                        data_amm_dont_build: '', 
                        data_amm_default: '', 
                        data_amm_e: { 
                            prop__ref: null, 
                            prop__type: 'typeA',
                        }, 
                        data_amm_v: ['v.Visual']
                    }
                ]}
            ]
        })
                
    );
    
    var e1 = new Amm.Element();
    var e2 = new Amm.Element();
    var e3 = new Amm.Element();
    
    var ee =  new Amm.Collection ([e1, e2]);
    
    var spr = new Amm.Element(fx.children('div')); // simple proto repeater
    
        assert.ok(Amm.is(spr.getArrayMapper().getInstantiator(), 'Amm.Instantiator.Proto'),
            'since only default prototype was provided, Amm.Instantiator.Proto was created');
    
    spr.setItems(ee);
    
    var dest = spr.displayChildren;
    
        assert.equal(dest.length, 2, 'Two elements were created');
    
        assert.ok(Amm.is(dest[0], 'Amm.Element'), 'Amm.Element (1) was constructed');
        
        assert.ok(Amm.is(dest[1], 'Amm.Element'), 'Amm.Element (2) was constructed');

        assert.ok(dest[0].getDisplayParent() === spr, '...with proper display parent');

        assert.ok(dest[0].getRef() === e1, '...and reference to source element (1)');
        
        assert.ok(dest[1].getRef() === e2, '...and reference to source element (2)');
    
    var numCleanups = 0;
    
    dest[1].subscribe('cleanup', function() { numCleanups++; });
    
    ee.removeAtIndex(1);
    
        assert.deepEqual(numCleanups, 1, 
            'When source element was rejected from collection, constructed element was deleted');
            
    ee.unshift(e3);
    
        assert.deepEqual(dest.length, 2, 'New child was created when item added to src collection');
        
        assert.deepEqual(dest[0].getRef(), e3, '...with proper reference');
            
    Amm.cleanup(spr);
    
});

QUnit.test("Amm.Trait.Repeater: Variants + builder extensions", function(assert) {

    var fx = jQuery('#qunit-fixture');
    
    fx.html(
            
        Amm.html({
            $: 'div',
            data_amm_id: 'rpt',
            data_amm_e: {
                extraTraits: ['t.Repeater', 't.Component'],
                arrayMapperOptions: {
                    instantiator: {
                        assocProperty: 'ref'
                    }
                }
            },
            $$: [
                {$: 'div', data_amm_v: 'v.DisplayParent', data_amm_id: 'rpt'},
                {$: 'div', data_amm_x: 'v.Variants.build', data_amm_id: 'rpt', $$: [
                    {
                        $: 'div',
                        data_amm_dont_build: '', 
                        data_amm_condition: '{type: "A"}',
                        data_amm_e: {
                            prop__ref: null, 
                            prop__type: 'typeA',
                        }, 
                        data_amm_v: ['v.Visual']
                    },
                    {
                        $: 'div',
                        data_amm_dont_build: '', 
                        data_amm_condition: '{type: "B"}',
                        data_amm_e: {
                            prop__ref: null, 
                            prop__type: 'typeB',
                        }, 
                        data_amm_v: ['v.Visual']
                    }
                ]}
            ]
        })
                
    );
    
    var b = Amm.Builder.calcPrototypeFromSource(fx.children('div'));
    
    var vr = new Amm.Element(fx.children('div')); // variants instantiator
    
        assert.ok(Amm.is(vr.getArrayMapper().getInstantiator(), 'Amm.Instantiator.Variants'),
            'since several prototypes were provided, Amm.Instantiator.Variants was created');
    
        assert.ok(Amm.is(vr.getArrayMapper().getFilter(), 'Amm.Filter'),
            'array mapper has the filter, not instantiator');
        
    var e1 = new Amm.Element({prop__type: "A"});
    var e2 = new Amm.Element({prop__type: "B"});
    var e3 = new Amm.Element({prop__type: "C"});
    
    var ee = new Amm.Collection([e1, e2, e3]);
    
    vr.setItems(ee);
    
    var dest = vr.displayChildren;
    
        assert.equal(dest.length, 2, 'Only two elements passed the filter');
    
        assert.ok(Amm.is(dest[0], 'Amm.Element'), 'Amm.Element was constructed (1)');

        assert.equal(dest[0].getType(), 'typeA', '...of proper type (1)');

        assert.ok(dest[0].getDisplayParent() === vr, '...with proper display parent (1)');

        assert.ok(dest[0].getRef() === e1, '...and reference to source element (1)');
    
        assert.ok(Amm.is(dest[1], 'Amm.Element'), 'Amm.Element was constructed (2)');

        assert.equal(dest[1].getType(), 'typeB', '...of proper type (2)');

        assert.ok(dest[1].getDisplayParent() === vr, '...with proper display parent (2)');

        assert.ok(dest[1].getRef() === e2, '...and reference to source element (2)');

    e2.setType('E');
    
        assert.equal(dest.length, 1, 'Constructed element was rejected when it didn\'t match condition anymore');
        
    e3.setType('B');
    
        assert.equal(dest.length, 2, 'Element was constructed when observed src matched the condition');
    
    Amm.cleanup(vr);
    
});



})();
