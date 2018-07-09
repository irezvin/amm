// global Amm

(function() {

    QUnit.module("Builder");

    QUnit.test("Builder", function(assert) {
        
        var fx = jQuery("#qunit-fixture");
        
        fx.html('\n\n\
            <div    id="div1"\n\
                    data-amm-e="{id: div1_e, extraTraits: [t.Component]}"  \n\
                    data-amm-v="{class: v.StaticDisplayParent}"> \n\
\
                <p>Want to work in our company?</p> \n\
                <p  id="p1" \n\
                    data-amm-v="v.Visual"> \n\
\
                    <input  id="inp1" type="radio" name="work" value="0" \n\
                            data-amm-e="{id: inp1_e, extraTraits: t.Toggle}" \n\
                            data-amm-v="v.Toggle" /> \n\
                    No \n\
                </p> \n\
                <p  id="p2" \n\
                    data-amm-v="v.Visual"> \n\
                    <input  id="inp2" type="radio" name="work" value="1" \n\
                            data-amm-id="inp2_e" \n\
                            data-amm-e="{extraTraits: t.Toggle}" \n\
                            data-amm-v="v.Toggle" \n\
                    />Yes</p> \n\
                <div    id="div2" data-amm-v="v.Visual"> \n\
                    <label>Preferred salary: </label> \n\
                    <input  id="inp3" data-amm-id="@inp3_e" \n\
                            data-amm-e="{in__visible: \'work.value == 1\'}" \n\
                            data-amm-v="v.Input" /> \n\
                </div> \n\
                <div        id="div3" data-amm-dont-build=""> \n\
                    <div    id="div5" data-amm-v="v.Visual" \n\
                            data-amm-e="{id: div5_e, visible: false}"> \n\
                        (no build here) \n\
                    </div> \n\
                </div> \n\
                <div    id="div6" \n\
                        data-amm-id="div6_e" \n\
                        data-amm-e="{}"> \n\
                        No views \n\
                </div> \n\
            </div> \n\
            <p  id="p3" \n\
                data-amm-v="v.Visual" \n\
                data-amm-id="@inp3_e"> \n\
                    xxx \n\
            </p> \n\
            <p  id="p4" \n\
                data-amm-v="v.Visual" \n\
                data-amm-id="item4"> \n\
                    <p id="v.Content">xxx</p> \n\
            </p> \n\
        ');
        
        var p = new Amm.Element({traits: ['Amm.Trait.Component']});
        
        var b = new Amm.Builder(fx, {
            rememberElements: true,
            reportMode: Amm.Builder.PROBLEM_HTML,
            topLevelComponent: p
        });
        
        var elements = b.build();
        
        assert.equal(elements.length, 6, '6 elements created');
        var names = Amm.getProperty(elements, 'id');
        
        assert.ok(Amm.Array.indexOf('div5_e', names) === -1, "Element inside [data-amm-dont-build] not created");
        
        // no div5-e
        var properNames = ['inp1_e', 'inp2_e', 'inp3_e', 'div6_e', 'div1_e', 'item4'];
        names.sort();
        properNames.sort();
        assert.deepEqual(names, properNames);
        
        var byIds = {};
        for (var i = 0, l = elements.length; i < l; i++) {
            byIds[elements[i].getId()] = elements[i];
        }
        
        assert.ok(byIds.div1_e.getComponent() === p, 
            'component of top-level created element is set to Builder.topLevelComponent');
            
        assert.ok(p.getElements().length === 2, 'only two elements are assigned to topLevelComponent');
        
        var getBoundHtmlElementIds = function(e) {
            var ee = Amm.getProperty(e.getUniqueSubscribers('Amm.View.Abstract'), 'htmlElement');
            var res = [];
            for (var i = 0; i < ee.length; i++) if (ee[i]) res.push(ee[i].getAttribute('id'));
            res.sort();
            return res;
        };
        
        assert.deepEqual(getBoundHtmlElementIds(byIds.inp1_e), ['inp1', 'p1'].sort(), 
            'outer view properly detected');
        
        assert.deepEqual(getBoundHtmlElementIds(byIds.inp3_e), ['div2', 'inp3', 'p3'].sort(), 
            'global @id works');
            
        var elements2 = b.build();
        assert.ok(!elements2.length, 'Re-running build() doesn\'t re-create elements that');
        
        assert.ok(fx.find('#div6').attr('data-amm-warning'), "htmlElement for element w/o views has warning attribute");
        
        b.clear();
        
        Amm.cleanup(elements);
        
    });

    QUnit.test("Builder.NestedElementsPriority", function(assert) {
        
        var fx = jQuery("#qunit-fixture");
        
        fx.html('        \n\
            <div data-amm-e="{id: comp, extraTraits: [t.Component]}" data-amm-v="{class: v.StaticDisplayParent}">\n\
                <div data-amm-v="v.Visual" class="outerV">\n\
                    <div data-amm-v="v.Visual" class="innerV">\n\
                        <input type="text"\n\
                               data-amm-v="v.Input" \n\
                               data-amm-e="{id: inp, extraTraits: [t.Input]}" \/>\n\
                    <\/div>\n\
                <\/div>\n\
            <\/div>\n\
        ');
        
        var b = new Amm.Builder(fx, {
            rememberElements: true,
            reportMode: Amm.Builder.PROBLEM_HTML
        });
        
        var elements = b.build();
        
        assert.equal(elements.length, 2, '2 elements created');
        
        var byIds = {};
        byIds[elements[0].getId()] = elements[0];
        byIds[elements[1].getId()] = elements[1];
        
        assert.equal(byIds.comp.getUniqueSubscribers('Amm.View.Abstract').length, 1, 'Outer element has only one view');
        var subs;
        assert.equal((subs = byIds.inp.getUniqueSubscribers('Amm.View.Abstract')).length, 3, 'Inner element has three views');
        b.clear();
        Amm.cleanup(elements);
        
    });
    
    
}) ();
