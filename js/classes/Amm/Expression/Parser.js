/* global Amm */
//Amm.extend(Amm.Expression.Parser, Amm.Expression);

Amm.Expression.Parser = function() {
};

Amm.Expression.Parser.prototype = {
    
    'Amm.Expression.Parser': '__CLASS__',
    
    /**
     * 1 - whitespace
     * 2 - identifier or reserved word
     * 3 - number
     * 4 - tokens
     */
    tokensRx: /^(?:(\s+)|([_a-zA-Z][_a-zA-Z0-9]*)|(0[xX]?[0-9]+)|([0-9]+(?:\.[0-9+])?(?:e[+-]?[0-9]+)?)|(!!|\?\?|\.\.|::|->>|->|&&|\|\||!==|!=|===|==|>=|<=|=>|[-+\{\}$?!.,:\[\]()'"*/])|(.))/,
    
    regexTokens: /^(?:(\.)|([[\]()\/])|([^\\\[\]()\/]+))/,
    
    regexFlags: /^[a-zA-Z]+/,
    
    stringSingleQuoteRx: /^((?:\\.)|')|[^\\']+/,
    
    stringDoubleQuoteRx: /^((?:\\.)|")|[^\\"]+/,
    
    unescapes: {
        '\\"': '"',
        "\\'": "'",
        "\\n": '\n',
        "\\r": '\r',
        "\\t": '\t',
        "\\v": '\v',
        "\\0": '\0',
        "\\f": '\f',
        "\\\\": '\\'
    },
    
    _lastNonWhitespace: null,
    
    _tokens: undefined,
    
    _pos: 0,
    
    _ignoreWhitespace: true,
    
    _fetches: 0,
    
    /**
     * string - the rest of the buffer without starting quote
     * doubleQuote - starting quote was double quote, not single quote
     * returns array: [result, processed length]
     */
    
    getString: function(string, doubleQuote) {
        var str = '', 
            buf = '' + string,
            quote = doubleQuote? '"' : "'",
            rx = doubleQuote? this.stringDoubleQuoteRx : this.stringSingleQuoteRx;
        while (buf) {
            var match = rx.exec(buf);
            if (!match) throw "Assertion: cannot match string part (shouldn't happen)";
            if (match[1] === quote) {
                break;
            };
            if (match[1]) {
                str += this.unescapes[match[1]] || match[1][1];
            }
                else str += match[0];
            buf = buf.slice(match[0].length);
        }
        return [str, string.length - buf.length];
    },
    
    /**
     * @returns array token [stringRx, Amm.Expression.Token.Type.Regex
     */
    getRegex: function(string) {
        var brackets = false; // we're in square brackets
        var buf = '' + string, res = '';
        var content = '', flags = '';
        var end = false;
        var match;
        var val;
        if (!buf || !buf[0] === '/') return; // not a regex
        res += buf[0];
        buf = buf.slice(1);
        while(buf && !end) {
            match = this.regexTokens.exec(buf);
            if (!match) throw "Assertion - shouldn't happen";
            if (match[2]) {
                if (match[2] === '[' && !brackets) brackets = true;
                else if (match[2] === ']' && brackets) brackets = false;
                else if (match[2] === '/' && !brackets) end = true;
            } 
            if (!end) content += match[0];
            res += match[0];
            buf = buf.slice(match[0].length);
        }
        if (!end) return;
        if (end) {
            match = this.regexFlags.exec(buf);
            if (match) {
                res += match[0];
                flags = match[0];
                buf = buf.slice(match[0]);
            }
        };
        try {
            val = new RegExp(content, flags);
        } catch(e) {
            throw {
                msg: "Cannot parse regex: " + e,
                origException: e,
                pos: 0
            };
        }
        return new Amm.Expression.Token(res, Amm.Expression.Token.Type.REGEXP, val);
    },
    
    /**
     * @returns array [string, tokenId, value]
     */
    getToken: function(string, lastNonWhitespace) {
        lastNonWhitespace = lastNonWhitespace || this._lastNonWhitespace;
        var rx = this.tokensRx.exec(string), id, value;
        if (!rx) {
            throw "Assertion: match next token (shouldn't happen)";
        }
        if (rx[1]) id = Amm.Expression.Token.Type.WHITESPACE;
        else if (rx[2]) id = Amm.Expression.Token.Type.WORD;
        else if (rx[3]) {
            id = Amm.Expression.Token.Type.INTEGER;
            if (rx[3][0] === '0' && (rx[3][1] !== 'x' && rx[3][1] !== 'X'))
                value = parseInt(rx[3], 8);
            else value = parseInt(rx[3]);
            
        }
        else if (rx[4]) {
            id = Amm.Expression.Token.Type.FLOAT;
            value = parseFloat(rx[4]);
        }
        else if (rx[5]) {
            if (rx[5] === '"' || rx[5] === "'") {
                var sc = this.getStringConstantToken(string);
                if (sc) {
                    return sc;
                }
            } else if (rx[5] === '/') {
                if (!lastNonWhitespace || this.regexPossible(lastNonWhitespace)) {
                    var regex = this.getRegex(string);
                    if (regex) return regex;
                }
            }
            id = Amm.Expression.Token.Type.SYMBOL;
        } else if (rx[6]) id = Amm.Expression.Token.Type.ILLEGAL;
        var res = new Amm.Expression.Token(rx[0], id, value);
        return res;
    },
    
    regexPossible: function(lastNonWhitespace) {
        var res = false;
        // TODO: check for keywords like instanceof, typeof etc - if any
        if (lastNonWhitespace.type === Amm.Expression.Token.Type.SYMBOL) res = true;
        return res;
    },
    
    getStringConstantToken: function(string, quote) {
        var quote = string[0];
        var tmp = string.slice(1);
        if ((quote !== "'" && quote !== '"') || !tmp.length) return;
        var double = (quote === '"');
        var str = this.getString(tmp, double);
        var closed = false;
        tmp = tmp.slice(str[1]);
        if (tmp[0] === quote) {
            closed = true;
            tmp = tmp.slice(1);
        }
        if (!closed) {
            throw {
                message: "Unmatched " + (double? 'double' : 'single') + " quote",
                pos: string.length - tmp.length,
                string: string
            };
        };
        var type = double? 
            Amm.Expression.Token.Type.DOUBLE_QUOTED_STRING : 
            Amm.Expression.Token.Type.SINGLE_QUOTED_STRING;
        var res = new Amm.Expression.Token(string.slice(0, string.length - tmp.length), type, str[0]);
        return res;
    },
    
    getAllTokens: function(string) {
        var buf = '' + string, res = [];
        this._lastNonWhitespace = null;
        while (buf.length) {
            try {
                var token = this.getToken(buf);
                if (!token.string.length) throw "WTF";
                buf = buf.slice(token.string.length);
                res.push(token);
                if (token.type !== Amm.Expression.Token.Type.WHITESPACE) {
                    this._lastNonWhitespace = token;
                }
            } catch(e) {
                if (e.pos) {
                    e.pos += (string.length - buf.length);
                    e.string = string;
                } else {
                    e = {
                        message: e,
                        pos: string.length - buf.length,
                        string: string
                    };
                }
                throw e;
            }
        }
        return res;
    },
    
    begin: function(string) {
        this._tokens = this.getAllTokens(string);
        this._pos = -1;
        this._fetches = 0;
    },

    _binaryPriority: [ // from lowest precedence to highest
        ['||'],
        ['&&'],
        ['!==', '===', '!=', '=='],
        ['>', '<', '>=', '<='],
        ['+', '-'],
        ['*', '/']
    ],
    
    genFn: null,
    
    genObj: null,
    
    genOp: function(opType, _) {
        var a = Array.prototype.slice.apply(arguments);
        if (this.genFn) {
            return this.genFn.apply(this.genObj || this, a);
        } else {
            return a;
        }
    },
    
    parseExpression: function() {
        return this.parseConditional();
    },
    
    parseConditional: function() {
        var condition, trueOp, falseOp;
        
        condition = this.parseBinary();
        
        if (!condition) return;
        
        var token = this.fetch();
        if (token && token.isSymbol('?')) {
            trueOp = this.parseExpression();
            if (!trueOp) throw "Expected: expression";
            token = this.fetch();
            if (token && token.isSymbol(':')) {
                falseOp = this.parseExpression();
                if (!falseOp) throw "Expected: expression";
                return this.genOp('Conditional', condition, trueOp, falseOp);
            } else {
                throw "Expected: ':'";
            }
        } else {
            if (token) this.unfetch();
        }
        return condition;
    },
    
    parseBinary: function(level) {
        if (!level) level = 0;
        if (level >= this._binaryPriority.length) {
            return this.parseUnary();
        }
        var left, op, right;
        left = this.parseBinary(level + 1);
        token = this.fetch();
        if (!token) return left;
        if (token.isSymbol(this._binaryPriority[level])) {
            op = token;
            right = this.parseBinary(level);
            if (!right) throw "Expected: binary " + this._binaryPriority[level].join(", ") + " operand";
            return this.genOp('Binary', left, op.string, right);
        }
        this.unfetch();
        return left;
    },
    
    parseUnary: function() {
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('!', '-')) {
            var expr = this.parseUnary();
            if (!expr) throw "Expected: unary";
            return this.genOp('Unary', token.string, expr);
        } else {
            this.unfetch();
            return this.parseItem();
        }
    },
    
    parseList: function() {
        var exps = [];
        exp = this.parseExpression();
        if (!exp) return;
        exps.push(exp);
        do {
            var token = this.fetch();
            if (token.isSymbol(',')) {
                exp = this.parseExpression();
                if (!exp) throw "Expected: expression";
                exps.push(exp);
            } else {
                this.unfetch();
                break;
            }
        } while(1);
        return this.genOp('List', exps);
    },
    
    parseItem: function() {
        var value = this.parseValue();
        var op = this.parseAccessOperator(value);
        if (op) return op;
        return value;
    },
    
    parseAccessOperator: function(value) {
        var sub;
        sub = 
                    this.parseFunctionCall(value)
                ||  this.parsePropertyAccess(value) 
                ||  this.parseElementOrChildAccess(value) 
                ||  this.parseRangeAccess(value);
        if (sub) {
            var right = this.parseAccessOperator(sub);
            if (right) return right;
            return sub;
        }
    },
    
    parseFunctionCall: function(value) {
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('(')) {
            this.unfetch();
            return;
        }
        var args = this.parseList() || [];
        token = this.fetch();
        if (!token || !token.isSymbol(')')) throw "Expected: ')'";
        var cacheability = this.parseCacheabilityModifier();
        return this.genOp('FunctionCall', value, args, cacheability === undefined? null : cacheability);
    },
    
    parsePropertyAccess: function(value) {
        var token = this.fetch();
        var prop;
        var brackets = false;
        var args = null;
        var cacheability = null;
        if (!token) return;
        if (token.isSymbol('.')) {
            var token = this.fetch();
            if (token && token.isIdentifier()) {
                prop = this.genOp('Constant', token.string); // use identifier as constant property name
            } else {
                throw "Expected: identifier";
            }
        } else {
            this.unfetch();
            prop = this.parseSubexpression();
            if (prop) brackets = true;
            else return;
        }
        args = this.parsePropertyArgs();
        cacheability = this.parseCacheabilityModifier();
        return this.genOp('PropertyAccess', value, prop || null, args || null, brackets, cacheability || null);
    },
    
    parseCacheabilityModifier: function() {
         var token = this.fetch();
         if (!token) return;
         if (token.isSymbol('!!', '??')) return this.genOp('CacheabilityModifier', token.string);
         this.unfetch();
    },
    
    parseSubexpression: function() {
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('[')) {
            this.unfetch();
            return;
        }
        var expr = this.parseExpression();
        if (!expr) throw "Expected: expression";
        var token = this.fetch();
        if (!token || !token.isSymbol(']')) throw "Expected: ']'";
        return this.genOp('Subexpression', expr);
    },
    
    parsePropertyArgs: function() {
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('::')) {
            this.unfetch();
            return;
        }
        var isList = false;
        var args = [], arg;
        do {
            token = this.fetch();
            if (!token) break;
            if (token.isSymbol('{')) {
                args = this.parseList();
                if (!args) throw "Expected: list";
                token = this.fetch();
                if (!token || !token.isSymbol('}')) throw "Expected: '}'";
                isList = true;
            } else if (token.isSymbol('::')) {
                arg = this.genOp('Constant', undefined); // skipped item - undefined
            } else if (token.isIdentifier()) {
                arg = this.genOp('Constant', token.string); // use identifier as constant getter arg
            } else {
                this.unfetch();
                break;
            }
            args.push(arg);
        } while(true);
        if (!isList && !args.length) args = [undefined];
        return this.genOp('PropertyArgs', args, isList);
    },
    
    parseElementOrChildAccess: function(value) {    
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('->', '->>')) {
            this.unfetch();
            return;
        }
        var isChild = token.string === '->>';
        var specifier = undefined;
        var rangeOnly = false;
        token = this.fetch();
        if (!(token && (token.isSymbol('{', '[') || token.isIdentifier()))) 
            throw "Expected: identifier, subexpression or range";
        if (token.string === '{') rangeOnly = true;
        if (!rangeOnly && token.isIdentifier()) {
            specifier = this.genOp('Constant', token.string);
        } else {
            this.unfetch();
            if (!rangeOnly) specifier = this.parseSubexpression();
            if (!specifier) throw "Expected: subexpression";
        }
        range = this.parseRange();
        return this.genOp(isChild? 'ChildAccess' : 'ElementAccess', value, specifier, range || null);
    },
    
    parseRangeAccess: function(value) {
        var range = this.parseRange();
        if (range) return this.genOp('RangeAccess', range);
        return;
    },

    // parses [$key =>] $value: construct for ranges
    parseLoopIdentifiers: function() {
        var varName = this.parseVariable();
        var keyName = this.parseVariable();
        if (!varName) return;
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('=>')) {
            keyName = varName;
            varName = this.parseVariable();
            if (!varName) throw "Expected: variable";
            token = this.fetch();
            if (!token || !token.isSymbol(':')) throw "Expected: ':'";
            return this.genOp('LoopIdentifiers', varName, keyName);
        } else if (token.isSymbol(':')) {
            return this.genOp('LoopIdentifiers', varName, null);
        } else {
            this.unfetch();
        }
        
        
    },
    
    parseRange: function() {
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('{')) {
            this.unfetch();
            return;
        }
        var token = this.fetch();
        var rangeType, arg1 = null, arg2 = null;
        if (token.isSymbol('*')) {
            rangeType = 'All';
        } else if (token.isConstant() && token.type === Amm.Expression.Token.Type.INTEGER) {
            rangeType = 'Index';
            arg1 = token;
        } else if (token.isConstant() && token.type === Amm.Expression.Token.Type.REGEXP) {
            rangeType = 'RegExp';
            arg1 = token;
        } else {
            this.unfetch();
            var loopId = this.parseLoopIdentifiers();
            var arg1 = this.parseExpression();
            if (!arg1) throw "Expected: expression";
            if (!loopId) {
                token = this.fetch();
                if (token.isSymbol('..')) {
                    rangeType = 'Slice';
                    arg2 = this.parseExpression();
                } else {
                    this.unfetch();
                    rangeType = 'Expression';
                }
            } else {
                rangeType = 'Expression';
                arg2 = loopId;
            }
        }
        token = this.fetch();
        if (!token || !token.isSymbol('}')) throw "Expected: '}'";
        return this.genOp('Range', rangeType, arg1, arg2);
    },

    parseVariable: function() {
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('$')) { // the variable
            token = this.fetch();
            if (token && token.isIdentifier()) {
                return this.genOp('Variable', token.string);
            } else {
                throw "Expected: identifier";
            }
        } else {
            this.unfetch();
        }
    },
    
    parseValue: function() {
        var variable = this.parseVariable();
        if (variable) return variable;
        var token = this.fetch();
        if (token.isSymbol('(')) { // the sub-expression
            var exp = this.parseExpression();
            if (!exp) throw "Expected: expression";
            token = this.fetch();
            if (!token || !token.isSymbol(')')) throw "Expected: ')'";
            return this.genOp('Parenthesis', exp);
        }
        if (token.isConstant()) { // constant
            return this.genOp('Constant', token.value);
        }
        if (token.isIdentifier()) { // identifier
            var l = token.string.toLowerCase();
            if (l === 'true') return this.genOp('Constant', true);
            if (l === 'false') return this.genOp('Constant', false);
            if (l === 'null') return this.genOp('Constant', null);
            if (l === 'undefined') return this.genOp('Constant', undefined);
            return this.genOp('Identifier', token.string);
        }
        this.unfetch();
    },
    
    unfetch: function() {
        return this.fetch(false, true);
    },
    
    fetch: function(noAdvance, reverse) {
        
        if (this._fetches++ > 1000) throw "Guard: too much fetches (TODO: remove)";
        
        if (!this._tokens) return null;
        var res = null, d = reverse? -1 : 1, p = this._pos;
        do {
            res = this._tokens[p + d] || null;
            if (res || reverse) p = p + d;
        } while (res && (this._ignoreWhitespace && res.type === Amm.Expression.Token.Type.WHITESPACE));
        if ((res || reverse) && !noAdvance) this._pos = p;
        return res;
    },
    
    parse: function(string) {
        var res;
        this.begin(string);
        res = this.parseExpression();
        var token = this.fetch();
        if (token) throw "Expected: eof";
        return res;
    }
    
};
