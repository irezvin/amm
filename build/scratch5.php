<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title>A.M.M. Scratch</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
        <script src="../js/vendor/relaxed-json.js"></script>
        <link rel="stylesheet" type="text/css" href="scratch.css" />
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
    </head>
    <body>
        <div data-amm-id="@form" data-amm-e="{
                extraTraits: [t.Form, t.Component],
                displayChildrenPrototype: {
                    instantiator: {
                        __construct: 'Amm.Instantiator.Proto',
                        proto: {
                            class: 'Amm.Element',
                            builderSource: { $ref: '.itemProto' }
                        }
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
