/* global Amm */

Amm.View.Abstract.SingleDimension = function(options) {
    //this._requireInterfaces('SingleDimension');
    Amm.View.Abstract.call(this, options);
};

Amm.View.Abstract.SingleDimension.DIMENSION = {
    LEFT:           'left',
    TOP:            'top',
    POSITION_LEFT:  'positionLeft',
    POSITION_TOP:   'positionTop',
    WIDTH:          'width',
    HEIGHT:         'height',
    INNER_WIDTH:    'innerWidth',
    INNER_HEIGHT:   'innerHeight',
};

Amm.View.Abstract.SingleDimension.prototype = {

    'Amm.View.Abstract.SingleDimension': '__CLASS__',
    
    _primary: false,
    
    _observesDimension: false,
    
    _propertySubbed: false,

    /**
     * Property of element that is synchronized with views' dimension value
     * @type string
     */
    _property: 'size',
    
    _dimension: null,
    
    _lockDimension: 0,
    
    setProperty: function(property) {
        var oldProperty = this._property;
        if (oldProperty === property) return;
        this._endObserveDimension();
        this._unsubProperty();
        this._property = property;
        this._subProperty();
        this._beginObserveDimension();
        return true;
    },

    getProperty: function() { return this._property; },

    setDimension: function(dimension) {
        var oldDimension = this._dimension;
        if (oldDimension === dimension) return;
        this._dimension = dimension;
        return true;
    },

    getDimension: function() { return this._dimension; },

    /**
     * Whether position is observed with a timer and not with other means. 
     * Must be set BEFORE _beginObservePosition()
     * 
     * @type {boolean}
     */
    _useInterval: false,
    
    _intervalSubscribed: false,

    setObservesDimension: function(observesDimension) {
        observesDimension = !!observesDimension;
        var oldObservesDimension = this._observesDimension;
        if (oldObservesDimension === observesDimension) return;
        this._observesDimension = observesDimension;
        if (this._observesDimension) this._beginObserveDimension();
            else this._endObserveDimension();
        return true;
    },

    getObservesDimension: function() { return this._observesDimension; },

    getObservesSize: function() { return this._observesSize; },

    _subProperty: function() {
        if (this._propertySubbed) return;
        if (    !this._element
             || !this._property 
             || !Amm.detectProperty(this._element, this._property)
        ) {
            return;
        }
        this._propertySubbed = true;
        this._element.subscribe('subscribeFirst_' + this._property + 'Change', this._forceObserveDimension, this);
        this._element.subscribe('unsubscribeLast_' + this._property + 'Change', this._endObserveDimension, this);        
    },
    
    _unsubProperty: function() {
        if (!this._propertySubbed) return;
        this._propertySubbed = false;
        if (    !this._element
             || !this._property 
        ) {
            return;
        }
        this._element.unsubscribe('unsubscribeLast_' + this._property + 'Change', this._endObserveDimension, this);                        
        this._element.unsubscribe('subscribeFirst_' + this._property + 'Change', this._forceObserveDimension, this);
    },
    
    _forceObserveDimension: function() {
        return this._beginObserveDimension(true);
    },
    
    _beginObserveDimension: function(force) {
        if (this._observesDimension) return;
        if (!this._property) return;
        if (!this._element) return;
        var ev = this._property + 'Change';
        if (!force && !this._element.hasEvent(ev)) return;
        if (!force && !this._element.getSubscribers(ev).length) return;
        this._observesDimension = true;
        if (this._useInterval) {
            this._intervalSubscribed = true;
            Amm.getRoot().subscribe('interval', this.reportDimension, this);
        }
        return true;
    },
    
    _endObserveDimension: function() {
        if (!this._observesDimension) return;
        this._observesDimension = false;
        if (this._intervalSubscribed) {
            this._intervalSubscribed = false;
            Amm.getRoot().unsubscribe('interval', this.reportDimension, this);
        }
        return true;
    },
    
    handlePropertyChange: function(value, oldValue) {
        if (this._lockDimension) return;
        this.setDimensionValue(value);
    },
    
    reportDimension: function() {
        var dim;
        if (!this._element || !this._property) return;
        val = this.getDimensionValue();
        this._lockDimension++;
        try {
            Amm.setProperty(this._element, this._property, val);
        } finally {
            this._lockDimension--;
        }
    },

    getDimensionValue: function() {
        throw Error("Call to abstract method");
    },
    
    setDimensionValue: function(value) {
        throw Error("Call to abstract method");
    },
    
    _tryObserve: function() {
        var res = Amm.View.Abstract.prototype._tryObserve.call(this);
        if (!res) return res;
        this._subProperty();
        this._beginObserveDimension();
        return res;
    },
    
    
    _endObserve: function() {
        var res = Amm.View.Abstract.prototype._endObserve.call(this);
        this._endObserveDimension();
        this._unsubProperty();
        return res;
    },
       
    getSuggestedTraits: function() {
        return [Amm.Trait.SingleDimension];
    },
    
    _handleElementRequestDimensionValue: function(propName, oRes) {
        if (propName === this._property && (oRes.value === null || oRes.value === undefined)) {
            oRes.value = this.getDimensionValue();
        }
    },
    
    _handleElementUpdateDimensionValue: function(propName, value) {
        if (propName === this._property) 
            this.setDimensionValue(value);
    }
    
};

Amm.extend(Amm.View.Abstract.SingleDimension, Amm.View.Abstract);
