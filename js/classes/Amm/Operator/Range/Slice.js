/* global Amm */

/**
 * Range like $source{$index} - returns SINGLE element from an array.
 * If $index is zero (0) and $source is NOT an array, will return the $source
 */
Amm.Operator.Range.Slice = function(source, start, end) {
    Amm.Operator.Range.call(this);
    if (source !== undefined) this._setOperand('source', source);
    if (start !== undefined) this._setOperand('start', start);
    if (end !== undefined) this._setOperand('end', end);
};

Amm.Operator.Range.Slice.prototype = {

    'Amm.Operator.Range.Slice': '__CLASS__', 

    _startOperator: null,
    
    _startValue: null,
    
    _startExists: null,
    
    OPERANDS: ['source', 'start', 'end'],
    
    supportsAssign: false,

    _doEvaluate: function(again) {
        var source = this._getOperandValue('source', again);
        var start = this._getOperandValue('start', again);
        var end = this._getOperandValue('end', again);
        if (!start && typeof start !== 'number') start = null;
        if (!end && typeof end !== 'number') end = null;
        if (source && (source instanceof Array || source['Amm.Array'])) {
            return source.slice(start, end);
        }        
        return undefined;
    },
    
    toFunction: function() {
        var _source = this._operandFunction('source');
        var _start = this._operandFunction('start');
        var _end = this._operandFunction('end');
        return function(e) {
            var source = _source(e);
            var start = _start(e);
            var end = _end(e);
            if (!start && typeof start !== 'number') start = null;
            if (!end && typeof end !== 'number') end = null;
            if (source && (source instanceof Array || source['Amm.Array'])) {
                return source.slice(start, end);
            }        
            return undefined;
        };
    }
    
};

Amm.extend(Amm.Operator.Range.Slice, Amm.Operator.Range);
