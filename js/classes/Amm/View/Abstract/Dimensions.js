/* global Amm */

Amm.View.Abstract.Dimensions = function(options) {
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Dimensions');
};

Amm.View.Abstract.Dimensions.prototype = {

    'Amm.View.Abstract.Dimensions': '__CLASS__',
    
    _primary: false,
    
    _observesPosition: false,

    _observesSize: false,
    
    /**
     * Whether position is observed with a timer and not with other means. 
     * Must be set BEFORE _beginObservePosition()
     * 
     * @type {boolean}
     */
    _usePositionInterval: false,
    
    _positionIntervalSubscribed: false,
    
    /**
     * Whether size is observed with a timer and not with other means. 
     * Must be set BEFORE _beginObserveSize()
     * 
     * @type {boolean}
     */
    _useSizeInterval: false,
    
    _sizeIntervalSubscribed: false,

    setObservesPosition: function(observesPosition) {
        observesPosition = !!observesPosition;
        var oldObservesPosition = this._observesPosition;
        if (oldObservesPosition === observesPosition) return;
        this._observesPosition = observesPosition;
        if (this._observesPosition) this._beginObservePosition();
            else this._endObservePosition();
        return true;
    },

    getObservesPosition: function() { return this._observesPosition; },

    setObservesSize: function(observesSize) {
        observesSize = !!observesSize;
        var oldObservesSize = this._observesSize;
        if (oldObservesSize === observesSize) return;
        this._observesSize = observesSize;
        if (this._observesSize) this._beginObserveSize();
            else this._endObserveSize();
        return true;
    },

    getObservesSize: function() { return this._observesSize; },

    _beginObservePosition: function() {
        if (this._usePositionInterval) {
            this._positionIntervalSubscribed = true;
            if (!this._sizeIntervalSubscribed) {
                Amm.getRoot().subscribe('interval', this.reportPositionSize, this);
            }
            return true;
        }
    },
    
    _endObservePosition: function() {
        if (this._positionIntervalSubscribed) {
            this._positionIntervalSubscribed = false;
            if (!this._positionIntervalSubscribed && !this._sizeIntervalSubscribed) {
                Amm.getRoot().unsubscribe('interval', this.reportPositionSize, this);
            }
            return true;
        }
    },
    
    reportPositionSize: function() {
        var left, top, width, height, pos, size;
        if (!this._element) return;
        if (this._observesPosition) {
            pos = this.getLeftTop();
            left = pos.left;
            top = pos.top;
        }
        if (this._observesSize) {
            size = this.getWidthHeight();
            width = size.width;
            height = size.height;
        }
        this._element.reportPositionSize(left, top, width, height);
    },
    

    _beginObserveSize: function() {
        if (this._useSizeInterval) {
            if (!this._positionIntervalSubscribed) {
                Amm.getRoot().subscribe('interval', this.reportPositionSize, this);
            }
            this._sizeIntervalSubscribed = true;
            return true;
        }
    },
    
    _endObserveSize: function() {
        if (this._sizeIntervalSubscribed) {
            this._sizeIntervalSubscribed = false;
            if (!this._positionIntervalSubscribed && !this._sizeIntervalSubscribed) {
                Amm.getRoot().unsubscribe('interval', this.reportPositionSize, this);
            }
            return true;
        }
    },
    
    getLeftTop: function() {
        throw Error("Call to abstract method");
    },
    
    setLeftTop: function(left, top) {
        throw Error("Call to abstract method");
    },
    
    getWidthHeight: function() {
        throw Error("Call to abstract method");
    },
    
    setWidthHeight: function(width, height) {
        throw Error("Call to abstract method");
    },
    
    _handleElementSetLeft: function(left) {
        this.setLeftTop({left: left});
    },
    
    _handleElementSetTop: function(top) {
        this.setLeftTop({top: top});
    },
    
    _handleElementSetWidth: function(width) {
        this.setWidthHeight({width: width});
    },
    
    _handleElementSetHeight: function(height) {
        this.setWidthHeight({height: height});
    },
    
    setPrimary: function(primary) {
        var oldPrimary = this._primary;
        if (oldPrimary === primary) return;
        this._primary = primary;
        this._checkObservePositionSize();
        return true;
    },

    getPrimary: function() { return this._primary; },
    
    setVObservesPosition: function() {
        this._checkObservePositionSize();
    },
    
    setVObservesSize: function() {
        this._checkObservePositionSize();
    },
    
    _tryObserve: function() {
        var res = Amm.View.Abstract.prototype._tryObserve.call(this);
        if (!res) return res;
        this._checkObservePositionSize();
        return res;
    },
    
    _endObserve: function() {
        var res = Amm.View.Abstract.prototype._endObserve.call(this);
        this._checkObservePositionSize();
        return res;
    },
    
    _checkObservePositionSize: function() {
        if (!this._primary || !this._observing) {
            
            if (this._observesPosition) {
                this.setObservesPosition(false);
            }
            
            if (this._observesSize) {
                this.setObservesSize(false);
            }
            
        }
        this.setObservesPosition(this._element.getObservesPosition());
        this.setObservesSize(this._element.getObservesSize());
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Dimensions];
    }
    
};

Amm.extend(Amm.View.Abstract.Dimensions, Amm.View.Abstract);
