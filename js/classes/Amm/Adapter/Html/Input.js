/* global Amm */

/**
 * Subscribes to change, focus, blur events.
 * jQuery to Element: value, focus
 * Element to JQuery: value, focus, readOnly, enabled
 */
Amm.Adapter.Html.Input = function(options) {
    this._handler = jQuery.proxy(this._receiveEvent, this);
    Amm.Adapter.Field.call(this, options);
    Amm.JQueryListener.call(this, {});
};

Amm.Adapter.Html.Input.prototype = {

    'Amm.Adapter.Html.Input': '__CLASS__', 

    _eventName: 'change focus blur',
    
    twoWayInit: true,
    
    _receiveEvent: function(event) {
        if (!this._element) return;
        if (event.type === 'change') {
            if (!this._element.getReadOnly()) {
                this._element.setValue(this.getInputValue());
            }
            return true;
        } else if (event.type === 'focus') {
            if (this._element.getEnabled()) {
                this._element.setFocused(true);
            }
            return true;
        } else if (event.type === 'blur') {
            this._element.setFocused(false);
            return true;
        }
    },
    
    setInputFocused: function(focus) {
        var q = jQuery(this._htmlElement);
        if (q[0]) {
            if (focus && !q.is(':focus')) q.focus();
            else if (!focus && q.is(':focus')) q.blur();
        }
    },
    getInputFocused: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return jQuery(this._htmlElement).is(':focus'); 
    },
    
    setInputReadOnly: function(readOnly) {
        var q = jQuery(this._htmlElement);
        if (q[0]) {
            if (readOnly && !q[0].hasAttribute('readonly')) q[0].setAttribute('readonly', 'readonly');
            else if (!readOnly && q[0].hasAttribute('readonly')) q[0].removeAttribute('readonly');
        }
    },
    getInputReadOnly: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return e.getAttribute('readonly'); 
    },
    
    setInputEnabled: function(enabled) {
        var q = jQuery(this._htmlElement), disabled = !enabled;
        if (q[0]) {
            console.log(q[0]);
            if (disabled && !q[0].hasAttribute('disabled')) q[0].setAttribute('disabled', 'disabled');
            else if (!disabled && q[0].hasAttribute('disabled')) q[0].removeAttribute('disabled');
        }
    },
    getInputEnabled: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return !e.hasAttribute('disabled'); 
    },
    
    setInputValue: function(value) {
        if (this._htmlElement) {
            jQuery(this._htmlElement).val(value);
        }
    },
    
    getInputValue: function() {
        if (this._htmlElement) 
            return jQuery(this._htmlElement).val();
    },
    
    setHtmlElement: function(htmlElement) {
        var old = this._htmlElement;
        if (old === htmlElement) return;
        this._htmlElement = htmlElement;
        this.setSelector(this._htmlElement);
        if (this._element && this._htmlElement) this._twoWayInit();
        return true;
    },
    
    getHtmlElement: function() { return this._htmlElement; },

    _doElementChange: function(element, oldElement) {
        Amm.Adapter.Field.prototype._doElementChange.call(this, element, oldElement);
        if (oldElement) oldElement.unsubscribe(undefined, undefined, this);
        if (element) {
            element.subscribe('valueChange', this.setInputValue, this);
            element.subscribe('focusedChange', this.setInputFocused, this);
            element.subscribe('readOnlyChange', this.setInputReadOnly, this);
            element.subscribe('enabledChange', this.setInputEnabled, this);
            if (this._htmlElement) this._twoWayInit();
        }
    },
    
    _twoWayInit: function() {
        return;
        var ev, iv;
        if ((ev = this._element.getReadOnly()) !== undefined) this.setInputReadOnly(ev);
        else if (this.twoWayInit && (iv = this.getInputReadOnly() !== undefined))
            this._element.setReadOnly(iv);
        
        if ((ev = this._element.getEnabled()) !== undefined) this.setInputEnabled(ev);
        else if (this.twoWayInit && (iv = this.getInputReadOnly() !== undefined))
            this._element.setEnabled(iv);
        
        if ((ev = this._element.getValue()) !== undefined) this.setInputValue(ev);
        else if (this.twoWayInit && (iv = this.getInputValue() !== undefined))
            this._element.setValue(iv);
        
        if ((ev = this._element.getFocused()) !== undefined) this.setInputFocused(ev);
        else if (this.twoWayInit && (iv = this.getInputValue() !== undefined))
            this._element.setFocused(iv);
    },
    
    cleanup: function() {
        Amm.Adapter.Field.cleanup.call(this);
        Amm.JQueryListener.cleanup.call(this);
    }

};

Amm.extend(Amm.Adapter.Html.Input, Amm.Adapter.Field);
Amm.extend(Amm.Adapter.Html.Input, Amm.JQueryListener);

