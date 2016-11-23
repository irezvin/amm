<!DOCTYPE HTML>
<html>
    <head>
        <title>A.M.M. Playground</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
        <script src="../js/vendor/avancore/util.js"></script>
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
            html { min-height: 100%; background: linear-gradient(to top, #c1c1c1 0%,#515151 100%); }
        </style>
    </head>
    <body>
        <h1>A.M.M. Playground</h1>
        <script type='text/javascript' src='test.js'></script>
        <input type='text' id='val1' value='10' class='prop-p' />
        <input type='text' id='val2' class='prop-p' />
        <br />
        <br />
        <div id='val3c' class='foo bar'>
            <input type='text' id='val3' />
        </div>
        <div id='contentElement'>
            The content
        </div>
        <div id='theAnno'>
            <label for='theText'><span class='annotation a_label'>The field</span><span class='annotation a_required'>*</span></label>
            <input type='text' id='theText' value='the value' />
            <div class='annotation a_description'>Some description</div>
            <div class='annotation a_error'></div>
        </div>
        <script type='text/javascript'>
            
            var Amm;
            
            jQuery(function() {
                p = new Amm.Property(); 
                q = new Amm.Handler.Property.JQuery({element: p, query: '.prop-p', extractMethod: 'val', method: 'val'});
                e = new Amm.Emitter.JQuery({element: p, method: 'setValue', eventName: 'change', selector: '.prop-p', eventPass: 'target.value'});
                
                h1 = new Amm.Handler({elementPath: '^/foo', event: 'valueChange', handleEvent: function(v) { console.log(': ', v); }});
                foo = new Amm.Property({id: 'foo', parent: '^', value: 'deferred ok'});                
                
                pf = new Amm.Element({traits: ['Amm.Trait.Field', 'Amm.Trait.Visual'], id: 'val3', value: 'v'});
                f = new Amm.View.Html.Input({element: pf, htmlElement: '#val3'});
                f2 = new Amm.View.Html.Visual({element: pf, htmlElement: '#val3c'});
                
                ce = new Amm.Element({traits: ['Amm.Trait.Content'], id: 'contentElement'});
                ceV = new Amm.View.Html.Content({element: ce, htmlElement: '#contentElement'});
                
                ane = new Amm.Element({traits: ['Amm.Trait.Annotated', 'Amm.Trait.Field']});
                aneI = new Amm.View.Html.Input({element: ane, htmlElement: '#theText'});
                aneA = new Amm.View.Html.Annotated({element: ane, htmlElement: '#theAnno'});
            });
        </script>
        
    </body>
</html>
