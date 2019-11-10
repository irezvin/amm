<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title>A.M.M. Scratch 10</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
        <script src="../js/vendor/relaxed-json.js"></script>
        <link rel="stylesheet" type="text/css" href="scratch.css" />
        <link rel="stylesheet" type="text/css" href="tbl.css" />
<?php 
        require_once(__DIR__.'/list.php');
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
        
        <div data-amm-e="{
                extraTraits: t.Component, 
                id: cnt,
                prop__records: {
                    __construct: Amm.Remote.Fetcher,
                    firstDelay: 300,
                    throttleDelay: 500,
                    requestProducer: 'data.php?h[]=description',
                    auto: true,
                }
            }" data-amm-v="[v.StaticDisplayParent, v.Visual]">

            
            <div>
                
                <!-- repeater children container -->
                <table style="width: 100%" class="data">
                <thead>
                    <th style="width: available">Name</th>
                    <th style="width: 100px">Procurement Ref</th>
                    <th style="width: 100px">Location</th>
                </thead>
                <thead class="flt">
                    <th><input type="text" data-amm-e="{
                        prop__q: name,
                        expr__query: {
                            src: 'this.value.split(/ +/)',
                            writeProperty: 'this.component.records.requestProducer.uri::{\'f[\'+ this.q +\']\'}',
                        }
                    }" data-amm-v="[v.Visual, {class: v.Input, updateOnKeyUp: true}]" placeholder="Filter..." /></th>
                    <th><input type="text" data-amm-e="{
                        prop__q: procurementRef,
                        expr__query: {
                            src: 'this.value.split(/ +/)',
                            writeProperty: 'this.component.records.requestProducer.uri::{\'f[\'+ this.q +\']\'}',
                        }
                    }" data-amm-v="[v.Visual, {class: v.Input, updateOnKeyUp: true}]" placeholder="Filter..." /></th>
                    <th><input type="text" data-amm-e="{
                        prop__q: location,
                        expr__query: {
                            src: 'this.value.split(/ +/)',
                            writeProperty: 'this.component.records.requestProducer.uri::{\'f[\'+ this.q +\']\'}',
                        }
                    }" data-amm-v="[v.Visual, {class: v.Input, updateOnKeyUp: true}]" placeholder="Filter..." /></th>
                </thead>
                <tbody data-amm-e="{
                       id: rpt, 
                       extraTraits: [t.Repeater, t.DisplayParent], 
                       assocProperty: src, 
                       withVariantsView: false, 
                       in__items: 'cnt.records.response.items!!'
                }" data-amm-v="[v.Visual, v.DisplayParent]" data-amm-id="@rpt">
                </tbody>
                </table>
                
                
                <!-- repeater item prototypes -->
                <table style="display: none">
                    <tbody data-amm-x="Amm.View.Html.Variants.build"  data-amm-id="@rpt">
                        <tr data-amm-dont-build="" data-amm-default="" data-amm-e="{prop__src: null, extraTraits: t.Component}" data-amm-v="[v.Visual, {class: v.StaticDisplayParent, buildItems: true}]">
                            <td data-amm-e="{in__content: 'this.component.src.name!!'}" data-amm-v="[v.Visual, v.Content]"></td>
                            <td data-amm-e="{in__content: 'this.component.src.procurementRef!!'}" data-amm-v="[v.Visual, v.Content]"></td>
                            <td data-amm-e="{in__content: 'this.component.src.location!!'}" data-amm-v="[v.Visual, v.Content]"></td>
                        </tr>
                    </tbody>
                </table>
                
            </div>
            
        </div>
        
        
    </body>
</html>
