<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title>A.M.M. Scratch 7</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
        <script src="../js/vendor/relaxed-json.js"></script>
        <script src="amm.min.js"></script>
        <link rel="stylesheet" type="text/css" href="scratch.css" />
        <script type="text/javascript">
            Amm.getRoot().subscribe('bootstrap', function() {
                console.log("Amm bootstrapped");
            });
        </script>
        
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