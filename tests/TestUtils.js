var TestUtils = {
    
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
    
    center: function(element, dx, dy, client) {
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
    },
    
};
