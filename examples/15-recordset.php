<?php
    $title = "Recordset";
    $skipExampleCss = true;
    require(__DIR__.'/top.inc.php');
?> 
    <link rel="stylesheet" type="text/css" href="tbl2.css" />
    
    <style type="text/css">
        
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
        
        body {
           max-width: 600px;
           margin-left: auto;
           margin-right: auto;
        }
        
        .records .item {
            margin: .25em 0;
            padding: .25em;
            border: 1px solid silver;
        }
        
        .records .item.current {
            border: 1px solid gold;
            background-color: #333;
        }
        
        .records .item label {
            display: inline-block;
            padding: .25em;
            margin: .25em;
        }
        
        .records .header {
            border-bottom: 1px solid #333;
            padding: .25em;
            margin: .25em;
        }
        
        .records .item.current .header {
            border-bottom-color: black;
        }
        
        
        .a_required {
            display: inline;
        }
        
        .a_descritption:empty {
            display: none;
        }
        
        .labelRequired {
            display: inline-block;
            width: 75px;
        }

        .records input[type=text] {
            width: 180px;
        }        
        
        .records .a_error ul {
            list-style: none;
            padding: 0;
            margin-bottom: 0;
            font-size: .7em;
            color: pink;
        }        
        
        label.error input[type=text] {
            border: 1px solid red;
            color: red;
        }

        label.error span.labelRequired {
            color: pink;
        }        
        
        .item > label {
            vertical-align: top;
            max-width: 47%;
        }        
        
        label .a_description {
            display: none;
            font-size: .7em;
            margin-top: .5em;
            color: darkgray;
        }
        
        label .a_description strong {
            white-space: nowrap;
        }

        label:focus-within .a_description {
            display: inline-block;
        }        
        
        .buttons {
            text-align: center;
            margin: .5em 0;
        }

        .buttons button {
            background: none;
            border: 1px solid silver;
            padding: .5em .7em;
            color: lightblue;
        }

        .buttons button:disabled {
            color: #444;
            border-color: #333;
        }
        
        .recordNo {white-space: nowrap}
        
        .recordNo input[type=text] {
            width: 30px
        }
        
        div.item, button, input[type=text], li a {
            border-radius: 5px
        }
        
    </style>
    
    <script type='text/javascript' src='../tests/mockData.js'></script>
    <script type='text/javascript' src='../tests/TestUtils.js'></script>
    <script type='text/javascript' src='../tests/MemStor.js'></script>
    <script type='text/javascript'>
        
        getDefaultItems = function() {
            return window.mockAddresses.slice();
        };
        
        window.updateUri = function(rev) {
//            if (!window.tbl) return;
//            var uri = location.hash? location.hash.replace(/^#/, '') : '';
//            var tbl = window.tbl;
//            if (uri && !rev) tbl.fetcher.getRequestProducer().setUri(uri);
//            else location.hash = '#' + tbl.fetcher.getRequestProducer().getUri();
        },
                
        window.addEventListener('hashchange', function() {
//            window.updateUri();
        });
        
        window.nullify = function(ret) { if (ret.value === '') ret.value = null; };
        
        window.addressMeta = {
            id: {},
            guid: {},
            isActive: {
                label: "Active",
                def: false,
                required: true
            },
            balance: {
                label: "Balance",
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
                label: "Age",
                set: nullify,
            },
            eyeColor: {
                label: "Eye Color",
                set: nullify,
            },
            name: {
                label: "Name",
                required: true,
                set: nullify,
            },
            gender: {
                label: "Gender",
                set: nullify,
            },
            company: {
                label: "Company",
                set: nullify,
            },
            email: {
                label: "E-mail",
                validators: [
                    'Amm.Validator.Email'
                ],
                set: nullify,
            },
            phone: {
                label: "Phone",
                description: "International phone number, i.e. <strong>+1 (123) 456-7890</strong>",
                set: nullify,
            },
            address: {
                label: "Address",
                set: nullify,
            },
            about: {
                label: "About",
                set: nullify,
            },
            registered: {
                label: "Registered",
                set: nullify,
            },
            latitude: {
                label: "Latitude",
                set: nullify,
            },
            longtitude: {
                label: "Longtitude",
                set: nullify,
            },
            favoriteFruit: {
                label: "Favorite Fruit",
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
            defaultReplyTime: 500,
        });
        
        (new Amm.Data.Mapper(window.addressStor.getMapperPrototype())).setId('addressMapper');
        
        Amm.getRoot().subscribe('bootstrap', function() {
            
        });
        
    </script>
    </head>
    <body data-amm-build="">
        <h1>Recordset example</h1>
        <div id="rs" data-amm-id="rs" data-amm-e="{
             prop__recordset: {
                __construct: 'Amm.Data.Recordset',
                deleteImmediately: true,
                multiTransactionOptions: {
                    maxRunning: 1
                },
                limit: 3,
                mapper: {
                    __construct: 'Amm.Data.Mapper',
                    id: 'addressMapper'
                },
                initialFetch: true
             }
        }" data-amm-v="[v.Visual, v.StaticDisplayParent]">
        </div>
        <nav class="paginator" data-amm-e="{
             class: ui.Paginator,
             id: paginator,
             in__numRecords: 'rs.recordset.totalRecords',
             in__recordsPerPage: 'rs.recordset.limit',
             sync__offset: 'rs.recordset.offset',
        }" data-amm-v="{class: v.Paginator}">
        </nav>
        <div id="buttonProto" style="display: none;">
            <button
                data-amm-dont-build=""
                data-amm-e="{
                    prop__enabledProp: 'canNavigate',
                    prop__caption: 'button',
                    prop__onclick: '',
                }"
                data-amm-v="[
                    v.Visual, 
                    {
                        class: v.Expressions,
                        map: {
                            disabled: 'rs.recordset[this.enabledProp]? null : \'disabled\'',
                            onclick: onclick,
                            _html: caption
                        }
                    }
                ]"
            ></button>
            <div class="buttons" 
                data-amm-dont-build=""
                data-amm-e="{}" 
                data-amm-v="[
                    v.Visual, 
                    {class: v.StaticDisplayParent, buildItems: true}
                ]"
            >
                <div data-amm-e="{
                     builderSource: '#buttonProto > button',
                     caption: '&lt;&lt;',
                     enabledProp: canBackPage,
                     onclick: 'Amm.r.e.rs.recordset.back(true);',
                }"></div>
                <div data-amm-e="{
                     builderSource: '#buttonProto > button',
                     caption: '&lt;',
                     enabledProp: canBack,
                     onclick: 'Amm.r.e.rs.recordset.back();',
                }"></div>

                <label class="recordNo"
                    data-amm-id="currentRecord"
                    data-amm-e="{
                        sync__value: {
                            src: rs.recordset.absoluteIndex,
                            translator: {
                                class: Amm.Translator.Delta,
                                delta: -1
                            }
                        }
                    }"
                    data-amm-v="[
                        v.Visual, 
                        {
                            class: v.Expressions,
                            map: {
                                'span:::_html': 'rs.recordset.totalRecordsIncludingNew'
                            }
                        }
                    ]"
                >
                    # 
                    <input 
                        type="text" 
                        data-amm-v="[v.Input]"
                    />
                    of <span></span>
                </label>

                <div data-amm-e="{
                     builderSource: '#buttonProto > button', 
                     caption: '&gt;',
                     enabledProp: canForward,
                     onclick: 'Amm.r.e.rs.recordset.forward();',
                }"></div>
                <div data-amm-e="{
                     builderSource: '#buttonProto > button', 
                     caption: '&gt;&gt;',
                     enabledProp: canForwardPage,
                     onclick: 'Amm.r.e.rs.recordset.forward(true);',
                }"></div>
                <div data-amm-e="{
                     builderSource: '#buttonProto > button', 
                     caption: 'New',
                     enabledProp: canAdd,
                     onclick: 'Amm.r.e.rs.recordset.add();',
                }"></div>
                <div data-amm-e="{
                     builderSource: '#buttonProto > button', 
                     caption: 'Save',
                     enabledProp: canSaveOrRevert,
                     onclick: 'Amm.r.e.rs.recordset.save();',
                }"></div>
                <div data-amm-e="{
                     builderSource: '#buttonProto > button', 
                     caption: 'Revert',
                     enabledProp: canSaveOrRevert,
                     onclick: 'Amm.r.e.rs.recordset.revert();',
                }"></div>
                <div data-amm-e="{
                     builderSource: '#buttonProto > button', 
                     caption: 'Delete',
                     enabledProp: canDelete,
                     onclick: 'Amm.r.e.rs.recordset.deleteCurrent();',
                }"></div>
            </div>
        </div>
        
        <div data-amm-e="{
             builderSource: '#buttonProto > .buttons',
        }"></div>
        
        <div data-amm-e="{
        }" data-amm-v="[v.Visual, {
            class: Amm.View.Html.Expressions,
            map: {
                'span.transactionState:::_html': 'rs.recordset.transaction.state || \'idle\'',
                'span.navigationLocked:::_html': 'rs.recordset.navigationLocked || 0',
            }
        }]">
            <span class="transactionState"></span>
            <span class="navigationLocked"></span>
        </div>
        <div 
            class="records"
            data-amm-id="records"
            data-amm-e="{
                extraTraits: [t.Repeater, t.DisplayParent],
                reuseInstances: true,
                assocProperty: dataObject, 
                withVariantsView: false,
                in__items: 'rs.recordset.recordsCollection'
            }"
        >
            <div data-amm-v="v.DisplayParent" data-amm-id="@records">
            </div>
            <div id="inputFieldProto" style="display: none;">
                <label
                    data-amm-dont-build="" 
                    data-amm-v="[v.Visual, v.Annotated]" 
                    data-amm-e="{
                        extraTraits: [t.Field, t.Data],
                        in__className__error: '!!this.error'
                    }"
                >
                    <span class="labelRequired"><span class="annotation a_label"></span><span class="annotation a_required"></span></span>
                    <input type="text" data-amm-v="[v.Input]" />
                </label>
            </div>
            <div data-amm-x="v.Variants.build" data-amm-id="@records" style="display: none">
                <div
                    data-amm-dont-build="" 
                    data-amm-default="" 
                    data-amm-e="{
                        extraTraits: [t.Data, t.Component],
                        in__className__item: 'true',
                        in__className__current: 'this.dataObject === rs.recordset.currentRecord',
                    }" 
                    onclick="Amm.r.e.rs.recordset.setCurrentRecord(Amm.findElement(this).getDataObject());"
                    data-amm-v="[
                        v.Visual, 
                        {class: v.StaticDisplayParent, buildItems: true},
                        {
                            class: v.Expressions,
                            map: {
                                '.recordNo:::_html': 'rs.recordset.offset + this.displayOrder + 1',
                                '.status:::_html': '(this.dataObject.mm.state === \'new\'? \'New\' : \' \') + (this.dataObject.mm.state === \'deleteIntent\'? \' To Delete\' : \' \') + (this.dataObject.mm.state === \'deleted\'? \' Deleted\' : \' \') + (this.dataObject.mm.modified? \' Modified\' : \' \') + (this.dataObject.mm.transaction? \' Saving...\' : \' \')',
                            }
                        }
                    ]"
                >
                    <div class="header">
                        <span class="recordNo"></span> <span class="status"></span>
                    </div>
                    <div data-amm-e="{builderSource: '#inputFieldProto > label', dataProperty: name}"></div>
                    <div data-amm-e="{builderSource: '#inputFieldProto > label', dataProperty: email}"></div>
                    <div data-amm-e="{builderSource: '#inputFieldProto > label', dataProperty: phone}"></div>
                    <div data-amm-e="{builderSource: '#inputFieldProto > label', dataProperty: company}"></div>
                    <div data-amm-e="{builderSource: '#inputFieldProto > label', dataProperty: balance}"></div>
                </div>
            </div>
        </div>
        <div data-amm-e="{
             builderSource: '#buttonProto > .buttons',
        }"></div>
        <div class="w"> 
            <div id="tbl"></div>
        </div>
    </body>
</html>