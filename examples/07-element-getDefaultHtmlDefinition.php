<?php
    $title = "Element.getDefaultHtmlDefinition()";
    require(__DIR__.'/top.inc.php');
?> 
    </head>
    <body>
        <div data-amm-e="{id: sam, class: SampleComponent}"></div>
        <div data-amm-e="{id: sam2, class: SampleComponent}"></div>
        <div data-amm-e="{id: sam3, class: SampleComponent}"></div>
        <script type="text/javascript">
            SampleComponent = function(options) {
                Amm.Element.call(this, options);
            };
            SampleComponent.prototype = {
                _getDefaultTraits: function() {
                    var res = Amm.Element.prototype._getDefaultTraits.call(this).concat([
                        'Amm.Trait.Component', 'Amm.Trait.DisplayParent', 'Amm.Trait.Visual'
                    ]);
                    return res;
                },
                
                getDefaultHtmlDefinition: function() {
                    return Amm.html(
                        {
                            $: 'div',
                            data_amm_v: 'v.StaticDisplayParent',
                            style: { border: '1px solid gold', margin: '1em', padding: '1em' },
                            $$: [
                                'Name: ', {$: 'input', type: 'text', data_amm_id: 'name', data_amm_v: '[v.Input, v.Visual]'},
                                '<br /><br />',
                                'Age: ', {$: 'input', type: 'text', data_amm_id: 'age', data_amm_v: '[v.Input, v.Visual]'}
                            ]
                        }
                    );
                },
                
                constructDefaultViews: function() {
                    return this.getDefaultHtmlDefinition();
                }
                
            };
            Amm.extend(SampleComponent, Amm.Element);
            Amm.registerFunction('SampleComponent', SampleComponent);
            Amm.getRoot().subscribe('bootstrap', function() {
            });
        </script>
    </body>
</html>