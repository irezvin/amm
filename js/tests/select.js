/* global Amm */
/* global QUnit */

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
                var obj = {value: opt.value, label: jQuery(opt).html()};
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
                var obj = {value: opt.getValue(), label: opt.getLabel()};
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
    
    QUnit.test("Trait.Select", function(assert) {
       
        fx.html(
            "<select id='sel1'>"
                + "<option value='a'>Label A</option>"
                + "<option value='b'>Label B</option>"
                + "<option value='c'>Label C</option>"
                + "<option value='d' selected='selected'>Label D</option>"
                + "<option value='e'>Label E</option>"
                + "<option value='f' disabled='disabled'>Label F</option>"
                + "<option value='g' disabled='disabled'>Label G</option>"
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
        sel1.getOptionsCollection().push(new Amm.Trait.Select.Option({value: 'x', label: 'X option'}));
        assert.deepEqual(s(fx.find('#sel1')), s(sel1), 'collection mutations are synced');
        
        sel1.getOptionsCollection().reject(0);
        
        assert.deepEqual(s(fx.find('#sel1')), s(sel1));
        assert.deepEqual(s(fx.find('#sel1b')), s(sel1));
        
        fx.append(
            "<select id='sel2' multiple='multiple'>"
                + "<option value='a'>Label A</option>"
                + "<option value='b' selected='selected'>Label B</option>"
                + "<option value='c'>Label C</option>"
                + "<option value='d' selected='selected'>Label D</option>"
                + "<option value='e'>Label E</option>"
                + "<option value='f' disabled='disabled'>Label F</option>"
                + "<option value='g' disabled='disabled'>Label G</option>"
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
        
        Amm.cleanup(sel1, sel2, sel3);
        
    });
    
    QUnit.test("Trait.Select: select first item by default", function(assert) {
       
       var s1 = new Amm.Element({
           traits: ['Amm.Trait.Select'],
           options: {
                a: 'value a',
                b: 'value b',
                c: 'value c'
           },
           selectSize: 1
       });
       
       assert.deepEqual(s1.getValue(), 'a', 'By default first value is selected when selectSize is 1');
       
       var s2 = new Amm.Element({
           traits: ['Amm.Trait.Select'],
           selectSize: 1
       });
       
       assert.deepEqual(s2.getValue(), undefined, 'Value is undefined when there\'s no options');
       
       s2.setOptions({a: 'value a', b: 'value b'});
       
       assert.deepEqual(s2.getValue(), 'a', 'First value is set once options are provided');
       
       var s3 = new Amm.Element({
           traits: ['Amm.Trait.Select'],
           selectSize: 1,
           options: {
                a: 'value a',
                b: 'value b',
                c: 'value c',
           }
       });
       
       assert.deepEqual(s3.getValue(), 'a', 'By default first value is selected when selectSize is 1 (even if it\'s ahead of options setting)');
       
       Amm.cleanup(s1, s2, s3);
       
    });

    QUnit.test("Trait.Select: 'objects' mapping", function(assert) {
       
        var s1 = new Amm.Element({
            traits: ['Amm.Trait.Select'],
            labelProperty: 'lbl',
            disabledProperty: 'dis',
            multiple: true
        });
       
        var objects = [
            new Amm.Element({
                prop__lbl: 'a',
                prop__lbl2: 'aa',
                prop__dis: false
            }),
            new Amm.Element({
                prop__lbl: 'b',
                prop__lbl2: 'bb',
                prop__dis: false
            }),
            new Amm.Element({
                prop__lbl: 'c',
                prop__lbl2: 'cc',
                prop__dis: false
            }),
            new Amm.Element({
                prop__lbl: 'd',
                prop__lbl2: 'dd',
                prop__dis: false
            }),
            new Amm.Element({
                prop__lbl: 'e',
                prop__lbl2: 'ee',
                prop__dis: false
            }),
            new Amm.Element({
                prop__lbl: 'f',
                prop__lbl2: 'ff',
                prop__dis: false
            })
            
            
       ];
       
       s1.setObjects(objects);
       
       assert.deepEqual(s1.getOptions().length, objects.length, 'All objects have corresponding options');
       assert.deepEqual(Amm.getProperty(s1.getOptions(), 'label'), ['a', 'b', 'c', 'd', 'e', 'f'], 'options have matching labels');
       assert.deepEqual(Amm.getProperty(s1.getOptions(), 'value'), [objects[0], objects[1], objects[2], objects[3], objects[4], objects[5]], 'options\' values match the objects');
       objects[0].setLbl('foo');
       assert.deepEqual(s1.getOptions()[0].getLabel(), 'foo', 'option label was changed when object property was changed');
       window.d.s1 = s1;
       window.d.fx = fx;
       
       //return;
       s1.getOptions()[0].setSelected(true);
       s1.getOptions()[1].setSelected(true);
       assert.deepEqual(s1.getValue(), [objects[0], objects[1]]);
       s1.setValue([objects[2]]);
       assert.deepEqual(Amm.getProperty(s1.getOptions(), 'selected'), [false, false, true, false, false, false]);
       
       fx.html('<select id="s1"></select>');
       var v = new Amm.View.Html.Select({element: s1, htmlElement: '#s1'});
       fx.find('option')[0].selected = true;
       fx.find('select').trigger('change');
       assert.deepEqual(Amm.getProperty(s1.getValue(), 'lbl'), ['foo', 'c']);
       
       objects[1].setDis(true);
       assert.equal(fx.find('option')[1].disabled, true, 'Option becomes disabled');
       
       var oldValue = Amm.getProperty(s1.getValue(), 'lbl');
       s1.setLabelProperty('lbl2');
       assert.deepEqual(Amm.getProperty(s1.getOptions(), 'label'), 
           ['aa', 'bb', 'cc', 'dd', 'ee', 'ff'], 'options have matching labels');
       var newValue = Amm.getProperty(s1.getValue(), 'lbl');
       assert.deepEqual(newValue, oldValue,
           'after labelProperty changed, select.getValue() remains the same');

       oldValue = Amm.getProperty(Amm.getProperty(s1.getSelectionCollection().getItems(), 'origin'), 'lbl');
       s1.setValueProperty('lbl');
       assert.deepEqual(Amm.getProperty(s1.getOptions(), 'value'), 
           ['foo', 'b', 'c', 'd', 'e', 'f'], 'valueProperty works');
       var newValue = s1.getValue();
       assert.deepEqual(newValue, oldValue,
           'after valueProperty changed, selection remains the same');
           
       s1.setMultiple(false);
       s1.setDummyLabel('(none)');
       assert.equal(s1.options.getItems()[0].getLabel(), '(none)', 'dummy option appeared');
       s1.setDummyLabel(null);
       assert.notEqual(s1.options.getItems()[0].getLabel(), '(none)', 'dummy option disappeared');
       
       Amm.cleanup(s1, objects);
       
    });
    
    QUnit.test("Trait.Select: `dummyLabel`, `dummyValue`", function(assert) {
       
        var fx = jQuery('#qunit-fixture');
        
        fx.html('<select />');
       
        var s1 = new Amm.Element({
            traits: ['Amm.Trait.Select'],
            multiple: false,
            options: {
                foo: 'fooLabel',
                bar: 'barLabel',
                baz: 'bazLabel'
            },
            dummyLabel: '-empty-',
            views: [{
                'class': 'Amm.View.Html.Select',
                htmlElement: fx.find('select')
            }]
        });
        
        assert.equal(fx.find('option').length, 4, 'Dummy option appeared');
        
        assert.equal(s1.getValue(), null, 'Select returns dummy value');
        
        assert.equal(fx.find('option')[0].selected, true, 'Dummy option selected');

        s1.setValue('foo');
        
        assert.equal(fx.find('option')[0].selected, false, 'Dummy option no more selected');

        s1.setValue(null);
        
        assert.equal(fx.find('option')[0].selected, true, 'Dummy option selected again');
        
        s1.setMultiple(true);
        
        assert.equal(fx.find('option').length, 3, 'Dummy option exists no more when multiple === true');
        
        s1.setDummyValue('zz');
        
        s1.setMultiple(false);
        
        assert.equal(fx.find('option').length, 4, 'Dummy option exists again when multiple === false');
        
        assert.equal(s1.getValue(), 'zz', 'Select value is dummy value');
        
        s1.cleanup();
        
    });
    
    QUnit.test("Trait.Select: preserve value during setOptions()", function(assert) {
        
        var e = new Amm.Element({
            traits: 't.Select', 
            multiple: true,
            options: ['a', 'b', 'c'],
            value: ['b', 'c']
        });
        
        e.setOptions(['b', 'c', 'd']);
        assert.deepEqual(e.getValue(), ['b', 'c'], 'Select value preserved during setOptions()');
        e.setOptions(['c', 'd']);
        assert.deepEqual(e.getValue(), ['c'], 'Select value preserved during setOptions(), but missing options aren\'t included into new value');
        
    });
    
    QUnit.test("Trait.Select.Option.get/setVisible", function(assert) {
        
        var fx = jQuery('#qunit-fixture');
        fx.html("<select multiple='multiple' data-amm-e='' data-amm-v='v.Select'></select>");
        var e = new Amm.Element(fx.find('select'));
        e.setOptions(['a', 'b', 'c']);
        e.setValue(['a', 'c']);
        e.options[0].setVisible(false);
        assert.equal(e.options[0].getSelected(), false, 'Invisible option not selected anymore');
        assert.ok(fx.find('select span option[value=a]').length, 'hidden option was added into span element');
        e.options[0].setVisible(true);
        assert.equal(fx.find('select span option[value=a]').length, 0, 'visible option was removed from span element');
        assert.equal(fx.find('select option[value=a]').length, 1, 'visible option remains children of select element');
        Amm.cleanup(e);
        
    });
       
    
    
}) ();
