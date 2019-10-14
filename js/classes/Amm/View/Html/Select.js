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
            getVValue: this._fieldView_getVValue,
            setVValue: this._fieldView_setVValue,
            //element: this._element
        };
        this._fieldView = new Amm.View.Html.Input(proto);
        this._fieldView._selectView = this;
        this._fieldView._receiveEvent = this._fieldView_receiveEvent;
    },
    
    _fieldView_getVReadOnly: function() { return false; },
    
    _fieldView_setVReadOnly: function(readOnly) {},
    
    _fieldView_receiveEvent: function(event) {
        if (!this._element) return;
        if (event.type === 'change' && this._element.getReadOnly()) {
            this.setVValue(this._element.getValue());
            return true;
        }
        return Amm.View.Html.Input.prototype._receiveEvent.call(this, event);
    },
    
    _fieldView_setVValue: function (value) {
        if (!this._selectView._element) return;
        var cv = this._selectView._collectionView;
        var i, l;
        if (!cv) return Amm.View.Html.Input.prototype.getVValue.call(this);
        if (this._element.getMultiple()) {
            for (i = 0, l = this._htmlElement.options.length; i < l; i++) {
                var item = cv.getHtmlElementItem(this._htmlElement.options[i]);
                if (!item) continue;
                this._htmlElement.options[i].selected = Amm.Array.indexOf(item.getValue(), value) >= 0;
            }
            return;
        } 
        for (i = 0, l = this._htmlElement.options.length; i < l; i++) {
            var item = cv.getHtmlElementItem(this._htmlElement.options[i]);
            this._htmlElement.options[i].selected = (item.getValue() === value);
        }
    },
    
    _fieldView_getVValue: function() {
        if (this._element.getOptions() === undefined && this._htmlElement) {
            
            // very stupid method - because first time this method is called during
            // property auto-detection, we need to auto-detect options first, otherwise
            // setValue() will be applied to element w/o options
            
            this._element.setOptions(this._detectOptions(this._htmlElement));
            return;
        }
        var res = [];
        var multi = this._element.getMultiple();
        var cv = this._selectView._collectionView;
        if (!cv) return Amm.View.Html.Input.prototype.getVValue.call(this);
        for (var i = 0, l = this._htmlElement.options.length; i < l; i++) {
            if (!this._htmlElement.options[i].selected) continue;
            var item = cv.getHtmlElementItem(this._htmlElement.options[i]);
            if (!item) continue;
            var val = item.getValue();
            if (!multi) {
                return val;
            }
            else res.push(val);
        }
        if (!multi) return null;
        return res;
    },
    
    _detectOptions: function(element) {
        var jq = jQuery(element);
        var options = [];
        for (var i = 0; i < element.options.length; i++) {
            var htmlOption = element.options[i];
            var elementOption = {
                label: jQuery(htmlOption).html(), 
                value: htmlOption.value
            };
            if (htmlOption.disabled) elementOption.disabled = true;
            elementOption.selected = !!htmlOption.selected;
            options.push(elementOption);
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
                var v = item.getValue();
                if (typeof v !== 'object') {
                    r.attr('value', v);
                } else {
                    r.removeAttr('value');
                }
                if (item.getDisabled()) r.attr('disabled', 'disabled');
                if (item.getSelected()) r.attr('selected', 'selected');
                if (!item.getVisible()) return r.wrap('<span>').parent()[0];
                else return r[0];
            },
            updateItemHtml: function(item, node) {
                var wasSpan = false;
                if (node.tagName === 'SPAN') {
                    wasSpan = true;
                    node = node.firstChild;
                }
                var selected = !!item.getSelected();
                node.selected = selected;
                node.disabled = t._element.getReadOnly() && !selected || !!item.getDisabled();
                var v = item.getValue();
                if (typeof v !== 'object') {
                    node.value = v;
                } else {
                    node.removeAttribute('value');
                }
                jQuery(node).html(item.getLabel());
                if (!item.getVisible()) {
                    if (!wasSpan) node = jQuery(node).wrap('<span></span>').parent()[0];
                    else node = node.parentNode;
                } else if (wasSpan) {
                    node.parentNode.removeChild(node);
                }
                return node;
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
