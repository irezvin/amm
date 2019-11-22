/* global Amm */
/* global QUnit */

(function() { 
    QUnit.module("Basic Annotated");
    
    QUnit.test("Annotated", function(assert) {
        
        var fx = jQuery('#qunit-fixture');
        
        var html1 = " \
          <div id='annotated'>      \
            <div class='annotation a_label'>The label</div> \
            <div class='annotation a_required'>*</div> \
            <div class='annotation a_description'></div> \
          </div>                    \
        ";
        
        fx.html(html1);
        
        var anno = new Amm.Element({traits: ['Amm.Trait.Annotated'], description: 'Blah blah blah'});
        
        var v = new Amm.View.Html.Annotated({element: anno, htmlElement: '#qunit-fixture #annotated'});
        
        assert.equal(anno.getLabel(), 'The label', '`label` content properly detected');
        assert.equal(anno.getRequired(), true, '`required` properly detected');
        assert.equal(fx.find('.a_description').html(), 'Blah blah blah', '`description` is set to initial');
        anno.setAnnotationValue('the Z', 'zz');
        assert.equal(fx.find('.a_zz').html(), 'the Z', 'new annotation element created on demand');
        anno.setAnnotationValue(['foo', 'bar', 'baz'], 'error');
        assert.ok(fx.find('.a_error')[0], 'Default annotation element w/o html container will have container created');
        assert.equal(fx.find('.a_error').html(), '<ul class="errors"><li class="error">foo</li><li class="error">bar</li><li class="error">baz</li></ul>', 
            'on-demand annotation element uses proper prototype');
            
        Amm.cleanup(anno);
    });
    
    QUnit.test("Annotated: creation of HTML elements", function(assert) {
        
        var fx = jQuery('#qunit-fixture');
        
        var html1 = "<div id='annotated' data-amm-e='{label: foo, description: bar, required: true}' data-amm-v='v.Annotated'></div>";
        
        fx.html(html1);
        
        var anno = new Amm.Element(fx);
        
        assert.equal(fx.find('.a_label').html(), anno.getLabel(), 'Label element was created');
        assert.equal(fx.find('.a_description').html(), anno.getDescription(), 'Description element was created');
        assert.equal(fx.find('.a_required span').html(), '*');
        
        Amm.cleanup(anno);
    });
    
}) ();
