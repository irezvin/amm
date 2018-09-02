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
    
}) ();
