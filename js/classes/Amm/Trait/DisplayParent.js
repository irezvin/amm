/* global Amm */

// all visual children must implement DisplayChild interface

Amm.Trait.DisplayParent = function() {
};

Amm.Trait.DisplayParent.prototype = {
    
    'DisplayParent': '__INTERFACE__',

    /**
     * @type {Amm.Collection}
     */
    displayChildren: null,
    
    _displayChildrenPrototype: null,
    
    __augment: function(traitInstance) {
        
        var proto = {
            requirements: ['Visual'],
            assocInstance: this,
            assocProperty: 'displayParent',
            indexProperty: 'displayOrder',
            observeIndexProperty: true
        };
        
        if (this._displayChildrenPrototype) {
            Amm.override(proto, this._displayChildrenPrototype);
        }
        
        this.displayChildren = new Amm.Collection(proto);
    },
    
    setDisplayChildrenPrototype: function(displayChildrenPrototype) {
        if (!displayChildrenPrototype) displayChildrenPrototype = null;
        else if (typeof displayChildrenPrototype !== 'object') {
            throw "`displayChildrenPrototype` must be a nullable or an object";
        }
        var oldDisplayChildrenPrototype = this._displayChildrenPrototype;
        if (oldDisplayChildrenPrototype === displayChildrenPrototype) return;
        this._displayChildrenPrototype = displayChildrenPrototype;
        if (this.displayChildren && this._displayChildrenPrototype) {
            Amm.init(this.displayChildren, this._displayChildrenPrototype);
        }
        return true;
    },

    getDisplayChildrenPrototype: function() { return this._displayChildrenPrototype; },

    /**
     * @returns {Amm.Collection}
     */
    getDisplayChildren: function() {
        return this.displayChildren;
    },
    
    setDisplayChildren: function(items) {
        return this.displayChildren.setItems(items);
    }
    
};

