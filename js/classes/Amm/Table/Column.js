/* global Amm */

Amm.Table.Column = function(options) {
    if (!options) options = {};
    else options = Amm.override({}, options);
    var editor = options.editor;
    delete options.editor;
    Amm.Element.call(this, options);
    if (editor) this.setEditor(editor);
};

Amm.Table.Column.prototype = {

    'Amm.Table.Column': '__CLASS__',

    _enabled: true,

    _caption: null,

    _displayOrder: null,

    _cellClassName: null,

    _cellProto: null,

    _width: '',
    
    _tableActiveProp: 'activeColumn',
    
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
        if (this._cellProto) {
            Amm.overrideRecursive(ret.proto, this._cellProto);
        }
    },
    
    configureCellInstance: function(ret, row) {
    },
    
    constructDefaultViews: function() {
        var res = Amm.html({
            $: 'col',
            data_amm_v: [
                { class: 'v.Visual', delay: 0, },
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
    
    setCellProto: function(cellProto) {
        var oldCellProto = this._cellProto;
        if (oldCellProto === cellProto) return;
        this._cellProto = cellProto;
        this.outCellProtoChange(cellProto, oldCellProto);
        var t = this;
        var affectedCells = this.findCells(function(cell) {
            return (
                cell.row 
                && cell.row['Amm.Table.RowOfCells'] 
                && cell.row.getColumnsConfigureCells()
            );
        }, true);
        for (var i = 0, l = affectedCells.length; i < l; i++) {
            affectedCells[i].row.rebuildCells([affectedCells[i]]);
        }
        return true;
    },

    getCellProto: function() { return this._cellProto; },

    outCellProtoChange: function(cellProto, oldCellProto) {
        this._out('cellProtoChange', cellProto, oldCellProto);
    },
    
    _calcCanActivate: function(get) {
        
        if (get('locked')) return false;

        var v = get('visible'), dp;
        
        return (v || v === undefined)
            && get('enabled')
            && (dp = get('displayParent'))
            && Amm.is(dp, 'Amm.Table.ColGroup')
            && Amm.is(get(dp, 'displayParent'), 'Amm.Table.Table');
    
    },
    
    findCells: function(callback, all) {
        if (!this._component) return [];
        var t = this;
        return this._component.findCells(function(cell) {
            return cell.column === t && (!callback || callback(cell));
        }, all);
    },

};

Amm.extend(Amm.Table.Column, Amm.Element);
Amm.extend(Amm.Table.Column, Amm.Table.WithEditor);
Amm.extend(Amm.Table.Column, Amm.Table.WithActive);

