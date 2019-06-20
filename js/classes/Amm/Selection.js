/* global Amm */
Amm.Selection = function(options) {
    Amm.Collection.call(this, options);
};

Amm.Selection.ERR_NOT_IN_OBSERVED_COLLECTION = "Not in observed collection.";

Amm.Selection.prototype = {
    
    _multiple: true,

    _valueProperty: null,

    _selectedProperty: null,

    _sameOrder: false,

    _collection: null,
    
    _unselectOnItemValueChange: false,
    
    _cacheValue: true,
    
    _value: undefined,
    
    _suppressValueChangeEvent: 0,
    
    _selfSubscribed: false,

    /**
     * @param {Amm.Collection|null} collection Observed collection (one whose items may be selected or not)
     * Changing the `collection` will reset the selection content.
     */
    setCollection: function(collection) {
        var oldCollection = this._collection;
        var items;
        if (oldCollection === collection) return;
        if (oldCollection) {
            this._unobserveCollection();
        }
        this._collection = collection;
        if (this._selectedProperty) {
            items = this._findSelectedItems();
        } else {
            items = [];
        }
        if (!this._multiple) items.splice(1, items.length);
        this.setItems(items); // clear the value
        this.outCollectionChange(collection, oldCollection); 
        if (collection) {
            this._observeCollection();
        }
        return true;
    },
    
    getCollection: function() { return this._collection; },
    
    outCollectionChange: function(collection, oldCollection) {
        this._out('collectionChange', collection, oldCollection);
    },
    
    /**
     * Whether selection may have several elements
     * @param {bool} multiple
     * @returns {Boolean|undefined}
     */
    setMultiple: function(multiple) {
        multiple = !!multiple;
        var oldMultiple = this._multiple;
        if (oldMultiple === multiple) return;
        var old = this._value === undefined? this.getValue(true) : this._value;
        this._multiple = multiple;
        if (!multiple && this.length > 1) {
            this._suppressValueChangeEvent++;
            // reject all non-needed items
            this.splice(1, this.length - 1);
            this._suppressValueChangeEvent--;
        }
        var v = this.getValue(true);
        if (this._valueProperty) this._value = v;
        if (this._subscribers.valueChange) {
            this.outValueChange(v, old);
        }
        this.outMultipleChange(multiple, oldMultiple);
        return true;
    },

    getMultiple: function() { return this._multiple; },

    outMultipleChange: function(multiple, oldMultiple) {
        this._out('multipleChange', multiple, oldMultiple);
    },

    /**
     * Value can be A - object or array of objects (if !`multipleSelection`, first item will be used)
     * or B - value of item[`valueProperty`] or several such values, if `valueProperty` is set.
     * Example: 
     * 
     *      var foo = {label: 'Foo', value: 1};
     *      var bar = {label: 'Bar', value: 2};
     *      collection.setItems([foo, bar]);
     *      selection.setCollection(collection);
     *      selection.setValueProperty(null); // use objects
     *      selection.setValue([foo]); // selects only foo object
     *      selection.setValueProperty('value');
     *      > (selection.getValue()); // [1]
     *      selection.setValue([1, 2]);
     *      > (selection.getItems()); // will return [foo, bar]
     *      selection.setMultiple(false);
     *      > (selection.getValue()); // 1 - not an array (since not multiple)
     *      > (selection.getItems()); // [foo] - only first object remains selected
     *      selection.setValue([foo, bar]); // remember we still have valueProperty set?
     *      > (selection.getValue()); // undefined - we have no value
     * 
     * @param {mixed} value
     * @returns {undefined}
     */
    setValue: function(value) {
        this.beginUpdate();
        var empty;
        if (value === undefined || value === null) {
            empty = true;
            if (this._multiple) value = [];
        } else {
            if (value instanceof Array || value['Amm.Array']) {
                empty = !value.length;
            } else {
                value = [value];
            }
        }
        var items;
        if (empty) items = [];
        else items = this._findItemsWithValue(value);
        this.setItems(items);        
        this.endUpdate();
    },
    
    getValue: function(recalc) { 
        if (!this.length) return this._multiple? [] : null;
        var res;
        if (!this._valueProperty) {
            res = this.getItems();
            if (!this._multiple) {
                res = res[0];
            }
        } else {
            if (!this._cacheValue || recalc || this._value === undefined) {
                res = this._value = this._collectValueProperty(this, true);
            } else {
                res = this._value;
            }
        }
        return res;
    },

    outValueChange: function(value, oldValue) {
        if (this._suppressValueChangeEvent) return;
        this._out('valueChange', value, oldValue);
    },

    setValueProperty: function(valueProperty) {
        var oldValueProperty = this._valueProperty;
        if (oldValueProperty === valueProperty) return;
        if (this._collection && oldValueProperty) this._unsubscribeCollectionItems(this._collection, false, true);
        this._valueProperty = valueProperty;
        this.clearItems(); // TODO: think a bit on this
        if (!this._valueProperty) this._value = undefined;
        if (this._collection && valueProperty) this._subscribeCollectionItems(this._collection, false, true);
        return true;
    },

    getValueProperty: function() { return this._valueProperty; },

    /**
     * Whether to cache value or not. Is used only when valueProperty is set. 
     * Defaults to TRUE. Should be set to FALSE when objects with non-observable valueProperty
     * are used.
     * 
     * @param {boolean} cacheValue
     * @returns {undefined|Boolean}
     */
    setCacheValue: function(cacheValue) {
        cacheValue = !!cacheValue;
        var oldCacheValue = this._cacheValue;
        if (oldCacheValue === cacheValue) return;
        this._cacheValue = cacheValue;
        return true;
    },

    getCacheValue: function() { return this._cacheValue; },

    /**
     * When selected objects' valueProperty changes, it will be removed from Selection
     * (default behavior will trigger valueChange event that will have old valueProperty' value 
     * replaced with new one)
     * 
     * @param {type} unselectOnItemValueChange
     * @returns {undefined|Boolean}
     */
    setUnselectOnItemValueChange: function(unselectOnItemValueChange) {
        var oldUnselectOnItemValueChange = this._unselectOnItemValueChange;
        if (oldUnselectOnItemValueChange === unselectOnItemValueChange) return;
        this._unselectOnItemValueChange = unselectOnItemValueChange;
        return true;
    },

    getUnselectOnItemValueChange: function() { return this._unselectOnItemValueChange; },

    setSelectedProperty: function(selectedProperty) {
        var oldSelectedProperty = this._selectedProperty;
        if (oldSelectedProperty === selectedProperty) return;
        if (oldSelectedProperty && this._collection)
            this._unsubscribeCollectionItems(this._collection, true);
        this._selectedProperty = selectedProperty;
        if (selectedProperty && this._collection) {
            // only use new property values if we have no items
            if (!this.length) this.setItems(this._findSelectedItems());
            else this._setItemsSelectedProperty();
            
            this._subscribeCollectionItems(this._collection, true);
        }
        return true;
    },

    getSelectedProperty: function() { return this._selectedProperty; },

    /**
     * @param {boolean} sameOrder Whether objects in Selection must have exactly the same order 
     * as the objects in `collection`
     */
    setSameOrder: function(sameOrder) {
        sameOrder = !!sameOrder;
        var oldSameOrder = this._sameOrder;
        if (oldSameOrder === sameOrder) return;
        this._sameOrder = sameOrder;
        if (this._sameOrder) {
            this.setSortProperties(null);
            this.setSortFn(null);
            if (this._collection) {
                this._collection.subscribe('reorderItems', this._handleCollectionReorderItems, this);
                this._maintainOrder();
            }
        } else {
            if (this._collection) {
                this._collection.unsubscribe('reorderItems', this._handleCollectionReorderItems, this);
            }
        }
        return true;
    },

    getSameOrder: function() { return this._sameOrder; },
    
    sort: function(fnOrProps) {
        if (this._sameOrder) Error("Refusing to sort() when `sameOrder` === true");
        return Amm.Collection.prototype.sort.call(this, fnOrProps);
    },

    _collectValueProperty: function(what, deCardinalify, ignoreItem) {
        what = what || this;
        var res = [], l = what.length;
        for (var i = 0; i < l; i++) {
            var item = what[i];
            if (item !== ignoreItem) {
                var v = Amm.getProperty(item, this._valueProperty);
                if (v !== undefined && v !== null) res.push(v);
            }
        }
        if (deCardinalify && !this._multiple) res = res.length? res[0] : null;
        return res;
    },
    
    _findItemsWithValue: function(value) {
        if (!this._multiple && !(value instanceof Array)) {
            if (value === undefined || value === null) value = [];
                else value = [value];
        }
        if (!this._collection || !value.length) return [];
        if (!this._valueProperty) return this._collection.intersect(value, true);
        var res = [];
        for (var i = 0, l = this._collection.length; i < l; i++) {
            var item = this._collection[i], v = Amm.getProperty(item, this._valueProperty);
            if (Amm.Array.indexOf(v, value) >= 0) res.push(item);
        }
        return res;
    },
    
    _findSelectedItems: function() {
        if (!this._collection) return [];
        var res = [];
        for (var i = 0, l = this._collection.length; i < l; i++) {
            var item = this._collection[i], v = Amm.getProperty(item, this._selectedProperty);
            if (v) res.push(item);
        }
        return res;
    },
    
    _setItemsSelectedProperty: function() {
        // sub-optimal
        for (var i = 0, l = this._collection.length; i < l; i++) {
            Amm.setProperty(this._collection[i], this._selectedProperty, this.hasItem(this._collection[i]));
        }
    },

    _handleCollectionSpliceItems: function(index, cutItems, insertItems) {
        // exclude duplicates from both sets - we are interested 
        // in real cut/insert items only
        var cut = Amm.Array.symmetricDiff(cutItems, insertItems);
        var insert = Amm.Array.symmetricDiff(insertItems, cutItems);
        
        this._unsubscribeCollectionItems(cut);
        this._subscribeCollectionItems(insert);
        
        var c = this.intersect(cut, true);
        
        var canAdd = insert.length && (
            this._selectedProperty 
            || 
            // if not multiple we can't have more than one object anyway
            this._valueProperty && this.length && this._multiple 
        );
        
        var deferEvents = (c.length && canAdd || canAdd && this._sameOrder);
        
        if (deferEvents) this.beginUpdate();
        
        // remove old items from selection
        var toRemove = c;
        if (toRemove.length) {
            for (var i = 0, l = toRemove.length; i < l; i++)
                this.reject(toRemove[i], false);
        };
        
        // check if new items have a - selectedProperty or b - matching valueProperty
        
        if (canAdd) {
            var toAdd = [];
            var v = this._valueProperty? this.getValue() : null;
            // check items that we should add
            for (var i = 0, l = insert.length; i < l; i++) {
                var o = insert[i];
                if (this._selectedProperty && Amm.getProperty(o, this._selectedProperty)) toAdd.push(o);
                else if (this._valueProperty && v && Amm.Array.indexOf(Amm.getProperty(o, this._valueProperty), v) >= 0)
                    toAdd.push(o);
            }
            if (toAdd.length) {
                this.acceptMany(toAdd);
                if (this._sameOrder) this._maintainOrder(true);
            }
        }
        if (deferEvents) this.endUpdate();
    },
    
    _handleCollectionReorderItems: function(index, length, oldOrder) {
        if (!this.length) return; // don't care
        
        // check if some of our items have indexes' changed
        var items = this.getItems();
        var d = Amm.Array.findDuplicates(
            items.concat(this._collection.slice(index, index+length)),
            true,
            undefined,
            this.length
        );
        
        if (d.length) { // some are affected - rebuild
            this._maintainOrder();
        }
    },
    
    _maintainOrder: function(dontTrigger) {
        if (!this._sameOrder || !this.length) return; // don't care
        
        var items = this.getItems(), newOrder = this._collection.intersect(items, true);
        // check if arrays are same
        var iMin = null, iMax = null;
        if (items.length !== newOrder.length) {
            console.warn("We have problem: it turned some elements disappeared from `collection` when only order might change");
            this.setItems(newOrder);
            return;
        }
        for (var i = 0, l = items.length; i < l; i++) {
            if (items[i] !== newOrder[i]) {
                if (iMin === null) iMin = i;
                iMax = i;
                this[i] = newOrder[i];
            }
        }
        if (iMin !== null && !dontTrigger) { // something was changed
            if (this._indexProperty) this._reportIndexes(items, iMin, iMax + 1);
            if (!this._updateLevel) 
                this.outReorderItems(iMin, iMax - iMin + 1, items.slice(iMin, iMax + 1));
        }
    },
    
    _observeCollection: function() {
        this._collection.subscribe('spliceItems', this._handleCollectionSpliceItems, this);
        if (this._sameOrder) this._collection.subscribe('reorderItems', this._handleCollectionReorderItems, this);
        this._subscribeCollectionItems(this._collection);
    },
    
    _unobserveCollection: function() {
        this._collection.unsubscribe('spliceItems', this._handleCollectionSpliceItems, this);
        if (this._sameOrder) this._collection.unsubscribe('reorderItems', this._handleCollectionReorderItems, this);
        this._unsubscribeCollectionItems(this._collection);
    },
    
    _subscribeCollectionItems: function(items, skipValueProperty, skipSelectedProperty, unsubscribe) {
        if (!this._valueProperty) skipValueProperty = true;
        var ve, se, m;
        m = unsubscribe? 'unsubscribe' : 'subscribe';
        if (!this._selectedProperty) skipSelectedProperty = true;
        if (skipValueProperty && skipSelectedProperty) return;
        if (!skipValueProperty) ve = this._valueProperty + 'Change';
        if (!skipSelectedProperty) se = this._selectedProperty + 'Change';
        for (var i = 0, l = items.length; i < l; i++) {
            var item = items[i];
            if (!item[m]) continue;
            if (unsubscribe || item.hasEvent) {
                if (ve && (unsubscribe || item.hasEvent(ve))) {
                    item[m](ve, this._handleItemValuePropertyChange, this);
                }
                if (se && (unsubscribe || item.hasEvent(se))) item[m](se, this._handleItemSelectedPropertyChange, this);
            }
        }
    },
    
    canAccept: function(item, checkRequirementsOnly, problem) {
        problem = problem || {};
        if (!this._collection || !this._collection.hasItem(item)) {
            problem.error = Amm.Selection.ERR_NOT_IN_OBSERVED_COLLECTION;
            return false;
        }
        return Amm.Collection.prototype.canAccept.call(this, item, checkRequirementsOnly, problem);
    },
    
    _unsubscribeCollectionItems: function(items, skipValueProperty, skipSelectedProperty) {
        return this._subscribeCollectionItems(items, skipValueProperty, skipSelectedProperty, true);
    },
    
    _handleItemValuePropertyChange: function(value, oldValue) {
        var item = Amm.event.origin;
        var hasItem = this.hasItem(item);
        var o = this._value;
        var hasValue = Amm.Array.indexOf(value, this._collectValueProperty(this, false, item)) >= 0;
        if (hasValue && !hasItem) {
            this.accept(item);
        } else if (!hasValue && hasItem) {
            if (this._unselectOnItemValueChange) {
                this.reject(item);
            }
            else {
                this._value = this._collectValueProperty(this, true);
                if (this._valueProperty && this._subscribers.valueChange) {
                    this.outValueChange(this._value, o);
                }
            }
        }
    },
    
    _handleItemSelectedPropertyChange: function(value, oldValue) {
        var item = Amm.event.origin;
        var hasItem = this.hasItem(item);
        if (hasItem && !value) {
            this.reject(item);
            return;
        }
        else if (!hasItem && value) {
            if (this._multiple)
                this.accept(item);
            else
                this.setItems([item]);
        }
    },
    
    _subscribeFirst_valueChange: function() {
        // need to cache this
        if (this._valueProperty) this._value = this._collectValueProperty(this.getItems(), true);
        this._selfSubscribed = true;
        this.subscribe('itemsChange', this._handleSelfItemsChange, this);
    },
    
    _unsubscribeLast_valueChange: function() {
        this._selfSubscribed = false;
        this.unsubscribe('itemsChange', this._handleSelfItemsChange, this);
    },
    
    _handleSelfItemsChange: function(items, oldItems) {
        var o, n;
        if (!this._valueProperty) {
            if (this._multiple) {
                n = items;
                o = oldItems;
            } else {
                o = oldItems[0] || null;
                n = items[0] || null;
            }
        } else {
            if (this._value !== undefined) {
                o = this._value;
            } else {
                o = this._collectValueProperty(oldItems, true);
            }
            this._value = n = this._collectValueProperty(items, true);
        }
        this.outValueChange(n, o);
    },
    
    _associate: function(item, index, alsoSubscribe) {
        var res;
        res = Amm.Collection.prototype._associate.call(this, item, index, alsoSubscribe);
        if (!this._selfSubscribed) this._value = undefined;
        if (this._selectedProperty) {
            Amm.setProperty(item, this._selectedProperty, true);
        }
        return res;
    },
    
    _dissociate: function(item) {
        var res;
        res = Amm.Collection.prototype._dissociate.call(this, item);
        if (!this._selfSubscribed) this._value = undefined;
        if (this._selectedProperty) {
            Amm.setProperty(item, this._selectedProperty, false);
        }
        return res;
    }
    
};

Amm.extend(Amm.Selection, Amm.Collection);
