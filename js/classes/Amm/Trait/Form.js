/* global Amm */

Amm.Trait.Form = function(options) {
    Amm.Trait.Field.call(this, options);
};

Amm.Trait.Form.prototype = {

    'Form': '__INTERFACE__',
    
    invalidFieldsMessage: 'lang.Amm.Trait.Form.invalidFieldsMsg',

    /**
     * @type {Amm.Collection}
     */
    fields: null,

    // if also Amm.Trait.Component, adding Field to Component adds it to `fields`
    _elementsToFields: true,

    _displayChildrenToFields: true,

    _childrenToFields: true,
    
    _fieldsUpdateLevel: 0,
    
    _fieldsMap: null,
    
    _fieldsChanged: false,
    
    _lastNum: null,
    
    _beginUpdateFields: function() {
        this._fieldsUpdateLevel++;
    },
    
    _endUpdateFields: function() {
        if (!this._fieldsUpdateLevel) throw "Call to _endUpdateFields() w/o corresponding _beginUpdateFields()";
        this._fieldsUpdateLevel--;
        if (!this._fieldsUpdateLevel && this._fieldsChanged) {
            this._fieldsChanged = false;
            this._recalcFields();
        }
    },

    __augment: function(traitInstance, options) {
        
        var proto = {
            
            indexProperty: 'fieldIndex',
            assocProperty: 'parentModel',
            assocInstance: this,
            assocEvents: {
                fieldNameChange: this._recalcFields,
                fieldValueChange: this._recalcFields,
                fieldAppliedChange: this._recalcFields
            },
            on__spliceItems: [this._recalcFields, this]
            
        };
        
        if ('fieldsPrototype' in options) {
            if (typeof options.fieldsPrototype === 'object' && options.fieldsPrototype) {
                Amm.override(proto, options.fieldsPrototype);
            }
            delete options.fieldsPrototype;
        }
        
        this.fields = new Amm.Collection(proto);
        
        this._beginUpdateFields();
        
        if (this._elementsToFields) this.setElementsToFields(true, true);
        
        if (this._displayChildrenToFields) this.setDisplayChildrenToFields(true, true);
        
        if (this._childrenToFields) this.setChildrenToFields(true, true);
        
        this._endUpdateFields();
        
    },
    
    _recalcFields: function(force) {
        if (this._fieldsUpdateLevel && !force) {
            this._fieldsChanged = true;
            return true;
        }
        this._fieldsChanged = false;
        var newVal = {}, arr = [], idx = 0, hadNames = false, diff = !this._fieldValue, num = 0;
        this._fieldMap = {};
        for (var i = 0, l = this.fields.length; i < l; i++) {
            var p = this.fields[i];
            if (!p.getFieldApplied()) continue;
            num++;
            var v = p.getFieldValue(), n = p.getFieldName();
            if (n === undefined || n === null) {
                arr.push(v);
                newVal[idx] = v;
                this._fieldMap[idx] = p;
                if (!diff && this._fieldValue[idx] !== v) diff = true;
                idx++;
            } else {
                hadNames = true;
                newVal[n] = v;
                this._fieldMap[n] = p;
                if (!diff && this._fieldValue[n] !== newVal[n]) diff = true;
            }
        }
        if (!diff && num === this._lastNum) { // same
            return;
        }
        this._lastNum = num;
        var old = this._fieldValue;
        this._fieldValue = hadNames? newVal : arr;
        this.outFieldValueChange(this._fieldValue, old);
        return true;
    },
    
    _addFields: function(fields) {
        var newFields = fields.slice();
        for (var i = newFields.length - 1; i >= 0; i--) {
            if (newFields[i]['Field'] !== '__INTERFACE__') newFields.splice(i, 1);
        }
        newFields = Amm.Array.arrayDiff(newFields, this.fields);
        if (newFields.length) {
            if (newFields.length > 1) this._beginUpdateFields();
            this.fields.acceptMany(newFields);
            if (newFields.length > 1) this._endUpdateFields();
        }
        return newFields;
    },
    
    _delFields: function(fields) {
        this._beginUpdateFields();
        var oldFields = fields.slice(), res = [];
        for (var i = 0, l = oldFields.length; i < l; i++) {
            if (oldFields[i]['Field'] !== '__INTERFACE__') continue;
            var idx = this.fields.indexOf(oldFields[i]);
            if (idx >= 0) {
                this.fields.removeAtIndex(idx);
                res.push(oldFields[i]);
            }
        }
        this._endUpdateFields();
        return res;
    },
    
    setElementsToFields: function(elementsToFields, force) {
        
        elementsToFields = !!elementsToFields;
        
        var oldElementsToFields = this._elementsToFields;
        if (oldElementsToFields === elementsToFields && !force) return;
        this._elementsToFields = elementsToFields;
        if (!this.fields || this['Component'] !== '__INTERFACE__') return true; // nothing to do

        var m = elementsToFields? 'subscribe' : 'unsubscribe';
        this[m]('acceptedElements', this._handleFieldComponentAcceptedElements, this);
        this[m]('rejectedElements', this._handleFieldComponentRejectedElements, this);
        if (elementsToFields && this._elements.length) this._addFields(this._elements);
        
        return true;
    },
    
    _handleFieldComponentAcceptedElements: function(fields) {
        this._addFields(fields);
    },
    
    _handleFieldComponentRejectedElements: function(fields) {
        this._delFields(fields);
    },

    getElementsToFields: function() { return this._elementsToFields; },

    setDisplayChildrenToFields: function(displayChildrenToFields, force) {
        
        displayChildrenToFields = !!displayChildrenToFields;
        
        var oldDisplayChildrenToFields = this._displayChildrenToFields;
        if (oldDisplayChildrenToFields === displayChildrenToFields && !force) return;
        this._displayChildrenToFields = displayChildrenToFields;
        if (!this.fields || this['DisplayParent'] !== '__INTERFACE__') return true; // nothing to do

        var m = displayChildrenToFields? 'subscribe' : 'unsubscribe';
        this.displayChildren[m]('spliceItems', this._handleFieldDisplayChildrenSpliceItems, this);
        if (displayChildrenToFields && this.displayChildren.length) this._addFields(this.displayChildren);
        
        return true;
    },
    
    _handleFieldDisplayChildrenSpliceItems: function(index, cut, insert) {
        var del = Amm.Array.symmetricDiff(cut, insert);
        var add = Amm.Array.symmetricDiff(insert, cut);
        if (del.length && add.length) this._beginUpdateFields();
        if (del.length) this._delFields(del);
        if (add.length) this._addFields(add);
        if (del.length && add.length) this._endUpdateFields();
   },

    getDisplayChildrenToFields: function() { return this._displayChildrenToFields; },

    setChildrenToFields: function(childrenToFields, force) {
        
        childrenToFields = !!childrenToFields;
        
        var oldChildrenToFields = this._childrenToFields;
        if (oldChildrenToFields === childrenToFields && !force) return;
        this._childrenToFields = childrenToFields;
        if (!this.fields || this['Composite'] !== '__INTERFACE__') return true; // nothing to do
        
        var m = childrenToFields? 'subscribe' : 'unsubscribe';
        this.displayChildren[m]('childAdded', this._handleFieldCompositeChildAdded, this);
        this.displayChildren[m]('childRemoved', this._handleFieldCompositeChildRemoved, this);
        if (childrenToFields && this._children.length) this._addFields(this._children);
        
        return true;
    },
    
    _handleFieldCompositeChildAdded: function(child) {
        this._addFields([child]);
    },
    
    _handleFieldCompositeChildRemoved: function(child) {
        this._delFields([child]);
    },
    
    getChildrenToFields: function() { return this._childrenToFields; },

    _cleanup_Model: function() {    
        this.fields.cleanup();
    },
    
    _acquirePossibleFields: function(arr) {
        pp = [];
        for (var i = 0, l = arr.length; i < l; i++) {
            var item = arr[i];
            if (!(item && item['Field'] === '__INTERFACE__')) continue;
            if (!(item._parentModel || item === this)) continue;
            
            pp.push(item);
        }
        if (pp.length) this.fields.push.apply(this.fields, pp);
    },
    
    getFieldValue: function(key) {
        if (this._fieldValue === undefined) {
            this._recalcFields(true);
        }
        if (key !== undefined) {
            // TODO: support for chaining several keys
            return this._fieldValue[key];
        }
        return this._fieldValue;
    },
    
    setFieldValue: function(value, key) {
        if (!this._fieldMap) this._recalcFields(true);
        // TODO: variable-length arrays aren't supported yet
        // TODO: what to do with extra or missing keys?
        if (key !== undefined) {
            // TODO: support chaining of several keys
            if (this._fieldMap[key]) return this._fieldMap[key].setFieldValue(value);
            else return undefined;
        }
        this._beginUpdateFields();
        if (typeof value !== 'object' || !value) throw "`value` must be a hash or an Array";
        for (var i in value) if (value.hasOwnProperty(i) && this._fieldMap[i]) {
            this._fieldMap[i].setFieldValue(value[i]);
        }
        this._endUpdateFields();
    },
    
    _doValidate: function(errors, value, empty, label) {
        Amm.Trait.Field.prototype._doValidate.call(this, errors, value, empty, label);
        var fieldsHaveErrors = false;
        for (var i = 0, l = this.fields.length; i < l; i++) {
            if (!this.fields[i].validate()) fieldsHaveErrors = true;
        }
        if (fieldsHaveErrors) {
            errors.push(Amm.translate(this.invalidFieldsMessage, '%field', label || Amm.translate('lang.Amm.Trait.Form.form')));
        }
    }

};

Amm.extend(Amm.Trait.Form, Amm.Trait.Field);

Amm.defineLangStrings ({
    'lang.Amm.Trait.Form.invalidFieldsMsg': 'One or more fields of %field are filled with errors',
    'lang.Amm.Trait.Form.form': 'the form',
    
});
