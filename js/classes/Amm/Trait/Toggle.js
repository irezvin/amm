 /* global Amm */

 Amm.Trait.Toggle = function() {
 };

 Amm.Trait.Toggle.prototype = {

    'Toggle': '__INTERFACE__',

    _isRadio: undefined,

    _groupName: undefined,

    _groupParent: undefined,

    _checked: undefined,

    _checkedValue: undefined,

    _uncheckedValue: undefined,

    _valueIsStandalone: false,
    
    _lockGroup: 0,
    
    _lockGroupSearch: 0,
    
    _value: undefined,
    
    __augment: function(traitInstance) {
        Amm.Element.regInit(this, '99.Amm.Trait.Toggle', this._subscribeToggleToRoot);
    },
    
    setIsRadio: function(isRadio) {
        if (isRadio !== undefined) isRadio = !!isRadio;
        var oldIsRadio = this._isRadio;
        if (oldIsRadio === isRadio) return;
        var significant = this._getOwnValue() !== undefined;
        this._isRadio = isRadio;
        significant = significant || this._getOwnValue() !== undefined;
        this.outIsRadioChange(isRadio, oldIsRadio);
        if (this._uncheckOtherRadios() || significant) this._notifyGroup();
        return true;
    },

    getIsRadio: function() { return this._isRadio; },

    outIsRadioChange: function(isRadio, oldIsRadio) {
        this._out('isRadioChange', isRadio, oldIsRadio);
    },

    setGroupName: function(groupName) {
        if (!groupName) groupName = undefined;
        var oldGroupName = this._groupName;
        if (oldGroupName === groupName) return;
        var oldGroup = this.findGroupItems(false, true);
        this._groupName = groupName;
        if (oldGroup.length) this._notifyGroup(oldGroup);
        this.outGroupNameChange(groupName, oldGroupName);
        this._notifyGroup();
        return true;
    },

    getGroupName: function() { return this._groupName; },

    outGroupNameChange: function(groupName, oldGroupName) {
        this._out('groupNameChange', groupName, oldGroupName);
    },

    setGroupParent: function(groupParent) {
        if (!groupParent) groupParent = undefined;
        var oldGroupParent = this._groupParent;
        if (oldGroupParent === groupParent) return;
        var oldGroup = this.findGroupItems(false, true);        
        this._groupParent = groupParent;
        if (oldGroup.length) this._notifyGroup(oldGroup);
        this.outGroupParentChange(groupParent, oldGroupParent);
        this._notifyGroup();
        return true;
    },

    getGroupParent: function() { return this._groupParent; },

    outGroupParentChange: function(groupParent, oldGroupParent) {
        this._out('groupParentChange', groupParent, oldGroupParent);
    },

    _uncheckOtherRadios: function() {
        if (!this._checked || !this._isRadio) return;
        var g = this.findGroupItems(true), changed = false;
        if (g.length <= 1) return;
        for (var i = 0, l = g.length; i < l; i++) {
            if (g[i] !== this && g[i].getChecked()) {
                g[i]._uncheckByGroup();
                changed = true;
            }
        }
        return changed;
    },
    
    _uncheckByGroup: function() {
        this._lockGroup++;
        this.setChecked(false);
        this._lockGroup--;
    },
    
    setEnabled: function(enabled) {
        var significant = this._getOwnValue() !== undefined;
        var res = Amm.Trait.Input.prototype.setEnabled.call(this, enabled);
        if (res && (significant || this._getOwnValue() !== undefined)) this._reportChange();
        return res;
    },
    
    setChecked: function(checked) {
        if (checked !== undefined) checked = !!checked;
        var oldChecked = this._checked;
        if (checked) {
            // this allows to fix issue when several radios have initial checked := true
            if (this._uncheckOtherRadios()) {
                this._reportChange();
            }
        }
        if (oldChecked === checked) return;
        this._checked = checked;
        this._uncheckOtherRadios();
        this._reportChange();
        this.outCheckedChange(checked, oldChecked);
        return true;
    },

    getChecked: function() { return this._checked; },

    outCheckedChange: function(checked, oldChecked) {
        this._out('checkedChange', checked, oldChecked);
    },

    setCheckedValue: function(checkedValue) {
        var oldCheckedValue = this._checkedValue;
        if (oldCheckedValue === checkedValue) return;
        this._checkedValue = checkedValue;
        this.outCheckedValueChange(checkedValue, oldCheckedValue);
        if (this._checked) this._reportChange();
        return true;
    },

    getCheckedValue: function() { return this._checkedValue; },

    outCheckedValueChange: function(checkedValue, oldCheckedValue) {
        this._out('checkedValueChange', checkedValue, oldCheckedValue);
    },

    // if the control is member of the group, the property will be set for 
    // the whole group - this is the value of the group when there is 
    // no checked members, either radios or toggles
    setUncheckedValue: function(uncheckedValue) {
        var oldUncheckedValue = this._uncheckedValue;
        if (oldUncheckedValue === uncheckedValue) return;
        this._uncheckedValue = uncheckedValue;
        this.outUncheckedValueChange(uncheckedValue, oldUncheckedValue);
        if (!this._checked) this._reportChange();
        return true;
    },

    getUncheckedValue: function() { return this._uncheckedValue; },

    outUncheckedValueChange: function(uncheckedValue, oldUncheckedValue) {
        this._out('uncheckedValueChange', uncheckedValue, oldUncheckedValue);
    },

    setValueIsStandalone: function(valueIsStandalone) {
        valueIsStandalone = !!valueIsStandalone;
        var oldValueIsStandalone = this._valueIsStandalone;
        if (oldValueIsStandalone === valueIsStandalone) return;
        this._valueIsStandalone = valueIsStandalone;
        var old = this._value;
        this.outValueIsStandaloneChange(valueIsStandalone, oldValueIsStandalone);
        this._value = valueIsStandalone? this._getOwnValue() : this._getGroupValue();
        if (!Amm.Trait.Select.valuesAreSame(old, this._value))
            this.outValueChange(this._value, old);
        return true;
    },

    getValueIsStandalone: function() { return this._valueIsStandalone; },

    outValueIsStandaloneChange: function(valueIsStandalone, oldValueIsStandalone) {
        this._out('valueIsStandaloneChange', valueIsStandalone, oldValueIsStandalone);
    },
    
    // notifies self too
    _notifyGroup: function(group, groupValue) {
        if (!group) group = this.findGroupItems();
        if (arguments.length < 2) groupValue = this._getGroupValue(group);
        for (var i = 0, l = group.length; i < l; i++) {
            group[i]._receiveGroupNotification(groupValue, this);
        }
    },

    // is called when the value should change. If behaviour is group-oriented 
    // (valueIsStandalone === false), will notify group and wait to _receiveGroupNotification.
    // Otherwise will report value
    _reportChange: function() {
        if (this._valueIsStandalone) {
            var curr = this._getOwnValue();
            if (curr !== this._value) {
                var old = this._value;
                this._value = curr;
                this.outValueChange(this._value, old);
            }
        }
        var groupValue = this._getGroupValue();
        var group = this.findGroupItems();
        for (var i = 0, l = group.length; i < l; i++) {
            group[i]._receiveGroupNotification(groupValue, this);
        }
    },
    
    setValue: function(value) {
        var old = this._value;
        if (this._valueIsStandalone) {
            this._setOwnValue(value);
        } else {
            this._setGroupValue(value);
        }
        if (!Amm.Trait.Select.valuesAreSame(this._value, old)) return true;
    },
    
    _receiveGroupNotification: function(groupValue, origin) {
        if (this._valueIsStandalone) return;
        if (!Amm.Trait.Select.valuesAreSame(groupValue, this._value)) {
            var oldValue = this._value;
            this._value = groupValue;
            this.outValueChange(groupValue, oldValue);
        }
    },
    
    _setGroupValue: function(value) {
        var v;
        if (value instanceof Array) v = value;
        else {
            if (value === null || value === undefined) v = [];
            else v = [value];
        }
        var items = this.findGroupItems();
        var radioSet = false;
        var changed = false;
        var i, l;
        for (i = 0, l = items.length; i < l; i++) {
            items[i]._lockGroup++;
        }
        for (i = 0, l = items.length; i < l; i++) {
            var item = items[i];
            if (item['Toggle'] !== '__INTERFACE__') return;
            var isRadio = item.getIsRadio(), found = Amm.Array.nonStrictIndexOf(item.getCheckedValue(), v) >= 0,
                checked = item.getChecked();
            // radioSet: we set radio box to 'checked' only once
            radioSet = radioSet || found && checked && isRadio;
            if (!(isRadio && radioSet) && (found && !checked || !found && checked)) {
                if (isRadio && found) radioSet = true;
                changed = true;
                item.setChecked(!!found);
            }
        }
        for (i = 0, l = items.length; i < l; i++) {
            items[i]._lockGroup--;
        }
        if (changed) this._reportChange();
        return changed;
    },
    
    _getGroupValue: function(group) {
        if (!group) group = this.findGroupItems();
        var res = [], numChecks = 0, numRadios = 0;
        for (var i = 0, l = group.length; i < l; i++) {
            var item = group[i], value = item._getOwnValue();
            if (item['Toggle'] !== '__INTERFACE__') continue;
            if (item.getIsRadio()) {
                numRadios++;
            }
            else {
                numChecks++;
            }
            if (value !== undefined) {
                res.push(value);
            }
        }
        var scalar = (numRadios === 0 && numChecks === 1) || (numRadios && !numChecks);
        var res;
        if (scalar) res = res[0];
        return res;
    },
    
    _setOwnValue: function(value) {
        if (value == this._checkedValue) {
            this.setChecked(true);
        } else {
            this.setChecked(false);
        }
    },
    
    _getOwnValue: function() {
        if (!this._enabled) return;
        if (this._checked) return this._checkedValue;
        if (!this._isRadio) return this._uncheckedValue;
    },
    
    findGroupItems: function(radiosOnly, excludeThis) {
        var res = [];
        if (excludeThis) this._lockGroupSearch++;
        Amm.getRoot().raiseEvent('findToggleGroupItems', this._groupParent, this._groupName, radiosOnly, res);
        if (excludeThis) this._lockGroupSearch--;
        return res;
    },
    
    _handleFindToggleGroupItems: function(groupParent, groupName, radiosOnly, res) {
        if (this._lockGroupSearch) return;
        if (groupParent === this._groupParent && groupName === this._groupName) {
            if (!radiosOnly || this._isRadio) {
                res.push(this);
            }
        }
    },
    
    _subscribeToggleToRoot: function() {
        Amm.getRoot().subscribe('findToggleGroupItems', this._handleFindToggleGroupItems, this);
    },
    
    _setComponent_Toggle: function(component, oldComponent) {
        if (this._groupParent === oldComponent  // was set to old component
            || !this._groupParent // was not set
            || this._groupParent.tagName) // was set to HTML element
        {
            this.setGroupParent(component); // component becomes group parent
        }
    },
    
    _cleanup_Toggle: function() {
        Amm.getRoot().unsubscribe('findToggleGroupItems', this._handleFindToggleGroupItems, this);
    }
     
 };

Amm.extend(Amm.Trait.Toggle, Amm.Trait.Input);
