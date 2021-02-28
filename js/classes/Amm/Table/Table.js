/* global Amm */

Amm.Table = function(options) {
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
    Amm.Element.call(this, options);
    if (columns) this.setColumns(columns);
    this._enabledColumnsMapper = new Amm.ArrayMapper({
        src: this.getColumns(undefined, true),
        dest: this._enabledColumns,
        filter: {
            conditions: [{
                enabled: true
            }]
        }
    });
    
    this._rows = new Amm.Collection({
        indexProperty: 'index',
        observeIndexProperty: false,
    });
    
    this._rowsMapper = new Amm.ArrayMapper({
        dest: this._rows,
        instantiator: new Amm.Instantiator.Proto({
            proto: {
                class: 'Amm.Table.RowOfCells'
            },
            protoCallback: this.outRowProtoCallback,
            protoCallbackScope: this,
            instanceCallback: this.outRowInstanceCallback,
            instanceCallbackScope: this,
            assocProperty: 'item'
        }),
    });
    
    this._enabledRowsMapper = new Amm.ArrayMapper({
        src: this._rowsMapper.getDest(),
        dest: this.getBody(true).displayChildren,
        filter: {
            conditions: [{
                enabled: true
            }]
        },
    });
    
    if (items) this.setItems(items);
};

Amm.Table.prototype = {

    'Amm.Table': '__CLASS__', 

    _items: null,
    
    _itemsIsOwn: null,
    
    /**
     * @type {Amm.Collection}
     */
    _rows: null,
    
    _rowsMapper: null,
    
    _enabledRowsMapper: null,
    
    _enabledColumns: null,
    
    _enabledColumnsMapper: null,
    
    /**
     * @type {Amm.Collection}
     */
    _specialRows: null,
    
    /**
     * @type {Amm.Collection}
     */
    _rows: null,
    
    _columns: null,
    
    _updateLevel: 0,
    
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
    
    _getDefaultTraits: function() {
        return [ 'Amm.Trait.Visual', 'Amm.Trait.Component', 'Amm.Trait.DisplayParent' ];
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
        this._rowsMapper.setSrc(items);
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
        this._enabledRowsMapper.cleanup();
        this._enabledRowsMapper = null;
        this._rowsMapper.cleanup();
        this._rowsMapper = null;
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
                }
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
        if (res && this._itemRowsMapper) {
            this._itemRowsMapper.setDest(this.getBody(true).displayChildren);
        }
        return res;
    },

    getBody: function() { 
        if (!this._body) this.setBody({
            displayChildrenPrototype: {
                observeIndexProperty: false
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
    
};

Amm.createProperty(Amm.Table.prototype, 'items', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.prototype, 'rows', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.prototype, 'columns', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.prototype, 'header', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.prototype, 'body', null, null, {enumerable: false});
Amm.createProperty(Amm.Table.prototype, 'footer', null, null, {enumerable: false});



Amm.extend(Amm.Table, Amm.Element);

