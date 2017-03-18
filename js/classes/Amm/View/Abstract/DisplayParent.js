/* global Amm */

Amm.View.Abstract.DisplayParent = function(options) {
    this._childViews = [];
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('DisplayParent');
};

Amm.View.Abstract.DisplayParent.prototype = {

    'Amm.View.Abstract.DisplayParent': '__CLASS__',
    
    _coll: null,
    
    _doElementChange: function(element, oldElement) {
        if (oldElement) oldElement.displayChildren.unsubscribe(undefined, undefined, this);
        this._coll = null;
        Amm.View.Abstract.prototype._doElementChange.call(this, element, oldElement);
    },

    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (!res) return res;        
        var coll = this._coll = this._element.displayChildren;
        this._beforeObserveCollection();
        var s = '_handleCollection', l = s.length;
        for (var i in this) {
            if (i[0] === '_' && i.slice(0, l) === s && typeof this[i] === 'function') {
                var ev = i.charAt(l).toLowerCase() + i.slice(l + 1);
                coll.subscribe(ev, this[i], this);
            }
        }
        this._afterObserveCollection();
        return res;
    },
    
    _stopObserving: function() {
        Amm.View.Abstract.prototype._stopObserving.call(this);
        if (this._element && this._element.displayChildren) {
            this._element.displayChildren.unsubscribe(undefined, undefined, this);
        }
    },
    
    _beforeObserveCollection: function () {
        
    },
    
    _afterObserveCollection: function () {
        
    },
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    }
    
    // _handleCollection<Event> methods are defined in the concrete 
    // child classes because level of Collection events' support may 
    // differ with the implementation
    
};

Amm.extend(Amm.View.Abstract.DisplayParent, Amm.View.Abstract);

