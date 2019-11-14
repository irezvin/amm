<!DOCTYPE HTML>
<html data-amm-build="">
    <head>
        <title>3. Builder and Component, in__property, Radio.groupName &mdash; A.M.M. Examples</title>
        <meta charset='utf-8'>
        <script src="../js/vendor/jquery-3.1.1.js"></script>
        <script src="../js/vendor/relaxed-json.js"></script>
        <link rel="stylesheet" type="text/css" href="example.css" />
<?php 
        require_once(__DIR__.'/../build/list.php');
        foreach (listAmmFiles() as $f) { 
            echo "
        <script src=\"../js/classes/{$f}\"></script>";
        
        }        
?> 
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

        <form>
            <p class='note'>Radios below are in same-called groups, but in different components, so they shouldn't interfere with each other:</p>
            
            <div style="display: inline-block; width: 150px; border: 1px solid silver;" data-amm-e='{extraTraits: [Amm.Trait.Component]}' data-amm-id="c1" data-amm-v='{class: Amm.View.Html.StaticDisplayParent}'>
                <p data-amm-v="Amm.View.Html.Visual"><input data-amm-id="val1" type="radio" data-amm-e="{groupName: v1}" data-amm-v="Amm.View.Html.Toggle" value="a" />A</p>
                <p data-amm-v="Amm.View.Html.Visual"><input type="radio" data-amm-e="{groupName: v1}" data-amm-v="Amm.View.Html.Toggle" value="b" />B</p>
                <p data-amm-v="Amm.View.Html.Visual"><input type="radio" data-amm-e="{groupName: v1}" data-amm-v="Amm.View.Html.Toggle" value="c" />C</p>

                <p data-amm-v="Amm.View.Html.Visual"><input type="checkbox" data-amm-id="val2" data-amm-v="Amm.View.Html.Toggle" name="val2" value="a" />A</p>
                <p data-amm-v="Amm.View.Html.Visual"><input type="checkbox" data-amm-v="Amm.View.Html.Toggle" name="val2" value="b" />B</p>
                <p data-amm-v="Amm.View.Html.Visual"><input type="checkbox" data-amm-v="Amm.View.Html.Toggle" name="val2" value="c" />C</p>
            </div>

            <div style="display: inline-block; width: 150px; border: 1px solid silver;"  data-amm-e='{extraTraits: [Amm.Trait.Component]}' data-amm-id="c2" data-amm-v='{class: Amm.View.Html.StaticDisplayParent}'>
                <p data-amm-v="Amm.View.Html.Visual"><input type="radio" data-amm-id="val1" data-amm-e="{groupName: v1}" data-amm-v="Amm.View.Html.Toggle" value="a" />A</p>
                <p data-amm-v="Amm.View.Html.Visual"><input type="radio" data-amm-e="{groupName: v1}" data-amm-v="Amm.View.Html.Toggle" value="b" />B</p>
                <p data-amm-v="Amm.View.Html.Visual"><input type="radio" data-amm-e="{groupName: v1}" data-amm-v="Amm.View.Html.Toggle" value="c" />C</p>

                <p data-amm-v="Amm.View.Html.Visual"><input type="checkbox" data-amm-id="val2" data-amm-v="Amm.View.Html.Toggle" name="val2" value="a" />A</p>
                <p data-amm-v="Amm.View.Html.Visual"><input type="checkbox" data-amm-v="Amm.View.Html.Toggle" name="val2" value="b" />B</p>
                <p data-amm-v="Amm.View.Html.Visual"><input type="checkbox" data-amm-v="Amm.View.Html.Toggle" name="val2" value="c" />C</p>
            </div>
        </form>
        
    </body>
</html>
