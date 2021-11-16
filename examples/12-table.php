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
        
        window.updateFirstLastName = function(value, editor, ret, cell) {
            var item = cell.getItem();
            if (!item) return;
            var nv = value.split(/\s+/);
            item.firstName = nv.shift();
            item.lastName = nv.join(' ');
            ret.done = true;
        };
        
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
        
        window.tableViewReady = function(view) {
            if (!view['Amm.View.Html.Visual']) return;
            var he = view.getHtmlElement();
            he.setAttribute('tabindex', '0');
            var table = this;
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
                data-amm-e=""
                data-amm-v="[v.Input, v.Visual]" 
            />
        </div>
        <div class="w">
        <div data-amm-e="{
                class: Amm.Table.Table,
                className: 'data nohover',
                id: tbl,
                extraTraits: 'Amm.Trait.Table.SimpleKeyboardControl',
                extraViews: 'v.Table.SimpleKeyboardControl',
                on__viewReady: {$ext: tableViewReady},
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
