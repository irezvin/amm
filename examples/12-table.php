<?php
    $title = "Table";
    $skipExampleCss = true;
    require(__DIR__.'/top.inc.php');
?> 
    <link rel="stylesheet" type="text/css" href="tbl2.css" />
    <script type='text/javascript'>
        
        getDefaultItems = function() {
            return [
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    points: 10,
                },
                {
                    firstName: 'Jane',
                    lastName: 'James',
                    points: 12,
                },
                {
                    firstName: 'Jim',
                    lastName: 'Bloggs',
                    points: 21,
                },
                {
                    firstName: 'Samantha',
                    lastName: 'Moo',
                    points: 11,
                },
                {
                    firstName: 'Justin',
                    lastName: 'Monk',
                    points: 7,
                },
                {
                    firstName: 'Richard',
                    lastName: 'Goo',
                    points: 3,
                }
            ];
        };
        
        window.items = getDefaultItems();
        
        window.saveItems = function() {
            var mms = Amm.getProperty(Amm.r.e.tbl.items.getItems(), 'mm');
            localStorage.items = JSON.stringify(Amm.getProperty(mms, 'data'));
        };
        
        window.restoreItems = function() {
            if (localStorage.items) {
                var items = JSON.parse(localStorage.items);
                if (items instanceof Array) {
                    if (!items.length) items = [{}];
                    window.items = items;
                }
            }
        };
        
        window.editorBlur = function(event) {
            var e = Amm.findElement(event.srcElement);
            if (!e || !Amm.is(e, 'Amm.Element')) return;
            var dp = e.getDisplayParent();
            if (!dp['Amm.Table.Cell']) return;
            dp.setEditing(false);
        };
        window.editorKeyDown = function(event) {
            //console.log('down', Amm.getProperty(event, ['keyCode', 'charCode', 'shiftKey', 'ctrlKey', 'altKey']));
            var sameColumn = false, reverse = false, add = false, del = false;
            var callback = function (cell, sourceCell) {
                return cell.isEditable() && (!sameColumn || cell.getColumn() === sourceCell.getColumn());
            };
            if (event.keyCode === 46 && event.ctrlKey) {
                del = true;
                sameColumn = true;
            } else if (event.keyCode === 9) {
                // tab/shift-tab: left/right
                reverse = event.shiftKey;
            } else if (event.keyCode === 37 && event.altKey) {
                // prevent accidental browser back button
                event.preventDefault();
                event.stopPropagation();
                // left
                reverse = true;
            } else if (event.keyCode === 39 && event.altKey) {
                // prevent accidental browser forward button
                event.preventDefault();
                event.stopPropagation();
                // right
            } else if (event.keyCode === 38 && event.altKey) {
                sameColumn = true; // up
                reverse = true;
            } else if (event.keyCode === 40 && event.altKey) {
                sameColumn = true; // down
            } else {
                return;
            }
            if (!del) add = !reverse;
            var editor = Amm.findElement(event.srcElement);
            if (!editor || !Amm.is(editor, 'Amm.Element')) return;
            var cell = editor.getDisplayParent();
            if (!cell['Amm.Table.Cell']) return;
            cell.updateValue();
            var adj = cell.findAdjacentCell(reverse, callback);
            var item = cell.getItem();
            var nextItem = adj? adj.getItem() : null;
            if (adj) cell.setEditing(false);
            if (item !== nextItem || !adj) {
                if (sameColumn && (!item || !Amm.values(item.mm.getData()).join(""))) {
                    if (add) add = false;
                    else del = true;
                }
            }
            if (!adj) {
                if (del) adj = cell.findAdjacentCell(!reverse, callback);
                if (add) {
                    cell.getTable().items.accept({});
                    adj = cell.findAdjacentCell(reverse, callback);
                }
            }
            if (del && item) {
                cell.setEditing(false);
                cell.getTable().items.reject(item);
            }
            if (adj) {
                if (!adj.setEditing(true)) return;
                event.preventDefault();
                event.stopPropagation();
                window.setTimeout(() => {
                    if (!adj.getActiveEditor()) return;
                    adj.getActiveEditor().focus();
                    var he = adj.getActiveEditor().getUniqueSubscribers('Amm.View.Abstract.Input')[0].getHtmlElement();
                    jQuery(he).focus();
                }, 1);
            }
        };
        window.editorKeyPress = function(event) {
            //console.log('press', event.keyCode, event.charCode, event.shiftKey);
        };
        window.editorKeyUp = function(event) {
            //console.log(event.keyCode, event.charCode, event.shiftKey);
            if (!(event.keyCode === 13 || event.keyCode === 27)) return;
            var e = Amm.findElement(event.target);
            if (!e || !Amm.is(e, 'Amm.Element')) return;
            var dp = e.getDisplayParent();
            if (!dp['Amm.Table.Cell']) return;
            event.target.blur();
        };
        window.updateFirstLastName = function(value, editor, ret, cell) {
            var item = cell.getItem();
            if (!item) return;
            var nv = value.split(/\s+/);
            item.firstName = nv.shift();
            item.lastName = nv.join(' ');
            ret.done = true;
        };

        window.tableCurrentEditingCellChange = function(cell) {
            //console.log(Amm.event.name, cell);
        };

        window.tableViewReady = function(view) {
            if (!view['Amm.View.Html.Visual']) return;
            var he = view.getHtmlElement();
            he.setAttribute('tabindex', '0');
            var table = this;
            jQuery(he).on('keydown', function(event) {
                //console.log(event.keyCode, event.charCode);
                var rowNav = false, reverse = false, add = false, del = false;
                if (!table.activeCell) return; // no active cell - cannot navigate
                if (event.keyCode === 113) {
                    var ed = !table.activeCell.getEditing();
                    //table.activeCell.setEditing(ed);
                    if (ed && table.activeCell.getEditing()) {
                        window.setTimeout(function() {
                            var he = table.activeCell.getActiveEditor().getUniqueSubscribers('Amm.View.Abstract.Input')[0].getHtmlElement();
                            jQuery(he).focus();
                        }, 5);
                    }
                    if (!ed) {
                        he.focus();
                    }
                    return;
                }
                if (table.activeCell && table.activeCell.getEditing()) return; // we're in the editor
                if (event.keyCode === 46 && event.ctrlKey) { // ctrl-del
                    del = true;
                    rowNav = true;
                } else if (event.keyCode === 37) {
                    // left
                    reverse = true;
                } else if (event.keyCode === 39) {
                    // right
                } else if (event.keyCode === 38) {
                    rowNav = true; // up
                    reverse = true;
                } else if (event.keyCode === 40) {
                    rowNav = true; // down
                } else {
                    return;
                }
                if (!del) add = !reverse;
                var cell = table.activeCell, row = table.activeRow, column = table.activeColumn,
                    nextRow, nextCell;
                if (rowNav) {
                    nextRow = row.findAdjacentRow(reverse);
                } else {
                    nextCell = cell.findAdjacentCell(reverse);
                }
                var item = cell.getItem();
                var nextItem = nextCell? nextCell.getItem() : null;
                if (item !== nextItem || !nextCell) {
                    if (rowNav && (!item || !Amm.values(item.mm.getData()).join(""))) {
                        if (add) add = false;
                        else del = true;
                    }
                }
                if (nextRow) {
                    nextRow.setActive();
                    nextCell = table.activeCell;
                }
                if (!nextCell) {
                    if (del) nextRow = row.findAdjacentRow(!reverse) || row.findAdjacentRow(reverse);
                    if (add) {
                        cell.getTable().items.accept({});
                        nextRow = row.findAdjacentRow(reverse);
                    }
                }
                if (del && item) {
                    cell.getTable().items.reject(item);
                }
                if (nextRow) nextRow.setActive();
                else if (nextCell) nextCell.setActive();
            });
        };
        
        restoreItems();
        
        Amm.getRoot().subscribe('bootstrap', function() {
            window.tbl = Amm.r.e.tbl;
        });
        
    </script>
    </head>
    <body>
        <h1>Table example</h1>
        <div id="lib" style="display: none" data-amm-dont-build="">
            <input
                class="ed-proto"
                type="text" size="1"
                data-amm-id="xx"
                data-amm-e=""
                onblur="//window.editorBlur(event);"
                onkeyup="window.editorKeyUp(event);"
                onkeypress="window.editorKeyPress(event);"
                onkeydown="window.editorKeyDown(event);"
                data-amm-v="[v.Input, v.Visual]" 
            />
        </div>
        <div class="w" onclick="
            var e = Amm.findElement(event.target);
            if (e && e['Amm.Table.Cell']) {
                if (!e.getActive()) {
                    e.setActive(true);
                    return;
                }
                e.setEditing(!e.getEditing());
                if (event.altKey) return;
                var ed = e.getActiveEditor();
                if (ed && ed.focus) {
                    ed.focus();
                }
            }
        ">
        <div data-amm-e="{
                class: Amm.Table.Table,
                className: 'data nohover',
                id: tbl,
                on__viewReady: {$ext: tableViewReady},
                on__currentEditingCellChange: {$ext: tableCurrentEditingCellChange},
                editor: {
                    builderSource: {$ref: '#lib .ed-proto', global: true, clone: true}
                },
                columns: {
                    idx: {
                        caption: '#', 
                        source: '\'r\' + $cell.component.displayOrder + 1', 
                        class: 'Amm.Table.RowHeaderColumn'
                    },
                    firstName: {
                        caption: 'First Name', 
                    },
                    lastName: {caption: 'Last Name'},
                    fullName: {
                        caption: 'Full Name', 
                        cellClassName: 'light', 
                        source: 'this.firstName + (this.firstName && this.lastName? \' \' : \'\') + this.lastName',
                        cellProto: {
                            on__updateValue: {$ext: updateFirstLastName}
                        }
                    },
                    points: {caption: 'Points', cellProto: {
                        in__className__hl0: 'this.item.points < 5',
                        in__className__hl1: 'this.item.points >= 10',
                        in__className__hl2: 'this.item.points >= 20'
                    }},
                },
                
                rowProto: {
                    in__className__hl: 'this.item.points > 10'
                },
                
                header: {
                    rows: {
                        head: 'Amm.Table.HeaderRow'
                    }
                },
                
                items: {
                    class: 'Amm.Data.Collection',
                    instantiateOnAccept: true,
                    instantiator: {
                        __construct: 'Amm.Instantiator.Proto',
                        proto: {
                            class: 'Amm.Data.Model',
                            firstName: '',
                            lastName: '',
                            points: ''
                        },
                        overrideProto: true
                    },
                    on__anyChange: {$ext: saveItems},
                    items: {$ext: items}
                }
            }"
        >
        </div>
        </div>
    </body>
</html>
