/* global Amm */

/**
 *  Locates elements in scope of owner component of `origin` and its' parent components.
 *  Range is either index or '*' (means array will be returned)
 */
Amm.Operator.ScopeElement = function(origin, id, range, componentOnly) {
    Amm.Operator.call(this);
    this._componentOnly = componentOnly;
    if (origin !== undefined) this._setOperand('origin', origin);
    if (id !== undefined) this._setOperand('id', id);
    if (range !== undefined) this._setOperand('range', range);
};

Amm.Operator.ScopeElement.prototype = {

    'Amm.Operator.ScopeElement': '__CLASS__', 

    // Searches only components
    _componentOnly: false,
    
    _originOperator: null,
    
    _originValue: null,
    
    _originExists: null,
    
    _idOperator: null,
    
    _idValue: null,
    
    _idExists: null,
    
    _rangeOperator: null,
    
    _rangeValue: null,
    
    _rangeExists: null,
    
    _component: null,
    
    OPERANDS: ['origin', 'id', 'range'],
    
    supportsAssign: false,

    _originEvents: function(origin, oldOrigin) {
        if (oldOrigin && oldOrigin['Amm.Element'])
            oldOrigin.unsubscribe('closestComponentChange', undefined, this);
        if (origin && origin['Amm.Element'])
            origin.subscribe('closestComponentChange', this._originComponentChange, this);
    },
    
    _originChange: function(origin) {
        if (origin && origin['Amm.Element']) this._setComponent(origin.getClosestComponent());
    },
    
    _originComponentChange: function(component) {
        this._setComponent(component);
    },
    
    _rangeChange: function(range) {
        this._checkArrayChange = range === '*';
    },

    _setComponent: function(component) {
        if (!component) component = null;
        var oldComponent = this._component;
        if (oldComponent === component) return;
        if (oldComponent) {
            oldComponent.unsubscribe('acceptedInScope', this);
            oldComponent.unsubscribe('rejectedInScope', this);
            oldComponent.unsubscribe('renamedInScope', this);
            if (this._componentOnly) {
                oldComponent.unsubscribe('childComponentStatusChangeInScope', this);
            }
        }
        this._component = component;
        if (this._component) {
            var map = {
                acceptedInScope: this._acceptedInScope,
                rejectedInScope: this._rejectedInScope,
                renamedInScope: this._renamedInScope
            };
            if (this._componentOnly) {
                map['childComponentStatusChangeInScope'] = this._childComponentStatusChangeInScope;
            }
            this._sub(component, map);
        }
    },
    
    _acceptedInScope: function(component, elements) {
        if (!this._idExists || !this._idValue || this._isEvaluating) return;
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
    
    _rejectedInScope: function(component, elements) {
        return this._acceptedInScope(component, elements);
    },
    
    _renamedInScope: function(component, element, id, oldId) {
        if (!this._idExists || !this._idValue || this._isEvaluating) return;
        if (id === this._idValue || oldId === this._idValue) this.evaluate();
    },
    
    _childComponentStatusChangeInScope: function(originComponent, component, status) {
        if (!this._idExists || !this._idValue || this._isEvaluating) return;
        if (component.getId() === this._idValue || component.getInternalId() === this._idValue) this.evaluate();
    },
    
    setOrigin: function(origin) {
        this._setOperand('origin', origin);
    },
    
    setId: function(id) {
        this._setOperand('id', id);
    },
    
    _doEvaluate: function(again) {
        var range = this._getOperandValue('range', again);
        var multi = false;
        if (range === '*') multi = true;
            else range = parseInt(range) || 0;
        var id = this._getOperandValue('id', again);
        var def = multi? [] : undefined;
        if (!id) return def;
        var origin = this._getOperandValue('origin', again);
        return Amm.Operator.ScopeElement._eval(origin, id, range, this._componentOnly);
    },
    
    toFunction: function() {
        var _origin = this._operandFunction('origin');
        var _id = this._operandFunction('id');
        var _range = this._operandFunction('range');
        var componentOnly = this._componentOnly;
        return function(e) {
            var range = _range(e);
            var multi = false;
            if (range === '*') multi = true;
                else range = parseInt(range) || 0;
            var id = _id(e);
            var def = multi? [] : undefined;
            if (!id) return def;
            var origin = _origin(e);
            return Amm.Operator.ScopeElement._eval(origin, id, range, componentOnly);
        };
    }
    
};

Amm.Operator.ScopeElement._eval = function(origin, id, range, componentOnly) {
    var multi = range === '*';
    var def = multi? [] : undefined;
    if (!origin || !origin['Amm.Element']) return def;
    var closestComponent = origin.getClosestComponent();
    if (!closestComponent) return def;
    if (componentOnly) {
        var items = closestComponent.getAllNamedElements(id, true), components = [];
        for (var i = 0; i < items.length; i++) if (items[i]['Component'] && items[i].getIsComponent()) 
            components.push(items[i]);
        return multi? components: components[range];
    }
    if (multi) return closestComponent.getAllNamedElements(id, true);
    return closestComponent.getNamedElement(id, range, true);
};

Amm.extend(Amm.Operator.ScopeElement, Amm.Operator);