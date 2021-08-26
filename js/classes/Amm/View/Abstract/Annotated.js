/* global Amm */

Amm.View.Abstract.Annotated = function(options) {
    this._childViews = [];
    Amm.View.Abstract.call(this, options);
    this._requireInterfaces('Annotated');
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

    _tryObserve: function() {
        var r = Amm.View.Abstract.prototype._tryObserve.call(this);
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
            anc.subscribe('acceptedElements', this._onAnnotationAdded, this);
            var cc = anc.getElements();
            for (var i = 0; i < cc.length; i++) {
                this._createChildViewsOrDefer(cc[i]);
            }
        }
    },
    
    _clearChildViews: function() {
        for (var i = this._childViews.length - 1; i >= 0; i--) {
            this._childViews[i].cleanup();
            delete this._childViews[i];
        }
    },
    
    _createViewOnChildContentChange: function(newValue, oldValue) {
        var child = Amm.event.origin;
        if (newValue && child._annotated_needCreateViews) {
            if (this._createChildViews(child)) {
                child.unsubscribe('contentChange', this._createViewOnChildContentChange, this);
                child._annotated_needCreateViews = false;
            }
        }
    },
    
    _createChildViewsOrDefer: function(child) {
        if (!this._createChildViews(child)) {
            child._annotated_needCreateViews = true;
            child.subscribe('contentChange', this._createViewOnChildContentChange, this);
        }
    },
    
    // child is a child element of this.element.getAnnotationsContainer()
    _onAnnotationAdded: function(elements) {
        for (var i = 0, l = elements.length; i < l; i++) {
            this._createChildViewsOrDefer(elements[i]);
        }
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

