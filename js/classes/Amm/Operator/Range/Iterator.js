/* global Amm */

Amm.Operator.Range.Iterator = function(condition, keyVar, valueVar) {
    Amm.Operator.VarsProvider.call(this, condition);
    this.keyVar = keyVar || null;
    this.valueVar = valueVar || null;
};

Amm.Operator.Range.Iterator.prototype = {

    'Amm.Operator.Range.Iterator': '__CLASS__',

    keyVar: null,
    
    valueVar: null,
    
    index: null,
    
    parentContextId: null,
    
    supportsAssign: false,
    
    STATE_SHARED: {
        keyVar: true,
        valueVar: true
    },
    
    setContextIdToDispatchEvent: function(contextId, ev, args) {
        if (ev === 'varsChange' && (args[3] !== this._varsProvider || args[4] !== this._contextState[contextId].parentContextId)) {
            return;
        }
        Amm.Operator.prototype.setContextIdToDispatchEvent.call(this, contextId, ev, args);
    },
    
    _handleProviderVarsChange: function(value, oldValue, name, object, contextId) {
        if (object !== this._varsProvider || contextId !== this.parentContextId) {
            return; // not ours
        }
        Amm.Operator.VarsProvider.prototype._handleProviderVarsChange.call(this, value, oldValue, name, object, this._contextId);
    },
    
    _doEvaluate: function(again) { // converts result to boolean
        var res = this._getOperandValue('operator', again);
        if (res === undefined) return res;
        return !!res;
    }
    
};

Amm.extend(Amm.Operator.Range.Iterator, Amm.Operator.VarsProvider);

