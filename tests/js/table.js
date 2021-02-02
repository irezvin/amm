/* global Amm */
/* global QUnit */

(function() {

    QUnit.module("Table");

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
        propName = propName || 'value';
        var res = [];
        for (var i = 0; i < rows.length; i++) {
            var row = Amm.getProperty(rows[i].cells.getItems(), propName);
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
        var t = new Amm.Table({
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
            {properties: {recordId: 1, name: 'John', surname: 'James', age: 20}},
            {properties: {recordId: 2, name: 'Jane', surname: 'James', age: 25}},
            {properties: {recordId: 3, name: 'Mike', surname: 'Doe', age: 52}},
            {properties: {recordId: 4, name: 'Kate', surname: 'Doe', age: 48}},
        ], 'Amm.Element'));
        
        assert.equal(Amm.getClass(t.getColumns('recordId')), 'Amm.Table.ObservingColumn');
        
        t.setItems(items);
        
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
                    
                    '         |          |          | colClass   |      |         |      ',
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
    
}) ();