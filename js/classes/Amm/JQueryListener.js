/* global Amm */

Amm.JQueryListener = function(options) {
    Amm.init(this, options);
};

Amm.JQueryListener.prototype = {
    
    // function that handles events
    _handler: null,

    // JQuery result with selected elements that .on() was called on
    _onJQuery: null,

    // JQuery .on args to pass to .off
    _onArgs: null,
    
    // One or several names of element properties - or functions to retreive them - to extract from element (this._onJQuery)
    // Also works: jQuery.fn[:arg], i.e. jQuery.val, jQuery.prop:checked, jQuery.is::visible
    // Hash allows to re-map arguments passed to the element (numeric keys should be used)
    elementPass: null,
    
    // One or several names of event properties - or functions to retreive them - to extract from element
    // Hash allows to re-map arguments passed to the element (numeric keys should be used)
    eventPass: null,
    
    // One or several names of events
    _eventName: null,
    
    // Selector to select events' source (within _htmlRoot)
    _selector: null,
    
    // 'Delegate selector' to pass 'selector' arg to jQuery.on() function
    _delegateSelector: null,
    
    // Selector to locate _selector elements within using jQuery.find() - may be handy 
    // (i.e. _htmlRoot points to the container, and _selector specifies only 'input[type=text]' (relative to that container)
    _htmlRoot: null,
    
    setEventName: function(eventName) {
        if ((o = this._eventName) === eventName) return;
        this._eventName = eventName;
        this._bind();
    },
    
    getEventName: function() { return this._eventName; },
    
    setSelector: function(selector) {
        if ((o = this._selector) === selector) return;
        this._selector = selector;
        this._bind();
    },
    
    getSelector: function() { return this._selector; },
    
    setDelegateSelector: function(delegateSelector) {
        if ((o = this._delegateSelector) === delegateSelector) return;
        this._delegateSelector = delegateSelector;
        this._bind();
    },
    
    getDelegateSelector: function() { return this._delegateSelector; },
    
    setHtmlRoot: function(htmlRoot) {
        if ((o = this._htmlRoot) === htmlRoot) return;
        this._htmlRoot = htmlRoot;
        this._bind();
    },
    
    getHtmlRoot: function() { return this._htmlRoot; },
    
    _bind: function() {
        // un-bind old
        if (this._onJQuery) {
            this._onJQuery.off.apply(this._onJQuery, this._onArgs);
            this._onJQuery = null;
            this._onArgs = null;
        }
        // bind new
        if (this._selector && this._eventName && this._handler) {
            this._onArgs = [this._handler];
            if (this._delegateSelector) this._onArgs.unshift(this._delegateSelector);
            this._onArgs.unshift(this._eventName);
            this._onJQuery = this._htmlRoot? jQuery(this._htmlRoot).find(this._selector) : jQuery(this._selector);
            this._onJQuery.on.apply(this._onJQuery, this._onArgs);
        }
    },
    
    cleanup: function() {
        this._handler = null;
        this._bind();
    },

    setHandler: function(handler) {
        var oldHandler = this._handler;
        if (oldHandler === handler) return;
        this._handler = handler;
        this._bind();
        return true;
    },

    getHandler: function() { return this._handler; }
    
};