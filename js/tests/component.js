/* global Amm */

(function() { 
    QUnit.module("Trait.Component");
    
    var ids = function(items) {
        var res = Amm.getProperty(items, 'id');
        res.sort();
        return res;
    };
    
    var softIds = function(items) {
        if (typeof items === 'object') {
            if (items instanceof Array || items.getItems) {
                var res = [];
                for (var i = 0, l = items.length; i < l; i++)
                    res.push(softIds(items[i]));
                return res;
            }
            if (items.getId) return items.getId();
        }
        return items;
    };
    
    var byIds = function(items) {
        var res = {};
        for (var i = 0; i < items.length; i++) {
            var id = items[i].getId();
            if (id) {
                res[id] = items[i];
            }
        }
        return res;
    };
    
    var log = [];
        
    var hasInLog = function(log, item) {
        for (var i = 0, l = log.length; i < l; i++) {
            var ok = true;
            for (var ii = 0, ll = item.length; ii < ll; ii++) {
                var eq = false;
                if (log[i][ii] instanceof Array && item[ii] instanceof Array) eq = Amm.Array.equal(log[i][ii], item[ii]);
                else eq = (log[i][ii] === item[ii]);
                if (!eq) { 
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    };
    
    var rep = function(v) {
        return function() {
            var e = [];
            if (v !== undefined) e.push(v);
            e.push(this.getId() + ':' + Amm.event.origin.getId() + '.' + Amm.event.name);
            for (var i = 0; i < arguments.length; i++) e.push(arguments);
            log.push(e);
        };
    };
    
    var comIds = function(items) {
        var res = {};
        for (var i = 0; i < items.length; i++) {
            var id = items[i].getId(), c = items[i].getComponent();
            if (id) {
                res[id] = c? c.getId() : null;
            }
        }
        return res;
    };
    
    var revIds = function(items) {
        var bi = comIds(items);
        var res = {};
        for (var i in bi) if (bi.hasOwnProperty(i)) {
            var p = '' + bi[i];
            if (!res[p]) res[p] = [];
            res[p].push(i);
            res[p].sort();
        }
        return res;
    };
    
    var createTestStructure = function() {
       var a = new Amm.Element({
           id: 'a', traits: ['Amm.Trait.Composite', 'Amm.Trait.Component'],
           handle__valueChange: rep('*'),
           handle__a1__valueChange: rep('a1')
       });
       var a1 = new Amm.Element({id: 'a1', traits: ['Amm.Trait.Field'], parent: a});
       var a2 = new Amm.Element({id: 'a2', traits: ['Amm.Trait.Field'], parent: a});
       var a3 = new Amm.Element({id: 'a3', traits: ['Amm.Trait.Field'], parent: a});
       var adp = new Amm.Element({
           id: 'adp', traits: ['Amm.Trait.DisplayParent', 'Amm.Trait.Component'],
           handle__valueChange: rep('*'),
           handle__adp1__valueChange: rep('adp1'),
           handle__xx__valueChange: rep('xx'),
           parent: a
       });
       var adp1 = new Amm.Element({id: 'adp1', traits: ['Amm.Trait.Field', 'Amm.Trait.Visual']});
       var adp2 = new Amm.Element({id: 'adp2', traits: ['Amm.Trait.Field', 'Amm.Trait.Visual']});
       var adp3 = new Amm.Element({id: 'adp3', traits: ['Amm.Trait.Field', 'Amm.Trait.Visual']});
       adp.setDisplayChildren([adp1, adp2, adp3]);
       
       var ac = new Amm.Element({
           id: 'ac', traits: ['Amm.Trait.Composite', 'Amm.Trait.Component'],
           parent: a
       });
       var ac1 = new Amm.Element({id: 'ac1', traits: ['Amm.Trait.Field'],
           parent: ac});
       var ac2 = new Amm.Element({id: 'ac2', traits: ['Amm.Trait.Field'],
           parent: ac});
       var ac3 = new Amm.Element({id: 'ac3', traits: ['Amm.Trait.Field'],
           parent: ac});
       
       var acc = new Amm.Element({
           id: 'acc', traits: ['Amm.Trait.Composite'], parent: ac
       });
       var acc1 = new Amm.Element({id: 'acc1', traits: ['Amm.Trait.Field'], 
           parent: acc});
       var acc2 = new Amm.Element({id: 'acc2', traits: ['Amm.Trait.Field'],
           parent: acc});
       var acc3 = new Amm.Element({id: 'acc3', traits: ['Amm.Trait.Field'],
           parent: acc});
       
       return [a, a1, a2, a3, adp, adp1, adp2, adp3, ac, ac1, ac2, ac3, acc, 
            acc1, acc2, acc3];
        
    };
    
    QUnit.test("Trait.Component basics", function(assert) {
       var tsa = createTestStructure();
       var t = byIds(tsa);
       assert.deepEqual(revIds(tsa), {
           'null': ['a'],
           'a': ['a1', 'a2', 'a3', 'ac', 'adp'],
           'adp': ['adp1', 'adp2', 'adp3'],
           'ac': ['ac1', 'ac2', 'ac3', 'acc', 'acc1', 'acc2', 'acc3']
       }, 'Initial components ownership');
       
       assert.deepEqual(ids(t.ac1.getUniqueSubscribers()), ['ac'], 'Component subscribed to the element');
       t.ac1.setParent(t.a);
       assert.equal(t.ac1.getComponent(), t.a, 'Composite: component changed with the parent');
       assert.deepEqual(ids(t.ac1.getUniqueSubscribers()), ['a'],
            'New component subscribed to the element (and old isn\'t)');
       t.ac1.setParent(t.ac);
       assert.deepEqual(ids(t.ac1.getUniqueSubscribers()), ['ac'],
            'Element successfully returned back');
       assert.ok(t.a1.getSubscribers('valueChange', undefined, t.a).length === 2,
            'Element has two subscriptions to valueChange: named and non-named');
       t.a1.setId('z');
       assert.ok(t.a1.getSubscribers('valueChange', undefined, t.a).length === 1,
            'Element lost one subscription after rename');
       t.a1.setId('a1');
       assert.ok(t.a1.getSubscribers('valueChange', undefined, t.a).length === 2,
            '...but when name changed back, got it again');
       t.ac.setIsComponent(false);
       assert.deepEqual(revIds(t.a.getElements()), {
           'a': ['a1', 'a2', 'a3', 'ac', 'ac1', 'ac2', 'ac3', 'acc', 'acc1', 'acc2', 'acc3', 'adp']
       }, 'composite.setIsComponent(false): children moved to the parent component');
       t.ac.setIsComponent(true);
       assert.deepEqual(revIds(t.a.getElements().concat(t.ac.getElements())), {
           'a': ['a1', 'a2', 'a3', 'ac', 'adp'],
           'ac': ['ac1', 'ac2', 'ac3', 'acc', 'acc1', 'acc2', 'acc3']
       }, 'composite.setIsComponent(true): children moved back');
       t.acc.setPassChildrenToComponent(false);
       assert.deepEqual(revIds(t.ac.getElements()), {
           'ac': ['ac1', 'ac2', 'ac3', 'acc'/*, 'acc1', 'acc2', 'acc3'*/]
       }, 'composite.setPassChildrenToComponent(false): children not in parent component anymore');
       t.acc.setPassChildrenToComponent(true);
       assert.deepEqual(revIds(t.ac.getElements()), {
           'ac': ['ac1', 'ac2', 'ac3', 'acc', 'acc1', 'acc2', 'acc3']
       }, 'composite.setPassChildrenToComponent(false): children added to the parent component');
       t.acc.setParent(t.a);
       assert.deepEqual(revIds(t.a.getElements()), {
           'a': ['a1', 'a2', 'a3', 'ac', 'acc', 'acc1', 'acc2', 'acc3', 'adp']
       }, 'composite parent change: children passed to new parent');
       t.adp.setIsComponent(false);
       assert.deepEqual(revIds(t.a.getElements()), {
           'a': ['a1', 'a2', 'a3', 'ac', 'acc', 'acc1', 'acc2', 'acc3', 'adp', 'adp1', 'adp2', 'adp3']
       }, 'DisplayParent.setIsComponent: children passed to the parent component');
       t.adp.setParent(t.ac);
       assert.deepEqual(revIds(t.a.getElements().concat(t.ac.getElements())), {
           'a': ['a1', 'a2', 'a3', 'ac', 'acc', 'acc1', 'acc2', 'acc3'],
           'ac': ['ac1', 'ac2', 'ac3', 'adp', 'adp1', 'adp2', 'adp3']
       }, 'DisplayParent.setParent(): children passed to the parent component');
       t.ac.callElements('setValue', 1);
       assert.deepEqual(Amm.getProperty([t.ac1, t.ac2, t.ac3, t.adp1, t.adp2, t.adp3], 'value'), [1, 1, 1, 1, 1, 1],
        'callElements(methodName) works');
       var l = [];
       t.ac.callElements(function() { l.push(this.getId()); });
       l.sort();
       assert.deepEqual(l, ['ac1', 'ac2', 'ac3', 'adp', 'adp1', 'adp2', 'adp3'], 'callElements(function) works');
       t.adp.setPassDisplayChildrenToComponent(false);
       assert.deepEqual(revIds([].concat(t.adp.getDisplayChildren().getItems())), {
           'null': ['adp1', 'adp2', 'adp3']
       }, 'DisplayParent.setPassDisplayChildrenToComponent(false)');
       t.adp.setIsComponent(true);
       t.adp.setPassDisplayChildrenToComponent(true);
       assert.deepEqual(revIds([].concat(t.adp.getDisplayChildren().getItems())), {
           'adp': ['adp1', 'adp2', 'adp3']
       }, 'DisplayParent.setPassDisplayChildrenToComponent(false)');
       t.adp2.setId('adp1');
       assert.ok(t.adp.getNamedElement('adp2') === undefined);
       assert.ok(t.adp.getNamedElement('adp1') === t.adp1);
       assert.ok(t.adp.getNamedElement('adp1', 1) === t.adp2);
       assert.ok(t.adp.getAllNamedElements('adp1')[0] === t.adp1);
       assert.ok(t.adp.getAllNamedElements('adp1')[1] === t.adp2);
       assert.ok(t.adp.getNamedElement('component') === t.adp);
       assert.ok(t.adp.getNamedElement('a1') === undefined);
       assert.ok(t.adp.getNamedElement('a1', 0, true) === t.a1);
       assert.ok(t.adp.getAllNamedElements('component', true)[0] === t.adp);
       assert.ok(t.adp.getAllNamedElements('component', true)[1] === t.ac);
       assert.ok(t.adp.getAllNamedElements('component', true)[2] === t.a);
    });
    
    QUnit.test("Trait.Component events", function(assert) {
       var tsa = createTestStructure();
       var t = byIds(tsa);
       
       var adpc = new Amm.Element({
           id: 'adpc', traits: ['Amm.Trait.Composite', 'Amm.Trait.Component', 'Amm.Trait.Visual'], 
           displayParent: t.adp
       });
       var adpc1 = new Amm.Element({id: 'adpc1', traits: ['Amm.Trait.Field'], 
           parent: adpc});
       var adpc2 = new Amm.Element({id: 'adpc2', traits: ['Amm.Trait.Field'],
           parent: adpc});
       var adpc3 = new Amm.Element({id: 'adpc3', traits: ['Amm.Trait.Field'],
           parent: adpc});
       
        tsa.push(adpc, adpc1, adpc2, adpc3);
        
        t = byIds(tsa);
        
        var evlog = [];
        
        var hdl = function() {
            var args = [Amm.event.name, Amm.event.origin].concat(Array.prototype.slice.apply(arguments));
            evlog.push(softIds(args));
        };
        
        var evs = ['renamedElement', 'acceptedElements', 'rejectedElements', 
            'renamedInScope', 'acceptedInScope', 'rejectedInScope', 'childComponentStatusChange', 
            'childComponentStatusChangeInScope'
        ];
        for (var i = 0, l = tsa.length; i < l; i++) {
            if (tsa[i].Component === '__INTERFACE__') {
                for (var ii = 0, ll = evs.length; ii < ll; ii++)  {
                    tsa[i].subscribe(evs[ii], hdl);
                }
            }
        }
        
        evlog = [];
        t.a.rejectElements([t.a1, t.a2]);
        assert.ok(hasInLog(evlog, ['rejectedElements', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['rejectedInScope', 'a', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['rejectedInScope', 'ac', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['rejectedInScope', 'adp', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['rejectedInScope', 'adpc', 'a', ['a1', 'a2']]));
        
        evlog = [];
        t.a.acceptElements([t.a1, t.a2]);
        assert.ok(hasInLog(evlog, ['acceptedElements', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['acceptedInScope', 'a', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['acceptedInScope', 'ac', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['acceptedInScope', 'adp', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['acceptedInScope', 'adpc', 'a', ['a1', 'a2']]));
        
        evlog = [];
        t.a1.setId('ax');
        assert.ok(hasInLog(evlog, ['renamedElement', 'a', 'ax', 'ax', 'a1']));
        assert.ok(hasInLog(evlog, ['renamedInScope', 'a', 'a', 'ax', 'ax', 'a1']));
        assert.ok(hasInLog(evlog, ['renamedInScope', 'ac', 'a', 'ax', 'ax', 'a1']));
        assert.ok(hasInLog(evlog, ['renamedInScope', 'adp', 'a', 'ax', 'ax', 'a1']));
        assert.ok(hasInLog(evlog, ['renamedInScope', 'adpc', 'a', 'ax', 'ax', 'a1']));
        
        t.ac.setIsComponent(false);
        assert.ok(hasInLog(evlog, ['childComponentStatusChange', 'a', 'ac', false]));
        assert.ok(hasInLog(evlog, ['childComponentStatusChangeInScope', 'a', 'a', 'ac', false]));
        assert.ok(hasInLog(evlog, ['childComponentStatusChangeInScope', 'adp', 'a', 'ac', false]));
        evlog = [];
        t.a1.setId('a1');
        t.a.rejectElements([t.a1, t.a2]);
        t.a.acceptElements([t.a1, t.a2]);
        assert.notOk(hasInLog(evlog, ['rejectedInScope', 'ac', 'a', ['a1', 'a2']]));
        assert.notOk(hasInLog(evlog, ['acceptedInScope', 'ac', 'a', ['a1', 'a2']]));
        assert.notOk(hasInLog(evlog, ['renamedInScope', 'ac', 'a', 'a1', 'a1', 'ax']));
        
        t.a1.setId('ax');
        t.ac.setIsComponent(true);
        assert.ok(hasInLog(evlog, ['childComponentStatusChange', 'a', 'ac', true]));
        assert.ok(hasInLog(evlog, ['childComponentStatusChangeInScope', 'a', 'a', 'ac', true]));
        assert.ok(hasInLog(evlog, ['childComponentStatusChangeInScope', 'adp', 'a', 'ac', true]));
        assert.ok(hasInLog(evlog, ['childComponentStatusChangeInScope', 'ac', 'a', 'ac', true]));
        evlog = [];
        t.a1.setId('a1');
        t.a.rejectElements([t.a1, t.a2]);
        t.a.acceptElements([t.a1, t.a2]);
        assert.ok(hasInLog(evlog, ['rejectedInScope', 'ac', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['acceptedInScope', 'ac', 'a', ['a1', 'a2']]));
        assert.ok(hasInLog(evlog, ['renamedInScope', 'ac', 'a', 'a1', 'a1', 'ax']));
        
   });
    
    
}) ();