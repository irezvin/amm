/* global Amm */

Amm.Table.Column = function(options) {
    Amm.Element.call(this, options);
};

Amm.Table.Column.prototype = {

    'Amm.Table.Column': '__CLASS__',

    _enabled: true,

    // element responsible for cell editor
    _editor: null,
    
    _caption: null,

    _displayOrder: null,

    _cellClassName: null,

    _width: '',
    
    _getDefaultTraits: function(options) {
        return [Amm.Trait.Visual];
    },
    
    setCaption: function(caption) {
        var oldCaption = this._caption;
        if (oldCaption === caption) return;
        this._caption = caption;
        this.outCaptionChange(caption, oldCaption);
        return true;
    },

    getCaption: function() { return this._caption; },

    outCaptionChange: function(caption, oldCaption) {
        this._out('captionChange', caption, oldCaption);
    },

    setDisplayOrder: function(displayOrder) {
        var oldDisplayOrder = this._displayOrder;
        if (oldDisplayOrder === displayOrder) return;
        this._displayOrder = displayOrder;
        this.outDisplayOrderChange(displayOrder, oldDisplayOrder);
        return true;
    },

    getDisplayOrder: function() { return this._displayOrder; },

    outDisplayOrderChange: function(displayOrder, oldDisplayOrder) {
        this._out('displayOrderChange', displayOrder, oldDisplayOrder);
    },
    
    setEnabled: function(enabled) {
        var oldEnabled = this._enabled;
        if (oldEnabled === enabled) return;
        this._enabled = enabled;
        this.outEnabledChange(enabled, oldEnabled);
        return true;
    },

    getEnabled: function() { return this._enabled; },

    outEnabledChange: function(enabled, oldEnabled) {
        this._out('enabledChange', enabled, oldEnabled);
    },
    
    configureCellProto: function(ret, row) {
    },
    
    configureCellInstance: function(ret, row) {
    },
    
    constructDefaultViews: function() {
        var res = Amm.html({
            $: 'col',
            data_amm_v: [
                'v.Visual',
                {
                    class: 'v.Expressions',
                    map: {
                        style__width: 'width'
                    }
                }
            ]
        });
        return res;
    },

    setWidth: function(width) {
        var oldWidth = this._width;
        if (oldWidth === width) return;
        this._width = width;
        this.outWidthChange(width, oldWidth);
        return true;
    },

    getWidth: function() { return this._width; },

    outWidthChange: function(width, oldWidth) {
        this._out('widthChange', width, oldWidth);
    },
    
    setCellClassName: function(cellClassNameOrToggle, part) {
        var oldCellClassName = this._cellClassName;
        var cellClassName = Amm.Util.alterClassName(this._cellClassName, cellClassNameOrToggle, part);
        if (oldCellClassName === cellClassName) return;
        this._cellClassName = cellClassName;
        this.outCellClassNameChange(cellClassName, oldCellClassName);
        return true;
    },

    getCellClassName: function() { return this._cellClassName; },

    outCellClassNameChange: function(cellClassName, oldCellClassName) {
        this._out('cellClassNameChange', cellClassName, oldCellClassName);
    },

};

Amm.extend(Amm.Table.Column, Amm.Element);

