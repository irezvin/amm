<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title>A.M.M. Scratch</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
        <script src="../js/vendor/relaxed-json.js"></script>
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
            html { 
                min-height: 100%; 
                background: linear-gradient(to top, #c1c1c1 0%,#515151 100%); 
                color: gold; 
                line-height: 1.5em 
            }
            .b { font-weight: bold }
            .cc, .d {
                min-width: 100px;
                border: 1px solid silver;
                margin: 1em 0.8em;
                padding: 0.5em;
            }
            .cc {
                float: left;
            }
            select {
                border: 3px solid silver;
                padding: 3px;
            }
            select:focus {
                margin: 0;
                border: 3px solid orange;
            }
            [data-amm-warning]::after {
                color: white;
                background-color: red;
                margin-left: 10px;
                border-radius: 5px;
                padding: 2px;
                content: attr(data-amm-warning);
            }
        </style>
    </head>
    <body>
        <div id="cc" data-amm-e='{extraTraits: [Amm.Trait.Component]}' data-amm-v='{class: Amm.View.Html.StaticDisplayParent}'>
            <p>Want to work in our company?</p>
            <p data-amm-v="Amm.View.Html.Visual"><input type="radio" data-amm-e="{extraTraits: Amm.Trait.Toggle}" data-amm-v="Amm.View.Html.Toggle" name="work" value="0" />No</p>
            <p data-amm-v="Amm.View.Html.Visual"><input type="radio" data-amm-id='@work' data-amm-e="{extraTraits: Amm.Trait.Toggle}" data-amm-v="Amm.View.Html.Toggle" name="work" value="1" />Yes</p>
            <div style="border: 1px solid silver; margin: 1em 0; padding: 1em" data-amm-v='Amm.View.Html.Visual'>
                <label>Preferred salary: </label><input data-amm-id='@field3' data-amm-e='{in__visible: "work.value == 1"}' data-amm-v="Amm.View.Html.Input" />
            </div>
            <div data-amm-dont-build="">
                <div data-amm-v="Amm.View.Html.Visual" data-amm-e="{visible: false}">(no build here)</div>
            </div>
            <div data-amm-id="xx" data-amm-e="{}">No views</div>
        </div>
        <p data-amm-v="Amm.View.Html.Visual" data-amm-id="@field3">xxx</p>
    </body>
</html>
