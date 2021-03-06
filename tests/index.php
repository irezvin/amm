<!DOCTYPE HTML>
<html>
    <head>
        <title>A.M.M. Tests</title>
        <meta charset='utf-8'>
        <script src="../vendor/jquery.js"></script>
        <script src="../vendor/relaxed-json.js"></script>
        <script src="jquery.simulate.js"></script>
        <link rel="stylesheet" type="text/css" href="qunit/qunit-2.0.1-dark.css" />
<?php   
    
        require_once(__DIR__.'/../build/amm-utils.php'); 
        $builder = new \Amm\Builder;
        $builder->distDir = __DIR__.'/../dist';
        $loader = new \Amm\Loader($builder);
        $loader->jsUrl = '../js/classes';
        $loader->distUrl = '../dist';
        $loader->showScripts();
        
?>
        
        <script src="qunit/qunit-2.0.1.js"></script>
        <script src="TestUtils.js"></script>
        <script src="MemStor.js"></script>
        <script src="mockData.js"></script>
    </head>
    <body>
    
        <div id="qunit"></div>
        <div id="qunit-fixture"></div>
        <script type='text/javascript'>
            // registry of tests which created global refs in Amm._items
            window.stats = {
                total: 0,
                deltas: {},
            };
            // container for random debug data
            window.d = {
            }; 
            QUnit.testStart(function(params) {
                if (!window.Amm) return;
                var name = params.name;
                window.Amm.itemDebugTag.push(name);
                window.stats.deltas[name] = Object.keys(Amm._items).length;
            });
            QUnit.testDone(function(params) {
                if (!window.Amm) return;
                var name = params.name;
                window.Amm.itemDebugTag.pop();
                window.stats.deltas[name] = Object.keys(Amm._items).length - window.stats.deltas[name];
                if (!window.stats.deltas[name]) delete window.stats.deltas[name];
                else window.stats.total += window.stats.deltas[name];
            });
            QUnit.done(function() {
                if (!window.Amm) return;
                if (window.stats.total) {
                    console.warn("Element leakage detected");
                    console.log(window.stats);
                }
                var sub = Amm.getRoot().getUniqueSubscribers();
                if (sub.length) {
                    console.warn("Amm.getRoot().getUniqueSubscribers().length == " + sub.length);
                    var map = {};
                    for (var i = 0; i < sub.length; i++) {
                        if (!sub[i]._root_sub) continue;
                        var hdl = Object.values(sub[i]._root_sub).join(', ');
                        if (!map[hdl]) map[hdl] = [];
                        map[hdl].push(sub[i]);
                    }
                    console.log(sub, Amm.getRoot()._subscribers, map);
                }
            });
        </script>      
<?php
        
        foreach (glob(__DIR__.'/js/*.js') as $f) { $f = basename($f);
            echo "
        <script src=\"js/{$f}\"></script>";
        
        }
?>        
    </body>
</html>
