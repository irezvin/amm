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

    QUnit.test("Data.Record", function(assert) {
        
        var m = new Amm.Data.Mapper(), modified = null;
        
        var name, surname, age;
        
        var r = new Amm.Data.Record({
            __mapper: m,
            id: 10,
            name: 'John',
            surname: 'Doe',
            age: 37,
            on__nameChange: function(v) { name = v; },
            on__surnameChange: function(v) { surname = v; },
            on__ageChange: function(v) { age = v; },
            mm: {
                on__modifiedChange: function(m) { modified = m; },
            }
        });
        
        assert.deepEqual(r.mm.getKey(), 10, 'getKey() works');
        assert.deepEqual(r.mm.getState(), Amm.Data.STATE_EXISTS,
            'since key was provided on hydration, state is STATE_EXISTS');
        
        assert.deepEqual(r.getAge(), 37, 'Basic check: property has pre-set value');
        assert.deepEqual(r.getName(), 'John', 'Basic check: property has pre-set value');
        assert.deepEqual(r.surname, 'Doe', 'Property access works');
        //assert.deepEqual(r.mm.getState(), Amm.Data.STATE_NEW, 'Intiial state is STATE_NEW');
        
        assert.deepEqual(r.mm.getModified(), false, 'Created object is not modified yet');
        r.name = 'Jane';
        assert.deepEqual(modified, true, 'Object becomes modified');
        assert.deepEqual(name, 'Jane', 'Field change event triggered');
        r.name = 'John';
        assert.deepEqual(modified, false, 'Object no more modified');
        
        name = null;
        surname = null;
        age = null;
        
        r.mm.beginUpdate();
        r.name = 'Masha';
        r.surname = 'Medvedeva';
        r.age = 25;
        
            assert.deepEqual([name, surname, age], [null, null, null], 'beginUpdate: property change events aren\'t triggered');
            assert.equal(r.mm.getModified(), false, 'beginUpdate: modified status doesn\'t change');
            
        r.mm.endUpdate();
            
            assert.deepEqual([name, surname, age], ['Masha', 'Medvedeva', 25], 'endUpdate: all property change events triggered');
            assert.equal(r.mm.getModified(), true, 'endUpdate: modified status changed');
        
        
        r.id = 11;
            assert.deepEqual(r.mm.getKey(), 10, 'getKey() returns "old" value of key (set during hydration)');
            
            assert.ok(r.mm.getModified(), 'Object is modified...');
        
        r.mm.revert();
            assert.notOk(r.mm.getModified(), '...revert() makes it not modifierd');
            
        // Patial hydration
        assert.deepEqual(r.mm.getData(), {
            id: 10,
            name: 'John',
            surname: 'Doe',
            age: 37,
        }, 'Initial data is set');
        
        r.mm.hydrate({id: 20, name: 'Xxx'}, true);
        
        assert.deepEqual(r.mm.getData(), {
            id: 20,
            name: 'Xxx',
            surname: 'Doe',
            age: 37,
        }, 'Partially-hydated: some fields are preserved');
        
        assert.notOk(r.mm.getModified(), 'Partially-hydated: object is not modified');
        
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
    
    QUnit.test("Data.ModelMeta localErrors/remoteErrors/errors", function(assert) {
        
        var simp = new Amm.Data.Model();
        var simpCheck = simp.mm.check();
        assert.ok(simpCheck, 'Data.Model without props: check() returns true');
        assert.deepEqual(simp.mm.getErrors(), null,
            'Data.Model after successful check(): getErrors() is NULL');
        
        var m = new Amm.Data.Mapper();
        var o = new Amm.Data.Record({
            __mapper: m,

            name: 'John',
            surname: '',
            birthDate: '1980-01-01',
            email: 'john',
            salary: -2500,

        });

        o.mm.setRemoteErrors({
            msg: 'Invalid data', 
            salary: 'Salary must not be negative number', 
            email: 'Email is too short', 
            surname: 'Surname is required'
        });
        o.mm.setLocalErrors({
            email: 'Email is invalid',
            surname: 'Surname is required', 
        });

            assert.deepEqual(o.mm.getErrors(), {
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

            assert.equal(o.mm.getErrors('x'), null, 'retrieving errors with non-existing key returns null');

            assert.deepEqual(o.mm.getErrors('email'), ['Email is invalid', 'Email is too short'], 'retrieving individual errors');

        o.mm.setLocalErrors('something wrong', 'theProblem');
        
            assert.deepEqual(o.mm.getLocalErrors('theProblem'), ['something wrong'], 'newly-set local error is returned');
            assert.deepEqual(o.mm.getErrors('theProblem'), ['something wrong'], 'newly-set local error is added to combined errors');

        o.mm.setLocalErrors(null, 'email');
        
            assert.deepEqual(o.mm.getLocalErrors('email'), null, 'setting local error key to null clears is');
            assert.deepEqual(o.mm.getRemoteErrors('email'), ['Email is too short'], '..remote error still remains');
            assert.deepEqual(o.mm.getErrors('email'), ['Email is too short'], '...and local key removed from combined errors');
            
        o.mm.addError('must include upper-case letter', 'email');
            assert.deepEqual(o.mm.getLocalErrors('email'), ['must include upper-case letter'], 'added local error');
        
            o.mm._beginUpdateErrors();
            o.mm._endUpdateErrors();
            
        o.mm.addError('ddd', 'email');
            assert.deepEqual(o.mm.getLocalErrors('email'), ['must include upper-case letter', 'ddd'], 'added local error');
        
        o.mm.addError('must include upper-case letter', 'email');
            assert.deepEqual(o.mm.getLocalErrors('email'), ['must include upper-case letter', 'ddd'], 'duplicate didn\'t count');
            
            
        var e_log = [];
        var l_log = [];
        var r_log = [];
        
        o.mm.subscribe('errorsChange', function(e, r) {
            e_log.push([e, r]);
        });
        o.mm.subscribe('remoteErrorsChange', function(e, r) {
            r_log.push([e, r]);
        });
        o.mm.subscribe('localErrorsChange', function(e, r) {
            l_log.push([e, r]);
        });
        
        var oldErrors = Amm.override({}, o.mm.getErrors());
        var oldLocalErrors = Amm.override({}, o.mm.getLocalErrors());
        var oldRemoteErrors = Amm.override({}, o.mm.getRemoteErrors());
        
        o.mm.addError('problem description', 'anotherProblem');
        
            assert.deepEqual(e_log.length, 1, 'addError: errorsChange event triggered');
            assert.deepEqual(l_log.length, 1, 'addError: localErrorsChange event triggered');
            assert.deepEqual(r_log.length, 0, 'addError: remoteErrorsChange event triggered');
            
        e_log = [];
        l_log = [];
        r_log = [];
        
        o.mm.beginUpdate();
        
            o.mm.setLocalErrors(null, 'anotherProblem');
            
            assert.deepEqual(e_log.length, 0, 'beginUpdate: no errorsChange events triggered');
            assert.deepEqual(l_log.length, 0, 'beginUpdate: no localErrorsChange events triggered');
            assert.deepEqual(r_log.length, 0, 'beginUpdate: no remoteErrorsChange events triggered');
            
            o.mm.setRemoteErrors('---xxx---', 'oneMoreRemoteProblem');
            
            assert.deepEqual(e_log.length, 0, 'beginUpdate: no errorsChange events triggered');
            assert.deepEqual(l_log.length, 0, 'beginUpdate: no localErrorsChange events triggered');
            assert.deepEqual(r_log.length, 0, 'beginUpdate: no remoteErrorsChange events triggered');
            
        o.mm.endUpdate();
            
            assert.deepEqual(e_log.length, 1, 'endUpdate: errorsChange event triggered');
            assert.deepEqual(l_log.length, 1, 'endUpdate: localErrorsChange event triggered');
            assert.deepEqual(r_log.length, 1, 'endUpdate: remoteErrorsChange event triggered');
            
    });
    
    var createObjectForChecks = function() {
        
        var m = new Amm.Data.Mapper({
            key: 'id',
        });
        
        var r = new Amm.Data.Record({
            __mapper: m,
            id: 10,
            name: 'John',
            surname: 'Doe',
            age: 21,
            email: 'john@example.com',
            job: null,
            employeed: false,
            
            mm: {
                autoCheck: Amm.Data.AUTO_CHECK_NEVER
            },
            
            _checkField: function(field, value) {
                if (field === 'id' && value == 13) return 'id must not be 13';
            },
            
            _doOnCheck: function() {
                if (/^\d+$/.exec(this.surname)) {
                    this.mm.addError("surname must not be a number", "surname");
                }
            }
        });
        
        m.setMeta({
            name: { validators: 'Amm.Validator.Required' },
            surname: { validators: 'Amm.Validator.Required' },
            age: { validators: {class: 'Amm.Validator.Number', ge: 0, lt: 130} },
            email: { validators: [
                'Amm.Validator.Required',
                function(v) {
                    if (v && !v.match(/^.+@.+\.[^\.]+$/)) return "Please enter valid email";
                }
            ] },
        });
        
        m.setModelValidators({
            ifEmployeedMustHaveJob: function() {
                if (this.employeed && !this.job) return "'job' field must be filled-in for employeed persons";
                if (!this.employeed && this.job) return "'job' field must be empty for unemployeed persons";
            },
            noEmploymentUnder18: 'this.employeed && this.age < 18? "age must be above 18 if person is employeed" : ""'
        });
        
        return r;
        
    };
    
    QUnit.test("Data.ModelMeta.check() - AUTO_CHECK_NEVER", function(assert) {
        
        var r = createObjectForChecks();
        
        window.d.r = r;
        
            assert.ok(r.mm.getValidWhenHydrated(), 'when getValidWhenHydrated()...');
            assert.ok(r.mm.check(), 'check(): object is valid when hydrated');
        
        r.name = '';
        r.id = 13;
        r.age = -50;
        r.surname = '1234';
        r.email = 'xxx';
        r.employeed = true;
        
            assert.notOk(r.mm.check(), 'check(): object isn\'t valid');
            assert.deepEqual(r.mm.getLocalErrors(), {
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
            
            assert.ok(r.mm.getChecked(), 'check(): object.getChecked() === true');
            
        r.email = 'xx1';
            
            assert.notOk(r.mm.getChecked(), 'any field change: object.getChecked() ==> false');
        
        r.name = 'Foo';
        r.surname = 'Bar';
        r.id = 14;
        r.age = 26;
        r.email = 'ivan@protonmail.com';
        r.employeed = true;
        r.job = 'Senior Record Tester';
        
            assert.ok(r.mm.check(), 'check(): object is valid');
            assert.deepEqual(r.mm.getLocalErrors(), null, 'object has no local errors if it is valid');
            
        var data = r.mm.getData();
        data.name = '';
        
        r.mm.hydrate(data);
            assert.ok(r.mm.check(), 'object is valid because hydrted...');
        
        r.mm.setValidWhenHydrated(false);
            assert.notOk(r.mm.getChecked(), 'checked status got reset after setValidWhenHydrated(false)');
            assert.notOk(r.mm.check(), 'object not valid anymore (hydrated with botched data');
        
        r.mm.setValidWhenHydrated(true);
            assert.ok(r.mm.getChecked(), 'checked status became true after setValidWhenHydrated(true)');
            assert.ok(r.mm.check(), 'object valid again');
            
            
    });
    
    QUnit.test("Data.ModelMeta.check() - AUTO_CHECK_SMART", function(assert) {
        
        var r = createObjectForChecks();
        
        window.d.r = r;
        
        r.mm.hydrate({
            name: null,
            surname: null,
            id: null,
            age: null,
            email: null,
            employeed: false
        });
        
        assert.deepEqual(r.mm.getState(), Amm.Data.STATE_NEW);
        
        r.mm.setAutoCheck(Amm.Data.AUTO_CHECK_SMART);
        
        var errors = null;
        
        r.mm.subscribe('localErrorsChange', function(e) { errors = e; });
        
        r.email = 'aaa';
        
            assert.deepEqual(errors, {email: ['Please enter valid email']}, 'Field was checked upon change');
        
        r.email = '';
            assert.deepEqual(errors, {email: ['email is required']}, 'Required field cleared -> error');
            
        r.email = 'aaa@example.com';
        
            assert.deepEqual(errors, {}, 'Field value changed to valid -> error disappeared');
            
            
        r.id = 13;
            
            assert.deepEqual(errors, {id: ['id must not be 13']}, 'internal check worked');
        
    });
    
    
    QUnit.test("Data.ModelMeta.check() - AUTO_CHECK_ALWAYS", function(assert) {
        
        var r = createObjectForChecks();
        
        window.d.r = r;
        
        var err;
        
        r.mm.subscribe('localErrorsChange', function(e) { err = e; });
        
        r.name = '';
        r.age = -50;
        
            assert.notOk(r.mm.getChecked(), 'initially object is checked (validWhenHydrated)');
        
        r.mm.setAutoCheck(Amm.Data.AUTO_CHECK_ALWAYS);
        
            assert.ok(r.mm.getChecked(), 'change: object still checked...');
            assert.deepEqual(err, {
                age: ['age must not be less than 0'],
                name: ['name is required']
            }, '...and has errors');
            
            r.age = 50;
            assert.deepEqual(err, {
                name: ['name is required']
            }, 'field changed - error disappeared');
            
        r.name = 'aaa';
        
            assert.ok(r.mm.getChecked(), 'change: still checked...');
            assert.deepEqual(err, {}, '...errors disappeared');
            
        r.surname = 51;
        
            assert.ok(r.mm.getChecked(), 'change: checked...');
            assert.deepEqual(err, {surname: ['surname must not be a number']}, '_doOnCheck() works too');
            
        r.surname = 'woo';
            
            assert.ok(r.mm.getChecked(), 'change: checked');
            assert.deepEqual(err, {}, 'no errors');
            
    });
    
    QUnit.test("Data.ModelMeta.getLocalErrors(field, mode); checkFields()", function(assert) {
        
        var r = createObjectForChecks();
        
        window.d.r = r;
        
        var err, dnc = 0;
        
        r.mm.subscribe('localErrorsChange', function(e) { err = e; });
        
        r.name = '';
        
        r._doOnCheck = function() {
            this.mm.addError("wtf", "name");
            dnc++;
        };
        
        r.mm.setAutoCheck(Amm.Data.AUTO_CHECK_SMART);
        
        assert.deepEqual(r.mm.getLocalErrors('name', Amm.Data.LOCAL_ERRORS_AS_IS), null,
            'getLocalErrors(): No errors returned when mode is Amm.Data.LOCAL_ERRORS_AS_IS');
        
        assert.deepEqual(
            r.mm.getLocalErrors('name', Amm.Data.LOCAL_ERRORS_CHECK_FIELDS_ONLY), 
            [
                "name is required"
            ], 
            'getLocalErrors(): No extra errors returned when mode is Amm.Data.LOCAL_ERRORS_CHECK_FIELDS_ONLY'
        );
        
        assert.deepEqual(dnc, 0, 
            'getLocalErrors(): _doOnCheck() not ran when mode is Amm.Data.LOCAL_ERRORS_CHECK_FIELDS_ONLY'
        );
        
        assert.deepEqual(
            r.mm.getLocalErrors('name'), 
            [
                "name is required",
                "wtf"
            ], 
            'getLocalErrors(): Extra errors returned when mode is Amm.Data.LOCAL_ERRORS_CHECK'
        );
        assert.deepEqual(dnc, 1, 
            'getLocalErrors(): _doOnCheck() ran when mode is Amm.Data.LOCAL_ERRORS_CHECK'
        );

        r.mm.setAutoCheck(Amm.Data.AUTO_CHECK_NEVER);
        r.mm.setLocalErrors(null);
        r.name = '';
        r.age = -50;
        dnc = 0;
        
        r.mm.checkFields('age');
        assert.deepEqual(
            r.mm.getLocalErrors(), 
            {
                age: [
                    "age must not be less than 0",
                ], 
            },
            'after checkFeilds(field) only errors related to that field are set'
        );
        
        r.mm.checkFields();
        assert.deepEqual(
            r.mm.getLocalErrors(), 
            {
                age: [
                    "age must not be less than 0",
                ], 
                name: [
                    "name is required"
                ]
            },
            'after checkFeilds() only errors related to fields are set'
        );
        assert.deepEqual(dnc, 0, 
            '_doOnCheck() not ran on checkFields()'
        );
        

    });
    
    
    QUnit.test("Data.Record: change fields on hydrate", function(assert) {
        
        var m = new Amm.Data.Mapper();
        var l = [];
        var r = new Amm.Data.Record({
            __mapper: m,
            on__idChange: function(v, r) { l.push(['id', v, r]); },
            on__nameChange: function(v, r) { l.push(['name', v, r]); },
            on__surnameChange: function(v, r) { l.push(['surname', v, r]); },
        });

        r.mm.hydrate({
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
        
        r.mm.hydrate({
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
        
        r.mm.beginUpdate();
        
        r.mm.hydrate({
            id: 20,
            name: 'Foo',
            surname: 'Bar'
        });
        
        r.mm.hydrate({
            id: 30,
            name: 'Nice',
            surname: 'Guy'
        });
        
        r.mm.endUpdate();
        
            assert.deepEqual(l, [
                ['id', 30, 10],
                ['name', 'Nice', 'John'],
                ['surname', 'Guy', 'Doe']
            ], 'on__<field>Change events after endUpdate: old values are ones from beginUpdate() time');
            
        
                
    });
        
    QUnit.test("Data.ModelMeta.load()", function(assert) {
        
        var t = new Amm.Remote.Transport.Debug({replyTime: 10});
       
        var m = new Amm.Data.Mapper({
            uri: 'dummy.php',
            transactionPrototypes: {
                'default': {
                    transport: t
                }
            }
        });
        var r = new Amm.Data.Record({__mapper: m});
        var data = {
            id: 10,
            name: 'John',
            surname: 'Doe'
        };
        t.success({
            data: data
        });
        var tfLog = [];
        r.mm.subscribe('transactionFailure', function(transaction) {
            tfLog.push([transaction.getResult().getError(), '' + transaction.getResult().getException()]);
        });
        window.d.r = r;
        TestUtils.runStory(assert, [
            {
                time: 0, 
                fn: function() {        
                    r.mm.load(10);
                    assert.ok(!!r.mm.getTransaction(), 'Transaction is running');
                }
            },
            {
                time: 11, 
                fn: function() {
                    assert.notOk(!!r.mm.getTransaction(), 'Transaction is not running');
                    assert.deepEqual(r.mm.getState(), Amm.Data.STATE_EXISTS, 'After load, state is STATE_EXISTS');
                    assert.deepEqual(r.mm.getData(), data, 'Data is same as returned');
                }
            },
            {
                time: 1, 
                fn: function() {
                                        
                    // now test for transaction failure
                    
                    // test loading w/ error
                    t.failure('404', 'Page not found');
                    r.mm.load(11);
                },
            },
            {
                time: 11, 
                fn: function() {
                    assert.ok(Amm.Data.flattenErrors(r.mm.getRemoteErrors()).length,
                        'remote error was registered');
                    assert.equal(tfLog.length, 1, 'outTransactionFailure() triggered');
                    assert.deepEqual(r.mm.getRemoteErrors(), {
                        ERROR_GENERIC: ["Page not found"]
                    });
                },
            },
            {
                time: 1,
                fn: function() {
                    tfLog = [];
                    // test loading w/r data
                    t.success({data: {}});
                    r.mm.load(12);
                }
            },
            {
                time: 11,
                fn: function() {
                    assert.ok(Amm.Data.flattenErrors(r.mm.getRemoteErrors()).length,
                        'remote error was registered');
                    assert.equal(tfLog.length, 1, 'outTransactionFailure() triggered');
                    assert.deepEqual(r.mm.getRemoteErrors(), {
                        ERROR_EXCEPTION: ["Error: TYPE_LOAD transaction result contains no data"]
                    });
                }
            },
            {
                time: 1,
                fn: function() {
                    tfLog = [];
                    // test loading w/r key
                    t.success({data: {name: 'Foo', surname: 'Bar'}});
                    r.mm.load(12);
                }
            },
            {
                time: 11,
                fn: function() {
                    assert.ok(Amm.Data.flattenErrors(r.mm.getRemoteErrors()).length,
                        'remote error was registered');
                    assert.equal(tfLog.length, 1, 'outTransactionFailure() triggered');
                    assert.deepEqual(r.mm.getRemoteErrors(), {
                        ERROR_EXCEPTION: ["Error: Data of TYPE_LOAD transaction result contains no key"]
                    });
                }
            },
        ]);
    });
    
    QUnit.test("Data.ModelMeta.save()", function(assert) {

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
        
        var r = new Amm.Data.Record({
            __mapper: m,
            name: 'John',
            surname: 'Doe',
            mm: {
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
                    
                        assert.ok(r.mm.getState() === Amm.Data.STATE_NEW, 'Initial state is new');
                        assert.notOk(r.mm.getChecked(), 'Object wasn\'t initially checked');
                        
                    // TODO: think if hydration after save must be full or partial;
                    // currently we need to return full object
                        
                    t.success({
                        data: { 
                            id: 10,
                        }
                    });
                    
                    
                    opRes = r.mm.save();
                    
                        assert.ok(opRes, 'save() returned true');
                        assert.ok(r.mm.getChecked(), 'object became checked on save');
                        assert.ok(!!r.mm.getTransaction(), 'Transaction is running');
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
                        assert.notOk(!!r.mm.getTransaction(), 'Transaction is not running');
                        assert.deepEqual(r.mm.getState(), Amm.Data.STATE_EXISTS, 'After save, state is STATE_EXISTS');
                        assert.deepEqual(r.id, 10, 'After save, key field was set');
                        assert.deepEqual(r.mm.getData(), {
                            id: 10,
                            name: 'John',
                            surname: 'Doe'
                        }, 'Provided data preserved');
                }
            },
            {
                time: 1, 
                fn: function() {        
                    r.surname = '';
                    
                    t.success({
                        errorData: {
                            surname: 'surname is required'
                        }
                    });
                    
                    r.mm.save();
                    
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
                    
                        assert.notOk(!!r.mm.getTransaction(), 'transaction is finished');
                        assert.deepEqual(tfLog.length, 1, 'Transaction was failed');
                        assert.deepEqual(r.mm.getRemoteErrors(), {
                            'surname': ['surname is required']
                        }, 'returned error data was passed to remoteErrors');
                    
                    r.surname = 'something';
                    
                    t.success({
                        data: {
                            surname: 'Something'
                        }
                    });
                    tfLog = [];
                    
                    
                    r.mm.save();
                    
                        assert.ok(!!r.mm.getTransaction(), 'Transaction is running again');
                    
                },
            },
            {
                time: 11,
                fn: function() {

                        assert.notOk(!!r.mm.getTransaction(), 'transaction is finished');
                        assert.deepEqual(tfLog.length, 0, 'Transaction was not failed');
                        assert.deepEqual(r.mm.getRemoteErrors(), null, 'no remote errors');
                        assert.deepEqual(r.mm.getData(), {
                            id: 10,
                            name: 'John',
                            surname: 'Something'
                        }, 'Data combined with one returned by update transaction');

                }

            }
        ]);
        
    });
        
    
    QUnit.test("Data.ModelMeta.delete()", function(assert) {

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
        
        var r = new Amm.Data.Record({
            __mapper: m,
            id: 10,
            name: 'John',
            surname: 'Doe',
            mm: {
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
                    
                        assert.ok(r.mm.getState() === Amm.Data.STATE_EXISTS, 'Initial state is exsts');
                        
                    t.success({
                        error: 'Cannot delete object'
                    });
                    
                    
                    opRes = r.mm.delete();
                    
                        assert.ok(opRes, 'delete() returned true');
                        assert.ok(!!r.mm.getTransaction(), 'Transaction is running');
                        assert.ok(currentRequest, 'request was issued');
                        assert.ok(currentRequest.getConstRequest().getMethod(), 'POST', 'method is post');
                        assert.deepEqual(currentRequest.getConstRequest().getUri(), 'dummy.php?action=delete&id=10' ,
                            'Transaction type is "delete", proper key provided');
                }
            },
            {
                time: 11, 
                fn: function() {
                        assert.notOk(!!r.mm.getTransaction(), 'Transaction is not running');
                        assert.deepEqual(r.mm.getState(), Amm.Data.STATE_EXISTS, 'State is still STATE_EXISTS');
                        assert.deepEqual(r.mm.getRemoteErrors(), {
                            'ERROR_GENERIC': ['Cannot delete object']
                        }, 'returned error data was passed to remoteErrors');
                    
                    tfLog = [];
                    
                    t.success({
                    });
                    
                    r.mm.delete();
                    
                    assert.ok(!!r.mm.getTransaction(), 'Transaction is running again');
                    
                },
            },
            {
                time: 11,
                fn: function() {

                        assert.notOk(!!r.mm.getTransaction(), 'transaction is finished');
                        assert.deepEqual(tfLog.length, 0, 'Transaction was not failed');
                        assert.deepEqual(r.mm.getRemoteErrors(), null, 'no remote errors');
                        assert.deepEqual(r.mm.getState(), Amm.Data.STATE_DELETED, 'State is now STATE_DELETED');
                }

            }
        ]);
        
    });
    
    QUnit.test("Data.Record: lifecycle template methods", function(assert) {
        
        var log = [];
        var ret = undefined, res;
        var currentRequest;
        var tpl = function(methodName, args) {
            var aa = args? Array.prototype.slice.apply(args) : [];
            var l = [methodName].concat(aa);
            log.push(l);
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
        for (var i in Amm.Data.Record.prototype) if (Amm.Data.Record.prototype.hasOwnProperty(i)) {
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
            recordOptions: ovr,
            uri: 'dummy.php',
            transactionPrototypes: {
                'default': {
                    transport: t,
                    typePath: 'action'
                }
            }
        });
        var r = new Amm.Data.Record({
            __mapper: m,
        });
        
        
        
        r.mm.hydrate({id: 10, name: 'john'});
        
            assert.deepEqual(log, [['_doOnActual', false], ['_doOnCompute']], '_doOnActual(false) called on hydrate');
            
        log = [];
        
        r.name = 'j2';
        r.mm.check();
        
            assert.deepEqual(log, [['_doOnCompute'], ['_doOnCheck']], '_doOnCheck called on check()');
            
        log = [];
        ret = false;
        var res = r.mm.save();
        
            assert.deepEqual(log, [['_doBeforeSave']], '_doBeforeSave called on save()');
            assert.notOk(res, 'save() returned false because _doBeforeSave() returned false');
            assert.notOk(!!r.mm.getTransaction(), 'Transaction is not running');

        log = [];
        ret = undefined;
        r.mm.save();
        
            assert.deepEqual(log, [['_doBeforeSave']], '_doBeforeSave called on save()');
            assert.notOk(res, 'save() returned true because _doBeforeSave() didn\'t return false');
            assert.ok(!!r.mm.getTransaction(), 'transaction is running');
            
        log = [];
            
            t.success({data: {surname: 'Doe'}}, "ok", 0);
            assert.deepEqual(log, [['_doAfterSave', false], ['_doOnActual', true], ['_doOnCompute']], 
                'both _doBeforeSave and _doOnActual called on save()');
                
        log = [];
        ret = false;

        res = r.mm.load('someKey');
        
            assert.deepEqual(log, [['_doBeforeLoad', 'someKey']], '_doBeforeLoad called on load');
            assert.deepEqual(res, false, 'load() returned false because _doBeforeLoad() returned false');
            assert.notOk(!!r.mm.getTransaction(), 'Request isn\'t running');
        
        log = [];
        ret = 23;
        
        r.mm.load('someKey');
            
            assert.deepEqual(log, [['_doBeforeLoad', 'someKey']], '_doBeforeLoad called on load');
            assert.deepEqual(t.getRequest().getConstRequest().getUri(), 'dummy.php?action=load&id=23',
                'Load transaction has altered key');

        log = [];
        t.success({data: {id: 23, name: 'Jane', surname: 'Doe'}}, "ok", 0);
            
            assert.deepEqual(log, [['_doAfterLoad'], ['_doOnActual', false], ['_doOnCompute']],
                '_doAfterLoad and _doOnActual called after load');

        
        log = [];
        ret = false;

        res = r.mm.delete();
        
            assert.deepEqual(log, [['_doBeforeDelete']], '_doBeforeDelete called on delete()');
            assert.deepEqual(res, false, 'delete() returned false because _doBeforeDelete() returned false');
            assert.notOk(!!r.mm.getTransaction(), 'Request isn\'t running');
        
        log = [];
        r.mm.delete();
            
            assert.deepEqual(log, [['_doBeforeDelete']], '_doBeforeDelete called on delete()');
            assert.ok(!!r.mm.getTransaction(),
                'Delete transaction is running');

        log = [];
        t.success({}, "ok", 0);
            
            assert.deepEqual(log, [['_doAfterDelete']],
                '_doAfterDelete called after successful delete');
    });
    
    QUnit.test("Data.FieldMeta", function(assert) {
        
        var log = [];
        var mLog = [];
        
        var mapper = new Amm.Data.Mapper({
            on__metaChange: function(meta, oldMeta, field, property, value, oldValue) {
                var args = Array.prototype.slice.apply(arguments);
                
                // first two arguments are always the same, so we skip them
                args.shift();
                args.shift();
                for (var i = 0; i < args.length; i++) {
                    var c = Amm.getClass(args[i]);
                    if (c) {
                        args[i] = c;
                    }
                }
                mLog.push(args);
            }
        });
        
        var meta = new Amm.Data.FieldMeta();
        
        meta._notify = function(value, oldValue, name) {
            log.push([name, value, oldValue]);
            Amm.Data.FieldMeta.prototype._notify.apply(this, Array.prototype.slice.apply(arguments));
        };
        
        mapper.setMeta(meta, 'theProp');
        
        assert.deepEqual(mLog, [['theProp', undefined, Amm.getClass(meta), undefined]], 
            'Mapper triggered event when meta-field was added');
        
        log = [];
        mLog = [];
        
        meta.setProperty('xxx', 'foo');
        
            assert.ok('foo' in meta, 'meta-property created');
            assert.deepEqual(meta.foo, 'xxx', 'meta-property returns the value');
            
            assert.deepEqual(log, [['foo', 'xxx', undefined]], 
                'meta-property triggered change notification');
                
            assert.deepEqual(mLog, [['theProp', 'foo', 'xxx', undefined]], 
                'meta-property change event raised by the mapper');
        
        log = [];
        mLog = [];
        
            meta.foo = 'yyy';
            assert.deepEqual(log, [['foo', 'yyy', 'xxx']], 
                'meta-property change notification');
            assert.deepEqual(mLog, [['theProp', 'foo', 'yyy', 'xxx']],
                'meta-property change event raised by the mapper');
            
        log = [];
        mLog = [];
        
            mapper.setMeta('The Label', 'theProp', 'label');
            
            assert.deepEqual(log, [['label', 'The Label', null]],
                'meta-property change notification');
            assert.deepEqual(mLog, [['theProp', 'label', 'The Label', null]],
                'meta-property change event raised by the mapper');

            assert.ok(mapper.getMeta().theProp === meta,
                'mapper.getMeta() returns all meta-fields');
        
            assert.ok(mapper.getMeta('theProp') === meta,
                'mapper.getMeta(field) returns meta-field');
                
            assert.deepEqual(mapper.getMeta('theProp', 'label'), 'The Label',
                'mapper.getMeta(field, property) returns meta-property value');
                
            assert.deepEqual(mapper.getMeta('theProp', '<no such meta-prop>'), undefined,
                'mapper.getMeta returns undefined for non-existent meta-property');
            
            assert.deepEqual(mapper.getMeta('<no such prop>'), undefined,
                'mapper.getMeta returns undefined for non-existent meta-field');
                
        mapper.setMeta({
            name: {
                label: 'Name',
                required: true
            },
            age: {
                label: 'Age',
                required: true,
                validators: [
                    {
                        'class': 'Amm.Validator.Number',
                        ge: 0
                    }
                ]
            },
            email: {
                label: 'E-mail',
                required: true,
                validators: function(v) { 
                    if (v && !v.match(/@/)) return "%field must be a valid e-mail"; 
                }
            }
        });
        
        var r = new Amm.Data.Record({
            __mapper: mapper, name: '', age: '', email: '',
            mm: { autoCheck: Amm.Data.AUTO_CHECK_SMART }
        });
        
        r.m = mapper;
        r.r = r;
        r.mm.check();
        assert.deepEqual(r.mm.getErrors(), {
            name: ['Name is required'],
            age: ['Age is required'],
            email: ['E-mail is required']
        }, 'Empty required fields produce errors');
        
        mapper.setMeta(false, 'email', 'required');
        
        assert.deepEqual(r.mm.getErrors(), {
            name: ['Name is required'],
            age: ['Age is required'],
        }, 'Field required meta-property set to false => error disappeared');
        
        r.age = -1;
        r.email = 'zz';
        r.name = 'Foo';
        
        assert.deepEqual(r.mm.getErrors(), {
            age: ['Age must not be less than 0'],
            email: ['E-mail must be a valid e-mail']
        }, 'Validation works');
        
        mapper.setMeta('The Age', 'age', 'label');
        
        assert.deepEqual(r.mm.getErrors('age'), ['The Age must not be less than 0'],
            'Label changed -> object re-validated and error message updated');
        
    });
    
    QUnit.test("Trait.Data", function(assert) {
        
        var personMapper = new Amm.Data.Mapper({
            meta: {
                name: {
                    label: 'Name'
                },
                email: {
                    label: 'E-mail',
                    required: true,
                    validators: [
                        function(v) {
                            if (v && !(v.match(/^[^@]+@.+\.[^\.]+/)))
                                return "Please enter valid e-mail";
                        }
                    ]
                }
            }
        });
        
        var productMapper = new Amm.Data.Mapper({
            meta: {
                sku: {
                    label: 'SKU',
                    required: true
                },
                name: {
                    label: 'Name of Product',
                    required: true
                },
                price: {
                    label: 'Price',
                    required: true,
                    validators: [
                        new Amm.Validator.Number({
                            ge: 0,
                            msgMustBeGe: "There cannot be negative price"
                        })
                    ]
                }
            }
        });
        
        var person = new Amm.Data.Record({
            __mapper: personMapper,
            mm: {
                autoCheck: Amm.Data.AUTO_CHECK_SMART
            },
            name: 'John',
            email: 'johndoe@example.com'
        });
        
        var product = new Amm.Data.Record({
            __mapper: productMapper,
            sku: '010201',
            name: 'PureGeek Compact 13" Laptop',
            price: 1099.95,
        });
        
        var cmpModified, nameModified, emailModified, priceModified;
        
        var cmp = new Amm.Element({
            traits: [Amm.Trait.Component, Amm.Trait.Data],
            dataObject: person, 
            on__dataModifiedChange: function(m) { cmpModified = m; }
        });
        
        var simpleInputValue, annotatedInputValue, fieldInputValue;
        
        var simpleInput = new Amm.Element({
            id: 'name',
            traits: [Amm.Trait.Input, Amm.Trait.Data],
            component: cmp,
            on__valueChange: function(v) { simpleInputValue = v; },
            on__dataModifiedChange: function(m) { nameModified = m; }
        });
        
        var annotatedInput = new Amm.Element({
            id: 'email',
            traits: [Amm.Trait.Input, Amm.Trait.Annotated, Amm.Trait.Data],
            component: cmp,
            on__valueChange: function(v) { annotatedInputValue = v; },
            on__dataModifiedChange: function(m) { emailModified = m; }
        });
        
        var fieldInput = new Amm.Element({
            id: 'price',
            traits: [Amm.Trait.Input, Amm.Trait.Field, Amm.Trait.Annotated, Amm.Trait.Data],
            component: cmp,
            validators: [
                {
                    'class': Amm.Validator.Number,
                    msgMustBeLe: "We only sell products below 1M",
                    le: 1000*1000
                }
            ],
            on__dataValueChange: function(v) { fieldInputValue = v; },
            on__dataModifiedChange: function(m) { priceModified = m; }
        });
        
            assert.ok(simpleInput.getDataObject() === person,
                'dataObject was propagated from the component');

            assert.equal(simpleInput.getDataProperty(), 'name',
                'dataProperty equals to element id');

            assert.ok(simpleInput.getDataHasProperty(),
                'dataHasProperty (1)');

            assert.ok(annotatedInput.getDataObject() === person,
                'dataObject was propagated from the component (2)');

            assert.ok(annotatedInput.getDataHasProperty(),
                'dataHasProperty (2)');

            assert.ok(fieldInput.getDataObject() === person,
                'dataObject was propagated from the component (3)');

            assert.notOk(fieldInput.getDataHasProperty(),
                '!dataHasProperty (3)');

            assert.ok(fieldInput.getLocked(),
                '!dataHasProperty => locked');

            assert.equal(simpleInput.getValue(), 'John',
                'input field has model value');

            assert.equal(annotatedInput.getValue(), 'johndoe@example.com',
                'input field has model value');

            assert.equal(annotatedInput.getRequired(), true, 
                'Required annotation was filled-in from meta');

            assert.equal(annotatedInput.getLabel(), 'E-mail',
                'Label annotation was filled-in from meta');

            assert.equal(cmp.getDataModified(), false,
                'Component bound to data object: dataModified is FALSE');
                
            assert.equal(simpleInput.getDataModified(), false,
                'First control: dataModified is FALSE');
                
            assert.equal(annotatedInput.getDataModified(), false,
                'Second control: dataModified is FALSE');
                

        person.name = 'Ivan';
        
            assert.equal(simpleInputValue, 'Ivan',
                'Object property change => input value was updated');
                
            simpleInput.setValue('Lizzy');
        
            assert.equal(person.name, 'Lizzy',
                'Input value change => object property was updated');

            assert.equal(cmpModified, true,
                'Property change: component bound to data object: dataModified is TRUE');

            assert.equal(nameModified, true,
                'Property change: First control: dataModified is TRUE');
                
            assert.equal(annotatedInput.getDataModified(), false,
                'Property change: Second control: dataModified is FALSE');
                
        annotatedInput.setValue('Qwerty');
        
            assert.deepEqual(person.email, 'Qwerty', 
                'Value from input got to the data property');
            
            assert.deepEqual(annotatedInput.getError(), ["Please enter valid e-mail"],
                'Errors in sync');
            
        person.email = 'xx@yy.com';
        
            assert.deepEqual(annotatedInput.getError(), null,
                'Errors in sync (2)');
            
        // check what happens when we switch to different object with different metadata
        
        cmp.setDataObject(product);
        
            assert.ok(simpleInput.getDataObject() === product,
                'dataObject was propagated from the component');

            assert.ok(simpleInput.getDataHasProperty(),
                'dataHasProperty (1)');
                
            assert.deepEqual(simpleInput.getValue(), product.name,
                'control value updated after object change');

            assert.ok(annotatedInput.getDataObject() === product,
                'dataObject was propagated from the component (2)');

            assert.notOk(annotatedInput.getDataHasProperty(),
                '!dataHasProperty (2)');
                
            assert.ok(fieldInput.getDataObject() === product,
                'dataObject was propagated from the component (3)');

            assert.ok(fieldInput.getDataHasProperty(),
                'dataHasProperty (3)');
                
            assert.notOk(fieldInput.getLocked(),
                'dataHasProperty => !locked');
                
            assert.deepEqual(fieldInput.getFieldValue(), product.price,
                'control value updated after object change (form)');
            
            assert.deepEqual(fieldInput.getDataUpdateMode(), Amm.Trait.Data.UPDATE_VALIDATE,
                'by default data field is updated on validate');
                
            fieldInput.setValue(1000*1000 + 1);
            
            assert.deepEqual(product.price, 1099.95,
                "Value didnt change because form field is invalid");
                
            assert.deepEqual(fieldInput.getFieldLocalErrors(), ["We only sell products below 1M"],
                "Field input error is local");
            
            fieldInput.setValue(-1);
            
            assert.deepEqual(fieldInput.getFieldLocalErrors(), null,
                "Field input error is valid");
                
            assert.deepEqual(product.price, -1,
                "Since field has no local errors, object property was updated");
                
            assert.deepEqual(fieldInput.getFieldRemoteErrors(), ["There cannot be negative price"],
                "Field got remote error from the object");
            
    });
    
    QUnit.test("Data.FieldMeta.clone", function(assert) {
        
        var f = new Amm.Data.FieldMeta({
            name: 'Foo',
            'default': 0,
            validators: [
                new Amm.Validator.Number({lt: 1000})
            ],
            label: 'The Foo',
            someProp: 'Some Val'
        });
        
        var b = f.clone(null, 'Bar');
        
        assert.deepEqual(b.name, 'Bar');
        assert.deepEqual(b.default, 0);
        assert.ok(b.validators[0] === f.validators[0]);
        assert.ok(b.label, 'The Foo');
        assert.deepEqual(b.someProp, 'Some Val');
        
        b.label = 'Zzz';
        assert.deepEqual(f.label, 'The Foo');
        assert.deepEqual(b.label, 'Zzz');
        
    });
    
    QUnit.test("Data.ModelMeta: meta overrides", function(assert) {
        
        var 
        
            mcLog = [],

            master = new Amm.Data.Model({
                mm: {
                    meta: {
                        name: {
                            label: 'Master Name',
                            required: true,
                        },
                        surname: {
                            label: 'Master Surname',
                            required: true,
                        },
                        email: {
                            label: 'Master Email',
                            description: 'The Email Address Description',
                        }
                    }
                }
            }),

            slave = new Amm.Data.Model({
                mm: {
                    metaProvider: master.mm,
                    meta: {
                        surname: {
                            label: 'Slave Surname'
                        },
                        extra: {
                            label: 'Slave Extra'
                        }
                    },
                    on__metaChange: function(meta, old, prop, value, oldValue) {
                        mcLog.push([prop, value, oldValue]);
                    },
                }

            });
        
            assert.deepEqual(slave.mm.getMeta('name', 'label'), 'Master Name', 
                'Slave meta-provider got metadata from master');
            
            assert.deepEqual(slave.mm.getMeta('surname', 'label'), 'Slave Surname',
                'Slave overrides are in place');
        
            assert.deepEqual(slave.mm.getMeta('extra', 'label'), 'Slave Extra',
                'Slave original meta is in place');

        mcLog = [];
        master.mm.setMeta('Master alt surname', 'surname', 'label');
        
            assert.deepEqual(mcLog.length, 0, 'When slave override is in place, ' 
            + 'change in master meta doesn\'t trigger event');
    
        mcLog = [];
        slave.mm.setMeta('Slave Email', 'email', 'label');

        assert.deepEqual(mcLog, [[undefined, undefined, undefined]],
            'Creating override meta triggers global meta-change event');
            
        assert.deepEqual(slave.mm.getMeta('email', 'label'), 'Slave Email',
            'Newly-set override meta-property in place');
            
        assert.deepEqual(slave.mm.getMeta('email', 'description'), 'The Email Address Description',
            'Other meta-property of master meta provider in place');
    
        mcLog = [];
        slave.mm.setMeta(null, 'email');
        
        assert.deepEqual(mcLog, [[undefined, undefined, undefined]],
            'Deleting override meta triggers global meta-change event');
            
        assert.deepEqual(slave.mm.getMeta('email', 'label'), 'Master Email',
            'Deleting override meta: master override meta-property back in place');
        
    });
    
    
    QUnit.test("Data.ModelMeta: create properties; 'set' meta-property", function(assert) {
       
        var m = new Amm.Data.Model({
            mm: {
                meta: {
                    name: { 
                        def: 'Unnamed',
                        set: function(ret) {
                            if (typeof ret.value !== 'string') {
                                ret.error = "%field must be a string";
                                return;
                            }
                            if (typeof ret.value === 'string') {
                                ret.value = ret.value.replace(/^\s+|\s+$/g, '');
                            }
                        }
                    },
                    surname: { def: 'Empty' },
                    email: { def: 'noname@example.com' }
                }
            }
        });
        
            assert.deepEqual(m.name, 'Unnamed', 
                'Meta default -> field created (1)');
            
            assert.deepEqual(m.surname, 'Empty', 
                'Meta default -> field created (2)');
            
            assert.deepEqual(m.email, 'noname@example.com', 
                'Meta default -> field created (3)');
        
        m.mm.setMeta({ def: 'No comments' }, 'comment');
        
            assert.deepEqual(m.comment, 'No comments',
                'Meta default -> field created (4)');
                
        m.name = null;
            assert.deepEqual(m.name, null, "'set': invalid value was set");
            assert.deepEqual(m.mm.getErrors('name'), ["name must be a string"],
                "'set': when ret.error is set, error returned with model errors");
                
        m.mm.check(true);
            assert.deepEqual(m.mm.getErrors('name'), ["name must be a string"],
                "'set'-provided error isn't cleared after another check()");
            
                
        m.name = ' John ';
            assert.deepEqual(m.name, 'John', 
                "'set': ret.value changed");
            assert.deepEqual(m.mm.getErrors('name'), null, 
                "Errors cleared after successful 'set'");
        
    });
    
    QUnit.test("Data: computed fields", function(assert) {
        
        var c, d, e, dt = new Amm.Data.Model({
            mm: {
                meta: {
                    a: {
                        def: 10,
                        validators: function(v) { 
                            if (v < 7) return 'Value must be > 7';
                        }
                    },
                    b: {
                        def: 20,
                    },
                    c: {
                        compute: function() {
                            return this.a + this.b;
                        }
                    },
                    d: {
                        compute: function() {
                            return '{{' + this.c + '}}';
                        }
                    },
                    e: {
                        compute: function() {
                            return !this._mm.getErrors('a');
                        }
                    }
                }
            },
            on__cChange: function(v) { c = v; },
            on__dChange: function(v) { d = v; },
            on__eChange: function(v) { e = v; }
        });
            
            assert.deepEqual(dt.c, 30, 'Initial value of computed field');
            assert.deepEqual(dt.d, '{{30}}', 'Initial value of dependent computed field');
            assert.deepEqual(dt.e, true, 'Initial value of dependent computed field');
            
        dt.a = 5;
        
            assert.deepEqual(dt.c, 25, 'Altered value of computed field');
            assert.deepEqual(dt.d, '{{25}}', 'Altered value of dependent computed field');
            assert.deepEqual(c, 25, 'Altered value: change triggered');
            assert.deepEqual(d, '{{25}}', 'Dependent computed field: change triggered');
            assert.deepEqual(e, false, 'Changed value of dependent computed field');
            
        c = undefined;
        dt.c = 135;
        
            assert.deepEqual(dt.c, 25, 'Setter doesn\'t change computed value');
            assert.deepEqual(c, undefined, 'Setter doesn\'t trigger change of computed value');
            
            
        // ensures that width is always smaller dimension
        var dnc = 0, rect1 = new Amm.Data.Model({
            mm: {
                meta: {
                    width: {
                        def: 0,
                    },
                    height: {
                        def: 0,
                    },
                },
            },
            _doOnCompute: function() {
                dnc++;
                if (this.width && this.height && this.width > this.height) {
                    var tmp = this.height;
                    this.height = this.width;
                    this.width = tmp;
                }
            }
        });
        
        rect1.mm.update({width: 100, height: 50});
        
        assert.deepEqual({width: rect1.width, height: rect1.height}, {width: 50, height: 100}, 
            'Property values were swapped by _doOnCompute method');
            
        assert.deepEqual(dnc, 1, 'because mm.update() method was used, _doOnCompute() was called once');
        
        var dnc2 = 0;

        // calculates area with event handler
        var dnc = 0, rect2 = new Amm.Data.Model({
            mm: {
                meta: {
                    width: {
                        def: 0,
                    },
                    height: {
                        def: 0,
                    },
                    area: {
                        def: 0
                    }
                },
                on__compute: function() {
                    dnc2++;
                    this.m.area = this.m.width * this.m.height;
                }
            },
        });
        
        rect2.mm.update({width: 50, height: 30});
        assert.deepEqual(rect2.area, 1500, 'property value was calculated by mm.outCompute() event');
        assert.deepEqual(dnc2, 1, 'because mm.update() method was used, mm.outCompute() was called once');
        
        Amm.cleanup(rect1, rect2);
            
    });
    
    QUnit.test("Data.FieldMeta.change()", function (assert) {
                
        var changeFnLog = [];
        
        var changeFn = function(value, oldValue, field) {
            changeFnLog.push([value, oldValue, field]);
        };
        
        var rect = new Amm.Data.Model({
            mm: { meta: {
                width: {
                    def: null,
                    change: changeFn
                },
                height: {
                    def: null,
                    change: changeFn
                }
            } }
        });
        
        rect.width = 20;
        
            assert.deepEqual(changeFnLog, [[20, null, 'width']]);

        changeFnLog = [];
        rect.width = '20';
        
            assert.deepEqual(changeFnLog, [['20', 20, 'width']]);
        
        changeFnLog = [];
        rect.mm.hydrate({width: 50, height: 30});
        
            assert.deepEqual(changeFnLog, [
                [50, '20', 'width'],
                [30, null, 'height']
            ]);

    });
    
    QUnit.test("Data: anyChange", function(assert) {
        
        var changeLog = [];
        
        var anyChangeHandler = function(reason) {
            changeLog.push([reason, Amm.event.origin.m.name]);
        };
        
        var groupComputeCount = 0, groupList = null;
        
        
        
        var groupModel = new Amm.Data.Model ({
            mm: { 
                meta: {
                    name: {
                        def: 'groupName',
                        required: true,
                    },
                    chief: {
                    },
                    people: {
                        set: function(ret) {
                            Amm.is(ret.value, 'Amm.Data.Collection', 'people');
                        }
                    },
                    theList: {
                        compute: function() {
                            groupComputeCount++;
                            if (!this.people || !this.people.length) return 'No one';
                            var list = Amm.getProperty(this.people.getItems(), 'name');
                            list.sort();
                            var items = [];
                            for (var i = 0; i < list.length; i++) {
                                items.push((i + 1) + '. ' + list[i]);                                
                            }
                            return items.join('\n');
                        },
                    }
                },
                on__anyChange: anyChangeHandler
            },
            on__theListChange: function(v) {
                groupList = v;
            }
        });
        
        var people = new Amm.Data.Collection({
            keyProperty: 'name',
            instantiateOnAccept: true,
            instantiator: new Amm.Instantiator.Proto({
                overrideProto: true,
                proto: {
                    'class': 'Amm.Data.Model',
                    mm: {
                        meta: {
                            name: {
                                required: true
                            }
                        },
                        on__anyChange: anyChangeHandler
                    }
                },
            })
        });
        
        people.push({name: 'John'});
        people.push({name: 'Jane'});
        people.push({name: 'Fred'});
        
            assert.deepEqual(changeLog, [], 'No anyChange triggered during items instantiation');
            assert.deepEqual(groupModel.theList, 'No one', '...but computed property contains required value');
         
        groupModel.name = "TheGroup";
            assert.deepEqual(changeLog, [["cumulative", "TheGroup"]], 'anyChange/cumulative event (bc modifiedChange + fieldChange)');
        
        changeLog = [];
        groupModel.name = "The Group";
            assert.deepEqual(changeLog, [["fieldChange", "The Group"]], 'anyChange/fieldChange event');
        
        changeLog = [];
        groupModel.people = people;
        
            assert.deepEqual(groupList, '1. Fred\n2. Jane\n3. John',
                'computed field changed');
            assert.deepEqual(changeLog, [["fieldChange", "The Group"]], 
                'anyChange/fieldChange event after computed field changed');
            
        changeLog = [];
        groupModel.people.push({name: 'Guy'});
            assert.deepEqual(changeLog, [["cumulative", "The Group"]], 
                'anyChange/cumulative (collection + computed field)');
            assert.deepEqual(groupList, '1. Fred\n2. Guy\n3. Jane\n4. John', 'proper computed field');
            
        changeLog = [];
        groupModel.people.k.Guy.name = 'George';
            assert.deepEqual(changeLog, [
                ["cumulative", "George"],
                ["cumulative", "The Group"]
            ], 'two cumulative events: child and parent');
            assert.deepEqual(groupList, '1. Fred\n2. George\n3. Jane\n4. John',
                'proper computed field in parent');
            
        changeLog = [];
        var reject = groupModel.people.k.George;
        groupModel.people.reject(reject);
            assert.deepEqual(changeLog, [
                ["cumulative", "The Group"]
            ], 'Item rejected from collection - cumulative change in parent (collection and computed field)');
            assert.deepEqual(groupList, '1. Fred\n2. Jane\n3. John', 
                'proper computed field');
            
        changeLog = [];
        reject.name = 'G.';
            assert.deepEqual(changeLog, [
                ["fieldChange", "G."]
            ]), 'change in rejected item doesn\'t cause cumulative change in parent';
            
        changeLog = [];
        groupModel.chief = reject;
            assert.deepEqual(changeLog, [
                ["fieldChange", "The Group"]
            ]), 'associated object - change in parent (field)';
        
        changeLog = [];
        groupModel.chief = reject;
        reject.name = "Mister G.";
            assert.deepEqual(changeLog, [
                ["fieldChange", "Mister G."],
                ["submodel", "The Group"]
            ]), 'change in associated object (field) + change in parent (submodel)';
        
        Amm.cleanup(groupModel, people.getItems(), people, reject);
        
    });
    
    QUnit.test("Data: fake storage (testing purposes)", function(assert) {
        var people = new MemStor({
            autoInc: true,
            primaryKey: 'id',
            uniqueIndexes: ['email'],
            metaProps: {
                id: {},
                firstName: {required: true},
                lastName: {required: true},
                email: {required: true},
                phone: {def: ''},
                notes: {def: ''}
            }
        });
        var response;
        response = people.create({firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '+321 123 456 7890'});
        response = people.create({firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com', phone: '+321 123 456 7891'});
        response = people.create({firstName: 'Mick', lastName: 'Douglas', email: 'mick.douglas@example.com', phone: '+321 456 012 0123'});
        assert.deepEqual(people.getDataOf(people.find({lastName: 'Doe'})), 
        [
            {id: 1, firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', phone: '+321 123 456 7890', notes: ''},
            {id: 2, firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com', phone: '+321 123 456 7891', notes: ''}
        ]
        );
    });
    
    QUnit.test('Mapper: instantiator features & meta-properties sharing', function(assert) {
        
        var m = new Amm.Data.Mapper({
            meta: {
                name:    { label: 'name' },
                surname: { label: 'surname' },
                notes:   { label: 'notes' },
            }
        });
        
        var c = new Amm.Collection({instantiator: m, instantiateOnAccept: true});
        
        var r1 = c.accept({name: 'John', surname: 'Doe', notes: 'The Chosen One'});
        var r2 = c.accept({name: 'Jane', surname: 'Doe', notes: 'The Spouse'});
        var r3 = c.accept({name: 'Susan', surname: 'Moo', notes: 'The Other'});
        
        assert.deepEqual(r1.mm.getData(), {
            name: 'John', surname: 'Doe', notes: 'The Chosen One'
        }, 'Data fields were set during instantiation');
        
        assert.ok(r1.mm.getMeta('name') === r2.mm.getMeta('name'),
            'Same meta instances shared by two record instances');
        
        assert.ok(r2.mm.getMeta('name') === r3.mm.getMeta('name'),
            'Same meta instances shared by two record instances (2)');
        
        r1.mm.setMeta('The Name', 'name', 'label');
        
        assert.ok(r1.mm.getMeta('name') !== r2.mm.getMeta('name'),
            'Field meta changed for single instance');
        
        assert.ok(r1.mm.getMeta('name', 'label') === 'The Name',
            'Meta property of field meta changed');
        
        assert.ok(r2.mm.getMeta('name') === r3.mm.getMeta('name'),
            'Same meta instances still shared by other instances (2)');
        
    });
    
}) ();