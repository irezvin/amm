/* global Amm */

Amm.Table.Cell = function (options) {
    Amm.Element.call(this, options);
};

Amm.Table.Cell.prototype = {

    'Amm.Table.Cell': '__CLASS__',

    _value: null,

    _column: null,

    _requiredColumnClass: 'Amm.Table.Column',

    _ignoreColumnCellClassName: false,

    _ownClassName: '',

    _lockClassName: 0,

    _getDefaultTraits: function (options) {
        return [Amm.Trait.Visual, Amm.Trait.Component, Amm.Trait.DisplayParent];
    },

    constructDefaultViews: function () {
        var res = Amm.html({
            $: 'td',
            data_amm_v: [
                {
                    class: 'v.Visual'
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
        if (component)
            this.setItem(component.getItem());
    },

    setRow: function (row) {
        return this.setComponent(row);
    },

    getRow: function () {
        return this._component;
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
    }
};

Amm.createProperty(Amm.Table.Cell.prototype, 'row', null, null, true);
Amm.createProperty(Amm.Table.Cell.prototype, 'column', null, null, true);
Amm.createProperty(Amm.Table.Cell.prototype, 'item', null, null, true);

Amm.extend(Amm.Table.Cell, Amm.Element);

