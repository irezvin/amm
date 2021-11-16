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
    },
    
    key: function(element, name, options) {
        options = options || {};
        do {
            var oldName = name;
            var mod = /^([CSA])-/.exec(name);
            if (mod && mod[1]) {
                if (mod[1] === 'C') options.ctrlKey = true;
                else if (mod[1] === 'S') options.shiftKey = true;
                else if (mod[1] === 'A') options.altKey = true;
                name = name.slice(2);
            }
        } while (name !== oldName);
        if (!TestUtils.codes[name]) throw Error("Unknown key name: '" + name + "'");
        options.keyCode = TestUtils.codes[name];
        options.key = name;
        jQuery(element).simulate("keydown", options);
    }
    
};

TestUtils.keys = {
    "0": "GroupNext",
    "8": "Backspace",
    "9": "Tab",
    "12": "Unidentified",
    "13": "Enter",
    "16": "Shift",
    "17": "Control",
    "18": "Alt",
    "20": "CapsLock",
    "27": "Escape",
    "32": " ",
    "33": "PageUp",
    "34": "PageDown",
    "35": "End",
    "36": "Home",
    "37": "ArrowLeft",
    "38": "ArrowUp",
    "39": "ArrowRight",
    "40": "ArrowDown",
    "45": "Insert",
    "46": "Delete",
    "48": "0",
    "49": "1",
    "50": "2",
    "51": "3",
    "52": "4",
    "53": "5",
    "54": "6",
    "55": "7",
    "56": "8",
    "57": "9",
    "59": ";",
    "61": "=",
    "65": "a",
    "66": "b",
    "67": "c",
    "68": "d",
    "69": "e",
    "70": "f",
    "71": "g",
    "72": "h",
    "73": "i",
    "74": "j",
    "75": "k",
    "76": "l",
    "77": "m",
    "78": "n",
    "79": "o",
    "80": "p",
    "81": "q",
    "82": "r",
    "83": "s",
    "84": "t",
    "85": "u",
    "86": "v",
    "87": "w",
    "88": "x",
    "89": "y",
    "90": "z",
    "91": "OS",
    "93": "ContextMenu",
    "96": "0",
    "97": "1",
    "98": "2",
    "99": "3",
    "100": "4",
    "101": "5",
    "102": "6",
    "103": "7",
    "104": "8",
    "105": "9",
    "106": "*",
    "107": "+",
    "108": ",",
    "109": "-",
    "111": "\/",
    "112": "F1",
    "113": "F2",
    "114": "F3",
    "115": "F4",
    "116": "F5",
    "117": "F6",
    "118": "F7",
    "119": "F8",
    "120": "F9",
    "121": "F10",
    "122": "F11",
    "123": "F12",
    "144": "NumLock",
    "173": "-",
    "188": ",",
    "190": ".",
    "191": "\/",
    "192": "`",
    "219": "[",
    "220": "\\",
    "221": "]",
    "222": "'"
};

TestUtils.codes = {
    "GroupNext": 0,
    "Backspace": 8,
    "Tab": 9,
    "Unidentified": 12,
    "Enter": 13,
    "Shift": 16,
    "Control": 17,
    "Alt": 18,
    "CapsLock": 20,
    "Escape": 27,
    " ": 32,
    "PageUp": 33,
    "PageDown": 34,
    "End": 35,
    "Home": 36,
    "ArrowLeft": 37,
    "ArrowUp": 38,
    "ArrowRight": 39,
    "ArrowDown": 40,
    "Insert": 45,
    "Delete": 46,
    "0": 96,
    "1": 97,
    "2": 98,
    "3": 99,
    "4": 100,
    "5": 101,
    "6": 102,
    "7": 103,
    "8": 104,
    "9": 105,
    ";": 59,
    "=": 61,
    "a": 65,
    "b": 66,
    "c": 67,
    "d": 68,
    "e": 69,
    "f": 70,
    "g": 71,
    "h": 72,
    "i": 73,
    "j": 74,
    "k": 75,
    "l": 76,
    "m": 77,
    "n": 78,
    "o": 79,
    "p": 80,
    "q": 81,
    "r": 82,
    "s": 83,
    "t": 84,
    "u": 85,
    "v": 86,
    "w": 87,
    "x": 88,
    "y": 89,
    "z": 90,
    "OS": 91,
    "ContextMenu": 93,
    "*": 106,
    "+": 107,
    ",": 188,
    "-": 173,
    "\/": 191,
    "F1": 112,
    "F2": 113,
    "F3": 114,
    "F4": 115,
    "F5": 116,
    "F6": 117,
    "F7": 118,
    "F8": 119,
    "F9": 120,
    "F10": 121,
    "F11": 122,
    "F12": 123,
    "NumLock": 144,
    ".": 190,
    "`": 192,
    "[": 219,
    "\\": 220,
    "]": 221,
    "'": 222
};
