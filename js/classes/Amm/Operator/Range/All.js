/* global Amm */

/**
 * Range like $source{*} - returns ALL elements of an array; converts non-arrays to arrays
 * (null => [], undefined => undefined)
 */
Amm.Operator.Range.All = function(source) {
    Amm.Operator.Range.call(this, source);
};

Amm.Operator.Range.All.prototype = {

    'Amm.Operator.Range.All': '__CLASS__', 

    _sourceOperator: null,
    
    _sourceValue: null,
    
    _sourceExists: null,
    
    OPERANDS: ['source'],
    
    supportsAssign: false,

    _doEvaluate: function(again) { 
        var source = this._getOperandValue('source', again);
        if (source === null) return [];
        if (source === undefined) return undefined;
        if (source instanceof Array || source['Amm.Array']) return source;
        return [source];
    },
    
    toFunction: function() {
        var _source = this._operandFunction('source');
        return function(e) {
            var source = _source(e);
            if (source === null) return [];
            if (source === undefined) return undefined;
            if (source instanceof Array || source['Amm.Array']) return source;
            return [source];
        };
    }
    
};

Amm.extend(Amm.Operator.Range.All, Amm.Operator.Range);
