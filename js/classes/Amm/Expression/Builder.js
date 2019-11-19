/* global Amm */
/* Amm.Extend (Amm.Expression.Builder, Amm.Operator) */

/**
 * Converts AST, which was returned by Amm.Expression.Parser, into ready-to-evaluate tree of Amm.Operator instances
 */

Amm.Expression.Builder = function() {
};

Amm.Expression.Builder.prototype = {

    build: function(lexType, _) {
        var args = Array.prototype.slice.call(arguments, 1);
        var method = lexType;
        if (!this[method]) throw Error("Uknown/unsupported lexeme: " + method);
        return this[method].apply(this, args);
    },
    
    decorate: function(subject, beginPos, endPos, src, tokens) {
        if (subject && subject['Amm.Operator']) {
            subject.beginPos = beginPos;
            subject.endPos = endPos;
        }
    },

    configureParser: function(parser) {
        parser.genFn = this.build;
        parser.genObj = this;
        parser.decorateFn = this.decorate;
        parser.decorateObj = this;
    },
    
    const: function(value) {
        if (value && value.Const) return value;
        return {'Const': true, const: value};
    },
    
    unConst: function(value, arr) {
        if (value && value.Const) return value.const;
        if (arr && value instanceof Array) {
            var r = [];
            for (var i = 0, l = value.length; i < l; i++) {
                r.push(this.unConst(value[i]));
            }
            return r;
        }
        return value;
    },
    
    Identifier: function(ident) {
        if (ident === 'this') {
            return new Amm.Operator.ExpressionThis;
        }
        if (ident === 'root') {
            return new Amm.getRoot();
        }
        return new Amm.Operator.ScopeElement(
            new Amm.Operator.ExpressionThis,
            this.unConst(ident)
        );   
    },
    
    Conditional: function(condition, trueValue, falseValue) {
        return new Amm.Operator.Conditional(
            this.unConst(condition), 
            this.unConst(trueValue),
            this.unConst(falseValue)
        );
    },
    
    binaryFn: function(left, operator, right) {
        switch (operator) {
            case '!==': return left !== right;
            case '===': return left === right;
            case '==':  return left === right;
            case '!=':  return left != right;
            case '+':   return left + right;
            case '-':   return left - right;
            case '*':   return left * right;
            case '/':   return left / right;
            case '%':   return left % right;
            case '>':   return left > right;
            case '<':   return left < right;
            case '<=':  return left <= right;
            case '>=':  return left >= right;
        }
        throw Error("Unknown operator: " + operator);
    },
    
    Binary: function(left, operator, right) {
        if (left && left.Const && right && right.Const) {
            return this.const(this.binaryFn(this.unConst(left), operator, this.unConst(right)));
        }
        return new Amm.Operator.Binary(
            this.unConst(left), 
            this.unConst(operator), 
            this.unConst(right)
        );
    },
    
    Unary: function(operator, operand) {
        if (operand.Const) {
            if (operator === '!') return this.const(!this.unConst(operand));
            else if (operator === '-') return this.const(- this.unConst(operand));
            else Error("Unknown unary operator: '" + operator + "'");
        } else {
            return new Amm.Operator.Unary(
                operator, 
                this.unConst(operand)
            );
        }
    },
    
    List: function(arrOperands) {
        return new Amm.Operator.List(this.unConst(arrOperands, true));
    },
    
    Constant: function(value) {
        return this.const(value);
    },
    
    // The problem with function calls is that we have to remember
    // 'this' object! so we have to distinguish between var-function call
    // and property-function call
    FunctionCall: function(value, args, cacheability) {
        if (value && value['Amm.Operator.Property'] && !value.hasArguments()) {
            value.promoteToCall(args, cacheability);
            return value;
        }
        return new Amm.Operator.FunctionCall(this.unConst(value), args, cacheability);
    },
    
    PropertyAccess: function(object, property, args, brackets, cacheability) {
        return new Amm.Operator.Property(
            this.unConst(object), 
            this.unConst(property), 
            this.unConst(args), 
            cacheability
        );
    },
    
    CacheabilityModifier: function(modifier) {
        return modifier === '!!'? true : false;
    },
    
    Subexpression: function(expr) {
        return expr;
    },
    
    Parenthesis: function(expr) {
        return expr;
    },
    
    Variable: function(varName) {
        return new Amm.Operator.Var(varName);
    },
    
    PropertyArgs: function(args, isList) {
        return this.unConst(args, true);
    },
    
    ComponentElement: function(component, specifier, range) {
        return new Amm.Operator.ComponentElement(
            this.unConst(component), 
            this.unConst(specifier),
            this.unConst(range),
            false,
            specifier === undefined
        );
    },
    
    LoopIdentifiers: function(varName, keyName) {
        return {keyVar: keyName, valueVar: varName};
    },
    
    Range: function(rangeType, value, arg1, arg2) {
        var simpleRangeSupport = value && 
                (value['Amm.Operator.ComponentElement'] 
                || value['Amm.Operator.ScopeElement']);
        var res;
        if (rangeType === 'All') {
            if (simpleRangeSupport) {
                value._setOperand('range', '*');
                res = value;
            } else {
                res = new Amm.Operator.Range.All(this.unConst(value));
            }
        } else if (rangeType === 'Index') {
            if (simpleRangeSupport) {
                value._setOperand('range', this.unConst(arg1));
                res = value;
            } else {
                res = new Amm.Operator.Range.Index(this.unConst(value), this.unConst(arg1));
            }
        } else if (rangeType === 'RegExp') {
            res = new Amm.Operator.Range.RegExp(this.unConst(value), this.unConst(arg1));
        } else if (rangeType === 'Slice') {
            res = new Amm.Operator.Range.Slice(this.unConst(value), this.unConst(arg1), this.unConst(arg2));
        } else if (rangeType === 'Condition') {
            // TODO: fall to always-all or always-empty range in case condition (arg1) is constant
            res = new Amm.Operator.Range.Condition(
                this.unConst(value), 
                this.unConst(arg1), 
                this.unConst(arg2.keyVar), 
                this.unConst(arg2.valueVar)
            );
        } else {
            Error("Uknown range type: '" + rangeType + "'");
        }
        if (simpleRangeSupport) {
            if (!value._rangeOperator && value._rangeValue === null) {
                value._setOperand('range', '*');
            }
        }
        return res;
    }
    
};
