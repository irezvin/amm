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
    
    _doOnColumnChange: function(column, oldColumn) {
        Amm.Table.Cell.prototype._doOnColumnChange.call(this, column, oldColumn);
        Amm.subUnsub(column, oldColumn, this, ['sourceChange', 'idChange'], '_updateSource');
        if (column) this.setSource(column.getSource() || column.getId());
    },
    
    _updateSource: function() {
        this.setSource(this._column.getSource() || this._oclumn.getId());
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
        this.outSourceChange(source, oldSource);
        return true;
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
   
    constructDefaultViews: function() {
        var res = Amm.html({
            $: 'td',
            data_amm_v: [
                {
                    class: 'v.Visual'
                },
            ],
            $$: [
                {
                    $: 'div',
                    data_amm_value: true,
                    data_amm_v: {
                        class: 'v.Expressions',
                        map: {
                            _html: 'value'
                        }
                    }
                },
                {
                    $: 'div',
                    class: 'v.DisplayParent'
                }
            ]
        });
        return res;
    }

};

Amm.extend(Amm.Table.ObservingCell, Amm.Table.Cell);