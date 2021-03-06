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
    
    _passDisplayChildrenToComponent: true,
    
    _displayChildrenObservedForComponent: false,
    
    __augment: function(traitInstance, options) {
        
        var proto = this._getDefaultDisplayChildrenPrototype();
        
        if (this._displayChildrenPrototype) {
            Amm.overrideRecursive(proto, this._displayChildrenPrototype);
        }
        
        this.displayChildren = new Amm.Collection(proto);
        
        Amm.Element.regInit(this, '99_DisplayParent_observe', this._observeDisplayChildrenForComponent);
    },
    
    _getDefaultDisplayChildrenPrototype: function() {
        return {
            requirements: ['Visual'],
            assocInstance: this,
            assocProperty: 'displayParent',
            indexProperty: 'displayOrder',
            observeIndexProperty: true,
            assocEvents: {
                cleanup: '_handleDisplayChildCleanup'
            }
        };  
    },
    
    setDisplayChildrenPrototype: function(displayChildrenPrototype) {
        if (!displayChildrenPrototype) displayChildrenPrototype = null;
        else if (typeof displayChildrenPrototype !== 'object') {
            Error("`displayChildrenPrototype` must be a nullable or an object");
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
    },
    
    _observeDisplayChildrenForComponent: function(mode) {
        var should = mode === undefined? !! (this._closestComponent && this._passDisplayChildrenToComponent) : !!mode, 
            is = !! (this._displayChildrenObservedForComponent);
    
        if (should === is) return;
        
        if (should) {
            this.displayChildren.subscribe('spliceItems', this._passDisplayChildrenOnSplice, this);
        } else {
            this.displayChildren.unsubscribe('spliceItems', this._passDisplayChildrenOnSplice, this);
        }
        
        this._displayChildrenObservedForComponent = !!should;
    },
    
    _passDisplayChildrenOnSplice: function(index, cut, insert) {
        if (!this._passDisplayChildrenToComponent || !this._closestComponent) return;
        var removed = Amm.Array.symmetricDiff(cut, insert);
        var added = Amm.Array.symmetricDiff(insert, cut);
        if (removed) this._closestComponent.rejectElements(removed);
        if (added) {
            this._closestComponent.acceptElements(added);
        }
    },
    
    setPassDisplayChildrenToComponent: function(passDisplayChildrenToComponent) {
        passDisplayChildrenToComponent = !!passDisplayChildrenToComponent;
        var oldPassDisplayChildrenToComponent = this._passDisplayChildrenToComponent;
        if (oldPassDisplayChildrenToComponent === passDisplayChildrenToComponent) return;
        this._passDisplayChildrenToComponent = passDisplayChildrenToComponent;
        if (this._closestComponent) {
            var items = [];
            items = items.concat(this.displayChildren.getItems());
            if (this._passDisplayChildrenToComponent) {
                this._closestComponent.acceptElements(items);
            } else {
                this._closestComponent.rejectElements(items);
            }
        }
        this._observeDisplayChildrenForComponent();
        this.outPassDisplayChildrenToComponentChange(passDisplayChildrenToComponent, oldPassDisplayChildrenToComponent);
        return true;
    },

    getPassDisplayChildrenToComponent: function() { return this._passDisplayChildrenToComponent; },

    outPassDisplayChildrenToComponentChange: function(passDisplayChildrenToComponent, oldPassDisplayChildrenToComponent) {
        this._out('passDisplayChildrenToComponentChange', passDisplayChildrenToComponent, oldPassDisplayChildrenToComponent);
    },
    
    _findChildElements_DisplayParent: function(items) {
        if (this._passDisplayChildrenToComponent) {
            items.push.apply(items, this.displayChildren.getItems());
        }
    },
    
    _setClosestComponent_DisplayParent: function(component, oldComponent) {
        if (this._passDisplayChildrenToComponent) {
            Amm.Trait.Component.changeComponent(this.displayChildren, component, oldComponent);
        }
        this._observeDisplayChildrenForComponent();
    },
    
    _cleanup_DisplayParent: function() {
        // WTF
        if (this.displayChildren.length && this.displayChildren[0] === this.displayChildren[1]) {
            console.log(this.displayChildren.length);
            throw new Error("WTF - displayChildren collection corrupted during cleanup");
        }
        this.displayChildren.cleanup();
    },
    
    _handleDisplayChildCleanup: function(displayChild) {
        if (displayChild.getDisplayParent() === this) {
            var allowDelete = this.displayChildren.getAllowDelete();
            var allowChangeOrder = this.displayChildren.getAllowChangeOrder();
            this.displayChildren.setAllowDelete(true);
            this.displayChildren.setAllowChangeOrder(true);
            this.displayChildren.reject(displayChild);
            this.displayChildren.setAllowDelete(allowDelete);
            this.displayChildren.setAllowChangeOrder(allowChangeOrder);
        }
    }

};

