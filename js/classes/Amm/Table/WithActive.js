/* global Amm */

Amm.Table.WithActive = function(options) {
    Amm.WithEvents.call(this, options);
};

Amm.Table.WithActive.prototype = {
    
    'Amm.Table.WithActive': '__CLASS__',

    _active: null,
    
    _tableActiveProp: null,

    _lockActive: 0,

    // 'Locked' state means item cannot be activated even if it's visible
    _locked: false,
    
    getTable: function() {
        if (this._component && this._component['Amm.Table.Table']) return this._component;
    },

    setActive: function(active) {
        if (active === undefined) active = true;
        else active = !!active;
        if (!this.getCanActivate()) active = false;
        var oldActive = this._active;
        if (oldActive === active) return;
        this._active = active;
        if (this._lockActive) return;
        var table = this.getTable();
        this.outActiveChange(active, oldActive);
        if (table && this._tableActiveProp) {
            this._lockActive++;
            var curr = Amm.getProperty(table, this._tableActiveProp);
            if (curr === this && !active) {
                Amm.setProperty(table, this._tableActiveProp, null);
            } else if (curr !== this && active) {
                Amm.setProperty(table, this._tableActiveProp, this);
            }
            this._lockActive--;
            active = this._active;
        }
        return true;
    },

    getActive: function() { return this._active; },

    outActiveChange: function(active, oldActive) {
        this._out('activeChange', active, oldActive);
    },
    
    _calcCanActivate: function(get) {
        return !get('locked');
    },
    
    setLocked: function(locked) {
        var oldLocked = this._locked;
        if (oldLocked === locked) return;
        this._locked = locked;
        this.outLockedChange(locked, oldLocked);
        return true;
    },

    getLocked: function() { return this._locked; },

    outLockedChange: function(locked, oldLocked) {
        this._out('lockedChange', locked, oldLocked);
    },
    
};

Amm.extend(Amm.Table.WithActive, Amm.WithEvents);
Amm.ObservableFunction.createCalcProperty('canActivate', Amm.Table.WithActive.prototype);