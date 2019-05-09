<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title>A.M.M. Scratch</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
        <script src="../js/vendor/relaxed-json.js"></script>
<?php 
        require_once(dirname(__FILE__).'/list.php');
        foreach (listAmmFiles() as $f) { 
            echo "
        <script src=\"../js/classes/{$f}\"></script>";
        
        }
        
?> 
        
        <script type="text/javascript">
            Amm.getRoot().subscribe('bootstrap', function() {
                console.log("Amm bootstrapped");
            });
        </script>
        
        <style type='text/css'>
            .withErrors {
                border: 1px solid red;
                margin: 0;
            }
            h1 {
                color: orangered;
                font-weight: normal;
                text-shadow: 0px 2px darkred;
            }
            html { 
                min-height: 100%; 
                background: linear-gradient(to top, #c1c1c1 0%,#515151 100%); 
                color: gold; 
                line-height: 1.5em 
            }
            .b { font-weight: bold }
            .cc, .d {
                min-width: 100px;
                border: 1px solid silver;
                margin: 1em 0.8em;
                padding: 0.5em;
            }
            .cc {
                float: left;
            }
            select {
                border: 3px solid silver;
                padding: 3px;
            }
            select:focus {
                margin: 0;
                border: 3px solid orange;
            }
            [data-amm-warning]::after {
                color: white;
                background-color: red;
                margin-left: 10px;
                border-radius: 5px;
                padding: 2px;
                content: attr(data-amm-warning);
            }
            label {
                display: inline-block;
                min-width: 8em;
            }
        </style>
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
                    <div class='outer' data-amm-e="{prop__item: null}" data-amm-v="['v.Visual', 'v.StaticDisplayParent']">
                        Name: <input type="text" 
                                     data-amm-v="['v.Visual', 'v.Input']" 
                                     data-amm-e="{sync__value: this.displayParent.item.name}" />
                        Age: <input type="text" 
                                    data-amm-v="['v.Visual', 'v.Input']" 
                                    data-amm-e="{sync__value: this.displayParent.item.age}" />
                    </div>          
                </div>
                <div data-amm-v='v.DisplayParent'>
                </div>
                
        </div>
        <!--select data-amm-id="sortModes" data-amm-v="[v.Select, v.Visual]" 
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
        }"-->
        </select>
        <div data-amm-id="@list" data-amm-e="{
                extraTraits: [t.DisplayParent],
                prop__itemProto: { $ref: '.itemProto' }
            }" data-amm-v='[v.Visual]' style="padding: 1em; margin: 1px">
                <div class='itemProto' style='display: none' data-amm-dont-build="">
                    <div class='itm' data-amm-e="{prop__item: null, in__content: 'this.item.name + (this.item.age? \', \' + this.item.age : \'\')'}" data-amm-v="['v.Visual', 'v.Content']">
                    </div>
                </div>
                <div data-amm-v='v.DisplayParent'>
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
                    sort: new Amm.Sorter({
                        criteria: ['age', 'name']
                    })
                });
            });
        </script>
    </body>
</html>
