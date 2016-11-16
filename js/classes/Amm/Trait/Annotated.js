/* global Amm */

Amm.Trait.Annotated = function() {
};

Amm.Trait.Annotated.prototype = {

    'Annotated': '__INTERFACE__',

    _label: null,

    _readOnly: null,

    _error: null,

    _description: null,

    setLabel: function(label) {
        var oldLabel = this._label;
        if (oldLabel === label) return;
        this._label = label;
        return true;
    },

    getLabel: function() { return this._label; },

    setReadOnly: function(readOnly) {
        var oldReadOnly = this._readOnly;
        if (oldReadOnly === readOnly) return;
        this._readOnly = readOnly;
        return true;
    },

    getReadOnly: function() { return this._readOnly; },

    setError: function(error) {
        var oldError = this._error;
        if (oldError === error) return;
        this._error = error;
        return true;
    },

    getError: function() { return this._error; },

    setDescription: function(description) {
        var oldDescription = this._description;
        if (oldDescription === description) return;
        this._description = description;
        return true;
    },

    getDescription: function() { return this._description; },

};
