/* global Amm */

Amm.Table.ObservingColumn = function(options) {
    Amm.Table.Column.call(this, options);
};

Amm.Table.ObservingColumn.prototype = {

    'Amm.Table.ObservingColumn': '__CLASS__', 
    
    _source: null,
    
    _sourceIsOwn: false,

    setSource: function(source) {
        if (!source) source = null;
        else if (typeof source === 'object') {
            Amm.is(source, 'Amm.Expression', 'source');
            this._sourceIsOwn = false;
        } else if (typeof source === 'string') {
            if (!source.match(/^\w+$/)) { // it is an Expression
                if (this._source && this._source['Amm.Expression'] && this._source.getSrc() === source) {
                    source = this._source;
                } else {
                    source = new Amm.Expression(source);
                }
            }
        } else {
            throw Error("`source` must be either null, Amm.Expression or string");
        }
        var oldSource = this._source;
        if (oldSource === source) return;
        this._cleanupSource();
        this._source = source;
        this.outSourceChange(source, oldSource);
        return true;
    },

    getSource: function() { return this._source; },

    outSourceChange: function(source, oldSource) {
        this._out('sourceChange', source, oldSource);
    },
    
    _cleanupSource: function() {
        if (this._sourceIsOwn && this._source && this._source['Amm.Expression']) {
            this._source.cleanup();
            this._source = null;
        }
    },
    
    _cleanup_ObservingColumn: function() {
        this._cleanupSource();
    },
    
    configureCellProto: function(ret, row) {
        ret.proto.class = 'Amm.Table.ObservingCell';
    }

};

Amm.extend(Amm.Table.ObservingColumn, Amm.Table.Column);

