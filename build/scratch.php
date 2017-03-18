<!DOCTYPE HTML>
<html>
    <head>
        <title>A.M.M. Scratch</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
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
            html { min-height: 100%; background: linear-gradient(to top, #c1c1c1 0%,#515151 100%); color: gold; line-height: 1.5em }
            .b { font-weight: bold }
            .cc {
                float: left;
                width: 100px;
                border: 1px solid silver;
                margin-right: 1em;
                padding: 0.5em;
            }
        </style>
    </head>
    <body>
        <div class="cc cont_dp">
            <div class="cont_c">C</div>
            <div class="cont_b">B</div>
            <div class="cont_a">A</div>
        </div>
        <div class="cc cont_dp2">
            <div class="cont_d">D</div>
            <div class="cont_f">F</div>
            <div class="cont_e">E</div>
        </div>
        <script type='text/javascript'>
            /* global Amm */
            var suff = ['a', 'b', 'c', 'd', 'e', 'f'];
            for (var i = 0; i < suff.length; i++) {
                var member = 'e_' + suff[i];
                var container = jQuery('.cont_' + suff[i])[0];
                if (!container)
                    console.warn("Container not found: " + suff[i] + "; skipping");
                var view_content_member = 'vc_' + suff[i];
                var view_visual_member = 'vv_' + suff[i];
                window[member] = new Amm.Element({
                    traits: ['Amm.Trait.Content', 'Amm.Trait.Visual']
                });
                window[view_content_member] = new Amm.View.Html.Content({
                    element: window[member],
                    htmlElement: container
                });
                window[view_visual_member] = new Amm.View.Html.Visual({
                    element: window[member],
                    htmlElement: container
                });
            }
            window.e_dp = new Amm.Element({
                traits: ['Amm.Trait.DisplayParent']
            });
            window.v_dp = new Amm.View.Html.DisplayParent({
                element: window.e_dp,
                scanForChildren: true,
                scanForDisplayOrder: true,
                debug: 1,
                htmlElement: jQuery('.cont_dp')[0]
            });
            Amm.registerItem(e_dp.displayChildren);
            window.e_dp2 = new Amm.Element({
                traits: ['Amm.Trait.DisplayParent']
            });
            window.v_dp2 = new Amm.View.Html.DisplayParent({
                element: window.e_dp2,
                scanForChildren: true,
                scanForDisplayOrder: true,
                debug: 1,
                htmlElement: jQuery('.cont_dp2')[0]
            });
            window.v_dp2 = new Amm.View.Html.DisplayParent({
                element: window.e_dp2,
                scanForChildren: true,
                scanForDisplayOrder: true,
                debug: 1,
                htmlElement: jQuery('.cont_dp2')[0]
            });
            Amm.registerItem(e_dp2.displayChildren);
            var num = 0;
            window.newNode = function(content, append) {
                console.log(num);
                content = content || '(item ' + (num++) + ')';
                var he = jQuery('<div>' + content + '</div>');
                var e = new Amm.Element({traits: ['Amm.Trait.Content', 'Amm.Trait.Visual'], visible: true});
                var v = new Amm.View.Html.Visual({element: e, htmlElement: he[0]});
                var vc = new Amm.View.Html.Content({element: e, htmlElement: he[0]});
                if (append) v_dp.displayChildren.push(e);
                return e;
            };
            
        </script>
    </body>
</html>
