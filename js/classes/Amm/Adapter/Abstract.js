/* global Amm */

/**
 * Adapter binds events {Name}Change of element to setAdp{Name} setters of the adapter.
 * 
 * Also, initially, adapter applies two-way initialization:
 * - element values that are "undefined" are set to the values extracted from the adapter
 *   (methods getAdp{Name});
 * - other element values are passed to corresponding setters
 */
Amm.Adapter.Abstract = function(options) {
    Amm.ElementBound.call(this, options);
};

Amm.Adapter.Abstract.prototype = {

    'Amm.Adapter.Abstract': '__CLASS__', 

    // Init "undefined" element properties with values extracted from the adapter
    twoWayInit: true,
    
    // Define this in descendants to make _hasPresentation work properly. 
    // Only when both this[this._presentationPropery] and this._element are non-null, 
    // _canObserve() will return true.
    _presentationProperty: null,
    
    _doElementChange: function(element, oldElement) {
        Amm.ElementBound.prototype._doElementChange.call(this, element, oldElement);
        if (oldElement) oldElement.unsubscribe(undefined, undefined, this);
        this._observeElementIfPossible();
    },
    
    _canObserve: function() {
        if (!this._presentationProperty) return false;
        return this._element && this[this._presentationProperty];
    },
    
    _observeElementIfPossible: function() {
        if (!this._canObserve()) return;
        var bindList = [];
        for (var i in this) {
            if (typeof this[i] === 'function' && ('' + i).slice(0, 6) === 'setAdp') {
                var prop = i[6].toLowerCase() + i.slice(7);
                this._observeProp(prop, i, bindList);
            }
        }
        this._initProperties(bindList);
    },
    
    _observeProp: function(propName, setterName, bindList) {
        var caps = {};
        Amm.detectProperty(this._element, propName, caps);
        
        // fooChanged -> adpSetFoo(v)
        if (caps.signalName) this._element.subscribe(caps.signalName, setterName, this);
        
        if (caps.getterName) {
            caps.propName = propName;
            bindList.push(caps);
        }
    },
    
    _initProperties: function(bindList) {
        for (var i = 0; i < bindList.length; i++) {
            var caps = bindList[i], propName = caps.propName;
            propName = propName[0].toUpperCase() + propName.slice(1);
            var setAdp = 'setAdp' + propName, getAdp = 'getAdp' + propName;
            // perform 2-way init
            var elementVal = this._element[caps.getterName]();
            if (this.twoWayInit && elementVal === undefined && caps.setterName && typeof this[getAdp] === 'function') {
                var myVal = this[getAdp]();
                if (myVal !== undefined) this._element[caps.setterName](myVal);
            } else {
                if (typeof this[setAdp] === 'function') this[setAdp](elementVal);
            }
        }
    }

};

Amm.extend(Amm.Adapter.Abstract, Amm.ElementBound);

