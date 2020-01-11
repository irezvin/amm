/* global Amm */
// Amm.extend(Amm.Expression.Token, Amm.Util)

Amm.Expression.Token = function(string, type, value, offset) {
    this.string = string;
    this.type = type;
    this.value = value;
    this.offset = offset;
    var s = this.string.toLowerCase();
    if (Amm.Expression.Token._swappedKeywords[s]) this.string = s;
};

Amm.Expression.Token.Type = {
    WHITESPACE: 1,
    WORD: 2,
    INTEGER: 3,
    FLOAT: 4,
    SYMBOL: 5,
    ILLEGAL: 6,
    SINGLE_QUOTED_STRING: 15,
    DOUBLE_QUOTED_STRING: 16,
    REGEXP: 17
};

Amm.Expression.Token.Keyword = {
    NEW: 'new',
    INSTANCEOF: 'instanceof',
    TYPEOF: 'typeof'
};

Amm.Expression.Token._swappedKeywords = Amm.Util.swapKeysValues(Amm.Expression.Token.Keyword);

Amm.Expression.Token.prototype = {

    string: undefined,
    
    type: undefined,
    
    value: undefined,
    
    offset: undefined,
    
    toArray: function() {
        return [this.string, this.type, this.value];
    },
    
    isSymbol: function(oneOf) {
        if (this.type !== Amm.Expression.Token.Type.SYMBOL) return false;
        if (!oneOf) return true;
        if (oneOf instanceof Array) return Amm.Array.indexOf(this.string, oneOf) >= 0;
        if (arguments.length === 1) return (this.string === oneOf);
        var args = Array.prototype.slice.apply(arguments);
        return Amm.Array.indexOf(this.string, args) >= 0;
    },
    
    isIdentifier: function() {
        return this.type === Amm.Expression.Token.Type.WORD && !Amm.Expression.Token._swappedKeywords[this.string];
    },
    
    isKeyword: function(oneOf) {
        if (!this.type === Amm.Expression.Token.Type.WORD && Amm.Expression.Token._swappedKeywords[this.string]) return false;
        if (!oneOf) return this.string;
        if (oneOf instanceof Array && Amm.Array.indexOf(this.string, oneOf) >= 0) return this.string;
        if (oneOf === this.string) return this.string;
        return false;
    },
    
    isConstant: function() {
        return this.type === Amm.Expression.Token.Type.INTEGER 
            || this.type === Amm.Expression.Token.Type.FLOAT 
            || this.type === Amm.Expression.Token.Type.SINGLE_QUOTED_STRING
            || this.type === Amm.Expression.Token.Type.DOUBLE_QUOTED_STRING
            || this.type === Amm.Expression.Token.Type.REGEXP;
    }
};
