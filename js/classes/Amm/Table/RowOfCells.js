/* global Amm */

Amm.Table.RowOfCells = function(options) {
    Amm.Table.Row.call(this, options);
    this._cellMapper = new Amm.ArrayMapper({
        dest: this.displayChildren,
        instantiator: new Amm.Instantiator.Proto({
            
            proto: this._cellProto,
            
            requiredClass: 'Amm.Table.Cell',
            
            protoCallback: this.cellProtoCallback,
            protoCallbackScope: this,
            
            instanceCallback: this.cellInstanceCallback,
            instanceCallbackScope: this,
            
            assocProperty: 'column'
        })
    });
};

Amm.Table.RowOfCells.prototype = {

    'Amm.Table.RowOfCells': '__CLASS__', 
    
    /**
     * @type {Amm.ArrayMapper}
     */
    _cellMapper: null,
    
    _cellClass: 'Amm.Table.Cell',
    
    _cellProto: null,
    
    _columnsConfigureCells: true,
    
    _getDefaultDisplayChildrenPrototype: function() {    
        var res = Amm.Trait.DisplayParent.prototype._getDefaultDisplayChildrenPrototype.call(this);
        res['cleanupOnDissociate'] = true;
        return res;
    },
    
    cellProtoCallback: function(ret, column) {
        if (!ret.proto.class) ret.proto.class = this._cellClass;
        if (this._cellProto) Amm.override(ret.proto, this._cellProto);
        if (this._columnsConfigureCells) {
            column.configureCellProto(ret, this);
        }
        if (this._table) {
            this._table.outCellProtoCallback(ret, column);
        }
    },
    
    cellInstanceCallback: function(instance, column) {
        if (this._columnsConfigureCells) column.configureCellInstance(instance, this);
        if (this._table) {
            this._table.outCellInstanceCallback(instance, column, this);
        }
    },
    
    _setTable: function(table, oldTable) {
        if (!Amm.Table.Row.prototype._setTable.call(this, table, oldTable)) return;
        if (!table) this._cellMapper.setSrc(null);
        else this._cellMapper.setSrc(table.getEnabledColumns());
    },
    
    setCells: function(cells) {
        if (!cells) cells = [];
        cells = Amm.constructMany(cells, 'Amm.Table.Cell', {
            component: this,
        }, 'id', true, ['Amm.Table.Cell']);
        this.displayChildren.setItems(cells);
    },
    
    getCells: function() {
        return this.displayChildren;
    },
    
    _cleanup_RowOfCells: function() {
        if (this._cellMapper) {
            this._cellMapper.cleanup();
            this._cellMapper = null;
        }
    },
    
    setCellProto: function(cellProto) {
        var oldCellProto = this._cellProto;
        if (oldCellProto === cellProto) return;
        this._cellProto = cellProto;
        if (this._cellMapper) this._cellMapper.rebuild();
        this.outCellProtoChange(cellProto, oldCellProto);
        return true;
    },

    getCellProto: function() { return this._cellProto; },

    outCellProtoChange: function(cellProto, oldCellProto) {
        this._out('cellProtoChange', cellProto, oldCellProto);
    },
    
    getColumnsConfigureCells: function() {
        return this._columnsConfigureCells;
    },
    
    rebuildCells: function(cells) {
        if (this._cellMapper) this._cellMapper.rebuildObjects(Amm.getProperty(cells, 'column'));
    },
    
};

Amm.createProperty(Amm.Table.RowOfCells.prototype, 'cells', null, null, true);

Amm.extend(Amm.Table.RowOfCells, Amm.Table.Row);
