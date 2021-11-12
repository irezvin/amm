/* global Amm */

Amm.Table.ObservingCell = function(options) {
    Amm.Table.Cell.call(this, options);
};

Amm.Table.ObservingCell.prototype = {

    'Amm.Table.ObservingCell': '__CLASS__', 
    
    _requiredColumnClass: 'Amm.Table.ObservingColumn',

    _propertyObserving: false,
    
    _observing: false,
    
    _source: null,
    
    _contextId: null,
    
    _value: null,
    
    _valueVisible: true,
    
    _sourceDefaultToColumnId: true,
    
    _doOnColumnChange: function(column, oldColumn) {
        Amm.Table.Cell.prototype._doOnColumnChange.call(this, column, oldColumn);
        Amm.subUnsub(column, oldColumn, this, ['sourceChange', 'idChange'], '_updateSource');
        if (column) this.setSource(column.getSource() || (this._sourceDefaultToColumnId? column.getId() : null));
    },
    
    _updateSource: function() {
        this.setSource(this._column.getSource() || this._column.getId());
    },
    
    _doOnItemChange: function(item, oldItem) {
        if (this._source && this._source['Amm.Expression'] && this._contextId) {
            this._source.setContextId(this._contextId);
            this._source.setExpressionThis(item);
            return;
        } else {
            this._unobserve();
            if (item) this._observe();
        }
    },

    setSource: function(source) {
        var oldSource = this._source;
        if (oldSource === source) return;
        this._unobserve();
        this._source = source;
        this._observe();
        if (source && source['Amm.Expression']) {
            var oldExpression = null;
            if (oldSource && oldSource['Amm.Expression']) oldExpression = oldSource;
        }
        this.outSourceChange(source, oldSource);
        return true;
    },

    _calcValueUpdateable: function(g) {
        if (Amm.Table.Cell.prototype._calcValueUpdateable.call(this, g)) return true;
        if (g('readOnly')) return false;
        var source = g('source');
        if (source && source['Amm.Expression']) {
            source.setContextId(this._contextId);
            return !g(source, 'readOnly', null, ['writeDestinationChanged']);
        }
        if (!source || (!g('item') || (typeof g('item')) !== 'object')) return false;
        var caps = {};
        Amm.detectProperty(g('item'), source, caps);
        return !!caps.setterName;
    },
    
    _doUpdateValue: function(value, editor, ret) {
        ret.done = true;
        if (!this.getValueUpdateable()) return;
        if (this._source && this._source['Amm.Expression']) {
            this._source.setContextId(this._contextId);
            if (!this._source.getReadOnly()) {
                this._source.setValue(value);
                ret.done = true;
            }
        } else if (this._source && this._item) {
            Amm.setProperty(this._item, this._source, value);
        }
    },
    
    _unobserve: function() {
        if (!this._observing) return;
        if (this._propertyObserving) {
            this._propertyObserving.unsubscribe(this._source + 'Change', 'reportValue', this);
            this._propertyObserving = false;
            this._observing = false;
            return;
        }
        this._observing = false;
        if (!this._source || !this._source['Amm.Expression']) return;
        if (!this._contextId) return;
        this._source.deleteContext(this._contextId);
        this._contextId = null;
    },
    
    _observe: function() {
        var eventName;
        
        if (this._observing) return;
        if (!this._source) return;
        if (typeof this._source === 'string') {
            if (!this._item) return;
            eventName = this._source + 'Change';
            if (!this._item.hasEvent(eventName)) return;
            this._item.subscribe(eventName, 'reportValue', this);
            this._observing = true;
            this._propertyObserving = this._item;
            this.reportValue(Amm.getProperty(this._item, this._source));
            return;
        }
        if (!this._source['Amm.Expression']) return;
        this._contextId = this._source.createContext({expressionThis: this.item, vars: {cell: this}});
        this._source.subscribe('valueChange', 'reportValue', this);
        this._observing = true;
    },

    getSource: function() { return this._source; },

    outSourceChange: function(source, oldSource) {
        this._out('sourceChange', source, oldSource);
    },
    
    reportValue: function(value) {
        this.setValue(value);
    },
    
    setValue: function(value) {
        var oldValue = this._value;
        if (oldValue === value) return;
        this._value = value;
        this.outValueChange(value, oldValue);
        return true;
    },

    getValue: function() { return this._value; },

    outValueChange: function(value, oldValue) {
        this._out('valueChange', value, oldValue);
    },

    _clenup_ObservingCell: function() {
        this._unobserve();
        this.setItem(null);
        this.setSource(null); 
    },

    setValueVisible: function(valueVisible) {
        console.warn('Amm.Table.ObservingCell.setValueVisible() has no effect');
    },

    getValueVisible: function() { return !this._editing; },

    outEditingChange: function(editing, oldEditing) {
        Amm.Table.Cell.prototype.outEditingChange.call(this, editing, oldEditing);
        this.outValueVisibleChange(!editing, !oldEditing);
    },
    
    outValueVisibleChange: function(valueVisible, oldValueVisible) {
        this._out('valueVisibleChange', valueVisible, oldValueVisible);
    },

    constructDefaultViews: function() {
        
        var nodes = {};
        var dom = Amm.dom({
            _id: 'cellView',
            $: 'td',
            tabindex: 0,
            $$: [
                {
                    $: 'div',
                    class: 'cellContent',
                    $$: [
                        {
                            $: 'div',
                            'class': 'value',
                            data_amm_value: true,
                        },
                        {
                            _id: 'displayParentView',
                            $: 'div',
                            'class': 'cellItems',
                        }
                    ]
                }
            ]
        }, false, nodes);
        
        var res = new Amm.View.Html.Table.ObservingCell({
            element: this, 
            htmlElement: nodes.cellView
        });
        
        new Amm.View.Html.DisplayParent({
            element: this,
            htmlElement: nodes.displayParentView,
        });
        
        return res;
        
    }

};

Amm.extend(Amm.Table.ObservingCell, Amm.Table.Cell);