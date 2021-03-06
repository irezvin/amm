<?php
    $title = "in__property";
    require(__DIR__.'/top.inc.php');
?>    
    </head>
    <body>
        <div id="cc">
            <em>Field #1:</em> <input type="text" id="field1" tabindex="0" />
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
