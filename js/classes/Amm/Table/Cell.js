/* global Amm */

Amm.Table.Cell = function (options) {
    Amm.Element.call(this, options);
};

Amm.Table.Cell.prototype = {

    'Amm.Table.Cell': '__CLASS__',

    _value: null,

    _table: null,

    _column: null,

    _requiredColumnClass: 'Amm.Table.Column',

    _ignoreColumnCellClassName: false,

    _ownClassName: '',

    _lockClassName: 0,
    
    _readOnly: false,
    
    _cancelEdit: 0,

    _editing: false,

    _editor: false,
    
    _editorIsOwn: false,
    
    _valueUpdateable: false,

    _activeEditor: null,
    
    _oldActiveEditor: null,
    
    _tableActiveProp: 'activeCell',

    _getDefaultTraits: function (options) {
        return [Amm.Trait.Visual, Amm.Trait.Component, Amm.Trait.DisplayParent];
    },

    constructDefaultViews: function () {
        var res = Amm.html({
            $: 'td',
            tabindex: 0,
            data_amm_v: [
                {
                    class: 'v.Visual',
                    delay: 0,
                },
                {
                    class: 'v.DisplayParent'
                }
            ]
        });
        return res;
    },

    setColumn: function (column) {
        if (!column)
            column = null;
        else if (this._requiredColumnClass) {
            Amm.is(column, this._requiredColumnClass);
        }
        var oldColumn = this._column;
        if (oldColumn === column)
            return;
        this._column = column;
        this._doOnColumnChange(column, oldColumn);
        this.outColumnChange(column, oldColumn);
        return true;
    },

    getColumn: function () {
        return this._column;
    },

    outColumnChange: function (column, oldColumn) {
        this._out('columnChange', column, oldColumn);
    },

    _doOnColumnChange: function (column, oldColumn) {
        Amm.subUnsub(column, oldColumn, this, {
            'cellClassNameChange': 'handleColumnCellClassNameChange',
            'displayOrderChange': 'handleColumnDisplayOrderChange',
            'visibleChange': 'handleColumnVisibleChange',
            'idChange': 'setId',
        });
        if (column) {
            this.setDisplayOrder(column.getDisplayOrder());
            this.setId(column.getId());
        }
        this.handleColumnCellClassNameChange();
        this.handleColumnVisibleChange();
    },

    handleColumnDisplayOrderChange: function (v) {
        this.setDisplayOrder(v);
    },

    handleColumnCellClassNameChange: function (cellClassName) {
        if (this._ignoreColumnCellClassName)
            cellClassName = '';
        else if (cellClassName === undefined) {
            cellClassName = this._column ? this._column.getCellClassName() : '';
        }
        if (!cellClassName)
            cellClassName = '';
        this._lockClassName++;
        var res = this.setClassName(this._ownClassName + (cellClassName && this._ownClassName ? ' ' : '') + cellClassName);
        this._lockClassName--;
        return res;
    },

    handleColumnVisibleChange: function (columnVisible) {
        if (columnVisible === undefined) {
            if (!this._column) return;
        }
        this.setVisible(columnVisible);
    },

    setValue: function (value) {
        var oldValue = this._value;
        if (oldValue === value)
            return;
        this._value = value;
        this.outValueChange(value, oldValue);
        return true;
    },

    getValue: function () {
        return this._value;
    },

    outValueChange: function (value, oldValue) {
        this._out('valueChange', value, oldValue);
    },
    
    setItem: function (item) {
        var oldItem = this._item;
        if (oldItem === item)
            return;
        this._item = item;
        this._doOnItemChange(item, oldItem);
        this.outItemChange(item, oldItem);
        return true;
    },

    getItem: function () {
        return this._item;
    },

    outItemChange: function (item, oldItem) {
        this._out('itemChange', item, oldItem);
    },

    _doOnItemChange: function (item, oldItem) {
    },

    _setComponent_TableCell: function (component, oldComponent) {
        if (component)
            Amm.is(component, 'Amm.Table.Row', 'component');
        Amm.subUnsub(component, oldComponent, this, 'itemChange', 'setItem');
        Amm.subUnsub(component, oldComponent, this, 'tableChange', '_setTable');
        if (component) {
            this.setItem(component.getItem());
            this._setTable(component.getTable());
        }
    },

    setRow: function (row) {
        return this.setComponent(row);
    },

    getRow: function () {
        return this._component;
    },
    
    setTable: function(table) {
        console.warn("Amm.Table.Cell.setTable has no effect");
    },

    _setTable: function(table) {
        var oldTable = this._table;
        if (oldTable === table) return;
        this._table = table;
        if (this._editing) {
            if (oldTable) this._oldTable.getEditingCells().reject(this);
            if (this._table) this._table.getEditingCells().accept(this);
        }
        this.outTableChange(table, oldTable);
        return true;
    },

    getTable: function() { return this._table; },

    outTableChange: function(table, oldTable) {
        this._out('tableChange', table, oldTable);
    },

    outRowChange: function (row, oldRow) {
        this._out('rowChange', row, oldRow);
    },

    outComponentChange: function (component, oldComponent) {
        Amm.Element.prototype.outComponentChange.call(this, component, oldComponent);
        this.outRowChange(component, oldComponent);
    },

    setIgnoreColumnCellClassName: function (ignoreColumnCellClassName) {
        ignoreColumnCellClassName = !!ignoreColumnCellClassName;
        var oldIgnoreColumnCellClassName = this._ignoreColumnCellClassName;
        if (oldIgnoreColumnCellClassName === ignoreColumnCellClassName)
            return;
        this._ignoreColumnCellClassName = ignoreColumnCellClassName;
        this.outIgnoreColumnCellClassNameChange(ignoreColumnCellClassName, oldIgnoreColumnCellClassName);
        this.handleColumnCellClassNameChange();
        return true;
    },

    getIgnoreColumnCellClassName: function () {
        return this._ignoreColumnCellClassName;
    },

    outIgnoreColumnCellClassNameChange: function (ignoreColumnCellClassName, oldIgnoreColumnCellClassName) {
        this._out('ignoreColumnCellClassNameChange', ignoreColumnCellClassName, oldIgnoreColumnCellClassName);
    },

    setClassName: function (classNameOrToggle, part) {
        if (this._lockClassName) {
            return Amm.Trait.Visual.prototype.setClassName.call(this, classNameOrToggle, part);
        }
        var oldOwnClassName = this._ownClassName,
                newOwnClassName = Amm.Util.alterClassName(this._ownClassName, classNameOrToggle, part);
        if (oldOwnClassName !== newOwnClassName) {
            this._ownClassName = newOwnClassName;
            return this.handleColumnCellClassNameChange();
        }
    },

    setReadOnly: function(readOnly) {
        var oldReadOnly = this._readOnly;
        if (oldReadOnly === readOnly) return;
        this._readOnly = readOnly;
        this.outReadOnlyChange(readOnly, oldReadOnly);
        return true;
    },

    getReadOnly: function() { return this._readOnly; },

    outReadOnlyChange: function(readOnly, oldReadOnly) {
        this._out('readOnlyChange', readOnly, oldReadOnly);
    },

    _calcValueUpdateable: function(g) {
        return !g('readOnly') && !!this._subscribers['updateValue'];
    },
    
    _subscribeFirst_updateValue: function() {
        if (this._ofunValueUpdateable) this._ofunValueUpdateable.update();
    },
    
    _unsubscribeLast_updateValue: function() {
        if (this._ofunValueUpdateable) this._ofunValueUpdateable.update();
    },
    
    _doUpdateValue: function(value, editor, ret) {
    
    },
    
    updateValue: function(value, editor) {
        if (!arguments.length) {
            editor = this.getActiveEditor();
            if (!editor) return;
            if (editor.actualizeValue) editor.actualizeValue();
            value = editor.getValue();
        }
        if (!this.getValueUpdateable()) {
            throw "Cannot updateValue() when `valueUpdateable` is false";
        }
        var ret = {done: false, newValue: undefined};
        this.outUpdateValue(value, editor, ret, this);
        if (!ret.done) {
            this._doUpdateValue(value, editor, ret, this);
        }
        if (ret.done) {
            if (ret.newValue !== undefined) value = ret.newValue;
        }
        this.setValue(value);
    },

    _beginEdit: function() {
        if (!this.getValueUpdateable()) {
            console.warn('cannot setEditable(true) when getValueUpdateable() is FALSE');
            return false;
        }
        var editor = this.findEditor();
        if (!editor) {
            console.warn('editor not set for column ' + this.getColumn().getId());
            return false;
        }
        var oldDp = editor.getDisplayParent();
        if (Amm.is(oldDp, 'Amm.Table.Cell')) {
            oldDp.setEditing(false);
        }
        this._setActiveEditor(editor);
        editor.setDisplayParent(this);
        editor.setValue(this.getValue());
    },
    
    _endEdit: function(dontChangeActive) {
        var editor = this._activeEditor;
        if (editor && editor.getDisplayParent() === this) {
            var ex = null;
            if (!this._cancelEdit) this.updateValue(editor.getValue());
            editor.setDisplayParent(null);
        }
        if (!dontChangeActive) this._setActiveEditor(null);
    },
    
    setActiveEditor: function(activeEditor) {
        console.warn("Amm.Table.Cell.setActiveEditor() has no effect; use setEditor() + setEditing()");
    },
    
    _setActiveEditor: function(activeEditor) {
        if (!activeEditor) activeEditor = null;
        else this._checkIsEditor(activeEditor, 'activeEditor');
        var oldActiveEditor = this._activeEditor;
        if (oldActiveEditor === activeEditor) return;
        this._activeEditor = activeEditor;
        this.outActiveEditorChange(activeEditor, oldActiveEditor);
        return true;
    },

    getActiveEditor: function() { return this._activeEditor; },

    outActiveEditorChange: function(activeEditor, oldActiveEditor) {
        this._out('activeEditorChange', activeEditor, oldActiveEditor);
    },
    
    /**
     * if ret.done is true, probably do noting
     * set ret.done to true if update was successful
     * set ret.newValue if new value is different from update value
     * @param {object} ret Output for result of function
     */
    outUpdateValue: function(value, editor, ret, cell) {
        this._out('updateValue', value, editor, ret, cell);
    },
    
    setEditing: function(editing) {
        editing = !!editing;
        var oldEditing = this._editing;
        if (oldEditing === editing) return;
        if (editing) {
            if (this._beginEdit() === false) return;
        } else {
            if (this._endEdit() === false) return;
        }
        this._editing = editing;
        var has = this._table.getEditingCells().hasItem(this, true);
        if (this._table) {
            if (editing) {
                if (!has) this._table.getEditingCells().accept(this);
            } else {
                if (has) this._table.getEditingCells().reject(this);
            }
        }
        this.outEditingChange(editing, oldEditing);
        return true;
    },

    getEditing: function() { return this._editing; },
    
    outEditingChange: function(editing, oldEditing) {
        this._out('editingChange', editing, oldEditing);
    },
    
    _cleanup_TableCell: function() {
        if (this._editing) this._endEdit();
    },
    
    endEdit: function(confirm, dontThrow) {
        if (!this._editing) {
            if (dontThrow) return;
            throw Error("Cannot endEdit() when getEditing() === false");
        }
        var ex, tmp;
        try {
            tmp = this._cancelEdit;
            this._cancelEdit = !confirm;
            this.setEditing(false);
        } catch (ex) {
        }
        this._cancelEdit = tmp;
        if (ex) throw ex;    
        return true;
    },
    
    confirmEdit: function(dontThrow) {
        return this.endEdit(true, dontThrow);
    },
    
    cancelEdit: function(dontThrow) {
        return this.endEdit(false, dontThrow);
    },
    
    setEditor: function(editor) {
        var res = Amm.Table.WithEditor.prototype.setEditor.call(this, editor);
        if (!this._editing || !res) return res;
        var willEdit = !!this.findEditor();
        this._endEdit(willEdit);
        if (willEdit) this._beginEdit();
    },
    
    findEditor: function() {
        var editor = this.getEditor();
        if (!editor && this.getColumn()) editor = this.getColumn().getEditor();
        if (!editor && this.getRow()) {
            var table = this.getRow().getTable();
            if (table) editor = table.getEditor();
        }
        return editor;
    },
    
    isEditable: function() {
        return !!(this.getValueUpdateable() && this.findEditor());
    },
    
    /**
     * Finds next/previous cell adjacent to this one.
     * 
     * 
     * @param {boolean} reverse If true, will return previous row
     * @param {int} mode One of Amm.Table.ADJACENT_ constants
     * @param {function} callback If provided, will continue search until callback returns true
     * @returns {Amm.Table.Row}
     */
    findAdjacent: function(reverse, callback, mode, rowCallback) {
        var src, idx;
        var row = this.getRow();
        if (!row) return;
        src = row.displayChildren;
        idx = src.indexOf(this);
        if (idx < 0) return;
        var d = reverse? -1: 1;
        var res, found = true, skipFirst = false;
        if (mode === undefined) mode = Amm.Table.ADJACENT_SAME_SECTION;
        else mode = parseInt(mode);
        if (isNaN(mode)) throw Error("`within` must be a number");
        // skip searching in current row if 
        if (rowCallback && row && !rowCallback(row, row)) skipFirst = true;
        do {
            if (!skipFirst) do {
                do {
                    idx += d;
                    res = src[idx];
                } while (res && !Amm.is(res, 'Amm.Table.Cell'));
                if (callback && res) found = callback(res, this);
                else found = !!res;
            } while(res && !found);
            skipFirst = false;
            if (!res) { // no more cells in this row
                found = false;
                if (mode === Amm.Table.ADJACENT_SAME_ROW) row = null;
                if (row) {
                    row = row.findAdjacent(reverse, rowCallback, mode);
                }
                if (row) {
                    src = row.displayChildren;
                    idx = reverse? src.length : -1;
                }
            }
        } while (row && !found);
        if (!found) return;
        return res || null;
    },
    
    focusEditor: function() {
        if (this._activeEditor) this._activeEditor.focus(); // TODO: fix 
    },
    
    _calcCanActivate: function(get) {
        
        var res =
            !get('locked')
            && !!get.prop('row').prop('canActivate').val() 
            && !!get.prop('column').prop('canActivate').val();
        return res;
    },
    
    _calcAddress: function(get) {
        var rowIndex = get.prop('row').prop('displayOrder').val();
        if (rowIndex === null) return null;
        var sectionType = get.prop('row').prop('section').prop('type').val();
        if (!sectionType) return null;
        var colIndex = get.prop('displayOrder').val();
        if (colIndex === null) return null;
        var res = sectionType.slice(0, 1).toLowerCase() + (rowIndex + 1) + 'c' + (colIndex + 1);
        return res;
    },
    
};

Amm.createProperty(Amm.Table.Cell.prototype, 'row', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Cell.prototype, 'column', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Cell.prototype, 'item', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Cell.prototype, 'table', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.Cell.prototype, 'value', null, null, {enumerable: false});

Amm.extend(Amm.Table.Cell, Amm.Element);
Amm.extend(Amm.Table.Cell, Amm.Table.WithEditor);
Amm.extend(Amm.Table.Cell, Amm.Table.WithActive);

Amm.ObservableFunction.createCalcProperty('address', Amm.Table.Cell.prototype);
Amm.ObservableFunction.createCalcProperty('valueUpdateable', Amm.Table.Cell.prototype);