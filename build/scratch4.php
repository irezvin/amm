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
        
        <script type="text/javascript">
            /* global Amm */
            Tr = function(options) {
                options = Amm.override({
                    inDecorator: function(v) {
                        if (!v) return v;
                        if (typeof v !== 'string') return v;
                        if (v === 'eee')  throw '[in] eee is not allowed';
                        return 'xx' + v + 'xx';
                    },
                    
                    outDecorator: function(v) {
                        console.log('out', v);
                        if (typeof v !== 'string') return v;
                        if (v === 'xxeeexx') throw '[out] eee is not allowed';
                        return v.replace(/^xx|xx$/g, '');
                    }

                }, options);
                Amm.Translator.call(this, options);
            };
            Amm.extend(Tr, Amm.Translator);
            Amm.registerNamespace('w', window);
            Amm.getRoot().subscribe('bootstrap', function() {
                window.form = Amm.getRoot().getNamedElement('form');
            });
        </script>
        
        <style type='text/css'>
            .withErrors {
                border: 1px solid red;
                margin: 0;
            }
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
        <div data-amm-id="@form" data-amm-e="{
                extraTraits: [t.Form, t.Component],
                in__className__withErrors: 'this.fieldErrors'
            }" data-amm-v='[v.StaticDisplayParent, v.Visual]' style="padding: 1em; margin: 1px">
            <div class="formErrors" data-amm-v='[v.Visual, v.Content]' data-amm-e="{in__content: 'this.component.fieldErrors', contentTranslator: 'Amm.Translator.Errors'}"></div>
            <button onclick="Amm.findElement(this).validate()">Validate</button>            
            <br /><br />
            <div data-amm-v="[{class: v.Visual}, {class: v.Annotated}]">
                <label for="name"><span class="annotation a_label">Name</span><span class="annotation a_required">*</span></label>
                <input id="name" type="text" data-amm-id="name"
                       data-amm-v="{class: v.Input}"
                       data-amm-e="{extraTraits: [t.Input, t.Field], validateMode: 3, fieldTranslator: 'w.Tr', component: root}" />
                <div class="annotation a_error"></div>
            </div>
            <div data-amm-v="[{class: v.Content}, {class: v.Visual}]" data-amm-e="{content: mmm, in__content: 'name.fieldValue'}"></div>
            <br />
            <div data-amm-v="[{class: v.Visual}, {class: v.Annotated}]">
                <label for="age" class="annotation a_label">Age</label> <input id="age" type="text" data-amm-id="age"
                    data-amm-v='{class: v.Input}'
                    data-amm-e="{extraTraits: [t.Input, t.Field], component: root, validators: [{class: 'Amm.Validator.Number', gt: 0}]}" />
            </div>
            <div data-amm-v="[{class: v.Visual}, {class: v.Annotated}]">
                <label for="exp" class="annotation a_label">Yrs experience</label> <input id="exp" type="text" data-amm-id="exp"
                    data-amm-v='{class: v.Input}'
                    data-amm-e="{extraTraits: [t.Input, t.Field], 
                        component: root, 
                        validators: [{class: 'Amm.Validator.Number', gt: 0}],
                        validationExpressions: [
                            '(age.fieldValue && (this.fieldValue * 1) > (age.fieldValue * 1)) && this.fieldLabel + \' cannot be higher than than \' + age.fieldLabel'
                        ]
                    }" />
            </div>
            <br />
        </div>
        <h2>Linked selects (unrelated)</h2>
        <select id="sel1" data-amm-id="sel1" name="zz" data-amm-v="[v.Select, v.Visual]"
            data-amm-e="{
            options: [
                {
                    value: 'foo', 
                    label: 'Foo', 
                    prop__linked: {
                        foo1: 'Foo1',
                        foo2: 'Foo2'
                    }
                },
                {
                    value: 'bar', 
                    label: 'Bar',
                    prop__linked: {
                        foo1: 'Bar1',
                        foo2: 'Bar2'
                    }
                },
            ]
        }">
        </select>
        <select data-amm-v="[v.Select, v.Visual]" data-amm-e="{
            in__options: 'sel1.selectionCollection[0].linked'
        }" data-amm-id="sel2" id="sel2">
        </select>
    </body>
</html>
