/* global Amm */

/**
 * Subscribes to change, focus, blur events.
 * jQuery to Element: value, focus
 * Element to JQuery: value, focus, readOnly, enabled
 */
Amm.View.Html.Input = function(options) {
    var t = this;
    this._handler = function(event) { return t._receiveEvent(event, this); };
    Amm.View.Abstract.Input.call(this, options);
    Amm.View.Html.call(this);
    Amm.JQueryListener.call(this, {});
};

Amm.View.Html.Input.prototype = {

    'Amm.View.Html.Input': '__CLASS__', 

    _blurTimeoutId: null,

    _eventName: 'change focus blur',
    
    _blurTimeoutHandler: null,
    
    _resolveHtmlElement: false,
    
    _watchKeys: false,
    
    _receiveEvent: function(event) {
        if (!this._element) return;
        /** @TODO changeEvents property (that will be also added to event names) */
        if (event.type === 'focus') {
            this._element.setFocusedView(this);
            return true;
        } 
        if (event.type === 'blur') {
            var t = this;
            // in browser, focus switching from one element to another fires first 'blur' event, 
            // then 'focus'. Timeout is added to avoid flapping of `focused` propety when focus
            // is switched to another view of the same element.
            if (!this._blurTimeoutHandler) this._blurTimeoutHandler = function() { 
                t._blurTimeoutId = null;
                if (jQuery(t._htmlElement).is(':focus')) return;
                if (t._element.getFocusedView() === t)
                    t._element.setFocusedView(null);
            };
            this._blurTimeoutId = window.setTimeout(this._blurTimeoutHandler, 1);
            return true;
        }
        if (!this._element.getReadOnly()) {
            this._element.setValue(this.getVValue());
        }
        return true;
    },
    
    setVFocusedView: function(value) {
        var focused = (value === this);
        if (this._initDone && !focused && !this._element.getReadOnly()) {
            var val = this.getVValue();
            if (val !== undefined) this._element.setValue(val);
        }
        var q = jQuery(this._htmlElement);        
        if (q[0]) {
            if (focused && !q.is(':focus')) {
                q.focus();
            }
            else if (!focused && q.is(':focus')) q.blur();
        }
    },
    
    getVFocusedView: function() { 
        if (jQuery(this._htmlElement).is(':focus')) return this;
    },
    
    _handleElementFocus: function() {
        var fv = this._element.getFocusedView();
        if (!fv || fv === this) {
            Amm.getRoot().defer(function() {
                this._htmlElement.focus();
            }, this);
        }
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
            if (disabled && !q[0].hasAttribute('disabled')) {
                q[0].setAttribute('disabled', 'disabled');
            }
            else if (!disabled && q[0].hasAttribute('disabled')) {
                q[0].removeAttribute('disabled');
            }
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
    
    _doSetHtmlElement: function(htmlElement) {
        this.setSelector(htmlElement);
    },
    
    cleanup: function() {
        Amm.View.Abstract.Input.prototype.cleanup.call(this);
        Amm.JQueryListener.prototype.cleanup.call(this);
        if (this._htmlElement) this._releaseDomNode(this._htmlElement);
    },
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Input];
    },
    
    setUpdateOnKeyUp: function(updateOnKeyUp) {
        updateOnKeyUp = !!updateOnKeyUp;
        var ev = this._eventName;
        var hasKeyUp = this.getUpdateOnKeyUp();
        if (updateOnKeyUp === hasKeyUp) return;
        if (updateOnKeyUp && !hasKeyUp) ev += ' keyup';
        else ev = ev.replace(/\bkeyup\b/g, '').replace(/ +/, ' ').replace(/^ +| +$/g, '');
        this.setEventName(ev);
    },
    
    getUpdateOnKeyUp: function() {
        return !!this._eventName.match(/\bkeyup\b/);
    }

};

Amm.extend(Amm.View.Html.Input, Amm.View.Html);
Amm.extend(Amm.View.Html.Input, Amm.JQueryListener);
Amm.extend(Amm.View.Html.Input, Amm.View.Abstract.Input);
