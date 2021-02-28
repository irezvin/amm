/* global Amm */

Amm.MultiObserver.Abstract.Observer = function(options, noOverride) {
    
    if (options) {
        if (!noOverride) options = Amm.override({}, options);
        if (options._multiObserver) {
            this._multiObserver = options._multiObserver;
            delete options._multiObserver;
        }
        if ('_defaultValue' in options) {
            this.setDefaultValue(options._defaultValue);
            delete options._defaultValue;
        }
    }
    
    Amm.WithEvents.call(this, options);
    
};

Amm.MultiObserver.Abstract.Observer.prototype = {
    
    'Amm.MultiObserver.Abstract.Observer': '__CLASS__',
    
    _multiObserver: null,
    
    _defaultValue: null,
    
    setMultiObserver: function(multiObserver) {
        Amm.is(multiObserver, 'Amm.MultiObserver.Abstract', 'multiObserver');
        var oldMultiObserver = this._multiObserver;
        if (oldMultiObserver === multiObserver) return;
        if (oldMultiObserver) throw Error("can setMultiObserver() only once");
        this._multiObserver = multiObserver;
        return true;
    },

    getMultiObserver: function() { return this._multiObserver; },
    
    
    setDefaultValue: function(defaultValue) {
        var oldDefaultValue = this._defaultValue;
        if (oldDefaultValue === defaultValue) return;
        this._defaultValue = defaultValue;
        this.outDefaultValueChange(defaultValue, oldDefaultValue);
        this._multiObserver.refresh();
        return true;
    },

    getDefaultValue: function() { return this._defaultValue; },

    outDefaultValueChange: function(defaultValue, oldDefaultValue) {
        this._out('defaultValueChange', defaultValue, oldDefaultValue);
    },
    
    getValue: function(object) {
        var res = this._doGetValue(object);
        if (res === undefined) res = this._defaultValue;
        return res;
    },
    
    _doGetValue: function(object) {
    },
    
    cleanup: function(alreadyUnsubscribed) {
        this.unsubscribe();
        this._multiObserver = null;
        Amm.WithEvents.prototype.cleanup.call(this);
    },
    
    observe: function(objects) {
        // template method
    },
    
    unobserve: function(objects) {
        // template method
    }
    
};

Amm.extend(Amm.MultiObserver.Abstract.Observer, Amm.WithEvents);
