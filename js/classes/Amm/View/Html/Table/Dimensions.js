/* global Amm */

Amm.View.Html.Table.Dimensions = function(options) {
    Amm.View.Abstract.call(this, options);
    Amm.View.Html.call(this, options);
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
            var otherSize = ret[i] || 0;
            var mySize = jq.find('tr:first-child th[data-col-id="' + sel + '"] > .cellContent, tr:first-child td[data-col-id="' + sel + '"] > .cellContent').eq(0).width();
            
            // when there are several views, report one with biggest width
            if (mySize > otherSize) ret[i] = mySize;
        }
    },
    
    _handleElementSetColumnSize: function(column, size) {
        var sel = column.getId();
        if (!sel) return;
        var oldHeight = this._htmlElement.offsetHeight;
        var spec = 'th[data-col-id="' + sel + '"] > .cellContent, td[data-col-id="' + sel + '"] > .cellContent';
        var jq = jQuery(this._htmlElement).find(spec);
        if (size === null || size === undefined) {
            jq.css('width', '');
        }
        else jq.width(size);
        var newHeight = this._htmlElement.offsetHeight;
        if (newHeight !== oldHeight) this._element.adjustRows();
    },
    
    _getRowElements: function(row) {
        var res = [], arr = jQuery(this._htmlElement).find(Amm.getProperty(row.getUniqueSubscribers('Amm.View.Html.Visual'), 'htmlElement'));
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
            var otherSize = ret[i] || 0;
            var mySize = jq.find('th:first-child, td:first-child').eq(0).innerHeight();
            
            // when there are several views, report one with biggest height
            if (mySize > otherSize) ret[i] = mySize;
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
    },

    _handleElementResetAutoColumns: function(columns) {
        var jq = jQuery(this._htmlElement);
        var selectors = [];
        for (var i = 0, l = columns.length; i < l; i++) {
            if (!columns[i].getAutoSize()) continue;
            var sel = columns[i].getId();
            selectors.push('tr:first-child th[data-col-id="' + sel + '"] > .cellContent, tr:first-child td[data-col-id="' + sel + '"] > .cellContent');
        }
        if (selectors.length) jq.find(selectors.join(', ')).css('width', '');
    },
    
    _handleElementAdjustColumns: function(columns, sizes) {
        if (!sizes) {
            sizes = [];
            this._element.outGetColumnSizes(columns, sizes);
        }
        var jq = jQuery(this._htmlElement);
        for (var i = 0, l = columns.length; i < l; i++) {
            var sel = columns[i].getId();
            if (!sel) continue;
            var otherSize = sizes[i] || 0;
            var elems = jq.find('th[data-col-id="' + sel + '"] > .cellContent, td[data-col-id="' + sel + '"] > .cellContent');
            var elem = elems.eq(0);
            var mySize = elem.width();
            // before: when there are several views, set the size to one with biggest width
            // now: always set to the (max) width - in twin view there are cases when it doesn't help
            //if (mySize === undefined || mySize < otherSize) {
                elems.width(otherSize);
            //}
        }
    },

    _handleElementResetAutoRows: function(rows) {
        var jq = jQuery(this._htmlElement);
        for (var i = 0, l = rows.length; i < l; i++) {
            if (!rows[i].getAutoSize()) continue;
            var jq = jQuery(this._getRowElements(rows[i]));
            jq.find('th:first-child, td:first-child').css('height', '');            
        }
    },
    
    _handleElementAdjustRows: function(rows, sizes) {
        if (!sizes) {
            sizes = [];
            this._element.outGetRowSizes(rows, sizes);
        }
        for (var i = 0, l = rows.length; i < l; i++) {
            var jq = jQuery(this._getRowElements(rows[i]));
            var otherSize = sizes[i] || 0;
            var mySize = jq.find('th:first-child, td:first-child').eq(0).innerHeight();
            if (mySize < otherSize) jq.find('th, td').height(otherSize);
        }
    },
    
    _rowsAddedDefer: false,
    
    _handleElementSectionRowsChange: function(rows, newRows) {
        if (this._rowsAddedDefer) return;
        var added = Amm.Array.diff(newRows, rows);
        if (added.length) {
            this._rowsAddedDefer = true;
            Amm.getRoot().defer(this._setColSizesForAddedRows, this, added);
        }
    },
    
    _setColSizesForAddedRows: function(added) {
        for (var i = 0, l = this._element.columns.length; i < l; i++) {
            var col = this._element.columns[i];
            if (col.getVisible() && col.getEnabled() && !col.getAutoSize()) {
                this._handleElementSetColumnSize(col, col.getSize());
            }
        }
        this._rowsAddedDefer = false;
    }
    
    
};

Amm.extend(Amm.View.Html.Table.Dimensions, Amm.View.Html);
Amm.extend(Amm.View.Html.Table.Dimensions, Amm.View.Abstract);
