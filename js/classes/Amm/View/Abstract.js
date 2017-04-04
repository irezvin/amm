/* global Amm */

/**
 * Adapter binds events {Name}Change of element to setV{Name} setters of the adapter.
 * 
 * Also, initially, adapter applies two-way initialization:
 * - element values that are "undefined" are set to the values extracted from the adapter
 *   (methods getV{Name});
 * - other element values are passed to corresponding setters
 */
Amm.View.Abstract = function(options) {
    Amm.ElementBound.call(this, options);
    Amm.init(this, options, ['element', 'elementPath']);
};

Amm.View.Abstract.prototype = {

    'Amm.View.Abstract': '__CLASS__', 
    
    // Init "undefined" element properties with values extracted from the adapter
    twoWayInit: true,
    
    // Define this in descendants to make _hasPresentation work properly. 
    // Only when both this[this._presentationPropery] and this._element are non-null, 
    // _canObserve() will return true.
    _presentationProperty: null,
    
    _observing: null,
    
    _doElementChange: function(element, oldElement) {
        if (this._observing) this._endObserve();
        Amm.ElementBound.prototype._doElementChange.call(this, element, oldElement);
        this._observeElementIfPossible();
    },
    
    _canObserve: function() {
        if (!this._presentationProperty) return false;
        return !!(this._element && this[this._presentationProperty]);
    },
    
    _endObserve: function() {
        this._observing = false;
        if (this._element) this._element.unsubscribe(undefined, undefined, this);        
    },
    
    _observeElementIfPossible: function() {
        var can = this._canObserve();
        if (!can) {
            if (this._observing) this._endObserve();
            return;
        }
        this._acquireResources();
        var bindList = [];
        for (var i in this) {
            if (typeof this[i] === 'function') {
                if (('' + i).slice(0, 4) === 'setV') {
                    var prop = i[4].toLowerCase() + i.slice(5);
                    this._observeProp(prop, i, bindList);
                } else {
                    if (('' + i).slice(0, 14) === '_handleElement') {
                        var ev = i[14].toLowerCase() + i.slice(15);
                        if (this._element.hasEvent(ev)) 
                            this._element.subscribe(ev, this[i], this);
                    }
                }
            }
        }
        this._observing = true;
        this._initProperties(bindList);
        return true;
    },
    
    _acquireResources: function() {
    },
    
    _observeProp: function(propName, setterName, bindList) {
        var caps = {};
        Amm.detectProperty(this._element, propName, caps);
        
        // fooChanged -> adpSetFoo(v)
        if (caps.eventName) this._element.subscribe(caps.eventName, setterName, this);
        
        if (caps.getterName) {
            caps.propName = propName;
            bindList.push(caps);
        }
    },
    
    _initProperties: function(bindList) {
        for (var i = 0; i < bindList.length; i++) {
            var caps = bindList[i], propName = caps.propName;
            propName = propName[0].toUpperCase() + propName.slice(1);
            var setV = 'setV' + propName, getV = 'getV' + propName;
            // perform 2-way init
            var elementVal = this._element[caps.getterName]();
            if (this.twoWayInit && elementVal === undefined && caps.setterName && typeof this[getV] === 'function') {
                var myVal = this[getV]();
                if (myVal !== undefined) this._element[caps.setterName](myVal);
            } else {
                if (typeof this[setV] === 'function') this[setV](elementVal);
            }
        }
    }

};

Amm.extend(Amm.View.Abstract, Amm.ElementBound);