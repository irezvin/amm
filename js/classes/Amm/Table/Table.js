/* global Amm */

Amm.Table.Table = function(options) {
    
    var options = Amm.override({}, options);
    var items, columns;
    if (options.items) {
        items = options.items;
        delete options.items;
    }
    if (options.columns) {
        columns = options.columns;
        delete options.columns;
    }
    
    this._enabledColumns = new Amm.Collection();
    var t = this;
    this._editingCells = new Amm.Collection({
        on__onCanAccept: function(cell, problem) {
            if (cell.getEditing()) return;
            if (!cell.isEditable()) problem.error = "cannot accept: cell.isEditable() is false";
        },
        on__itemsChange: function(items, oldItems) {
            t._reportEditingCellsChange(items, oldItems);
        },
        defaults: {
            editing: true
        },
        undefaults: {
            editing: false
        }
    });
    
    Amm.Element.call(this, options);
    if (columns) this.setColumns(columns);
    this._enabledColumnsMapper = new Amm.ArrayMapper({
        src: this.getColumns(undefined, true),
        dest: this._enabledColumns,
        filter: {
            conditions: [{
                props: {
                    enabled: true
                }
            }]
        }
    });
    
    this._rows = new Amm.Collection({
        indexProperty: 'index',
        observeIndexProperty: false,
        cleanupOnDissociate: true
    });
    
    this._rowMapper = new Amm.ArrayMapper({
        dest: this._rows,
        instantiator: new Amm.Instantiator.Proto({
            proto: {
                class: 'Amm.Table.RowOfCells'
            },
            protoCallback: this._rowProtoCallback,
            protoCallbackScope: this,
            instanceCallback: this.outRowInstanceCallback,
            instanceCallbackScope: this,
            assocProperty: 'item'
        }),
    });
    
    this._enabledRowMapper = new Amm.ArrayMapper({
        src: this._rowMapper.getDest(),
        dest: this.getBody(true).displayChildren,
        filter: {
            conditions: [{
                props: {
                    enabled: true
                }
            }]
        },
    });
    
    if (items) this.setItems(items);
    this.subscribe('activeCellAddressChange', this._selfActiveCellAddressChange, this);
};

Amm.Table.Table._SYNC_SOURCE_CELL = 'cell';

Amm.Table.Table._SYNC_SOURCE_EDITOR = 'editor';

/**
 * If non-active cell starts editing, or existing editor is focused, cell becomes active
 */
Amm.Table.Table.EDITOR_ACTIVATES_CELL = 1;

/**
 * If editing active cell becomes non-active, changes are applied
 */
Amm.Table.Table.DEACTIVATION_CONFIRMS_EDITOR = 2;

/**
 * If editing active cell becomes non-active, changes are cancelled
 * TODO: test
 */
Amm.Table.Table.DEACTIVATION_CANCELS_EDITOR = 4;

/**
 * If active cell is editing, and another cell becomes active, that cell starts editing (if possible)
 */
Amm.Table.Table.EDITOR_FOLLOWS_ACTIVE = 8;

/**
 * If editing cell becomes active, and editor is focusable, it will be focused
 * TODO: test
 */
Amm.Table.Table.FOCUS_EDITOR_WHEN_ACTIVE = 16;

/**
 * If editable cell becomes active, it will become editing
 * TODO: test
 */
Amm.Table.Table.OPEN_EDITOR_WHEN_ACTIVE = 32;

/**
 * Value of `mode` argument for Amm.Table.Table.findCellByAddress: 
 * return only cell with this exact address
 */
Amm.Table.Table.FIND_EXACT = 0;

/**
 * Value of `mode` argument for Amm.Table.Table.findCellByAddress: 
 * return any cell closest to the given address
 */
Amm.Table.Table.FIND_CLOSEST = 1;

/**
 * Value of `mode` argument for Amm.Table.Table.findCellByAddress: 
 * return any activatable cell closest to the given address
 */
Amm.Table.Table.FIND_ACTIVATABLE = 2;

