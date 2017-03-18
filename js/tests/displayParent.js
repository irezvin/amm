/* global Amm */

(function() {

    var elements = [];
    var el;
    var node;
    
    newNode = function(content, retHtml) {
        node = jQuery('<div>' + content + '</div>')[0];
        el = new Amm.Element({traits: ['Amm.Trait.Content', 'Amm.Trait.Visual'], visible: true});
        var v = new Amm.View.Html.Visual({element: el, htmlElement: node});
        var vc = new Amm.View.Html.Content({element: el, htmlElement: node});
        elements.push(el);
        return retHtml? node : el;
    };
    
    newDp = function(htmlNode) {
        el = new Amm.Element({
            traits: ['Amm.Trait.DisplayParent']
        });
        var view = new Amm.View.Html.DisplayParent({
            element: el,
            scanForChildren: true,
            scanForDisplayOrder: true,
            htmlElement: htmlNode
        });
        return el;
    };
    
    cnt = function(items) { return Amm.getProperty(items, 'content').join(''); };

    QUnit.module("View.Html.DisplayParent");

    QUnit.test("Basic Html.DisplayParent functions", function(assert) {
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
        
    });
    
}) ();