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
            label {
                display: inline-block;
                min-width: 8em;
            }
        </style>
    </head>
    <body>
        <div data-amm-id="@form" data-amm-e='{extraTraits: [t.Component]}' data-amm-v='{class: v.StaticDisplayParent}'>
            <div data-amm-v="[{class: v.Visual}, {class: v.Annotated}]">
                <label for="name"><span class="annotation a_label">Name</span><span class="annotation a_required">*</span></label>
                <input id="name" type="text" data-amm-id="name"
                       data-amm-v="{class: v.Input}" 
                       data-amm-e="{extraTraits: [t.Field, t.Property], validateMode: 3, component: root}" />
                <div class="annotation a_error"></div>
            </div>
            <br />
            <div data-amm-v="[{class: v.Visual}, {class: v.Annotated}]">
                <label for="age" class="annotation a_label">Age</label> <input id="age" type="text" data-amm-id="age"
                    data-amm-v='{class: v.Input}'
                    data-amm-e="{extraTraits: [t.Field, t.Property], component: root, validators: [{class: 'Amm.Validator.Number', gt: 0}]}" />
            </div>
            <br />
            <button>Send info</button>
        </div>
    </body>
</html>
