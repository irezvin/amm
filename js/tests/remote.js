/* global Amm */
/* global QUnit */

(function() {
    
    QUnit.module("Remote");
    
    /**
     * Story is array [
     *  {
     *      name: 'step name',
     *      time: ms || function(return ms),
     *      fn: function to call after timeout
     * }
     * 
     */
    
    var runStory = function(assert, story) {
        var stepNo = 0;
        var done = assert.async(story.length);
        var invokeStep = function() {
            var step = story[stepNo];
            stepNo++;
            runStory.currStepName = step.name;
            var timeoutHandler = function() {
                step.fn();
                if (stepNo < story.length) {
                    invokeStep();
                }
                done();
            };
            var time = step.time;
            if (typeof time === 'function') time = time();
            if (time > 0) {
                window.setTimeout(timeoutHandler, time);
            } else {
                timeoutHandler();
            }
        };
        invokeStep();
    };
    
    var getDebugTransport = function(requestsLog) {
        
        var res = new Amm.Remote.Transport.Debug({
        
            replyTime: 10,
            on__request: function(runningRequest, success, failure) {
                var u = runningRequest.getConstRequest().getUri();
                var tmp = new Amm.Remote.Uri(u);
                var response = Amm.override({}, tmp.getUri(Amm.Remote.Uri.PART_QUERY));
                requestsLog.push([u, response]);
                success(response);
            }
        });
        return res;
        
    };
    
    QUnit.test("Amm.Remote.Fetcher - async behaviour", function(assert) {
        
        var serverWaitTime = 40;
                
        var log = [], dataLog = [], rqLog = [], startTime = (new Date).getTime(), lastTime = startTime;
        
        var f = new Amm.Remote.Fetcher({
            firstDelay: 5,
            throttleDelay: 10,
            transport: getDebugTransport(rqLog),
            on__stateChange: function(value) {
                var currTime = (new Date).getTime();
                log.push({  
                    offset: currTime - startTime, 
                    delta: currTime - lastTime, 
                    state: f.getState(), 
                    response: f.getResponse(), 
                    error: f.getError()
                });
                lastTime = currTime;
            },
            
            on__responseChange: function(v) {
                dataLog.push(v);
            }
        });
        
        runStory(assert, [
            {time: 0, fn: function() {
                
                assert.equal(f.getState(), Amm.Remote.Fetcher.STATE_CONFIGURING, 
                    'When no request set, state is STATE_CONFIGURING');

                f.setRequestProducer('echo.php?arg=val');

                    assert.equal(Amm.getClass(f.getRequestProducer()), 'Amm.Remote.RequestProducer', 
                        'Request string was converted to Amm.Remote.RequestProducer');
                        
                    assert.equal(f.getState(), Amm.Remote.Fetcher.STATE_IDLE, 
                        'When requestProducer w/ constRequest is set, state is STATE_IDLE');

                f.run();
                
            }},
        
            {time: function() { return f.getFirstDelay() + 1; }, fn: function() {
                assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_SENT, 
                'Request started after firstDelay and state is STATE_SENT');
            }},
        
            {time: serverWaitTime, fn: function() {
                assert.deepEqual(dataLog, [{arg: 'val'}]);
                assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_RECEIVED, 
                    'After data is received, state is STATE_RECEIVED');

                f.setAuto(true);
                dataLog = [];
                f.getRequestProducer().setUri('val2', 'arg2');
                    assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_STARTED, 
                        'During the throttle period, state is STATE_STARTED');
            }},
        
            {time: function() { return f.getFirstDelay() + 1; }, fn: function() {
                assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_SENT, 
                'After `firstDelay`, request is sent (and state is STATE_SENT)');
            }},
        
            {time: serverWaitTime, fn: function() {
                assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_RECEIVED,
                    'After data is received, state is STATE_RECEIVED (2)');
                assert.deepEqual(dataLog, [{arg: 'val', arg2: 'val2'}],
                    'Proper data is returned');
            }},
        
            {time: 0, fn: function() {
                //console.log(log, rqLog);
            }}
        ]);
        
    });
    
    QUnit.test("Amm.Remote.Fetcher: AUTO_ALWAYS / AUTO_BOOTSTRAP", function(assert) {
        
        Amm._bootstrapped = false;
            
            assert.notOk(Amm.getBootstrapped(), 'Amm isn\'t bootstrapped yet');
        
        
        var rqLog = [];
        var f1 = new Amm.Remote.Fetcher({
            auto: Amm.Remote.Fetcher.AUTO_ALWAYS,
            transport: getDebugTransport(rqLog),
        });
        var f2 = new Amm.Remote.Fetcher({
            auto: Amm.Remote.Fetcher.AUTO_BOOTSTRAP,
            transport: getDebugTransport(rqLog),
        });
        
            assert.deepEqual(f1.getState(), Amm.Remote.Fetcher.STATE_CONFIGURING,
                'No request: STATE_CONFIGURING');

            assert.deepEqual(f2.getState(), Amm.Remote.Fetcher.STATE_CONFIGURING,
                'No request: STATE_CONFIGURING');
        
        f1.setRequestProducer('?foo=bar');
        
            assert.deepEqual(f1.getState(), Amm.Remote.Fetcher.STATE_STARTED,
                '`auto` = AUTO_ALWAYS: `state` = STATE_STARTED');
                
        f2.setRequestProducer('?baz=quux');
        
            assert.deepEqual(f2.getState(), Amm.Remote.Fetcher.STATE_PREINIT,
                '`auto` = AUTO_BOOTSTRAP: `state` = STATE_PREINIT');
                
        Amm._doBootstrap();
        
            assert.ok(Amm.getBootstrapped(), 'Amm is bootstrapped');
            
            assert.deepEqual(f2.getState(), Amm.Remote.Fetcher.STATE_STARTED,
                '`auto` = AUTO_BOOTSTRAP: `state` = STATE_STARTED');
                
    });
    
    QUnit.test("Amm.Remote.Fetcher: throttle delay", function(assert) {
        
        var rqLog = [];
        
        var f = new Amm.Remote.Fetcher({
            transport: getDebugTransport(rqLog),
            firstDelay: 0,
            throttleDelay: 20,
            auto: Amm.Remote.Fetcher.AUTO_ALWAYS
        });
        
        f.getTransport().replyTime = 10;
        
        runStory(assert, [
            {time: 0, fn: function() {
                
                f.setRequestProducer('echo.php?arg=val');
                
                    assert.equal(f.getState(), Amm.Remote.Fetcher.STATE_SENT, 
                        'firstDelay == 0 => state is STATE_SENT');
                
            }},
        
            {time: 5, fn: function() {
                f.getRequestProducer().setUri('val2', 'arg');
                
                    assert.equal(f.getState(), Amm.Remote.Fetcher.STATE_STARTED, 
                        'request changed => old request is aborted, state is STATE_STARTED')
                
            }},
        
            {time: 10, fn: function() {
                f.getRequestProducer().setUri('val2', 'arg');
                
                    assert.equal(f.getState(), Amm.Remote.Fetcher.STATE_STARTED, 
                        'firstDelay == 0 => state is STATE_STARTED');
                
            }},
        
        
            {time: 10, fn: function() {
                    
                    assert.equal(f.getState(), Amm.Remote.Fetcher.STATE_SENT, 
                        'after throttleDelay, state is STATE_SENT');
                
            }}
        
        
        ]);
        
    });
    
    QUnit.test("Amm.Remote.Fetcher: setResponse() / setError()", function(assert) {
        
        
        var rqLog = [];
        
        var abLog = [];
        
        var f = new Amm.Remote.Fetcher({
            transport: getDebugTransport(rqLog),
            firstDelay: 0,
            throttleDelay: 20,
            auto: Amm.Remote.Fetcher.AUTO_ALWAYS,
            requestProducer: '?foo=bar'
        });
        
        f.getTransport().replyTime = 10;
        f.getTransport().subscribe('abortRequest', function(rq) {
            var u = rq.getConstRequest().getUri() + '';
            abLog.push(u);
        });
        
            assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_SENT,
                'request is running => initially state is STATE_SENT');
        
        f.setResponse('xxx');
        
            assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_RECEIVED,
                'setResponse: state becomes STATE_RECEIVED');
            assert.deepEqual(abLog, ['?foo=bar'], 
                'setResponse: current request was aborted');

        abLog = [];
        f.run();
        
            assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_SENT,
                'request is running => initially state is STATE_SENT');
                
        f.setError('error');
                
            assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_ERROR,
                'setError: state becomes STATE_ERROR');
            assert.deepEqual(abLog, ['?foo=bar'], 
                'setError: current request was aborted');

        abLog = [];
        f.run();
        
            assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_SENT,
                'request is running => initially state is STATE_SENT');
                
        f.reset();
                
            assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_IDLE,
                'reset: state becomes STATE_IDLE');
            assert.deepEqual(abLog, ['?foo=bar'], 
                'reset: current request was aborted');
            assert.deepEqual(f.getError(), null, 
                'reset: getError() is null');
            assert.deepEqual(f.getResponse(), undefined, 
                'reset: getResponse() is null');

    });
    
    
    QUnit.test("Amm.Remote.Fetcher: AUTO_ALWAYS / AUTO_BOOTSTRAP", function(assert) {
        
        Amm._bootstrapped = false;
            
            assert.notOk(Amm.getBootstrapped(), 'Amm isn\'t bootstrapped yet');
        
        
        var rqLog = [];
        var f1 = new Amm.Remote.Fetcher({
            auto: Amm.Remote.Fetcher.AUTO_ALWAYS,
            transport: getDebugTransport(rqLog),
        });
        var f2 = new Amm.Remote.Fetcher({
            auto: Amm.Remote.Fetcher.AUTO_BOOTSTRAP,
            transport: getDebugTransport(rqLog),
        });
        
            assert.deepEqual(f1.getState(), Amm.Remote.Fetcher.STATE_CONFIGURING,
                'No request: STATE_CONFIGURING');

            assert.deepEqual(f2.getState(), Amm.Remote.Fetcher.STATE_CONFIGURING,
                'No request: STATE_CONFIGURING');
        
        f1.setRequestProducer('?foo=bar');
        
            assert.deepEqual(f1.getState(), Amm.Remote.Fetcher.STATE_STARTED,
                '`auto` = AUTO_ALWAYS: `state` = STATE_STARTED');
                
        f2.setRequestProducer('?baz=quux');
        
            assert.deepEqual(f2.getState(), Amm.Remote.Fetcher.STATE_PREINIT,
                '`auto` = AUTO_BOOTSTRAP: `state` = STATE_PREINIT');
                
        Amm._doBootstrap();
        
            assert.ok(Amm.getBootstrapped(), 'Amm is bootstrapped');
            
            assert.deepEqual(f2.getState(), Amm.Remote.Fetcher.STATE_STARTED,
                '`auto` = AUTO_BOOTSTRAP: `state` = STATE_STARTED');
                
    });
    
    QUnit.test("Amm.Remote.Fetcher: poll", function(assert) {
        
        var rqLog = [], rqLog2 = [], t = new Date;
        
        var f = new Amm.Remote.Fetcher({
            transport: getDebugTransport(rqLog),
            firstDelay: 0,
            throttleDelay: 20,
            poll: true,
            auto: Amm.Remote.Fetcher.AUTO_ALWAYS
        });
        
        var lastL = 0;
        f.getTransport().replyTime = 1;
        f.getTransport().subscribe('request', function(r) { 
            var e = [rqLog2.length + 1, (new Date).getTime() - t, r.getConstRequest().getUri()];
            //  console.log.apply(console, e); 
            rqLog2.push(e);
            t = new Date();
        });
        
        var stage;
        
        runStory(assert, [
            {time: 0, fn: function() {
                
                f.setRequestProducer('echo.php?arg=val');
                    
                    assert.equal(rqLog.length, 1, 'Sent request (1)');
                
            }},
        
            {time: 70, fn: (stage = function() {
                assert.ok(rqLog2.length > lastL, 'More requests were done during some time');
                lastL = rqLog2.length;
            })},
        
            {time: 50, fn: stage},
            
            {time: 50, fn: function() {
                f.setPoll(false);
            }},
        
            {time: 50, fn: function() {
                assert.deepEqual(f.getState(), Amm.Remote.Fetcher.STATE_RECEIVED);
            }}
        
        
        ]);
        
    });
    
    QUnit.test("Amm.Remote.Fetcher: detectChanges", function(assert) {
        
        var rqLog = [], respLog = [], errLog = [];
        
        var f = new Amm.Remote.Fetcher({
            transport: getDebugTransport(rqLog),
            firstDelay: 0,
            throttleDelay: 20,
            poll: true,
            auto: Amm.Remote.Fetcher.AUTO_ALWAYS,
            on__responseChange: function(v, oldV) {
                respLog.push([Amm.event.name, v]);
            },
            on__errorChange: function(v, oldV) {
                errLog.push([Amm.event.name, v]);
            }
        });
        
        f.setRequestProducer('echo.php?arg=val');
        
        respLog = [];
        f.setResponse({foo: 'bar'});
            assert.deepEqual(respLog, [['responseChange', {foo: 'bar'}]]);
            
        respLog = [];
        f.setResponse({foo: 'bar'});
            assert.deepEqual(respLog, []);
        
        errLog = [];
        f.setError({var: 'val'});
            assert.deepEqual(errLog, [['errorChange', {var: 'val'}]]);
            
        errLog = [];
        f.setError({var: 'val'});
            assert.deepEqual(errLog, []);
            
        f.setDetectChanges(false);
        
        respLog = [];
        f.setResponse({foo: 'bar'});
            assert.deepEqual(respLog, [['responseChange', {foo: 'bar'}]]);
            
        respLog = [];
        f.setResponse({foo: 'bar'});
            assert.deepEqual(respLog, [['responseChange', {foo: 'bar'}]]);
        
        errLog = [];
        f.setError({var: 'val'});
            assert.deepEqual(errLog, [['errorChange', {var: 'val'}]]);
            
        errLog = [];
        f.setError({var: 'val'});
            assert.deepEqual(errLog, [['errorChange', {var: 'val'}]]);
            
        
        
        
        
        
        
    });
    

}) ();
