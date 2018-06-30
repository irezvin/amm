/* global Amm */
QUnit.module("WithEvents");

(function() {

    // create sample set of handlers and decorators
    var log2this = function() {
        this.log.push(Array.prototype.slice.call(arguments));
    };
    
    var sub1 = {
        log: [],
        handlerA: log2this, 
        handlerB: log2this
    };
    
    var sub2 = {
        log: [],
        handlerA: log2this, 
        handlerB: log2this
    };
    
    var globLog = [];
    
    var handlerFn = function() {
        var ar = Array.prototype.slice.call(arguments);
        globLog.push(ar);
    };
    
    var logEventFn = function() {
        globLog.push(Amm.event);
    };
    
    var revArgsB = function(eventName, args) {
        args.reverse();
    };
    
    var handlerObj = {
        log: [],
        apply: function(scope, args) {
            log2this.apply(this, args);
        }
    };
    
    var decoratorObjA = {
        extraArg: 'foo',
        call: function(decoratorScope, eventName, args, handler, scope, extra, thisObject) {
            args.push(this.extraArg);
            return args;
        }
    };
    
    // reverses args and calls handlers, skipping built-in call
    var decoratorFnB = function(eventName, args, handler, scope, extra, thisObject) {
        args.reverse();
        handler.apply(scope, args);
        return null;
    };
    
    clearLogs = function() {
        sub1.log.splice(0, sub1.log.length);
        globLog.splice(0, globLog.length);
        handlerObj.log.splice(0, handlerObj.log.length);
    };
    
    // "static" method invokeHandlers implements most of WithEvents
    // useful functionality
    QUnit.test("WithEvents.invokeHandlers", function(assert) {
    
        var thisObj = {
            getByPath: function(path) { return this[path]; },
            sub1path: sub1
        };
        
        var subscribers = [
            // handler, scope, extra, decorator
            
            [handlerObj, handlerObj], // object with .apply method
            [sub1.handlerA, sub1, 'withDecoratorObjA', decoratorObjA],
            [sub1.handlerA, sub1, 'withDecoratorFnB', decoratorFnB]
        ];

        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [[handlerFn]]);
        assert.deepEqual(globLog, [['arg1', 'arg2']],
            'hanlder function, no {scope} - simpliest form of invocation');

        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [[logEventFn]]);
        assert.deepEqual(globLog, [{
            origin: thisObj,
            name: 'fooEvent',
            args: ['arg1', 'arg2'],
            parent: null
        }], 'Amm.event must contain valid parameters');

        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [[sub1.handlerA, sub1]]);
        assert.deepEqual(sub1.log, [['arg1', 'arg2']], 
            'basic event handler with scope object');

        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [[sub1.handlerB, sub1, 'extraB']]);
        assert.deepEqual(sub1.log, [['arg1', 'arg2', 'extraB']], 
            '{extra} must be appended to the args');

        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [['handlerA', sub1, 'xx']]);
        assert.deepEqual(sub1.log, [['arg1', 'arg2', 'xx']], 
            'use of scope[handler] when handler is string');

        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [['handlerA', 'sub1path']]);
        assert.deepEqual(sub1.log, [['arg1', 'arg2']], 
            'resolution of scope with thisObj.getByPath');
            
        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [[handlerObj]]);
        assert.deepEqual(handlerObj.log, [['arg1', 'arg2']], 
            'handlerObj with apply() method. Because I can');
            
        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [[handlerFn, null, 'extra1', decoratorObjA]]);
        assert.deepEqual(globLog, [['arg1', 'arg2', 'extra1', 'foo']],
            'decorator with .call() method');
            
        clearLogs();
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [[handlerFn, null, 'extra2', decoratorFnB]]);
        assert.deepEqual(globLog, [['extra2', 'arg2', 'arg1']],
            'decorator function that calls handler directly');
            
        clearLogs();
        
        Amm.WithEvents.invokeHandlers.call(thisObj, 'fooEvent', ['arg1', 'arg2'],
            [
                [handlerFn, null, 'extra1'],
                [handlerFn, null, 'extra2']
            ], 
        false, decoratorFnB);
        
        assert.deepEqual(globLog, 
            [
                ['extra1', 'arg2', 'arg1'],
                ['extra2', 'arg2', 'arg1']
            ],  'defaultDecorator works too'
        );
        
    });
    
    QUnit.test("WithEvents add/delete/find events", function(assert) {
        // Event handler invocation was tested in Amm.WithEvents.invokeHandlers.
        // Here we test only event handler' management
        
        var e = new Amm.WithEvents();
       
        e.outEventA = function(val) { this._out('eventA', val); };
        e.outEventB = function(val) { this._out('eventB', val); };
        e.getByPath = function(path) { return this[path]; };
        
        e.sub1path = sub1;
        
        assert.deepEqual(e.listEvents(), ['eventA', 'eventB']);
        
        assert.equal(e.hasEvent('eventA'), 'outEventA');
        assert.equal(e.hasEvent('eventB'), 'outEventB');
        assert.equal(e.hasEvent('eventC'), false);

        assert.deepEqual(e.getSubscribers(), []);
        
        assert.ok(e.subscribe('eventA', handlerFn), 
            'Subscribe (handler)');
        assert.notOk(e.subscribe('eventA', handlerFn), 
            'Must not subscribe second time with same handler');
        
        assert.ok(e.subscribe('eventA', sub1.handlerA, sub1), 
            'Subscribe (handler, scope)');
        assert.notOk(e.subscribe('eventA', sub1.handlerA, sub1),
            'Must not subscribe second time with same handler, scope');
        
        assert.ok(e.subscribe('eventA', sub2.handlerA, sub2),
            'Subscribe (handler, different scope)');

        assert.ok(e.subscribe('eventA', sub1.handlerA, sub1, 'extraA'),
            'Subscribe (handler, scope, extra)');
        assert.notOk(e.subscribe('eventA', sub1.handlerA, sub1, 'extraA'), 
            'Must not subscribe second time with same handler, scope, extra');
        
        assert.ok(e.subscribe('eventA', sub1.handlerA, sub1, 'extraA', decoratorFnB),
            'Subscribe (handler, scope, extra)');
        assert.notOk(e.subscribe('eventA', sub1.handlerA, sub1, 'extraA', decoratorFnB), 
            'Must not subscribe second time with same handler, scope, extra, decorator');
        
        assert.ok(e.subscribe('eventB', sub1.handlerA, sub1, 'extraB'),
            'Subscribe (handler, scope, extra) / different event');
        
        assert.ok(e.subscribe('eventB', sub1.handlerA, sub1, 'extraC'),
            'Subscribe (handler, scope, diff. extra) / different event');
        
        assert.deepEqual(e.getSubscribers(), 
        [
            [handlerFn, null, null, null, 'eventA', 0],
            [sub1.handlerA, sub1, null, null, 'eventA', 1],
            [sub2.handlerA, sub2, null, null, 'eventA', 2],
            [sub1.handlerA, sub1, 'extraA', null, 'eventA', 3],
            [sub1.handlerA, sub1, 'extraA', decoratorFnB, 'eventA', 4],
            [sub1.handlerA, sub1, 'extraB', null, 'eventB', 0],
            [sub1.handlerA, sub1, 'extraC', null, 'eventB', 1]
        ], 'getSubscribers() w/o args return all subscribers + event names and indexes');
        
        assert.deepEqual(e.getSubscribers('eventA'), 
        [
            [handlerFn, null, null, null, 'eventA', 0],
            [sub1.handlerA, sub1, null, null, 'eventA', 1],
            [sub2.handlerA, sub2, null, null, 'eventA', 2],
            [sub1.handlerA, sub1, 'extraA', null, 'eventA', 3],
            [sub1.handlerA, sub1, 'extraA', decoratorFnB, 'eventA', 4]
        ], 'getSubscribers(event)');
        
        assert.deepEqual(e.getSubscribers('eventA', handlerFn), 
        [
            [handlerFn, null, null, null, 'eventA', 0]
        ], 'getSubscribers(event, handler)');
        
        
        assert.deepEqual(e.getSubscribers(undefined, undefined, sub2), 
        [
            [sub2.handlerA, sub2, null, null, 'eventA', 2]
        ], 'getSubscribers(,,scope)');
        
        assert.deepEqual(e.getSubscribers(undefined, undefined, undefined, 'extraA'), 
        [
            [sub1.handlerA, sub1, 'extraA', null, 'eventA', 3],
            [sub1.handlerA, sub1, 'extraA', decoratorFnB, 'eventA', 4]
        ], 'getSubscribers(,,,extra)');
        
        assert.deepEqual(e.getSubscribers(undefined, undefined, undefined, undefined, decoratorFnB), 
        [
            [sub1.handlerA, sub1, 'extraA', decoratorFnB, 'eventA', 4]
        ], 'getSubscribers(,,,,decorator)');
        
        e.unsubscribe('eventB');
        assert.deepEqual(e.getSubscribers(), 
        [
            [handlerFn, null, null, null, 'eventA', 0],
            [sub1.handlerA, sub1, null, null, 'eventA', 1],
            [sub2.handlerA, sub2, null, null, 'eventA', 2],
            [sub1.handlerA, sub1, 'extraA', null, 'eventA', 3],
            [sub1.handlerA, sub1, 'extraA', decoratorFnB, 'eventA', 4]
        ], 'unsubscribe(eventName)');
        
        e.unsubscribe(undefined, undefined, undefined, undefined, decoratorFnB);
        assert.deepEqual(e.getSubscribers(), 
        [
            [handlerFn, null, null, null, 'eventA', 0],
            [sub1.handlerA, sub1, null, null, 'eventA', 1],
            [sub2.handlerA, sub2, null, null, 'eventA', 2],
            [sub1.handlerA, sub1, 'extraA', null, 'eventA', 3]
        ], 'unsubscribe(...decorator)');
        
        e.unsubscribe(undefined, undefined, sub2);
        assert.deepEqual(e.getSubscribers(), 
        [
            [handlerFn, null, null, null, 'eventA', 0],
            [sub1.handlerA, sub1, null, null, 'eventA', 1],
            [sub1.handlerA, sub1, 'extraA', null, 'eventA', 2]
        ], 'unsubscribe(...scope...)');
        
        e.unsubscribe(undefined, handlerFn);
        assert.deepEqual(e.getSubscribers(), 
        [
            [sub1.handlerA, sub1, null, null, 'eventA', 0],
            [sub1.handlerA, sub1, 'extraA', null, 'eventA', 1]
        ], 'unsubscribe(...handler...)');
        
        assert.deepEqual(e.unsubscribeByIndex('eventA', 10), [], 
            'unsubscribeByIndex /w n/x idx');
        
        assert.deepEqual(e.unsubscribeByIndex('eventA', 0), 
            [[sub1.handlerA, sub1, null, null, 'eventA', 0]], 
            'unsubscribeByIndex /w xtng.idx');
            
        assert.deepEqual(e.getSubscribers(), 
        [
            [sub1.handlerA, sub1, 'extraA', null, 'eventA', 0]
        ]);

        var sub = e.getSubscribers();
        assert.deepEqual(e.unsubscribe(sub), sub, 'unsub /w getSubscribers() res.');
        assert.deepEqual(e.getSubscribers(), []);
    });
    
    QUnit.test("WithEvents subFirstLast", function(assert) {
        // Event handler invocation was tested in Amm.WithEvents.invokeHandlers.
        // Here we test only event handler' management
        
        var e = new Amm.WithEvents(), l = [];
       
        e.outEventA = function(val) { this._out('eventA', val); };
        e._subscribeFirst_eventA = function() { l.push('sub'); };
        e._unsubscribeLast_eventA = function() { l.push('unsub'); };
        
        var h1 = function() {};
        var h2 = function() {};
        
        e.subscribe('eventA', h1);
        assert.deepEqual(l, ['sub']);
        e.subscribe('eventA', h2);
        e.unsubscribe('eventA', h1);
        e.unsubscribe('eventA', h2);
        assert.deepEqual(l, ['sub', 'unsub']);
        e.subscribe('eventA', h1);
        assert.deepEqual(l, ['sub', 'unsub', 'sub']);
        e.unsubscribeByIndex('eventA', 0);
        assert.deepEqual(l, ['sub', 'unsub', 'sub', 'unsub']);
    });
    
    QUnit.test("event.parent", function(assert) {
        
        var currEvent = [], parentEvent = [];
        var e1 = new Amm.Element({prop__b: 0, on__bChange: function(v, o) {
            currEvent.push([Amm.event.name, Amm.event.args[0]]);
            parentEvent.push(Amm.event.parent? [Amm.event.parent.name, Amm.event.parent.args[0]] : null);
        }});
        var e2 = new Amm.Element({prop__a: 10, on__aChange: function(v, o) { e1.setB(v); }});
        
        e1.setB(10);
        
            assert.deepEqual(currEvent, [['bChange', 10]], 'current event stored');
            assert.deepEqual(parentEvent, [null], 'there was no parent event');
            
        currEvent = [];
        parentEvent = [];
        e2.setA(15); // triggers aChange => bChange
        
            assert.deepEqual(currEvent, [['bChange', 15]], 'current event stored');
            assert.deepEqual(parentEvent, [['aChange', 15]], 'there was parent event when current \n\
                event is called from parent event');
        
    });
    
}) ();