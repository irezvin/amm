/* global QUnit */
/* global Amm */

(function() {

    QUnit.module("View");

    QUnit.test("findViewAndEvents", function(assert) {
        
        var html = '<div id="outer"><input id="inner" type="text" /><textarea id="zz"></textarea></div>';
        
        var 
            e = new Amm.Element({traits: [Amm.Trait.Input, Amm.Trait.Visual]}),
            inputView = new Amm.View.Html.Input({relativeToView: 'visual', htmlElement: 'input'}),
            inputView2 = new Amm.View.Html.Input({relativeToView: true, htmlElement: {$ref: 'textarea'}}),
            visualView = new Amm.View.Html.Visual({id: 'visual'});
        
        var log = [];
        
        var logWaitForView = function(view, element) { 
            log.unshift(this.msg + ':' + Amm.getClass(view) + ':' + Amm.getClass(element)); 
        };
        
        var handler = function(view) {
            log.unshift(Amm.event.name + ':' + Amm.getClass(view));
        };
        
        e.subscribe('viewAdded', handler);
        e.subscribe('viewDeleted', handler);
        e.subscribe('viewReady', handler);

        // We wait for Input view using class name (Id is undefined, and class is referenced using constructor)
        var h1 = Amm.View.Abstract.waitForView(e, undefined, Amm.View.Html.Input, logWaitForView, {msg: 'InputViewReady'} );
        
        assert.ok(h1, 'Amm.View.Abstract.waitForView returned the handler');
        
        // We wait for Visal view using Id (class name is undefined)
        var h2 = Amm.View.Abstract.waitForView(e, 'visual', undefined, logWaitForView, {msg: 'VisualViewReady'} );
        
        var bogus = Amm.View.Abstract.waitForView(e, 'visual', undefined, logWaitForView, {msg: 'BogusMsg'} );
        
        Amm.View.Abstract.stopWaitingForView(e, bogus);
        // later we will check that log doesn't receive "Bogus msg"
        
        assert.equal(e.findView(), undefined, 'Element doesn\'t have any views');
        
        assert.equal(log.length, 0, "Since there's no views, there was no view-related events");
        
        visualView.setElement(e);
        
            assert.deepEqual(log[0], 'viewAdded:Amm.View.Html.Visual', "viewAdded fired");
        
            assert.notOk(visualView.getIsReady(), 'View is not ready');
        
            assert.ok(e.findView() === visualView, 'findView() without parameters returns first added view');
            
            assert.notOk(e.findView('notExistent'), "findView() with non-existent ID returns empty result");
            
            assert.ok(e.findView('visual') === visualView, 'findView(id)');
            
            assert.ok(e.findView(undefined, Amm.View.Html.Visual) === visualView, 'findView(class)');
            
        
        inputView.setElement(e);
        
            assert.deepEqual(log[0], 'viewAdded:Amm.View.Html.Input', "viewAdded fired");
        
            assert.notOk(inputView.getIsReady(), 'Input view is not ready (yet)');
            
        visualView.setHtmlElement(html);
        
            assert.ok(visualView.getIsReady(), 'View became ready after htmlElement appeared');
            assert.ok(inputView.getIsReady(), 'Dependent view became ready with referenced view');
            assert.ok(inputView.getHtmlElement(), 'Dependent view received HTML element');
            assert.deepEqual(visualView.getHtmlElement().getAttribute('id'), 'outer', 'Main view was assigned proper element');
            assert.deepEqual(inputView.getHtmlElement().getAttribute('id'), 'inner', 'Dependent view was assigned proper element');

            assert.ok(log.join(' ').indexOf('viewReady:Amm.View.Html.Visual') >= 0, "viewReady fired for first view");
            assert.ok(log.join(' ').indexOf('viewReady:Amm.View.Html.Input') >= 0, "viewReady fired for dependent view");
            assert.ok(log.join(' ').indexOf('VisualViewReady') >= 0, "wait for view: handler triggered for first view");
            assert.ok(log.join(' ').indexOf('InputViewReady') >= 0, "wait for view: handler triggered for dependent view");
            assert.ok(log.join(' ').indexOf('BogusMsg') < 0, "wait for view: unneeded handler was successfully deleted");
            
        inputView.setElement(null);
        
            assert.notOk(inputView.getIsReady(), 'View is not "ready" after detached from element');
            assert.deepEqual(log[0], 'viewDeleted:Amm.View.Html.Input', "viewAdded fired");
            
        var h3 = Amm.View.Abstract.waitForView(e, 'visual', undefined, logWaitForView, {msg: 'VisualViewReady'} );
        
            assert.deepEqual(log[0], 'VisualViewReady:Amm.View.Html.Visual:Amm.Element', 
                'waitForView handler was executed immediately since the view is already present');
            assert.notOk(h3, 'Returned handler was empty when waitForView() is immediate');
        
        inputView2.setElement(e);
        
            assert.ok(inputView2.getIsReady(), 'second dependent view was initialized immediately');
            
        Amm.cleanup(e, inputView);
        
    });
    
    QUnit.test("Amm.View.Html: release dom nodes on unobserve", function(assert) {        
        var fx = jQuery('#qunit-fixture');
        
        fx.html(Amm.html({
            $: 'div', data_amm_v: 'v.Visual', data_amm_e: {},
            $$: {
                $: 'input', type: 'text', data_amm_v: 'v.Input'
            }
        }));
        
        var b = new Amm.Builder(fx);
        var e = b.build()[0];
        
        if (assert.ok(e, 'initial element was built successfully'));
        if (!e) {
            return;
        };
        
        assert.equal(fx.find('[data-amm-iid *= "amm_"]').length, 2, 
            'Both view-bound HTMLElements have data-amm-iid attribute filled-in');
            
        Amm.cleanup(e);
        
        assert.equal(fx.find('[data-amm-iid *= "amm_"]').length, 0, 
            'After element cleanup, no HTMLElement has data-amm-iid attribute filled-in');
        
    });

    QUnit.test("htmlView.setHtmlSource", function(assert) {
        
        var he = jQuery("<div><input value='foo' type='text' /></div>");
        var v = new Amm.View.Html.Input({htmlSource: he[0]});
        
        assert.ok(v.getHtmlElement(), 'setHtmlSource led to htmlElement assigned');
        assert.ok(he[0].firstChild !== v.getHtmlElement(), 'it is not the same element as one in htmlSource');
        assert.equal(v.getVValue(), 'foo', 'same value as in htmlSource element');
        
    });


    QUnit.test("createWithViews", function(assert) {
        
        var f = jQuery('#qunit-fixture');
        
        f.append('<input type="text" value="zz" />');
        
        var e = new Amm.Element({
            traits: [
                Amm.Trait.Visual,
                Amm.Trait.Input
            ],
            views: [
                {
                    'class': 'Amm.View.Html.Visual',
                    id: 'visual',
                    htmlElement: '<div class="inputContainer"><input type="text" value="theValue" /></div>'
                },
                {
                    'class': 'Amm.View.Html.Input',
                    id: 'input',
                    htmlElement: 'input',
                    relativeToView: 'visual'
                }
            ]
        });
        
        var visualView = e.findView('visual');
        var inputView = e.findView('input');
        assert.ok(visualView.getObserving());
        assert.ok(inputView.getObserving());
        
        window.d.e = e;
        window.d.vv = visualView;
        window.d.iv = inputView;
        
        assert.equal(e.getClassName(), 'inputContainer');
        assert.equal(e.getValue(), 'theValue');
        
        Amm.cleanup(e);
        
    });
    
    QUnit.test("Amm.View.Html.Default", function(assert) {

        var f = jQuery('#qunit-fixture');
        
        f.html("<div class='defaultView'></div> <div class='otherLocation'></div>'"
            + " <div class='inside'></div> <div class='inside2'></div>");
        
        var e = new Amm.Element({
            traits: ['t.Input', 't.Visual'],
            className: 'eClass',
            value: 'eValue',
            constructDefaultViews: function() {
                return Amm.html({
                    $: 'div',
                    data_amm_v: ['v.Visual'],
                    $$: {
                        $: 'input',
                        type: 'text',
                        data_amm_v: ['v.Input'],
                    }
                });
            }
        });
        
        var defaultElement = f.find('.defaultView');
        
        var v = new Amm.View.Html.Default({
            htmlElement: defaultElement,
            element: e
        });
        
        var iv = new Amm.View.Html.Default({
            htmlElement: f.find('.inside'),
            replaceOwnHtmlElement: false
        });
        
        assert.ok(v.getObserving(), 'Default view observes element');
        assert.ok(f.find('div.eClass').length === 1, 'Outermost constructed view\' HTMLElement is in place');
        assert.ok(f.find('div.defaultView').length === 0, 'Outermost constructed view\' HTMLElement replaced default view HTMLElement');
        if (assert.ok(v.getOwnHtmlElement() !== null, 'Default view\' getOwnHtmlElement() returns non-null value after element is observed')) {
            assert.notOk(v.getOwnHtmlElement().parentNode, 'Default view\' HTMLElement was detached from DOM tree');
        }
        assert.equal(f.find('input').val(), 'eValue', 'Innermost view\' HTMLElement is in place');
        
        v.setHtmlElement(f.find('.otherLocation'));
        
        v.setElement(null);
        
        assert.equal(e.getUniqueSubscribers('Amm.View.Abstract').length, 0, 
            'Constucted views are detached from element when Amm.View.Html.Default is unsubscribed');
            
        assert.equal(f.find('[data-amm-iid *= "amm_"]').length, 0, 
            'All views released their HTMLElements');
            
        iv.setElement(e);
        
        assert.ok(f.find('.inside .eClass').length, 'Element container is placed inside HTMLElement of ' 
                + 'default view with replaceOwnHtmlElement := false');
        
        iv.setHtmlElement(f.find('.inside2'));
        
        assert.notOk(f.find('.inside .eClass').length, 
            'setHtmlElement: element html container is removed from old HTMLElement...');
        
        assert.ok(f.find('.inside2 .eClass').length, 
            'setHtmlElement: element html container is placed into new HTMLElement');        
        
        iv.setElement(null);
        
        assert.notOk(f.find('.inside2 .eClass').length, 'detach view: element html container removed from HTMLElement');
        
        assert.equal(f.find('[data-amm-iid *= "amm_"]').length, 0, 
            'detach: All views released their HTMLElements');
            
        Amm.cleanup(v, iv, e);
        
    });
    
    /*
     * This test is the same as previous one, except element views' have two sibling HTML Nodes
     */
    QUnit.test("Amm.View.Html.Default: several top-level views", function(assert) {

        var f = jQuery('#qunit-fixture');
        
        f.html("<div class='defaultView'></div> <div class='otherLocation'></div>'"
            + " <div class='inside'></div> <div class='inside2'></div>");
        
        var e = new Amm.Element({
            traits: ['t.Input', 't.Visual', 't.Annotated'],
            className: 'eClass',
            value: 'eValue',
            label: 'The Label',
            constructDefaultViews: function() {
                return Amm.html([
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
                ]);
            }
        });
        
        var defaultElement = f.find('.defaultView');
        
        var v = new Amm.View.Html.Default({
            htmlElement: defaultElement,
            element: e
        });
        
        var iv = new Amm.View.Html.Default({
            htmlElement: f.find('.inside'),
            replaceOwnHtmlElement: false
        });
        
        assert.ok(v.getObserving(), 'Default view observes element');
        assert.ok(f.find('div.eClass').length === 1, 'Outermost constructed view\' HTMLElement is in place');
        assert.ok(f.find('div.defaultView').length === 0, 'Outermost constructed view\' HTMLElement replaced default view HTMLElement');
        if (assert.ok(v.getOwnHtmlElement() !== null, 'Default view\' getOwnHtmlElement() returns non-null value after element is observed')) {
            assert.notOk(v.getOwnHtmlElement().parentNode, 'Default view\' HTMLElement was detached from DOM tree');
        }
        assert.equal(f.find('input').val(), 'eValue', 'Innermost view\' HTMLElement is in place');
        assert.equal(f.find('.annotation.a_label').html(), 'The Label', 'Annotation is in place');
        
        v.setHtmlElement(f.find('.otherLocation'));
        
        v.setElement(null);
        
        assert.equal(e.getUniqueSubscribers('Amm.View.Abstract').length, 0, 
            'Constucted views are detached from element when Amm.View.Html.Default is unsubscribed');
            
        assert.equal(f.find('[data-amm-iid *= "amm_"]').length, 0, 
            'All views released their HTMLElements');
            
        iv.setElement(e);
        
        assert.ok(f.find('.inside .eClass').length, 'Element container is placed inside HTMLElement of ' 
                + 'default view with replaceOwnHtmlElement := false');
        
        iv.setHtmlElement(f.find('.inside2'));
        
        assert.notOk(f.find('.inside .eClass').length, 
            'setHtmlElement: element html container is removed from old HTMLElement...');
        
        assert.ok(f.find('.inside2 .eClass').length, 
            'setHtmlElement: element html container is placed into new HTMLElement');        
        
        iv.setElement(null);
        
        assert.notOk(f.find('.inside2 .eClass').length, 'detach view: element html container removed from HTMLElement');
        
        assert.equal(f.find('[data-amm-iid *= "amm_"]').length, 0, 
            'detach: All views released their HTMLElements');
            
        Amm.cleanup(e, v, iv);
        
    });
    
    QUnit.test("Amm.View.Html.Expressions", function(assert) {

        var fx = jQuery('#qunit-fixture');        
        var div = jQuery('<div></div>');
        fx.append(div);
        
        var elem = new Amm.Element({
            props: {
                name: 'John',
                surname: 'Doe',
                age: 17,
                gender: 'male',
                married: false,
                employeed: true
            }
        });
        
        var elem1 = new Amm.Element({
            props: {
                name: 'Karen',
                surname: 'Dobbs',
                age: 23,
                gender: 'female',
                married: true,
                employeed: true
            }
        });
        
        var v = new Amm.View.Html.Expressions({
            map: {
                'data-name': 'name',
                'data-surname': 'surname',
                'data-fullname': "this.name + ' ' + this.surname",
                'class__married': 'married',
                'class__employeed': 'employeed',
                'class__underage': 'this.age < 21',
                'style__background-color': "this.gender === 'male'? 'blue' : 'pink'",
                '_html': "'<h1>' + this.name + ' ' + this.surname + '</h1><p>Age: <strong>' + this.age + '</strong>, ' + this.gender + '</p>'"
            }
        });
        
        v.setElement(elem);
        v.setHtmlElement(div);
        
            assert.deepEqual(div.html(), "<h1>John Doe</h1><p>Age: <strong>17</strong>, male</p>",
                "setting _html works");
            assert.deepEqual(div.attr('data-name'), elem.getName(),
                "setting attribute works (1)");
            assert.deepEqual(div.attr('data-surname'), elem.getSurname(),
                "setting attribute works (2)");
            assert.deepEqual(div.attr('data-fullname'), 'John Doe',
                "setting attribute works (3)");
            assert.ok(div.hasClass('underage'), 'setting class works (1)');
            assert.ok(div.hasClass('employeed'), 'setting class works (2)');
            assert.notOk(div.hasClass('married'), 'setting class works (3)');
            assert.equal(div.css('background-color'), 'rgb(0, 0, 255)', 'setting style works');
        
        elem.setAge(22);
        elem.setEmployeed(false);
        elem.setMarried(true);
        
            assert.deepEqual(div.html(), "<h1>John Doe</h1><p>Age: <strong>22</strong>, male</p>",
                "props changed: setting _html works");
            assert.notOk(div.hasClass('underage'),
                "props changed: toggling class works (1)");
            assert.notOk(div.hasClass('employeed'),
                "props changed: toggling class works (2)");
            assert.ok(div.hasClass('married'),
                "props changed: toggling class works (3)");
        
        v.setElement(elem1);
        
            assert.deepEqual(div.html(), "<h1>Karen Dobbs</h1><p>Age: <strong>23</strong>, female</p>",
                "new element observed: setting _html works");
            assert.deepEqual(div.attr('data-name'), elem1.getName(),
                "new element observed: setting attribute works (1)");
            assert.deepEqual(div.attr('data-surname'), elem1.getSurname(),
                "new element observed: setting attribute works (2)");
            assert.deepEqual(div.attr('data-fullname'), 'Karen Dobbs',
                "new element observed: setting attribute works (3)");
            assert.notOk(div.hasClass('underage'),
                'new element observed: setting class works (1)');
            assert.ok(div.hasClass('employeed'),
                'new element observed: setting class works (1)');
            assert.ok(div.hasClass('married'),
                'new element observed: setting class works (1)');
            assert.equal(div.css('background-color'), 'rgb(255, 192, 203)',
                'new element observed: setting style works');
        
        Amm.cleanup(elem, elem1);
        
    });
    
    QUnit.test("Amm.View.Html.Expressions: paths and default html", function(assert) {

        var fx = jQuery('#qunit-fixture');        
        var div = jQuery('<div></div>');
        fx.append(div);
        
        var elem = new Amm.Element({
            props: {
                name: 'John',
                surname: 'Doe',
                age: 17,
                gender: 'male',
                married: false,
                employeed: true
            }
        });
        
        var elem1 = new Amm.Element({
            props: {
                name: 'Karen',
                surname: 'Dobbs',
                age: 23,
                gender: 'female',
                married: true,
                employeed: false
            }
        });
        
        var v = new Amm.View.Html.Expressions({
            defaultHtml: 
                    '<p>Name: <span class="name"></span></p>'
                +   '<p>Surname: <span class="surname"></span></p>'
                +   '<p class="married">Married</p>'
                +   '<input type="checkbox" name="employeed" />'
                +   '<input type="text" name="age" />',
            map: {
                '.name:::_html': 'name',
                '.name:::data-value': 'name',
                '.surname:::_html': 'surname',
                '.surname:::data-value': 'surname',
                '.married:::_visible': 'married',
                'input[name=employeed]:::dom__checked': 'employeed',
                'input[name=age]:::jquery__val': 'age',
            }
        });
        
        v.setElement(elem);
        v.setHtmlElement(div);
        
            assert.deepEqual(div.html(), 
                    '<p>Name: <span class="name" data-value="John">John</span></p>'
                +   '<p>Surname: <span class="surname" data-value="Doe">Doe</span></p>'
                +   '<p class="married" style="display: none;">Married</p>'
                +   '<input type="checkbox" name="employeed">'
                +   '<input type="text" name="age">',
                "mapping of internal elements works");
                
            assert.deepEqual(div.find("input[name=employeed]")[0].checked, true, 'dom prop set');
            assert.deepEqual(div.find("input[name=age]").val(), "17", 'dom prop set');
                
            var nameEl = div.find('.name');
            var surnameEl = div.find('.surname');
                
        v.setElement(elem1);
        
        assert.deepEqual(nameEl.html(), 'Karen');
        assert.deepEqual(surnameEl.html(), 'Dobbs');
        
        Amm.cleanup(elem, elem1);
        
    });
    
    
    
}) ();
