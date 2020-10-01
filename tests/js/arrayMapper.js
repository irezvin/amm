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
        
        assert.deepEqual(m.getDest().getItems(), Amm.Array.diff(m.getSrc().getItems().reverse(), ['c', 'd']));
        
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
        
        var extra = ['_prefix'];
        m.setDestExtra(extra);
        assert.deepEqual(m.getDest().getItems(), extra.concat(m.getSrc().getItems()));
        
        m.getSrc().slice(1, 2);
        assert.deepEqual(m.getDest().getItems(), extra.concat(m.getSrc().getItems()));
        
        m.getSrc().setItems([]);
        assert.deepEqual(m.getDest().getItems(), extra);
        
        m.setDestExtra([]);
        assert.deepEqual(m.getDest().getItems(), []);
        assert.deepEqual(m.getDestExtra(), null);
        
        
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
        
        Amm.cleanup(am, dd);
        
    });

    var mkSample = function() {
        
        var cars = [
            new Amm.Element({prop__brand: 'Toyota', prop__year: 2011, prop__type: 'Diesel'}),
            new Amm.Element({prop__brand: 'Subaru', prop__year: 2012, prop__type: 'Petrol'}),
            new Amm.Element({prop__brand: 'Lada', prop__year: 2003, prop__type: 'Petrol'}),
            new Amm.Element({prop__brand: 'ZAZ', prop__year: 1981, prop__type: 'Petrol'}),
            new Amm.Element({prop__brand: 'Lexus', prop__year: 2014, prop__type: 'Diesel'}),
            new Amm.Element({prop__brand: 'Geely', prop__year: 2017, prop__type: 'Petrol'}),
            new Amm.Element({prop__brand: 'VW', prop__year: 2015, prop__type: 'Diesel'})
        ];
        
        var c = {
        };
        
        for (var i = 0, l = cars.length; i < l; i++) {
            c[cars[i].getBrand()] = cars[i];
        }
        
        return {
            cars: cars,
            c: c
        };
        
    };
    
    var names = function(cars) {
        return Amm.getProperty(cars['Amm.Array']? cars.getItems() : cars, 'brand');
    };
    
    var yearType = function(cars) {
        var r = [];
        var c = cars['Amm.Array']? cars.getItems() : cars;
        for (var i = 0, l = c.length; i < l; i++) {
            r.push(c[i].getBrand() + ' ' + c[i].getType() + ' ' + c[i].getYear());
        }
        return r;
    };
    
    QUnit.test("ArrayMapper and Filter integration", function(assert) {

        var sam = mkSample();
        var src = new Amm.Collection();
        var filter = new Amm.Filter({
            conditions: [
                {
                    _id: 'dieselCar',
                    type: 'Diesel'
                },
                {
                    _id: 'petrolCar',
                    type: 'Petrol'
                }
            ]
        });
        var dest = new Amm.Collection();
        
        var cleanups = [];
        
        var ins = new Amm.Instantiator.Variants({
            defaultPrototype: {
                'class': Amm.Element,
                prop__proto: 'default',
                prop__car: null,
                prop__brand: null,
                __assocProperty: 'car',
                in__brand: 'this.proto + " " + this.car.brand',
                on__cleanup: function() {
                    cleanups.push(this.getBrand());
                }
            },
            overrideDefaultPrototype: true,
            prototypes: {
                'petrolCar': {prop__proto: 'petrol'},
                'dieselCar': {prop__proto: 'diesel'},
                'old': {prop__proto: 'old'},
                'new': {prop__proto: 'new'}
            }
        });
        
        var mapper = new Amm.ArrayMapper({
            src: src,
            dest: dest,
            filter: filter,
            instantiator: ins
        });
        var destItems = [];
        
        dest.subscribe('itemsChange', function(v) {
            destItems.push(names(v));
        });
        
        src.setItems(sam.cars);
        
        assert.deepEqual(destItems, [['diesel Toyota', 'petrol Subaru', 'petrol Lada', 'petrol ZAZ', 
            'diesel Lexus', 'petrol Geely', 'diesel VW']], 'dest items instantiated according to matches');
        
        destItems = [];
        sam.c.Toyota.setType('Petrol');
        
        assert.deepEqual(cleanups, ['diesel Toyota'], 'old instance was deleted');
        assert.deepEqual(destItems, [['petrol Toyota', 'petrol Subaru', 'petrol Lada', 'petrol ZAZ', 
            'diesel Lexus', 'petrol Geely', 'diesel VW']], 'new instance replaced old instance');
        
        var insFilter = new Amm.Filter({conditions: [
            {_id: 'new', 'year': new Amm.Validator.Number({gt: 2010}) },
            {_id: 'old', 'year': new Amm.Validator.Number({le: 2010}) }
        ]});
        
        destItems = [];
        
        ins.setFilter(insFilter);
        
        assert.deepEqual(destItems, [['new Toyota', 'new Subaru', 'old Lada', 'old ZAZ', 
            'new Lexus', 'new Geely', 'new VW']], 'new items instantiated according to filter');
        
        destItems = [];
        
        sam.c.Toyota.setType('Diesel');
        assert.deepEqual(destItems, [], 'changes observed by ArrayMapper filter don\'t affect instantiator '
            + 'that uses own filter'
        );
        
        mapper.cleanup();
        Amm.cleanup(sam.cars, filter);
        
    });
    
    QUnit.test("ArrayMapper and Sorter integration", function(assert) {
        
        var sam = mkSample();
        var src = new Amm.Collection();
        var sorter = new Amm.Sorter({
            criteria: ['type', 'year DESC']
        });
        var dest = new Amm.Collection();
        
        var cleanups = [];
        
        var mapper = new Amm.ArrayMapper({
            src: src,
            dest: dest,
            sort: sorter
        });
        
        var destItems = [];
        
        dest.subscribe('itemsChange', function(v) {
            destItems.push(yearType(v));
        });
        
        src.setItems(sam.cars);
        
        assert.deepEqual(names(sorter.getObservedObjects()), names(sam.cars));
        
        assert.deepEqual(destItems, [[
            'VW Diesel 2015',
            'Lexus Diesel 2014',
            'Toyota Diesel 2011',
            'Geely Petrol 2017',
            'Subaru Petrol 2012',
            'Lada Petrol 2003',
            'ZAZ Petrol 1981'
        ]]);
        
        
        destItems = [];
        sam.c.VW.setYear('1980');
        
        assert.deepEqual(destItems, [[
            'Lexus Diesel 2014',
            'Toyota Diesel 2011',
            'VW Diesel 1980',
            'Geely Petrol 2017',
            'Subaru Petrol 2012',
            'Lada Petrol 2003',
            'ZAZ Petrol 1981'
        ]]);
        
        destItems = [];
        sam.c.VW.setType('Petrol');
        
        assert.deepEqual(destItems, [[
            'Lexus Diesel 2014',
            'Toyota Diesel 2011',
            'Geely Petrol 2017',
            'Subaru Petrol 2012',
            'Lada Petrol 2003',
            'ZAZ Petrol 1981',
            'VW Petrol 1980',
        ]]);
    
        mapper.cleanup();
        Amm.cleanup(sam.cars, sorter);
        
    });
    
    
}) ();
