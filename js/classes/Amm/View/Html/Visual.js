/* global Amm */

Amm.View.Html.Visual = function(options) {
    Amm.View.Abstract.Visual.call(this, options);
    Amm.View.Html.call(this);
};

Amm.View.Html.Visual.defaultDelay = 250;

Amm.View.Html.Visual.prototype = {

    'Amm.View.Html.Visual': '__CLASS__', 
    
    delay: undefined,
    
    extraClassName: '',
    
    setVVisible: function(visible) {
        visible = !!visible;
        // prevent bug that forces items to have 'display: block' or 'display: inline' on initialization
        /*if (visible === this.getVVisible()) {
            return;
        }*/
        var delay = this.delay;
        if (delay === undefined) delay = Amm.View.Html.Visual.defaultDelay;
        jQuery(this._htmlElement)[visible? 'show' : 'hide'](delay || undefined);
    },

    getVVisible: function() {
        if (!this._htmlElement) return undefined;
        var res = this._htmlElement.style.display !== "none" && 
            this._htmlElement.style.height !== "0px";
        return res;
    },

    setVDisplayParent: function(displayParent) {
        // TODO
    },

    getVDisplayParent: function() {
        // TODO... but unreal?
    },
 
    setVDisplayOrder: function(displayOrder) {
    },

    getVDisplayOrder: function() { 
    },
 
    setVToggleClass: function(className, enabled) {
        jQuery(this._htmlElement)[enabled? 'addClass' : 'removeClass'](className);
    },
    
    getVToggleClass: function(className) {
        return jQuery(this._htmlElement).hasClass(className);
    },
    
    setVClassName: function(className) {
        if (this.extraClassName) {
            className = Amm.Util.alterClassName(className, true, this.extraClassName);
        }
        jQuery(this._htmlElement).attr('class', className);
    },

    getVClassName: function() {
        var res = jQuery(this._htmlElement).attr('class');
        if (this.extraClassName) {
            res = Amm.Util.alterClassName(res, false, this.extraClassName);
        }
        return res;
    },
    
    cleanup: function() {
        Amm.View.Abstract.Visual.prototype.cleanup.call(this);
        if (this._htmlElement) this._releaseDomNode(this._htmlElement);
    },
    
    _acquireResources: function() {
        this._acquireDomNode(this._htmlElement);
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Visual];
    }
        
};

Amm.extend(Amm.View.Html.Visual, Amm.View.Html);
Amm.extend(Amm.View.Html.Visual, Amm.View.Abstract.Visual);
