/* global Amm */
/* global QUnit */

(function() {

    var elements = [];
    var el;
    var node;
    
    var newNode = function(content, retHtml) {
        node = jQuery('<div>' + content + '</div>')[0];
        el = new Amm.Element({traits: ['Amm.Trait.Content', 'Amm.Trait.Visual'], visible: true});
        new Amm.View.Html.Visual({element: el, htmlElement: node});
        new Amm.View.Html.Content({element: el, htmlElement: node});
        elements.push(el);
        return retHtml? node : el;
    };
    
    var newDp = function(htmlNode) {
        el = new Amm.Element({
            traits: ['Amm.Trait.DisplayParent']
        });
        var view = new Amm.View.Html.DisplayParent({
            element: el,
            scanForItems: true,
            scanForDisplayOrder: true,
            htmlElement: htmlNode
        });
        return el;
    };
    
    var Item = function(options) { Amm.Element.call(this, options); };
    Amm.createProperty(Item.prototype, 'name');
    Amm.createProperty(Item.prototype, 'size');
    Amm.extend(Item, Amm.Element);
    
    var WithCollection = function(options) { Amm.Element.call(this, options); };
    Amm.createProperty(WithCollection.prototype, 'collection');
    Amm.extend(WithCollection, Amm.Element);
    
    var renderedItems = [];
    
    var renderItem = function(item) {
        renderedItems.push(item);
        return "<div><span>" + item.getName() + "</span>:<strong>" + item.getSize() + "</strong>;</div>";
    };
    
    var updatedItems = [];
    
    var updateItem = function(item, element) {
        updatedItems.push(item);
        jQuery(element).find('span').html(item.getName());
        jQuery(element).find('strong').html(item.getSize());
        return element;
    };
    
    var cnt = function(items) { return Amm.getProperty(items, 'content').join(''); };

    //-----------------------------------------------------------------------

    QUnit.module("View.Html.Collection");
    
    //-----------------------------------------------------------------------
    
    QUnit.test("View.Html.Collection", function(assert) {
        
        /* global renderedItems */
        /* global updatedItems */
        
        
        var fx = jQuery("#qunit-fixture");
        fx.html(
            '<div class="cont_c1"></div>' +
            '<div class="cont_c2"></div>'
        );
        var cont_c1 = jQuery('.cont_c1')[0];
        var cont_c2 = jQuery('.cont_c2')[0];
        var a, b, c, d;
        var coll1 = new Amm.Collection({
            items: [
                a = new Item({name: 'a.jpg', size: 102400}),
                b = new Item({name: 'b.txt', size: 100})
            ],
            changeEvents: ['nameChange', 'sizeChange']
        });
        var coll2 = new Amm.Collection({
            items: [
                d = new Item({name: 'd.com', size: 255}),
                c = new Item({name: 'c.ps', size: 64000})
            ],
            changeEvents: ['nameChange', 'sizeChange'],
            comparisonProperties: 'name',
            updateProperties: 'size'
        });
        var e = new Item({name: 'e.tiff', size: 20480});
        var wc = new WithCollection();
        
        var vc1 = new Amm.View.Html.Collection({
            element: wc, 
            collectionProperty: 'collection', 
            htmlElement: cont_c1,
            createItemHtml: renderItem
        });
        
        var vc2 = new Amm.View.Html.Collection({
            htmlElement: cont_c2,
            createItemHtml: renderItem,
            updateItemHtml: updateItem,
            requiresElement: true
        });
        
        
        assert.notOk(vc1.getObservesCollection(), 'empty element.`collectionProperty`: collection not observed');
        wc.setCollection(coll1);
        assert.ok(vc1.getObservesCollection(), 'non-empty element.`collectionProperty`: collection is observed');
        vc1.setHtmlElement(null);
        assert.notOk(vc1.getObservesCollection(), 'empty `htmlElement`: collection not observed');
        vc1.setHtmlElement(cont_c1);
        assert.ok(vc1.getObservesCollection(), 'non-empty `htmlElement`: collection is observed');
        assert.equal(cont_c1.innerHTML, renderItem(a) + renderItem(b), 'items are properly rendered');
        coll1.moveItem(1, 0);
        assert.equal(cont_c1.innerHTML, renderItem(b) + renderItem(a), 're-render after move');

        renderedItems = [];
        b.setSize('200');
        assert.ok(renderedItems.length === 1 && renderedItems[0] === b, '`updateItemHtml` not set: changed item was re-rendered');
        assert.equal(cont_c1.innerHTML, renderItem(b) + renderItem(a), 'when item changes, content changes');
        
        vc1.updateItemHtml = updateItem;
        renderedItems = [];
        updatedItems = [];
        a.setSize('202400');
        assert.ok(renderedItems.length === 0
                && updatedItems.length === 1
                && updatedItems[0] === a, 
            '`updateItemHtml` is set: changed item was updated, not re-rendered'
        );
        assert.equal(cont_c1.innerHTML, renderItem(b) + renderItem(a), 'when item changes, content changes');
        
        coll1.push(e);
        assert.equal(cont_c1.innerHTML, renderItem(b) + renderItem(a) + renderItem(e), 'push() works');
        
        assert.notOk(vc2.getObservesCollection(), 'empty `collection`: collection not observed');
        vc2.setCollection(coll2);
        assert.notOk(vc2.getObservesCollection(), 'non-empty `collection`, `requiresElement` === true, no `element`: collection still not observed');
        vc2.setRequiresElement(false);
        assert.ok(vc2.getObservesCollection(), 'non-empty `collection`, `requiresElement` is FALSE: collection is observed');
        assert.equal(cont_c2.innerHTML, renderItem(d) + renderItem(c), 'items are rendered');
        
        coll2.accept(e);
        coll2.sort(['name']);
        assert.equal(cont_c2.innerHTML, renderItem(c) + renderItem(d) + renderItem(e), 'items are re-ordered on sort()');
        
        coll2.reject(d);
        assert.equal(cont_c2.innerHTML, renderItem(c) + renderItem(e), 'item is successfully removed');
        
        coll2.accept(new Item({name: 'e.tiff', size: 1}));
        assert.equal(e.getSize(), 1);
        assert.equal(cont_c2.innerHTML, renderItem(c) + renderItem(e), 'item is updated on matching accept');

        var renderItems = function(items) {
            var res = '';
            for (var i = 0; i < items.length; i++) res += renderItem(items[i]);
            return res;
        };
        
        var items = [];
        for (var i = 0; i < 10; i++) items.push(new Item({name: 'item' + i, size: i*10}));
        
        //vc2.debug = true;
        coll2.setItems(items);
        assert.equal(cont_c2.innerHTML, renderItems(items), 'All items replaced and HTML is Ok');
        
        var items1 = [].concat(items);
        items1.splice(3, 5);
        coll2.splice(3, 5);
        assert.equal(cont_c2.innerHTML, renderItems(items1), 'All items replaced and HTML is Ok');
        
        renderedItems = [];
        updatedItems = [];
        coll2.splice(2, 5, items1[3], items1[2]);
        items1.splice(2, 5, items1[3], items1[2]);
        assert.equal(renderedItems.length, 0, 'Splice w/ reinsert: no re-render');
        assert.equal(updatedItems.length, 0, 'Splice w/ reinsert: no update');
        assert.equal(cont_c2.innerHTML, renderItems(items1), 'Splice w/ reinsert: HTML ok');
        
        Amm.cleanup(vc1, vc2);
        
    });
    
    //-----------------------------------------------------------------------

    QUnit.test("View.Html.DisplayParent", function(assert) {
        var fx = jQuery("#qunit-fixture");
        fx.html(
            '<div class="cont_dp"></div>' +
            '<div class="cont_dp2">--- Some Bogus Items ---</div>'
        );
        var nDp = fx.find('.cont_dp');
        
        nDp.append(newNode('a', true));
        nDp.append(newNode('b', true));
        nDp.append(newNode('c', true));
        nDp.append(newNode('d', true));
        
        var nDp2 = fx.find('.cont_dp2');

        var dp = newDp(nDp[0]);
        
        var dp2 = newDp(nDp2[0]);
        
        assert.equal(nDp2.text(), '', 'Display Parent\'s HTML container ' +
            'is cleared upon init when no child items are found');
        
        assert.equal(cnt(dp.displayChildren.getItems()), 'abcd', 'Initial display children from container');
        
        dp2.setDisplayChildren([
            newNode('e'),
            newNode('f'),
            newNode('g'),
            newNode('h')
        ]);
        
        assert.equal(nDp2.text(), 'efgh', 'Nodes are added to HTML element ' +
            'when respective items are added to the collection'
        );

        var items = dp2.displayChildren.getItems();
        dp2.displayChildren.clearItems();
        Amm.cleanup(items);
        
        assert.equal(nDp2.text(), '', 'Nodes are deleted from HTML element ' +
            'when display children collection is cleared'
        );
        
        dp.displayChildren.unshift(newNode('x'));
        dp.displayChildren.splice(2, 0, newNode('y'));
        
        dp.displayChildren.push(newNode('z'));
        assert.equal(nDp.text(), 'xaybcdz', 'Add items dynamically');
        dp.displayChildren[0].setDisplayOrder(3);
        assert.equal(nDp.text(), 'aybxcdz', 'Move forward with setDisplayOrder()');
        dp.displayChildren[5].setDisplayOrder(1);
        assert.equal(nDp.text(), 'adybxcz', 'Move back with setDisplayOrder()');
        dp.displayChildren.sort(['content']);
        assert.equal(nDp.text(), 'abcdxyz', 'sort()');
        dp2.displayChildren.setSortProperties(['content']);
        dp2.displayChildren.setSortReverse(true);
        dp.displayChildren[0].setDisplayParent(dp2);
        dp.displayChildren[0].setDisplayParent(dp2);
        dp.displayChildren[0].setDisplayParent(dp2);
        dp.displayChildren[0].setDisplayParent(dp2);
        assert.equal(nDp.text(), 'xyz', 'Items removed from orig. DP when displayParent() prop changed');
        assert.equal(nDp2.text(), 'dcba', 'Items added to dest. DP when displayParent() prop changed');
        
        dp.displayChildren.setCleanupOnDissociate(true);
        dp2.displayChildren.setCleanupOnDissociate(true);
        Amm.cleanup(dp, dp2);
        
    });
    
    //-----------------------------------------------------------------------

    QUnit.test("View.Html.StaticDisplayParent", function(assert) {
        var fx = jQuery("#qunit-fixture");
        fx.html('\
            <div id="cc">\
                <em>Field #1:</em> <input type="text" id="field1" />\
                <div>\
                    Field #2: <input type="text" id="field2" />\
                </div>\
            </div>\
        ');
        
        /* global Amm */
        var inp1 = new Amm.Element({
            views: [
                {class: Amm.View.Html.Input, htmlElement: jQuery('#field1')[0]},
                {class: Amm.View.Html.Visual, htmlElement: jQuery('#field1')[0]}
            ]
        });
        var inp2 = new Amm.Element({
            views: [
                {class: Amm.View.Html.Input, htmlElement: jQuery('#field2')[0]},
                {class: Amm.View.Html.Visual, htmlElement: jQuery('#field2')[0]}
            ],
            prop__inp1: inp1,
            in__value: "this.inp1.value",
            readOnly: true
        });
        var cont = new Amm.Element({
            extraTraits: ['Amm.Trait.Component'],
            views: [ {
                class: 'Amm.View.Html.StaticDisplayParent',
                htmlElement: jQuery('#cc')[0]
            } ]
        });
        
        assert.ok(inp1.getDisplayParent() === cont);
        assert.ok(inp2.getDisplayParent() === cont);
        assert.ok(inp1.getComponent() === cont);
        assert.ok(inp2.getComponent() === cont);
        assert.equal(inp1.getDisplayOrder(), 0);
        assert.equal(inp2.getDisplayOrder(), 1);
        
        Amm.cleanup(inp1, inp2, cont);
        
    });
    
    QUnit.test("Amm.Trait.Visual.displayOrder", function(assert) {
       
        var dp = new Amm.Element({traits: Amm.Trait.DisplayParent});
        var a = new Amm.Element({traits: Amm.Trait.Visual});
        var b = new Amm.Element({traits: Amm.Trait.Visual});
        var c = new Amm.Element({traits: Amm.Trait.Visual});
        var d = new Amm.Element({traits: Amm.Trait.Visual});
        
        dp.displayChildren.setItems([a, b, c, d]);
        
        assert.deepEqual(Amm.getProperty(dp.displayChildren.getItems(), 'displayOrder'), [0, 1, 2, 3]);
        
        a.setDisplayOrder(10);
        
            assert.equal(a.getDisplayOrder(), 3, "Setting displayOrder beyound max limit results in max displayOrder");
        
        d.setDisplayOrder(-10);
        
        assert.equal(d.getDisplayOrder(), 0, "Setting displayOrder below 0 results in displayOrder == 0");
        
        assert.throws(function() { 
            b.setDisplayOrder("Foobar");
        }, /number/i, "Non-numeric displayOrder => Exception");
        
        c.setDisplayOrder("0");

        assert.equal(c.getDisplayOrder(), 0, "Numeric string displayOrder => ok");
        
        assert.deepEqual(Amm.getProperty(dp.displayChildren.getItems(), 'displayOrder'), [0, 1, 2, 3]);
        
        Amm.cleanup(dp, a, b, c, d);
        
    });
    
    QUnit.test("Amm.View.Html.Collection: updateItemHtml() returns replacement nodes", function(assert) {
        
        var e1 = new Amm.Element({prop__name: 'e1', prop__value: 10});
        var e2 = new Amm.Element({prop__name: 'e2', prop__value: 20});
        var e3 = new Amm.Element({prop__name: 'e3', prop__value: 30});
        
        var c = new Amm.Collection({
            items: [e1, e2, e3], 
            changeEvents: ['nameChange', 'valueChange']
        });
        
        var fx = jQuery('#qunit-fixture');
        
        fx.html('<div />');
        
        var d = fx.find('div');
        
        // replace | refresh | return | enclose | extract
        var mode = 'replace';
        
        var cv = new Amm.View.Html.Collection({
            collection: c,
            createItemHtml: function(item) {
                return '<p><b>' + item.getName() + '</b>: <i>' + item.getValue() + '</i></p>';
            },
            updateItemHtml: function(item, node) {
                if (mode === 'replace') return this.createItemHtml(item);
                jQuery(node).find('b').html(item.getName());
                jQuery(node).find('i').html(item.getValue());
                if (mode === 'enclose') return jQuery(node).wrap('<div></div>').parent('div');
                if (mode === 'extract') {
                    return jQuery(node).find('p')[0];
                }
                //if (mode === 'return') return node;
                return node;
            },
            htmlElement: d
        });
        
        assert.deepEqual(d.html(),
                '<p><b>e1</b>: <i>10</i></p>'
            +   '<p><b>e2</b>: <i>20</i></p>'
            +   '<p><b>e3</b>: <i>30</i></p>'
    
            ,   'Correct initial markup'
        );

        mode = 'refresh';
        
        var oldP = d.find('p')[0];
        
        e1.setName('a1');
        
        assert.deepEqual(d.html(),
                '<p><b>a1</b>: <i>10</i></p>'
            +   '<p><b>e2</b>: <i>20</i></p>'
            +   '<p><b>e3</b>: <i>30</i></p>'
        
            ,   'New markup after item in-place update'
        );

        assert.ok(d.find('p')[0] === oldP, 'Old node still in place');

        mode = 'return';
        
        e1.setName('a2');
        
        assert.deepEqual(d.html(),
                '<p><b>a2</b>: <i>10</i></p>'
            +   '<p><b>e2</b>: <i>20</i></p>'
            +   '<p><b>e3</b>: <i>30</i></p>'
        
            ,   'New markup after item in-place update (with old node returned)'
        );

        assert.ok(d.find('p')[0] === oldP, 'Old node still in place');

        mode = 'replace';
        
        e1.setName('a3');
        
        assert.deepEqual(d.html(),
                '<p><b>a3</b>: <i>10</i></p>'
            +   '<p><b>e2</b>: <i>20</i></p>'
            +   '<p><b>e3</b>: <i>30</i></p>'
        
            ,   'New markup after item replace-update'
        );

        assert.ok(d.find('p')[0] !== oldP, 'Old node not in place anymore');

        mode = 'enclose';
        
        oldP = d.find('p')[0];
        
        e1.setName('a4');
        
        assert.deepEqual(d.html(),
                '<div><p><b>a4</b>: <i>10</i></p></div>'
            +   '<p><b>e2</b>: <i>20</i></p>'
            +   '<p><b>e3</b>: <i>30</i></p>'
        
            ,   'New markup after item enclosed'
        );

        assert.ok(d.find('p')[0] === oldP, 'Old node in place');
        
        mode = 'extract';
        
        e1.setName('a5');
        
        assert.deepEqual(d.html(),
                '<p><b>a5</b>: <i>10</i></p>'
            +   '<p><b>e2</b>: <i>20</i></p>'
            +   '<p><b>e3</b>: <i>30</i></p>'
        
            ,   'New markup after item extracted from enclosing node'
        );

        assert.ok(d.find('p')[0] === oldP, 'Old node in place');
        
        Amm.cleanup(cv);
        
    });
    
}) ();