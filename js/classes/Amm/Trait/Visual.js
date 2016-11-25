/* global Amm */

Amm.Trait.Visual = function() {
};
 
Amm.Trait.Visual.prototype = {

    'Visual': '__INTERFACE__',
    'Classes': '__INTERFACE__',
    'DisplayChild': '__INTERFACE__',

    _visible: undefined,

    _displayParent: undefined,

    _displayOrder: undefined,

    _classes: undefined,

    setVisible: function(visible) {
        var oldVisible = this._visible;
        if (oldVisible === visible) return;
        this._visible = visible;
 
        this.outVisibleChange(visible, oldVisible);
        return true;
    },

    getVisible: function() { return this._visible; },

    outVisibleChange: function(visible, oldVisible) {
        this._out('visibleChange', visible, oldVisible);
    },

    setDisplayParent: function(displayParent) {
        var oldDisplayParent = this._displayParent;
        if (oldDisplayParent === displayParent) return;
        this._displayParent = displayParent;
 
        this.outDisplayParentChange(displayParent, oldDisplayParent);
        return true;
    },

    getDisplayParent: function() { return this._displayParent; },
 
    outDisplayParentChange: function(displayParent, oldDisplayParent) {
        this._out('displayParentChange', displayParent, oldDisplayParent);
    },

    setDisplayOrder: function(displayOrder) {
        var oldDisplayOrder = this._displayOrder;
        if (oldDisplayOrder === displayOrder) return;
        this._displayOrder = displayOrder;
 
        this.outDisplayOrderChange(displayOrder, oldDisplayOrder);
        return true;
    },

    getDisplayOrder: function() { return this._displayOrder; },
 
    outDisplayOrderChange: function(displayOrder, oldDisplayOrder) {
        this._out('displayOrderChange', displayOrder, oldDisplayOrder);
    },

    setClasses: function(classes) {
        var oldClasses = this._classes;
        if (oldClasses === classes) return;
        this._classes = classes;
 
        this.outClassesChange(classes, oldClasses);
        return true;
    },

    getClasses: function() { return this._classes; },
 
    outClassesChange: function(classes, oldClasses) {
        this._out('classesChange', classes, oldClasses);
    }

};
