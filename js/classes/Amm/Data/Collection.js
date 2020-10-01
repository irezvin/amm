/* global Amm */

Amm.Data.Collection = function(options) {
    
    Amm.Collection.call(this, options);
    
};

Amm.Data.Collection.ERR_NOT_A_MODEL = "Amm.Data.Collection can accept only Amm.Data.Model instances";

Amm.Data.Collection.prototype = {

    'Amm.Data.Collection': '__CLASS__',
    
    _anyChange: false,

    _subscribe: function(item) {
        
        Amm.Collection.prototype._subscribe.call(this, item);
        item.mm.subscribe('anyChange', this._handleItemAnyChange, this);
        
    },
    
    _dissociate: function(item) {
       
        Amm.Collection.prototype._dissociate.call(this, item);
        item.mm.unsubscribe('anyChange', this._handleItemAnyChange, this);
       
    },
    
    _outChain: function(events) {
        
        if (this._noTrigger || this._updateLevel) return;
        Amm.Collection.prototype._outChain.call(this, events);
        this.outAnyChange();
        
    },
    
    _doEndUpdate: function() {
        Amm.Collection.prototype._doEndUpdate.call(this);
        if (this._anyChange) this.outAnyChange();
    },
    
    canAccept: function (item, checkRequirementsOnly, problem) {
        problem = problem || {};
        if (!Amm.is(item, 'Amm.Data.Model')) {
            problem.error = Amm.Data.Collection.ERR_NOT_A_MODEL;
            return !problem.error;
        }
        return Amm.Collection.prototype.canAccept.call(this, item, checkRequirementsOnly, problem);
    },
    
    _handleItemAnyChange: function() {
        this.outAnyChange();
    },
    
    outAnyChange: function() {
        if (this._updateLevel) {
            this._anyChange = true;
            return;
        }
        this._anyChange = false;
        this._out('anyChange');
    }
    
};

Amm.extend(Amm.Data.Collection, Amm.Collection);
