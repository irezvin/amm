/* global Amm */

/**
 * Subscribes to change, focus, blur events.
 * jQuery to Element: value, focus
 * Element to JQuery: value, focus, readOnly, enabled
 */
Amm.Adapter.Html.Input = function(options) {
    this._handler = jQuery.proxy(this._receiveEvent, this);
    Amm.Adapter.Abstract.Field.call(this, options);
    Amm.JQueryListener.call(this, {});
};

Amm.Adapter.Html.Input.prototype = {

    'Amm.Adapter.Html.Input': '__CLASS__', 

    _eventName: 'change focus blur',
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    _receiveEvent: function(event) {
        if (!this._element) return;
        if (event.type === 'change') {
            if (!this._element.getReadOnly()) {
                this._element.setValue(this.getAdpValue());
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
    
    setAdpFocused: function(focus) {
        var q = jQuery(this._htmlElement);
        if (q[0]) {
            if (focus && !q.is(':focus')) q.focus();
            else if (!focus && q.is(':focus')) q.blur();
        }
    },
    getAdpFocused: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return jQuery(this._htmlElement).is(':focus'); 
    },
    
    setAdpReadOnly: function(readOnly) {
        var q = jQuery(this._htmlElement);
        if (q[0]) {
            if (readOnly && !q[0].hasAttribute('readonly')) q[0].setAttribute('readonly', 'readonly');
            else if (!readOnly && q[0].hasAttribute('readonly')) q[0].removeAttribute('readonly');
        }
    },
    getAdpReadOnly: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return e.getAttribute('readonly'); 
    },

    _doSetEnabled: function(enabled, locked) {
        if (enabled === undefined) enabled = this._element.getEnabled();
        if (locked === undefined) locked = this._element.getLocked();
        disabled = !enabled || locked;
        var q = jQuery(this._htmlElement), disabled = !enabled || locked;
        if (q[0]) {
            if (disabled && !q[0].hasAttribute('disabled')) q[0].setAttribute('disabled', 'disabled');
            else if (!disabled && q[0].hasAttribute('disabled')) q[0].removeAttribute('disabled');
        }
    },
    
    setAdpEnabled: function(enabled) {
        this._doSetEnabled(enabled, undefined);
    },
    getAdpEnabled: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return !e.hasAttribute('disabled'); 
    },
    
    setAdpValue: function(value) {
        if (this._htmlElement) {
            jQuery(this._htmlElement).val(value);
        }
    },
    
    setAdpLocked: function(locked) {
        this._doSetEnabled(undefined, locked);
    },
    
    getAdpValue: function() {
        if (this._htmlElement) 
            return jQuery(this._htmlElement).val();
    },
    
    setHtmlElement: function(htmlElement) {
        var old = this._htmlElement;
        if (old === htmlElement) return;
        this._htmlElement = htmlElement;
        this.setSelector(this._htmlElement);
        this._observeElementIfPossible();
        return true;
    },
    
    getHtmlElement: function() { return this._htmlElement; },

    cleanup: function() {
        Amm.Adapter.Abstract.Field.cleanup.call(this);
        Amm.JQueryListener.cleanup.call(this);
    }

};

Amm.extend(Amm.Adapter.Html.Input, Amm.Adapter.Abstract.Field);
Amm.extend(Amm.Adapter.Html.Input, Amm.JQueryListener);

