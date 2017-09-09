/* global Amm */
/* Amm.Extend (Amm.Operator.Builder, Amm.Operator) */

Amm.Operator.Builder = function(expression) {
    this._expression = expression;
};

Amm.Operator.Builder.prototype = {

    _expression: undefined,
    
    build: function(lexType, _) {
        var args = Array.prototype.slice.call(arguments, 1);
        var method = lexType;
        if (!this[method]) throw "Uknown/unsupported lexeme: " + method;
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
        // TODO: support keywords like 'this'
        if (ident === 'this') {
            return this._expression.getThisObject();
        }
        return new Amm.Operator.ScopeElement(
            this._expression.getThisObject(), 
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
        throw "Unknown operator: " + operator;
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
            else throw "Unknown unary operator: '" + operator + "'";
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
    
    ElementAccess: function(component, specifier, range) {
        return new Amm.Operator.ComponentElement(
            this.unConst(component), 
            this.unConst(specifier),
            this.unConst(range)
        );
    },
    
    ChildElement: function(element, id) {
        return new Amm.Operator.ChildElement(
            this.unConst(element), 
            this.unConst(id)
        );
    }
    
};
