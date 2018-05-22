/* global Amm */

(function() { 
    QUnit.module("Validator, Decorator, Translator");
    
    QUnit.test("Amm.Validator", function(assert) {
        var val;
        
        //  construct
        
        val = Amm.Validator.construct({class: "Amm.Validator.Required"});
        
            assert.ok(Amm.is(val, "Amm.Validator.Required"), "Amm.Validator.construct works");
        
        val = Amm.Validator.construct(function(foo) { return true; });
        
        assert.ok(Amm.is(val, "Amm.Validator.Function"), "Amm.Validator.construct(function) works too");
        
    });
        
    QUnit.test("Amm.Validator.Required", function(assert) {
        var val;        
        
        val = new Amm.Validator.Required({
            message: "%field is required"
        });
        
            assert.equal(val.getError(null, 'TheField'), "TheField is required",
                "Amm.Validator.Required: Error message when field is empty");
        
            assert.equal(val.getError(1, 'TheField'), undefined, 
                "Amm.Validator.Required: No error message when field is not empty");
        
        //  callbacks
                    
    });
        
    QUnit.test("Amm.Validator.Function", function(assert) {
        var val;        
        
        val = new Amm.Validator.Function({
            
            message: "xxx",
            
            func: function(value) {
                return value;
            }
            
        });
        
            assert.equal(val.getError(undefined), undefined,
                "Amm.Validator.Function: when function returns undefined, assume no error"
            );
            assert.equal(val.getError(true), undefined,
                "Amm.Validator.Function: when function returns TRUE, assume no error"
            );
            assert.equal(val.getError(false), val.message,
                "Amm.Validator.Function: when function returns FALSE, set error to built-in msg"
            );
            assert.equal(val.getError("zzz"), "zzz", 
                "Amm.Validator.Function: when function returns string, it is an error message"
            );
            
    });
        
    QUnit.test("Amm.Validator.Number", function(assert) {
        var val;
        
        val = new Amm.Validator.Number({

            gt: 0,
            ge: 2,
            le: 8,
            lt: 10,
            
            msgMustBeNumber: '%field not number',
            msgMustBeInteger: '%field not integer',
            msgMustBeGt: '%field not gt %val',
            msgMustBeGe: '%field not ge %val',
            msgMustBeLt: '%field not lt %val',
            msgMustBeLe: '%field not le %val'
            
        });
        
        assert.equal(val.getError(0, "foo"), "foo not gt 0");
        assert.equal(val.getError(1, "foo"), "foo not ge 2");
        assert.equal(val.getError(11, "foo"), "foo not lt 10");
        assert.equal(val.getError(9, "foo"), "foo not le 8");
        assert.equal(val.getError(5, "foo"), undefined);
        
        assert.equal(val.getError("5 something", "foo"), "foo not number");
        
        val.allowFloat = false;
        
        assert.equal(val.getError("5.5", "foo"), "foo not integer");
        
        val.strict = false;
        
        assert.equal(val.getError("5 zz", "foo"), undefined);
    });        
    
    
    QUnit.test("Amm.Decorator", function(assert) {
        var d = new Amm.Decorator({decorate: function(a) { return '*' + a + '*'; }});
            assert.ok(Amm.is(d, 'Amm.Decorator'));
            assert.equal(d.decorate('foo'), '*foo*');
        
        d = Amm.Decorator.construct(function(x) { return 'x' + x + 'x'; });
            assert.ok(Amm.is(d, 'Amm.Decorator'));
            assert.equal(d.decorate('FOO'), 'xFOOx');        
    });
    
    QUnit.test("Amm.Translator", function(assert) {
        
        var t = new Amm.Translator({
            
            errInValue: '',
            
            errOutValue: null,
            
            inDecorator: function(x) { return '*' + x + '*'; },
                    
            outDecorator: function(x) { return x.replace(/^\*|\*$/g, ''); },
            
            inValidator: function(foo) { if (typeof foo !== 'string' && typeof foo !== 'number')
                return 'Number or string required'; },
            
            outValidator: function(foo) { if (typeof foo !== 'string') return 'String required'; }
            
        });
        
        var e = {}, o;
        
        o = t.translateIn('a', e);
        
            assert.equal(o, '*a*');
            assert.equal(e.error, null);
            assert.equal(t.lastError, null);
        
        t.trimInStrings = true;
            
        o = t.translateIn(' a ', e);
        
            assert.equal(o, '*a*');
            
        t.trimInStrings = false;
        
        o = t.translateIn(' a ', e);
        
            assert.equal(o, '* a *');
            
        o = t.translateOut('*a*', e);
            
            assert.equal(o, 'a');
            assert.equal(e.error, null);
            assert.equal(t.lastError, null);
            
        o = t.translateIn({}, e);
        
            assert.equal(o, t.errInValue);
            assert.equal(e.error, 'Number or string required');
            assert.equal(t.lastError, 'Number or string required');
            
        o = t.translateOut(null, e);
            
            assert.equal(o, t.errOutValue);
            assert.equal(e.error, 'String required');
            assert.equal(t.lastError, 'String required');

        t.reverseMode = true;
            
        o = t.translateOut(5, e);
        
            assert.equal(o, '*5*');
            assert.equal(e.error, null);
            assert.equal(t.lastError, null);
            
        o = t.translateIn('*a*', e);
            
            assert.equal(o, 'a');
            assert.equal(e.error, null);
            assert.equal(t.lastError, null);
            
    });

    QUnit.test("Amm.Translator.Bool", function(assert) {
        
        var t = new Amm.Translator.Bool;
        
        assert.ok(t.translateIn('True') === true);
        assert.ok(t.translateIn('False') === false);
        assert.ok(t.translateIn('tRUe') === true);
        assert.ok(t.translateIn(true) === true);
        assert.ok(t.translateIn(1) === true);
        assert.ok(t.translateIn('1') === true);
        assert.ok(t.translateIn(false) === false);
        assert.ok(t.translateIn(null) === false);
        assert.ok(t.translateIn(undefined) === false);
        
        t.setStrictMode(true);
        t.errorMsg = '*%value* err';
        
        e = {};
        assert.ok(t.translateIn('True') === true);
        assert.ok(t.translateIn('False') === false);
        assert.equal(t.translateIn(' True ', e), undefined);
        assert.equal(e.error, '* True * err');
        assert.equal(t.translateIn('False'), false);
        
        assert.equal(t.translateOut(true), 'True');
        assert.equal(t.translateOut(false), 'False');
        assert.equal(t.translateOut(1), 'True');
        assert.equal(t.translateOut(null), 'False');
        
        
    });
    
    QUnit.test("Amm.Translator.RequiredMark", function(assert) {
        
        var t = new Amm.Translator.RequiredMark;
        t.trueValue = '*';
        
        assert.equal(t.translateIn('zzz'), true);
        assert.equal(t.translateIn(''), false);        
        assert.equal(t.translateOut(true), '*');
        assert.equal(t.translateOut(false), '');
        
    });
    
    QUnit.test("Amm.Translator.List", function(assert) {
        
        var t = new Amm.Translator.List({
            enclosureElement: '<ul></ul>',
            itemElement: '<li></li>'
        });
        var v = ["foo", "bar", "baz"];
        var s = "<ul><li>foo</li><li>bar</li><li>baz</li></ul>";
        var s2 = '<div class="xx">foo</div><div class="xx">bar</div><div class="xx">baz</div>';
        assert.deepEqual(t.translateOut(v), s);
        assert.deepEqual(t.translateIn(s), v);
        t.setEnclosureElement('');
        t.setItemElement('<div class="xx"></div>');
        t.itemSelector = '.xx';
        assert.deepEqual(t.translateOut(v), s2);
        assert.deepEqual(t.translateIn(s2), v);
        
        var t2 = new Amm.Translator.Errors();
        assert.deepEqual(t2.translateOut('errMsg<b />'), '<ul class="errors"><li class="error">errMsg&lt;b /&gt;</li></ul>');
        assert.deepEqual(t2.translateIn('<div class="error">errMsg1</div><div></div><div class="error">errMsg2</div>'), ['errMsg1', 'errMsg2']);
        
    });
    
}) ();

    
    
