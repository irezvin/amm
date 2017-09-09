/* global Amm */

/**
 *  Locates elements in scope of owner component of `component` and its' parent components.
 *  Range is either index or '*' (means array will be returned)
 */
Amm.Operator.ChildElement = function(element, id, range) {
    Amm.Operator.call(this);
    if (element !== undefined) this._setOperand('element', element);
    if (id !== undefined) this._setOperand('id', id);
    if (range !== undefined) this._setOperand('range', range);
};

Amm.Operator.ChildElement.prototype = {

    'Amm.Operator.ChildElement': '__CLASS__',
    
    _elementOperator: null,
    
    _elementValue: null,
    
    _elementExists: null,
    
    _idOperator: null,
    
    _idValue: null,
    
    _idExists: null,
    
    _rangeOperator: null,
    
    _rangeValue: null,
    
    _rangeExists: null,
    
    OPERANDS: ['element', 'id', 'range'],
    
    _elementEvents: function(element, oldElement) {
        if (oldElement) this._unsub(oldElement);
        if (element) {
            var map = {
                childAdded: this._elementChildAdded,
                childRemoved: this._elementChildRemoved,
                childRenamed: this._elementChildRenamed
            };
            this._sub(element, map);
        }
    },
    
    _elementChildAdded: function(child) {
        if (this._idExists && this._getOperandValue('id') === child.getId()) {
            this.evaluate();
        }
    },
    
    _elementChildRemoved: function(child) {
        if (this._hasValue && child === this._value) {
            this.evaluate();
        }
    },
    
    _elementChildRenamed: function(child, id, oldId) {
        if (this._idExists) {
            var myId = this._getOperandValue('id');
            if (myId === id || myId === oldId)
                this.evaluate();
        }
    },
    
    _doEvaluate: function() {
        var element = this._getOperandValue('element');
        var id = this._getOperandValue('id');
        var range = this._getOperandValue('range');
        return Amm.Operator.ChildElement._eval(element, id, range);
    },
    
    toFunction: function() {
        var _element = this._operandFunction('element');
        var _id = this._operandFunction('id');
        var _range = this._operandFunction('range');
        return function(e) {
            return Amm.Operator.ChildElement._eval(_element(e), _id(e), _range(e));
        };
    }
    
};

Amm.Operator.ChildElement._eval = function(element, id, range) {
    var multi = range === '*';
    var def = multi? [] : undefined;
    var res;
    if (!multi) range = parseInt(range) || 0;
    if (!element || !element['Composite']) return def;
    if (id) {
        res = element.getChild(id);
        if (multi) res = res? [res] : [];
        return res;
    }
    res = element.getChildren();
    return multi? res: res[range];
};


Amm.extend(Amm.Operator.ChildElement, Amm.Operator);