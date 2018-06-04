<!DOCTYPE HTML>
<html>
    <head>
        <title>A.M.M. Scratch</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
<?php 
        require_once(dirname(__FILE__).'/list.php');
        foreach (listAmmFiles() as $f) { 
            echo "
        <script src=\"../js/classes/{$f}\"></script>";
        
        }        
?> 
        <style type='text/css'>
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
        </style>
    </head>
    <body>
        <div id="cc">
            <em>Field #1:</em> <input type="text" id="field1" />
            <div style="border: 1px solid silver; margin: 1em 0; padding: 1em">
                Field #2: <input type="text" id="field2" />
            </div>
        </div>
        <script type='text/javascript'>
            /* global Amm */
            var inp1 = new Amm.Element({
                id: 'field1',
                views: [
                    {class: Amm.View.Html.Input, htmlElement: jQuery('#field1')[0]},
                    {class: Amm.View.Html.Visual, htmlElement: jQuery('#field1')[0]}
                ]
            });
            var inp2 = new Amm.Element({
                views: [
                    {class: Amm.View.Html.Input, htmlElement: jQuery('#field2')[0]},
                    {class: Amm.View.Html.Visual, htmlElement: jQuery('#field2')[0]}
                ],
                in__value: "field1.value",
                readOnly: true
            });
            var cont = new Amm.Element({
                extraTraits: ['Amm.Trait.Component'],
                views: [ {
                    class: 'Amm.View.Html.StaticDisplayParent',
                    htmlElement: jQuery('#cc')[0]
                } ]
            });
        </script>
    </body>
</html>