/* global Amm */

Amm.State.Implementation = function(options) {
    Amm.init(this, options);
};

Amm.State.Implementation.prototype = {

    'Amm.State.Implementation': '__CLASS__', 
    
    _state: null,
    
    _lockReportData: 0,
    
    _observing: false,
    
    setState: function(state) {
        if (!state) state = null;
        else Amm.is(state, 'Amm.State', 'state');
        var oldState = this._state;
        if (oldState === state) return;
        this._state = state;
        return true;
    },
    
    getState: function() { return this._state; },
    
    getData: function() {
        return this._doGetData();
    },
    
    setData: function(data) {
        this._lockReportData++;
        this._doSetData(data);
        this._lockReportData--;
    },
    
    _doGetData: function() {
        throw Error("Call to abstract method");        
    },
    
    _doSetData: function(data) {
        throw Error("Call to abstract method");
    },
    
    _reportData: function(data) {
        if (this._lockReportData) return;
        this._lockReportData++;
        if (this._state) this._state.reportData(Amm.copy(data));
        this._lockReportData--;
    },

    setObserving: function(observing) {
        observing = !!observing;
        var oldObserving = this._observing;
        if (oldObserving === observing) return;
        this._observing = observing;
        if (observing) this._doStartObserving();
        else this._doStopObserving();
        return true;
    },

    getObserving: function() { return this._observing; },
    
    _doStartObserving: function() {
    },
    
    _doStopObserving: function() {
    },

    cleanup: function() {
        this.setObserving(false);
        this._state = null;
    },

};

