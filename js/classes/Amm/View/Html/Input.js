/* global Amm */

/**
 * Subscribes to change, focus, blur events.
 * jQuery to Element: value, focus
 * Element to JQuery: value, focus, readOnly, enabled
 */
Amm.View.Html.Input = function(options) {
    var t = this;
    this._handler = function(event) { return t._receiveEvent(event, this); };
    Amm.View.Abstract.Field.call(this, options);
    Amm.DomHolder.call(this);
    Amm.JQueryListener.call(this, {});
};

Amm.View.Html.Input.prototype = {

    'Amm.View.Html.Input': '__CLASS__', 

    _eventName: 'change focus blur',
    
    _presentationProperty: '_htmlElement',
    
    _htmlElement: null,
    
    _blurTimeoutHandler: null,
    
    _receiveEvent: function(event) {
        if (!this._element) return;
        if (event.type === 'change') {
            if (!this._element.getReadOnly()) {
                this._element.setValue(this.getVValue());
            }
            return true;
        } else if (event.type === 'focus') {
            this._element.setFocusedView(this);
            return true;
        } else if (event.type === 'blur') {
            var t = this;
            // in browser, focus switching from one element to another fires first 'blur' event, 
            // then 'focus'. Timeout is added to avoid flapping of `focused` propety when focus
            // is switched to another view of the same element.
            if (!this._blurTimeoutHandler) this._blurTimeoutHandler = function() { 
                if (t._element.getFocusedView() === t)
                    t._element.setFocusedView(null);
            };
            window.setTimeout(this._blurTimeoutHandler, 1);
            return true;
        }
    },
    
    setVFocusedView: function(value) {
        var focused = (value === this);
        var q = jQuery(this._htmlElement);        
        if (q[0]) {
            if (focused && !q.is(':focus')) q.focus();
            else if (!focused && q.is(':focus')) q.blur();
        }
    },
    
    getVFocusedView: function() { 
        if (jQuery(this._htmlElement).is(':focus')) return this;
    },
    
    setVReadOnly: function(readOnly) {
        var q = jQuery(this._htmlElement);
        if (q[0]) {
            if (readOnly && !q[0].hasAttribute('readonly')) q[0].setAttribute('readonly', 'readonly');
            else if (!readOnly && q[0].hasAttribute('readonly')) q[0].removeAttribute('readonly');
        }
    },
    getVReadOnly: function() { 
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
    
    setVEnabled: function(enabled) {
        this._doSetEnabled(enabled, undefined);
    },
    getVEnabled: function() { 
        var e = jQuery(this._htmlElement)[0];
        if (e) return !e.hasAttribute('disabled'); 
    },
    
    setVValue: function(value) {
        if (this._htmlElement) {
            jQuery(this._htmlElement).val(value);
        }
    },
    
    setVLocked: function(locked) {
        this._doSetEnabled(undefined, locked);
    },
    
    getVValue: function() {
        if (this._htmlElement) 
            return jQuery(this._htmlElement).val();
    },
    
    setHtmlElement: function(htmlElement) {
        var old = this._htmlElement;
        if (old === htmlElement) return;
        if (old) this._releaseDomNode(old);
        this._htmlElement = htmlElement;
        this.setSelector(this._htmlElement);
        this._observeElementIfPossible();
        return true;
    },
    
    getHtmlElement: function() { return this._htmlElement; },

    cleanup: function() {
        Amm.View.Abstract.Field.prototype.cleanup.call(this);
        Amm.JQueryListener.prototype.cleanup.call(this);
        if (this._htmlElement) this._releaseDomNode(this._htmlElement);
    },
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Field];
    }

};

Amm.extend(Amm.View.Html.Input, Amm.View.Abstract.Field);
Amm.extend(Amm.View.Html.Input, Amm.JQueryListener);
Amm.extend(Amm.View.Html.Input, Amm.DomHolder);

