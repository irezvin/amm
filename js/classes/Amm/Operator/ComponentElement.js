/* global Amm */

/**
 *  Locates elements in scope of owner component of `component` and its' parent components.
 *  Range is either index or '*' (means array will be returned)
 */
Amm.Operator.ComponentElement = function(component, id, range, componentOnly, allElements) {
    Amm.Operator.call(this);
    this._componentOnly = componentOnly;
    if (component !== undefined) this._setOperand('component', component);
    if (id !== undefined) this._setOperand('id', id);
    if (range !== undefined) this._setOperand('range', range);
    if (allElements !== undefined) this._allElements = !!allElements;
};

Amm.Operator.ComponentElement.prototype = {

    'Amm.Operator.ComponentElement': '__CLASS__', 

    // Searches only components
    _componentOnly: false,
    
    // Means if no id is provided, should return all elements
    _allElements: false,
    
    _componentOperator: null,
    
    _componentValue: null,
    
    _componentExists: null,
    
    _idOperator: null,
    
    _idValue: null,
    
    _idExists: null,
    
    _rangeOperator: null,
    
    _rangeValue: null,
    
    _rangeExists: null,
    
    OPERANDS: ['component', 'id', 'range'],
    
    STATE_SHARED: {
        _componentOnly: true
    },
    
    supportsAssign: false,
    
    getReportsContentChanged: function() {
        return true;
    },

    _componentEvents: function(component, oldComponent) {
        if (oldComponent && oldComponent['Component'])
            this._unsub(oldComponent);
        if (component && component['Component']) {
            var map = {
                acceptedElements: this._acceptedElements,
                rejectedElements: this._rejectedElements,
                renamedElement: this._renamedElement
            };
            if (this._componentOnly) {
                map['childComponentStatusChange'] = this._childComponentStatusChange;
            }
            this._sub(component, map);
        }
    },
    
    _rangeChange: function(range) {
        this._checkArrayChange = range === '*';
    },

    _acceptedElements: function(elements) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._allElements && (!this._idExists || !this._idValue)) return;
        var found = false;
        // only if we have element with interesting id
        for (var i = 0, l = elements.length; i < l; i++) {
            if (elements[i].getId() === this._idValue) {
                found = true;
                break;
            }
        }
        if (found) this.evaluate();
    },
    
    _rejectedElements: function(elements) {
        return this._acceptedElements(elements);
    },
    
    _renamedElement: function(element, id, oldId) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._idExists || !this._idValue) return;
        if (id === this._idValue || oldId === this._idValue) this.evaluate();
    },
    
    _childComponentStatusChange: function(component, status) {
        if (this._isEvaluating) return;
        if (this._allElements) {
            this.evaluate();
            return;
        }
        if (!this._idExists || !this._idValue) return;
        if (component.getId() === this._idValue || component.getInternalId() === this._idValue) this.evaluate();
    },
    
    setComponent: function(component) {
        this._setOperand('component', component);
    },
    
    setId: function(id) {
        this._setOperand('id', id);
    },
    
    _doEvaluate: function(again) {
        var range = this._getOperandValue('range', again);
        var id = this._getOperandValue('id', again);
        var component = this._getOperandValue('component', again);
        return Amm.Operator.ComponentElement._eval(component, id, range, this._componentOnly, this._allElements);
    },
    
    toFunction: function() {
        var _component = this._operandFunction('component');
        var _id = this._operandFunction('id');
        var _range = this._operandFunction('range');
        var componentOnly = this._componentOnly;
        var allElements = this._allElements;
        return function(e) {
            var range = _range(e);
            var id = _id(e);
            var component = _component(e);
            return Amm.Operator.ComponentElement._eval(component, id, range, componentOnly, allElements);
        };
    }
    
};

Amm.Operator.ComponentElement._eval = function(component, id, range, componentOnly, allElements) {
    var multi = range === '*' || !id && allElements;
    var def = multi? [] : undefined;
    if (!component || !component['Component'] || !component.getIsComponent()) return def;
    if (componentOnly) {
        var items;
        if (!id && allElements) items = component.getElements();
            else items = component.getAllNamedElements(id);
        var components = [];
        for (var i = 0; i < items.length; i++) if (items[i]['Component'] && items[i].getIsComponent()) 
            components.push(items[i]);
        return multi? components: components[range];
    }
    if (multi) {
        if (!id && allElements) return component.getElements();
        return component.getAllNamedElements(id);
    }
    return component.getNamedElement(id, range);
};

Amm.extend(Amm.Operator.ComponentElement, Amm.Operator);