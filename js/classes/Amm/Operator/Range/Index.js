/* global Amm */

/**
 * Range like $source{$index} - returns SINGLE element from an array.
 * If $index is zero (0) and $source is NOT an array, will return the $source
 */
Amm.Operator.Range.Index = function(source, index) {
    Amm.Operator.call(this);
    if (source !== undefined) this._setOperand('source', source);
    if (index !== undefined) this._setOperand('index', index);
};

Amm.Operator.Range.Index.prototype = {

    'Amm.Operator.ScopeElement': '__CLASS__', 

    _sourceOperator: null,
    
    _sourceValue: null,
    
    _sourceExists: null,
    
    _indexOperator: null,
    
    _indexValue: null,
    
    _indexExists: null,
    
    OPERANDS: ['source', 'index'],
    
    // maybe TRUE?
    supportsAssign: false,

    _originEvents: function(origin, oldOrigin) {
        if (oldOrigin && oldOrigin['Amm.Element']) {
            this._unsub(oldOrigin, 'closestComponentChange');
        }
        if (origin && origin['Amm.Element']) {
            this._sub(origin, 'closestComponentChange', this._originComponentChange);
        }
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
        return Amm.Operator.Range._eval(origin, id, range, this._componentOnly);
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
            return Amm.Operator.Range._eval(origin, id, range, componentOnly);
        };
    }
    
};

Amm.extend(Amm.Operator.Range.Index, Amm.Operator);