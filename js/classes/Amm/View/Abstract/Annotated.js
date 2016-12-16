/* global Amm */

Amm.View.Abstract.Annotated = function(options) {
    this._childViews = [];
    Amm.View.Abstract.call(this, options);
};

Amm.View.Abstract.Annotated.prototype = {

    'Amm.View.Abstract.Annotated': '__CLASS__', 
    
    _childViews: null,
    
    // if annotationClass is provided, will search all children with that class,
    // and use remaining HTML classes as IDs (if annotationClassPrefix is provided, it will
    // be taken into accordance)
    // if {explode} is true, will treat htmlClass as attribute value with many space-separated classes,
    // and will return first non-empty result
    enumerateExisting: true,

    _observeElementIfPossible: function() {
        var r = Amm.View.Abstract.prototype._observeElementIfPossible.call(this);
        if (r) {
            if (this.enumerateExisting) this._createExisting();
        }
        return r;
    },
    
    _createExisting: function() {
    },
    
    // we need to remove current views
    _doElementChange: function(element, oldElement) {
        Amm.View.Abstract.prototype._doElementChange.call(this, element, oldElement);
        if (oldElement) oldElement.getAnnotationsContainer().unsubscribe(undefined, undefined, this);
        this._clearChildViews();
        if (element) {
            var anc = element.getAnnotationsContainer();
            anc.subscribe('childAdded', this._onAnnotationAdded, this);
            var cc = anc.listChildren();
            for (var i = 0; i < cc.length; i++) {
                this._createChildViews(anc.getChild(cc[i]));
            }
        }
    },
    
    _clearChildViews: function() {
        for (var i = this._childViews.length - 1; i >= 0; i--) {
            this._childViews[i].cleanup();
            delete this._childViews[i];
        }
    },
    
    // child is a child element of this.element.getAnnotationsContainer()
    _onAnnotationAdded: function(child) {
        this._createChildViews(child);
    },
    
    // child is a child element of this.element.getAnnotationsContainer()
    _createChildViews: function(child, throwIfCant) {
        // abstract
    },
    
    cleanup: function() {
        this._clearChildViews();
        Amm.View.Abstract.prototype.cleanup.call(this);
    }
    
};

Amm.extend(Amm.View.Abstract.Annotated, Amm.View.Abstract);
