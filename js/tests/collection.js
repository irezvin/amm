(function() {

    var Item = function(name, descr, date) {
        if (typeof name !== 'object') {
            this._name = name;
            name = {};
        }
        if (descr !== undefined) this._descr = descr;
        if (date !== undefined) this._date = date;
        Amm.WithEvents.call(this, name);
    };
    
    Item.prototype = {
        "Item": "__CLASS__",
        
        _name: null,
        
        _descr: null,

        _date: null,

        _index: null,

        _parent: null,
        
        _tag: null,
        
        getInfo: function() {
            return {
                name: this._name,
                descr: this._descr,
                date: this._date,
                index: this._index,
                hasParent: !!this._parent
            };
        },
        
        setName: function(name) {
            var oldName = this._name;
            if (oldName === name) return;
            this._name = name;

            this.outNameChange(name, oldName);
            return true;
        },

        getName: function() { return this._name; },

        outNameChange: function(name, oldName) {
            this._out('nameChange', name, oldName);
        },

        setDescr: function(descr) {
            var oldDescr = this._descr;
            if (oldDescr === descr) return;
            this._descr = descr;

            this.outDescrChange(descr, oldDescr);
            return true;
        },

        getDescr: function() { return this._descr; },

        setDate: function(date) {
            var oldDate = this._date;
            if (oldDate === date) return;
            this._date = date;

            this.outDateChange(date, oldDate);
            return true;
        },

        getDate: function() { return this._date; },

        outDateChange: function(date, oldDate) {
            this._out('dateChange', date, oldDate);
        },

        outDescrChange: function(descr, oldDescr) {
            this._out('descrChange', descr, oldDescr);
        },

        setIndex: function(index) {
            var oldIndex = this._index;
            if (oldIndex === index) return;
            this._index = index;

            this.outIndexChange(index, oldIndex);
            return true;
        },

        getIndex: function() { return this._index; },

        outIndexChange: function(index, oldIndex) {
            this._out('indexChange', index, oldIndex);
        },

        setParent: function(parent) {
            var oldParent = this._parent;
            if (oldParent === parent) return;
            this._parent = parent;

            this.outParentChange(parent, oldParent);
            return true;
        },

        getParent: function() { return this._parent; },

        outParentChange: function(parent, oldParent) {
            this._out('parentChange', parent, oldParent);
        },
        
        setTag: function(tag) {
            var oldTag = this._tag;
            if (oldTag === tag) return;
            this._tag = tag;

            this.outTagChange(tag, oldTag);
            return true;
        },

        getTag: function() { return this._tag; },

        outTagChange: function(tag, oldTag) {
            this._out('tagChange', tag, oldTag);
        }
        
    };
    
    Amm.extend(Item, Amm.WithEvents);
    
    var itemsComparison = function(a, b) {
        var an = a.getName(), bn = b.getName();
        if (an == bn) return 0;
        if (an > bn) return 1;
        if (an < bn) return -1;
    };

    QUnit.module("Collection");

    /* global Amm */

    QUnit.test("Collection.binSearch w/o sort fn", function(assert) {
        
        var items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        assert.deepEqual(Amm.Collection.binSearch(items, 0), [0, true],
            'exact match - left bound');
        assert.deepEqual(Amm.Collection.binSearch(items, 9), [9, true],
            'exact match - right bound');
        assert.deepEqual(Amm.Collection.binSearch(items, 5), [5, true],
            'exact match - center');
        assert.deepEqual(Amm.Collection.binSearch(items, -10), [-1, false],
            'not found - before mix name');
        assert.deepEqual(Amm.Collection.binSearch(items, 12), [10, false],
            'not found - after max name');
        assert.deepEqual(Amm.Collection.binSearch(items, 1), [1, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 2), [2, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 3), [3, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 4), [4, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 9), [9, true]);
        
        assert.deepEqual(Amm.Collection.binSearch(items, 0.5), [1, false]);
        assert.deepEqual(Amm.Collection.binSearch(items, 1.1), [2, false]);
        assert.deepEqual(Amm.Collection.binSearch(items, 5.5), [6, false]);

        assert.deepEqual(Amm.Collection.binSearch(items, 5, null, 5), [5, true], 
            'limits provided - is left bound');
        assert.deepEqual(Amm.Collection.binSearch(items, 5, null, 6), [5, false],
            'limits provided - outside of limits');
        assert.deepEqual(Amm.Collection.binSearch(items, 5, null, 10), [10, false],
            'limits provided but outside of array range');
        assert.deepEqual(Amm.Collection.binSearch(items, 5, null, 0, 3), [4, false],
            'limits provided - outside of array, to the right');
        
    });

    QUnit.test("Collection.binSearch w/ sort fn", function(assert) {
        
        var fn = function(a, b) {
            return a - b;
        };
        
        var items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        
        assert.deepEqual(Amm.Collection.binSearch(items, 0, fn), [0, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 9, fn), [9, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, -10, fn), [-1, false]);
        assert.deepEqual(Amm.Collection.binSearch(items, 12, fn), [10, false]);
        assert.deepEqual(Amm.Collection.binSearch(items, 1, fn), [1, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 2, fn), [2, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 3, fn), [3, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 4, fn), [4, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 9, fn), [9, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 0.5, fn), [1, false]);
        assert.deepEqual(Amm.Collection.binSearch(items, 1.1, fn), [2, false]);
        assert.deepEqual(Amm.Collection.binSearch(items, 5, fn), [5, true]);
        assert.deepEqual(Amm.Collection.binSearch(items, 5.5, fn), [6, false]);
        
    });
    
    QUnit.test("Collection._preAccept()", function(assert) {
        
        var coll = new Amm.Collection({items: [
            new Item('0'),
            new Item('1'),
            new Item('2'),
            new Item('3'),
            new Item('4'),
            new Item('5'),
            new Item('6')
        ]});
        coll.setComparison(itemsComparison);
        var insert;
        var v;
        
        insert = [
            // non-exact duplicate of coll[2]
            new Item({name: '2', descr: 'Another "2", not the original' }), 
            
            coll[0],  // exact duplicate of coll[0]
            
            new Item('7'), 
            new Item('8')
        ];
        
        assert.throws(
            function() {
                coll._preAccept(insert);
            }, /matches existing one.*~=/, 
            "Throws on non-exact match w/o update props/routine"
        );

        // we don't update name since we use it as index
        coll.setUpdateProperties(['descr', 'date']); 
        
        assert.throws(
            function() {
                coll._preAccept(insert);
            }, /Item already in collection.*===/, 
            "Throws on exact match + ignoreExactMatches === false"
        );
                
        coll.setIgnoreExactMatches(true);
        
        v = coll._preAccept(insert);
        
        assert.ok(v[0][0] === insert[2], "_preAccept: item w/o match is in res[0]");
        assert.ok(v[0][1] === insert[3], "_preAccept: item w/o match is in res[0]");
      
        assert.ok(v[1][0] === insert[0], "_preAccept: item with non-exact match is in res[1]");
        assert.ok(v[2][0] === coll[2], "_preAccept: non-exact match is in res[2]");
        assert.ok(v[3][0] === 0, "_preAccept: index of item with non-exact match is in res[3]");
        
        assert.ok(v[1][1] === insert[1], "_preAccept: item with exact match is in res[1]");
        assert.ok(v[2][1] === coll[0], "_preAccept: exact match is in res[2]");
        
        assert.ok(v[1][1] === insert[1], "_preAccept: item with exact match is in res[1]");
        assert.ok(v[2][1] === coll[0], "_preAccept: exact match is in res[2]");
        assert.ok(v[3][0] === 0, "_preAccept: index of item with exact match is in res[3]");

    });
    
    QUnit.test("Collection - association and dissociation", function(assert) {
        
        var ia = new Item('item A', 'a item', '2016-01-01');
        var ib = new Item('item B', 'b item', '2015-02-02');
        var ic = new Item('item C', 'c item', '2014-03-03');
        
        var c = new Amm.Collection({
            requirements: [Item],
            comparisonProperties: ['name'],
            updateProperties: ['descr', 'date'],
            indexProperty: 'index',
            assocProperty: 'parent',
            defaults: {
                tag: 'xxx'
            },
            changeEvents: ['nameChange', 'descrChange', 'dateChange', 'tagChange']
        });
        
        var r = c.accept(ia);
        
        assert.ok(c[0] === ia, 'Item is added');
        assert.equal(r, ia, '.accept returns added item');
        assert.equal(ia.getParent(), c, 'parentProperty is set');
        assert.equal(ia.getIndex(), 0, 'indexProperty is set');
        assert.equal(ia.getTag(), c.getDefaults().tag, 'defaults are set');
        assert.ok(ia.getSubscribers(undefined, undefined, c).length > 0,
            'Item has the collection subscribed');
        
        var ev = [];
        
        var m = c.acceptMany([ib, ic]);
        
        assert.ok(m[0] === ib && m[1] === ic, 'acceptMany() returns added instances in proper order');
        
        assert.ok(c[1] === ib && c[2] === ic, 'acceptMany(): items are added');
        assert.equal(ib.getParent(), c, 'acceptMany(): parentProperty is set');
        assert.equal(ib.getIndex(), 1, 'acceptMany(): indexProperty is set');
        assert.equal(ib.getTag(), c.getDefaults().tag, 'acceptMany(): defaults are set');
        assert.ok(ib.getSubscribers(undefined, undefined, c).length > 0,
            'acceptMany(): Item has the collection subscribed');
        
        c.subscribe('itemChange', function(item) {
            ev.push(item);
        });
        ia.setDescr('foo');
        ib.setDescr('bar');
        ic.setDescr('baz');
        
        assert.equal(ev[0], ia, 'itemChange event is triggered');
        assert.equal(ev[1], ib, 'itemChange event is triggered');
        assert.equal(ev[2], ic, 'itemChange event is triggered');
        
        var hadParentDuringDelete = 'dummy';
        
        ia.subscribe('parentChange', function(newParent, oldParent) {
            hadParentDuringDelete = oldParent.hasItem(this);
        });
        
        var rejected = c.reject(ia);
        
        assert.ok(rejected, 'reject() returns ok on success');
        assert.equal(hadParentDuringDelete, false, 'oldParent.hasItem(this) === false during item.parentChange()');
        assert.equal(c.length, 2, 'collection length decreased after reject()'); 
        assert.equal(ia.getParent(), null, 'parentProperty is cleared');
        assert.equal(ia.getSubscribers(undefined, undefined, c).length, 0,
            'Item has the collection unsubscribed');
            
        assert.equal(ib.getIndex(), 0, 'indexes of remaining elements are shifted');
        assert.equal(ic.getIndex(), 1, 'indexes of remaining elements are shifted');
        
        assert.throws(function() {
            c.reject(ia);
        }, /non-ex/, 'Trying to reject items that\'s not in collection throws an ex.');
        
        assert.equal(c.indexOf({
            name: 'item C'
        }), 1, 'indexOf() works when comparisonProperties are set');
        
        assert.ok(c.reject(0), 'Can reject the item by index');
        
        assert.ok(c.reject({
            name: 'item C'
        }, true), 'Can reject with non-strict option');
        
        assert.equal(c.length, 0, 'Zero length after all elements deleted');
        
    });
    
    
    
    
}) ();

