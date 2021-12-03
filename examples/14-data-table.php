<?php
    $title = "Table With Data Editing";
    $skipExampleCss = true;
    require(__DIR__.'/top.inc.php');
?> 
    <link rel="stylesheet" type="text/css" href="tbl2.css" />
    
    <style type="text/css">
        
        button { padding: .25em 1em; margin: .25em; font-size: 1.1em }
        
        tr.new td {
            border-color: lightgreen;
        }
        
        tr.deleteIntent td {
            text-decoration: line-through;
        }
        
        tr.deleted td {
            text-decoration: line-through;
            text-decoration-style: double; 
            text-decoration-color: red; 
       }
        
        tr.modified td, tr.modified th {
            color: gold;
        }
        
        tr.errors td, tr.errors th {
            border-color: red;
            background-color: #300;
        }
        
        .w {
            text-align: center;
        }

        #tbl {
            display: inline-block;
            padding: .25em;
        }

        #tbl:focus-within {
            border: 1px solid orangered;
            padding: calc(.25em - 1px);
        }    
        
        a {color: lightblue}
        
        nav.paginator {
            text-align: center;
            margin-bottom: 1.2em;
        }
        
        ul.pagination, ul.pagination li {
            display: inline-block;
            text-align: center;
        }
        
        ul.pagination {
            padding: 0;
        }
        
        ul.pagination a {
            text-decoration: none;
            display: inline-block;
            margin: 0 .125em;
            padding: .5em .5em;
        }
        
        ul.pagination a.page-link-kind-regular, ul.pagination a.page-link-kind-active {
            border: 1px solid silver;
        }
        
        ul.pagination a.page-link-kind-regular, ul.pagination a.page-link-kind-active, 
        ul.pagination a.page-link-kind-ellipsis {
            width: 3em;
            padding: .5em 0;
        }
        
        ul.pagination a.page-link-kind-active {
            background-color: #333;
        }
        
        ul.pagination a.page-link-kind-ellipsis {
            margin: 0 calc(.125em + 2px);
        }
        
        ul.pagination a.page-link-disabled {
            color: darkgray;
        }
        
    </style>
    
    <script type='text/javascript' src='../tests/mockData.js'></script>
    <script type='text/javascript' src='../tests/TestUtils.js'></script>
    <script type='text/javascript' src='../tests/MemStor.js'></script>
    <script type='text/javascript'>
        
        window.t0 = (new Date()).getTime()/1000;
        
        window.save = function() {
            tbl.items.save();
            jQuery('#tbl table').focus();
        };
        
        window.revert = function() {
            tbl.items.revert(true);
            jQuery('#tbl table').focus();
        };
        
        window.asyncNextPage = function(prev) {
            tbl.fetcher.getRequestProducer().setUri(
                tbl.fetcher.getRequestProducer().getUri('offset')*1
                + tbl.fetcher.getRequestProducer().getUri('limit')*(prev? -1 : 1),
            'offset');
        };

        window.nextPage = function(prev) {
            window.foo = window.foo || tbl.items.length; 
            tbl.items.setItems(mockAddresses.slice(window.foo, window.foo + (prev?  -1 : 1)*tbl.items.length));
            window.foo += tbl.items.length;
        };
        
        window.randomize = function() {
            tbl.items.sort(function() { return Math.random() * 10 - 5; });
        };
        
        getDefaultItems = function() {
            return window.mockAddresses.slice();
        };
        
        window.updateUri = function(rev) {
            if (!window.tbl) return;
            var uri = location.hash? location.hash.replace(/^#/, '') : '';
            var tbl = window.tbl;
            if (uri && !rev) tbl.fetcher.getRequestProducer().setUri(uri);
            else location.hash = '#' + tbl.fetcher.getRequestProducer().getUri();
        },
                
        window.addEventListener('hashchange', function() {
            window.updateUri();
        });
        
        window.nullify = function(ret) { if (ret.value === '') ret.value = null; };
        
        window.addressMeta = {
            id: {},
            guid: {},
            isActive: {
                def: false,
                required: true
            },
            balance: {
                set: function(ret) { 
                    if (ret.value === '') {
                        ret.value = null; 
                        return;
                    }
                    var value = parseFloat(ret.value);
                    if (!isNaN(value)) ret.value = value;
                },
            },
            age: {
                set: nullify,
            },
            eyeColor: {
                set: nullify,
            },
            name: {
                required: true,
                set: nullify,
            },
            gender: {
                set: nullify,
            },
            company: {
                set: nullify,
            },
            email: {
                validators: [
                    'Amm.Validator.Email'
                ],
                set: nullify,
            },
            phone: {
                set: nullify,
            },
            address: {
                set: nullify,
            },
            about: {
                set: nullify,
            },
            registered: {
                set: nullify,
            },
            latitude: {
                set: nullify,
            },
            longtitude: {
                set: nullify,
            },
            favoriteFruit: {
                set: nullify,
            },
        };
        
        window.addressStor = new MemStor({
            metaProps: addressMeta,
            uniqueIndexes: ['email', 'phone', 'guid'],
            def: getDefaultItems,
            localStorageKey: 'dataTableAddresses',
            primaryKey: 'id',
            autoInc: true,
            load: true,
            autoSave: true,
        });
        
        Amm.getRoot().subscribe('bootstrap', function() {
            
            var tbl, setItems;
            
            var tableJson = {
                component: Amm.getRoot(),
                class: Amm.Table.Table,
                className: 'data nohover',
                extraTraits: 'Amm.Trait.Table.SimpleKeyboardControl',
                extraViews: [
                    {
                        class: Amm.View.Html.Table.SimpleKeyboardControl,
                        htmlElement: '#tbl'
                    }
                ],
                id: 'tbl',
                editor: {
                    builderSource: new Amm.Builder.Ref({$ref: '#lib .ed-proto', global: true, clone: true})
                },
                columns: {
                    rowHeader: {
                        class: 'Amm.Table.RowHeaderColumn',
                        source: '$cell.row.index + $cell.table.fetcher.requestProducer.uri::offset*1 + 1',
                    },
                    id: {
                        source: 'id'
                    },
                    name: {
                    },
                    gender: {
                    },
                    balance: {
                    },
                    age: {
                    },
                    company: {
                        decorator: function(value) {
                            if (!value) return value;
                            return Amm.dom({
                                $: 'a',
                                href: '//' + value.toLowerCase() + '.com',
                                target: '_blank',
                                _text: value
                            });
                        }
                    },
                    email: {
                        decorator: function(value) {
                            if (!value) return value;
                            return Amm.dom({
                                $: 'a',
                                href: 'mailto:' + value,
                                _text: value
                            });
                        }
                    },
                    phone: {
                    },
                },

                header: {
                    rows: {
                        head: 'Amm.Table.HeaderRow'
                    }
                },
                
                rowProto: {
                    in__className: 'this.item.mm.state + (this.item.mm.modified? " modified" : "") + (this.item.mm.errors? " errors" : "")',
                },

                items: new Amm.Data.Collection({
                    rejectOnDelete: true,
                    preserveUncommitted: true,
                    hydrateMode: Amm.Data.HYDRATE_MERGE,
                    instantiateOnAccept: true,
                    keyProperty: 'id',
                    instantiator: new Amm.Data.Mapper({
                        transactionPrototypes: {
                            default: {
                                'class': 'Amm.Data.HttpTransaction',
                                uri: '/',
                                typePath: '',
                                keyPath: 'key',
                                transport: addressStor.createDebugTransport(),
                                responseDataPath: 'record',
                            },
                        },
                        meta: Amm.override({}, window.addressMeta),
                    }),
                }),
                
                on__checkIsItemBlank: function(item, ret) {
                    if (!item['Amm.Data.Record']) return;
                    ret.result = item.mm.getState() === "new" && !item.mm.getModified();
                },
                
                on__deleteItem: function(item, wasBlank, ret) {
                    if (item.mm.getState() === "exists") {
                        item.mm.intentDelete();
                        ret.handled = true;
                    }
                },
                
                prop__fetcher: new Amm.Remote.Fetcher({
                    requestProducer: new Amm.Remote.RequestProducer({
                        on__uriChange: function(uri) {
                            updateUri(true);
                        },
                        uri: '/list?offset=0&limit=10',
                    }),
                    transport: addressStor.createDebugTransport(),
                    on__responseChange: function(response) {
                        console.log('Got response', response);
                        setItems(response && response.records? response.records : []);
                    },
                    auto: Amm.Remote.Fetcher.AUTO_BOOTSTRAP
                }),
                
            };
            
            setItems = function(items) {
                console.log('Set items', items);
                tbl.items.setItems(items);
            };
        
            var t1 = (new Date()).getTime()/1000;
            console.log('init:', TestUtils.round(t1 - window.t0));
            tbl = new Amm.Table.Table(tableJson);
            window.tStart = window.t0;
            window.t0 = t1;
            window.tbl = tbl;
            updateUri();
            var u = new Amm.Remote.Uri('' + location), num = u.getUri('num');
            if (num) num = parseInt(num);
            console.log('num is', num);
            if (typeof num === "number" && !isNaN(num)) {
                window.items = getDefaultItems().slice(0, num);
                window.tbl.items.setItems(window.items);
                t1 = (new Date()).getTime()/1000;
                var numCells = (tbl.columns.length*(tbl.items.length + 1));
                console.log('set Items:', TestUtils.round(t1 - window.t0), 's;', TestUtils.round((t1 - window.t0) * 1000 / numCells), 'ms/cell');
                t0 = t1;
                var v = new Amm.View.Html.Default({replaceOwnHtmlElement: false, element: tbl, htmlElement: jQuery('#tbl')});
                t1 = (new Date()).getTime()/1000;
                console.log('rendered', numCells, 'cells @', TestUtils.round(t1 - window.t0),
                    's; render speed:', 
                    TestUtils.round((t1 - window.t0) * 1000 / numCells),
                    'ms/cell');
                console.log('total', TestUtils.round(t1 - window.tStart), 's');
            } else {
                var v = new Amm.View.Html.Default({replaceOwnHtmlElement: false, element: tbl, htmlElement: jQuery('#tbl')});
            }
        });
        
    </script>
    </head>
    <body data-amm-build="">
        <h1>Data table example</h1>
        <div id="lib" style="display: none" data-amm-dont-build="">
            <input
                class="ed-proto"
                type="text" size="1"
                data-amm-e=""
                data-amm-v="[v.Input, v.Visual]" 
            />
        </div>
        <div style="text-align: center">
            <button accesskey="S" onclick="save();"><u>S</u>ave</button>
            <button accesskey="R" onclick="revert();"><u>R</u>evert</button>
        </div>
        <nav class="paginator" data-amm-e="{
             class: ui.Paginator,
             id: paginator,
             prop__foo: null,
             in__numRecords: 'tbl.fetcher.response.lastFoundRows || 0',
             in__recordsPerPage: 'tbl.fetcher.requestProducer.uri::limit || 10',
             offset: null,
             sync__offset: 'tbl.fetcher.requestProducer.uri::offset',
        }" data-amm-v="{class: v.Paginator}">
        </nav>
            
        <div class="w"> 
            <div id="tbl"></div>
        </div>
    </body>
</html>