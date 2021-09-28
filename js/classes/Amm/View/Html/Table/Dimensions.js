/* global Amm */

Amm.View.Html.Table.Dimensions = function(options) {
    Amm.View.Html.SingleDimension.call(this, options);
};


Amm.View.Html.Table.Dimensions.prototype = {

    'Amm.View.Html.Table.Dimensions': '__CLASS__',
    
    requiredElementClass: 'Amm.Table.Table',
    
    _handleElementGetColumnOffsets: function(columns, ret) {
        var jq = jQuery(this._htmlElement);
        for (var i = 0, l = columns.length; i < l; i++) {
            var sel = columns[i].getId();
            if (!sel) continue;
            ret[i] = jq.find('tr:first-child th[data-col-id="' + sel + '"] > .cellContent, tr:first-child td[data-col-id="' + sel + '"] > .cellContent').eq(0).offset().left;
        }
    },
    
    _handleElementGetColumnSizes: function(columns, ret) {
        var jq = jQuery(this._htmlElement);
        for (var i = 0, l = columns.length; i < l; i++) {
            var sel = columns[i].getId();
            if (!sel) continue;
            ret[i] = jq.find('tr:first-child th[data-col-id="' + sel + '"] > .cellContent, tr:first-child td[data-col-id="' + sel + '"] > .cellContent').eq(0).width();
        }
    },
    
    _handleElementSetColumnSize: function(column, size) {
        var sel = column.getId();
        if (!sel) return;
        var spec = 'th[data-col-id="' + sel + '"] > .cellContent, td[data-col-id="' + sel + '"] > .cellContent';
        var jq = jQuery(this._htmlElement).find(spec);
        if (size === null || size === undefined) jq.css('width', '');
        else jq.width(size);
    },
    
    _getRowElements: function(row) {
        var res = [], arr = Amm.getProperty(row.getUniqueSubscribers('Amm.View.Html.Visual'), 'htmlElement');
        for (var i = 0, l = arr.length; i < l; i++) if (arr[i]) res.push(arr[i]);
        return res;
    },
    
    _handleElementGetRowOffsets: function(rows, ret) {
        for (var i = 0, l = rows.length; i < l; i++) {
            var jq = jQuery(this._getRowElements(rows[i]));
            ret[i] = jq.eq(0).offset().top;
        }
    },
    
    _handleElementGetRowSizes: function(rows, ret) {
        for (var i = 0, l = rows.length; i < l; i++) {
            var jq = jQuery(this._getRowElements(rows[i]));
            ret[i] = jq.find('th:first-child, td:first-child').eq(0).innerHeight();
        }
    },
    
    _handleElementSetRowSize: function(row, size) {
        var jq = jQuery(this._getRowElements(row)).find(
            'th, td'
        );
        if (size === null || size === undefined) jq.css('height', '');
        else jq.innerHeight(size);
    },
    
    getSuggestedTraits: function() {
        return ['Amm.Trait.Table.Dimensions'];
    }

};

Amm.extend(Amm.View.Html.Table.Dimensions, Amm.View.Html);
Amm.extend(Amm.View.Html.Table.Dimensions, Amm.View.Abstract);
