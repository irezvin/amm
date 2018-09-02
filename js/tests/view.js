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
            
        e.cleanup();
        
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
        
    });
    
}) ();
