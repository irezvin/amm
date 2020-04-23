/* global Amm */


Amm.Trait.Data = function() {
};

Amm.Trait.Data.UPDATE_VALIDATE = 'validate';
Amm.Trait.Data.UPDATE_CHANGE = 'change';
Amm.Trait.Data.UPDATE_BLUR = 'blur';
Amm.Trait.Data.UPDATE_NEVER = 'never';

Amm.Trait.Data.LOCK_NEVER = 0;
Amm.Trait.Data.LOCK_DURING_TRANSACTION = 1;
Amm.Trait.Data.LOCK_WITHOUT_PROPERTY = 2;

Amm.Trait.Data._revDataUpdate = {
    validate: 'UPDATE_VALIDATE',
    change: 'UPDATE_CHANGE',
    blur: 'UPDATE_BLUR',
    never: 'UPDATE_NEVER',
};

Amm.Trait.Data.prototype = {

    'Data': '__INTERFACE__',

    _dataObject: undefined,

    _dataProperty: undefined,

    _dataHasProperty: undefined,

    _dataValue: undefined,

    _dataSyncAnnotations: true,

    _dataUpdateMode: undefined,

    _dataParent: undefined,
    
    _dataSyncWithField: undefined,
    
    _dataSyncProperties: null,
    
    _subDataObject: null,
    
    _subDataProperty: null,
    
    _dataObjectUpdating: 0,
    
    _dataControlUpdating: 0,
    
    _dataLockMode: Amm.Trait.Data.LOCK_DURING_TRANSACTION | Amm.Trait.Data.LOCK_WITHOUT_PROPERTY,
    
    _dataModified: undefined,
    
    __augment: function(traitInstance, options) {
        
        this._dataSyncProperties = {
            dataObject: this._dataObject === undefined,
            dataProperty: this._dataProperty === undefined,
            dataParent: this._dataParent === undefined
        };
        
        Amm.Element.regInit(this, 'aa.Amm.Trait.Data', this._initDataSync);
    },
    
    _initDataSync: function() {
        if (this._dataSyncWithField === undefined) {
            this.setDataSyncWithField(this['Field'] === '__INTERFACE__');
            if (this._dataUpdateMode === undefined) {
                if (this['Field'] === '__INTERFACE__') {
                    this._dataUpdateMode = Amm.Trait.Data.UPDATE_VALIDATE;
                } else {
                    this._dataUpdateMode = Amm.Trait.Data.UPDATE_CHANGE;
                }
            }
        }
        if (this._dataProperty === undefined) this._dataSyncProperty();
        if (this._dataParent === undefined) this._dataSyncParent();
        if (this['Focusable'] === '__INTERFACE__') {
            this.subscribe('focusedChange', this._handleSelfDataFocusedChange, this);
        }
        this._dataUpdateModified();
        this._dataUpdateLock();

    },
    
    _setComponent_Data: function(component) {
        this._dataSyncParent();
    },
    
    _setForm_Data: function(form) {
        this._dataSyncParent();
    },
    
    _setId_Data: function() {
        this._dataSyncProperty();
    },
    
    _fieldNameChange_Data: function() {
        this._dataSyncProperty();
    },
    
    _dataSyncParent: function() {
        if (!this._dataSyncProperties.dataParent) return;
        var value = null;
        if (this._dataSyncWithField && this._form && this._form['Data'] === '__INTERFACE__') {
            value = this._form;
        } else if (this._component && this._component['Data'] === '__INTERFACE__') {
            value = this._component;
        }
        this.setDataParent(value, true);
    },
    
    _dataSyncProperty: function() {
        var value = null;
        if (!this._dataSyncProperties.dataProperty) return;
        if (this._dataSyncWithField && this.getFieldName()) {
            value = this.getFieldName();
        } else if (this._id) {
            value = this._id;
        }
        this.setDataProperty(value, true);
    },
    
    _dataSyncObject: function() {
        var value = null;
        if (!this._dataSyncProperties.dataObject) return;
        if (this._dataParent) {
            if (this._dataParent.getDataProperty()) {
                value = this._dataParent.getDataValue();
            } else {
                value = this._dataParent.getDataObject();
            }
        }
        if (!value) value = null;
        this.setDataObject(value, true);
    },
    
    setDataParent: function(dataParent, isSync) {
        var oldDataParent = this._dataParent;
        if (oldDataParent === dataParent) return;
        if (!isSync) this._dataSyncProperties.dataParent = (dataParent === undefined);
        if (oldDataParent) {
            oldDataParent.unsubscribe('dataObjectChange', this._dataSyncObject, this);
            oldDataParent.unsubscribe('dataValueChange', this._dataSyncObject, this);
        }
        this._dataParent = dataParent;
        if (dataParent) {
            dataParent.subscribe('dataObjectChange', this._dataSyncObject, this);
            dataParent.subscribe('dataValueChange', this._dataSyncObject, this);
        }
        this._dataSyncObject();
        this.outDataParentChange(dataParent, oldDataParent);
        return true;
    },

    getDataParent: function() { return this._dataParent; },
    
    outDataParentChange: function(dataParent, oldDataParent) {
        this._out('dataParentChange', dataParent, oldDataParent);
    },

    setDataObject: function(dataObject, isSync) {
        if (dataObject) Amm.is(dataObject, 'Amm.Data.Model', dataObject);
        else if (dataObject !== undefined) dataObject = null;
        
        var oldDataObject = this._dataObject;
        if (oldDataObject === dataObject) return;
        this._dataObject = dataObject;
        if (oldDataObject) {
            oldDataObject.mm.unsubscribe('propertiesChanged', this._dataCheckProperty, this);
            oldDataObject.mm.unsubscribe('errorsChange', this._handleDataErrorsChange, this);
            if (oldDataObject['Amm.Data.Record']) {
                oldDataObject.mm.unsubscribe('transactionChange', this._handleDataTransactionChange, this);
            }
            oldDataObject.mm.unsubscribe('modifiedChange', this._dataUpdateModified, this);
            oldDataObject.mm.unsubscribe('metaChange', this._handleDataMetaChange, this);
        }
        if (!isSync) this._dataSyncProperties.dataObject = (dataObject === undefined);
        if (dataObject) {
            dataObject.mm.subscribe('propertiesChanged', this._dataCheckProperty, this);
            dataObject.mm.subscribe('errorsChange', this._handleDataErrorsChange, this);
            if (dataObject['Amm.Data.Record']) {
                dataObject.mm.subscribe('transactionChange', this._handleDataTransactionChange, this);
            }
            dataObject.mm.subscribe('modifiedChange', this._dataUpdateModified, this);
            dataObject.mm.subscribe('metaChange', this._handleDataMetaChange, this);
        }
        this.outDataObjectChange(dataObject, oldDataObject);
        this._dataUpdateModified();
        this._dataUpdateLock();
        this._dataCheckProperty();
        this._dataSyncMeta();
        this._dataSyncErrors();
        return true;
    },

    getDataObject: function() { return this._dataObject; },

    outDataObjectChange: function(dataObject, oldDataObject) {
        this._out('dataObjectChange', dataObject, oldDataObject);
    },
    
    _handleDataTransactionChange: function() {
        this._dataUpdateLock();
    },
    
    _handleDataErrorsChange: function(e) {
        this._dataSyncErrors();
    },
    
    _dataSyncErrors: function() {
        var error = null;
        var sync = this._dataSyncWithField || this['Annotated'] === '__INTERFACE__';
        if (!sync) return;
        if (this._dataHasProperty) error = this._dataObject.mm.getErrors(this._dataProperty);
        if (this._dataSyncWithField) {
            this.setFieldRemoteErrors(error);
        } else {
            this.setError(error);
        }
    },
    
    _handleDataMetaChange: function(meta, oldMeta, field, metaProperty, value, oldValue) {
        if (!this._dataHasProperty) return;
        if (!field || field === this._dataProperty) {
            this._dataSyncMeta(meta[this._dataProperty]);
        }
    },
    
    _dataSyncMeta: function(meta) {
        if (!this._dataHasProperty || !this._dataSyncAnnotations) return;
        if (!meta) meta = this._dataObject.mm.getMeta(this._dataProperty);
        var _syncField = this._dataSyncWithField;
        if (_syncField) {
            this.setFieldLabel(meta.label);
            this.setFieldRequired(meta.required);
        } else if (this['Annotated'] === '__INTERFACE__') {
            if (!_syncField) {
                this.setLabel(meta.label);
                this.setRequired(meta.required);
            }
            this.setDescription(meta.description, 'description');
        }
    },
    
    setDataProperty: function(dataProperty) {
        var oldDataProperty = this._dataProperty;
        if (oldDataProperty === dataProperty) return;
        this._dataProperty = dataProperty;
        this.outDataPropertyChange(dataProperty, oldDataProperty);
        this._dataCheckProperty();
        return true;
    },

    getDataProperty: function() { return this._dataProperty; },

    outDataPropertyChange: function(dataProperty, oldDataProperty) {
        this._out('dataPropertyChange', dataProperty, oldDataProperty);
    },
    
    _dataCheckProperty: function() {
        var hasField = false;
        if (this._dataObject && this._dataProperty) {
            hasField = Amm.detectProperty(this._dataObject, this._dataProperty);
        }
        var properlySubscribed =
                    this._subDataObject === this._dataObject
                &&  this._subDataProperty === this._dataProperty;
        
        if (this._subDataObject && !properlySubscribed) {
            this._subDataObject.unsubscribe(this._subDataProperty + 'Change', 
                this._handleDataValueChange, this);
            this._subDataObject = null;
            this._subDataProperty = null;
        }
        if (hasField && !properlySubscribed) {
            this._subDataObject = this._dataObject;
            this._subDataProperty = this._dataProperty;
            this._subDataObject.subscribe(this._subDataProperty + 'Change', 
                this._handleDataValueChange, this);
            this._dataObjectUpdating++;
            this.setDataValue(this._subDataObject[this._subDataProperty]);
            this._dataObjectUpdating--;
        }
        this.setDataHasProperty(hasField);
    },
    
    _handleDataValueChange: function(dataValue) {
        this._dataObjectUpdating++;
        this.setDataValue(dataValue);
        this._dataUpdateModified();        
        this._dataObjectUpdating--;
    },
    
    setDataHasProperty: function(dataHasProperty) {
        dataHasProperty = !!dataHasProperty;
        var oldDataHasProperty = this._dataHasProperty;
        if (oldDataHasProperty === dataHasProperty) return;
        this._dataHasProperty = dataHasProperty;
        this._dataUpdateLock();
        this._dataUpdateModified();
        this.outDataHasPropertyChange(dataHasProperty, oldDataHasProperty);
        if (dataHasProperty) {
            this._dataUpdateValueSync();
            this._dataSyncMeta(this._dataObject.mm.getMeta(this._dataProperty));
        }
        return true;
    },

    getDataHasProperty: function() { return this._dataHasProperty; },

    outDataHasPropertyChange: function(dataHasProperty, oldDataHasProperty) {
        this._out('dataHasPropertyChange', dataHasProperty, oldDataHasProperty);
    },

    setDataValue: function(dataValue, force) {
        var oldDataValue = this._dataValue;
        if (oldDataValue === dataValue && !force) return;
        this._dataValue = dataValue;
        if (!this._dataObjectUpdating && this._dataHasProperty) {
            this._dataObject[this._dataProperty] = dataValue;
        }
        if (!this._dataControlUpdating) {
            if (this._dataSyncWithField) this.setFieldValue(dataValue);
            else this.setValue(dataValue);
        }
        if (!force || (oldDataValue !== dataValue)) {
            this.outDataValueChange(dataValue, oldDataValue);
        }
        return true;
    },

    getDataValue: function() { return this._dataValue; },

    outDataValueChange: function(dataValue, oldDataValue) {
        this._out('dataValueChange', dataValue, oldDataValue);
    },

    setDataSyncAnnotations: function(dataSyncAnnotations) {
        dataSyncAnnotations = !!dataSyncAnnotations;
        var oldDataSyncAnnotations = this._dataSyncAnnotations;
        if (oldDataSyncAnnotations === dataSyncAnnotations) return;
        this._dataSyncAnnotations = dataSyncAnnotations;
        if (dataSyncAnnotations && this._dataHasProperty) {
            this._dataSyncMeta(this._dataObject.mm.getMeta(this._dataProperty));
        }
        return true;
    },

    getDataSyncAnnotations: function() { return this._dataSyncAnnotations; },

    setDataUpdateMode: function(dataUpdateMode) {
        if (!Amm.Trait.Data._revDataUpdate[dataUpdateMode]) 
            throw Error("dataUpdateMode must be one of Amm.Trait.Data.UPDATE_*");
        var oldDataUpdateMode = this._dataUpdateMode;
        if (oldDataUpdateMode === dataUpdateMode) return;
        this._dataUpdateMode = dataUpdateMode;
        this._dataSyncUpdateMode();
        return true;
    },
    
    getDataUpdateMode: function() {
        return this._dataUpdateMode;
    },

    setDataSyncWithField: function(dataSyncWithField) {
        dataSyncWithField = !!dataSyncWithField;
        if (dataSyncWithField && (this['Field'] !== '__INTERFACE__')) {
            throw Error("Need Field trait to enable data sync with field");
        }
        var oldDataSyncWithField = this._dataSyncWithField;
        if (oldDataSyncWithField === dataSyncWithField) return;
        this._dataSyncWithField = dataSyncWithField;
        this._dataUpdateValueSync();
        return true;
    },
    
    _dataUpdateValueSync: function() {        
        var hasValueEvent = typeof this.outValueChange === 'function';
        var isField = this['Field'] === '__INTERFACE__';
        if (this._dataSyncWithField) {
            if (hasValueEvent) {
                this.unsubscribe('valueChange', this._handleSelfControlValueChange, this);
            }
            this.subscribe('fieldValueChange', this._handleSelfControlValueChange, this);
            this.subscribe('afterFieldValidate', this._handleSelfDataAfterFieldValidate, this);
        } else {
            if (hasValueEvent) {
                this.subscribe('valueChange', this._handleSelfControlValueChange, this);
            }
            if (isField) {
                this.unsubscribe('fieldValueChange', this._handleSelfControlValueChange, this);
                this.unsubscribe('afterFieldValidate', this._handleSelfDataAfterFieldValidate, this);
            }
        }
    },

    getDataSyncWithField: function() { return this._dataSyncWithField; },
    
    _updateDataValueFromControl: function(value) {
        this._dataControlUpdating++;
        if (!arguments.length) {
            value = this._dataSyncWithField? this.getFieldValue() : this.getValue();
        }
        this.setDataValue(value);
        this._dataControlUpdating--;
    },
    
    _handleSelfDataAfterFieldValidate: function(valid) {
        if (this._dataUpdateMode === Amm.Trait.Data.UPDATE_VALIDATE && valid) {
            this._updateDataValueFromControl();
        }
    },
    
    _handleSelfControlValueChange: function(value) {
        if (this._dataObjectUpdating) return;
        if (this._dataUpdateMode === Amm.Trait.Data.UPDATE_CHANGE) {
            this._updateDataValueFromControl(value);
        }
    },
    
    _handleSelfDataFocusedChange: function(value) {
        if (value) return; // we're interested only in blur event
        
        // we don't update on blur?
        if (this._dataUpdateMode !== Amm.Trait.Data.UPDATE_BLUR) return;
        
        this._updateDataValueFromControl();
    },
    
    setDataLockMode: function(dataLockMode) {
        if (!dataLockMode) dataLockMode = 0;
        if (typeof dataLockMode !== 'Number') {
            throw Error("dataLockMode must be a number");
        }
        var oldDataLockMode = this._dataLockMode;
        if (oldDataLockMode === dataLockMode) return;
        this._dataLockMode = dataLockMode;
        this._dataUpdateLock();
        return true;
    },

    getDataLockMode: function() { return this._dataLockMode; }, 
    
    _dataUpdateLock: function() {
        if (this['Lockable'] !== '__INTERFACE__' || !this._dataLockMode) return;
        var locked = false;
        if (this._dataLockMode & Amm.Trait.Data.LOCK_WITHOUT_PROPERTY) {
            if (!this._dataHasProperty) locked = true;
        }
        if (this._dataLockMode & Amm.Trait.Data.LOCK_DURING_TRANSACTION) {
            if (this._dataObject && this._dataObject['Amm.Data.Record']
                && this._dataObject.mm.getTransaction()) {
                locked = true;
            }
        }
        this.setLocked(locked);
    },

    setDataModified: function(dataModified, isSync) {
        
        dataModified = !!dataModified;
        var oldDataModified = this._dataModified;
        if (oldDataModified === dataModified) return;
        if (!isSync && dataModified) return; // no effect
        if (!isSync && !dataModified && this._dataHasProperty) {
            this.setDataValue(this._dataObject.mm.getOldValue(this._dataProperty));
            return;
        }
        this._dataModified = dataModified;
        this.outDataModifiedChange(dataModified, oldDataModified);
        return true;
    },
    
    outDataModifiedChange: function(modified, oldModified) {
        return this._out('dataModifiedChange', modified, oldModified);
    },
    
    getDataModified: function() { return this._dataModified; },
    
    _dataUpdateModified: function() {
        var modified = false;
        if (this._dataHasProperty) {
            modified = this._dataObject.mm.getModified(this._dataProperty);
        } else if (this._dataObject && !this._dataProperty) {
            modified = this._dataObject.mm.getModified();
        }
        this.setDataModified(modified, true);
    }
    
};