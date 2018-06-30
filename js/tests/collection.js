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
        
        aCount: 0,
        
        dCount: 0,
        
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
            if (parent) this.aCount++;
                else this.dCount++;
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

    QUnit.test("Collection - sorted", function(assert) {

        // Let's test this freaky freak
        
        var ia = new Item('A', 'a item', '2016-01-01');
        var ib = new Item('B', 'b item', '2015-02-02');
        var ic = new Item('C', 'c item', '2014-03-03');
        var id = new Item('D', 'd item', '2013-04-04');
        var ie = new Item('E', 'e item', '2012-05-05');
        var i_f = new Item('F', 'f item', '2011-08-08');

        var ia_first = new Item('A', 'A first', '2011-06-06');
        var ib_before_d = new Item('B', 'B before D', '2013-04-01');
        var ic_samepos = new Item('C', 'C updated', '2014-03-03');
        
        var c = new Amm.Collection({
            requirements: [Item],
            comparisonProperties: ['name'],
            updateProperties: ['descr', 'date'],
            sortProperties: ['date'],
            indexProperty: 'index',
            assocProperty: 'parent',
            changeEvents: ['nameChange', 'descrChange', 'dateChange', 'tagChange']
        });
        
        assert.throws(function() { c.accept(ia, 1); }, 
            /`index` must not be used with sorted Collection/, 
            '`index` must not be used with sorted Collection'
        );

        assert.throws(function() { c.acceptMany([ia], 1); }, 
            /`index` must not be used with sorted Collection/, 
            '`index` must not be used with sorted Collection'
        );
        
        var r = c.acceptMany([ib, id]);
        
        assert.ok(r[0] === ib && r[1] === id, 'acceptMany() returned new elements in original order');
        
        assert.ok(c[0] === id && c[1] === ib, 'elements took their places according to sort order');
        
        c.accept(ic);
        c.accept(ia);
        c.accept(ie);
        
        assert.deepEqual(c.getItems(), [ie, id, ic, ib, ia], 'elements in proper order');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'index'), [0, 1, 2, 3, 4], 'indexes are properly reported');
        
        // update element a
        
        assert.equal(c.indexOf(ia_first), ia.getIndex(), 'Non-strict match');

        c.setUpdateFn(function(myItem, updateSrc) {
            myItem.setTag(myItem.getTag() + 1);
        });
        
        ia.setTag(0);
        
        r = c.accept(ia_first);
        assert.equal(r, ia, 'Updated instance is returned');
        assert.equal(ia.getTag(), 1, 'updateFn was called');
        c.setUpdateFn(null);
        
        assert.deepEqual(
            Amm.getProperty(ia, ['descr', 'date']), 
            Amm.getProperty(ia_first, ['descr', 'date']), 
            'Matching element is updated'
        );
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), 
            ['A', 'E', 'D', 'C', 'B'], 
            'updated element got to first place (according to the sort order)'
        );
        assert.deepEqual(Amm.getProperty(c.getItems(), 'index'), [0, 1, 2, 3, 4], 'indexes are properly reported');
        
        ib.setDate('2010-10-10');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), 
            ['B', 'A', 'E', 'D', 'C'], 
            'element that was changed and raised the event got to first place (according to the sort order)'
        );

        c.setRecheckUniqueness(true);
        assert.throws(function() {
            ia.setName('D');
        }, /After the change.*duplicate\(s\) appeared/,
        'recheckUniqueness works');
        ia.setName('A');
        
        var r1 = c._preAccept([ib_before_d, i_f, ic_samepos]);
        r = c.acceptMany([ib_before_d, i_f, ic_samepos]);
        assert.ok(r[0] === ib, 'acceptMany() result - updated instance 1');
        assert.ok(r[1] === i_f, 'acceptMany() result - original instance');
        assert.ok(r[2] === ic, 'acceptMany() result - updated instance 2');
        
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), 
            ['A', 'F', 'E', 'B', 'D', 'C'], 
            'element that was changed and raised the event got to proper place (according to the sort order)'
        );
        assert.deepEqual(Amm.getProperty(c.getItems(), 'index'), [0, 1, 2, 3, 4, 5], 'indexes are properly reported');
        
        assert.throws(function() {
            c.moveItem(0, 3);
        }, /Cannot moveItem.*sorted/,
        'cannot moveItem() in sorted collection');

        assert.deepEqual(c.reverse(), [ic, id, ib, ie, i_f, ia], 'revese() works on sorted collection');
        
        var c2 = new Amm.Collection({
            requirements: [Item],
            sortProperties: ['date'],
            indexProperty: 'index',
            assocProperty: 'parent'
        });
        c2.push(ia); // just wanna know we throw no errors
        c2.push(ib);
        var spl = [];
        var ins = [];
        c2.subscribe('spliceItems', function(index, cut, insert) {
            spl.push([index, Amm.getProperty(cut, 'name'), Amm.getProperty(insert, 'name')]);
        });
        c2.subscribe('insertItem', function(item, index) {
            ins.push([item, index]);
        });
        c2.clearItems();
        assert.deepEqual(spl,
        [[0, ['A', 'B'], []]], 'proper spliceItems is called upon sorted collecton\' clearItems()');
        assert.deepEqual(ins, [], 'insertItems is not triggered upon sorted collecton\' clearItems()');
        
    });
    
    QUnit.test("Collection - sorted - splice" , function(assert) {

        var ia = new Item('A', 'a item', '2016-01-01');
        var ib = new Item('B', 'b item', '2015-02-02');
        var ic = new Item('C', 'c item', '2014-03-03');
        var id = new Item('D', 'd item', '2013-04-04');
        var ie = new Item('E', 'e item', '2012-05-05');

        var ib_first = new Item('B', 'b first', '2011-01-01');

        var c = new Amm.Collection({
            requirements: [Item],
            comparisonProperties: ['name'],
            updateProperties: ['descr', 'date'],
            sortProperties: ['date'],
            indexProperty: 'index',
            assocProperty: 'parent',
            changeEvents: ['nameChange', 'descrChange', 'dateChange', 'tagChange'],
            items: [ia, ib, ic, ie]
        });
        
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), 
            ['E', 'C', 'B', 'A'], 
            'proper initial order'
        );

        var pa = c._preAccept([id, ib_first], 1, 3);
        assert.ok(pa[0].length === 1 && pa[0][0] === id, 'Re-inserted non-exact match is not considered new');
        
        var r = c.splice(1, 3, id, ib_first);
        
        assert.deepEqual(Amm.getProperty(r, 'name'), 
            ['C', 'B', 'A'], 'proper items are returned by splice()'
        );
        
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'),
            ['B', 'E', 'D'], 'proper items order after splice-with-update'
        );

        ib.setDate('2015-02-02');
        c.setUpdateProperties(null);
        
        var pa = c._preAccept([ia, ib, ic], 0, c.length);
        assert.ok(pa[4].length === 2 && pa[4][0] === ie && pa[4][1] === id, 'Proper delete detection');

        c.setItems([ia, ib, ic, ie]);
        
        var pa = c._preAccept([id, ib], 1, 3);
        assert.ok(pa[0].length === 1 && pa[0][0] === id, 'Re-inserted exact match is not considered new');
        
    });
    
    QUnit.test("Collection - unsorted", function(assert) {

        var ia = new Item('A', 'a item');
        var ib = new Item('B', 'b item');
        var ic = new Item('C', 'c item');
        var id = new Item('D', 'd item');
        var ie = new Item('E', 'e item');
        var i_f = new Item('F', 'f item');

        var ia_up = new Item('A', 'A updated');
        var ib_up = new Item('B', 'B updated');
        var ic_up = new Item('C', 'C updated');
        
        var c = new Amm.Collection({
            requirements: [Item],
            comparisonProperties: ['name'],
            updateProperties: ['descr'],
            indexProperty: 'index',
            assocProperty: 'parent',
            changeEvents: ['nameChange', 'descrChange', 'tagChange']
        });
        
        var r = c.acceptMany([ib, ie]);
        
        assert.ok(r[0] === ib && r[1] === ie, 'acceptMany() returned new elements in original order');
        assert.ok(c[0] === ib && c[1] === ie, 'elements took their places according to provided order');
        
        var r = c.accept(ia, 0);
        assert.ok(r === ia, 'accept() returns new element');
        assert.equal(ia.getIndex(), 0, 'item is placed where asked');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'index'), [0, 1, 2], 'indexes are properly reported');        
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), ['A', 'B', 'E'], 'items are in places');
        
        var r = c.acceptMany([ia_up, ic, id], 2);
        assert.ok(r[0] === ia, r[1] === ic, r[2] === id, 'mixed matching vs new returned');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), ['A', 'B', 'C', 'D', 'E'], 'items are in places');
        assert.equal(ia.getDescr(), 'A updated', 'Matching item is updated');
        
        var s = c.splice(1, 3, id, ib_up);
        assert.deepEqual(Amm.getProperty(s, 'name'), ['B', 'C', 'D'], 'splice() returned proper items');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), ['A', 'D', 'B', 'E'], 'items after splice are in places');
        assert.equal(id.dCount, 0, 'reinserted element is not dissociated');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'index'), [0, 1, 2, 3], 'indexes are properly reported');        
        assert.equal(ib.getDescr(), ib_up.getDescr(), 'element is updated');
        assert.equal(ib.dCount, 0, 'updated element is not dissociated');
        assert.equal(ic.dCount, 1, 'spliced, not reinserted or updated element is dissociated');

        c.moveItem(0, 3);
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), ['D', 'B', 'E', 'A'], 'moveItem() works');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'index'), [0, 1, 2, 3], 'indexes are properly reported');

        c.moveItem(2, 1);
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), ['D', 'E', 'B', 'A'], 'moveItem() reverse dir/n works');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'index'), [0, 1, 2, 3], 'indexes are properly reported');
        
        c.reverse();
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), ['A', 'B', 'E', 'D'], 'reverse()');
        assert.deepEqual(Amm.getProperty(c.getItems(), 'index'), [0, 1, 2, 3], 'indexes are properly reported');
        
        c.setItems([ia, ib, ic, id]);
        c.splice(1, c.length - 1);
        assert.deepEqual(Amm.getProperty(c.getItems(), 'name'), ['A'], 'splice() with no insert deletes items');
        
        Amm.setProperty([ia, ib, ic, id], 'parent', null);
        
        c.setItems([i_f, ie]);
        c.setItems([ia, ib, ic, id]);
        assert.ok(ia.getParent() === c, 'parent set after setItems()');
    });
    
    QUnit.test("Collection.assoc", function(assert) {
        var a = new Item;
        var b = new Item;
        var c = new Item;
        var coll = new Amm.Collection({items: [a, b]});
        var parent = {};
        coll.setAssocProperty('parent');
        assert.ok(a.getParent() === coll && b.getParent() === coll, 'setAssocProperty() - initial - set reference to the collection');
        coll.setAssocProperty('tag');
        assert.ok(a.getParent() === null && b.getParent() === null, 'setAssocProperty() - changed - set old prop to null');
        assert.ok(a.getTag() === coll && b.getTag() === coll, 'setAssocProperty() - changed - set reference to the collection');
        coll.setAssocInstance(parent);
        assert.ok(a.getTag() === parent && b.getTag() === parent, 'setAssocInstance() - set item references to the provided instance');
        coll.accept(c);
        assert.ok(c.getTag() === parent, 'accept()\'ed instance has $assocProperty set to $assocInstance');
    });
    
    QUnit.test("Collection - sort by props, non-permanently" , function(assert) {

        var ia = new Item('A', 'a item', '2016-01-01');
        var ib = new Item('B', 'b item', '2015-02-02');
        var ic = new Item('C', 'c item', '2014-03-03');
        var id = new Item('D', 'd item', '2013-04-04');
        var ie = new Item('E', 'e item', '2012-05-05');
        
        var coll = new Amm.Collection({items: [id, ib, ia, ic, ie]});
        coll.sort(['name']);
        assert.deepEqual(Amm.getProperty(coll.getItems(), 'name'), ['A', 'B', 'C', 'D', 'E']);
        coll.sort(['date']);
        assert.deepEqual(Amm.getProperty(coll.getItems(), 'date'), 
            ['2012-05-05', '2013-04-04', '2014-03-03', '2015-02-02', '2016-01-01']
        );
        coll.setSortReverse(true);
        coll.sort(['name']);
        assert.deepEqual(Amm.getProperty(coll.getItems(), 'name'), 
            ['E', 'D', 'C', 'B', 'A']
        );
    });
    
    QUnit.test("Collection - observeIndexProperty" , function(assert) {

        var ia = new Item('A', 'a item', '2016-01-01');
        var ib = new Item('B', 'b item', '2015-02-02');
        var ic = new Item('C', 'c item', '2014-03-03');
        var id = new Item('D', 'd item', '2013-04-04');
        var ie = new Item('E', 'e item', '2012-05-05');
        
        var coll = new Amm.Collection({items: [ia, ib, ic, id, ie], indexProperty: 'index', observeIndexProperty: true});
        coll.sort(['name']);
        assert.deepEqual(Amm.getProperty(coll.getItems(), 'index'), [0, 1, 2, 3, 4]);
        assert.deepEqual(Amm.getProperty(coll.getItems(), 'name'), ['A', 'B', 'C', 'D', 'E']);
        ie.setIndex(0);
        assert.deepEqual(Amm.getProperty(coll.getItems(), 'index'), [0, 1, 2, 3, 4]);
        assert.deepEqual(Amm.getProperty(coll.getItems(), 'name'), ['E', 'A', 'B', 'C', 'D']);
        coll.setSortProperties('name');
        assert.deepEqual(Amm.getProperty(coll.getItems(), 'name'), ['A', 'B', 'C', 'D', 'E']);
        Amm.cleanup(coll, ia, ib, ic, id, ie);
        
    });
    
    QUnit.test("Collection - assocEvents", function(assert) {
        var ia = new Item('A', 'a item', '2016-01-01');
        var ib = new Item('B', 'b item', '2015-02-02');
        
        var handler = function() {
        };
        
        var a1 = {
            id: 'a1',
            descrChange: handler,
            dateChange: handler
        };
        
        var a2 = {
            id: 'a2',
            descrChange: handler,
            dateChange: handler
        };
        
        var coll = new Amm.Collection({
            items: [ia],
            assocInstance: a1,
            assocEvents: {
                descrChange: 'handler'
            }
        });
        
            assert.equal(ia.getSubscribers('descrChange').length, 1);
            assert.equal(ia.getSubscribers('dateChange').length, 0);
            assert.equal(ia.getSubscribers('descrChange', 'handler', a1).length, 1);
        
        coll.setAssocEvents({
            dateChange: 'handler'
        });
        
            assert.equal(ia.getSubscribers('descrChange').length, 0);
            assert.equal(ia.getSubscribers('dateChange').length, 1);
            assert.equal(ia.getSubscribers('dateChange', 'handler', a1).length, 1);
        
        coll.setAssocInstance(null);
        
            assert.equal(ia.getSubscribers('dateChange', 'handler', a1).length, 0);
            assert.equal(ia.getSubscribers('dateChange', 'handler', coll).length, 1);
            
        coll.setAssocInstance(a2);
            
            assert.equal(ia.getSubscribers('dateChange', 'handler', coll).length, 0);
            assert.equal(ia.getSubscribers('dateChange', 'handler', a2).length, 1);
            
        coll.reject(ia);
        
            assert.equal(ia.getSubscribers('dateChange').length, 0);
            
        coll.accept(ib);
        
            assert.equal(ib.getSubscribers('dateChange', 'handler', a2).length, 1);
            
        Amm.cleanup(coll, ia, ib);
            
    });
    
    
}) ();

