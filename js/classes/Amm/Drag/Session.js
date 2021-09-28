/* global Amm */
Amm.Drag.Session = function(options) {
    Amm.WithEvents.call(this, options);
};

Amm.Drag.Session.prototype = {
    
    'Amm.Drag.Session': '__CLASS__',

    nativeEventInfo: null,

    _active: null,
    
    _source: null,

    _startNativeItem: null,

    _vector: null,
    
    _delta: null,

    _target: null,

    _targetNativeItem: null,

    _nativeItem: null,
    
    _dropPossible: null,
    
    _constraints: [],
    
    _deltaConstraints: [],
    
    _cursor: undefined,
    
    _dropEnabled: true,
    
    _applyConstraints: function(vector, constraints) {
        if (!constraints.length) return vector;
        var res = vector;
        for (var i = 0; i < constraints.length; i++) {
            res = constraints[i].apply(res);
        }
        return res;
    },
    
    applyVector: function(delta) {
        var newVector;
        if (!this._vector) newVector = delta;
        else {
            this._applyConstraints(delta, this._deltaConstraints);
            newVector = this._vector.add(delta);
            this._applyConstraints(newVector, this._constraints);
            this.setDelta(delta);
        }
        this.setVector(newVector);
    },
    
    setConstraints: function(constraints) {
        this._constraints = Amm.constructMany(constraints, 'Amm.Drag.Constraint');
        if (this._constraints.length && this._vector) this.setVector(this._vector);
    },
    
    setDeltaConstraints: function(deltaConstraints) {
        this._deltaConstraints = Amm.constructMany(deltaConstraints, 'Amm.Drag.Constraint');
    },
    
    cancel: function() {
        Amm.Drag.Controller.getInstance().cancelDrag();
    },
    
    end: function() {
        Amm.Drag.Controller.getInstance().endDrag();
    },

    setSource: function(source) {
        var oldSource = this._source;
        if (oldSource === source) return;
        this._source = source;
        this.outSourceChange(source, oldSource);
        return true;
    },

    getSource: function() { return this._source; },

    outSourceChange: function(source, oldSource) {
        this._out('sourceChange', source, oldSource);
    },

    setStartNativeItem: function(startNativeItem) {
        var oldStartNativeItem = this._startNativeItem;
        if (oldStartNativeItem === startNativeItem) return;
        this._startNativeItem = startNativeItem;
        this.outStartNativeItemChange(startNativeItem, oldStartNativeItem);
        return true;
    },

    getStartNativeItem: function() { return this._startNativeItem; },

    outStartNativeItemChange: function(startNativeItem, oldStartNativeItem) {
        this._out('startNativeItemChange', startNativeItem, oldStartNativeItem);
    },
    
    setVector: function(vector) {
        Amm.is(vector, 'Amm.Drag.Vector', 'vector');
        vector = this._applyConstraints(vector, this._constraints);
        var oldVector = this._vector;
        if (vector.same(oldVector)) return;
        this._vector = vector;
        this.outVectorChange(vector, oldVector);
        return true;
    },

    getVector: function() { return this._vector; },
    
    outVectorChange: function(vector, oldVector) {
        this._out('vectorChange', vector, oldVector);
    },
    
    setDelta: function(delta) {
        Amm.is(delta, 'Amm.Drag.Vector', 'delta');
        var oldDelta = this._delta;
        delta = this._applyConstraints(delta, this._deltaConstraints);
        if (delta.same(oldDelta)) return;
        this._delta = delta;
        this.outDeltaChange(delta, oldDelta);
        if (!this._vector) this.setVector(delta);
        else this.setVector(this._vector.add(delta));
        return true;
    },

    getDelta: function() { return this._delta; },

    outDeltaChange: function(delta, oldDelta) {
        this._out('deltaChange', delta, oldDelta);
    },

    setTarget: function(target) {
        var oldTarget = this._target;
        if (oldTarget === target) return;
        this._target = target;
        this.outTargetChange(target, oldTarget);
        return true;
    },

    getTarget: function() { return this._target; },

    outTargetChange: function(target, oldTarget) {
        this._out('targetChange', target, oldTarget);
    },

    setTargetNativeItem: function(targetNativeItem) {
        var oldTargetNativeItem = this._targetNativeItem;
        if (oldTargetNativeItem === targetNativeItem) return;
        this._targetNativeItem = targetNativeItem;
        this.outTargetNativeItemChange(targetNativeItem, oldTargetNativeItem);
        return true;
    },

    getTargetNativeItem: function() { return this._targetNativeItem; },

    outTargetNativeItemChange: function(targetNativeItem, oldTargetNativeItem) {
        this._out('targetNativeItemChange', targetNativeItem, oldTargetNativeItem);
    },

    setNativeItem: function(nativeItem) {
        var oldNativeItem = this._nativeItem;
        if (oldNativeItem === nativeItem) return;
        this._nativeItem = nativeItem;
        this.outNativeItemChange(nativeItem, oldNativeItem);
        return true;
    },

    getNativeItem: function() { return this._nativeItem; },

    outNativeItemChange: function(nativeItem, oldNativeItem) {
        this._out('nativeItemChange', nativeItem, oldNativeItem);
    },
    
    setDropPossible: function(dropPossible) {
        var oldDropPossible = this._dropPossible;
        if (oldDropPossible === dropPossible) return;
        this._dropPossible = dropPossible;
        this.outDropPossibleChange(dropPossible, oldDropPossible);
        return true;
    },

    getDropPossible: function() { return this._dropPossible; },

    outDropPossibleChange: function(dropPossible, oldDropPossible) {
        this._out('dropPossibleChange', dropPossible, oldDropPossible);
    },

    setActive: function(active) {
        var oldActive = this._active;
        if (oldActive === active) return;
        this._active = active;
        this.outActiveChange(active, oldActive);
        return true;
    },

    getActive: function() { return this._active; },

    outActiveChange: function(active, oldActive) {
        this._out('activeChange', active, oldActive);
    },
    
    /**
     * Simultaneously chanes nativeItem, dragTarget and targetNativeItem properties,
     * applies delta, and fires all relevant events afterwards (so state of session properties
     * is consistent when accessed from each event handler).
     * 
     * @param {Amm.Drag.Vector} delta
     * @param {Element|null} nativeItem
     * @param {Amm.Element|null} target
     */
    applyDragData: function(delta, nativeItem, target, nativeEventInfo) {
        if (!this._dropEnabled) target = null;
        if (nativeEventInfo) this.nativeEventInfo = nativeEventInfo;
        var oldNativeItem = this._nativeItem;
        var oldDragTarget = this._target;
        var oldTargetNativeItem = this._targetNativeItem;
        var targetNativeItem = target? nativeItem : null;        
        if (!this._dropEnabled) target = null;
        this._target = target;
        this._nativeItem = nativeItem;
        this._targetNativeItem = targetNativeItem;
        if (delta) this.setDelta(delta);
        if (oldNativeItem !== this._nativeItem) {
            this.outNativeItemChange(this._nativeItem, oldNativeItem);
        }
        if (oldDragTarget !== this._target) {
            if (oldDragTarget) {
                oldDragTarget.setDragInfo(null, null, null);
            }
            if (this._target) this._target.setDragInfo(this._source, this._startNativeItem, this._targetNativeItem);
            this.outTargetChange(this._target, oldDragTarget);
            if (oldTargetNativeItem !== this._targetNativeItem) {
                this.outTargetNativeItemChange(this._targetNativeItem, oldTargetNativeItem);
            }
        } else {
            if (oldTargetNativeItem !== this._targetNativeItem) {
                this.outTargetNativeItemChange(this._targetNativeItem, oldTargetNativeItem);
            }
            if (this._target) this._target.setDragInfo(this._source, this._startNativeItem, this._targetNativeItem);
        }
    },
    
    setCursor: function(cursor) {
        var oldCursor = this._cursor;
        if (oldCursor === cursor) return;
        this._cursor = cursor;
        this.outCursorChange(cursor, oldCursor);
        return true;
    },

    getCursor: function() { return this._cursor; },

    outCursorChange: function(cursor, oldCursor) {
        this._out('cursorChange', cursor, oldCursor);
    },
    
    setDropEnabled: function(dropEnabled) {
        var oldDropEnabled = this._dropEnabled;
        if (oldDropEnabled === dropEnabled) return;
        this._dropEnabled = dropEnabled;
        this.outDropEnabledChange(dropEnabled, oldDropEnabled);
        return true;
    },

    getDropEnabled: function() { return this._dropEnabled; },

    outDropEnabledChange: function(dropEnabled, oldDropEnabled) {
        this._out('dropEnabledChange', dropEnabled, oldDropEnabled);
    },

};

Amm.extend(Amm.Drag.Session, Amm.WithEvents);
