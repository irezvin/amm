/* global Amm */

Amm.Drag.Extra = function(options) {
    Amm.WithEvents.call(this, options);
};

Amm.Drag.Extra.prototype = {
  
    'Amm.Drag.Extra': '__CLASS__',

    _id: null,

    _session: null,

    setId: function(id) {
        var oldId = this._id;
        if (oldId === id) return;
        if (this._id) throw Error("can setId() only once");
        this._id = id;
        return true;
    },

    getId: function() { return this._id; },

    setSession: function(session) {
        var oldSession = this._session;
        if (oldSession === session) return;
        if (this._session) throw Error("can setSession() only once");
        Amm.is(session, 'Amm.Drag.Session', session);
        Amm.subUnsub(session, oldSession, this, '_handleSession');
        this._session = session;
        return true;
    },

    getSession: function() { return this._session; },

};

Amm.extend(Amm.Drag.Extra, Amm.WithEvents);