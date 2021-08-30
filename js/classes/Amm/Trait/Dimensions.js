/* global Amm */

Amm.Trait.Dimensions = function() {};

Amm.Trait.Dimensions.prototype = {

    'Dimensions': '__INTERFACE__',
    
    _left: null,

    _top: null,

    _right: null,

    _bottom: null,

    _width: null,

    _height: null,

    _observesPosition: false,

    _observesSize: false,
    
    getLeft: function() {
        return this._getDimension('left');
    },
    
    setLeft: function(left) {
        if (left === undefined) left = null;
        var oldLeft = this.getLeft();
        if (oldLeft === left) return;
        this._left = left;
        this.outSetLeft(left, oldLeft);
        this.outLeftChange(left, oldLeft);
        this.getRight();
        return true;
    },

    outLeftChange: function(left, oldLeft) {
        this._out('leftChange', left, oldLeft);
    },

    outSetLeft: function(left, oldLeft) {
        this._out('setLeft', left, oldLeft);
    },

    setTop: function(top) {
        if (top === undefined) top = null;
        var oldTop = this.getTop();
        if (oldTop === top) return;
        this._top = top;
        this.outSetTop(top, oldTop);
        this.outTopChange(top, oldTop);
        this.getBottom();
        return true;
    },

    getTop: function() { 
        return this._getDimension('top');
    },

    outTopChange: function(top, oldTop) {
        this._out('topChange', top, oldTop);
    },

    outSetTop: function(top, oldTop) {
        this._out('setTop', top, oldTop);
    },

    setRight: function(right) {
        if (right === undefined) right = null;
        var oldRight = this.getRight();
        if (oldRight === right) return;
        this._right = right;
        this.setLeft(right - this.getWidth());
        this.outRightChange(right, oldRight);
        return true;
    },

    getRight: function() { 
        return this._getDimension('right');
    },
    
    outRightChange: function(right, oldRight) {
        this._out('rightChange', right, oldRight);
    },

    setBottom: function(bottom) {
        var oldBottom = this.getBottom();
        if (oldBottom === bottom) return;
        this._bottom = bottom;
        this.setTop(bottom - this.getHeight());
        this.outBottomChange(bottom, oldBottom);
        return true;
    },

    getBottom: function() { return this._getDimension('bottom'); },

    outBottomChange: function(bottom, oldBottom) {
        this._out('bottomChange', bottom, oldBottom);
    },

    setWidth: function(width) {
        if (width === undefined) width = null;
        var oldWidth = this.getWidth();
        if (oldWidth === width) return;
        this._width = width;
        this.outSetWidth(width, oldWidth);
        this.outWidthChange(width, oldWidth);
        this.getRight();
        return true;
    },

    getWidth: function() { 
        return this._getDimension('width');
    },

    outWidthChange: function(width, oldWidth) {
        this._out('widthChange', width, oldWidth);
    },

    outSetWidth: function(width, oldWidth) {
        this._out('setWidth', width, oldWidth);
    },

    setHeight: function(height) {
        if (height === undefined) height = null;
        var oldHeight = this.getHeight();
        if (oldHeight === height) return;
        this._height = height;
        this.outSetHeight(height, oldHeight);
        this.outHeightChange(height, oldHeight);
        this.getBottom();
        return true;
    },
    
    getHeight: function() {
        return this._getDimension('height');
    },
    
    outHeightChange: function(height, oldHeight) {
        this._out('heightChange', height, oldHeight);
    },

    outSetHeight: function(height, oldHeight) {
        this._out('setHeight', height, oldHeight);
    },

    _getDimension: function(name) {
        var oldValue = this['_' + name];
        var newValue = null;
        var n = name[0];
        var v = this._primaryDimensionsView;
        var a, b;
        if (v) {
            if (n === 'l') newValue = v.getLeftTop().left;
            else if (n === 't') newValue = v.getLeftTop().top;
            else if (n === 'w') newValue = v.getWidthHeight().width;
            else if (n === 'h') newValue = v.getWidthHeight().height;
            else if (n === 'r') newValue = (a = v.getLeftTop().left) + (b = v.getWidthHeight().width);
            else if (n === 'b') {
                newValue = (a = v.getLeftTop().top) + (b = v.getWidthHeight().height);
            }
        }
        if (newValue !== oldValue) {
            // reportPositionSize should handle change of properies and trigger events
            if (n === 'l') this.reportPositionSize(newValue);
            else if (n === 't') this.reportPositionSize(undefined, newValue);
            else if (n === 'w') this.reportPositionSize(undefined, undefined, newValue);
            else if (n === 'h') this.reportPositionSize(undefined, undefined, undefined, newValue);
            else if (n === 'r') this.reportPositionSize(a, undefined, b, undefined);
            else if (n === 'b') this.reportPositionSize(undefined, a, undefined, b);
        }
        return this['_' + name];
    },
    
    _needObservePosition: function() {
        return this._subscribers.leftChange
                || this._subscribers.topChange
                || this._subscribers.rightChange 
                || this._subscribers.bottomChange;
    },
    
    _needObserveSize: function() {
        return this._subscribers.widthChange
                || this._subscribers.heightChange
                || this._subscribers.rightChange
                || this._subscribers.bottomChange;
    },
    
    setObservesPosition: function(observesPosition) {
        console.warn("Amm.Trait.Dimensions.setObservesPosition() has no effect");
    },

    setPrimaryDimensionsView: function(primaryDimensionsView) {
        var oldPrimaryDimensionsView = this._primaryDimensionsView;
        if (oldPrimaryDimensionsView === primaryDimensionsView) return;
        if (oldPrimaryDimensionsView) oldPrimaryDimensionsView.setPrimary(false);
        if (primaryDimensionsView) primaryDimensionsView.setPrimary(true);
        this._primaryDimensionsView = primaryDimensionsView;
        return true;
    },

    getPrimaryDimensionsView: function() { return this._primaryDimensionsView; },

    _setObservesPosition: function(observesPosition) {
        observesPosition = !!observesPosition;
        var oldObservesPosition = this._observesPosition;
        if (oldObservesPosition === observesPosition) return;
        this._observesPosition = observesPosition;
        this.outObservesPositionChange(observesPosition, oldObservesPosition);
        return true;
    },

    getObservesPosition: function() { return this._observesPosition; },

    outObservesPositionChange: function(observesPosition, oldObservesPosition) {
        this._out('observesPositionChange', observesPosition, oldObservesPosition);
    },
    
    setObservesSize: function(observesSize) {
        console.warn("Amm.Trait.Dimensions.setObservesSize() has no effect");
    },
    
    _subscribeFirst_leftChange: function() {
        this.getLeft();
        this._setObservesPosition(this._needObservePosition());
    },
    
    _subscribeFirst_rightChange: function() {
        this.getRight();
        this._setObservesPosition(this._needObservePosition());
        this._setObservesSize(this._needObserveSize());
    },
    
    _subscribeFirst_topChange: function() {
        this.getTop();
        this._setObservesPosition(this._needObservePosition());
    },
    
    _subscribeFirst_bottomChange: function() {
        this.getBottom();
        this._setObservesPosition(this._needObservePosition());
        this._setObservesSize(this._needObserveSize());
    },
    
    _subscribeFirst_widthChange: function() {
        this.getWidth();
        this._setObservesSize(this._needObserveSize());
    },
    
    _subscribeFirst_heightChange: function() {
        this.getHeight();
        this._setObservesSize(this._needObserveSize());
    },
    
    
    _unsubscribeLast_leftChange: function() {
        this._setObservesPosition(this._needObservePosition());
    },
    
    _unsubscribeLast_rightChange: function() {
        this._setObservesPosition(this._needObservePosition());
        this._setObservesSize(this._needObserveSize());
    },
    
    _unsubscribeLast_topChange: function() {
        this._setObservesPosition(this._needObservePosition());
    },
    
    _unsubscribeLast_bottomChange: function() {
        this._setObservesPosition(this._needObservePosition());
        this._setObservesSize(this._needObserveSize());
    },
    
    _unsubscribeLast_widthChange: function() {
        this._setObservesSize(this._needObserveSize());
    },
    
    _unsubscribeLast_heightChange: function() {
        this._setObservesSize(this._needObserveSize());
    },    

    _setObservesSize: function(observesSize) {
        observesSize = !!observesSize;
        var oldObservesSize = this._observesSize;
        if (oldObservesSize === observesSize) return;
        this._observesSize = observesSize;
        this.outObservesSizeChange(observesSize, oldObservesSize);
        return true;
    },

    getObservesSize: function() { return this._observesSize; },

    outObservesSizeChange: function(observesSize, oldObservesSize) {
        this._out('observesSizeChange', observesSize, oldObservesSize);
    },
    
    reportPositionSize: function(left, top, width, height) {
        var oldLeft = this._left;
        var oldTop = this._top;
        var oldWidth = this._width;
        var oldHeight = this._height;
        var oldRight = this._right;
        var oldBottom = this._bottom;
        if (left !== undefined) this._left = left;
        if (top !== undefined) this._top = top;
        if (width !== undefined) this._width = width;
        if (height !== undefined) this._height = height;
        if (this._left !== undefined && this._width !== undefined) {
            this._right = this._left + this._width;
        }
        if (this._top !== undefined && this._height !== undefined) {
            this._bottom = this._top + this._height;
        }
        if (oldLeft !== this._left) this.outLeftChange(this._left, oldLeft);
        if (oldTop !== this._top) this.outTopChange(this._top, oldTop);
        if (oldWidth !== this._width) this.outWidthChange(this._width, oldWidth);
        if (oldHeight !== this._height) this.outHeightChange(this._height, oldHeight);
        if (oldRight !== this._right) this.outRightChange(this._right, oldRight);
        if (oldBottom !== this._bottom) this.outBottomChange(this._bottom, oldBottom);
    },
    
    _endInit_traitDimensions: function() {
        this.subscribe('viewReady', this._traitDimensionsViewReady, this);
    },
    
    _traitDimensionsViewReady: function(view) {
        if (!this._primaryDimensionsView && view['Amm.View.Abstract.Dimensions']) {
            this.setPrimaryDimensionsView(view);
        }
    },
    
};
