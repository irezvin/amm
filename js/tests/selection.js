/* global QUnit */

(function() {

    var Item = function(name, value, selected) {
        Amm.WithEvents.call(this);
        Amm.init(this, {name: name, value: value, selected: !!selected});
    };
    Amm.createProperty(Item.prototype, 'name');
    Amm.createProperty(Item.prototype, 'value');
    Amm.createProperty(Item.prototype, 'selected');
    Amm.createProperty(Item.prototype, 'index');
    Amm.extend(Item, Amm.WithEvents);
    
    var names = function(items) {
        if (items['Amm.Collection']) items = items.getItems();
        return Amm.getProperty(items, 'name');
    };
    
    var values = function(items) {
        if (!items) return items;
        if (items['Amm.Collection']) items = items.getItems();
        return Amm.getProperty(items, 'value');
    };
    
    QUnit.module("Selection");

    /* global Amm */

    QUnit.test("Selection with value property", function(assert) {
        var a = new Item('Item A', 'a');
        var b = new Item('Item B', 'b');
        var c = new Item('Item C', 'c');
        var d = new Item('Item D', 'd');
        var e = new Item('Item E', 'e');
        var f = new Item('Item F', 'f');
        var g = new Item('Item G', 'g');
        
        var coll = new Amm.Collection({
            items: [a, b, c, d, e, f], 
            indexProperty: 'index'
        });
        var selA = new Amm.Selection({
            collection: coll, 
            valueProperty: 'value', 
            selectedProperty: 'selected'
        });
        selA.push(a);
        assert.equal(a.getSelected(), true,
            'Item `selectedProperty` is set to TRUE when item is added');
        b.setSelected(true);
        assert.ok(selA.hasItem(b),
            'Item is added to the selection when its\' selectedProperty set to TRUE');
        assert.deepEqual(selA.getValue(), ['a', 'b'],
            'getValue() w/ valueProperty returns proper result');
        selA.setValue(['d', 'e', 'f']);
        assert.deepEqual(names(selA), ['Item D', 'Item E', 'Item F'],
            'Items are replaced in Selection after setValue()');
        assert.deepEqual(Amm.getProperty([a, b, c, d, e, f], 'selected'),
            [false, false, false, true, true, true],
            'Non-selected items have their selectedProperty set to FALSE, and selected one has TRUE');
        selA.setMultiple(false);
        assert.equal(selA.getValue(), 'd',
            'After setMultiple is set to FALSE, only first item remains');
        c.setSelected(true);
        assert.equal(selA.length, 1,
            'After setMultiple is set to FALSE, other items are rejected');
        selA.setMultiple(true);
        assert.equal(selA.getValue(), 'c',
            'getMultiple(false): after item setSelected, value changes; only one item is selected');
        assert.deepEqual(selA.getValue(), ['c'],
            'After setMultiple(TRUE), getValue() returns arrays');
        assert.deepEqual(Amm.getProperty([a, b, c, d, e, f], 'selected'), 
            [false, false, true, false, false, false],
            'Non-selected items have their selectedProperty set to FALSE, and selected one has TRUE');
        selA.push(e, f);
        assert.deepEqual(values(selA), ['c', 'e', 'f']);
        coll.reject(e);
        assert.deepEqual(values(selA), ['c', 'f'],
            'Items that are deleted from collection are rejected from the selection');
        e.setSelected(true);
        assert.deepEqual(values(selA), ['c', 'f'],
            '...and not observed anymore');
        coll.accept(e);
        assert.deepEqual(values(selA), ['c', 'f', 'e'],
            'but added if they have selectedProperty === TRUE and added back to the collection');
        selA.clearItems();
        assert.deepEqual(selA.getValue(), [],
            'After clearItems() w/ valueProperty and multiple === TRUE, getValue() returns empty array');
        selA.setMultiple(false);
        assert.deepEqual(selA.getValue(), null,
            'After clearItems() w/ valueProperty and multiple === FALSE, getValue() returns NULL');
        
        coll.setItems([a, b, c, d, e, f]);
        selA.setMultiple(true);
        selA.setItems([c, d, e]);
        coll.reverse();
        assert.deepEqual(values(selA), ['c', 'd', 'e'],
            'After `collection` reverse, selection items are unchanged');
        selA.setSameOrder(true);
        assert.deepEqual(values(selA), ['e', 'd', 'c'],
            'After setSameOrder(true), selection memebers are re-ordered');
        selA.reverse();
        assert.deepEqual(values(selA), ['c', 'd', 'e'],
            'After orig. collection order change, selection memebers are re-ordered');
        coll.moveItem(3, 2);
        assert.deepEqual(values(selA), ['e', 'c', 'd'],
            'After orig. collection item move, selection memebers are re-ordered');
            
        coll.setItems([a, b, c, d, e, f]);
        selA.setSameOrder(false);
        selA.setMultiple(true);
        selA.setItems([c, d, e]);
        assert.deepEqual(selA.getValue(), ['c', 'd', 'e'],
            'getValue() ok');
        c.setValue('x');
        assert.deepEqual(selA.getValue(), ['x', 'd', 'e'],
            'when unselectOnItemValueChange() === false, selection.getValue() returns different value');
        selA.setUnselectOnItemValueChange(true);
        c.setValue('z');
        assert.deepEqual(selA.getValue(), ['d', 'e'],
            'when unselectOnItemValueChange() === true, selection.getValue() returns less values');
        c.setValue('d');
        assert.deepEqual(selA.getValue(), ['d', 'e', 'd'],
            'when value changes into already selected, item is added to the collection');
            
        var o = {
            log: [],
            valueChange: function (value, oldValue) {
                this.log.push({value: value, oldValue: oldValue});
            },
            fetch: function() {
                return this.log.splice(0, this.log.length);
            }
        };
        
        selA.subscribe('valueChange', o.valueChange, o);
        c.setValue('m');
        assert.deepEqual(o.fetch(), [{value: ['d', 'e'], oldValue: ['d', 'e', 'd']}],
            'correct valueChange on itemValuePropertyChange w/ setUnselectOnItemValueChange === TRUE');
        selA.setUnselectOnItemValueChange(false);
        d.setValue('u');
        assert.deepEqual(o.fetch(), [{value: ['u', 'e'], oldValue: ['d', 'e']}],
            'correct valueChange on itemValuePropertyChange w/ setUnselectOnItemValueChange === FALSE');
        selA.setValue(['a', 'b']);
        assert.deepEqual(o.fetch(), [{value: ['a', 'b'], oldValue: ['u', 'e']}],
            'correct valueChange on setValue');
        selA.setMultiple(false);
        assert.deepEqual(o.fetch(), [{value: 'a', oldValue: ['a', 'b']}],
            'correct valueChange on multipleChange');
        selA.setMultiple(true);
        assert.deepEqual(o.fetch(), [{value: ['a'], oldValue: 'a'}],
            'correct valueChange on multipleChange');
        selA.push(b, f);
        assert.deepEqual(o.fetch(), [{value: ['a', 'b', 'f'], oldValue: ['a']}],
            'correct valueChange on push()');
        
    });

    QUnit.test("Selection w/o value property", function(assert) {
        var a = new Item('Item A', 'a');
        var b = new Item('Item B', 'b');
        var c = new Item('Item C', 'c');
        var d = new Item('Item D', 'd');
        var e = new Item('Item E', 'e');
        var f = new Item('Item F', 'f');
        var g = new Item('Item G', 'g');
        
        var coll = new Amm.Collection({
            items: [a, b, c, d, e, f], 
            indexProperty: 'index'
        });
        var selA = new Amm.Selection({
            collection: coll, 
            selectedProperty: 'selected'
        });
        selA.push(a);
        assert.equal(a.getSelected(), true,
            'Item `selectedProperty` is set to TRUE when item is added');
        b.setSelected(true);
        assert.ok(selA.hasItem(b),
            'Item is added to the selection when its\' selectedProperty set to TRUE');
        assert.deepEqual(selA.getValue(), [a, b],
            'getValue() w/o valueProperty returns multiple objects');
        selA.setValue([d, e, f]);
        assert.deepEqual(names(selA), ['Item D', 'Item E', 'Item F'],
            'Items are replaced in Selection after setValue()');
        assert.deepEqual(Amm.getProperty([a, b, c, d, e, f], 'selected'),
            [false, false, false, true, true, true],
            'Non-selected items have their selectedProperty set to FALSE, and selected one has TRUE');
        selA.setMultiple(false);
        assert.equal(selA.getValue(), d,
            'After setMultiple is set to FALSE, only first item remains');
        assert.equal(selA.length, 1,
            'After setMultiple is set to FALSE, other items are rejected');
        selA.setMultiple(true);
        assert.deepEqual(selA.getValue(), [d],
            'After setMultiple(TRUE), getValue() returns array with single object instance');
        assert.deepEqual(Amm.getProperty([a, b, c, d, e, f], 'selected'), [false, false, false, true, false, false],
            'Non-selected items have their selectedProperty set to FALSE, and selected one has TRUE');
            
        selA.clearItems();
        assert.deepEqual(selA.getValue(), [],
            'After clearItems() w/o valueProperty and multiple === TRUE, getValue() returns empty array');
        selA.setMultiple(false);
        assert.deepEqual(selA.getValue(), null,
            'After clearItems() w/o valueProperty and multiple === FALSE, getValue() returns NULL');
            
        var o = {
            log: [],
            valueChange: function (value, oldValue) {
                this.log.push({value: values(value), oldValue: values(oldValue)});
            },
            fetch: function() {
                return this.log.splice(0, this.log.length);
            }
        };
        
        selA.setMultiple(true);
        
        selA.subscribe('valueChange', o.valueChange, o);
        selA.setValue([a, b]);
        assert.deepEqual(o.fetch(), [{value: ['a', 'b'], oldValue: []}],
            'correct valueChange on setValue');
        selA.setMultiple(false);
        assert.deepEqual(o.fetch(), [{value: 'a', oldValue: ['a', 'b']}],
            'correct valueChange on multipleChange');
        selA.setMultiple(true);
        assert.deepEqual(o.fetch(), [{value: ['a'], oldValue: 'a'}],
            'correct valueChange on multipleChange');
        selA.push(b, f);
        assert.deepEqual(o.fetch(), [{value: ['a', 'b', 'f'], oldValue: ['a']}],
            'correct valueChange on push()');
            
    });

    QUnit.test("Selection w/o both value property and selected property", function(assert) {
        var a = new Item('Item A', 'a');
        var b = new Item('Item B', 'b');
        var c = new Item('Item C', 'c');
        var d = new Item('Item D', 'd');
        var e = new Item('Item E', 'e');
        var f = new Item('Item F', 'f');
        var g = new Item('Item G', 'g');
        
        var coll = new Amm.Collection({
            items: [a, b, c, d, e, f], 
            indexProperty: 'index'
        });
        var selA = new Amm.Selection({
            collection: coll
        });
        selA.push(a, b);
        assert.deepEqual(selA.getValue(), [a, b],
            'getValue() w/o valueProperty returns multiple objects');
        selA.setValue([d, e, f]);
        assert.deepEqual(names(selA), ['Item D', 'Item E', 'Item F'],
            'Items are replaced in Selection after setValue()');
        selA.setMultiple(false);
        assert.equal(selA.getValue(), d,
            'After setMultiple is set to FALSE, only first item remains');
        assert.equal(selA.length, 1,
            'After setMultiple is set to FALSE, other items are rejected');
        selA.setMultiple(true);
        assert.deepEqual(selA.getValue(), [d],
            'After setMultiple(TRUE), getValue() returns array with single object instance');
        selA.clearItems();
        assert.deepEqual(selA.getValue(), [],
            'After clearItems() w/o valueProperty and multiple === TRUE, getValue() returns empty array');
        selA.setMultiple(false);
        assert.deepEqual(selA.getValue(), null,
            'After clearItems() w/o valueProperty and multiple === FALSE, getValue() returns NULL');
    });
    
    QUnit.test("Selection with pre-set selected property", function(assert) {
        var a = new Item('Item A', 'a');
        var b = new Item('Item B', 'b');
        var c = new Item('Item C', 'c');
        var d = new Item('Item D', 'd');
        var e = new Item('Item E', 'e');
        var f = new Item('Item F', 'f');
        var g = new Item('Item G', 'g');
        
        a.setSelected(true);
        b.setSelected(true);
        
        var coll = new Amm.Collection({
            items: [a, b, c, d, e, f]
        });
        var selA = new Amm.Selection({
            valueProperty: 'value',
            selectedProperty: 'selected',
            collection: coll
        });
        assert.deepEqual(selA.getValue(), ['a', 'b'],
            'When objects in collection have selectedProperty set, Selection will have them selected');
        var selB = new Amm.Selection({
            valueProperty: 'value',
            selectedProperty: 'selected',
            collection: coll,
            multiple: false
        });
        assert.deepEqual(selB.getValue(), 'a',
            'init with item having setSelected(true) - reports proper value');
    });
    
    QUnit.test("Selection begin/endUpdate", function(assert) {

        var log = [];
        var e = new Amm.Element({
            traits: 't.Select', 
            multiple: true,
            options: ['a', 'b', 'c'],
            on__valueChange: function(value) {
                log.push(value);
            }
        });
        var s = e.getSelectionCollection();
        s.beginUpdate();
        e.options[0].setSelected(true);
        e.options[1].setSelected(true);
        e.options[2].setSelected(true);
        s.endUpdate();
        assert.equal(log.length, 1, 'Only one event was triggered when begin/endUpdate used');
        log = [];
        e.options[0].setSelected(false);
        e.options[1].setSelected(false);
        e.options[2].setSelected(false);
        assert.equal(log.length, 3, 'Each options[i].setSelected() triggers valueChange event of Select w/o begin/endUpdate used');
        
        log = [];
        e.setValue(['a', 'b', 'c']);
        assert.equal(log.length, 1, 'Only one event was triggered when setValue() set for multiple options');
        
        assert.equal(e.options.getUniqueSubscribers('Amm.Selection').length, 1, 
            'Only one unique Selection object was created and observes options collction');
        
    });
    
    
    
}) ();

