/* global Amm */

/**
 * Range like $source{$index} - returns SINGLE element from an array.
 * If $index is zero (0) and $source is NOT an array, will return the $source
 */
Amm.Operator.Range.RegExp = function(source, regexp) {
    Amm.Operator.Range.call(this);
    if (source !== undefined) this._setOperand('source', source);
    if (regexp !== undefined) this._setOperand('regexp', regexp);
};

Amm.Operator.Range.RegExp.prototype = {

    'Amm.Operator.Range.RegExp': '__CLASS__', 

    _regexpOperator: null,
    
    _regexpValue: null,
    
    _regexpExists: null,
    
    OPERANDS: ['source', 'regexp'],
    
    supportsAssign: false,

    _doEvaluate: function(again) {
        var source = this._getOperandValue('source', again);
        var regexp = this._getOperandValue('regexp', again);
        if (!(source && (source instanceof Array || source['Amm.Array']) && regexp instanceof RegExp))
            return undefined;
        var res = [];
        for (var i = 0, l = source.length; i < l; i++) if (regexp.exec('' + source[i])) {
            res.push(source[i]);
        }
        return res;
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

Amm.extend(Amm.Operator.Range.RegExp, Amm.Operator.Range);
