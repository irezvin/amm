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
        <input type='text' id='val1' />
        <input type='text' id='val2' />
        <script type='text/javascript'>
            jQuery(function() {
                jQuery('#val1').on('change', function() { testElement.inValue(this.value); } );
                jQuery('#val2').on('change', function() { testElement.inValue(this.value); } );
                testElement.subscribeFunc('change', function(v){jQuery('#val1').val(v)});
                testElement.subscribeFunc('change', function(v){jQuery('#val2').val(v)});
                testElement.inValue(10);
            });
        </script>
        
    </body>
</html>