/* global Amm */
/* global QUnit */

(function() { 
    QUnit.module("FilterSorter");

    var names = function(people) {
        return Amm.getProperty(people, "name");
    };

    var getSample = function() {
        
        var departments = [
            new Amm.Element({prop__name: "Design", prop__location: "USA"}),
            new Amm.Element({prop__name: "Testing", prop__location: "USA"}),
            new Amm.Element({prop__name: "Sales", prop__location: "USA"}),
            new Amm.Element({prop__name: "Development", prop__location: "Ukraine"})
        ];
        
        var d = {};
        
        for (var i = 0, l = departments.length; i < l; i++) d[departments[i].getName()] = departments[i];
        
        var people = [
            new Amm.Element({prop__name: "Jane", prop__department: d.Sales, prop__age: "41", prop__technology: "PHP"}),
            new Amm.Element({prop__name: "Mike", prop__department: d.Design, prop__age: "38", prop__technology: "Javascript"}),
            new Amm.Element({prop__name: "John", prop__department: d.Testing, prop__age: "27", prop__technology: "Javascript"}),
            new Amm.Element({prop__name: "Anna", prop__department: d.Development, prop__age: "36", prop__technology: "PHP"}),
            new Amm.Element({prop__name: "Vika", prop__department: d.Development, prop__age: "20", prop__technology: "PHP"}),
            new Amm.Element({prop__name: "Ivan", prop__department: d.Development, prop__age: "40", prop__technology: "Javascript"}),
            new Amm.Element({prop__name: "Buck", prop__department: d.Development, prop__age: "25", prop__technology: "SQL"}),
            new Amm.Element({prop__name: "Dmitry", prop__department: d.Testing, prop__age: "31", prop__technology: "SQL"})
        ];
        
        var p = {};
        
        for (var i = 0, l = people.length; i < l; i++) p[people[i].getName()] = people[i];
 
        return {
            departments: departments,
            people: people,
            d: d,
            p: p
        };
        
    };
    
    QUnit.test("Filter.Condition.testValue", function(assert) {
      
        var comment;
      
        comment = "{ only: [`criterion`, `criterion`, `criterion`] }: when array `value` provided, all items should match at least one of specified criteria";
        assert.ok(Amm.Filter.Condition.testValue([1, 2, 3, 2, 1, 3], {only: [1, 2, 3]}), comment);
        assert.notOk(Amm.Filter.Condition.testValue([1, 2, 4, 2, 1, 4], {only: [1, 2, 3]}), comment);
        
        comment = "{ and: ['`criterion`, `criterion`, `criterion`] }: value must meet ALL of specified criteria; when array `value` provided, all items must match all specified criteria";
        assert.ok(Amm.Filter.Condition.testValue('foobar', {and: [/foo/, /bar/]}), comment);
        assert.ok(Amm.Filter.Condition.testValue(['foobar', 'barfoo', 'foo'], {and: [/foo/, /bar/]}), comment);
        assert.notOk(Amm.Filter.Condition.testValue('foo', {and: [/foo/, /bar/]}), comment);
        
        comment = "{ not: `criterion` }: TRUE if value does NOT meet specified criterion";
        assert.ok(Amm.Filter.Condition.testValue('foo', {not: 'bar'}), comment);
        assert.notOk(Amm.Filter.Condition.testValue('foo', {not: 'foo'}), comment);
        
        comment = "function(value): callback that returns true if test is passed";
        assert.ok(Amm.Filter.Condition.testValue('xx', function(v) {return v == 'xx';}), comment);
        assert.notOk(Amm.Filter.Condition.testValue('yy', function(v) { return v == 'xx';}), comment);
        
        comment = "{ fn: function(value), [scope: object] }: callback that will be called with provided scope";
        assert.ok(Amm.Filter.Condition.testValue('xx',{fn: function(v) {return v == this.test}, scope: {test: 'xx'}}), comment);
        assert.notOk(Amm.Filter.Condition.testValue('xx',{fn: function(v) {return v == this.test}, scope: {test: 'yy'}}), comment);
        assert.ok(Amm.Filter.Condition.testValue('zz',{fn: function(v) {return v == 'zz'}}), comment);
        
        comment = "/RegExp/: value matches RegExp";
        assert.ok(Amm.Filter.Condition.testValue('foobar', /foo/), comment);
        assert.notOk(Amm.Filter.Condition.testValue('foobar', /abc/), comment);
        
        comment = "{ regExp: '/RegExp/', [flags: 'flags'] }: value matches RegExp (with provided string definition)";
        assert.ok(Amm.Filter.Condition.testValue('FOOBAR', { regExp: "foo", flags: "i" }), comment);
        assert.notOk(Amm.Filter.Condition.testValue('FOOBAR', { regExp: "foo" }), comment);
        
        comment = "{ validator: `validator` }: value passes Amm.Validator (prototype may be provided instead of instance)";
        assert.ok(Amm.Filter.Condition.testValue(10, { validator: new Amm.Validator.Number({gt: 9, lt: 11})}), comment);
        assert.ok(Amm.Filter.Condition.testValue(10, { validator: { class: "Amm.Validator.Number", gt: 9, lt: 11 } }), comment);
        assert.notOk(Amm.Filter.Condition.testValue('zz', { validator: new Amm.Validator.Number({gt: 9, lt: 11})}), comment);
        assert.notOk(Amm.Filter.Condition.testValue('zz', { validator: { class: "Amm.Validator.Number", gt: 9, lt: 11 } }), comment);
        
        comment = "Amm.Validator instance: value passes Amm.Validator";
        assert.ok(Amm.Filter.Condition.testValue(10, new Amm.Validator.Number({gt: 9, lt: 11})), comment);
        assert.notOk(Amm.Filter.Condition.testValue('zz', new Amm.Validator.Number({gt: 9, lt: 11})), comment);
        
        comment = "{ rq: `requirements` }: Amm.meetsRequirements(value, `requirements`";
        assert.ok(Amm.Filter.Condition.testValue(new Amm.Element, {rq: ['Amm.Element']}), comment);
        assert.notOk(Amm.Filter.Condition.testValue(new Amm.WithEvents, {rq: ['Amm.Element']}), comment);
        
        comment = "{ strict: `testValue` }: value === `value` (force strict comparison)";
        assert.ok(Amm.Filter.Condition.testValue(3, {strict: 3}), comment);
        assert.notOk(Amm.Filter.Condition.testValue(3, {strict: '3'}), comment);
        
        comment = "`otherCriterion`: value == `otherCriterion` (all other criterion values: non-strict comparison)";
        assert.ok(Amm.Filter.Condition.testValue(3, 3), comment);
        assert.ok(Amm.Filter.Condition.testValue(3, '3'), comment);
        assert.notOk(Amm.Filter.Condition.testValue(2, 3), comment);
        
        comment = "{ typeof: `type` }: typeof value === `type`";
        assert.ok(Amm.Filter.Condition.testValue('foo', {'typeof': 'string'}), comment);
        assert.notOk(Amm.Filter.Condition.testValue(3, {'typeof': 'string'}), comment);
        
    });
    
    QUnit.test("Filter.basic", function(assert) {
        
        var sam = getSample();
        
        var f = new Amm.Filter();
        
        f.setObservedObjects(sam.people);
        
        f.setConditions([
            {
                technology: 'PHP',
                _allowExpressions: false
            }
        ]);
        
        var currMatches;
        var matchingObjectsChangeCount = 0;
        
        f.subscribe('matchingObjectsChange', function(matchingObjects) {
            currMatches = names(matchingObjects);
            matchingObjectsChangeCount++;
        });
            
            assert.deepEqual(names(f.getObservedObjects()), names(sam.people), 
                'getObservedObjects() returns all objects');
            
            assert.deepEqual(names(f.getMatchingObjects()), 
                ['Jane', 'Anna', 'Vika'],
                'getMatchingObjects() return current objects');
            
        var deletedObject = sam.p['Jane'];
        
        var newList = Amm.Array.diff(sam.people, [deletedObject]);
        
        deletedObject.cleanup();
        
            assert.equal(f.getObservedObjects().length, sam.people.length - 1,
                "after observed object' cleanup() getObservedObjects() return " +
                "less items");
        
            assert.deepEqual(names(f.getObservedObjects()), names(newList),
                "cleanup()ed object is no longer observed");
        
            assert.deepEqual(currMatches, ['Anna', 'Vika'],
                "change event was triggered too");
            
        f.getConditions(1).setProps('Javascript', 'technology');
        
            assert.deepEqual(currMatches, ['Mike', 'John', 'Ivan'],
                "propCondition.setProps: change event, proper values");
        
        var mc = [];
        
        f.subscribe('matchesChange', function(objects, matches, oldMatches) {
            var a = [names(objects), matches, oldMatches];
            mc.push(a);
        });
        
        sam.p.John.setTechnology('PHP');
        
            assert.deepEqual(mc, [[['John'], [false], [1]]], 'outMatchesChange works');

        mc = [];
        matchingObjectsChangeCount = 0;
        f.beginUpdate();
        sam.p.John.setTechnology('Javascript');
        sam.p.Vika.setTechnology('Javascript');
        f.unobserveObject(sam.p.Ivan);
        f.endUpdate();
        
            assert.deepEqual(mc, [
                [['John', 'Vika', 'Ivan'], [1, 1, undefined], [false, false, 1]]
            ], 'no more than one matchesChange event during endUpdate');
            
            assert.deepEqual(currMatches, ['Mike', 'John', 'Vika'],
                "matchingObjectsChange triggered during endUpdate()");
            
            assert.deepEqual(matchingObjectsChangeCount, 1, 
                'no more than one matchingObjectsChange event during endUpdate()');
        
        
        var oldM = f.getMatchingObjects();
        matchingObjectsChangeCount = 0;
        f.beginUpdate();
        sam.p.John.setTechnology('PHP');
        sam.p.John.setTechnology('Javascript');
        f.endUpdate();
        
            assert.ok(f.getMatchingObjects() === oldM, 'non-changed getMatchingObjects() return same instance');
            assert.deepEqual(matchingObjectsChangeCount, 0, 
                'no matchingObjectsChange fired during endUpdate()');

        matchingObjectsChangeCount = 0;
        mc = [];
        
        f.beginUpdate();
        f.unobserveObject(sam.p.John);
        f.observeObject(sam.p.John);
        f.endUpdate();
        
            assert.equal(mc.length, 0, 'No matchesChange() event during beginUpdate/unobserve/observe/endUpdate');
            assert.equal(matchingObjectsChangeCount, 0, 'No matchingObjectsChange() event during beginUpdate/unobserve/observe/endUpdate');
        
        
        matchingObjectsChangeCount = 0;
        f.getConditions(1).setProps({
            technology: 'SQL',
            name: /B/
        });
        
            assert.equal(matchingObjectsChangeCount, 1, 'Changed 2 "props" - 1 change event');
            assert.deepEqual(currMatches, ['Buck']);
            
        assert.throws(function() {
            f.getConditions(1).setProps({
                'foo.bar': 'baz'
            });
        }, /set.*allowExpressions.*to true/, 
            'Error triggered when attempting to specify non-simple property in PropsCondition');
        
        
        Amm.cleanup(newList);
        
            assert.equal(f.getObservedObjects().length, 0, 
                "After all objects cleanup(), no object is observed");
        
    });

    QUnit.test("Filter.dispatching", function(assert) {
        
        var sam = getSample();
        
        var f = new Amm.Filter();
        
        f.setObservedObjects(sam.people);
        
        f.setConditions([
            {
                _id: 'p',
                _allowExpressions: false,
                technology: 'PHP',
            },
            {
                _id: 'pj',
                _allowExpressions: false,
                technology: ['PHP', 'Javascript'],
            }
        ]);
        
        var m = [], o = [];
        
        f.subscribe('matchingObjectsChange', function(objects) {
            o.push(names(objects));
        });
        
        f.subscribe('matchesChange', function(objects, matches, oldMatches) {
            m.push([names(objects), matches, oldMatches]);
        });
        
        assert.deepEqual(sam.people[0].getSubscribers('technologyChange').length, 1, 
            'Only one subscriber despite 2 conditions in the filter'
        );
        
        assert.equal(f.getMatch(sam.p.Vika), 'p', 'First matching condition ID is returned');
        assert.equal(f.getMatch(sam.p.John), 'pj', 'First matching condition ID is returned');
        
        sam.p.Vika.setTechnology('Javascript');
        assert.deepEqual(o, [], 'No matchingObjects change triggered despite matchesChange');
        assert.deepEqual(m, [[
            ['Vika'], ['pj'], ['p']
        ]], 'matchesChange triggered when object property referenced by two conditions is changed; only one event');

        Amm.cleanup(sam.people);
        
    });
    
    QUnit.test("Filter.changeConditions", function(assert) {
        
        var sam = getSample();
        
        var f = new Amm.Filter();
        
        var o = [], m = [];
        
        f.setObservedObjects(sam.people);
        
        f.subscribe('matchingObjectsChange', function(matchingObjects) {
            o.push(names(matchingObjects));
        });
        
        f.subscribe('matchesChange', function(objects, matches, oldMatches) {
            m.push([names(objects), matches, oldMatches]);
        });
        
        assert.deepEqual(names(f.getMatchingObjects()), names(sam.people),
            'When no conditions are set, all objects are matching');
        
        m = [];
        
        f.setConditions([
            {
                _id: 'a',
                technology: 'PHP'
            },
            {
                _id: 'b',
                technology: 'SQL'
            }
        ]);
        
            assert.deepEqual(o, [['Jane', 'Anna', 'Vika', 'Buck', 'Dmitry']]);
        
        o = [];
        m = [];
        f.setConditions([
            {
                _id: 'z',
                technology: 'PHP'
            },
            {
                _id: 'f',
                technology: 'SQL'
            }
        ]);
        
        assert.deepEqual(o.length, 0);
        assert.deepEqual(m, [[
            ['Jane', 'Anna', 'Vika', 'Buck', 'Dmitry'],
            ['z', 'z', 'z', 'f', 'f'],
            ['a', 'a', 'a', 'b', 'b']
        ]]);

        f.setConditions(
            { technology: 'Javascript' }, 'z'
        );

        assert.ok(f.getConditions('z'));

        assert.deepEqual(o, [
            ['Mike', 'John', 'Ivan', 'Buck', 'Dmitry']
        ]);
        
    });
    
    QUnit.test("Filter.expressionCondition", function(assert) {
        
        var sam = getSample();
        var f = new Amm.Filter();
        var o = [], m = [];

        d.sam = sam;
        d.f = f;
        
        var rem = sam.people.splice(0, 2); // remove first 2 people
        
        f.setObservedObjects(sam.people);
        
        f.subscribe('matchingObjectsChange', function(matchingObjects) {
            o.push(names(matchingObjects));
        });
        
        f.subscribe('matchesChange', function(objects, matches, oldMatches) {
            m.push([names(objects), matches, oldMatches]);
        });
        
        f.setConditions([
            {
                _expr: "this.department.location === $country",
                country: 'USA'
            }
        ]);
        
            assert.deepEqual(o, [['John', 'Dmitry']],
            'Expression condition basically works');
        
        o = [];
        
        sam.d.Development.setLocation('USA');
        
            assert.deepEqual(o, [['John', 'Anna', 'Vika', 'Ivan', 'Buck', 'Dmitry']],
            'Change of referenced object affecting multiple objectes -> only one matchingOnbjectsChange');
        
        o = [];
        sam.d.Development.setLocation('Ukraine');
        
            assert.deepEqual(o, [['John', 'Dmitry']], 
            'Change of referenced object affecting multiple objectes -> only one matchingOnbjectsChange');
        
        o = [];
        f.observeObject(rem[0]);
            
            assert.deepEqual(o, [['John', 'Dmitry', 'Jane']], 
            'Observed element -> matches change');
            
        o = [];
        f.unobserveObject(rem[0]);
            assert.deepEqual(o, [['John', 'Dmitry']], 
            'Unobserved element -> matches change');
            assert.equal(rem[0].getSubscribers().length, 0,
            'Unobserved element has no subscribers anymore');
        
        var nx = new Amm.Element({prop__department: sam.d.Design});
            assert.ok(f.getConditions(1).match(nx), 
            'Expression condition can be used to test non-subscribed objects');
        
        nx.setDepartment(null);
            assert.notOk(f.getConditions(1).match(nx),
            'Expression condition can be used to test non-subscribed objects');
        
        Amm.cleanup(sam.people);
        
        f.cleanup();
        
    });
    
    QUnit.test("Filter.mixedCondition", function(assert) {
        
        var sam = getSample();
        var f = new Amm.Filter();
        var o = [], m = [];

        d.sam = sam;
        d.f = f;
        
        f.setObservedObjects(sam.people);
        
        f.setRequireAll(true);
        
        f.subscribe('matchingObjectsChange', function(matchingObjects) {
            o.push(names(matchingObjects));
        });
        
        f.subscribe('matchesChange', function(objects, matches, oldMatches) {
            m.push([names(objects), matches, oldMatches]);
        });
        
        f.setConditions([
            {
                'this.department.location': 'USA',
                'name': /i/i // AND name has 'I' or 'i' in it
            }
        ]);
            assert.deepEqual(o, [['Mike', 'Dmitry']],
            'Mixed condition basically works');
            
        o = [];
        f.getConditions(1).setProps('Ukraine', 'this.department.location');
            assert.deepEqual(o, [['Vika', 'Ivan']],
            'Expression "property" criterion change => matchingObjects change');

        o = [];
        sam.p.Ivan.setDepartment(sam.d.Design);
            assert.deepEqual(o, [['Vika']],
                'Change in observed object led to matchingObjects change');
            
        o = [];
        f.setConditions([
            {
                'technology': 'SQL'
            }
        ]);
        
            assert.deepEqual(o, [['Buck', 'Dmitry']]);
            assert.equal(sam.d.Development.getSubscribers().length, 0, 
                'Observed object doesn\'t have subscribers anymore');
        
        Amm.cleanup(sam.people);
        
        f.cleanup();
        
    });
    
    QUnit.test("Filter.requireAll", function(assert) {
        var sam = getSample();
        var f = new Amm.Filter();
        var o = [], m = [];

        d.sam = sam;
        d.f = f;
        
        f.setObservedObjects(sam.people);
        
        f.subscribe('matchingObjectsChange', function(matchingObjects) {
            o.push(names(matchingObjects));
        });
        
        f.subscribe('matchesChange', function(objects, matches, oldMatches) {
            m.push([names(objects), matches, oldMatches]);
        });
        
        f.setRequireAll(true);
        
        f.setConditions([
            {
                'age': { 'validator': { 'class': 'Amm.Validator.Number', ge: 30 } }
            },
            {
                'technology': 'PHP'
            }
        ]);
        
        assert.deepEqual(o, [['Jane', 'Anna']], '`requireAll` works');
        
        o = [];
        f.setRequireAll(false);
        assert.deepEqual(o, [['Jane', 'Mike', 'Anna', 'Vika', 'Ivan', 'Dmitry']], 
            'Disabling `requireAll` triggers one event of MatchingObjectsChange');
    });
    
    QUnit.test("Filter.events", function(assert) {
        
        var sam = getSample();
        var f = new Amm.Filter();
        var o = [], m = [];

        d.sam = sam;
        d.f = f;
        
        f.setObservedObjects(sam.people);
        
        f.subscribe('matchingObjectsChange', function(matchingObjects) {
            o.push(names(matchingObjects));
        });
        
        f.subscribe('matchesChange', function(objects, matches, oldMatches) {
            m.push([names(objects), matches, oldMatches]);
        });
        
        f.setRequireAll(true);
        
        f.setConditions([
            {
                _id: 'loc',
                'this.department.location': 'USA'
            },
            {
                _id: 'age',
                _expr: 'this.age >= $min && this.age <= $max', // TODO: why this is non-cacheable too?!
                min: 30,
                max: 40
            }            
        ]);
        
        var expr1value, expr2value;
        
        var expr1 = new Amm.Expression("this.conditions::loc.props::'this.department.location'", f);
        expr1.subscribe('valueChange', function(v) { expr1value = v; });
            assert.ok(expr1.getIsCacheable(), 
                'PropsCondition: Expression that refers to Filter.conditions::condition.props::prop is cacheable');
            assert.equal(expr1.getValue(), 'USA',
                'PropsCondition.props::prop returns valid value');
        
        var expr2 = new Amm.Expression("(this.conditions::age).props::min", f,);
        expr2.subscribe('valueChange', function(v) { expr2value = v; });
            assert.ok(expr2.getIsCacheable(),
                'ExpressionCondition: Expression that refers to Filter.conditions::condition.props::prop is cacheable');
            assert.equal(expr2.getValue(), 30,
                'ExpressionCondition.props::prop returns valid value');
        
        var minMaxExpr = f.getConditions('age')._expression;
        
        assert.ok(minMaxExpr.getIsCacheable(), 'ExpressionCondition\' expression is also cacheable');
        
        assert.deepEqual(o, [['Mike', 'Dmitry']], 'Filter returns proper result');
        
        o = [];
        expr2.setValue(27);
            f.getConditions(2).getProps('min', 27);
            assert.deepEqual(o, [['Mike', 'John', 'Dmitry']],
                'Filter returns proper result after PropsCondition::props change');
            assert.deepEqual(expr2value, 27,
                'PropsCondition::props return valid value');
        
        o = [];
        f.getConditions(2).setProps(30, 'min');
            assert.deepEqual(o, [['Mike', 'Dmitry']], 
                'Filter returns proper result after PropsCondition::props change (2)');
            assert.deepEqual(expr2value, 30, 
                'PropsCondition::props return valid value');
        
        o = [];
        expr1.setValue('Ukraine');
            assert.deepEqual(o, [['Anna', 'Ivan']], 
                'Filter returns proper result after ExpressionCondition::props change');
            assert.deepEqual(expr1value, 'Ukraine',
                'ExpressionCondition::props return valid value');
            
        f.cleanup(); // doesn't cleanup conditions -- Amm.getRoot() still has 'interval' subscribers
        
    });
    
    QUnit.test("Sorter.basicSort", function(assert) {
        
        var s = new Amm.Sorter;
        
        var sam = getSample();
        
        s.setCriteria(['this.department.location DESC', 'name asc']);
        
            assert.deepEqual(s.getCriteria().length, 2, 'All critera were created');
        
        var sorted = [];
        var numNeedSort = 0;
        
        s.subscribe('needSort', function() {
            numNeedSort++;
            sorted = s.sort([].concat(sam.people));
        });
        
        s.setObservedObjects(sam.people);
        
            assert.deepEqual(s.getMatches(), [
                ['USA', 'Jane'],
                ['USA', 'Mike'],
                ['USA', 'John'],
                ['Ukraine', 'Anna'],
                ['Ukraine', 'Vika'],
                ['Ukraine', 'Ivan'],
                ['Ukraine', 'Buck'],
                ['USA', 'Dmitry']
            ], "Sorter returns proper Matches");
            
            assert.deepEqual(names(sorted), [
                
                "Anna", 
                "Buck", 
                "Ivan", 
                "Vika",
                "Dmitry", 
                "Jane", 
                "John", 
                "Mike"
                
            ], "sorted objects are in proper order after needSort()");
        
        numNeedSort = 0;
        s.getCriteria(0).setAscending(true);
        
            assert.equal(numNeedSort, 1, 'needSort triggered after criterion.setAscending()');
        
            assert.deepEqual(names(sorted), [
                
                "Dmitry",
                "Jane", 
                "John", 
                "Mike",
                "Anna", 
                "Buck", 
                "Ivan", 
                "Vika",
                
            ], "needSort triggered after criterion.setAsc(), proper sort order maintained");
        
        numNeedSort = 0;
        
        s.getCriteria(0).setIndex(1);
        
            assert.deepEqual(numNeedSort, 1, "outNeedSort() after criterion.setIndex()");
            
            assert.deepEqual(s.getMatches(), [
                ['Jane', 'USA'],
                ['Mike', 'USA'],
                ['John', 'USA'],
                ['Anna', 'Ukraine'],
                ['Vika', 'Ukraine'],
                ['Ivan', 'Ukraine'],
                ['Buck', 'Ukraine'],
                ['Dmitry', 'USA']
            ], "Sorter returns proper Matches after setIndex()");
            
        
        sam.p.Anna.setName('Zhanna');
        
            assert.deepEqual(s.getMatch(sam.p.Anna), ['Zhanna', 'Ukraine'],
                "sorter returns proper Matches after object property change");
        
            
        sam.p.Anna.setDepartment(sam.d.Testing);
        
            assert.deepEqual(s.getMatch(sam.p.Anna), ['Zhanna', 'USA'],
                "sorter returns proper Matches after object expression-accessed property change");        
        
        s.cleanup();
        
    });
    
    QUnit.test("Sorter.setCriteria => matches change", function(assert) {
        
        var s = new Amm.Sorter;
        
        var sam = getSample();
        
        s.setObservedObjects(sam.people);
        
        assert.deepEqual(s.getMatches(), [
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
        ], "Matches are empty when there's no Criteria");
        
        s.setCriteria(['this.department.location DESC', 'name asc']);
        
        assert.deepEqual(s.getMatches(), [
            ['USA', 'Jane'],
            ['USA', 'Mike'],
            ['USA', 'John'],
            ['Ukraine', 'Anna'],
            ['Ukraine', 'Vika'],
            ['Ukraine', 'Ivan'],
            ['Ukraine', 'Buck'],
            ['USA', 'Dmitry']
        ], "Sorter returns proper Matches after Criteria added");
        
        s.cleanup();
        
    });
    
    QUnit.test("Sorter.setCriteria, same matches, => outNeedSort()", function(assert) {
        
        var ns = 0;
        
        var s = new Amm.Sorter({'criteria': 'name ASC', on__needSort: function() { ns++; }});
        
        var sam = getSample();
        
        s.setObservedObjects(sam.people);
        
        var properMatches = [
            ["Jane"],
            ["Mike"],
            ["John"],
            ["Anna"],
            ["Vika"],
            ["Ivan"],
            ["Buck"],
            ["Dmitry"]
        ];
        
        assert.deepEqual(s.getMatches(), properMatches, "original matches");
        
        ns = 0;
        
        s.setCriteria('name DESC');
        
        assert.deepEqual(s.getMatches(), properMatches, "matches didn't change");
        
        assert.ok(ns === 1, "outNeedSort() called");
        
        s.cleanup();
        
    });
    
}) ();
