<?php
    $title = "ArrayMapper";
    require(__DIR__.'/top.inc.php');
?> 
    </head>
    <body>
        <div data-amm-id="@form" data-amm-e="{
                extraTraits: [t.DisplayParent],
                prop__itemProto: { $ref: '.itemProto' }
            }" data-amm-v='[v.Visual]' style="padding: 1em; margin: 1px">
                <div>
                    <button onclick='window.lastItem = window.items.createItem();'>Add Item</button>
                </div>
                <br />
                <div class='itemProto' style='display: none' data-amm-dont-build="">
                    <div class='outer' data-amm-e="{prop__item: null}" data-amm-v="['v.Visual', {'class': 'v.StaticDisplayParent', buildItems: true}]">
                        <label>
                            Name: <input type="text" 
                                     data-amm-v="['v.Visual', {'class': 'v.Input', updateOnKeyUp: true}]" 
                                     data-amm-e="{sync__value: this.displayParent.item.name}" />
                        </label>
                        <label>
                        Age: <input type="text" 
                                    data-amm-v="['v.Visual', {'class': 'v.Input', updateOnKeyUp: true}]" 
                                    data-amm-e="{sync__value: this.displayParent.item.age}" />
                        </label>
                        <button onclick="window.items.reject(Amm.findElement(this).getItem())">Delete</button>
                    </div>          
                </div>
                <div data-amm-v='v.DisplayParent'>
                </div>
                
        </div>
        <div style="padding-left: 1em; margin: 1px">
            <p>List below shows mapped collection (with independent order):</p>
            <label>Sort by: <select data-amm-id="sortMode" data-amm-v="[v.Select, v.Visual]"
                data-amm-e="{
                options: [
                    {
                        value: ['name'], 
                        label: 'name ASC', 
                    },
                    {
                        value: ['name DESC'], 
                        label: 'name DESC', 
                    },
                    {
                        value: ['age'], 
                        label: 'age ASC', 
                    },
                    {
                        value: ['age DESC'], 
                        label: 'age DESC', 
                    }
                ]
            }">
            </select>
            </label>
            <div data-amm-id="@list" data-amm-e="{
                    extraTraits: [t.DisplayParent],
                    prop__itemProto: { $ref: '.itemProto' },
                    prop__mapper: null,
                    expr__mapperSort: {
                        src: sortMode.value,
                        writeProperty: this.mapper.sort.criteria
                    }
                }" data-amm-v='[v.Visual]' style='margin-top: 1em'>
                    <div class='itemProto' style='display: none' data-amm-dont-build="">
                        <div class='itm' style="position: relative; width: 200px" data-amm-e="{prop__item: null, in__content: 'this.item.name + (this.item.age? \', <span style=\\\'position: absolute; right: 0px;\\\'>\' + this.item.age : \'\')'}" data-amm-v="['v.Visual', 'v.Content']">
                        </div>
                    </div>
                    <div data-amm-v='v.DisplayParent'>
                    </div>
            </div>
        </div>
        <script type="text/javascript">
            Amm.getRoot().subscribe('bootstrap', function() {
                window.form = Amm.getRoot().getNamedElement('form');
                window.items = new Amm.Collection({
                    instantiator: new Amm.Instantiator.Proto ({
                        'class': 'Amm.Element',
                        prop__name: '',
                        prop__age: {
                            defaultValue: 0,
                            onChange: function(v) { var v1 = parseInt(v); if (!isNaN(v1)) this._age = v1; }
                        }
                    })
                });
                window.items.setItems([
                    new Amm.Element({prop__name: 'Bob', prop__age: 28}),
                    new Amm.Element({prop__name: 'Alice', prop__age: 23}),
                    new Amm.Element({prop__name: 'Igor', prop__age: 43}),
                    new Amm.Element({prop__name: 'Frank', prop__age: 24}),
                ]);
                window.am = new Amm.ArrayMapper({
                    instantiator: new Amm.Instantiator.Proto({
                        'class': Amm.Element,
                        builderSource: form.getItemProto()
                    }, 'item'),
                    src: window.items,
                    dest: form.displayChildren
                });
                window.list = Amm.getRoot().getNamedElement('list');
                window.am2 = new Amm.ArrayMapper({
                    instantiator: new Amm.Instantiator.Proto({
                        'class': Amm.Element,
                        builderSource: list.getItemProto()
                    }, 'item'),
                    src: window.items,
                    dest: window.list.displayChildren,
                    sort: new Amm.MultiObserver.Sorter({
                        criteria: ['age', 'name']
                    })
                });
                window.list.setMapper(am2);
            });
        </script>
    </body>
</html>
