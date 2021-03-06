/* global Amm */

// Not a trait (but used only by Amm.Trait.Annotated, therefore such name)
Amm.Trait.Annotated.Container = function(options) {
    this._requireInterfaces('Annotated'); // our element must support annotated interface
    Amm.ElementBound.call(this);
    Amm.Element.call(this, options);
};

Amm.Trait.Annotated.Container.prototype = {

    'Amm.Trait.Annotated.Container': '__CLASS__', 
    
    setElement: function(element) {
        if (this._element !== null && this._element !== element)
            Error("can setElement() only once in Amm.Trait.Annotated.Container");
        return Amm.ElementBound.prototype.setElement.call(this, element);
    },

    _passAnnotatedContentChange: function(value, oldValue) {
        if (this._element) Amm.setProperty(this._element, Amm.event.origin.getId(), value);
    },
    
    createAnnotationElement: function(id) {
        var proto = this._element.getAnnotationElementPrototype(id);
        proto.id = id;
        proto.component = this;
        var res = new Amm.Element(proto);
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
        if (this._namedElements[id] || onlyIfExists) {
            return this.getNamedElement(id, 0, true);
        }
        return this.createAnnotationElement(id);
    },
    
    _getDefaultTraits: function() {
        return ['Amm.Trait.Component'];
    },
    
};

Amm.extend(Amm.Trait.Annotated.Container, Amm.Element);
Amm.extend(Amm.Trait.Annotated.Container, Amm.ElementBound);

