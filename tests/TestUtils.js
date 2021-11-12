/* global Amm */

var TestUtils = {
    
    round: function(number, decimals) {
        decimals = decimals || 2;
        var base = Math.pow(10, decimals);
        return Math.round(number*base) / base;
    },
    
    runStory: function(assert, story) {
        var stepNo = 0;
        var done = assert.async(story.length);
        var t = TestUtils;
        var invokeStep = function() {
            var step = story[stepNo];
            stepNo++;
            t.runStory.currStepName = step.name || 'Step ' + stepNo;
            var timeoutHandler = function() {
                step.fn();
                if (stepNo < story.length) {
                    invokeStep();
                }
                done();
            };
            var time = step.time;
            if (typeof time === 'function') time = time();
            if (time > 0) {
                window.setTimeout(timeoutHandler, time);
            } else {
                timeoutHandler();
            }
        };
        invokeStep();
    },
    
    findNode: function(element) {
        if (element['Amm.Element']) element = Amm.View.Html.findOuterHtmlElement(element);
        return element;
    },
    
    clientXY: function(element, dx, dy, extra) {
        element = TestUtils.findNode(element);
        var center = TestUtils.center(element, dx, dy, true);
        var res = {clientX: center.left, clientY: center.top};
        if (extra && typeof extra === 'object') Amm.override(res, extra);
        return res;
    },
    
    center: function(element, dx, dy, client) {
        element = TestUtils.findNode(element);
        if (dx === true && dy === undefined && client === undefined) {
            dx = undefined;
            client = true;
        }
        var e = jQuery(element), o = e.offset(), w = e.width(), h = e.height();
        if (dx && Math.abs(dx) < 1) {
            dx *= w;
        }
        if (dy && Math.abs(dy) < 1) {
            dy *= h;
        }
        o.left += w/2 + (dx || 0);
        o.top += h/2 + (dy || 0);
        if (client) return o;
        var doc = document.documentElement, body = doc.body;
        o.top -= doc && doc.scrollTop || body && body.scrollTop || 0;
        o.left -= doc && doc.scrollLeft || body && body.scrollLeft || 0;
        return o;
    },
    
    startDrag: function (element, xPixels, yPixels) {
        element = TestUtils.findNode(element);
        if (xPixels === undefined) xPixels = 10;
        if (yPixels === undefined) yPixels = 10;
        jQuery(element).simulate('mousedown', TestUtils.clientXY(element));
        jQuery(element).simulate('mousemove', TestUtils.clientXY(element, xPixels, yPixels));
    },
    
    drag: function(element, dx, dy) {
        element = TestUtils.findNode(element);
        jQuery(element).simulate('mousemove', TestUtils.clientXY(element, dx, dy));
    },
     
    endDrag: function(element) {
        element = TestUtils.findNode(element);
        jQuery(element).simulate('mouseup', TestUtils.clientXY(element));
    }
    
};