Amm.Table.Table.prototype = {

    'Amm.Table.Table': '__CLASS__', 

    _items: null,
    
    _itemsIsOwn: null,
    
    /**
     * @type {Amm.Collection}
     */
    _rows: null,
    
    _rowMapper: null,
    
    _enabledRowMapper: null,
    
    _enabledColumns: null,
    
    _enabledColumnsMapper: null,
    
    /**
     * @type {Amm.Collection}
     */
    _specialRows: null,
    
    _rowProto: null,
    
    _columns: null,
    
    _updateLevel: 0,
    
    _lockSyncActive: 0,
    
    /**
     * @type Amm.Table.Section
     */
    _header: null,

    /**
     * @type Amm.Table.Section
     */
    _body: null,

    /**
     * @type Amm.Table.Section
     */
    _footer: null,

    /**
     * @type Amm.Table.ColGroup
     */    
    _colGroup: null,

    /**
     * @type Amm.Collection
     */
    _editingCells: null,

    /**
     * @type Amm.Table.Cell
     * 
     * TODO: when several editors open, change when other editor is focused
     */
    _currentEditingCell: null,

    /**
     * @type Amm.Table.Cell
     */
    _activeCell: null,

    /**
     * @type Amm.Table.Row
     */
    _activeRow: null,

    /**
     * @type Amm.Table.Column
     */
    _activeColumn: null,

    _activeCellClass: 'active',

    _activeRowClass: 'activeRow',

    _activeColumnClass: 'activeColumn',
    
    // if active row/column is deleted or hidden, next one will be activated
    _preserveActiveCellAddress: true,
    
    _lastActiveCellAddress: null,

    _syncActiveCellEditor: 
            Amm.Table.Table.EDITOR_ACTIVATES_CELL 
            | Amm.Table.Table.DEACTIVATION_CONFIRMS_EDITOR
            | Amm.Table.Table.EDITOR_FOLLOWS_ACTIVE,
    
    _getDefaultTraits: function() {
        return [ 
            'Amm.Trait.Visual',
            'Amm.Trait.Component',
            'Amm.Trait.DisplayParent',
            'Amm.Trait.Drag.Source',
            'Amm.Trait.Table.DragDrop',
            'Amm.Trait.Table.Dimensions',
        ];
    },
    
    _getDefaultDisplayChildrenPrototype: function() {
        var res = Amm.Trait.DisplayParent.prototype._getDefaultDisplayChildrenPrototype.call(this);
        res.sortProperties = ['sortOrder'];
        res.requirements.push('Amm.Table.Section');
        res.requirements.push('Amm.Table.ColGroup');
        return res;
    },
    
    setColumns: function(columns) {
        if (!columns) columns = [];
        columns = Amm.constructMany(columns, 'Amm.Table.Column', {
            class: 'Amm.Table.ObservingColumn'
        }, 'id');
        if (this._columns) {
            this._columns.setItems(columns);
            return;
        }
        this._columns = new Amm.Collection({
            assocProperty: 'component',
            assocInstance: this,
            indexProperty: 'displayOrder',
            observeIndexProperty: true,
            requirements: ['Amm.Table.Column'],
            keyProperty: 'id',
            instantiateOnAccept: true,
            defaults: {
                displayParent: this.getColGroup(true),
            },
            undefaults: {
                displayParent: null,
            },
            instantiator: new Amm.Instantiator.Proto({
                overrideProto: true,
                proto: {
                    class: 'Amm.Table.ObservingColumn'
                }
            }),
            items: columns,
        });
    },
    
    getColumns: function(id) {
        if (!this._columns) this.setColumns(null);
        if (id !== undefined) return this._columns.getByKey(id);
        return this._columns;
    },
    
    getRows: function() {
        return this._rows;
    },
    
    setRows: function() {
        console.warn("Amm.Table.prototype.setRows() has no effect");
    },
    
    getEnabledColumns: function() {
        return this._enabledColumns;
    },
    
    setEnabledColumns: function() {
        console.warn("Amm.Table.prototype.setEnabledColumns() has no effect; use column.`enabled`");
    },
    
    setItems: function(items) {
        var proto, oldItems = this._items, itemsIsOwn = this._itemsIsOwn;
        if (!(items && typeof items === 'object')) {
            throw Error("`items` must be a non-null object");
        }
        if (items instanceof Array) {
            if (this._items) {
                this._items.setItems(items);
                return;
            }
            items = new Amm.Collection({items: items});
            itemsIsOwn = true;
        }
        if (!Amm.getClass(items)) {
            // we assume it is proto
            proto = Amm.override({}, items);
            items = Amm.constructInstance(proto, 'Amm.Collection');
            itemsIsOwn = true;
        } else {
            Amm.is(items, 'Amm.Collection', `items`);
            if (items !== this._items) itemsIsOwn = false;
        }
        if (oldItems !== items) {
            this._items = items;
            this._itemIsOwn = itemsIsOwn;
            this.outItemsChange(items, oldItems);
        }
    },
    
    getItems: function() {
        return this._items;
    },
    
    outItemsChange: function(items, oldItems) {
        this._rowMapper.setSrc(items);
        return this._out('itemsChange', items, oldItems);
    },

    _deleteItemsCollection: function() {
        if (this._items && this._itemsIsOwn) {
            this._items.cleanup();
        }
        this._items = null;
    },
    
    _cleanup_Table: function() {
        if (this._columns) {
            this._columns.cleanup();
            this._columns = null;
        }
        this._deleteItemsCollection();
        this._enabledRowMapper.cleanup();
        this._enabledRowMapper = null;
        this._rowMapper.cleanup();
        this._rowMapper = null;
        this._rows.cleanup();
        this._rows = null;
        this._enabledColumnsMapper.cleanup();
        this._enabledColumnsMapper = null;
    },
    
    constructDefaultViews: function() {
        var res = Amm.html({
            $: 'table',
            data_amm_v: [
                {
                    class: 'v.Visual'
                },
                {
                    class: 'v.DisplayParent'
                },
                {
                    class: 'v.Table.DragDrop'
                },
                {
                    class: 'v.Table.Dimensions'
                },
            ]
        });
        return res;
    },
    
    _setSection: function(section, val) {
        var ucSection = section[0].toUpperCase() + section.slice(1);
        var type = section.toUpperCase();
        var member = '_' + section;
        var oldSection = this[member];
        section = Amm.constructInstance(
            val, 
            'Amm.Table.Section', 
            {
                type: Amm.Table.Section.TYPE[type]
            },
            true
        );
        if (oldSection === section) return;
        if (oldSection) this.displayChildren.reject(oldSection);
        section.setComponent(this);
        section.setDisplayParent(this);
        this[member] = section;
        this['out' + ucSection + 'Change'](section, oldSection);
        return true;
    },
    
    setHeader: function(header) {
        return this._setSection('header', header);
    },

    getHeader: function() { 
        if (!this._header) this.setHeader({});
        return this._header; 
    },

    outHeaderChange: function(header, oldHeader) {
        this._out('headerChange', header, oldHeader);
    },

    setBody: function(body) {
        var res = this._setSection('body', body);
        if (this._body) this._body.setIsComponent(false);
        if (res && this._itemrowMapper) {
            this._itemrowMapper.setDest(this.getBody(true).displayChildren);
        }
        return res;
    },

    getBody: function() { 
        if (!this._body) this.setBody({
            displayChildrenPrototype: {
                //observeIndexProperty: false
            }
        });
        return this._body; 
    },

    outBodyChange: function(body, oldBody) {
        this._out('bodyChange', body, oldBody);
    },

    setColGroup: function(colGroup) {
        console.warn('Amm.Table.setColGroup() has no effect');
        return true;
    },

    getColGroup: function() { 
        if (this._colGroup) return this._colGroup;
        this._colGroup = new Amm.Table.ColGroup({
            component: this,
            displayParent: this,
            displayOrder: 0
        });
        return this._colGroup; 
    },

    outColGroupChange: function(colGroup, oldColGroup) {
        this._out('colGroupChange', colGroup, oldColGroup);
    },

    setFooter: function(footer) {
        return this._setSection('footer', footer);
    },

    getFooter: function() { 
        if (!this._footer) this.setFooter({});
        return this._footer; 
    },

    outFooterChange: function(footer, oldFooter) {
        this._out('footerChange', footer, oldFooter);
    },
    
    _rowProtoCallback: function(retProto, item) {
        if (this._rowProto) Amm.override(retProto.proto, this._rowProto);
        this.outRowProtoCallback (retProto, item);
    },
    
    outRowProtoCallback: function(retProto, item) {
        this._out('rowProtoCallback', retProto, item);
    },
    
    outRowInstanceCallback: function(row, item) {
        this._out('rowInstanceCallback', row, item);
    },
    
    outCellProtoCallback: function(retProto, column, row) {
        this._out('cellProtoCallback', column, row);
    },
    
    outCellInstanceCallback: function(cell, column, row) {
        this._out('cellInstanceCallback', cell, column, row);
    },

    setRowProto: function(rowProto) {
        var oldRowProto = this._rowProto;
        if (oldRowProto === rowProto) return;
        this._rowProto = rowProto;
        if (this._rowMapper) this._rowMapper.rebuild();
        this.outRowProtoChange(rowProto, oldRowProto);
        return true;
    },

    getRowProto: function() { return this._rowProto; },

    outRowProtoChange: function(rowProto, oldRowProto) {
        this._out('rowProtoChange', rowProto, oldRowProto);
    },

    setEditingCells: function(editingCells) {
        console.log('setEditingCells() has no effect; use cell.setEditing(true)');
    },

    getEditingCells: function() { return this._editingCells; },
    
    _setActive: function(prop, active, rqClass, classProp, objectClassProp) {
        
        var priv = '_' + prop;
        
        if (!active) {
            active = null;
        } else if (rqClass) {
            Amm.is(active, rqClass, prop);
        }
        
        var old = this[priv];
        
        if (old === active) return;
        
        if (active && !active.getCanActivate()) {
            return;
        }
        
        this[priv] = active;
        
        this._activateDeactivate(active, old, classProp, objectClassProp);
        
        var out = 'out' + Amm.ucFirst(prop) + 'Change';
        
        this[out](active, old);
        
        this._syncActive(prop);
        
        return true;
        
    },

    _activateDeactivate(item, oldItem, classProp, objectClassProp) {
        var className = this['_' + classProp];
        objectClassProp = objectClassProp || 'className';
        if (item) {
            item.setActive(true);
            if (className) Amm.setProperty(item, objectClassProp, true, true, [className]);
        }
        if (oldItem) {
            oldItem.setActive(false);
            if (className) Amm.setProperty(oldItem, objectClassProp, false, true, [className]);
        }
    },
    
    setActiveCell: function(activeCell) {
        var oldActiveCell = this._activeCell;
        var res = this._setActive('activeCell', activeCell, 'Amm.Table.Cell', 'activeCellClass');
        if (!res) return;
        
        Amm.subUnsub(activeCell, oldActiveCell, this, 'canActivateChange',
            this._handleActiveCellCanActivateChange, true);
            
        if (this._syncActiveCellEditor) {
            this._applySyncAciveCellEditor(activeCell, oldActiveCell);
        }
    },
    
    _handleActiveCellCanActivateChange: function(canActivate, oldCanActivate) {
        if (!canActivate) {
            Amm.getRoot().defer(this._restoreActiveCellAddress, this);
            this.setActiveCell(null);
        }
    },
    
    _restoreActiveCellAddress: function() {
        if (!this._preserveActiveCellAddress) return;
        if (!this._lastActiveCellAddress) return;
        if (this._lastActiveCellAddress === this.getActiveCellAddress()) return;
        this.setActiveCellAddress(this._lastActiveCellAddress, true);        
    },
    
    _applySyncAciveCellEditor: function(activeCell, oldActiveCell) {
        var oldActiveCellEditing = oldActiveCell && oldActiveCell.getEditing();
        if (this._syncActiveCellEditor & Amm.Table.Table.DEACTIVATION_CONFIRMS_EDITOR) {
            if (oldActiveCell && oldActiveCellEditing) oldActiveCell.confirmEdit();
        }
        if (this._syncActiveCellEditor & Amm.Table.Table.DEACTIVATION_CANCELS_EDITOR) {
            if (oldActiveCell && oldActiveCellEditing) oldActiveCell.cancelEdit();
        }
        if (this._syncActiveCellEditor & Amm.Table.Table.EDITOR_FOLLOWS_ACTIVE) {
            if (oldActiveCellEditing) {
                // recheck if not confirmed/cancel during previous checks
                if (oldActiveCell.getEditing()) oldActiveCell.confirmEdit();
            }
            if (activeCell && activeCell.isEditable()) activeCell.setEditing(true);
        }
        if (this._syncActiveCellEditor & Amm.Table.Table.OPEN_EDITOR_WHEN_ACTIVE) {
            if (!activeCell.getEditing()) activeCell.setEditing(true);
        }
        if (this._syncActiveCellEditor & Amm.Table.Table.FOCUS_EDITOR_WHEN_ACTIVE) {
            if (activeCell.getEditing()) activeCell.focusEditor();
        }
    },

    getActiveCell: function() { return this._activeCell; },

    outActiveCellChange: function(activeCell, oldActiveCell) {
        this._out('activeCellChange', activeCell, oldActiveCell);
    },

    setActiveRow: function(activeRow) {
        return this._setActive('activeRow', activeRow, 'Amm.Table.Row', 'activeRowClass');
    },

    getActiveRow: function() { return this._activeRow; },

    outActiveRowChange: function(activeRow, oldActiveRow) {
        this._out('activeRowChange', activeRow, oldActiveRow);
    },

    setActiveColumn: function(activeColumn) {
        return this._setActive('activeColumn', activeColumn, 'Amm.Table.Column', 'activeColumnClass',
            'cellClassName');
    },

    getActiveColumn: function() { return this._activeColumn; },

    outActiveColumnChange: function(activeColumn, oldActiveColumn) {
        this._out('activeColumnChange', activeColumn, oldActiveColumn);
    },    
    
    _toggleActiveClass(item, className, oldClassName, objectClassProp) {
        if (!item.return);
        objectClassProp = objectClassProp || 'className';
        if (className) Amm.setProperty(item, objectClassProp, true, false, [className]);
        if (oldClassName) Amm.setProperty(item, objectClassProp, false, false, [oldClassName]);
    },

    setActiveCellClass: function(activeCellClass) {
        var oldActiveCellClass = this._activeCellClass;
        if (oldActiveCellClass === activeCellClass) return;
        this._activeCellClass = activeCellClass;
        this.outActiveCellClassChange(activeCellClass, oldActiveCellClass);
        if (this._activeCell) {
            this._toggleActiveClass(
                this._activeCell, activeCellClass, oldActiveCellClass
            );
        }
        return true;
    },

    getActiveCellClass: function() { return this._activeCellClass; },

    outActiveCellClassChange: function(activeCellClass, oldActiveCellClass) {
        this._out('activeCellClassChange', activeCellClass, oldActiveCellClass);
    },
   
    setActiveRowClass: function(activeRowClass) {
        var oldActiveRowClass = this._activeRowClass;
        if (oldActiveRowClass === activeRowClass) return;
        this._activeRowClass = activeRowClass;
        if (this._activeRow) {
            this._toggleActiveClass(this._activeRow, activeRowClass, oldActiveRowClass);
        }
        this.outActiveRowClassChange(activeRowClass, oldActiveRowClass);
        return true;
    },

    getActiveRowClass: function() { return this._activeRowClass; },

    outActiveRowClassChange: function(activeRowClass, oldActiveRowClass) {
        this._out('activeRowClassChange', activeRowClass, oldActiveRowClass);
    },

    setActiveColumnClass: function(activeColumnClass) {
        var oldActiveColumnClass = this._activeColumnClass;
        if (oldActiveColumnClass === activeColumnClass) return;
        this._activeColumnClass = activeColumnClass;
        if (this._activeColumn) {
            this._toggleActiveClass(
                this._activeColumn, activeColumnClass, oldActiveColumnClass, 'cellClassName'
            );
        }
        this.outActiveColumnClassChange(activeColumnClass, oldActiveColumnClass);
        return true;
    },

    getActiveColumnClass: function() { return this._activeColumnClass; },

    outActiveColumnClassChange: function(activeColumnClass, oldActiveColumnClass) {
        this._out('activeColumnClassChange', activeColumnClass, oldActiveColumnClass);
    },
    
    /**
     * Updates activeRow/activeColumn/activeCell when one of them changes.
     * If row changes, cell in active column becomes active.
     * If column changes, cell in active row becomes active.
     * If cell changes, both active row and active column track it
     * 
     * @param {string} 'activeRow'|'activeColumn'|'activeCell'
     */
    _syncActive: function(source) {
        if (this._lockSyncActive) {
            return;
        }
        var cell = this._activeCell, row = this._activeRow, column = this._activeColumn, ex;
        this._lockSyncActive++;
        try {

            if (!cell && !source && row && column) {
                this.setActiveCell(row.findCellByColumn(column));
                
            } else if ((cell && !source) || source === 'activeCell') {
                
                this.setActiveRow(cell? cell.getRow() : null);
                
                this.setActiveColumn(cell? cell.getColumn() : null);
                
            } else {
                
                if (source === 'activeRow' && !column && cell) {
                    column = cell.getColumn();
                    this.setActiveColumn(column);
                }
                
                if (source === 'activeColumn' && !row && cell) {
                    row = cell.getRow();
                    this.setActiveRow(row);
                }
                
                if (!row || !column) this.setActiveCell(null);
                
                this.setActiveCell(row.findCellByColumn(column));
                
            }
        } catch(ex) {
        }
        this._lockSyncActive--;
        if (ex) throw ex;
    },

    setPreserveActiveCellAddress: function(preserveActiveCellAddress) {
        var oldPreserveActiveCellAddress = this._preserveActiveCellAddress;
        if (oldPreserveActiveCellAddress === preserveActiveCellAddress) return;
        this._preserveActiveCellAddress = preserveActiveCellAddress;
        this.outPreserveActiveCellAddressChange(preserveActiveCellAddress, oldPreserveActiveCellAddress);
        return true;
    },

    getPreserveActiveCellAddress: function() { return this._preserveActiveCellAddress; },

    outPreserveActiveCellAddressChange: function(preserveActiveCellAddress, oldPreserveActiveCellAddress) {
        this._out('preserveActiveCellAddressChange', preserveActiveCellAddress, oldPreserveActiveCellAddress);
    },

    setSyncActiveCellEditor: function(syncActiveCellEditor) {
        var oldSyncActiveCellEditor = this._syncActiveCellEditor;
        if (oldSyncActiveCellEditor === syncActiveCellEditor) return;
        this._syncActiveCellEditor = syncActiveCellEditor;
        this.outSyncActiveCellEditorChange(syncActiveCellEditor, oldSyncActiveCellEditor);
        return true;
    },

    getSyncActiveCellEditor: function() { return this._syncActiveCellEditor; },
    
    outSyncActiveCellEditorChange: function(syncActiveCellEditor, oldSyncActiveCellEditor) {
        this._out('syncActiveCellEditorChange', syncActiveCellEditor, oldSyncActiveCellEditor);
    },
    
    _reportEditingCellsChange: function(items, oldItems) {
        
        if (!(this._currentEditingCell && this._currentEditingCell.getEditing())) {
            this.setCurrentEditingCell(items[items.length - 1] || null);
        } else if (items.length > oldItems.length) {
            this.setCurrentEditingCell(items[items.length - 1]);
        }
        
    },

    setCurrentEditingCell: function(currentEditingCell) {
        var oldCurrentEditingCell = this._currentEditingCell;
        if (oldCurrentEditingCell === currentEditingCell) return;
        this._currentEditingCell = currentEditingCell;
        this.outCurrentEditingCellChange(currentEditingCell, oldCurrentEditingCell);
        if (this._syncActiveCellEditor) {
            if (this._syncActiveCellEditor && Amm.Table.Table.EDITOR_ACTIVATES_CELL) {
                if (this._currentEditingCell) this.setActiveCell(this._currentEditingCell);
            }
        }
        return true;
    },

    getCurrentEditingCell: function() { return this._currentEditingCell; },

    outCurrentEditingCellChange: function(currentEditingCell, oldCurrentEditingCell) {
        this._out('currentEditingCellChange', currentEditingCell, oldCurrentEditingCell);
    },
    
    _calcActiveCellAddress: function(get) {
        return get.prop('activeCell').prop('address').val() || null;
    },
    
    _selfActiveCellAddressChange: function(address, oldAddress) {
        if (address) this._lastActiveCellAddress = address;
    },
    
    /**
     * 
     * @param {sting} address Address (i.e. b3c12 means 'body row 2, cell 11')
     * @param {type} mode One of Amm.Table.Table.FIND_* constants
     * @returns {Amm.Table.Cell}
     */
    findCellByAddress: function(address, mode) {
        var parts = ('' + address).toLowerCase().match(/^(h|b|f)([0-9]+)c([0-9]+)$/);
        if (!parts) throw Error("Invalid address format: '" + address + "'");
        var section;
        if (parts[1] === 'b') {
            section = this.body;
        } else if (parts[1] === 'h') {
            section = this.header;
        } else if (parts[1] === 'f') {
            section = this.footer;
        }
        if (!section) return null; // todo: find closest section
        var rowIndex = parseInt(parts[2]) - 1;        
        var colIndex = parseInt(parts[3]) - 1;
        var cb = function(item) { return item.getCanActivate(); };
        
        // todo: obey mode value
        var row = section.displayChildren[rowIndex];
        if (!row && mode && section.displayChildren.length) {
            row = section.displayChildren[section.displayChildren.length - 1];
        }
        if ((mode === Amm.Table.Table.FIND_ACTIVATABLE) && row && !row.getCanActivate()) {
            var newRow;
            newRow = row.findAdjacent(false, cb, Amm.Table.ADJACENT_ANY_SECTION);
            if (!newRow) {
                newRow = row.findAdjacent(true, cb, Amm.Table.ADJACENT_ANY_SECTION);
            }
            row = newRow;
        }
        if (!row) return;
        var cell = row.displayChildren[colIndex];
        if (!cell && mode && row.displayChildren.length) {
            cell = row.displayChildren[row.displayChildren.length - 1];
        }
        if (cell && mode === Amm.Table.Table.FIND_ACTIVATABLE && !cell.getCanActivate()) {
            var newCell = cell.findAdjacent(false, cb, Amm.Table.ADJACENT_ALL_SECTIONS);
            if (!newCell) {
                newCell = cell.findAdjacent(true, cb, Amm.Table.ADJACENT_ALL_SECTIONS);
            }
            cell = newCell;
        }
        return cell;
    },
    
    setActiveCellAddress: function(address, findClosest) {
        var cell = this.findCellByAddress(address, 
            findClosest? Amm.Table.Table.FIND_ACTIVATABLE : Amm.Table.Table.FIND_EXACT
        );
        if (cell && cell.getCanActivate()) this.setActiveCell(cell);
        else this.setActiveCell(null);
    },
    
    findCells: function(callback, all) {
        var res = [];
        var sections = [this.header.rows, all? this.rows : this.body.rows, this.footer.rows];
        for (var i = 0; i < sections.length; i++) {
            for (var j = 0; j < sections[i].length; j++) {
                for (var k = 0; k < sections[i][j].cells.length; k++) {
                    var cell = sections[i][j].cells[k];
                    if (!callback || callback(cell)) res.push(cell);
                }
            }
        }
        return res;
    }

};

Amm.createProperty(Amm.Table.Table.prototype, 'items', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'rows', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'columns', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'header', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'body', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'footer', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'editingCells', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'activeCell', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'activeRow', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Table.prototype, 'activeColumn', null, null, {enumerable: false});

Amm.extend(Amm.Table.Table, Amm.Element);
Amm.extend(Amm.Table.Table, Amm.Table.WithEditor);

Amm.ObservableFunction.createCalcProperty('activeCellAddress', Amm.Table.Table.prototype);

