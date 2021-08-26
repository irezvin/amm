/* global Amm */

Amm.View.Html.Drag = function(options) {
    if (this['Amm.View.Html.Drag'] === '__CLASS__') {
        throw Error("Attempt to instantiate abstract class: Amm.View.Html.Drag");
    }
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this, options);
};

Amm.View.Html.Drag.prototype = {

    'Amm.View.Html.Drag': '__CLASS__', 
    
    _dragControllerView: null,
    
    getDragController: function() {
        return Amm.Drag.Controller.getInstance();
    },
    
    /**
     * @returns {Amm.View.Html.Drag.Controller}
     */
    getDragControllerView: function() {
        if (!this._dragControllerView) {
            this._dragControllerView = Amm.Drag.Controller.getInstance().findView(null, 
                'Amm.View.Html.Drag.Controller');
        }
        return this._dragControllerView;
    },

};

Amm.View.Html.Drag._calcSector = function(c0, c1, c) {
    if (c1 === c0) c1 = c0 + 1;
    var half = (c1 - c0)/2;
    var cc = c0 + half;
    var rel = (c - cc)/half;
    return rel;
};

/**
 * @return array [hSector, vSector]
 * hSector is measured in percentage of half size of element width, 
 * vSector is measured in percentage of half size of element height
 * 
 * hSector is -1 when x is on exact element left border, 0 when x on exact center of element, 1 when x on exact right border, and so on
 * save for vSector
 */
Amm.View.Html.Drag.getSectors = function(element, x, y) {
    var sess = Amm.Drag.Controller.getInstance().getSession();
    if ((!element || x === undefined || y === undefined) && !sess) {
        throw Error("There's no current drag session, cannot Amm.View.Html.Drag.getSectors() w/o arguments");
    }
    if (!element) element = sess.getNativeItem();
    if (x === undefined) x = sess.nativeEventInfo.pageX;
    if (y === undefined) y = sess.nativeEventInfo.pageY;
    var jq = jQuery(element), offs = jq.offset();
    return [
        Amm.View.Html.Drag._calcSector(offs.left, offs.left + jq.width(), x), 
        Amm.View.Html.Drag._calcSector(offs.top, offs.top + jq.height(), y)
    ];
};


Amm.extend(Amm.View.Html.Drag, Amm.View.Html);
Amm.extend(Amm.View.Html.Drag, Amm.View.Abstract);

