/* global Amm */
/* global QUnit */
/* global TestUtils */

(function() {

    QUnit.module("Drag and Drop");
    
    var evLog = [];
    
    var logEvent = function() {
        evLog.push([Amm.event.origin.getId(), Amm.event.name].concat(Array.prototype.slice.call(arguments)));
    };
    
    var findEvent = function(name, objectId, returnAll, start) {        
        var res = [];        
        for (var i = start || 0, l = evLog.length; i < l; i++) {
            var entry = evLog[i];
            if (objectId !== undefined && entry[0] !== objectId) continue;
            if (name !== undefined && entry[1] !== name) continue;
            res.push(entry);
        }
        if (returnAll) return res;
        if (res.length === 1) return res[0]; 
        if (res.length > 1) {
            throw "More than one event with name '" + name + "' registered in the log";                
        }
        return null;
    };
    
    var center = TestUtils.center;
        
    QUnit.test("Amm.Drag - Basic", function(assert) {
        
        // we need to have visible element inside the viewport to have elementsFromPoint work properly
        var fx = jQuery('<div data-note="Amm.Drag - Basic" style="position: fixed; left: 0px; top: 0px; height: 1000px; width: 300px; z-index: 9999;"></div>');
        fx.appendTo(document.body);
       
        fx.html( ''
            +   '<style type="text/css">\n'
            +   '   .draggable, .handle, .droppable, .target {min-width: 10px; min-height: 10px; margin: 10px; padding: 10px; display: inline-block}\n'
            +   '</style>\n'
            +   '<div class="draggable" data-amm-v="v.Drag.Source" data-amm-id="ds1" id="ds1">\n'
            +   '   <div id="handle1" class="handle" style="cursor: grabbing"></div>\n'
            +   '   <div id="handle2" class="handle"></div>\n'
            +   '</div>\n'
            +   '<div class="droppable" data-amm-v="v.Drag.Target" data-amm-id="dt1" id="dt1">\n'
            +   '   <div id="t1" class="target"><div id="dt1-t1-sub" class="target"></div></div>\n'
            +   '   <div id="t2" class="target"></div>\n'
            +   '</div>\n'
            +   '<div class="droppable" id="non-element">\n'
            +   '   <div id="t3" class="target"></div>\n'
            +   '   <div id="t4" class="target"></div>\n'
            +   '</div>\n'
            +   '<div class="droppable" data-amm-v="v.Drag.Target" data-amm-id="dt2" id="dt2">\n'
            +   '   <div id="t5" class="target"></div>\n'
            +   '   <div id="t6" class="target"></div>\n'
            +   '</div>\n'
        );
       
        var b = new Amm.Builder(fx, {topLevelComponent: 'root'});
        var elements = b.build();
        var ds1 = Amm.r.e.ds1;
        
        Amm.subUnsub(ds1, null, null, ['dragStart', 'dragVectorChange', 'dragNativeItemChange', 'sourceTargetNativeItemChange', 'dragTargetChange', 'dragEnd'], 
            logEvent);
        
        var oldCursor = jQuery(document.body).css('cursor');
        
            assert.ok(Amm.is(ds1, 'DragSource'), 'Amm.View.Html.Drag.Source provides proper default trait (Amm.Trait.Drag.Source)');
        
        var dc = Amm.Drag.Controller.getInstance();
        var dcv = dc.getUniqueSubscribers('Amm.View.Html.Drag.Controller')[0];
        var o;
        o = center('#handle1', true);
        
        fx.find('#handle1').simulate('mousedown', {clientX: o.left, clientY: o.top}).simulate('mousemove', {clientX: o.left + 5, clientY: o.top + 5});
        
            assert.equal(dcv.getState(), Amm.View.Html.Drag.Controller.STATE.INTENT, 'Drag not started during small movement, but drag intent state is registered');
            assert.notOk(ds1.getDragSession(), 'Drag session not provided to drag source while drag not started yet');
        
        fx.find('#handle1').simulate('mousemove', {clientX: o.left + 10, clientY: o.top + 10});
        
            assert.equal(dcv.getState(), Amm.View.Html.Drag.Controller.STATE.DRAG, 'Drag IS started during additional movement');
            
            assert.ok(ds1.getDragSession(), 'Drag session is provided to drag source');
            assert.equal(jQuery(document.body).css('cursor'), 'grabbing', 'Cursor of document is changed during drag');
            assert.equal(fx.find('#ds1').css('pointer-events'), 'none', 'Pointer-events of drag source container element is set to "none"');                        
            
            assert.ok(dc.getSession().getStartNativeItem() === fx.find('#handle1')[0], 'startNativeItem is element that is dragged');
            
            assert.ok(findEvent('dragStart'), 'drag start: dragSource: dragStart event triggered');
            assert.ok(findEvent('dragNativeItemChange'), 'drag start: dragSource: dragNativeItemChange event triggered');
        
        evLog = [];            
        o = center('#t1', true);        
        fx.find('#t1').simulate('mousemove', {clientX: o.left, clientY: o.top});
        
            assert.ok(ds1.getDragSession().getTarget() === Amm.r.e.dt1, 'Proper drag target assigned to the session');
            
            assert.ok(ds1.getDragSession().getTargetNativeItem() === fx.find('#dt1-t1-sub')[0], 'Proper drag target HTML element assigned to the session');
                //console.log(ds1.getDragSession().getTargetNativeItem());
            assert.ok(Amm.r.e.dt1.getDragSource() === Amm.r.e.ds1, 'Drag target receives instance of current drag source');
            assert.ok(Amm.r.e.dt1.getTargetNativeItem() === fx.find('#dt1-t1-sub')[0], 'Drag target receives instance of current target HTML element');
            
            assert.equal(evLog.length, 4, 'Only 4 events logged');
            assert.ok(findEvent('dragNativeItemChange'), 'drag: dragSource: dragNativeItemChange event triggered');
            assert.ok(findEvent('dragVectorChange'), 'drag: dragSource: dragVectorChange event triggered');
            assert.ok(findEvent('dragTargetChange'), 'drag: dragSource: dragTargetChange event triggered');
            assert.ok(findEvent('sourceTargetNativeItemChange'), 'drag: dragSource: targetNativeItemChange event triggered');
            
            
        evLog = [];
        o = center('#t2', true);
        fx.find('#t2').simulate('mousemove', {clientX: o.left, clientY: o.top});            
            
            assert.ok(ds1.getDragSession().getTarget() === Amm.r.e.dt1, 'Alternative target item: drag source is same');
            assert.ok(ds1.getDragSession().getTargetNativeItem() === fx.find('#t2')[0], 'Alternative target item: target item is different');
            assert.ok(Amm.r.e.dt1.getTargetNativeItem() === fx.find('#t2')[0], 'Alternative target item: drag target receives instance of different target HTML element');
            
            assert.equal(evLog.length, 3, 'Only 3 events logged');
            assert.ok(findEvent('dragNativeItemChange'), 'drag: dragSource: dragNativeItemChange event triggered');
            assert.ok(findEvent('dragVectorChange'), 'drag: dragSource: dragVectorChange event triggered');
            assert.ok(findEvent('sourceTargetNativeItemChange'), 'drag: dragSource: sourceTargetNativeItemChange event triggered');
            
            
        o = center('#t5', true);
        fx.find('#t5').simulate('mousemove', {clientX: o.left, clientY: o.top});            
            
            assert.ok(ds1.getDragSession().getTarget() === Amm.r.e.dt2, 'New drag target');
            assert.ok(ds1.getDragSession().getTargetNativeItem() === fx.find('#t5')[0], 'New drag target native item');
            assert.ok(Amm.r.e.dt2.getDragSource() === ds1, 'New drag target receives instance of target HTML element');
            assert.ok(Amm.r.e.dt2.getTargetNativeItem() === fx.find('#t5')[0], 'Drag target receives instance of target HTML element');
        
            assert.notOk(Amm.r.e.dt1.getDragSource(), 'Drag target changed: old target no more has instance of current drag source');
            assert.notOk(Amm.r.e.dt1.getTargetNativeItem(), 'Drag target changed: old target no more receives instance of current target HTML element');            
        
        evLog = [];
        fx.find('#t5').simulate('mousemove', {clientX: o.left, clientY: o.top});
            
            assert.equal(evLog.length, 0, 'Drag mouse move, position unchanged: no events logged');
        
        evLog = [];
        fx.find('#t5').simulate('mousemove', {clientX: o.left + 3, clientY: o.top - 2});
        
            assert.equal(evLog.length, 1, 'Drag mouse move: only 1 event logged');
            assert.ok(findEvent('dragVectorChange'), 'Drag mouse move: dragVectorChange logged');
            assert.equal(ds1.getDragSession().getDelta().dX, 3, 'Drag mouse move: session.getDelta() dX is proper');
            assert.equal(ds1.getDragSession().getDelta().dY, -2, 'Drag mouse move: session.getDelta() dY is proper');
        
        evLog = [];
        fx.find('#handle1').simulate('mouseup');
            
            assert.notOk(ds1.getDragSession(), 'Drag is finished on mouseup');
            assert.equal(dcv.getState(), Amm.View.Html.Drag.Controller.STATE.IDLE, 'Drag ended after movement');
            assert.equal(jQuery(document.body).css('cursor'), oldCursor, 'Cursor of document is changed back during drag');
            assert.equal(fx.find('#ds1').css('pointer-events'), 'auto', 'Pointer-events of dragging element is restored');
            
            assert.equal(evLog.length, 4, 'Only 4 events logged');
            assert.ok(findEvent('dragEnd'), 'drag end: dragSource: dragEnd event triggered');
            assert.ok(findEvent('dragNativeItemChange'), 'drag end: dragSource: dragNativeItemChange event triggered');
            assert.ok(findEvent('sourceTargetNativeItemChange'), 'drag end: dragSource: sourceTargetNativeItemChange event triggered');
            assert.ok(findEvent('dragTargetChange'), 'drag end: dragSource: dragTargetChange event triggered');
            evLog = [];
            
        Amm.cleanup(elements);
        Amm.cleanup(dc);                
        fx.remove();
        
    });    
        
    QUnit.test("Amm.Drag - Drag Vector Constraints", function(assert) {
        
        var dv = new Amm.Drag.Vector({x0: 10, y0: 10, x1: 20, y1: 20});
        var sess = new Amm.Drag.Session({vector: dv});
        var x1max15 = new Amm.Drag.Constraint.MinMax({prop: 'x1', max: 15});
        var y1min25 = new Amm.Drag.Constraint.MinMax({prop: 'y1', min: 25});
        
        sess.setConstraints([x1max15]);
            assert.deepEqual(sess.getVector().x1, 15, 'Constraint applied');
            
        sess.setConstraints([x1max15, y1min25]);
            assert.deepEqual(sess.getVector().y1, 25, 'Second constraint applied');
            
        sess.setVector(new Amm.Drag.Vector({x0: 12, y0: 12, x1: 95, y1: 0}));
            assert.deepEqual(sess.getVector().x0, 12, 'New vector applied (1)');
            assert.deepEqual(sess.getVector().y0, 12, 'New vector applied (2)');
            assert.deepEqual(sess.getVector().x1, 15, 'Constraints applied to new vector (1)');
            assert.deepEqual(sess.getVector().y1, 25, 'Constraints applied to new vector (2)');
        
        sess.setDelta(new Amm.Drag.Vector({dX: 10, dY: 10}));
            assert.deepEqual(sess.getVector().x0, 12, 'Delta applied to new vector (1)');
            assert.deepEqual(sess.getVector().y0, 12, 'Delta applied to new vector (2)');
            assert.deepEqual(sess.getVector().x1, 15, 'Constraint applied to new vector on delta (1)');
            assert.deepEqual(sess.getVector().y1, 25 + 10, 'Constraint applied to new vector on delta (2)');
            
        sess.setDeltaConstraints([new Amm.Drag.Constraint.MinMax({prop: 'dY', min: 0, max: 0})]);
        sess.setDelta(new Amm.Drag.Vector({dX: -5, dY: 10}));
            assert.deepEqual(sess.getDelta().dY, 0, 'Constraint applied to delta');
            assert.deepEqual(sess.getVector().x0, 12, 'Delta: x0 not changed');
            assert.deepEqual(sess.getVector().y0, 12, 'Delta: x1 not changed');
            assert.deepEqual(sess.getVector().x1, 15 - 5, 'Delta: x1 changed');
            assert.deepEqual(sess.getVector().y1, 35, 'Delta: y1 not changed since dY is 0 by constraint requrement');
        
    });
    
        
    QUnit.test("Amm.Drag - Item Drag", function(assert) {

        var fx;
        
        try {
       
        var center = TestUtils.center, 
            clientXY = TestUtils.clientXY, 
            startDrag = TestUtils.startDrag,
            drag = TestUtils.drag,
            endDrag = TestUtils.endDrag;

        var itemElement = function(id, items, build) {
            var elItems = [];
            if (items) {
                for (var i = 0, l = items.length; i < l; i++) {
                    elItems.push(new Amm.Element({prop__caption: items[i]}));
                }
            }
            var res = Amm.dom({
                $: 'div',
                class: 'itemsContainer',
                id: id,
                data_amm_id: id,
                data_amm_e: {
                    extraTraits: ['t.Repeater', 't.DisplayParent'],
                    assocProperty: 'src', 
                    withVariantsView: false, 
                    intents: 'before,after,container',
                    items: elItems,
                },
                data_amm_v: 'v.Visual',
                $$: [
                    {
                        $: 'div',
                        data_amm_id: '__parent',
                        data_amm_v: [
                            'v.DisplayParent',
                            {
                                class: 'v.Drag.ItemSource',
                                itemElementRequirements: ['Visual', 'getSrc'],
                                itemElementAssocProperty: 'src',
                                defaultCollection: 'items',
                                containerSelector: '.itemsContainer',
                            },
                            {
                                class: 'v.Drag.ItemTarget',
                                itemElementRequirements: ['Visual', 'getSrc'],
                                itemElementAssocProperty: 'src',
                                defaultCollection: 'items',
                                containerSelector: '.itemsContainer',
                            }
                        ],
                    },
                    {
                        $: 'div',
                        data_amm_x: "Amm.View.Html.Variants.build",
                        data_amm_id: '__parent',
                        style: "display: none",
                        $$: {
                            $: 'div',
                            data_amm_dont_build: true,
                            data_amm_default: true,
                            data_amm_e: {prop__src: null}, 
                            data_amm_v: [
                                'v.Visual', 
                                {
                                    class: 'v.Expressions',
                                    map: { 'h2:::_html': 'this.src.caption' }
                                }
                            ],
                            $$: { $: 'h2' }
                        }
                    }
                ],
            });
            if (build) return new Amm.Element(res);
            return res;
        };
        
        var css = function(assoc) {
            var res = '';
            for (var i in assoc) if (assoc.hasOwnProperty(i)) {
                res += "\n" + i + " {\n";
                for (var j in assoc[i]) if (assoc[i].hasOwnProperty(j)) {
                    j = j.replace(/_/g, '-');
                    res += "    " + j + ": " + assoc[i][j] + ";" + "\n";
                }
                res += "}\n";
            }
            return res;
        };
        
        fx = jQuery('<div data-note="Amm.Drag - Item Drag" style="position: fixed; left: 0px; top: 0px; height: 1000px; width: 1000px; z-index: 9999;"></div>');
        fx.appendTo(document.body);
       
        fx.html( ''
            +   '<style type="text/css">'
            +   css({
                
                    '.dragItemShadow': {
                        position: 'absolute',
                        z_index: '9999',
                        background_color: 'rgba(255,255,255,0.5)',
                        pointer_events: 'none',
                    },

                    '.dragItemFloating': {
                        position: 'absolute',
                        z_index: '9999',
                        pointer_events: 'none',
                        opacity: '0.8',
                    },

                    '.dragItemShadowClone.dragItemStaticShadow': {
                        opacity: '0.2',
                    },

                    '.itemsContainer': {
                        vertical_align: 'top', 
                        display: 'inline-block', 
                        border: '1px solid silver', 
                        padding: '1em', 
                        margin: '.5em',
                        max_width: '150px',
                    },

                    '.itemsContainer > div > div': {
                        overflow: 'auto',
                    },

                    '.reoderStaticDragShadow, .dragItemStaticShadow:not(.dragItemShadowClone)': {
                        border: '1px solid lightgray',
                        background_color: 'darkgrey',
                    },

                    '.dragItemIntent_before': {
                        border_top: '2px solid lightblue',
                        margin_top: '-2px',
                    },

                    '.dragItemIntent_after': {
                        border_bottom: '2px solid lightblue',
                        margin_bottom: '-2px',
                    },

                    '.dragItemIntent_over': {
                        border: '1px solid lightblue',
                        margin: '-1px',
                    },

                    '.dragItemIntent_container': {
                        border: '2px solid lightblue',
                    },
                
                })
            +   '</style>\n' );
    
        var rpt1 = itemElement('rpt1', ['A', 'B', 'C', 'D', 'E'], true);
        
        var rpt2 = itemElement('rpt2', ['F', 'G', 'H', 'I', 'K'], true);
        
        window.d.itemElement = itemElement;
        window.d.rpt1 = rpt1;
        window.d.rpt2 = rpt2;
        
        var con = Amm.Drag.Controller.getInstance();
        
        fx.append(Amm.View.Html.findOuterHtmlElement(rpt1));
        fx.append(Amm.View.Html.findOuterHtmlElement(rpt2));
        
        var itemCNode = Amm.View.Html.findOuterHtmlElement(rpt1.displayChildren[2]);
        var itemBNode = Amm.View.Html.findOuterHtmlElement(rpt1.displayChildren[1]);
        var itemDNode = Amm.View.Html.findOuterHtmlElement(rpt1.displayChildren[3]);
        var rpt1Node = Amm.View.Html.findOuterHtmlElement(rpt1);
        var rpt2Node = Amm.View.Html.findOuterHtmlElement(rpt2);
        var itemGNode = Amm.View.Html.findOuterHtmlElement(rpt2.displayChildren[1]);
            
        var sourceView = rpt1.findView(null, 'Amm.View.Html.Drag.ItemSource');
        var targetView1 = rpt1.findView(null, 'Amm.View.Html.Drag.ItemTarget');
        var targetView2 = rpt2.findView(null, 'Amm.View.Html.Drag.ItemTarget');
        
        
        var oldCoords = clientXY(itemCNode);
        
        startDrag(rpt1.displayChildren[2]);
        drag(rpt1.displayChildren[2], 10, 10);
        
        assert.ok(con.getSession(), 'Session started');
        
        var extra = con.getSession().getExtra('Amm.Drag.Extra.ItemDrag');
       
            assert.ok(extra,
                'Start drag of list item: session was initialized and received proper extra');
        
            assert.ok(extra.getItem() === rpt1.getItems()[2], 
                'extra: item');
                
            assert.ok(extra.getCollection() === rpt1.getItems(), 
                'extra: collection');
                
            assert.ok(extra.getItemNativeElement() === itemCNode, 
                'extra: itemNativeElement');
                
            assert.ok(extra.getContainerNativeElement() === rpt1Node, 
                'extra: containerNativeElement');
            
            assert.notOk(extra.getIntent(), 'extra: initially there\'s no drag intent');
            
            assert.ok(jQuery(itemCNode).hasClass(sourceView.draggingClass),
                'Dragging item node has view.draggingClass');
                
        var coords = clientXY(itemCNode);
                
            assert.ok(oldCoords.clientX !== coords.clientX && oldCoords.clientY !== coords.clientY,
                'Dragging item node was moved');
                
        drag(rpt1.displayChildren[1], 0, 0);
        
            assert.ok(extra.getTargetItem() === rpt1.getItems()[1], 
                'drag before: extra: target item');
                
            assert.ok(extra.getTargetCollection() === rpt1.getItems(), 
                'drag before: extra: target collection');
                
            assert.ok(extra.getTargetItemNativeElement() === itemBNode, 
                'drag before: extra: targetItemNativeElement');
            
            assert.equal(extra.getIntent(), Amm.Drag.Extra.ItemDrag.INTENT.BEFORE,
                'drag before: drag over next item: drag intent after');
                
            assert.ok(extra.getTargetContainerNativeElement() === rpt1Node, 
                'drag before: extra: targetContainerNativeElement');
                
            assert.ok(jQuery(itemBNode).hasClass(targetView1.intentClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.BEFORE),
                'drag before: target node has propert intent class');
                
            assert.ok(jQuery(rpt1Node).hasClass(targetView1.elementIntentInsideClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.BEFORE),
                'drag before: target node\' container has proper intentInside class');
                
                
        drag(rpt1.displayChildren[3], 0, 0);
        
            assert.ok(extra.getTargetItem() === rpt1.getItems()[3], 
                'drag after: extra: target item');
                
            assert.ok(extra.getTargetCollection() === rpt1.getItems(), 
                'drag after: extra: target collection');
                
            assert.ok(extra.getTargetItemNativeElement() === itemDNode, 
                'drag after: extra: targetItemNativeElement');
            
            assert.equal(extra.getIntent(), Amm.Drag.Extra.ItemDrag.INTENT.AFTER,
                'drag after: drag over next item: drag intent after');
                
            assert.ok(extra.getTargetContainerNativeElement() === rpt1Node, 
                'drag after: extra: targetContainerNativeElement');
                
            assert.notOk(jQuery(itemBNode).hasClass(targetView1.intentClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.BEFORE),
                'drag after: prev target node has no old intent class anymore');
                
            assert.notOk(jQuery(rpt1Node).hasClass(targetView1.elementIntentInsideClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.BEFORE),
                'drag after: target node\' container has no old intentInside class anymore');
                
            assert.ok(jQuery(itemDNode).hasClass(targetView1.intentClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.AFTER),
                'drag after: target node has proper intent class');
                
            assert.ok(jQuery(rpt1Node).hasClass(targetView1.elementIntentInsideClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.AFTER),
                'drag after: target node\' container has proper intentInside class');
             
        drag(rpt1Node);
        
            assert.ok(extra.getTargetItem() === null, 
                'drag to container: extra: target item');
                
            assert.ok(extra.getTargetCollection() === rpt1.getItems(), 
                'drag to container: extra: target collection');
                
            assert.ok(extra.getTargetItemNativeElement() === null, 
                'drag to container: extra: targetItemNativeElement');
            
            assert.equal(extra.getIntent(), Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER,
                'drag to container: drag intent container');
                
            assert.ok(extra.getTargetContainerNativeElement() === rpt1Node, 
                'drag to container: extra: targetContainerNativeElement');
                
            assert.notOk(jQuery(itemDNode).hasClass(targetView1.intentClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.AFTER),
                'drag to container: prev target node has no old intent class anymore');
                
            assert.notOk(jQuery(rpt1Node).hasClass(targetView1.elementIntentInsideClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.AFTER),
                'drag to container: target node\' container has no old intentInside class anymore');
                
            assert.ok(jQuery(rpt1Node).hasClass(targetView1.intentClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER),
                'drag to container: target node\' container has proper intent class');
                
        drag(itemGNode, 0, -0.05);
        
            assert.ok(extra.getTargetItem() === rpt2.getItems()[1], 
                'drag to item in other container: extra: target item');
                
            assert.ok(extra.getTargetCollection() === rpt2.getItems(), 
                'drag to item in other container: extra: target collection');
                
            assert.ok(extra.getTargetItemNativeElement() === itemGNode, 
                'drag to item in other container: extra: targetItemNativeElement');
            
            assert.equal(extra.getIntent(), Amm.Drag.Extra.ItemDrag.INTENT.BEFORE,
                'drag to item in other container: drag intent before');
                
            assert.ok(extra.getTargetContainerNativeElement() === rpt2Node, 
                'drag to item in other container: extra: targetContainerNativeElement');
            
            assert.notOk(jQuery(rpt1Node).hasClass(targetView1.intentClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.CONTAINER),
                'drag to item in other container: old target node\' container has no old intent class anymore');
                
            assert.ok(jQuery(rpt2Node).hasClass(targetView2.elementIntentInsideClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.BEFORE),
                'drag to item in other container: new target node\' container has proper intentInside class');
                
        drag(itemGNode, 0, 0.05);
            
            assert.equal(extra.getIntent(), Amm.Drag.Extra.ItemDrag.INTENT.AFTER,
                'drag to item in other container: drag over next item but below the axis: drag intent after');

            assert.notOk(jQuery(rpt2Node).hasClass(targetView2.elementIntentInsideClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.BEFORE),
                'drag to item in other container: new target node\' container doesn\'t have old intentInside class anymore');
            
            assert.ok(jQuery(rpt2Node).hasClass(targetView2.elementIntentInsideClassPrefix + Amm.Drag.Extra.ItemDrag.INTENT.AFTER),
                'drag to item in other container: new target node\' container has proper intentInside class');
                
        // lets drop
        
        endDrag(itemGNode);
        
            assert.deepEqual(Amm.getProperty(rpt1.getItems().getItems(), 'caption'), ['A', 'B', 'D', 'E'],
                'Drop: item was removed from source collection');
        
            assert.deepEqual(Amm.getProperty(rpt2.getItems().getItems(), 'caption'), ['F', 'G', 'C', 'H', 'I', 'K'],
                'Drop: item was addd to target collection according to intent');
                
            assert.equal(fx.find('*[class *= ntent]').length, 0, 
                'Drop: no elements with drag intent classes left');
                
        Amm.cleanup(rpt1, rpt2);
        
        } finally {
            
            fx.remove();
        
        }
        
    });
    
    
    
}) (); 
