/* global Amm */

Amm.State.Hash = function(options) {
    this._uri = new Amm.Remote.Uri({skipEmptyArgs: true});
    this._uri.subscribe('uriChange', this._handleUriChange, this);
    Amm.State.Implementation.call(this, options);
    var t = this;
    this._listener = function() {
        t._handleLocationHashChange();
    };
};

Amm.State.Hash.prototype = {

    'Amm.State.Hash': '__CLASS__', 
    
    _lockHashChange: 0,
    
    _listener: null,
    
    // stub for testing purposes
    _location: null,
    
    _handleUriChange: function(uri, oldUri) {
        this._reportData(this._uri.getUri('QUERY', false));
        this._lockHashChange++;
        var query = this._uri.getUri('QUERY', true);
        var location = this._location || window.location;
        var newHash = query? '#' + query.replace(/^[?&]/, '') : '';
        location.hash = newHash;
        this._lockHashChange--;
    },
    
    _handleLocationHashChange: function() {
        if (this._lockHashChange) return;
        var location = this._location || window.location;
        this._uri.setUri(location.hash.replace(/^#/, ''), 'QUERY');
    },
    
    _doGetData: function() {
        return this._uri.getUri('QUERY', false);
    },
    
    _doSetData: function(data) {
        this._uri.setUri(data, 'QUERY');
    },
    
    _doStartObserving: function() {
        window.addEventListener(
            'hashchange', 
            this._listener,
            false
        );
        this._listener();
    },
    
    _doStopObserving: function() {
        window.removeEventListener(
            'hashchange', 
            this._listener,
            false
        );
    },

};

Amm.extend(Amm.State.Hash, Amm.State.Implementation);

