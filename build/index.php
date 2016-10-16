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
        <script type='text/javascript'>
            
            var Amm;
            
            jQuery(function() {
                p = new Amm.Property(); 
                q = new Amm.Handler.Property.JQuery({element: p, query: '.prop-p', extractMethod: 'val', method: 'val'});
                e = new Amm.Emitter({element: p, signal: 'value'});
                
                console.log(p.getValue());
                

                h1 = new Amm.Handler({elementPath: '^/foo', signal: 'change', handleSignal: function(e, v) { console.log(': ', v); }});
                foo = new Amm.Property({id: 'foo', parent: '^', value: 'deferred ok'});                
            });
        </script>
        
    </body>
</html>