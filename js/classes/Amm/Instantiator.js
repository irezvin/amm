/* global Amm */

Amm.Instantiator = function() {
    
    if (this['Amm.Instantiator'] === '__CLASS__') {
        throw Error("Attempt to instantiate abstract class");
    }
    
};

Amm.Instantiator.prototype = {
    
    'Amm.Instantiator': '__CLASS__',
    
    _updateLevel: 0,
    
    _toDispose: null,
    
    _reuseInstances: false,    
    
    _numReused: 0,
    
    beginUpdate: function() {
        if (!this._toDispose) this._toDispose = {};
        this._updateLevel++;
    },
    
    endUpdate: function() {
        if (!this._updateLevel) throw Error("Call to endUpdate() without beginUpdate()");
        this._updateLevel--;
        if (this._updateLevel) return;
        if (!this._toDispose) return;
        var t = this._toDispose;
        this._toDispose = null;
        for (var i in t) if (t.hasOwnProperty(i)) {
            for (var j = 0, ll = t[i].length; j < ll; j++) {
                this._destruct(t[i][j], i);
            }
            delete t[i];
        }
    },
    
    _reuse: function(match) {
        if (this._toDispose && this._toDispose[match] && this._toDispose[match].length) {
            this._numReused++;
            return this._toDispose[match].shift();
        }
    },
    
    destruct: function(instance, match) {
        if (this._toDispose && match) {
            if (!this._toDispose[match]) this._toDispose[match] = [instance];
            else this._toDispose[match].push(instance);
            return;
        }
        return this._destruct(instance, match);
    },
    
    _destruct: function(instance, match) {
        if (instance.cleanup) {
            instance.cleanup();
        }
    },
    
    setReuseInstances: function(reuseInstances) {
        reuseInstances = !!reuseInstances;
        var oldReuseInstances = this._reuseInstances;
        if (oldReuseInstances === reuseInstances) return;
        this._reuseInstances = reuseInstances;
        return true;
    },

    getReuseInstances: function() { return this._reuseInstances; },
    
};
