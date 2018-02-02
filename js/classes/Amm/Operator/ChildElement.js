/* global Amm */

/**
 *  Children element(s) of `element`
 *  Range is either index or '*' (means array will be returned)
 */
Amm.Operator.ChildElement = function(element, id, range, allElements) {
    Amm.Operator.call(this);
    if (element !== undefined) this._setOperand('element', element);
    if (id !== undefined) this._setOperand('id', id);
    if (range !== undefined) this._setOperand('range', range);
    if (allElements !== undefined) this._allElements = !!allElements;
};

Amm.Operator.ChildElement.prototype = {

    'Amm.Operator.ChildElement': '__CLASS__',
    
    // Means if no id is provided, should return all elements
    _allElements: false,
    
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
        if (this._isEvaluating) return;
        if (this._allElements || 
            this._idExists && this._getOperandValue('id') === child.getId()) {
            this.evaluate();
        }
    },
    
    _elementChildRemoved: function(child) {
        if (this._isEvaluating) return;
        if (this._hasValue && (child === this._value || this._value instanceof Array)) {
            this.evaluate();
        }
    },
    
    _elementChildRenamed: function(child, id, oldId) {
        if (this._isEvaluating) return;
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
        return Amm.Operator.ChildElement._eval(element, id, range, this._allElements);
    },
    
    toFunction: function() {
        var _element = this._operandFunction('element');
        var _id = this._operandFunction('id');
        var _range = this._operandFunction('range');
        var _allElements = this._allElements;
        return function(e) {
            return Amm.Operator.ChildElement._eval(_element(e), _id(e), _range(e), _allElements);
        };
    }
    
};

Amm.Operator.ChildElement._eval = function(element, id, range, allElements) {
    var multi = range === '*' || !id && allElements;
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
