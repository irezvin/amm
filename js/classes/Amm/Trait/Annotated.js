/* global Amm */

Amm.Trait.Annotated = function() {
    this._defaultAnnotations = ['label', 'description', 'required'];
};

Amm.Trait.Annotated.prototype = {

    'Annotated': '__INTERFACE__',
    
    _defaultAnnotations: null,

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
    
    _assignDefaultAnnotations: function() {
        if (this._defaultAnnotations instanceof Array) {
            for (var i = 0, l = this._defaultAnnotations.length; i < l; i++) {
                var id = this._defaultAnnotations[i];
                var p = Amm.getProperty(this, id, undefined);
                if (p !== undefined) {
                    this.getAnnotationsContainer().getAnnotationElement(id).setContent(p);
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
    }

};
