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
    
    QUnit.test("Builder.prototypesOnly", function(assert) {
        
        var fx = jQuery('#qunit-fixture');

        fx.html(Amm.html(
            {$: 'p', id: 'p2', 'data-amm-v': 'v.Visual', $$: [
                {$: 'input', id: 'inp2', type: 'text', name: 'work', value: 'the work', 
                    'data-amm-id': 'inp2_e', 
                    'data-amm-v': 'v.Input', 
                $$: null}
            ]}
        ));
        
        var b = new Amm.Builder(fx);
        
        var nodes = b.build(true);
        
        assert.ok(nodes.length > 0, "Amm.Builder.build(true) returns at least one prototype (given correct markup)");
        
        assert.notOk(Amm.getClass(nodes[0]), "Builder's prototype has no class");
        
        var e = Amm.constructInstance(nodes[0]);
        
        assert.ok(Amm.is(e, 'Amm.Element'), 'Constructed node is element');
        assert.ok(Amm.is(e, 'Visual'), 'Constructed node has Visual trait');
        assert.ok(Amm.is(e, 'Editor'), 'Constructed node has Editor trait');
        assert.equal(e.getValue(), 'the work', 'Element received proper value from the view');
       
        
        Amm.cleanup(e);
    });
    
    
    QUnit.test("Amm.Builder.Ref", function(assert) {
        
        var fx = jQuery('#qunit-fixture');
        
        fx.html(Amm.html(
            {$: 'div', 'class': 'outer', $$: [
                {$: 'ul', 'class': 'inner1', $$: [
                        {$: 'li', 'class': 'li1'},
                        {$: 'li', 'class': 'li2'},
                        {$: 'li', 'class': 'li3'},
                ]},
                {$: 'ul', 'class': 'inner2', $$: [
                        {$: 'li', 'class': 'li4'},
                        {$: 'li', 'class': 'li5'},
                        {$: 'li', 'class': 'li6'},
                ]}
            ]}
        ));

        var r = new Amm.Builder.Ref();
        r.setDynamic(true); // we will move this ref around a lot
        r.setNode(fx.find('.li2')[0]);
        assert.ok(r.resolve() === r.getNode());
        r.setFind('.li6');
        r.setClosest('.outer');
        
        assert.ok(r.resolve());
        assert.ok(r.resolve() === fx.find('.li6')[0]);
        
        r.setParent(1);
        r.setClosest(null);
        r.setFind(null);
        assert.ok(r.resolve() === fx.find('ul.inner1')[0]);
        
        r.setIndex(2);
        r.setFind('li');
        assert.ok(r.resolve() === fx.find('.li3')[0]);
        
        r.setIndex(null);
        assert.ok(r.resolve().length === 3);
        
        r.setGlobal(true);
        r.setNode(null);
        r.setIndex(0);
        r.setFind('html');
        assert.ok(r.resolve() && (r.resolve() === jQuery('html')[0]));
        
    });
    
    
    QUnit.test("Amm.Builder: parse $refs", function(assert) {
        
        var fx = jQuery('#qunit-fixture');
        
        // add false positives
        fx.html('<div class="outer"><div class="inner"><div class="children"></div></div></div>');

        var h = Amm.html(
            {
                $: 'div', 
                'data-amm-e': {
                    views: [
                        {'class': 'Amm.View.Html.Visual', htmlElement: {$ref: null}},
                        {'class': 'Amm.View.Html.DisplayParent', htmlElement: {$ref: '.children'}},
                    ],
                    displayChildrenPrototype: {
                        instantiator: {
                            __construct: 'Amm.Instantiator.Proto',
                            proto: {
                                'class': 'Amm.Element',
                                //builderSource: {$ref: '.childProto[data-amm-dont-build]'}
                                
                                // todo: resolve-once refs
                                builderSource: {$ref: '.childProto'}
                            },
                        }
                    }
                },
                'class': 'outer', $$: [
                    {$: 'div', class: 'children'},
                    {$: 'div', 'data-amm-dont-build': true, class: 'childProto', 'data-amm-v': {
                        class: 'Amm.View.Html.Visual'
                    }, $$: [
                        {$: 'div', 'data-amm-v': 'Amm.View.Html.Content'}
                    ]}
                ]
            }
        );

        var e = new Amm.Element({builderSource: h});
        
        assert.ok(Amm.is(e, 'Visual'), 'Created container element has Visual trait');
        assert.ok(Amm.is(e, 'DisplayParent'), 'Created container element has DisplayParent trait');
        
        var e1 = e.displayChildren.createItem();
        
        assert.ok(Amm.is(e1, 'Visual'), 'Created sub-element has Visual trait');
        assert.ok(Amm.is(e1, 'Content'), 'Created sub-element has Content trait');
        
        assert.ok(e.findView('Amm.View.Html.Visual').getHtmlElement());
        assert.ok(e.findView('Amm.View.Html.DisplayParent').getHtmlElement());
        assert.ok(e1.findView('Amm.View.Html.Visual').getHtmlElement());
        assert.ok(e1.findView('Amm.View.Html.Content').getHtmlElement());
        
        var e2 = e.displayChildren.createItem();
        assert.ok(e2.findView('Amm.View.Html.Visual').getHtmlElement());
        assert.ok(e2.findView('Amm.View.Html.Content').getHtmlElement());
        
        Amm.cleanup(e, e1, e2);
        
    });
    
    QUnit.test("Amm.Builder: test Amm.Builder.Ref serialization", function(assert) {
        
        var r = new Amm.Builder.Ref({closest: 'div.something', index: 3});
        var r1 = new Amm.Builder.Ref(JSON.parse(JSON.stringify(r)));
        assert.deepEqual(r.toJSON(), r1.toJSON(), 
            'Amm.Builder.Ref can be unserialized from Amm.Builder.toJSON() output');
        
    });
    
    QUnit.test("Amm.Builder: return view prototypes", function(assert) {
        
        var fx = jQuery('#qunit-fixture');
        
        fx.html(Amm.html({
            $: 'div',
            data_amm_v: 'v.StaticDisplayParent',
            style: { border: '1px solid gold', margin: '1em' },
            $$: [
                'Name: ', {$: 'input', type: 'text', data_amm_id: 'name', data_amm_v: '[v.Input, v.Visual]'},
                '<br />',
                'Age: ', {$: 'input', type: 'text', data_amm_id: 'age', data_amm_v: '[v.Input, v.Visual]'}
            ]
        }));
        
        var e = new Amm.Element({traits: ['t.Visual', 't.DisplayParent', 't.Component']});
        var b = new Amm.Builder(fx);
        var proto = b.calcViewPrototypes(e);
        assert.ok(proto.length == 1, '1 view prototype was returned');
        assert.ok(proto[0].class == 'v.StaticDisplayParent', 'view prototype has proper class');
        assert.ok(proto[0].htmlElement == fx[0].firstChild, 'view prototype references proper htmlElement');
        assert.ok(proto[0].element == e, 'view prototype references proper Element instance');
        Amm.constructInstance(proto[0]);
        
        assert.notOk('views' in e, 'When element instance is provided to calcViewPrototypes, ');
        
        fx.html(Amm.html({
            $: 'div',
            data_amm_v: ['v.Visual'],
            $$: {
                $: 'input',
                type: 'text',
                data_amm_v: ['v.Input'],
            }
        }));
        
        var b2 = new Amm.Builder(fx[0].firstChild);
        
        var proto2 = b2.calcViewPrototypes(e);
        
        assert.equal(proto2.length, 2, 'calcViewPrototypes(element) should not include old views');
        
        Amm.cleanup(e);
        
        fx.html(Amm.html([
            {
                $: 'div',
                data_amm_id: '__parent',
                data_amm_v: ['v.Visual'],
                $$: {
                    $: 'input',
                    type: 'text',
                    data_amm_v: ['v.Input'],
                }
            },
            {
                $: 'div',
                data_amm_id: '__parent',
                data_amm_v: ['v.Annotated'],
                $$: {
                    $: 'div',
                    'class': 'annotation a_label'
                }
            },
        ]));
        
        var b3 = new Amm.Builder(fx);
        
        var proto3 = b2.calcViewPrototypes();
        
        assert.equal(proto3.length, 3, 'calcViewPrototypes() included three views');
        
    });
    
    QUnit.test("Amm.Builder: use builder source as element prototype", function(assert) {
        
        var e = new Amm.Element('<input type="text" data-amm-v="v.Input" data-amm-e="{value: 10}" />');
        
        assert.equal(Amm.getClass(e), 'Amm.Element', "Element was created from HTML markup");
        assert.ok(Amm.is(e, 'Editor'), "Element has proper traits");
        
        var v = e.getUniqueSubscribers('Amm.View.Html.Input');
        if (assert.ok(v.length, 'View was created')) {
            assert.equal(jQuery(v[0].getHtmlElement()).val(), '10', 'HTML input element has proper value');
        }
        
        Amm.cleanup(e);
        
        var jq = jQuery('<div class="lbl" data-amm-v="[v.Content, v.Visual]">The Text</div>');
        var e2 = new Amm.Element(jq);
        
        assert.equal(Amm.getClass(e2), 'Amm.Element', "Element was created from jQuery result");
        assert.ok(Amm.is(e2, 'Content'), "Element has proper traits");
        assert.ok(Amm.is(e2, 'Visual'), "Element has proper traits");
        assert.equal(e2.getClassName(), 'lbl', "Element properties were init");
        assert.equal(e2.getContent(), 'The Text', "Element properties were init");
        
        e2.setContent('Changed Content');
        assert.equal(jq.html(), 'Changed Content', 'Changed property is reflected in DOM');
        
        Amm.cleanup(e2);
        
    });
        
    QUnit.test("Builder externals: $ext", function(assert) {
        
        var fx = jQuery('#qunit-fixture');
        window.d.tmp_ext_data = {
            id: 'elem1',
            extraTraits: ['t.Content'],
            chain: {'$ext': 'd.tmp_ext_data3'}
        };
        window.d.tmp_ext_data2 = {
            sub: {
                'class': 'Amm.View.Html.Content'
            }
        };
        window.d.tmp_ext_data3 = 'zzz';
        fx.html(Amm.html([
            {
                $: 'div',
                data_amm_e: '{$ext: d.tmp_ext_data}',
                data_amm_v: '[v.Visual, {$ext: d.tmp_ext_data2.sub}]'
            },
        ]));
        var proto = Amm.Builder.calcPrototypeFromSource(fx);
        assert.equal(proto.id, 'elem1', 'Element prototype is resolved as external');
        assert.deepEqual(proto.chain, {'$ext': 'd.tmp_ext_data3'}, '$ext is not processed inside other $ext\' value');
        assert.deepEqual(proto.views[1].class, 'Amm.View.Html.Content', 'View prototype is resolved');
        fx.html(Amm.html([
            {
                $: 'div',
                data_amm_e: '{$ext: nonExistent}'
            },
        ]));
        assert.throws(function() {
            proto = Amm.Builder.calcPrototypeFromSource(fx);
        }, /Cannot resolve/, 'Attempt to reference nonexistent $ext throws exception');
        
    });
        
    QUnit.test("Builder extensions: data-amm-x", function(assert) {
        
        var fx = jQuery('#qunit-fixture');
        var testExt = {
            builderExtension_simple: function(htmlElement, proto, arg) {
                proto.id = htmlElement.getAttribute('id');
                proto.views = ['v.Visual'];
            },
            builderExtension_multi_1: function(htmlElement, proto, arg) {
                proto.prop__arg1 = arg;
                proto.views = ['v.Visual'];
            },
            builderExtension_multi_2: function(htmlElement, proto, arg) {
                proto.prop__arg2 = arg;
            }
        };
        Amm.registerNamespace('testExt', testExt);
        fx.html(Amm.html([
            {
                $: 'div',
                id: 'thisWillBecomeElementId',
                data_amm_x: 'testExt.simple',
            },
            {
                $: 'div',
                data_amm_x: {
                    'testExt.multi_1': null, 
                    'testExt.multi_2': ['argItem1', 'argItem2']
                }
            },
        ]));
        var b = new Amm.Builder(fx);
        var p = b.build(true);
        assert.deepEqual(p[0], {
            'class': 'Amm.Element', 
            id: 'thisWillBecomeElementId', 
            views: ['v.Visual']
        }, 'String-referenced builder extension was called');
        assert.deepEqual(p[1].prop__arg1, null, 'Hash-referenced builder extensions called (1)');
        assert.deepEqual(p[1].prop__arg2, ['argItem1', 'argItem2'], 'Hash-referenced builder extensions called (2), arguments set');
        fx.html(Amm.html([
            {
                $: 'div',
                data_amm_x: 'nonExistentId',
            }
        ]));
        assert.throws(function() {
            p = b.build();
        }, /Unknown function|namespace/, 'Attempt to reference nonexistent extension throws exception');
    });
    
}) ();
