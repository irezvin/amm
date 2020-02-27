/* global Amm */
/* global TestUtils */
/* global QUnit */

(function() {
    
    QUnit.module("Data");

    var getDebugTransport = function(requestsLog, response, isError, textStatus, httpCode, headers) {
        
        var res = new Amm.Remote.Transport.Debug({
        
            replyTime: 10,
            on__request: function(runningRequest, success, failure) {
                var u = runningRequest.getConstRequest().getUri();
                var tmp = new Amm.Remote.Uri(u);
                requestsLog.push(u);
                var xtra = { 
                    statusCode: httpCode,
                    responseText: typeof response === 'object'? JSON.stringify(response) : ('' + response) 
                };
                if (headers) xtra.getAllResponseHeaders = function() { return headers; };
                if (isError) {
                    failure ( textStatus, isError, httpCode, undefined, xtra );
                } else {
                    success ( response, textStatus, undefined, xtra );
                }
            }
        });
        return res;
        
    };

    QUnit.test("Data.Object", function(assert) {
        
        var m = new Amm.Data.Mapper(), modified = null;
        
        var name, surname, age;
        
        var d = new Amm.Data.Object({
            __mapper: m,
            id: 10,
            name: 'John',
            surname: 'Doe',
            age: 37,
            on__nameChange: function(v) { name = v; },
            on__surnameChange: function(v) { surname = v; },
            on__ageChange: function(v) { age = v; },
            lm: {
                on__modifiedChange: function(m) { modified = m; },
            }
        });
        
        assert.deepEqual(d.lm.getKey(), 10, 'getKey() works');
        assert.deepEqual(d.lm.getState(), Amm.Data.STATE_EXISTS,
            'since key was provided on hydration, state is STATE_EXISTS');
        
        assert.deepEqual(d.getAge(), 37, 'Basic check: property has pre-set value');
        assert.deepEqual(d.getName(), 'John', 'Basic check: property has pre-set value');
        assert.deepEqual(d.surname, 'Doe', 'Property access works');
        //assert.deepEqual(d.lm.getState(), Amm.Data.STATE_NEW, 'Intiial state is STATE_NEW');
        
        assert.deepEqual(d.lm.getModified(), false, 'Created object is not modified yet');
        d.name = 'Jane';
        assert.deepEqual(modified, true, 'Object becomes modified');
        assert.deepEqual(name, 'Jane', 'Field change event triggered');
        d.name = 'John';
        assert.deepEqual(modified, false, 'Object no more modified');
        
        name = null;
        surname = null;
        age = null;
        
        d.lm.beginUpdate();
        d.name = 'Masha';
        d.surname = 'Medvedeva';
        d.age = 25;
        
            assert.deepEqual([name, surname, age], [null, null, null], 'beginUpdate: property change events aren\'t triggered');
            assert.equal(d.lm.getModified(), false, 'beginUpdate: modified status doesn\'t change');
            
        d.lm.endUpdate();
            
            assert.deepEqual([name, surname, age], ['Masha', 'Medvedeva', 25], 'endUpdate: all property change events triggered');
            assert.equal(d.lm.getModified(), true, 'endUpdate: modified status changed');
        
        
        d.id = 11;
            assert.deepEqual(d.lm.getKey(), 10, 'getKey() returns "old" value of key (set during hydration)');
            
            assert.ok(d.lm.getModified(), 'Object is modified...');
        
        d.lm.revert();
            assert.notOk(d.lm.getModified(), '...revert() makes it not modifierd');
            
        // Patial hydration
        assert.deepEqual(d.lm.getData(), {
            id: 10,
            name: 'John',
            surname: 'Doe',
            age: 37,
        }, 'Initial data is set');
        
        d.lm.hydrate({id: 20, name: 'Xxx'}, true);
        
        assert.deepEqual(d.lm.getData(), {
            id: 20,
            name: 'Xxx',
            surname: 'Doe',
            age: 37,
        }, 'Partially-hydated: some fields are preserved');
        
        assert.notOk(d.lm.getModified(), 'Partially-hydated: object is not modified');
        
    });
    
    QUnit.test("Data.HttpTransaction", function(assert) {
       
        var t = new Amm.Data.HttpTransaction({
            uri: 'data.php',
            type: 'create',
            typePath: '',
            dataPath: 'record',
            data: {
                name: 'John',
                surname: 'Doe',
                birthDate: '1981-01-01'
            }
        });
        var p = t.createDefaultRequestProducer();
        window.d.t = t;
        
        assert.deepEqual(p.getMethod(), 'POST');
        assert.deepEqual(p.getUri(), 'data.php/create');
        assert.deepEqual(p.getData(), { record: t.data });
        
        t = new Amm.Data.HttpTransaction({
            uri: 'data.php',
            type: 'load',
            typePath: '',
            key: 10,
            keyPath: ''
        });
        var p = t.createDefaultRequestProducer();
        window.d.t = t;
        
        assert.deepEqual(p.getMethod(), 'GET');
        assert.deepEqual(p.getUri(), 'data.php/load/10');
        
        var log = [];
        
        TestUtils.runStory(assert, [
            
            {time: 0, fn: function() {
                    
                t = new Amm.Data.HttpTransaction({
                    uri: 'data.php',
                    type: 'load',
                    typePath: '',
                    key: 10,
                    keyPath: '',
                    responseDataPath: '',
                    transport: getDebugTransport(log, 
                        {id: 10, name: 'John', surname: 'Doe', birthDate: '1981-01-01'}, 
                        false, "ok", 200 
                    ),
                    run: true
                });
                
                assert.equal(t.getState(), Amm.Data.Transaction.STATE_RUNNING, 
                    'Transaction is in running state');
                    
            }},
        
            {time: 11, fn: function() {
                    
                assert.equal(t.getState(), Amm.Data.Transaction.STATE_SUCCESS,
                    'Response received: transaction is in success state');
                assert.ok(t.getResult(), 'Response received: transaction result property is populated');
                assert.deepEqual(t.getResult().getData(), {
                    id: 10, name: 'John', surname: 'Doe', birthDate: '1981-01-01'
                });
                    
            }}
            
        ]);
        
    });
    
    QUnit.test("Data.LifecycleAndMeta localErrors/remoteErrors/errors", function(assert) {
        
        var m = new Amm.Data.Mapper();
        var d = new Amm.Data.Object({
            __mapper: m,

            name: 'John',
            surname: '',
            birthDate: '1980-01-01',
            email: 'john',
            salary: -2500,

        });

        d.lm.setRemoteErrors({
            msg: 'Invalid data', 
            salary: 'Salary must not be negative number', 
            email: 'Email is too short', 
            surname: 'Surname is required'
        });
        d.lm.setLocalErrors({
            email: 'Email is invalid',
            surname: 'Surname is required', 
        });

            assert.deepEqual(d.lm.getErrors(), {
                msg: ['Invalid data'],
                salary: ['Salary must not be negative number'], 
                email: [
                    'Email is invalid',
                    'Email is too short',
                ],
                surname: [
                    'Surname is required'
                ]
            }, 'local and remote errors are properly combined');

            assert.equal(d.lm.getErrors('x'), null, 'retrieving errors with non-existing key returns null');

            assert.deepEqual(d.lm.getErrors('email'), ['Email is invalid', 'Email is too short'], 'retrieving individual errors');

        d.lm.setLocalErrors('something wrong', 'theProblem');
        
            assert.deepEqual(d.lm.getLocalErrors('theProblem'), ['something wrong'], 'newly-set local error is returned');
            assert.deepEqual(d.lm.getErrors('theProblem'), ['something wrong'], 'newly-set local error is added to combined errors');

        d.lm.setLocalErrors(null, 'email');
        
            assert.deepEqual(d.lm.getLocalErrors('email'), null, 'setting local error key to null clears is');
            assert.deepEqual(d.lm.getRemoteErrors('email'), ['Email is too short'], '..remote error still remains');
            assert.deepEqual(d.lm.getErrors('email'), ['Email is too short'], '...and local key removed from combined errors');
            
        d.lm.addError('must include upper-case letter', 'email');
            assert.deepEqual(d.lm.getLocalErrors('email'), ['must include upper-case letter'], 'added local error');
        
        d.lm.addError('must include upper-case letter', 'email');
            assert.deepEqual(d.lm.getLocalErrors('email'), ['must include upper-case letter'], 'duplicate didn\'t count');
            
            
        var e_log = [];
        var l_log = [];
        var r_log = [];
        
        d.lm.subscribe('errorsChange', function(e, o) {
            e_log.push([e, o]);
        });
        d.lm.subscribe('remoteErrorsChange', function(e, o) {
            r_log.push([e, o]);
        });
        d.lm.subscribe('localErrorsChange', function(e, o) {
            l_log.push([e, o]);
        });
        
        var oldErrors = Amm.override({}, d.lm.getErrors());
        var oldLocalErrors = Amm.override({}, d.lm.getLocalErrors());
        var oldRemoteErrors = Amm.override({}, d.lm.getRemoteErrors());
        
        d.lm.addError('problem description', 'anotherProblem');
        
            assert.deepEqual(e_log.length, 1, 'addError: errorsChange event triggered');
            assert.deepEqual(l_log.length, 1, 'addError: localErrorsChange event triggered');
            assert.deepEqual(r_log.length, 0, 'addError: remoteErrorsChange event triggered');
            
        e_log = [];
        l_log = [];
        r_log = [];
        
        d.lm.beginUpdate();
        
            d.lm.setLocalErrors(null, 'anotherProblem');
            
            assert.deepEqual(e_log.length, 0, 'beginUpdate: no errorsChange events triggered');
            assert.deepEqual(l_log.length, 0, 'beginUpdate: no localErrorsChange events triggered');
            assert.deepEqual(r_log.length, 0, 'beginUpdate: no remoteErrorsChange events triggered');
            
            d.lm.setRemoteErrors('---xxx---', 'oneMoreRemoteProblem');
            
            assert.deepEqual(e_log.length, 0, 'beginUpdate: no errorsChange events triggered');
            assert.deepEqual(l_log.length, 0, 'beginUpdate: no localErrorsChange events triggered');
            assert.deepEqual(r_log.length, 0, 'beginUpdate: no remoteErrorsChange events triggered');
            
        d.lm.endUpdate();
            
            assert.deepEqual(e_log.length, 1, 'endUpdate: errorsChange event triggered');
            assert.deepEqual(l_log.length, 1, 'endUpdate: localErrorsChange event triggered');
            assert.deepEqual(r_log.length, 1, 'endUpdate: remoteErrorsChange event triggered');
            
    });
    
    var createObjectForChecks = function() {
        
        var m = new Amm.Data.Mapper({
            key: 'id',
        });
        
        var d = new Amm.Data.Object({
            __mapper: m,
            id: 10,
            name: 'John',
            surname: 'Doe',
            age: 21,
            email: 'john@example.com',
            job: null,
            employeed: false,
            
            _checkField: function(field, value) {
                if (field === 'id' && value == 13) return 'id must not be 13';
            },
            
            _doOnCheck: function() {
                if (/^\d+$/.exec(this.surname)) {
                    this.lm.addError("surname must not be a number", "surname");
                }
            }
        });
        
        m.setFieldValidators({
            name: 'Amm.Validator.Required',
            surname: 'Amm.Validator.Required',
            age: {class: 'Amm.Validator.Number', ge: 0, lt: 130},
            email: [
                'Amm.Validator.Required',
                function(v) {
                    if (!v.match(/^.+@.+\.[^\.]+$/)) return "Please enter valid email";
                }
            ],
        });
        m.setCommonValidators({
            ifEmployeedMustHaveJob: function() {
                if (this.employeed && !this.job) return "'job' field must be filled-in for employeed persons";
                if (!this.employeed && this.job) return "'job' field must be empty for unemployeed persons";
            },
            noEmploymentUnder18: 'this.employeed && this.age < 18? "age must be above 18 if person is employeed" : ""'
        });
        
        return d;
        
    };
    
    QUnit.test("Data.LifecycleAndMeta.check() - AUTO_CHECK_NEVER", function(assert) {
        
        var d = createObjectForChecks();
        
        window.d.d = d;
        
            assert.ok(d.lm.getValidWhenHydrated(), 'when getValidWhenHydrated()...');
            assert.ok(d.lm.check(), 'check(): object is valid when hydrated');
        
        d.name = '';
        d.id = 13;
        d.age = -50;
        d.surname = '1234';
        d.email = 'xxx';
        d.employeed = true;
        
            assert.notOk(d.lm.check(), 'check(): object isn\'t valid');
            assert.deepEqual(d.lm.getLocalErrors(), {
                'id': [
                    'id must not be 13'
                ],
                'surname': [
                    'surname must not be a number'
                ],
                'age': [
                    'age must not be less than 0'
                ],
                'name': [
                    'name is required'
                ],
                'ifEmployeedMustHaveJob': [
                    "'job' field must be filled-in for employeed persons"
                ],
                'noEmploymentUnder18': [
                    'age must be above 18 if person is employeed'
                ],
                'email': [
                    'Please enter valid email'
                ],
            }, "Proper errors are returned");
            
            assert.ok(d.lm.getChecked(), 'check(): object.getChecked() === true');
            
        d.email = 'xx1';
            
            assert.notOk(d.lm.getChecked(), 'any field change: object.getChecked() ==> false');
        
        d.name = 'Foo';
        d.surname = 'Bar';
        d.id = 14;
        d.age = 26;
        d.email = 'ivan@protonmail.com';
        d.employeed = true;
        d.job = 'Senior Record Tester';
        
            assert.ok(d.lm.check(), 'check(): object is valid');
            assert.deepEqual(d.lm.getLocalErrors(), {}, 'object has no local errors if it is valid');
            
        var data = d.lm.getData();
        data.name = '';
        
        d.lm.hydrate(data);
            assert.ok(d.lm.check(), 'object is valid because hydrted...');
        
        d.lm.setValidWhenHydrated(false);
            assert.notOk(d.lm.getChecked(), 'checked status got reset after setValidWhenHydrated(false)');
            assert.notOk(d.lm.check(), 'object not valid anymore (hydrated with botched data');
        
        d.lm.setValidWhenHydrated(true);
            assert.ok(d.lm.getChecked(), 'checked status became true after setValidWhenHydrated(true)');
            assert.ok(d.lm.check(), 'object valid again');
            
            
    });
    
    QUnit.test("Data.LifecycleAndMeta.check() - AUTO_CHECK_SMART", function(assert) {
        
        var d = createObjectForChecks();
        
        window.d.d = d;
        
        d.lm.hydrate({
            name: null,
            surname: null,
            id: null,
            age: null,
            email: null,
            employeed: false
        });
        
        assert.deepEqual(d.lm.getState(), Amm.Data.STATE_NEW);
        
        d.lm.setAutoCheck(Amm.Data.AUTO_CHECK_SMART);
        
        var errors = null;
        
        d.lm.subscribe('localErrorsChange', function(e) { errors = e; });
        
        d.email = 'aaa';
        
            assert.deepEqual(errors, {email: ['Please enter valid email']}, 'Field was checked upon change');
        
        d.email = '';
        
            assert.deepEqual(errors, {email: ['email is required']}, 'Required field cleared -> error');
            
        d.email = 'aaa@example.com';
        
            assert.deepEqual(errors, {}, 'Field value changed to valid -> error disappeared');
            
            
        d.id = 13;
            
            assert.deepEqual(errors, {id: ['id must not be 13']}, 'internal check worked');
        
    });
    
    
    QUnit.test("Data.LifecycleAndMeta.check() - AUTO_CHECK_ALWAYS", function(assert) {
        
        var d = createObjectForChecks();
        
        window.d.d = d;
        
        var err;
        
        d.lm.subscribe('localErrorsChange', function(e) { err = e; });
        
        d.name = '';
        
            assert.notOk(d.lm.getChecked(), 'initially object is checked (validWhenHydrated)');
        
        d.lm.setAutoCheck(Amm.Data.AUTO_CHECK_ALWAYS);
        
            assert.ok(d.lm.getChecked(), 'change: object still checked...');
            assert.deepEqual(err, {name: ['name is required']}, '...and has errors');
            
        d.name = 'aaa';
        
            assert.ok(d.lm.getChecked(), 'change: still checked...');
            assert.deepEqual(err, {}, '...errors disappeared');
            
        d.surname = 51;
        
            assert.ok(d.lm.getChecked(), 'change: checked...');
            assert.deepEqual(err, {surname: ['surname must not be a number']}, '_doOnCheck() works too');
            
        d.surname = 'woo';
            
            assert.ok(d.lm.getChecked(), 'change: checked');
            assert.deepEqual(err, {}, 'no errors');
            
    });
    
    QUnit.test("Data.Object: change fields on hydrate", function(assert) {
        
        var m = new Amm.Data.Mapper();
        var l = [];
        var o = new Amm.Data.Object({
            __mapper: m,
            on__idChange: function(v, o) { l.push(['id', v, o]); },
            on__nameChange: function(v, o) { l.push(['name', v, o]); },
            on__surnameChange: function(v, o) { l.push(['surname', v, o]); },
        });

        o.lm.hydrate({
            id: 5,
            name: 'Aa',
            surname: 'Bb'
        });
        
            assert.deepEqual(l, [
                ['id', 5, undefined],
                ['name', 'Aa', undefined],
                ['surname', 'Bb', undefined]
            ], 'on__<field>Change events triggered by initial hydrate event');
        
        l = [];
        
        o.lm.hydrate({
            id: 10,
            name: 'John',
            surname: 'Doe'
        });
        
            assert.deepEqual(l, [
                ['id', 10, 5],
                ['name', 'John', 'Aa'],
                ['surname', 'Doe', 'Bb']
            ], 'on__<field>Change events triggered by subsequent hydrate event');
        
        l = [];
        
        o.lm.beginUpdate();
        
        o.lm.hydrate({
            id: 20,
            name: 'Foo',
            surname: 'Bar'
        });
        
        o.lm.hydrate({
            id: 30,
            name: 'Nice',
            surname: 'Guy'
        });
        
        o.lm.endUpdate();
        
            assert.deepEqual(l, [
                ['id', 30, 10],
                ['name', 'Nice', 'John'],
                ['surname', 'Guy', 'Doe']
            ], 'on__<field>Change events after endUpdate: old values are ones from beginUpdate() time');
            
        
                
    });
        
    QUnit.test("Data.LifecycleAndMeta.load()", function(assert) {
        
        var t = new Amm.Remote.Transport.Debug({replyTime: 10});
       
        var m = new Amm.Data.Mapper({
            uri: 'dummy.php',
            transactionPrototypes: {
                'default': {
                    transport: t
                }
            }
        });
        var o = new Amm.Data.Object({__mapper: m});
        var data = {
            id: 10,
            name: 'John',
            surname: 'Doe'
        };
        t.success({
            data: data
        });
        var tfLog = [];
        o.lm.subscribe('transactionFailure', function(transaction) {
            tfLog.push([transaction.getResult().getError(), '' + transaction.getResult().getException()]);
        });
        window.d.o = o;
        TestUtils.runStory(assert, [
            {
                time: 0, 
                fn: function() {        
                    o.lm.load(10);
                    assert.ok(!!o.lm.getRunningTransaction(), 'Transaction is running');
                }
            },
            {
                time: 11, 
                fn: function() {
                    assert.notOk(!!o.lm.getRunningTransaction(), 'Transaction is not running');
                    assert.deepEqual(o.lm.getState(), Amm.Data.STATE_EXISTS, 'After load, state is STATE_EXISTS');
                    assert.deepEqual(o.lm.getData(), data, 'Data is same as returned');
                }
            },
            {
                time: 1, 
                fn: function() {
                                        
                    // now test for transaction failure
                    
                    // test loading w/ error
                    t.failure('404', 'Page not found');
                    o.lm.load(11);
                },
            },
            {
                time: 11, 
                fn: function() {
                    assert.ok(Amm.Data.flattenErrors(o.lm.getRemoteErrors()).length,
                        'remote error was registered');
                    assert.equal(tfLog.length, 1, 'outTransactionFailure() triggered');
                    assert.deepEqual(o.lm.getRemoteErrors(), {
                        ERROR_GENERIC: ["Page not found"]
                    });
                },
            },
            {
                time: 1,
                fn: function() {
                    tfLog = [];
                    // test loading w/o data
                    t.success({data: {}});
                    o.lm.load(12);
                }
            },
            {
                time: 11,
                fn: function() {
                    assert.ok(Amm.Data.flattenErrors(o.lm.getRemoteErrors()).length,
                        'remote error was registered');
                    assert.equal(tfLog.length, 1, 'outTransactionFailure() triggered');
                    assert.deepEqual(o.lm.getRemoteErrors(), {
                        ERROR_EXCEPTION: ["Error: TYPE_LOAD transaction result contains no data"]
                    });
                }
            },
            {
                time: 1,
                fn: function() {
                    tfLog = [];
                    // test loading w/o key
                    t.success({data: {name: 'Foo', surname: 'Bar'}});
                    o.lm.load(12);
                }
            },
            {
                time: 11,
                fn: function() {
                    assert.ok(Amm.Data.flattenErrors(o.lm.getRemoteErrors()).length,
                        'remote error was registered');
                    assert.equal(tfLog.length, 1, 'outTransactionFailure() triggered');
                    assert.deepEqual(o.lm.getRemoteErrors(), {
                        ERROR_EXCEPTION: ["Error: Data of TYPE_LOAD transaction result contains no key"]
                    });
                }
            },
        ]);
    });
    
    QUnit.test("Data.LifecycleAndMeta.save()", function(assert) {

        var currentRequest = null;
        
        var tfLog = [];
        
        var t = new Amm.Remote.Transport.Debug({
            replyTime: 10,
            on__request: function(request) {
                currentRequest = request;
            }
        });
       
        var m = new Amm.Data.Mapper({
            uri: 'dummy.php',
            transactionPrototypes: {
                'default': {
                    transport: t,
                    typePath: 'action'
                }
            }
        });
        
        var d = new Amm.Data.Object({
            __mapper: m,
            name: 'John',
            surname: 'Doe',
            lm: {
                on__transactionFailure: function(transaction) {
                    tfLog.push([transaction.getResult().getError(), '' + transaction.getResult().getException()]);
                }
            }
        });
        
        var opRes = null;
        
        TestUtils.runStory(assert, [
            {
                time: 0, 
                fn: function() {        
                    
                        assert.ok(d.lm.getState() === Amm.Data.STATE_NEW, 'Initial state is new');
                        assert.notOk(d.lm.getChecked(), 'Object wasn\'t initially checked');
                        
                    // TODO: think if hydration after save must be full or partial;
                    // currently we need to return full object
                        
                    t.success({
                        data: { 
                            id: 10,
                        }
                    });
                    
                    
                    opRes = d.lm.save();
                    
                        assert.ok(opRes, 'save() returned true');
                        assert.ok(d.lm.getChecked(), 'object became checked on save');
                        assert.ok(!!d.lm.getRunningTransaction(), 'Transaction is running');
                        assert.ok(currentRequest, 'request was issued');
                        assert.ok(currentRequest.getConstRequest().getMethod(), 'POST', 'method is post');
                        assert.deepEqual(currentRequest.getConstRequest().getUri(), 'dummy.php?action=create' ,
                            'Transaction type is "create"');
                        assert.deepEqual(currentRequest.getConstRequest().getData(), {
                            name: 'John',
                            surname: 'Doe'
                        });
                }
            },
            {
                time: 11, 
                fn: function() {
                        assert.notOk(!!d.lm.getRunningTransaction(), 'Transaction is not running');
                        assert.deepEqual(d.lm.getState(), Amm.Data.STATE_EXISTS, 'After save, state is STATE_EXISTS');
                        assert.deepEqual(d.id, 10, 'After save, key field was set');
                        assert.deepEqual(d.lm.getData(), {
                            id: 10,
                            name: 'John',
                            surname: 'Doe'
                        }, 'Provided data preserved');
                }
            },
            {
                time: 1, 
                fn: function() {        
                    d.surname = '';
                    
                    t.success({
                        errorData: {
                            surname: 'surname is required'
                        }
                    });
                    
                    d.lm.save();
                    
                        assert.ok(currentRequest, 'request was issued');
                        
                    var cr = currentRequest.getConstRequest();
                    
                        assert.deepEqual(cr.getUri(), 'dummy.php?action=update&id=10', 'Action type is update (Because record exists) and key is provided');
                        assert.deepEqual(cr.getMethod(), 'POST', 'Method is post');
                        assert.deepEqual(cr.getData(), {
                            id: 10,
                            name: 'John',
                            surname: ''
                        }, 'proper data is sen');
                }
            },
            {
                time: 11,
                fn: function() {
                    
                        assert.notOk(!!d.lm.getRunningTransaction(), 'transaction is finished');
                        assert.deepEqual(tfLog.length, 1, 'Transaction was failed');
                        assert.deepEqual(d.lm.getRemoteErrors(), {
                            'surname': ['surname is required']
                        }, 'returned error data was passed to remoteErrors');
                    
                    d.surname = 'something';
                    
                    t.success({
                        data: {
                            surname: 'Something'
                        }
                    });
                    tfLog = [];
                    
                    
                    d.lm.save();
                    
                        assert.ok(!!d.lm.getRunningTransaction(), 'Transaction is running again');
                    
                },
            },
            {
                time: 11,
                fn: function() {

                        assert.notOk(!!d.lm.getRunningTransaction(), 'transaction is finished');
                        assert.deepEqual(tfLog.length, 0, 'Transaction was not failed');
                        assert.deepEqual(d.lm.getRemoteErrors(), {}, 'no remote errors');
                        assert.deepEqual(d.lm.getData(), {
                            id: 10,
                            name: 'John',
                            surname: 'Something'
                        }, 'Data combined with one returned by update transaction');

                }

            }
        ]);
        
    });
        
    
    QUnit.test("Data.LifecycleAndMeta.delete()", function(assert) {

        var currentRequest = null;
        
        var tfLog = [];
        
        var t = new Amm.Remote.Transport.Debug({
            replyTime: 10,
            on__request: function(request) {
                currentRequest = request;
            }
        });
       
        var m = new Amm.Data.Mapper({
            uri: 'dummy.php',
            transactionPrototypes: {
                'default': {
                    transport: t,
                    typePath: 'action'
                }
            }
        });
        
        var d = new Amm.Data.Object({
            __mapper: m,
            id: 10,
            name: 'John',
            surname: 'Doe',
            lm: {
                on__transactionFailure: function(transaction) {
                    tfLog.push([transaction.getResult().getError(), '' + transaction.getResult().getException()]);
                }
            }
        });
        
        var opRes;
        
        TestUtils.runStory(assert, [
            {
                time: 0, 
                fn: function() {
                    
                        assert.ok(d.lm.getState() === Amm.Data.STATE_EXISTS, 'Initial state is exsts');
                        
                    t.success({
                        error: 'Cannot delete object'
                    });
                    
                    
                    opRes = d.lm.delete();
                    
                        assert.ok(opRes, 'delete() returned true');
                        assert.ok(!!d.lm.getRunningTransaction(), 'Transaction is running');
                        assert.ok(currentRequest, 'request was issued');
                        assert.ok(currentRequest.getConstRequest().getMethod(), 'POST', 'method is post');
                        assert.deepEqual(currentRequest.getConstRequest().getUri(), 'dummy.php?action=delete&id=10' ,
                            'Transaction type is "delete", proper key provided');
                }
            },
            {
                time: 11, 
                fn: function() {
                        assert.notOk(!!d.lm.getRunningTransaction(), 'Transaction is not running');
                        assert.deepEqual(d.lm.getState(), Amm.Data.STATE_EXISTS, 'State is still STATE_EXISTS');
                        assert.deepEqual(d.lm.getRemoteErrors(), {
                            'ERROR_GENERIC': ['Cannot delete object']
                        }, 'returned error data was passed to remoteErrors');
                    
                    tfLog = [];
                    
                    t.success({
                    });
                    
                    d.lm.delete();
                    
                    assert.ok(!!d.lm.getRunningTransaction(), 'Transaction is running again');
                    
                },
            },
            {
                time: 11,
                fn: function() {

                        assert.notOk(!!d.lm.getRunningTransaction(), 'transaction is finished');
                        assert.deepEqual(tfLog.length, 0, 'Transaction was not failed');
                        assert.deepEqual(d.lm.getRemoteErrors(), {}, 'no remote errors');
                        assert.deepEqual(d.lm.getState(), Amm.Data.STATE_DELETED, 'State is now STATE_DELETED');
                }

            }
        ]);
        
    });
    
    QUnit.test("Data.Object: lifecycle template methods", function(assert) {
        
        var log = [];
        var ret = undefined, res;
        var tpl = function(methodName, args) {
            var aa = args? Array.prototype.slice.apply(args) : [];
            var l = [methodName].concat(aa);
            log.push(l);
            //console.log.apply(console, l);
            //console.trace();
            if (ret !== undefined) {
                var tmp = ret;
                if (typeof tmp === 'function') return tmp.apply(this, aa);
                ret = undefined;
                return tmp;
            }
        };
        
        var mkTpl = function(methodName) {
            var m = methodName;
            return function() {
                return tpl(methodName, arguments);
            };
        };
        
        var ovr = {};
        for (var i in Amm.Data.Object.prototype) if (Amm.Data.Object.prototype.hasOwnProperty(i)) {
            if (i.slice(0, 3) !== '_do') continue;
            ovr[i] = mkTpl(i);
        }
        
        var t = new Amm.Remote.Transport.Debug({
            replyTime: 10,
            on__request: function(request) {
                currentRequest = request;
            }
        });
       
        var m = new Amm.Data.Mapper({
            objectPrototype: ovr,
            uri: 'dummy.php',
            transactionPrototypes: {
                'default': {
                    transport: t,
                    typePath: 'action'
                }
            }
        });
        var d = new Amm.Data.Object({
            __mapper: m,
        });
        
        
        
        d.lm.hydrate({id: 10, name: 'john'});
        
            assert.deepEqual(log, [['_doOnActual', false]], '_doOnActual(false) called on hydrate');
            
        log = [];
        
        d.name = 'j2';
        d.lm.check();
        
            assert.deepEqual(log, [['_doOnCheck']], '_doOnCheck called on check()');
            
        log = [];
        ret = false;
        res = d.lm.save();
        
            assert.deepEqual(log, [['_doBeforeSave']], '_doBeforeSave called on save()');
            assert.notOk(res, 'save() returned false because _doBeforeSave() returned false');
            assert.notOk(!!d.lm.getRunningTransaction(), 'Transaction is not running');

        log = [];
        ret = undefined;
        d.lm.save();
        
            assert.deepEqual(log, [['_doBeforeSave']], '_doBeforeSave called on save()');
            assert.notOk(res, 'save() returned true because _doBeforeSave() didn\'t return false');
            assert.ok(!!d.lm.getRunningTransaction(), 'transaction is running');
            
        log = [];
            
            t.success({data: {surname: 'Doe'}}, "ok", 0);
            assert.deepEqual(log, [['_doAfterSave', false], ['_doOnActual', true]], 
                'both _doBeforeSave and _doOnActual called on save()');
                
        log = [];
        ret = false;

        res = d.lm.load('someKey');
        
            assert.deepEqual(log, [['_doBeforeLoad', 'someKey']], '_doBeforeLoad called on load');
            assert.deepEqual(res, false, 'load() returned false because _doBeforeLoad() returned false');
            assert.notOk(!!d.lm.getRunningTransaction(), 'Request isn\'t running');
        
        log = [];
        ret = 23;
        
        d.lm.load('someKey');
            
            assert.deepEqual(log, [['_doBeforeLoad', 'someKey']], '_doBeforeLoad called on load');
            assert.deepEqual(t.getRequest().getConstRequest().getUri(), 'dummy.php?action=load&id=23',
                'Load transaction has altered key');

        log = [];
        t.success({data: {id: 23, name: 'Jane', surname: 'Doe'}}, "ok", 0);
            
            assert.deepEqual(log, [['_doAfterLoad'], ['_doOnActual', false]],
                '_doAfterLoad and _doOnActual called after load');

        
        log = [];
        ret = false;

        res = d.lm.delete();
        
            assert.deepEqual(log, [['_doBeforeDelete']], '_doBeforeDelete called on delete()');
            assert.deepEqual(res, false, 'delete() returned false because _doBeforeDelete() returned false');
            assert.notOk(!!d.lm.getRunningTransaction(), 'Request isn\'t running');
        
        log = [];
        d.lm.delete();
            
            assert.deepEqual(log, [['_doBeforeDelete']], '_doBeforeDelete called on delete()');
            assert.ok(!!d.lm.getRunningTransaction(),
                'Delete transaction is running');

        log = [];
        t.success({}, "ok", 0);
            
            assert.deepEqual(log, [['_doAfterDelete']],
                '_doAfterDelete called after successful delete');
    });
    
    
}) ();
