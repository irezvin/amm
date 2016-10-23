/* global Amm */

Amm.Emitter.JQuery = function(options) {
    this._receiveEventProxy = jQuery.proxy(this._receiveEvent, this);
    Amm.Emitter.call(this, options);
};

Amm.Emitter.JQuery.prototype = {
    
    // proxy function that handles events using this() scope
    _receiveEventProxy: null,

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
        if (this._selector && this._eventName) { // not less
            this._onArgs = [this._receiveEventProxy];
            if (this._delegateSelector) this._onArgs.unshift(this._delegateSelector);
            this._onArgs.unshift(this._eventName);
            this._onJQuery = this._htmlRoot? jQuery(this._htmlRoot).find(this._selector) : jQuery(this._selector);
            this._onJQuery.on.apply(this._onJQuery, this._onArgs);
        }
    },
    
    // By default, values extracted from elementPass values are sent first, then ones from eventPass
    _receiveEvent: function(event) {
        var elementArgs, eventArgs, args = [];
        if (this.elementPass) {
            elementArgs = this.extractPassData(this._onJQuery, this.elementPass);
            if (!(elementArgs instanceof Array)) elementArgs = [elementArgs];
            for (var i in elementArgs) if (elementArgs.hasOwnProperty(i)) args[i] = elementArgs[i];
        }
        if (this.eventPass) {
            eventArgs = this.extractPassData(event, this.eventPass);
            if (!(eventArgs instanceof Array)) eventArgs = [eventArgs];
            for (var i in eventArgs) if (eventArgs.hasOwnProperty(i)) {
                if (i in args) {
                    args[i] = eventArgs[i];
                } else {
                    args.push(eventArgs[i]);
                }
            }
        }
        this.emit.apply(this, args);
    },
    
    cleanup: function() {
        if (this._onJquery) this._off();
        this._receiveEventProxy = null;
        Amm.Emitter.prototype.cleanup.call(this);
    },
    
    _extractJq: function(src, spec) {
        var fnArg = /(^[^:]+)(:(.*$))?/.exec(spec), fn, arg, res;
        if (fnArg) fn = fnArg[0] || src, arg = fnArg[1];
        res = (jQuery(src)[fn])(arg);
        return res;
    },
    
    _extractPath: function(src, spec) {
        var res = src, path = spec.split('.');
        while (path.length && res !== undefined && res !== null) {
            res = res[path.shift()];
        }
        return res;
    },
    
    extractPassData: function(src, passInfo) {
        var res;
        if (typeof passInfo === 'string') { // extract the property
            var useJq = passInfo.substr(0, 7) === 'jQuery.';
            if (useJq) res = this._extractJq(src, passInfo.substr(7));
                else res = this._extractPath(src, passInfo);
        } else if (typeof passInfo === 'function') { // apply the callback
            res = passInfo.call(this, src);
        } else if (typeof passInfo === 'object') {
            res = {};
            for (var i in passInfo) if (passInfo.hasOwnProperty(i)) {
                res[i] = this.extractPassData(src, passInfo[i]);
            }
        } else throw "`passInfo` must be a hash, a function or string prop/jq spec";
        return res;
    }
    
};

Amm.extend(Amm.Emitter.JQuery, Amm.Emitter);