<!DOCTYPE HTML>
<html>
    <head>
        <title>A.M.M. Tests</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
        <script src="../js/vendor/avancore/util.js"></script>
        <!--link rel="stylesheet" type="text/css" href="qunit/qunit-dark.css" /-->
        <link rel="stylesheet" type="text/css" href="qunit/qunit-2.0.1.css" />
<?php 
        require_once(dirname(__FILE__).'/list.php');
        foreach (listAmmFiles() as $f) { 
            echo "
        <script src=\"../js/classes/{$f}\"></script>";
        
        }        
        
?> 
        
        <style type='text/css'>
            /*h1 {
                color: orangered;
                font-weight: normal;
                text-shadow: 0px 2px darkred;
            }
            html { min-height: 100%; background: linear-gradient(to top, #c1c1c1 0%,#515151 100%); }*/
        </style>
    </head>
    <body>
    
        <div id="qunit"></div>
        <div id="qunit-fixture"></div>
        <script src="qunit/qunit-2.0.1.js"></script>
    
<?php
        
        foreach (listTests() as $f) {
            echo "
        <script src=\"../js/tests/{$f}\"></script>";
        
        }
?>        
    </body>
</html>
