/* global Amm */

Amm.Trait.Annotated = function() {
    this._defaultAnnotations = ['label', 'description', 'required', 'error'];
};

Amm.Trait.Annotated.annotationElementDefaults = {
    
    BASE: { traits: ['Amm.Trait.Content', 'Amm.Trait.Visual'] },
    
    required: { contentTranslator: { class: 'Amm.Translator.RequiredMark' } },
    
    error: { contentTranslator: { class: 'Amm.Translator.Errors' } }
    
};

    
// used to merge defaults from Amm.Trait.Annotated.annotationElementDefaults and instance' annotationElementDefaults
Amm.Trait.Annotated.mergePrototypes = function (leftSrc, leftKey, rightSrc, rightKey) {
    var left, right;
    if (leftSrc && leftKey && leftKey in leftSrc) left = leftSrc[leftKey];
    if (leftKey) {
        if (leftSrc && leftKey in leftSrc) left = leftSrc[leftKey];
    } else {
        left = leftSrc;
    }
    if (rightKey) {
        if (rightSrc && rightKey in rightSrc) right  = rightSrc[rightKey];
    } else {
        right = rightSrc;
    }
    if (right === null) return null;
    if (!right) return left;
    if (!left) return right;
    if (typeof right !== 'object' || typeof left !== 'object') return right;
    return Amm.override({}, left, right);
};


Amm.Trait.Annotated.prototype = {

    'Annotated': '__INTERFACE__',
    
    _defaultAnnotations: null,
    
    _label: undefined,
    
    _description: undefined,
    
    _required: undefined,
    
    _error: undefined,
    
    annotationElementDefaults: null, // local overrides for Amm.Trait.Annotated.annotationElementDefaults

    // Element that contains Content elements showing annotations
    _annotationsContainer: undefined,
    
    _annotatedIdChange: function(id, oldId) {
        if ('' + id)
            this._annotationsContainer.setId(id + 'Annotations');
    },
    
    getAnnotationsContainer: function() {
        if (this._annotationsContainer === undefined) {
            var isSibling = !this['Amm.Element.Composite'], cntId = 'annotations';
            if (isSibling && ('' + this._id))  {
                cntId = this._id + 'Annotations';
            } else {
                cntId = 'annotations';
            }
            this._annotationsContainer = new Amm.Trait.Annotated.Container({
                id: cntId,
                parent: isSibling? this._parent : this,
                element: this
            });
            if (isSibling) this.subscribe('idChange', this._annotatedIdChange, this);
            this._assignDefaultAnnotations();
        }
        return this._annotationsContainer;
    },
    
    getAnnotationElementPrototype: function(id) {
        
        var def = Amm.Trait.Annotated.annotationElementDefaults, own = this.annotationElementDefaults;
        
        var base = Amm.Trait.Annotated.mergePrototypes(def, 'BASE', own, 'BASE');

        var spec = Amm.Trait.Annotated.mergePrototypes(def, id, own, id);
        
        var res = Amm.Trait.Annotated.mergePrototypes(base, null, spec, null);
        
        return Amm.override({}, res);
        
    },
    
    _assignDefaultAnnotations: function() {
        if (this._defaultAnnotations instanceof Array) {
            for (var i = 0, l = this._defaultAnnotations.length; i < l; i++) {
                var id = this._defaultAnnotations[i];
                var p = Amm.getProperty(this, id, undefined);
                if (p !== undefined) {
                    this.getAnnotationsContainer().getAnnotationElement(id).setContent(p);
                } else {
                    var cnt = this.getAnnotationsContainer().getAnnotationElement(id).getContent();
                    if (cnt !== undefined) Amm.setProperty(this, id, cnt);
                }
            }
        }
    },

    setLabel: function(label) {
        var oldLabel = this._label;
        if (oldLabel === label) return;
        this._label = label;
 
        this.outLabelChange(label, oldLabel);
        return true;
    },

    getLabel: function() { return this._label; },

    outLabelChange: function(label, oldLabel) {
        this._out('labelChange', label, oldLabel);
    },

    setDescription: function(description) {
        var oldDescription = this._description;
        if (oldDescription === description) return;
        this._description = description;
 
        this.outDescriptionChange(description, oldDescription);
        return true;
    },

    getDescription: function() { return this._description; },

    outDescriptionChange: function(description, oldDescription) {
        this._out('descriptionChange', description, oldDescription);
    },

    setRequired: function(required) {
        var oldRequired = this._required;
        if (oldRequired === required) return;
        this._required = required;
 
        this.outRequiredChange(required, oldRequired);
        return true;
    },

    getRequired: function() { return this._required; },

    outRequiredChange: function(required, oldRequired) {
        this._out('requiredChange', required, oldRequired);
    },
    
    setError: function(error) {
        var oldError = this._error;
        if (oldError === error) return;
        this._error = error;
 
        this.outErrorChange(error, oldError);
        return true;
    },

    getError: function() { return this._error; },

    outErrorChange: function(error, oldError) {
        this._out('errorChange', error, oldError);
    },

    listAnnotations: function() {
        return this.getAnnotationsContainer().listChildren();
    },
    
    getAnnotationValue: function(id) {
        if (id) {
            var ane = this.getAnnotationsContainer().getAnnotationElement(id, true);
            if (ane) return ane.getContent();
            return undefined;
        }
        // case when id's not used - return hash with all annotations
        var ll = this.listAnnotations(), cnt = this.getAnnotationsContainer();
        var res = {};
        for (var i = 0, l = ll.length; i < l; i++) {
            var id = ll[i];
            var e = cnt.getAnnotationElement(id, true);
            if (e) res[id] = e.getContent();
        }
        return res;
    },
    
    setAnnotationValue: function(value, id) {
        return this.getAnnotationsContainer().getAnnotationElement(id).setContent(value);
    }    

};
