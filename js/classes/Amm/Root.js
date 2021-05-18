/* global Amm */

Amm.Root = function(options) {
    Amm.augment(this, Amm.Trait.Component);
    Amm.Element.call(this, options);
};

Amm.Root.prototype = {
    
    'Amm.Root': '__CLASS__',
    
    _id: '^',
    
    _internalId: 'root',
    
    _intervalDelay: 250,
    
    _interval: null,
    
    _counter: 0,
    
    _deferLevel: 0,
    
    _deferredCounter: 0,
    
    // Root is allowed to have ANY events to create global events
    strictEvents: false,
    
    setId: function(id) {
        if (id !== '^') Error("Cannot setId() of root to anything other than '^'");
    },
    
    raiseEvent: function(eventName) {
        var args = Array.prototype.slice.call(arguments, 0);
        var res = this._out.apply(this, args);
        if (eventName === 'bootstrap' && Amm.getBootstrapped()) {
            // delete so next handler will have _subscribeFirst too
            // and current handlers won't be called again            
            delete this._subscribers['bootstrap'];
        }
        return res;
    },
    
    outInterval: function() {
        this._out('interval', this._counter++);
    },
    
    _subscribeFirst_bootstrap: function() {
        if (Amm.getBootstrapped()) {
            // will call newly subscribed handler and clear the handlers list
            this.raiseEvent('bootstrap');
        }
    },
    
    _subscribeFirst_interval: function() {
        var t = this;
        this._interval = window.setInterval(function() {t.outInterval();}, this._intervalDelay);
    },
    
    _unsubscribeLast_interval: function() {
        if (this._interval) {
            window.clearInterval(this._interval);
            this._interval = null;
        }
    },
    
    subscribe: function(eventName, handler, scope, extra, decorator) {
        if (Amm.itemDebugTag && Amm.itemDebugTag.length && Amm.getClass(scope)) {
            if (!scope._root_sub) scope._root_sub = {};
            scope._root_sub[eventName] = Amm.itemDebugTag[Amm.itemDebugTag.length - 1];
        }
        return Amm.WithEvents.prototype.subscribe.call(this, eventName, handler, scope, extra, decorator);
    },
    
    beginDefer: function() {
        this._deferLevel++;
    },
    
    endDefer: function() {
        if (this._deferLevel <= 0) throw Error("Call to Amm.Root.endDefer() without corresponding beginDefer()");
        this._deferLevel--;
        if (!this._deferLevel && this._subscribers['deferred']) {
            this.outDeferred();
        }
    },
    
    defer: function(handler, scope, extra) {
        this.subscribe('deferred', handler, scope, extra);
        if (!this._deferLevel) this.outDeferred();
    },
    
    cancelDeferred: function(handler, scope, extra) {
        this.unsubscribe('deferred', handler, scope, extra);
    },
    
    notifyEventStackEmpty: function() {
        this.outDeferred();
    },
    
    outDeferred: function() {
        if (!this._subscribers['deferred']) return;
        this._deferredCounter++;
        var evName = 'deferred_' + this._deferredCounter;
        var lbl = this._subscribers[evName] = this._subscribers['deferred'];
        var ex, exc;
        delete this._subscribers['deferred'];
        try {
            this._out(evName);
        } catch (ex) {
            exc = ex;
        }
        delete this._subscribers[evName];
        if (exc) throw exc;
    }
    
};

Amm.extend(Amm.Root, Amm.Element);
