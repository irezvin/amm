/* global Amm */

(function() {
    
    var fx = jQuery("#qunit-fixture");

    var s = function(select) {
        var res = {
            options: []
        };
        if (select.attr) {
            select = select[0];
        }
        if (select.tagName === 'SELECT') {
            res.multiple = !!select.multiple;
            res.size = select.size || 1;
            if (select.disabled) res.disabled = true;
            if (jQuery(select).is(':focus')) res.focused = true;
            for (var i = 0, l = select.options.length; i < l; i++) {
                var opt = select.options[i];
                var obj = {value: opt.value, caption: jQuery(opt).html()};
                if (opt.disabled) obj.disabled = true;
                else if (opt.selected) obj.selected = true;
                res.options.push(obj);
            }
            res.value = jQuery(select).val();
        } else if (select['Select'] === '__INTERFACE__') {
            res.multiple = !!select.getMultiple();
            res.size = select.getSelectSize();
            if (!select.getEnabled()) res.disabled = true;
            if (select.getFocused()) res.focused = true;
            var options = select.getOptions();
            for (var i = 0, l = options.length; i < l; i++) {
                var opt = options[i];
                var obj = {value: opt.getValue(), caption: opt.getCaption()};
                if (opt.getDisabled()) obj.disabled = true;
                else if (opt.getSelected()) obj.selected = true;
                res.options.push(obj);
            }
            res.value = select.getValue();
        } else {
            throw "WTF?! - provide either <select> element or Select Trait";
        }
        return res;
    };
    
    QUnit.module("Select");
    
    QUnit.test("Amm.Trait.Select", function(assert) {
       
        fx.html(
            "<select id='sel1'>"
                + "<option value='a'>Caption A</option>"
                + "<option value='b'>Caption B</option>"
                + "<option value='c'>Caption C</option>"
                + "<option value='d' selected='selected'>Caption D</option>"
                + "<option value='e'>Caption E</option>"
                + "<option value='f' disabled='disabled'>Caption F</option>"
                + "<option value='g' disabled='disabled'>Caption G</option>"
            + "</select>"
            + "<select id='sel1b'></select>"
        );

        var initial = s(fx.find('#sel1'));

        var sel1 = new Amm.Element({traits: ['Amm.Trait.Select']});
        var v1 = new Amm.View.Html.Select({element: sel1, htmlElement: fx.find('#sel1')[0]});
        var v1b = new Amm.View.Html.Select({element: sel1, htmlElement: fx.find('#sel1b')[0]});
        assert.deepEqual(s(sel1), initial, "Auto-detected Select config matches html element");
        assert.deepEqual(s(fx.find('#sel1b')), s(sel1), "Initial - second view is in sync");
        
        sel1.getOptionsCollection()[0].setSelected(true);
        assert.deepEqual(s(fx.find('#sel1')), s(sel1));
        assert.deepEqual(s(fx.find('#sel1b')), s(sel1));
        
        var newVal = 'e';
        fx.find('#sel1').val(newVal).change();
        assert.deepEqual(sel1.getValue(), newVal, 'Select object received the value from HTML element');
        assert.deepEqual(jQuery('#sel1b').val(), newVal, 'Second view is in-sync after element value changed');
        sel1.setValue('b');
        assert.deepEqual(jQuery('#sel1b').val(), 'b', 'HTML value follows object value');
        assert.deepEqual(jQuery('#sel1b').val(), 'b', 'Second view is in-sync after element value changed');
        
        sel1.getOptionsCollection().reject[0];
        sel1.getOptionsCollection()[1].setDisabled(true);
        sel1.getOptionsCollection()[2].setSelected(true);
        sel1.getOptionsCollection().push(new Amm.Trait.Select.Option({value: 'x', caption: 'X option'}));
        assert.deepEqual(s(fx.find('#sel1')), s(sel1), 'collection mutations are synced');
        
        
        v1._collectionView.debug = 'v1';
        sel1.getOptionsCollection().reject(0);
        
        assert.deepEqual(s(fx.find('#sel1')), s(sel1));
        assert.deepEqual(s(fx.find('#sel1b')), s(sel1));
        
        fx.append(
            "<select id='sel2' multiple='multiple'>"
                + "<option value='a'>Caption A</option>"
                + "<option value='b' selected='selected'>Caption B</option>"
                + "<option value='c'>Caption C</option>"
                + "<option value='d' selected='selected'>Caption D</option>"
                + "<option value='e'>Caption E</option>"
                + "<option value='f' disabled='disabled'>Caption F</option>"
                + "<option value='g' disabled='disabled'>Caption G</option>"
            + "</select>"
        );

        var initial2 = s(fx.find('#sel2'));

        var sel2 = new Amm.Element({traits: ['Amm.Trait.Select']});
        var v2 = new Amm.View.Html.Select({element: sel2, htmlElement: fx.find('#sel2')[0]});
        assert.deepEqual(s(sel2), initial2, "Auto-detected Select config matches html element");
        
        var newVal = ['c', 'e'];
        fx.find('#sel2').val(newVal).change();
        assert.deepEqual(newVal, sel2.getValue(), 'Select object received the value from HTML element (multiple)');
        sel2.setValue(['a', 'b']);
        assert.deepEqual(fx.find('#sel2').val(), ['a', 'b'], 'Value is correctly changed when Select object value changed');
        sel2.setValue([]);
        assert.deepEqual(fx.find('#sel2').val(), [], 'Value is correctly changed when Select object value changed');
        
        
        var sel3 = new Amm.Element({
            traits: ['Amm.Trait.Select'],
            options: {
                a: 'value a',
                b: 'value b',
                c: 'value c'
            },
            multiple: true,
            selectSize: 4,
            value: ['a', 'b']
        });
        
        fx.append("<select id='sel3'></select>");
        
        var sel3Initial = s(sel3);
        var v3 = new Amm.View.Html.Select({element: sel3, htmlElement: fx.find('#sel3')[0]});
        assert.deepEqual(s(fx.find('#sel3')), sel3Initial, "No auto-detection when element data in place");        
        
    });
    
}) ();