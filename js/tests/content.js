(function() { 
    QUnit.module("Trait.Content");
    
    QUnit.test("Basic Content", function(assert) {
        
        var fx = jQuery("#qunit-fixture");
        
        fx.html("<div id='a'>Some Text</div><div id='b'></div>");
        
        var c = new Amm.Element({traits: ['Amm.Trait.Content']});
        
        var v1 = new Amm.View.Html.Content({element: c, htmlElement: '#qunit-fixture #a'});
        
        var v2 = new Amm.View.Html.Content({element: c, htmlElement: '#qunit-fixture #b'});
        
        assert.equal(c.getContent(), 'Some Text', 'Correct content auto-detection');
        assert.equal(jQuery('#qunit-fixture #b').text(), 'Some Text', 
            'Second view in sync');
        
        var trans1 = new Amm.Translator({
            outDecorator: function(v) { return '---' + v + '---' },
            inDecorator: function(v) { return v.replace(/^-+|-+$/g) }
        });
        
        var trans2 = new Amm.Translator({
            outDecorator: function(v) { return 'xxx ' + v + ' xxx' },
            inDecorator: function(v) { return v.replace(/^[x ]+|[x ]+$/g) }
        });
        
        v2.setContentTranslator(trans2);
        
        c.setContentTranslator(trans1);
        
        assert.equal(jQuery('#qunit-fixture #a').text(), '---Some Text---', 
            'First view uses content-provided translator');
        assert.equal(jQuery('#qunit-fixture #b').text(), 'xxx Some Text xxx', 
            'Second view uses own translator');
        
        Amm.cleanup(c);
        
    });
    
    QUnit.test("Complex Content Translation", function(assert) {
        
        var fx = jQuery("#qunit-fixture");
        
        fx.html("<div id='a'><ul><li>Foo</li><li>Bar</li><li>Baz</li></div>");
        
        var c = new Amm.Element({
            traits: ['Amm.Trait.Content'],
            contentTranslator: { 'class': 'Amm.Translator.List' }
        });
        
        var v1 = new Amm.View.Html.Content({element: c, htmlElement: '#qunit-fixture #a'});
        
        assert.deepEqual(c.getContent(), ['Foo', 'Bar', 'Baz']);
        
        c.setContent(['Foo', 'Bar']);
        
        assert.equal(jQuery('#qunit-fixture #a').html(), '<ul><li>Foo</li><li>Bar</li></ul>', 'Array value properly translated');        
        
        Amm.cleanup(c);
        
    });
    
    
}) ();
