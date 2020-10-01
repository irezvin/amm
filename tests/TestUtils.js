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
    }
    
};
