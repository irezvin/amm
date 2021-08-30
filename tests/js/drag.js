/* global Amm */
/* global QUnit */

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
    
    var center = function(element, dx, dy, client) {
        if (dx === true && dy === undefined && client === undefined) {
            dx = undefined;
            client = true;
        }
        var e = jQuery(element), o = e.offset(), w = e.width(), h = e.height();
        if (dx && Math.abs(dx) < 1) dx *= e.w;
        if (dy && Math.abs(dy) < 1) dy *= e.h;
        o.left += w/2 + (dx || 0);
        o.top += h/2 + (dy || 0);
        if (client) return o;
        var doc = document.documentElement, body = doc.body;
        o.top -= doc && doc.scrollTop || body && body.scrollTop || 0;
        o.left -= doc && doc.scrollLeft || body && body.scrollLeft || 0;
        return o;
    };
        
    QUnit.test("Amm.Drag - Basic", function(assert) {
        
        var fx = jQuery("#qunit-fixture");
       
        fx.html( ''
            +   '<style type="text/css">\n'
            +   '   .draggable, .handle, .droppable, .target {min-width: 10px; min-height: 10px; margin: 10px; padding: 10px; display: inline-block}\n'
            +   '</style>\n'
            +   '<div class="draggable" data-amm-v="Amm.View.Html.Drag.Source" data-amm-id="ds1" id="ds1">\n'
            +   '   <div id="handle1" class="handle" style="cursor: grabbing"></div>\n'
            +   '   <div id="handle2" class="handle"></div>\n'
            +   '</div>\n'
            +   '<div class="droppable" data-amm-v="Amm.View.Html.Drag.Target" data-amm-id="dt1" id="dt1">\n'
            +   '   <div id="t1" class="target"><div id="dt1-t1-sub" class="target"></div></div>\n'
            +   '   <div id="t2" class="target"></div>\n'
            +   '</div>\n'
            +   '<div class="droppable" id="non-element">\n'
            +   '   <div id="t3" class="target"></div>\n'
            +   '   <div id="t4" class="target"></div>\n'
            +   '</div>\n'
            +   '<div class="droppable" data-amm-v="Amm.View.Html.Drag.Target" data-amm-id="dt2" id="dt2">\n'
            +   '   <div id="t5" class="target"></div>\n'
            +   '   <div id="t6" class="target"></div>\n'
            +   '</div>\n'
        );
       
        var b = new Amm.Builder(fx, {topLevelComponent: 'root'});
        var elements = b.build();
        var ds1 = Amm.r.e.ds1;
        
        Amm.subUnsub(ds1, null, null, ['dragStart', 'dragVectorChange', 'dragNativeItemChange', 'targetNativeItemChange', 'dragTargetChange', 'dragEnd'], 
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
            assert.ok(ds1.getDragSession().getTargetNativeItem() === fx.find('#t1')[0], 'Proper drag target HTML element assigned to the session');
            assert.ok(Amm.r.e.dt1.getDragSource() === Amm.r.e.ds1, 'Drag target receives instance of current drag source');
            assert.ok(Amm.r.e.dt1.getTargetNativeItem() === fx.find('#t1')[0], 'Drag target receives instance of current target HTML element');
            
            assert.equal(evLog.length, 4, 'Only 4 events logged');
            assert.ok(findEvent('dragNativeItemChange'), 'drag: dragSource: dragNativeItemChange event triggered');
            assert.ok(findEvent('dragVectorChange'), 'drag: dragSource: dragVectorChange event triggered');
            assert.ok(findEvent('dragTargetChange'), 'drag: dragSource: dragTargetChange event triggered');
            assert.ok(findEvent('targetNativeItemChange'), 'drag: dragSource: targetNativeItemChange event triggered');
            
            
        evLog = [];
        o = center('#t2', true);
        fx.find('#t2').simulate('mousemove', {clientX: o.left, clientY: o.top});            
            
            assert.ok(ds1.getDragSession().getTarget() === Amm.r.e.dt1, 'Alternative target item: drag source is same');
            assert.ok(ds1.getDragSession().getTargetNativeItem() === fx.find('#t2')[0], 'Alternative target item: target item is different');
            assert.ok(Amm.r.e.dt1.getTargetNativeItem() === fx.find('#t2')[0], 'Alternative target item: drag target receives instance of different target HTML element');
            
            assert.equal(evLog.length, 3, 'Only 3 events logged');
            assert.ok(findEvent('dragNativeItemChange'), 'drag: dragSource: dragNativeItemChange event triggered');
            assert.ok(findEvent('dragVectorChange'), 'drag: dragSource: dragVectorChange event triggered');
            assert.ok(findEvent('targetNativeItemChange'), 'drag: dragSource: targetNativeItemChange event triggered');
            
            
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
            assert.ok(findEvent('targetNativeItemChange'), 'drag end: dragSource: targetNativeItemChange event triggered');
            assert.ok(findEvent('dragTargetChange'), 'drag end: dragSource: dragTargetChange event triggered');
            evLog = [];
            
        Amm.cleanup(elements);
        Amm.cleanup(dc);                
        
    });    
    
    
}) (); 
