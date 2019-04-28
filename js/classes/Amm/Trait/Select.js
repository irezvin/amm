/* global Amm */

Amm.Trait.Select = function() {  
};

// compares two values. Order doesn't matter. Multiple occurances of same value are same as one.
// comparison is non-strict
Amm.Trait.Select.valuesAreSame = function(a, b) {
    if (a === b) return true;
    if (a && a['Amm.Array']) a = a.getItems();
    if (b && b['Amm.Array']) b = b.getItems();
    var cmp = function(a, b) { return a == b? 0 : 1; };
    if (a instanceof Array) {
         if (!(b instanceof Array)) return false;         
         if (!(Amm.Array.diff(a, b, cmp).length) && !(Amm.Array.diff(b, a, cmp).length)) {
             return true;
         }
         return false;
    } else {
        if (b instanceof Array) return false;
    }
    return !cmp(a, b);
};

Amm.Trait.Select.prototype = {

    'Select': '__INTERFACE__',
    
    options: null,
    
    _selectionCollection: null,
    
    _multiple: undefined,

    _selectSize: undefined,
    
    _numChanges: 0,
    
    /**
     * @param {Array|Object} options
     * a - Amm.Trait.Select.Option instances
     * b - Amm.Trait.Select.Option prototypes
     * c - hash {value: label, value2: label2...} 
    */
    setOptions: function(options) {
        if (!options) options = [];
        var items = [];
        if (options instanceof Array || options['Amm.Array']) {
            items = options;
        } else if (typeof options === 'object') {
            for (var i in options) if (options.hasOwnProperty(i)) {
                items.push({label: options[i], value: i});
            }
        }
        var instances = [];
        for (var i = 0; i < items.length; i++) {
            var item;
            var c = Amm.getClass(items[i]);
            if (!c) item = new Amm.Trait.Select.Option(items[i]);
                else item = items[i];
            instances.push(item);
        }
        this.getOptionsCollection().setItems(instances);
    },
    
    getOptions: function() {
        if (!this.options) return undefined;
        return this.getOptionsCollection().getItems();
    },
    
    getOptionsCollection: function() {
        if (this.options) return this.options;
        var proto = {
            changeEvents: ['labelChange', 'valueChange', 'disabledChange'],
            requirements: ['Amm.Trait.Select.Option'],
            indexProperty: 'index',
            observeIndexProperty: true,
            cleanupOnDissociate: true
        };
        this.options = new Amm.Collection(proto);
        if (this._cleanupList) this._cleanupList.push(this.options);
        if (!this._selectionCollection) this.getSelectionCollection();
        this.options.subscribe('itemsChange', this._handleOptionsChange, this);
        return this.options;
    },
    
    getSelectionCollection: function() {
        if (this._selectionCollection) return this._selectionCollection;
        var proto = {
            collection: this.getOptionsCollection(),
            multiple: this._multiple,
            valueProperty: 'value',
            selectedProperty: 'selected'
        };
        this._selectionCollection = new Amm.Selection(proto);
        this._selectionCollection.subscribe('valueChange', this._handleSelfSelectionValueChange, this);
        this._selectionCollection.setValue(this._value);
        if (this._cleanupList) this._cleanupList.push(this._selectionCollection);
        return this._selectionCollection;
    },

    setSelectSize: function(selectSize) {
        if (selectSize !== undefined) {
            selectSize = parseInt(selectSize) || 1;
            if (selectSize < 0) selectSize = 1;
        }
        var oldSelectSize = this._selectSize;
        if (oldSelectSize === selectSize) return;
        this._selectSize = selectSize;
        if (selectSize === 1 && !this._multiple && (this._value === null || this._value === undefined)) {
            if (this.options && this.options.length) {
                this._correctValueForSingleSelect();
            }
        }
 
        this.outSelectSizeChange(selectSize, oldSelectSize);
        return true;
    },

    getSelectSize: function() { return this._selectSize; },

    outSelectSizeChange: function(selectSize, oldSelectSize) {
        this._out('selectSizeChange', selectSize, oldSelectSize);
    },
    
    _handleSelfSelectionValueChange: function(value, oldValue) {
        if (value === undefined) value = null;
        if (!Amm.Trait.Select.valuesAreSame(value, this._value)) {
            var old = this._value;
            this._value = value;
            if (!this._multiple && this._value === null && this._selectSize === 1) {
                if (this._correctValueForSingleSelect()) return;
            }
            this._numChanges++;
            this.outValueChange(value, old);
        }
    },
    
    _handleOptionsChange: function(items, oldItems) {
        // set first item as selected? but when?
        if (!oldItems.length && items.length && this._selectSize === 1 && this._value === undefined) {
            this._correctValueForSingleSelect();
        }
    },
    
    _correctValueForSingleSelect: function() {
        var options = this.getOptionsCollection();
        for (var i = 0, l = options.length; i < l; i++) {
            var op = options[i];
            if (!op.getDisabled()) {
                this.setValue(op.getValue());
                return true;
            }
        }
    },
    
    setMultiple: function(multiple) {
        multiple = !!multiple;
        var oldMultiple = this._multiple;
        if (oldMultiple === multiple) return;
        this._multiple = multiple;
        if (this._selectionCollection)
            this._selectionCollection.setMultiple(multiple);
        this.outMultipleChange(multiple, oldMultiple);
        return true;
    },

    getMultiple: function() { return this._multiple; },

    outMultipleChange: function(multiple, oldMultiple) {
        this._out('multipleChange', multiple, oldMultiple);
    },
    
    setValue: function(value) {
        var o = this._numChanges;
        this.getSelectionCollection().setValue(value);
        if (this._numChanges !== o) return true; // compat. with 'set' behaviour
    }
    
};

Amm.extend(Amm.Trait.Select, Amm.Trait.Input);
