/* global Amm */

Amm.View.Html.Select = function(options) {
    Amm.View.Html.call(this);
    Amm.View.Abstract.Select.call(this, options);
};

Amm.View.Html.Select.prototype = {

    'Amm.View.Html.Select': '__CLASS__', 
    
    _fieldView: null,
    
    _collectionView: null,
    
    _createFieldView: function() {
        var proto = {
            getVReadOnly: this._fieldView_getVReadOnly,
            setVReadOnly: this._fieldView_setVReadOnly,
            htmlElement: this._htmlElement,
            //element: this._element
        };
        this._fieldView = new Amm.View.Html.Input(proto);
        this._fieldView._receiveEvent = this._fieldView__receiveEvent;
    },
    
    _fieldView_getVReadOnly: function() { return false; },
    
    _fieldView_setVReadOnly: function(readOnly) {},
    
    _fieldView__receiveEvent: function(event) {
        if (!this._element) return;
        if (event.type === 'change' && this._element.getReadOnly()) {
            this.setVValue(this._element.getValue());
            return true;
        }
        return Amm.View.Html.Input.prototype._receiveEvent.call(this, event);
    },
    
    _detectOptions: function(element) {
        var jq = jQuery(element);
        var options = [];
        for (var i = 0; i < element.options.length; i++) {
            var item = element.options[i];
            var itm = {label: jQuery(item).html(), value: item.value};
            if (item.disabled) itm.disabled = true;
            if (item.selected) {
                itm.selected = true;
            }
            options.push(itm);
        };
        return options;
    },
    
    _createCollectionView: function() {
        var options = this._element.getOptions();
        
        if (options === undefined) {
            this._element.setOptions(this._detectOptions(this._htmlElement));
        }
        
        var t = this;
        var proto = {
            collectionProperty: 'optionsCollection',
            //element: this._element,
            htmlElement: this._htmlElement,
            createItemHtml: function(item) {
                var r = jQuery('<option>' + item.getLabel() + '</option>');
                r.attr('value', item.getValue());
                if (item.getDisabled()) r.attr('disabled', 'disabled');
                if (item.getSelected()) r.attr('selected', 'selected');
                return r[0];
            },
            updateItemHtml: function(item, node) {
                var selected = !!item.getSelected();
                node.selected = selected;
                node.disabled = t._element.getReadOnly() && !selected || !!item.getDisabled();
                node.value = item.getValue();
                jQuery(node).html(item.getLabel());
            }
        };
        this._collectionView = new Amm.View.Html.Collection(proto);
    },
    
    _doObserveSelect: function() {
        Amm.View.Abstract.Select.prototype._doObserveSelect.call(this);
        this._fieldView.setElement(this._element);
        this._collectionView.setElement(this._element);
    },
    
    _endObserve: function() {
        this._fieldView.setElement(null);
        this._collectionView.setElement(null);
    },
    
    setHtmlElement: function(htmlElement) {
        if (htmlElement && htmlElement.tagName !== 'SELECT') {
            Error("<select> element must be provided");
        }
        return Amm.View.Html.prototype.setHtmlElement.call(this, htmlElement);
    },
    
    _doSetHtmlElement: function(htmlElement, old) {
        if (this._fieldView) this._fieldView.setHtmlElement(this._htmlElement);
        if (this._collectionView) this._collectionView.setHtmlElement(this._htmlElement);
    },
    
    getVMultiple: function() { 
        var e = jQuery(this._htmlElement);
        if (e[0]) return !!e.attr('multiple'); 
    },
    
    setVMultiple: function(value) { 
        var e = jQuery(this._htmlElement);
        if (e[0]) e.attr('multiple', value? 'multiple': null); 
    },
    
    setVReadOnly: function(readOnly) {
        if (this._collectionView) this._collectionView.refreshAllItems();
    },
    
    getVSelectSize: function() {
        var e = jQuery(this._htmlElement);
        if (e[0]) {
            return e[0].size || 1;
        } 
    },
    
    setVSelectSize: function(value) {
        var e = jQuery(this._htmlElement);
        if (e[0]) e.attr('size', value); 
    },
    
    getSuggestedTraits: function() {
        return [Amm.Trait.Select];
    }

};

Amm.extend(Amm.View.Html.Select, Amm.View.Html);
Amm.extend(Amm.View.Html.Select, Amm.View.Abstract.Select);
