/* global Amm */

Amm.Trait.Visual = function() {
};
 
Amm.Trait.Visual.prototype = {

    'Visual': '__INTERFACE__',
    'ClassName': '__INTERFACE__',
    'DisplayChild': '__INTERFACE__',

    _visible: undefined,

    _displayParent: undefined,

    _displayOrder: undefined,

    _className: undefined,

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
        if (displayParent) Amm.is(displayParent, 'DisplayParent', 'displayParent');
        else displayParent = null;
        var oldDisplayParent = this._displayParent;
        if (oldDisplayParent === displayParent) return;
        this._displayParent = displayParent;
        if (oldDisplayParent) {
            var idx = oldDisplayParent.displayChildren.strictIndexOf(this);
            if (idx >= 0) oldDisplayParent.displayChildren.removeAtIndex(idx);
        }
        if (displayParent) {
            var idxNew = displayParent.displayChildren.strictIndexOf(this);
            if (idxNew < 0) displayParent.displayChildren.accept(this);
        }
        this.outDisplayParentChange(displayParent, oldDisplayParent);
        return true;
    },

    getDisplayParent: function() { return this._displayParent; },
 
    outDisplayParentChange: function(displayParent, oldDisplayParent) {
        this._out('displayParentChange', displayParent, oldDisplayParent);
    },

    setDisplayOrder: function(displayOrder) {
        if (displayOrder !== null && typeof displayOrder !== 'number') {
            displayOrder = parseInt(displayOrder);
            if (isNaN(displayOrder)) throw Error("`displayOrder` must be a null or a number");
        }
        var oldDisplayOrder = this._displayOrder;
        if (oldDisplayOrder === displayOrder) return;
        if (displayOrder !== null) {
            if (this._displayParent && displayOrder >= this._displayParent.displayChildren.length) {
                displayOrder = this._displayParent.displayChildren.length - 1;
            }
            if (displayOrder < 0) displayOrder = 0;
        }
        this._displayOrder = displayOrder;
        this.outDisplayOrderChange(displayOrder, oldDisplayOrder);
        return true;
    },

    getDisplayOrder: function() { return this._displayOrder; },
 
    outDisplayOrderChange: function(displayOrder, oldDisplayOrder) {
        this._out('displayOrderChange', displayOrder, oldDisplayOrder);
    },
    
    /**
     * A: setClassName('foo bar')
     * B: setClassName(true, 'foo') - will add 'foo' to class name
     * C: setClassName(false, 'foo') - will remove 'foo' from class name
     */
    setClassName: function(classNameOrToggle, part) {
        var oldClassName = this._className;
        var className = Amm.Util.alterClassName(oldClassName, classNameOrToggle, part);
        if (className === oldClassName) return;
        this._className = className;
        this.outClassNameChange(className, oldClassName);
        return true;
    },

    getClassName: function(part) { 
        if (!part) 
            return this._className; 
        return (' ' + this._className + ' ').indexOf(' ' + part + ' ') >= 0;
    },
 
    outClassNameChange: function(className, oldClassName) {
        this._out('classNameChange', className, oldClassName);
    },
    
};

// Amm.extend(Amm.Trait.Visual, Amm.Util); // required dependency