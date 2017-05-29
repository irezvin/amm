/* global Amm */

Amm.Trait.Annotated.Container = function(options) {
    this._requireInterfaces('Annotated'); // our element must support annotated interface
    Amm.augment(this, Amm.Trait.Composite);
    Amm.ElementBound.call(this);
    Amm.Element.call(this, options);
};

Amm.Trait.Annotated.Container.prototype = {

    'Amm.Trait.Annotated.Container': '__CLASS__', 
    
    _annotated: null,
    
    _cleanupChildren: true,
    
    _cleanupWithParent: true,

    setElement: function(element) {
        if (this._element !== null && this._element !== element)
            throw "can setElement() only once in Amm.Trait.Annotated.Container";
        return Amm.ElementBound.prototype.setElement.call(this, element);
    },

    _passAnnotatedContentChange: function(value, oldValue) {
        if (this._element) Amm.setProperty(this._element, Amm.event.origin.getId(), value);
    },

    createAnnotationElement: function(id) {
        var res = new Amm.Element({traits: ['Amm.Trait.Content', 'Amm.Trait.Visual'], id: id, parent: this});
        var prop = {};
        if (Amm.detectProperty(this._element, id, prop)) {
            res.subscribe('contentChange', this._passAnnotatedContentChange, this);
            var p = this._element[prop.getterName](), v = res.getContent();
            if (p !== undefined) res.setContent(p);
            else if (p === undefined && v !== undefined) {
                this._element[prop.setterName](v);
            }
            this._element.subscribe(prop.eventName, res.setContent, res);
        }
        return res;
    },
    
    // lazily returns annotation element
    getAnnotationElement: function(id, onlyIfExists) {
        if (this.hasChild(id) || onlyIfExists) return this.getChild(id);
        return this.createAnnotationElement(id);
    }
    
};

Amm.extend(Amm.Trait.Annotated.Container, Amm.Element);
Amm.extend(Amm.Trait.Annotated.Container, Amm.ElementBound);

