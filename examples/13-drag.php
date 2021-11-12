<?php
    $title = "Drag";
    require(__DIR__.'/top.inc.php');
?> 
        <script type="text/javascript">

            var Test = {};
            Amm.registerNamespace('Test', Test);
            Amm.createClass('Test.DragSourceView', 'Amm.View.Abstract', {
                _presentationProperty: '_element',
                _resize: false,
                _jq: null,
                _s: null,
                prop__htmlElement: null,
                _handleElementDragStart: function(session) {
                    this._s = session;
                    this._jq = jQuery(this._htmlElement);
                    this._resize = jQuery(session.getStartNativeItem()).hasClass('resize');
                    this._s.setDropEnabled(!this._resize);
                },
                _handleElementDragVectorChange: function(vector) {
                    var d = this._s.getDelta();
                    if (this._resize) {
                        var w = this._element.getWidth();
                        var h = this._element.getHeight();
                        w += d.dX;
                        h += d.dY;
                        this._element.setWidth(w);
                        this._element.setHeight(h);
                    } else {
                        // move
                        var left = this._element.getLeft();
                        var top = this._element.getTop();
                        left += d.dX;
                        top += d.dY;
                        this._element.setLeft(left);
                        this._element.setTop(top);
                    }
                },
                _handleElementDragTargetChange: function(t) {
                    console.log('dragTarget', t? t.getId() : null);
                },
                
                _handleElementSourceTargetNativeItemChange: function(item, old) {
                    console.log("targetNativeItemChange");
                    if (item) jQuery(item).addClass('dragHover');
                    if (old) jQuery(old).removeClass('dragHover');
                    console.log('item', jQuery(item).attr('class'));
                },
            });

            Amm.createClass('Test.DragTargetView', 'Amm.View.Abstract', {
                _presentationProperty: '_element',
                prop__htmlElement: null,
                _handleElementDragSourceChange: function(dragSource) {
                    console.log('ds: ', dragSource);
                },
                _handleElementTargetNativeItemChange: function(item, old) {
                    console.log('ni: ', item);
                },
            });
            
            window.dragEnd = function() {
                var src = this.getDragSrcItem(), dest = this.getDragDestItem();
                if (!src || !dest) return;
                var itemA = src.getSrc(), aDp = src.getDisplayParent();
                var itemB = dest.getSrc(), bDp = dest.getDisplayParent();
                if (!(aDp && aDp['Repeater'] && bDp && bDp['Repeater'])) return; 
                var listA = aDp.getItems(), listB = bDp.getItems();
                if (!listA || !listB) return;
                if (listB !== listA) {
                    listA.removeItem(itemA);
                    listB.insertItemBefore(itemA, itemB);
                } else {
                    listA.moveItem(listA.indexOf(itemA), listA.indexOf(itemB));
                }
            };


            Amm.getRoot().subscribe('bootstrap', function() {
                //Amm.Drag.Controller.getInstance();
            });

        </script>
        <style type="text/css">

            .dragItemShadow {
                position: absolute;
                z-index: 9999;
                background-color: rgba(255,255,255,0.5);
                pointer-events: none;
            }
            
            .dragItemFloating {
                position: absolute;
                z-index: 9999;
                pointer-events: none;
                opacity: 0.8;
            }

            .dragItemShadowClone.dragItemStaticShadow {
                opacity: 0.2;
                /*pointer-events: none;*/
                /*visibility: hidden;*/
            }
            
            .itemsContainer {
                vertical-align: top; 
                display: inline-block; 
                border: 1px solid silver; 
                padding: 1em; 
                margin: .5em;
            }
            
            .itemsContainer > div > div {
                overflow: auto;
            }
            
            .reoderStaticDragShadow, .dragItemStaticShadow:not(.dragItemShadowClone) {
                border: 1px solid lightgray;
                background-color: darkgrey;
            }
            
            .draggable {
                position: relative;
                border: 1px solid silver;
            }
            
            .dr {
                border: 1px solid blue;
                padding: 10px;
                touch-action: none;
            }
            
            .dr.move {
                cursor: move;
            }
            
            .dr.resize {
                cursor: nwse-resize;
            }
            
            .droppable, .drop {
                padding: .5em;
                margin: .5em;
                border: 2px solid gold;
                display: inline-block;
            }
            
            .drop {
                min-width: 100px;
                min-height: 100px;
            }
            
            .dragHover {
                border: 2px solid lightblue;
            }
            
            #ds1 {
                margin-left: .5em;
                width: 100px;
                height: 100px;
                position: absolute;
            }
            *[data-amm-id="t1"] {
                margin-top: 120px;
            }
            
            .dragItemIntent_before {
                border-top: 2px solid lightblue;
                margin-top: -2px;
            }
            
            .dragItemIntent_after {
                border-bottom: 2px solid lightblue;
                margin-bottom: -2px;
            }
            
            .dragItemIntent_over {
                border: 1px solid lightblue;
                margin: -1px;
            }
            
            .dragItemIntent_container {
                border: 2px solid lightblue;
            }
            
        </style>
    </head>
    <body>
        <h1>Drag example</h1>
        <div 
            id="ds1"
            data-amm-id="ds1"
            data-amm-v="[v.Drag.Source, Test.DragSourceView, v.Dimensions]"
            data-amm-e="{
                handleSelector: '.dr'
            }"
            class="draggable">
            <div style="position: absolute; left: 100%; padding-left: 2px">
                <div class="dr move">move</div>
                <div class="dr resize">resize</div>
            </div>
        </div>
        <div data-amm-id="t1" data-amm-v="[v.Drag.Target, Test.DragTargetView]" class="droppable">
            <div class="drop d1">Drop 1</div>
            <div class="drop d2">Drop 2</div>
        </div>
        <div data-amm-id="t2" data-amm-v="[v.Drag.Target, Test.DragTargetView]" class="droppable">
            <div class="drop d3">Drop 3</div>
            <div class="drop d4">Drop 4</div>
        </div>
        <div>
            <div class="itemsContainer"
                 data-amm-e="{
                    id: rpt3, 
                    extraTraits: [t.Repeater, t.DisplayParent], 
                    assocProperty: src, 
                    withVariantsView: false,
                    intents: 'before,after,container',
                    //intents: 'over',
                    items: [
                        { __construct: 'Amm.Element', prop__caption: 'Item A' }, 
                        { __construct: 'Amm.Element', prop__caption: 'Item B' }, 
                    ],
                    //on__dragEnd: {$ext: dragEnd}
                }" data-amm-v="[v.Visual]" data-amm-id="@rpt3">
                <div data-amm-v="[
                    v.DisplayParent, 
                    {
                        class: v.Drag.ItemSource,
                        itemElementRequirements: ['Visual', 'getSrc'],
                        itemElementAssocProperty: 'src',
                        defaultCollection: 'items',
                        containerSelector: '.itemsContainer',
                    }, 
                    {
                        class: v.Drag.ItemTarget,
                        itemElementRequirements: ['Visual', 'getSrc'],
                        itemElementAssocProperty: 'src',
                        defaultCollection: 'items',
                        containerSelector: '.itemsContainer',
                    }
                ]" data-amm-id="@rpt3"
                >
                </div>
                <div data-amm-x="Amm.View.Html.Variants.build" data-amm-id="@rpt3" style="display: none">
                    <div data-amm-dont-build=""
                         data-amm-default=""
                         data-amm-e="{prop__src: null}" 
                         data-amm-v="[v.Visual, {
                            class: v.Expressions,
                            map: { 'h2:::_html': 'this.src.caption' }
                        }]"
                    >
                        <h2></h2>
                    </div>
                </div>
            </div>
            <div class="itemsContainer"  
                 data-amm-e="
                    {
                        id: rpt4, 
                        extraTraits: [t.Repeater, t.DisplayParent],
                        assocProperty: src, 
                        withVariantsView: false, 
                        intents: 'before,after,container',
                        //intents: 'over',
                        items: [
                            { __construct: 'Amm.Element', prop__caption: 'Item C' },
                            { __construct: 'Amm.Element', prop__caption: 'Item D' },
                            { __construct: 'Amm.Element', prop__caption: 'Item E' }, 
                            { __construct: 'Amm.Element', prop__caption: 'Item F' }, 
                            { __construct: 'Amm.Element', prop__caption: 'Item G' },
                            { __construct: 'Amm.Element', prop__caption: 'Item H' },
                            
                        ],
                        //on__dragEnd: {$ext: dragEnd}
                }" data-amm-v="[v.Visual]" data-amm-id="@rpt4">
                <div data-amm-v="[
                     v.DisplayParent, 
                    {
                        class: v.Drag.ItemSource,
                        itemElementRequirements: ['Visual', 'getSrc'],
                        itemElementAssocProperty: 'src',
                        defaultCollection: 'items',
                        containerSelector: '.itemsContainer',
                    }, 
                    {
                        class: v.Drag.ItemTarget,
                        itemElementRequirements: ['Visual', 'getSrc'],
                        itemElementAssocProperty: 'src',
                        defaultCollection: 'items',
                        containerSelector: '.itemsContainer',
                    }
                ]" data-amm-id="@rpt4">
                </div>
                <div data-amm-x="Amm.View.Html.Variants.build" data-amm-id="@rpt4" style="display: none">
                    <div data-amm-dont-build=""
                         data-amm-default=""
                         data-amm-e="{prop__src: null}" 
                         data-amm-v="[v.Visual, {
                            class: v.Expressions,
                            map: { 'h2:::_html': 'this.src.caption' }
                        }]",
                    >
                        <h2></h2>
                    </div>
                </div>
            </div>
        </div>
    </body>
</html>
