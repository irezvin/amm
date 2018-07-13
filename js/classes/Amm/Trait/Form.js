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
    
    /**
     * Temporary variable that holds fields' array when setFields() is called 
     * before this.fields collection is created
     */
    _setFormFields: null,

    // if also Amm.Trait.Component, adding Field to Component adds it to `fields`
    _elementsAreFields: true,

    _displayChildrenAreFields: true,

    _childrenAreFields: true,
    
    _fieldsUpdateLevel: 0,
    
    _fieldMap: null,
    
    _setFieldMap: null,
    
    _fieldsChanged: false,
    
    _lastNum: null,
    
    _beginUpdateFields: function() {
        this._fieldsUpdateLevel++;
        this.fields.beginUpdate();
    },
    
    _endUpdateFields: function() {
        if (!this._fieldsUpdateLevel) Error("Call to _endUpdateFields() w/o corresponding _beginUpdateFields()")
        this.fields.endUpdate();
        this._fieldsUpdateLevel--;
        if (!this._fieldsUpdateLevel && this._fieldsChanged) {
            this._fieldsChanged = false;
            this._recalcFields();
        }
    },

    __augment: function(traitInstance, options) {
        
        Amm.Trait.Field.prototype.__augment.call(this, traitInstance, options);
        
        var proto = {
            
            indexProperty: 'fieldIndex',
            assocProperty: 'form',
            assocInstance: this,
            assocEvents: {
                fieldNameChange: this._softRecalc,
                fieldValueChange: this._softRecalc,
                fieldAppliedChange: this._softRecalc,
                needValidateChange: this._fieldNeedValidate,
            },
            on__spliceItems: [this._softRecalc, this]
        };
        
        if (this._setFormFields) {
            proto.items = this._setFormFields.slice();
            this._setFormFields = null;
        }
        
        if ('fieldsPrototype' in options) {
            if (typeof options.fieldsPrototype === 'object' && options.fieldsPrototype) {
                Amm.override(proto, options.fieldsPrototype);
            }
            delete options.fieldsPrototype;
        }
        
        this.fields = new Amm.Collection(proto);
        
        Amm.Element.regInit(this, '99.Amm.Trait.Form', function() {        
            
            this._beginUpdateFields();
        
            if (this._elementsAreFields) this.setElementsAreFields(true, true);
        
            if (this._displayChildrenAreFields) this.setDisplayChildrenAreFields(true, true);
        
            if (this._childrenAreFields) this.setChildrenAreFields(true, true);
        
            this._endUpdateFields();
            
        });
        
    },
    
    _softRecalc: function() {
        this._recalcFields();
    },
    
    _fieldNeedValidate: function(needValidate) {
        this.setNeedValidate(true);
    },
    
    _recalcFields: function(force) {
        if (this._fieldsUpdateLevel && !force) {
            this._fieldsChanged = true;
            return true;
        }
        this._fieldsChanged = false;
        var newVal = {}, arr = [], idx = 0, setIdx = 0, hadNames = false, diff = !this._fieldValue, num = 0;
        this._fieldMap = {};
        this._setFieldMap = {};
        for (var i = 0, l = this.fields.length; i < l; i++) {
            var f = this.fields[i];
            var v = f.getFieldValue(), n = f.getFieldName();
            if (n === undefined || n === null) {
                this._setFieldMap[setIdx] = f;
                setIdx++;
                if (!f.getFieldApplied()) continue;
                num++;
                arr.push(v);
                newVal[idx] = v;
                this._fieldMap[idx] = f;
                if (!diff && this._fieldValue[idx] !== v) diff = true;
                idx++;
            } else {
                this._setFieldMap[n] = f;
                if (!f.getFieldApplied()) continue;
                num++;
                hadNames = true;
                newVal[n] = v;
                this._fieldMap[n] = f;
                if (!diff && this._fieldValue[n] !== newVal[n]) diff = true;
            }
        }
        if (!diff && num === this._lastNum) { // same
            return;
        }
        this._lastNum = num;
        var old = this._fieldValue;
        this._fieldValue = hadNames? newVal : arr;
        if (window.Object && window.Object.freeze) window.Object.freeze(this._fieldValue);
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
    
    _delFields: function(fields, xElements, xChildren, xDisplayChildren) {
        
        var tmpFields = [];
        
        for (var i = 0, l = fields.length; i < l; i++) {
            if (fields[i]['Field'] === '__INTERFACE__') tmpFields.push(fields[i]);
        }        
        
        // exclude items that are in other to-be-included sets
        if (
            xElements 
            && tmpFields.length
            && this._elementsAreFields && this['Component'] 
            && this._elements.length
        ) {
            tmpFields = Amm.Array.arrayDiff(tmpFields, this._elements);
        }
        
        if (
            xChildren 
            && tmpFields.length
            && this._childrenAreFields && this['Composite'] 
            && this._children.length
        ) {
            for (var j = tmpFields.length - 1; j >= 0; j--) {
                var id = tmpFields[j].getId();
                if (this._children[id] === tmpFields[j]) {
                    tmpFields.splice(j, 1);
                }
            }
        }
        
        if (
            xDisplayChildren
            && tmpFields.length
            && this._displayChildrenAreFields && this['DisplayParent'] 
            && this.displayChildren.length
        ) {
            tmpFields = Amm.Array.arrayDiff(tmpFields, this.displayChildren);
        }
            
        if (!tmpFields.length) return;
            
        this._beginUpdateFields();
        var res = [];
        for (var i = 0, l = tmpFields.length; i < l; i++) {
            var idx = this.fields.indexOf(tmpFields[i]);
            if (idx >= 0) {
                this.fields.removeAtIndex(idx);
                res.push(tmpFields[i]);
            }
        }
        this._endUpdateFields();
        return res;
    },
    
    setElementsAreFields: function(elementsAreFields, force) {
        
        elementsAreFields = !!elementsAreFields;
        
        var oldElementsAreFields = this._elementsAreFields;
        if (oldElementsAreFields === elementsAreFields && !force) return;
        this._elementsAreFields = elementsAreFields;
        if (!this.fields || this['Component'] !== '__INTERFACE__') return true; // nothing to do

        var m = elementsAreFields? 'subscribe' : 'unsubscribe';
        this[m]('acceptedElements', this._handleFieldComponentAcceptedElements, this);
        this[m]('rejectedElements', this._handleFieldComponentRejectedElements, this);
        if (this._elements.length) {
            if (elementsAreFields) 
                this._addFields(this._elements);
            else 
                this._delFields(this._elements, false, true, true);
        }
        
        return true;
    },
    
    _handleFieldComponentAcceptedElements: function(fields) {
        this._addFields(fields);
    },
    
    _handleFieldComponentRejectedElements: function(fields) {
        if (this._childrenAreFields && this['Composite'] && this._children.length) {
            fields = Amm.Array.arrayDiff(fields, this._children);
        }
        if (fields.length && this._displayChildrenAreFields && this['DisplayParent']
            && this.displayChildren.length) {
            fields = Amm.Array.arrayDiff(fields, this.displayChildren);
        }
        if (fields.length) this._delFields(fields, false, true, true);
    },

    getElementsAreFields: function() { return this._elementsAreFields; },

    setDisplayChildrenAreFields: function(displayChildrenAreFields, force) {
        
        displayChildrenAreFields = !!displayChildrenAreFields;
        
        var oldDisplayChildrenAreFields = this._displayChildrenAreFields;
        if (oldDisplayChildrenAreFields === displayChildrenAreFields && !force) return;
        this._displayChildrenAreFields = displayChildrenAreFields;
        if (!this.fields || this['DisplayParent'] !== '__INTERFACE__') return true; // nothing to do

        var m = displayChildrenAreFields? 'subscribe' : 'unsubscribe';
        this.displayChildren[m]('spliceItems', this._handleFieldDisplayChildrenSpliceItems, this);
        if (this.displayChildren.length) {
            if (displayChildrenAreFields) 
                this._addFields(this.displayChildren);
            else 
                this._delFields(this.displayChildren, true, true, false);
        }
        
        return true;
    },
    
    _handleFieldDisplayChildrenSpliceItems: function(index, cut, insert) {
        var del = Amm.Array.symmetricDiff(cut, insert);
        var add = Amm.Array.symmetricDiff(insert, cut);
        if (del.length && add.length) this._beginUpdateFields();
        if (del.length) this._delFields(del, true, true, false);
        if (add.length) this._addFields(add);
        if (del.length && add.length) this._endUpdateFields();
   },

    getDisplayChildrenAreFields: function() { return this._displayChildrenAreFields; },

    setChildrenAreFields: function(childrenAreFields, force) {
        
        childrenAreFields = !!childrenAreFields;
        
        var oldChildrenAreFields = this._childrenAreFields;
        if (oldChildrenAreFields === childrenAreFields && !force) return;
        this._childrenAreFields = childrenAreFields;
        if (!this.fields || this['Composite'] !== '__INTERFACE__') return true; // nothing to do
        
        var m = childrenAreFields? 'subscribe' : 'unsubscribe';
        this[m]('childAdded', this._handleFieldCompositeChildAdded, this);
        this[m]('childRemoved', this._handleFieldCompositeChildRemoved, this);
        var c = this.getChildren();
        if (c.length) {
            if (childrenAreFields)
                this._addFields(c);
            else 
                this._delFields(c, true, false, true);
        }
        
        return true;
    },
    
    _handleFieldCompositeChildAdded: function(child) {
        this._addFields([child]);
    },
    
    _handleFieldCompositeChildRemoved: function(child) {
        this._delFields([child], true, false, true);
    },
    
    getChildrenAreFields: function() { return this._childrenAreFields; },

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
    
    setFields: function(fields) {
        
        if (!this.fields) {
            if (!this._setFormFields) this._setFormFields = fields;
            else {
                if (!fields) this._setFormFields = null;
                else if (!(fields instanceof Array || fields['Amm.Array']))
                    throw Error("`fields` must be an Array or Amm.Array");
                this._setFormFields = fields;
            }
            return;
        }
        
        var toDel = Amm.Array.arrayDiff(this.fields, fields);
        var toAdd = Amm.Array.arrayDiff(fields, this.fields);
        if (!toDel.length && !toAdd.length) return;
        this._beginUpdateFields();
        if (toDel.length) this._delFields(toDel, true, true, true);
        if (fields.length) this.fields.acceptMany(fields);
        this._endUpdateFields();
        
    },
    
    getFields: function() {
        
        if (!this.fields) {
            if (!this._setFormFields) this._setFormFields = [];
            return this._setFormFields;
        }
        
        return this.fields;
        
    },
    
    /**
     * locates target field, first key and tail of the key
     * for methods like setFieldValue, getFieldValue
     * 
     * {allArgs} is Arguments of calling function; arg #0 is ignored
     * 
     * returns: [targetField, firstKey, remainingKey]
     */

    _parseKeyArgs: function(start, allArgs, toSet) {
        var key = allArgs[start];
        if (key !== undefined) {
            // we support both setFieldValue(value, ['key', 'subKey']) 
            // and setFieldValue(value, 'key', 'subkey')
            // and even mixed mode: setFieldValue(value, ['key', 'subkey'], 'sub-subkey')
            var fullKey = key, topKey;
            if (allArgs.length > start + 1) {
                if (!(fullKey instanceof Array)) fullKey = [fullKey];
                fullKey = fullKey.concat(Array.prototype.slice.call(allArgs, start + 1));
            }
            if (fullKey instanceof Array) {
                topKey = fullKey.shift();
                if (!fullKey.length) fullKey = undefined;
            } else {
                topKey = fullKey;
                fullKey = undefined;
            }            
            var targetField = toSet? this._setFieldMap[topKey] : this._fieldMap[topKey];
            return [targetField, topKey, fullKey];
        }
    },
    
    setFieldValue: function(value, key) {
        if (!this._fieldMap) this._recalcFields(true);
        // TODO: variable-length arrays aren't supported yet
        // TODO: what to do with extra or missing keys?
        if (key !== undefined) {
            var args = this._parseKeyArgs(1, arguments, true), targetField = args[0];         
            if (targetField)  return targetField.setFieldValue(value, args[2]);
            else return undefined;
        }
        this._beginUpdateFields();
        if (typeof value !== 'object' || !value) throw Error("`value` must be a hash or an Array; provided: " + Amm.describeType(value));
        for (var i in value) if (value.hasOwnProperty(i) && this._setFieldMap[i]) {
            this._setFieldMap[i].setFieldValue(value[i]);
        }
        this._endUpdateFields();
    },
    
    
    // if we will return cached _fieldValue, it will pass === checks
    getFieldValue: function(key) {
        if (this._fieldValue === undefined) {
            this._recalcFields(true);
        }
        if (key === undefined) return this._fieldValue;

        var 
            args = this._parseKeyArgs(0, arguments, false), 
            targetField = args[0], 
            topKey = args[1],
            fullKey = args[2];
    
        var res = this._fieldValue[topKey];
        if (fullKey) {
            do {
                var subKey = fullKey.shift();
                if ((typeof res === 'object') && (res instanceof Array || res) && subKey in res) {
                    res = res[subKey];
                } else {
                    res = undefined;
                }
            } while (fullKey.length);
            if (fullKey.length) res = undefined; // we didn't process whole length
        }
        return res;
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
    'lang.Amm.Trait.Form.form': 'the form'
});
