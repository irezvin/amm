/* global Amm */

/**
 * Extracts variants' settings from HTML to provide 
 * variants-based instantiator for element 
 * with Instantiator trait.
 * 
 * Doesn't update any HTML.
 * 
 * Example markup:
 * 
 * <div data-amm-dont-build="" data-amm-criteria="{json}">
 *      <!-- element prototype -->
 * </div>
 * <!-- more such divs ... -->
 * <div data-amm-dont-build="" data-amm-default="">
 *      <!-- default element prototype -->
 * </div>
 */
Amm.View.Html.Variants = function(options) {
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this, options);
    Amm.DomHolder.call(this);
    this._requireInterfaces('InstantiatorOrRepeater');
};

Amm.View.Html.Variants.ERROR_BOTH_ATTRIBS = "HTML definition of variant prototype cannot have both data-amm-default and data-amm-condition";
Amm.View.Html.Variants.ERROR_DEFAULT_DEFINED = "Default variant prototype was already defined";
Amm.View.Html.Variants.ERROR_INVALID_ATTRIBUTE = "Attribute data-amm-condition should contain hash value";

Amm.View.Html.Variants.prototype = {

    'Amm.View.Html.Variants': '__CLASS__',
    
//    getSuggestedTraits: function() {
//        return [Amm.Trait.Instantiator];
//    },
    
    _observeElementIfPossible: function() {
        var res = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (!res) return res;
        
        this._scanHtmlElementAndConfigureInstantiator();
        
        return res;
    },
    
    _scanHtmlElementAndConfigureInstantiator: function() {
        
        var r = Amm.View.Html.Variants.scanNodeForVairants(this._htmlElement);
        if (!r) return;
        this._element.reportInstantiatorOptions(r.default, r.conditions, r.prototypes);
    
    }
    

};

Amm.extend(Amm.View.Html.Variants, Amm.View.Html);
Amm.extend(Amm.View.Html.Variants, Amm.View.Abstract);


Amm.View.Html.Variants.builderExtension_build = function (htmlElement, proto, arg) {
    var r = Amm.View.Html.Variants.scanNodeForVairants(htmlElement);
    if (!r) return;
    proto.initialInstantiatorOptions = [r.default, r.conditions, r.prototypes];
};

Amm.View.Html.Variants.scanNodeForVairants = function(node) {

    var i, id;

    var conditions = [], prototypes = {};

    var def = null;

    for (i = 0; i < node.childNodes.length; i++) {
        var n = node.childNodes[i];
        if (!n.hasAttribute) continue;
        var d = n.hasAttribute('data-amm-default');
        var c = n.hasAttribute('data-amm-condition');
        /* @TODO Subclass Error so it will output message + node to console automatically */
        if (d && c) {
            console.error(Amm.View.Html.Variants.ERROR_BOTH_ATTRIBS, n);
            throw Error(Amm.View.Html.Variants.ERROR_BOTH_ATTRIBS);
        }
        if (d) {
            if (def) {
                console.error(Amm.View.Html.Variants.ERROR_DEFAULT_DEFINED, n, def);
                throw Error(Amm.View.Html.Variants.ERROR_DEFAULT_DEFINED);
            }
            def = n;
            continue;
        }
        var cond = (window.RJSON || window.JSON).parse(n.getAttribute('data-amm-condition'));
        if (!(cond && typeof cond === 'object')) {
            console.error(Amm.View.Html.Variants.ERROR_INVALID_ATTRIBUTE, n);
            throw Error(n);
        }
        id = cond.id || 'condition_' + conditions.length;
        cond.id = id;
        conditions.push(cond);
        prototypes[id] = n;
    }

    if (!conditions.length && !def) return; // nothing to do

    return {
        'default': def,
        conditions: conditions,
        prototypes: prototypes
    };

};