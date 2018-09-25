/* global QUnit */
/* global Amm */

(function() {

    QUnit.module("ArrayMapper");

    QUnit.test("ArrayMapper.basic", function(assert) {

        var a = ['a', 'b', 'c'];
        
        var m = new Amm.ArrayMapper();
        
        window.d.m = m;
        
        m.setSrc(a);
        
        assert.deepEqual(m.getDest().getItems(), a, 'Basic mapping: arrays are equal');
        
        m.getSrc().splice(1, 0, 'a', 'c', 'b', 'd');
        
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems(), 
            'Basic mapping: arrays are equal after splicing with some repeating items');
            
        m.getSrc().splice(1, 1);

        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems());

        m.setSort(Amm.ArrayMapper.SORT_REVERSE);

        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems().reverse());
        
        m.getSrc().splice(3, 1, 'a', 'b', 'c');
        
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems().reverse());
        
        m.setFilter(function(value) {return value === 'a' || value === 'b';});
        
        assert.deepEqual(m.getDest().getItems(), Amm.Array.arrayDiff(m.getSrc().getItems().reverse(), ['c', 'd']));
        
        m.setFilter(null);
        
        m.setSort(Amm.ArrayMapper.SORT_DIRECT);
        
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems());
        
        m.setOffset(0);
        m.setLength(3);
        
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems().slice(0, 3));
        
        m.setOffset(1);
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems().slice(1, 4));
        
        m.setOffset(-3);
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems().slice(-3));

        m.setOffset(0);
        m.setLength(-3);
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems().slice(0, -3));
        
        m.setLength(0);
        assert.deepEqual(m.getDest().getItems(), []);
        
        var f = function(a) { return typeof a === 'string'? a.toUpperCase() : a };
        
        m.setOffset(0);
        m.setLength(null);
        
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems());
        
        m.setInstantiator(f);
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems().map(f));
        
        m.setInstantiator(null);
        assert.deepEqual(m.getDest().getItems(), m.getSrc().getItems());
        
    });
    
    QUnit.test("ArrayMapper with Instantiator", function(assert) {
        
        var ins1 = new Amm.Instantiator.Proto({
            proto: {
                'class': Amm.Element,
                prop__src: null,
                prop__destructed: false,
            },
            destruct: function(instance) {
                instance.setDestructed(true);
            },
            assocProperty: 'src'
        });
        
        var ins2 = new Amm.Instantiator.Proto({
            'class': Amm.Element,
            prop__src2: null
        }, 'src2');
        
        var am = new Amm.ArrayMapper({
            instantiator: ins1,
            srcClass: 'Amm.Collection',
            destClass: 'Amm.Collection'
        });
        
        var orig1 = {}, orig2 = {};
        
        var s = am.getSrc(), d = am.getDest();
        
        s.accept(orig1);
        s.accept(orig2);
        
        var dd = d.getItems();
        
        assert.ok(Amm.is(dd[0], 'Amm.Element'),
            "dest instance was created");
            
        assert.ok(dd[0].getSrc() === orig1,
            "link to src instance was provided");
        
        assert.ok(Amm.is(dd[1], 'Amm.Element'),
            "dest instance #2 was created");
            
        assert.ok(dd[1].getSrc() === orig2,
            "link to src instance #2 was provided");
        
        am.setInstantiator(ins2);
        
        assert.ok(dd[0].getDestructed(),
            "dest instance was destructed on instantiator change");
        
        assert.ok(d[0] !== dd[0], 
            "different dest instance was created on instantiator change");
        
        assert.ok(d[0].getSrc2() === orig1, 
            "different dest instance had different property; still associated with orig instance");
        
        am.cleanup();
        
    });
    
}) ();
