/* global Amm */
/* global QUnit */

(function() {

    QUnit.module("Uri");
    
    QUnit.test("Amm.Remote.Uri", function(assert) {
        
        var u = "https://user:pass@www.example.com:80/index.php";
        
        var f = "#frag";
        
        var q = "?param1=val1&param2[]=val2_1&param2[]=val2_2&param3[arg][a]=param3_arg_a&param3[arg][b]=param3_arg_b";
        
        var u1 = new Amm.Remote.Uri(u + q + f);
        
        var log = [];
        
        u1.subscribe("uriChange", function(u, old) {
            log.push(u);
        });
        
            assert.equal(u1.getUri(Amm.Remote.Uri.PART_SCHEME), "https", "Simple parsing: Scheme");
            assert.equal(u1.getUri(Amm.Remote.Uri.PART_USER), "user", "Simple parsing: User");
            assert.equal(u1.getUri(Amm.Remote.Uri.PART_PASSWORD), "pass", "Simple parsing: Password");
            assert.equal(u1.getUri(Amm.Remote.Uri.PART_HOST), "www.example.com", "Simple parsing: Host");
            assert.equal(u1.getUri(Amm.Remote.Uri.PART_PORT), "80", "Simple parsing: Port");
            assert.equal(u1.getUri(Amm.Remote.Uri.PART_PATH), "/index.php", "Simple parsing: Path");
        
            assert.deepEqual(u1.getUri(Amm.Remote.Uri.PART_QUERY), {
                param1: "val1",
                param2: ["val2_1", "val2_2"],
                param3: {
                    arg: {
                        a: "param3_arg_a",
                        b: "param3_arg_b",
                    },
                }
            }, "Simple parsing: Query");
            assert.deepEqual('?' + u1.getUri(Amm.Remote.Uri.PART_QUERY, true), q,  "Query (asString)");
        
            assert.equal(u1.getUri(Amm.Remote.Uri.PART_FRAGMENT), "frag", "Simple parsing: Fragment");
            
            assert.equal(u1.getUri("param2[1]"), "val2_2", "Query retrieval (string path)");
            assert.equal(u1.getUri("param3[arg][b]"), "param3_arg_b", "Query retrieval (string path)");
            assert.equal(u1.getUri(["param3", "arg", "b"]), "param3_arg_b", "Query retrieval (Array path)");
        
        // now the mutations part
        
        log = [];
        u1.setUri("http", Amm.Remote.Uri.PART_SCHEME);
            assert.equal(log.length, 1, "Scheme: uri change triggered");
            assert.equal(log[0], (u = u.replace(/https/, 'http')) + q + f, "Scheme: uri was proper");
        
        log = [];
        u1.setUri("user1", Amm.Remote.Uri.PART_USER);
            assert.equal(log.length, 1, "User: uri change triggered");
            assert.equal(log[0], (u = u.replace(/user/, 'user1')) + q + f, "User: uri was proper");
        
        log = [];
        u1.setUri("pass1", Amm.Remote.Uri.PART_PASSWORD);
            assert.equal(log.length, 1, "Password: uri change triggered");
            assert.equal(log[0], (u = u.replace(/pass/, 'pass1')) + q + f, "Password: uri was proper");
        
        log = [];
        u1.setUri("www.example.org", Amm.Remote.Uri.PART_HOST);
            assert.equal(log.length, 1, "Host: uri change triggered");
            assert.equal(log[0], (u = u.replace(/www.example.com/, 'www.example.org')) + q + f, "Host: uri was proper");
        
        log = [];
        u1.setUri("/index2.html", Amm.Remote.Uri.PART_PATH);
            assert.equal(log.length, 1, "Path: uri change triggered");
            assert.equal(log[0], (u = u.replace(/index.php/, 'index2.html')) + q + f, "Path: uri was proper");
        
        log = [];
        u1.setUri("zz", Amm.Remote.Uri.PART_FRAGMENT);
            assert.equal(log.length, 1, "Fragment: uri change triggered");
            assert.equal(log[0], u + q + (f = f.replace(/frag/, 'zz')), "Fragment: uri was proper");
        
        log = [];
        u1.setUri("param4val", "param4");
            assert.equal(log.length, 1, "Query: uri change triggered");
            assert.equal(log[0], u + (q = q + "&param4=param4val") + f, "Query: uri was proper");
        
        log = [];
        u1.setUri(null, "param3[arg][b]");
            assert.equal(log.length, 1, "Query: uri change triggered");
            assert.equal(log[0], u + (q = q.replace(/&param3\[arg\]\[b\]=param3_arg_b/, '')) + f, "Query: NULL unsets key");
        
        log = [];
        var n = "paramNew[sub]=paramNewVal";
        u1.setUri(n, Amm.Remote.Uri.PART_QUERY);
        
            assert.equal(log.length, 1, "Query: uri change triggered");
            assert.equal(log[0], u + (q = '?' + n) + f, "Query: string is parsed when PART_QUERY is set");
            assert.deepEqual(u1.getUri(Amm.Remote.Uri.PART_QUERY), {
                paramNew: {
                    sub: 'paramNewVal'
                }
            }, "string-provided query was parsed");
            assert.deepEqual(u1.getUri(Amm.Remote.Uri.PART_QUERY, true), n,
                "string-returned query is proper");

        var tests = [
            ['//example.com',               'No scheme'],
            ['//aa@example.com',            'Empty password'],
            ['//:zz@example.com',           'Empty username'],
            ['//example.com?',              'Empty query string'],
            ['//example.com#',              'Empty fragment'],
            ['//example.com?#',             'Empty query string and fragment'],
            ['mailto:john.doe@example.com', 'Mailto protocol'],
            ['//example.com?whatever',      'Non-RFC query string'],
            ['//example.com?whatever=',     'Empty param in query string'],
        ];
        
        for (var i = 0; i < tests.length; i++) {
            assert.equal((new Amm.Remote.Uri(tests[i][0])).toString(), tests[i][0], tests[i][1]);
        }
        
        
        log = [];
        u1.setUri('https://example.com');
        assert.deepEqual(log, ['https://example.com'], 'Reset uri to no parameters');
        log = [];
        u1.setUri('value1', 'param1');
        assert.deepEqual(log, ['https://example.com?param1=value1'], 'Add one parameter via setUri');
        
        
    });
    
    QUnit.test("Relative", function(assert) {
        var tt = [
            ["foo/bar/baz.html", "https://www.example.com/", "https://www.example.com/foo/bar/baz.html"], 
            ["../../foo/bar/baz.html", "https://www.example.com/", "https://www.example.com/foo/bar/baz.html"], 
            ["../../foo/bar/baz.html", "https://www.example.com/top/sub/level3", "https://www.example.com/top/foo/bar/baz.html"],
            [".././foo/../bar/baz.html", "https://www.example.com/top/sub/index.php", "https://www.example.com/top/bar/baz.html"],
            ["/zz", "https://www.example.com/top/sub/index.php", "https://www.example.com/zz"],
            ["//zz.com/xx/yy", "https://www.example.com/top/sub/index.php", "https://zz.com/xx/yy"],
            ["http://zz.com/xx/yy", "https://www.example.com/top/sub/index.php", "http://zz.com/xx/yy"],
            ["?foo=1", "http://foo/bar/baz.html", "http://foo/bar/baz.html?foo=1"]
        ];
        
        for (var i = 0; i < tt.length; i++) {
            assert.equal((new Amm.Remote.Uri(tt[i][0])).resolve(tt[i][1]).toString(), tt[i][2], tt[i][3]);
        }

        assert.ok ((new Amm.Remote.Uri('http://zz.com')).isFullyQualified());

        assert.notOk ((new Amm.Remote.Uri('//zz.com')).isFullyQualified());

        assert.ok((new Amm.Remote.Uri('xx')).isRelative());

        assert.notOk((new Amm.Remote.Uri('/xx')).isRelative());
        
    });
    
    QUnit.test("URI: request support", function(assert) {
        var r = [];
        var c = [];
        var u = new Amm.Remote.Uri({
            on__requestChangeNotify: function() {
                r.push(this.produceRequest().getAll());
            },
            on__uriChange: function(uri) {
                c.push(uri);
            },
            uri: 'echo.php'
        });
        assert.deepEqual(r.length, 0, 'No requestChangeNotify triggered during Uri object initialization');
        u.setUri('value1', 'param1');
        assert.deepEqual(r, [{
            method: "GET",
            uri: "echo.php?param1=value1"
        }], 'outRequestChangeNotify() on parameter change');
        r = [];
        u.setUri('value2', 'param1');
        assert.deepEqual(r, [{
            method: "GET",
            uri: "echo.php?param1=value2"
        }], 'outRequestChangeNotify() on parameter change (2)');
        
    });

}) ();
