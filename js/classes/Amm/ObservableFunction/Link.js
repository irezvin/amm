/* global Amm */

Amm.ObservableFunction.Link = function(observableFunction, source, prop, args, extraEvents) {

    if (!source) prop = args = extraEvents = null;
    else {
        args = args !== undefined? Amm.ObservableFunction.prepareArgs(args) : null;
        if (extraEvents) extraEvents = Amm.ObservableFunction.prepareArgs(extraEvents) || null;
        else extraEvents = null;
    }

    if (observableFunction._observes) {
        var idx = observableFunction.findLink(source, prop, args, extraEvents, true);
        if (idx >= 0) return observableFunction._links[idx];
    }
    
    this._o = observableFunction;
    this._source = source;
    this._prop = prop;
    this._args = args || null;
    this._extraEvents = extraEvents || null;
    
    if (!observableFunction._observes) return;
    
    if (source && source['Amm.WithEvents']) {
        var ev = prop + 'Change';
        if (extraEvents instanceof Array) ev = [].concat(extraEvents);
        else if (extraEvents) ev = [extraEvents];
        else ev = [];
        if (prop) ev.unshift(prop + 'Change');
        ev.unshift('cleanup');
        for (var i = 0; i < ev.length; i++) {
            if (source.hasEvent(ev[i])) {
                source.subscribe(ev[i], this.update, this);
            }
        }
    }
    
    observableFunction._links.push(this);
    
};

Amm.ObservableFunction.Link.prototype = {
    
    'Amm.ObservableFunction.Link': '__CLASS__',
    
    /**
     * @type Amm.ObservableFunction
     */
    _o: null,
    
    _source: null,
    
    _prop: null,
    
    _args: null,
    
    _extraEvents: null,
    
    used: false,
    
    dispose: function(dontSearch) {
        if (this._source && this._source['Amm.WithEvents']) {
            this._source.unsubscribe(undefined, undefined, this);
        }
        if (!dontSearch) {
            var idx = Amm.Array.indexOf(this, this._o._links);
            if (idx >= 0) this._o._links.splice(idx, 1);
        }
        this._o = null;
        this._source = null;
        this._prop = null;
        this._args = null;
        this._extraEvents = null;
    },
    
    update: function() {
        if (this._o) {
            this._o.update();
        } else {
            this.dispose(true);
        }
    },
    
    prop: function(property, args, extraEvents) {
        return new Amm.ObservableFunction.Link(this._o, this.val(), property, args, extraEvents);
    },
    
    val: function() {
        this.used = true;
        return this._o._implGet(this._source, this._prop, this._args);
    },
    
    match: function(source, prop, args, extraEvents, prepared) {
        if (source !== this._source) return false;
        if (prop !== this._prop) return false;
        if (!prepared) extraEvents = Amm.ObservableFunction.prepareArgs(extraEvents) || null;
        if (this._extraEvents instanceof Array && extraEvents instanceof Array) {
            if (!Amm.Array.equal(this._extraEvents, extraEvents)) return false;
        } else {
            if (this._extraEvents !== extraEvents) return false;
        }
        if (!prepared) args = Amm.ObservableFunction.prepareArgs(args);
        if (args instanceof Array && this._args instanceof Array) {
            if (!Amm.Array.equal(args, this._args)) return false;
        } else {
            if (args !== this._args) return false;
        }
        return true;
    }
    
};
