/* global Amm */

(function() {
    
    var fx = jQuery("#qunit-fixture");
    
    QUnit.module("Trait.Toggle");
    
    QUnit.test("Trait.Toggle", function(assert) {
        
        fx.html("<form>"
            + "<input type='checkbox' name='prop[]' id='cb-a' value='a' checked='checked' readonly='readonly' /> a"
            + "<input type='checkbox' name='prop[]' id='cb-b' value='b' checked='checked' /> b"
            + "<input type='checkbox' name='prop[]' id='cb-c' value='c' /> c"
            + "<input type='radio' name='prop[]' id='cb-d' value='d' /> d"
            + "<input type='radio' name='prop[]' id='cb-e' value='e' readonly='readonly' checked='checked' /> e"
            + "<input type='radio' name='prop[]' id='cb-f' value='f' /> f"
        +"</form>");

        var t = {};
        var v = {};
        var a = ['a', 'b', 'c', 'd', 'e', 'f'];
        var val = {};
        var str = {};
        var handleValueChange = function(value, oldValue) {
            val[Amm.event.origin.getId()] = value;
            var strval = value instanceof Array? '[' + value.join(', ') + ']' : value;
            str[Amm.event.origin.getId()] = strval;
        };
        for (var i = 0, l = a.length; i < l; i++) {
            var name = a[i];
            t[name] = new Amm.Element({traits: [Amm.Trait.Toggle], id: name});
            t[name].subscribe('valueChange', handleValueChange);
            v[name] = new Amm.View.Html.Toggle({element: t[name], htmlElement: fx.find('#cb-' + name)[0]});
        }
        assert.equal(t.a.getGroupName(), 'prop[]', 'Group name auto-detection');
        assert.equal(t.a.getGroupParent(), fx.find('form')[0], 'Group parent auto-detection');
        
        assert.deepEqual(t.a.getValue(), ['a', 'b', 'e'], 'Initial values');
        t.f.setChecked(true);
        assert.deepEqual(t.a.getValue(), ['a', 'b', 'f'], 'Radio setChecked() works');
        assert.deepEqual(val.a, ['a', 'b', 'f'], 'valueChange triggered...');
        var s = '[a, b, f]';
        assert.deepEqual(str, {a: s, b: s, c: s, d: s, e: s, f: s}, '...for all items');
        t.a.setValue(['d', 'e', 'f']);
        assert.deepEqual(val.b, ['d'], 'only first radio is checked when multiple values provided');
        fx.find('#cb-b')[0].checked = true;
        fx.find('#cb-b').change();
        assert.deepEqual(t.b.getChecked(), true, 'DOM event led to checked() change');
        fx.find('#cb-a')[0].checked = true;
        fx.find('#cb-a').change();
        assert.deepEqual(fx.find('#cb-a')[0].checked, false, 'Read-only works for checkboxes');
        fx.find('#cb-e')[0].checked = true;
        fx.find('#cb-e').change();
        assert.deepEqual(fx.find('#cb-e')[0].checked, false, '...and for radios');
        assert.deepEqual(t.e.getChecked(), false, 'both value not changed...');
        assert.deepEqual(t.d.getChecked(), true, 'and for checked box value not changed too');
        assert.deepEqual(val.b, ['b', 'd'], '...and value was reported');
        t.b.setGroupName('xx');
        assert.deepEqual(t.b.getValue(), 'b', 'scalar outside-of-group value');
        assert.deepEqual(val.b, 'b', 'out-of-group value: change was triggered');
        t.c.setGroupName('xx');
        assert.deepEqual(val.c, ['b'], 'group cardinality changed after element added');
        assert.deepEqual(val.b, ['b'], 'group cardinality changed after element added');
        t.c.setGroupName('prop[]');
        assert.deepEqual(val.c, ['d']);
        assert.deepEqual(val.b, 'b', 'group cardinality changed after element removed');
        t.d.setGroupName('yy');
        t.e.setGroupName('yy');
        t.f.setGroupName('yy');
        assert.deepEqual(val.c, [], 'group of un-checked boxes has array value');
        assert.deepEqual(val.d, 'd', 'group of radios has non-array value');
        t.a.setValue(['a', 'c']);
        assert.deepEqual(val.a, ['a', 'c'], 'non-standalone value');
        t.a.setValueIsStandalone(true);
        assert.deepEqual(val.a, 'a', 'standalone checked value');
        t.a.setChecked(false);
        assert.deepEqual(val.a, undefined, 'standalone non-checked value (undefined)');
        t.a.setUncheckedValue('-');
        assert.deepEqual(val.c, ['-', 'c'], 'unchecked value');
        assert.deepEqual(val.a, '-', 'standalone unchecked value');
        t.a.setValue('-');
        assert.deepEqual(t.a.getChecked(), false, 'un-checked when standalone non-checked value assinged');
        t.a.setValue('a');
        assert.deepEqual(t.a.getChecked(), true, 'checked when standalone checked value assinged');
        t.a.setValueIsStandalone(false);
        assert.deepEqual(val.a, ['a', 'c'], 'back to non-standalone value');
        
        Amm.cleanup(Object.values(t));
        
    });
    
}) ();
