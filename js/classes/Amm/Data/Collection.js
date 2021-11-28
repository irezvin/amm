/* global Amm */

Amm.Data.Collection = function(options) {
    
    Amm.Collection.call(this, options);
    
};

Amm.Data.Collection.ERR_NOT_A_MODEL = "Amm.Data.Collection can accept only Amm.Data.Model instances";

Amm.Data.Collection.prototype = {

    'Amm.Data.Collection': '__CLASS__',
    
    _anyChange: false,
    
    _preserveUncommitted: false,

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
    },
    
    setPreserveUncommitted: function(preserveUncommitted) {
        preserveUncommitted = !!preserveUncommitted;
        var oldPreserveUncommitted = this._preserveUncommitted;
        if (oldPreserveUncommitted === preserveUncommitted) return;
        this._preserveUncommitted = preserveUncommitted;
        this.outPreserveUncommittedChange(preserveUncommitted, oldPreserveUncommitted);
        return true;
    },

    getPreserveUncommitted: function() { return this._preserveUncommitted; },

    outPreserveUncommittedChange: function(preserveUncommitted, oldPreserveUncommitted) {
        this._out('preserveUncommittedChange', preserveUncommitted, oldPreserveUncommitted);
    },
    
    /**
     * @param {boolean} smartUpdate Updates matching items while leaving their instances,
     *      removes other items
     */
    setItems: function(items, smartUpdate) {
        if (this._preserveUncommitted) {
            var uncom = Amm.Array.diff(this.findUncommitted(), items);
            items = [].concat(uncom, items);
        }
        return Amm.Collection.prototype.setItems.call(this, items, smartUpdate);
    },
    
    findUncommitted: function() {
        var res = [];
        for (var i = 0, l = this.length; i < l; i++) {
            if (this[i].mm.getModified()) {
                res.push(this[i]);
                continue;
            }
            if (this[i].mm.getTransaction && this[i].mm.getTransaction()) {
                res.push(this[i]);
                continue;
            }
        }
        return res;
    }
    
};

Amm.extend(Amm.Data.Collection, Amm.Collection);
