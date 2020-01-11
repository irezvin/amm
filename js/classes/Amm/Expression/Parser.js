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
    tokensRx: /^(?:(\s+)|([_a-zA-Z][_a-zA-Z0-9]*)|(0[xX]?[0-9]+)|([0-9]+(?:\.[0-9+])?(?:e[+-]?[0-9]+)?)|(!!|\?\?|\.\.|::|->|&&|\|\||!==|!=|===|==|>=|<=|=>|[-&|+><\{\}$?!.,:\[\]()'"%*/])|(.))/,
    
    regexTokens: /^(?:(\.)|([[\]()\/])|([^\\\[n\]()\/]+))/,
    
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
    
    genFn: null,
    
    genObj: null,
    
    decorateFn: null,
    
    decorateObj: null,
    
    src: null,
    
    _lastNonWhitespace: null,
    
    _tokens: undefined,

    _oldPos: 0,    
    
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
            if (!match) Error("Assertion: cannot match string part (shouldn't happen)");
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
     * @returns {Amm.Expression.Token} 
     * string: regex definition; type: REGEXP; value: {RegExp}
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
            if (!match) Error("Assertion - shouldn't happen");
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
            Error("Assertion: match next token (shouldn't happen)");
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
        var _offset = 0;
        var buf = '' + string, res = [];
        var e;
        this._lastNonWhitespace = null;
        while (buf.length) {
            try {
                var token = this.getToken(buf);
                token.offset = _offset;
                if (!token.string.length) Error("WTF");
                buf = buf.slice(token.string.length);
                _offset += token.string.length;
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
        ['*', '/', '%']
    ],
    
    genOp: function(opType, _) {
        var a = Array.prototype.slice.apply(arguments);
        var res;
        if (this.genFn) {
            res = this.genFn.apply(this.genObj || this, a);
        } else {
            res = a;
        }
        if (this.decorateFn) {
            var _o = this._oldPos + 1;
            var tokens = this._tokens.slice(_o, this._pos + 1);
            if (tokens.length) {
                var lastToken = tokens[tokens.length - 1];
                var i = 0;
                if (this._ignoreWhitespace) {
                    while (tokens[i].type === Amm.Expression.Token.Type.WHITESPACE) {
                        i++;
                    }
                }
                var firstToken = tokens[i];
                var beginPos = firstToken.offset;
                var endPos = lastToken.offset + lastToken.string.length;
                this.decorateFn.call(this.decorateObj || this, res, beginPos, endPos, this.src, tokens.slice(i));
            }
        }
        return res;
    },
    
    parseExpression: function() {
        return this.parsePart('Conditional');
    },
    
    parseConditional: function() {
        var condition, trueOp, falseOp;
        
        condition = this.parsePart('Binary');
        
        if (!condition) return;
        
        var token = this.fetch();
        if (token && token.isSymbol('?')) {
            trueOp = this.parsePart('Expression');
            if (!trueOp) Error("Expected: expression");
            token = this.fetch();
            if (token && token.isSymbol(':')) {
                falseOp = this.parsePart('Expression');
                if (!falseOp) Error("Expected: expression");
                return this.genOp('Conditional', condition, trueOp, falseOp);
            } else {
                Error("Expected: ':'");
            }
        } else {
            if (token) this.unfetch();
        }
        return condition;
    },
    
    parseBinary: function(level) {
        if (!level) level = 0;
        if (level >= this._binaryPriority.length) {
            return this.parsePart('Unary');
        }
        var left, op, right;
        left = this.parsePart('Binary', level + 1);
        var token = this.fetch();
        if (!token) return left;
        if (token.isSymbol(this._binaryPriority[level])) {
            op = token;
            right = this.parsePart('Binary', level);
            if (!right) Error("Expected: binary " + this._binaryPriority[level].join(", ") + " operand");
            return this.genOp('Binary', left, op.string, right);
        }
        this.unfetch();
        return left;
    },
    
    parseUnary: function() {
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('!', '-', '!!')) {
            var expr = this.parsePart('Unary');
            if (!expr) Error("Expected: unary");
            return this.genOp('Unary', token.string, expr);
        } else {
            this.unfetch();
            return this.parsePart('New');
        }
    },
    
    parseList: function() {
        var exps = [], exp;
        exp = this.parsePart('Expression');
        if (!exp) return;
        exps.push(exp);
        do {
            var token = this.fetch();
            if (token.isSymbol(',')) {
                exp = this.parsePart('Expression');
                if (!exp) Error("Expected: expression");
                exps.push(exp);
            } else {
                this.unfetch();
                break;
            }
        } while(1);
        return this.genOp('List', exps);
    },
    
    parseNew: function() {
        var token = this.fetch();
        if (!token.isKeyword(Amm.Expression.Token.Keyword.NEW)) {
            this.unfetch();
            return this.parsePart('Item');
        }
        var op = this.parseNew();
        if (!op) op = this.parsePart('Item');
        if (!op) throw Error("Expected: new or value");
        return this.genOp('New', op);
    },
    
    parseItem: function() {
        var value = this.parsePart(true, 'Value');
        var op = this.parsePart(true, 'AccessOperator', value);
        if (op) return op;
        return value;
    },
    
    parseAccessOperator: function(value) {
        var sub;
        sub = 
                    this.parsePart(true, 'FunctionCall', value)
                ||  this.parsePart(true, 'PropertyAccess', value) 
                ||  this.parsePart(true, 'ComponentElement', value) 
                ||  this.parsePart(true, 'Range', value);
        
        if (sub) {
            var right = this.parsePart(true, 'AccessOperator', sub);
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
        var args = this.parsePart('List') || [];
        token = this.fetch();
        if (!token || !token.isSymbol(')')) Error("Expected: ')'");
        var cacheability = this.parsePart('CacheabilityModifier');
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
            var tmp = this._oldPos;
            this._oldPos = this._pos;
            var token = this.fetch();
            if (token && token.isIdentifier()) {
                prop = this.genOp('Constant', token.string); // use identifier as constant property name
            } else {
                this._oldPos = tmp;
                Error("Expected: identifier");
            }
            this._oldPos = tmp;
        } else {
            this.unfetch();
            prop = this.parsePart('Subexpression');
            if (prop) brackets = true;
            else return;
        }
        args = this.parsePart('PropertyArgs');
        cacheability = this.parsePart('CacheabilityModifier');
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
        var expr = this.parsePart('Expression');
        if (!expr) Error("Expected: expression");
        var token = this.fetch();
        if (!token || !token.isSymbol(']')) Error("Expected: ']'");
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
                args = this.parsePart('List');
                if (!args) Error("Expected: list");
                token = this.fetch();
                if (!token || !token.isSymbol('}')) Error("Expected: '}'");
                isList = true;
                break;
            } else if (token.isSymbol('::')) {
                arg = this.genOp('Constant', undefined); // skipped item - undefined
            } else if (token.isIdentifier()) {
                arg = this.genOp('Constant', token.string); // use identifier as constant getter arg
            } else if (token.isConstant()) {
                arg = this.genOp('Constant', token.value);
            } else {
                this.unfetch();
                break;
            }
            args.push(arg);
        } while(true);
        if (!isList && !args.length) args = [undefined];
        return this.genOp('PropertyArgs', args, isList);
    },

    parseComponentElement: function(value) {    
        var token = this.fetch();
        if (!token) return;
        if (!token.isSymbol('->')) {
            this.unfetch();
            return;
        }
        var specifier = undefined;
        var rangeOnly = false;
        token = this.fetch();
        if (!(token && (token.isSymbol('{', '[') || token.isIdentifier()))) 
            Error("Expected: identifier, subexpression or range");
        if (token.string === '{') {
            rangeOnly = true;
        }
        if (!token.isIdentifier()) this.unfetch();
        if (!rangeOnly && token.isIdentifier()) {
            specifier = this.genOp('Constant', token.string);
        } else {
            if (!rangeOnly) {
                specifier = this.parsePart('Subexpression');
                if (!specifier) {
                    Error("Expected: subexpression");
                }
            }
        }
        var op = this.genOp('ComponentElement', value, specifier, null);
        var range = this.parsePart('Range', op);
        return range || op;
    },
    
    // parses [$key =>] $value: construct for ranges
    parseLoopIdentifiers: function() {
        var varName = this.parsePart('Variable', true);
        var keyName;
        if (!varName) return;
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('=>')) {
            keyName = varName;
            token = this.fetch();
            if (token.isSymbol(':')) {
                varName = null; // we have key name but not var name
            } else {
                this.unfetch();
                varName = this.parsePart('Variable', true);
                if (!varName) Error("Expected: variable");
                token = this.fetch();
                if (!token || !token.isSymbol(':')) Error("Expected: ':'");
            }
            return this.genOp('LoopIdentifiers', varName, keyName);
        } else if (token.isSymbol(':')) {
            return this.genOp('LoopIdentifiers', varName, null);
        } else {
            this.unfetch();
            if (varName) { // un-fetch fetched variable
                this.unfetch();
                this.unfetch();
            } 
        }
    },
    
    parseRange: function(value) {
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
            arg1 = this.genOp('Constant', token.value);
        } else if (token.isConstant() && token.type === Amm.Expression.Token.Type.REGEXP) {
            rangeType = 'RegExp';
            arg1 = this.genOp('Constant', token.value);
        } else {
            if (token.isSymbol('..')) { // first item of range skipped
                rangeType = 'Slice';
                arg1 = null;
                token = this.fetch();
                if (token.isSymbol('}')) {
                    arg2 = null;
                    this.unfetch();
                    // note: { .. } is NOT same as { * }, because { .. } returns a COPY of array contents
                } else {
                    this.unfetch();
                    arg2 = this.parsePart('Expression');
                }
            } else {
                this.unfetch();
                var loopId = this.parsePart('LoopIdentifiers');
                var arg1 = this.parsePart('Expression');
                if (!arg1) {
                    Error("Expected: expression");
                }
                if (loopId) { // {loopIdentifiers expression} is Condition
                    rangeType = 'Condition';
                    arg2 = loopId;
                } else {
                    token = this.fetch();
                    if (token.isSymbol('..')) { // {expression..}
                        rangeType = 'Slice';
                        arg2 = this.parsePart('Expression');
                    } else { // {expression} is Index
                        this.unfetch();
                        rangeType = 'Index';
                    }
                }
            }
        }
        token = this.fetch();
        if (!token || !token.isSymbol('}')) Error("Expected: '}'");
        return this.genOp('Range', rangeType, value, arg1, arg2);
    },

    parseVariable: function(getNameOnly) {
        var token = this.fetch();
        if (!token) return;
        if (token.isSymbol('$')) { // the variable
            token = this.fetch();
            if (token && token.isIdentifier()) {
                if (getNameOnly) return this.genOp('Constant', token.string);
                return this.genOp('Variable', token.string);
            } else {
                Error("Expected: identifier");
            }
        } else {
            this.unfetch();
        }
    },
    
    parseValue: function() {
        var variable = this.parsePart('Variable');
        if (variable) return variable;
        var token = this.fetch();
        if (token.isSymbol('(')) { // the sub-expression
            var exp = this.parsePart('Expression');
            if (!exp) Error("Expected: expression");
            token = this.fetch();
            if (!token || !token.isSymbol(')')) Error("Expected: ')'");
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
        
        if (this._fetches++ > 10000) Error("Guard: too much fetches (TODO: remove)");
        if (!this._tokens) return null;
        var res = null, d = reverse? -1 : 1, p = this._pos;
        do {
            res = this._tokens[p + d] || null;
            if (res || reverse) p = p + d;
        } while (res && (this._ignoreWhitespace && res.type === Amm.Expression.Token.Type.WHITESPACE));
        if ((res || reverse) && !noAdvance) this._pos = p;
        return res;
    },

    // Has optional first argument "true" - don't save offset
    parsePart: function(part, args_) {
        var args = Array.prototype.slice.call(arguments, 1);
        var res;
        var dontSaveOffset = false;
        if (part === true) {
            dontSaveOffset = true;
            part = args.shift();
        }
        if (!part) Error("`part` is required to be non-empty string");
        var method = 'parse' + part;
        if (typeof this[method] !== 'function') Error("Amm.Expression.Parser: no such method: '" + method + "'");
        if (part === 'Part') Error("WTF");
        var tmp = this._oldPos;
        if (!dontSaveOffset) this._oldPos = this._pos;
        if (!args.length) {
            res = this[method]();
        } else if (args.length === 1) {
            res = this[method](args[0]);
        } else {
            res = this[method].apply(this, args);
        }
        if (!dontSaveOffset) this._oldPos = tmp;
        return res;
    },
    
    parse: function(string) {
        var res;
        this.src = string;
        this._oldPos = 0;
        this.begin(string);
        res = this.parsePart('Expression');
        var token = this.fetch();
        if (token) Error("Expected: eof");
        return res;
    }
    
};
