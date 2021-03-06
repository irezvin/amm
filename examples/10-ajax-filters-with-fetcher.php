<?php
    $title = "Ajax Filters with Fetcher";
    require(__DIR__.'/top.inc.php');
?> 
    <link rel="stylesheet" type="text/css" href="tbl.css" />
    
    </head>
    <body>
        
        <div data-amm-e="{
                extraTraits: t.Component, 
                id: cnt,
                prop__state: {
                    __construct: Amm.State,
                    implementation: {
                        class: Amm.State.Hash
                    }
                },
                prop__filter: 'Bishkek',
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
                    <tr>
                        <th style="width: available">Name</th>
                        <th style="width: 100px">Procurement Ref</th>
                        <th style="width: 100px">Location</th>
                    </tr>
                    <tr lass="flt">
                        <th><input type="text" data-amm-e="{
                            prop__q: name,
                            sync__value: 'cnt.state.data::filterName::\'\'',
                            expr__query: {
                                src: 'this.value.split(/ +/)',
                                writeProperty: 'this.component.records.requestProducer.uri::{\'f[\'+ this.q +\']\'}',
                            }
                        }" data-amm-v="[v.Visual, {class: v.Input, updateOnKeyUp: true}]" placeholder="Filter..." /></th>
                        <th><input type="text" data-amm-e="{
                            prop__q: procurementRef,
                            sync__value: 'cnt.state.data::filterProcRef::\'\'',
                            expr__query: {
                                src: 'this.value.split(/ +/)',
                                writeProperty: 'this.component.records.requestProducer.uri::{\'f[\'+ this.q +\']\'}',
                            }
                        }" data-amm-v="[v.Visual, {class: v.Input, updateOnKeyUp: true}]" placeholder="Filter..." /></th>
                        <th><input type="text" data-amm-e="{
                            prop__q: location,
                            sync__value: 'cnt.state.data::filterLocation::\'\'',
                            expr__query: {
                                src: 'this.value.split(/ +/)',
                                writeProperty: 'this.component.records.requestProducer.uri::{\'f[\'+ this.q +\']\'}',
                            }
                        }" data-amm-v="[v.Visual, {class: v.Input, updateOnKeyUp: true}]" placeholder="Filter..." /></th>
                    </tr>
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
