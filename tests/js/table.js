/* global Amm */
/* global QUnit */

(function() {

    QUnit.module("Table");
        
    var getSectionRows = function(table) {
        return table.header.rows.getItems().concat(table.body.rows.getItems(), table.footer.rows.getItems());
    };

    var exportTable = function(element) {
        var res = [];
        jQuery(element).find('tr').each(function(i, tr) {
            var row = [];
            jQuery(tr).find('*[data-amm-value]').each(function(i, val) {
                row.push(val.innerHTML);
            });
            res.push(row.join('|'));
        });
        return res;
    };
    
    var exportTableCopy = function(tableCopy) {
        var res = [];
        for (var i in tableCopy) if (tableCopy.hasOwnProperty(i)) {
            var row = [];
            for (var j in tableCopy[i]) if (tableCopy[i].hasOwnProperty(j)) {
                row.push(tableCopy[i][j]);
            }
            res.push(row.join("|"));
        }
        return res;
    };
    
    var prep = function(exportTableCopy) {
        for (var i = 0; i < exportTableCopy.length; i++) {
            exportTableCopy[i] = 
                exportTableCopy[i]
                .replace(/^\s*|\s*$/g, '')
                .replace(/\s*\|\s*/g, '|');
        }
        return exportTableCopy;
    };
    
    var getCells = function(rows, propName, cb) {
        if (propName === undefined) propName = 'value';
        var res = [];
        for (var i = 0; i < rows.length; i++) {
            var row = propName? Amm.getProperty(rows[i].cells.getItems(), propName) : rows[i].cells.getItems();
            if (cb) {
                for (var j = 0; j < row.length; j++) {
                    row[j] = cb(row[j]);
                }
            }
            res.push(row.join('|'));
        }
        return res;
    };
    
    var getCellsOfColumn = function(indexOrId, rows) {
        var isId = typeof indexOrId !== 'number', cell, res = [];
        for (var i = 0; i < rows.length; i++) {
            if (isId) cell = rows[i].e[indexOrId];
            else  cell = rows[i].displayChildren[indexOrId];
            res.push(cell);
        }
        return res;
    };
    
    QUnit.test("Amm.Table - Basic", function(assert) {
        var tableCopy = {};
        var t = new Amm.Table.Table({
            columns: {
                index: {caption: 'item #', source: "$cell.row.index + 1"},
                visIndex: {caption: 'vis #', source: "$cell.row.displayOrder === null? '' : $cell.row.displayOrder + 1"},
                recordId: {caption: 'ID'},
                name: {},
                surname: {},
                age: {},
                fullName: {caption: 'Full Name', source: "this.name + ' ' + this.surname"}
            },
            header: {
                rows: ['Amm.Table.HeaderRow']
            },
        });
        window.d.t = t;
        var items = new Amm.Collection(Amm.constructMany([
            {props: {recordId: 1, name: 'John', surname: 'James', age: 20}},
            {props: {recordId: 2, name: 'Jane', surname: 'James', age: 25}},
            {props: {recordId: 3, name: 'Mike', surname: 'Doe', age: 52}},
            {props: {recordId: 4, name: 'Kate', surname: 'Doe', age: 48}},
        ], 'Amm.Element'));
        
        assert.equal(Amm.getClass(t.getColumns('recordId')), 'Amm.Table.ObservingColumn');
        
        t.setItems(items);
        
        var cell = t.rows[0].cells[0];
        d.cell = cell;
        assert.ok(cell.column === cell.getColumn(), 'cell.column property works');
        assert.ok(cell.row === cell.getRow(), 'cell.row property works');
        assert.ok(cell.table === cell.getTable(), 'cell.table property works');
        
        var v = new Amm.View.Html.Default({element: t, htmlElement: document.createElement('div')});
        var h = jQuery(v.getHtmlElement());
        
        assert.deepEqual(t.body.rows.length, items.length, 'Body has same number of rows as items');
        assert.deepEqual(t.rows.length, items.length, 'table.rows has same number of rows as items');
        
        assert.deepEqual(Amm.getProperty(t.header.rows[0].cells.getItems(), 'value'), 
            ['item #', 'vis #', 'ID', 'name', 'surname', 'age', 'Full Name'],
            "Values of header cells contain column captions"
        );
        assert.deepEqual(Amm.getProperty(t.header.rows[0].cells.getItems(), 'id'), 
            ['index', 'visIndex', 'recordId', 'name', 'surname', 'age', 'fullName'],
            "IDs of header cells same as IDs of columns"
        );
        assert.deepEqual(getCells(t.body.rows),
            prep([
                ' 1 | 1 | 1 | John | James | 20 | John James ',
                ' 2 | 2 | 2 | Jane | James | 25 | Jane James ',
                ' 3 | 3 | 3 | Mike | Doe   | 52 | Mike Doe   ',
                ' 4 | 4 | 4 | Kate | Doe   | 48 | Kate Doe   ',
            ]),
            'proper rows and columns order'
        );
        
        items[1].surname = 'Parks';
            assert.deepEqual(getCells(t.body.rows),
                prep([
                    ' 1 | 1 | 1 | John | James | 20 | John James ',
                    ' 2 | 2 | 2 | Jane | Parks | 25 | Jane Parks ',
                    ' 3 | 3 | 3 | Mike | Doe   | 52 | Mike Doe   ',
                    ' 4 | 4 | 4 | Kate | Doe   | 48 | Kate Doe   ',
                ]),
                'proper rows and columns order'
            );
    
            assert.deepEqual(
                getCells(t.header.rows).concat(getCells(t.body.rows)),
                exportTable(v.getHtmlElement()),
                'HTML has same order and content as table elements'
            );
        
        items.moveItem(1, 2);
        
            assert.deepEqual(getCells(t.body.rows),
                prep([
                    ' 1 | 1 | 1 | John | James | 20 | John James  ',
                    ' 2 | 2 | 3 | Mike | Doe   | 52 | Mike Doe    ', 
                    ' 3 | 3 | 2 | Jane | Parks | 25 | Jane Parks  ',
                    ' 4 | 4 | 4 | Kate | Doe   | 48 | Kate Doe    ',
                ]),
                'items re-order work'
            );
    
            assert.deepEqual(
                getCells(t.header.rows).concat(getCells(t.body.rows)),
                exportTable(v.getHtmlElement()),
                'HTML has same order and content as table elements'
            );
    
        t.rows[1].setEnabled(false);
        
            assert.deepEqual(t.rows[1].getDisplayOrder(), null,
                'displayOrder of disabled row null');
            assert.deepEqual(getCells(t.body.rows),
                prep([
                    ' 1 | 1 | 1 | John | James | 20 | John James ',
                    ' 3 | 2 | 2 | Jane | Parks | 25 | Jane Parks ',
                    ' 4 | 3 | 4 | Kate | Doe   | 48 | Kate Doe   ',
                ]),
                'disabled row doesn\'t appear in table.body'
            );
    
            assert.deepEqual(
                getCells(t.header.rows).concat(getCells(t.body.rows)),
                exportTable(v.getHtmlElement()),
                'HTML has same order and content as table elements'
            );
        
            assert.deepEqual(getCells(t.rows),
                prep([
                    ' 1 | 1 | 1 | John | James | 20 | John James ',
                    ' 2 |   | 3 | Mike | Doe   | 52 | Mike Doe   ',
                    ' 3 | 2 | 2 | Jane | Parks | 25 | Jane Parks ',
                    ' 4 | 3 | 4 | Kate | Doe   | 48 | Kate Doe   ',
                ]),
                'disabled row still aappears table rows '
            );
    
            assert.deepEqual(
                getCells(t.header.rows).concat(getCells(t.body.rows)),
                exportTable(v.getHtmlElement()),
                'HTML has same order and content as table elements'
            );

        t.rows[1].setEnabled(true);
        
            assert.deepEqual(t.rows[1].getDisplayOrder(), 1,
                'displayOrder of enabled row is back');
            assert.deepEqual(getCells(t.body.rows),
                prep([
                    ' 1 | 1 | 1 | John | James | 20 | John James ',
                    ' 2 | 2 | 3 | Mike | Doe   | 52 | Mike Doe   ',
                    ' 3 | 3 | 2 | Jane | Parks | 25 | Jane Parks ',
                    ' 4 | 4 | 4 | Kate | Doe   | 48 | Kate Doe   ',
                ]), 
                'enabled row appeared in table.body'
            );
    
            assert.deepEqual(
                getCells(t.header.rows).concat(getCells(t.body.rows)),
                exportTable(v.getHtmlElement()),
                'HTML has same order and content as table elements'
            );
    
        t.getColumns('fullName').setDisplayOrder(3);
        
            assert.deepEqual(getCells(t.header.rows).concat(getCells(t.body.rows)),
                prep([
                    
                    ' item #  |  vis # | ID  | Full Name  | name | surname | age  ',
                    
                    '    1    |   1    |  1  | John James | John | James   |  20  ',
                    '    2    |   2    |  3  | Mike Doe   | Mike | Doe     |  52  ',
                    '    3    |   3    |  2  | Jane Parks | Jane | Parks   |  25  ',
                    '    4    |   4    |  4  | Kate Doe   | Kate | Doe     |  48  ',
                ]),
                'column moved: both header cell and body cells moved accordingly'
            );
    
            assert.deepEqual(
                getCells(t.header.rows).concat(getCells(t.body.rows)),
                exportTable(v.getHtmlElement()),
                'HTML has same order and content as table elements'
            );
    
            t.getColumns('name').setEnabled(false);
            
            t.getColumns('surname').setEnabled(false);
        
            assert.deepEqual(getCells(t.header.rows).concat(getCells(t.body.rows)),
                prep([
                    
                    ' item #  |  vis # | ID  | Full Name  | age  ',
                    
                    '    1    |   1    |  1  | John James | 20  ',
                    '    2    |   2    |  3  | Mike Doe   | 52  ',
                    '    3    |   3    |  2  | Jane Parks | 25  ',
                    '    4    |   4    |  4  | Kate Doe   | 48  ',
                ]),
                'columns disabled: both header cells and body cells disappeared'
            );
    
            assert.deepEqual(
                getCells(t.header.rows).concat(getCells(t.body.rows)),
                exportTable(v.getHtmlElement()),
                'HTML has same order and content as table elements'
            );
    
            t.getColumns('surname').setEnabled(true);
            t.getColumns('name').setEnabled(true);
        
            assert.deepEqual(getCells(t.header.rows).concat(getCells(t.body.rows)),
                prep([
                    
                    ' item #  |  vis # | ID  | Full Name  | name | surname | age  ',
                    
                    '    1    |   1    |  1  | John James | John | James   |  20  ',
                    '    2    |   2    |  3  | Mike Doe   | Mike | Doe     |  52  ',
                    '    3    |   3    |  2  | Jane Parks | Jane | Parks   |  25  ',
                    '    4    |   4    |  4  | Kate Doe   | Kate | Doe     |  48  ',
                ]),
                'columns enabled: both header cell and body cells appeared back'
            );
    
            assert.deepEqual(
                getCells(t.header.rows).concat(getCells(t.body.rows)),
                exportTable(v.getHtmlElement()),
                'HTML has same order and content as table elements'
            );
    
        t.getColumns('fullName').setCellClassName('colClass');
        
            assert.deepEqual(
                    getCells(t.header.rows, 'id')
                    .concat(getCells(t.header.rows, 'className'))
                    .concat(getCells(t.body.rows, 'className')),
                prep([
                    
                    '  index  | visIndex | recordId |  fullName  | name | surname | age  ',
                    
                    '         |          |          |  colClass  |      |         |      ',
                    '         |          |          |  colClass  |      |         |      ',
                    '         |          |          |  colClass  |      |         |      ',
                    '         |          |          |  colClass  |      |         |      ',
                    '         |          |          |  colClass  |      |         |      ',
                ]),
                'cellClassName works'
            );
    
        t.getColumns('fullName').setCellClassName(true, 'extra');
        
            assert.deepEqual(
                    getCells(t.header.rows, 'id')
                    .concat(getCells(t.header.rows, 'className'))
                    .concat(getCells(t.body.rows, 'className')),

                prep([
                    
                    '  index  | visIndex | recordId |    fullName    | name | surname | age  ',
                    
                    '         |          |          | colClass extra |      |         |      ',
                    '         |          |          | colClass extra |      |         |      ',
                    '         |          |          | colClass extra |      |         |      ',
                    '         |          |          | colClass extra |      |         |      ',
                    '         |          |          | colClass extra |      |         |      ',
                ]),
                'cellClassName: add part'
            );
    
        t.body.rows[1].e.fullName.setIgnoreColumnCellClassName(true);
        
            assert.deepEqual(
                    getCells(t.header.rows, 'id')
                    .concat(getCells(t.header.rows, 'className'))
                    .concat(getCells(t.body.rows, 'className')),
                prep([
                    
                    '  index  | visIndex | recordId |     fullName      | name | surname | age  ',
                    '         |          |          | colClass extra    |      |         |      ',
                    
                    '         |          |          | colClass extra    |      |         |      ',
                    '         |          |          |                   |      |         |      ',
                    '         |          |          | colClass extra    |      |         |      ',
                    '         |          |          | colClass extra    |      |         |      ',
                ]),
                'ignoreColumnCellClassName()'
            );
    
        t.body.rows[2].e.fullName.setClassName('zz');
        
            assert.deepEqual(
                    getCells(t.header.rows, 'id')
                    .concat(getCells(t.header.rows, 'className'))
                    .concat(getCells(t.body.rows, 'className')),
                prep([
                    
                    '  index  | visIndex | recordId |     fullName      | name | surname | age  ',
                    '         |          |          | colClass extra    |      |         |      ',
                    
                    '         |          |          | colClass extra    |      |         |      ',
                    '         |          |          |                   |      |         |      ',
                    '         |          |          | zz colClass extra |      |         |      ',
                    '         |          |          | colClass extra    |      |         |      ',
                ]),
                'cell.setClassName(): cell `className` is combined with column.`cellClassName`'
            );
    
        t.getColumns('recordId').setVisible(false);
        
            assert.deepEqual(
                    getCells(t.header.rows, 'id')
                    .concat(getCells(t.header.rows, 'visible', function(v) {return v? '' : '0';}))
                    .concat(getCells(t.body.rows, 'visible', function(v) {return v? '' : '0';})),
                    
                prep([
                    
                    '  index  | visIndex | recordId |     fullName      | name | surname | age  ',
                    '         |          |    0     |                   |      |         |      ',
                                        
                    '         |          |    0     |                   |      |         |      ',
                    '         |          |    0     |                   |      |         |      ',
                    '         |          |    0     |                   |      |         |      ',
                    '         |          |    0     |                   |      |         |      ',
                ]),
                'column.visible updates cell visibility'
            );
    
        t.cleanup();
        v.cleanup();
        
    });
    
    QUnit.test("Amm.Table - Active cell/row/column", function(assert) {
        
        var tableCopy = {};
        var t = new Amm.Table.Table({
            columns: {
                a: {},
                b: {},
                c: {},
                d: {},
                e: {},
            },
            header: {
                rows: ['Amm.Table.HeaderRow']
            },
        });
        window.d.t = t;
        var items = new Amm.Collection(Amm.constructMany([
            {props: {a: 'a1', b: 'b1', c: 'c1', d: 'd1', e: 'e1'}},
            {props: {a: 'a2', b: 'b2', c: 'c2', d: 'd2', e: 'e2'}},
            {props: {a: 'a3', b: 'b3', c: 'c3', d: 'd3', e: 'e3'}},
            {props: {a: 'a4', b: 'b4', c: 'c4', d: 'd4', e: 'e4'}},
        ], 'Amm.Element'));
        
        t.setActiveRowClass('');
        t.setActiveColumnClass('');
        t.setActiveCellClass('');
        
        t.setItems(items);
        
            assert.equal(t.getActiveCell(), null, '`activeCell` of table is initially null');
            assert.equal(t.getActiveRow(), null, '`activeRow` of table is initially null');
            assert.equal(t.getActiveColumn(), null, '`activeColumn` of table is initially null');
        
        t.setActiveCell(t.rows[0].cells[0]);
        
            assert.ok(t.getActiveCell() === t.rows[0].cells[0], 
                'setActiveCell(): getActiveCell() returns provided cell (1)');
            assert.ok(t.getActiveColumn() === t.columns[0],
                'setActiveCell(): getActiveColumn() return active cell\'s column (1)');
            assert.ok(t.getActiveRow() === t.rows[0],
                'setActiveCell(): getActiveRow() return active cell\'s row (1)');

        t.setActiveCell(t.rows[1].cells[1]);
            assert.ok(t.getActiveCell() === t.rows[1].cells[1],
                'setActiveCell(): getActiveCell() returns provided cell (2)');
            assert.ok(t.getActiveColumn() === t.columns[1],
                'setActiveCell(): getActiveColumn() return active cell\'s column (2)');
            assert.ok(t.getActiveRow() === t.rows[1],
                'setActiveCell(): getActiveRow() return active cell\'s row (2)');
                
        t.setActiveRow(t.rows[2]);
            assert.ok(t.getActiveCell() === t.rows[2].cells[1],
                'setActiveRow(): cell in same column, new row becomes active');
            assert.ok(t.getActiveColumn() === t.columns[1],
                'setActiveRow(): getActiveColumn() remains the same');
                
        t.setActiveColumn(t.columns[2]);
            assert.ok(t.getActiveCell() === t.rows[2].cells[2],
                'setActiveColumn(): cell in new column, same row becomes active');
            assert.ok(t.getActiveRow() === t.rows[2],
                'setActiveColumn(): getActiveRow() remains the same');
                
        t.setActiveRowClass('activeRow');
            assert.deepEqual(t.getActiveRow().getClassName(), 'activeRow',
                'activeRowClass works');
        
        t.setActiveColumnClass('activeColumn');
            var cellClasses = [];
            t.findCells(function(cell) {
                if (cell.getColumn() && cell.getColumn().getActive()) cellClasses.push(cell.getClassName()); 
            });
            assert.deepEqual(Amm.Array.unique(cellClasses), ['activeColumn'],
                'active cell has class name of active column');
        
        t.setActiveCellClass('activeCell');
            assert.deepEqual(t.getActiveCell().getClassName(), 'activeCell activeColumn',
                'active cell has class name of active column AND activeCellClass');
                
        t.setActiveCell(null);
        
        var b0c0canActivate, b0c1canActivate, b1c0canActivate;
        
            assert.deepEqual(t.rows[0].cells[0].getCanActivate(), true, 
                'Regular cell can initially be activated (1)');
            assert.deepEqual(t.rows[0].cells[1].getCanActivate(), true, 
                'Regular cell can initially be activated (2)');
            assert.deepEqual(t.rows[1].cells[0].getCanActivate(), true, 
                'Regular cell can initially be activated (3)');
                
        t.rows[0].cells[0].subscribe('canActivateChange', function(v) { b0c0canActivate = v; });
        t.rows[0].cells[1].subscribe('canActivateChange', function(v) { b0c1canActivate = v; });
        t.rows[1].cells[0].subscribe('canActivateChange', function(v) { b1c0canActivate = v; });

        t.rows[0].cells[0].setLocked(true);
        
            assert.deepEqual(b0c0canActivate, false,
                'cell.setLocked(true): canActivate changed to false');
        
        t.rows[0].cells[0].setLocked(false);
        
            assert.deepEqual(b0c0canActivate, true,
                'cell.setLocked(false): canActivate changed to true');
            
        t.columns[0].setLocked(true);
            
            assert.deepEqual(b0c0canActivate, false,
                'cell.column.setLocked(true): canActivate changed to false (1)');
            assert.deepEqual(b1c0canActivate, false,
                'cell.column.setLocked(true): canActivate changed to false (2)');
            
        t.columns[0].setLocked(false);
            
            assert.deepEqual(b0c0canActivate, true,
                'cell.column.setLocked(false): canActivate changed to true (1)');
            assert.deepEqual(b1c0canActivate, true,
                'cell.column.setLocked(false): canActivate changed to true (2)');
            
        t.rows[0].setLocked(true);
            
            assert.deepEqual(b0c0canActivate, false,
                'cell.row.setLocked(true): canActivate changed to false (1)');
            assert.deepEqual(b0c1canActivate, false,
                'cell.row.setLocked(true): canActivate changed to false (2)');
            
        t.rows[0].setLocked(false);
            
            assert.deepEqual(b0c0canActivate, true,
                'cell.row.setLocked(false): canActivate changed to true (1)');
            assert.deepEqual(b0c1canActivate, true,
                'cell.row.setLocked(false): canActivate changed to true (2)');
            
        t.columns[0].setVisible(false);
            
            assert.deepEqual(b0c0canActivate, false,
                'cell.column.setVisible(false): canActivate changed to false (1)');
            assert.deepEqual(b1c0canActivate, false,
                'cell.column.setVisible(false): canActivate changed to false (2)');
            
        t.columns[0].setVisible(true);
            
            assert.deepEqual(b0c0canActivate, true,
                'cell.column.setVisible(true): canActivate changed to true (1)');
            assert.deepEqual(b1c0canActivate, true,
                'cell.column.setVisible(true): canActivate changed to true (2)');
            
        t.rows[0].setVisible(false);
            
            assert.deepEqual(b0c0canActivate, false,
                'cell.row.setVisible(false): canActivate changed to false (1)');
            assert.deepEqual(b0c1canActivate, false,
                'cell.row.setVisible(false): canActivate changed to false (2)');
            
        t.rows[0].setVisible(true);
            
            assert.deepEqual(b0c0canActivate, true,
                'cell.row.setVisible(true): canActivate changed to true (1)');
            assert.deepEqual(b0c1canActivate, true,
                'cell.row.setVisible(true): canActivate changed to true (2)');

        t.rows[0].setEnabled(false);
            
            assert.deepEqual(b0c0canActivate, false,
                'cell.row.setEnabled(false): canActivate changed to false (1)');
            assert.deepEqual(b0c1canActivate, false,
                'cell.row.setEnabled(false): canActivate changed to false (2)');
            
        t.rows[0].setEnabled(true);
            
            assert.deepEqual(b0c0canActivate, true,
                'cell.row.setEnabled(true): canActivate changed to true (1)');
            assert.deepEqual(b0c1canActivate, true,
                'cell.row.setEnabled(true): canActivate changed to true (2)');
        

        t.columns[0].setEnabled(false);
            
            assert.deepEqual(b0c0canActivate, false,
                'cell.column.setEnabled(false): canActivate ischanged to false (1)');
            assert.deepEqual(b1c0canActivate, false,
                'cell.column.setEnabled(false): canActivate changed to false (2)');
                
        /*
         *  note that we cannot do the same with t.columns[0].setEnabled(true) 
         *  because observed cells are destroyed once column is not enabled anymore
         */
            
    });
    
    QUnit.test("Amm.Table - cell address & preserve active cell address", function(assert) {
        
        var t = new Amm.Table.Table({
            columns: {
                a: {},
                b: {},
                c: {},
                d: {},
                e: {},
            },
            header: {
                rows: ['Amm.Table.HeaderRow']
            },
            footer: {
                rows: ['Amm.Table.HeaderRow']
            },
        });
        
        window.d.t = t;
        
        var items = new Amm.Collection(Amm.constructMany([
            {props: {a: 'a1', b: 'b1', c: 'c1', d: 'd1', e: 'e1'}},
            {props: {a: 'a2', b: 'b2', c: 'c2', d: 'd2', e: 'e2'}},
            {props: {a: 'a3', b: 'b3', c: 'c3', d: 'd3', e: 'e3'}},
            {props: {a: 'a4', b: 'b4', c: 'c4', d: 'd4', e: 'e4'}},
        ], 'Amm.Element'));
        
        t.setActiveRowClass('');
        t.setActiveColumnClass('');
        t.setActiveCellClass('');
        
        t.setItems(items);
        
        var dump = function(cell) {
            var res = cell.getAddress() + ' ' + cell.getValue();
            var d = false;
            if (cell.getActive()) { res = '+' + res + '+'; d = true; }
            if (!cell.getCanActivate()) { res = '-' + res + '-'; d = true; }
            if (!d) res = ' ' + res + ' ';
            return res;
        };

        var activeCellAddress = null;
        
        t.subscribe('activeCellAddressChange', function(v) { activeCellAddress = v; });
        
        t.setPreserveActiveCellAddress(false);
        
        t.setActiveCellAddress('h1c2', false);
        
            assert.deepEqual(activeCellAddress, 'h1c2', 
                'Active cell address is the same as requested');
        
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    ' h1c1 a  |+h1c2 b+ | h1c3 c  | h1c4 d  | h1c5 e ',
                    ' b1c1 a1 | b1c2 b1 | b1c3 c1 | b1c4 d1 | b1c5 e1 ',
                    ' b2c1 a2 | b2c2 b2 | b2c3 c2 | b2c4 d2 | b2c5 e2 ',
                    ' b3c1 a3 | b3c2 b3 | b3c3 c3 | b3c4 d3 | b3c5 e3 ',
                    ' b4c1 a4 | b4c2 b4 | b4c3 c4 | b4c4 d4 | b4c5 e4 ',
                    ' f1c1 a  | f1c2 b  | f1c3 c  | f1c4 d  | f1c5 e  ',
                ]),
                'cells have proper addresses, setActiveCellAddress() works'
            );

            t.columns[3].setEnabled(false);
            
            // notice that ...c4 column now contains values with 'e' instead of 'd'
            // since column with 'd' disappeared from the table
            
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([ 
                    ' h1c1 a  |+h1c2 b+ | h1c3 c  | h1c4 e  ',
                    ' b1c1 a1 | b1c2 b1 | b1c3 c1 | b1c4 e1 ',
                    ' b2c1 a2 | b2c2 b2 | b2c3 c2 | b2c4 e2 ',
                    ' b3c1 a3 | b3c2 b3 | b3c3 c3 | b3c4 e3 ',
                    ' b4c1 a4 | b4c2 b4 | b4c3 c4 | b4c4 e4 ',
                    ' f1c1 a  | f1c2 b  | f1c3 c  | f1c4 e  ',
                ]),
                'disabled column: cell-in-the-table addresses not changed'
            );
            t.columns[3].setEnabled(true);
    
        var gca = function(address, arg) { 
            var cell = t.findCellByAddress(address, arg);
            if (!cell) return cell;
            return cell.getAddress();            
        };
        
        // testing findCellByAddress
    
        assert.deepEqual(gca('h1c3'), 'h1c3', 
            'findCellByAddress works (1)');
                
        assert.deepEqual(gca('b1c4'), 'b1c4',
            'findCellByAddress works (2)');
                
        assert.deepEqual(gca('f1c5'), 'f1c5',
            'findCellByAddress works (3)');
        
        assert.deepEqual(gca('f1c6'), undefined,
            'findCellByAddress beyound provided address returns undefined (1)');
        
        assert.deepEqual(gca('f2c4'), undefined,
            'findCellByAddress beyound provided address returns undefined (2)');
        
        assert.deepEqual(gca('b5c4'), undefined,
            'findCellByAddress beyound provided address returns undefined (3)');
        
        assert.deepEqual(gca('b5c4', Amm.Table.Table.FIND_CLOSEST), 'b4c4',
            'findCellByAddress(...FIND_CLOSEST) works(1) '
            + ' - below bottom row of body yields bottom row of body section');
        
        assert.deepEqual(gca('h2c4', Amm.Table.Table.FIND_CLOSEST), 'h1c4',
            'findCellByAddress(...FIND_CLOSEST) works(2)'
            + ' - below bottom row of body header bottom row of header section');
        
        assert.deepEqual(gca('f2c4', Amm.Table.Table.FIND_CLOSEST), 'f1c4',
            'findCellByAddress(...FIND_CLOSEST) works(3)'
            + ' - below bottom row of footer yields bottom row of footer');
        
        assert.deepEqual(gca('f1c6', Amm.Table.Table.FIND_CLOSEST), 'f1c5',
            'findCellByAddress(...FIND_CLOSEST) works(4)'
            + ' - after last column yields last column');
    
        
        t.rows[0].cells[0].setLocked(true);
        
            assert.deepEqual(gca('b1c1', Amm.Table.Table.FIND_ACTIVATABLE), 'b1c2',
                'findCellByAddress(...FIND_ACTIVABLE) - next avail cell');
        
        t.rows[0].cells[1].setLocked(true);
    
            assert.deepEqual(gca('b1c1', Amm.Table.Table.FIND_ACTIVATABLE), 'b1c3',
                'findCellByAddress(...FIND_ACTIVABLE) - next avail cell (2)');
        
        t.rows[0].setLocked(true);

            assert.deepEqual(gca('b1c1', Amm.Table.Table.FIND_ACTIVATABLE), 'b2c1',
                'findCellByAddress(...FIND_ACTIVABLE) - next avail row when whole row is locked');
        
        t.rows[0].setLocked(false);
        t.rows[0].cells[0].setLocked(false);
        t.rows[0].cells[1].setLocked(false);
        
        t.setPreserveActiveCellAddress(true);
        t.setActiveCellAddress('b1c1');
        
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    ' h1c1 a  | h1c2 b  | h1c3 c  | h1c4 d  | h1c5 e ',
                    '+b1c1 a1+| b1c2 b1 | b1c3 c1 | b1c4 d1 | b1c5 e1 ',
                    ' b2c1 a2 | b2c2 b2 | b2c3 c2 | b2c4 d2 | b2c5 e2 ',
                    ' b3c1 a3 | b3c2 b3 | b3c3 c3 | b3c4 d3 | b3c5 e3 ',
                    ' b4c1 a4 | b4c2 b4 | b4c3 c4 | b4c4 d4 | b4c5 e4 ',
                    ' f1c1 a  | f1c2 b  | f1c3 c  | f1c4 d  | f1c5 e  ',
                ]),
                'initial table state'
            );
    
        t.rows[0].setVisible(false);
        
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    ' h1c1 a  | h1c2 b  | h1c3 c  | h1c4 d  | h1c5 e ',
                    '-b1c1 a1-|-b1c2 b1-|-b1c3 c1-|-b1c4 d1-|-b1c5 e1-',
                    '+b2c1 a2+| b2c2 b2 | b2c3 c2 | b2c4 d2 | b2c5 e2 ',
                    ' b3c1 a3 | b3c2 b3 | b3c3 c3 | b3c4 d3 | b3c5 e3 ',
                    ' b4c1 a4 | b4c2 b4 | b4c3 c4 | b4c4 d4 | b4c5 e4 ',
                    ' f1c1 a  | f1c2 b  | f1c3 c  | f1c4 d  | f1c5 e  ',
                ]),
                'preserveActiveCellAddress === true: row hidden => shift down'
            );
    
        t.columns[0].setVisible(false);
        
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    '-h1c1 a- | h1c2 b  | h1c3 c  | h1c4 d  | h1c5 e ',
                    '-b1c1 a1-|-b1c2 b1-|-b1c3 c1-|-b1c4 d1-|-b1c5 e1-',
                    '-b2c1 a2-|+b2c2 b2+| b2c3 c2 | b2c4 d2 | b2c5 e2 ',
                    '-b3c1 a3-| b3c2 b3 | b3c3 c3 | b3c4 d3 | b3c5 e3 ',
                    '-b4c1 a4-| b4c2 b4 | b4c3 c4 | b4c4 d4 | b4c5 e4 ',
                    '-f1c1 a- | f1c2 b  | f1c3 c  | f1c4 d  | f1c5 e  ',
                ]),
                'preserveActiveCellAddress === true: col hidden => shift right'
            );
    
        t.rows[1].setEnabled(false);
        
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    '-h1c1 a- | h1c2 b  | h1c3 c  | h1c4 d  | h1c5 e ',
                    '-b1c1 a1-|-b1c2 b1-|-b1c3 c1-|-b1c4 d1-|-b1c5 e1-',
                    '-b2c1 a3-|+b2c2 b3+| b2c3 c3 | b2c4 d3 | b2c5 e3 ',
                    '-b3c1 a4-| b3c2 b4 | b3c3 c4 | b3c4 d4 | b3c5 e4 ',
                    '-f1c1 a- | f1c2 b  | f1c3 c  | f1c4 d  | f1c5 e  ',
                ]),
                'preserveActiveCellAddress === true: col hidden => shift right'
            );
    
        t.columns[1].setEnabled(false);
        
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    '-h1c1 a- | h1c2 c  | h1c3 d  | h1c4 e ',
                    '-b1c1 a1-|-b1c2 c1-|-b1c3 d1-|-b1c4 e1-',
                    '-b2c1 a3-|+b2c2 c3+| b2c3 d3 | b2c4 e3 ',
                    '-b3c1 a4-| b3c2 c4 | b3c3 d4 | b3c4 e4 ',
                    '-f1c1 a- | f1c2 c  | f1c3 d  | f1c4 e  ',
                ]),
                'preserveActiveCellAddress === true: col hidden => shift right'
            );
    
        assert.deepEqual(t.findCellByAddress('b1c4').getCanActivate(), false,
            'Specific column isn\' activable');
        t.setActiveCellAddress('b1c4', false); // inactivable column
        assert.deepEqual(t.getActiveCellAddress(), null, 
            'Attempt to setActiveCellAddress(inactivableAddress) makes'
            + 'activeCellAddress null');
    
        t.setActiveCellAddress('b1c4', true); // inactivable column
        assert.deepEqual(t.getActiveCellAddress(), 'b2c4', 
            'Attempt to setActiveCellAddress(inactivableAddress, true) '
            + 'activates closest activatable cell');
        
        t.setActiveCellAddress('b3c4'); // inactivable column
        
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    '-h1c1 a- | h1c2 c  | h1c3 d  | h1c4 e ',
                    '-b1c1 a1-|-b1c2 c1-|-b1c3 d1-|-b1c4 e1-',
                    '-b2c1 a3-| b2c2 c3 | b2c3 d3 | b2c4 e3 ',
                    '-b3c1 a4-| b3c2 c4 | b3c3 d4 |+b3c4 e4+',
                    '-f1c1 a- | f1c2 c  | f1c3 d  | f1c4 e  ',
                ]),
                'proper stateof table: last cell in body is active'
            );
    
        t.columns[4].setVisible(false);
        
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    '-h1c1 a- | h1c2 c  | h1c3 d  |-h1c4 e-',
                    '-b1c1 a1-|-b1c2 c1-|-b1c3 d1-|-b1c4 e1-',
                    '-b2c1 a3-| b2c2 c3 | b2c3 d3 |-b2c4 e3-',
                    '-b3c1 a4-| b3c2 c4 |+b3c3 d4+|-b3c4 e4-',
                    '-f1c1 a- | f1c2 c  | f1c3 d  |-f1c4 e-',
                ]),
                'last column hidden: shift left'
            );
        
        t.rows[3].setVisible(false);
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    '-h1c1 a- | h1c2 c  | h1c3 d  |-h1c4 e-',
                    '-b1c1 a1-|-b1c2 c1-|-b1c3 d1-|-b1c4 e1-',
                    '-b2c1 a3-| b2c2 c3 | b2c3 d3 |-b2c4 e3-',
                    '-b3c1 a4-|-b3c2 c4-|-b3c3 d4-|-b3c4 e4-',
                    '-f1c1 a- | f1c2 c  |+f1c3 d+|-f1c4 e-',
                ]),
                'last activatable row hidden: shift down'
            );
    
        t._enabledRowMapper.rebuild();
            assert.deepEqual(
                prep(getCells(getSectionRows(t), null, dump)),
                prep([
                    '-h1c1 a- | h1c2 c  | h1c3 d  |-h1c4 e-',
                    '-b1c1 a1-|-b1c2 c1-|-b1c3 d1-|-b1c4 e1-',
                    '-b2c1 a3-| b2c2 c3 | b2c3 d3 |-b2c4 e3-',
                    '-b3c1 a4-|-b3c2 c4-|-b3c3 d4-|-b3c4 e4-',
                    '-f1c1 a- | f1c2 c  |+f1c3 d+|-f1c4 e-',
                ]),
                'active cell address stays after cells rebuild'
            );
    
        Amm.cleanup(t);
    
    });
    
    
    QUnit.test("Support of cell prototypes in Columns and Rows", function(assert) {
        
        var t = new Amm.Table.Table({
            columns: {
                a: {},
                b: {},
                c: {},
            },
            header: {
                rows: ['Amm.Table.HeaderRow']
            },
            footer: {
                rows: ['Amm.Table.HeaderRow']
            },
        });
        
        window.d.t = t;
        
        var items = new Amm.Collection(Amm.constructMany([
            {props: {a: 'a1', b: 'b1', c: 'c1'}},
            {props: {a: 'a2', b: 'b2', c: 'c2'}},
            {props: {a: 'a3', b: 'b3', c: 'c3'}},
            {props: {a: 'a4', b: 'b4', c: 'c4'}},
        ], 'Amm.Element'));
        
        t.setItems(items);
        
        var b1 = t.rows[0];
        var b1c1 = b1.cells[0];
        
            assert.deepEqual(b1c1.getValue(), 'a1', 'Cell is proper');
        
        t.setRowProto({
            props: {rowExtra: 'rowExtra'}, 
            cellProto: {
                props: {cellRowExtra: 'cellRowExtraVal'}
            }
        });
        
            assert.ok(t.rows[0] !== b1, 'After setRowProto rows were rebuilt');
            assert.ok(t.rows[0].cells[0] !== b1c1, 'After setRowProto cell were rebuilt');
            assert.deepEqual(t.rows[0].rowExtra, 'rowExtra', 'newly built rows have requested props');
            assert.deepEqual(t.rows[0].cells[0].cellRowExtra, 'cellRowExtraVal', 
                'row.cellProto works too');
            
        t.rows[1].setCellProto({
            props: {row1exclusive: 'row1xVal'}
        });
        
            assert.deepEqual(t.rows[1].cells[0].cellRowExtra, undefined,
                'old row.cellProto is not active');
        
            assert.deepEqual(t.rows[1].cells[0].row1exclusive, 'row1xVal',
                'new row.cellProto is applied in specific row\'s cells');
                
            
        t.columns[1].setCellProto({
            props: {colCellExtra: 'colCellExtraVal'}
        });
        
            // to make row and cell proto 'play together', we need
            // -    give ability to the column to rebuild cells only
            //      -   give ability to ArrayMapper to rebuild only requested target items
            // -    give overrideRecursive ability to treat instances (with !!Amm.getClass(foo))
            //      as objects and not hashes (add param respectInstances, probably give it ability
            //      to be a callback function)
            
            //t._rowMapper.rebuild();
        
            assert.deepEqual(t.rows[0].cells[1].colCellExtra, 'colCellExtraVal',
                'column.cellProto is merged with row.cellProto');
        
            assert.deepEqual(t.rows[0].cells[1].cellRowExtra, 'cellRowExtraVal',
                'column.cellProto is merged with row.cellProto');
        
            assert.deepEqual(t.rows[1].cells[1].row1exclusive, 'row1xVal',
                'specific row\' cellProto is active');
        
            assert.deepEqual(t.rows[1].cells[1].colCellExtra, 'colCellExtraVal',
                'specific row\' cellProto is merged with column.cellProto');
        
    });
    
    QUnit.test("Amm.Table - Row & Cell findAdjacent", function(assert) {
        
        
        var t = new Amm.Table.Table({
            columns: {
                a: {},
                b: {},
                c: {},
                d: {},
                e: {},
            },
            header: {
                rows: ['Amm.Table.HeaderRow']
            },
            footer: {
                rows: ['Amm.Table.HeaderRow']
            },
        });
        
        window.d.t = t;
        
        var items = new Amm.Collection(Amm.constructMany([
            {props: {a: 'a1', b: 'b1', c: 'c1', d: 'd1', e: 'e1', owner: 'First'}},
            {props: {a: 'a2', b: 'b2', c: 'c2', d: 'd2', e: 'e2', owner: 'Second'}},
            {props: {a: 'a3', b: 'b3', c: 'c3', d: 'd3', e: 'e3', owner: 'Disabled Third' }},
            {props: {a: 'a4', b: 'b4', c: 'c4', d: 'd4', e: 'e4', owner: 'Fourth'}},
        ], 'Amm.Element'));
        
        t.setItems(items);
        
        var a1 = t.findCellByAddress('b1c1');
            assert.deepEqual(a1.getValue(), 'a1', 'Cell was located correctly (1)');
        
        var d3 = t.findCellByAddress('b3c3');
        d3.row.setEnabled(false);
        
        // since row with a3, b3, c3, d3... is disabled, a4, b4... is located in row#3
        var d4 = t.findCellByAddress('b3c4');
            
            assert.deepEqual(d4.getValue(), 'd4', 'Cell was located correctly (2)');
            
        var adj;
        
        // --------------------- row.findAdjacent (reverse = false) ------------------------
        
        adj = t.rows[0].findAdjacent();
        
            assert.ok(adj === t.rows[1], 'row.findAjacent(): next row was returned');
        
        adj = t.rows[1].findAdjacent(true);
        
            assert.ok(adj === t.rows[0], 'row.findAjacent(true): prev row was returned');
        
        adj = a1.row.findAdjacent(false, function(row) {
            return row.getItem && row.getItem().owner.match(/Fourth/);
        });
        
            assert.ok(!!adj, 'row.findAdjacent(): row was returned'); 
            
            if (adj)
            assert.deepEqual(adj.getItem().owner, 'Fourth', 
                'row.findAdjacent(): proper row was returned');
                
        adj = a1.row.findAdjacent(false, function(row) {
            return row.getItem && row.getItem().owner.match(/Disabled/);
        });
        
            assert.notOk(!!adj, 'row.findAdjacent by default does NOT locate non-section rows');
            if (adj) {
                console.log(Amm.getClass(adj), adj.getItem && adj.getItem().owner);
            }
            
                
        adj = a1.row.findAdjacent(false, function(row) {
            return row.getItem && row.getItem().owner.match(/Disabled/);
        }, Amm.Table.ADJACENT_ITEM_ROW);
        
            assert.ok(!!adj, 'row.findAdjacent (...ADJACENT_ITEM_ROW) DOES locate non-section rows');
            if (adj)
                assert.deepEqual(adj.getItem().owner, 'Disabled Third', 
                    'row.findAdjacent(...ADJACENT_ITEM_ROW): proper row was returned');
        
        adj = a1.row.findAdjacent(false, function(row) {
            return row.section.getType() === Amm.Table.Section.TYPE.FOOTER;
        }, Amm.Table.ADJACENT_ANY_SECTION);
        
            assert.ok(!!adj, 'findAdjacent(...ADJACENT_ANY_SECTION): footer row was located');
            if (adj) assert.ok(adj.section === t.footer,
                'findAdjacent(...ADJACENT_ANY_SECTION): row was located in the footer');

        // --------------------- row.findAdjacent (reverse = true) ------------------------
                
        adj = d4.row.findAdjacent(true, function(row) {
            return row.getItem && row.getItem().owner.match(/Second/);
        });
        
            assert.ok(!!adj, 'row.findAdjacent(true): prev row was returned'); 
            
            if (adj)
            assert.deepEqual(adj.getItem().owner, 'Second', 
                'row.findAdjacent(true): proper prev row was returned');
                
        adj = d4.row.findAdjacent(true, function(row) {
            return row.getItem && row.getItem().owner.match(/Disabled/);
        });
        
            assert.notOk(!!adj, 'row.findAdjacent by default does NOT locate non-section rows');
            if (adj) {
                console.log(Amm.getClass(adj), adj.getItem && adj.getItem().owner);
            }
            
                
        adj = d4.row.findAdjacent(true, function(row) {
            return row.getItem && row.getItem().owner.match(/Disabled/);
        }, Amm.Table.ADJACENT_ITEM_ROW);
        
            assert.ok(!!adj, 'row.findAdjacent (true, ...ADJACENT_ITEM_ROW) DOES locate non-section rows');
            if (adj)
                assert.deepEqual(adj.getItem().owner, 'Disabled Third', 
                    'row.findAdjacent(true, ...ADJACENT_ITEM_ROW): proper row was returned');
        
        adj = d4.row.findAdjacent(true, function(row) {
            return row.section.getType() === Amm.Table.Section.TYPE.HEADER;
        }, Amm.Table.ADJACENT_ANY_SECTION);
        
            assert.ok(!!adj, 'header row was located');
            if (adj) assert.ok(adj.section === t.header, 
                'findAdjacent(true...ADJACENT_ANY_SECTION): row was located in the header');
                
                
        // --------------------- cell.findAdjacent (reverse = false) ------------------------
        
        adj = t.rows[0].cells[0].findAdjacent();
        
            assert.ok(adj === t.rows[0].cells[1], 
                'cell.findAdjacent(false): next cell was returned');
        
        adj = t.rows[0].cells[1].findAdjacent(true);
        
            assert.ok(adj === t.rows[0].cells[0], 
                'cell.findAdjacent(true): prev cell was returned');
        
        adj = t.rows[0].cells[4].findAdjacent();
        
            assert.ok(adj === t.rows[1].cells[0], 
                'last in row cell.findAdjacent(false): next cell is first in next row');
        
        adj = t.rows[1].cells[0].findAdjacent(true);
        
            assert.ok(adj === t.rows[0].cells[4], 
                'last cell in row.findAdjacent(false): prev cell is last in prev row');
        
        adj = t.rows[0].cells[0].findAdjacent(true, null, Amm.Table.ADJACENT_ANY_SECTION);
            assert.ok(adj === t.header.rows[0].cells[4], 
                '...ADJACENT_ANY_SECTION works');
        
        
        adj = t.rows[0].cells[0].findAdjacent(false, function(cell, thisCell) {
            return thisCell.column === cell.column;
        }, Amm.Table.ADJACENT_ITEM_ROW, function(row) {
            return row.getEnabled() === false;
        });
        
            assert.ok(adj === t.rows[2].cells[0], 
                '...ADJACENT_ITEM_ROW, cell & row callback work');
                
        adj = t.rows[1].cells[0].findAdjacent(true, null, Amm.Table.ADJACENT_SAME_ROW);
        
            assert.notOk(!!adj,  '...ADJACENT_SAME_ROW: stop on row start');
                
        adj = t.rows[0].cells[4].findAdjacent(false, null, Amm.Table.ADJACENT_SAME_ROW);
            assert.notOk(!!adj, '...ADJACENT_SAME_ROW: stop on row end');
                
        
    });
    
    QUnit.test("Amm.Table.Cell: valueUpdateable, updateValue", function(assert) {
        
        var t = new Amm.Table.Table({
            columns: {
                index: {caption: 'item #', source: "$cell.row.index + 1"},
                recordId: {},
                name: {},
                surname: {},
                age: {},
                fullName: {caption: 'Full Name', source: "this.name + ' ' + this.surname"},
                companyName: {caption: 'Company Name', source: "this.company.name"}
            },
            header: {
                rows: ['Amm.Table.HeaderRow']
            },
        });
        
        window.d.t = t;
        
        var companies = {
            initech: new Amm.Element({props: {name: 'Initech'}}),
            stuffdyne: new Amm.Element({props: {name: 'Stuffdyne'}}),
        };
        
        var items = new Amm.Collection(Amm.constructMany([
            {props: {recordId: 1, name: 'John', surname: 'James', age: 20, company: companies.null}},
            {props: {recordId: 2, name: 'Jane', surname: 'James', age: 25, company: companies.initech}},
            {props: {recordId: 3, name: 'Mike', surname: 'Doe', age: 52, company: companies.stuffdyne}},
            {props: {recordId: 4, name: 'Kate', surname: 'Doe', age: 48, company: companies.initech}},
        ], 'Amm.Element'));
        
        t.setItems(items);
        
            assert.deepEqual(t.columns.k.name.findCells()[1].getValueUpdateable(), true,
                'valueCell with column as a source is updateable by default');
            assert.deepEqual(t.columns.k.fullName.findCells()[1].getValueUpdateable(), false,
                'valueCell with read-only expression as a source is not updateable by default');
            
        var updateFirstLastName = function(value, editor, ret, cell) {
            var item = cell.getItem();
            if (!item) return;
            var nv = value.split(/\s+/);
            item.name = nv.shift();
            item.surname = nv.join(' ');
            ret.done = true;
        };
        
        var upd;
        t.columns.k.fullName.findCells()[1].subscribe('valueUpdateableChange', function(v) { upd = v; });
        
        t.columns.k.fullName.findCells()[1].subscribe('updateValue', updateFirstLastName);
            
            assert.deepEqual(upd, true, 'After updateValue handler of the cell assigned, outValueUpdateableChange() triggers');
            
        t.columns.k.name.findCells()[1].updateValue('Johny');
            
            assert.deepEqual(items[0].name, 'Johny', 'cell.updateValue() works with property cell');
            
        t.columns.k.fullName.findCells()[1].updateValue('John Woo');
            
            assert.deepEqual(items[0].name + ' ' + items[0].surname, 'John Woo',
                'cell.updateValue() works with updateValue handler');
                
        var expCell1 = t.columns.k.companyName.findCells()[1], // company: null
            expCell2 = t.columns.k.companyName.findCells()[2]; // company: initech

            assert.deepEqual(expCell1.getValueUpdateable(), false);
            assert.deepEqual(expCell2.getValueUpdateable(), true);
            
        var exp1up, exp2up;
        
        expCell1.subscribe('valueUpdateableChange', function(v) { exp1up = v; });
        expCell2.subscribe('valueUpdateableChange', function(v) { exp2up = v; });

        items[0].company = companies.initech;
        items[1].company = null;
        
            assert.deepEqual(exp1up, true, 
                'valueUpdateableChange triggered when expression becomes writable');
            assert.deepEqual(exp2up, false,
                'valueUpdateableChange triggered when expression becomes non-writable');
            
        expCell1.updateValue('SuperInitech');
            
            assert.deepEqual(companies.initech.name, 'SuperInitech',
                'updateValue() changes the object referenced by the expression');
                
        expCell1.setReadOnly(true);
            assert.deepEqual(exp1up, false, 
                'readOnly cell becomes non-updateable');
                
    });

    QUnit.test("Amm.Table.Cell: editing support", function(assert) {
        
        var t = new Amm.Table.Table({
            columns: {
                index: {caption: 'item #', source: "$cell.row.index + 1"},
                recordId: {},
                name: {},
                surname: {},
                age: {},
                fullName: {caption: 'Full Name', source: "this.name + ' ' + this.surname"},
                companyName: {caption: 'Company Name', source: "this.company.name"}
            },
            header: {
                rows: ['Amm.Table.HeaderRow']
            },
        });
        
        window.d.t = t;
        
        t.setSyncActiveCellEditor(null);
        
        var companies = {
            initech: new Amm.Element({props: {name: 'Initech'}}),
            stuffdyne: new Amm.Element({props: {name: 'Stuffdyne'}}),
        };
        
        var items = new Amm.Collection(Amm.constructMany([
            {props: {recordId: 1, name: 'John', surname: 'James', age: 20, company: companies.null}},
            {props: {recordId: 2, name: 'Jane', surname: 'James', age: 25, company: companies.initech}},
            {props: {recordId: 3, name: 'Mike', surname: 'Doe', age: 52, company: companies.stuffdyne}},
            {props: {recordId: 4, name: 'Kate', surname: 'Doe', age: 48, company: companies.initech}},
        ], 'Amm.Element'));
        
        t.setItems(items);
        
            assert.deepEqual(t.rows[0].cells[1].isEditable(), false, 
                'Cell is not editable because it doesn\'t have an editor');
            
        var tableEd = new Amm.Element('<input data-amm-id="tableEd" type="text" data-amm-v="[v.Input, v.Visual]" />');
        var colEd = new Amm.Element('<input data-amm-id="colEd" type="text" data-amm-v="[v.Input, v.Visual]" />');
        var cellEd = new Amm.Element('<input data-amm-id="cellEd" type="text" data-amm-v="[v.Input, v.Visual]" />');
        
        t.setEditor(tableEd);
        
            assert.ok(Amm.getProperty(t.rows[0].cells[1].findEditor(), 'id'), 'tableEd',
                'by default cells have table editor (1)');
            assert.ok(Amm.getProperty(t.rows[1].cells[1].findEditor(), 'id'), 'tableEd',
                'by default cells have table editor (2)');
            assert.ok(Amm.getProperty(t.rows[1].cells[2].findEditor(), 'id'), 'tableEd',
                'by default cells have table editor (3)');
            assert.ok(Amm.getProperty(t.rows[2].cells[2].findEditor(), 'id'), 'tableEd',
                'by default cells have table editor (3)');
        
        t.columns[1].setEditor(colEd);  
        
            assert.ok(Amm.getProperty(t.rows[0].cells[1].findEditor(), 'id'), 'colEd',
                'column editor overrides table editor (1)');
            assert.ok(Amm.getProperty(t.rows[1].cells[1].findEditor(), 'id'), 'colEd',
                'column editor overrides table editor (2)');
            assert.ok(Amm.getProperty(t.rows[1].cells[2].findEditor(), 'id'), 'tableEd',
                'column editor overrides table editor (3)');
            assert.ok(Amm.getProperty(t.rows[2].cells[2].findEditor(), 'id'), 'tableEd',
                'column editor overrides table editor (4)');
        
        t.rows[0].cells[1].setEditor(cellEd);
        
            assert.ok(Amm.getProperty(t.rows[0].cells[1].findEditor(), 'id'), 'cellEd',
                'cell editor overrides column & table editors (1)');
            assert.ok(Amm.getProperty(t.rows[1].cells[1].findEditor(), 'id'), 'colEd',
                'cell editor overrides column & table editors (2)');
            assert.ok(Amm.getProperty(t.rows[1].cells[2].findEditor(), 'id'), 'tableEd',
                'column editor overrides column & table editors (3)');
            assert.ok(Amm.getProperty(t.rows[2].cells[2].findEditor(), 'id'), 'cellEd',
                'cell editor overrides column & table editors (4)');
        
        assert.deepEqual(t.rows[0].cells[0].getValueUpdateable(), false, 
            'Expression cell is still non-updateable');
        
        assert.deepEqual(t.rows[0].cells[0].isEditable(), false, 
            '..isEditable() for non-updateable cell is false');
            
        t.rows[0].cells[0].setEditing(true);
        
            assert.deepEqual(t.rows[0].cells[0].getEditing(), false, 
                'setEditing(true) on non-updateable cell doesn\'t change `editing` property');
            
        // begin to edit cell with indivdual editor
            
        assert.deepEqual(t.rows[0].cells[1].isEditable(), true, 
            '..isEditable() for updateable cell w/editor is true');
            
        t.rows[0].cells[1].setEditing(true);
            
            assert.deepEqual(t.rows[0].cells[1].getEditing(), true, 
                'setEditing(true) on updateable cell');
            
            assert.ok(t.getEditingCells().hasItem(t.rows[0].cells[1]),
                'cell that is editing appears in editingCells collection');

            assert.deepEqual(Amm.getProperty(t.rows[0].cells[1].getActiveEditor(), 'id'), 'cellEd',
                'activeEditor property is set on editing cell');
                
        // begin to edit cell that has other editor
        
        t.rows[1].cells[1].setEditing(true);
            
            assert.deepEqual(t.rows[1].cells[1].getEditing(), true, 
                'setEditing(true) on updateable cell (2)');
            
            assert.deepEqual(t.rows[0].cells[1].getEditing(), true, 
                'other editing cell, but with other editor, remains in editing status');
            
            assert.ok(t.getEditingCells().hasItem(t.rows[1].cells[1]),
                'cell that is editing appears in editingCells collection (2)');
            
            assert.ok(t.getEditingCells().hasItem(t.rows[0].cells[1]),
                'since both cells are editing, both cells are in editingCells collection');

            assert.deepEqual(Amm.getProperty(t.rows[1].cells[1].getActiveEditor(), 'id'), 'colEd',
                'activeEditor property is set on editing cell, it is column-shared editor');
                
                
        t.getEditingCells().reject(t.rows[1].cells[1]);
            
            assert.deepEqual(t.rows[1].cells[1].getEditing(), false, 
                'removing cell from editingCells collection removes edit state');
                
        t.getEditingCells().accept(t.rows[1].cells[1]);
            
            assert.deepEqual(t.rows[1].cells[1].getEditing(), true, 
                'adding cell to editingCells collection enables edit state');
                
        // begin to edit cell that has other editor
        
        t.rows[1].cells[2].setEditing(true);
            
            assert.deepEqual(t.rows[1].cells[2].getEditing(), true, 
                'setEditing(true) on updateable cell (3)');
            
            assert.deepEqual(t.rows[0].cells[1].getEditing(), true, 
                'other editing cell, but with other editor, remains in editing status (2)');
            
            assert.deepEqual(t.rows[1].cells[1].getEditing(), true, 
                'other editing cell, but with other editor, remains in editing status (3)');
            
            assert.ok(t.getEditingCells().hasItem(t.rows[0].cells[1]),
                'cell that are editing appear in editingCells collection (1)');
            
            assert.ok(t.getEditingCells().hasItem(t.rows[1].cells[2]),
                'cells that are editing appear in editingCells collection (2)');
            
            assert.ok(t.getEditingCells().hasItem(t.rows[1].cells[1]),
                'cells that are editing appear in editingCells collection (3)');
            
            assert.deepEqual(Amm.getProperty(t.rows[1].cells[2].getActiveEditor(), 'id'), 'tableEd',
                'activeEditor property is set on editing cell, it is table-shared editor');
      
                
        // begin to edit cell that has other editor
        
        t.rows[2].cells[1].setEditing(true);
            
            assert.deepEqual(Amm.getProperty(t.rows[2].cells[1].getActiveEditor(), 'id'), 'colEd',
                'activeEditor property is set on editing cell, it is column-shared editor');
            
            assert.deepEqual(t.rows[1].cells[1].getEditing(), false, 
                'starting edit with column-shared editor ends editing of other cell in same column');
            
            assert.notOk(t.getEditingCells().hasItem(t.rows[1].cells[1]),
                'cell that is not edited anymore disappears from editingCells collection');
                
        
        // now test editing
        
        t.rows[1].cells[2].setEditing(true);
        
            assert.deepEqual(t.rows[1].cells[2].getValue(), tableEd.getValue(),
                'Editor contains cell value');
                
        tableEd.setValue('Janette');
        
        t.rows[1].cells[2].confirmEdit();
            
            assert.deepEqual(items[1].name, 'Janette',
                'confirmEdit() saves editor value to the record');
            
            assert.deepEqual(t.rows[1].cells[2].getEditing(), false,
                'confirmEdit() removes editing state');
        
        Amm.cleanup(t, tableEd, colEd, cellEd);
        
      
    });
    

    QUnit.test("Amm.Table.Cell: syncActiveCellEditor property", function(assert) {
        
        var t = new Amm.Table.Table({
            columns: {
                index: {caption: 'item #', source: "$cell.row.index + 1"},
                recordId: {},
                name: {},
                surname: {},
                age: {},
                fullName: {caption: 'Full Name', source: "this.name + ' ' + this.surname"},
                companyName: {caption: 'Company Name', source: "this.company.name"}
            },
            header: {
                rows: ['Amm.Table.HeaderRow']
            },
        });
        
        window.d.t = t;
        
        var companies = {
            initech: new Amm.Element({props: {name: 'Initech'}}),
            stuffdyne: new Amm.Element({props: {name: 'Stuffdyne'}}),
        };
        
        var items = new Amm.Collection(Amm.constructMany([
            {props: {recordId: 1, name: 'John', surname: 'James', age: 20, company: companies.null}},
            {props: {recordId: 2, name: 'Jane', surname: 'James', age: 25, company: companies.initech}},
            {props: {recordId: 3, name: 'Mike', surname: 'Doe', age: 52, company: companies.stuffdyne}},
            {props: {recordId: 4, name: 'Kate', surname: 'Doe', age: 48, company: companies.initech}},
        ], 'Amm.Element'));
        
        t.setItems(items);
        
        var tableEd = new Amm.Element('<input data-amm-id="tableEd" type="text" data-amm-v="[v.Input, v.Visual]" />');
        
        t.setSyncActiveCellEditor(
            Amm.Table.Table.EDITOR_ACTIVATES_CELL 
            | Amm.Table.Table.DEACTIVATION_CONFIRMS_EDITOR
            | Amm.Table.Table.EDITOR_FOLLOWS_ACTIVE,
        );
        
        t.setEditor(tableEd);
        
        t.rows[1].cells[1].setEditing(true);
        
            assert.deepEqual(t.rows[1].cells[1].getEditing(), true, 'Cell, once editing...');
        
            assert.deepEqual(t.rows[1].cells[1].getActive(), true, '...becomes active');
            
        t.rows[1].cells[2].setActive(true);
        
            assert.deepEqual(t.rows[1].cells[1].getEditing(), false,
                'Other cell becomes active - old cell stops being edited');
        
            assert.deepEqual(t.rows[1].cells[2].getEditing(), true,
                'Newcell becomes active & starts being edited');
                
        t.rows[1].cells[2].getActiveEditor().setValue('Jamesy');
        
        t.rows[1].cells[2].setActive(false);
        
            assert.deepEqual(t.rows[1].cells[2].getEditing(), false,
                'Deactivation of the cell ended it\'s editing');
        
            assert.deepEqual(t.rows[1].cells[2].getValue(), 'Jamesy',
                'Deactivation confirmed editing changes');
        
            
            
        
    });
    
    
    
}) ();