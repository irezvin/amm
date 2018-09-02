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
        <div style='display: none' id='itemSample' data-amm-dont-build="">
            <div class='outer'>
                <label for="name"><span class="annotation a_label">foo</span><span class="annotation a_required"></span></label>
                <input type="text" /> 
                <button type='button' onclick='Amm.findElement(this).cleanup();'>X</button>
                <button type='button' onclick='var e = Amm.findElement(this); e.setDisplayOrder(e.getDisplayOrder() - 1);'>up</button>
                <button type='button' onclick='var e = Amm.findElement(this); e.setDisplayOrder(e.getDisplayOrder() + 1);'>down</button>
                <div class="annotation a_error"></div>
            </div>
        </div>
        <div data-amm-id="@form" data-amm-e="{
                extraTraits: [t.Form, t.Component],
                displayChildrenPrototype: {
                    prototype: {
                        class: 'Amm.Element',
                        builderSource: { $ref: '.itemProto' }
                    }
                }
            }" data-amm-v='[v.Visual]' style="padding: 1em; margin: 1px">
                <div>
                    <button onclick='window.lastItem = Amm.findElement(this).displayChildren.createItem();'>Add Item</button>
                </div>
                <div class='itemProto' style='display: none' data-amm-dont-build="">
                    <div class='outer' data-amm-e="{
                        extraTraits: ['t.Field'],
                        in__label: '\'Item #\' + (this.displayOrder + 1)'
                    }" data-amm-v="['v.Visual', 'v.Annotated']">
                        <label for="name"><span class="annotation a_label">foo</span><span class="annotation a_required"></span></label>
                        <input type="text" data-amm-v="v.Input" /> 
                        <button type='button' onclick='Amm.findElement(this).cleanup();'>X</button>
                        <button type='button' onclick='var e = Amm.findElement(this); e.setDisplayOrder(e.getDisplayOrder() - 1);'>up</button>
                        <button type='button' onclick='var e = Amm.findElement(this); e.setDisplayOrder(e.getDisplayOrder() + 1);'>down</button>
                        <div class="annotation a_error"></div>
                    </div>                    
                </div>
                <div data-amm-v='v.DisplayParent'>
                </div>
        </div>
    </body>
</html>
