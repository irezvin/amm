<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title>A.M.M. Scratch 8</title>
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
            window.coll = new Amm.Collection({items: [
                    new Amm.Element({prop__type: 'a', prop__label: 'first', prop__value: 10}),
                    new Amm.Element({prop__type: 'b', prop__label: 'second', prop__value: 20})
            ]});
            Amm.getRoot().subscribe('bootstrap', function() {
                console.log("Amm bootstrapped");
            });
        </script>
        
    </head>
    <body>
        <div data-amm-e="{id: par, extraTraits: [t.Component], prop__type: tablet, sync__type: 'type.value'}" data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: false}]">
            <label>
                Item type:
                <select autocomplete="off" data-amm-e="{id: type}" data-amm-v="[v.Visual, v.Select]">
                    <option value="">Choose item type...</option>
                    <option value="tablet">Tablet</option>
                    <option value="laptop">Laptop</option>
                    <option value="phone">Phone</option>
                </select>
            </label>
            <div data-amm-e="{id: cnt, extraTraits: [t.Instantiator, t.DisplayParent], in__src: 'this.component'}" data-amm-v="[v.Visual]" data-amm-id="@cnt">
                <div data-amm-v="v.DisplayParent" data-amm-id="@cnt">
                </div>
                <div data-amm-v="v.Variants" style="display: none" data-amm-id="@cnt">
                    <div data-amm-dont-build="" data-amm-condition="{type: tablet}" data-amm-e="{id: tablet}" data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: true}]">
                        <h1>Tablet</h1>
                        <label data-amm-v="[v.Visual]" data-amm-e="{id: stylus}">Stylus <input type="checkbox" data-amm-v="v.Toggle" /></label>
                    </div>
                    <div data-amm-dont-build="" data-amm-condition="{type: laptop}" data-amm-e="{id: laptop}" data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: true}]">
                        <h1>Laptop</h1>
                        <label data-amm-v="[v.Visual]" data-amm-e="{id: touch}">Touch screen <input type="checkbox" data-amm-v="v.Toggle" /></label>
                    </div>
                    <div data-amm-dont-build="" data-amm-condition="{type: phone}" data-amm-e="" data-amm-v="[v.Visual, v.StaticDisplayParent]">
                        <h1>Phone</h1>
                        <label data-amm-v="[v.Visual]" data-amm-e="{id: supports4g}">4G <input type="checkbox" data-amm-v="v.Toggle" /></label><br />
                        <label data-amm-v="[v.Visual]" data-amm-e="{id: supports5g}">5G <input type="checkbox" data-amm-v="v.Toggle" /></label>
                    </div>
                </div>
            </div>
            <div data-amm-e="{id: rpt, extraTraits: [t.Repeater, t.DisplayParent], assocProperty: src, withVariantsView: false, items: {$ext: coll}}" data-amm-v="[v.Visual]" data-amm-id="@rpt">
                <div data-amm-v="v.DisplayParent" data-amm-id="@rpt">
                </div>
                <div data-amm-x="Amm.View.Html.Variants.build" data-amm-id="@rpt" style="display: none">
                <div data-amm-dont-build="" data-amm-condition="{type: a}" data-amm-e="{prop__src: null}" data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: true}]">
                    <h1>A</h1>
                </div>
                <div data-amm-dont-build="" data-amm-condition="{type: b}" data-amm-e="{prop__src: null}" data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: true}]">
                    <h1>B</h1>
                </div>
                </div>
            </div>
        </div>
    </body>
</html>
