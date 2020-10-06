<?php
    $title = "Collection wtih Instantiator";
    require(__DIR__.'/top.inc.php');
?> 
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
