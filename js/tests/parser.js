/* global Amm */
(function() { 
    QUnit.module("Parser");
    
    var WHITESPACE = Amm.Expression.Token.Type.WHITESPACE;
    var WORD = Amm.Expression.Token.Type.WORD;
    var INTEGER = Amm.Expression.Token.Type.INTEGER;
    var FLOAT = Amm.Expression.Token.Type.FLOAT;
    var SYMBOL = Amm.Expression.Token.Type.SYMBOL;
    var ILLEGAL = Amm.Expression.Token.Type.ILLEGAL;
    var SINGLE_QUOTED_STRING = Amm.Expression.Token.Type.SINGLE_QUOTED_STRING;
    var DOUBLE_QUOTED_STRING = Amm.Expression.Token.Type.DOUBLE_QUOTED_STRING;
    var REGEXP = Amm.Expression.Token.Type.REGEXP;
    
    QUnit.test("Tokenizer", function(assert) {
        var parser = new Amm.Expression.Parser();
        var src = "foo 0.3  blah + / foo ( \[ [ / ] ] \] ) /g -  $baz   12 0x10 017 'quux\\'mo\\non\"Щ\\zЙЫom' { mm \"m\\\"\\nm\" !==10e5===10.2e-3 == ee} Б xx";
        var tokens = parser.getAllTokens(src);
        var arrs = [];
        for (var i = 0; i < tokens.length; i++) arrs.push(tokens[i].toArray());
        var u = undefined;
        assert.deepEqual(arrs, [
            ['foo', WORD, u],
            [' ', WHITESPACE, u],
            ['0.3', FLOAT, 0.3],
            ['  ', WHITESPACE, u],
            ['blah', WORD, u],
            [' ', WHITESPACE, u],
            ['+', SYMBOL, u],
            [' ', WHITESPACE, u],
            ['/ foo ( \[ [ / ] ] \] ) /g', REGEXP, / foo ( [ [ / ] ] ] ) /g],
            [' ', WHITESPACE, u],
            ['-', SYMBOL, u],
            ['  ', WHITESPACE, u],
            ['$', SYMBOL, u],
            ['baz', WORD, u],
            ['   ', WHITESPACE, u],
            ['12', FLOAT, 12],
            [' ', WHITESPACE, u],
            ['0x10', INTEGER, 0x10],
            [' ', WHITESPACE, u],
            ['017', INTEGER, 017],
            [' ', WHITESPACE, u],
            ["'quux\\'mo\\non\"Щ\\zЙЫom'", SINGLE_QUOTED_STRING, "quux'mo\non\"ЩzЙЫom"],
            [' ', WHITESPACE, u],
            ['{', SYMBOL, u],
            [' ', WHITESPACE, u],
            ['mm', WORD, u],
            [' ', WHITESPACE, u],
            ["\"m\\\"\\nm\"", DOUBLE_QUOTED_STRING, "m\"\nm"],
            [' ', WHITESPACE, u],
            ['!==', SYMBOL, u],
            ['10e5', FLOAT, 10e5],
            ['===', SYMBOL, u],
            ['10.2e-3', FLOAT, 10.2e-3],
            [' ', WHITESPACE, u],
            ['==', SYMBOL, u],
            [' ', WHITESPACE, u],
            ['ee', WORD, u],
            ['}', SYMBOL, u],
            [' ', WHITESPACE, u],
            ['Б', ILLEGAL, u],
            [' ', WHITESPACE, u],
            ['xx', WORD, u]
        ]);
        var at = [];
        for (var i = 0; i < tokens.length; i++) {
            at.push(src.slice(tokens[i].offset, tokens[i].offset + tokens[i].string.length));
        }
        assert.equal(at.join(""), src, "Tokens have proper `offset`");
    });
    
    QUnit.test("Parser", function(assert) {
        var s;
        var p = new Amm.Expression.Parser();
        var tt = function(t) {
            var r = '';
            for (var i = 0; i < t.length; i++) {
                r += t[i].string;
            }
            return r;
        };
        
        // change to TRUE when debugging getSrc()
        var showSourcesInConsole = false;
        
        if (showSourcesInConsole) {
            p.decorateFn = function(result, beginPos, endPos, src, tokens) {
                console.log(result, '"' + src.slice(beginPos, endPos) + '"', '"' + tt(tokens) + '"');
            };
        }
        
        p.genFn = function() {;
            var a = Array.prototype.slice.apply(arguments);
            for (var i = 0; i < a.length; i++) {
                if (a[i] instanceof Amm.Expression.Token) {
                    a[i] = a[i].value === undefined? a[i].string : a[i].value;
                }
            }
            return a;
        };
        assert.deepEqual(p.parse('a'), ['Identifier', 'a']);
        assert.deepEqual(p.parse('$foo + 10'), [
            'Binary', 
                        ['Variable', 'foo'], 
                '+', 
                        ['Constant', 10]
        ]);
        var r;
        assert.deepEqual(r = p.parse("2 + 3*4"),
            ['Binary', 
                    ['Constant', 2],
                '+',
                    [ 'Binary', ['Constant', 3], '*', ['Constant', 4] ]
            ]
        );
        assert.deepEqual(r = p.parse("-3"),
            [ 'Unary', '-', ['Constant', 3]]
        );
        assert.deepEqual(r = p.parse("2 + - 3"),
            ['Binary', 
                    ['Constant', 2],
                '+',
                    [ 'Unary', '-', ['Constant', 3]]
            ]
        );
        assert.deepEqual(r = p.parse("$a + 10*20 && 30 != 40"),
        [
            'Binary',
                ['Binary', 
                        ['Variable', 'a'],
                    '+',
                        [ 'Binary', ['Constant', 10], '*', ['Constant', 20] ]
                ],
            '&&',
                ['Binary', ['Constant', 30], '!=', ['Constant', 40] ]
        ]);
        s = "$a + 10 - (!$b && $c >= 10 || $d   ? (15 * 14) : bar) / -12";
        assert.deepEqual(p.parse(s), [
            "Binary", 
                ["Variable", "a"], 
            "+", 
                ["Binary", 
                    ["Constant", 10], 
                "-",
                    ["Binary", 
                        ["Parenthesis", 
                            ["Conditional", 
                                ["Binary", // condition
                                    ["Binary", 
                                        ["Unary", "!", 
                                            ["Variable", "b"]
                                        ], 
                                    "&&",
                                        ["Binary", 
                                            ["Variable", "c"], 
                                        ">=", 
                                            ["Constant", 10]
                                        ]
                                    ], 
                                "||", 
                                    ["Variable", "d"]
                                ], 
                                ["Parenthesis", ["Binary", ["Constant", 15], "*", ["Constant", 14]]],  // true-value
                                ["Identifier", "bar"] // false-value
                            ]
                        ], 
                    "/", 
                        ["Unary", "-", ["Constant", 12]]
                    ]
                ]
        ]);
        
        var ss = {
            "a.b.c":  
                ["PropertyAccess",["PropertyAccess",["Identifier","a"],["Constant","b"],null,false,null],["Constant","c"],null,false,null],
        
            "a->b->c": 
                ["ElementAccess",["ElementAccess",["Identifier","a"],["Constant","b"],null],["Constant","c"],null],
        
            "a->>b->>c": 
                ["ChildElement",["ChildElement",["Identifier","a"],["Constant","b"],null],["Constant","c"],null],
    
            "a['foo']('m', $n + 15).baz":
                ["PropertyAccess",["FunctionCall",["PropertyAccess",["Identifier","a"],["Subexpression",["Constant","foo"]],null,true,null],["List",[["Constant","m"],["Binary",["Variable","n"],"+",["Constant",15]]]],null],["Constant","baz"],null,false,null],

            "a['foo']::bar":
                ["PropertyAccess",["Identifier","a"],["Subexpression",["Constant","foo"]],["PropertyArgs",[["Constant","bar"]],false],true,null],

            "a[$b]::{m.n, $z}":
                ["PropertyAccess",["Identifier","a"],["Subexpression",["Variable","b"]],["PropertyArgs",["List",[["PropertyAccess",["Identifier","m"],["Constant","n"],null,false,null],["Variable","z"]],undefined],true],true,null],

            "a.b::x.c::y":
                ["PropertyAccess",["PropertyAccess",["Identifier","a"],["Constant","b"],["PropertyArgs",[["Constant","x"]],false],false,null],["Constant","c"],["PropertyArgs",[["Constant","y"]],false],false,null],

            "a.b{0..3}":
                ["Range","Slice",["PropertyAccess",["Identifier","a"],["Constant","b"],null,false,null],["Constant",0],["Constant",3]],

            "a.b{$v: item.x && !item.y}":
                ["Range","Expression",["PropertyAccess",["Identifier","a"],["Constant","b"],null,false,null],["Binary",["PropertyAccess",["Identifier","item"],["Constant","x"],null,false,null],"&&",["Unary","!",["PropertyAccess",["Identifier","item"],["Constant","y"],null,false,null]]],["LoopIdentifiers",["Constant","v"],null]],
        
            "a.b{$k => $v: item.x && !item.y}":
                ["Range","Expression",["PropertyAccess",["Identifier","a"],["Constant","b"],null,false,null],["Binary",["PropertyAccess",["Identifier","item"],["Constant","x"],null,false,null],"&&",["Unary","!",["PropertyAccess",["Identifier","item"],["Constant","y"],null,false,null]]],["LoopIdentifiers",["Constant","v"],["Constant","k"]]],
            

            "/^([a-z])[a-z0-9]+$/i.exec($z)[1]":
                ["PropertyAccess",["FunctionCall",["PropertyAccess",["Constant",/^([a-z])[a-z0-9]+$/i],["Constant","exec"],null,false,null],["List",[["Variable","z"]]],null],["Subexpression",["Constant",1]],null,true,null]
        };
        var resp;
        for (var i in ss) if (ss.hasOwnProperty(i)) {
            assert.deepEqual(resp = p.parse(i), ss[i], "Parse " + i);
            //console.log(i, JSON.stringify(ss[i]), JSON.stringify(resp));
        }
    });
    
    QUnit.test("Builder", function(assert) {
        
        
        // simple integration test for Builder
        
        var e = new Amm.Element;
        e.createProperty('foo', 10);
        e.createProperty('bar', 20);
        var e1 = new Amm.Element();
        e.createProperty('e1', e1);
        e1.createProperty('baz', 30);
        var e2 = new Amm.Element();
        e2.createProperty('baz', 40);
        e1.func = e2.func = function(arg, arg2) {
            return (arg || 0) + (arg2 || 0) + this._baz;
        };
        
        var 
            this_foo = new Amm.Expression('this.foo', e), 
            this_bar = new Amm.Expression('this.bar', e), 
            this_e1_baz = new Amm.Expression('this.e1.baz', e);
        assert.equal(this_foo.getValue(), e.getFoo());
        assert.equal(this_bar.getValue(), e.getBar());
        assert.equal(this_e1_baz.getValue(), e.getE1().getBaz());
        var this_foo_value, this_e1_baz_value;
        this_foo.subscribe('valueChange', function(v) { this_foo_value = v;});
        this_e1_baz.subscribe('valueChange', function(v) { this_e1_baz_value = v;});
        e.setFoo(5);
        assert.equal(this_foo_value, 5);
        e1.setBaz(35);
        assert.equal(this_e1_baz_value, 35);
        e.setE1(e2);
        assert.equal(this_e1_baz_value, 40);
        e.setE1(e1);
        
        var exp;
        exp = new Amm.Expression("10 + 20 % 2 + -5*2 + !0");
        assert.equal(exp.getValue(), 10 + 20 % 2 + -5*2 + !0);
        exp = new Amm.Expression("2*(10 + 20*2/4)");
        assert.equal(exp.getValue(), 2*(10 + 20*2/4));
        exp = new Amm.Expression("23 + 'px'");
        assert.equal(exp.getValue(), '23px');
        exp = new Amm.Expression("false? 'a' : 'b'");
        assert.equal(exp.getValue(), 'b');
        exp = new Amm.Expression("true? 'a' : 'b'");
        assert.equal(exp.getValue(), 'a');
        
        var exp_val;
        exp = new Amm.Expression("!this.foo + this.bar*this.e1.baz", e);
        exp.subscribe('valueChange', function(v) { exp_val = v; });
        assert.equal(exp.getValue(), !e.getFoo() + e.getBar()*e.getE1().getBaz());
        e.setBar(1);
        assert.equal(exp_val, !e.getFoo() + e.getBar()*e.getE1().getBaz());
        e.setE1(e1);
        assert.equal(exp_val, !e.getFoo() + e.getBar()*e.getE1().getBaz());
        e1.setBaz(5);
        assert.equal(exp_val, !e.getFoo() + e.getBar()*e.getE1().getBaz());
        
        var exp2 = new Amm.Expression("this.foo? this.bar : this.e1.baz", e);
        var exp2_val;
        exp2.subscribe('valueChange', function(v) { exp2_val = v; });
        assert.equal(exp2.getValue(), e.getFoo()? e.getBar() : e.getE1().getBaz());
        e.setFoo(!e.getFoo());
        assert.equal(exp2.getValue(), e.getFoo()? e.getBar() : e.getE1().getBaz());
        assert.equal(exp2_val, e.getFoo()? e.getBar() : e.getE1().getBaz());
        
        var exp3 = new Amm.Expression("this.e1.func(10, this.bar)", e);
        var exp3_value;
        exp3.subscribe('valueChange', function(v) {exp3_value = v;});
        assert.equal(exp3.getValue(), 10 + e.getBar() + e.getE1().getBaz());
        assert.ok(exp3.getIsCacheable(), 'function call is cacheable');
        exp3_value = null;
        e.setBar(e.getBar() + 1);
        assert.equal(exp3_value, 10 + e.getBar() + e.getE1().getBaz());
        exp3_value = null;
        e.setE1(e2);
        assert.equal(exp3_value, 10 + e.getBar() + e.getE1().getBaz());
        
        exp3.cleanup();
        
        var exp4 = new Amm.Expression("(this.e1['func'])(5, this.bar)", e);
        assert.equal(exp4.getValue(), 5 + e.getBar() + e.getE1().getBaz());
        assert.ok(exp4.getIsCacheable(), 'function call is cacheable');
        
        exp4.cleanup();
        
        var exp5 = new Amm.Expression("(this.e1['func'])(5, this.bar)??", e);
        assert.equal(exp5.getValue(), 5 + e.getBar() + e.getE1().getBaz());
        assert.ok(!exp5.getIsCacheable(), 'function call is non-cacheable because of modifier');
        exp5.cleanup();
        
        var exp6 = new Amm.Expression("$foo(20)", {});
        exp6.setVars(function(a) {return a + 15;}, 'foo');
        assert.equal(exp6.getValue(), 20 + 15);
        
        var exp7 = new Amm.Expression("$foo(20)??", {});
        exp7.setVars(function(a) {return a + 15;}, 'foo');
        assert.equal(exp7.getValue(), 20 + 15);
        assert.ok(!exp7.getIsCacheable(), 'var function call is non-cacheable because of modifier');
        exp7.cleanup();

        var exp8 = new Amm.Expression("this.bar!!", {bar: 10});
        assert.equal(exp8.getValue(), 10);
        assert.ok(exp8.getIsCacheable(), 'property value is cacheable because of modifier');
        
    });
    
    QUnit.test("Operator.getSrc()", function(assert) {
        var s = "!this.foo + this.bar*this.e1.baz";
        var exp = new Amm.Expression(s);
        assert.equal(exp.getOperator().getSrc(), s);
        assert.equal(exp.getOperator(0, 0).getSrc(), '!this.foo');
        assert.equal(exp.getOperator(0, 1).getSrc(), "this.bar*this.e1.baz");
        assert.equal(exp.getOperator(0, 1, 0).getSrc(), "this.bar");
        assert.equal(exp.getOperator(0, 1, 1).getSrc(), "this.e1.baz");
        assert.equal(exp.getOperator(0, 1, 1, 0).getSrc(), "this.e1");
    });
    
}) ();

