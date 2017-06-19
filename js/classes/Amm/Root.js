/* global Amm */

Amm.Root = function(options) {
    Amm.augment(this, Amm.Trait.Composite);
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
    
    // Root is allowed to have ANY events to create global events
    strictEvents: false,
    
    getPath: function() {
        return '^';
    },
    
    setParent: function(parent) {
        if (parent) throw new Exception("Cannot setParent() of root");
    },
    
    setId: function(id) {
        if (id !== '^') throw "Cannot setId() of root to anything other than '^'";
    },
    
    raiseEvent: function(eventName) {
        var args = Array.prototype.slice.call(arguments, 0);
        return this._out.apply(this, args);
    },
    
    outInterval: function() {
        this._out('interval', this._counter++);
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
    }
    
};

Amm.extend(Amm.Root, Amm.Element);