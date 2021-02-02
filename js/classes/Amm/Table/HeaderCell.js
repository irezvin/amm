/* global Amm */

Amm.Table.HeaderCell = function(options) {
    Amm.Table.Cell.call(this, options);
};

Amm.Table.HeaderCell.prototype = {

    'Amm.Table.HeaderCell': '__CLASS__', 
    
    _doOnColumnChange: function(column, oldColumn) {
        Amm.Table.Cell.prototype._doOnColumnChange.call(this, column, oldColumn);
        Amm.subUnsub(column, oldColumn, this, ['captionChange', 'idChange'], '_handleColumnCaptionChange');
        if (column) this._handleColumnCaptionChange(column.getCaption(), null);
    },
    
    _handleColumnCaptionChange: function(caption, oldCaption) {
        var cap = caption;
        if (!cap && this._column) cap = this._column.getId();
        this.setValue(cap);
    },
    
    constructDefaultViews: function() {
        var res = Amm.html({
            $: 'th',
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

Amm.extend(Amm.Table.HeaderCell, Amm.Table.Cell);

