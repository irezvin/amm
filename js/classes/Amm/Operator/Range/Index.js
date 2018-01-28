/* global Amm */

/**
 * Range like $source{$index} - returns SINGLE element from an array.
 * If $index is zero (0) and $source is NOT an array, will return the $source
 */
Amm.Operator.Range.Index = function(source, index) {
    Amm.Operator.Range.call(this);
    if (source !== undefined) this._setOperand('source', source);
    if (index !== undefined) this._setOperand('index', index);
};

Amm.Operator.Range.Index.prototype = {

    'Amm.Operator.Range.Index': '__CLASS__', 

    _indexOperator: null,
    
    _indexValue: null,
    
    _indexExists: null,
    
    OPERANDS: ['source', 'index'],
    
    supportsAssign: false,

    _doEvaluate: function(again) {
        var source = this._getOperandValue('source', again);
        var index = this._getOperandValue('index', again);
        if (source && (source instanceof Array || source['Amm.Array'])) {
            return source[index];
        }
        if (!index) return source;
        return undefined;
    },
    
    toFunction: function() {
        var _source = this._operandFunction('source');
        var _index = this._operandFunction('index');
        return function(e) {
            var source = _source(e);
            var index = _index(e);
            if (source && (source instanceof Array || source['Amm.Array'])) {
                return source[index];
            }
            if (!index) return source;
            return undefined;
        };
    }
    
};

Amm.extend(Amm.Operator.Range.Index, Amm.Operator.Range);
