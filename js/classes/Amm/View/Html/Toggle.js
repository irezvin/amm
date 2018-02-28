/* global Amm */

Amm.View.Html.Toggle = function(options) {
    Amm.View.Html.Input.call(this, options);
};

Amm.View.Html.Toggle.prototype = {

    'Amm.View.Html.Toggle': '__CLASS__', 

    getVIsRadio: function() { return jQuery(this._htmlElement).attr('type') === 'radio'? true : undefined; },
    
    setVIsRadio: function(value) { jQuery(this._htmlElement).attr('type', value? 'radio' : 'checkbox'); },
    
    getVChecked: function() { var e = jQuery(this._htmlElement)[0]; if (e) return e.checked; },
    
    setVChecked: function(value) { var e = jQuery(this._htmlElement)[0]; if (e) e.checked = !!value },
    
    setVValue: function() {
    },
    
    getVValue: function() {
    },
    
    getVCheckedValue: function() {
        var e = jQuery(this._htmlElement)[0]; if (e) return e.value;
    },
    
    setVCheckedValue: function(value) {
        var e = jQuery(this._htmlElement)[0]; if (e) e.value = value;
    },
    
    _receiveEvent: function(event) {
        if (!this._element) return;
        if (event.type === 'change') {
            if (this._element.getReadOnly()) {
                this.setVChecked(this._element.getChecked());
                // put our beloved radio button back!
                if (this._element.getIsRadio()) {
                    var items = this._element.findGroupItems(true, true);
                    for (var i = 0, l = items.length; i < l; i++) {
                        if (items[i].getChecked()) {
                            var vv = items[i].getUniqueSubscribers('Amm.View.Html.Toggle');
                            for (var ii = 0, ll = vv.length; ii < ll; ii++)
                                vv[ii].setVChecked(true);
                        }
                    }
                }
            } else {
                this._element.setChecked(this._htmlElement.checked);
            }
            return true;
        }
        return Amm.View.Html.Input.prototype._receiveEvent.call(this, event);
    },

    getVGroupName: function() {
        return jQuery(this._htmlElement).attr('name');
    },
    
    getVGroupParent: function() {
        return jQuery(this._htmlElement).closest('form')[0];
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Toggle];
    }
    
};

Amm.extend(Amm.View.Html.Toggle, Amm.View.Html.Input);

