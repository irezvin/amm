/* global Amm */

Amm.Table.HeaderCell = function(options) {
    Amm.Table.Cell.call(this, options);
};

Amm.Table.HeaderCell.prototype = {

    'Amm.Table.HeaderCell': '__CLASS__', 
    
    _hasVerticalHandle: false,
    
    _hasHorizontalHandle: false,
    
    _getDefaultInnerItems: function() {
        return [
            {
                $: 'div',
                'class': 'value',
                data_amm_value: true,
                data_amm_v: {
                    class: 'v.Expressions',
                    map: {
                        _html: 'value'
                    }
                }
            },
        ];  
    },
    
    constructDefaultViews: function() {
        var innerItems = this._getDefaultInnerItems();
        if (this._hasVerticalHandle) {
            innerItems.push({
                $: 'div',
                class: 'resizeHandle resizeHandleVertical'
            });
        }
        if (this._hasHorizontalHandle) {
            innerItems.push({
                $: 'div',
                class: 'resizeHandle resizeHandleHorizontal'
            });
        }
        var viewProto = [
            {
                class: 'v.Table.Cell',
            }
        ];
        var def = {
            $: 'th',
            tabindex: 0,
            data_amm_v: viewProto,
            $$: [
                {
                    $: 'div',
                    class: 'cellContent',
                    $$: innerItems,
                }
            ]
        };
        var res = Amm.dom(def);
        return res;
    },
    
    _getDefaultTraits: function(options) {
        var res = Amm.Table.Cell.prototype._getDefaultTraits.call(options);
        return res;
    },

};

Amm.extend(Amm.Table.HeaderCell, Amm.Table.Cell);

